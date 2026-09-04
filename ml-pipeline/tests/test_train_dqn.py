from __future__ import annotations

import numpy as np
import pytest

torch = pytest.importorskip("torch")

from ewscan.config import EnvConfig, SpectrumConfig, TimeConfig, TrainConfig
from ewscan.data.synthetic import make_synthetic_grid
from ewscan.train.dqn_torch import BandQNet, ReplayBuffer, detect_devices, train_dqn


def _tiny_config():
    return EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.05, slot_us=1000.0),
    )


def test_detect_devices_auto_cpu():
    devices = detect_devices("cpu")
    assert devices == [torch.device("cpu")]
    devices = detect_devices("auto")
    assert len(devices) >= 1
    if torch.cuda.is_available():
        assert all(d.type == "cuda" for d in devices)
    else:
        assert devices == [torch.device("cpu")]


def test_band_qnet_shapes():
    net = BandQNet(n_bands=10)
    obs = torch.zeros(4, 10 * 4 + 3)
    q = net(obs)
    assert q.shape == (4, 10)


def test_replay_buffer_threaded_adds():
    import threading

    buf = ReplayBuffer(1000, 5, np.random.default_rng(0))

    def worker(offset):
        for i in range(500):
            o = np.full(5, offset + i, dtype=np.float32)
            buf.add(o, 0, 0.0, o)

    threads = [threading.Thread(target=worker, args=(k * 1000,)) for k in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert buf.size == 1000
    s_obs, s_act, s_rew, s_next = buf.sample(64)
    assert s_obs.shape == (64, 5)
    assert np.array_equal(s_obs, s_next)


def test_train_dqn_two_actors_smoke(tmp_path):
    config = _tiny_config()
    grid = make_synthetic_grid(
        seed=7, n_bands=10, n_slots=50, slot_us=1000.0, n_emitters=4, train_id="smoke"
    )
    config.cache_dir = str(tmp_path / "cache")
    grid.save(tmp_path / "cache" / "train" / "smoke.npz")
    tc = TrainConfig(
        total_timesteps=4000,
        n_actors=2,
        learning_starts=500,
        train_freq=2,
        batch_size=64,
        target_update_interval=50,
        exploration_fraction=0.1,
        buffer_size=4000,
        device="cpu",
        train_split="train",
        eval_split="",
        out_dir=str(tmp_path / "rl"),
    )
    path = train_dqn(config, tc)
    assert path.exists()
    monitor = (tmp_path / "rl" / "monitor.csv").read_text().strip().splitlines()
    assert monitor[0] == "r,l,actor"
    assert len(monitor) > 1
    cfg = (tmp_path / "rl" / "train_config.json").read_text()
    assert '"n_actors": 2' in cfg
