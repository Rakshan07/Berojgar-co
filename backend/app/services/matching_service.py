import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_

from backend.app.models.event import Event, EventRequirement, EventRegistration
from backend.app.models.auth import User
from backend.app.models.profile import Profile, UserSkill
from backend.app.models.matching import (
    MatchingRun,
    ProposedTeam,
    ProposedMemberAssignment,
    MatchExplanation,
)
from backend.app.models.team import Team, TeamMembership
from backend.app.schemas.matching import MatchingRunCreate

PROFICIENCY_LABELS = {
    1: "Exploring",
    2: "Developing",
    3: "Independent",
    4: "Advanced / Can mentor"
}

def normalize_text(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", text.lower())
    cleaned = re.sub(r"development$", "dev", cleaned)
    cleaned = re.sub(r"analysis$", "analysis", cleaned)
    return cleaned

def check_skill_match(user_skill_name: str, req_skill_name: str) -> bool:
    u = user_skill_name.lower().strip()
    r = req_skill_name.lower().strip()
    if u == r:
        return True
    if u in r or r in u:
        return True
    if normalize_text(u) == normalize_text(r):
        return True
    
    # Semantic aliases
    aliases = {
        "frontend development": ["react", "vue", "angular", "css", "frontend", "typescript", "javascript"],
        "backend development": ["python", "node.js", "go", "fastapi", "django", "backend", "sql", "postgresql"],
        "ux design": ["figma", "design", "ui/ux", "user research", "product design"],
        "machine learning": ["nlp", "pytorch", "ai/ml", "data science"],
        "data visualization": ["data viz", "d3", "matplotlib"],
        "project management": ["strategy", "scrum", "agile", "management", "coordination"],
        "argumentation": ["debate", "public speaking", "critical thinking"],
        "academic writing": ["research", "documentation", "manuscript"],
        "branding": ["illustrator", "visual design", "typography"],
        "storytelling": ["creative writing", "narrative", "scriptwriting"],
    }
    for key, syns in aliases.items():
        if (key in r or r in key) and any(s in u for s in syns):
            return True
        if (key in u or u in key) and any(s in r for s in syns):
            return True

    return False

def infer_suggested_role(participant_skills: List[Dict[str, Any]], event: Event) -> str:
    names = [s["name"].lower() for s in participant_skills]
    if any("ux" in n or "design" in n or "figma" in n for n in names):
        return "Lead Designer"
    if any("ml" in n or "machine learning" in n or "nlp" in n for n in names):
        return "AI/ML Lead"
    if any("backend" in n or "python" in n or "fastapi" in n or "go" in n or "node" in n for n in names):
        return "Backend Lead"
    if any("frontend" in n or "react" in n for n in names):
        return "Frontend Lead"
    if any("project" in n or "management" in n or "strategy" in n for n in names):
        return "Team Coordinator"
    if any("research" in n or "writing" in n for n in names):
        return "Research Lead"
    if any("branding" in n or "video" in n or "creative" in n for n in names):
        return "Creative Lead"
    if any("argumentation" in n or "debate" in n for n in names):
        return "Lead Speaker"
    return "Core Member"

class MatchingService:
    def __init__(self, db: Session):
        self.db = db

    def execute_matching_run(
        self,
        event_id: uuid.UUID,
        organizer_id: uuid.UUID,
        req: MatchingRunCreate
    ) -> MatchingRun:
        event = self.db.scalars(
            select(Event)
            .options(
                joinedload(Event.requirements),
                joinedload(Event.registrations).joinedload(EventRegistration.user)
            )
            .where(Event.id == event_id)
        ).first()

        if not event:
            raise ValueError("Event not found")
        if event.organizer_id != organizer_id:
            raise PermissionError("Only the event organizer can run team matching")

        target_size = req.target_team_size or event.max_team_size

        # Create MatchingRun record
        run = MatchingRun(
            event_id=event.id,
            initiated_by=organizer_id,
            algorithm_version=req.algorithm_version or "teamweave-v1-greedy-complementary",
            status="processing",
            config_snapshot={"target_size": target_size, "strict_availability": req.strict_availability}
        )
        self.db.add(run)
        self.db.flush()

        # Step 1: Collect eligible participants
        # Hard constraint: status == 'registered', and NOT already in an active team for this event
        active_team_member_ids = set(self.db.scalars(
            select(TeamMembership.user_id)
            .join(Team, Team.id == TeamMembership.team_id)
            .where(Team.event_id == event.id, TeamMembership.status == "active")
        ).all())

        eligible_registrations = [
            r for r in event.registrations
            if r.status == "registered" and r.user_id not in active_team_member_ids
        ]

        # Gather user skills and profile data
        participant_pool = []
        for reg in eligible_registrations:
            user = reg.user
            profile = self.db.scalars(select(Profile).where(Profile.user_id == user.id)).first()
            skills_orm = list(self.db.scalars(
                select(UserSkill)
                .options(joinedload(UserSkill.skill))
                .where(UserSkill.user_id == user.id)
            ).all())

            skills_list = [
                {
                    "skill_id": us.skill_id,
                    "name": us.skill.name if us.skill else us.skill_id,
                    "proficiency": us.proficiency,
                    "is_self_declared": us.is_self_declared,
                    "evidence_count": us.evidence_count
                }
                for us in skills_orm
            ]

            participant_pool.append({
                "user_id": user.id,
                "name": user.full_name,
                "email": user.email,
                "preferred_roles": reg.preferred_roles or [],
                "skills": skills_list,
                "hours_per_week": profile.hours_per_week if profile else 15,
                "timezone": profile.timezone if profile else "UTC",
                "constraints": profile.availability_constraints if profile else [],
            })

        # Score participants against requirements
        for p in participant_pool:
            score = 0
            covered_req_ids = set()
            for req_item in event.requirements:
                match = next((s for s in p["skills"] if check_skill_match(s["name"], req_item.skill_name)), None)
                if match:
                    prof = match["proficiency"]
                    prof_bonus = min(prof, req_item.min_proficiency) / 4.0
                    evidence_bonus = 0.5 if not match["is_self_declared"] or match["evidence_count"] > 0 else 0.0
                    weight = 3.0 if req_item.required else 1.5
                    score += weight + prof_bonus + evidence_bonus
                    if prof >= req_item.min_proficiency:
                        covered_req_ids.add(req_item.id)

            p["matching_score"] = round(score, 2)
            p["covered_req_ids"] = covered_req_ids

        # Sort pool descending by matching score (most versatile first)
        participant_pool.sort(key=lambda x: x["matching_score"], reverse=True)

        # Greedy complementary team formation
        proposed_teams_data = []
        remaining = list(participant_pool)
        team_idx = 1

        while len(remaining) >= event.min_team_size:
            current_team_members = []
            covered_in_team = set()

            # 1. Anchor: pick participant covering an uncovered required skill
            anchor = None
            for p in remaining:
                if any(r.id in p["covered_req_ids"] and r.id not in covered_in_team for r in event.requirements if r.required):
                    anchor = p
                    break
            if not anchor:
                anchor = remaining[0]

            current_team_members.append(anchor)
            covered_in_team.update(anchor["covered_req_ids"])
            remaining = [p for p in remaining if p["user_id"] != anchor["user_id"]]

            # 2. Fill complementary teammates
            while len(current_team_members) < min(target_size, len(current_team_members) + len(remaining)):
                if not remaining:
                    break

                # Pick candidate who covers the most uncovered requirements
                best_candidate = remaining[0]
                best_new_coverage = -1
                best_candidate_score = -1

                for cand in remaining:
                    new_coverage_count = len([rid for rid in cand["covered_req_ids"] if rid not in covered_in_team])
                    if new_coverage_count > best_new_coverage or (new_coverage_count == best_new_coverage and cand["matching_score"] > best_candidate_score):
                        best_candidate = cand
                        best_new_coverage = new_coverage_count
                        best_candidate_score = cand["matching_score"]

                current_team_members.append(best_candidate)
                covered_in_team.update(best_candidate["covered_req_ids"])
                remaining = [p for p in remaining if p["user_id"] != best_candidate["user_id"]]

                if len(current_team_members) >= target_size:
                    break

            # Build coverage analysis
            coverage_notes = []
            reqs_covered = []
            partial_covered = []
            missing_caps = []

            for r in event.requirements:
                contributors = [
                    m for m in current_team_members
                    if next((s for s in m["skills"] if check_skill_match(s["name"], r.skill_name) and s["proficiency"] >= r.min_proficiency), None)
                ]
                if contributors:
                    contributor = contributors[0]
                    matched_skill = next(s for s in contributor["skills"] if check_skill_match(s["name"], r.skill_name))
                    prof_label = PROFICIENCY_LABELS.get(matched_skill["proficiency"], "Unknown")
                    req_type_label = "required capability" if r.required else "preferred capability"
                    coverage_notes.append(
                        f"{contributor['name']} covers {r.skill_name} ({prof_label}) — {req_type_label} met."
                    )
                    reqs_covered.append({
                        "requirement_id": str(r.id),
                        "skill": r.skill_name,
                        "required": r.required,
                        "covered_by": contributor["name"],
                        "proficiency": matched_skill["proficiency"]
                    })
                else:
                    label = "CRITICAL GAP" if r.required else "Gap"
                    prof_label = PROFICIENCY_LABELS.get(r.min_proficiency, "")
                    coverage_notes.append(
                        f"{label}: No participant covers {r.skill_name} at {prof_label} level or above."
                    )
                    missing_caps.append({
                        "requirement_id": str(r.id),
                        "skill": r.skill_name,
                        "required": r.required,
                        "proficiency": r.min_proficiency
                    })

            # Match reasons
            match_reasons = []
            has_backend = any(any("backend" in s["name"].lower() or "python" in s["name"].lower() for s in m["skills"]) for m in current_team_members)
            has_frontend = any(any("frontend" in s["name"].lower() or "react" in s["name"].lower() for s in m["skills"]) for m in current_team_members)
            has_design = any(any("ux" in s["name"].lower() or "design" in s["name"].lower() for s in m["skills"]) for m in current_team_members)

            if has_backend and has_frontend:
                match_reasons.append("Strong technical pairing with complementary frontend and backend execution.")
            if has_design:
                match_reasons.append("Dedicated product design presence ensures cohesive user experience.")
            
            advanced_count = len([m for m in current_team_members if any(s["proficiency"] >= 3 for s in m["skills"])])
            if advanced_count >= 2:
                match_reasons.append(f"{advanced_count} members bring advanced or independent-level proficiency to the team.")

            if not match_reasons:
                match_reasons.append("Members were selected to maximize skill coverage across the event requirements.")

            # Calculate coverage score
            total_reqs = len(event.requirements) or 1
            cov_score = round((len(reqs_covered) / total_reqs) * 100, 1)

            proposed_teams_data.append({
                "team_name": f"Team {team_idx}",
                "members": current_team_members,
                "coverage_score": cov_score,
                "coverage_notes": coverage_notes,
                "reqs_covered": reqs_covered,
                "missing_caps": missing_caps,
                "match_reasons": match_reasons,
                "team_size_gap": len(current_team_members) < event.min_team_size
            })
            team_idx += 1

        # Unassigned participants
        unassigned_data = [
            {"user_id": str(p["user_id"]), "name": p["name"], "score": p["matching_score"], "reason": "Participant pool did not meet minimum team size threshold for another full team"}
            for p in remaining
        ]

        # Persist proposed teams and assignments
        for t_data in proposed_teams_data:
            p_team = ProposedTeam(
                matching_run_id=run.id,
                event_id=event.id,
                team_name=t_data["team_name"],
                status="proposed",
                coverage_score=t_data["coverage_score"]
            )
            self.db.add(p_team)
            self.db.flush()

            for member in t_data["members"]:
                role = infer_suggested_role(member["skills"], event)
                assignment = ProposedMemberAssignment(
                    proposed_team_id=p_team.id,
                    user_id=member["user_id"],
                    suggested_role=role,
                    is_approved=False
                )
                self.db.add(assignment)

            # Store match explanation
            explanation = MatchExplanation(
                proposed_team_id=p_team.id,
                requirements_covered=t_data["reqs_covered"],
                partial_covered=[],
                missing_capabilities=t_data["missing_caps"],
                member_contributions=[],
                coverage_notes=t_data["coverage_notes"],
                match_reasons=t_data["match_reasons"],
                unassigned_participants=unassigned_data
            )
            self.db.add(explanation)

        run.status = "completed"
        run.completed_at = datetime.now(timezone.utc)
        run.summary = {
            "total_participants": len(participant_pool),
            "assigned_participants": len(participant_pool) - len(remaining),
            "unassigned_count": len(remaining),
            "teams_created": len(proposed_teams_data),
        }

        self.db.commit()
        self.db.refresh(run)
        return run

    def get_matching_run(self, run_id: uuid.UUID) -> Optional[MatchingRun]:
        return self.db.scalars(
            select(MatchingRun)
            .options(
                joinedload(MatchingRun.proposed_teams)
                .joinedload(ProposedTeam.members)
                .joinedload(ProposedMemberAssignment.user),
                joinedload(MatchingRun.proposed_teams)
                .joinedload(ProposedTeam.explanation)
            )
            .where(MatchingRun.id == run_id)
        ).unique().first()

    def list_matching_runs(self, event_id: uuid.UUID) -> List[MatchingRun]:
        return list(self.db.scalars(
            select(MatchingRun)
            .where(MatchingRun.event_id == event_id)
            .order_by(MatchingRun.created_at.desc())
        ).all())

    def approve_matching_run(self, run_id: uuid.UUID, organizer_id: uuid.UUID) -> List[Team]:
        """Atomically approves the matching run and creates active confirmed teams and memberships."""
        run = self.get_matching_run(run_id)
        if not run:
            raise ValueError("Matching run not found")

        event = self.db.get(Event, run.event_id)
        if not event or event.organizer_id != organizer_id:
            raise PermissionError("Only the event organizer can approve and publish matching runs")

        created_teams = []
        assigned_user_ids = set()

        for p_team in run.proposed_teams:
            # Check for conflict
            for m in p_team.members:
                if m.user_id in assigned_user_ids:
                    raise ValueError(f"Participant {m.user_id} is assigned multiple times in this matching run")
                assigned_user_ids.add(m.user_id)

            team = Team(
                event_id=event.id,
                name=p_team.team_name,
                status="published",
                matching_run_id=run.id,
                published_at=datetime.now(timezone.utc)
            )
            self.db.add(team)
            self.db.flush()

            for m in p_team.members:
                membership = TeamMembership(
                    team_id=team.id,
                    user_id=m.user_id,
                    role=m.suggested_role,
                    status="active",
                    joined_at=datetime.now(timezone.utc)
                )
                self.db.add(membership)
                m.is_approved = True

            p_team.status = "approved"
            created_teams.append(team)

        run.status = "approved"
        self.db.commit()
        return created_teams

    def reject_matching_run(self, run_id: uuid.UUID, organizer_id: uuid.UUID) -> MatchingRun:
        run = self.get_matching_run(run_id)
        if not run:
            raise ValueError("Matching run not found")
        event = self.db.get(Event, run.event_id)
        if not event or event.organizer_id != organizer_id:
            raise PermissionError("Only organizer can reject this matching run")

        run.status = "rejected"
        for pt in run.proposed_teams:
            pt.status = "rejected"
        self.db.commit()
        self.db.refresh(run)
        return run
