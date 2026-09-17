/** Format an INR amount with Indian digit grouping, e.g. 60000 -> "₹60,000". */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
