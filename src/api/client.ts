/**
 * Minimal typed HTTP client for the TourFlow backend (Phase 3A).
 *
 * - Base URL comes ONLY from the `VITE_TOURFLOW_API_URL` environment variable.
 * - No localhost fallbacks and no API keys/tokens are hardcoded here.
 *   (The trip endpoints used by the Traveler app are open on the backend —
 *   they depend only on `get_db`, no JWT.)
 * - FastAPI error bodies (`{"detail": ...}`) are surfaced via `ApiError`.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? `TourFlow API request failed (status ${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function readBaseUrl(): string | undefined {
  // Optional chaining: `import.meta.env` is injected by Vite, but the guard
  // keeps SSR/tests outside Vite from throwing on access.
  const raw = import.meta.env?.VITE_TOURFLOW_API_URL || import.meta.env?.VITE_API_URL;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed ? trimmed : undefined;
}

/** True when the API base URL is configured. The mock flow is used otherwise. */
export function isApiConfigured(): boolean {
  return readBaseUrl() !== undefined;
}

function errorMessage(status: number, detail: unknown): string {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const first = detail.find((entry) => typeof entry?.msg === 'string');
    if (typeof first?.msg === 'string') return first.msg;
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return `TourFlow API request failed (status ${status})`;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const baseUrl = readBaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      0,
      'VITE_TOURFLOW_API_URL is not set',
      'TourFlow API is not configured. Set VITE_TOURFLOW_API_URL to use the backend; otherwise the mock flow is used.',
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        data && typeof data === 'object' && 'detail' in data
          ? (data as { detail: unknown }).detail
          : data;
      throw new ApiError(response.status, detail, errorMessage(response.status, detail));
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out', 'TourFlow API request timed out.');
    }
    throw new ApiError(0, error, 'Could not reach the TourFlow API.');
  } finally {
    window.clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, timeoutMs?: number) => request<T>(path, { method: 'GET', timeoutMs }),
  post: <T>(path: string, body: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'POST', body, timeoutMs }),
  put: <T>(path: string, body: unknown, timeoutMs?: number) =>
    request<T>(path, { method: 'PUT', body, timeoutMs }),
};
