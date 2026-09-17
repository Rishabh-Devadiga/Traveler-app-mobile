import type { ItineraryDay, ItineraryStop, StayOption, TripDraft } from '../types';
import { formatINR } from '../utils/format';
import { parseISODate } from '../utils/dates';
import { apiClient } from './client';

/**
 * Typed layer over the existing TourFlow backend trip endpoints (Phase 3A).
 *
 * Discovered contract (WanderAI-Backend, read-only inspection):
 * - `POST /api/trips` accepts `TripCreate` and returns the full trip WITH the
 *   generated `itinerary[]` (`backend/api/routes.py` → `create_trip` → `_trip_dict`).
 * - `GET /api/trips/{trip_id}` returns the same shape (`get_trip` → `_trip_dict`).
 * - Both endpoints are open (only `Depends(get_db)` — no JWT), so no auth
 *   headers or API keys are sent from this frontend. Never add secrets here.
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
  // Dates are passed through only as a valid pair (backend `datetime` fields);
  // duration_days remains the source of truth for generation length.
  if (draft.startDate && draft.endDate && parseISODate(draft.startDate) && parseISODate(draft.endDate)) {
    body.start_date = `${draft.startDate}T00:00:00`;
    body.end_date = `${draft.endDate}T00:00:00`;
  }
  if (draft.durationDays !== undefined) body.duration_days = draft.durationDays;
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
  return apiClient.post<ApiTripWithItinerary>('/api/trips', input, CREATE_TRIP_TIMEOUT_MS);
}

/** GET /api/trips/{trip_id} — retrieves the trip with its generated itinerary. */
export function getTrip(tripId: string): Promise<ApiTripWithItinerary> {
  return apiClient.get<ApiTripWithItinerary>(`/api/trips/${encodeURIComponent(tripId)}`);
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

