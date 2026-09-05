from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ewscan.data.occupancy import EpisodeGrid
from ewscan.scheduler.base import ScheduleContext, Scheduler


@dataclass
class PeriodicEmitterPlan:
    emitter_id: int
    band: int
    pri_us: float
    revisit_slots: float
    expected_intercept_slots: float


def p_intercept_per_visit(dwell_slots: float, slot_us: float, pri_us: float) -> float:
    """Poisson approximation: expected pulses during a dwell window is
    dwell_slots * slot_us / pri_us; P(at least one pulse falls in the dwell)
    = 1 - exp(-expected)."""
    expected = dwell_slots * slot_us / max(pri_us, 1e-9)
    return float(1.0 - np.exp(-expected)) if expected > 0 else 0.0


def expected_intercept_time_slots(
    revisit_slots: float, dwell_slots: float, slot_us: float, pri_us: float
) -> float:
    p = p_intercept_per_visit(dwell_slots, slot_us, pri_us)
    if p <= 0:
        return float("inf")
    return revisit_slots / p + dwell_slots / 2.0


def required_revisit_slots(
    target_slots: float, dwell_slots: float, slot_us: float, pri_us: float
) -> float:
    p = p_intercept_per_visit(dwell_slots, slot_us, pri_us)
    if p <= 0:
        return float("inf")
    return max((target_slots - dwell_slots / 2.0) * p, 1.0)


def _primary_band(grid: EpisodeGrid, emitter_id: int) -> int:
    mask = grid.labels == emitter_id
    bands = grid.keys[mask] // grid.n_slots
    return int(np.bincount(bands).argmax())


def periodic_emitters(
    grid: EpisodeGrid, pri_cv_threshold: float = 0.3
) -> list[tuple[int, int, float]]:
    out = []
    for i, eid in enumerate(grid.emitter_ids):
        pri = grid.stats[i, 7]
        cv = grid.stats[i, 8]
        if np.isfinite(pri) and np.isfinite(cv) and cv < pri_cv_threshold and pri > 0:
            out.append((int(eid), _primary_band(grid, int(eid)), float(pri)))
    return out


def plan_for_grid(
    grid: EpisodeGrid,
    dwell_slots: int = 10,
    target_intercept_slots: float = 500.0,
    default_revisit_slots: float = 200.0,
) -> list[PeriodicEmitterPlan]:
    plans = []
    for eid, band, pri in periodic_emitters(grid):
        revisit = required_revisit_slots(target_intercept_slots, dwell_slots, grid.slot_us, pri)
        revisit = float(min(max(revisit, dwell_slots), default_revisit_slots * 4))
        plans.append(
            PeriodicEmitterPlan(
                emitter_id=eid,
                band=band,
                pri_us=pri,
                revisit_slots=revisit,
                expected_intercept_slots=expected_intercept_time_slots(
                    revisit, dwell_slots, grid.slot_us, pri
                ),
            )
        )
    return plans


class EDFScheduler(Scheduler):
    """Earliest-deadline-first revisit scheduler over per-band deadlines derived
    from periodic-emitter intercept requirements. Non-periodic bands fall back to
    a default revisit interval, so full-spectrum coverage is maintained."""

    name = "edf_periodic"

    def __init__(
        self,
        dwell_slots: int = 10,
        target_intercept_slots: float = 500.0,
        default_revisit_slots: float = 200.0,
    ):
        self.dwell = max(int(dwell_slots), 1)
        self.target = float(target_intercept_slots)
        self.default_revisit = float(default_revisit_slots)

    def bind(self, env) -> None:
        grid = env.grid
        self._grid = grid
        plans = plan_for_grid(grid, self.dwell, self.target, self.default_revisit)
        self.plans = plans
        self._R = np.full(grid.n_bands, self.default_revisit)
        for plan in plans:
            self._R[plan.band] = min(self._R[plan.band], plan.revisit_slots)
        self._next_due = np.zeros(grid.n_bands)
        self._band = 0
        self._remain = self.dwell

    def reset(self, ctx: ScheduleContext) -> None:
        self._t = 0
        if hasattr(self, "_grid"):
            self._next_due = np.zeros(self._grid.n_bands)
            self._band = 0
            self._remain = self.dwell

    def act(self, obs: np.ndarray, info: dict) -> int:
        return int(self._band)

    def observe(self, info: dict) -> None:
        self._t = int(info["slot"]) + 1
        self._remain -= 1
        if self._remain <= 0:
            self._next_due[self._band] = self._t + self._R[self._band]
            self._band = int(np.argmin(self._next_due))
            self._remain = self.dwell
