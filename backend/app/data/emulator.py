"""Synthetic RF environment: 16 sub-bands with periodic, agile, and short-pulse emitters."""

from __future__ import annotations

import random
import time
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

    def band_freq(self, index: int) -> float:
        return self.center_freqs[index]

    def step(self) -> tuple[list[BandTruth], list[PDW], dict[int, float]]:
        self.state.tick += 1
        t = self.state.tick
        occ = [False] * self.num_bands

        # Band 3: periodic search radar (every 4 ticks)
        if t % 4 == 0:
            occ[3] = True
        # Band 7: frequency-agile emitter
        if random.random() > 0.4:
            occ[7] = True
        # Band 12: short-pulse threat (two-tick burst every 6)
        if t % 6 in (0, 1):
            occ[12] = True

        for i in range(self.num_bands):
            if i in HIGH_THREAT_BANDS:
                continue
            if random.random() > 0.82:
                occ[i] = True

        now = time.time()
        for i, active in enumerate(occ):
            if active and i not in self._onset:
                self._onset[i] = now
            if not active:
                self._onset.pop(i, None)

        pdws: list[PDW] = []
        now_us = int(now * 1_000_000)
        for i, active in enumerate(occ):
            if not active:
                continue
            self.state.pdw_seq += 1
            threat = i in HIGH_THREAT_BANDS
            pdws.append(
                PDW(
                    pdw_id=self.state.pdw_seq,
                    toa_us=now_us,
                    center_freq_mhz=self.center_freqs[i] + random.uniform(-2.5, 2.5),
                    pulse_width_us=12.5 if threat else random.uniform(4.0, 20.0),
                    aoa_deg=random.uniform(0, 360),
                    amplitude_db=random.uniform(-55.0, -28.0) if threat else random.uniform(-70.0, -40.0),
                    emitter_class_id=7 if threat else random.randint(1, 5),
                )
            )

        self.state.occupancy = occ
        self.state.pdws = pdws
        truths = [
            BandTruth(
                occupied=occ[i],
                threat_level="HIGH" if i in HIGH_THREAT_BANDS and occ[i] else (
                    "MEDIUM" if occ[i] else "NONE"
                ),
                center_freq_mhz=self.center_freqs[i],
            )
            for i in range(self.num_bands)
        ]
        return truths, pdws, dict(self._onset)
