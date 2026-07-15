import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  id: string;
  name: string;
}

interface CustomSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Sélectionner...",
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const safeOptions = options || [];
  const selectedOption = safeOptions.find(opt => opt.id === value);
  const displayValue = selectedOption ? selectedOption.name : (value || search);

  useEffect(() => {
    if (!value) {
      setSearch('');
    }
  }, [value]);

  const filteredOptions = safeOptions.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const trimmedSearch = search.trim();
        if (trimmedSearch !== '') {
          const exactMatch = safeOptions.find(opt => opt.name.toLowerCase() === trimmedSearch.toLowerCase());
          if (exactMatch) {
            onChange(exactMatch.id);
          } else {
            onChange(trimmedSearch);
          }
        }
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [search, safeOptions, onChange]);

  return (
    <div className={cn("relative flex-1", isOpen && "z-[1010]")} ref={dropdownRef}>
      <div className="group">
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1 flex items-center gap-1.5 px-1">
          {Icon && <Icon size={12} className="text-red-500" />}
          {label}
        </p>
        <div className={cn(
          "flex items-center justify-between px-4 py-3 bg-white border-2 rounded-2xl transition-all duration-200",
          isOpen ? "border-red-500 shadow-lg shadow-red-50" : "border-slate-50 hover:border-slate-200"
        )}>
          <input
            type="text"
            value={isOpen ? search : (displayValue === placeholder ? '' : displayValue)}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              onChange(val);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={cn(
              "text-sm font-bold truncate bg-transparent outline-none w-full",
              selectedOption || value ? "text-slate-900" : "text-slate-400"
            )}
          />
          <ChevronDown 
            size={16} 
            onClick={() => setIsOpen(!isOpen)}
            className={cn("text-slate-400 transition-transform duration-200 cursor-pointer ml-2", isOpen && "rotate-180 text-red-500")} 
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[1010] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm font-bold cursor-pointer transition-colors",
                    value === option.id 
                      ? "bg-red-50 text-red-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {option.name}
                  {value === option.id && <Check size={14} className="text-red-600" />}
                </div>
              ))
            ) : search ? (
              <div 
                onClick={() => {
                  onChange(search);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 cursor-pointer flex items-center justify-between"
              >
                <span>Utiliser "{search}"</span>
                <span className="text-[10px] uppercase font-black bg-red-100 px-2 py-0.5 rounded">Nouveau</span>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                Aucune option
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
