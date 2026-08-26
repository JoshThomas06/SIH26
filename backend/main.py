from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.router import router as api_router
from app.api.websocket import router as ws_router
from app.core.config import settings
from app.core.runtime import runtime


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(runtime.run_loop())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(api_router)
app.include_router(ws_router)


@app.get("/")
def root() -> dict:
    return {"name": settings.app_name, "problem": "SIH 26055"}
