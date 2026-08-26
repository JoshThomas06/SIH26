"""Dual-agent Age-of-Information scheduler (Eager + Revisit MoE)."""

from __future__ import annotations

import random
import time
from typing import Any, Literal

from app.core.config import settings
from app.data.emulator import HIGH_THREAT_BANDS

SchedulerMode = Literal["MANUAL", "OPEN_LOOP", "SMART_SCAN_MARL"]


class SmartScanMoEScheduler:
    def __init__(self, num_bands: int | None = None) -> None:
        self.num_bands = num_bands or settings.num_bands
        self.aoi_threshold_ms = settings.aoi_threshold_ms
        self.eager_weight = 0.7
        self.revisit_weight = 0.3
        self.aoi_decay_factor = 1.5
        self.mode: SchedulerMode = "SMART_SCAN_MARL"
        self.manual_band = 0
        self.current_band = 0
        self.last_visit_time = [time.time()] * self.num_bands
        self.band_aoi = [0.0] * self.num_bands
        self.priority = [0.15] * self.num_bands
        self.dwell_hold = 0
        self.min_dwell_ticks = 6
        self.ignored: set[int] = set()
        self.epsilon = settings.epsilon

    def configure(
        self,
        *,
        mode: SchedulerMode | None = None,
        eager_agent_weight: float | None = None,
        revisit_agent_weight: float | None = None,
        aoi_decay_factor: float | None = None,
        dwell_time_override_ms: float | None = None,
        manual_band: int | None = None,
        ignore_band: int | None = None,
        unignore_band: int | None = None,
        epsilon: float | None = None,
    ) -> None:
        if mode is not None:
            self.mode = mode
        if eager_agent_weight is not None:
            self.eager_weight = eager_agent_weight
        if revisit_agent_weight is not None:
            self.revisit_weight = revisit_agent_weight
        if aoi_decay_factor is not None:
            self.aoi_decay_factor = aoi_decay_factor
        if dwell_time_override_ms is not None:
            self.aoi_threshold_ms = max(200.0, dwell_time_override_ms)
        if manual_band is not None:
            self.manual_band = max(0, min(self.num_bands - 1, manual_band))
        if ignore_band is not None:
            self.ignored.add(max(0, min(self.num_bands - 1, ignore_band)))
        if unignore_band is not None:
            self.ignored.discard(max(0, min(self.num_bands - 1, unignore_band)))
        if epsilon is not None:
            self.epsilon = max(0.0, min(0.4, epsilon))

    def mark_fresh(self) -> None:
        now = time.time()
        self.last_visit_time = [now] * self.num_bands
        self.band_aoi = [0.0] * self.num_bands
        self.dwell_hold = 0

    def reset(self) -> None:
        now = time.time()
        self.current_band = 0
        self.manual_band = 0
        self.last_visit_time = [now] * self.num_bands
        self.band_aoi = [0.0] * self.num_bands
        self.priority = [0.15] * self.num_bands
        self.dwell_hold = 0
        self.ignored.clear()

    def _eligible(self, index: int) -> bool:
        return index not in self.ignored

    def _next_linear(self, start: int) -> int:
        for step in range(1, self.num_bands + 1):
            candidate = (start + step) % self.num_bands
            if self._eligible(candidate):
                return candidate
        return start

    def evaluate_step(self, occupancy: list[bool], now: float | None = None) -> dict[str, Any]:
        now = now or time.time()
        prev = self.current_band

        for i in range(self.num_bands):
            if i != self.current_band:
                elapsed_ms = min(4000.0, (now - self.last_visit_time[i]) * 1000.0)
                self.band_aoi[i] = elapsed_ms ** (self.aoi_decay_factor / 1.5)

        if self.mode == "MANUAL":
            next_band = self.manual_band
            agent = "MANUAL"
            rationale = f"Operator dwell lock on Sub-Band {next_band + 1}."
        elif self.mode == "OPEN_LOOP":
            if self.dwell_hold > 0:
                next_band = self.current_band
                agent = "HOLD"
                rationale = f"Minimum dwell on Sub-Band {next_band + 1}."
            else:
                next_band = self._next_linear(self.current_band)
                agent = "OPEN_LOOP"
                rationale = (
                    f"Uniform sequential sweep: Sub-Band {self.current_band + 1} "
                    f"→ Sub-Band {next_band + 1}."
                )
        else:
            candidates = [i for i in range(self.num_bands) if self._eligible(i)] or list(range(self.num_bands))
            max_aoi_band = max(candidates, key=lambda i: self.band_aoi[i])
            max_aoi_val = self.band_aoi[max_aoi_band]
            occupied = [i for i, flag in enumerate(occupancy) if flag and self._eligible(i)]

            if max_aoi_val >= self.aoi_threshold_ms:
                next_band = max_aoi_band
                agent = "REVISIT_AGENT"
                rationale = (
                    f"Age-of-Information breach on Sub-Band {next_band + 1} "
                    f"({max_aoi_val:.1f}ms ≥ {self.aoi_threshold_ms:.0f}ms). "
                    "Overriding Eager Agent to prevent state staleness."
                )
            elif random.random() < self.epsilon:
                next_band = random.choice(candidates)
                agent = "EXPLORE"
                rationale = (
                    f"Epsilon-greedy explore ({self.epsilon:.0%}) landed on Sub-Band {next_band + 1} "
                    "to discover emitters outside known hot zones."
                )
            elif occupied:
                hot = [i for i in occupied if i in HIGH_THREAT_BANDS] or occupied
                next_band = max(hot, key=lambda i: occupancy[i] + self.priority[i] * (self.band_aoi[i] ** 1.5 / 1000.0))
                if next_band == self.current_band and self.dwell_hold > 0:
                    agent = "HOLD"
                    rationale = f"Holding Eager lock on Sub-Band {next_band + 1}."
                else:
                    agent = "EAGER_AGENT"
                    freq = 500 + next_band * 500
                    rationale = (
                        f"Tracking signal persistence on active Sub-Band {next_band + 1} "
                        f"({freq} MHz). Score mixes occupancy, threat memory, and AoI^1.5."
                    )
            else:
                next_band = self._next_linear(self.current_band)
                agent = "EAGER_AGENT"
                rationale = f"No occupancy — sequential hop to Sub-Band {next_band + 1}."

        hop_penalty = abs(next_band - prev)
        if self.mode != "MANUAL" and next_band == prev and self.dwell_hold > 0:
            self.dwell_hold -= 1
        elif next_band != prev:
            self.dwell_hold = self.min_dwell_ticks
        elif self.mode != "MANUAL" and self.dwell_hold > 0:
            next_band = prev
            self.dwell_hold -= 1
            agent = "HOLD"
            rationale = f"Minimum dwell on Sub-Band {next_band + 1} so the operator can read the scope."
            hop_penalty = 0

        self.current_band = next_band
        self.last_visit_time[next_band] = now
        self.band_aoi[next_band] = 0.0

        for i, flag in enumerate(occupancy):
            if flag:
                self.priority[i] = min(1.0, self.priority[i] + 0.08)
            else:
                self.priority[i] = max(0.05, self.priority[i] * 0.97)
        self.priority[next_band] = min(1.0, self.priority[next_band] + 0.04)

        return {
            "selected_band": next_band,
            "agent": agent,
            "rationale": rationale,
            "aoi_states": list(self.band_aoi),
            "priority": list(self.priority),
            "hop_penalty": hop_penalty,
            "ignored": sorted(self.ignored),
        }
