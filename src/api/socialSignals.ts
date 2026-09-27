import type { SocialResponse, SocialData } from '../types';
import { apiClient } from './client';

/**
 * Fetch social signals for a specific trip via the backend.
 */
export function getTripSocialSignals(tripId: string): Promise<SocialResponse> {
  return apiClient.authGet<SocialResponse>(`/api/trips/${encodeURIComponent(tripId)}/social-signals`);
}

/**
 * Type guard: is the response available social data?
 */
export function isSocialAvailable(response: SocialResponse): response is SocialData {
  return response.available === true;
}
