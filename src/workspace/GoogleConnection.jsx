import { useState } from 'react';
import { request, useResource } from './api';
import { ProviderLogo } from '../components/auth/SocialSignIn';
export default function GoogleConnection(){
 const connection=useResource('/auth/oauth/connections');
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function connect(e){e.preventDefault();setBusy(true);setError('');try{const result=await request('/auth/oauth/google/link',{method:'POST',body:JSON.stringify({password})});setPassword('');window.location.assign(result.url);}catch(err){setError(err.message);setBusy(false);}}
 return <section className="tw-panel"><div className="tw-panelhead"><div><h2>Sign-in methods</h2><p>Connect Google to use the same profile, events, and progress with either sign-in method.</p></div></div>{connection.loading?<p role="status">Checking connection…</p>:connection.error?<><p role="alert">{connection.error}</p><button className="tw-button secondary" onClick={connection.reload}>Try again</button></>:connection.data?.google_connected?<p role="status">Google is connected. You can now use Continue with Google to sign in.</p>:<form onSubmit={connect} className="tw-formpanel"><p>Confirm your website password, then choose the Google account with the same email as your profile.</p><label className="tw-field"><span>Current website password</span><input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="tw-button secondary" disabled={busy}><ProviderLogo provider="google"/>{busy?'Connecting…':'Connect Google'}</button>{error&&<p role="alert">{error}</p>}</form>}</section>;
}
