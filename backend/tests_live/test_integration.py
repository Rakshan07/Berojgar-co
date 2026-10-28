"""Integration tests: run ONLY against the disposable local PostgreSQL test instance."""
import os
os.environ['DATABASE_URL']=os.environ.get('TEST_DATABASE_URL','postgresql+psycopg://postgres@127.0.0.1:55439/postgres')
os.environ['PGPASSWORD']=''
import uuid
from datetime import datetime,timedelta,timezone
from fastapi.testclient import TestClient
from sqlalchemy import text
from backend.app.main import app
from backend.app.db.session import engine


client=TestClient(app)

from backend.tests_live.signup_helper import signup_token

def test_account_event_and_workspace_flow():
    assert (engine.url.port==55439 and engine.url.database=='postgres') or engine.url.database.startswith('codex_reset_test_')
    suffix=uuid.uuid4().hex[:12]
    password='Test-only-password-72!'
    def signup(label,role='participant'):
        email=f'{label}-{suffix}@example.com'
        response=client.post('/api/v1/auth/register',json={'verification_token':signup_token(email,role),'email':email,'full_name':label,'password':password,'role':role,**({'organization':'Test organization'} if role=='organizer' else {})})
        assert response.status_code==201,response.text
        login=client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password})
        assert login.status_code==200,login.text
        return response.json(),{'Authorization':'Bearer '+login.json()['access_token']},email
    member,headers,email=signup('Member')
    assert client.post('/api/v1/auth/login',json={'email_or_username':email,'password':password,'required_role':'organizer'}).status_code==403
    assert client.post('/api/v1/auth/register',json={'verification_token':signup_token(email,'organizer'),'email':email,'full_name':'Duplicate organizer','password':password,'role':'organizer','organization':'Test college'}).status_code==409
    assert client.get('/api/v1/auth/me',headers=headers).json()['roles']==['participant']
    other,other_headers,_=signup('Other')
    host,host_headers,_=signup('Organizer','organizer')
    assert client.post('/api/v1/auth/login',json={'email_or_username':_, 'password':password,'required_role':'organizer'}).status_code==200
    assert client.get('/api/v1/auth/me',headers={'X-User-Id':member['id']}).status_code==401
    assert client.post('/api/v1/auth/login',json={'email_or_username':email,'password':'wrong'}).status_code==401
    assert client.post('/api/v1/auth/register',json={'email':'admin@example.com','full_name':'Admin','password':password,'role':'admin'}).status_code==422
    assert client.get('/api/v1/auth/me',headers=headers).json()['onboarding_complete'] is False
    assert client.post('/api/v1/profiles/me/onboarding',headers=headers,json={}).status_code==422
    assert client.get('/api/v1/auth/me',headers=headers).json()['onboarding_complete'] is False
    details={'full_name':'Updated Member','institution':'Test College','course':'Computer Science','academic_year':2026,'phone_number':'1234567890','address_line_1':'Test address','city':'Bengaluru','region':'Karnataka','postal_code':'560001','country_code':'IN'}
    assert client.post('/api/v1/profiles/me/onboarding',headers=headers,json={**details,'academic_year':12}).status_code==422
    assert client.post('/api/v1/profiles/me/onboarding',headers=headers,json={**details,'institution':'   '}).status_code==422
    completed=client.post('/api/v1/profiles/me/onboarding',headers=headers,json=details)
    assert completed.status_code==200,completed.text
    assert completed.json()['academic_year']==2026
    assert completed.json()['onboarding_completed_at'] is not None
    assert client.get('/api/v1/auth/me',headers=headers).json()['onboarding_complete'] is True
    assert client.patch('/api/v1/profiles/me',headers=headers,json={'academic_year':2027}).status_code==200
    assert client.get('/api/v1/profiles/me',headers=headers).json()['academic_year']==2027
    assert client.patch('/api/v1/profiles/me',headers=headers,json={'academic_year':12}).status_code==422
    assert client.get('/api/v1/auth/me',headers=other_headers).json()['onboarding_complete'] is False
    assert client.patch('/api/v1/profiles/me',headers=headers,json={'full_name':'Updated Member','institution':'Test College','phone_number':'1234567890','course':'Computer Science','study_year':2,'bio':'Build together'}).status_code==200
    p=client.get('/api/v1/profiles/me',headers=headers).json()
    assert p['phone_number']=='1234567890' and p['institution']=='Test College'
    assert client.get('/api/v1/profiles/me',headers=other_headers).json()['phone_number'] is None
    assert client.patch('/api/v1/profiles/me',headers=headers,json={'user_id':other['id']}).status_code==422
    tomorrow=datetime.now(timezone.utc)+timedelta(days=1)
    payload={'title':'Integration event','category_id':'hackathon','description':'A real database integration test event','start_date':(tomorrow+timedelta(days=1)).isoformat(),'end_date':(tomorrow+timedelta(days=2)).isoformat(),'registration_deadline':tomorrow.isoformat(),'max_participants':1,'requirements':[{'skill_name':'Python'}]}
    assert client.post('/api/v1/events',headers=host_headers,json=payload).status_code==403
    organization=client.get('/api/v1/organizer/verification',headers=host_headers).json()[0]['organization_id']
    assert client.post('/api/v1/organizer/verification',headers=host_headers,json={'organization_id':organization,'evidence_storage_key':'fake.pdf'}).status_code==422
    assert client.get('/api/v1/auth/me',headers=host_headers).json()['onboarding_complete'] is False
    docs=[]
    for category in ['affiliation','authorization','qualification']:
        uploaded=client.post('/api/v1/profiles/me/documents',params={'category':category,'filename':'proof.pdf'},headers={**host_headers,'Content-Type':'application/pdf'},content=b'%PDF-1.4\nTest document')
        assert uploaded.status_code==201,uploaded.text
        docs.append(uploaded.json()['id'])
    assert client.get('/api/v1/documents/'+docs[0],headers=headers).status_code==403
    assert client.get('/api/v1/documents/'+docs[0],headers=host_headers).status_code==200
    assert client.post('/api/v1/profiles/me/documents',params={'category':'supporting','filename':'bad.html'},headers=host_headers,content=b'<script>bad</script>').status_code==422
    application={'university':'Test University','organization_name':'Test organization','club_name':'Test club','lead_name':'Test organizer','work_email':'organizer@example.com','phone_number':'+919876543210','address':'Test address','city':'Bengaluru','region':'Karnataka','postal_code':'560001','country_code':'IN','qualifications':'Qualified event organizer','document_ids':docs}
    assert client.post('/api/v1/organizer/onboarding',headers=host_headers,json={**application,'document_ids':docs[:2]}).status_code==422
    assert client.post('/api/v1/organizer/onboarding',headers=host_headers,json={**application,'phone_number':'wrong phone'}).status_code==422
    assert client.post('/api/v1/organizer/onboarding',headers=host_headers,json={**application,'postal_code':'12'}).status_code==422
    assert client.post('/api/v1/organizer/onboarding',headers=headers,json=application).status_code==403
    optional=client.post('/api/v1/profiles/me/documents',params={'category':'supporting','filename':'certificate.pdf'},headers=headers,content=b'%PDF-1.4\nOptional certificate')
    assert optional.status_code==201
    optional_id=optional.json()['id']
    assert client.get('/api/v1/documents/'+optional_id,headers=host_headers).status_code==403
    assert client.post('/api/v1/organizer/onboarding',headers=host_headers,json={**application,'document_ids':[docs[0],docs[1],optional_id]}).status_code==422
    assert client.delete('/api/v1/profiles/me/documents/'+optional_id,headers=headers).status_code==204
    assert client.post('/api/v1/profiles/me/documents',params={'category':'supporting','filename':'large.pdf'},headers=headers,content=b'%PDF-'+b'x'*5242880).status_code==413

    request=client.post('/api/v1/organizer/onboarding',headers=host_headers,json=application)

    assert request.status_code==201,request.text
    rid=request.json()['id']
    assert client.post('/api/v1/organizer/onboarding',headers=host_headers,json=application).status_code==409
    assert client.get('/api/v1/auth/me',headers=host_headers).json()['onboarding_complete'] is True
    assert client.delete('/api/v1/profiles/me/documents/'+docs[0],headers=host_headers).status_code==409
    assert client.get('/api/v1/admin/organizer-verifications',headers=host_headers).status_code==403
    assert client.post(f'/api/v1/admin/organizer-verifications/{rid}',headers=host_headers,json={'status':'approved','review_notes':'test'}).status_code==403
    # Assign administrator ONLY in this disposable test database, never via public signup.
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO hackloop.user_roles(user_id,role) VALUES(:uid,'admin')"),{'uid':other['id']})
    assert client.get('/api/v1/admin/organizer-verifications',headers=other_headers).json()[0]['documents']
    assert client.get('/api/v1/documents/'+docs[0],headers=other_headers).status_code==200
    assert client.post(f'/api/v1/admin/organizer-verifications/{rid}',headers=other_headers,json={'status':'approved','review_notes':'Evidence reviewed in test'}).status_code==200
    created=client.post('/api/v1/events',headers=host_headers,json=payload)
    assert created.status_code==201,created.text
    eid=created.json()['id']
    assert client.get(f'/api/v1/events/{eid}').status_code==401
    assert client.get(f'/api/v1/events/{eid}',headers=headers).status_code==404
    assert client.post(f'/api/v1/events/{eid}/publish',headers=headers).status_code==403
    assert client.get('/api/v1/events/mine',headers=host_headers).json()['total']==1
    published=client.post(f'/api/v1/events/{eid}/publish',headers=host_headers)
    assert published.status_code==200,published.text
    assert any(e['id']==eid for e in client.get('/api/v1/events?status=open').json()['items'])
    for _ in range(2): assert client.post(f'/api/v1/events/{eid}/register',headers=headers,json={}).status_code==200
    assert client.post(f'/api/v1/events/{eid}/register',headers=other_headers,json={}).status_code==409
    summary=client.get('/api/v1/workspace/me',headers=headers)
    assert summary.status_code==200,summary.text
    assert len(summary.json()['registrations'])==1
    assert summary.json()['progress']['total_xp']==0
    assert summary.json()['history']==[]
    assert client.get('/api/v1/challenges/xp/me',headers=headers).json()['total_xp']==0
    with engine.begin() as conn:
        outcome=conn.execute(text("INSERT INTO hackloop.event_outcomes(event_id,user_id,outcome_type,status,recorded_by,verified_by,verified_at) VALUES(:eid,:uid,'completed','verified',:host,:host,now()) RETURNING id"),{'eid':eid,'uid':member['id'],'host':host['id']}).scalar_one()
        rule=conn.execute(text("INSERT INTO hackloop.xp_rules(code,version,description,points) VALUES(:code,1,'Test-only reward',25) RETURNING id"),{'code':'test-'+suffix}).scalar_one()
        conn.execute(text("INSERT INTO hackloop.xp_ledger(user_id,outcome_id,rule_id,entry_type,points,reason,created_by) VALUES(:uid,:outcome,:rule,'award',25,'Test-only verified outcome',:host)"),{'uid':member['id'],'outcome':outcome,'rule':rule,'host':host['id']})
    history=client.get('/api/v1/workspace/me',headers=headers).json()
    assert history['history'][0]['xp_earned']==25
    assert history['progress']['total_xp']==25
    assert client.get('/api/v1/workspace/me',headers=other_headers).json()['history']==[]
    assert client.get('/api/v1/organizer/workspace',headers=headers).status_code==403
    assert client.get('/api/v1/organizer/workspace',headers=host_headers).status_code==200
    assert client.post('/api/v1/auth/logout',headers=headers).status_code==204
    assert client.get('/api/v1/auth/me',headers=headers).status_code==401
