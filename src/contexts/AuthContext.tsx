import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { apiFetch } from '../lib/api';
import { registerPushNotifications, unregisterPushNotifications } from '../lib/notifications';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role?: string, idFront?: string, idBack?: string) => Promise<void>;
  loginAsMock: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('resifaso_cached_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('resifaso_cached_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('resifaso_cached_user');
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setProfile(data);
        try {
          localStorage.setItem('resifaso_cached_user', JSON.stringify(data));
        } catch (e) {}
      } else if (response.status === 401 || response.status === 403) {
        // Only log out on authentication errors
        localStorage.removeItem('auth_token');
        localStorage.removeItem('resifaso_cached_user');
        setUser(null);
        setProfile(null);
      }
      // For other errors (like 500 or network issues), we keep the current state 
      // and wait for the next attempt or a manual refresh.
    } catch (err) {
      console.error("Auth fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Auto sync profile status live every 8s when authenticated
    const interval = setInterval(() => {
      if (localStorage.getItem('auth_token')) {
        fetchProfile();
      }
    }, 8000);

    const handleFocus = () => {
      if (localStorage.getItem('auth_token')) {
        fetchProfile();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (user?.uid) {
      registerPushNotifications(user.uid);
    } else {
      unregisterPushNotifications();
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('resifaso_cached_user', JSON.stringify(data.user));
      setUser(data.user);
      setProfile(data.user);
    } else {
      const err = await response.json();
      throw new Error(err.error || "Échec de la connexion");
    }
  };

  const register = async (email: string, password: string, displayName: string, role?: string, idFront?: string, idBack?: string) => {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role, identity_document_front: idFront, identity_document_back: idBack })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('resifaso_cached_user', JSON.stringify(data.user));
      setUser(data.user);
      setProfile(data.user);
    } else {
      const err = await response.json();
      throw new Error(err.error || "Échec de l'inscription");
    }
  };

  const logOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('resifaso_cached_user');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const loginAsMock = async (role: UserRole) => {
    // Generate a temporary mock user
    const mockUser = {
      uid: `mock_${role}`,
      email: `${role}@mock.com`,
      displayName: `Mock ${role}`,
      role: role,
      isVerified: true,
      createdAt: new Date().toISOString()
    };
    setUser(mockUser);
    setProfile(mockUser);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logOut, refreshProfile, login, register, loginAsMock }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
