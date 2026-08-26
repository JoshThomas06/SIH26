"""Synthetic RF environment with sticky occupancy so the C2 displays stay readable."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from app.core.config import settings

HIGH_THREAT_BANDS = {3, 7, 12}
NUM_BANDS = settings.num_bands


@dataclass
class PDW:
    pdw_id: int
    toa_us: int
    center_freq_mhz: float
    pulse_width_us: float
    aoa_deg: float
    amplitude_db: float
    emitter_class_id: int


@dataclass
class BandTruth:
    occupied: bool
    threat_level: str
    center_freq_mhz: float


@dataclass
class EmulatorState:
    tick: int = 0
    pdw_seq: int = 0
    occupancy: list[bool] = field(default_factory=lambda: [False] * NUM_BANDS)
    pdws: list[PDW] = field(default_factory=list)


class RFEmulator:
    """Ground-truth RF occupancy plus synthetic PDWs."""

    def __init__(self, num_bands: int = NUM_BANDS) -> None:
        self.num_bands = num_bands
        self.center_freqs = [500.0 + i * 500.0 for i in range(num_bands)]
        self.state = EmulatorState()
        self._onset: dict[int, float] = {}
        self._hold = [0] * num_bands
        self._occ = [False] * num_bands
        self._aoa = [random.uniform(12, 348) for _ in range(num_bands)]
        self._amp = [random.uniform(-62.0, -38.0) for _ in range(num_bands)]
        self.hostile_spawn = settings.hostile_spawn
        self.noise_floor = settings.noise_floor

    def band_freq(self, index: int) -> float:
        return self.center_freqs[index]

    def _set_hold(self, index: int, occupied: bool, on_ticks: int, off_ticks: int) -> None:
        self._occ[index] = occupied
        self._hold[index] = on_ticks if occupied else off_ticks
        if occupied:
            self._aoa[index] = (self._aoa[index] + random.uniform(-4.0, 4.0)) % 360
            self._amp[index] = random.uniform(-52.0, -30.0) if index in HIGH_THREAT_BANDS else random.uniform(-68.0, -42.0)

    def step(self) -> tuple[list[BandTruth], list[PDW], dict[int, float]]:
        import time

        self.state.tick += 1

        for i in range(self.num_bands):
            if self._hold[i] > 0:
                self._hold[i] -= 1
                continue
            spawn = max(0.0, min(1.0, self.hostile_spawn))
            noise = max(0.0, min(0.8, self.noise_floor))
            if i in HIGH_THREAT_BANDS:
                if self._occ[i]:
                    stay = random.random() < (0.25 + 0.65 * spawn)
                    self._set_hold(i, stay, on_ticks=10 + int(12 * spawn), off_ticks=8 + int(28 * (1 - spawn)))
                else:
                    start = random.random() < (0.02 + 0.78 * spawn)
                    self._set_hold(i, start, on_ticks=8 + int(16 * spawn), off_ticks=14 + int(36 * (1 - spawn)))
            else:
                if self._occ[i]:
                    stay = random.random() < (0.15 + 0.55 * noise)
                    self._set_hold(i, stay, on_ticks=6 + int(10 * noise), off_ticks=20)
                else:
                    start = random.random() < (0.01 + 0.72 * noise)
                    self._set_hold(i, start, on_ticks=5 + int(14 * noise), off_ticks=24)

        now = time.time()
        for i, active in enumerate(self._occ):
            if active and i not in self._onset:
                self._onset[i] = now
            if not active:
                self._onset.pop(i, None)

        pdws: list[PDW] = []
        now_us = int(now * 1_000_000)
        for i, active in enumerate(self._occ):
            if not active:
                continue
            self.state.pdw_seq += 1
            threat = i in HIGH_THREAT_BANDS
            pdws.append(
                PDW(
                    pdw_id=self.state.pdw_seq,
                    toa_us=now_us,
                    center_freq_mhz=self.center_freqs[i],
                    pulse_width_us=12.5 if threat else 8.0,
                    aoa_deg=self._aoa[i],
                    amplitude_db=self._amp[i],
                    emitter_class_id=7 if threat else 2,
                )
            )

        self.state.occupancy = list(self._occ)
        self.state.pdws = pdws
        truths = [
            BandTruth(
                occupied=self._occ[i],
                threat_level="HIGH" if i in HIGH_THREAT_BANDS and self._occ[i] else (
                    "MEDIUM" if self._occ[i] else "NONE"
                ),
                center_freq_mhz=self.center_freqs[i],
            )
            for i in range(self.num_bands)
        ]
        return truths, pdws, dict(self._onset)
