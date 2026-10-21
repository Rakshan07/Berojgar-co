import pytest

from app import config, mailer
from conftest import register


@pytest.fixture()
def outbox(monkeypatch):
    sent = []
    monkeypatch.setattr(mailer, "send_email", lambda to, subject, body: sent.append((to, body)))
    return sent


def _otp(outbox):
    return outbox[-1][1].split("code is ")[1][:6]


def _forgot(client, email):
    return client.post("/auth/forgot-password", json={"email": email})


def _reset(client, email, otp, pw="brand-new-pass"):
    return client.post("/auth/reset-password", json={"email": email, "otp": otp, "new_password": pw})


def test_full_flow_changes_password(client, outbox):
    register(client, "a@x.com")
    assert _forgot(client, "a@x.com").status_code == 200
    assert outbox[0][0] == "a@x.com"
    assert _reset(client, "a@x.com", _otp(outbox)).status_code == 200
    assert client.post("/auth/login", json={"email": "a@x.com", "password": "correct-horse"}).status_code == 401
    assert client.post("/auth/login", json={"email": "a@x.com", "password": "brand-new-pass"}).status_code == 200


def test_unknown_email_same_response_and_no_mail(client, outbox):
    register(client, "a@x.com")
    known, unknown = _forgot(client, "a@x.com"), _forgot(client, "nobody@x.com")
    assert known.json() == unknown.json() and unknown.status_code == 200
    assert len(outbox) == 1


def test_wrong_otp_rejected_and_locks_after_max_attempts(client, outbox):
    register(client, "a@x.com")
    _forgot(client, "a@x.com")
    good = _otp(outbox)
    bad = "000000" if good != "000000" else "111111"
    for _ in range(config.OTP_MAX_ATTEMPTS):
        assert _reset(client, "a@x.com", bad).status_code == 400
    assert _reset(client, "a@x.com", good).status_code == 400  # burned


def test_otp_single_use(client, outbox):
    register(client, "a@x.com")
    _forgot(client, "a@x.com")
    otp = _otp(outbox)
    assert _reset(client, "a@x.com", otp).status_code == 200
    assert _reset(client, "a@x.com", otp, "another-pass-1").status_code == 400


def test_expired_otp_rejected(client, outbox, monkeypatch):
    register(client, "a@x.com")
    monkeypatch.setattr(config, "OTP_TTL_MINUTES", -1)
    _forgot(client, "a@x.com")
    assert _reset(client, "a@x.com", _otp(outbox)).status_code == 400


def test_otp_for_one_account_does_not_work_for_another(client, outbox):
    register(client, "a@x.com")
    register(client, "b@x.com")
    _forgot(client, "a@x.com")
    assert _reset(client, "b@x.com", _otp(outbox)).status_code == 400
    assert client.post("/auth/login", json={"email": "b@x.com", "password": "correct-horse"}).status_code == 200


def test_resend_is_throttled(client, outbox):
    register(client, "a@x.com")
    _forgot(client, "a@x.com")
    _forgot(client, "a@x.com")
    assert len(outbox) == 1


def test_reset_signs_out_existing_sessions(client, outbox):
    h, _ = register(client, "a@x.com")
    _forgot(client, "a@x.com")
    _reset(client, "a@x.com", _otp(outbox))
    assert client.get("/auth/me", headers=h).status_code == 401


def test_weak_new_password_rejected(client, outbox):
    register(client, "a@x.com")
    _forgot(client, "a@x.com")
    assert _reset(client, "a@x.com", _otp(outbox), "short").status_code == 422


def test_name_cannot_be_changed(client):
    h, u = register(client, "a@x.com", name="Alice")
    r = client.patch(f"/users/{u['id']}/profile", json={"name": "Mallory"}, headers=h)
    assert r.status_code == 422
    assert client.get("/auth/me", headers=h).json()["name"] == "Alice"
