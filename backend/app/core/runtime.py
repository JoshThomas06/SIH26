"""In-memory simulation runtime: emulator + scheduler + FoM accumulators."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from app.core.config import settings
from app.core.scheduler_engine import SchedulerMode, SmartScanMoEScheduler
from app.data.emulator import HIGH_THREAT_BANDS, RFEmulator


class SimulationRuntime:
    def __init__(self) -> None:
        self.emulator = RFEmulator()
        self.scheduler = SmartScanMoEScheduler()
        self.running = False
        self.hits = 0
        self.misses = 0
        self.false_alarms = 0
        self.total_dwells = 0
        self.total_emissions = 0
        self.intercept_errors_ms: list[float] = []
        self.reward = 0.0
        self.latest: dict[str, Any] = self._empty_payload()
        self._pending_onsets: dict[int, float] = {}
        self.clients: set[Any] = set()
        self._task: asyncio.Task[None] | None = None

    async def run_loop(self) -> None:
        period = 1.0 / settings.telemetry_hz
        while True:
            if self.running:
                self.tick()
            else:
                self.latest["running"] = False
                self.latest["timestamp_us"] = int(time.time() * 1_000_000)
            await asyncio.sleep(period)

    def _empty_payload(self) -> dict[str, Any]:
        bands = []
        for i in range(settings.num_bands):
            bands.append(
                {
                    "band_id": i + 1,
                    "center_freq_mhz": 500 + i * 500,
                    "aoi_ms": 0.0,
                    "priority_score": 0.15,
                    "status": "IDLE",
                    "threat_level": "HIGH" if i in HIGH_THREAT_BANDS else "NONE",
                }
            )
        return {
            "timestamp_us": int(time.time() * 1_000_000),
            "scheduler_mode": self.scheduler.mode,
            "active_tuned_band": 0,
            "running": False,
            "metrics": {
                "probability_of_detection": 0.0,
                "probability_of_false_alarm": 0.0,
                "avg_intercept_time_error_ms": 0.0,
                "current_reward_score": 0.0,
                "hits": 0,
                "misses": 0,
            },
            "band_states": bands,
            "latest_pdw_intercepts": [],
            "explainable_ai_log": {
                "agent": "IDLE",
                "action_taken": "HOLD",
                "rationale": "Simulation halted. Await operator START.",
            },
        }

    def reset(self) -> None:
        self.emulator = RFEmulator()
        mode = self.scheduler.mode
        weights = (
            self.scheduler.eager_weight,
            self.scheduler.revisit_weight,
            self.scheduler.aoi_decay_factor,
        )
        self.scheduler = SmartScanMoEScheduler()
        self.scheduler.mode = mode
        self.scheduler.eager_weight, self.scheduler.revisit_weight, self.scheduler.aoi_decay_factor = weights
        self.hits = 0
        self.misses = 0
        self.false_alarms = 0
        self.total_dwells = 0
        self.total_emissions = 0
        self.intercept_errors_ms = []
        self.reward = 0.0
        self._pending_onsets = {}
        self.latest = self._empty_payload()
        self.latest["scheduler_mode"] = mode
        self.latest["running"] = self.running

    def start(self) -> None:
        self.running = True

    def pause(self) -> None:
        self.running = False
        self.latest["running"] = False

    def configure(self, **kwargs: Any) -> None:
        self.scheduler.configure(**kwargs)

    def _metrics(self) -> dict[str, float | int]:
        denom = self.hits + self.misses
        pd = self.hits / denom if denom else 0.0
        pfa = self.false_alarms / self.total_dwells if self.total_dwells else 0.0
        dt = (
            sum(self.intercept_errors_ms) / len(self.intercept_errors_ms)
            if self.intercept_errors_ms
            else 0.0
        )
        return {
            "probability_of_detection": round(pd, 4),
            "probability_of_false_alarm": round(pfa, 4),
            "avg_intercept_time_error_ms": round(dt, 2),
            "current_reward_score": round(self.reward, 1),
            "hits": self.hits,
            "misses": self.misses,
        }

    def tick(self) -> dict[str, Any]:
        if not self.running:
            self.latest["running"] = False
            self.latest["timestamp_us"] = int(time.time() * 1_000_000)
            return self.latest

        now = time.time()
        truths, pdws, onsets = self.emulator.step()
        occupancy = [t.occupied for t in truths]
        decision = self.scheduler.evaluate_step(occupancy, now=now)
        tuned = decision["selected_band"]

        active_count = sum(1 for t in truths if t.occupied)
        self.total_emissions += active_count
        self.total_dwells += 1

        if truths[tuned].occupied:
            self.hits += 1
            onset = onsets.get(tuned, now)
            error_ms = max(0.0, (now - onset) * 1000.0)
            self.intercept_errors_ms.append(error_ms)
            self.reward += 12.0 - min(error_ms / 80.0, 8.0) - decision["hop_penalty"] * 0.4
            status_at_rx = "LOCKED"
        else:
            if active_count > 0:
                self.misses += 1
                self.reward -= 2.5
            self.false_alarms += 1
            self.reward -= 0.4
            status_at_rx = "IDLE"

        intercepted = [p for p in pdws if abs(p.center_freq_mhz - truths[tuned].center_freq_mhz) < 260]
        band_states = []
        for i, truth in enumerate(truths):
            if i == tuned:
                status = "LOCKED" if status_at_rx == "LOCKED" else "IDLE"
            elif truth.occupied:
                status = "OCCUPIED"
            else:
                status = "IDLE"
            threat = "HIGH" if i in HIGH_THREAT_BANDS else truth.threat_level
            if not truth.occupied and i not in HIGH_THREAT_BANDS:
                threat = "NONE"
            elif not truth.occupied and i in HIGH_THREAT_BANDS:
                threat = "LOW"
            band_states.append(
                {
                    "band_id": i + 1,
                    "center_freq_mhz": truth.center_freq_mhz,
                    "aoi_ms": round(decision["aoi_states"][i], 1),
                    "priority_score": round(decision["priority"][i], 3),
                    "status": status,
                    "threat_level": threat,
                }
            )

        payload = {
            "timestamp_us": int(now * 1_000_000),
            "scheduler_mode": self.scheduler.mode,
            "active_tuned_band": tuned,
            "running": True,
            "metrics": self._metrics(),
            "band_states": band_states,
            "latest_pdw_intercepts": [
                {
                    "pdw_id": p.pdw_id,
                    "toa_us": p.toa_us,
                    "center_freq_mhz": round(p.center_freq_mhz, 2),
                    "pulse_width_us": round(p.pulse_width_us, 2),
                    "aoa_deg": round(p.aoa_deg, 1),
                    "amplitude_db": round(p.amplitude_db, 1),
                    "emitter_class_id": p.emitter_class_id,
                }
                for p in intercepted[:8]
            ],
            "explainable_ai_log": {
                "agent": decision["agent"],
                "action_taken": f"SWEEP_BAND_{tuned + 1}",
                "rationale": decision["rationale"],
            },
        }
        self.latest = payload
        return payload


runtime = SimulationRuntime()
