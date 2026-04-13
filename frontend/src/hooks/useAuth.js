import { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'dreamerz_beta_auth_v1';
const API_BASE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const AuthContext = createContext(null);

const getStoredAuth = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse auth from localStorage', error);
    return null;
  }
};

const saveAuth = (auth) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.token && stored?.user) {
      setUser(stored.user);
      setToken(stored.token);
    }
    setIsLoaded(true);
  }, []);

  const login = useCallback(async ({ username, email, password }) => {
    const payload = { password };
    if (username) payload.username = username;
    if (email) payload.email = email;

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.message || 'Login failed');
    }

    const auth = {
      token: result.access_token,
      user: {
        username: result.username,
        email: result.email
      }
    };

    saveAuth(auth);
    setUser(auth.user);
    setToken(auth.token);
    return auth;
  }, []);

  const register = useCallback(async ({ username, email, password }) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.message || 'Registration failed');
    }

    await login({ username, email, password });
    navigate('/settings');
    return result;
  }, [login, navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoaded,
        isAuthenticated: Boolean(token),
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
