from __future__ import annotations

from ewscan.scheduler.base import ScheduleContext, Scheduler
from ewscan.scheduler.baselines import (
    GreedyOracleScheduler,
    RandomScheduler,
    RoundRobinScheduler,
    UCBScheduler,
)
from ewscan.scheduler.rl import SB3PolicyScheduler

__all__ = [
    "GreedyOracleScheduler",
    "RandomScheduler",
    "RoundRobinScheduler",
    "SB3PolicyScheduler",
    "ScheduleContext",
    "Scheduler",
    "UCBScheduler",
    "make_scheduler",
]


def make_scheduler(name: str, model=None, seed: int = 0, dwell_slots: int = 10) -> Scheduler:
    if name in ("round_robin", "rr"):
        return RoundRobinScheduler(dwell_slots=dwell_slots)
    if name == "random":
        return RandomScheduler(seed=seed)
    if name == "ucb":
        return UCBScheduler(dwell_slots=dwell_slots, seed=seed)
    if name in ("oracle", "greedy_oracle"):
        return GreedyOracleScheduler()
    if name in ("edf_periodic", "edf"):
        from ewscan.eval.periodic import EDFScheduler

        return EDFScheduler(dwell_slots=dwell_slots)
    if name == "rl":
        if model is None:
            raise ValueError("rl scheduler requires a trained model")
        if isinstance(model, Scheduler):
            return model
        return SB3PolicyScheduler(model)
    raise ValueError(f"unknown strategy '{name}'")
