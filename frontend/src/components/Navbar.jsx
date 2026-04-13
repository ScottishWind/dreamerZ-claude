import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, BookOpen, FlaskConical, Users, LayoutGrid, Settings, Mic, Brain } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navLinks = [
  { path: '/tools', label: 'AI Learning', icon: Brain, highlight: 'indigo' },
  { path: '/tools/spoken-english-30day', label: 'Spoken English', icon: Mic, highlight: 'rose' },
  { path: '/prompt-lab', label: 'Prompt Lab', icon: FlaskConical },
  { path: '/curriculum', label: 'Curriculum', icon: LayoutGrid },
  { path: '/parents', label: 'For Parents', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">
              DreamerZ<span className="text-primary">_Beta</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path + '/'));
              const isExactActive = location.pathname === link.path;
              const hlColor = link.highlight; // 'indigo', 'rose', or falsy
              const colorMap = {
                indigo: { active: 'text-indigo-600 bg-indigo-50', idle: 'text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50' },
                rose: { active: 'text-rose-600 bg-rose-50', idle: 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' }
              };
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-${link.path.slice(1).replace(/\//g, '-')}`}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                    ${isExactActive
                      ? hlColor
                        ? colorMap[hlColor].active
                        : 'text-primary bg-primary/10'
                      : hlColor
                        ? colorMap[hlColor].idle
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  {hlColor && <link.icon className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth + CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-slate-700">Hi, {user?.username}</span>
                <button
                  onClick={logout}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="nav-mobile-toggle"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                const hlColor = link.highlight;
                const mobileColorMap = {
                  indigo: { active: 'bg-indigo-600 text-white', idle: 'text-indigo-600 hover:bg-indigo-50', badge: 'bg-indigo-100 text-indigo-600' },
                  rose: { active: 'bg-rose-500 text-white', idle: 'text-rose-500 hover:bg-rose-50', badge: 'bg-rose-100 text-rose-600' }
                };
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    data-testid={`nav-mobile-${link.path.slice(1).replace(/\//g, '-')}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
                      ${isActive
                        ? hlColor ? mobileColorMap[hlColor].active : 'bg-primary text-white'
                        : hlColor ? mobileColorMap[hlColor].idle : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                    {hlColor && !isActive && (
                      <span className={`${mobileColorMap[hlColor].badge} text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto`}>
                        {hlColor === 'rose' ? 'NEW' : '5 TOOLS'}
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className="pt-2 space-y-2">
                {isAuthenticated ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                      Signed in as {user?.username}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-100"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-100">
                        Login
                      </button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <button className="w-full bg-primary text-white px-4 py-3 rounded-xl font-medium hover:bg-primary/90">
                        Register
                      </button>
                    </Link>
                  </>
                )}
                <Link to="/tools" onClick={() => setIsOpen(false)}>
                  <button className="w-full bg-primary text-white px-5 py-3 rounded-xl font-medium">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
