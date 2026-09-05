from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np


@dataclass
class EpisodeLog:
    train_id: str
    n_slots: int
    slot_us: float
    emitters_present: int
    band: np.ndarray
    hit: np.ndarray
    false_alarm: np.ndarray
    truth_active: np.ndarray
    detecting: np.ndarray
    reward: np.ndarray
    slot_labels_offsets: np.ndarray
    slot_labels: np.ndarray
    opportunity_pulses: int
    detected_pulses: int
    detected_amp_min: float | None
    first_intercept: dict[int, int] = field(default_factory=dict)

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            path,
            train_id=self.train_id,
            n_slots=self.n_slots,
            slot_us=self.slot_us,
            emitters_present=self.emitters_present,
            band=self.band,
            hit=self.hit,
            false_alarm=self.false_alarm,
            truth_active=self.truth_active,
            detecting=self.detecting,
            reward=self.reward,
            slot_labels_offsets=self.slot_labels_offsets,
            slot_labels=self.slot_labels,
            opportunity_pulses=self.opportunity_pulses,
            detected_pulses=self.detected_pulses,
            detected_amp_min=-1.0 if self.detected_amp_min is None else self.detected_amp_min,
            first_intercept_json=json.dumps({str(k): v for k, v in self.first_intercept.items()}),
        )

    @staticmethod
    def load(path: str | Path) -> EpisodeLog:
        with np.load(Path(path), allow_pickle=False) as z:
            fi = json.loads(str(z["first_intercept_json"]))
            amp_min = float(z["detected_amp_min"])
            return EpisodeLog(
                train_id=str(z["train_id"]),
                n_slots=int(z["n_slots"]),
                slot_us=float(z["slot_us"]),
                emitters_present=int(z["emitters_present"]),
                band=z["band"],
                hit=z["hit"],
                false_alarm=z["false_alarm"],
                truth_active=z["truth_active"],
                detecting=z["detecting"],
                reward=z["reward"],
                slot_labels_offsets=z["slot_labels_offsets"],
                slot_labels=z["slot_labels"],
                opportunity_pulses=int(z["opportunity_pulses"]),
                detected_pulses=int(z["detected_pulses"]),
                detected_amp_min=None if amp_min < 0 else amp_min,
                first_intercept={int(k): int(v) for k, v in fi.items()},
            )


def episode_metrics(log: EpisodeLog) -> dict:
    detect = log.detecting
    n_detect = int(detect.sum())
    quiet = detect & ~log.truth_active
    n_quiet = int(quiet.sum())
    fa_count = int(log.false_alarm.sum())

    pd = log.detected_pulses / log.opportunity_pulses if log.opportunity_pulses > 0 else np.nan
    pfa = fa_count / n_quiet if n_quiet > 0 else np.nan
    ratio = len(log.first_intercept) / log.emitters_present if log.emitters_present > 0 else np.nan

    times = np.array(sorted(log.first_intercept.values()), dtype=np.float64)
    avg_intercept_slots = float(times.mean()) if times.size else np.nan

    correct = detect & log.truth_active
    pct_correct = correct.sum() / n_detect if n_detect > 0 else np.nan

    duration_s = log.n_slots * log.slot_us / 1e6
    intercept_rate = len(log.first_intercept) / duration_s if duration_s > 0 else np.nan

    return {
        "train_id": log.train_id,
        "n_slots": log.n_slots,
        "emitters_present": log.emitters_present,
        "emitters_intercepted": len(log.first_intercept),
        "interception_ratio": ratio,
        "avg_intercept_time_slots": avg_intercept_slots,
        "avg_intercept_time_ms": avg_intercept_slots * log.slot_us / 1e3
        if not np.isnan(avg_intercept_slots)
        else np.nan,
        "intercept_rate_per_s": intercept_rate,
        "pd": pd,
        "pfa": pfa,
        "false_alarms": fa_count,
        "pct_correct_predictions": pct_correct,
        "avg_reward": float(log.reward.sum()),
        "detected_pulses": log.detected_pulses,
        "opportunity_pulses": log.opportunity_pulses,
        "sensitivity_floor_db": log.detected_amp_min,
    }


def aggregate_metrics(rows: list[dict]) -> dict:
    if not rows:
        return {}
    keys = [k for k, v in rows[0].items() if k != "train_id"]
    out: dict[str, float | int] = {"n_episodes": len(rows)}
    for k in keys:
        vals = np.array([r[k] for r in rows], dtype=np.float64)
        out[k] = float(np.nanmean(vals))
    return out


def metrics_table(all_rows: dict[str, list[dict]]) -> object:
    import pandas as pd

    summary = {}
    for name, rows in all_rows.items():
        summary[name] = aggregate_metrics(rows)
    return pd.DataFrame(summary).T
