import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, UserRound } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { request, useResource } from '../../workspace/api';
import '../../workspace/workspace.css';

const fields = [
  ['full_name','Full name','text',100],
  ['phone_number','Phone number','tel',32],
  ['institution','College / institution','text',200],
  ['course','Course','text',200],
  ['academic_year','Academic year (YYYY)','number'],
  ['address_line_1','Address','text',250],
  ['city','City','text',120],
  ['region','State / region','text',120],
  ['postal_code','Postal code','text',32],
  ['country_code','Country code (e.g. IN)','text',2],
];
export default function CompleteProfile() {
  const signedIn = Boolean(localStorage.getItem('teamweave_token'));
  const profile = useResource('/profiles/me',signedIn);
  if (!signedIn) return <Navigate to="/login" replace/>;
  return <div id="tw-workspace-review" className="tw-onboarding"><header><Link to="/" aria-label="TeamWeave home"><BrandWordmark size={22}/></Link><span className="tw-badge">Account setup · Step 2 of 2</span></header><main className="tw-onboarding-main"><p className="tw-eyebrow">MAKE IT YOURS</p><h1>A few details. A better beginning.</h1><p className="tw-onboarding-intro">Complete your primary details before entering your workspace. You can update them later in My Profile.</p>{profile.loading ? <p role="status">Loading your account…</p> : profile.error ? <div className="tw-notice" role="alert"><p>{profile.error}</p><button className="tw-button" onClick={profile.reload}>Try again</button><Link to="/login">Sign in again</Link></div> : profile.data && <DetailsForm key={profile.data.user_id} profile={profile.data}/>}</main></div>;
}
function DetailsForm({profile}) {
  const navigate=useNavigate();
  const [form,setForm]=useState(()=>Object.fromEntries(fields.map(([key])=>[key,profile[key]??''])));
  const [bio,setBio]=useState(profile.bio||'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e) {
    e.preventDefault(); if(busy)return;setBusy(true);setError('');
    try {
      await request('/profiles/me/onboarding',{method:'POST',body:JSON.stringify({...form,academic_year:Number(form.academic_year),country_code:form.country_code.toUpperCase(),bio})});
      const account=await request('/auth/me');
      if(!account.onboarding_complete)throw new Error('Your details have not been confirmed. Please try again.');
      navigate(account.roles.includes('organizer')?'/organizer':'/dashboard',{replace:true});
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  }
  return <section className="tw-panel"><div className="tw-panelhead"><div><h2><UserRound size={18}/> Your primary details</h2><p>Contact details remain private to your account.</p></div></div><form className="tw-formpanel" onSubmit={submit}><label className="tw-field"><span>Email address</span><input value={profile.email||''} type="email" readOnly autoComplete="email"/></label><div className="tw-fieldpair">{fields.map(([key,label,type,maxLength])=><label className="tw-field" key={key}><span>{label}</span><input name={key} type={type} value={form[key]} required disabled={busy} minLength={key==='full_name'?2:key==='phone_number'?5:1} maxLength={maxLength} min={type==='number'?1900:undefined} max={type==='number'?2200:undefined} step={type==='number'?1:undefined} pattern={key==='country_code'?'[A-Za-z]{2}':undefined} onChange={e=>setForm({...form,[key]:key==='country_code'?e.target.value.toUpperCase():e.target.value})}/>{key==='academic_year'&&<small className="tw-subtle">Enter the calendar year, such as 2026 or 2027.</small>}</label>)}</div><label className="tw-field"><span>About you <small>(optional)</small></span><textarea value={bio} maxLength={4000} disabled={busy} onChange={e=>setBio(e.target.value)}/></label>{error&&<div className="tw-notice" role="alert">{error}</div>}<div className="tw-formactions"><span className="tw-subtle">Your details are saved before you continue.</span><button className="tw-button" disabled={busy}>{busy?'Saving your details…':'Save & continue'}<ArrowRight size={16}/></button></div></form></section>;
}
