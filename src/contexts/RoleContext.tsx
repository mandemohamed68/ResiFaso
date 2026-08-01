import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useAuth } from './AuthContext';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  canSwitch: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  
  const isSuperAdmin = profile?.email === 'mandemohamed68@gmail.com' || user?.email === 'mandemohamed68@gmail.com' || profile?.role === 'admin' || user?.role === 'admin';
  const canSwitch = isSuperAdmin;

  // Initialize from localStorage if present
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('resifaso_active_role');
    return (saved as UserRole) || 'client';
  });

  const [hasManuallySetRole, setHasManuallySetRole] = useState(() => {
    return localStorage.getItem('resifaso_has_manually_set_role') === 'true';
  });

  useEffect(() => {
    if (!hasManuallySetRole) {
      if (isSuperAdmin) {
        setCurrentRoleState('admin');
      } else if (profile?.role) {
        setCurrentRoleState(profile.role);
      } else if (user?.role) {
        setCurrentRoleState(user.role);
      }
    }
  }, [profile?.role, user?.role, isSuperAdmin, hasManuallySetRole]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    setHasManuallySetRole(true);
    localStorage.setItem('resifaso_active_role', role);
    localStorage.setItem('resifaso_has_manually_set_role', 'true');
  };

  // Reset manually set role if user logs out
  useEffect(() => {
    if (!user) {
      setHasManuallySetRole(false);
      localStorage.removeItem('resifaso_active_role');
      localStorage.removeItem('resifaso_has_manually_set_role');
    }
  }, [user]);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, canSwitch }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
