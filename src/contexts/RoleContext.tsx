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
  const [currentRole, setCurrentRole] = useState<UserRole>('client');
  
  const isSuperAdmin = profile?.email === 'mandemohamed68@gmail.com' || user?.email === 'mandemohamed68@gmail.com';
  
  // Allow only Super Admin to switch roles
  const canSwitch = isSuperAdmin;

  useEffect(() => {
    if (isSuperAdmin) {
      setCurrentRole('admin');
    } else if (profile) {
      setCurrentRole(profile.role);
    }
  }, [profile, user]);

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
