import { passwordGuide, validNewPassword } from '../../workspace/passwordPolicy';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { request } from '../../workspace/api';

export default function PasswordRecovery({ reset = false }) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (reset && window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, [reset]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (reset && password !== confirmation) { setError('Your passwords do not match.'); return; }
    if (reset && !validNewPassword(password)) { setError(passwordGuide); return; }
    setBusy(true);
    try {
      const result = await request(reset ? '/auth/reset-password' : '/auth/forgot-password', {
        method: 'POST', body: JSON.stringify(reset ? { token, password } : { email: email.trim() }),
      });
      if (reset) { localStorage.removeItem('teamweave_token'); setPassword(''); setConfirmation(''); }
      setMessage(result.message);
    } catch (failure) {
      setError(failure instanceof TypeError ? 'Unable to reach the server. Please try again.' : failure.message);
    } finally { setBusy(false); }
  }
  const field = 'mt-2 block w-full rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-[#B69BD8]';
  return <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] px-5 py-8">
    <header className="max-w-6xl mx-auto"><Link to="/"><BrandWordmark size={20} /></Link></header>
    <main className="max-w-md mx-auto mt-16 sm:mt-24 rounded-3xl border border-[var(--sf-border)] bg-[var(--sf-panel)] p-7 sm:p-9 shadow-xl">
      <p className="text-xs uppercase tracking-widest text-[var(--sf-accent-text)] mb-3">Account recovery</p>
      <h1 className="text-3xl font-semibold mb-3">{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
      <p className="text-sm text-[var(--sf-secondary)] mb-7">{reset ? 'Use at least 8 characters. After resetting, sign in again on your devices.' : 'Enter your account email and we will send you a link to reset your password.'}</p>
      {message ? <p role="status" className="text-[var(--sf-secondary)] leading-relaxed">{message}</p> : reset && !token ? <p role="alert">This link is missing its reset token. Please request a new link below.</p> : <form onSubmit={submit} className="space-y-5">
        {reset ? <>
          <label className="block text-sm">New password<input className={field} type="password" autoComplete="new-password" required minLength={8} maxLength={128} aria-describedby="reset-password-guide" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <p id="reset-password-guide" className="text-xs leading-relaxed text-[var(--sf-secondary)]">{passwordGuide}</p>
          <label className="block text-sm">Confirm password<input className={field} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        </> : <label className="block text-sm">Email address<input className={field} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {error && <p role="alert" className="text-sm text-[var(--sf-accent-text)]">{error}</p>}
        <button disabled={busy} aria-busy={busy} className="w-full rounded-xl bg-[#C5ADE5] hover:bg-[#B69BD8] py-3 font-semibold disabled:opacity-60">{busy ? 'Please wait…' : reset ? 'Reset password' : 'Send reset link'}</button>
      </form>}
      <nav className="mt-7 flex flex-wrap gap-5 text-sm text-[var(--sf-accent-text)]">
        <Link to="/login" className="hover:underline">Back to sign in</Link>
        {reset && !message && <Link to="/forgot-password" className="hover:underline">Request a new link</Link>}
      </nav>
    </main>
  </div>;
}
