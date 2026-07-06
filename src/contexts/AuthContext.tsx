import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { getApiUrl } from '../lib/api';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginAsMock: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setProfile(data);
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Auth fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const baseUrl = getApiUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setProfile(data.user);
    } else {
      const err = await response.json();
      throw new Error(err.error || "Échec de la connexion");
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    const baseUrl = getApiUrl();
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setProfile(data.user);
    } else {
      const err = await response.json();
      throw new Error(err.error || "Échec de l'inscription");
    }
  };

  const logOut = async () => {
    localStorage.removeItem('auth_token');
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
