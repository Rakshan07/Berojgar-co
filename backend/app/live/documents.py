from uuid import UUID
from typing import Literal
import re
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from backend.app.db.session import get_db
from .auth import current_user
from .db import one, rows, execute, require
router=APIRouter(tags=['Private documents and organizer applications'])

@router.post('/profiles/me/documents',status_code=201)
async def upload(request:Request, category:Literal['affiliation','authorization','qualification','supporting'], filename:str,user=Depends(current_user),db=Depends(get_db)):
    require(0<len(filename)<=180 and not any(c in filename for c in '\r\n/\\'),422,'Choose a filename without path separators')
    data=bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        require(len(data)<=5242880,413,'Each document must be 5 MB or smaller')
    media='application/pdf' if data.startswith(b'%PDF-') else 'image/png' if data.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if data.startswith(b'\xff\xd8\xff') else None
    require(media,422,'Upload a PDF, PNG or JPEG file')
    execute(db,'SELECT id FROM hackloop.users WHERE id=:uid FOR UPDATE',uid=user['id'])
    require(one(db,'SELECT count(*) AS n FROM hackloop.profile_documents WHERE user_id=:uid',uid=user['id'])['n']<10,409,'You can keep up to 10 documents. Remove an unused document first.')
    doc=one(db,'INSERT INTO hackloop.profile_documents(user_id,category,filename,media_type,content) VALUES(:uid,:category,:filename,:media,:data) RETURNING id,category,filename',uid=user['id'],category=category,filename=filename,media=media,data=bytes(data))
    db.commit();return doc

@router.get('/profiles/me/documents')
def documents(user=Depends(current_user),db=Depends(get_db)):
    return rows(db,'SELECT id,category,filename,created_at FROM hackloop.profile_documents WHERE user_id=:uid ORDER BY created_at',uid=user['id'])

@router.get('/documents/{did}')
def download(did:UUID,user=Depends(current_user),db=Depends(get_db)):
    doc=require(one(db,'SELECT * FROM hackloop.profile_documents WHERE id=:id',id=did))
    require(doc['user_id']==user['id'] or 'admin' in user['roles'],403,'Private document')
    return Response(bytes(doc['content']),media_type=doc['media_type'],headers={'Content-Disposition':'attachment; filename="document.'+{'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'}[doc['media_type']]+'"','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'})

@router.delete('/profiles/me/documents/{did}',status_code=204)
def remove(did:UUID,user=Depends(current_user),db=Depends(get_db)):
    require(one(db,'SELECT id FROM hackloop.profile_documents WHERE id=:id AND user_id=:uid FOR UPDATE',id=did,uid=user['id']))
    require(not one(db,'SELECT 1 FROM hackloop.organizer_application_documents WHERE document_id=:id',id=did),409,'Submitted verification documents must be retained for review')
    execute(db,'DELETE FROM hackloop.profile_documents WHERE id=:id',id=did);db.commit()

class Application(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    university:str=Field(min_length=2,max_length=200)
    organization_name:str=Field(min_length=2,max_length=200)
    club_name:str=Field(min_length=2,max_length=200)
    lead_name:str=Field(min_length=2,max_length=100)
    work_email:EmailStr
    phone_number:str=Field(min_length=7,max_length=32)
    address:str=Field(min_length=5,max_length=500)
    city:str=Field(min_length=1,max_length=120)
    region:str=Field(min_length=1,max_length=120)
    postal_code:str=Field(min_length=3,max_length=12,pattern=r'^[A-Za-z0-9 -]+$')
    country_code:str=Field(pattern='^[A-Z]{2}$')
    qualifications:str=Field(min_length=5,max_length=4000)
    document_ids:list[UUID]=Field(min_length=3,max_length=10)
    @field_validator('phone_number')
    @classmethod
    def phone(cls,value):
        if not re.fullmatch(r'\+?[0-9 ()-]+',value) or not 7<=len(re.sub(r'\D','',value))<=15:raise ValueError('Enter a valid phone number with country code')
        return value

@router.post('/organizer/onboarding',status_code=201)
def submit(body:Application,user=Depends(current_user),db=Depends(get_db)):
    require(user['has_password'],409,'Create your website password before completing your profile.')
    require('organizer' in user['roles'],403,'Organizer account required')
    if body.country_code=='IN':require(bool(re.fullmatch(r'[1-9][0-9]{5}',body.postal_code)),422,'Enter a valid six-digit PIN code')
    org=require(one(db,"SELECT organization_id FROM hackloop.organization_members WHERE user_id=:uid AND role='owner' ORDER BY organization_id LIMIT 1",uid=user['id']))
    oid=org['organization_id'];execute(db,'SELECT id FROM hackloop.organizations WHERE id=:id FOR UPDATE',id=oid)
    require(not one(db,"SELECT 1 FROM hackloop.organizer_verification_requests WHERE organization_id=:oid AND status IN ('pending','approved')",oid=oid),409,'Your application is already submitted')
    docs=[]
    for did in set(body.document_ids):
        docs.append(require(one(db,'SELECT id,category FROM hackloop.profile_documents WHERE id=:id AND user_id=:uid FOR UPDATE',id=did,uid=user['id']),422,'Choose documents uploaded to your own account'))
    require({'affiliation','authorization','qualification'} <= {d['category'] for d in docs},422,'Upload affiliation, organizer authorization and qualification documents')
    result=one(db,"INSERT INTO hackloop.organizer_verification_requests(organization_id,applicant_id,applicant_notes) VALUES(:oid,:uid,'Details and private documents submitted') RETURNING id,status",oid=oid,uid=user['id'])
    details=body.model_dump(exclude={'document_ids'})
    execute(db,'INSERT INTO hackloop.organizer_application_details(request_id,'+','.join(details)+') VALUES(:rid,'+','.join(':'+k for k in details)+')',rid=result['id'],**details)
    for doc in docs:execute(db,'INSERT INTO hackloop.organizer_application_documents(request_id,document_id) VALUES(:rid,:did)',rid=result['id'],did=doc['id'])
    execute(db,'UPDATE hackloop.organizations SET name=:name WHERE id=:id',name=body.organization_name,id=oid)
    execute(db,'UPDATE hackloop.users SET display_name=:name WHERE id=:uid',name=body.lead_name,uid=user['id'])
    execute(db,'UPDATE hackloop.profiles SET institution=:institution,onboarding_completed_at=now() WHERE user_id=:uid',institution=body.university,uid=user['id'])
    execute(db,'''INSERT INTO hackloop.profile_private_details(user_id,phone_number,address_line_1,city,region,postal_code,country_code)
    VALUES(:uid,:phone,:address,:city,:region,:postal,:country) ON CONFLICT(user_id) DO UPDATE SET phone_number=EXCLUDED.phone_number,address_line_1=EXCLUDED.address_line_1,city=EXCLUDED.city,region=EXCLUDED.region,postal_code=EXCLUDED.postal_code,country_code=EXCLUDED.country_code''',uid=user['id'],phone=body.phone_number,address=body.address,city=body.city,region=body.region,postal=body.postal_code,country=body.country_code)
    db.commit();return result

@router.get('/admin/organizer-verifications')
def queue(user=Depends(current_user),db=Depends(get_db)):
    require('admin' in user['roles'],403,'Administrator permission required')
    applications=rows(db,'''SELECT v.id,v.status,v.created_at,v.review_notes,d.* FROM hackloop.organizer_verification_requests v
    JOIN hackloop.organizer_application_details d ON d.request_id=v.id ORDER BY v.created_at DESC LIMIT 100''')
    for item in applications:
        item['documents']=rows(db,'''SELECT d.id,d.filename,d.category FROM hackloop.profile_documents d JOIN hackloop.organizer_application_documents a ON a.document_id=d.id WHERE a.request_id=:id''',id=item['id'])
    return applications
