import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from secrets import compare_digest

from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_analytics_key(
    x_analytics_key: str | None = Header(default=None),
    x_analytics_job_token: str | None = Header(default=None),
) -> None:
    settings = get_settings()
    if settings.analytics_shared_secret and x_analytics_job_token:
        validate_job_token(x_analytics_job_token, settings.analytics_shared_secret)
        return

    if settings.analytics_api_key and x_analytics_key and compare_digest(x_analytics_key, settings.analytics_api_key):
        return

    raise_unauthorized()


def validate_job_token(token: str, shared_secret: str) -> None:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
    except ValueError:
        raise_unauthorized()

    expected_signature = hmac.new(
        shared_secret.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_b64 = base64_url_encode(expected_signature)

    if not compare_digest(signature_b64, expected_b64):
        raise_unauthorized()

    try:
        payload = json.loads(base64_url_decode(payload_b64).decode("utf-8"))
        expires_at = datetime.fromisoformat(payload["expires_at"].replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise_unauthorized()

    now = datetime.now(timezone.utc)
    skew = get_settings().analytics_token_clock_skew_seconds
    if expires_at.timestamp() + skew < now.timestamp():
        raise_unauthorized()


def base64_url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def base64_url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def raise_unauthorized() -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid analytics service credential.",
    )
