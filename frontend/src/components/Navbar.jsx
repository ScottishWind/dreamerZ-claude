import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, BookOpen, Users, User, BarChart3, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserMenu } from './UserMenu';

const baseNavLinks = [
  { path: '/learn', label: 'Learn', icon: BookOpen },
  { path: '/parents', label: 'For Parents', icon: Users },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = user?.isAdmin
    ? [...baseNavLinks, { path: '/admin', label: 'Admin', icon: Shield }]
    : baseNavLinks;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100" aria-label="Main navigation">
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

          {/* Desktop Navigation — 2 tabs */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path + '/'));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={`nav-${link.path.slice(1)}`}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                    ${isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth / User Menu */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <UserMenu user={user} onLogout={logout} />
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
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            data-testid="nav-mobile-toggle"
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
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
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    data-testid={`nav-mobile-${link.path.slice(1)}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
                      ${isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}

              {/* Account section */}
              <div className="pt-3 border-t border-slate-100 mt-2 space-y-1">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/learn"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 font-medium"
                    >
                      <BarChart3 className="w-5 h-5 text-slate-400" />
                      My Progress
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 font-medium"
                    >
                      <User className="w-5 h-5 text-slate-400" />
                      Account
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium"
                    >
                      <LogOut className="w-5 h-5" />
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
                      <button className="w-full bg-primary text-white px-5 py-3 rounded-xl font-medium hover:bg-primary/90 mt-1">
                        Get Started
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
