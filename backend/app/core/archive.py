"""In-memory run archive, flags, and heuristic AI summaries."""

from __future__ import annotations

import time
import uuid
from typing import Any


def _mode_label(mode: str) -> str:
    return {
        "MANUAL": "Manual dwell",
        "OPEN_LOOP": "open-loop sequential sweep",
        "SMART_SCAN_MARL": "Smart Scan dual-agent (Eager + Revisit)",
    }.get(mode, mode)


def compose_summary(session: dict[str, Any], live: bool = False) -> str:
    metrics = session.get("metrics_end") or {}
    samples = session.get("samples") or []
    flags = session.get("flags") or []
    mode = session.get("mode") or "SMART_SCAN_MARL"
    pd = float(metrics.get("probability_of_detection") or 0) * 100
    pfa = float(metrics.get("probability_of_false_alarm") or 0) * 100
    dt = float(metrics.get("avg_intercept_time_error_ms") or 0)
    hits = int(metrics.get("hits") or 0)
    misses = int(metrics.get("misses") or 0)
    reward = float(metrics.get("current_reward_score") or 0)
    high_flags = [f for f in flags if f.get("severity") == "HIGH"]
    tense = "This live run is" if live else "This closed run was"
    outlook = (
        "Smart Scan is holding intercept quality; keep this mode for the remainder of the demo."
        if pd >= 28 and mode == "SMART_SCAN_MARL"
        else "Open-loop is leaving agile emitters in the gaps — switch to Smart Scan MARL to lift Pd."
        if mode == "OPEN_LOOP"
        else "Manual stare will starve unwatched slices; return to Smart Scan unless you are locking a known emitter."
        if mode == "MANUAL"
        else "Let the run accumulate another 20-30 seconds so Pd and dt separate from the baseline."
    )
    peak = max((s.get("pd", 0) for s in samples), default=0) * 100
    flag_line = (
        f"{len(high_flags)} high-priority events were flagged (HIGH-band locks, Revisit pre-emptions, or miss bursts)."
        if flags
        else "No special flags yet — wait for a HIGH-band occupancy or a Revisit hop."
    )
    return (
        f"{tense} executed as {_mode_label(mode)}. "
        f"Catch rate (Pd) sits at {pd:.1f}% (peak {peak:.1f}%), with {hits} hits against {misses} misses. "
        f"False-alarm share is {pfa:.1f}% and mean intercept lag dt is {dt:.1f} ms. "
        f"Scheduler reward is {reward:.1f}. {flag_line} {outlook}"
    )


class SessionArchive:
    def __init__(self) -> None:
        self.sessions: list[dict[str, Any]] = []
        self.current: dict[str, Any] | None = None
        self._seq = 0
        self._tick = 0
        self._last_agent = ""
        self._miss_streak = 0

    def start(self, mode: str) -> dict[str, Any]:
        self.close()
        self._seq += 1
        self._tick = 0
        self._miss_streak = 0
        self.current = {
            "id": str(uuid.uuid4())[:8],
            "label": f"RUN-{self._seq:03d}",
            "started_at": time.time(),
            "ended_at": None,
            "status": "LIVE",
            "mode": mode,
            "samples": [],
            "flags": [],
            "logs": [],
            "summary": "",
            "metrics_end": {},
        }
        return self.current

    def close(self) -> dict[str, Any] | None:
        if not self.current:
            return None
        self.current["ended_at"] = time.time()
        self.current["status"] = "CLOSED"
        self.current["summary"] = compose_summary(self.current, live=False)
        closed = self.current
        self.sessions.insert(0, closed)
        self.sessions = self.sessions[:24]
        self.current = None
        return closed

    def note_log(self, line: str) -> None:
        if not self.current or not line:
            return
        logs: list[str] = self.current["logs"]
        if logs and logs[-1] == line:
            return
        logs.append(line)
        if len(logs) > 240:
            del logs[0:40]

    def record(self, payload: dict[str, Any], agent: str) -> None:
        if not self.current:
            return
        self._tick += 1
        self.current["mode"] = payload.get("scheduler_mode", self.current["mode"])
        self.current["metrics_end"] = payload.get("metrics") or {}
        metrics = self.current["metrics_end"]
        misses = int(metrics.get("misses") or 0)
        hits = int(metrics.get("hits") or 0)
        if self._tick % 8 == 0:
            self.current["samples"].append(
                {
                    "t": time.time() - self.current["started_at"],
                    "pd": float(metrics.get("probability_of_detection") or 0),
                    "pfa": float(metrics.get("probability_of_false_alarm") or 0),
                    "dt": float(metrics.get("avg_intercept_time_error_ms") or 0),
                    "reward": float(metrics.get("current_reward_score") or 0),
                    "hits": hits,
                    "misses": misses,
                    "tuned_band": int(payload.get("active_tuned_band") or 0),
                    "mode": self.current["mode"],
                }
            )
            if len(self.current["samples"]) > 400:
                self.current["samples"] = self.current["samples"][-400:]
        log = payload.get("explainable_ai_log") or {}
        rationale = log.get("rationale")
        if rationale:
            self.note_log(f"[{log.get('agent')}] {log.get('action_taken')} — {rationale}")

        tuned = int(payload.get("active_tuned_band") or 0)
        bands = payload.get("band_states") or []
        tuned_row = bands[tuned] if 0 <= tuned < len(bands) else {}
        if tuned_row.get("threat_level") == "HIGH" and tuned_row.get("status") in ("LOCKED", "OCCUPIED"):
            self._flag(
                "HIGH_LOCK",
                "HIGH",
                tuned,
                f"High-threat lock on band {tuned + 1:02d}",
                "The receiver is dwelling on a HIGH-priority emitter (periodic / agile / short-pulse). "
                "This is the intercept you want to brief on the polar scope.",
            )
        if agent.startswith("REVISIT") and agent != self._last_agent:
            self._flag(
                "REVISIT",
                "MEDIUM",
                tuned,
                "Revisit agent pre-empted the tuner",
                "Age-of-Information crossed 850 ms on a stale slice, so the Revisit expert took the next hop "
                "instead of letting Eager starve that channel.",
            )
        if payload.get("metrics"):
            pass
        if misses > 0 and hits + misses > 0:
            recent = self.current["samples"][-3:] if self.current["samples"] else []
            if len(recent) >= 3 and all(s["misses"] >= misses - 2 for s in recent) and misses - (recent[0]["misses"] if recent else 0) >= 12:
                self._flag(
                    "MISS_BURST",
                    "MEDIUM",
                    tuned,
                    "Miss burst — emitters active off-tune",
                    "Several true emissions occurred while the tuner was on a quiet slice. "
                    "Typical of open-loop; Smart Scan should shorten these bursts.",
                )
        self._last_agent = agent
        self.current["summary"] = compose_summary(self.current, live=True)

    def _flag(self, kind: str, severity: str, band: int, title: str, detail: str) -> None:
        if not self.current:
            return
        flags: list[dict[str, Any]] = self.current["flags"]
        now = time.time()
        if any(f["kind"] == kind and f.get("band") == band and now - f["t"] < 4.0 for f in flags):
            return
        flags.append(
            {
                "id": str(uuid.uuid4())[:8],
                "t": now - self.current["started_at"],
                "kind": kind,
                "severity": severity,
                "band": band,
                "title": title,
                "detail": detail,
            }
        )
        if len(flags) > 80:
            del flags[0:20]

    def list_sessions(self) -> list[dict[str, Any]]:
        items = []
        if self.current:
            items.append(self._card(self.current))
        items.extend(self._card(s) for s in self.sessions)
        return items

    def get(self, session_id: str) -> dict[str, Any] | None:
        if self.current and self.current["id"] == session_id:
            return self.current
        for session in self.sessions:
            if session["id"] == session_id:
                return session
        return None

    def _card(self, session: dict[str, Any]) -> dict[str, Any]:
        metrics = session.get("metrics_end") or {}
        return {
            "id": session["id"],
            "label": session["label"],
            "status": session["status"],
            "mode": session["mode"],
            "started_at": session["started_at"],
            "ended_at": session.get("ended_at"),
            "flag_count": len(session.get("flags") or []),
            "sample_count": len(session.get("samples") or []),
            "pd": float(metrics.get("probability_of_detection") or 0),
            "hits": int(metrics.get("hits") or 0),
            "misses": int(metrics.get("misses") or 0),
            "summary": session.get("summary") or compose_summary(session, live=session["status"] == "LIVE"),
        }


archive = SessionArchive()
