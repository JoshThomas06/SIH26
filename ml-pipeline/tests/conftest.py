from __future__ import annotations

import pytest

from ewscan.config import EnvConfig, ReceiverConfig, SpectrumConfig, TimeConfig
from ewscan.data.synthetic import make_synthetic_grid


@pytest.fixture
def tiny_spectrum():
    return SpectrumConfig(n_bands=10)


@pytest.fixture
def tiny_time():
    return TimeConfig(episode_duration_s=0.05, slot_us=1000.0)


@pytest.fixture
def tiny_grid(tiny_spectrum, tiny_time):
    return make_synthetic_grid(
        seed=1, n_bands=10, n_slots=50, slot_us=1000.0, n_emitters=4, train_id="tiny"
    )


@pytest.fixture
def env_config():
    return EnvConfig(
        spectrum=SpectrumConfig(n_bands=10),
        time=TimeConfig(episode_duration_s=0.05, slot_us=1000.0),
        receiver=ReceiverConfig(tuning_time_slots=0),
    )
