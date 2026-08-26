from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.auth import decode_token
from app.core.runtime import runtime
from app.core.scheduler_engine import SchedulerMode

router = APIRouter(prefix="/api/v1", tags=["scheduler"])


def _require_auth(authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    decode_token(authorization.split(" ", 1)[1].strip())


class SchedulerConfig(BaseModel):
    mode: SchedulerMode | None = None
    eager_agent_weight: float | None = Field(default=None, ge=0, le=1)
    revisit_agent_weight: float | None = Field(default=None, ge=0, le=1)
    aoi_decay_factor: float | None = Field(default=None, ge=0.5, le=3.0)
    dwell_time_override_ms: float | None = None
    manual_band: int | None = Field(default=None, ge=0, le=15)
    ignore_band: int | None = Field(default=None, ge=0, le=15)
    unignore_band: int | None = Field(default=None, ge=0, le=15)
    sweep_ms: float | None = Field(default=None, ge=20, le=500)
    hostile_spawn: float | None = Field(default=None, ge=0, le=1)
    noise_floor: float | None = Field(default=None, ge=0, le=0.8)
    epsilon: float | None = Field(default=None, ge=0, le=0.4)


class SimulationCommand(BaseModel):
    action: Literal["start", "pause", "reset"]


@router.post("/scheduler/config")
def update_config(
    body: SchedulerConfig,
    authorization: str | None = Header(default=None),
) -> dict:
    _require_auth(authorization)
    runtime.configure(**body.model_dump(exclude_none=True))
    return {
        "ok": True,
        "mode": runtime.scheduler.mode,
        "sweep_ms": runtime.sweep_ms,
        "hostile_spawn": runtime.hostile_spawn,
        "noise_floor": runtime.noise_floor,
        "ignored": sorted(runtime.scheduler.ignored),
    }


@router.post("/simulation/{action}")
def simulation_command(
    action: Literal["start", "pause", "reset"],
    authorization: str | None = Header(default=None),
) -> dict:
    _require_auth(authorization)
    if action == "start":
        runtime.start()
    elif action == "pause":
        runtime.pause()
    else:
        runtime.reset()
    return {"ok": True, "running": runtime.running, "mode": runtime.scheduler.mode}


@router.get("/sessions")
def list_sessions(authorization: str | None = Header(default=None)) -> dict:
    _require_auth(authorization)
    from app.core.archive import archive

    return {"sessions": archive.list_sessions()}


@router.get("/sessions/current")
def current_session(authorization: str | None = Header(default=None)) -> dict:
    _require_auth(authorization)
    from app.core.archive import archive, compose_summary

    if archive.current:
        return archive.current
    if archive.sessions:
        return archive.sessions[0]
    return {
        "id": None,
        "label": "NO-RUN",
        "status": "IDLE",
        "mode": runtime.scheduler.mode,
        "samples": [],
        "flags": [],
        "logs": [],
        "summary": compose_summary(
            {"mode": runtime.scheduler.mode, "metrics_end": runtime.latest.get("metrics", {}), "samples": [], "flags": []},
            live=False,
        ),
        "metrics_end": runtime.latest.get("metrics", {}),
    }


@router.get("/sessions/{session_id}")
def get_session(session_id: str, authorization: str | None = Header(default=None)) -> dict:
    _require_auth(authorization)
    from app.core.archive import archive

    session = archive.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "aegis-ew-scheduler"}
