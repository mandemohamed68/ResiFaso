import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConciergeContextType {
  isConciergeOpen: boolean;
  openConcierge: (residenceTitle?: string, residenceCity?: string) => void;
  closeConcierge: () => void;
  residenceTitle?: string;
  residenceCity?: string;
}

const ConciergeContext = createContext<ConciergeContextType | undefined>(undefined);

export const ConciergeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [residenceTitle, setResidenceTitle] = useState<string | undefined>();
  const [residenceCity, setResidenceCity] = useState<string | undefined>();

  const openConcierge = (title?: string, city?: string) => {
    setResidenceTitle(title);
    setResidenceCity(city);
    setIsConciergeOpen(true);
  };

  const closeConcierge = () => {
    setIsConciergeOpen(false);
    setResidenceTitle(undefined);
    setResidenceCity(undefined);
  };

  return (
    <ConciergeContext.Provider
      value={{
        isConciergeOpen,
        openConcierge,
        closeConcierge,
        residenceTitle,
        residenceCity
      }}
    >
      {children}
    </ConciergeContext.Provider>
  );
};

export const useConcierge = () => {
  const context = useContext(ConciergeContext);
  if (!context) {
    throw new Error('useConcierge must be used within a ConciergeProvider');
  }
  return context;
};
