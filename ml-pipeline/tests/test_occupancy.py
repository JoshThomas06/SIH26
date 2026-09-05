from __future__ import annotations

import numpy as np

from ewscan.config import SpectrumConfig, TimeConfig
from ewscan.data.loader import PDW
from ewscan.data.occupancy import EpisodeGrid, build_grid


def _pdw(**kw) -> PDW:
    d = dict(
        toa_us=np.array([1500.0, 2500.0, 3000.0, 6000.0]),
        cf_mhz=np.array([250.0, 2500.0, 500.0, 19000.0]),
        pw_us=np.array([10.0, 10.0, 10.0, 10.0]),
        aoa_deg=np.array([1.0, 2.0, 3.0, 4.0]),
        amp_db=np.array([-10.0, -5.0, -30.0, -20.0]),
        labels=np.array([0, 1, 0, 2]),
        train_id="t",
    )
    d.update(kw)
    return PDW(**d)


def _cfg():
    return SpectrumConfig(n_bands=10), TimeConfig(episode_duration_s=0.005, slot_us=1000.0)


def test_band_slot_mapping():
    spectrum, time = _cfg()
    grid = build_grid(_pdw(), spectrum, time)
    assert grid.occupancy[0, 1]
    assert grid.occupancy[1, 2]
    assert grid.occupancy[0, 3]
    assert grid.pulse_counts[0, 3] == 1
    assert grid.amp_max[0, 3] == -30.0


def test_out_of_range_dropped():
    spectrum, time = _cfg()
    grid = build_grid(_pdw(), spectrum, time)
    assert grid.n_pulses == 3
    assert grid.n_emitters == 2
    assert not grid.occupancy[:, 4:].any()


def test_emitters_in():
    spectrum, time = _cfg()
    grid = build_grid(_pdw(), spectrum, time)
    labels, amps = grid.emitters_in(0, 1)
    assert list(labels) == [0]
    assert float(amps[0]) == -10.0


def test_save_load_roundtrip(tmp_path):
    spectrum, time = _cfg()
    grid = build_grid(_pdw(), spectrum, time)
    dest = tmp_path / "g.npz"
    grid.save(dest)
    loaded = EpisodeGrid.load(dest)
    assert loaded.train_id == grid.train_id
    assert np.array_equal(loaded.occupancy, grid.occupancy)
    assert np.array_equal(loaded.keys, grid.keys)
    assert loaded.emitters_in(1, 2)[0][0] == 1


def test_priority_weights():
    spectrum, time = _cfg()
    grid = build_grid(_pdw(), spectrum, time)
    w = grid.priority_weights("amplitude")
    assert w[1] > w[0]
    assert np.allclose(grid.priority_weights("uniform"), 1.0)
