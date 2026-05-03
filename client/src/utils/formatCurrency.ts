export function formatCurrency(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined) {
    return '-';
  }

  const suffix = currency ? ` ${currency}` : '';
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}
