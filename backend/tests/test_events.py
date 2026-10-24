import uuid
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

def test_list_published_events(client: TestClient):
    response = client.get("/api/v1/events")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert any(e["slug"] == "city-innovation-hackathon-2026" for e in data["items"])

def test_event_date_validation(client: TestClient, auth_headers_organizer):
    now = datetime.now(timezone.utc)
    # End date before start date should fail
    payload = {
        "title": "Invalid Date Event",
        "category_id": "hackathon",
        "description": "Testing date constraints on event wizard.",
        "mode": "hybrid",
        "min_team_size": 3,
        "max_team_size": 5,
        "start_date": (now + timedelta(days=10)).isoformat(),
        "end_date": (now + timedelta(days=5)).isoformat(), # Invalid!
        "registration_deadline": (now + timedelta(days=4)).isoformat(),
        "max_participants": 50
    }
    response = client.post("/api/v1/events", json=payload, headers=auth_headers_organizer)
    assert response.status_code == 400
    assert "end_date must be greater than or equal to start_date" in response.json()["detail"]

def test_create_and_publish_event(client: TestClient, auth_headers_organizer):
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    payload = {
        "title": f"Civic Challenge {uid}",
        "category_id": "hackathon",
        "description": "Building sustainable tools for neighborhood transit.",
        "mode": "remote",
        "min_team_size": 2,
        "max_team_size": 4,
        "start_date": (now + timedelta(days=5)).isoformat(),
        "end_date": (now + timedelta(days=7)).isoformat(),
        "registration_deadline": (now + timedelta(days=4)).isoformat(),
        "max_participants": 30,
        "requirements": [
            {
                "skill_name": "Frontend Development",
                "category": "Technical",
                "required": True,
                "min_proficiency": 2
            }
        ]
    }
    create_res = client.post("/api/v1/events", json=payload, headers=auth_headers_organizer)
    assert create_res.status_code == 201
    event_id = create_res.json()["id"]
    assert create_res.json()["status"] == "draft"

    # Publish
    pub_res = client.post(f"/api/v1/events/{event_id}/publish", headers=auth_headers_organizer)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "open"

def test_register_and_withdraw(client: TestClient, auth_headers_participant):
    event_id = "e0000000-0000-0000-0000-000000000004" # Brand sprint event
    
    # Register
    reg_res = client.post(
        f"/api/v1/events/{event_id}/register",
        json={"preferred_roles": ["Visual Designer"]},
        headers=auth_headers_participant
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["status"] == "registered"

    # Withdraw
    withdraw_res = client.post(
        f"/api/v1/events/{event_id}/withdraw",
        headers=auth_headers_participant
    )
    assert withdraw_res.status_code == 200
    assert withdraw_res.json()["status"] == "withdrawn"
