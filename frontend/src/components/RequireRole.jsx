import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const RequireAuth = ({ children }) => {
  const { isLoaded, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoaded, isAuthenticated, navigate]);

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return children;
};

export const RequireRole = ({ roles = [], children }) => {
  const { user, isLoaded, hasRole, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && (!isAuthenticated || !user)) {
      navigate('/login', { replace: true });
    }
  }, [isLoaded, isAuthenticated, user, navigate]);

  // Show loading spinner while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user has required role
  // Admin users have access to all roles
  const hasAccess = isAdmin() || (roles.length > 0 && hasRole(user, ...roles));

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
};
