import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { request } from '../../workspace/api';
const errors={link_expired:'Your session expired. Sign in with your website password and connect Google again.',link_email_mismatch:'Choose the Google account with the same email as your website profile. Nothing was linked.',link_conflict:'That Google account is already connected to another account. Nothing was changed.',email_exists:'This email already has an account. Please sign in using your original email/password or provider. Accounts are not linked automatically.',signup_required:'No account is linked to this provider yet. Choose Sign Up to create one.',wrong_role:'This is a participant account. Please use participant sign-in.',cancelled:'Sign-in was cancelled. You can try again or use your email.',unavailable:'This account is unavailable.',failed:'Provider sign-in could not be completed. Please try again.'};
const stages={browser_state:'The sign-in attempt expired or its browser cookie was missing. Start again from this website in the same browser tab.',provider_verification:'The backend could not verify the provider response. Please share the OAuth callback failed diagnostic line from the backend terminal.',account_creation:'The provider was verified, but your website account could not be prepared. Please share the OAuth callback failed diagnostic line from the backend terminal.',session_handoff:'Your sign-in could not be saved. Please try again.'};
export default function SocialCallback(){
 const [params]=useSearchParams();const code=params.get('error');const linking=params.get('link')==='google';
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState(code?(code==='failed'?(stages[params.get('stage')]||errors.failed):(errors[code]||errors.failed)):'');
 const exchange=useRef(null);const navigate=useNavigate();const {dispatch}=useApp();
 useEffect(()=>{
  if(code||linking)return;
  let active=true;
  if(!exchange.current)exchange.current=request('/auth/oauth/exchange',{method:'POST'}).then(async result=>{
    localStorage.setItem('teamweave_token',result.access_token);return request('/auth/me');
  });
  exchange.current.then(account=>{if(!active)return;const role=account.roles.includes('organizer')?'organizer':'participant';dispatch({type:'LOGIN',payload:{userId:account.id,role}});navigate(account.onboarding_complete?(role==='organizer'?'/organizer':'/dashboard'):'/complete-profile',{replace:true});}).catch(err=>{if(active)setError(err.message);});
  return()=>{active=false;};
 },[code,linking,dispatch,navigate]);
 async function confirmLink(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const result=await request('/auth/oauth/google/confirm-link',{method:'POST',body:JSON.stringify({password})});
   setPassword('');localStorage.setItem('teamweave_token',result.access_token);
   const account=await request('/auth/me');const role=account.roles.includes('organizer')?'organizer':'participant';
   dispatch({type:'LOGIN',payload:{userId:account.id,role}});
   navigate(account.onboarding_complete?(role==='organizer'?'/organizer':'/dashboard'):'/complete-profile',{replace:true});
  }catch(err){setError(err.message);}finally{setBusy(false);}
 }
 if(linking)return <main className="min-h-screen flex items-center justify-center bg-[var(--sf-bg)] text-[var(--sf-text)] p-6"><section className="w-full max-w-md rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-panel)] p-8 space-y-5"><h1 className="text-2xl font-semibold">Connect your existing account</h1><p>Your Google email matches an account you already created. Confirm your website password once to connect Google and keep all your profile details and events.</p><form onSubmit={confirmLink} className="space-y-4"><label className="block"><span className="block mb-2">Website password</span><input className="w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] p-3" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/></label><p className="text-sm text-[var(--sf-secondary)]">Use your website password, not your Google password. Next time, Continue with Google will sign you in directly.</p>{error&&<p role="alert" className="text-[var(--sf-accent-text)]">{error}</p>}<button className="w-full rounded-xl bg-[#C5ADE5] p-3 font-semibold disabled:opacity-60" disabled={busy}>{busy?'Connecting…':'Connect Google and sign in'}</button></form><Link className="inline-block text-[var(--sf-accent-text)]" to="/login">Back to sign in / reset password</Link></section></main>;
 return <main className="min-h-screen flex items-center justify-center bg-[var(--sf-bg)] text-[var(--sf-text)] p-6"><section className="max-w-md rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-panel)] p-8 space-y-5"><h1 className="text-2xl font-semibold">{error?'Let’s get you signed in':'Completing sign-in'}</h1>{error?<><p role="alert" className="text-[var(--sf-secondary)]">{error}</p><div className="flex flex-wrap gap-4 text-[var(--sf-accent-text)]"><Link to="/login">Sign in with email</Link><Link to="/login?tab=signup">Create account</Link><Link to="/organizer/auth?tab=signup">Organizer signup</Link></div></>:<p role="status">Opening your account…</p>}</section></main>;
}
