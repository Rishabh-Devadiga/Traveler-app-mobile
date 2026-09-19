/**
 * Traveler authentication for the TourFlow backend.
 *
 * EXACT AUTH CONTRACT (base prefix /api):
 * - POST /api/auth/traveler/signup
 *   body { full_name (1-255), email, password (8-72) } — NEVER "name".
 *   201 → { user: { id, email, full_name }, token }. 409 = duplicate email.
 * - POST /api/auth/traveler/login — body { email, password }.
 *   200 → same { user, token } envelope. 401 = invalid credentials.
 * - GET /api/auth/traveler/me (Bearer) → { id, email, full_name };
 *   401 = expired/invalid token. Called at app startup to restore the session.
 *
 * The JWT is stored under a single localStorage key so the session survives
 * refresh, and is sent ONLY as `Authorization: Bearer <token>` on requests
 * that opt in via `apiClient`'s `auth` flag. No credentials/tokens hardcoded.
 */

import { ApiError, apiClient } from './client';

export const TRAVELER_TOKEN_KEY = 'tourflow.travelerToken.v1';

export function getTravelerToken(): string | null {
  try {
    const raw = window.localStorage.getItem(TRAVELER_TOKEN_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function hasTravelerToken(): boolean {
  return getTravelerToken() !== null;
}

export function setTravelerToken(token: string): void {
  window.localStorage.setItem(TRAVELER_TOKEN_KEY, token);
}

/** Clear the traveler session (used on logout and on 401 responses). */
export function clearTravelerToken(): void {
  try {
    window.localStorage.removeItem(TRAVELER_TOKEN_KEY);
  } catch {
    /* storage unavailable — session is effectively cleared */
  }
}

export interface TravelerUser {
  id: string;
  email: string;
  full_name: string;
}

interface AuthEnvelope {
  user?: unknown;
  token?: unknown;
}

/** The JWT lives under exactly the "token" key of the { user, token } envelope. */
function extractToken(data: unknown): string {
  if (data && typeof data === 'object') {
    const { token } = data as AuthEnvelope;
    if (typeof token === 'string' && token.trim()) return token.trim();
  }
  throw new Error('The server did not return a session token. Please try again.');
}

/** POST /api/auth/traveler/login — authenticates and stores the traveler JWT. */
export async function travelerLogin(email: string, password: string): Promise<string> {
  const data = await apiClient.post<unknown>('/api/auth/traveler/login', { email, password });
  const token = extractToken(data);
  setTravelerToken(token);
  return token;
}

/** POST /api/auth/traveler/signup — registers, then stores the traveler JWT. */
export async function travelerSignup(fullName: string, email: string, password: string): Promise<string> {
  const data = await apiClient.post<unknown>('/api/auth/traveler/signup', {
    full_name: fullName,
    email,
    password,
  });
  const token = extractToken(data);
  setTravelerToken(token);
  return token;
}

/**
 * GET /api/auth/traveler/me — validate the stored session at app startup.
 * Returns the user on success; a 401 means the token is expired/invalid and
 * the caller should clear it (see `restoreTravelerSession`).
 */
export function getTravelerMe(): Promise<TravelerUser> {
  return apiClient.authGet<TravelerUser>('/api/auth/traveler/me');
}

/**
 * Restore the session at startup: no token → anonymous; valid token → user;
 * 401 → token cleared (session expired). Other failures leave the token in
 * place so a flaky network doesn't log the user out.
 */
export async function restoreTravelerSession(): Promise<TravelerUser | null> {
  if (!hasTravelerToken()) return null;
  try {
    return await getTravelerMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearTravelerToken();
    return null;
  }
}

/** Log out locally: drop the stored traveler JWT. */
export function travelerLogout(): void {
  clearTravelerToken();
}

/** True for expired/invalid-session responses — callers clear the token and route to /login (same as the Guide). */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
