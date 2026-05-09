import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, BarChart3, LogOut, Shield } from 'lucide-react';

export const UserMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-colors text-sm text-slate-200"
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="hidden sm:inline font-medium truncate max-w-[120px]">
          {user?.name || user?.email || 'Account'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg shadow-black/20 border border-slate-200 py-1 z-50 overflow-hidden"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.name || user?.username || 'Dreamer'}
              </p>
              {user?.isAdmin && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  ADMIN
                </span>
              )}
            </div>
            {user?.email && (
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            )}
          </div>

          {/* Menu items */}
          {user?.isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Shield className="w-4 h-4 text-amber-500" />
              Admin Panel
            </Link>
          )}

          <Link
            to="/myprogress"
            role="menuitem"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-slate-400" />
            My Progress
          </Link>

          <Link
            to="/account"
            role="menuitem"
            onClick={handleLinkClick}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <User className="w-4 h-4 text-slate-400" />
            Account
          </Link>

          {/* Divider */}
          <div className="border-t border-slate-100 my-1" />

          <button
            role="menuitem"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
