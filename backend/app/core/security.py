import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from backend.app.core.config import settings

# Argon2id password hasher instance
ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16
)

def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False

def create_access_token(
    subject: Union[str, Any],
    roles: Optional[list] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generates a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "roles": roles or ["participant"],
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        return None

def generate_session_token() -> str:
    """Generates a high-entropy random URL-safe session token."""
    return secrets.token_urlsafe(48)

def hash_session_token(token: str) -> str:
    """Hashes a session token using SHA-256 for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
