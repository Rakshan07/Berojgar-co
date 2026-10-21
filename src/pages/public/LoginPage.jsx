// ─── Dedicated Login & Sign Up Page ──────────────────────────────────────────
// Wine + Garnet Theme with Interactive 3D WebGL Tubes Cursor Background.

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { BrandWordmark } from '../../components/ui/BrandMark';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../hooks/useToast';
import TubesBackground from '../../components/ui/TubesBackground';
import ForgotPassword from '../../components/auth/ForgotPassword';
import { loginApi, registerApi } from '../../services/authApi';

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
  const [forgot, setForgot] = useState(false);

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
    if (!email || !password) {
      toast.warn('Please enter your email and password');
      return;
    }
    try {
      const user = await loginApi(email.trim(), password);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user } });
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'organizer' ? '/organizer' : '/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
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
    if (password.length < 8) {
      toast.warn('Password must be at least 8 characters');
      return;
    }
    try {
      const user = await registerApi({ email: email.trim(), name: name.trim(), password, role: accountType });
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, primarySkill: primarySkill.trim() } });
      toast.success(`Account created! Welcome to TeamWeave, ${name.split(' ')[0]}.`);
      navigate(accountType === 'organizer' ? '/organizer' : '/dashboard');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#17080F] text-[#FFF4F6] flex flex-col justify-between overflow-hidden">
      {/* Interactive 3D Tubes Background exclusively mounted on initial Auth screen */}
      <TubesBackground />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D7B7C2] hover:text-[#FFF4F6] px-3.5 py-1.5 rounded-xl border border-[#633044] bg-[#2C101C]/70 hover:bg-[#3A1524] transition-all shadow-sm focus-visible:outline-[#F7A5BD]"
        >
          <ArrowLeft size={13} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-5 my-auto py-8">
        <div className="auth-interactive-card bg-[#2C101C]/92 border border-[#633044] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(185,35,69,0.18)] backdrop-blur-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#FFF4F6] tracking-tight">
              {tab === 'signin' ? 'Sign in to your account' : 'Start with TeamWeave'}
            </h1>
            <p className="text-xs sm:text-sm text-[#D7B7C2]">
              {tab === 'signin'
                ? 'Welcome back. Form high-performing teams with explainable match algorithms.'
                : 'Create your profile once and unlock balanced team recommendations.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#17080F]/80 border border-[#633044] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#B92345] text-[#FFF4F6] shadow-md shadow-[#17080F]/50'
                  : 'text-[#B68F9E] hover:text-[#FFF4F6]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#B92345] text-[#FFF4F6] shadow-md shadow-[#17080F]/50'
                  : 'text-[#B68F9E] hover:text-[#FFF4F6]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' && forgot ? (
            <ForgotPassword initialEmail={email} onBack={() => setForgot(false)} />
          ) : tab === 'signin' ? (
            <div className="space-y-5">
              {/* Quick demo personas */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#F28BA8] font-semibold block">
                  Quick Demo Access
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonaLogin(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-[#633044] bg-[#220B15]/70 hover:bg-[#3A1524] hover:border-[#B92345]/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-[#FFF4F6] group-hover:text-[#F28BA8] transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#F7C5D2] px-1 rounded bg-[#3A1524] border border-[#633044]">
                          {p.accountType === 'organizer' ? 'Host' : 'User'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#B68F9E] truncate w-full mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#B68F9E]">
                <div className="h-px flex-1 bg-[#633044]/60" />
                <span>or with credentials</span>
                <div className="h-px flex-1 bg-[#633044]/60" />
              </div>

              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[#D7B7C2] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="alex.chen@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[#D7B7C2]">Password</label>
                    <button type="button" onClick={() => setForgot(true)} className="text-[11px] text-[#F28BA8] hover:underline cursor-pointer">Forgot?</button>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[#FFF4F6] bg-[#B92345] hover:bg-[#D23357] shadow-lg shadow-[#B92345]/30 hover:shadow-[#D23357]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#F7A5BD]"
                >
                  <span>Sign In to Account</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-[#D7B7C2] block mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#D7B7C2] block mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#D7B7C2] block mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#D7B7C2] block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'participant'
                        ? 'border-[#B92345] bg-[#3A1524] text-[#FFF4F6] font-medium shadow-sm shadow-[#B92345]/30'
                        : 'border-[#633044] bg-[#17080F]/80 text-[#B68F9E] hover:text-[#FFF4F6]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Participant</p>
                    <p className="text-[10px] text-[#B68F9E] mt-0.5">Join teams & events</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('organizer')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'organizer'
                        ? 'border-[#B92345] bg-[#3A1524] text-[#FFF4F6] font-medium shadow-sm shadow-[#B92345]/30'
                        : 'border-[#633044] bg-[#17080F]/80 text-[#B68F9E] hover:text-[#FFF4F6]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-[#B68F9E] mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#D7B7C2] block mb-1">Primary Discipline / Skill</label>
                <select
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all cursor-pointer"
                >
                  <option value="Frontend Development" className="bg-[#2C101C] text-[#FFF4F6]">Frontend Development (React, Vue, Web)</option>
                  <option value="Backend Development" className="bg-[#2C101C] text-[#FFF4F6]">Backend Development (Python, Node, Go)</option>
                  <option value="UI/UX Design" className="bg-[#2C101C] text-[#FFF4F6]">UI/UX Design & Prototyping</option>
                  <option value="AI & Machine Learning" className="bg-[#2C101C] text-[#FFF4F6]">AI & Machine Learning</option>
                  <option value="Data Visualization" className="bg-[#2C101C] text-[#FFF4F6]">Data Visualization & Analytics</option>
                  <option value="Project Management" className="bg-[#2C101C] text-[#FFF4F6]">Project Management & Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[#FFF4F6] bg-[#B92345] hover:bg-[#D23357] shadow-lg shadow-[#B92345]/30 hover:shadow-[#D23357]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#F7A5BD]"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#B68F9E]">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
