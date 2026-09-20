import type { ItineraryDay, ItineraryStop, StayOption, TripDraft } from '../types';
import { formatINR } from '../utils/format';
import { durationDaysFromRange, parseISODate } from '../utils/dates';
import { itineraryInputSignature } from '../utils/generateMockItinerary';
import { ApiError, apiClient } from './client';
import { safeText } from './traveler';

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
    title: destination ? `${destination} getaway` : prompt.slice(0, 60) || 'My WanderAI trip',
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

/**
 * One row of GET /api/traveler/trips — the logged-in user's own trips ONLY.
 * The picker is ALWAYS fed from this endpoint (Bearer JWT). GET /api/trips
 * is never used for listing: it returns every traveler's trips plus test
 * data, which is exactly what produced "another traveler" 404s in Guide.
 * The backend keys rows by `trip_id`; `id` is accepted as a tolerance alias
 * and normalized below. All fields optional except the id — the UI falls
 * back gracefully. Budget/cost/cover fields arrive when the saved snapshot
 * carries them; older snapshots simply omit them.
 */
export interface TravelerTripSummary {
  id: string;
  trip_id?: string | null;
  title?: string | null;
  destination_name?: string | null;
  destination?: { name?: string | null } | string | null;
  status?: string | null;
  duration_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  formatted_dates?: string | null;
  total_budget?: number | null;
  total_cost?: number | null;
  hero_image_url?: string | null;
  traveler_count?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
}

/** Display name for a trip summary — title, then destination, then short id. Never hardcoded. */
export function travelerTripName(trip: TravelerTripSummary): string {
  const title = safeText(trip.title).trim();
  if (title) return title;
  const destRaw = typeof trip.destination === 'string' ? trip.destination : trip.destination?.name;
  const dest = safeText(destRaw).trim() || safeText(trip.destination_name).trim();
  if (dest) return dest;
  return `Trip ${safeText(trip.id).slice(0, 8) || 'unknown'}`;
}

/** GET /api/traveler/trips — only the logged-in traveler's trips. */
export async function listTravelerTrips(): Promise<TravelerTripSummary[]> {
  const items = await apiClient.authGet<unknown>('/api/traveler/trips');
  const list = Array.isArray(items) ? items : (items as { trips?: unknown })?.trips;
  if (!Array.isArray(list)) return [];
  // Backend ids may arrive as numbers and under `trip_id` (the canonical
  // key) — normalize to strings up front so no downstream `.slice`/key
  // access can throw.
  const out: TravelerTripSummary[] = [];
  for (const t of list) {
    if (!t || typeof t !== 'object') continue;
    const record = t as Record<string, unknown>;
    const rawId = record.id ?? record.trip_id;
    const id = typeof rawId === 'string' ? rawId : typeof rawId === 'number' ? String(rawId) : null;
    if (!id) continue;
    out.push({ ...record, id } as TravelerTripSummary);
  }
  return out;
}

/**
 * POST /api/traveler/trips — persist the generated trip as the traveler's
 * own canonical snapshot (create-or-update by id, 403 on another traveler's
 * id). Called once per successful Plan generation so Trips history, Guide
 * picker and Profile all read the same record. Throws ApiError on failure —
 * callers surface it; nothing is silently skipped.
 */
export function saveTravelerTrip(tripId: string, trip: ApiTripWithItinerary): Promise<unknown> {
  return apiClient.authPost<unknown>('/api/traveler/trips', { trip_id: tripId, trip });
}

/**
 * GET /api/traveler/trips/{trip_id} — the owned trip's full canonical
 * snapshot (404 unless owned — no existence leak). Guarded into
 * ApiTripWithItinerary; a bad shape throws 404-style ApiError so callers
 * treat it exactly like "trip gone".
 */
export async function getTravelerTrip(tripId: string): Promise<ApiTripWithItinerary> {
  const data = await apiClient.authGet<unknown>(`/api/traveler/trips/${encodeURIComponent(tripId)}`);
  const trip = asApiTrip(data);
  if (!trip) throw new ApiError(404, 'trip not found', 'This trip is no longer available.');
  return trip;
}

/**
 * Open one persisted trip by UUID: owned snapshot first (404 unless owned),
 * legacy snapshot-less rows via the canonical trip read — same backend
 * record either way. Never creates or regenerates anything.
 */
export async function fetchPersistedTrip(tripId: string): Promise<ApiTripWithItinerary> {
  try {
    return await getTravelerTrip(tripId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return getTrip(tripId);
    throw error;
  }
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

/** Trip pace options shown on the Itinerary pace selector. */
export const TRIP_PACES = [
  { id: 'relaxed', label: 'Relaxed', hint: '1 stop/day, slow days' },
  { id: 'balanced', label: 'Balanced', hint: '~2 stops/day' },
  { id: 'packed', label: 'Packed', hint: '2 stops/day, full days' },
] as const;

export type TripPaceId = (typeof TRIP_PACES)[number]['id'];

/** Match a backend pace string to a selector option (fallback: balanced). */
export function matchTripPace(pace: unknown): TripPaceId {
  const clean = safeText(pace).trim().toLowerCase();
  const found = TRIP_PACES.find((p) => p.id === clean);
  return found ? found.id : 'balanced';
}

/**
 * PUT /api/trips/{id} — change pace only. Pair with POST /optimize to
 * respread days at the new pace (see the Itinerary pace selector).
 */
export function updateTripPace(tripId: string, pace: TripPaceId): Promise<ApiTripWithItinerary> {
  return apiClient.authPut<ApiTripWithItinerary>(tripPath(tripId, ''), { pace });
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

/** One raw stop row of GET /api/trips/{id}/map (tolerant — keys vary). */
export interface ApiMapStop {
  item_id?: unknown;
  id?: unknown;
  day_number?: unknown;
  day?: unknown;
  order_index?: unknown;
  order?: unknown;
  title?: unknown;
  name?: unknown;
  start_time?: unknown;
  time?: unknown;
  location?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
  lon?: unknown;
  item_type?: unknown;
  type?: unknown;
  has_coordinates?: unknown;
}

/** Raw GET /api/trips/{id}/map body (tolerant — only center/stops/counts matter). */
export interface ApiTripMap {
  center?: { latitude?: unknown; longitude?: unknown } | [unknown, unknown] | null;
  stops?: unknown;
  unmapped_count?: unknown;
}

/** Normalized map pin — numbers only when the backend actually sent them. */
export interface TripMapPin {
  id: string;
  day: number;
  order: number;
  title: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  itemType: string;
}

export interface NormalizedTripMap {
  center: { latitude: number; longitude: number } | null;
  pins: TripMapPin[];
  /** Stops without coordinates, by day, for the honest "no map pin" list. */
  unmapped: Array<{ day: number; title: string }>;
  unmappedCount: number;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n === null ? null : Math.floor(n);
}

/** GET /api/trips/{id}/map — pins, center and unmapped counts for the map view. */
export function getTripMap(tripId: string): Promise<ApiTripMap> {
  return apiClient.authGet<ApiTripMap>(tripPath(tripId, '/map'));
}

/** Normalize the map payload defensively — no invented coordinates, ever. */
export function normalizeTripMap(data: ApiTripMap): NormalizedTripMap {
  let center: NormalizedTripMap['center'] = null;
  const c = data.center;
  if (Array.isArray(c)) {
    const lat = asNumber(c[0]);
    const lng = asNumber(c[1]);
    if (lat !== null && lng !== null) center = { latitude: lat, longitude: lng };
  } else if (c && typeof c === 'object') {
    const lat = asNumber((c as { latitude?: unknown }).latitude);
    const lng = asNumber((c as { longitude?: unknown }).longitude);
    if (lat !== null && lng !== null) center = { latitude: lat, longitude: lng };
  }
  const rawStops = Array.isArray(data.stops) ? data.stops : [];
  const pins: TripMapPin[] = [];
  const unmapped: NormalizedTripMap['unmapped'] = [];
  rawStops.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const s = raw as ApiMapStop;
    const day = asInt(s.day_number ?? s.day) ?? 0;
    const title = safeText(s.title ?? s.name).trim() || `Stop ${index + 1}`;
    const lat = asNumber(s.latitude ?? s.lat);
    const lng = asNumber(s.longitude ?? s.lng ?? s.lon);
    if (lat === null || lng === null || s.has_coordinates === false) {
      unmapped.push({ day, title });
      return;
    }
    pins.push({
      id: safeText(s.item_id ?? s.id).trim() || `${day}-${index}`,
      day,
      order: asInt(s.order_index ?? s.order) ?? index,
      title,
      time: safeText(s.start_time ?? s.time).trim(),
      location: safeText(s.location).trim(),
      latitude: lat,
      longitude: lng,
      itemType: safeText(s.item_type ?? s.type).trim().toLowerCase() || 'unknown',
    });
  });
  const unmappedCount = asInt(data.unmapped_count) ?? unmapped.length;
  return { center, pins, unmapped, unmappedCount };
}

/**
 * Fallback pins from itinerary days (their stops already carry backend
 * lat/lng). Used ONLY when GET /map 404s — same honesty rules: stops
 * without coordinates land in `unmapped`, nothing is invented.
 */
export function fallbackMapFromDays(days: ItineraryDay[]): NormalizedTripMap {
  const pins: TripMapPin[] = [];
  const unmapped: NormalizedTripMap['unmapped'] = [];
  for (const day of days) {
    day.stops.forEach((stop, index) => {
      if (typeof stop.latitude !== 'number' || typeof stop.longitude !== 'number') {
        unmapped.push({ day: day.day, title: stop.title });
        return;
      }
      pins.push({
        id: stop.id,
        day: day.day,
        order: index,
        title: stop.title,
        time: [stop.time, stop.endTime].filter(Boolean).join(' – '),
        location: stop.location ?? '',
        latitude: stop.latitude,
        longitude: stop.longitude,
        itemType: (stop.tags[0] ?? '').toLowerCase() || 'unknown',
      });
    });
  }
  return {
    center:
      pins.length > 0
        ? {
            latitude: pins.reduce((a, p) => a + p.latitude, 0) / pins.length,
            longitude: pins.reduce((a, p) => a + p.longitude, 0) / pins.length,
          }
        : null,
    pins,
    unmapped,
    unmappedCount: unmapped.length,
  };
}

/**
 * Map a returned backend trip onto the shared `TripDraft` patch the UI
 * already understands — the single place mutations land. The signature is
 * recomputed from the given draft inputs so the fresh itinerary is NOT
 * treated as stale (otherwise Itinerary would bounce back to Loading and
 * re-POST a duplicate trip).
 */
export function applyServerTrip(trip: ApiTripWithItinerary, draft: TripDraft): Partial<TripDraft> {  return {
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

/**
 * Build the draft seed for a backend trip (restore-after-refresh and
 * picker select share it): prompt/derived fields come from the trip itself
 * so header, panel, Guide and Itinerary all name the SAME trip. Callers
 * merge `applyServerTrip(trip, seed)` on top. Nothing is hardcoded.
 */
export function seedDraftFromTrip(trip: ApiTripWithItinerary): TripDraft {
  const destination = trip.destination?.name ?? undefined;
  return {
    prompt: trip.title?.trim() || (destination ? `Trip to ${destination}` : 'My WanderAI trip'),
    destination,
    durationDays: trip.duration_days,
    travelers: trip.traveler_count,
    startDate: trip.start_date?.slice(0, 10) || undefined,
    endDate: trip.end_date?.slice(0, 10) || undefined,
    budgetAmount: trip.total_budget,
    itinerary: null,
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

/** Departure/info notes render on the timeline but never count as activity stops. */
export function isCountableStop(stop: Pick<ItineraryStop, 'tags'>): boolean {
  return (stop.tags[0] ?? '').toLowerCase() !== 'note';
}

/** Countable stops in a list (departure notes excluded). */
export function countStops(stops: Array<Pick<ItineraryStop, 'tags'>>): number {
  return stops.filter(isCountableStop).length;
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
        stopsCount: countStops(stops),
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
  /** Full backend trip when source is 'api' — used to persist the snapshot. */
  trip?: ApiTripWithItinerary;
}

