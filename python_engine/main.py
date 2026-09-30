"""
=============================================================================
XAUUSD AGI QUANT ENGINE v32.0 (GRADE A SUPER +)
=============================================================================
Enterprise Automated Trading System with 4-Tier Lot Sizing:
  - 10 Quantitative Institutional Engines
  - Precision Entry (Fair Value Gap 50% & Order Block Footprints)
  - Multi-Timeframe Structural Filtering (H1 / H4 Alignment)
  - 4-Tier Lot Sizing:
      * Grade A Super (Score >= 90) : 3.0x Lot (3.0% Equity Risk)
      * Grade A+++    (Score >= 85) : 2.0x Lot (2.0% Equity Risk)
      * Grade A++     (Score >= 75) : 1.0x Lot (1.0% Equity Risk)
      * Grade A       (Score >= 65) : 0.5x Lot (0.5% Equity Risk)
  - Real-Time Anomaly Interceptor & Dynamic Basis Tracker
=============================================================================
"""

import os
import sys
import json
import time
import sqlite3
import datetime
from contextlib import closing
import pytz
import numpy as np
import pandas as pd
import requests
import websocket
import yfinance as yf

from agi_core import (
    detect_regime, detect_anomaly, Memory, Calibrator, MetaLearner,
    grade_signal, grade_at_least, compose_local_insight,
)
from agi_gemini import debate, reflect
from telegram_utils import send_text, send_photo, is_paused
from engines import ENGINES
from precision_entry import calculate_precise_entry
from engine_tracker import EngineTracker
from auto_tuner import TUNER_FILE

WIB = pytz.timezone("Asia/Jakarta")
UTC = pytz.UTC

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
HEALTHCHECK_URL = os.getenv("HEALTHCHECK_URL", "").strip()
SYMBOL_DERIV = os.getenv("SYMBOL_DERIV", "frxXAUUSD")

# Load tuned parameters if available
_tuned = {}
if os.path.exists(TUNER_FILE):
    try:
        with open(TUNER_FILE, "r") as f:
            _tuned = json.load(f).get("params", {})
    except Exception:
        pass

MIN_CONFLUENCE = float(os.getenv("MIN_CONFLUENCE_SCORE", str(_tuned.get("min_confluence", 62.0))))
MIN_GRADE = os.getenv("MIN_SIGNAL_GRADE", _tuned.get("min_grade", "A"))
MIN_PRECISION = float(os.getenv("MIN_PRECISION_SCORE", str(_tuned.get("min_precision", 68.0))))
COOLDOWN_MIN = int(os.getenv("SIGNAL_COOLDOWN_MINUTES", "45"))
FORCE_RUN = os.getenv("FORCE_RUN", "false").lower() == "true"
REQUIRE_MTF = os.getenv("REQUIRE_MTF_ALIGN", "true").lower() == "true"

YAHOO_OFFSET_DEFAULT = float(os.getenv("YAHOO_OFFSET", "-35.00"))

CACHE_DIR = ".state_cache"
os.makedirs(CACHE_DIR, exist_ok=True)
DB_FILE = os.path.join(CACHE_DIR, "state.db")
JOURNAL_FILE = os.path.join(CACHE_DIR, "trade_journal.json")


def log(msg: str):
    ts = datetime.datetime.now(WIB).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def _init_db():
    conn = sqlite3.connect(DB_FILE, timeout=15.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""CREATE TABLE IF NOT EXISTS signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts REAL, direction TEXT, price REAL, zone REAL, grade TEXT, status TEXT)""")
    conn.commit()
    conn.close()


def is_duplicate(direction: str, price: float, cooldown_min: int) -> bool:
    zone = round(price / 5.0) * 5.0
    now = time.time()
    conn = sqlite3.connect(DB_FILE, timeout=15.0)
    with closing(conn) as c:
        rows = c.execute(
            "SELECT ts, direction, price, zone FROM signals ORDER BY id DESC LIMIT 10"
        ).fetchall()
    for ts, ld, lp, lz in rows:
        elapsed_min = (now - ts) / 60.0
        if elapsed_min < cooldown_min:
            if direction == ld and abs(zone - lz) < 1e-4:
                return True
            if direction != ld and abs(price - lp) < 2.5:
                return True
    return False


def save_signal(direction: str, price: float, grade: str):
    conn = sqlite3.connect(DB_FILE, timeout=15.0)
    with closing(conn) as c:
        c.execute("INSERT INTO signals (ts, direction, price, zone, grade, status) VALUES (?,?,?,?,?,?)",
                  (time.time(), direction, float(price), round(price / 5.0) * 5.0, grade, "ACTIVE"))
        c.commit()


def fetch_deriv(limit: int = 300, gran: int = 900):
    url = "wss://ws.derivws.com/websockets/v3?app_id=1089"
    headers = ["User-Agent: Mozilla/5.0"]
    for attempt in range(2):
        ws = None
        try:
            ws = websocket.create_connection(url, timeout=7, header=headers)
            ws.send(json.dumps({
                "ticks_history": SYMBOL_DERIV, "count": limit, "end": "latest",
                "granularity": gran, "style": "candles"
            }))
            t0 = time.time()
            while time.time() - t0 < 6:
                res = json.loads(ws.recv())
                if res.get("candles"):
                    df = pd.DataFrame(res["candles"])
                    for col in ("close", "high", "low", "open"):
                        df[col] = pd.to_numeric(df[col], errors="coerce")
                    df["volume"] = 100.0
                    df.index = pd.to_datetime(df["epoch"], unit="s", utc=True)
                    df = df[["open", "high", "low", "close", "volume"]].dropna()
                    return df, float(df["close"].iloc[-1])
        except Exception:
            pass
        finally:
            if ws:
                try: ws.close()
                except Exception: pass
        time.sleep(1.0)
    return None, None


def fetch_yahoo_gc(period="5d", interval="15m", min_len=40):
    try:
        raw = yf.Ticker("GC=F").history(period=period, interval=interval, auto_adjust=False)
        if raw is None or len(raw) < min_len:
            return None, None
        price = float(raw["Close"].iloc[-1])
        raw = raw.reset_index()
        dc = next((c for c in raw.columns if "date" in c.lower()), raw.columns[0])
        raw = raw.rename(columns={dc: "datetime", "Close": "close", "High": "high", "Low": "low", "Open": "open"})
        raw["volume"] = pd.to_numeric(raw.get("Volume", 100.0), errors="coerce").fillna(100.0)
        raw["datetime"] = pd.to_datetime(raw["datetime"], utc=True)
        raw = raw.dropna(subset=["close", "high", "low", "open"]).set_index("datetime")
        return raw[["open", "high", "low", "close", "volume"]].tail(300), price
    except Exception:
        return None, None


def get_market_data():
    df_m15, p = fetch_deriv(300, 900)
    source = "Deriv"
    offset = 0.0

    if p is None:
        log("Deriv WebSocket unavailable. Switching to Yahoo Finance Comex GC=F fallback...")
        df_m15, p = fetch_yahoo_gc("5d", "15m")
        source = "Yahoo GC=F"
        offset = YAHOO_OFFSET_DEFAULT

    if p is None or df_m15 is None or df_m15.empty:
        raise RuntimeError("Fatal: Both Deriv and Yahoo live data pipelines failed.")

    final_price = p + offset
    if offset != 0.0:
        df_m15 = df_m15.copy()
        for col in ("open", "high", "low", "close"):
            df_m15[col] = df_m15[col] + offset

    # Fetch Higher Timeframes (H1 / H4)
    df_h1, _ = fetch_deriv(200, 3600)
    if df_h1 is None:
        df_h1, _ = fetch_yahoo_gc("60d", "1h", min_len=50)
    if df_h1 is not None and offset != 0.0:
        for col in ("open", "high", "low", "close"):
            df_h1[col] = df_h1[col] + offset
    if df_h1 is None:
        df_h1 = df_m15

    df_h4, _ = fetch_deriv(200, 14400)
    if df_h4 is None:
        df_h4, _ = fetch_yahoo_gc("1y", "1d", min_len=40)
    if df_h4 is not None and offset != 0.0:
        for col in ("open", "high", "low", "close"):
            df_h4[col] = df_h4[col] + offset
    if df_h4 is None:
        df_h4 = df_h1

    return final_price, df_m15, df_h1, df_h4, source, offset


def format_telegram_alert(signal, entry_data, atr, consensus, grade, score, regime, anomaly, mem_stats, debate_res, source):
    tier_banner = {
        "A Super": "🚀 <b>GRADE A SUPER+ (PRIME INSTITUTIONAL CONFLUENCE)</b>\n💰 <b>Recommended Risk: 3.0% (3.0x Lot Sizing)</b>",
        "A+++": "🔴 <b>GRADE A+++ (HIGH CONVICTION)</b>\n💰 <b>Recommended Risk: 2.0% (2.0x Lot Sizing)</b>",
        "A++": "🟡 <b>GRADE A++ (STANDARD INSTITUTIONAL)</b>\n💰 <b>Recommended Risk: 1.0% (1.0x Lot Sizing)</b>",
        "A": "🟢 <b>GRADE A (PROBING SCALP)</b>\n💰 <b>Recommended Risk: 0.5% (0.5x Lot Sizing)</b>",
    }.get(grade, "⚪ <b>GRADE B SETUP</b>")

    emoji = "🟢" if signal == "BUY" else "🔴"
    bar_len = int(consensus / 10)
    bar = "█" * bar_len + "░" * (10 - bar_len)

    mem_info = f"{mem_stats.get('n', 0)} cases | {mem_stats.get('winrate', 50):.0f}% WR"

    return f"""{emoji} <b>XAUUSD {signal} EXECUTION ALERT</b>
━━━━━━━━━━━━━━━━━━━━━
{tier_banner}
━━━━━━━━━━━━━━━━━━━━━
📊 <b>Confluence:</b> [{bar}] {consensus:.1f}% (Score: {score:.1f}/100)
🌊 <b>Market Regime:</b> {regime.regime.value} ({regime.confidence:.2f})
🎯 <b>Precision Quality:</b> {entry_data.precision_score:.1f}/100 ({entry_data.precision_grade})
📡 <b>Feed Source:</b> {source}
━━━━━━━━━━━━━━━━━━━━━
<b>Entry Type:</b> {entry_data.entry_type}
<b>Entry Limit Zone:</b> <code>{entry_data.entry_low:.2f} - {entry_data.entry_high:.2f}</code>
<b>Ideal Limit Price:</b> <code>{entry_data.entry_ideal:.2f}</code>
<b>Stop Loss:</b> <code>{entry_data.sl:.2f}</code> ({entry_data.sl_reason})
<b>Risk:</b> <code>{entry_data.risk_points:.2f} pts</code>
━━━━━━━━━━━━━━━━━━━━━
🎯 <b>TP1:</b> <code>{entry_data.tp1:.2f}</code> ({entry_data.rr_tp1}R)
🎯 <b>TP2:</b> <code>{entry_data.tp2:.2f}</code> ({entry_data.rr_tp2}R)
🎯 <b>TP3:</b> <code>{entry_data.tp3:.2f}</code> ({entry_data.rr_tp3}R)
━━━━━━━━━━━━━━━━━━━━━
🧠 <b>Episodic Memory:</b> {mem_info}
⚡ <b>Anomaly Index:</b> {anomaly.score:.2f}
🏛️ <b>AI Council Verdict:</b> {debate_res.get('verdict', 'ABSTAIN')} ({debate_res.get('confidence_mult', 1.0)}x)
⏰ <i>{datetime.datetime.now(WIB).strftime('%d %b %Y | %H:%M WIB')}</i>"""


def main():
    log("=" * 60)
    log("XAUUSD QUANT ENGINE v32.0 (GRADE A SUPER +) RUNNING")
    log("=" * 60)
    _init_db()

    if is_paused() and not FORCE_RUN:
        log("Bot paused by user command. Skipping scan.")
        return 0

    try:
        price, df_m15, df_h1, df_h4, source, offset = get_market_data()
        log(f"Market connected: Price={price:.2f} Source={source} Bars={len(df_m15)}")
    except Exception as e:
        log(f"Data feed error: {e}")
        return 1

    memory = Memory()
    calibrator = Calibrator()
    meta = MetaLearner()
    tracker = EngineTracker()

    regime = detect_regime(df_m15)
    anomaly = detect_anomaly(df_m15)
    _, mem_stats = memory.query(df_m15, k=20)

    # Trend calculation
    h1_trend = "BULLISH" if df_h1["close"].iloc[-1] > df_h1["close"].rolling(50, min_periods=10).mean().iloc[-1] else "BEARISH"
    h4_trend = "BULLISH" if df_h4["close"].iloc[-1] > df_h4["close"].rolling(50, min_periods=10).mean().iloc[-1] else "BEARISH"

    buy_w, sell_w = 0.0, 0.0
    states = {}

    for name, fn in ENGINES:
        try:
            sc, w = fn(df_m15)
            t_mult = tracker.get_weight_mult(regime.regime.value, name)
            eff_w = w * t_mult
            states[name] = {"sc": sc, "weight": eff_w}
            if sc > 0:
                buy_w += eff_w * abs(sc)
            elif sc < 0:
                sell_w += eff_w * abs(sc)
        except Exception:
            states[name] = {"sc": 0, "weight": 1.0}

    if h1_trend == "BULLISH": buy_w += 2.5
    else: sell_w += 2.5
    if h4_trend == "BULLISH": buy_w += 1.2
    else: sell_w += 1.2

    total_w = buy_w + sell_w
    if total_w == 0 or buy_w == sell_w:
        log("Market in equilibrium (neutral). Standing by.")
        return 0

    consensus = (max(buy_w, sell_w) / total_w) * 100.0
    signal = "BUY" if buy_w > sell_w else "SELL"
    penalty = meta.penalty(regime.regime.value)
    adjusted_consensus = consensus * penalty

    log(f"Signal={signal} RawConfluence={consensus:.1f}% AdjConfluence={adjusted_consensus:.1f}% Regime={regime.regime.value}")

    if adjusted_consensus < MIN_CONFLUENCE and not FORCE_RUN:
        log(f"Confluence below threshold ({adjusted_consensus:.1f}% < {MIN_CONFLUENCE}%).")
        return 0

    if REQUIRE_MTF and not FORCE_RUN:
        aligned = (signal == "BUY" and h1_trend == "BULLISH") or (signal == "SELL" and h1_trend == "BEARISH")
        if not aligned:
            log(f"MTF filter rejection: {signal} contradicts H1 {h1_trend}.")
            return 0

    if anomaly.is_anomaly and not FORCE_RUN:
        log(f"Anomaly interceptor triggered: Z-Score={anomaly.score:.2f} ({anomaly.reason})")
        return 0

    atr_val = float(df_m15["high"].tail(14).mean() - df_m15["low"].tail(14).mean())
    grade_info = grade_signal(adjusted_consensus, signal, states, h1_trend, h4_trend, atr_val, mem_stats, anomaly.score)

    # Upgrade to A Super
    if grade_info["grade"] == "A+++" and grade_info["score"] >= 90.0:
        grade_info["grade"] = "A Super"

    if not grade_at_least(grade_info["grade"], MIN_GRADE) and not FORCE_RUN:
        log(f"Grade {grade_info['grade']} below threshold {MIN_GRADE}.")
        return 0

    entry_data = calculate_precise_entry(df_m15, signal, price, h4_trend, h1_trend, adjusted_consensus, atr_val)

    if entry_data.precision_score < MIN_PRECISION and not FORCE_RUN:
        log(f"Precision score {entry_data.precision_score:.1f} < {MIN_PRECISION}.")
        return 0

    if is_duplicate(signal, entry_data.entry_ideal, COOLDOWN_MIN) and not FORCE_RUN:
        log("Duplicate signal detected within cooldown window. Discarding.")
        return 0

    debate_res = {"verdict": "AGREE", "confidence_mult": 1.0}
    if GEMINI_API_KEY:
        debate_res = debate(signal, price, adjusted_consensus, regime.regime.value,
                            h1_trend, h4_trend, 50.0, atr_val, mem_stats, anomaly.score, GEMINI_API_KEY)
        if debate_res.get("verdict") == "DISAGREE" and not FORCE_RUN:
            log(f"AI Council rejected signal: {debate_res.get('notes')}")
            return 0

    # Store memory & dispatch signal
    memory.store(df_m15, regime, signal, entry_data.entry_ideal, extra={"grade": grade_info["grade"]})
    save_signal(signal, entry_data.entry_ideal, grade_info["grade"])

    msg = format_telegram_alert(
        signal, entry_data, atr_val, adjusted_consensus,
        grade_info["grade"], grade_info["score"], regime, anomaly,
        mem_stats, debate_res, source
    )

    if TELEGRAM_BOT_TOKEN:
        send_text(TELEGRAM_BOT_TOKEN, msg)
        log("✅ Telegram Alert dispatched successfully!")
    else:
        log("ℹ️ No TELEGRAM_BOT_TOKEN set. Alert printed to stdout.")

    print("\n" + "=" * 60)
    print(msg)
    print("=" * 60 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
