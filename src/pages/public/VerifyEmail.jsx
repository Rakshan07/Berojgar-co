import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { request } from '../../workspace/api';
import { passwordGuide,validNewPassword } from '../../workspace/passwordPolicy';
export default function VerifyEmail(){
 const location=useLocation();
 const [link]=useState(()=>location.state?.token?location.state:Object.fromEntries(new URLSearchParams(window.location.hash.slice(1))));
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(false);
 const navigate=useNavigate();const {dispatch}=useApp();
 useEffect(()=>{window.history.replaceState(null,'',window.location.pathname+window.location.search);},[]);
 const valid=Boolean(link.token&&link.email&&['participant','organizer'].includes(link.role));
 async function submit(e){e.preventDefault();if(busy||created)return;setError('');if(password!==confirm){setError('Passwords do not match.');return;}if(!validNewPassword(password)){setError(passwordGuide);return;}setBusy(true);try{
  await request('/auth/register',{method:'POST',body:JSON.stringify({email:link.email,full_name:'New member',password,role:link.role,verification_token:link.token})});setCreated(true);
  const result=await request('/auth/login',{method:'POST',body:JSON.stringify({email_or_username:link.email,password,required_role:link.role})});
  setPassword('');setConfirm('');localStorage.setItem('teamweave_token',result.access_token);dispatch({type:'LOGIN',payload:{userId:result.user_id,role:link.role}});navigate('/complete-profile',{replace:true});
 }catch(err){setError(err.message);}finally{setBusy(false);}}
 const input='mt-2 w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] p-3 text-ink';
 return <main className="min-h-screen flex items-center justify-center bg-[var(--sf-bg)] text-ink p-6"><section className="w-full max-w-md rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-panel)] p-8 space-y-5"><h1 className="text-2xl font-semibold">Create password</h1>{valid?<><p className="text-[var(--sf-secondary)]">Create your password for {link.email}. Next, you’ll complete your profile details.</p>{created?<p>Your account was created. <Link className="text-[var(--sf-accent-text)] underline" to={link.role==='organizer'?'/organizer/auth':'/login'}>Sign in to continue</Link>.</p>:<form onSubmit={submit} className="space-y-4"><label className="block">Create password<input className={input} required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><p className="text-sm text-[var(--sf-secondary)]">{passwordGuide}</p><label className="block">Confirm password<input className={input} required type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button disabled={busy} className="w-full rounded-xl bg-[#C5ADE5] p-3 font-semibold disabled:opacity-60">{busy?'Creating your account…':'Continue to profile'}</button></form>}</>:<p>Verify the code sent to your email to continue.</p>}{error&&<p role="alert" className="text-[var(--sf-accent-text)]">{error}</p>}<Link className="inline-block text-[var(--sf-accent-text)] underline" to={link.role==='organizer'?'/organizer/auth?tab=signup':'/login?tab=signup'}>Request a new verification code</Link></section></main>;
}
