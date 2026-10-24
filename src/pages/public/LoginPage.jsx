// ─── Dedicated Login & Sign Up Page ──────────────────────────────────────────
// Wine + Garnet Theme with Interactive 3D WebGL Tubes Cursor Background.

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import { TubesBackground } from '../../components/ui/TubesBackground';

const DEMO_PERSONAS = [
  { id: 'p1', name: 'Alex Chen', role: 'Frontend Lead', skill: 'React, TypeScript', accountType: 'participant' },
  { id: 'p2', name: 'Marcus Osei', role: 'Backend Engineer', skill: 'Python, Go', accountType: 'participant' },
  { id: 'p3', name: 'Elena Rostova', role: 'AI/ML Specialist', skill: 'PyTorch, Python', accountType: 'participant' },
  { id: 'org1', name: 'Sarah Lin', role: 'Lead Organizer', skill: 'Event Management', accountType: 'organizer' },
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const [tab, setTab] = useState(initialTab);

  const { state, dispatch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('participant');
  const [primarySkill, setPrimarySkill] = useState('Frontend Development');

  function handlePersonaLogin(persona) {
    dispatch({
      type: 'LOGIN',
      payload: { userId: persona.id, role: persona.accountType },
    });
    toast.success(`Signed in as ${persona.name}`);
    navigate(persona.accountType === 'organizer' ? '/organizer' : '/dashboard');
  }

  async function handleSignInSubmit(e) {
    e.preventDefault();
    if (!email) {
      toast.warn('Please enter your email');
      return;
    }
    if (!password) {
      toast.warn('Please enter your password');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tokens?.access_token) {
          localStorage.setItem('teamweave_token', data.tokens.access_token);
        }
      }
    } catch {
      // Backend offline or local demo fallback
    }

    const existing = state.participants.find(p => p.email?.toLowerCase() === email.toLowerCase()) || state.participants[1];
    dispatch({
      type: 'LOGIN',
      payload: { userId: existing.id, role: 'participant' },
    });
    toast.success(`Welcome back, ${existing.name}!`);
    navigate('/dashboard');
  }

  async function handleSignUpSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      toast.warn('Please enter your email');
      return;
    }
    if (!password.trim()) {
      toast.warn('Please create a password');
      return;
    }
    if (password.length < 6) {
      toast.warn('Password must be at least 6 characters');
      return;
    }

    try {
      const handle = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || `user_${Date.now()}`;
      const res = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          display_name: name.trim(),
          handle: handle,
          roles: [accountType],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tokens?.access_token) {
          localStorage.setItem('teamweave_token', data.tokens.access_token);
        }
      }
    } catch {
      // Backend offline or local demo fallback
    }

    dispatch({
      type: 'SIGNUP',
      payload: {
        name: name.trim(),
        email: email.trim(),
        role: accountType,
        primarySkill: primarySkill.trim(),
      },
    });

    toast.success(`Account created! Welcome to TeamWeave, ${name.split(' ')[0]}.`);
    navigate(accountType === 'organizer' ? '/organizer' : '/dashboard');
  }

  return (
    <div className="relative min-h-screen bg-[#06110C] text-[#F7FAF8] flex flex-col justify-between overflow-hidden">
      {/* Interactive 3D Tubes Background exclusively mounted on initial Auth screen */}
      <TubesBackground />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C8D1CC] hover:text-[#F7FAF8] px-3.5 py-1.5 rounded-xl border border-[#333D38] bg-[#171717]/80 hover:bg-[#222624] transition-all shadow-sm focus-visible:outline-[#a31c1b]"
        >
          <ArrowLeft size={13} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-5 my-auto py-8">
        <div className="auth-interactive-card bg-[#171717]/95 border border-[#333D38] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(163,28,27,0.22)] backdrop-blur-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#F7FAF8] tracking-tight">
              {tab === 'signin' ? 'Sign in to your account' : 'Start with TeamWeave'}
            </h1>
            <p className="text-xs sm:text-sm text-[#C8D1CC]">
              {tab === 'signin'
                ? 'Welcome back. Form high-performing teams with explainable match algorithms.'
                : 'Create your profile once and unlock balanced team recommendations.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#06110C]/80 border border-[#333D38] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#a31c1b] text-white shadow-md shadow-black/50'
                  : 'text-[#8F9E97] hover:text-[#F7FAF8]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#a31c1b] text-white shadow-md shadow-black/50'
                  : 'text-[#8F9E97] hover:text-[#F7FAF8]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            <div className="space-y-5">
              {/* Quick demo personas */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#E56E6D] font-semibold block">
                  Quick Demo Access
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonaLogin(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-[#333D38] bg-[#1E2220]/70 hover:bg-[#242926] hover:border-[#a31c1b]/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-[#F7FAF8] group-hover:text-[#E56E6D] transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#C8D1CC] px-1 rounded bg-[#171717] border border-[#333D38]">
                          {p.accountType === 'organizer' ? 'Host' : 'User'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8F9E97] truncate w-full mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#8F9E97]">
                <div className="h-px flex-1 bg-[#333D38]/60" />
                <span>or with credentials</span>
                <div className="h-px flex-1 bg-[#333D38]/60" />
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[#C8D1CC] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E97]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="alex.chen@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] placeholder:text-[#8F9E97] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[#C8D1CC]">Password</label>
                    <span className="text-[11px] text-[#E56E6D] hover:underline cursor-pointer">Forgot?</span>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E97]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] placeholder:text-[#8F9E97] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#a31c1b] hover:bg-[#bf2625] shadow-lg shadow-[#a31c1b]/30 hover:shadow-[#bf2625]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#a31c1b]"
                >
                  <span>Sign In to Account</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-[#C8D1CC] block mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E97]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] placeholder:text-[#8F9E97] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#C8D1CC] block mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E97]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] placeholder:text-[#8F9E97] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#C8D1CC] block mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9E97]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a secure password (min 6 chars)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] placeholder:text-[#8F9E97] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#C8D1CC] block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'participant'
                        ? 'border-[#a31c1b] bg-[#222624] text-white font-medium shadow-sm shadow-[#a31c1b]/30'
                        : 'border-[#333D38] bg-[#171717] text-[#8F9E97] hover:text-[#F7FAF8]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Participant</p>
                    <p className="text-[10px] text-[#8F9E97] mt-0.5">Join teams & events</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('organizer')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'organizer'
                        ? 'border-[#a31c1b] bg-[#222624] text-white font-medium shadow-sm shadow-[#a31c1b]/30'
                        : 'border-[#333D38] bg-[#171717] text-[#8F9E97] hover:text-[#F7FAF8]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-[#8F9E97] mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#C8D1CC] block mb-1">Primary Discipline / Skill</label>
                <select
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171717] border border-[#333D38] text-sm text-[#F7FAF8] focus:outline-none focus:border-[#a31c1b] focus:ring-1 focus:ring-[#a31c1b]/50 transition-all cursor-pointer"
                >
                  <option value="Frontend Development" className="bg-[#171717] text-[#F7FAF8]">Frontend Development (React, Vue, Web)</option>
                  <option value="Backend Development" className="bg-[#171717] text-[#F7FAF8]">Backend Development (Python, Node, Go)</option>
                  <option value="UI/UX Design" className="bg-[#171717] text-[#F7FAF8]">UI/UX Design & Prototyping</option>
                  <option value="AI & Machine Learning" className="bg-[#171717] text-[#F7FAF8]">AI & Machine Learning</option>
                  <option value="Data Visualization" className="bg-[#171717] text-[#F7FAF8]">Data Visualization & Analytics</option>
                  <option value="Project Management" className="bg-[#171717] text-[#F7FAF8]">Project Management & Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#a31c1b] hover:bg-[#bf2625] shadow-lg shadow-[#a31c1b]/30 hover:shadow-[#bf2625]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#a31c1b]"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#8F9E97]">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
