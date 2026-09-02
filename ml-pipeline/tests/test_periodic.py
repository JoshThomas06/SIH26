from __future__ import annotations

import numpy as np
import pytest

from ewscan.config import EnvConfig, ReceiverConfig, SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW
from ewscan.data.occupancy import build_grid
from ewscan.eval.periodic import (
    expected_intercept_time_slots,
    p_intercept_per_visit,
    periodic_emitters,
    required_revisit_slots,
)


def _periodic_grid(n_slots: int = 100, band: int = 5):
    toa = np.arange(0, n_slots * 1000, 1000, dtype=float)
    pdw = PDW(
        toa_us=toa,
        cf_mhz=np.full(len(toa), (band + 0.5) * 1800.0),
        pw_us=np.full(len(toa), 10.0),
        aoa_deg=np.zeros(len(toa)),
        amp_db=np.full(len(toa), -10.0),
        labels=np.zeros(len(toa), dtype=np.int64),
        train_id="periodic",
    )
    return build_grid(
        pdw, SpectrumConfig(n_bands=10), TimeConfig(episode_duration_s=0.1, slot_us=1000.0)
    )


def test_p_intercept_monotonic():
    p1 = p_intercept_per_visit(1, 1000.0, 1000.0)
    p10 = p_intercept_per_visit(10, 1000.0, 1000.0)
    assert 0 < p1 < p10 < 1
    assert p10 == pytest.approx(1 - np.exp(-10))


def test_required_revisit():
    r = required_revisit_slots(500.0, 10.0, 1000.0, 1000.0)
    assert r == pytest.approx((500.0 - 5.0) * (1 - np.exp(-10)), rel=1e-3)
    t = expected_intercept_time_slots(r, 10.0, 1000.0, 1000.0)
    assert t <= 500.0 + 1e-6


def test_periodic_emitter_detection():
    grid = _periodic_grid()
    found = periodic_emitters(grid)
    assert len(found) == 1
    eid, band, pri = found[0]
    assert eid == 0 and band == 5 and pri == 1000.0


def test_edf_intercepts_periodic_emitter():
    from ewscan.eval.evaluate import evaluate_strategy

    grid = _periodic_grid()
    config = EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.1, slot_us=1000.0),
        receiver=ReceiverConfig(tuning_time_slots=1),
    )
    logs = evaluate_strategy("edf_periodic", [grid], config, episodes=1, dwell_slots=10)
    log = logs[0]
    assert 0 in log.first_intercept
    assert log.first_intercept[0] <= 70
