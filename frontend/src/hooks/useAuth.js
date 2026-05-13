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

const storePasswordCredential = async ({ username, email, password }) => {
  if (!window.PasswordCredential || !navigator.credentials || !password) {
    return;
  }

  try {
    const credential = new window.PasswordCredential({
      id: email || username,
      name: username || email,
      password,
    });
    await navigator.credentials.store(credential);
  } catch (error) {
    console.debug('Password credential storage was skipped', error);
  }
};

const buildUserProfile = ({ username, email, profile, lastLoginAt, createdAt, preferredLanguage, role, aiGenerationEnabled }) => ({
  username,
  email,
  role: role || 'learner',
  aiGenerationEnabled: aiGenerationEnabled || false,
  preferredLanguage: preferredLanguage || 'en',
  firstName: profile?.firstName || '',
  lastName: profile?.lastName || '',
  phone: profile?.phone || '',
  bio: profile?.bio || '',
  location: profile?.location || '',
  lastLoginAt: lastLoginAt || new Date().toISOString(),
  createdAt: createdAt || new Date().toISOString()
});

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.token && stored?.user) {
      if (isTokenExpired(stored.token)) {
        // Token expired — clear stored auth
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setUser(buildUserProfile(stored.user));
        setToken(stored.token);
      }
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
      user: buildUserProfile({
        username: result.username,
        email: result.email,
        preferredLanguage: result.preferred_language,
        profile: result.profile,
        createdAt: result.created_at,
        lastLoginAt: new Date().toISOString(),
        role: result.role,
        aiGenerationEnabled: result.ai_generation_enabled,
      })
    };

    saveAuth(auth);
    setUser(auth.user);
    setToken(auth.token);
    await storePasswordCredential({ username: result.username || username, email: result.email || email, password });
    return auth;
  }, []);

  const register = useCallback(async ({ username, email, password, preferred_language, role }) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        password,
        preferred_language: preferred_language || 'en',
        role: role || 'learner',
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || result.message || 'Registration failed');
    }

    await login({ username, email, password });
    navigate('/learn');
    return result;
  }, [login, navigate]);

  // Swap in a fresh TokenResponse (e.g. after change-password).
  // Keeps the user logged in seamlessly without bouncing through /login.
  const applyAuthResponse = useCallback((response) => {
    const auth = {
      token: response.access_token,
      user: buildUserProfile({
        username: response.username,
        email: response.email,
        preferredLanguage: response.preferred_language,
        profile: response.profile,
        createdAt: response.created_at,
        lastLoginAt: new Date().toISOString(),
        role: response.role,
        aiGenerationEnabled: response.ai_generation_enabled,
      })
    };
    saveAuth(auth);
    setUser(auth.user);
    setToken(auth.token);
    return auth;
  }, []);

  const updateProfile = useCallback((updates) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const nextUser = {
        ...currentUser,
        ...updates
      };

      const stored = getStoredAuth();
      if (stored?.token) {
        saveAuth({
          ...stored,
          user: nextUser
        });
      }

      return nextUser;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        const updatedUser = buildUserProfile({
          username: result.username,
          email: result.email,
          preferredLanguage: result.preferred_language,
          profile: result.profile,
          createdAt: result.created_at,
          lastLoginAt: new Date().toISOString(),
          role: result.role,
          aiGenerationEnabled: result.ai_generation_enabled,
        });
        const stored = getStoredAuth();
        if (stored?.token) {
          saveAuth({ ...stored, user: updatedUser });
        }
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data', error);
    }
  }, [token]);

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
        applyAuthResponse,
        updateProfile,
        refreshUser,
        logout,
        hasRole: (user, ...roles) => roles.includes(user?.role || 'learner'),
        isAdmin: () => user?.role === 'admin',
        isCreator: () => user?.role === 'creator' || user?.role === 'admin',
        isSupervisor: () => user?.role === 'supervisor' || user?.role === 'admin',
        isLearner: () => user?.role === 'learner' || (!user?.role),
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
