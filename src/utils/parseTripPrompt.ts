import type { ParsedTripFields } from '../types';
import { formatINR } from './format';
import {
  findCatalogMatches,
  matchCatalogPlace,
  normalizePlaceText,
} from './destinationCatalog';

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sept: 9, sep: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

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

// Source → destination grammar (explicit priority, generic — no place names).
// Priority: 1. explicit FROM X TO Y leg · 2. explicit X SE Y leg ·
// 3. standalone FROM X (source only, destination stays undefined) ·
// 4. standalone TO Y (destination only, source stays undefined) ·
// 5. source cue + destination cue · 6. destination cue ·
// 7. standalone recognized location (existing fallback) · 8. none.
// Legs resolve against the catalog, so a valid side is never dropped because
// the OTHER side is invalid ("from Mumbai to ABCXYZ" keeps Mumbai).
// Explicit cues ALWAYS outrank the standalone fallback: "from Nashik" is a
// source, never a destination; a higher-priority rule is never overwritten
// by a later generic fallback.
function detectSourceDestination(text: string): { origin?: string; destination?: string } {
  const originCue = detectOriginCueLabel(text);
  const rawDestCue = detectCuedPlaceLabel(text);
  // An identical label on both sides means departure-only phrasing
  // ("Goa se jaana hai"): it is a SOURCE, never a destination.
  const destCue = rawDestCue && rawDestCue !== originCue ? rawDestCue : undefined;

  // Best RAW leg: score by catalog-resolved sides (2 > 1), later leg wins
  // ties. Raw legs keep a valid side alive when its partner is invalid.
  const rawLegs = legPairsRaw(text);
  let leg: { from: string; to: string } | undefined;
  let bestScore = -1;
  for (const candidate of rawLegs) {
    const score =
      (resolvePlaceLabel(candidate.from) !== undefined ? 1 : 0) +
      (resolvePlaceLabel(candidate.to) !== undefined ? 1 : 0);
    if (score >= bestScore) {
      leg = candidate;
      bestScore = score;
    }
  }
  const legOrigin = leg ? resolvePlaceLabel(leg.from) : undefined;
  const legDestination = leg ? resolvePlaceLabel(leg.to) : undefined;

  // Rule 1/2 — complete "from X to Y" / "X se Y" pair: explicit both sides.
  if (legOrigin && legDestination) return { origin: legOrigin, destination: legDestination };

  // Rule 3 — standalone FROM X: explicit source; destination only when a
  // recognized place precedes the origin mention ("Goa from Mumbai").
  if (originCue && !destCue) {
    return { origin: originCue, destination: legDestination ?? precedingPlaceDestination(text, originCue) };
  }

  // Rule 4 — standalone TO Y: explicit destination, no source invented.
  if (destCue && !originCue) return { origin: legOrigin, destination: destCue };

  // Rule 5 — explicit source cue + explicit destination cue: resolve each.
  if (originCue && destCue) return { origin: originCue, destination: destCue };

  // Rule 6 — partial leg (one side recognized, partner invalid): keep the
  // valid side rather than dropping it.
  if (legOrigin || legDestination) return { origin: legOrigin, destination: legDestination };

  // Rule 7 — standalone recognized location → existing destination fallback.
  const hits = dedupedHits(findCatalogMatches(text));
  if (hits.length > 0) return { destination: hits[0].place.label };

  // Rule 8 — nothing recognized.
  return {};
}

/** Last recognized place mentioned BEFORE the origin mention, if any. */
function precedingPlaceDestination(text: string, originLabel: string): string | undefined {
  const hits = dedupedHits(findCatalogMatches(text));
  const originIdx = hits.findIndex((h) => h.place.label === originLabel);
  if (originIdx <= 0) return undefined;
  return hits[originIdx - 1].place.label;
}

function detectDestination(prompt: string): string | undefined {
  return detectSourceDestination(prompt).destination;
}

/** Distinct destination labels in the prompt (for multi-dest clarification). */
export function detectDistinctDestinationLabels(prompt: string): string[] {
  const hits = dedupedHits(findCatalogMatches(prompt));
  const originCue = detectOriginCueLabel(prompt);
  const labels: string[] = [];
  for (const hit of hits) {
    const label = hit.place.label;
    if (label === originCue) continue;
    // "Mumbai to Goa": Mumbai is the origin leg, Goa the destination.
    if (isLegOrigin(prompt, label)) continue;
    if (!labels.includes(label)) labels.push(label);
  }
  // "5 days Goa and 4 days Kerala": both carry durations → genuine pair.
  const durationPair = detectDurationPair(prompt);
  if (durationPair && durationPair.length >= 2) {
    for (const label of durationPair) {
      if (!labels.includes(label)) labels.push(label);
    }
  }
  return labels;
}

/** "5 days Goa and 4 days Kerala" — labels with their own duration each. */
function detectDurationPair(prompt: string): string[] | undefined {
  const re = /(\d+)\s*days?\s+([A-Za-z][A-Za-z\s&]*?)\s+and\s+(\d+)\s*days?\s+([A-Za-z][A-Za-z\s&]*?)(?=\s|$|[.,])/i;
  const m = re.exec(prompt);
  if (!m) return undefined;
  const first = resolvePlaceLabel(m[2]);
  const second = resolvePlaceLabel(m[4]);
  if (first && second && first !== second) return [first, second];
  return undefined;
}

/** True when the label appears as the FROM side of an X-to-Y / X-se-Y leg. */
function isLegOrigin(prompt: string, label: string): boolean {
  const normLabel = normalizePlaceText(label);
  for (const leg of legPairs(prompt)) {
    const from = resolvePlaceLabel(leg.from);
    const to = resolvePlaceLabel(leg.to);
    if (from && to && normalizePlaceText(from) === normLabel) return true;
  }
  return false;
}

/** Collapse overlapping alias hits to one hit per place occurrence. */
function dedupedHits(hits: import('./destinationCatalog').PlaceHit[]): import('./destinationCatalog').PlaceHit[] {
  const out: import('./destinationCatalog').PlaceHit[] = [];
  for (const hit of hits) {
    const overlaps = out.some(
      (kept) =>
        kept.place.label === hit.place.label &&
        Math.abs(kept.index - hit.index) < Math.max(kept.length, hit.length),
    );
    if (!overlaps) out.push(hit);
  }
  return out;
}

/** Earliest-position catalog scan (kept for leg-target alias resolution). */
export function detectDestinationFragmentAlias(prompt: string): string | undefined {
  return matchCatalogPlace(prompt)?.label;
}

function detectDurationDays(prompt: string): number | undefined {
  const dayMatch = DAY_RE.exec(prompt);
  if (dayMatch) {
    const unit = dayMatch[2].toLowerCase();
    const n = Number(dayMatch[1]);
    if (Number.isFinite(n) && n > 0 && n <= 60) {
      // "4 nights" = 5 days in the app's days/nights convention.
      const days = unit.startsWith('night') ? n + 1 : n;
      if (days <= 60) return days;
    }
    return undefined;
  }
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  const wordMatch = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(?:-|–)?\s*(day|days|week|weeks)\b/i.exec(prompt);
  if (wordMatch) {
    const n = words[wordMatch[1].toLowerCase()];
    if (n !== undefined) {
      const unit = wordMatch[2].toLowerCase();
      const days = unit.startsWith('week') ? n * 7 : n;
      if (days > 0 && days <= 60) return days;
    }
  }
  if (/\bweekend\b/i.test(prompt)) return 2;
  if (/\bweek-long\b/i.test(prompt)) return 7;
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

/** Resolve via the unified catalog (cities/spots/states/religious sites). */
function resolvePlaceLabel(fragment: string): string | undefined {
  // Fragments may carry cue words ("travel from Mumbai", "go to Manali"):
  // scan catalog matches INSIDE the fragment, prefer exact-label matches
  // ("Kashmir" → Kashmir, not the "Jammu and Kashmir" alias), drop matches
  // nested inside a longer one ("Bodh Gaya" → Bodh Gaya, "Old Goa" → Old Goa)
  // and finally take the last remaining match (closest to the cue).
  const hits = findCatalogMatches(fragment);
  if (hits.length === 0) return undefined;
  const normFrag = ` ${normalizePlaceText(fragment)} `;
  const exact = hits.filter((h) => normFrag.includes(` ${normalizePlaceText(h.place.label)} `));
  const pool = exact.length > 0 ? exact : hits;
  const outer = pool.filter(
    (hit) =>
      !pool.some(
        (other) =>
          other !== hit &&
          other.place.label !== hit.place.label &&
          other.index <= hit.index &&
          other.index + other.length >= hit.index + hit.length &&
          other.length > hit.length,
      ),
  );
  const finalPool = outer.length > 0 ? outer : pool;
  return finalPool[finalPool.length - 1].place.label;
}

function cleanPlace(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value || ORIGIN_STOPWORDS.has(value.toLowerCase())) return undefined;
  return value;
}

// Both sides are extracted raw here; detectSourceDestination resolves each
// side independently so a valid side survives an invalid partner. The strict
// both-sides-known variant below (legPairs) is used only for leg-ORIGIN
// filtering, where verb-phrase false positives must be excluded.
function legPairsRaw(prompt: string): Array<{ from: string; to: string }> {
  const normalized = prompt.replace(/→/g, ' to ').replace(/->/g, ' to ');
  const out: Array<{ from: string; to: string }> = [];
  // Split on the LAST whole-word "to"/"se": "I want to travel from Mumbai to
  // Kerala" yields from="I want to travel from Mumbai", to="Kerala".
  // resolvePlaceLabel takes the last catalog match inside each side.
  // "se" is case-sensitive (lowercase only) so "Dec"/"Sept" never split.
  for (const sep of ['to', 'se'] as const) {
    const parts = splitOnLastSeparator(normalized, sep);
    if (!parts) continue;
    const from = cleanPlace(stripTrailingCueWords(parts[0]));
    const to = cleanPlace(stripLeadingCueWords(parts[1]));
    if (from && to) out.push({ from, to });
  }
  return out;
}

/** Drop trailing duration/date/verb tails from a TO-side fragment. */
function stripLeadingCueWords(fragment: string): string {
  return fragment
    .replace(/\s+(?:for|from|on|in|at|and|with|under|within|starting|start|of|the|a|an)\b.*$/i, '')
    .replace(/[.,;]+$/g, '')
    .trim();
}

/** Drop trailing cue tails from a FROM-side fragment (kept whole otherwise). */
function stripTrailingCueWords(fragment: string): string {
  return fragment.replace(/[.,;]+$/g, '').trim();
}

/** Split text on the LAST occurrence of a whole-word separator. */
function splitOnLastSeparator(text: string, sep: string): [string, string] | undefined {
  const words = text.split(/\s+/);
  let lastIdx = -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (sep === 'se' ? w === 'se' : w.toLowerCase() === sep) lastIdx = i;
  }
  if (lastIdx <= 0 || lastIdx >= words.length - 1) return undefined;
  return [words.slice(0, lastIdx).join(' '), words.slice(lastIdx + 1).join(' ')];
}

// Both sides resolve through the place catalog, so greedy verbs
// ("I want to travel from Mumbai to Kerala") can't win: only pairs whose
// BOTH sides are known places are accepted (Mumbai/Kerala beats I-want/travel).
// Hinglish "X se Y" is its own case-sensitive leg ("se" lowercase only, so
// month abbreviations like "Dec"/"Sept" never split).
function legPairs(prompt: string): Array<{ from: string; to: string }> {
  return legPairsRaw(prompt).filter(
    (leg) => resolvePlaceLabel(leg.from) !== undefined && resolvePlaceLabel(leg.to) !== undefined,
  );
}

/** Last "X to Y" leg target that resolves to a known place, if any. */
export function detectLegDestination(prompt: string): string | undefined {
  let last: string | undefined;
  for (const leg of legPairs(prompt)) {
    const resolved = resolvePlaceLabel(leg.to);
    if (resolved) last = resolved;
  }
  return last;
}

// Common lookahead terminator for cue captures: a following cue/structural
// word, punctuation, or end-of-string. The `\b`-terminated word list plus the
// `[.,;]|$` alternatives let a cue capture run to the end of the prompt
// ("... spend 6 days in Rajasthan" → Rajasthan).
const CUE_END = '(?=\\s+(?:for|from|on|in|at|and|with|under|within|starting|start|of|the|a|an)\\b|[.,;]|$)';

// Destination cues ("visit X", "trip to X", "X jaana hai", "in X for N days",
// trailing "X trip/vacation/holiday", "explore [around] X").
function detectCuedPlaceLabel(prompt: string): string | undefined {
  const normalized = prompt.replace(/\bse\b/g, ' to ');
  const patterns = [
    new RegExp(
      `\\b(?:visit|visiting|explore|exploring|see|seeing|go to|going to|travel to|travelling to|traveling to|trip to|tour of|tour to|holiday in|vacation in|stay in|spend\\s+\\d+\\s+days?\\s+in|destination|destination is)\\s+([A-Za-z][A-Za-z\\s&]*?)${CUE_END}`,
      'i',
    ),
    new RegExp(`\\bexplore\\s+(?:around\\s+)?([A-Za-z][A-Za-z\\s&]*?)${CUE_END}`, 'i'),
    new RegExp(`\\bin\\s+([A-Za-z][A-Za-z\\s&]*?)\\s+for\\s+\\d+\\s+days?\\b`, 'i'),
    new RegExp(`\\b(\\d+)\\s+days?\\s+in\\s+([A-Za-z][A-Za-z\\s&]*?)${CUE_END}`, 'i'),
    // Hinglish travel intent: "X jaana hai", "X ghoomne jaana hai".
    new RegExp(`\\b([A-Za-z][A-Za-z\\s&]*?)\\s+(?:ghoomne\\s+j[ai]ana|ghoomna|j[ai]ana)\\s+hai\\b`, 'i'),
    // Trailing nouns: "Kerala trip", "Goa vacation".
    new RegExp(`\\b([A-Za-z][A-Za-z\\s&]*?)\\s+(?:trip|vacation|holiday)${CUE_END}`, 'i'),
    // Bare "to X" (standalone TO cue): resolves only when X is a catalog
    // place, so verb tails ("want to spend …") and date ranges ("10 Oct to
    // 16 Oct") never produce a destination.
    new RegExp(`\\bto\\s+([A-Za-z][A-Za-z\\s&]*?)${CUE_END}`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(normalized);
    if (m) {
      // "6 days in Rajasthan" keeps the place in group 2.
      const capture = m[2] ?? m[1];
      const resolved = resolvePlaceLabel(capture);
      if (resolved) return resolved;
    }
  }
  return undefined;
}

// Origin cues ("from X", "starting from X", "start in X", "leaving X",
// "X se Y" source side handled via legPairs; this covers cue-only forms).
// The lookahead terminators intentionally EXCLUDE bare "to": "from Mumbai to
// Kerala" must not truncate the origin capture to "Mumbai to" — the leg rule
// above already owns full FROM→TO pairs.
function detectOriginCueLabel(prompt: string): string | undefined {
  const patterns = [
    new RegExp(
      `\\b(?:starting from|start from|starts from|travelling from|traveling from|travel from|going from|leaving from|leave from|depart from|departing from|departure from|origin|origin is)\\s+([A-Za-z][A-Za-z\\s]*?)${CUE_END}`,
      'i',
    ),
    new RegExp(`\\bfrom\\s+([A-Za-z][A-Za-z\\s]*?)${CUE_END}`, 'i'),
    new RegExp(
      `\\bstart\\s+(?:in|at)\\s+([A-Za-z][A-Za-z\\s]*?)${CUE_END}`,
      'i',
    ),
    // Hinglish departure-only: "Goa se jaana hai" / "Goa se ghoomne jaana hai" —
    // "se" directly followed by a travel verb marks the preceding place as the
    // SOURCE (never the destination).
    /\b([A-Za-z][A-Za-z\s]*?)\s+se\s+(?:ghoomne\s+)?(?:j[ai]ana|ghoomna|nikalna)(?:\s+hai)?\b/i,
  ];
  for (const re of patterns) {
    const m = re.exec(prompt);
    if (m) {
      const resolved = resolvePlaceLabel(m[1]);
      if (resolved) return resolved;
    }
  }
  return undefined;
}

function detectOrigin(prompt: string, destination: string | undefined): string | undefined {
  const pair = detectSourceDestination(prompt);
  if (pair.origin && pair.origin !== destination) return pair.origin;
  if (pair.origin && pair.destination && pair.origin !== pair.destination) return pair.origin;
  return undefined;
}

function monthNumber(name: string): number | undefined {
  return MONTHS[name.toLowerCase()];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Add (days-1) to start so a 6-day trip starting 15 Oct ends 20 Oct. */
function addTripDays(startISO: string, durationDays: number): string {
  const [y, m, d] = startISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + durationDays - 1);
  return toISODate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function resolveYear(month: number, day: number, explicitYear: number | undefined, now: Date): number {
  if (explicitYear !== undefined) return explicitYear;
  const year = now.getFullYear();
  // "20 December" in October → this December; "15 March" in October →
  // next March (past dates roll forward; explicit years are honored).
  if (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && day < now.getDate())) {
    return year + 1;
  }
  return year;
}

/**
 * Extract explicit + natural-language dates (generic, no hardcoded examples).
 * Returns ISO start/end when confidently parsed; never invents a year.
 */
function detectDates(prompt: string, durationDays: number | undefined, now = new Date()): { startDate?: string; endDate?: string } {
  const monthAlt = Object.keys(MONTHS).join('|');
  const single = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})(?:\\s*,?\\s*(\\d{4}))?\\b`, 'gi');
  const found: Array<{ day: number; month: number; year?: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = single.exec(prompt)) !== null) {
    const day = Number(m[1]);
    const month = monthNumber(m[2]);
    const year = m[3] ? Number(m[3]) : undefined;
    if (!month || !Number.isFinite(day) || day < 1 || day > 31) continue;
    found.push({ day, month, year, index: m.index });
  }
  const valid = found.filter((f) => {
    const y = f.year ?? now.getFullYear();
    return f.day <= daysInMonth(y, f.month);
  });
  if (valid.length >= 2) {
    const [a, b] = valid;
    const aISO = toISODate(resolveYear(a.month, a.day, a.year, now), a.month, a.day);
    const bISO = toISODate(resolveYear(b.month, b.day, b.year, now), b.month, b.day);
    if (aISO <= bISO) return { startDate: aISO, endDate: bISO };
    return { startDate: bISO, endDate: aISO };
  }
  if (valid.length === 1) {
    const f = valid[0];
    const startISO = toISODate(resolveYear(f.month, f.day, f.year, now), f.month, f.day);
    if (durationDays !== undefined) return { startDate: startISO, endDate: addTripDays(startISO, durationDays) };
    return { startDate: startISO };
  }
  return {};
}

/**
 * Deterministic lightweight parser for trip prompts (Phase 2 — no AI/backend).
 * Extracts obvious values only; anything unclear stays undefined (never invented).
 */
export function parseTripPrompt(prompt: string): ParsedTripFields {
  const text = prompt.trim();
  if (!text) return {};
  const destination = detectDestination(text);
  const origin = detectOrigin(text, destination);
  const durationDays = detectDurationDays(text);
  const { startDate, endDate } = detectDates(text, durationDays);
  return {
    destination,
    origin,
    durationDays,
    startDate,
    endDate,
    suspectedDestination: detectSuspectedDestination(text, destination),
    suspectedOrigin: detectSuspectedOrigin(text, origin),
    alternateDestinations: detectAlternateDestinations(text, destination),
    ...detectTravelers(text),
    ...detectBudget(text),
    style: detectStyle(text),
  };
}

/** Capitalized phrase after a destination cue that is NOT in the catalog. */
function detectSuspectedDestination(text: string, destination: string | undefined): string | undefined {
  if (destination) return undefined;
  const cueRes = [
    /\bto\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})/,
    /\b(?:trip to|travel to|travelling to|traveling to|visit|visiting|explore|exploring|go to|going to|destination|destination is|plan a trip to|plan trip to)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})/,
    /\bin\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\s+for\s+\d+\s+days?\b/,
    /^([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})\s+trip\b/,
  ];
  for (const re of cueRes) {
    const m = re.exec(text);
    const candidate = cleanPlace(m?.[1]);
    if (candidate && !matchCatalogPlace(candidate)) return candidate;
  }
  return undefined;
}

/** Capitalized phrase after an origin cue that is NOT in the catalog/gazetteer. */
function detectSuspectedOrigin(text: string, origin: string | undefined): string | undefined {
  if (origin) return undefined;
  const cueRes = [
    /\bfrom\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})/,
    /\bstarting from\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2})/i,
  ];
  for (const re of cueRes) {
    const m = re.exec(text);
    const candidate = cleanPlace(m?.[1]);
    if (candidate && !resolvePlaceLabel(candidate)) return candidate;
  }
  return undefined;
}

/** Extra distinct destinations beyond the primary (multi-dest clarification). */
function detectAlternateDestinations(text: string, destination: string | undefined): string[] | undefined {
  const labels = detectDistinctDestinationLabels(text);
  const rest = labels.filter((l) => l !== destination);
  return rest.length > 0 ? rest : undefined;
}
