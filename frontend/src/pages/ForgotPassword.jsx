import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ForgotPassword = () => {
  const { applyAuthResponse } = useAuth();
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login_id: loginId,
          new_password: password,
          confirm_password: confirm,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || 'Could not reset password.');
      }
      // Server returns a fresh JWT; drop it into auth state and navigate
      // straight to the learning hub instead of bouncing through /login.
      applyAuthResponse(result);
      setDone(true);
      setTimeout(() => navigate('/learn'), 1500);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Forgot password" description="Reset your DreamerZ password without email." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Password reset</h1>
              <p className="text-slate-600">Signing you in with the new password…</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Forgot your password?</h1>
              <p className="text-slate-600 mb-8">
                Enter your username or email along with a new password — you'll be signed in with the new credentials.
              </p>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700">
                  Username or Email
                  <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                      placeholder="yourname or email@example.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  New password
                  <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                      placeholder="At least 8 characters"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Re-enter new password
                  <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                      placeholder="Repeat the password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </label>

                {error && <div className="text-sm text-rose-600">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset password and sign in'}
                </Button>
              </form>

              <p className="mt-6 text-sm text-slate-600">
                Remembered it?{' '}
                <Link to="/login" className="text-primary font-semibold hover:text-primary/80">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
