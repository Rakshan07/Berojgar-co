// ─── Forgot Password: email → OTP → new password ─────────────────────────────
// Talks to the FastAPI backend (/auth/forgot-password, /auth/reset-password).

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail, Lock, KeyRound } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const inputCls =
  'w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#17080F]/80 border border-[#633044] text-sm text-[#FFF4F6] placeholder:text-[#B68F9E] focus:outline-none focus:border-[#F7A5BD] focus:ring-1 focus:ring-[#F7A5BD]/50 transition-all';
const btnCls =
  'w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-[#FFF4F6] bg-[#B92345] hover:bg-[#D23357] disabled:opacity-60 shadow-lg shadow-[#B92345]/30 transition-all flex items-center justify-center gap-2 cursor-pointer';

async function post(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? 'Please check the details you entered.' : data.detail;
    throw new Error(detail || 'Something went wrong. Please try again.');
  }
  return data;
}

export default function ForgotPassword({ initialEmail = '', onBack }) {
  const toast = useToast();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode(e) {
    e?.preventDefault();
    if (!email.trim()) {
      toast.warn('Please enter your email');
      return;
    }
    setBusy(true);
    try {
      await post('/auth/forgot-password', { email: email.trim() });
      toast.success('If that email is registered, a 6-digit code is on its way.');
      setStep('reset');
    } catch (err) {
      toast.error(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.warn('Enter the 6-digit code from your email');
      return;
    }
    if (password.length < 8) {
      toast.warn('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      await post('/auth/reset-password', { email: email.trim(), otp, new_password: password });
      toast.success('Password updated. Please sign in.');
      onBack();
    } catch (err) {
      toast.error(err.message === 'Failed to fetch' ? 'Cannot reach the server.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-[#D7B7C2] hover:text-[#FFF4F6] cursor-pointer"
      >
        <ArrowLeft size={13} /> Back to sign in
      </button>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-3.5">
          <p className="text-xs text-[#D7B7C2]">
            Enter your account email and we'll send you a 6-digit verification code.
          </p>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={busy} className={btnCls}>
            <span>{busy ? 'Sending…' : 'Send code'}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-3.5">
          <p className="text-xs text-[#D7B7C2]">
            Enter the code sent to <strong className="text-[#FFF4F6]">{email}</strong>. It expires in 10 minutes.
          </p>
          <div className="relative">
            <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
            <input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className={`${inputCls} tracking-[0.3em]`}
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B68F9E]" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={busy} className={btnCls}>
            <span>{busy ? 'Updating…' : 'Reset password'}</span>
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="w-full text-[11px] text-[#F28BA8] hover:underline cursor-pointer"
          >
            Didn't get a code? Send again
          </button>
        </form>
      )}
    </div>
  );
}
