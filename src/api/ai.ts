/**
 * AI preference-extraction endpoint.
 *
 * POST /api/ai/extract-preferences { text } — runs the backend extract flow
 * over a (usually voice-dictated) prompt. The UI always derives chips from
 * the local deterministic parser too, so this call is best-effort: a missing
 * route or failure never blocks typing or chip rendering.
 */

import { apiClient } from './client';

export function extractPreferences(text: string): Promise<unknown> {
  return apiClient.authPost<unknown>('/api/ai/extract-preferences', { text });
}
