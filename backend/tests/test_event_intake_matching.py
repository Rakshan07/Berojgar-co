import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_event_intake_questions():
    event_id = str(uuid.uuid4())
    req_payload = {
        "user_skills": [
            {"name": "React", "category": "Frontend", "proficiency": 3},
            {"name": "Python", "category": "Backend", "proficiency": 3}
        ],
        "preferred_roles": ["Frontend Developer"]
    }
    res = client.post(f"/api/v1/events/{event_id}/intake-questions", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert "skill_questions" in data
    assert "personality_questions" in data
    assert len(data["skill_questions"]) >= 1
    assert len(data["personality_questions"]) == 3
    # Ensure questions are non-technical
    for q in data["skill_questions"]:
        assert q["type"] == "skill_focus"
        assert len(q["options"]) >= 2
    for q in data["personality_questions"]:
        assert q["type"] == "personality"
        assert len(q["options"]) >= 2

def test_calculate_team_compatibility():
    event_id = str(uuid.uuid4())
    req_payload = {
        "user_skills": [
            {"name": "React", "category": "Frontend", "proficiency": 3}
        ],
        "answers": {
            "p_comm": "async",
            "p_crunch": "scope_down",
            "p_ambition": "podium"
        },
        "teams": [
            {
                "id": "t1",
                "name": "CivicPulse",
                "members": [{"participantId": "p2", "role": "Backend Lead"}]
            },
            {
                "id": "t2",
                "name": "FullTeam",
                "members": [{"participantId": f"p{i}", "role": "Member"} for i in range(5)]
            }
        ]
    }
    res = client.post(f"/api/v1/events/{event_id}/calculate-compatibility", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert "compatible_teams" in data
    teams = data["compatible_teams"]
    assert len(teams) == 2
    # CivicPulse with open spot should rank higher than full team
    assert teams[0]["team_id"] == "t1"
    assert teams[0]["overall_score"] > teams[1]["overall_score"]
    assert teams[0]["spots_left"] == 4
    assert teams[1]["is_full"] is True


def test_frontend_redundancy_penalty():
    event_id = str(uuid.uuid4())
    req_payload = {
        "user_skills": [{"name": "React", "category": "Frontend", "proficiency": 3}],
        "preferred_roles": ["Frontend Specialist"],
        "answers": {"p_comm": "async", "p_ambition": "podium"},
        "teams": [
            {
                "id": "team_with_frontend",
                "name": "CivicPulse",
                "members": [{"participantId": "p1", "role": "Frontend Lead"}]
            },
            {
                "id": "team_lacking_frontend",
                "name": "GreenTransit Labs",
                "members": [{"participantId": "p2", "role": "Backend Lead"}]
            }
        ]
    }
    res = client.post(f"/api/v1/events/{event_id}/calculate-compatibility", json=req_payload)
    assert res.status_code == 200
    teams = res.json()["compatible_teams"]
    # Team lacking frontend must rank #1
    assert teams[0]["team_id"] == "team_lacking_frontend"
    assert teams[0]["overall_score"] >= 85
    assert teams[0]["proposed_role"] == "Frontend Lead"

    # Team that already has a Frontend Lead must have redundancy penalty
    team_with_fe = next(t for t in teams if t["team_id"] == "team_with_frontend")
    assert team_with_fe["overall_score"] <= 60
    assert any("Role Overlap" in h for h in team_with_fe["highlights"])


def test_fullstack_adaptive_flex_slotting():
    event_id = str(uuid.uuid4())
    # User is Full-Stack (both React frontend and Python backend)
    req_payload = {
        "user_skills": [
            {"name": "React", "category": "Frontend", "proficiency": 3},
            {"name": "Python", "category": "Backend", "proficiency": 3}
        ],
        "preferred_roles": ["Full-stack Engineer"],
        "answers": {"p_comm": "async", "p_ambition": "podium"},
        "teams": [
            {
                "id": "team_backend_only",
                "name": "DataCore",
                "members": [{"participantId": "p2", "role": "Backend Lead"}]
            },
            {
                "id": "team_frontend_only",
                "name": "UIPulse",
                "members": [{"participantId": "p1", "role": "Frontend Lead"}]
            },
            {
                "id": "team_design_only",
                "name": "BrandLab",
                "members": [{"participantId": "p3", "role": "UX Designer"}]
            }
        ]
    }
    res = client.post(f"/api/v1/events/{event_id}/calculate-compatibility", json=req_payload)
    assert res.status_code == 200
    teams = res.json()["compatible_teams"]

    # On backend-only team, Full-Stack flexes to Frontend Lead
    t_backend = next(t for t in teams if t["team_id"] == "team_backend_only")
    assert "Frontend" in t_backend["proposed_role"]
    assert "Full-Stack Flex" in t_backend["proposed_role"]

    # On frontend-only team, Full-Stack flexes to Backend Lead
    t_frontend = next(t for t in teams if t["team_id"] == "team_frontend_only")
    assert "Backend" in t_frontend["proposed_role"]
    assert "Full-Stack Flex" in t_frontend["proposed_role"]

    # On design-only team, Full-Stack flexes to Lead Full-Stack Architect
    t_design = next(t for t in teams if t["team_id"] == "team_design_only")
    assert t_design["proposed_role"] == "Lead Full-Stack Architect"
    assert t_design["overall_score"] >= 90
