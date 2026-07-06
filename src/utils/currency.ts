export const formatCurrency = (amount: any): string => {
  if (amount === undefined || amount === null) return '0';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount)) return '0';
  return Math.round(numericAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
