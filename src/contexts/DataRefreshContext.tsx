import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getGlobalSettings } from '../lib/db';

interface DataRefreshContextType {
  refreshData: () => void;
  lastRefresh: number;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export const DataRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(60000);

  const refreshData = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  useEffect(() => {
    getGlobalSettings().then(settings => {
      if (settings?.refreshInterval && typeof settings.refreshInterval === 'number') {
        setRefreshIntervalMs(settings.refreshInterval);
      }
    }).catch(console.error);
  }, []);

  // Smooth background sync logic
  useEffect(() => {
    // 1. Polling for background updates
    const interval = setInterval(refreshData, refreshIntervalMs);

    // 2. Refresh when window gains focus (user returns to app)
    const handleFocus = () => {
      // Small debounce/throttle could be added here if needed
      refreshData();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshData, refreshIntervalMs]);

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
