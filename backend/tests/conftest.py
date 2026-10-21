import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool

from app import config
from app.database import Base, SessionLocal, get_db, make_engine
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    # Fresh in-memory DB per test; never touches teamweave.db.
    engine = make_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(engine)
    SessionLocal.configure(bind=engine)

    def override():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    yield TestClient(app)  # no `with`: lifespan would create tables on the real engine
    app.dependency_overrides.clear()


def register(client, email, role="participant", name=None, password="correct-horse"):
    r = client.post("/auth/register", json={
        "email": email, "name": name or email.split("@")[0], "password": password, "role": role})
    assert r.status_code == 201, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]
