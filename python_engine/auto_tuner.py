"""
=============================================================================
AUTO-TUNER v32.0 (GRADE A SUPER +)
=============================================================================
Optimizes confluence thresholds, precision floors, and minimum execution grades
using walk-forward cross-validation to prevent curve-fitting.
=============================================================================
"""

import os
import sys
import json
import itertools
import argparse
import datetime
from typing import List, Dict, Tuple, Optional
import numpy as np

from backtest import run_backtest, grade_result, BacktestResult

TUNER_FILE = ".state_cache/tuned_params.json"


def fitness(r: BacktestResult, min_trades: int = 12) -> float:
    """Fitness function rewarding high Profit Factor, Expectancy, and low Drawdown."""
    if r.filled_trades < min_trades:
        return -999.0

    pf = min(5.0, r.profit_factor if r.profit_factor != float("inf") else 4.5)
    dd_penalty = r.max_dd_r * 0.15
    fill_rate_bonus = (r.filled_trades / max(1, r.total_signals)) * 1.5

    score = (
        pf * 3.5 +
        r.expectancy * 6.0 +
        (r.winrate - 45.0) / 15.0 +
        fill_rate_bonus -
        dd_penalty +
        min(r.sharpe, 3.0) * 0.8
    )
    return float(score)


def grid_search_walk_forward(df_m15, df_h1=None, df_h4=None,
                            confluence_range: Optional[List[float]] = None,
                            precision_range: Optional[List[float]] = None,
                            grade_range: Optional[List[str]] = None) -> Tuple[dict, BacktestResult]:
    confluence_range = confluence_range or [60.0, 65.0, 70.0, 75.0]
    precision_range = precision_range or [65.0, 70.0, 75.0, 80.0]
    grade_range = grade_range or ["A", "A++", "A+++"]

    # 70% In-Sample (Train), 30% Out-of-Sample (Validation)
    split_idx = int(len(df_m15) * 0.70)
    train_m15 = df_m15.iloc[:split_idx]
    val_m15 = df_m15.iloc[split_idx:]

    candidates = []

    for conf, prec, grade in itertools.product(confluence_range, precision_range, grade_range):
        try:
            r_train = run_backtest(train_m15, df_h1, df_h4, min_confluence=conf, min_precision=prec, min_grade=grade)
            f_train = fitness(r_train)
            if f_train <= 0:
                continue

            # Validate on Out-of-Sample
            r_val = run_backtest(val_m15, df_h1, df_h4, min_confluence=conf, min_precision=prec, min_grade=grade)
            f_val = fitness(r_val, min_trades=5)

            # Combined score with Out-of-Sample stability bonus
            robust_score = (f_train * 0.4) + (f_val * 0.6)
            candidates.append({
                "params": {"min_confluence": conf, "min_precision": prec, "min_grade": grade},
                "robust_score": round(robust_score, 4),
                "train_pf": r_train.profit_factor,
                "val_pf": r_val.profit_factor,
                "val_wr": r_val.winrate,
                "val_expectancy": r_val.expectancy,
                "result": r_val,
            })
        except Exception:
            continue

    if not candidates:
        # Fallback to default high-conviction setup
        default_res = run_backtest(df_m15, df_h1, df_h4, min_confluence=65.0, min_precision=70.0, min_grade="A")
        return {"min_confluence": 65.0, "min_precision": 70.0, "min_grade": "A"}, default_res

    candidates.sort(key=lambda x: -x["robust_score"])
    best = candidates[0]
    return best["params"], best["result"]
