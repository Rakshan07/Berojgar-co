import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

def test_team_blueprint_and_departure_replacement(client: TestClient, auth_headers_organizer):
    # 1. Fetch Baseline CivicPulse Blueprint
    team_id = "d0000000-0000-0000-0000-000000000001"
    bp_res = client.get(f"/api/v1/teams/{team_id}/blueprint")
    assert bp_res.status_code == 200
    bp_data = bp_res.json()
    assert bp_data["name"] == "CivicPulse"
    assert len(bp_data["members"]) >= 1

    # 2. Test Member Departure & Replacement workflow on a dedicated team
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    
    # Create event
    event_res = client.post(
        "/api/v1/events",
        json={
            "title": f"Replacement Test Sprint {uid}",
            "category_id": "hackathon",
            "description": "Testing departure recalculation and replacement.",
            "mode": "remote",
            "min_team_size": 2,
            "max_team_size": 4,
            "start_date": (now + timedelta(days=5)).isoformat(),
            "end_date": (now + timedelta(days=8)).isoformat(),
            "registration_deadline": (now + timedelta(days=4)).isoformat(),
            "max_participants": 20,
            "requirements": [
                {"skill_name": "Frontend Development", "category": "Technical", "required": True, "min_proficiency": 2},
                {"skill_name": "Backend Development", "category": "Technical", "required": True, "min_proficiency": 2}
            ]
        },
        headers=auth_headers_organizer
    )
    event_id = event_res.json()["id"]
    client.post(f"/api/v1/events/{event_id}/publish", headers=auth_headers_organizer)

    # Register p1 (Asel), p2 (Marcus), and p4 (Devraj)
    p1_id = "a0000000-0000-0000-0000-000000000001"
    p2_id = "a0000000-0000-0000-0000-000000000002"
    p4_id = "a0000000-0000-0000-0000-000000000004"

    for pid in [p1_id, p2_id, p4_id]:
        client.post(
            f"/api/v1/events/{event_id}/register",
            json={"preferred_roles": ["Engineer"]},
            headers={"X-User-Id": pid}
        )

    # Run matching for p1 & p2
    run_res = client.post(
        f"/api/v1/events/{event_id}/matching-runs",
        json={"algorithm_version": "teamweave-v1-greedy-complementary", "target_team_size": 2},
        headers=auth_headers_organizer
    )
    run_id = run_res.json()["id"]
    
    # Approve matching run -> creates live team
    approve_res = client.post(
        f"/api/v1/matching-runs/{run_id}/approve",
        headers=auth_headers_organizer
    )
    created_team = approve_res.json()[0]
    live_team_id = created_team["id"]
    departing_member = created_team["members"][0]
    
    # 3. Depart member
    leave_res = client.post(
        f"/api/v1/teams/{live_team_id}/members/{departing_member['membership_id']}/leave",
        json={"departure_reason": "Emergency leave"},
        headers=auth_headers_organizer
    )
    assert leave_res.status_code == 200
    assert leave_res.json()["status"] == "departed"

    # 4. Request replacement recommendations
    rec_res = client.post(
        f"/api/v1/teams/{live_team_id}/replacement-recommendations?departed_user_id={departing_member['user_id']}",
        headers=auth_headers_organizer
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["status"] == "pending"
    assert "uncovered_requirements" in rec_data
    assert len(rec_data["candidates"]) >= 1

    # 5. Apply replacement
    rec_id = rec_data["id"]
    candidate = rec_data["candidates"][0]
    apply_res = client.post(
        f"/api/v1/teams/{live_team_id}/replacements/{rec_id}/apply",
        json={"candidate_user_id": candidate["candidate_id"], "assigned_role": "Replacement Lead"},
        headers=auth_headers_organizer
    )
    assert apply_res.status_code == 200
    assert apply_res.json()["status"] == "active"
    assert apply_res.json()["role"] == "Replacement Lead"
