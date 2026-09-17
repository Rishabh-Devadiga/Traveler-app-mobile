import type { PossibleOption } from '../types';
import { apiClient, isApiConfigured } from './client';

/**
 * Possible-options layer over GET /api/possible-options (Phase 3C).
 * Returns real catalog activities for the destination (`[]` when the backend
 * knows none — never fabricated). Only called when the API is configured.
 */

interface ApiPossibleOption {
  id: string;
  title: string;
  category: string;
  location: string;
  duration: string;
  cost: number;
  description: string;
  image_url: string | null;
  tags: string[];
  walking_intensity: string;
}

function toPossibleOption(item: ApiPossibleOption): PossibleOption {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    location: item.location,
    duration: item.duration,
    cost: typeof item.cost === 'number' ? item.cost : 0,
    description: item.description,
    imageUrl: item.image_url ?? undefined,
    tags: item.tags ?? [],
    walkingIntensity: item.walking_intensity ?? 'moderate',
  };
}

/** Fetch real alternative activities for a destination. Empty array when none exist. */
export async function getPossibleOptions(destination: string, tripId?: string): Promise<PossibleOption[]> {
  if (!isApiConfigured() || !destination.trim()) return [];
  const params = new URLSearchParams({ destination: destination.trim() });
  if (tripId) params.set('trip_id', tripId);
  const items = await apiClient.get<ApiPossibleOption[]>(`/api/possible-options?${params.toString()}`);
  if (!Array.isArray(items)) return [];
  return items.map(toPossibleOption);
}
