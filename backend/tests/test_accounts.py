from conftest import register


def test_login_wrong_password_is_401(client):
    register(client, "a@x.com")
    r = client.post("/auth/login", json={"email": "a@x.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_login_unknown_email_is_401_and_same_message(client):
    register(client, "a@x.com")
    unknown = client.post("/auth/login", json={"email": "nobody@x.com", "password": "whatever123"})
    wrong = client.post("/auth/login", json={"email": "a@x.com", "password": "wrong-password"})
    assert unknown.status_code == 401
    assert unknown.json() == wrong.json()  # no account enumeration


def test_login_returns_the_right_user_not_a_fallback(client):
    register(client, "a@x.com")
    register(client, "b@x.com")
    r = client.post("/auth/login", json={"email": "A@X.com", "password": "correct-horse"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "a@x.com"


def test_duplicate_email_conflict(client):
    register(client, "a@x.com")
    r = client.post("/auth/register", json={"email": "a@x.com", "name": "A2", "password": "correct-horse"})
    assert r.status_code == 409


def test_me_requires_valid_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer bogus"}).status_code == 401


def test_two_tokens_two_identities(client):
    ha, _ = register(client, "a@x.com")
    hb, _ = register(client, "b@x.com")
    ra, rb = client.get("/auth/me", headers=ha).json(), client.get("/auth/me", headers=hb).json()
    assert ra["email"] == "a@x.com" and rb["email"] == "b@x.com"
    assert ra["id"] != rb["id"]


def test_logout_revokes_only_that_token(client):
    h1, _ = register(client, "a@x.com")
    h2 = {"Authorization": "Bearer " + client.post(
        "/auth/login", json={"email": "a@x.com", "password": "correct-horse"}).json()["token"]}
    assert client.post("/auth/logout", headers=h1).status_code == 204
    assert client.get("/auth/me", headers=h1).status_code == 401
    assert client.get("/auth/me", headers=h2).status_code == 200


def test_password_not_exposed(client):
    h, u = register(client, "a@x.com")
    assert "password" not in str(u)
    assert "password" not in client.get("/auth/me", headers=h).text
