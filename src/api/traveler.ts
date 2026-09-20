/**
 * Traveler profile endpoints (Bearer JWT).
 *
 * - GET /api/traveler/profile → the logged-in traveler's profile
 *   (full_name, email, phone, bio, travel_style, dietary_preferences,
 *   fitness_level, preferred_currency, language, …).
 * - PATCH /api/traveler/profile → partial update; returns the updated
 *   profile. Only the keys being changed are sent.
 *
 * Every field except `full_name`/`email` is optional — the UI renders
 * "Not set" for absent values and never hardcodes user data.
 */

import { ApiError, apiClient, apiErrorMessage, getApiBaseUrl } from './client';
import { getTravelerToken } from './auth';

export interface TravelerProfile {
  id?: string;
  full_name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  travel_style?: string | null;
  dietary_preferences?: string | null;
  fitness_level?: string | null;
  preferred_currency?: string | null;
  language?: string | null;
  avatar_url?: string | null;
  has_avatar?: boolean | null;
}

export interface TravelerProfilePatch {
  full_name?: string;
  phone?: string;
  bio?: string;
  travel_style?: string;
  dietary_preferences?: string;
  fitness_level?: string;
  preferred_currency?: string;
  language?: string;
}

/** First letter of the full name, uppercase — the avatar initial. */
export function profileInitial(profile: Pick<TravelerProfile, 'full_name'>): string {
  const first = safeText(profile.full_name).charAt(0);
  return first ? first.toUpperCase() : 'T';
}

/**
 * Crash-proof text coercion for backend values: strings pass through,
 * numbers/booleans stringify, everything else becomes ''. Never throws,
 * so a surprising payload (phone as number, name missing) renders
 * "Not set" instead of tripping the error boundary on `.trim`.
 */
export function safeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** dietary_preferences may arrive as a string OR a string array. */
export function dietaryDisplay(value: unknown): string {
  if (Array.isArray(value)) {
    const parts = value.map((v) => safeText(v).trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
  }
  return safeText(value);
}

/** GET /api/traveler/profile — the logged-in traveler's profile (never cached: avatar state must be fresh). */
export function getTravelerProfile(): Promise<TravelerProfile> {
  return apiClient.authGet<TravelerProfile>('/api/traveler/profile', { cache: 'no-store' });
}

/** PATCH /api/traveler/profile — save edits, returns the updated profile. */
export function patchTravelerProfile(patch: TravelerProfilePatch): Promise<TravelerProfile> {
  return apiClient.authPatch<TravelerProfile>('/api/traveler/profile', patch);
}

/**
 * Avatar image URL: GET {API}/api/traveler/avatar/{user_id}, but ONLY when
 * the profile reports has_avatar=true (else the initial circle renders and
 * NO img request goes out at all).
 * The version query is PERSISTED (localStorage) so a refresh never reuses a
 * URL whose 404 the browser may have cached — upload → photo → refresh →
 * photo, same browser, no re-login.
 */
const AVATAR_VERSION_KEY = 'tourflow.avatarVersion.v1';

function readAvatarVersion(): number {
  try {
    const raw = window.localStorage.getItem(AVATAR_VERSION_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

let avatarVersion = readAvatarVersion();

export function bumpAvatarVersion(): void {
  avatarVersion += 1;
  try {
    window.localStorage.setItem(AVATAR_VERSION_KEY, String(avatarVersion));
  } catch {
    /* private mode — in-memory version still busts this session */
  }
}

export function avatarUrlFor(profile: Pick<TravelerProfile, 'id' | 'has_avatar'>): string | null {
  if (profile.has_avatar !== true) return null;
  const id = safeText(profile.id).trim();
  const base = getApiBaseUrl();
  if (!id || !base) return null;
  const v = avatarVersion > 0 ? `?v=${avatarVersion}` : '';
  return `${base}/api/traveler/avatar/${encodeURIComponent(id)}${v}`;
}

/**
 * Dev-only: log the three avatar endpoints (upload POST, profile GET,
 * <img> src) with hosts so a split-host read path is visible instantly.
 * Production builds stay silent.
 */
export function logAvatarEndpoints(action: string, imgUrl: string | null): void {
  if (import.meta.env?.DEV !== true) return;
  const base = getApiBaseUrl() ?? '(unconfigured)';
  const hostOf = (url: string | null): string => {
    if (!url) return '(none)';
    try {
      return new URL(url).host;
    } catch {
      return '(unparseable)';
    }
  };
  const postUrl = `${base}/api/traveler/avatar`;
  const getUrl = `${base}/api/traveler/profile`;
  const hosts = new Set([hostOf(postUrl), hostOf(getUrl), hostOf(imgUrl)]);
  console.info(`[avatar:${action}]`, { upload: postUrl, profile: getUrl, img: imgUrl });
  if (hosts.size > 1) {
    console.warn('[avatar] ENDPOINT HOST MISMATCH — upload/read/img disagree:', [...hosts]);
  }
}

const AVATAR_TIMEOUT_MS = 120_000;

function avatarDetail(data: unknown): unknown {
  return data && typeof data === 'object' && 'detail' in data
    ? (data as { detail: unknown }).detail
    : data;
}

/** POST /api/traveler/avatar — multipart field 'file', Bearer JWT. Returns the raw parsed body. */
export async function uploadTravelerAvatar(file: File): Promise<unknown> {
  const base = getApiBaseUrl();
  if (!base) throw new ApiError(0, 'VITE_TOURFLOW_API_URL is not set', 'WanderAI API is not configured.');
  const token = getTravelerToken();
  const form = new FormData();
  form.append('file', file);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), AVATAR_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}/api/traveler/avatar`, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = avatarDetail(data);
      throw new ApiError(response.status, detail, apiErrorMessage(response.status, detail), data);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out', 'WanderAI API request timed out.');
    }
    throw new ApiError(0, error, 'Could not reach the WanderAI API.');
  } finally {
    window.clearTimeout(timeout);
  }
}

/** DELETE /api/traveler/avatar — removes the stored photo. */
export async function deleteTravelerAvatar(): Promise<unknown> {
  const base = getApiBaseUrl();
  if (!base) throw new ApiError(0, 'VITE_TOURFLOW_API_URL is not set', 'WanderAI API is not configured.');
  const token = getTravelerToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}/api/traveler/avatar`, { method: 'DELETE', headers });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = avatarDetail(data);
    throw new ApiError(response.status, detail, apiErrorMessage(response.status, detail), data);
  }
  return data;
}
