import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { request, useResource } from '../../workspace/api';
import Documents from '../../workspace/Documents';
const fields=[['university','University / institution'],['organization_name','Organization name'],['club_name','Club name'],['lead_name','Lead organizer full name'],['work_email','Work email','email'],['phone_number','Phone number with country code','tel'],['address','Address'],['city','City'],['region','State / region'],['postal_code','PIN / postal code'],['country_code','Country code']];
export default function OrganizerDetails({profile}){
 const navigate=useNavigate();const status=useResource('/organizer/verification');
 const [form,setForm]=useState(()=>Object.fromEntries(fields.map(([key])=>[key,key==='lead_name'?profile.full_name:key==='work_email'?profile.email:key==='country_code'?'IN':''])));
 const [qualifications,setQualifications]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=status.data?.find(item=>['pending','approved'].includes(item.status));
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const docs=await request('/profiles/me/documents');
  if(!['affiliation','authorization','qualification'].every(category=>docs.some(doc=>doc.category===category)))throw new Error('Upload all three required document categories before submitting.');
  await request('/organizer/onboarding',{method:'POST',body:JSON.stringify({...form,country_code:form.country_code.toUpperCase(),qualifications,document_ids:docs.map(d=>d.id)})});status.reload();
 }catch(err){setError(err.message);}finally{setBusy(false);}}
 if(status.loading)return <p role="status">Loading verification status…</p>;
 if(status.error)return <p role="alert">{status.error}<button onClick={status.reload}>Try again</button></p>;
 if(active)return <section className="tw-panel"><div className="tw-formpanel"><h2>{active.status==='approved'?'Organizer verified':'Application submitted for review'}</h2><p>{active.status==='approved'?'Your organizer account has been approved.':'Your details and documents are saved. An administrator must approve your application before you can create or host events.'}</p><button className="tw-button" onClick={()=>navigate('/organizer',{replace:true})}>Continue to workspace</button></div></section>;
 return <><section className="tw-panel"><div className="tw-panelhead"><div><h2>Organizer verification</h2><p>All fields below are required. Your contact details and verification documents are shared only with administrators for review.</p></div></div><form id="organizer-details" className="tw-formpanel" onSubmit={submit}><div className="tw-fieldpair">{fields.map(([key,label,type='text'])=><label key={key} className="tw-field"><span>{label} *</span><input type={type} required value={form[key]} disabled={busy} maxLength={key==='country_code'?2:key==='address'?500:key==='phone_number'?32:key==='lead_name'?100:['city','region'].includes(key)?120:key==='postal_code'?12:200} minLength={key==='address'?5:1} onChange={e=>setForm({...form,[key]:e.target.value})} pattern={key==='postal_code'&&form.country_code.toUpperCase()==='IN'?'[1-9][0-9]{5}':key==='country_code'?'[A-Za-z]{2}':undefined}/></label>)}</div><label className="tw-field"><span>Qualifications and organizing experience *</span><textarea required minLength={5} maxLength={4000} value={qualifications} onChange={e=>setQualifications(e.target.value)} disabled={busy}/></label></form></section><Documents required/>{error&&<p className="tw-notice" role="alert">{error}</p>}<div className="tw-formactions"><Link to="/login">Back to sign in</Link><button form="organizer-details" className="tw-button" disabled={busy}>{busy?'Submitting…':'Submit for admin review'}</button></div></>;
}
