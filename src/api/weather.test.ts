import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getTripWeather, getWeatherByCoordinates, isWeatherAvailable } from './weather';
import { ApiError } from './client';

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    apiClient: {
      authGet: vi.fn(),
      get: vi.fn(),
    },
  };
});

import { apiClient } from './client';

const mockAuthGet = vi.mocked(apiClient.authGet);
const mockGet = vi.mocked(apiClient.get);

describe('weather API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTripWeather', () => {
    it('calls the trip-specific weather endpoint with the correct trip ID', async () => {
      const mockResponse = { available: true };
      mockAuthGet.mockResolvedValue(mockResponse);

      await getTripWeather('trip-123');

      expect(mockAuthGet).toHaveBeenCalledWith('/api/trips/trip-123/weather');
    });

    it('encodes the trip ID in the URL', async () => {
      mockAuthGet.mockResolvedValue({ available: false });

      await getTripWeather('trip/123');

      expect(mockAuthGet).toHaveBeenCalledWith('/api/trips/trip%2F123/weather');
    });

    it('returns the response on success', async () => {
      const mockResponse = {
        available: true,
        location: { latitude: 32.2, longitude: 77.1 },
        current: { temperature: 20 },
      };
      mockAuthGet.mockResolvedValue(mockResponse);

      const result = await getTripWeather('trip-123');
      expect(result).toEqual(mockResponse);
    });

    it('propagates ApiError on failure', async () => {
      mockAuthGet.mockRejectedValue(new ApiError(502, 'provider unavailable'));

      await expect(getTripWeather('trip-123')).rejects.toThrow(ApiError);
    });
  });

  describe('getWeatherByCoordinates', () => {
    it('calls the coordinate-based weather endpoint', async () => {
      mockGet.mockResolvedValue({ available: true });

      await getWeatherByCoordinates(32.2396, 77.1887);

      expect(mockGet).toHaveBeenCalledWith('/api/weather?latitude=32.2396&longitude=77.1887&days=5');
    });

    it('passes custom days parameter', async () => {
      mockGet.mockResolvedValue({ available: true });

      await getWeatherByCoordinates(32.2396, 77.1887, 7);

      expect(mockGet).toHaveBeenCalledWith('/api/weather?latitude=32.2396&longitude=77.1887&days=7');
    });
  });

  describe('isWeatherAvailable', () => {
    it('returns true for available weather', () => {
      expect(isWeatherAvailable({ available: true })).toBe(true);
    });

    it('returns false for unavailable weather', () => {
      expect(isWeatherAvailable({ available: false })).toBe(false);
    });
  });
});
