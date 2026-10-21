import sys

from app import config
from conftest import register


def test_empty_key_returns_static_without_calling_claude(client, monkeypatch):
    h, _ = register(client, "a@x.com")
    monkeypatch.setitem(sys.modules, "anthropic", None)  # any import/use would raise
    r = client.post("/ai/suggestions", json={"category": "debate"}, headers=h)
    assert r.status_code == 200
    assert r.json()["source"] == "static" and "Lead Speaker" in r.json()["roles"]


def test_unknown_category_falls_back_to_default(client):
    h, _ = register(client, "a@x.com")
    assert client.post("/ai/suggestions", json={"category": "zzz"}, headers=h).json()["source"] == "static"


def test_claude_failure_falls_back_to_static(client, monkeypatch):
    h, _ = register(client, "a@x.com")
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "sk-fake")
    monkeypatch.setitem(sys.modules, "anthropic", None)  # import fails => fallback
    assert client.post("/ai/suggestions", json={}, headers=h).json()["source"] == "static"


def test_requires_auth(client):
    assert client.post("/ai/suggestions", json={}).status_code == 401
