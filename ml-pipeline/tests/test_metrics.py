from __future__ import annotations

import numpy as np
import pytest

from ewscan.metrics.metrics import EpisodeLog, aggregate_metrics, episode_metrics


def _log(**kw) -> EpisodeLog:
    T = 100
    d = dict(
        train_id="m",
        n_slots=T,
        slot_us=1000.0,
        emitters_present=4,
        band=np.full(T, 3, dtype=np.int16),
        hit=np.zeros(T, dtype=bool),
        false_alarm=np.zeros(T, dtype=bool),
        truth_active=np.zeros(T, dtype=bool),
        detecting=np.ones(T, dtype=bool),
        reward=np.full(T, 0.5, dtype=np.float32),
        slot_labels_offsets=np.array([0, 2, 4]),
        slot_labels=np.array([0, 0, 1, 1]),
        opportunity_pulses=10,
        detected_pulses=8,
        detected_amp_min=-40.0,
        first_intercept={0: 10, 1: 20},
    )
    d.update(kw)
    return EpisodeLog(**d)


def test_metrics_values():
    log = _log()
    log.truth_active[10] = True
    log.truth_active[30] = True
    log.hit[10] = True
    log.hit[20] = True
    log.false_alarm[40] = True
    m = episode_metrics(log)
    assert m["pd"] == pytest.approx(0.8)
    assert m["pfa"] == pytest.approx(1.0 / 98)
    assert m["interception_ratio"] == pytest.approx(0.5)
    assert m["avg_intercept_time_slots"] == pytest.approx(15.0)
    assert m["pct_correct_predictions"] == pytest.approx(2.0 / 100)
    assert m["avg_reward"] == pytest.approx(50.0)
    assert m["sensitivity_floor_db"] == -40.0


def test_aggregate():
    rows = [episode_metrics(_log()), episode_metrics(_log())]
    agg = aggregate_metrics(rows)
    assert agg["n_episodes"] == 2
    assert agg["pd"] == pytest.approx(0.8)
