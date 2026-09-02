from __future__ import annotations

import numpy as np

from ewscan.config import EnvConfig, ReceiverConfig, SpectrumConfig, TimeConfig
from ewscan.env.rf_env import RFScanEnv


def _continuous_grid(train_id="cont", band=1):
    from ewscan.data.loader import PDW
    from ewscan.data.occupancy import build_grid

    toa = np.arange(0, 50000, 1000, dtype=float)
    pdw = PDW(
        toa_us=toa,
        cf_mhz=np.full(len(toa), (band + 0.5) * 1800.0),
        pw_us=np.full(len(toa), 10.0),
        aoa_deg=np.zeros(len(toa)),
        amp_db=np.full(len(toa), -10.0),
        labels=np.zeros(len(toa), dtype=np.int64),
        train_id=train_id,
    )
    return build_grid(
        pdw, SpectrumConfig(n_bands=10), TimeConfig(episode_duration_s=0.05, slot_us=1000.0)
    )


def test_obs_shape_and_reset(env_config, tiny_grid):
    env = RFScanEnv(env_config, grids=[tiny_grid], seed=0)
    obs, info = env.reset()
    assert obs.shape == env.observation_space.shape
    assert np.all(np.isfinite(obs))
    assert info["n_emitters"] == 4


def test_hit_when_tuned(env_config, tiny_grid):
    env = RFScanEnv(env_config, grids=[tiny_grid], seed=0)
    obs, info = env.reset()
    band = int(np.argmax(env.grid.occupancy.sum(axis=1)))
    hits = 0
    for _ in range(env.n_slots):
        obs, r, term, trunc, info = env.step(band)
        hits += int(info["hit"])
        if trunc:
            break
    assert hits > 0


def test_tuning_blindness(tiny_grid):
    config = EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.05, slot_us=1000.0),
        receiver=ReceiverConfig(tuning_time_slots=1),
    )
    env = RFScanEnv(config, grids=[tiny_grid], seed=0)
    obs, info = env.reset()
    obs, r, term, trunc, info = env.step(5)
    assert info["blind"]
    assert not info["hit"]
    assert info["switched"]


def test_false_alarm(tiny_time):
    from ewscan.data.loader import PDW
    from ewscan.data.occupancy import build_grid

    pdw = PDW(
        toa_us=np.array([1000.0]),
        cf_mhz=np.array([9900.0]),
        pw_us=np.array([10.0]),
        aoa_deg=np.array([0.0]),
        amp_db=np.array([-10.0]),
        labels=np.array([3]),
        train_id="fa",
    )
    grid = build_grid(pdw, SpectrumConfig(n_bands=10), tiny_time)
    config = EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=tiny_time,
        receiver=ReceiverConfig(tuning_time_slots=0, p_false_alarm_per_slot=1.0),
    )
    env = RFScanEnv(config, grids=[grid], seed=0)
    obs, info = env.reset()
    obs, r, term, trunc, info = env.step(0)
    assert info["false_alarm"]
    assert not info["hit"]


def test_new_emitter_bonus_once():
    config = EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.05, slot_us=1000.0),
        receiver=ReceiverConfig(tuning_time_slots=0),
    )
    env = RFScanEnv(config, grids=[_continuous_grid()], seed=0)
    obs, info = env.reset()
    obs, r1, term, trunc, info = env.step(1)
    obs, r2, term, trunc, info = env.step(1)
    assert info["hit"]
    assert r1 > r2


def test_truncation(env_config, tiny_grid):
    env = RFScanEnv(env_config, grids=[tiny_grid], seed=0)
    obs, info = env.reset()
    truncated = False
    steps = 0
    while not truncated:
        obs, r, term, truncated, info = env.step(0)
        steps += 1
    assert steps == env.n_slots
