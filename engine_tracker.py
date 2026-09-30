"""
=============================================================================
ENGINE TRACKER v32.0 (GRADE A SUPER +)
=============================================================================
Tracks individual quantitative engine accuracy partitioned by market regime.
Features:
  - Thread-safe RLock protection
  - Smooth asymptotic weight multipliers [0.3x to 1.6x]
  - Auto-quarantine: disables underperforming engines per regime (<38% winrate)
  - Zero-division & empty-slice guards
=============================================================================
"""

import os
import json
import threading
import datetime
from typing import Dict, Optional, List
from dataclasses import dataclass, field, asdict

TRACKER_FILE = ".state_cache/engine_tracker.json"


@dataclass
class EngineStat:
    n: int = 0
    correct: int = 0
    recent_correct: List[int] = field(default_factory=list)
    disabled: bool = False
    disabled_at: Optional[str] = None
    disabled_reason: str = ""

    def accuracy(self) -> float:
        return (self.correct / self.n) if self.n > 0 else 0.50

    def recent_accuracy(self, window: int = 30) -> float:
        if not self.recent_correct:
            return self.accuracy()
        window_data = self.recent_correct[-window:]
        return sum(window_data) / max(1, len(window_data))


class EngineTracker:
    def __init__(self, path: str = TRACKER_FILE,
                 min_samples: int = 15,
                 disable_threshold: float = 0.38,
                 reenable_threshold: float = 0.52):
        self.path = path
        self.min_samples = min_samples
        self.disable_threshold = disable_threshold
        self.reenable_threshold = reenable_threshold
        self.lock = threading.RLock()
        self.data: Dict[str, Dict[str, EngineStat]] = {}
        self._load()

    def _load(self):
        with self.lock:
            if not os.path.exists(self.path):
                return
            try:
                with open(self.path, "r") as f:
                    raw = json.load(f)
                for regime, engines in raw.items():
                    self.data[regime] = {}
                    for name, stat_dict in engines.items():
                        self.data[regime][name] = EngineStat(**stat_dict)
            except Exception:
                self.data = {}

    def _save(self):
        with self.lock:
            os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
            out = {}
            for regime, engines in self.data.items():
                out[regime] = {name: asdict(s) for name, s in engines.items()}
            tmp = self.path + ".tmp"
            with open(tmp, "w") as f:
                json.dump(out, f, indent=2)
            os.replace(tmp, self.path)

    def update(self, regime: str, engine_name: str,
               engine_signal: int, trade_signal: str, trade_result: str):
        if engine_signal == 0 or trade_result not in ("WIN", "LOSS"):
            return

        with self.lock:
            regime_stats = self.data.setdefault(regime, {})
            stat = regime_stats.setdefault(engine_name, EngineStat())

            was_bull = engine_signal > 0
            should_bull = (trade_signal == "BUY")
            engine_correct = (was_bull == should_bull)
            success = (engine_correct and trade_result == "WIN") or (not engine_correct and trade_result == "LOSS")

            stat.n += 1
            if success:
                stat.correct += 1
            stat.recent_correct.append(1 if success else 0)
            if len(stat.recent_correct) > 120:
                stat.recent_correct = stat.recent_correct[-120:]

            if stat.n >= self.min_samples:
                recent_acc = stat.recent_accuracy(window=30)
                if recent_acc < self.disable_threshold and not stat.disabled:
                    stat.disabled = True
                    stat.disabled_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    stat.disabled_reason = f"Recent accuracy ({recent_acc:.1%}) < threshold ({self.disable_threshold:.1%})"
                elif recent_acc >= self.reenable_threshold and stat.disabled:
                    stat.disabled = False
                    stat.disabled_at = None
                    stat.disabled_reason = "Restored after recovery"

            self._save()

    def is_disabled(self, regime: str, engine_name: str) -> bool:
        with self.lock:
            stat = self.data.get(regime, {}).get(engine_name)
            return stat.disabled if stat else False

    def get_weight_mult(self, regime: str, engine_name: str) -> float:
        with self.lock:
            stat = self.data.get(regime, {}).get(engine_name)
            if stat is None:
                return 1.0
            if stat.disabled:
                return 0.0
            if stat.n < self.min_samples:
                return 1.0
            acc = stat.recent_accuracy(window=30)
            mult = 0.50 + (acc - 0.30) * 1.6
            return float(max(0.30, min(1.60, mult)))

    def report(self) -> dict:
        with self.lock:
            out = {}
            for regime, engines in self.data.items():
                out[regime] = {}
                for name, stat in engines.items():
                    out[regime][name] = {
                        "n": stat.n,
                        "accuracy": round(stat.accuracy(), 3),
                        "recent_accuracy": round(stat.recent_accuracy(), 3),
                        "disabled": stat.disabled,
                        "reason": stat.disabled_reason,
                    }
            return out
