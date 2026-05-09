import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ChangePassword = () => {
  const { token, isAuthenticated, isLoaded, applyAuthResponse } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Bounce unauthenticated users to login.
    if (isLoaded && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoaded, isAuthenticated, navigate]);

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
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: password, confirm_password: confirm }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || 'Could not update password.');
      }
      // Server returns a fresh JWT signed against the new hash; swap it in
      // so the user stays authenticated without re-entering credentials.
      applyAuthResponse(result);
      setDone(true);
      setTimeout(() => navigate('/learn'), 1500);
    } catch (err) {
      setError(err.message || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Reset password" description="Set a new password for your DreamerZ account." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Password updated</h1>
              <p className="text-slate-600">Redirecting you to your learning hub…</p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Reset password</h1>
              <p className="text-slate-600 mb-8">
                Choose a new password for your account. You'll stay signed in.
              </p>

              <form className="space-y-6" onSubmit={handleSubmit}>
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

                <div className="flex items-center gap-3">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Saving…' : 'Save new password'}
                  </Button>
                  <Link
                    to="/account"
                    className="text-sm text-slate-600 hover:text-slate-900 px-4 py-3"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
