from __future__ import annotations

import numpy as np

from ewscan.config import SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW
from ewscan.data.occupancy import build_grid
from ewscan.env.rf_env import RFScanEnv
from ewscan.scheduler import ScheduleContext, make_scheduler


def _single_band_grid(band: int, n_slots: int = 50) -> object:
    toa = np.arange(0, n_slots * 1000, 1000, dtype=float)
    pdw = PDW(
        toa_us=toa,
        cf_mhz=np.full(len(toa), (band + 0.5) * 1800.0),
        pw_us=np.full(len(toa), 10.0),
        aoa_deg=np.zeros(len(toa)),
        amp_db=np.full(len(toa), -10.0),
        labels=np.zeros(len(toa), dtype=np.int64),
        train_id=f"band{band}",
    )
    return build_grid(
        pdw, SpectrumConfig(n_bands=10), TimeConfig(episode_duration_s=0.05, slot_us=1000.0)
    )


def _env(config, grid):
    return RFScanEnv(config, grids=[grid], seed=0)


def test_round_robin_order(env_config, tiny_grid):
    env = _env(env_config, tiny_grid)
    sched = make_scheduler("round_robin", dwell_slots=2)
    obs, info = env.reset()
    sched.reset(ScheduleContext(10, env.n_slots, info["n_emitters"], info["train_id"]))
    actions = []
    for _ in range(10):
        a = sched.act(obs, info)
        obs, r, term, trunc, info = env.step(a)
        sched.observe(info)
        actions.append(a)
    assert actions == [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]


def test_oracle_targets_active_band(env_config):
    env = _env(env_config, _single_band_grid(7))
    sched = make_scheduler("oracle")
    obs, info = env.reset()
    sched.reset(ScheduleContext(10, env.n_slots, info["n_emitters"], info["train_id"]))
    sched.bind(env)
    assert sched.act(obs, info) == 7


def test_ucb_prefers_productive_band(env_config):
    grid = _single_band_grid(1)
    env = _env(env_config, grid)
    sched = make_scheduler("ucb", dwell_slots=2, seed=0)
    obs, info = env.reset()
    sched.reset(ScheduleContext(10, env.n_slots, info["n_emitters"], info["train_id"]))
    bands = []
    for _ in range(env.n_slots):
        a = sched.act(obs, info)
        obs, r, term, trunc, info = env.step(a)
        sched.observe(info)
        bands.append(int(info["band"]))
        if trunc:
            break
    bands = np.array(bands)
    assert np.mean(bands[30:] == 1) > 0.9
