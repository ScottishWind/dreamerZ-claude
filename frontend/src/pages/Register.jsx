import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';
import { LANGUAGES } from '../hooks/useLanguage';
import { Lock, Mail, User, Briefcase, Globe, Eye, EyeOff } from 'lucide-react';

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/["']/g, '') // Remove quotes to prevent attribute injection
    .replace(/\/\*/g, '') // Remove comment start
    .replace(/\*\//g, '') // Remove comment end
    .replace(/--/g, ''); // Remove SQL comment
};

const ROLE_OPTIONS = [
  {
    value: 'learner',
    label: 'Learner / Student',
    description: 'I want to learn from courses.',
  },
  {
    value: 'supervisor',
    label: 'Parent / Supervisor',
    description: 'I want to monitor a learner\u2019s progress.',
  },
  {
    value: 'creator',
    label: 'Course Creator',
    description: 'I want to build and publish courses.',
  },
];

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('learner');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Trigger all validations
    const nameValid = validateName();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();

    if (!nameValid || !emailValid || !passwordValid) {
      return;
    }

    setLoading(true);
    try {
      const sanitizedName = sanitizeInput(name.trim());
      await register({ username: sanitizedName, email, password, role, preferred_language: preferredLanguage });
      navigate('/learn');
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const validateName = () => {
    const sanitizedName = sanitizeInput(name.trim());

    if (sanitizedName.length === 0) {
      setNameError('Name is required.');
      return false;
    }

    if (sanitizedName.length < 3) {
      setNameError('Name must be at least 3 characters long. Current length: ' + sanitizedName.length);
      return false;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(sanitizedName)) {
      const invalidChars = sanitizedName.replace(/[a-zA-Z0-9\s]/g, '');
      setNameError('Name can only contain letters, numbers, and spaces.');
      return false;
    }

    setNameError('');
    return true;
  };

  const validateEmail = () => {
    const trimmedEmail = email.trim();

    if (trimmedEmail.length === 0) {
      setEmailError('Email is required.');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g., user@example.com).');
      return false;
    }

    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (password.length === 0) {
      setPasswordError('Password is required.');
      return false;
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setPasswordError('Must be at least 8 characters long, with 1 uppercase letter and 1 number.');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    const sanitized = sanitizeInput(value);
    setName(sanitized);
    if (nameError) setNameError('');
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <SEO title="Register" description="Create a DreamerZ_Beta account with your name, email, and password." />
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Create your account</h1>
          <p className="text-slate-600 mb-8">Register with your name, email, and password.</p>

          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            autoComplete="on"
            method="post"
            action="#"
          >
            <label className="block text-sm font-medium text-slate-700">
              Name
              <div className="relative">
                <div className={`mt-2 relative rounded-xl border bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${nameError ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500' : 'border-slate-200'}`}>
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${nameError ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    id="register-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={handleNameChange}
                    onBlur={validateName}
                    className={`w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 outline-none ${nameError ? 'text-rose-900' : 'text-slate-900'}`}
                    placeholder="Your name"
                    required
                    minLength={3}
                  />
                </div>
                {nameError && (
                  <div className="absolute z-10 mt-2 left-0 right-0 bg-rose-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                    <div className="relative">
                      {nameError}
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-rose-600 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Email address
              <div className="relative">
                <div className={`mt-2 relative rounded-xl border bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${emailError ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500' : 'border-slate-200'}`}>
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${emailError ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    id="register-email"
                    name="email"
                    autoComplete="username email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={validateEmail}
                    className={`w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 outline-none ${emailError ? 'text-rose-900' : 'text-slate-900'}`}
                    placeholder="email@example.com"
                    required
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
              <div className="relative">
                <div className={`mt-2 relative rounded-xl border bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${passwordError ? 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500' : 'border-slate-200'}`}>
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${passwordError ? 'text-rose-500' : 'text-slate-400'}`} />
                  <input
                    id="register-password"
                    name="new-password"
                    autoComplete="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={validatePassword}
                    className={`w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-12 outline-none ${passwordError ? 'text-rose-900' : 'text-slate-900'}`}
                    placeholder="Create a password"
                    required
                    minLength={8}
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
                {passwordError && (
                  <div className="absolute z-10 mt-2 left-0 right-0 bg-rose-600 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                    <div className="relative">
                      {passwordError}
                      <div className="absolute -top-1 left-4 w-2 h-2 bg-rose-600 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              I am a…
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none appearance-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {ROLE_OPTIONS.find((o) => o.value === role)?.description}
              </p>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Preferred language
              <div className="mt-2 relative rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={preferredLanguage}
                  onChange={(e) => {
                    const target = LANGUAGES.find((l) => l.code === e.target.value);
                    if (!target || target.disabled) return;
                    setPreferredLanguage(e.target.value);
                  }}
                  className="w-full rounded-xl border-0 bg-transparent py-3 pl-12 pr-4 text-slate-900 outline-none appearance-none cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} disabled={lang.disabled}>
                      {lang.flag} {lang.nativeName} ({lang.name}){lang.disabled ? ' — coming soon' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Only English is available right now. More languages coming soon.
              </p>
            </label>

            {error && <div className="text-sm text-rose-600">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading || nameError || emailError || passwordError}>
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
