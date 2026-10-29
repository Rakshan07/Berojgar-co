import re
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.services.matching_service import check_skill_match, PROFICIENCY_LABELS

CANONICAL_ROLES = [
    "Frontend Lead",
    "Backend Lead",
    "UI/UX Designer",
    "AI/ML Engineer",
    "Team Coordinator",
    "Full-stack Contributor"
]

class IntelligentMatchingService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidate_profile(self, user_id: uuid.UUID, event_id: uuid.UUID) -> Dict[str, Any]:
        """Gathers full participant context including primary profile, skills, GitHub, and assessment answers."""
        user_row = self.db.execute(
            text("SELECT id, display_name, email FROM hackloop.users WHERE id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        profile_row = self.db.execute(
            text("SELECT bio, github_url, preferred_roles, interests, hours_per_week FROM hackloop.profiles WHERE user_id = :uid"),
            {"uid": user_id}
        ).mappings().first()

        skills_rows = self.db.execute(
            text("""
                SELECT s.name AS skill_name, s.category_id AS category, us.proficiency 
                FROM hackloop.user_skills us 
                JOIN hackloop.skills s ON s.id = us.skill_id 
                WHERE us.user_id = :uid
            """),
            {"uid": user_id}
        ).mappings().all()

        event_profile_row = self.db.execute(
            text("""
                SELECT preferred_role, event_skills, strengths, contribution_areas, assessment_highlights, compatibility_bonus
                FROM hackloop.event_profiles
                WHERE user_id = :uid AND event_id = :eid
            """),
            {"uid": user_id, "eid": event_id}
        ).mappings().first()

        assessment_answers = self.db.execute(
            text("""
                SELECT q.question_text, q.skill_target, a.answer_text
                FROM hackloop.assessments asm
                JOIN hackloop.assessment_submissions s ON s.assessment_id = asm.id
                JOIN hackloop.assessment_answers a ON a.submission_id = s.id
                JOIN hackloop.assessment_questions q ON q.id = a.question_id
                WHERE asm.event_id = :eid AND s.user_id = :uid
            """),
            {"eid": event_id, "uid": user_id}
        ).mappings().all()

        pref_role = None
        if event_profile_row and event_profile_row.get("preferred_role"):
            pref_role = event_profile_row["preferred_role"]
        elif profile_row and profile_row.get("preferred_roles"):
            roles = profile_row["preferred_roles"]
            if isinstance(roles, list) and roles:
                pref_role = roles[0]

        return {
            "user_id": user_id,
            "name": user_row["display_name"] if user_row else "Participant",
            "preferred_role": pref_role,
            "skills": [dict(s) for s in skills_rows],
            "github_url": profile_row["github_url"] if profile_row else None,
            "hours_per_week": profile_row["hours_per_week"] if profile_row else 15,
            "assessment_answers": [dict(a) for a in assessment_answers],
            "compatibility_bonus": float(event_profile_row["compatibility_bonus"]) if event_profile_row else 5.0
        }

    def recommend_teams_for_participant(
        self,
        event_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Calculates consistent, explainable compatibility scores and recommends teams with vacant roles."""
        # 1. Fetch event details and requirements
        event_row = self.db.execute(
            text("""
                SELECT id, title, description, category_id AS category, min_team_size, max_team_size 
                FROM hackloop.events 
                WHERE id = :eid
            """),
            {"eid": event_id}
        ).mappings().first()

        if not event_row:
            raise ValueError(f"Event {event_id} not found")

        max_size = event_row["max_team_size"] or 5
        min_size = event_row["min_team_size"] or 3

        # Fetch required event skills from hackloop.event_requirements
        event_skills_rows = self.db.execute(
            text("""
                SELECT DISTINCT skill_name, category, required, min_proficiency, priority
                FROM hackloop.event_requirements
                WHERE event_id = :eid
            """),
            {"eid": event_id}
        ).mappings().all()
        required_skills = [s["skill_name"] for s in event_skills_rows if s.get("skill_name")]

        # Fetch event roles from hackloop.event_roles
        event_roles_rows = self.db.execute(
            text("SELECT name, suggested_count FROM hackloop.event_roles WHERE event_id = :eid"),
            {"eid": event_id}
        ).mappings().all()
        configured_roles = [r["name"] for r in event_roles_rows if r.get("name")]
        available_roles_catalog = configured_roles if configured_roles else CANONICAL_ROLES

        # 2. Fetch candidate context
        candidate = self.get_candidate_profile(user_id, event_id)
        cand_skills = candidate["skills"]
        cand_pref_role = candidate["preferred_role"]

        # 3. Fetch all teams for this event
        teams_rows = self.db.execute(
            text("SELECT id, name, status, created_at, published_at FROM hackloop.teams WHERE event_id = :eid ORDER BY created_at ASC"),
            {"eid": event_id}
        ).mappings().all()

        recommendations = []

        for t in teams_rows:
            team_id = t["id"]

            # Fetch active memberships
            members_rows = self.db.execute(
                text("""
                    SELECT m.id, m.user_id, m.role, m.status, u.display_name, m.joined_at
                    FROM hackloop.team_memberships m
                    JOIN hackloop.users u ON u.id = m.user_id
                    WHERE m.team_id = :tid AND m.status = 'active'
                """),
                {"tid": team_id}
            ).mappings().all()

            # Rule A: Never recommend a team the user is already part of
            if any(str(m["user_id"]) == str(user_id) for m in members_rows):
                continue

            # Rule B: Never recommend a full team
            active_count = len(members_rows)
            if active_count >= max_size:
                continue

            # Rule C: Determine filled vs vacant roles
            occupied_roles = [m["role"].strip().lower() for m in members_rows if m["role"]]
            
            vacant_roles = []
            for r in available_roles_catalog:
                if r.strip().lower() not in occupied_roles:
                    vacant_roles.append(r)

            if not vacant_roles:
                # If all named roles filled but space remains, add general contributor role
                if active_count < max_size:
                    vacant_roles.append("Full-stack Contributor")
                else:
                    continue

            # Gather existing member skills to identify team coverage & gaps
            team_member_skills: List[Dict[str, Any]] = []
            team_covered_skills = set()
            for m in members_rows:
                m_skills = self.db.execute(
                    text("""
                        SELECT s.name AS skill_name, us.proficiency 
                        FROM hackloop.user_skills us 
                        JOIN hackloop.skills s ON s.id = us.skill_id 
                        WHERE us.user_id = :uid
                    """),
                    {"uid": m["user_id"]}
                ).mappings().all()
                for ms in m_skills:
                    team_covered_skills.add(ms["skill_name"].lower())
                team_member_skills.append({
                    "user_id": str(m["user_id"]),
                    "name": m["display_name"],
                    "role": m["role"],
                    "skills": [dict(s) for s in m_skills]
                })

            # Identify team capability gaps against event requirements
            uncovered_event_skills = [
                s for s in required_skills
                if not any(check_skill_match(cs, s) for cs in team_covered_skills)
            ]

            # 4. Evaluate compatibility for each vacant role
            best_role = vacant_roles[0]
            best_score = 0.0
            best_pillars: List[Dict[str, Any]] = []
            best_reasons: List[str] = []
            best_coverage_notes: List[str] = []
            best_covered_skills: List[str] = []

            for role_candidate in vacant_roles:
                # Pillar 1: Skill Gap Coverage (40%)
                # Does candidate cover skills currently missing from the team?
                covered_by_candidate = []
                for s in uncovered_event_skills:
                    match = next((cs for cs in cand_skills if check_skill_match(cs["skill_name"], s)), None)
                    if match:
                        covered_by_candidate.append(f"{match['skill_name']} ({PROFICIENCY_LABELS.get(match.get('proficiency', 2), 'Developing')})")

                gap_coverage_ratio = len(covered_by_candidate) / max(len(uncovered_event_skills), 1) if uncovered_event_skills else 0.85
                pillar_1 = min(100.0, max(40.0, gap_coverage_ratio * 100.0 + (10.0 if covered_by_candidate else 0.0)))

                # Pillar 2: Role Fit (25%)
                # Does candidate's preferred role / skill strengths match this vacant role?
                pillar_2 = 60.0
                role_lower = role_candidate.lower()
                if cand_pref_role and cand_pref_role.lower() in role_lower or role_lower in (cand_pref_role or "").lower():
                    pillar_2 = 95.0
                elif any(term in role_lower for term in ["backend", "python"]) and any("python" in s["skill_name"].lower() or "backend" in s["skill_name"].lower() for s in cand_skills):
                    pillar_2 = 90.0
                elif any(term in role_lower for term in ["frontend", "react", "ui"]) and any("react" in s["skill_name"].lower() or "design" in s["skill_name"].lower() for s in cand_skills):
                    pillar_2 = 90.0
                elif any(term in role_lower for term in ["design", "ux", "figma"]) and any("figma" in s["skill_name"].lower() or "ux" in s["skill_name"].lower() for s in cand_skills):
                    pillar_2 = 95.0
                elif any(term in role_lower for term in ["ai", "ml", "data"]) and any("ml" in s["skill_name"].lower() or "data" in s["skill_name"].lower() for s in cand_skills):
                    pillar_2 = 90.0

                # Pillar 3: Complementary Fit & Experience (15%)
                # Diversity of abilities vs existing members + verified GitHub/resume bonus
                diversity_bonus = 80.0
                if any(m["role"].lower() != role_lower for m in members_rows):
                    diversity_bonus += 10.0
                if candidate.get("github_url"):
                    diversity_bonus += 5.0
                pillar_3 = min(100.0, diversity_bonus)

                # Pillar 4: Teamwork & Pacing Alignment (15%)
                # Assessment teamwork preferences and hours committed
                hours = candidate.get("hours_per_week", 15)
                pillar_4 = 85.0 if hours >= 10 else 70.0

                # Total Weighted Compatibility Score (0 to 100)
                total_score = round(
                    (pillar_1 * 0.40) +
                    (pillar_2 * 0.25) +
                    (pillar_3 * 0.15) +
                    (pillar_4 * 0.15) +
                    min(5.0, candidate.get("compatibility_bonus", 5.0) * 0.5),
                    1
                )

                if total_score > best_score:
                    best_score = total_score
                    best_role = role_candidate
                    best_pillars = [
                        {"name": "Skill Gap Coverage", "weight": "40%", "score": round(pillar_1, 1)},
                        {"name": "Role Fit", "weight": "25%", "score": round(pillar_2, 1)},
                        {"name": "Complementary Balance", "weight": "15%", "score": round(pillar_3, 1)},
                        {"name": "Teamwork & Pacing", "weight": "15%", "score": round(pillar_4, 1)}
                    ]
                    best_covered_skills = covered_by_candidate

                    # Explainable match reasons
                    reasons = [
                        f"Recommended for vacant role '{role_candidate}' (unfilled in this team)."
                    ]
                    if covered_by_candidate:
                        reasons.append(f"Directly covers missing capabilities: {', '.join(covered_by_candidate)}.")
                    if members_rows:
                        members_summary = ', '.join([str(m['display_name']) + ' (' + str(m['role']) + ')' for m in members_rows[:3]])
                        reasons.append(f"Complements active members: {members_summary}.")
                    if cand_pref_role and cand_pref_role.lower() in role_candidate.lower():
                        reasons.append(f"Matches your stated preferred role: '{cand_pref_role}'.")
                    
                    best_reasons = reasons

                    # Coverage notes
                    notes = []
                    if covered_by_candidate:
                        notes.append(f"{candidate['name']} brings {', '.join(covered_by_candidate)} — covers key team gap.")
                    if active_count + 1 < min_size:
                        notes.append(f"Team will have {active_count + 1} members after joining (minimum {min_size} required).")
                    else:
                        notes.append("Team satisfies minimum formation size requirements.")
                    best_coverage_notes = notes

            # Missing requirements remaining after candidate joins
            missing_reqs = []
            for s in uncovered_event_skills:
                if not any(check_skill_match(cs, s) for cs in [c.split(" ")[0] for c in best_covered_skills]):
                    missing_reqs.append({
                        "skill": s,
                        "required": True,
                        "proficiency": 2
                    })

            recommendations.append({
                "team_id": team_id,
                "team_name": t["name"],
                "event_id": event_id,
                "status": t["status"],
                "current_members_count": active_count,
                "max_team_size": max_size,
                "vacant_roles": vacant_roles,
                "recommended_role": best_role,
                "compatibility_score": best_score,
                "pillars": best_pillars,
                "match_reasons": best_reasons,
                "covered_skills": best_covered_skills,
                "missing_requirements": missing_reqs,
                "coverage_notes": best_coverage_notes,
                "members": team_member_skills
            })

        # Sort recommendations by compatibility score descending
        recommendations.sort(key=lambda x: x["compatibility_score"], reverse=True)

        return {
            "event_id": event_id,
            "participant_id": user_id,
            "participant_name": candidate["name"],
            "participant_preferred_role": cand_pref_role,
            "recommendations_count": len(recommendations),
            "recommendations": recommendations
        }
