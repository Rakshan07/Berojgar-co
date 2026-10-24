// ─── Dedicated Organizer Sign In & Sign Up Page ──────────────────────────────
// Purpose-built for Hackathon, Sprint, and Tournament Organizers.
// Uses Obsidian (#171717), Forest Night (#06110C), and Crimson Ruby (#a31c1b).

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, Building, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import { TubesBackground } from '../../components/ui/TubesBackground';

const DEMO_ORGANIZERS = [
  {
    id: 'org1',
    name: 'Sarah Lin',
    organization: 'City Innovation Lab & Tech Guild',
    role: 'Lead Organizer',
    email: 'sarah.lin@teamweave.demo',
    eventCount: 5,
  },
  {
    id: 'org2',
    name: 'Marcus Vance',
    organization: 'National Debate Federation',
    role: 'Tournament Director',
    email: 'marcus.vance@debate.org',
    eventCount: 3,
  },
];

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
  const [primaryEventType, setPrimaryEventType] = useState('Hackathon');
  const [loading, setLoading] = useState(false);

  function handleDemoOrganizerLogin(organizer) {
    dispatch({
      type: 'LOGIN',
      payload: { userId: organizer.id, role: 'organizer' },
    });
    toast.success(`Welcome back, ${organizer.name}! Organizer dashboard ready.`);
    navigate('/organizer');
  }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter your organizer email and password.');
      return;
    }

    setLoading(true);
    try {
      // Attempt backend auth API
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_or_username: email.trim(), password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('teamweave_token', data.access_token);
        localStorage.setItem('teamweave_user_id', data.user_id);
      }
    } catch {
      // Non-blocking fallback for local demo state
    } finally {
      setLoading(false);
    }

    dispatch({
      type: 'LOGIN',
      payload: {
        userId: 'org1',
        role: 'organizer',
        email: email.trim(),
      },
    });
    toast.success('Signed in as Organizer.');
    navigate('/organizer');
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name.');
      return;
    }
    if (!organization.trim()) {
      toast.error('Please provide your organization or company name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please provide a valid work email.');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const newOrgId = `org-${Date.now()}`;

    try {
      // Sync to backend auth register API
      const res = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Math.floor(Math.random() * 1000),
          full_name: name.trim(),
          password: password,
          role: 'organizer',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('teamweave_user_id', data.id);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }

    dispatch({
      type: 'LOGIN',
      payload: {
        userId: newOrgId,
        role: 'organizer',
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim(),
        primaryEventType,
      },
    });

    toast.success(`Organizer account created! Welcome, ${name.split(' ')[0]}.`);
    navigate('/organizer');
  }

  return (
    <div className="relative min-h-screen bg-[#06110C] text-[#F7FAF8] flex flex-col justify-between overflow-hidden">
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
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C8D1CC] hover:text-[#F7FAF8] px-3.5 py-1.5 rounded-xl border border-[#333D38] bg-[#171717]/80 hover:bg-[#222624] transition-all shadow-sm focus-visible:outline-[#a31c1b]"
          >
            <span>Participant Sign In</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#C8D1CC] hover:text-[#F7FAF8] px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-20 max-w-lg w-full mx-auto px-5 my-auto py-8">
        <div className="bg-[#171717]/95 border border-[#333D38] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(163,28,27,0.25)] backdrop-blur-2xl space-y-6">
          
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-[#a31c1b]/20 text-[#E56E6D] border border-[#a31c1b]/40 shadow-sm">
              <Sparkles size={12} className="text-[#a31c1b]" />
              <span>Organizer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#F7FAF8] tracking-tight">
              {tab === 'signin' ? 'Sign in to Organizer Portal' : 'Create an Organizer Account'}
            </h1>
            <p className="text-xs sm:text-sm text-[#C8D1CC]">
              {tab === 'signin'
                ? 'Manage your events, configure skill blueprint matrices, and auto-form balanced teams.'
                : 'Host hackathons, research sprints, or tournaments with explainable AI team formation.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#06110C] border border-[#333D38] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#a31c1b] text-white shadow-md shadow-[#a31c1b]/30'
                  : 'text-[#9EAAA4] hover:text-[#F7FAF8]'
              }`}
            >
              Organizer Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#a31c1b] text-white shadow-md shadow-[#a31c1b]/30'
                  : 'text-[#9EAAA4] hover:text-[#F7FAF8]'
              }`}
            >
              Create Organizer Account
            </button>
          </div>

          {tab === 'signin' ? (
            /* ─── Organizer Sign In ─── */
            <div className="space-y-5">
              {/* Demo 1-Click Organizer Sign In */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#E56E6D] font-semibold block">
                  Quick Demo Organizer Access
                </label>
                <div className="space-y-2">
                  {DEMO_ORGANIZERS.map(org => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleDemoOrganizerLogin(org)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-[#333D38] bg-[#06110C]/80 hover:bg-[#1f1f1f] hover:border-[#a31c1b]/60 transition-all text-left cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#F7FAF8] group-hover:text-[#E56E6D] transition-colors">
                            {org.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#a31c1b]/20 text-[#E56E6D] border border-[#a31c1b]/30">
                            {org.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9EAAA4] mt-0.5">{org.organization}</p>
                      </div>
                      <ArrowRight size={14} className="text-[#9EAAA4] group-hover:text-[#E56E6D] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#9EAAA4]">
                <div className="h-px flex-1 bg-[#333D38]/60" />
                <span>or enter credentials</span>
                <div className="h-px flex-1 bg-[#333D38]/60" />
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#C8D1CC]">Organizer Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                    <input
                      type="email"
                      required
                      placeholder="organizer@university.edu or name@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#C8D1CC]">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#a31c1b] hover:bg-[#bf2625] shadow-lg shadow-[#a31c1b]/30 hover:shadow-[#bf2625]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#a31c1b]"
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
                <label className="text-xs font-medium text-[#C8D1CC]">Organization / University / Club Name</label>
                <div className="relative">
                  <Building size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford AI Club, DevHack Collective, FinTech Labs"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#C8D1CC]">Lead Organizer Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#C8D1CC]">Work Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                  <input
                    type="email"
                    required
                    placeholder="organizer@organization.org"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#C8D1CC]">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EAAA4]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] placeholder:text-[#9EAAA4]/70 focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#C8D1CC]">Primary Event Format</label>
                <select
                  value={primaryEventType}
                  onChange={e => setPrimaryEventType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#333D38] bg-[#06110C] text-sm text-[#F7FAF8] focus:outline-none focus:border-[#a31c1b] focus:ring-2 focus:ring-[#a31c1b]/25 transition-all cursor-pointer"
                >
                  <option value="Hackathon">Hackathon (Software & Hardware)</option>
                  <option value="Research Sprint">Research Sprint (AI / ML / Data)</option>
                  <option value="Debate Championship">Debate Tournament / Model UN</option>
                  <option value="Creative Jam">Creative / Design Jam</option>
                </select>
              </div>

              <div className="rounded-xl border border-[#333D38] bg-[#06110C]/60 p-3 space-y-1.5 text-xs text-[#9EAAA4]">
                <div className="flex items-center gap-2 text-[#E56E6D] font-semibold">
                  <CheckCircle2 size={13} />
                  <span>Organizer Workspace Perks</span>
                </div>
                <p>Configurable requirement matrices, live capability coverage graphs, explainable algorithmic grouping, and manual swap tools.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#a31c1b] hover:bg-[#bf2625] shadow-lg shadow-[#a31c1b]/30 hover:shadow-[#bf2625]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#a31c1b]"
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
              className="text-xs text-[#9EAAA4] hover:text-[#F7FAF8] transition-colors"
            >
              Are you a participant joining an event? <span className="text-[#E56E6D] underline">Go to Participant Sign In</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#8F9E97]">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
