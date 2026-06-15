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
  options, 
  value, 
  onChange, 
  placeholder = "Sélectionner...",
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer group"
      >
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1 flex items-center gap-1.5 px-1">
          {Icon && <Icon size={12} className="text-red-500" />}
          {label}
        </p>
        <div className={cn(
          "flex items-center justify-between px-4 py-3 bg-white border-2 rounded-2xl transition-all duration-200",
          isOpen ? "border-red-500 shadow-lg shadow-red-50" : "border-slate-50 hover:border-slate-200"
        )}>
          <span className={cn(
            "text-sm font-bold truncate",
            selectedOption ? "text-slate-900" : "text-slate-400"
          )}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronDown 
            size={16} 
            className={cn("text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-red-500")} 
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto no-scrollbar">
            {options.length > 0 ? options.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
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
            )) : (
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
