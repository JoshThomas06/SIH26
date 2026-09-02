from __future__ import annotations

import numpy as np

from ewscan.data.occupancy import EpisodeGrid
from ewscan.scheduler.base import ScheduleContext, Scheduler


class RandomScheduler(Scheduler):
    name = "random"

    def __init__(self, seed: int = 0):
        self._seed = seed

    def reset(self, ctx: ScheduleContext) -> None:
        self._rng = np.random.default_rng(self._seed)
        self._n = ctx.n_bands

    def act(self, obs: np.ndarray, info: dict) -> int:
        return int(self._rng.integers(self._n))


class RoundRobinScheduler(Scheduler):
    name = "round_robin"

    def __init__(self, dwell_slots: int = 10):
        self.dwell = max(int(dwell_slots), 1)

    def reset(self, ctx: ScheduleContext) -> None:
        self._n = ctx.n_bands
        self._band = 0
        self._remain = self.dwell

    def act(self, obs: np.ndarray, info: dict) -> int:
        return self._band

    def observe(self, info: dict) -> None:
        self._remain -= 1
        if self._remain <= 0:
            self._band = (self._band + 1) % self._n
            self._remain = self.dwell


class UCBScheduler(Scheduler):
    name = "ucb"

    def __init__(self, dwell_slots: int = 10, c: float = 0.5, seed: int = 0):
        self.dwell = max(int(dwell_slots), 1)
        self.c = c
        self._seed = seed

    def reset(self, ctx: ScheduleContext) -> None:
        self._n = ctx.n_bands
        self._n_plays = np.zeros(self._n)
        self._sum_r = np.zeros(self._n)
        self._total = 0
        self._band = 0
        self._remain = self.dwell
        self._rng = np.random.default_rng(self._seed)

    def act(self, obs: np.ndarray, info: dict) -> int:
        return self._band

    def observe(self, info: dict) -> None:
        if not info.get("blind", False):
            b = int(info["band"])
            r = float(bool(info["hit"]))
            self._n_plays[b] += 1
            self._sum_r[b] += r
            self._total += 1
        self._remain -= 1
        if self._remain <= 0:
            self._band = self._select()
            self._remain = self.dwell

    def _select(self) -> int:
        unplayed = np.where(self._n_plays == 0)[0]
        if unplayed.size:
            return int(self._rng.choice(unplayed))
        mean = self._sum_r / self._n_plays
        bonus = self.c * np.sqrt(np.log(max(self._total, 1)) / self._n_plays)
        return int(np.argmax(mean + bonus))


class GreedyOracleScheduler(Scheduler):
    name = "oracle"

    def __init__(self, lookahead_slots: int = 50):
        self.horizon = max(int(lookahead_slots), 1)
        self._grid: EpisodeGrid | None = None

    def bind(self, env) -> None:
        self._grid = env.grid

    def reset(self, ctx: ScheduleContext) -> None:
        self._n = ctx.n_bands
        self._t = 0

    def act(self, obs: np.ndarray, info: dict) -> int:
        if self._grid is None:
            return 0
        t0 = self._t
        t1 = min(t0 + self.horizon, self._grid.n_slots)
        scores = self._grid.occupancy[:, t0:t1].sum(axis=1)
        return int(np.argmax(scores))

    def observe(self, info: dict) -> None:
        self._t = int(info.get("slot", self._t)) + 1
