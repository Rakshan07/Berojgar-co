import { passwordGuide, validNewPassword } from '../../workspace/passwordPolicy';
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
    if (!validNewPassword(password)) {
      toast.warn(passwordGuide);
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

    toast.success(`Account created! Welcome to Skillfy, ${name.split(' ')[0]}.`);
    if (onAuthSuccess) onAuthSuccess();
    onClose();
    navigate(accountType === 'organizer' ? '/organizer' : '/dashboard');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-[var(--sf-panel)] border border-[var(--sf-border)] rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.25)] overflow-hidden text-[var(--sf-text)] backdrop-blur-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[radial-gradient(ellipse_at_top,rgba(182,38,77,0.25),transparent_70%)] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[var(--sf-muted)] hover:text-[var(--sf-text)] hover:bg-white/10 transition-colors z-20 cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8 relative z-10 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--sf-bg)] border border-[var(--sf-border)] mb-1 shadow-lg shadow-[var(--sf-bg)]/50">
              <BrandMark size={24} />
            </div>
            <h2 className="text-2xl font-heading font-bold text-[var(--sf-text)] tracking-tight">
              {tab === 'signin' ? 'Sign in to Skillfy' : 'Create your account'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--sf-secondary)]">
              {tab === 'signin'
                ? 'Select a demo persona or enter your credentials.'
                : 'Join events and experience balanced team formation.'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[var(--sf-bg)] border border-[var(--sf-border)] rounded-xl">
            <button
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#C5ADE5] text-[var(--sf-text)] shadow-md shadow-[var(--sf-bg)]/50'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#C5ADE5] text-[var(--sf-text)] shadow-md shadow-[var(--sf-bg)]/50'
                  : 'text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
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
                <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--sf-accent-text)] font-semibold block">
                  Fast Demo Sign In
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PERSONAS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonaLogin(p)}
                      className="flex flex-col items-start p-2.5 rounded-xl border border-[var(--sf-border)] bg-[var(--sf-bg)]/80 hover:bg-[var(--sf-surface)] hover:border-[#C5ADE5]/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-[var(--sf-text)] group-hover:text-[var(--sf-accent-text)] transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[var(--sf-accent-text)] px-1 rounded bg-[var(--sf-bg)] border border-[var(--sf-border)]">
                          {p.accountType === 'organizer' ? 'Host' : 'User'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--sf-muted)] truncate w-full mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[var(--sf-muted)]">
                <div className="h-px flex-1 bg-[var(--sf-border)]/60" />
                <span>or continue with email</span>
                <div className="h-px flex-1 bg-[var(--sf-border)]/60" />
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[var(--sf-secondary)]">Password</label>
                    <a href="/forgot-password" className="text-[11px] text-[var(--sf-accent-text)] hover:underline">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[var(--sf-text)] bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
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
                <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Full name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sf-muted)]" />
                  <input
                    type="password" minLength={8} maxLength={128} aria-describedby="modal-password-guide"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] placeholder:text-[var(--sf-muted)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all"
                  />
                </div>
                <p id="modal-password-guide" className="mt-2 text-xs leading-relaxed text-[var(--sf-secondary)]">{passwordGuide}</p>
              </div>

              {/* Account Type Selector */}
              <div>
                <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'participant'
                        ? 'border-[#C5ADE5] bg-[var(--sf-panel)] text-[var(--sf-text)] font-medium shadow-sm shadow-[#C5ADE5]/30'
                        : 'border-[var(--sf-border)] bg-[var(--sf-bg)]/80 text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Participant</p>
                    <p className="text-[10px] text-[var(--sf-muted)] mt-0.5">Join teams & events</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('organizer')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'organizer'
                        ? 'border-[#C5ADE5] bg-[var(--sf-panel)] text-[var(--sf-text)] font-medium shadow-sm shadow-[#C5ADE5]/30'
                        : 'border-[var(--sf-border)] bg-[var(--sf-bg)]/80 text-[var(--sf-muted)] hover:text-[var(--sf-text)]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-[var(--sf-muted)] mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>

              {/* Primary Skill */}
              <div>
                <label className="text-xs font-medium text-[var(--sf-secondary)] block mb-1">Primary Discipline / Skill</label>
                <select
                  value={primarySkill}
                  onChange={e => setPrimarySkill(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--sf-bg)] border border-[var(--sf-border)] text-sm text-[var(--sf-text)] focus:outline-none focus:border-[#C5ADE5] focus:ring-1 focus:ring-[#C5ADE5]/50 transition-all cursor-pointer"
                >
                  <option value="Frontend Development" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">Frontend Development (React, Vue, Web)</option>
                  <option value="Backend Development" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">Backend Development (Python, Node, Go)</option>
                  <option value="UI/UX Design" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">UI/UX Design & Prototyping</option>
                  <option value="AI & Machine Learning" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">AI & Machine Learning</option>
                  <option value="Data Visualization" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">Data Visualization & Analytics</option>
                  <option value="Project Management" className="bg-[var(--sf-panel)] text-[var(--sf-text)]">Project Management & Strategy</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[var(--sf-text)] bg-[#C5ADE5] hover:bg-[#B69BD8] shadow-lg shadow-[#C5ADE5]/30 hover:shadow-[#B69BD8]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#C5ADE5]"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="pt-2 text-center text-xs text-[var(--sf-muted)]">
            <span>By proceeding, you agree to our </span>
            <span className="text-[var(--sf-accent-text)] hover:underline cursor-pointer">Terms of Service</span>
            <span> and </span>
            <span className="text-[var(--sf-accent-text)] hover:underline cursor-pointer">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
