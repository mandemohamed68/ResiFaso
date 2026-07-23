import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fr } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { CalendarIcon } from 'lucide-react';

// Use standard locale
registerLocale('fr', fr);

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export const CustomDatePicker = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholderText = "Sélectionner une date",
  className,
  id,
  required
}: CustomDatePickerProps) => {

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  };

  return (
    <div className={cn("relative w-full", className)}>
      <DatePicker
        id={id}
        required={required}
        selected={parseDate(value)}
        onChange={(date) => onChange(formatDate(date))}
        minDate={minDate}
        maxDate={maxDate}
        locale="fr"
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholderText}
        showYearDropdown
        showMonthDropdown
        dropdownMode="select"
        className="bg-transparent border-none outline-none w-full font-bold text-slate-900 text-sm p-0 cursor-pointer"
        calendarClassName="!font-sans !border-none !shadow-xl !rounded-2xl overflow-hidden p-2"
        dayClassName={(date) => "!rounded-full hover:!bg-red-50 hover:!text-red-600 transition-colors"}
        yearDropdownItemNumber={100}
        scrollableYearDropdown
      />
    </div>
  );
};
