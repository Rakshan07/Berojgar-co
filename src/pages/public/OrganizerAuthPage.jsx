// ─── Dedicated Organizer Sign In & Sign Up Page ──────────────────────────────
// Purpose-built for Hackathon, Sprint, and Tournament Organizers.
// Uses Obsidian (#210B16), Forest Night (#13080E), and Crimson Ruby (#B6264D).

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, Building, User, Sparkles, CheckCircle2 } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({email_or_username: email.trim(), password}) });
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
  async function handleSignUp(e) {
    e.preventDefault(); if (loading) return;

    setLoading(true);
    try {
      await request('/auth/register', {method:'POST',body:JSON.stringify({email:email.trim(),full_name:name.trim(),password,role:'organizer', organization: organization.trim()})});
      toast.success('Account created.');
      await signIn();
    } catch(error) { toast.error(error.message); } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen bg-[#13080E] text-[#F7FAF8] flex flex-col justify-between overflow-hidden">
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E0CAD3] hover:text-[#F7FAF8] px-3.5 py-1.5 rounded-xl border border-[#5E2A3D] bg-[#210B16]/80 hover:bg-[#32111F] transition-all shadow-sm focus-visible:outline-[#B6264D]"
          >
            <span>Participant Sign In</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#E0CAD3] hover:text-[#F7FAF8] px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-20 max-w-lg w-full mx-auto px-5 my-auto py-8">
        <div className="bg-[#210B16]/95 border border-[#5E2A3D] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.25)] backdrop-blur-2xl space-y-6">

          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-[#B6264D]/20 text-[#F4A7BB] border border-[#B6264D]/40 shadow-sm">
              <Sparkles size={12} className="text-[#B6264D]" />
              <span>Organizer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#F7FAF8] tracking-tight">
              {tab === 'signin' ? 'Sign in to Organizer Portal' : 'Create an Organizer Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#E0CAD3]">
              {tab === 'signin'
                ? 'Manage your events, configure skill blueprint matrices, and auto-form balanced teams.'
                : 'Host hackathons, research sprints, or tournaments with explainable AI team formation.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#13080E] border border-[#5E2A3D] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#B6264D] text-white shadow-md shadow-[#B6264D]/30'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Organizer Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#B6264D] text-white shadow-md shadow-[#B6264D]/30'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Create Organizer Account
            </button>
          </div>

          {tab === 'signin' ? (
            /* ─── Organizer Sign In ─── */
            <div className="space-y-5">
              {/* Email & Password Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#E0CAD3]">Organizer Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#E0CAD3]">Password</label>
                  <Link to="/forgot-password" className="ml-4 text-xs text-[#F4A7BB] hover:underline">Forgot password?</Link>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                aria-busy={loading}
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Organizer Dashboard'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            /* ─── Create Organizer Account ─── */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#E0CAD3]">Organization / University / Club Name</label>
                <div className="relative">
                  <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford AI Club, DevHack Collective, FinTech Labs"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#E0CAD3]">Lead Organizer Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#E0CAD3]">Work Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#E0CAD3]">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD]/70 focus:outline-none focus:border-[#B6264D] focus:ring-2 focus:ring-[#B6264D]/25 transition-all"
                  />
                </div>
              </div>



              <div className="rounded-xl border border-[#5E2A3D] bg-[#13080E]/60 p-3 space-y-1.5 text-xs text-[#BCA2AD]">
                <div className="flex items-center gap-2 text-[#F4A7BB] font-semibold">
                  <CheckCircle2 size={13} />
                  <span>Organizer Workspace Perks</span>
                </div>
                <p>Configurable requirement matrices, live capability coverage graphs, explainable algorithmic grouping, and manual swap tools.</p>
              </div>

              <button
                type="submit"
                aria-busy={loading}
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
              >
                <span>{loading ? 'Creating Account...' : 'Create Organizer Account & Launch'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Quick toggle link */}
          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-xs text-[#BCA2AD] hover:text-[#F7FAF8] transition-colors"
            >
              Are you a participant joining an event? <span className="text-[#F4A7BB] underline">Go to Participant Sign In</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#BCA2AD]">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
