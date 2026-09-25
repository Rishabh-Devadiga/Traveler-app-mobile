import type { ParsedTripFields } from '../types';
import { formatINR } from './format';
import { knownDestinations } from '../mocks/traveler';
import { DESTINATIONS } from '../data/destinations';

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
  // An explicit "X to Y" leg names the destination directly (e.g. "Mumbai
  // to Mysore" means Mysore, even though Mumbai matches earlier). Prefer the
  // last resolvable leg target over positional matching.
  const legDestination = detectLegDestination(prompt);
  if (legDestination) return legDestination;
  return detectDestinationFragment(prompt);
}

function detectDestinationFragment(prompt: string): string | undefined {
  let best: { index: number; label: string } | undefined;
  for (const entry of knownDestinations) {
    const match = entry.pattern.exec(prompt);
    if (match && (best === undefined || match.index < best.index)) {
      best = { index: match.index, label: entry.label };
    }
  }
  for (const d of DESTINATIONS) {
    const canonical =
      d.id === 'taj-mahal' || d.city === 'Agra'
        ? 'Agra'
        : d.id === 'mysuru-palace' || d.city === 'Mysuru'
        ? 'Mysuru'
        : d.name.includes('(')
        ? d.name.split('(')[0].trim()
        : d.name;
    const reCanonical = new RegExp(`\\b${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = reCanonical.exec(prompt);
    if (match && (best === undefined || match.index < best.index)) {
      best = { index: match.index, label: canonical };
    }
    if (d.city && d.city !== canonical && !['Panaji', 'Pangong Tso'].includes(d.city)) {
      const reCity = new RegExp(`\\b${d.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const matchCity = reCity.exec(prompt);
      if (matchCity && (best === undefined || matchCity.index < best.index)) {
        best = { index: matchCity.index, label: canonical };
      }
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

const ORIGIN_STOPWORDS = new Set(['home', 'here', 'there', 'work', 'office', 'school']);
const PLACE_WORD = '[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,2}';

function cleanPlace(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value || ORIGIN_STOPWORDS.has(value.toLowerCase())) return undefined;
  return value;
}

function detectOrigin(prompt: string, destination: string | undefined): string | undefined {
  const destLower = destination?.toLowerCase();
  const differentFromDestination = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    // Never report the destination itself as the origin.
    if (destLower && value.toLowerCase() === destLower) return undefined;
    return value;
  };
  // "X to Y" / "X → Y" where Y is the detected destination (or the last pair).
  const legRe = new RegExp(`(${PLACE_WORD})\\s*(?:to|→|->)\\s*(${PLACE_WORD})`, 'g');
  let match: RegExpExecArray | null;
  let fallback: string | undefined;
  while ((match = legRe.exec(prompt)) !== null) {
    const from = differentFromDestination(cleanPlace(match[1]));
    const to = cleanPlace(match[2]);
    if (!from || !to) continue;
    if (destination && to.toLowerCase() === destination.toLowerCase()) return from;
    fallback ??= from;
  }
  if (fallback) return fallback;
  // "from X" / "From X" (capital-F only; the place itself must stay
  // capitalized so lowercase words like "home" or "next week" never match).
  const fromRe = new RegExp(`\\b[Ff][Rr][Oo][Mm]\\s+(${PLACE_WORD})`);
  const fromMatch = fromRe.exec(prompt);
  return differentFromDestination(cleanPlace(fromMatch?.[1]));
}

/** Last "X to Y" leg target that resolves to a known place, if any. */
function detectLegDestination(prompt: string): string | undefined {
  const legRe = new RegExp(`(${PLACE_WORD})\\s*(?:to|→|->)\\s*(${PLACE_WORD})`, 'g');
  let match: RegExpExecArray | null;
  let last: string | undefined;
  while ((match = legRe.exec(prompt)) !== null) {
    const to = cleanPlace(match[2]);
    if (!to) continue;
    // Reuse full name matching on the fragment so aliases resolve identically.
    const resolved = detectDestinationFragment(to);
    if (resolved) last = resolved;
  }
  return last;
}

/**
 * Deterministic lightweight parser for trip prompts (Phase 2 — no AI/backend).
 * Extracts obvious values only; anything unclear stays undefined (never invented).
 */
export function parseTripPrompt(prompt: string): ParsedTripFields {
  const text = prompt.trim();
  if (!text) return {};
  const destination = detectDestination(text);
  return {
    destination,
    origin: detectOrigin(text, destination),
    durationDays: detectDurationDays(text),
    ...detectTravelers(text),
    ...detectBudget(text),
    style: detectStyle(text),
  };
}
