import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

// Sanitize error messages to prevent XSS
const sanitizeError = (error) => {
  if (typeof error !== 'string') return 'An error occurred';
  return error
    .replace(/[<>]/g, '')
    .replace(/["']/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = () => {
    const trimmedEmail = email.trim();

    if (trimmedEmail.length === 0) {
      setEmailError('Email is required.');
      return false;
    }

    if (trimmedEmail.length > 254) {
      setEmailError('Email is too long (max 254 characters).');
      return false;
    }

    // More strict email validation: require at least 2 chars in TLD
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g., user@example.com).');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validate email before submitting
    const emailValid = validateEmail();
    if (!emailValid) {
      return;
    }

    setLoading(true);

    try {
      await login({ email, password });
      navigate('/learn');
    } catch (err) {
      setError(sanitizeError(err.message) || 'Unable to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Login" description="Login to DreamerZ_Lite to save your progress and access your account." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Welcome back</h1>
          <p className="text-slate-600 mb-8">Login with your email and password.</p>

          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            autoComplete="on"
            method="post"
            action="#"
          >
            <label className="block text-sm font-medium text-slate-700">
              Email
              <div className="relative">
                <div className={`mt-2 relative rounded-xl border bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${emailError ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500' : 'border-slate-200'}`}>
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${emailError ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username email"
                    inputMode="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={validateEmail}
                    className={`w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 outline-none ${emailError ? 'text-rose-900' : 'text-slate-900'}`}
                    placeholder="email@example.com"
                    required
                    maxLength={254}
                  />
                </div>
                {emailError && (
                  <div className="absolute z-10 mt-2 left-0 right-0 bg-rose-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                    <div className="relative">
                      {emailError}
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-rose-600 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-12 text-slate-900 outline-none"
                  placeholder="Enter your password"
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="text-sm text-rose-600 space-y-1">
                <div>{error}</div>
                <Link
                  to="/forgot-password"
                  className="inline-block text-primary font-semibold hover:text-primary/80"
                >
                  Forget my password →
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || emailError}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New here?{' '}
            <Link to="/register" className="text-primary font-semibold hover:text-primary/80">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            <Link to="/forgot-password" className="hover:text-slate-700">
              Forget my password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
