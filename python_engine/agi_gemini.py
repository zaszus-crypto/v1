"""
=============================================================================
AGI GEMINI DEBATE & REFLECTION v32.0 (GRADE A SUPER +)
=============================================================================
AI Institutional Trading Council:
  - Multi-persona debate (Bull Analyst, Bear Risk Officer, Execution Head)
  - Structured confidence multiplier [0.6x to 1.25x]
  - Post-trade psychological & edge reflection
=============================================================================
"""

import os
import json
import html
import re
import datetime
from typing import Optional, List
import requests

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
)


def _gemini_call(prompt: str, api_key: str, timeout: int = 20) -> Optional[str]:
    if not api_key:
        return None
    try:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "maxOutputTokens": 600,
            }
        }
        r = requests.post(
            GEMINI_URL,
            json=payload,
            headers={"Content-Type": "application/json", "X-goog-api-key": api_key},
            timeout=timeout,
        )
        if r.status_code != 200:
            return None
        data = r.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = (candidates[0].get("content") or {}).get("parts") or []
        return parts[0].get("text", "").strip() if parts else None
    except Exception:
        return None


def debate(signal: str, price: float, consensus: float, regime: str,
           h1_trend: str, h4_trend: str, rsi: float, atr: float,
           memory_stats: dict, anomaly_score: float, api_key: str) -> dict:
    if not api_key:
        return {"verdict": "ABSTAIN", "confidence_mult": 1.0, "notes": "No Gemini API Key provided"}

    prompt = f"""You are the Institutional Investment Council for Gold (XAUUSD).
Market Data:
- Direction: {signal} @ {price:.2f}
- Engine Confluence: {consensus:.1f}%
- Market Regime: {regime}
- Trend: H1={h1_trend}, H4={h4_trend}
- RSI: {rsi:.1f} | ATR: {atr:.2f}
- Memory: {memory_stats.get('n', 0)} setups with {memory_stats.get('winrate', 50)}% WR
- Anomaly Score: {anomaly_score:.2f}

Evaluate the setup and provide:
1. Bullish perspective (1 line)
2. Bearish risk perspective (1 line)
3. Verdict: AGREE or DISAGREE or ABSTAIN
4. Confidence Multiplier: Between 0.6 and 1.25
5. Concise institutional note (1 line)

Format strictly as:
VERDICT: <AGREE/DISAGREE/ABSTAIN>
CONFIDENCE_MULT: <number>
NOTES: <text>"""

    text = _gemini_call(prompt, api_key)
    out = {"verdict": "ABSTAIN", "confidence_mult": 1.0, "notes": "Council unavailable", "raw": text or ""}
    if not text:
        return out

    for line in text.splitlines():
        line_clean = line.strip()
        upper = line_clean.upper()
        if upper.startswith("VERDICT:"):
            val = line_clean.split(":", 1)[1].strip().upper()
            if "DISAGREE" in val:
                out["verdict"] = "DISAGREE"
            elif "AGREE" in val:
                out["verdict"] = "AGREE"
        elif upper.startswith("CONFIDENCE_MULT:"):
            try:
                num = float(re.findall(r"[-+]?\d*\.\d+|\d+", line_clean)[0])
                out["confidence_mult"] = float(max(0.6, min(1.25, num)))
            except Exception:
                pass
        elif upper.startswith("NOTES:"):
            out["notes"] = line_clean.split(":", 1)[1].strip()

    return out


def reflect(journal: List[dict], regime: str, api_key: str, interval: int = 10) -> Optional[str]:
    if not api_key or not journal:
        return None
    settled = [t for t in journal if t.get("evaluated")]
    if len(settled) < 5:
        return None

    recent = settled[-15:]
    wins = sum(1 for t in recent if t.get("result") == "WIN")
    losses = sum(1 for t in recent if t.get("result") == "LOSS")
    wr = (wins / max(1, wins + losses)) * 100.0

    prompt = f"""As Head Quant Coach, review these last {len(recent)} XAUUSD trades:
Winrate: {wr:.1f}% ({wins}W / {losses}L) in Regime: {regime}.
Give 3 bullet points: (1) Winning pattern, (2) Common leak, (3) Next 10-trade actionable rule."""

    return _gemini_call(prompt, api_key, timeout=25)
