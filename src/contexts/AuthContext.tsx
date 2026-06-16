import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginAsMock: (mockRole: 'client' | 'owner-1' | 'owner-2' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('resifaso_token');
      if (!token) throw new Error("No token");
      
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Invalid token");
      
      const data = await res.json();
      setUser({ uid: data.user.uid, email: data.user.email, displayName: data.user.displayName });
      setProfile({
        uid: data.user.uid,
        email: data.user.email,
        displayName: data.user.displayName,
        role: data.user.role,
        isVerified: true,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem('resifaso_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const signIn = async () => {
    console.warn("signIn with Google is disabled in autonomous MariaDB mode");
  };

  const logOut = async () => {
    localStorage.removeItem('resifaso_token');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const loginAsMock = async (mockRole: 'client' | 'owner-1' | 'owner-2' | 'admin') => {
    setLoading(true);
    let email = 'traveler@burkina.bf';
    let password = 'password';

    if (mockRole === 'owner-1') {
      email = 'hote1@burkina.bf';
    } else if (mockRole === 'owner-2') {
      email = 'hote2@burkina.bf';
    } else if (mockRole === 'admin') {
      email = 'mandemohamed68@gmail.com';
      password = 'mm@27071986@';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('resifaso_token', data.token);
        await fetchProfile();
      }
    } catch (e) {
      console.error("Failed to sign in as mock user:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logOut, refreshProfile, loginAsMock }}>
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
