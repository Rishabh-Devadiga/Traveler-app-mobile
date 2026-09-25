import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TripDraft } from '../types';
import type { TripDraftContextValue } from './useTripDraft';
import { TripDraftContext } from './draftContext';
import { ApiError } from '../api/client';
import {
  apiItineraryToDays,
  createTrip,
  tripDraftToCreateRequest,
  writeActiveTripId,
  clearActiveTripId,
  readActiveTripId,
  unmarkTripConfirmed,
} from '../api/trips';
import type { ResolvedItinerary } from '../api/trips';
import { parseTripPrompt } from '../utils/parseTripPrompt';
import {
  generateMockItinerary,
  itineraryInputSignature,
} from '../utils/generateMockItinerary';

const EMPTY_DRAFT: TripDraft = { prompt: '', itinerary: null };

function countCaptured(draft: TripDraft): number {
  return [
    draft.destination,
    draft.durationDays,
    draft.travelers,
    draft.origin,
    draft.budgetAmount,
  ].filter((value) => value !== undefined && value !== '').length;
}

export function TripDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TripDraft>(EMPTY_DRAFT);

  const startTrip = useCallback((prompt: string, initialFields?: Partial<TripDraft>) => {
    const trimmed = prompt.trim();
    setDraft((prev) => {
      if (
        trimmed === prev.prompt &&
        (!initialFields ||
          Object.entries(initialFields).every(([k, v]) => prev[k as keyof TripDraft] === v))
      ) {
        return prev; // resume — preserve edits
      }
      return {
        prompt: trimmed,
        itinerary: null,
        ...initialFields,
      }; // new trip — initialize with clean initial state
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<TripDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const ensureParsed = useCallback(() => {
    setDraft((prev) => {
      if (!prev.prompt.trim() || prev.parsedForPrompt === prev.prompt) return prev;
      const parsed = parseTripPrompt(prev.prompt);
      const destination = parsed.destination ?? prev.destination;
      const destinationSource =
        parsed.destination && parsed.destination !== prev.destination
          ? 'manual'
          : prev.destinationSource;
      return {
        ...prev,
        destination,
        destinationSource,
        durationDays: prev.durationDays ?? parsed.durationDays,
        travelers: prev.travelers ?? parsed.travelers,
        travelerLabel: prev.travelerLabel ?? parsed.travelerLabel,
        budgetAmount: prev.budgetAmount ?? parsed.budgetAmount,
        budgetLabel: prev.budgetLabel ?? parsed.budgetLabel,
        style: prev.style ?? parsed.style,
        origin: prev.origin ?? parsed.origin,
        parsedForPrompt: prev.prompt,
      };
    });
  }, []);

  const generateItinerary = useCallback(() => {
    setDraft((prev) => {
      if (!prev.prompt.trim()) return prev;
      const result = generateMockItinerary({
        prompt: prev.prompt,
        destination: prev.destination,
        origin: prev.origin,
        durationDays: prev.durationDays,
        travelers: prev.travelers,
        travelerLabel: prev.travelerLabel,
        budgetAmount: prev.budgetAmount,
        budgetLabel: prev.budgetLabel,
        style: prev.style,
        startDate: prev.startDate,
        endDate: prev.endDate,
        specialRequests: prev.specialRequests,
        transportId: prev.transportId,
      });
      return {
        ...prev,
        itinerary: result.days,
        itinerarySignature: itineraryInputSignature({
          prompt: prev.prompt,
          destination: prev.destination,
          origin: prev.origin,
          durationDays: prev.durationDays,
          travelers: prev.travelers,
          travelerLabel: prev.travelerLabel,
          budgetAmount: prev.budgetAmount,
          budgetLabel: prev.budgetLabel,
          style: prev.style,
          startDate: prev.startDate,
          endDate: prev.endDate,
          specialRequests: prev.specialRequests,
          transportId: prev.transportId,
        }),
        tripId: undefined,
        itinerarySource: 'mock',
        totalCost: undefined,
        apiTrip: null,
      };
    });
  }, []);

  /**
   * Backend source of truth (Phase 3B): POST /api/trips for the given draft,
   * map the real `itinerary[]` into the shared `ItineraryDay[]` shape and
   * store it with the returned trip id. Throws `ApiError` on transport
   * failures, timeouts, failed creation, or an empty itinerary response —
   * callers surface that to the user (no silent mock substitution here).
   */
  const generateServerItinerary = useCallback(async (input: TripDraft): Promise<ResolvedItinerary> => {
    const trip = await createTrip(tripDraftToCreateRequest(input));
    if (!trip.itinerary || trip.itinerary.length === 0) {
      throw new ApiError(
        200,
        'empty-itinerary',
        'The backend created the trip but returned an empty itinerary. Please try again.',
      );
    }
    const days = apiItineraryToDays(trip.itinerary);
    const signature = itineraryInputSignature({      prompt: input.prompt,
      destination: input.destination,
      origin: input.origin,
      durationDays: input.durationDays,
      travelers: input.travelers,
      travelerLabel: input.travelerLabel,
      budgetAmount: input.budgetAmount,
      budgetLabel: input.budgetLabel,
      style: input.style,
      startDate: input.startDate,
      endDate: input.endDate,
      specialRequests: input.specialRequests,
      transportId: input.transportId,
    });
    setDraft((prev) => ({
      ...prev,
      itinerary: days,
      itinerarySignature: signature,
      tripId: trip.id,
      itinerarySource: 'api',
      totalCost: trip.total_cost,
      apiTrip: trip,
    }));
    writeActiveTripId(trip.id);
    return { days, source: 'api', tripId: trip.id, trip };
  }, []);

  const resetTrip = useCallback(() => {
    const previousId = readActiveTripId();
    if (previousId) unmarkTripConfirmed(previousId);
    clearActiveTripId();
    setDraft(EMPTY_DRAFT);
  }, []);

  const value = useMemo<TripDraftContextValue>(() => {
    const parsed = draft.prompt.trim() ? parseTripPrompt(draft.prompt) : {};
    const currentSignature = draft.prompt.trim()
      ? itineraryInputSignature({
          prompt: draft.prompt,
          destination: draft.destination,
          origin: draft.origin,
          durationDays: draft.durationDays,
          travelers: draft.travelers,
          travelerLabel: draft.travelerLabel,
          budgetAmount: draft.budgetAmount,
          budgetLabel: draft.budgetLabel,
          style: draft.style,
          startDate: draft.startDate,
          endDate: draft.endDate,
          specialRequests: draft.specialRequests,
          transportId: draft.transportId,
        })
      : undefined;
    return {
      draft,
      parsed,
      startTrip,
      updateDraft,
      ensureParsed,
      generateItinerary,
      generateServerItinerary,
      resetTrip,
      capturedCount: countCaptured(draft),
      isItineraryStale:
        draft.itinerary === null ||
        draft.itinerarySignature === undefined ||
        draft.itinerarySignature !== currentSignature,
    };
  }, [draft, startTrip, updateDraft, ensureParsed, generateItinerary, generateServerItinerary, resetTrip]);

  return <TripDraftContext.Provider value={value}>{children}</TripDraftContext.Provider>;
}
