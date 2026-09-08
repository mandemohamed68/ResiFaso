import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'XOF' | 'EUR' | 'USD' | 'CAD';

export interface CurrencyRate {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateToXOF: number;
}

export const CURRENCY_RATES: Record<CurrencyCode, CurrencyRate> = {
  XOF: { code: 'XOF', symbol: 'F CFA', name: 'Franc CFA', flag: '🇧🇫', rateToXOF: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToXOF: 655.957 },
  USD: { code: 'USD', symbol: '$', name: 'Dollar US', flag: '🇺🇸', rateToXOF: 605 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Dollar Canadien', flag: '🇨🇦', rateToXOF: 445 },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<CurrencyCode, CurrencyRate>;
  formatPrice: (amountInXOF: number | undefined | null, options?: { showEquivalent?: boolean; showSymbol?: boolean }) => string;
  convertFromXOF: (amountInXOF: number | undefined | null) => { value: number; formatted: string; symbol: string; code: CurrencyCode };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const STORAGE_KEY = 'resifaso_active_currency';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'XOF' || saved === 'EUR' || saved === 'USD' || saved === 'CAD')) {
        return saved;
      }
    } catch (_) {}
    return 'XOF';
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch (_) {}
  };

  const convertFromXOF = (amountInXOF: number | undefined | null) => {
    const numeric = typeof amountInXOF === 'number' ? amountInXOF : Number(amountInXOF || 0);
    const activeRate = CURRENCY_RATES[currency] || CURRENCY_RATES.XOF;
    const value = currency === 'XOF' ? numeric : numeric / activeRate.rateToXOF;
    
    let formatted = '';
    if (currency === 'XOF') {
      formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    } else {
      formatted = value.toLocaleString('fr-FR', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
    }

    return {
      value,
      formatted,
      symbol: activeRate.symbol,
      code: currency,
    };
  };

  const formatPrice = (
    amountInXOF: number | undefined | null,
    options?: { showEquivalent?: boolean; showSymbol?: boolean }
  ) => {
    const { showEquivalent = true, showSymbol = true } = options || {};
    const numeric = typeof amountInXOF === 'number' ? amountInXOF : Number(amountInXOF || 0);
    const baseFormatted = Math.round(numeric).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    if (currency === 'XOF') {
      return showSymbol ? `${baseFormatted} F CFA` : baseFormatted;
    }

    const converted = convertFromXOF(numeric);
    const primaryStr = `${converted.formatted} ${converted.symbol}`;

    if (showEquivalent) {
      return `${primaryStr} (~${baseFormatted} F CFA)`;
    }
    return primaryStr;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates: CURRENCY_RATES, formatPrice, convertFromXOF }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Fallback for components rendered outside provider
    return {
      currency: 'XOF' as CurrencyCode,
      setCurrency: () => {},
      rates: CURRENCY_RATES,
      convertFromXOF: (amount: any) => {
        const num = Number(amount || 0);
        return {
          value: num,
          formatted: Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
          symbol: 'F CFA',
          code: 'XOF' as CurrencyCode,
        };
      },
      formatPrice: (amount: any) => {
        const num = Number(amount || 0);
        return `${Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F CFA`;
      }
    };
  }
  return context;
};
