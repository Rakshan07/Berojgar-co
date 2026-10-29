import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, model_validator
from backend.app.db.session import get_db
from .auth import current_user, bearer
from .db import one, rows, execute, require
from .ai_service import generate_event_brief, AIServiceError

router = APIRouter(prefix='/events', tags=['Events'])

CATEGORIES = {
    'hackathon': 'Hackathons',
    'technical_competition': 'Technical competitions',
    'research': 'Research',
    'music': 'Music',
    'creative': 'Creative collaborations',
    'other': 'Other team events',
    'coding_competition': 'Coding competitions',
    'ai_coding': 'AI coding',
    'ai_ml': 'AI & machine learning',
    'robotics': 'Robotics',
    'iot': 'IoT challenges',
    'technical_quiz': 'Technical quizzes',
    'startup_pitch': 'Startup pitches',
    'debate': 'Debate',
    'esports': 'Esports',
    'web_development': 'Web development',
    'mobile_development': 'Mobile development',
    'data_science': 'Data science',
    'cybersecurity': 'Cybersecurity',
    'project_exhibition': 'Project exhibitions',
    'research_presentation': 'Research presentations'
}

class Requirement(BaseModel):
    skill_name: str = Field(min_length=1, max_length=150)
    category: str = 'Technical'
    min_proficiency: int = Field(default=2, ge=1, le=5)
    required: bool = True
    target_count: int = Field(default=1, ge=1)

class Role(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    suggested_count: int = Field(default=1, ge=1, le=100)

class EventCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=3, max_length=200)
    category_id: str
    description: str = Field(min_length=10, max_length=20000)
    rules: Optional[str] = Field(default=None, max_length=10000)
    eligibility: Optional[str] = Field(default=None, max_length=5000)
    expected_deliverables: Optional[str] = Field(default=None, max_length=10000)
    constraints_and_tools: Optional[str] = Field(default=None, max_length=10000)
    judging_criteria: Optional[str] = Field(default=None, max_length=10000)
    mode: Literal['remote', 'in-person', 'hybrid'] = 'hybrid'
    location: Optional[str] = Field(default=None, max_length=500)
    min_team_size: int = Field(default=2, ge=1, le=100)
    max_team_size: int = Field(default=5, ge=1, le=100)
    max_participants: int = Field(default=100, ge=1, le=100000)
    start_date: AwareDatetime
    end_date: AwareDatetime
    registration_deadline: AwareDatetime
    requirements: List[Requirement] = Field(default_factory=list, max_length=50)
    roles: List[Role] = Field(default_factory=list, max_length=30)
    tags: List[str] = Field(default_factory=list, max_length=20)

    @model_validator(mode='after')
    def validate_schedule(self):
        if self.category_id not in CATEGORIES:
            raise ValueError('Unsupported category')
        if not (datetime.now(timezone.utc) < self.registration_deadline <= self.start_date < self.end_date):
            raise ValueError('Registration must close in the future, before the event starts and ends')
        if self.max_team_size < self.min_team_size:
            raise ValueError('Maximum team size must be at least minimum')
        if self.tags:
            raise ValueError('Tags are not supported by this schema yet')
        return self

class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=10, max_length=20000)
    rules: Optional[str] = Field(default=None, max_length=10000)
    eligibility: Optional[str] = Field(default=None, max_length=5000)
    expected_deliverables: Optional[str] = Field(default=None, max_length=10000)
    constraints_and_tools: Optional[str] = Field(default=None, max_length=10000)
    judging_criteria: Optional[str] = Field(default=None, max_length=10000)
    min_team_size: Optional[int] = Field(default=None, ge=1, le=100)
    max_team_size: Optional[int] = Field(default=None, ge=1, le=100)
    requirements: Optional[List[Requirement]] = None
    roles: Optional[List[Role]] = None
    event_brief: Optional[Dict[str, Any]] = None

class SkillRegistration(BaseModel):
    skill_name: str = Field(min_length=1, max_length=100)
    experience_level: Literal['beginner', 'intermediate', 'advanced'] = 'intermediate'

class EventRegisterBody(BaseModel):
    selected_skills: List[SkillRegistration] = Field(default_factory=list, max_length=30)
    experience_level: Literal['beginner', 'intermediate', 'advanced'] = 'intermediate'
    preferred_roles: List[str] = Field(default_factory=list, max_length=10)
    relevant_experience: Optional[str] = Field(default=None, max_length=5000)
    availability_hours_per_week: int = Field(default=10, ge=1, le=100)
    contribution_intent: Optional[str] = Field(default=None, max_length=5000)

def approved_organization(db, uid):
    return one(db, '''SELECT m.organization_id FROM hackloop.organization_members m
      JOIN hackloop.organizer_verification_requests v ON v.organization_id=m.organization_id
      WHERE m.user_id=:uid AND m.role IN ('owner','manager') AND v.status='approved' ORDER BY v.reviewed_at DESC LIMIT 1''', uid=uid)

def event_response(db, e):
    now = datetime.now(timezone.utc)
    status = 'open' if e['status'] == 'published' and e['registration_opens_at'] <= now < e['registration_closes_at'] else e['status']
    
    req = rows(db, '''SELECT DISTINCT s.id, s.name AS skill_name, s.category, NULL::smallint AS min_proficiency, rs.importance 
      FROM hackloop.event_roles r
      JOIN hackloop.event_role_skills rs ON rs.event_role_id=r.id 
      JOIN hackloop.skills s ON s.id=rs.skill_id WHERE r.event_id=:eid''', eid=e['id'])
    
    event_roles = rows(db, '''SELECT id, name, minimum_per_team, maximum_per_team AS suggested_count 
      FROM hackloop.event_roles WHERE event_id=:eid ORDER BY name''', eid=e['id'])

    registered_count = one(db, "SELECT count(*) AS n FROM hackloop.event_registrations WHERE event_id=:eid AND status='registered'", eid=e['id'])['n']

    return {
        **e,
        'category_id': e['category'],
        'category_name': CATEGORIES.get(e['category'], e['category']),
        'organizer_id': e['created_by'],
        'status': status,
        'start_date': e['starts_at'],
        'end_date': e['ends_at'],
        'registration_deadline': e['registration_closes_at'],
        'mode': {'online': 'remote', 'onsite': 'in-person', 'hybrid': 'hybrid'}.get(e['event_mode'], 'hybrid'),
        'location': e['venue'],
        'max_participants': e['participant_capacity'],
        'requirements': req,
        'roles': event_roles,
        'tags': [],
        'version': e.get('version', 1),
        'brief_version': e.get('brief_version', 1),
        'event_brief': e.get('event_brief'),
        'rules': e.get('rules'),
        'eligibility': e.get('eligibility'),
        'expected_deliverables': e.get('expected_deliverables'),
        'constraints_and_tools': e.get('constraints_and_tools'),
        'judging_criteria': e.get('judging_criteria'),
        'registered_count': registered_count
    }

@router.get('/categories')
def categories():
    return [{'id': k, 'name': v, 'color': 'garnet'} for k, v in CATEGORIES.items()]

@router.get('')
def events(category: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = Query(None, max_length=200), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db = Depends(get_db)):
    condition = "status IN ('published','completed')"
    params = {'category': category, 'search': f'%{search}%' if search else None, 'limit': limit, 'offset': (page - 1) * limit}
    if status == 'open':
        condition = "status='published' AND registration_opens_at<=now() AND registration_closes_at>now()"
    condition += ' AND (CAST(:category AS text) IS NULL OR category=:category) AND (CAST(:search AS text) IS NULL OR title ILIKE :search OR description ILIKE :search)'
    total = one(db, f'SELECT count(*) AS n FROM hackloop.events WHERE {condition}', **params)['n']
    result = rows(db, f'SELECT * FROM hackloop.events WHERE {condition} ORDER BY starts_at,id LIMIT :limit OFFSET :offset', **params)
    return {'items': [event_response(db, e) for e in result], 'total': total, 'page': page, 'limit': limit, 'has_more': page * limit < total}

@router.get('/mine')
def mine(user = Depends(current_user), db = Depends(get_db)):
    result = rows(db, 'SELECT * FROM hackloop.events WHERE created_by=:uid ORDER BY created_at DESC,id', uid=user['id'])
    return {'items': [event_response(db, e) for e in result], 'total': len(result), 'has_more': False}

@router.post('', status_code=201)
def create(body: EventCreate, user = Depends(current_user), db = Depends(get_db)):
    org = require(approved_organization(db, user['id']), 403, 'An approved organizer organization is required before creating events')
    e = one(db, '''INSERT INTO hackloop.events(organization_id,created_by,title,slug,description,category,event_mode,venue,
      registration_opens_at,registration_closes_at,starts_at,ends_at,min_team_size,max_team_size,participant_capacity,
      rules,eligibility,expected_deliverables,constraints_and_tools,judging_criteria,version,brief_version)
      VALUES(:oid,:uid,:title,:slug,:description,:category,:mode,:location,now(),:deadline,:start,:end,:min,:max,:capacity,
      :rules,:eligibility,:deliverables,:constraints,:judging,1,1) RETURNING *''',
      oid=org['organization_id'], uid=user['id'], title=body.title.strip(), slug='event-' + secrets.token_hex(12),
      description=body.description.strip(), category=body.category_id,
      mode={'remote': 'online', 'in-person': 'onsite', 'hybrid': 'hybrid'}[body.mode],
      location=body.location, deadline=body.registration_deadline, start=body.start_date, end=body.end_date,
      min=body.min_team_size, max=body.max_team_size, capacity=body.max_participants,
      rules=body.rules, eligibility=body.eligibility, deliverables=body.expected_deliverables,
      constraints=body.constraints_and_tools, judging=body.judging_criteria)

    roles = body.roles or ([Role(name='Contributor')] if body.requirements else [])
    for role in roles:
        r = one(db, '''INSERT INTO hackloop.event_roles(event_id,name,minimum_per_team,maximum_per_team) 
          VALUES(:eid,:name,0,:maximum) RETURNING id''', eid=e['id'], name=role.name.strip(), maximum=role.suggested_count)
        for skill in body.requirements:
            execute(db, "INSERT INTO hackloop.skills(name,category) VALUES(:name,:category) ON CONFLICT (lower(name)) DO NOTHING",
                    name=skill.skill_name.strip(), category=skill.category)
            s = one(db, 'SELECT id FROM hackloop.skills WHERE lower(name)=lower(:name)', name=skill.skill_name.strip())
            execute(db, 'INSERT INTO hackloop.event_role_skills(event_role_id,skill_id,importance) VALUES(:rid,:sid,3) ON CONFLICT DO NOTHING',
                    rid=r['id'], sid=s['id'])
    db.commit()
    return event_response(db, e)

@router.get('/{eid}')
def detail(eid: UUID, auth = Depends(bearer), db = Depends(get_db)):
    e = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid))
    if e['status'] not in ('published', 'completed'):
        user = current_user(auth, db)
        require(e['created_by'] == user['id'], 404, 'Event not found')
    return event_response(db, e)

@router.patch('/{eid}')
def update(eid: UUID, body: EventUpdate, user = Depends(current_user), db = Depends(get_db)):
    e = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id FOR UPDATE', id=eid))
    require(e['created_by'] == user['id'], 403, 'Only the event owner can modify this event')
    require(e['status'] == 'draft', 409, 'Only draft events can be edited')

    new_version = e.get('version', 1)
    if body.title or body.description or body.rules or body.expected_deliverables or body.roles or body.requirements:
        new_version += 1

    execute(db, '''UPDATE hackloop.events SET 
      title=COALESCE(:title, title),
      description=COALESCE(:description, description),
      rules=COALESCE(:rules, rules),
      eligibility=COALESCE(:eligibility, eligibility),
      expected_deliverables=COALESCE(:deliverables, expected_deliverables),
      constraints_and_tools=COALESCE(:constraints, constraints_and_tools),
      judging_criteria=COALESCE(:judging, judging_criteria),
      min_team_size=COALESCE(:min_team_size, min_team_size),
      max_team_size=COALESCE(:max_team_size, max_team_size),
      event_brief=COALESCE(:event_brief, event_brief),
      version=:version,
      updated_at=now()
      WHERE id=:id''',
      id=eid, title=body.title.strip() if body.title else None,
      description=body.description.strip() if body.description else None,
      rules=body.rules, eligibility=body.eligibility,
      deliverables=body.expected_deliverables, constraints=body.constraints_and_tools,
      judging=body.judging_criteria, min_team_size=body.min_team_size,
      max_team_size=body.max_team_size,
      event_brief=json.dumps(body.event_brief) if body.event_brief else None,
      version=new_version)

    if body.roles is not None:
        execute(db, 'DELETE FROM hackloop.event_roles WHERE event_id=:eid', eid=eid)
        for role in body.roles:
            r = one(db, '''INSERT INTO hackloop.event_roles(event_id,name,minimum_per_team,maximum_per_team) 
              VALUES(:eid,:name,0,:maximum) RETURNING id''', eid=eid, name=role.name.strip(), maximum=role.suggested_count)
            reqs = body.requirements or []
            for skill in reqs:
                execute(db, "INSERT INTO hackloop.skills(name,category) VALUES(:name,:category) ON CONFLICT (lower(name)) DO NOTHING",
                        name=skill.skill_name.strip(), category=skill.category)
                s = one(db, 'SELECT id FROM hackloop.skills WHERE lower(name)=lower(:name)', name=skill.skill_name.strip())
                execute(db, 'INSERT INTO hackloop.event_role_skills(event_role_id,skill_id,importance) VALUES(:rid,:sid,3) ON CONFLICT DO NOTHING',
                        rid=r['id'], sid=s['id'])

    db.commit()
    updated = one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid)
    return event_response(db, updated)

@router.post('/{eid}/ai-brief')
async def ai_brief(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    """Generate structured AI event brief for organizer review before publishing."""
    e = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id', id=eid))
    require(e['created_by'] == user['id'], 403, 'Only the event owner can generate the event brief')
    require(e['status'] == 'draft', 409, 'Only draft events can generate new briefs')

    org = approved_organization(db, user['id'])
    require(org and org['organization_id'] == e['organization_id'], 403, 'Organizer approval is required')

    try:
        brief = await generate_event_brief(
            title=e['title'],
            category=e['category'],
            description=e['description'],
            rules=e.get('rules'),
            deliverables=e.get('expected_deliverables'),
            constraints=e.get('constraints_and_tools'),
            judging_criteria=e.get('judging_criteria'),
            min_team_size=e.get('min_team_size', 2),
            max_team_size=e.get('max_team_size', 5)
        )
    except AIServiceError as err:
        raise HTTPException(status_code=503, detail=str(err))

    brief_dict = brief.model_dump()
    new_brief_version = (e.get('brief_version') or 1) + 1

    execute(db, '''UPDATE hackloop.events SET 
      event_brief=:brief, 
      brief_version=:bv,
      updated_at=now() 
      WHERE id=:id''',
      id=eid, brief=json.dumps(brief_dict), bv=new_brief_version)
    db.commit()

    return {'event_id': str(eid), 'brief_version': new_brief_version, 'brief': brief_dict}

@router.post('/{eid}/publish')
def publish(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    e = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id FOR UPDATE', id=eid))
    require(e['created_by'] == user['id'], 403, 'Only the event owner can publish')
    org = approved_organization(db, user['id'])
    require(org and org['organization_id'] == e['organization_id'], 403, 'Organizer approval is required')
    require(e['status'] == 'draft' and e['registration_closes_at'] > datetime.now(timezone.utc), 409, 'Only a current draft can be published')

    execute(db, "UPDATE hackloop.events SET status='published', updated_at=now() WHERE id=:id", id=eid)

    # Ensure hackloop.assessments has a published entry for (event_id, version)
    current_ver = e.get('version', 1)
    execute(db, '''INSERT INTO hackloop.assessments(event_id, version, title, instructions, status, created_by)
      VALUES(:eid, :ver, :title, :instructions, 'published', :uid)
      ON CONFLICT (event_id, version) DO UPDATE SET status='published' ''',
      eid=eid, ver=current_ver, title=f"Case Study Assessment - {e['title']}",
      instructions="Complete the scenario-based practical questions to demonstrate your capabilities for team matching.",
      uid=user['id'])

    db.commit()
    return detail(eid, None, db)

@router.post('/{eid}/register')
def register(eid: UUID, body: Optional[EventRegisterBody] = None, user = Depends(current_user), db = Depends(get_db)):
    e = require(one(db, 'SELECT * FROM hackloop.events WHERE id=:id FOR UPDATE', id=eid))
    require('participant' in user['roles'] and 'organizer' not in user['roles'], 403, 'Organizer accounts cannot participate in events. Use a participant account.')
    now = datetime.now(timezone.utc)
    require(e['status'] == 'published' and e['registration_opens_at'] <= now < e['registration_closes_at'], 409, 'Registration is closed')

    previous = one(db, 'SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid', eid=eid, uid=user['id'])
    require(not previous or previous['status'] != 'disqualified', 403, 'Registration is not permitted')

    count = one(db, "SELECT count(*) AS n FROM hackloop.event_registrations WHERE event_id=:eid AND status='registered'", eid=eid)['n']
    require(e['participant_capacity'] is None or previous or count < e['participant_capacity'], 409, 'This event is full')

    # Event-specific registration data
    selected_skills = [s.model_dump() for s in (body.selected_skills if body else [])]
    experience_level = (body.experience_level if body else 'intermediate')
    preferred_roles = (body.preferred_roles if body else [])
    relevant_experience = (body.relevant_experience if body else None)
    availability = (body.availability_hours_per_week if body else 10)
    intent = (body.contribution_intent if body else None)

    # If skills were empty, pre-fill from global user profile skills if present
    if not selected_skills:
        user_skills = rows(db, '''SELECT s.name AS skill_name, COALESCE(us.proficiency, 2) AS proficiency 
          FROM hackloop.user_skills us JOIN hackloop.skills s ON s.id=us.skill_id WHERE us.user_id=:uid''', uid=user['id'])
        level_map = {1: 'beginner', 2: 'intermediate', 3: 'intermediate', 4: 'advanced', 5: 'advanced'}
        selected_skills = [{'skill_name': s['skill_name'], 'experience_level': level_map.get(s['proficiency'], 'intermediate')} for s in user_skills]

    # If preferred roles empty, select first role from event roles
    if not preferred_roles:
        first_role = one(db, 'SELECT name FROM hackloop.event_roles WHERE event_id=:eid LIMIT 1', eid=eid)
        if first_role:
            preferred_roles = [first_role['name']]

    result = one(db, '''INSERT INTO hackloop.event_registrations(
        event_id, user_id, status, selected_skills, experience_level, preferred_roles,
        relevant_experience, availability_hours_per_week, contribution_intent, registered_at, updated_at
      ) VALUES (
        :eid, :uid, 'registered', :skills, :level, :roles, :exp, :avail, :intent, now(), now()
      ) ON CONFLICT (event_id, user_id) DO UPDATE SET 
        status='registered',
        selected_skills=COALESCE(EXCLUDED.selected_skills, hackloop.event_registrations.selected_skills),
        experience_level=COALESCE(EXCLUDED.experience_level, hackloop.event_registrations.experience_level),
        preferred_roles=COALESCE(EXCLUDED.preferred_roles, hackloop.event_registrations.preferred_roles),
        relevant_experience=COALESCE(EXCLUDED.relevant_experience, hackloop.event_registrations.relevant_experience),
        availability_hours_per_week=COALESCE(EXCLUDED.availability_hours_per_week, hackloop.event_registrations.availability_hours_per_week),
        contribution_intent=COALESCE(EXCLUDED.contribution_intent, hackloop.event_registrations.contribution_intent),
        updated_at=now()
      RETURNING *''',
      eid=eid, uid=user['id'], skills=json.dumps(selected_skills), level=experience_level,
      roles=json.dumps(preferred_roles), exp=relevant_experience, avail=availability, intent=intent)

    db.commit()
    return result

@router.get('/{eid}/registration')
def get_registration(eid: UUID, user = Depends(current_user), db = Depends(get_db)):
    reg = one(db, 'SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid', eid=eid, uid=user['id'])
    if not reg:
        return {'registered': False}
    return {'registered': True, 'registration': reg}
