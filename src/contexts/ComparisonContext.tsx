import React, { createContext, useContext, useState, useEffect } from 'react';
import { Residence } from '../types';

interface ComparisonContextType {
  comparedResidences: Residence[];
  addToCompare: (residence: Residence) => boolean;
  removeFromCompare: (residenceId: string) => void;
  toggleCompare: (residence: Residence) => void;
  isInComparison: (residenceId: string) => boolean;
  clearComparison: () => void;
  isComparatorOpen: boolean;
  setIsComparatorOpen: (open: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const STORAGE_KEY = 'resifaso_compared_residences';

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparedResidences, setComparedResidences] = useState<Residence[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [isComparatorOpen, setIsComparatorOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparedResidences));
    } catch (_) {}
  }, [comparedResidences]);

  const isInComparison = (residenceId: string) => {
    return comparedResidences.some(r => r.id === residenceId);
  };

  const addToCompare = (residence: Residence): boolean => {
    if (comparedResidences.length >= 3) {
      return false;
    }
    if (!isInComparison(residence.id)) {
      setComparedResidences(prev => [...prev, residence]);
    }
    return true;
  };

  const removeFromCompare = (residenceId: string) => {
    setComparedResidences(prev => prev.filter(r => r.id !== residenceId));
  };

  const toggleCompare = (residence: Residence) => {
    if (isInComparison(residence.id)) {
      removeFromCompare(residence.id);
    } else {
      addToCompare(residence);
    }
  };

  const clearComparison = () => {
    setComparedResidences([]);
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparedResidences,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        isInComparison,
        clearComparison,
        isComparatorOpen,
        setIsComparatorOpen,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    return {
      comparedResidences: [],
      addToCompare: () => false,
      removeFromCompare: () => {},
      toggleCompare: () => {},
      isInComparison: () => false,
      clearComparison: () => {},
      isComparatorOpen: false,
      setIsComparatorOpen: () => {},
    };
  }
  return context;
};
