from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import hashlib
import hmac
from threading import Lock
from jose import JWTError, jwt
from passlib.context import CryptContext
from fc_core.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_identity_lock = Lock()
_seen_identity_signatures: dict[str, int] = {}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


def extract_bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    if not authorization_header:
        return None
    parts = authorization_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def verify_internal_identity_signature(
    *,
    method: str,
    path: str,
    user_id: str,
    team_id: str,
    ts: str,
    signature: str,
    secret: str,
    max_skew_seconds: int,
) -> bool:
    if not (method and path and user_id and ts and signature and secret):
        return False
    try:
        ts_int = int(ts)
    except ValueError:
        return False

    now_ts = int(datetime.now(timezone.utc).timestamp())
    if abs(now_ts - ts_int) > max_skew_seconds:
        return False

    canonical_method = method.upper()
    canonical_path = path
    payload = f"{canonical_method}|{canonical_path}|{user_id}|{team_id}|{ts}"
    expected = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return False

    # Best-effort replay protection for signed headers.
    key = f"{canonical_method}|{canonical_path}|{user_id}|{team_id}|{ts}|{signature}"
    with _identity_lock:
        # purge old entries
        stale_before = now_ts - (max_skew_seconds * 2)
        stale_keys = [k for k, v in _seen_identity_signatures.items() if v < stale_before]
        for stale_key in stale_keys:
            _seen_identity_signatures.pop(stale_key, None)

        if key in _seen_identity_signatures:
            return False
        _seen_identity_signatures[key] = now_ts

    return True
