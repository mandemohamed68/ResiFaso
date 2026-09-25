import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Coins } from 'lucide-react';
import { useCurrency, CurrencyCode, CURRENCY_RATES } from '../../contexts/CurrencyContext';
import { cn } from '../../lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
}

export const CurrencySelector: React.FC<Props> = ({ className, compact = false }) => {
  const { currency, setCurrency, rates } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentRate = rates[currency] || rates.XOF;

  return (
    <div className={cn("relative inline-block text-left shrink-0", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center rounded-lg sm:rounded-xl border transition-all text-xs font-bold cursor-pointer select-none active:scale-95",
          compact 
            ? "gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs" 
            : "gap-1.5 px-2.5 py-1.5",
          "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
          "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
          isOpen && "ring-2 ring-red-500/20 border-red-500/50"
        )}
        title="Changer la devise d'affichage"
        aria-label="Sélecteur de devise"
      >
        <span className="text-xs sm:text-sm leading-none">{currentRate.flag}</span>
        <span className="tracking-tight sm:tracking-wide font-extrabold">{currency}</span>
        {!compact && <span className="text-[10px] text-slate-400 font-medium">({currentRate.symbol})</span>}
        <ChevronDown size={11} className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Coins size={12} className="text-amber-500" />
              Devise d'affichage
            </span>
          </div>

          <div className="space-y-0.5 px-1">
            {(Object.keys(rates) as CurrencyCode[]).map((code) => {
              const rate = rates[code];
              const isSelected = currency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCurrency(code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer",
                    isSelected 
                      ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-black" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{rate.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{code}</span>
                        <span className="text-[11px] text-slate-400">({rate.symbol})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {rate.name}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-red-600 dark:text-red-400 stroke-[3]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-1.5 px-3 border-t border-slate-100 dark:border-slate-700/60">
            <p className="text-[9.5px] text-slate-400 dark:text-slate-500 leading-tight">
              Paiement final en Franc CFA (XOF) par Mobile Money / Carte.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
