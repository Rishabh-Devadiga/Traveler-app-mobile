/**
 * Minimal typed HTTP client for the TourFlow backend (Phase 3A).
 *
 * - Base URL resolution order (first non-empty value wins):
 *   1. Android/WebView runtime override: `window.__TOURFLOW_API_URL__` or
 *      `localStorage["tourflow.apiUrl.v1"]` (set via `setApiBaseUrlOverride()`
 *      or shipped `public/api-config.json`). Required on a physical device
 *      where the dev PC is reached over LAN, not localhost.
 *   2. Build-time `VITE_TOURFLOW_API_URL` (or legacy `VITE_API_URL`).
 * - No localhost fallbacks are hardcoded here and no API keys/tokens live in
 *   this file. (The trip endpoints used by the Traveler app are open on the
 *   backend — they depend only on `get_db`, no JWT.)
 * - FastAPI error bodies (`{"detail": ...}`) are surfaced via `ApiError`.
 */

import { getTravelerToken } from './auth';

/** localStorage key for the on-device backend URL override (LAN builds). */
export const API_URL_OVERRIDE_KEY = 'tourflow.apiUrl.v1';

/** Global override injected before the bundle loads (e.g. per-APK config). */
declare global {
  interface Window {
    __TOURFLOW_API_URL__?: string;
  }
}

function normalizeBaseUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : undefined;
}

function readRuntimeOverride(): string | undefined {
  try {
    const fromGlobal = normalizeBaseUrl(window.__TOURFLOW_API_URL__);
    if (fromGlobal) return fromGlobal;
  } catch {
    /* window unavailable (SSR/tests) — fall through to build-time env */
  }
  try {
    return normalizeBaseUrl(window.localStorage.getItem(API_URL_OVERRIDE_KEY));
  } catch {
    return undefined;
  }
}

function readBaseUrl(): string | undefined {
  // On-device override first so one APK works against any LAN backend without
  // a rebuild; build-time env remains the default for web/dev.
  const override = readRuntimeOverride();
  if (override) return override;
  // Optional chaining: `import.meta.env` is injected by Vite, but the guard
  // keeps SSR/tests outside Vite from throwing on access.
  const raw = import.meta.env?.VITE_TOURFLOW_API_URL || import.meta.env?.VITE_API_URL;
  return normalizeBaseUrl(raw);
}

/** Persist an on-device backend URL (takes effect immediately, survives restarts). */
export function setApiBaseUrlOverride(url: string): void {
  window.localStorage.setItem(API_URL_OVERRIDE_KEY, normalizeBaseUrl(url) ?? url.trim());
}

/** Clear the on-device backend URL override (falls back to the built-in URL). */
export function clearApiBaseUrlOverride(): void {
  try {
    window.localStorage.removeItem(API_URL_OVERRIDE_KEY);
  } catch {
    /* storage unavailable — override is effectively cleared */
  }
}


export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  /** Full parsed response body (siblings of `detail`, e.g. guide 404 `active_trip`, are kept here). */
  readonly raw: unknown;
  /** Machine-readable cause: 'timeout' for AbortController timeouts, undefined otherwise. */
  readonly code?: string;

  constructor(status: number, detail: unknown, message?: string, raw: unknown = detail, code?: string) {
    super(message ?? `WanderAI API request failed (status ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.raw = raw;
    this.code = code;
  }
}

function errorMessage(status: number, detail: unknown): string {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((entry) => typeof entry?.msg === 'string');
    if (typeof first?.msg === 'string') return first.msg;
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return `WanderAI API request failed (status ${status})`;
}

/** True when the API base URL is configured. The mock flow is used otherwise. */
export function isApiConfigured(): boolean {
  return readBaseUrl() !== undefined;
}

/** Base URL for building non-JSON resource URLs (e.g. avatar image src). */
export function getApiBaseUrl(): string | undefined {
  return readBaseUrl();
}

/** Verbatim backend error text for a status + parsed body (shared with multipart calls). */
export function apiErrorMessage(status: number, detail: unknown): string {
  return errorMessage(status, detail);
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  /**
   * Attach `Authorization: Bearer <traveler-JWT>` when a traveler session
   * exists. Guide routes require it; the open trip routes omit it.
   */
  auth?: boolean;
  /** fetch cache mode — 'no-store' for always-fresh reads (profile/avatar state). */
  cache?: RequestCache;
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = readBaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      0,
      'VITE_TOURFLOW_API_URL is not set',
      'WanderAI API is not configured. Set VITE_TOURFLOW_API_URL to use the backend; otherwise the mock flow is used.',
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.auth) {
      const token = getTravelerToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      ...(options.cache ? { cache: options.cache } : {}),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        data && typeof data === 'object' && 'detail' in data
          ? (data as { detail: unknown }).detail
          : data;
      throw new ApiError(response.status, detail, errorMessage(response.status, detail), data);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        0,
        'Request timed out',
        'The itinerary is taking longer than expected. Please try again.',
        'Request timed out',
        'timeout',
      );
    }
    throw new ApiError(0, error, 'Could not reach the WanderAI API.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface AuthRequestOptions {
  timeoutMs?: number;
  cache?: RequestCache;
}

export const apiClient = {
  get: <T>(path: string, timeoutMs?: number) => request<T>(path, { method: 'GET', timeoutMs }),
  post: <T>(path: string, body: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'POST', body, timeoutMs }),
  put: <T>(path: string, body: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'PUT', body, timeoutMs }),
  patch: <T>(path: string, body: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'PATCH', body, timeoutMs }),
  delete: <T>(path: string, timeoutMs?: number) =>
    request<T>(path, { method: 'DELETE', timeoutMs }),
  /** Authenticated variants — send the traveler JWT when one is stored. */
  authGet: <T>(path: string, options?: AuthRequestOptions) =>
    request<T>(path, { method: 'GET', auth: true, timeoutMs: options?.timeoutMs, cache: options?.cache }),
  authPost: <T>(path: string, body: unknown, options?: AuthRequestOptions) =>
    request<T>(path, { method: 'POST', body, auth: true, timeoutMs: options?.timeoutMs, cache: options?.cache }),
  authPut: <T>(path: string, body: unknown, options?: AuthRequestOptions) =>
    request<T>(path, { method: 'PUT', body, auth: true, timeoutMs: options?.timeoutMs, cache: options?.cache }),
  authPatch: <T>(path: string, body: unknown, options?: AuthRequestOptions) =>
    request<T>(path, { method: 'PATCH', body, auth: true, timeoutMs: options?.timeoutMs, cache: options?.cache }),
  authDelete: <T>(path: string, options?: AuthRequestOptions) =>
    request<T>(path, { method: 'DELETE', auth: true, timeoutMs: options?.timeoutMs, cache: options?.cache }),
};
