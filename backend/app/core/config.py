import os

from pydantic import BaseModel


def _f(name: str, default: str) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return float(default)


class Settings(BaseModel):
    app_name: str = "AEGIS EW-Scheduler"
    num_bands: int = 16
    aoi_threshold_ms: float = _f("AEGIS_AOI_MS", "850")
    telemetry_hz: float = _f("AEGIS_TELEMETRY_HZ", "20")
    sweep_ms: float = _f("AEGIS_SWEEP_MS", "50")
    hostile_spawn: float = _f("AEGIS_HOSTILE_SPAWN", "0.55")
    noise_floor: float = _f("AEGIS_NOISE_FLOOR", "0.12")
    epsilon: float = _f("AEGIS_EPSILON", "0.10")
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    token_ttl_seconds: int = 60 * 60 * 12
    token_secret: str = os.getenv("AEGIS_TOKEN_SECRET", "aegis-sih26055-demo-secret")


settings = Settings()
