import pytest
import uuid
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import hash_password, create_access_token
from backend.app.db.session import engine, SessionLocal
from backend.app.models.auth import User, Role, UserRole
from backend.app.models.profile import Profile
from backend.app.main import app

@pytest.fixture(scope="session")
def db_session():
    """Provides a database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def auth_headers_organizer(db_session: Session):
    # Retrieve demo organizer
    org_user = db_session.get(User, uuid.UUID("b0000000-0000-0000-0000-000000000001"))
    token = create_access_token(subject=org_user.id, roles=["organizer"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_participant(db_session: Session):
    # Retrieve demo participant p1
    user = db_session.get(User, uuid.UUID("a0000000-0000-0000-0000-000000000001"))
    token = create_access_token(subject=user.id, roles=["participant"])
    return {"Authorization": f"Bearer {token}"}
