from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
import secrets
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime, model_validator
from backend.app.db.session import get_db
from .auth import current_user, bearer
from .db import one, rows, execute, require
router=APIRouter(prefix='/events',tags=['Events'])
CATEGORIES={'hackathon':'Hackathons','technical_competition':'Technical competitions','research':'Research','music':'Music','creative':'Creative collaborations','other':'Other team events','coding_competition':'Coding competitions','ai_coding':'AI coding','ai_ml':'AI & machine learning','robotics':'Robotics','iot':'IoT challenges','technical_quiz':'Technical quizzes','startup_pitch':'Startup pitches','debate':'Debate','esports':'Esports','web_development':'Web development','mobile_development':'Mobile development','data_science':'Data science','cybersecurity':'Cybersecurity','project_exhibition':'Project exhibitions','research_presentation':'Research presentations'}
class Requirement(BaseModel):
    skill_name:str=Field(min_length=1,max_length=150)
    category:str='Technical'
    min_proficiency:int=Field(default=2,ge=1,le=5)
    required:bool=True
    target_count:int=Field(default=1,ge=1)
class Role(BaseModel):
    name:str=Field(min_length=1,max_length=100)
    suggested_count:int=Field(default=1,ge=1,le=100)
class EventCreate(BaseModel):
    model_config=ConfigDict(extra='forbid')
    title:str=Field(min_length=3,max_length=200)
    category_id:str
    description:str=Field(min_length=10,max_length=20000)
    mode:Literal['remote','in-person','hybrid']='hybrid'
    location:str | None=Field(default=None,max_length=500)
    min_team_size:int=Field(default=2,ge=1,le=100)
    max_team_size:int=Field(default=5,ge=1,le=100)
    max_participants:int=Field(default=100,ge=1,le=100000)
    start_date:AwareDatetime
    end_date:AwareDatetime
    registration_deadline:AwareDatetime
    requirements:list[Requirement]=Field(default_factory=list,max_length=50)
    roles:list[Role]=Field(default_factory=list,max_length=30)
    tags:list[str]=Field(default_factory=list,max_length=20)
    @model_validator(mode='after')
    def validate_schedule(self):
        if self.category_id not in CATEGORIES: raise ValueError('Unsupported category')
        if not (datetime.now(timezone.utc)<self.registration_deadline<=self.start_date<self.end_date): raise ValueError('Registration must close in the future, before the event starts and ends')
        if self.max_team_size<self.min_team_size: raise ValueError('Maximum team size must be at least minimum')
        if self.tags: raise ValueError('Tags are not supported by this schema yet')
        return self

def approved_organization(db,uid):
    return one(db,'''SELECT m.organization_id FROM hackloop.organization_members m
      JOIN hackloop.organizer_verification_requests v ON v.organization_id=m.organization_id
      WHERE m.user_id=:uid AND m.role IN ('owner','manager') AND v.status='approved' ORDER BY v.reviewed_at DESC LIMIT 1''',uid=uid)

def event_response(db,e):
    now=datetime.now(timezone.utc)
    status='open' if e['status']=='published' and e['registration_opens_at']<=now<e['registration_closes_at'] else e['status']
    req=rows(db,'''SELECT DISTINCT s.id,s.name AS skill_name,s.category FROM hackloop.event_roles r
      JOIN hackloop.event_role_skills rs ON rs.event_role_id=r.id JOIN hackloop.skills s ON s.id=rs.skill_id WHERE r.event_id=:eid''',eid=e['id'])
    return {**e,'category_id':e['category'],'category_name':CATEGORIES.get(e['category'],e['category']),'organizer_id':e['created_by'],
      'status':status,'start_date':e['starts_at'],'end_date':e['ends_at'],'registration_deadline':e['registration_closes_at'],
      'mode':{'online':'remote','onsite':'in-person','hybrid':'hybrid'}[e['event_mode']],'location':e['venue'],
      'max_participants':e['participant_capacity'],'requirements':req,'tags':[],
      'registered_count':one(db,"SELECT count(*) AS n FROM hackloop.event_registrations WHERE event_id=:eid AND status='registered'",eid=e['id'])['n']}

@router.get('/categories')
def categories(): return [{'id':k,'name':v,'color':'garnet'} for k,v in CATEGORIES.items()]

@router.get('')
def events(category:str|None=None,status:str|None=None,search:str|None=Query(None,max_length=200),page:int=Query(1,ge=1),limit:int=Query(20,ge=1,le=100),db=Depends(get_db)):
    condition="status IN ('published','completed')"
    params={'category':category,'search':f'%{search}%' if search else None,'limit':limit,'offset':(page-1)*limit}
    if status=='open': condition="status='published' AND registration_opens_at<=now() AND registration_closes_at>now()"
    condition += ' AND (CAST(:category AS text) IS NULL OR category=:category) AND (CAST(:search AS text) IS NULL OR title ILIKE :search OR description ILIKE :search)'
    total=one(db,f'SELECT count(*) AS n FROM hackloop.events WHERE {condition}',**params)['n']
    result=rows(db,f'SELECT * FROM hackloop.events WHERE {condition} ORDER BY starts_at,id LIMIT :limit OFFSET :offset',**params)
    return {'items':[event_response(db,e) for e in result],'total':total,'page':page,'limit':limit,'has_more':page*limit<total}

@router.get('/mine')
def mine(user=Depends(current_user),db=Depends(get_db)):
    result=rows(db,'SELECT * FROM hackloop.events WHERE created_by=:uid ORDER BY created_at DESC,id',uid=user['id'])
    return {'items':[event_response(db,e) for e in result],'total':len(result),'has_more':False}

@router.post('',status_code=201)
def create(body:EventCreate,user=Depends(current_user),db=Depends(get_db)):
    org=require(approved_organization(db,user['id']),403,'An approved organizer organization is required before creating events')
    e=one(db,'''INSERT INTO hackloop.events(organization_id,created_by,title,slug,description,category,event_mode,venue,registration_opens_at,registration_closes_at,starts_at,ends_at,min_team_size,max_team_size,participant_capacity)
      VALUES(:oid,:uid,:title,:slug,:description,:category,:mode,:location,now(),:deadline,:start,:end,:min,:max,:capacity) RETURNING *''',
      oid=org['organization_id'],uid=user['id'],title=body.title.strip(),slug='event-'+secrets.token_hex(12),description=body.description.strip(),category=body.category_id,mode={'remote':'online','in-person':'onsite','hybrid':'hybrid'}[body.mode],location=body.location,deadline=body.registration_deadline,start=body.start_date,end=body.end_date,min=body.min_team_size,max=body.max_team_size,capacity=body.max_participants)
    # Current database stores skill requirements against event roles.
    roles=body.roles or ([Role(name='Contributor')] if body.requirements else [])
    for role in roles:
        r=one(db,'''INSERT INTO hackloop.event_roles(event_id,name,minimum_per_team,maximum_per_team) VALUES(:eid,:name,0,:maximum) RETURNING id''',eid=e['id'],name=role.name,maximum=role.suggested_count)
        for skill in body.requirements:
            execute(db,"INSERT INTO hackloop.skills(name,category) VALUES(:name,:category) ON CONFLICT (lower(name)) DO NOTHING",name=skill.skill_name.strip(),category=skill.category)
            s=one(db,'SELECT id FROM hackloop.skills WHERE lower(name)=lower(:name)',name=skill.skill_name.strip())
            execute(db,'INSERT INTO hackloop.event_role_skills(event_role_id,skill_id,importance) VALUES(:rid,:sid,3) ON CONFLICT DO NOTHING',rid=r['id'],sid=s['id'])
    db.commit()
    return event_response(db,e)

@router.get('/{eid}')
def detail(eid:UUID,auth=Depends(bearer),db=Depends(get_db)):
    e=require(one(db,'SELECT * FROM hackloop.events WHERE id=:id',id=eid))
    if e['status'] not in ('published','completed'):
        user=current_user(auth,db)
        require(e['created_by']==user['id'],404,'Event not found')
    return event_response(db,e)

@router.post('/{eid}/publish')
def publish(eid:UUID,user=Depends(current_user),db=Depends(get_db)):
    e=require(one(db,'SELECT * FROM hackloop.events WHERE id=:id FOR UPDATE',id=eid))
    require(e['created_by']==user['id'],403,'Only the event owner can publish')
    org=approved_organization(db,user['id'])
    require(org and org['organization_id']==e['organization_id'],403,'Organizer approval is required')
    require(e['status']=='draft' and e['registration_closes_at']>datetime.now(timezone.utc),409,'Only a current draft can be published')
    execute(db,"UPDATE hackloop.events SET status='published' WHERE id=:id",id=eid)
    db.commit()
    return detail(eid,None,db)

@router.post('/{eid}/register')
def register(eid:UUID,user=Depends(current_user),db=Depends(get_db)):
    e=require(one(db,'SELECT * FROM hackloop.events WHERE id=:id FOR UPDATE',id=eid))
    now=datetime.now(timezone.utc)
    require(e['status']=='published' and e['registration_opens_at']<=now<e['registration_closes_at'],409,'Registration is closed')
    previous=one(db,'SELECT * FROM hackloop.event_registrations WHERE event_id=:eid AND user_id=:uid',eid=eid,uid=user['id'])
    if previous and previous['status']=='registered': return previous
    require(not previous or previous['status']!='disqualified',403,'Registration is not permitted')
    count=one(db,"SELECT count(*) AS n FROM hackloop.event_registrations WHERE event_id=:eid AND status='registered'",eid=eid)['n']
    require(e['participant_capacity'] is None or count<e['participant_capacity'],409,'This event is full')
    result=one(db,"INSERT INTO hackloop.event_registrations(event_id,user_id) VALUES(:eid,:uid) ON CONFLICT(event_id,user_id) DO UPDATE SET status='registered' RETURNING *",eid=eid,uid=user['id'])
    db.commit()
    return result
