import EmailSignup from '../../components/auth/EmailSignup';
import SocialSignIn from '../../components/auth/SocialSignIn';
// ─── Dedicated Login & Sign Up Page ──────────────────────────────────────────
// Wine + Garnet Theme with Interactive 3D WebGL Tubes Cursor Background.

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import { request } from '../../workspace/api';
import { TubesBackground } from '../../components/ui/TubesBackground';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  const { dispatch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function signIn() {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({email_or_username: email.trim(), password}) });
    if (!data.access_token) throw new Error('The server did not return a session.');
    localStorage.setItem('teamweave_token', data.access_token);
    const role = data.roles.includes('organizer') ? 'organizer' : 'participant';
    dispatch({type:'LOGIN',payload:{userId:data.user_id,role}});
    const account = await request('/auth/me');
    navigate(account.onboarding_complete ? (role === 'organizer' ? '/organizer' : '/dashboard') : '/complete-profile');
  }
  async function handleSignInSubmit(e) {
    e.preventDefault(); if (loading) return; setLoading(true);
    try { await signIn(); toast.success('Signed in successfully.'); }
    catch(error) { toast.error(error.message); } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] flex flex-col justify-between overflow-hidden">
      {/* Interactive 3D Tubes Background exclusively mounted on initial Auth screen */}
      <TubesBackground />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-text)] px-3.5 py-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)]/80 hover:bg-[var(--sf-surface)] transition-all shadow-sm focus-visible:outline-[#C5ADE5]"
        >
          <ArrowLeft size={13} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-5 my-auto py-8">
        <div className="auth-interactive-card bg-[var(--sf-panel)]/95 border border-[var(--sf-border)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.22)] backdrop-blur-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--sf-text)] tracking-tight">
              {tab === 'signin' ? 'Sign in to your account' : 'Start with Skillfy'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--sf-secondary)]">
              {tab === 'signin'
                ? 'Welcome back. Form high-performing teams with explainable match algorithms.'
                : 'Create your profile once and unlock balanced team recommendations.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[var(--sf-bg)]/80 border border-[var(--sf-border)] rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('signin'); setEmailMode(false); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#C5ADE5] text-ink shadow-md shadow-black/50'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setEmailMode(false); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#C5ADE5] text-ink shadow-md shadow-black/50'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {!emailMode ? <div className="space-y-6">
            <SocialSignIn role="participant" mode={tab} />
            <div className="flex items-center gap-3 text-xs text-[var(--sf-muted)]"><span className="h-px flex-1 bg-[var(--sf-border)]"/>or<span className="h-px flex-1 bg-[var(--sf-border)]"/></div>
            <button type="button" onClick={() => setEmailMode(true)} className="block w-full text-center text-sm text-[var(--sf-accent-text)] underline underline-offset-4 hover:text-ink">Use email instead</button>
            <p className="text-center text-xs text-[var(--sf-muted)]">Hosting events? <Link to="/organizer/auth?tab=signup" className="text-[var(--sf-accent-text)] underline">Create an organizer account</Link></p>
          </div> : <>
            <button type="button" onClick={() => setEmailMode(false)} className="text-xs text-[var(--sf-accent-text)] hover:underline">← Other sign-in options</button>
          {tab === 'signin' ? (
            <div className="space-y-5">
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-panel)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[var(--sf-secondary)]">Password</label>
                    <Link to="/forgot-password" className="text-[11px] text-[var(--sf-accent-text)] hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-panel)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                aria-busy={loading}
                disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-ink bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
                >
                  <span>Sign In to Account</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            <EmailSignup role="participant" />
          )}
          </>}
        </div>
      </main>

      {/* Footer */}
      <footer className="skillfy-auth-footer relative z-20 py-4 text-center text-xs text-[var(--sf-muted)]">
        Skillfy — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
