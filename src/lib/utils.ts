import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatFCFA = (amount: any): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount) || numericAmount === null || numericAmount === undefined) {
    return '0 FCFA';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount).replace('XOF', 'FCFA');
};
