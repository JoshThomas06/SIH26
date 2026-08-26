from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "AEGIS EW-Scheduler"
    num_bands: int = 16
    aoi_threshold_ms: float = 850.0
    telemetry_hz: float = 20.0
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    token_ttl_seconds: int = 60 * 60 * 12
    token_secret: str = "aegis-sih26055-demo-secret"


settings = Settings()
