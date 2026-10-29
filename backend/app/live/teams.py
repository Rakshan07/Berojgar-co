"""Team creation, membership management, invitations, join requests,
and candidate matching for Skillfy events.
Enforces strict transactional guarantees:
- 1 active team per participant per event
- Capacity limits protected with row locking (SELECT ... FOR UPDATE)
- Distinct captain permissions
"""
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.db.session import get_db
from .auth import current_user
from .db import one, rows, execute, require
from .matching import get_candidate_matches_for_team, get_team_matches_for_candidate

logger = logging.getLogger(__name__)

router = APIRouter(tags=['Teams'])

# ─── Request Schemas ──────────────────────────────────────────────────────────

class TeamCreateBody(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    creator_role: str = Field(min_length=2, max_length=100)
    seeking_roles: List[str] = Field(default_factory=list, max_length=10)

class InviteCandidateBody(BaseModel):
    candidate_user_id: UUID
    target_role: Optional[str] = Field(default=None, max_length=100)
    message: Optional[str] = Field(default=None, max_length=1000)

class JoinRequestBody(BaseModel):
    target_role: Optional[str] = Field(default=None, max_length=100)
    message: Optional[str] = Field(default=None, max_length=1000)

class RequestDecisionBody(BaseModel):
    decision: Literal['accept', 'decline']

class RemoveMemberBody(BaseModel):
    member_user_id: UUID

# ─── Team Endpoints ───────────────────────────────────────────────────────────

@router.post('/events/{eid}/teams', status_code=201)
def create_team(eid: UUID, body: TeamCreateBody, user = Depends(current_user), db = Depends(get_db)):
    """Create a new team for an event. The creator automatically becomes the captain."""
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot join participant teams.')
    uid = user['id']
    event = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid), 404, 'Event not found')
    require(event['status'] == 'published', 400, 'Teams can only be formed for published events')

    # Participant must be registered for this event
    reg = require(
        one(db, "SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid AND status='registered'", eid=eid, uid=uid),
        403, 'You must register for this event before creating a team'
    )

    # Participant cannot already be on an active team for this event
    active_m = one(db, 'SELECT 1 FROM hackloop.team_members WHERE event_id=:eid AND user_id=:uid AND left_at IS NULL', eid=eid, uid=uid)
    require(not active_m, 409, 'You are already an active member of a team for this event')

    # Name uniqueness within this event
    clean_name = body.name.strip()
    existing_name = one(db, 'SELECT 1 FROM hackloop.teams WHERE event_id=:eid AND lower(name)=lower(:name)', eid=eid, name=clean_name)
    require(not existing_name, 409, f"A team named '{clean_name}' already exists for this event")

    clean_creator_role = body.creator_role.strip()
    seeking = [r.strip() for r in body.seeking_roles if r.strip()]

    # Create team row
    team = one(db, '''INSERT INTO hackloop.teams(
        event_id, name, description, created_by, status, creator_role, seeking_roles, is_recruiting, created_at, updated_at
      ) VALUES (
        :eid, :name, :desc, :uid, 'forming', :role, :seeking, true, now(), now()
      ) RETURNING *''',
      eid=eid, name=clean_name, desc=body.description, uid=uid,
      role=clean_creator_role, seeking=json.dumps(seeking))

    # Add creator as captain in team_members
    one(db, '''INSERT INTO hackloop.team_members(
        event_id, team_id, user_id, membership_role, assigned_role, joined_at
      ) VALUES (
        :eid, :tid, :uid, 'captain', :role, now()
      ) RETURNING id''',
      eid=eid, tid=team['id'], uid=uid, role=clean_creator_role)

    db.commit()
    return get_team_detail_internal(db, team['id'], uid)

@router.get('/events/{eid}/teams')
def list_event_teams(eid: UUID, db = Depends(get_db)):
    """List recruiting teams for an event."""
    event = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid), 404, 'Event not found')
    teams = rows(db, '''SELECT t.*, u.display_name AS creator_name,
      (SELECT count(*) FROM hackloop.team_members tm WHERE tm.team_id=t.id AND tm.left_at IS NULL) AS member_count
      FROM hackloop.teams t
      JOIN hackloop.users u ON u.id=t.created_by
      WHERE t.event_id=:eid AND t.status != 'disbanded'
      ORDER BY t.created_at DESC''', eid=eid)

    return {'items': [{
        'id': str(t['id']),
        'name': t['name'],
        'description': t['description'],
        'creator_name': t['creator_name'],
        'creator_role': t.get('creator_role'),
        'seeking_roles': t.get('seeking_roles') if isinstance(t.get('seeking_roles'), list) else json.loads(t.get('seeking_roles') or '[]'),
        'member_count': t['member_count'],
        'max_team_size': event['max_team_size'],
        'is_recruiting': t.get('is_recruiting', True),
        'status': t['status']
    } for t in teams]}

@router.get('/events/{eid}/my-team')
def get_my_team_for_event(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Retrieve the current user's active team for this event."""
    uid = user['id']
    m = one(db, '''SELECT tm.team_id FROM hackloop.team_members tm 
      WHERE tm.event_id=:eid AND tm.user_id=:uid AND tm.left_at IS NULL''', eid=eid, uid=uid)
    if not m:
        return {'has_team': False}

    return {'has_team': True, 'team': get_team_detail_internal(db, m['team_id'], uid)}

@router.get('/teams/{tid}')
def get_team_detail(tid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Get full details of a team including active members and seeking roles."""
    return get_team_detail_internal(db, tid, user['id'])

def get_team_detail_internal(db, tid: UUID, current_user_id: UUID) -> Dict[str, Any]:
    team = require(one(db, 'SELECT * FROM hackloop.teams WHERE id=:id', id=tid), 404, 'Team not found')
    event = one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=team['event_id'])

    members = rows(db, '''SELECT tm.id AS membership_id, tm.user_id, u.display_name, u.email,
      tm.membership_role, tm.assigned_role, tm.joined_at,
      (SELECT evaluation_score FROM hackloop.assessment_submissions 
       WHERE event_id=tm.event_id AND user_id=tm.user_id AND status='completed' 
       ORDER BY attempt_number DESC LIMIT 1) AS assessment_score
      FROM hackloop.team_members tm
      JOIN hackloop.users u ON u.id=tm.user_id
      WHERE tm.team_id=:tid AND tm.left_at IS NULL
      ORDER BY tm.joined_at''', tid=tid)

    is_member = any(m['user_id'] == current_user_id for m in members)
    is_captain = any(m['user_id'] == current_user_id and m['membership_role'] == 'captain' for m in members)

    seeking = team.get('seeking_roles') or []
    if isinstance(seeking, str):
        try: seeking = json.loads(seeking)
        except Exception: seeking = []

    return {
        'id': str(team['id']),
        'event_id': str(team['event_id']),
        'event_title': event['title'] if event else '',
        'name': team['name'],
        'description': team['description'],
        'status': team['status'],
        'is_recruiting': team.get('is_recruiting', True),
        'seeking_roles': seeking,
        'creator_role': team.get('creator_role'),
        'min_team_size': event['min_team_size'] if event else 2,
        'max_team_size': event['max_team_size'] if event else 5,
        'is_member': is_member,
        'is_captain': is_captain,
        'members': [{
            'membership_id': str(m['membership_id']),
            'user_id': str(m['user_id']),
            'display_name': m['display_name'],
            'membership_role': m['membership_role'],
            'assigned_role': m.get('assigned_role') or 'Contributor',
            'joined_at': m['joined_at'],
            'assessment_score': m.get('assessment_score')
        } for m in members]
    }

# ─── Matching Endpoints ───────────────────────────────────────────────────────

@router.get('/teams/{tid}/candidates')
def get_candidates_for_team(tid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """For the team captain: returns complementary candidates with matching scores and explanations."""
    team = require(one(db, 'SELECT * FROM hackloop.teams WHERE id=:id', id=tid), 404, 'Team not found')
    captain_check = one(db, "SELECT 1 FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND membership_role='captain' AND left_at IS NULL",
                        tid=tid, uid=user['id'])
    require(captain_check, 403, 'Only the team captain can view candidate recommendations')

    matches = get_candidate_matches_for_team(db, tid, limit=12)
    # Exclude current user if ever returned
    filtered = [m for m in matches if m['user_id'] != str(user['id'])]
    return {'candidates': filtered}

@router.get('/events/{eid}/team-matches')
def get_team_matches(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """For a participant looking for a team: returns suitable recruiting teams."""
    matches = get_team_matches_for_candidate(db, eid, user['id'], limit=12)
    return {'teams': matches}

# ─── Invitations and Requests ─────────────────────────────────────────────────

@router.post('/teams/{tid}/invitations', status_code=201)
def invite_candidate(tid: UUID, body: InviteCandidateBody, user = Depends(current_user), db = Depends(get_db)):
    """Team captain invites a candidate to join their team."""
    team = require(one(db, 'SELECT * FROM hackloop.teams WHERE id=:id FOR UPDATE', id=tid), 404, 'Team not found')
    eid = team['event_id']

    # Must be active captain
    is_capt = one(db, "SELECT 1 FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND membership_role='captain' AND left_at IS NULL",
                  tid=tid, uid=user['id'])
    require(is_capt, 403, 'Only the team captain can invite members')

    # Enforce team capacity
    event = one(db, 'SELECT max_team_size FROM hackloop.events WHERE id=:id', id=eid)
    member_count = one(db, 'SELECT count(*) AS n FROM hackloop.team_members WHERE team_id=:tid AND left_at IS NULL', tid=tid)['n']
    require(member_count < event['max_team_size'], 409, 'Your team has already reached its maximum capacity')

    # Candidate must be registered for this event
    cand_reg = one(db, "SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid AND status='registered'",
                   eid=eid, uid=body.candidate_user_id)
    require(cand_reg, 404, 'Candidate is not registered for this event')

    # Candidate cannot already be in an active team for this event
    cand_active = one(db, 'SELECT 1 FROM hackloop.team_members WHERE event_id=:eid AND user_id=:uid AND left_at IS NULL',
                      eid=eid, uid=body.candidate_user_id)
    require(not cand_active, 409, 'Candidate is already a member of an active team for this event')

    # Cannot have a pending invitation already
    existing_req = one(db, "SELECT 1 FROM hackloop.team_requests WHERE team_id=:tid AND user_id=:uid AND request_type='invitation' AND status='pending'",
                       tid=tid, uid=body.candidate_user_id)
    require(not existing_req, 409, 'An invitation is already pending for this candidate')

    target_role = body.target_role or 'Contributor'
    expires_at = datetime.now(timezone.utc) + timedelta(days=3)

    req_row = one(db, '''INSERT INTO hackloop.team_requests(
        event_id, team_id, user_id, initiated_by, request_type, status, message, target_role, expires_at, created_at
      ) VALUES (
        :eid, :tid, :uid, :init, 'invitation', 'pending', :msg, :role, :exp, now()
      ) RETURNING *''',
      eid=eid, tid=tid, uid=body.candidate_user_id, init=user['id'],
      msg=body.message, role=target_role, exp=expires_at)

    db.commit()
    return {'status': 'invited', 'request_id': str(req_row['id'])}

@router.post('/teams/{tid}/join-requests', status_code=201)
def request_to_join(tid: UUID, body: JoinRequestBody, user = Depends(current_user), db = Depends(get_db)):
    """Participant requests to join a team."""
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot join participant teams.')
    uid = user['id']
    team = require(one(db, 'SELECT * FROM hackloop.teams WHERE id=:id', id=tid), 404, 'Team not found')
    eid = team['event_id']

    require(team['status'] == 'forming' and team.get('is_recruiting', True), 409, 'This team is not currently recruiting members')

    # Participant must be registered
    reg = one(db, "SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid AND status='registered'",
              eid=eid, uid=uid)
    require(reg, 403, 'You must register for this event before requesting to join a team')

    # Cannot already be in active team
    active_m = one(db, 'SELECT 1 FROM hackloop.team_members WHERE event_id=:eid AND user_id=:uid AND left_at IS NULL',
                   eid=eid, uid=uid)
    require(not active_m, 409, 'You are already a member of an active team for this event')

    # Cannot have pending join request for this team
    existing_req = one(db, "SELECT 1 FROM hackloop.team_requests WHERE team_id=:tid AND user_id=:uid AND request_type='join_request' AND status='pending'",
                       tid=tid, uid=uid)
    require(not existing_req, 409, 'You have already sent a join request to this team')

    target_role = body.target_role or 'Contributor'
    expires_at = datetime.now(timezone.utc) + timedelta(days=3)

    req_row = one(db, '''INSERT INTO hackloop.team_requests(
        event_id, team_id, user_id, initiated_by, request_type, status, message, target_role, expires_at, created_at
      ) VALUES (
        :eid, :tid, :uid, :init, 'join_request', 'pending', :msg, :role, :exp, now()
      ) RETURNING *''',
      eid=eid, tid=tid, uid=uid, init=uid,
      msg=body.message, role=target_role, exp=expires_at)

    db.commit()
    return {'status': 'requested', 'request_id': str(req_row['id'])}

@router.get('/teams/{tid}/requests')
def list_team_requests(tid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Team captain views pending incoming join requests and outgoing invitations."""
    is_capt = one(db, "SELECT 1 FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND membership_role='captain' AND left_at IS NULL",
                  tid=tid, uid=user['id'])
    require(is_capt, 403, 'Only the team captain can view team requests')

    reqs = rows(db, '''SELECT tr.*, u.display_name, u.email,
      (SELECT evaluation_score FROM hackloop.assessment_submissions 
       WHERE event_id=tr.event_id AND user_id=tr.user_id AND status='completed' 
       ORDER BY attempt_number DESC LIMIT 1) AS assessment_score
      FROM hackloop.team_requests tr
      JOIN hackloop.users u ON u.id=tr.user_id
      WHERE tr.team_id=:tid AND tr.status='pending' AND tr.expires_at > now()
      ORDER BY tr.created_at DESC''', tid=tid)

    return {'requests': [{
        'id': str(r['id']),
        'user_id': str(r['user_id']),
        'display_name': r['display_name'],
        'request_type': r['request_type'],
        'target_role': r.get('target_role') or 'Contributor',
        'message': r['message'],
        'assessment_score': r.get('assessment_score'),
        'created_at': r['created_at']
    } for r in reqs]}

@router.get('/events/{eid}/my-requests')
def list_my_requests_for_event(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """List pending invitations received by the current user."""
    uid = user['id']
    invites = rows(db, '''SELECT tr.*, t.name AS team_name, t.description AS team_description,
      u.display_name AS captain_name
      FROM hackloop.team_requests tr
      JOIN hackloop.teams t ON t.id=tr.team_id
      JOIN hackloop.users u ON u.id=tr.initiated_by
      WHERE tr.event_id=:eid AND tr.user_id=:uid AND tr.request_type='invitation' 
        AND tr.status='pending' AND tr.expires_at > now()
      ORDER BY tr.created_at DESC''', eid=eid, uid=uid)

    return {'invitations': [{
        'id': str(r['id']),
        'team_id': str(r['team_id']),
        'team_name': r['team_name'],
        'captain_name': r['captain_name'],
        'target_role': r.get('target_role') or 'Contributor',
        'message': r['message'],
        'created_at': r['created_at']
    } for r in invites]}

@router.post('/team-requests/{rid}/respond')
def respond_to_request(rid: UUID, body: RequestDecisionBody, user = Depends(current_user), db = Depends(get_db)):
    """Accept or decline a team invitation or join request.
    Uses strict row locking to prevent race conditions exceeding team capacity.
    """
    uid = user['id']
    req = require(one(db, 'SELECT * FROM hackloop.team_requests WHERE id=:id FOR UPDATE', id=rid), 404, 'Request not found')
    require(req['status'] == 'pending', 409, f"Request is already '{req['status']}'")
    require(req['expires_at'] > datetime.now(timezone.utc), 409, 'Request has expired')

    team = require(one(db, 'SELECT * FROM hackloop.teams WHERE id=:id FOR UPDATE', id=req['team_id']), 404, 'Team not found')
    eid = team['event_id']

    # Authorization check
    if req['request_type'] == 'invitation':
        # Candidate responds to captain's invitation
        require(req['user_id'] == uid, 403, 'Only the invited participant can respond to this invitation')
    else:
        # Captain responds to participant's join request
        is_capt = one(db, "SELECT 1 FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND membership_role='captain' AND left_at IS NULL",
                      tid=team['id'], uid=uid)
        require(is_capt, 403, 'Only the team captain can respond to join requests')

    if body.decision == 'decline':
        execute(db, "UPDATE hackloop.team_requests SET status='declined', responded_at=now() WHERE id=:id", id=rid)
        db.commit()
        return {'status': 'declined'}

    # ACCEPT ACTION:
    # 1. Enforce team capacity
    event = one(db, 'SELECT max_team_size FROM hackloop.events WHERE id=:id', id=eid)
    member_count = one(db, 'SELECT count(*) AS n FROM hackloop.team_members WHERE team_id=:tid AND left_at IS NULL', tid=team['id'])['n']
    require(member_count < event['max_team_size'], 409, 'Team has already reached maximum capacity')

    # 2. Enforce participant is NOT already in an active team for this event
    cand_active = one(db, 'SELECT 1 FROM hackloop.team_members WHERE event_id=:eid AND user_id=:uid AND left_at IS NULL',
                      eid=eid, uid=req['user_id'])
    require(not cand_active, 409, 'Participant is already in an active team for this event')

    # 3. Add to team_members
    assigned_role = req.get('target_role') or 'Contributor'
    execute(db, '''INSERT INTO hackloop.team_members(
        event_id, team_id, user_id, membership_role, assigned_role, joined_at
      ) VALUES (
        :eid, :tid, :uid, 'member', :role, now()
      )''', eid=eid, tid=team['id'], uid=req['user_id'], role=assigned_role)

    # 4. Mark request accepted
    execute(db, "UPDATE hackloop.team_requests SET status='accepted', responded_at=now() WHERE id=:id", id=rid)

    # 5. Cancel any other pending requests/invitations for this user for this event
    execute(db, '''UPDATE hackloop.team_requests SET status='cancelled', responded_at=now() 
      WHERE event_id=:eid AND user_id=:uid AND status='pending' AND id != :rid''',
      eid=eid, uid=req['user_id'], rid=rid)

    db.commit()
    return {'status': 'accepted', 'team_id': str(team['id'])}

@router.post('/teams/{tid}/leave')
def leave_team(tid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Current member leaves the team. If captain leaves, transfers captaincy or disbands if empty."""
    uid = user['id']
    m = require(
        one(db, 'SELECT * FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL FOR UPDATE', tid=tid, uid=uid),
        404, 'You are not an active member of this team'
    )

    execute(db, 'UPDATE hackloop.team_members SET left_at=now() WHERE id=:id', id=m['id'])

    # Check remaining active members
    remaining = rows(db, 'SELECT * FROM hackloop.team_members WHERE team_id=:tid AND left_at IS NULL ORDER BY joined_at', tid=tid)
    if not remaining:
        execute(db, "UPDATE hackloop.teams SET status='disbanded', is_recruiting=false, updated_at=now() WHERE id=:tid", tid=tid)
    elif m['membership_role'] == 'captain':
        # Transfer captaincy to oldest active member
        next_capt = remaining[0]
        execute(db, "UPDATE hackloop.team_members SET membership_role='captain' WHERE id=:id", id=next_capt['id'])

    db.commit()
    return {'status': 'left'}

@router.post('/teams/{tid}/remove-member')
def remove_member(tid: UUID, body: RemoveMemberBody, user = Depends(current_user), db = Depends(get_db)):
    """Captain removes a member from the team."""
    uid = user['id']
    is_capt = one(db, "SELECT 1 FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND membership_role='captain' AND left_at IS NULL",
                  tid=tid, uid=uid)
    require(is_capt, 403, 'Only the team captain can remove members')
    require(body.member_user_id != uid, 400, 'Captain cannot remove themselves; use leave team instead')

    target_m = require(
        one(db, 'SELECT * FROM hackloop.team_members WHERE team_id=:tid AND user_id=:uid AND left_at IS NULL FOR UPDATE', tid=tid, uid=body.member_user_id),
        404, 'Member not found on this team'
    )

    execute(db, 'UPDATE hackloop.team_members SET left_at=now() WHERE id=:id', id=target_m['id'])
    db.commit()
    return {'status': 'removed'}

