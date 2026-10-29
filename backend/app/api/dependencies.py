import uuid
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.core.security import decode_access_token
from backend.app.models.auth import User

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, description="Demo/Testing impersonation header")
) -> User:
    """Authenticates the current user via Bearer JWT or demo header for rapid local pairing."""
    if auth and auth.credentials:
        import hashlib
        from sqlalchemy import text

        payload = decode_access_token(auth.credentials)
        if payload and "sub" in payload:
            try:
                user_id = uuid.UUID(payload["sub"])
                user = db.get(User, user_id)
                if user and user.is_active:
                    return user
            except (ValueError, TypeError):
                pass

        # Check session token from hackloop.auth_tokens (used by live frontend)
        token_hash = hashlib.sha256(auth.credentials.encode()).hexdigest()
        session_row = db.execute(
            text("""
                SELECT user_id FROM hackloop.auth_tokens 
                WHERE token_hash = :th AND purpose = 'session' 
                  AND revoked_at IS NULL AND consumed_at IS NULL AND expires_at > now()
            """),
            {"th": token_hash}
        ).fetchone()
        if session_row:
            user = db.get(User, session_row[0])
            if user and user.is_active:
                return user

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


    # Support testing / demo persona switching if X-User-Id header provided
    if x_user_id:
        try:
            uid = uuid.UUID(x_user_id)
            user = db.get(User, uid)
            if user:
                return user
        except ValueError:
            # Check by username
            from sqlalchemy import select
            user = db.scalars(select(User).where(User.username == x_user_id)).first()
            if user:
                return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_ids = [r.id for r in current_user.roles]
        if "admin" in user_role_ids:
            return current_user
        if not any(role in user_role_ids for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {allowed_roles}"
            )
        return current_user
    return role_checker
