import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status

from backend.app.services.intelligent_matching_service import CANONICAL_ROLES

class TeamCollaborationService:
    def __init__(self, db: Session):
        self.db = db

    def is_active_team_member(self, team_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Verifies if the user is currently an active member of the team."""
        row = self.db.execute(
            text("""
                SELECT 1 FROM hackloop.team_memberships
                WHERE team_id = :tid AND user_id = :uid AND status = 'active'
            """),
            {"tid": team_id, "uid": user_id}
        ).fetchone()
        return bool(row)

    def is_authorized_team_user(self, team_id: uuid.UUID, user_id: uuid.UUID, roles: List[str]) -> bool:
        """Returns True if the user is an active team member, event organizer, or admin."""
        if "admin" in roles:
            return True

        if self.is_active_team_member(team_id, user_id):
            return True

        # Check if user is event organizer
        row = self.db.execute(
            text("""
                SELECT 1 FROM hackloop.teams t
                JOIN hackloop.events e ON e.id = t.event_id
                WHERE t.id = :tid AND e.organizer_id = :uid
            """),
            {"tid": team_id, "uid": user_id}
        ).fetchone()
        return bool(row)

    def join_team(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        requested_role: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows a participant to dynamically join a team for an available vacant role."""
        # 1. Fetch team and event constraints
        team_row = self.db.execute(
            text("""
                SELECT t.id, t.name, t.event_id, t.status, e.title AS event_title,
                       e.min_team_size, e.max_team_size
                FROM hackloop.teams t
                JOIN hackloop.events e ON e.id = t.event_id
                WHERE t.id = :tid
            """),
            {"tid": team_id}
        ).mappings().first()

        if not team_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

        max_size = team_row["max_team_size"] or 5
        event_id = team_row["event_id"]

        # 2. Check if participant is registered for this event
        reg = self.db.execute(
            text("""
                SELECT status FROM hackloop.event_registrations 
                WHERE event_id = :eid AND user_id = :uid
            """),
            {"eid": event_id, "uid": user_id}
        ).mappings().first()

        if not reg or reg["status"] != "registered":
            # Auto-register participant if registration is open
            self.db.execute(
                text("""
                    INSERT INTO hackloop.event_registrations (event_id, user_id, status)
                    VALUES (:eid, :uid, 'registered')
                    ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'registered'
                """),
                {"eid": event_id, "uid": user_id}
            )

        # 3. Check active members
        active_members = self.db.execute(
            text("SELECT id, user_id, role FROM hackloop.team_memberships WHERE team_id = :tid AND status = 'active'"),
            {"tid": team_id}
        ).mappings().all()

        if any(str(m["user_id"]) == str(user_id) for m in active_members):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already an active member of this team"
            )

        if len(active_members) >= max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This team has reached its maximum size capacity of {max_size} members"
            )

        # 4. Check role availability
        occupied_roles = [m["role"].strip().lower() for m in active_members if m["role"]]
        
        # Fetch event configured roles
        event_roles = self.db.execute(
            text("SELECT name FROM hackloop.event_roles WHERE event_id = :eid"),
            {"eid": event_id}
        ).fetchall()
        roles_catalog = [r[0] for r in event_roles] if event_roles else CANONICAL_ROLES

        vacant_roles = [r for r in roles_catalog if r.strip().lower() not in occupied_roles]
        if not vacant_roles:
            vacant_roles.append("Full-stack Contributor")

        assigned_role = requested_role.strip() if requested_role else None
        if assigned_role:
            if assigned_role.lower() in occupied_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The role '{assigned_role}' is already occupied in this team. Available vacant roles: {', '.join(vacant_roles)}"
                )
        else:
            assigned_role = vacant_roles[0]

        now = datetime.now(timezone.utc)
        membership_id = uuid.uuid4()

        # Check if user had a previous departed membership to update or insert new
        existing_mem = self.db.execute(
            text("SELECT id FROM hackloop.team_memberships WHERE team_id = :tid AND user_id = :uid"),
            {"tid": team_id, "uid": user_id}
        ).mappings().first()

        if existing_mem:
            membership_id = existing_mem["id"]
            self.db.execute(
                text("""
                    UPDATE hackloop.team_memberships
                    SET role = :role, status = 'active', joined_at = :now, departed_at = NULL, departure_reason = NULL
                    WHERE id = :mid
                """),
                {"mid": membership_id, "role": assigned_role, "now": now}
            )
        else:
            self.db.execute(
                text("""
                    INSERT INTO hackloop.team_memberships (id, team_id, user_id, role, status, joined_at)
                    VALUES (:id, :tid, :uid, :role, 'active', :now)
                """),
                {"id": membership_id, "tid": team_id, "uid": user_id, "role": assigned_role, "now": now}
            )

        self.db.commit()

        # Recalculate remaining vacant roles
        new_active_count = len(active_members) + 1
        remaining_vacants = [r for r in vacant_roles if r.lower() != assigned_role.lower()]

        return {
            "success": True,
            "team_id": team_id,
            "membership_id": membership_id,
            "user_id": user_id,
            "role": assigned_role,
            "message": f"Successfully joined '{team_row['name']}' as {assigned_role}.",
            "active_members_count": new_active_count,
            "vacant_roles": remaining_vacants
        }

    def leave_team(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        departure_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Allows an active participant to leave their team, marking their role as vacant again."""
        mem = self.db.execute(
            text("""
                SELECT id, role, status FROM hackloop.team_memberships
                WHERE team_id = :tid AND user_id = :uid AND status = 'active'
            """),
            {"tid": team_id, "uid": user_id}
        ).mappings().first()

        if not mem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="You are not an active member of this team"
            )

        now = datetime.now(timezone.utc)
        reason = departure_reason or "Participant left team"

        self.db.execute(
            text("""
                UPDATE hackloop.team_memberships
                SET status = 'departed', departed_at = :now, departure_reason = :reason
                WHERE id = :mid
            """),
            {"mid": mem["id"], "now": now, "reason": reason}
        )
        self.db.commit()

        # Fetch remaining active members count
        remaining_count = self.db.execute(
            text("SELECT count(*) FROM hackloop.team_memberships WHERE team_id = :tid AND status = 'active'"),
            {"tid": team_id}
        ).scalar() or 0

        return {
            "success": True,
            "team_id": team_id,
            "membership_id": mem["id"],
            "user_id": user_id,
            "role": mem["role"],
            "message": f"Successfully left team. The role '{mem['role']}' is now vacant and can be refilled.",
            "active_members_count": remaining_count,
            "vacant_roles": [mem["role"]]
        }

    def get_team_messages(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        roles: List[str]
    ) -> List[Dict[str, Any]]:
        """Retrieves team chat messages strictly restricted to authorized team members."""
        if not self.is_authorized_team_user(team_id, user_id, roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to active team members. You must be an active member of this team to view chat messages."
            )

        messages = self.db.execute(
            text("""
                SELECT tm.id, tm.team_id, tm.user_id, tm.message, tm.created_at,
                       COALESCE(u.display_name, 'Member') AS user_name
                FROM hackloop.team_messages tm
                JOIN hackloop.users u ON u.id = tm.user_id
                WHERE tm.team_id = :tid
                ORDER BY tm.created_at ASC
            """),
            {"tid": team_id}
        ).mappings().all()

        return [dict(m) for m in messages]

    def post_team_message(
        self,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        roles: List[str],
        message_text: str
    ) -> Dict[str, Any]:
        """Posts a team chat message strictly restricted to authorized active team members."""
        if not self.is_authorized_team_user(team_id, user_id, roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to active team members. You must be an active member of this team to post chat messages."
            )

        user_row = self.db.execute(
            text("SELECT display_name FROM hackloop.users WHERE id = :uid"),
            {"uid": user_id}
        ).mappings().first()
        user_name = user_row["display_name"] if user_row else "Member"

        now = datetime.now(timezone.utc)
        msg_id = uuid.uuid4()

        self.db.execute(
            text("""
                INSERT INTO hackloop.team_messages (id, team_id, user_id, message, created_at)
                VALUES (:id, :tid, :uid, :msg, :now)
            """),
            {"id": msg_id, "tid": team_id, "uid": user_id, "msg": message_text.strip(), "now": now}
        )
        self.db.commit()

        return {
            "id": msg_id,
            "team_id": team_id,
            "user_id": user_id,
            "user_name": user_name,
            "message": message_text.strip(),
            "created_at": now
        }
