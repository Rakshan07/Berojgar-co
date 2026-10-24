import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

def test_matching_run_workflow(client: TestClient, auth_headers_organizer):
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    
    # 1. Create a fresh test event with min_team_size=2, max_team_size=3
    create_res = client.post(
        "/api/v1/events",
        json={
            "title": f"Matching Sprint {uid}",
            "category_id": "hackathon",
            "description": "Testing deterministic complementary team formation.",
            "mode": "remote",
            "min_team_size": 2,
            "max_team_size": 3,
            "start_date": (now + timedelta(days=5)).isoformat(),
            "end_date": (now + timedelta(days=8)).isoformat(),
            "registration_deadline": (now + timedelta(days=4)).isoformat(),
            "max_participants": 20,
            "requirements": [
                {"skill_name": "Frontend Development", "category": "Technical", "required": True, "min_proficiency": 2},
                {"skill_name": "Backend Development", "category": "Technical", "required": True, "min_proficiency": 2},
                {"skill_name": "UX Design", "category": "Design", "required": False, "min_proficiency": 1}
            ]
        },
        headers=auth_headers_organizer
    )
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]

    # Publish event
    pub_res = client.post(f"/api/v1/events/{event_id}/publish", headers=auth_headers_organizer)
    assert pub_res.status_code == 200

    # 2. Register demo participants p1, p2, p3 using their test personas
    # Personas: p1 = Asel, p2 = Marcus, p3 = Yuna
    for pid, role in [
        ("a0000000-0000-0000-0000-000000000001", "Frontend Lead"),
        ("a0000000-0000-0000-0000-000000000002", "Backend Lead"),
        ("a0000000-0000-0000-0000-000000000003", "Lead Designer")
    ]:
        client.post(
            f"/api/v1/events/{event_id}/register",
            json={"preferred_roles": [role]},
            headers={"X-User-Id": pid}
        )

    # 3. Trigger matching run
    run_res = client.post(
        f"/api/v1/events/{event_id}/matching-runs",
        json={"algorithm_version": "teamweave-v1-greedy-complementary", "target_team_size": 3},
        headers=auth_headers_organizer
    )
    assert run_res.status_code == 201
    data = run_res.json()
    assert data["status"] == "completed"
    assert "summary" in data
    assert len(data["proposed_teams"]) >= 1

    proposed_team = data["proposed_teams"][0]
    assert proposed_team["status"] == "proposed"
    assert len(proposed_team["members"]) >= 2
    assert proposed_team["explanation"] is not None
    assert len(proposed_team["explanation"]["coverage_notes"]) >= 1
    assert len(proposed_team["explanation"]["match_reasons"]) >= 1

    run_id = data["id"]

    # 4. Inspect run detail
    detail_res = client.get(
        f"/api/v1/matching-runs/{run_id}",
        headers=auth_headers_organizer
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == run_id

    # 5. Approve run (creates live confirmed teams)
    approve_res = client.post(
        f"/api/v1/matching-runs/{run_id}/approve",
        headers=auth_headers_organizer
    )
    assert approve_res.status_code == 200
    assert len(approve_res.json()) >= 1
    approved_team = approve_res.json()[0]
    assert approved_team["status"] == "published"
    assert len(approved_team["members"]) >= 2
