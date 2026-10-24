import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from backend.app.core.config import settings
from backend.app.core.security import hash_password, verify_password, create_access_token, hash_session_token, generate_session_token
from backend.app.models.auth import User, Role, UserRole, UserSession
from backend.app.models.profile import Profile
from backend.app.schemas.auth import UserRegisterRequest, TokenResponse

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, req: UserRegisterRequest) -> User:
        # Check if email or username exists
        existing = self.db.scalars(
            select(User).where(or_(User.email == req.email, User.username == req.username))
        ).first()
        if existing:
            raise ValueError("Email or username is already registered")

        user = User(
            email=req.email,
            username=req.username,
            password_hash=hash_password(req.password),
            full_name=req.full_name,
            is_active=True,
            is_verified=True,
        )
        self.db.add(user)
        self.db.flush()

        # Assign role
        role_id = req.role if req.role in ("participant", "organizer", "admin") else "participant"
        # Ensure role exists in roles table
        role = self.db.get(Role, role_id)
        if not role:
            role = Role(id=role_id, name=role_id.capitalize())
            self.db.add(role)
            self.db.flush()

        user_role = UserRole(user_id=user.id, role_id=role_id)
        self.db.add(user_role)

        # Create initial profile
        profile = Profile(
            user_id=user.id,
            tagline="New collaborator on TeamWeave",
            bio="Building skills and exploring teams.",
            timezone="UTC",
            hours_per_week=15
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, email_or_username: str, password: str) -> Tuple[User, TokenResponse]:
        user = self.db.scalars(
            select(User).where(or_(User.email == email_or_username, User.username == email_or_username))
        ).first()
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")

        if not user.is_active:
            raise ValueError("Account is inactive")

        roles = [r.id for r in user.roles] or ["participant"]
        token = create_access_token(subject=user.id, roles=roles)

        # Record session
        session_token = generate_session_token()
        session = UserSession(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        self.db.add(session)
        self.db.commit()

        token_res = TokenResponse(
            access_token=token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            roles=roles
        )
        return user, token_res

    def logout(self, user_id: uuid.UUID, token: str) -> None:
        thash = hash_session_token(token)
        session = self.db.scalars(
            select(UserSession).where(UserSession.user_id == user_id, UserSession.token_hash == thash)
        ).first()
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            self.db.commit()

    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        return self.db.get(User, user_id)
