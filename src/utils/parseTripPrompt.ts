import type { ParsedTripFields } from '../types';
import { formatINR } from './format';
import { knownDestinations } from '../mocks/traveler';

const DAY_RE = /(\d+)\s*(?:-|–|to)?\s*(day|days|night|nights)\b/i;
const TRAVELERS_OF_RE = /(?:family|group)\s+of\s+(\d+)\b/i;
const TRAVELERS_COUNT_RE = /(\d+)\s*(people|persons?|travellers?|travelers?|adults?|guests?|members?|pax)\b/i;
/* "₹60,000", "Rs 40000", "INR 50000", "60k" (k = thousand) */
const BUDGET_SYMBOL_RE = /(?:₹|rs\.?|inr)\s*(\d[\d,]*\s*k?)\b/i;
const BUDGET_WORD_RE = /\b(?:budget|under|within|max|around)\s*(?:of\s*)?(?:₹|rs\.?|inr)?\s*(\d[\d,]*\s*k?)\b/i;

const STYLE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bromantic\b|\bhoneymoon\b|\bcouple\b/i, 'Romantic'],
  [/\bfamily\b|\bkids?\b/i, 'Family'],
  [/\badventure\b|\btrek|\bparagliding\b|\brafting\b/i, 'Adventure'],
  [/\bheritage\b|\bcultur|\bpalace|\btemple|\bfort/i, 'Heritage & Culture'],
  [/\bbeach\b|\bisland\b|\bcoast/i, 'Beach'],
  [/\bfood\b|\bcuisine\b|\bcafe\b/i, 'Food'],
  [/\bslow\b|\brelax|\bleisure/i, 'Relaxed'],
  [/\bluxury\b|\bpremium\b/i, 'Luxury'],
  [/\bbudget\b|\bbackpack/i, 'Budget'],
];

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').trim();
  const thousand = /k$/i.test(cleaned);
  const numeric = Number(cleaned.replace(/k$/i, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return thousand ? numeric * 1000 : numeric;
}

function detectDestination(prompt: string): string | undefined {
  let best: { index: number; label: string } | undefined;
  for (const entry of knownDestinations) {
    const match = entry.pattern.exec(prompt);
    if (match && (best === undefined || match.index < best.index)) {
      best = { index: match.index, label: entry.label };
    }
  }
  return best?.label;
}

function detectDurationDays(prompt: string): number | undefined {
  const dayMatch = DAY_RE.exec(prompt);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    if (Number.isFinite(days) && days > 0 && days <= 60) return days;
    return undefined;
  }
  if (/\bweekend\b/i.test(prompt)) return 2;
  if (/\bweek\b/i.test(prompt)) return 7;
  return undefined;
}

function detectTravelers(prompt: string): { travelers?: number; travelerLabel?: string } {
  const ofMatch = TRAVELERS_OF_RE.exec(prompt);
  if (ofMatch) {
    const count = Number(ofMatch[1]);
    if (Number.isFinite(count) && count > 0 && count <= 50) {
      return { travelers: count, travelerLabel: `Family of ${count}` };
    }
  }
  const countMatch = TRAVELERS_COUNT_RE.exec(prompt);
  if (countMatch) {
    const count = Number(countMatch[1]);
    if (Number.isFinite(count) && count > 0 && count <= 50) {
      if (count === 1) return { travelers: 1, travelerLabel: 'Solo' };
      if (count === 2) return { travelers: 2, travelerLabel: 'Couple' };
      return { travelers: count, travelerLabel: `${count} travelers` };
    }
  }
  if (/\bcouple\b|\bromantic\b|\bhoneymoon\b/i.test(prompt)) {
    return { travelers: 2, travelerLabel: 'Couple' };
  }
  if (/\bsolo\b|\balone\b|\bmyself\b/i.test(prompt)) {
    return { travelers: 1, travelerLabel: 'Solo' };
  }
  return {};
}

function detectBudget(prompt: string): { budgetAmount?: number; budgetLabel?: string } {
  const raw = BUDGET_SYMBOL_RE.exec(prompt)?.[1] ?? BUDGET_WORD_RE.exec(prompt)?.[1];
  if (!raw) return {};
  const amount = parseAmount(raw);
  if (amount === undefined) return {};
  return { budgetAmount: amount, budgetLabel: formatINR(amount) };
}

function detectStyle(prompt: string): string | undefined {
  const hits: string[] = [];
  for (const [re, label] of STYLE_KEYWORDS) {
    if (re.test(prompt) && !hits.includes(label)) hits.push(label);
  }
  if (hits.length === 0) return undefined;
  return hits.slice(0, 2).join(' · ');
}

/**
 * Deterministic lightweight parser for trip prompts (Phase 2 — no AI/backend).
 * Extracts obvious values only; anything unclear stays undefined (never invented).
 */
export function parseTripPrompt(prompt: string): ParsedTripFields {
  const text = prompt.trim();
  if (!text) return {};
  return {
    destination: detectDestination(text),
    durationDays: detectDurationDays(text),
    ...detectTravelers(text),
    ...detectBudget(text),
    style: detectStyle(text),
  };
}
