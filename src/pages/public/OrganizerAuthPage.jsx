import EmailSignup from '../../components/auth/EmailSignup';
import SocialSignIn from '../../components/auth/SocialSignIn';
// ─── Dedicated Organizer Sign In & Sign Up Page ──────────────────────────────
// Purpose-built for Hackathon, Sprint, and Tournament Organizers.
// Uses Obsidian (var(--sf-panel)), Forest Night (var(--sf-bg)), and Crimson Ruby (#C5ADE5).

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, Sparkles } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import { request } from '../../workspace/api';
import { TubesBackground } from '../../components/ui/TubesBackground';

export default function OrganizerAuthPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [tab, setTab] = useState(initialTab);

  const { dispatch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailMode, setEmailMode] = useState(false);

  async function signIn() {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({email_or_username: email.trim(), password, required_role: 'organizer'}) });
    if (!data.roles?.includes('organizer')) throw new Error('Please use participant sign-in for this account.');
    if (!data.access_token) throw new Error('The server did not return a session.');
    localStorage.setItem('teamweave_token', data.access_token);
    const role = data.roles.includes('organizer') ? 'organizer' : 'participant';
    dispatch({type:'LOGIN',payload:{userId:data.user_id,role}});
    const account = await request('/auth/me');
    navigate(account.onboarding_complete ? (role === 'organizer' ? '/organizer' : '/dashboard') : '/complete-profile');
  }
  async function handleSignIn(e) {
    e.preventDefault(); if (loading) return; setLoading(true);
    try { await signIn(); toast.success('Signed in successfully.'); }
    catch(error) { toast.error(error.message); } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] flex flex-col justify-between overflow-hidden">
      {/* Ambient background */}
      <TubesBackground className="absolute inset-0 pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-text)] px-3.5 py-1.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-panel)]/80 hover:bg-[var(--sf-surface)] transition-all shadow-sm focus-visible:outline-[#C5ADE5]"
          >
            <span>Participant Sign In</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sf-secondary)] hover:text-[var(--sf-text)] px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-20 max-w-lg w-full mx-auto px-5 my-auto py-8">
        <div className="bg-[var(--sf-panel)]/95 border border-[var(--sf-border)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.25)] backdrop-blur-2xl space-y-6">

          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-[#C5ADE5]/20 text-[var(--sf-accent-text)] border border-[#C5ADE5]/40 shadow-sm">
              <Sparkles size={12} className="text-[#C5ADE5]" />
              <span>Organizer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--sf-text)] tracking-tight">
              {tab === 'signin' ? 'Sign in to Organizer Portal' : 'Create an Organizer Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--sf-secondary)]">
              {tab === 'signin'
                ? 'Manage your events, configure skill blueprint matrices, and auto-form balanced teams.'
                : 'Host hackathons, research sprints, or tournaments with explainable AI team formation.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[var(--sf-bg)] border border-[var(--sf-border)] rounded-xl">
            <button
              type="button"
              onClick={() => { setTab('signin'); setEmailMode(false); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#C5ADE5] text-ink shadow-md shadow-[#C5ADE5]/30'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
              }`}
            >
              Organizer Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setEmailMode(false); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#C5ADE5] text-ink shadow-md shadow-[#C5ADE5]/30'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
              }`}
            >
              Create Organizer Account
            </button>
          </div>

          {!emailMode ? <div className="space-y-6">
            <SocialSignIn role="organizer" mode={tab} />
            <div className="flex items-center gap-3 text-xs text-[var(--sf-muted)]"><span className="h-px flex-1 bg-[var(--sf-border)]"/>or<span className="h-px flex-1 bg-[var(--sf-border)]"/></div>
            <button type="button" onClick={() => setEmailMode(true)} className="block w-full text-center text-sm text-[var(--sf-accent-text)] underline underline-offset-4 hover:text-ink">Use email instead</button>

          </div> : <>
            <button type="button" onClick={() => setEmailMode(false)} className="text-xs text-[var(--sf-accent-text)] hover:underline">← Other sign-in options</button>
          {tab === 'signin' ? (
            /* ─── Organizer Sign In ─── */
            <div className="space-y-5">
              {/* Email & Password Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--sf-secondary)]">Organizer Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)]/70 focus:outline-none focus:border-[#C5ADE5] focus:ring-2 focus:ring-[#C5ADE5]/25 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--sf-secondary)]">Password</label>
                  <Link to="/forgot-password" className="ml-4 text-xs text-[var(--sf-accent-text)] hover:underline">Forgot password?</Link>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)]/70 focus:outline-none focus:border-[#C5ADE5] focus:ring-2 focus:ring-[#C5ADE5]/25 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                aria-busy={loading}
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-ink bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Organizer Dashboard'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            /* ─── Create Organizer Account ─── */
            <EmailSignup role="organizer" />
          )}
          </>}

          {/* Quick toggle link */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-[var(--sf-muted)] hover:text-[var(--sf-text)] transition-colors"
            >
              Are you a participant joining an event? <span className="text-[var(--sf-accent-text)] underline">Go to Participant Sign In</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="skillfy-auth-footer relative z-20 py-4 text-center text-xs text-[var(--sf-muted)]">
        Skillfy — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
