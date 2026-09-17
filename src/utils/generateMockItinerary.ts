import type { ItineraryDay, ItineraryStop, ParsedTripFields } from '../types';
import { formatINR } from './format';
import {
  mockDayThemes,
  mockExperienceStops,
  mockMorningStays,
  mockTransportStops,
} from '../mocks/itineraryTemplates';

export interface MockItineraryInput extends ParsedTripFields {
  prompt: string;
  /** Optional trip dates — covered by the stale-check signature, not mock content. */
  startDate?: string;
  endDate?: string;
}

export interface MockItineraryResult {
  days: ItineraryDay[];
  destinationLabel: string;
  daysCount: number;
  travelersLabel: string;
  budgetLabel: string;
  perDayMockLabel: string;
  usedDefaultDuration: boolean;
}

/** Tiny deterministic PRNG so the same draft always yields the same mock itinerary. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(rand: () => number, pool: T[]): T {
  return pool[Math.floor(rand() * pool.length)];
}

function fill(template: string, destination: string): string {
  return template.replace(/\{destination\}/g, destination);
}

/**
 * Deterministic MOCK itinerary generator (Phase 2 — frontend only).
 * Uses the user's actual destination/duration/travelers. Stays, activities,
 * transport and prices are clearly-marked mock placeholders.
 */
export function generateMockItinerary(input: MockItineraryInput): MockItineraryResult {
  const destinationLabel = input.destination ?? 'Your destination';
  const daysCount = input.durationDays ?? 3;
  const usedDefaultDuration = input.durationDays === undefined;
  const travelersLabel = input.travelerLabel ?? (input.travelers ? `${input.travelers} travelers` : 'Travelers');
  const rand = seededRandom(hashString(`${input.prompt}::${daysCount}::${input.travelers ?? 0}`));

  const perDayMockLabel =
    input.budgetAmount !== undefined
      ? `${formatINR(input.budgetAmount / daysCount)} / day (mock split)`
      : 'Budget not specified';

  const days: ItineraryDay[] = Array.from({ length: daysCount }, (_, index) => {
    const dayNumber = index + 1;
    const theme = mockDayThemes[(index + Math.floor(rand() * mockDayThemes.length)) % mockDayThemes.length];
    const stops: ItineraryStop[] = [];
    const push = (id: string, base: (typeof mockExperienceStops)[number]) => {
      stops.push({
        id,
        time: base.time,
        title: fill(base.title, destinationLabel),
        description: fill(base.description, destinationLabel),
        tags: [...base.tags],
        featured: base.featured,
        badge: base.badge,
      });
    };

    push(`d${dayNumber}-stay`, pick(rand, mockMorningStays));
    const experienceCount = 3 + Math.floor(rand() * 2); // 3–4 experiences
    for (let i = 0; i < experienceCount; i += 1) {
      push(`d${dayNumber}-exp-${i + 1}`, mockExperienceStops[(index + i) % mockExperienceStops.length]);
    }
    push(`d${dayNumber}-transport`, pick(rand, mockTransportStops));

    return {
      id: `mock-day-${dayNumber}`,
      day: dayNumber,
      title: theme,
      stopsCount: stops.length,
      stops,
    };
  });

  return {
    days,
    destinationLabel,
    daysCount,
    travelersLabel,
    budgetLabel: input.budgetLabel ?? 'Budget not specified',
    perDayMockLabel,
    usedDefaultDuration,
  };
}

/** Signature of the inputs an itinerary was built from — used for stale-checks. */
export function itineraryInputSignature(input: MockItineraryInput): string {
  return JSON.stringify([
    input.prompt,
    input.destination ?? '',
    input.durationDays ?? 0,
    input.travelers ?? 0,
    input.budgetAmount ?? 0,
    input.style ?? '',
    input.startDate ?? '',
    input.endDate ?? '',
  ]);
}
