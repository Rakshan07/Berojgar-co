from starlette.testclient import TestClient

def test_generate_ai_event_setup(client: TestClient, auth_headers_organizer):
    event_id = "e0000000-0000-0000-0000-000000000002" # National Debate Championship
    
    response = client.post(
        f"/api/v1/events/{event_id}/ai-setup",
        json={"category": "debate", "focus_areas": ["Social Policy", "Economics"]},
        headers=auth_headers_organizer
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "generated"
    assert len(data["suggested_roles"]) >= 1
    assert len(data["suggested_requirements"]) >= 1
    assert "explanation" in data
    assert any("Argumentation" in r["skill_name"] for r in data["suggested_requirements"])

def test_approve_ai_event_setup(client: TestClient, auth_headers_organizer):
    event_id = "e0000000-0000-0000-0000-000000000002"
    
    # Generate draft
    gen_res = client.post(
        f"/api/v1/events/{event_id}/ai-setup",
        json={"category": "debate"},
        headers=auth_headers_organizer
    )
    gen_id = gen_res.json()["generation_id"]
    suggested_reqs = gen_res.json()["suggested_requirements"]

    # Approve draft
    approve_res = client.post(
        f"/api/v1/events/{event_id}/ai-setup/{gen_id}/approve",
        json={
            "approved_requirements": suggested_reqs[:2]
        },
        headers=auth_headers_organizer
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"
