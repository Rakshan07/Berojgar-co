import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import TOKEN_TTL_DAYS
from .database import get_db
from .models import AuthToken, User

_SCRYPT = dict(n=2**14, r=8, p=1)
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT)
    except ValueError:
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)


# Verified against when the email is unknown, so login timing doesn't reveal which emails exist.
DUMMY_HASH = hash_password("not-a-real-password")


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


_digest = token_digest


def issue_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AuthToken(
            token_hash=_digest(token),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS),
        )
    )
    db.commit()
    return token


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"}
    )
    if creds is None:
        raise unauthorized
    row = db.scalar(select(AuthToken).where(AuthToken.token_hash == _digest(creds.credentials)))
    if row is None:
        raise unauthorized
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise unauthorized
    user = db.get(User, row.user_id)
    if user is None:
        raise unauthorized
    return user


def require_organizer(user: User = Depends(current_user)) -> User:
    if user.role != "organizer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Organizer access required")
    return user
