export interface TravelerUser {
  name: string;
  firstName: string;
  tier: string;
  activeTripLabel: string;
  phone: string;
  email: string;
  avatarUrl: string;
  preferences: string;
  language: string;
  currency: string;
  appVersion: string;
  build: string;
}

export interface Destination {
  id: string;
  name: string;
  region: string;
  pricePerPerson: string;
  idealDays: string;
  rating: string;
  reviewsLabel: string;
  imageUrl: string;
  imageAlt: string;
  tag?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface InspirationTrip {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ChecklistItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  hint?: string;
}

export interface BudgetSummary {
  total: string;
  perPerson: string;
  tier: string;
  interests: string;
}

export interface LoadingStep {
  id: string;
  label: string;
  detail?: string;
  status: 'done' | 'active' | 'pending';
}

export interface ItineraryStop {
  id: string;
  time: string;
  title: string;
  description: string;
  costLabel?: string;
  tags: string[];
  imageUrl?: string;
  imageAlt?: string;
  featured?: boolean;
  badge?: string;
  /** Real backend fields, preserved for display (and the future map phase). */
  endTime?: string;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string;
  location?: string;
}

/** Real catalog accommodation, mapped 1:1 from the backend AccommodationOption. */
export interface StayOption {
  id: string;
  name: string;
  rating: number;
  category: string;
  location: string;
  roomType: string;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  amenities: string[];
  whyItMatches: string;
  heroImage?: string;
  images: string[];
  badge: string;
}

/** Real catalog activity alternative from GET /api/possible-options. */
export interface PossibleOption {
  id: string;
  title: string;
  category: string;
  location: string;
  duration: string;
  cost: number;
  description: string;
  imageUrl?: string;
  tags: string[];
  walkingIntensity: string;
}

export interface ItineraryDay {
  id: string;
  day: number;
  title: string;
  stopsCount: number;
  stops: ItineraryStop[];
}

export interface ItineraryMetric {
  id: string;
  value: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

export interface RestaurantPick {
  id: string;
  name: string;
  area: string;
  priceForTwo: string;
  rating: string;
  reviews: string;
  matchLabel: string;
  imageUrl: string;
  imageAlt: string;
}

export interface TripPlanItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  done?: boolean;
  current?: boolean;
}

export interface BookingItem {
  id: string;
  label: string;
  detail: string;
  status: string;
}

export interface ProfileInfoRow {
  id: string;
  label: string;
  value: string;
  verified?: boolean;
}

export interface ProfileMenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface OnboardingSlide {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
}

/** Deterministic parse result for a natural-language trip prompt. Unknown fields stay undefined. */
export interface ParsedTripFields {
  destination?: string;
  durationDays?: number;
  travelers?: number;
  travelerLabel?: string;
  budgetAmount?: number;
  budgetLabel?: string;
  style?: string;
}

/**
 * Shared frontend-only trip draft (Phase 2 — no backend).
 * Single source of truth for the Plan → Checklist → Loading → Itinerary flow.
 */
export interface TripDraft {
  prompt: string;
  destination?: string;
  /** Whether the destination was pre-filled from 3D Globe selection or manually entered. */
  destinationSource?: 'globe' | 'manual';
  durationDays?: number;
  travelers?: number;
  travelerLabel?: string;
  budgetAmount?: number;
  budgetLabel?: string;
  style?: string;
  /** Trip start date as `YYYY-MM-DD` (optional, set via the Checklist date picker). */
  startDate?: string;
  /** Trip end date as `YYYY-MM-DD` (optional, set via the Checklist date picker). */
  endDate?: string;
  /** Prompt text the derived fields were parsed from (edits preserved while this matches). */
  parsedForPrompt?: string;
  /** Deterministically generated mock itinerary (null until Loading completes). */
  itinerary: ItineraryDay[] | null;
  /** Signature of the inputs the stored itinerary was generated from (stale-check). */
  itinerarySignature?: string;
  /** Backend trip id when the itinerary came from the TourFlow API (Phase 3B). */
  tripId?: string;
  /** Where the stored itinerary came from — real API or mock fallback. */
  itinerarySource?: 'api' | 'mock';
  /** Backend-computed trip total (`total_cost`) when the itinerary came from the API. */
  totalCost?: number;
  /**
   * Full backend trip payload (`_trip_dict`) when the itinerary came from the
   * API — stays, alternatives, costs. Null in mock mode. This IS the backend
   * model, not a second itinerary model. Typed loosely here to avoid a
   * type-only import cycle with the api layer; see `ApiTripWithItinerary`.
   */
  apiTrip?: unknown;
}
