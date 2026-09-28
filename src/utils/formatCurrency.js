/**
 * Utility functions for currency formatting in PresenTrain
 */

export function formatCurrency(amount, currency = 'IDR') {
  if (amount === undefined || amount === null) return 'Rp 0';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return 'Rp 0';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}
