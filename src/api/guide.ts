/**
 * Typed layer over the TourFlow backend Guide endpoints.
 *
 * BACKEND CONTRACT (base URL prefix /api — the shared `apiClient` paths
 * below all start with `/api`, matching the existing trip calls):
 * - All Guide routes require `Authorization: Bearer <traveler-JWT>` from
 *   `POST /api/auth/traveler/login` or `/signup` (sent via `authGet/authPost`).
 * - `GET /guide/greeting?tripId=<id>` (tripId optional)
 *   → `{ trip_id, greeting, has_active_trip, user_name }`
 * - `GET /guide/history?tripId=<id>` (tripId optional)
 *   → `{ trip_id, greeting, messages: [{role, message, created_at}], has_active_trip }`
 *   (`created_at` may be null; `user_name` may be null.)
 * - `POST /guide/chat` (alias `POST /chat`, same shape)
 *   body `{ message, tripId? }` — message non-blank, max 2000 chars.
 *   → `{ response, trip_id, greeting, action, suggestions }`
 *
 * `tripId` is omitted when no trip is selected so the backend resolves the
 * active trip. The `/chat` alias is tried ONLY when `/guide/chat` 404s on the
 * route itself — i.e. when no tripId was sent (a 404 with a tripId means the
 * trip was not found, not a missing route, and is surfaced as-is).
 */

import { ApiError, apiClient } from './client';

export interface GuideGreeting {
  trip_id: string | null;
  greeting: string;
  has_active_trip: boolean;
  user_name: string | null;
}

export type GuideMessageRole = 'user' | 'assistant';

export interface GuideHistoryMessage {
  role: GuideMessageRole;
  message: string;
  created_at: string | null;
}

export interface GuideHistory extends GuideGreeting {
  messages: GuideHistoryMessage[];
  trip_card?: GuideTripCard | null;
}

export interface GuideAction {
  applied: boolean;
  intent: string | null;
  action: string | null;
  item_id: string | null;
  reason: string | null;
}

/**
 * Trip summary card the backend attaches to history/chat responses for the
 * side panels. Every field is optional — panels render only what is present
 * and fall back to the shared trip draft otherwise. Nothing is hardcoded.
 */
export interface GuideTripCard {
  total_budget?: number | null;
  spent?: number | null;
  total_spent?: number | null;
  remaining?: number | null;
  remaining_budget?: number | null;
  currency?: string | null;
  bookings_count?: number | null;
  destination?: string | null;
  duration_days?: number | null;
  traveler_count?: number | null;
}

export interface GuideChatResponse {
  response: string;
  trip_id: string | null;
  greeting: string;
  action: GuideAction | null;
  suggestions: string[];
  trip_card?: GuideTripCard | null;
}

const CHAT_TIMEOUT_MS = 120_000; // backend fans out to Gemini inline

function withTripId(path: string, tripId?: string): string {
  if (!tripId) return path;
  return `${path}?tripId=${encodeURIComponent(tripId)}`;
}

/** GET /api/guide/greeting — opening message for the current (or given) trip. */
export function getGuideGreeting(tripId?: string): Promise<GuideGreeting> {
  return apiClient.authGet<GuideGreeting>(withTripId('/api/guide/greeting', tripId));
}

/** GET /api/guide/history — stored conversation; render messages as-is. */
export function getGuideHistory(tripId?: string): Promise<GuideHistory> {
  return apiClient.authGet<GuideHistory>(withTripId('/api/guide/history', tripId), {
    timeoutMs: CHAT_TIMEOUT_MS,
  });
}

export interface GuideChatRequest {
  message: string;
  tripId?: string;
}

/**
 * POST /api/guide/chat (alias POST /api/chat) — send a chat message.
 * Blank messages are rejected client-side by the Guide page; a backend 422
 * is surfaced as `ApiError` for inline display. The alias is attempted only
 * when no tripId was sent: a 404 alongside a tripId means "trip not found".
 */
export async function postGuideChat(input: GuideChatRequest): Promise<GuideChatResponse> {
  const body = input.tripId ? { message: input.message, tripId: input.tripId } : { message: input.message };
  try {
    return await apiClient.authPost<GuideChatResponse>('/api/guide/chat', body, { timeoutMs: CHAT_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && !input.tripId) {
      // Contract alias: POST /chat serves the same shape.
      return apiClient.authPost<GuideChatResponse>('/api/chat', body, { timeoutMs: CHAT_TIMEOUT_MS });
    }
    throw error;
  }
}
