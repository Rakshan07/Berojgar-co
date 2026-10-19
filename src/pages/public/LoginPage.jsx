// ─── Dedicated Login & Sign Up Page ──────────────────────────────────────────
// Elegant, full-screen luxury purple and black experience.

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Sparkles } from 'lucide-react';
import { BrandWordmark, BrandMark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import LightRays from '../../components/ui/LightRays';

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

  function handleSignInSubmit(e) {
    e.preventDefault();
    if (!email) {
      toast.warn('Please enter your email');
      return;
    }
    const existing = state.participants.find(p => p.email?.toLowerCase() === email.toLowerCase()) || state.participants[1];
    dispatch({
      type: 'LOGIN',
      payload: { userId: existing.id, role: 'participant' },
    });
    toast.success(`Welcome back, ${existing.name}!`);
    navigate('/dashboard');
  }

  function handleSignUpSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.warn('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      toast.warn('Please enter your email');
      return;
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
    <div className="relative min-h-screen bg-[#07050D] text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Subtle Purple Light Rays Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#8B5CF6"
          raysSpeed={0.8}
          lightSpread={0.5}
          rayLength={3}
          glow={0.5}
          haze={0.3}
          rayDensity={1}
          atmosphere={0.85}
          intensity={0.9}
          lightMode={false}
        />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-purple-500/20 bg-purple-950/20 hover:bg-purple-900/30 transition-all"
        >
          <ArrowLeft size={13} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-5 my-auto py-8">
        <div className="bg-[#0C0816]/90 border border-purple-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(139,92,246,0.15)] backdrop-blur-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">
              {tab === 'signin' ? 'Sign in to your account' : 'Start with TeamWeave'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {tab === 'signin'
                ? 'Welcome back. Form high-performing teams with explainable match algorithms.'
                : 'Create your profile once and unlock balanced team recommendations.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-black/40 border border-purple-500/20 rounded-xl">
            <button
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-gradient-to-r from-purple-700 to-violet-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-purple-700 to-violet-600 text-white shadow-md shadow-purple-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            <div className="space-y-5">
              {/* Quick demo personas */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold block">
                  Quick Demo Access
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonaLogin(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/20 hover:bg-purple-900/30 hover:border-purple-400/50 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-purple-300 px-1 rounded bg-purple-900/40">
                          {p.accountType === 'organizer' ? 'Host' : 'User'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 truncate w-full mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-white/10" />
                <span>or with credentials</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="alex.chen@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/50 border border-purple-500/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <span className="text-[11px] text-purple-400 hover:underline cursor-pointer">Forgot?</span>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/50 border border-purple-500/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In to Account</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/50 border border-purple-500/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black/50 border border-purple-500/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      accountType === 'participant'
                        ? 'border-purple-400 bg-purple-950/40 text-white font-medium shadow-sm shadow-purple-900/30'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Participant</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Join teams & events</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('organizer')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      accountType === 'organizer'
                        ? 'border-purple-400 bg-purple-950/40 text-white font-medium shadow-sm shadow-purple-900/30'
                        : 'border-white/10 bg-black/40 text-slate-400 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Primary Discipline / Skill</label>
                <select
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition-all"
                >
                  <option value="Frontend Development">Frontend Development (React, Vue, Web)</option>
                  <option value="Backend Development">Backend Development (Python, Node, Go)</option>
                  <option value="UI/UX Design">UI/UX Design & Prototyping</option>
                  <option value="AI & Machine Learning">AI & Machine Learning</option>
                  <option value="Data Visualization">Data Visualization & Analytics</option>
                  <option value="Project Management">Project Management & Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-slate-400">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
