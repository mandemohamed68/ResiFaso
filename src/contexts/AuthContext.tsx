import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  loginAsMock: (mockRole: 'client' | 'owner-1' | 'owner-2' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (firebaseUser: User) => {
    const docRef = doc(db, 'users', firebaseUser.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      // Auto-upgrade super admin if role is different
      if (data.email === 'mandemohamed68@gmail.com' && data.role !== 'admin') {
        const updatedProfile = { ...data, role: 'admin' as UserRole };
        await setDoc(docRef, updatedProfile);
        setProfile(updatedProfile);
      } else {
        setProfile(data);
      }
    } else {
      // Create default profile for new users
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Voyageur',
        role: firebaseUser.email === 'mandemohamed68@gmail.com' ? 'admin' : 'client',
        isVerified: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(docRef, newProfile);
      setProfile(newProfile);
    }
  };

  useEffect(() => {
    // Check if there is a saved super admin session or other mock user session
    const isSuperAdminSaved = localStorage.getItem('super_admin_logged_in') === 'true';
    const savedMockSession = localStorage.getItem('mock_user_session');

    if (isSuperAdminSaved || savedMockSession) {
      let mockUser: any;
      let mockProfile: UserProfile;

      if (isSuperAdminSaved) {
        mockUser = {
          uid: 'mock-admin-mande',
          email: 'mandemohamed68@gmail.com',
          displayName: 'Mohamed Mandé',
          isAnonymous: true,
        };
        mockProfile = {
          uid: 'mock-admin-mande',
          email: 'mandemohamed68@gmail.com',
          displayName: 'Mohamed Mandé',
          role: 'admin',
          isVerified: true,
          createdAt: new Date().toISOString()
        };
      } else {
        try {
          const parsed = JSON.parse(savedMockSession!);
          mockUser = {
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            isAnonymous: true,
          };
          mockProfile = {
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            role: parsed.role,
            isVerified: true,
            createdAt: new Date().toISOString()
          };
        } catch (e) {
          localStorage.removeItem('mock_user_session');
          setLoading(false);
          return;
        }
      }

      setUser(mockUser as unknown as User);
      setProfile(mockProfile);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    localStorage.removeItem('super_admin_logged_in');
    localStorage.removeItem('mock_user_session');
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const loginAsMock = async (mockRole: 'client' | 'owner-1' | 'owner-2' | 'admin') => {
    setLoading(true);
    let targetUid = 'mock-traveler';
    let targetEmail = 'traveler@burkina.bf';
    let targetDisplayName = 'Mamadou Sawadogo';
    let targetRole: UserRole = 'client';

    if (mockRole === 'owner-1') {
      targetUid = 'owner-1';
      targetEmail = 'hote1@burkina.bf';
      targetDisplayName = 'Ibrahim Ouédraogo';
      targetRole = 'owner';
    } else if (mockRole === 'owner-2') {
      targetUid = 'owner-2';
      targetEmail = 'hote2@burkina.bf';
      targetDisplayName = 'Fatoumata Barro';
      targetRole = 'owner';
    } else if (mockRole === 'admin') {
      targetUid = 'mock-admin-mande';
      targetEmail = 'mandemohamed68@gmail.com';
      targetDisplayName = 'Mohamed Mandé';
      targetRole = 'admin';
    }

    const sessionData = {
      uid: targetUid,
      email: targetEmail,
      displayName: targetDisplayName,
      role: targetRole
    };

    if (targetRole === 'admin') {
      localStorage.setItem('super_admin_logged_in', 'true');
    } else {
      localStorage.setItem('mock_user_session', JSON.stringify(sessionData));
    }

    const mockFirebaseUser = {
      uid: targetUid,
      email: targetEmail,
      displayName: targetDisplayName,
      isAnonymous: true,
    } as unknown as User;

    const mockProfile: UserProfile = {
      uid: targetUid,
      email: targetEmail,
      displayName: targetDisplayName,
      role: targetRole,
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'users', targetUid);
      await setDoc(docRef, mockProfile);
    } catch (dbErr) {
      console.warn("Could not write profile to Firestore, continuing with local session:", dbErr);
    }

    setUser(mockFirebaseUser);
    setProfile(mockProfile);
    setLoading(false);
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
