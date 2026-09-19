/** Format an INR amount with Indian digit grouping, e.g. 60000 -> "₹60,000". */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Format a money amount in the backend-provided currency (from trip_card).
 * Falls back to "<CODE> <grouped>" when Intl rejects the code — never
 * converts, never invents symbols.
 */
export function formatMoney(amount: number, currency?: string | null): string {
  const rounded = Math.round(amount);
  if (!currency) return rounded.toLocaleString('en-IN');
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return `${currency} ${rounded.toLocaleString('en-IN')}`;
  }
}
