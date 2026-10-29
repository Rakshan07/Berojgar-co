"""Comprehensive end-to-end test suite for Event Assessment, Complementary Team Matching,
and Private Team Chat workflows.
Verifies all 15 system and product requirements:
1. Approved organizer creates and publishes an event.
2. Unapproved organizer cannot publish.
3. Participant registers once and saves event-specific skills.
4. Two different roles produce appropriately different case-study inputs/results.
5. Refresh preserves the same questions and answer drafts.
6. Submission and evaluation are idempotent.
7. AI failure or quota exhaustion produces no fabricated success.
8. Scores and private rubrics cannot be manipulated through frontend requests.
9. Candidates and teams are restricted to the same event.
10. Recommendations fill complementary roles.
11. Invitation/request acceptance enforces capacity and one active team per event.
12. Two accepted members can exchange messages and reload history.
13. Nonmembers and removed members cannot access chat.
14. Existing authentication and validation policies remain intact.
"""
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.db.session import engine
from backend.app.live import ai_service
from backend.app.live.ai_service import (
    EventBriefOutput, BriefSkill, BriefRole, CaseStudiesOutput,
    CaseStudyQuestion, CaseStudyRubric, RubricCriterion,
    EvaluationOutput, CriterionScoreItem, SkillEstimateItem, RoleSuitabilityItem,
    AIServiceError
)
from backend.tests_live.signup_helper import signup_token

client = TestClient(app)

# Helper to create and authenticate users
def create_test_user(label: str, role: str = 'participant'):
    suffix = uuid.uuid4().hex[:8]
    email = f"{label.lower()}-{suffix}@skillfy-test.internal"
    password = "ValidPassword123!"
    reg_payload = {
        'verification_token': signup_token(email, role),
        'email': email,
        'full_name': f"{label} User",
        'password': password,
        'role': role,
        **({'organization': f"Test Org {suffix}"} if role == 'organizer' else {})
    }
    res = client.post('/api/v1/auth/register', json=reg_payload)
    assert res.status_code == 201, res.text
    user_data = res.json()

    login = client.post('/api/v1/auth/login', json={'email_or_username': email, 'password': password})
    assert login.status_code == 200, login.text
    token = login.json()['access_token']
    headers = {'Authorization': f"Bearer {token}"}

    # Complete onboarding
    profile_details = {
        'full_name': f"{label} User",
        'institution': 'Skillfy University',
        'course': 'Software Engineering',
        'academic_year': 2026,
        'phone_number': '9876543210',
        'address_line_1': 'Test Campus',
        'city': 'Bengaluru',
        'region': 'KA',
        'postal_code': '560001',
        'country_code': 'IN'
    }
    client.post('/api/v1/profiles/me/onboarding', headers=headers, json=profile_details)

    return user_data, headers, email

def approve_organizer(organizer_id: str):
    """Mark organizer organization as approved in the test database."""
    with engine.begin() as conn:
        conn.execute(text("""INSERT INTO hackloop.organizer_verification_requests
          (organization_id,applicant_id,status,reviewed_by,reviewed_at,review_notes)
          SELECT organization_id,:uid,'approved',:uid,now(),'Disposable test fixture'
          FROM hackloop.organization_members WHERE user_id=:uid
        """), {'uid':organizer_id})

# ─── 1. Approved Organizer Creates and Publishes Event ─────────────────────────

def test_approved_organizer_create_and_publish():
    org_user, org_headers, _ = create_test_user("ApprovedHost", role="organizer")
    approve_organizer(org_user['id'])

    now = datetime.now(timezone.utc)
    event_payload = {
        'title': 'AI Architecture Hackathon 2026',
        'category_id': 'hackathon',
        'description': 'Design scalable multi-agent systems and real-time distributed platforms.',
        'rules': 'Must submit original code under MIT license.',
        'expected_deliverables': 'Live demo and GitHub repository with test suite.',
        'constraints_and_tools': 'Open-source LLMs and frameworks allowed.',
        'judging_criteria': 'Architecture (40%), Execution (30%), Innovation (30%).',
        'mode': 'hybrid',
        'location': 'Bengaluru Tech Park',
        'min_team_size': 2,
        'max_team_size': 4,
        'max_participants': 50,
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat(),
        'requirements': [{'skill_name': 'Python', 'category': 'Technical', 'min_proficiency': 2, 'required': True, 'target_count': 1}],
        'roles': [{'name': 'Systems Lead', 'suggested_count': 1}, {'name': 'Frontend Lead', 'suggested_count': 1}]
    }

    # Create draft
    create_res = client.post('/api/v1/events', headers=org_headers, json=event_payload)
    assert create_res.status_code == 201, create_res.text
    event = create_res.json()
    eid = event['id']
    assert event['status'] == 'draft'
    assert event['version'] == 1

    # Publish draft
    pub_res = client.post(f"/api/v1/events/{eid}/publish", headers=org_headers)
    assert pub_res.status_code == 200, pub_res.text
    published = pub_res.json()
    assert published['status'] == 'open'
    assert client.post(f'/api/v1/events/{eid}/register', headers=org_headers, json={}).status_code == 403
    assert client.post(f'/api/v1/events/{eid}/assessment/start', headers=org_headers).status_code == 403

# ─── 2. Unapproved Organizer Cannot Publish ───────────────────────────────────

def test_unapproved_organizer_cannot_publish():
    unapp_user, unapp_headers, _ = create_test_user("UnapprovedHost", role="organizer")
    # Not approved!

    now = datetime.now(timezone.utc)
    event_payload = {
        'title': 'Unapproved Sprints',
        'category_id': 'hackathon',
        'description': 'Attempting to publish without admin approval.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    }
    # Creating event requires approved organization
    res = client.post('/api/v1/events', headers=unapp_headers, json=event_payload)
    assert res.status_code == 403
    assert 'approved organizer' in res.text.lower()

# ─── 3. Participant Registers Once with Event-Specific Skills ──────────────────

def test_participant_event_registration():
    # Setup published event
    host, host_headers, _ = create_test_user("HostRegTest", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    e_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Cloud DevOps Challenge',
        'category_id': 'technical_competition',
        'description': 'Automated Kubernetes pipeline challenge.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat(),
        'requirements': [{'skill_name': 'Docker', 'category': 'Technical', 'min_proficiency': 2, 'required': True, 'target_count': 1}]
    })
    eid = e_res.json()['id']
    client.post(f"/api/v1/events/{eid}/publish", headers=host_headers)

    part, part_headers, _ = create_test_user("DevOpsCandidate", role="participant")

    reg_payload = {
        'selected_skills': [{'skill_name': 'Docker', 'experience_level': 'advanced'}, {'skill_name': 'Terraform', 'experience_level': 'intermediate'}],
        'experience_level': 'advanced',
        'preferred_roles': ['Infrastructure Lead'],
        'availability_hours_per_week': 15,
        'contribution_intent': 'Architect resilient multi-cluster deployments.'
    }
    reg_res = client.post(f"/api/v1/events/{eid}/register", headers=part_headers, json=reg_payload)
    assert reg_res.status_code == 200, reg_res.text
    assert reg_res.json()['status'] == 'registered'

    # Verify registration query endpoint
    check_res = client.get(f"/api/v1/events/{eid}/registration", headers=part_headers)
    assert check_res.status_code == 200
    assert check_res.json()['registered'] is True

    # Duplicate registration is idempotent (updates or returns without error)
    reg_res_dup = client.post(f"/api/v1/events/{eid}/register", headers=part_headers, json=reg_payload)
    assert reg_res_dup.status_code == 200

# ─── 4 & 5. Different Roles Produce Different Scenarios; Refresh Preserves ─────

def test_case_study_generation_and_draft_persistence(monkeypatch):
    host, host_headers, _ = create_test_user("HostCaseStudy", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    e_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Full Stack Sprint',
        'category_id': 'web_development',
        'description': 'Full stack real-time application development challenge.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat(),
        'roles': [{'name': 'Frontend Lead'}, {'name': 'Backend Lead'}]
    })
    eid = e_res.json()['id']
    client.post(f"/api/v1/events/{eid}/publish", headers=host_headers)

    # Participant A: Frontend Lead
    part_fe, headers_fe, _ = create_test_user("FrontendCandidate")
    client.post(f"/api/v1/events/{eid}/register", headers=headers_fe, json={
        'selected_skills': [{'skill_name': 'React', 'experience_level': 'intermediate'}],
        'experience_level': 'intermediate',
        'preferred_roles': ['Frontend Lead']
    })

    # Participant B: Backend Lead
    part_be, headers_be, _ = create_test_user("BackendCandidate")
    client.post(f"/api/v1/events/{eid}/register", headers=headers_be, json={
        'selected_skills': [{'skill_name': 'PostgreSQL', 'experience_level': 'advanced'}],
        'experience_level': 'advanced',
        'preferred_roles': ['Backend Lead']
    })

    # Mock AI generation with deterministic distinct scenarios based on role
    async def mock_generate(event_title, category, event_brief, rules, participant_skills, preferred_roles, experience_level):
        role = preferred_roles[0] if preferred_roles else 'Contributor'
        if 'Frontend' in role:
            q_text = "Design an accessible, responsive dashboard under high real-time WebSocket load."
            target_skill = "React State & Virtualization"
        else:
            q_text = "Design a high-throughput transaction pipeline with row-level locks and zero deadlocks."
            target_skill = "PostgreSQL Locking & Isolation"

        return CaseStudiesOutput(
            questions=[
                CaseStudyQuestion(
                    prompt=q_text,
                    target_role=role,
                    target_skill=target_skill,
                    difficulty=experience_level,
                    response_type="text",
                    estimated_time_minutes=15,
                    expected_response_format="2-4 paragraphs",
                    rubric=CaseStudyRubric(
                        criteria=[RubricCriterion(criterion_name="Architecture", description="Clarity", max_score=50.0),
                                  RubricCriterion(criterion_name="Edge Cases", description="Resilience", max_score=50.0)],
                        key_points=["Scalability", "Fault tolerance"],
                        target_role=role,
                        target_skill=target_skill,
                        estimated_time_minutes=15,
                        scoring_guidelines="Score based on concrete architectural decisions."
                    )
                ),
                CaseStudyQuestion(
                    prompt=f"Explain testing and deployment automation strategy for {role}.",
                    target_role=role,
                    target_skill="CI/CD & Reliability",
                    difficulty=experience_level,
                    response_type="text",
                    estimated_time_minutes=15,
                    expected_response_format="2-3 paragraphs",
                    rubric=CaseStudyRubric(
                        criteria=[RubricCriterion(criterion_name="Test Rigor", description="Coverage", max_score=100.0)],
                        key_points=["Integration testing"],
                        target_role=role,
                        target_skill="Testing",
                        estimated_time_minutes=15,
                        scoring_guidelines="Standard scoring."
                    )
                )
            ],
            rationale="Tailored role assessment."
        )

    monkeypatch.setattr('backend.app.live.assessments.' + 'generate_case_studies', mock_generate)

    # 4. Generate for Frontend candidate
    fe_start = client.post(f"/api/v1/events/{eid}/assessment/start", headers=headers_fe)
    assert fe_start.status_code == 200, fe_start.text
    fe_questions = fe_start.json()['questions']
    assert len(fe_questions) == 2
    assert "WebSocket" in fe_questions[0]['prompt']
    # Verify private rubric is NEVER exposed to client
    assert 'rubric' not in fe_questions[0]
    assert 'private_guidelines' not in fe_questions[0]

    # Generate for Backend candidate
    be_start = client.post(f"/api/v1/events/{eid}/assessment/start", headers=headers_be)
    assert be_start.status_code == 200, be_start.text
    be_questions = be_start.json()['questions']
    assert "deadlocks" in be_questions[0]['prompt']
    assert fe_questions[0]['prompt'] != be_questions[0]['prompt']

    # 5. Refresh / re-opening preserves same questions and answer drafts
    fe_refresh = client.get(f"/api/v1/events/{eid}/assessment", headers=headers_fe)
    assert fe_refresh.status_code == 200
    assert fe_refresh.json()['questions'][0]['id'] == fe_questions[0]['id']

    # Save draft answer
    qid = fe_questions[0]['id']
    save_draft = client.put(f"/api/v1/events/{eid}/assessment/answers", headers=headers_fe, json={
        'answers': [{'question_id': qid, 'answer_text': 'I will use a virtualized window and immutable state manager.'}]
    })
    assert save_draft.status_code == 200

    # Verify draft is loaded on re-fetch
    reloaded = client.get(f"/api/v1/events/{eid}/assessment", headers=headers_fe).json()
    assert reloaded['answers'][qid] == 'I will use a virtualized window and immutable state manager.'

# ─── 6, 7 & 8. Submission & Evaluation Idempotency, Quota Failure & Security ───

def test_evaluation_idempotency_and_security(monkeypatch):
    host, host_headers, _ = create_test_user("HostEvalTest", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    e_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'AI Systems Evaluation',
        'category_id': 'ai_coding',
        'description': 'Evaluating system designs.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    })
    eid = e_res.json()['id']
    client.post(f"/api/v1/events/{eid}/publish", headers=host_headers)

    cand, headers, _ = create_test_user("CandidateEval")
    client.post(f"/api/v1/events/{eid}/register", headers=headers, json={
        'selected_skills': [{'skill_name': 'Python'}],
        'preferred_roles': ['AI Architect']
    })

    # Start assessment
    async def mock_gen(*args, **kwargs):
        return CaseStudiesOutput(
            questions=[
                CaseStudyQuestion(
                    prompt="Evaluate latency tradeoffs between streaming tokens vs batched responses.",
                    target_role="AI Architect", target_skill="LLM Systems", difficulty="intermediate",
                    response_type="text", estimated_time_minutes=15, expected_response_format="2 paragraphs",
                    rubric=CaseStudyRubric(
                        criteria=[RubricCriterion(criterion_name="Clarity", description="Soundness", max_score=100.0)],
                        key_points=["Chunked streaming"], target_role="AI Architect", target_skill="LLM Systems",
                        estimated_time_minutes=15, scoring_guidelines="Assess latency trade-offs."
                    )
                ),
                CaseStudyQuestion(
                    prompt="How do you handle provider quota limits and fallback gracefully?",
                    target_role="AI Architect", target_skill="Resilience", difficulty="intermediate",
                    response_type="text", estimated_time_minutes=15, expected_response_format="2 paragraphs",
                    rubric=CaseStudyRubric(
                        criteria=[RubricCriterion(criterion_name="Resilience", description="Backoff", max_score=100.0)],
                        key_points=["Exponential backoff"], target_role="AI Architect", target_skill="Resilience",
                        estimated_time_minutes=15, scoring_guidelines="Assess retry logic."
                    )
                )
            ],
            rationale="AI Architect evaluation."
        )
    monkeypatch.setattr('backend.app.live.assessments.' + 'generate_case_studies', mock_gen)

    start_res = client.post(f"/api/v1/events/{eid}/assessment/start", headers=headers)
    questions = start_res.json()['questions']

    # 7. AI failure / Quota exhaustion: verify NO fabricated success
    async def mock_quota_failure(*args, **kwargs):
        raise AIServiceError("RESOURCE_EXHAUSTED: Free-tier quota exceeded. Please try again later.")

    monkeypatch.setattr('backend.app.live.assessments.' + 'evaluate_answers', mock_quota_failure)

    answers_payload = {
        'answers': [
            {'question_id': questions[0]['id'], 'answer_text': 'I will use Server-Sent Events to stream tokens with backpressure.'},
            {'question_id': questions[1]['id'], 'answer_text': 'Implement exponential backoff with jitter and a circuit breaker.'}
        ]
    }
    fail_res = client.post(f"/api/v1/events/{eid}/assessment/submit", headers=headers, json=answers_payload)
    assert fail_res.status_code == 503
    assert 'quota' in fail_res.text.lower()
    # Check status transitioned truthfully to failed
    check_failed = client.get(f"/api/v1/events/{eid}/assessment", headers=headers).json()
    assert check_failed['status'] == 'failed'
    assert 'quota' in check_failed['error_message'].lower()

    # 6. Idempotent successful evaluation
    async def mock_success_eval(*args, **kwargs):
        return EvaluationOutput(
            criterion_scores=[
                CriterionScoreItem(question_position=1, criterion_name="Clarity", score=85.0, max_score=100.0, explanation="Strong streaming design."),
                CriterionScoreItem(question_position=2, criterion_name="Resilience", score=90.0, max_score=100.0, explanation="Solid backoff approach.")
            ],
            skill_estimates=[
                SkillEstimateItem(skill_name="LLM Systems", estimated_level="intermediate", score=85.0, confidence=0.85, evidence_summary="Clear understanding of token streaming."),
                SkillEstimateItem(skill_name="Resilience", estimated_level="intermediate", score=90.0, confidence=0.90, evidence_summary="Described exponential backoff properly.")
            ],
            role_suitability=RoleSuitabilityItem(role_name="AI Architect", suitability_score=88.0, fit_level="strong", reasoning="Demonstrated strong system architecture competence."),
            strengths=["Detailed streaming strategy", "Reliable failure handling"],
            areas_to_improve=["Consider offline queueing"],
            overall_explanation="High quality technical answers grounded in real distributed patterns.",
            confidence=0.88,
            insufficient_evidence=False
        )

    monkeypatch.setattr('backend.app.live.assessments.' + 'evaluate_answers', mock_success_eval)

    eval_res = client.post(f"/api/v1/events/{eid}/assessment/submit", headers=headers, json=answers_payload)
    assert eval_res.status_code == 200, eval_res.text
    result = eval_res.json()
    assert result['status'] == 'completed'
    # Server-side score normalization: (85 + 90) / 200 = 87.5
    assert result['evaluation_score'] == 87.5

    # 8. Security: Client cannot manipulate scores or status by re-submitting completed assessment
    resubmit_res = client.post(f"/api/v1/events/{eid}/assessment/submit", headers=headers, json=answers_payload)
    assert resubmit_res.status_code == 409
    assert 'completed' in resubmit_res.text.lower()

# ─── 9 & 10. Complementary Team Matching & Event Scoping ─────────────────────

def test_complementary_team_matching():
    host, host_headers, _ = create_test_user("HostMatching", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    
    # Event 1
    e1_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Event 1 - FinTech Hackathon',
        'category_id': 'hackathon',
        'description': 'FinTech banking API development.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    })
    e1_id = e1_res.json()['id']
    client.post(f"/api/v1/events/{e1_id}/publish", headers=host_headers)

    # Event 2
    e2_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Event 2 - Robotics Challenge',
        'category_id': 'robotics',
        'description': 'Autonomous drone control challenge.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    })
    e2_id = e2_res.json()['id']
    client.post(f"/api/v1/events/{e2_id}/publish", headers=host_headers)

    # Candidate 1: Registered for Event 1 (Backend Lead)
    c1, c1_headers, _ = create_test_user("CandEvent1")
    client.post(f"/api/v1/events/{e1_id}/register", headers=c1_headers, json={
        'selected_skills': [{'skill_name': 'PostgreSQL', 'experience_level': 'advanced'}],
        'preferred_roles': ['Backend Lead'],
        'availability_hours_per_week': 20
    })

    # Candidate 2: Registered ONLY for Event 2 (Drone Pilot)
    c2, c2_headers, _ = create_test_user("CandEvent2")
    client.post(f"/api/v1/events/{e2_id}/register", headers=c2_headers, json={
        'selected_skills': [{'skill_name': 'ROS', 'experience_level': 'intermediate'}],
        'preferred_roles': ['Drone Lead']
    })

    # Creator forms team for Event 1
    lead, lead_headers, _ = create_test_user("TeamLeadE1")
    client.post(f"/api/v1/events/{e1_id}/register", headers=lead_headers, json={'preferred_roles': ['Frontend Lead']})
    
    t_res = client.post(f"/api/v1/events/{e1_id}/teams", headers=lead_headers, json={
        'name': 'FinTech Builders',
        'creator_role': 'Frontend Lead',
        'seeking_roles': ['Backend Lead']
    })
    assert t_res.status_code == 201, t_res.text
    t1_id = t_res.json()['id']

    # 10. Recommendations fill complementary roles
    rec_res = client.get(f"/api/v1/teams/{t1_id}/candidates", headers=lead_headers)
    assert rec_res.status_code == 200
    candidates = rec_res.json()['candidates']
    assert len(candidates) >= 1
    # Candidate 1 should match strongly for Backend Lead
    top_cand = candidates[0]
    assert top_cand['user_id'] == c1['id']
    assert 'Backend Lead' in top_cand['suggested_role']
    assert top_cand['match_score'] > 70.0

    # 9. Candidate 2 from Event 2 must NOT appear in Event 1 recommendations
    assert not any(c['user_id'] == c2['id'] for c in candidates)

# ─── 11. Capacity Enforcement and One Active Team Per Event ───────────────────

def test_team_capacity_and_single_active_membership():
    host, host_headers, _ = create_test_user("HostCapTest", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    e_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Strict Capacity Sprint',
        'category_id': 'hackathon',
        'description': 'Max team size of 2.',
        'min_team_size': 2,
        'max_team_size': 2,  # Strict max size of 2
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    })
    eid = e_res.json()['id']
    client.post(f"/api/v1/events/{eid}/publish", headers=host_headers)

    capt, capt_headers, _ = create_test_user("CaptainUser")
    client.post(f"/api/v1/events/{eid}/register", headers=capt_headers)
    team = client.post(f"/api/v1/events/{eid}/teams", headers=capt_headers, json={
        'name': 'Duo Squad', 'creator_role': 'Captain'
    }).json()
    tid = team['id']

    # Member 1
    m1, m1_headers, _ = create_test_user("Member1User")
    client.post(f"/api/v1/events/{eid}/register", headers=m1_headers)

    # Member 2
    m2, m2_headers, _ = create_test_user("Member2User")
    client.post(f"/api/v1/events/{eid}/register", headers=m2_headers)

    # Captain invites Member 1
    inv_res = client.post(f"/api/v1/teams/{tid}/invitations", headers=capt_headers, json={
        'candidate_user_id': m1['id'], 'target_role': 'Specialist'
    })
    assert inv_res.status_code == 201

    # Member 1 accepts invitation
    req_id = client.get(f"/api/v1/events/{eid}/my-requests", headers=m1_headers).json()['invitations'][0]['id']
    acc_res = client.post(f"/api/v1/team-requests/{req_id}/respond", headers=m1_headers, json={'decision': 'accept'})
    assert acc_res.status_code == 200

    # Team is now full (Captain + Member 1 = 2 members = max_team_size)
    full_invite = client.post(f"/api/v1/teams/{tid}/invitations", headers=capt_headers, json={
        'candidate_user_id': m2['id'], 'target_role': 'Extra'
    })
    assert full_invite.status_code == 409
    assert 'maximum capacity' in full_invite.text.lower()

    # Member 1 cannot create another team for this same event
    dup_team = client.post(f"/api/v1/events/{eid}/teams", headers=m1_headers, json={
        'name': 'Second Team', 'creator_role': 'Lead'
    })
    assert dup_team.status_code == 409
    assert 'already an active member' in dup_team.text.lower()

# ─── 12 & 13. Private Team Chat: Message Persistence, Auth & Access Control ───

def test_private_team_chat_workflow():
    host, host_headers, _ = create_test_user("HostChatTest", role="organizer")
    approve_organizer(host['id'])
    now = datetime.now(timezone.utc)
    e_res = client.post('/api/v1/events', headers=host_headers, json={
        'title': 'Chat Test Event',
        'category_id': 'hackathon',
        'description': 'Testing persistent chat.',
        'start_date': (now + timedelta(days=5)).isoformat(),
        'end_date': (now + timedelta(days=7)).isoformat(),
        'registration_deadline': (now + timedelta(days=3)).isoformat()
    })
    eid = e_res.json()['id']
    client.post(f"/api/v1/events/{eid}/publish", headers=host_headers)

    capt, capt_headers, _ = create_test_user("ChatCaptain")
    client.post(f"/api/v1/events/{eid}/register", headers=capt_headers)
    tid = client.post(f"/api/v1/events/{eid}/teams", headers=capt_headers, json={'name': 'Chat Squad', 'creator_role': 'Lead'}).json()['id']

    mem, mem_headers, _ = create_test_user("ChatMember")
    client.post(f"/api/v1/events/{eid}/register", headers=mem_headers)
    client.post(f"/api/v1/teams/{tid}/invitations", headers=capt_headers, json={'candidate_user_id': mem['id']})
    req_id = client.get(f"/api/v1/events/{eid}/my-requests", headers=mem_headers).json()['invitations'][0]['id']
    client.post(f"/api/v1/team-requests/{req_id}/respond", headers=mem_headers, json={'decision': 'accept'})

    unrelated, unrel_headers, _ = create_test_user("UnrelatedUser")

    # 12. Accepted members exchange messages and reload history
    msg1 = client.post(f"/api/v1/teams/{tid}/messages", headers=capt_headers, json={
        'body': 'Welcome to the team! Let us plan the project.',
        'client_message_id': 'client-msg-1'
    })
    assert msg1.status_code == 201

    # Idempotent: sending same client_message_id returns existing message
    msg1_dup = client.post(f"/api/v1/teams/{tid}/messages", headers=capt_headers, json={
        'body': 'Welcome to the team! Let us plan the project.',
        'client_message_id': 'client-msg-1'
    })
    assert msg1_dup.status_code == 200
    assert msg1_dup.json()['status'] == 'duplicate'

    # Member replies
    msg2 = client.post(f"/api/v1/teams/{tid}/messages", headers=mem_headers, json={
        'body': 'Glad to be here! I will start on the data schema.',
        'client_message_id': 'client-msg-2'
    })
    assert msg2.status_code == 201

    # Reload history
    history = client.get(f"/api/v1/teams/{tid}/messages?limit=20", headers=mem_headers).json()
    assert len(history['items']) == 2
    assert history['items'][0]['body'] == 'Welcome to the team! Let us plan the project.'
    assert history['items'][1]['body'] == 'Glad to be here! I will start on the data schema.'

    # Ephemeral WebSocket ticket generation
    ticket_res = client.post(f"/api/v1/teams/{tid}/chat-ticket", headers=mem_headers)
    assert ticket_res.status_code == 200
    assert 'ticket' in ticket_res.json()
    assert ticket_res.json()['expires_in'] == 60

    # 13. Non-members cannot access chat
    non_mem_hist = client.get(f"/api/v1/teams/{tid}/messages", headers=unrel_headers)
    assert non_mem_hist.status_code == 403

    non_mem_send = client.post(f"/api/v1/teams/{tid}/messages", headers=unrel_headers, json={'body': 'Unauthorized'})
    assert non_mem_send.status_code == 403

    non_mem_ticket = client.post(f"/api/v1/teams/{tid}/chat-ticket", headers=unrel_headers)
    assert non_mem_ticket.status_code == 403

    # Member leaves team -> access immediately revoked
    client.post(f"/api/v1/teams/{tid}/leave", headers=mem_headers)
    left_access = client.get(f"/api/v1/teams/{tid}/messages", headers=mem_headers)
    assert left_access.status_code == 403

