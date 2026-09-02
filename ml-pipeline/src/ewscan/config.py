from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class SpectrumConfig(BaseModel):
    f_min_mhz: float = 0.0
    f_max_mhz: float = 18000.0
    n_bands: int = 100

    @property
    def band_width_mhz(self) -> float:
        return (self.f_max_mhz - self.f_min_mhz) / self.n_bands


class TimeConfig(BaseModel):
    episode_duration_s: float = 10.0
    slot_us: float = 1000.0

    @property
    def n_slots(self) -> int:
        return int(round(self.episode_duration_s * 1e6 / self.slot_us))


class ReceiverConfig(BaseModel):
    tuning_time_slots: int = 1
    sensitivity_db: float | None = None
    p_detect: float = 1.0
    p_false_alarm_per_slot: float = 0.0
    ibw_mhz: float | None = None


class RewardConfig(BaseModel):
    reward_hit: float = 1.0
    new_emitter_bonus: float = 1.0
    cost_tune: float = 0.05
    cost_step: float = 0.0
    shaping_weight: float = 0.2
    priority: Literal["uniform", "amplitude", "agility"] = "uniform"


class ObsConfig(BaseModel):
    max_age: int = 2000
    ema_alpha: float = 0.05
    recent_window: int = 200


class EnvConfig(BaseModel):
    spectrum: SpectrumConfig = Field(default_factory=SpectrumConfig)
    time: TimeConfig = Field(default_factory=TimeConfig)
    receiver: ReceiverConfig = Field(default_factory=ReceiverConfig)
    reward: RewardConfig = Field(default_factory=RewardConfig)
    obs: ObsConfig = Field(default_factory=ObsConfig)
    data_dir: str = "data/raw"
    cache_dir: str = "data/cache"
    split: str = "train"


class TrainConfig(BaseModel):
    algo: Literal["dqn", "ppo"] = "dqn"
    total_timesteps: int = 300_000
    n_envs: int = 4
    learning_rate: float = 3e-4
    buffer_size: int = 200_000
    batch_size: int = 256
    gamma: float = 0.99
    train_freq: int = 4
    target_update_interval: int = 1000
    learning_starts: int = 5000
    exploration_fraction: float = 0.15
    seed: int = 0
    device: str = "auto"
    eval_freq: int = 10_000
    n_eval_episodes: int = 6
    train_split: str = "train"
    eval_split: str = "validation"
    out_dir: str = "outputs/rl"
