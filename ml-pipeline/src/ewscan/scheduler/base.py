from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class ScheduleContext:
    n_bands: int
    n_slots: int
    n_emitters: int
    train_id: str


class Scheduler(ABC):
    name: str = "base"

    def reset(self, ctx: ScheduleContext) -> None: ...

    def bind(self, env) -> None:
        pass

    @abstractmethod
    def act(self, obs: np.ndarray, info: dict) -> int: ...

    def observe(self, info: dict) -> None:
        pass
