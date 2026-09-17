import { useContext } from 'react';
import { TripDraftContext } from './draftContext';
import type { ParsedTripFields, TripDraft } from '../types';
import type { ResolvedItinerary } from '../api/trips';

export interface TripDraftContextValue {
  draft: TripDraft;
  /** Parsed view of the current prompt (unknown fields stay undefined). */
  parsed: ParsedTripFields;
  /** Start (or resume) a trip. A changed prompt resets derived fields + itinerary. */
  startTrip: (prompt: string) => void;
  /** Merge checklist edits into the draft (preserved across navigation). */
  updateDraft: (patch: Partial<TripDraft>) => void;
  /** Fill unset fields from the prompt parser (runs once per prompt). */
  ensureParsed: () => void;
  /** Build + store the deterministic mock itinerary for the current draft. */
  generateItinerary: () => void;
  /** POST the draft to the TourFlow backend and store the REAL itinerary. Throws ApiError on failure. */
  generateServerItinerary: (input: TripDraft) => Promise<ResolvedItinerary>;
  /** Clear the draft so a new trip starts fresh. */
  resetTrip: () => void;
  /** Number of captured checklist fields (0–5). */
  capturedCount: number;
  /** True when the stored itinerary no longer matches the current inputs. */
  isItineraryStale: boolean;
}

export function useTripDraft(): TripDraftContextValue {
  const ctx = useContext(TripDraftContext);
  if (!ctx) throw new Error('useTripDraft must be used inside <TripDraftProvider>');
  return ctx;
}
