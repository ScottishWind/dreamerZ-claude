import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { Mail, CheckCircle2 } from 'lucide-react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Could not send reset email. Try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Forgot password" description="Reset your DreamerZ password via email." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
              <p className="text-slate-600 mb-6">
                If <span className="font-medium">{email}</span> is registered with us, a password
                reset link is on its way. The link expires in 1 hour.
              </p>
              <Link to="/login" className="text-primary font-semibold hover:text-primary/80 text-sm">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Forgot password?</h1>
              <p className="text-slate-600 mb-8">
                Enter the email associated with your account and we'll send you a reset link.
              </p>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </label>

                {error && <div className="text-sm text-rose-600">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
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
