/**
 * Low-budget assessment for the trip-planning flow.
 *
 * There is no backend budget endpoint in the TourFlow contract (verified:
 * `src/api/trips.ts` documents `POST /api/trips`, transport, map and
 * activity routes only — no cost-estimate or minimum-budget route), so the
 * reference comes from data the frontend already ships: the curated
 * destination catalog's per-person trip estimates (`pricePerPerson` over
 * `idealDays`). The resulting threshold therefore scales with the selected
 * destination, trip duration and traveler count — no single hardcoded rupee
 * threshold anywhere in this module.
 *
 * Returned `null` means "cannot assess" (no budget, or no duration) and the
 * UI must show no warning. A result is a plain object so callers stay
 * side-effect free; state/flow ownership remains in the page component.
 */

export interface BudgetReference {
  /** Per-person-per-day rate (INR) the reference trip implies. */
  perPersonPerDay: number;
  /** Human-readable destination the rate came from ('Typical trip' fallback). */
  sourceLabel: string;
  /**
   * Fraction of the implied reference trip cost below which a budget counts
   * as low (0.7 = anything under ~70% of reference cost). Tunable in one
   * place; deliberately NOT a flat rupee amount.
   */
  lowFraction: number;
}

export interface BudgetAssessmentInput {
  budgetAmount?: number;
  /** Selected destination (free text from the draft). */
  destination?: string;
  /** Trip length in days (already date-range-resolved by the caller). */
  durationDays?: number;
  travelers?: number;
  /** Catalog rate source. Defaults to the app's curated catalog. */
  references?: BudgetReference[];
}

export interface BudgetAssessment {
  isLow: boolean;
  /** Suggested minimum (INR) for the current trip shape — drives the UI hint. */
  suggestedMinimum: number;
  /** Where the number came from (destination label or fallback label). */
  sourceLabel: string;
}

/**
 * Parse the catalog's existing display format ('₹28K/person' →
 * 28000). Handles 'K/k' thousands, plain amounts and comma grouping.
 * Returns null for anything unparseable (star-rating rows, etc.).
 */
export function parseCatalogPricePerPerson(label: string | undefined): number | null {
  if (!label) return null;
  const priceMatch = /₹\s*([\d,.]+)\s*([kK])?/.exec(label);
  if (!priceMatch) return null;
  const numeric = Number(priceMatch[1].replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * (priceMatch[2] ? 1000 : 1));
}

/** Parse the catalog's existing 'Ideal: N Days' label → N (null when absent). */
export function parseCatalogIdealDays(label: string | undefined): number | null {
  if (!label) return null;
  const dayMatch = /(\d+)\s*days?/i.exec(label);
  if (!dayMatch) return null;
  const days = Number(dayMatch[1]);
  return Number.isFinite(days) && days > 0 ? days : null;
}
/**
 * Build reference rates from `{ pricePerPerson, idealDays }` display pairs —
 * the exact shape of `curatedDestinations` entries. Kept injectable so the
 * assessment is unit-testable without importing mock data.
 */
export function buildBudgetReferences(
  entries: Array<{ pricePerPerson?: string; idealDays?: string; name?: string }>,
  lowFraction = 0.7,
): BudgetReference[] {
  const refs: BudgetReference[] = [];
  for (const entry of entries) {
    const total = parseCatalogPricePerPerson(entry.pricePerPerson);
    const days = parseCatalogIdealDays(entry.idealDays);
    if (total === null || days === null) continue;
    refs.push({
      perPersonPerDay: total / days,
      sourceLabel: entry.name?.trim() ? entry.name.trim() : 'Typical trip',
      lowFraction,
    });
  }
  return refs;
}

/** Median of the reference per-person-per-day rates (null when empty). */
export function medianPerPersonPerDay(references: BudgetReference[]): number | null {
  const rates = references
    .map((r) => r.perPersonPerDay)
    .filter((rate) => Number.isFinite(rate) && rate > 0)
    .sort((a, b) => a - b);
  if (rates.length === 0) return null;
  const mid = Math.floor(rates.length / 2);
  return rates.length % 2 === 1 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Assess whether the entered budget is low for the current trip shape.
 * - No budget or no determinable duration → null (never warn).
 * - Destination unknown / unmatched → median catalog rate.
 * - Travelers default to 1 when unspecified.
 * - `isLow` flips purely on the computed threshold, so raising the budget
 *   or changing destination/duration/travelers automatically clears or
 *   re-triggers the warning on the next render.
 */
export function assessBudget(input: BudgetAssessmentInput): BudgetAssessment | null {
  const { budgetAmount, destination, durationDays, travelers, references } = input;
  if (budgetAmount === undefined || !Number.isFinite(budgetAmount) || budgetAmount <= 0) {
    return null;
  }
  if (durationDays === undefined || !Number.isFinite(durationDays) || durationDays <= 0) {
    return null;
  }
  const refs = references ?? [];
  if (refs.length === 0) return null;

  const fallback = medianPerPersonPerDay(refs);
  if (fallback === null) return null;

  const needle = destination ? normalizeName(destination) : '';
  const match = needle
    ? refs.find((ref) => {
        const source = normalizeName(ref.sourceLabel);
        if (!source || source === 'typical trip') return false;
        return source.includes(needle) || needle.includes(source);
      })
    : undefined;
  const rate = match?.perPersonPerDay ?? fallback;
  const sourceLabel = match ? match.sourceLabel : 'Typical trip';
  const lowFraction = match?.lowFraction ?? refs[0].lowFraction;

  const people =
    travelers !== undefined && Number.isFinite(travelers) && travelers > 0
      ? Math.floor(travelers)
      : 1;
  const suggestedMinimum = Math.round(rate * durationDays * people);
  return {
    isLow: budgetAmount < suggestedMinimum * lowFraction,
    suggestedMinimum,
    sourceLabel,
  };
}
