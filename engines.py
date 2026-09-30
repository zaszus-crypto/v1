"""
=============================================================================
INSTITUTIONAL ENGINES v32.0 (GRADE A SUPER +)
=============================================================================
10 Production Quantitative Engines + Market Structure + Order Flow Zones:
  1. TREND_STACK       - Multi-EMA 9/21/50/200 Ribbon
  2. MARKET_STRUCTURE  - Fractal BOS (Break of Structure) & CHoCH
  3. LIQUIDITY_SWEEP   - Stop-Run Reversal Rejection
  4. FVG_DETECT        - Fair Value Gap Imbalance (Unmitigated)
  5. ORDER_BLOCK       - Institutional Footprint Retest
  6. RSI_DIVERGENCE    - Regular Bullish / Bearish Divergence
  7. VOLUME_CLIMAX     - Exhaustion Wick + Climax Spike
  8. VOLATILITY_REGIME - Bollinger/ATR Compression & Expansion Drive
  9. SESSION_MOMENTUM  - London & NY Opening Session Flows (UTC-aligned)
  10. MOMENTUM_ROC     - Volatility-Adjusted Rate of Change
=============================================================================
"""

import datetime
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
import numpy as np
import pandas as pd


# =============================================================================
# TECHNICAL PRIMITIVES
# =============================================================================
def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()


def atr_series(df: pd.DataFrame, p: int = 14) -> pd.Series:
    h, l, c = df["high"].astype(float), df["low"].astype(float), df["close"].astype(float)
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / max(1, p), min_periods=p, adjust=False).mean()


def rsi_series(series: pd.Series, p: int = 14) -> pd.Series:
    d = series.diff()
    gain = d.where(d > 0, 0.0).ewm(alpha=1.0 / p, min_periods=p, adjust=False).mean()
    loss = (-d.where(d < 0, 0.0)).ewm(alpha=1.0 / p, min_periods=p, adjust=False).mean()
    rs = gain / (loss.replace(0, np.nan) + 1e-9)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi.fillna(50.0)


# =============================================================================
# MARKET STRUCTURE & FRACTALS
# =============================================================================
@dataclass
class SwingPoint:
    idx: int
    price: float
    kind: str  # "high" or "low"
    time: Optional[str] = None


def find_swings(df: pd.DataFrame, lookback: int = 4, limit: int = 25) -> List[SwingPoint]:
    """Fractal swing detection with strict boundary protection."""
    swings: List[SwingPoint] = []
    if df is None or len(df) < lookback * 2 + 1:
        return swings

    highs = df["high"].astype(float).values
    lows = df["low"].astype(float).values
    n = len(df)

    for i in range(lookback, n - lookback):
        window_highs = highs[i - lookback: i + lookback + 1]
        window_lows = lows[i - lookback: i + lookback + 1]

        if highs[i] == np.max(window_highs) and highs[i] > highs[i - 1]:
            swings.append(SwingPoint(i, float(highs[i]), "high"))
        elif lows[i] == np.min(window_lows) and lows[i] < lows[i - 1]:
            swings.append(SwingPoint(i, float(lows[i]), "low"))

    return swings[-limit:]


def detect_bos_choch(df: pd.DataFrame, swings: List[SwingPoint]) -> Dict:
    """Break of Structure (trend continuation) & CHoCH (reversal)."""
    result = {"bos": None, "choch": None, "trend": "NEUTRAL", "level": None}
    if len(swings) < 4 or len(df) < 10:
        return result

    highs = [s for s in swings if s.kind == "high"]
    lows = [s for s in swings if s.kind == "low"]
    if len(highs) < 2 or len(lows) < 2:
        return result

    last_close = float(df["close"].iloc[-1])
    recent_hh = highs[-1].price > highs[-2].price
    recent_hl = lows[-1].price > lows[-2].price
    recent_lh = highs[-1].price < highs[-2].price
    recent_ll = lows[-1].price < lows[-2].price

    if recent_hh and recent_hl:
        result["trend"] = "BULLISH"
    elif recent_lh and recent_ll:
        result["trend"] = "BEARISH"

    # BOS identification
    if result["trend"] == "BULLISH" and last_close > highs[-1].price:
        result["bos"] = "BULLISH"
        result["level"] = highs[-1].price
    elif result["trend"] == "BEARISH" and last_close < lows[-1].price:
        result["bos"] = "BEARISH"
        result["level"] = lows[-1].price

    # CHoCH identification (Breaking the opposite major structural point)
    if result["trend"] == "BULLISH" and last_close < lows[-1].price:
        result["choch"] = "BEARISH"
        result["level"] = lows[-1].price
    elif result["trend"] == "BEARISH" and last_close > highs[-1].price:
        result["choch"] = "BULLISH"
        result["level"] = highs[-1].price

    return result


# =============================================================================
# FAIR VALUE GAPS & ORDER BLOCKS
# =============================================================================
@dataclass
class Zone:
    kind: str          # "FVG_BULL", "FVG_BEAR", "OB_BULL", "OB_BEAR"
    top: float
    bottom: float
    idx: int
    strength: float

    @property
    def mid(self) -> float:
        return (self.top + self.bottom) / 2.0


def detect_fvg(df: pd.DataFrame, max_zones: int = 10) -> List[Zone]:
    """Identifies active unmitigated Fair Value Gaps."""
    zones: List[Zone] = []
    if df is None or len(df) < 5:
        return zones

    h = df["high"].astype(float).values
    l = df["low"].astype(float).values
    c = df["close"].astype(float).values
    n = len(df)

    curr_price = c[-1]
    atr = (np.mean(h[-20:] - l[-20:]) if n >= 20 else 5.0) + 1e-9

    for i in range(2, n):
        # Bullish FVG: Low of candle i > High of candle i-2
        if l[i] > h[i - 2]:
            gap = l[i] - h[i - 2]
            if gap >= atr * 0.15:
                # Check if mitigated by any subsequent candle before now
                is_mitigated = False
                for j in range(i + 1, n - 1):
                    if l[j] <= h[i - 2]:
                        is_mitigated = True
                        break
                if not is_mitigated:
                    str_score = min(1.0, gap / atr)
                    zones.append(Zone("FVG_BULL", top=float(l[i]), bottom=float(h[i - 2]), idx=i, strength=str_score))

        # Bearish FVG: High of candle i < Low of candle i-2
        elif h[i] < l[i - 2]:
            gap = l[i - 2] - h[i]
            if gap >= atr * 0.15:
                is_mitigated = False
                for j in range(i + 1, n - 1):
                    if h[j] >= l[i - 2]:
                        is_mitigated = True
                        break
                if not is_mitigated:
                    str_score = min(1.0, gap / atr)
                    zones.append(Zone("FVG_BEAR", top=float(l[i - 2]), bottom=float(h[i]), idx=i, strength=str_score))

    return zones[-max_zones:]


def detect_order_blocks(df: pd.DataFrame, max_obs: int = 10) -> List[Zone]:
    """Identifies institutional order blocks with strong impulse validation."""
    obs: List[Zone] = []
    if df is None or len(df) < 10:
        return obs

    o = df["open"].astype(float).values
    h = df["high"].astype(float).values
    l = df["low"].astype(float).values
    c = df["close"].astype(float).values
    n = len(df)

    body = np.abs(c - o)
    avg_body = pd.Series(body).rolling(15, min_periods=5).mean().values

    for i in range(2, n - 2):
        next_body = abs(c[i + 1] - o[i + 1])
        is_impulse = next_body > (avg_body[i] * 1.6)

        if not is_impulse:
            continue

        # Bullish OB: Bearish candle followed by strong bullish displacement
        if c[i] < o[i] and c[i + 1] > o[i + 1]:
            top, bottom = float(max(o[i], c[i])), float(min(o[i], c[i]))
            obs.append(Zone("OB_BULL", top=top, bottom=bottom, idx=i, strength=0.75))

        # Bearish OB: Bullish candle followed by strong bearish displacement
        elif c[i] > o[i] and c[i + 1] < o[i + 1]:
            top, bottom = float(max(o[i], c[i])), float(min(o[i], c[i]))
            obs.append(Zone("OB_BEAR", top=top, bottom=bottom, idx=i, strength=0.75))

    return obs[-max_obs:]


def find_nearest_zone(zones: List[Zone], price: float, kind_prefix: str, below: bool) -> Optional[Zone]:
    candidates = [z for z in zones if z.kind.startswith(kind_prefix)]
    if below:
        cands = [z for z in candidates if z.top <= price]
        cands.sort(key=lambda z: price - z.top)
        return cands[0] if cands else None
    else:
        cands = [z for z in candidates if z.bottom >= price]
        cands.sort(key=lambda z: z.bottom - price)
        return cands[0] if cands else None


# =============================================================================
# 10 PRODUCTION ENGINES
# Returns (signal: -1 | 0 | 1, weight: float)
# =============================================================================
def trend_stack(df: pd.DataFrame) -> Tuple[int, float]:
    """EMA 9 / 21 / 50 / 200 alignment ribbon."""
    try:
        c = df["close"].astype(float)
        if len(c) < 30:
            return (0, 1.0)
        e9 = ema(c, 9).iloc[-1]
        e21 = ema(c, 21).iloc[-1]
        e50 = ema(c, 50).iloc[-1]
        e200 = ema(c, min(200, len(c) - 1)).iloc[-1]
        p = c.iloc[-1]

        if p > e9 > e21 > e50 > e200:
            return (1, 2.2)
        if p < e9 < e21 < e50 < e200:
            return (-1, 2.2)
        if p > e21 and e9 > e21:
            return (1, 1.2)
        if p < e21 and e9 < e21:
            return (-1, 1.2)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def market_structure(df: pd.DataFrame) -> Tuple[int, float]:
    """BOS & CHoCH structure state."""
    try:
        swings = find_swings(df, lookback=4, limit=20)
        s = detect_bos_choch(df, swings)
        if s["bos"] == "BULLISH":
            return (1, 2.0)
        if s["bos"] == "BEARISH":
            return (-1, 2.0)
        if s["choch"] == "BULLISH":
            return (1, 1.7)
        if s["choch"] == "BEARISH":
            return (-1, 1.7)
        if s["trend"] == "BULLISH":
            return (1, 1.0)
        if s["trend"] == "BEARISH":
            return (-1, 1.0)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def liquidity_sweep(df: pd.DataFrame) -> Tuple[int, float]:
    """Detects stop runs beyond swing highs/lows with rejection close."""
    try:
        if len(df) < 25:
            return (0, 1.0)
        swings = find_swings(df.iloc[:-2], lookback=4, limit=15)
        highs = [s.price for s in swings if s.kind == "high"]
        lows = [s.price for s in swings if s.kind == "low"]
        if not highs or not lows:
            return (0, 1.0)

        prev = df.iloc[-2]
        last = df.iloc[-1]
        target_high = max(highs[-3:])
        target_low = min(lows[-3:])

        # Bullish sweep: pierced below swing low but closed back above
        if prev["low"] < target_low and last["close"] > target_low:
            return (1, 1.9)
        # Bearish sweep: pierced above swing high but closed back below
        if prev["high"] > target_high and last["close"] < target_high:
            return (-1, 1.9)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def fvg_detect(df: pd.DataFrame) -> Tuple[int, float]:
    """Interaction with unmitigated Fair Value Gaps."""
    try:
        zones = detect_fvg(df, max_zones=6)
        if not zones:
            return (0, 1.0)
        p = float(df["close"].iloc[-1])
        last = zones[-1]

        if last.kind == "FVG_BULL" and last.bottom <= p <= (last.top + 0.5):
            return (1, 1.6)
        if last.kind == "FVG_BEAR" and (last.bottom - 0.5) <= p <= last.top:
            return (-1, 1.6)

        # Freshly formed FVG within 3 bars
        if last.idx >= len(df) - 3:
            return (1 if last.kind == "FVG_BULL" else -1, 1.3)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def order_block(df: pd.DataFrame) -> Tuple[int, float]:
    """Order block mitigation & pin-bar rejection confirmation."""
    try:
        obs = detect_order_blocks(df, max_obs=6)
        if not obs:
            return (0, 1.0)
        p = float(df["close"].iloc[-1])
        last = obs[-1]
        in_zone = last.bottom <= p <= last.top

        c = df.iloc[-1]
        body = abs(c["close"] - c["open"])
        rng = (c["high"] - c["low"]) + 1e-9
        is_pin = (body / rng) < 0.45

        if in_zone and is_pin:
            if last.kind == "OB_BULL":
                return (1, 1.8)
            elif last.kind == "OB_BEAR":
                return (-1, 1.8)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def rsi_divergence(df: pd.DataFrame) -> Tuple[int, float]:
    """Classic RSI divergence using local swing comparison."""
    try:
        if len(df) < 35:
            return (0, 1.0)
        c = df["close"].astype(float)
        r = rsi_series(c, 14)

        swings = find_swings(df, lookback=3, limit=8)
        highs = [s for s in swings if s.kind == "high"][-2:]
        lows = [s for s in swings if s.kind == "low"][-2:]

        # Bearish: Price makes Higher High, RSI makes Lower High
        if len(highs) == 2:
            p_hh = highs[-1].price > highs[-2].price
            r_now = float(r.iloc[highs[-1].idx])
            r_prev = float(r.iloc[highs[-2].idx])
            if p_hh and (r_now < r_prev) and (r_now > 58.0):
                return (-1, 1.7)

        # Bullish: Price makes Lower Low, RSI makes Higher Low
        if len(lows) == 2:
            p_ll = lows[-1].price < lows[-2].price
            r_now = float(r.iloc[lows[-1].idx])
            r_prev = float(r.iloc[lows[-2].idx])
            if p_ll and (r_now > r_prev) and (r_now < 42.0):
                return (1, 1.7)

        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def volume_climax(df: pd.DataFrame) -> Tuple[int, float]:
    """Exhaustion wick with 2.2x volume surge."""
    try:
        if "volume" not in df or len(df) < 25:
            return (0, 1.0)
        v = df["volume"].astype(float)
        v_ma = v.rolling(20).mean().iloc[-1] + 1e-9
        if v.iloc[-1] < (v_ma * 2.1):
            return (0, 1.0)

        c = df.iloc[-1]
        body = abs(c["close"] - c["open"])
        upper_wick = c["high"] - max(c["close"], c["open"])
        lower_wick = min(c["close"], c["open"]) - c["low"]

        if lower_wick > body * 2.0 and lower_wick > upper_wick:
            return (1, 1.5)
        if upper_wick > body * 2.0 and upper_wick > lower_wick:
            return (-1, 1.5)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def volatility_regime(df: pd.DataFrame) -> Tuple[int, float]:
    """ATR expansion out of compression phase."""
    try:
        a = atr_series(df, 14)
        if len(a) < 30:
            return (0, 1.0)
        curr_a = a.iloc[-1]
        prev_a = a.iloc[-5]
        avg_a = a.rolling(30).mean().iloc[-1]

        expanding = (curr_a > prev_a * 1.15) and (curr_a > avg_a)
        if not expanding:
            return (0, 1.0)

        c = df.iloc[-1]
        return (1, 1.4) if c["close"] > c["open"] else (-1, 1.4)
    except Exception:
        return (0, 1.0)


def session_momentum(df: pd.DataFrame) -> Tuple[int, float]:
    """UTC-grounded London and New York opening drive."""
    try:
        if not isinstance(df.index, pd.DatetimeIndex) or len(df) < 10:
            return (0, 1.0)
        last_dt = df.index[-1]
        if last_dt.tzinfo is not None:
            utc_hour = last_dt.tz_convert("UTC").hour
        else:
            utc_hour = last_dt.hour

        # London open: 07:00-09:30 UTC | New York open: 12:30-14:30 UTC
        in_open = (7 <= utc_hour <= 9) or (12 <= utc_hour <= 14)
        if not in_open:
            return (0, 1.0)

        rec = df["close"].iloc[-4:].mean()
        prev = df["close"].iloc[-8:-4].mean()
        if rec > prev * 1.0006:
            return (1, 1.5)
        elif rec < prev * 0.9994:
            return (-1, 1.5)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


def momentum_roc(df: pd.DataFrame) -> Tuple[int, float]:
    """Rate of change slope with acceleration confirmation."""
    try:
        c = df["close"].astype(float)
        if len(c) < 25:
            return (0, 1.0)
        roc = (c.iloc[-1] - c.iloc[-10]) / (c.iloc[-10] + 1e-9)
        roc_prev = (c.iloc[-5] - c.iloc[-15]) / (c.iloc[-15] + 1e-9)

        if roc > 0.0012 and roc > roc_prev:
            return (1, 1.3)
        elif roc < -0.0012 and roc < roc_prev:
            return (-1, 1.3)
        return (0, 1.0)
    except Exception:
        return (0, 1.0)


# =============================================================================
# ENGINE REGISTRY
# =============================================================================
ENGINES = [
    ("TREND_STACK",       trend_stack),
    ("MARKET_STRUCTURE",  market_structure),
    ("LIQUIDITY_SWEEP",   liquidity_sweep),
    ("FVG_DETECT",        fvg_detect),
    ("ORDER_BLOCK",       order_block),
    ("RSI_DIVERGENCE",    rsi_divergence),
    ("VOLUME_CLIMAX",     volume_climax),
    ("VOLATILITY_REGIME", volatility_regime),
    ("SESSION_MOMENTUM",  session_momentum),
    ("MOMENTUM_ROC",      momentum_roc),
]
