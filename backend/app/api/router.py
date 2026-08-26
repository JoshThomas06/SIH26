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


class SimulationCommand(BaseModel):
    action: Literal["start", "pause", "reset"]


@router.post("/scheduler/config")
def update_config(
    body: SchedulerConfig,
    authorization: str | None = Header(default=None),
) -> dict:
    _require_auth(authorization)
    runtime.configure(**body.model_dump(exclude_none=True))
    return {"ok": True, "mode": runtime.scheduler.mode}


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


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "aegis-ew-scheduler"}
