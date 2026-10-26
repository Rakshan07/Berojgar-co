// ─── Dedicated Login & Sign Up Page ──────────────────────────────────────────
// Wine + Garnet Theme with Interactive 3D WebGL Tubes Cursor Background.

import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, User } from 'lucide-react';
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

  const { dispatch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('participant');

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
  async function handleSignUpSubmit(e) {
    e.preventDefault(); if (loading) return;
    if (accountType === 'organizer') { navigate('/organizer/auth?tab=signup'); return; }
    setLoading(true);
    try {
      await request('/auth/register', {method:'POST',body:JSON.stringify({email:email.trim(),full_name:name.trim(),password,role:accountType})});
      toast.success('Account created.');
      await signIn();
    } catch(error) { toast.error(error.message); } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen bg-[#13080E] text-[#F7FAF8] flex flex-col justify-between overflow-hidden">
      {/* Interactive 3D Tubes Background exclusively mounted on initial Auth screen */}
      <TubesBackground />

      {/* Top Navbar */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BrandWordmark size={20} />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E0CAD3] hover:text-[#F7FAF8] px-3.5 py-1.5 rounded-xl border border-[#5E2A3D] bg-[#210B16]/80 hover:bg-[#32111F] transition-all shadow-sm focus-visible:outline-[#B6264D]"
        >
          <ArrowLeft size={13} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-20 max-w-md w-full mx-auto px-5 my-auto py-8">
        <div className="auth-interactive-card bg-[#210B16]/95 border border-[#5E2A3D] rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(182,38,77,0.22)] backdrop-blur-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[#F7FAF8] tracking-tight">
              {tab === 'signin' ? 'Sign in to your account' : 'Start with TeamWeave'}
            </h1>
            <p className="text-xs sm:text-sm text-[#E0CAD3]">
              {tab === 'signin'
                ? 'Welcome back. Form high-performing teams with explainable match algorithms.'
                : 'Create your profile once and unlock balanced team recommendations.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#13080E]/80 border border-[#5E2A3D] rounded-xl">
            <button
              type="button"
              onClick={() => setTab('signin')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-[#B6264D] text-white shadow-md shadow-black/50'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setTab('signup')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#B6264D] text-white shadow-md shadow-black/50'
                  : 'text-[#BCA2AD] hover:text-[#F7FAF8]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {tab === 'signin' ? (
            <div className="space-y-5">
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[#E0CAD3] block mb-1">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#210B16] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-[#E0CAD3]">Password</label>
                    <Link to="/forgot-password" className="text-[11px] text-[#F4A7BB] hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BCA2AD]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#210B16] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                aria-busy={loading}
                disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
                >
                  <span>Sign In to Account</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          ) : (
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#210B16] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#210B16] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
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
                    placeholder="Create a secure password (min 8 chars)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#210B16] border border-[#5E2A3D] text-sm text-[#F7FAF8] placeholder:text-[#BCA2AD] focus:outline-none focus:border-[#B6264D] focus:ring-1 focus:ring-[#B6264D]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#E0CAD3] block mb-1.5">I am joining as:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('participant')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'participant'
                        ? 'border-[#B6264D] bg-[#32111F] text-white font-medium shadow-sm shadow-[#B6264D]/30'
                        : 'border-[#5E2A3D] bg-[#210B16] text-[#BCA2AD] hover:text-[#F7FAF8]'
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
                        ? 'border-[#B6264D] bg-[#32111F] text-white font-medium shadow-sm shadow-[#B6264D]/30'
                        : 'border-[#5E2A3D] bg-[#210B16] text-[#BCA2AD] hover:text-[#F7FAF8]'
                    }`}
                  >
                    <p className="text-xs font-semibold">Event Host</p>
                    <p className="text-[10px] text-[#BCA2AD] mt-0.5">Organize & form teams</p>
                  </button>
                </div>
              </div>



              <button
                type="submit"
                aria-busy={loading}
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#B6264D] hover:bg-[#D13D65] shadow-lg shadow-[#B6264D]/30 hover:shadow-[#D13D65]/40 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-[#B6264D]"
              >
                <span>Create Account & Enter</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-4 text-center text-xs text-[#BCA2AD]">
        TeamWeave — Professional Skill-Based Teaming Architecture
      </footer>
    </div>
  );
}
