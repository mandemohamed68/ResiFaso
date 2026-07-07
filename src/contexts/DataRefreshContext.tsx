import React, { createContext, useContext, useState, useCallback } from 'react';

interface DataRefreshContextType {
  refreshData: () => void;
  lastRefresh: number;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export const DataRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  return (
    <DataRefreshContext.Provider value={{ refreshData, lastRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (!context) throw new Error('useDataRefresh must be used within DataRefreshProvider');
  return context;
};
