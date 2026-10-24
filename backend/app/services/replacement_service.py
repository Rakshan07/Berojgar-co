import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, and_

from backend.app.models.team import Team, TeamMembership, ReplacementRecommendation
from backend.app.models.event import Event, EventRequirement, EventRegistration
from backend.app.models.auth import User
from backend.app.models.profile import UserSkill, Profile
from backend.app.schemas.team import ReplacementRecommendationResponse, CandidateReplacement
from backend.app.services.matching_service import check_skill_match

class ReplacementService:
    def __init__(self, db: Session):
        self.db = db

    def record_member_departure(
        self,
        team_id: uuid.UUID,
        membership_id: uuid.UUID,
        actor_id: uuid.UUID,
        departure_reason: str
    ) -> TeamMembership:
        membership = self.db.scalars(
            select(TeamMembership).where(TeamMembership.id == membership_id, TeamMembership.team_id == team_id)
        ).first()

        if not membership or membership.status != "active":
            raise ValueError("Active team membership not found")

        # Verify caller is the member departing or event organizer
        team = self.db.get(Team, team_id)
        event = self.db.get(Event, team.event_id)
        if actor_id != membership.user_id and actor_id != event.organizer_id:
            raise PermissionError("Only the departing member or the event organizer can record a departure")

        membership.status = "departed"
        membership.departed_at = datetime.now(timezone.utc)
        membership.departure_reason = departure_reason
        self.db.commit()
        self.db.refresh(membership)
        return membership

    def generate_recommendations(
        self,
        team_id: uuid.UUID,
        departed_user_id: uuid.UUID,
        actor_id: uuid.UUID
    ) -> ReplacementRecommendationResponse:
        team = self.db.scalars(
            select(Team).options(joinedload(Team.memberships), joinedload(Team.event)).where(Team.id == team_id)
        ).first()
        if not team:
            raise ValueError("Team not found")

        event = team.event
        if actor_id != event.organizer_id:
            raise PermissionError("Only the event organizer can request replacement recommendations")

        departed_user = self.db.get(User, departed_user_id)
        if not departed_user:
            raise ValueError("Departed user not found")

        # 1. Calculate remaining team coverage
        active_members = [m for m in team.memberships if m.status == "active"]
        remaining_member_skills = []
        for m in active_members:
            skills = list(self.db.scalars(
                select(UserSkill).options(joinedload(UserSkill.skill)).where(UserSkill.user_id == m.user_id)
            ).all())
            remaining_member_skills.append({
                "user_id": m.user_id,
                "skills": [{"name": us.skill.name if us.skill else us.skill_id, "proficiency": us.proficiency} for us in skills]
            })

        # 2. Identify uncovered requirements
        uncovered_reqs = []
        for req in event.requirements:
            covered = False
            for m in remaining_member_skills:
                if any(check_skill_match(s["name"], req.skill_name) and s["proficiency"] >= req.min_proficiency for s in m["skills"]):
                    covered = True
                    break
            if not covered:
                uncovered_reqs.append({
                    "skill": req.skill_name,
                    "required": req.required,
                    "proficiency": req.min_proficiency
                })

        # 3. Find eligible replacement candidates
        # Must be registered for event, status='registered', and not in ANY active team for this event
        active_assigned_user_ids = set(self.db.scalars(
            select(TeamMembership.user_id)
            .join(Team, Team.id == TeamMembership.team_id)
            .where(Team.event_id == event.id, TeamMembership.status == "active")
        ).all())

        registered_candidates = list(self.db.scalars(
            select(User)
            .join(EventRegistration, EventRegistration.user_id == User.id)
            .where(
                EventRegistration.event_id == event.id,
                EventRegistration.status == "registered",
                ~User.id.in_(active_assigned_user_ids)
            )
        ).all())

        candidates_ranked = []
        for cand in registered_candidates:
            cand_skills = list(self.db.scalars(
                select(UserSkill).options(joinedload(UserSkill.skill)).where(UserSkill.user_id == cand.id)
            ).all())
            skills_dict = [{"name": cs.skill.name if cs.skill else cs.skill_id, "proficiency": cs.proficiency} for cs in cand_skills]

            covered_gaps = []
            score = 0
            for gap in uncovered_reqs:
                match = next((s for s in skills_dict if check_skill_match(s["name"], gap["skill"]) and s["proficiency"] >= gap["proficiency"]), None)
                if match:
                    covered_gaps.append(gap)
                    score += 5.0 if gap["required"] else 2.5

            if covered_gaps:
                candidates_ranked.append(CandidateReplacement(
                    candidate_id=cand.id,
                    name=cand.full_name,
                    score=score,
                    covered_gaps=covered_gaps,
                    impact_on_candidate_team="Candidate is unassigned; zero friction to transfer."
                ))

        # Sort descending by score
        candidates_ranked.sort(key=lambda c: (len(c.covered_gaps), c.score), reverse=True)

        rec = ReplacementRecommendation(
            team_id=team.id,
            departed_user_id=departed_user.id,
            uncovered_requirements=uncovered_reqs,
            candidate_user_id=candidates_ranked[0].candidate_id if candidates_ranked else departed_user.id,
            candidate_score=candidates_ranked[0].score if candidates_ranked else 0,
            covered_gaps=[g for g in (candidates_ranked[0].covered_gaps if candidates_ranked else [])],
            status="pending"
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)

        return ReplacementRecommendationResponse(
            id=rec.id,
            team_id=team.id,
            departed_user_id=departed_user.id,
            departed_user_name=departed_user.full_name,
            uncovered_requirements=uncovered_reqs,
            candidates=candidates_ranked[:5],
            status=rec.status,
            created_at=rec.created_at
        )

    def apply_replacement(
        self,
        team_id: uuid.UUID,
        recommendation_id: uuid.UUID,
        candidate_user_id: uuid.UUID,
        assigned_role: str,
        actor_id: uuid.UUID
    ) -> TeamMembership:
        team = self.db.get(Team, team_id)
        if not team:
            raise ValueError("Team not found")

        event = self.db.get(Event, team.event_id)
        if actor_id != event.organizer_id:
            raise PermissionError("Only the organizer can approve a replacement")

        # Verify candidate is not already in an active team for this event
        existing_active = self.db.scalars(
            select(TeamMembership)
            .join(Team, Team.id == TeamMembership.team_id)
            .where(
                Team.event_id == event.id,
                TeamMembership.user_id == candidate_user_id,
                TeamMembership.status == "active"
            )
        ).first()

        if existing_active:
            raise ValueError("Candidate is already an active member of another team for this event")

        # Check team capacity
        active_count = len([m for m in team.memberships if m.status == "active"])
        if active_count >= event.max_team_size:
            raise ValueError("Team has reached maximum allowed member size")

        new_membership = TeamMembership(
            team_id=team.id,
            user_id=candidate_user_id,
            role=assigned_role or "Member",
            status="active",
            joined_at=datetime.now(timezone.utc)
        )
        self.db.add(new_membership)

        rec = self.db.get(ReplacementRecommendation, recommendation_id)
        if rec:
            rec.status = "approved"
            rec.decided_by = actor_id
            rec.decided_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(new_membership)
        return new_membership
