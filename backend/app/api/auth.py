"""Mock operator authentication (HMAC tokens, in-memory users)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_users: dict[str, dict[str, str]] = {
    "operator@aegis.local": {"name": "SCAN-01", "password": "aegis"},
}


def _sign(payload: str) -> str:
    return hmac.new(
        settings.token_secret.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()


def issue_token(email: str, name: str) -> str:
    body = json.dumps(
        {
            "email": email,
            "name": name,
            "exp": time.time() + settings.token_ttl_seconds,
        },
        separators=(",", ":"),
    )
    token = f"{body}::{_sign(body)}"
    return base64.urlsafe_b64encode(token.encode()).decode()


def decode_token(token: str) -> dict[str, Any]:
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        body, sig = raw.rsplit("::", 1)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Malformed token") from exc
    if not hmac.compare_digest(sig, _sign(body)):
        raise HTTPException(status_code=401, detail="Invalid token")
    data = json.loads(body)
    if data.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")
    return data


class AuthRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)
    name: str | None = None


class AuthResponse(BaseModel):
    token: str
    email: str
    name: str


@router.post("/register", response_model=AuthResponse)
def register(body: AuthRequest) -> AuthResponse:
    email = body.email.lower()
    if email in _users:
        raise HTTPException(status_code=409, detail="Operator already enrolled")
    name = (body.name or email.split("@")[0]).strip() or "OPERATOR"
    _users[email] = {"name": name, "password": body.password}
    return AuthResponse(token=issue_token(email, name), email=email, name=name)


@router.post("/login", response_model=AuthResponse)
def login(body: AuthRequest) -> AuthResponse:
    email = body.email.lower()
    user = _users.get(email)
    if user is None or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Invalid operator credentials")
    return AuthResponse(token=issue_token(email, user["name"]), email=email, name=user["name"])
