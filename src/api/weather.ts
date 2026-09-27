import type { WeatherData, WeatherResponse } from '../types';
import { apiClient } from './client';

/**
 * Fetch live weather for a specific trip via the backend.
 *
 * Uses GET /api/trips/{trip_id}/weather which resolves the trip's
 * destination coordinates server-side and returns normalized weather.
 *
 * The backend is the single source of weather data — the frontend never
 * calls a weather provider directly.
 */
export function getTripWeather(tripId: string): Promise<WeatherResponse> {
  return apiClient.authGet<WeatherResponse>(`/api/trips/${encodeURIComponent(tripId)}/weather`);
}

/**
 * Fetch live weather for explicit coordinates via the backend.
 *
 * Uses GET /api/weather?latitude=&longitude=&days=5.
 * Used when a trip ID is not available (e.g., destination preview).
 */
export function getWeatherByCoordinates(latitude: number, longitude: number, days: number = 5): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    days: String(days),
  });
  return apiClient.get<WeatherResponse>(`/api/weather?${params.toString()}`);
}

/** Type guard: is the response available weather data? */
export function isWeatherAvailable(response: WeatherResponse): response is WeatherData {
  return response.available === true;
}
