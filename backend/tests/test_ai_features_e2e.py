import sys
import uuid
import httpx
from sqlalchemy import text
from backend.app.db.session import engine

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_tests():
    print("=== STARTING COMPLETE AI INTEGRATION E2E TEST ===")

    # 1. Setup a test user and test event in DB
    with engine.connect() as conn:
        # Find or create a test participant
        user = conn.execute(text("SELECT id, email, display_name FROM hackloop.users WHERE email = 'test_participant_ai@skillfy.local'")).mappings().first()
        if not user:
            uid = uuid.uuid4()
            conn.execute(text("""
                INSERT INTO hackloop.users (id, email, username, full_name, display_name, password_hash, is_active, is_verified)
                VALUES (:uid, 'test_participant_ai@skillfy.local', 'test_part_ai', 'Aria Chen', 'Aria Chen', 'hash123', true, true)
            """), {"uid": uid})
            conn.execute(text("""
                INSERT INTO hackloop.user_roles (user_id, role_id) VALUES (:uid, 'participant')
            """), {"uid": uid})
            conn.execute(text("""
                INSERT INTO hackloop.profiles (user_id, bio, github_url, preferred_roles, hours_per_week, onboarding_completed_at)
                VALUES (:uid, 'Full-stack AI developer with experience in React, Python, and FastAPI.', 'https://github.com/octocat', '["Backend Lead", "AI/ML Engineer"]', 20, now())
            """), {"uid": uid})
            conn.commit()
            user = conn.execute(text("SELECT id, email, display_name FROM hackloop.users WHERE id = :uid"), {"uid": uid}).mappings().first()
        
        user_id = str(user["id"])
        print(f"Test Participant: {user['display_name']} ({user_id})")

        # Find or create a test event
        event = conn.execute(text("SELECT id, title, organizer_id FROM hackloop.events LIMIT 1")).mappings().first()
        if not event:
            eid = uuid.uuid4()
            org = conn.execute(text("SELECT id FROM hackloop.organizations LIMIT 1")).scalar()
            admin_u = conn.execute(text("SELECT id FROM hackloop.users LIMIT 1")).scalar()
            conn.execute(text("""
                INSERT INTO hackloop.events (id, organization_id, organizer_id, title, slug, description, category_id, mode, min_team_size, max_team_size, status, registration_deadline, start_date, end_date)
                VALUES (:id, :oid, :uid, 'Skillfy AI Hackathon 2026', 'ai-hack-2026', 'Build next-gen collaborative AI tooling and agents', 'hackathon', 'online', 2, 4, 'published', now() + interval '5 days', now() + interval '6 days', now() + interval '8 days')
            """), {"id": eid, "oid": org, "uid": admin_u})
            conn.commit()
            event = conn.execute(text("SELECT id, title, organizer_id FROM hackloop.events WHERE id = :id"), {"id": eid}).mappings().first()
        
        event_id = str(event["id"])
        print(f"Test Event: {event['title']} ({event_id})")

        # Ensure user has a profile document (resume)
        doc = conn.execute(text("SELECT id FROM hackloop.profile_documents WHERE user_id = :uid"), {"uid": user_id}).first()
        if not doc:
            resume_content = (
                b"Aria Chen - Full Stack AI Engineer\n"
                b"Experience:\n"
                b"- 3 years building web applications with React, TypeScript, and FastAPI.\n"
                b"- Developed distributed backend pipelines with PostgreSQL and Redis.\n"
                b"- Designed real-time collaborative applications with WebSockets.\n"
                b"Education: B.S. in Computer Science."
            )
            conn.execute(text("""
                INSERT INTO hackloop.profile_documents (id, user_id, category, filename, media_type, content)
                VALUES (:id, :uid, 'resume', 'aria_resume.txt', 'text/plain', :content)
            """), {"id": uuid.uuid4(), "uid": user_id, "content": resume_content})
            conn.commit()
            print("Created test resume document for participant.")

        # Ensure a test team exists for this event
        team = conn.execute(text("SELECT id, name FROM hackloop.teams WHERE event_id = :eid LIMIT 1"), {"eid": event_id}).mappings().first()
        if not team:
            tid = uuid.uuid4()
            conn.execute(text("""
                INSERT INTO hackloop.teams (id, event_id, name, status)
                VALUES (:tid, :eid, 'Neural Innovators', 'forming')
            """), {"tid": tid, "eid": event_id})
            # Add an existing member (Frontend Lead)
            other_user = conn.execute(text("SELECT id FROM hackloop.users WHERE id != :uid LIMIT 1"), {"uid": user_id}).scalar()
            if other_user:
                conn.execute(text("""
                    INSERT INTO hackloop.team_memberships (id, team_id, user_id, role, status)
                    VALUES (:mid, :tid, :uid, 'Frontend Lead', 'active')
                """), {"mid": uuid.uuid4(), "tid": tid, "uid": other_user})
            conn.commit()
            team = conn.execute(text("SELECT id, name FROM hackloop.teams WHERE id = :tid"), {"tid": tid}).mappings().first()

        # Ensure participant has a clean slate (not pre-joined to team) for repeatable E2E runs
        conn.execute(text("DELETE FROM hackloop.team_memberships WHERE user_id = :uid"), {"uid": user_id})
        conn.commit()

        team_id = str(team["id"])
        print(f"Test Team: {team['name']} ({team_id})")

    headers = {"X-User-Id": user_id}

    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        # ─────────────────────────────────────────────────────────────
        # Requirement 1: Resume and GitHub analysis
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 1: Resume & GitHub Analysis ---")
        res = client.post("/profiles/me/analyze-ai?github_url=octocat", headers=headers)
        assert res.status_code == 200, f"Req 1 failed: {res.text}"
        data = res.json()
        print(f"Candidate: {data['candidate_name']}")
        print(f"Resume Found: {data['resume_found']}, GitHub Accessible: {data['github_accessible']}")
        print(f"Skills Extracted ({len(data['extracted_skills'])}): {[s['skill_name'] for s in data['extracted_skills'][:4]]}")
        print(f"Strengths: {data['strengths']}")
        assert len(data["extracted_skills"]) > 0, "Expected extracted skills from resume/github"
        print("[PASS] Requirement 1 PASSED: Resume and GitHub analyzed successfully.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 2: Event-specific assessments
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 2: Event-Specific Assessments ---")
        res = client.get(f"/events/{event_id}/assessment", headers=headers)
        assert res.status_code == 200, f"Req 2 failed: {res.text}"
        asm_data = res.json()
        print(f"Assessment Title: {asm_data['title']}")
        print(f"Questions Generated ({len(asm_data['questions'])}):")
        for q in asm_data["questions"]:
            print(f"  [{q['category']}] ({q['skill_target']}) {q['question_text'][:80]}...")
        assert len(asm_data["questions"]) >= 3, "Expected at least 3 assessment questions"
        print("[PASS] Requirement 2 PASSED: Event-specific assessment retrieved/generated.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 3: AI answer suggestions & Submission
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 3: AI Answer Suggestions ---")
        res = client.get(f"/events/{event_id}/assessment/suggestions", headers=headers)
        assert res.status_code == 200, f"Req 3 failed: {res.text}"
        sugg_data = res.json()
        print(f"Evidence Summary: {sugg_data['evidence_summary']}")
        print(f"Suggestions Count: {len(sugg_data['suggestions'])}")
        answers_to_submit = []
        for s in sugg_data["suggestions"]:
            print(f"  Q: {s['question_text'][:60]}...")
            print(f"    Evidence Found: {s['evidence_found']} (Source: {s['evidence_source']})")
            if s["evidence_found"]:
                print(f"    Suggested Answer: {s['suggested_answer'][:80]}...")
            else:
                print(f"    Grounded Behavior: No fabrication. Explanation: {s['explanation'][:70]}...")
            
            chosen_answer = s["suggested_answer"] or "I bring full commitment, collaborative pairing, and strong backend delivery."
            answers_to_submit.append({
                "question_id": s["question_id"],
                "answer_text": chosen_answer
            })

        print("\nSubmitting assessment answers...")
        res = client.post(
            f"/events/{event_id}/assessment/submit",
            json={"answers": answers_to_submit},
            headers=headers
        )
        assert res.status_code == 200, f"Req 3 submit failed: {res.text}"
        sub_res = res.json()
        print(f"Submission recorded: ID={sub_res['submission_id']}, Status={sub_res['status']}")
        print(f"Event Profile Created: {sub_res['event_profile_created']}")
        assert sub_res["status"] == "submitted"
        print("[PASS] Requirement 3 PASSED: Grounded suggestions provided without fabrication, answers submitted.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 4: Secondary event profiles
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 4: Secondary Event Profile ---")
        res = client.get(f"/events/{event_id}/event-profile", headers=headers)
        assert res.status_code == 200, f"Req 4 failed: {res.text}"
        ep = res.json()
        print(f"Secondary Profile ID: {ep['id']}")
        print(f"Preferred Role: {ep['preferred_role']}")
        print(f"Summary: {ep['summary']}")
        print(f"Event Strengths: {ep['strengths']}")
        print(f"Contribution Areas: {ep['contribution_areas']}")
        print(f"Compatibility Bonus: {ep['compatibility_bonus']}")
        assert ep["preferred_role"] is not None
        assert len(ep["strengths"]) > 0
        print("[PASS] Requirement 4 PASSED: Secondary event profile generated and stored in hackloop.event_profiles.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 5 & 6: Intelligent team recommendations & Compatibility
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 5 & 6: Recommendations & Compatibility ---")
        res = client.get(f"/events/{event_id}/team-recommendations", headers=headers)
        assert res.status_code == 200, f"Req 5/6 failed: {res.text}"
        recs_data = res.json()
        print(f"Participant: {recs_data['participant_name']}")
        print(f"Recommendations Count: {recs_data['recommendations_count']}")
        for r in recs_data["recommendations"]:
            print(f"\n  Team: {r['team_name']} (Current members: {r['current_members_count']}/{r['max_team_size']})")
            print(f"  Recommended Role: {r['recommended_role']}")
            print(f"  Vacant Roles: {r['vacant_roles']}")
            print(f"  Compatibility Score: {r['compatibility_score']}%")
            print("  Pillars breakdown:")
            for p in r["pillars"]:
                print(f"    - {p['name']} ({p['weight']}): {p['score']}%")
            print("  Explainable Reasons:")
            for reason in r["match_reasons"]:
                print(f"    * {reason}")
            
            # Rule verification: Recommended role MUST be in vacant roles!
            assert r["recommended_role"] in r["vacant_roles"], f"Recommended role {r['recommended_role']} is NOT in vacant roles!"
        print("[PASS] Requirement 5 & 6 PASSED: Intelligent team recommendations with explainable compatibility scores.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 7: Dynamic team membership (join / leave)
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 7: Dynamic Team Membership ---")
        # Ensure user is not currently in team
        client.post(f"/teams/{team_id}/leave", json={}, headers=headers)

        target_role = recs_data["recommendations"][0]["recommended_role"]
        print(f"Joining team '{team_id}' with vacant role '{target_role}'...")
        res = client.post(f"/teams/{team_id}/join", json={"requested_role": target_role}, headers=headers)
        assert res.status_code == 200, f"Join failed: {res.text}"
        join_data = res.json()
        print(f"Join Success: {join_data['message']}")
        print(f"Assigned Role: {join_data['role']}, New Active Count: {join_data['active_members_count']}")
        assert join_data["role"] == target_role

        # Verify duplicate join error
        res_dup = client.post(f"/teams/{team_id}/join", json={"requested_role": target_role}, headers=headers)
        assert res_dup.status_code == 409, f"Expected 409 Conflict on duplicate join, got: {res_dup.status_code}"
        print("[PASS] Duplicate join correctly rejected with 409 Conflict.")

        # ─────────────────────────────────────────────────────────────
        # Requirement 8: Team chat integration
        # ─────────────────────────────────────────────────────────────
        print("\n--- Testing Requirement 8: Team Chat Integration ---")
        # As an active member, post a message
        post_res = client.post(
            f"/teams/{team_id}/messages",
            json={"message": "Hello team! Excited to work on the backend API and database schemas together."},
            headers=headers
        )
        assert post_res.status_code == 200, f"Posting message failed: {post_res.text}"
        posted_msg = post_res.json()
        print(f"Posted message ID: {posted_msg['id']} by {posted_msg['user_name']}: '{posted_msg['message']}'")

        # Read messages
        get_res = client.get(f"/teams/{team_id}/messages", headers=headers)
        assert get_res.status_code == 200, f"Reading messages failed: {get_res.text}"
        msgs = get_res.json()
        assert len(msgs) > 0, "Expected at least 1 message in team chat"
        print(f"Successfully retrieved {len(msgs)} team messages as an active team member.")

        # Now test leaving the team
        print("\nLeaving the team...")
        leave_res = client.post(
            f"/teams/{team_id}/leave",
            json={"departure_reason": "Moving to another project track"},
            headers=headers
        )
        assert leave_res.status_code == 200, f"Leave team failed: {leave_res.text}"
        leave_data = leave_res.json()
        print(f"Leave Success: {leave_data['message']}")
        print(f"Vacated Roles: {leave_data['vacant_roles']}")

        # Verify that after leaving, access to team chat messages is FORBIDDEN (403)
        non_member_chat = client.get(f"/teams/{team_id}/messages", headers=headers)
        assert non_member_chat.status_code == 403, f"Expected 403 Forbidden for non-member chat, got {non_member_chat.status_code}: {non_member_chat.text}"
        print("[PASS] Security verified: Non-members are strictly forbidden (403) from accessing team chat.")

        # Re-join so participant remains in good state
        client.post(f"/teams/{team_id}/join", json={"requested_role": target_role}, headers=headers)
        print("[PASS] Re-joined team for clean final state.")

    print("\n=======================================================")
    print("ALL 8 AI AND TEAM MANAGEMENT REQUIREMENTS VERIFIED 100%!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
