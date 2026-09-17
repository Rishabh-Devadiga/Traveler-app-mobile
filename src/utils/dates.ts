/**
 * Lightweight trip-date helpers (Phase 4). No date library — parsing and
 * formatting are local-midnight based so mobile date inputs (`YYYY-MM-DD`)
 * never shift across timezones.
 */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a `YYYY-MM-DD` string to a local-midnight Date, or undefined when invalid. */
export function parseISODate(iso: string): Date | undefined {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

/** Nights between two `YYYY-MM-DD` dates, or undefined when invalid or end < start. */
export function diffNights(startISO: string, endISO: string): number | undefined {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end) return undefined;
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights >= 0 ? nights : undefined;
}

/** Inclusive trip days for a range (`12 → 15 Oct` = 4), or undefined when invalid. */
export function durationDaysFromRange(startISO: string, endISO: string): number | undefined {
  const nights = diffNights(startISO, endISO);
  return nights === undefined ? undefined : nights + 1;
}

/** Format `YYYY-MM-DD` as `12 Oct 2026` (project convention), or '' when invalid. */
export function formatTripDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format a range as `12 Oct 2026 → 15 Oct 2026`, or '' when either side is invalid. */
export function tripDateRangeLabel(startISO: string, endISO: string): string {
  const start = formatTripDate(startISO);
  const end = formatTripDate(endISO);
  return start && end ? `${start} → ${end}` : '';
}

/** Format a day count as `4 Days, 3 Nights` (singular-aware). */
export function daysNightsLabel(days: number): string {
  const nights = Math.max(days - 1, 0);
  const dayWord = days === 1 ? 'Day' : 'Days';
  const nightWord = nights === 1 ? 'Night' : 'Nights';
  return `${days} ${dayWord}, ${nights} ${nightWord}`;
}
