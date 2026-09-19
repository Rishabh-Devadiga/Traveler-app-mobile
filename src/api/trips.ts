import type { ItineraryDay, ItineraryStop, StayOption, TripDraft } from '../types';
import { formatINR } from '../utils/format';
import { durationDaysFromRange, parseISODate } from '../utils/dates';
import { itineraryInputSignature } from '../utils/generateMockItinerary';
import { apiClient } from './client';

/**
 * Typed layer over the existing TourFlow backend trip endpoints (Phase 3A).
 *
 * Discovered contract (WanderAI-Backend, read-only inspection):
 * - `POST /api/trips` accepts `TripCreate` and returns the full trip WITH the
 *   generated `itinerary[]` (`backend/api/routes.py` → `create_trip` → `_trip_dict`).
 * - `GET /api/trips/{trip_id}` returns the same shape (`get_trip` → `_trip_dict`).
 * - Every trip call sends `Authorization: Bearer <traveler-JWT>` WHEN a
 *   traveler session exists (via `apiClient`'s `auth` variants) so trips are
 *   owned by the logged-in user; without a token the calls stay anonymous,
 *   exactly the old flow. Never add secrets here.
 *
 * The mock flow (`generateMockItinerary`) stays intact as the development
 * fallback for when the API URL is unconfigured, and is NOT removed.
 * `TripDraftContext.generateServerItinerary` is the single caller that
 * upgrades a draft to the real backend itinerary. API failures are never
 * silently converted to mock data here — callers surface them to the user.
 */

/** Subset of backend `TripCreate` (schemas.py) that the Traveler app sends. */
export interface TripCreateRequest {
  title: string;
  destination_name?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  total_budget?: number;
  currency?: string;
  traveler_count?: number;
  pace?: string;
  preferences?: {
    travel_companions?: string;
    special_requests?: string;
  };
}

/** One row of `_trip_dict(...).itinerary` (routes.py `_trip_dict`, flattened `meta_data.ui`). */
export interface ApiItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  order_index: number;
  item_type: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  cost: number;
  status: string;
  hotel_id: string | null;
  activity_id: string | null;
  transport_id: string | null;
  location: string | null;
  image_url?: string | null;
  duration?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source_url?: string | null;
  evidence?: unknown;
  walking_intensity?: string | null;
  rest_buffer_minutes?: number | null;
}

/** Backend AccommodationOption as built by `_hotel_option` (routes.py). */
export interface ApiStayOption {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  category: string;
  location: string;
  room_type: string;
  price_per_night: number;
  total_price: number;
  nights: number;
  amenities: string[];
  why_it_matches: string;
  hero_image: string | null;
  images: string[];
  badge: string;
}

/** Subset of `_trip_dict` the Traveler app consumes. */
export interface ApiTripWithItinerary {
  id: string;
  title: string;
  status: string;
  duration_days: number;
  total_budget: number;
  currency: string;
  traveler_count: number;
  pace: string;
  /** ISO datetimes when the trip carries dates (present on trips created/edited with a range). */
  start_date?: string | null;
  end_date?: string | null;
  destination: {
    id: string;
    name: string;
    hero_image_url: string | null;
    state_region: string;
    country: string;
  } | null;
  itinerary: ApiItineraryItem[];
  total_cost: number;
  cost_breakdown: {
    transport: number;
    accommodation: number;
    activities: number;
    total: number;
    target_budget: number;
    remaining_budget: number;
    is_under_budget: boolean;
  };
  /** Null when the trip has no usable hotel item — never fabricated. */
  selected_accommodation: ApiStayOption | null;
  accommodation_alternatives: ApiStayOption[];
  daily_accommodations: Array<{ day_number: number; hotel: ApiStayOption }>;
}

const CREATE_TRIP_TIMEOUT_MS = 120_000; // backend runs discovery + generation inline

/**
 * The backend trip id survives refresh (single localStorage key) so a
 * confirmed trip — and the whole itinerary — can be restored via
 * GET /api/trips/{id} after reload. Written on creation, cleared on reset.
 */
const ACTIVE_TRIP_KEY = 'tourflow.activeTripId.v1';

export function readActiveTripId(): string | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_TRIP_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function writeActiveTripId(tripId: string): void {
  try {
    window.localStorage.setItem(ACTIVE_TRIP_KEY, tripId);
  } catch {
    /* private mode — restore simply won't survive refresh */
  }
}

export function clearActiveTripId(): void {
  try {
    window.localStorage.removeItem(ACTIVE_TRIP_KEY);
  } catch {
    /* already gone */
  }
}

/**
 * Traveler-visible confirmed state, keyed per trip id. Written on any
 * successful POST .../confirm (the call is idempotent, so 2xx means the
 * backend confirmed it) and read alongside `trip.status` — so the traveler
 * sees "Trip Confirmed" instantly and after refresh even if a re-GET lags.
 */
const CONFIRMED_TRIPS_KEY = 'tourflow.confirmedTripIds.v1';

function readConfirmedIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(CONFIRMED_TRIPS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function isTripMarkedConfirmed(tripId: string): boolean {
  return readConfirmedIds().includes(tripId);
}

export function markTripConfirmed(tripId: string): void {
  try {
    const ids = readConfirmedIds();
    if (!ids.includes(tripId)) {
      window.localStorage.setItem(CONFIRMED_TRIPS_KEY, JSON.stringify([...ids, tripId]));
    }
  } catch {
    /* banner still renders from trip.status this session */
  }
}

export function unmarkTripConfirmed(tripId: string): void {
  try {
    window.localStorage.setItem(
      CONFIRMED_TRIPS_KEY,
      JSON.stringify(readConfirmedIds().filter((id) => id !== tripId)),
    );
  } catch {
    /* already gone */
  }
}

/** Backend status check — tolerant of casing (`confirmed`, `CONFIRMED`). */
export function isTripConfirmedStatus(status: unknown): boolean {
  return typeof status === 'string' && status.toLowerCase() === 'confirmed';
}

function paceForStyle(style?: string): string {
  if (style && /relax|slow|leisure/i.test(style)) return 'relaxed';
  return 'balanced';
}

function companionsForDraft(draft: TripDraft): string | undefined {
  const label = draft.travelerLabel ?? '';
  if (/solo/i.test(label) || draft.travelers === 1) return 'solo';
  if (/family/i.test(label)) return 'family';
  if (/couple/i.test(label) || draft.travelers === 2) return 'couple';
  if (/friend/i.test(label)) return 'friends';
  return undefined;
}

/** Map the shared `TripDraft` to the backend `TripCreate` body. Unknowns are omitted (backend defaults apply).
 *  Any non-empty destination is sent as-is — the backend discovers arbitrary
 *  names dynamically, so this mapper MUST NOT consult the frontend
 *  known-destination list. Only whitespace is normalized, never invented. */
export function tripDraftToCreateRequest(draft: TripDraft): TripCreateRequest {
  const prompt = draft.prompt.trim();
  const destination = draft.destination?.trim() ? draft.destination.trim() : undefined;
  const body: TripCreateRequest = {
    title: destination ? `${destination} getaway` : prompt.slice(0, 60) || 'My TourFlow trip',
    currency: 'INR',
    pace: paceForStyle(draft.style),
  };
  if (destination) body.destination_name = destination;
  // Dates are the source of truth: a valid start/end pair ALWAYS overrides a
  // possibly stale `durationDays` (e.g. "3 days" parsed from the prompt while
  // the pickers say 16→21 Oct). Sending both contradicting values lets the
  // backend honor `duration_days` and generate a short trip. An invalid pair
  // (end before start) is never sent at all.
  const rangeDays =
    draft.startDate && draft.endDate && parseISODate(draft.startDate) && parseISODate(draft.endDate)
      ? durationDaysFromRange(draft.startDate, draft.endDate)
      : undefined;
  if (rangeDays !== undefined) {
    body.start_date = `${draft.startDate}T00:00:00`;
    body.end_date = `${draft.endDate}T00:00:00`;
    body.duration_days = rangeDays;
  } else if (draft.durationDays !== undefined) {
    body.duration_days = draft.durationDays;
  }
  if (draft.budgetAmount !== undefined) body.total_budget = draft.budgetAmount;
  if (draft.travelers !== undefined) body.traveler_count = draft.travelers;
  const travelCompanions = companionsForDraft(draft);
  if (travelCompanions !== undefined || prompt) {
    body.preferences = {};
    if (travelCompanions !== undefined) body.preferences.travel_companions = travelCompanions;
    if (prompt) body.preferences.special_requests = prompt;
  }
  return body;
}

/** POST /api/trips — creates the trip and returns it with the generated itinerary. */
export function createTrip(input: TripCreateRequest): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>('/api/trips', input, { timeoutMs: CREATE_TRIP_TIMEOUT_MS });
}

/** GET /api/trips/{trip_id} — retrieves the trip with its generated itinerary. */
export function getTrip(tripId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authGet<ApiTripWithItinerary>(`/api/trips/${encodeURIComponent(tripId)}`);
}

function tripPath(tripId: string, suffix: string): string {
  return `/api/trips/${encodeURIComponent(tripId)}${suffix}`;
}

/**
 * PUT /api/trips/{id} — adjust trip dates. Sends start/end as ISO datetimes
 * plus duration_days = (end-start)+1 so the body is always self-consistent
 * (the backend reconciles from dates on disagreement).
 */
export function updateTripDates(tripId: string, startDate: string, endDate: string): Promise<ApiTripWithItinerary> {
  const rangeDays = durationDaysFromRange(startDate, endDate);
  return apiClient.authPut<ApiTripWithItinerary>(tripPath(tripId, ''), {
    start_date: `${startDate}T00:00:00`,
    end_date: `${endDate}T00:00:00`,
    ...(rangeDays === undefined ? {} : { duration_days: rangeDays }),
  });
}

/**
 * POST /api/trips/{id}/optimize — rebuild proposed stops across the (new)
 * date range. Required after Adjust Dates: a plain re-GET keeps existing
 * items, optimize respreads them 1..duration_days. Returns the updated trip.
 */
export function optimizeTrip(tripId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/optimize'), {}, { timeoutMs: CREATE_TRIP_TIMEOUT_MS });
}

/** POST /api/trips/{id}/change-accommodation — swap the stay for the whole trip. */
export function changeAccommodation(tripId: string, accommodationId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/change-accommodation'), {
    accommodation_id: accommodationId,
  });
}

/** POST /api/trips/{id}/change-day-accommodation — swap the stay for one day. */
export function changeDayAccommodation(
  tripId: string,
  accommodationId: string,
  dayNumber: number,
): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/change-day-accommodation'), {
    accommodation_id: accommodationId,
    day_number: dayNumber,
  });
}

export interface SwapActivityInput {
  item_id: string;
  new_title?: string;
  new_description?: string;
  new_cost?: number;
  new_image_url?: string;
}

/** POST /api/trips/{id}/swap-activity — replace a stop's content in place. */
export function swapActivity(tripId: string, input: SwapActivityInput): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/swap-activity'), input);
}

export interface AddActivityInput {
  title: string;
  day_number: number;
  start_time?: string;
  end_time?: string;
  cost?: number;
  location?: string;
  description?: string;
}

/** POST /api/trips/{id}/add-activity — append a stop to a day. */
export function addActivity(tripId: string, input: AddActivityInput): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/add-activity'), input);
}

/** POST /api/trips/{id}/delete-activity — remove a stop. */
export function deleteActivity(tripId: string, itemId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/delete-activity'), { item_id: itemId });
}

export interface EditActivityInput {
  item_id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  location?: string;
}

/** POST /api/trips/{id}/edit-activity — patch a stop's fields. */
export function editActivity(tripId: string, input: EditActivityInput): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/edit-activity'), input);
}

/** POST /api/trips/{id}/toggle-activity — flip a stop's enabled/skipped state. */
export function toggleActivity(tripId: string, itemId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/toggle-activity'), { item_id: itemId });
}

/**
 * POST /api/trips/{id}/confirm — confirm the trip. Idempotent, so double-taps
 * are safe. A 422 means required data (dates) is missing — callers route the
 * user to Adjust Dates instead of showing a raw error.
 */
export function confirmTrip(tripId: string): Promise<ApiTripWithItinerary> {
  return apiClient.authPost<ApiTripWithItinerary>(tripPath(tripId, '/confirm'), {});
}

/**
 * Map a returned backend trip onto the shared `TripDraft` patch the UI
 * already understands — the single place mutations land. The signature is
 * recomputed from the given draft inputs so the fresh itinerary is NOT
 * treated as stale (otherwise Itinerary would bounce back to Loading and
 * re-POST a duplicate trip).
 */
export function applyServerTrip(trip: ApiTripWithItinerary, draft: TripDraft): Partial<TripDraft> {
  return {
    itinerary: apiItineraryToDays(trip.itinerary),
    itinerarySignature: itineraryInputSignature({
      prompt: draft.prompt,
      destination: draft.destination,
      durationDays: draft.durationDays,
      travelers: draft.travelers,
      budgetAmount: draft.budgetAmount,
      budgetLabel: draft.budgetLabel,
      style: draft.style,
      startDate: draft.startDate,
      endDate: draft.endDate,
    }),
    tripId: trip.id,
    itinerarySource: 'api',
    totalCost: trip.total_cost,
    apiTrip: trip,
  };
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  hotel: 'Stay',
  activity: 'Activity',
  transport: 'Transport',
  meal: 'Meal',
  note: 'Note',
  leisure: 'Leisure',
};

function toStop(item: ApiItineraryItem): ItineraryStop {
  const tags = [ITEM_TYPE_LABELS[item.item_type] ?? item.item_type];
  if (item.duration) tags.push(item.duration);
  return {
    id: item.id,
    time: item.start_time ?? '',
    title: item.title,
    description: item.description ?? '',
    costLabel: item.cost > 0 ? formatINR(item.cost) : undefined,
    tags,
    imageUrl: item.image_url ?? undefined,
    imageAlt: item.title,
    featured: item.item_type === 'activity',
    endTime: item.end_time ?? undefined,
    latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
    longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
    sourceUrl: item.source_url ?? undefined,
    location: item.location ?? undefined,
  };
}

/** Group backend itinerary rows into the `ItineraryDay[]` shape the UI already renders. */
export function apiItineraryToDays(items: ApiItineraryItem[]): ItineraryDay[] {
  const byDay = new Map<number, ApiItineraryItem[]>();
  for (const item of items) {
    const group = byDay.get(item.day_number) ?? [];
    group.push(item);
    byDay.set(item.day_number, group);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, group]) => {
      const stops = group
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map(toStop);
      return {
        id: `api-day-${dayNumber}`,
        day: dayNumber,
        title: `Day ${dayNumber}`,
        stopsCount: stops.length,
        stops,
      };
    });
}

/** Map a backend AccommodationOption to the UI StayOption (1:1, no invention). */
export function toStayOption(hotel: ApiStayOption): StayOption {
  return {
    id: hotel.id,
    name: hotel.name,
    rating: hotel.rating,
    category: hotel.category,
    location: hotel.location,
    roomType: hotel.room_type,
    pricePerNight: hotel.price_per_night,
    totalPrice: hotel.total_price,
    nights: hotel.nights,
    amenities: hotel.amenities,
    whyItMatches: hotel.why_it_matches,
    heroImage: hotel.hero_image ?? undefined,
    images: hotel.images,
    badge: hotel.badge,
  };
}

/** Type guard for the backend trip payload stored on the draft (see TripDraft.apiTrip). */
export function asApiTrip(value: unknown): ApiTripWithItinerary | null {
  if (!value || typeof value !== 'object') return null;
  const trip = value as Partial<ApiTripWithItinerary>;
  if (typeof trip.id !== 'string' || !Array.isArray(trip.itinerary)) return null;
  return trip as ApiTripWithItinerary;
}

export type ItinerarySource = 'api' | 'mock';

export interface ResolvedItinerary {
  days: ItineraryDay[];
  source: ItinerarySource;
  tripId?: string;
}

