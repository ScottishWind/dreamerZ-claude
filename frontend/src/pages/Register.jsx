import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';
import { LANGUAGES } from '../hooks/useLanguage';
import { Lock, Mail, User, Globe } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!username.match(/^[a-zA-Z0-9_]{3,30}$/)) {
      setError('Username must be 3-30 characters (letters, numbers, underscore only).');
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one uppercase letter and one number.');
      return;
    }

    setLoading(true);
    try {
      await register({ username, email, password, preferred_language: preferredLanguage });
      navigate('/learn');
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Register" description="Create a DreamerZ_Beta account with username, email, and password." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Create your account</h1>
          <p className="text-slate-600 mb-8">Register with a username, password, and email address.</p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Username
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                  placeholder="Choose a username"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email address
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

            <label className="block text-sm font-medium text-slate-700">
              Password
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none"
                  placeholder="Create a password"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Preferred language
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none appearance-none cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.nativeName} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {error && <div className="text-sm text-rose-600">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
