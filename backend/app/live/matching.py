"""Deterministic complementary team matching algorithm for Skillfy.
Calculates suitability between teams and candidates based on real stored facts for the SAME event.

Factors and configurable weights:
- Missing role complement (0.35): Team is actively seeking a role that the candidate fills.
- Assessed skill coverage (0.30): Candidate's evaluated skills overlap with required event skills.
- Role preference (0.15): Candidate has explicitly stated a preference for the target role.
- Availability overlap (0.20): Time commitment alignment.

Strict filtering:
- Only registrations for the same event.
- Exclude candidates already on an active team for the event (left_at IS NULL).
- Exclude the current user from their own recommendations.
- Exclude full teams or teams not actively recruiting.
"""
import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from backend.app.live.db import one, rows

logger = logging.getLogger(__name__)

WEIGHT_ROLE_COMPLEMENT = 0.35
WEIGHT_SKILL_COVERAGE = 0.30
WEIGHT_ROLE_PREFERENCE = 0.15
WEIGHT_AVAILABILITY = 0.20

def get_candidate_matches_for_team(db, team_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
    """Find candidate participants for a team captain seeking complementary members."""
    team = one(db, 'SELECT * FROM hackloop.teams WHERE id=:id', id=team_id)
    if not team or team['status'] == 'disbanded':
        return []

    eid = team['event_id']
    event = one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid)
    if not event:
        return []

    # Get active members of the team
    members = rows(db, '''SELECT tm.*, u.display_name, tm.assigned_role 
      FROM hackloop.team_members tm 
      JOIN hackloop.users u ON u.id=tm.user_id 
      WHERE tm.team_id=:tid AND tm.left_at IS NULL''', tid=team_id)

    if len(members) >= event['max_team_size']:
        return []  # Team is full

    occupied_roles = {m['assigned_role'].lower() for m in members if m.get('assigned_role')}

    # Parse seeking roles
    seeking_roles = team.get('seeking_roles') or []
    if isinstance(seeking_roles, str):
        try: seeking_roles = json.loads(seeking_roles)
        except Exception: seeking_roles = []

    # Find registered participants for this event who are NOT on any active team
    candidates = rows(db, '''SELECT r.*, u.display_name, u.email 
      FROM hackloop.event_registrations r
      JOIN hackloop.users u ON u.id=r.user_id
      WHERE r.event_id=:eid 
        AND r.status='registered'
        AND NOT EXISTS (
          SELECT 1 FROM hackloop.team_members tm 
          WHERE tm.event_id=:eid AND tm.user_id=r.user_id AND tm.left_at IS NULL
        )''', eid=eid)

    # Event required skills
    req_skills = rows(db, '''SELECT DISTINCT s.name 
      FROM hackloop.event_roles r 
      JOIN hackloop.event_role_skills rs ON rs.event_role_id=r.id 
      JOIN hackloop.skills s ON s.id=rs.skill_id 
      WHERE r.event_id=:eid''', eid=eid)
    event_skill_names = {s['name'].lower() for s in req_skills}

    results = []
    for c in candidates:
        uid = c['user_id']
        
        # Check assessment status
        assessment_sub = one(db, '''SELECT evaluation_score, evaluation_details, selected_role, status 
          FROM hackloop.assessment_submissions 
          WHERE event_id=:eid AND user_id=:uid AND status='completed' 
          ORDER BY attempt_number DESC LIMIT 1''', eid=eid, uid=uid)

        # Candidate skills
        cand_skills = c.get('selected_skills') or []
        if isinstance(cand_skills, str):
            try: cand_skills = json.loads(cand_skills)
            except Exception: cand_skills = []
        cand_skill_names = {s.get('skill_name', '').lower() for s in cand_skills}

        # Candidate preferred roles
        pref_roles = c.get('preferred_roles') or []
        if isinstance(pref_roles, str):
            try: pref_roles = json.loads(pref_roles)
            except Exception: pref_roles = []

        reasons = []

        # 1. Role complement score
        role_score = 0.0
        best_matching_role = None
        for role_name in (seeking_roles or ['Contributor']):
            r_lower = role_name.lower()
            if r_lower not in occupied_roles:
                best_matching_role = role_name
                if any(pr.lower() == r_lower for pr in pref_roles):
                    role_score = 100.0
                    reasons.append(f"Directly fills seeking role '{role_name}' (candidate's stated preference)")
                    break
                else:
                    role_score = 75.0
                    reasons.append(f"Available to fill missing role '{role_name}'")
                    break

        if not best_matching_role and seeking_roles:
            role_score = 30.0

        # 2. Skill coverage score
        skill_score = 0.0
        if event_skill_names:
            overlap = event_skill_names.intersection(cand_skill_names)
            skill_score = min(100.0, (len(overlap) / len(event_skill_names)) * 100.0)
            if overlap:
                overlap_display = ", ".join(list(overlap)[:3])
                reasons.append(f"Covers event skills: {overlap_display}")
        else:
            skill_score = 70.0

        # Factor in evaluated assessment evidence if completed
        if assessment_sub and assessment_sub.get('evaluation_score'):
            eval_score = float(assessment_sub['evaluation_score'])
            skill_score = (skill_score * 0.4) + (eval_score * 0.6)
            reasons.append(f"Completed assessment score: {round(eval_score)}/100")

        # 3. Role preference score
        pref_score = 80.0 if pref_roles else 50.0

        # 4. Availability score
        avail = c.get('availability_hours_per_week', 10)
        avail_score = min(100.0, max(40.0, (avail / 15.0) * 100.0))
        if avail >= 10:
            reasons.append(f"{avail} hrs/week commitment")

        # Total weighted score (0 - 100)
        total_score = (
            role_score * WEIGHT_ROLE_COMPLEMENT +
            skill_score * WEIGHT_SKILL_COVERAGE +
            pref_score * WEIGHT_ROLE_PREFERENCE +
            avail_score * WEIGHT_AVAILABILITY
        )

        results.append({
            'user_id': str(uid),
            'display_name': c['display_name'],
            'match_score': round(total_score, 1),
            'suggested_role': best_matching_role or (pref_roles[0] if pref_roles else 'Contributor'),
            'skills': cand_skills,
            'experience_level': c.get('experience_level', 'intermediate'),
            'availability_hours': avail,
            'assessment_completed': bool(assessment_sub),
            'assessment_score': assessment_sub.get('evaluation_score') if assessment_sub else None,
            'explanation': "; ".join(reasons) if reasons else "Eligible registered candidate."
        })

    # Sort descending by match_score
    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results[:limit]

def get_team_matches_for_candidate(db, eid: UUID, user_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
    """Find recruiting teams looking for roles the candidate participant can fill."""
    reg = one(db, "SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid AND status='registered'",
              eid=eid, uid=user_id)
    if not reg:
        return []

    event = one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid)
    if not event:
        return []

    # Check if participant is already in an active team
    active_tm = one(db, 'SELECT 1 FROM hackloop.team_members WHERE event_id=:eid AND user_id=:uid AND left_at IS NULL',
                    eid=eid, uid=user_id)
    if active_tm:
        return []

    # Get candidate skills and preferred roles
    cand_skills = reg.get('selected_skills') or []
    if isinstance(cand_skills, str):
        try: cand_skills = json.loads(cand_skills)
        except Exception: cand_skills = []
    cand_skill_names = {s.get('skill_name', '').lower() for s in cand_skills}

    pref_roles = reg.get('preferred_roles') or []
    if isinstance(pref_roles, str):
        try: pref_roles = json.loads(pref_roles)
        except Exception: pref_roles = []
    pref_roles_lower = {r.lower() for r in pref_roles}

    # Assessment evidence
    assessment_sub = one(db, '''SELECT evaluation_score, evaluation_details, selected_role 
      FROM hackloop.assessment_submissions 
      WHERE event_id=:eid AND user_id=:uid AND status='completed' 
      ORDER BY attempt_number DESC LIMIT 1''', eid=eid, uid=user_id)

    # Get recruiting teams for this event
    teams = rows(db, '''SELECT t.*, u.display_name AS creator_name,
      (SELECT count(*) FROM hackloop.team_members tm WHERE tm.team_id=t.id AND tm.left_at IS NULL) AS member_count
      FROM hackloop.teams t
      JOIN hackloop.users u ON u.id=t.created_by
      WHERE t.event_id=:eid AND t.status='forming' AND t.is_recruiting=true
      ORDER BY t.created_at DESC''', eid=eid)

    results = []
    for team in teams:
        if team['member_count'] >= event['max_team_size']:
            continue

        # Get existing member roles
        members = rows(db, 'SELECT assigned_role, membership_role FROM hackloop.team_members WHERE team_id=:tid AND left_at IS NULL', tid=team['id'])
        occupied_roles = {m['assigned_role'].lower() for m in members if m.get('assigned_role')}

        seeking = team.get('seeking_roles') or []
        if isinstance(seeking, str):
            try: seeking = json.loads(seeking)
            except Exception: seeking = []

        reasons = []

        # Check role complement
        role_score = 40.0
        target_role = None
        for r in seeking:
            r_lower = r.lower()
            if r_lower not in occupied_roles:
                target_role = r
                if r_lower in pref_roles_lower:
                    role_score = 100.0
                    reasons.append(f"Seeking your preferred role: '{r}'")
                    break
                else:
                    role_score = 75.0
                    reasons.append(f"Seeking role: '{r}'")
                    break

        if not target_role:
            target_role = pref_roles[0] if pref_roles else 'Contributor'

        # Skill score
        skill_score = 70.0
        if assessment_sub and assessment_sub.get('evaluation_score'):
            eval_score = float(assessment_sub['evaluation_score'])
            skill_score = eval_score
            reasons.append(f"Your assessment score: {round(eval_score)}/100")

        reasons.append(f"Team has {team['member_count']}/{event['max_team_size']} members")

        total_score = (
            role_score * WEIGHT_ROLE_COMPLEMENT +
            skill_score * WEIGHT_SKILL_COVERAGE +
            80.0 * WEIGHT_ROLE_PREFERENCE +
            80.0 * WEIGHT_AVAILABILITY
        )

        results.append({
            'team_id': str(team['id']),
            'name': team['name'],
            'description': team['description'],
            'creator_name': team['creator_name'],
            'member_count': team['member_count'],
            'max_team_size': event['max_team_size'],
            'seeking_roles': seeking,
            'recommended_role_for_you': target_role,
            'match_score': round(total_score, 1),
            'explanation': "; ".join(reasons)
        })

    results.sort(key=lambda x: x['match_score'], reverse=True)
    return results[:limit]

