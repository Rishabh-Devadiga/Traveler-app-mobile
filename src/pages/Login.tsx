import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError, isApiConfigured } from '../api/client';
import { travelerLogin, travelerSignup } from '../api/auth';

/**
 * Traveler sign-in. Real backend only (`POST /api/auth/traveler/login` or
 * `/signup`) — no demo session is ever created. On success the traveler JWT
 * is stored and the user returns to where they came from.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string; mode?: string } | null)?.from ?? '/home-explore';
  // Signup preselect: /login?mode=signup or navigate('/login', { state: { mode: 'signup' } }).
  const requestedMode =
    (location.state as { mode?: string } | null)?.mode ??
    new URLSearchParams(location.search).get('mode');
  const [mode, setMode] = useState<'login' | 'signup'>(requestedMode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Enter your name.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await travelerSignup(name.trim(), cleanEmail, password);
      } else {
        await travelerLogin(cleanEmail, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setError('Could not reach the WanderAI server. Check your connection and try again.');
      } else if (err instanceof ApiError && err.status === 409) {
        // Duplicate email on signup — show the backend message verbatim.
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else if (err instanceof ApiError && err.status === 422) {
        // Validation error — show the backend detail verbatim.
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-tourflow-bg px-4 py-10 text-tourflow-dark">
      <section className="w-full max-w-md rounded-3xl border border-tourflow-cardBorder bg-white p-6 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">WanderAI · Trip-aware concierge</p>
        <h1 className="mt-1 text-[22px] font-extrabold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">
          {mode === 'login' ? 'Sign in to continue planning.' : 'Sign up to save trips and chat with your guide.'}
        </p>

        {!isApiConfigured() ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
            The WanderAI server is not configured (VITE_TOURFLOW_API_URL). Sign-in needs the backend.
          </p>
        ) : null}

        <form onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-3">
          {mode === 'signup' ? (
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">Name</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 min-h-[52px] w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-[16px] font-semibold outline-none focus:border-tourflow-primary disabled:opacity-60"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[52px] w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-[16px] font-semibold outline-none focus:border-tourflow-primary disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">Password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-[52px] w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-[16px] font-semibold outline-none focus:border-tourflow-primary disabled:opacity-60"
            />
          </label>
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="min-h-[44px] self-start px-1 text-[13px] font-bold text-tourflow-primary" aria-pressed={showPassword}>
            {showPassword ? 'Hide password' : 'Show password'}
          </button>
          {error ? (
            <p role="alert" className="text-[13px] font-semibold text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-[52px] w-full rounded-full bg-tourflow-primary px-4 py-2.5 text-[15px] font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode((m) => (m === 'login' ? 'signup' : 'login'));
            setError(null);
          }}
          className="mt-3 min-h-[44px] w-full text-center text-[13px] font-bold text-tourflow-primary disabled:opacity-60"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
        <button type="button" onClick={() => navigate('/home-explore')} className="min-h-[44px] w-full text-center text-[13px] font-semibold text-tourflow-textMuted">
          Back to Explore
        </button>
      </section>
    </div>
  );
}
