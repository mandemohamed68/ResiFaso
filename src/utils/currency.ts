export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '0';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
