import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from backend.app.models.team import Team, TeamMembership, TeamMessage, TeamMeeting
from backend.app.models.event import Event
from backend.app.models.profile import UserSkill
from backend.app.schemas.team import TeamBlueprintResponse

class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def get_team(self, team_id: uuid.UUID) -> Optional[Team]:
        return self.db.scalars(
            select(Team)
            .options(
                joinedload(Team.memberships).joinedload(TeamMembership.user),
                joinedload(Team.event)
            )
            .where(Team.id == team_id)
        ).unique().first()

    def get_team_blueprint(self, team_id: uuid.UUID) -> Optional[TeamBlueprintResponse]:
        team = self.get_team(team_id)
        if not team:
            return None

        event = team.event
        active_memberships = [m for m in team.memberships if m.status == "active"]

        # Gather member skills
        members_data = []
        for m in active_memberships:
            skills = list(self.db.scalars(
                select(UserSkill).options(joinedload(UserSkill.skill)).where(UserSkill.user_id == m.user_id)
            ).all())
            members_data.append({
                "participantId": str(m.user_id),
                "name": m.user.full_name,
                "role": m.role,
                "skills": [
                    {
                        "name": us.skill.name if us.skill else us.skill_id,
                        "proficiency": us.proficiency
                    }
                    for us in skills
                ]
            })

        # Calculate coverage against event requirements
        coverage_notes = []
        match_reasons = []
        missing_reqs = []

        if event:
            from backend.app.services.matching_service import check_skill_match, PROFICIENCY_LABELS
            reqs = event.requirements
            for r in reqs:
                covering_member = None
                for m in members_data:
                    match = next((s for s in m["skills"] if check_skill_match(s["name"], r.skill_name) and s["proficiency"] >= r.min_proficiency), None)
                    if match:
                        covering_member = (m["name"], match["proficiency"])
                        break

                if covering_member:
                    name, prof = covering_member
                    prof_label = PROFICIENCY_LABELS.get(prof, "Independent")
                    req_type = "required capability" if r.required else "preferred capability"
                    coverage_notes.append(f"{name} covers {r.skill_name} ({prof_label}) — {req_type} met.")
                else:
                    label = "CRITICAL GAP" if r.required else "Gap"
                    prof_label = PROFICIENCY_LABELS.get(r.min_proficiency, "")
                    coverage_notes.append(f"{label}: No participant covers {r.skill_name} at {prof_label} level or above.")
                    missing_reqs.append({
                        "skill": r.skill_name,
                        "required": r.required,
                        "proficiency": r.min_proficiency
                    })

        team_size_gap = len(active_memberships) < (event.min_team_size if event else 3)
        if team_size_gap:
            coverage_notes.append(f"CRITICAL GAP: Team has only {len(active_memberships)} members; minimum is {event.min_team_size}.")

        match_reasons.append("Active roster configured with skill complementary pairing.")

        return TeamBlueprintResponse(
            id=team.id,
            event_id=team.event_id,
            name=team.name,
            status=team.status,
            members=members_data,
            coverage_notes=coverage_notes,
            match_reasons=match_reasons,
            missing_requirements=missing_reqs,
            team_size_gap=team_size_gap,
            published_at=team.published_at
        )

    def send_message(self, team_id: uuid.UUID, user_id: uuid.UUID, message: str) -> TeamMessage:
        msg = TeamMessage(
            team_id=team_id,
            user_id=user_id,
            message=message
        )
        self.db.add(msg)
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def list_messages(self, team_id: uuid.UUID) -> List[TeamMessage]:
        return list(self.db.scalars(
            select(TeamMessage)
            .options(joinedload(TeamMessage.user))
            .where(TeamMessage.team_id == team_id)
            .order_by(TeamMessage.created_at.asc())
        ).all())
