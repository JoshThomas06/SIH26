import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.runtime import runtime

router = APIRouter()


@router.websocket("/ws/telemetry")
async def telemetry_socket(ws: WebSocket) -> None:
    await ws.accept()
    runtime.clients.add(ws)
    period = 1.0 / settings.telemetry_hz
    try:
        while True:
            await ws.send_text(json.dumps(runtime.latest))
            await asyncio.sleep(period)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        runtime.clients.discard(ws)
