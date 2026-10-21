from conftest import register


def test_cannot_edit_other_profile(client):
    ha, a = register(client, "a@x.com")
    hb, b = register(client, "b@x.com")
    r = client.patch(f"/users/{b['id']}/profile", json={"bio": "hacked"}, headers=ha)
    assert r.status_code == 403
    assert client.get("/auth/me", headers=hb).json()["bio"] == ""
    # own profile still editable
    assert client.patch(f"/users/{a['id']}/profile", json={"bio": "mine"}, headers=ha).status_code == 200


def test_cannot_see_other_drafts(client):
    ha, _ = register(client, "a@x.com")
    hb, _ = register(client, "b@x.com")
    did = client.post("/drafts", json={"title": "secret", "body": "draft by B"}, headers=hb).json()["id"]

    assert client.get("/drafts", headers=ha).json() == []
    assert client.get(f"/drafts/{did}", headers=ha).status_code == 404
    assert client.put(f"/drafts/{did}", json={"title": "x"}, headers=ha).status_code == 404
    assert client.delete(f"/drafts/{did}", headers=ha).status_code == 404
    assert client.get(f"/drafts/{did}", headers=hb).json()["body"] == "draft by B"


def test_cannot_see_other_challenge_answers(client):
    ha, a = register(client, "a@x.com")
    hb, b = register(client, "b@x.com")
    client.put("/challenges/c1/answer", json={"answer": "B-secret-answer"}, headers=hb)

    assert client.get(f"/users/{b['id']}/challenge-answers", headers=ha).status_code == 403
    assert client.get(f"/users/{a['id']}/challenge-answers", headers=ha).json() == []
    assert client.get(f"/users/{b['id']}/challenge-answers", headers=hb).json()[0]["answer"] == "B-secret-answer"


def test_same_challenge_answers_are_per_user(client):
    ha, a = register(client, "a@x.com")
    hb, _ = register(client, "b@x.com")
    client.put("/challenges/c1/answer", json={"answer": "A"}, headers=ha)
    client.put("/challenges/c1/answer", json={"answer": "B"}, headers=hb)
    assert client.get(f"/users/{a['id']}/challenge-answers", headers=ha).json()[0]["answer"] == "A"


def test_participant_gets_403_on_organizer_endpoints(client):
    hp, _ = register(client, "p@x.com", role="participant")
    ho, _ = register(client, "o@x.com", role="organizer")
    for method, path in [("get", "/organizer/roster"), ("get", "/organizer/events"), ("post", "/organizer/events")]:
        kwargs = {"json": {"title": "T"}} if method == "post" else {}
        assert getattr(client, method)(path, headers=hp, **kwargs).status_code == 403, path
        assert getattr(client, method)(path, **kwargs).status_code == 401, path
    assert client.post("/organizer/events", json={"title": "T"}, headers=ho).status_code == 201
    roster = client.get("/organizer/roster", headers=ho).json()
    assert [r["name"] for r in roster] == ["p"] and "email" not in roster[0]
