"""
=============================================================================
PRECISION ENTRY SYSTEM v32.0 (GRADE A SUPER +)
=============================================================================
Computes Institutional Entry Zones, Structural SL, and Multi-Tier TP:
  - FVG Zone Limit Fill (50% Equilibrium)
  - Order Block Mitigation
  - Liquidity Void Target Levels
  - Psychological Round Numbers
  - 4-Tier Dynamic Lot Sizing:
      * A Super (Score >= 90) : 3.0x Max Institutional (3.0% Risk)
      * A+++    (Score >= 85) : 2.0x High Conviction   (2.0% Risk)
      * A++     (Score >= 75) : 1.0x Standard Base     (1.0% Risk)
      * A       (Score >= 65) : 0.5x Probing / Scalp   (0.5% Risk)
=============================================================================
"""

from dataclasses import dataclass, field
from typing import List, Optional
import numpy as np
import pandas as pd

from engines import (
    find_swings, detect_fvg, detect_order_blocks,
    find_nearest_zone, Zone,
)


@dataclass
class PrecisionEntry:
    # Entry zone
    entry_low: float
    entry_high: float
    entry_ideal: float
    entry_type: str

    # Structural Stop Loss
    sl: float
    sl_reason: str

    # Take Profit Targets
    tp1: float
    tp2: float
    tp3: float
    tp4: float
    tp_reasons: List[str]

    # Risk Metrics
    risk_points: float
    rr_tp1: float
    rr_tp2: float
    rr_tp3: float

    # Sizing & Confidence
    precision_score: float
    precision_grade: str
    lot_tier: str
    lot_multiplier: float
    risk_pct_recommended: float
    notes: List[str] = field(default_factory=list)


def _round_number_levels(price: float, count: int = 3, step: float = 10.0) -> List[float]:
    base = round(price / step) * step
    return [base + i * step for i in range(-count, count + 1)]


def _find_swing_above(price: float, swings) -> Optional[float]:
    highs = sorted([s.price for s in swings if s.kind == "high" and s.price > (price + 0.5)])
    return highs[0] if highs else None


def _find_swing_below(price: float, swings) -> Optional[float]:
    lows = sorted([s.price for s in swings if s.kind == "low" and s.price < (price - 0.5)], reverse=True)
    return lows[0] if lows else None


def _grade_precision(score: float) -> str:
    if score >= 90.0:
        return "A Super"
    if score >= 85.0:
        return "A+++"
    if score >= 75.0:
        return "A++"
    if score >= 65.0:
        return "A"
    if score >= 55.0:
        return "B"
    return "C"


def calculate_precise_entry(df: pd.DataFrame, signal: str,
                            base_price: float,
                            h4_trend: str, h1_trend: str,
                            consensus: float,
                            atr_value: float) -> PrecisionEntry:
    """Calculates limit order entry zones, structural stops, and profit targets."""
    notes: List[str] = []
    score = 0.0

    swings = find_swings(df, lookback=4, limit=25)
    fvgs = detect_fvg(df, max_zones=10)
    obs = detect_order_blocks(df, max_obs=10)

    # 1. IDENTIFY OPTIMAL ENTRY ZONE
    entry_type = "STRUCTURE_PULLBACK"
    entry_ideal = base_price
    entry_low = base_price
    entry_high = base_price

    if signal == "BUY":
        fvg = find_nearest_zone(fvgs, base_price, "FVG_BULL", below=True)
        ob = find_nearest_zone(obs, base_price, "OB_BULL", below=True)

        candidates = []
        if fvg and (base_price - fvg.top) <= (atr_value * 2.5):
            candidates.append(("FVG_FILL", fvg, fvg.strength + 0.25))
        if ob and (base_price - ob.top) <= (atr_value * 2.5):
            candidates.append(("OB_RETEST", ob, ob.strength + 0.20))

        if candidates:
            candidates.sort(key=lambda x: -x[2])
            entry_type, zone, _ = candidates[0]
            entry_high = min(zone.top, base_price)
            entry_low = zone.bottom
            entry_ideal = (entry_high + entry_low) / 2.0
            notes.append(f"Limit order in {entry_type}: {entry_low:.2f} - {entry_high:.2f}")
            score += 20.0 if entry_type == "FVG_FILL" else 15.0
        else:
            e21 = float(df["close"].ewm(span=21, adjust=False).mean().iloc[-1])
            if base_price >= e21:
                entry_ideal = e21
                entry_low = entry_ideal - atr_value * 0.15
                entry_high = min(base_price, entry_ideal + atr_value * 0.15)
                entry_type = "STRUCTURE_PULLBACK"
                notes.append(f"Pullback to EMA-21 dynamic support: {entry_ideal:.2f}")
                score += 8.0
    else:  # SELL
        fvg = find_nearest_zone(fvgs, base_price, "FVG_BEAR", below=False)
        ob = find_nearest_zone(obs, base_price, "OB_BEAR", below=False)

        candidates = []
        if fvg and (fvg.bottom - base_price) <= (atr_value * 2.5):
            candidates.append(("FVG_FILL", fvg, fvg.strength + 0.25))
        if ob and (ob.bottom - base_price) <= (atr_value * 2.5):
            candidates.append(("OB_RETEST", ob, ob.strength + 0.20))

        if candidates:
            candidates.sort(key=lambda x: -x[2])
            entry_type, zone, _ = candidates[0]
            entry_low = max(zone.bottom, base_price)
            entry_high = zone.top
            entry_ideal = (entry_high + entry_low) / 2.0
            notes.append(f"Limit order in {entry_type}: {entry_low:.2f} - {entry_high:.2f}")
            score += 20.0 if entry_type == "FVG_FILL" else 15.0
        else:
            e21 = float(df["close"].ewm(span=21, adjust=False).mean().iloc[-1])
            if base_price <= e21:
                entry_ideal = e21
                entry_low = max(base_price, entry_ideal - atr_value * 0.15)
                entry_high = entry_ideal + atr_value * 0.15
                entry_type = "STRUCTURE_PULLBACK"
                notes.append(f"Pullback to EMA-21 dynamic resistance: {entry_ideal:.2f}")
                score += 8.0

    # 2. STRUCTURAL STOP LOSS (WITH VOLATILITY BUFFER)
    buffer = atr_value * 0.30

    if signal == "BUY":
        swing_low = _find_swing_below(entry_low, swings)
        if swing_low:
            sl = swing_low - buffer
            sl_reason = f"Below major swing low ({swing_low:.2f} - {buffer:.2f})"
            score += 15.0
        else:
            sl = entry_low - atr_value * 1.3
            sl_reason = f"Volatility stop ({atr_value*1.3:.2f} pts)"
            score += 5.0

        # Enforce minimum risk floor
        if (entry_ideal - sl) < (atr_value * 0.7):
            sl = entry_ideal - (atr_value * 0.9)
            sl_reason += " (widened to minimum volatility floor)"
    else:  # SELL
        swing_high = _find_swing_above(entry_high, swings)
        if swing_high:
            sl = swing_high + buffer
            sl_reason = f"Above major swing high ({swing_high:.2f} + {buffer:.2f})"
            score += 15.0
        else:
            sl = entry_high + atr_value * 1.3
            sl_reason = f"Volatility stop ({atr_value*1.3:.2f} pts)"
            score += 5.0

        if (sl - entry_ideal) < (atr_value * 0.7):
            sl = entry_ideal + (atr_value * 0.9)
            sl_reason += " (widened to minimum volatility floor)"

    risk_points = abs(entry_ideal - sl)

    # 3. TAKE PROFIT TARGETS
    tp_reasons: List[str] = []

    if signal == "BUY":
        sw_above = _find_swing_above(entry_high, swings)
        tp1 = sw_above if sw_above and (sw_above - entry_ideal) >= (risk_points * 1.2) else (entry_ideal + risk_points * 1.5)
        tp_reasons.append(f"TP1: Major liquidity pool @ {tp1:.2f}")

        fvg_bear = find_nearest_zone(fvgs, entry_high, "FVG_BEAR", below=False)
        tp2 = fvg_bear.bottom if fvg_bear and (fvg_bear.bottom > tp1) else (entry_ideal + risk_points * 2.5)
        tp_reasons.append(f"TP2: Premium imbalance boundary @ {tp2:.2f}")

        round_levels = _round_number_levels(entry_ideal, 4, 10.0)
        round_above = sorted([r for r in round_levels if r > tp2])
        tp3 = round_above[0] if round_above else (entry_ideal + risk_points * 4.0)
        tp_reasons.append(f"TP3: Institutional round level @ {tp3:.2f}")

        tp4 = entry_ideal + risk_points * 6.0
        tp_reasons.append(f"TP4: Macro trend extension @ {tp4:.2f}")
    else:  # SELL
        sw_below = _find_swing_below(entry_low, swings)
        tp1 = sw_below if sw_below and (entry_ideal - sw_below) >= (risk_points * 1.2) else (entry_ideal - risk_points * 1.5)
        tp_reasons.append(f"TP1: Major liquidity pool @ {tp1:.2f}")

        fvg_bull = find_nearest_zone(fvgs, entry_low, "FVG_BULL", below=True)
        tp2 = fvg_bull.top if fvg_bull and (fvg_bull.top < tp1) else (entry_ideal - risk_points * 2.5)
        tp_reasons.append(f"TP2: Discount imbalance boundary @ {tp2:.2f}")

        round_levels = _round_number_levels(entry_ideal, 4, 10.0)
        round_below = sorted([r for r in round_levels if r < tp2], reverse=True)
        tp3 = round_below[0] if round_below else (entry_ideal - risk_points * 4.0)
        tp_reasons.append(f"TP3: Institutional round level @ {tp3:.2f}")

        tp4 = entry_ideal - risk_points * 6.0
        tp_reasons.append(f"TP4: Macro trend extension @ {tp4:.2f}")

    risk = max(risk_points, 0.1)
    rr1 = abs(tp1 - entry_ideal) / risk
    rr2 = abs(tp2 - entry_ideal) / risk
    rr3 = abs(tp3 - entry_ideal) / risk

    # 4. CONFLUENCE & PRECISION SCORING
    if signal == "BUY":
        if "BULLISH" in h4_trend and "BULLISH" in h1_trend:
            score += 25.0
            notes.append("Dual H1+H4 trend synergy")
        elif "BULLISH" in h1_trend:
            score += 15.0
    else:
        if "BEARISH" in h4_trend and "BEARISH" in h1_trend:
            score += 25.0
            notes.append("Dual H1+H4 trend synergy")
        elif "BEARISH" in h1_trend:
            score += 15.0

    score += min(20.0, max(0.0, (consensus - 55.0) / 45.0 * 20.0))

    if rr1 >= 1.5:
        score += 10.0
    if rr2 >= 2.5:
        score += 10.0

    final_score = float(np.clip(score, 0.0, 100.0))
    grade = _grade_precision(final_score)

    # 5. DYNAMIC 4-TIER LOT SIZING ALLOCATION
    if grade == "A Super":
        lot_tier = "🚀 A Super (Maximum Institutional)"
        lot_mult = 3.0
        risk_pct = 3.0
    elif grade == "A+++":
        lot_tier = "🔴 A+++ (High Conviction)"
        lot_mult = 2.0
        risk_pct = 2.0
    elif grade == "A++":
        lot_tier = "🟡 A++ (Standard Institutional)"
        lot_mult = 1.0
        risk_pct = 1.0
    elif grade == "A":
        lot_tier = "🟢 A (Probing / Scalp)"
        lot_mult = 0.5
        risk_pct = 0.5
    else:
        lot_tier = "⚪ B / C (Skip or Sub-threshold)"
        lot_mult = 0.0
        risk_pct = 0.0

    return PrecisionEntry(
        entry_low=round(entry_low, 2),
        entry_high=round(entry_high, 2),
        entry_ideal=round(entry_ideal, 2),
        entry_type=entry_type,
        sl=round(sl, 2),
        sl_reason=sl_reason,
        tp1=round(tp1, 2),
        tp2=round(tp2, 2),
        tp3=round(tp3, 2),
        tp4=round(tp4, 2),
        tp_reasons=tp_reasons,
        risk_points=round(risk_points, 2),
        rr_tp1=round(rr1, 2),
        rr_tp2=round(rr2, 2),
        rr_tp3=round(rr3, 2),
        precision_score=round(final_score, 1),
        precision_grade=grade,
        lot_tier=lot_tier,
        lot_multiplier=lot_mult,
        risk_pct_recommended=risk_pct,
        notes=notes,
    )
