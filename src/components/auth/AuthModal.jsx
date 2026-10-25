// ─── Authentication Modal (Sign In & Sign Up) ─────────────────────────────────
// Elegant, professional purple and obsidian black design with instant workflow integration.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, UserCheck, Shield, Sparkles, Check, Lock, Mail, User } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { BrandMark } from '../ui/BrandMark';
import { useToast } from '../../hooks/useToast';

const DEMO_PERSONAS = [
  { id: 'p1', name: 'Alex Chen', role: 'Frontend Lead', skill: 'React, TypeScript', accountType: 'participant' },
  { id: 'p2', name: 'Marcus Osei', role: 'Backend Engineer', skill: 'Python, Go', accountType: 'participant' },
  { id: 'p3', name: 'Elena Rostova', role: 'AI/ML Specialist', skill: 'PyTorch, Python', accountType: 'participant' },
  { id: 'org1', name: 'Sarah Lin', role: 'Lead Organizer', skill: 'Event Management', accountType: 'organizer' },
];

export function AuthModal({ isOpen, onClose, initialTab = 'signin', onAuthSuccess }) {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState(initialTab); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('participant');
  const [primarySkill, setPrimarySkill] = useState('Frontend Development');

  if (!isOpen) return null;

  function handlePersonaLogin(persona) {
    dispatch({
      type: 'LOGIN',
      payload: { userId: persona.id, role: persona.accountType },
    });
    toast.success(`Signed in as ${persona.name}`);
    if (onAuthSuccess) onAuthSuccess();
    onClose();
    navigate(persona.accountType === 'organizer' ? '/organizer' : '/dashboard');
  }

  function handleSignInSubmit(e) {
    e.preventDefault();
    if (!email) {
      toast.warn('Please enter your email');
      return;
    }

    // Find participant by email or fallback to first participant
    const existing = state.participants.find(p => p.email?.toLowerCase() === email.toLowerCase()) || state.participants[1];
    dispatch({
      type: 'LOGIN',
      payload: { userId: existing.id, role: 'participant' },
    });
    toast.success(`Welcome back, ${existing.name}!`);
    if (onAuthSuccess) onAuthSuccess();
    onClose();
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
      fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          display_name: name.trim(),
          handle: handle,
          roles: [accountType],
        }),
      }).then(r => r.json()).then(d => {
        if (d?.tokens?.access_token) localStorage.setItem('teamweave_token', d.tokens.access_token);
      }).catch(() => {});
    } catch {
      // Demo fallback
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
    if (onAuthSuccess) onAuthSuccess();
    onClose();
    navigate(accountType === 'organizer' ? '/organizer' : '/dashboard');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-[#210B16] border border-[#5E2A3D] rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.25)] overflow-hidden text-[#F7FAF8] backdrop-blur-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[radial-gradient(ellipse_at_top,rgba(182,38,77,0.25),transparent_70%)] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#BCA2AD] hover:text-[#F7FAF8] hover:bg-white/10 transition-colors z-20 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8 relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#13080E] border border-[#5E2A3D] mb-1 shadow-lg shadow-[#13080E]/50">
              <BrandMark size={24} />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#F7FAF8] tracking-tight">
              {tab === 'signin' ? 'Sign in to TeamWeave' : 'Create your account'}
            </h2>
            <p className="text-xs sm:text-sm text-[#E0CAD3]">
              {tab === 'signin'
                ? 'Select a demo persona or enter your credentials.'
                : 'Join events and experience balanced team formation.'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#13080E] border border-[#5E2A3D] rounded-xl">
            <button
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#B6264D] text-[#F7FAF8] shadow-md shadow-[#13080E]/50'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#B6264D] text-[#F7FAF8] shadow-md shadow-[#13080E]/50'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            /* ─── Sign In View ─── */
            <div className="space-y-5">
              {/* One-click demo personas */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#F4A7BB] font-semibold block">
                  Fast Demo Sign In
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonaLogin(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-[#5E2A3D] bg-[#13080E]/80 hover:bg-[#2C1020] hover:border-[#B6264D]/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-[#F7FAF8] group-hover:text-[#F4A7BB] transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#F4A7BB] px-1 rounded bg-[#13080E] border border-[#5E2A3D]">
                          {p.accountType === 'organizer' ? 'Host' : 'User'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#BCA2AD] truncate w-full mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#BCA2AD]">
                <div className="h-px flex-1 bg-[#5E2A3D]/60" />
                <span>or continue with email</span>
                <div className="h-px flex-1 bg-[#5E2A3D]/60" />
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="alex.chen@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[#E0CAD3]">Password</label>
                    <span className="text-[11px] text-[#F4A7BB] hover:underline cursor-pointer">Forgot?</span>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[#F7FAF8] bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
                >
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
            /* ─── Sign Up View ─── */
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a secure password (min 6 chars)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                  />
                </div>
              </div>

              {/* Account Type Selector */}
              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'participant'
                        ? 'border-[#B6264D] bg-[#210B16] text-[#F7FAF8] font-medium shadow-sm shadow-[#B6264D]/30'
                        : 'border-[#5E2A3D] bg-[#13080E]/80 text-[#BCA2AD] hover:text-[#F7FAF8]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Participant</p>
                    <p className="text-[10px] text-[#BCA2AD] mt-0.5">Join teams & events</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('organizer')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'organizer'
                        ? 'border-[#B6264D] bg-[#210B16] text-[#F7FAF8] font-medium shadow-sm shadow-[#B6264D]/30'
                        : 'border-[#5E2A3D] bg-[#13080E]/80 text-[#BCA2AD] hover:text-[#F7FAF8]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-[#BCA2AD] mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>

              {/* Primary Skill */}
              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Primary Discipline / Skill</label>
                <select
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#13080E] border border-[#5E2A3D] text-sm text-[#F7FAF8] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all cursor-pointer"
                >
                  <option value="Frontend Development" className="bg-[#210B16] text-[#F7FAF8]">Frontend Development (React, Vue, Web)</option>
                  <option value="Backend Development" className="bg-[#210B16] text-[#F7FAF8]">Backend Development (Python, Node, Go)</option>
                  <option value="UI/UX Design" className="bg-[#210B16] text-[#F7FAF8]">UI/UX Design & Prototyping</option>
                  <option value="AI & Machine Learning" className="bg-[#210B16] text-[#F7FAF8]">AI & Machine Learning</option>
                  <option value="Data Visualization" className="bg-[#210B16] text-[#F7FAF8]">Data Visualization & Analytics</option>
                  <option value="Project Management" className="bg-[#210B16] text-[#F7FAF8]">Project Management & Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[#F7FAF8] bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-2 text-center text-xs text-[#BCA2AD]">
            <span>By proceeding, you agree to our </span>
            <span className="text-[#F4A7BB] hover:underline cursor-pointer">Terms of Service</span>
            <span> and </span>
            <span className="text-[#F4A7BB] hover:underline cursor-pointer">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
