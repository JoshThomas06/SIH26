from __future__ import annotations

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from ewscan.config import EnvConfig
from ewscan.data.occupancy import EpisodeGrid

N_BAND_FEATURES = 4


class RFScanEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(
        self,
        config: EnvConfig,
        split: str | None = None,
        grids: list[EpisodeGrid] | None = None,
        shuffle: bool = True,
        seed: int | None = None,
    ):
        super().__init__()
        self.config = config
        self.split = split or config.split
        if grids is not None:
            self._sources: list[EpisodeGrid | str] = list(grids)
        else:
            from pathlib import Path

            cache = Path(config.cache_dir) / self.split
            self._sources = sorted(str(p) for p in cache.glob("*.npz"))
        if not self._sources:
            raise FileNotFoundError(
                f"no grids found for split '{self.split}' (cache_dir={config.cache_dir}); "
                "run 'ewscan build-grids' or 'ewscan synthetic-grids' first"
            )
        n_bands = config.spectrum.n_bands
        obs_dim = n_bands * N_BAND_FEATURES + 3
        self.action_space = spaces.Discrete(n_bands)
        self.observation_space = spaces.Box(-np.inf, np.inf, (obs_dim,), np.float32)
        self._rng = np.random.default_rng(seed)
        self.shuffle = shuffle
        self._cursor = 0
        self._grid: EpisodeGrid | None = None

    @property
    def grid(self) -> EpisodeGrid:
        if self._grid is None:
            raise RuntimeError("env not reset")
        return self._grid

    @property
    def n_bands(self) -> int:
        return self.config.spectrum.n_bands

    @property
    def n_slots(self) -> int:
        return self.config.time.n_slots

    def _load_source(self, idx: int) -> EpisodeGrid:
        src = self._sources[idx]
        return src if isinstance(src, EpisodeGrid) else EpisodeGrid.load(src)

    def _pick_grid(self) -> EpisodeGrid:
        for _ in range(10):
            if self.shuffle:
                idx = int(self._rng.integers(len(self._sources)))
            else:
                idx = self._cursor % len(self._sources)
                self._cursor += 1
            grid = self._load_source(idx)
            if grid.n_pulses > 0:
                return grid
        return grid

    def reset(self, *, seed: int | None = None, options: dict | None = None):
        super().reset(seed=seed)
        if seed is not None:
            self._rng = np.random.default_rng(seed)
        cfg = self.config
        self._grid = self._pick_grid()
        B = cfg.spectrum.n_bands
        self.t = 0
        self.current_band = 0
        self.blind = 0
        self._age_hit = np.full(B, cfg.obs.max_age, dtype=np.float32)
        self._age_visit = np.full(B, cfg.obs.max_age, dtype=np.float32)
        self._ema = np.zeros(B, dtype=np.float32)
        self._recent = np.zeros(B, dtype=np.int32)
        self._recent_events: list[tuple[int, int]] = []
        self._intercepted: set[int] = set()
        info = {
            "train_id": self._grid.train_id,
            "n_emitters": self._grid.n_emitters,
            "n_slots": self._grid.n_slots,
        }
        return self._obs(), info

    def _obs(self) -> np.ndarray:
        cfg = self.config
        B = cfg.spectrum.n_bands
        max_age = float(max(cfg.obs.max_age, 1))
        feats = np.empty((B, N_BAND_FEATURES), dtype=np.float32)
        feats[:, 0] = self._age_hit / max_age
        feats[:, 1] = self._age_visit / max_age
        feats[:, 2] = self._ema
        feats[:, 3] = np.minimum(self._recent / max(cfg.obs.recent_window, 1), 1.0)
        scalars = np.array(
            [
                self.current_band / max(B - 1, 1),
                1.0 if self.blind > 0 else 0.0,
                self.t / max(self._grid.n_slots, 1),
            ],
            dtype=np.float32,
        )
        return np.concatenate([feats.ravel(), scalars]).astype(np.float32)

    def step(self, action):
        cfg = self.config
        grid = self._grid
        action = int(action)
        if not self.action_space.contains(action):
            raise ValueError(f"invalid action {action}")
        reward = cfg.reward.cost_step
        switched = action != self.current_band
        if switched:
            self.current_band = action
            self.blind = cfg.receiver.tuning_time_slots
            reward -= cfg.reward.cost_tune
        b = self.current_band
        t = self.t
        hit = False
        false_alarm = False
        detecting = True
        pulse_labels, pulse_amps = grid.emitters_in(b, t)
        if self.blind > 0:
            self.blind -= 1
            detecting = False
        else:
            truth = grid.active(b, t)
            sens = cfg.receiver.sensitivity_db
            if truth:
                if sens is not None:
                    detectable = bool((pulse_amps >= sens).any())
                else:
                    detectable = pulse_amps.size > 0
                if detectable and self._rng.random() < cfg.receiver.p_detect:
                    hit = True
            elif (
                cfg.receiver.p_false_alarm_per_slot > 0
                and self._rng.random() < cfg.receiver.p_false_alarm_per_slot
            ):
                false_alarm = True
            reward += cfg.reward.shaping_weight * float(self._ema[b])
            if hit:
                reward += cfg.reward.reward_hit
                new_ids = [int(e) for e in pulse_labels if int(e) not in self._intercepted]
                if new_ids:
                    w = grid.priority_weights(cfg.reward.priority)
                    id_to_idx = {int(e): i for i, e in enumerate(grid.emitter_ids)}
                    bonus = max(w[id_to_idx[e]] for e in new_ids)
                    reward += cfg.reward.new_emitter_bonus * float(bonus)
                    self._intercepted.update(new_ids)
        self._update_buffers(t, b, hit, detecting)
        self.t += 1
        truncated = self.t >= grid.n_slots
        info = {
            "slot": t,
            "band": b,
            "hit": hit,
            "false_alarm": false_alarm,
            "truth_active": bool(grid.active(b, t)),
            "blind": not detecting,
            "switched": switched,
            "reward": float(reward),
            "pulse_labels": pulse_labels,
            "pulse_amps": pulse_amps,
            "labels_hit": pulse_labels if hit else np.zeros(0, dtype=np.int64),
            "intercepted": len(self._intercepted),
            "train_id": grid.train_id,
        }
        return self._obs(), float(reward), False, truncated, info

    def _update_buffers(self, t: int, b: int, hit: bool, detecting: bool) -> None:
        cfg = self.config
        self._age_hit = np.minimum(self._age_hit + 1, cfg.obs.max_age)
        self._age_visit = np.minimum(self._age_visit + 1, cfg.obs.max_age)
        if detecting:
            self._age_visit[b] = 0.0
            self._ema[b] = (1 - cfg.obs.ema_alpha) * self._ema[b] + cfg.obs.ema_alpha * float(hit)
        if hit:
            self._age_hit[b] = 0.0
            self._recent[b] += 1
            self._recent_events.append((t, b))
        horizon = t - cfg.obs.recent_window
        while self._recent_events and self._recent_events[0][0] <= horizon:
            _, eb = self._recent_events.pop(0)
            self._recent[eb] -= 1
