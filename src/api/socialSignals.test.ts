import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getTripSocialSignals, isSocialAvailable } from './socialSignals';

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    apiClient: {
      authGet: vi.fn(),
      authPost: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

import { apiClient } from './client';

const mockAuthGet = vi.mocked(apiClient.authGet);

describe('socialSignals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the correct endpoint with the trip ID', async () => {
    mockAuthGet.mockResolvedValue({ available: false });

    await getTripSocialSignals('trip-123');

    expect(mockAuthGet).toHaveBeenCalledWith('/api/trips/trip-123/social-signals');
  });

  it('encodes the trip ID in the URL', async () => {
    mockAuthGet.mockResolvedValue({ available: false });

    await getTripSocialSignals('trip/123');

    expect(mockAuthGet).toHaveBeenCalledWith('/api/trips/trip%2F123/social-signals');
  });

  it('returns the response on success', async () => {
    const mockResponse = {
      available: true,
      signals: [{ title: 'Test', severity: 'medium' }],
      overall_risk: 'medium',
    };
    mockAuthGet.mockResolvedValue(mockResponse);

    const result = await getTripSocialSignals('trip-123');
    expect(result).toEqual(mockResponse);
  });

  it('propagates errors on failure', async () => {
    mockAuthGet.mockRejectedValue(new Error('Network error'));

    await expect(getTripSocialSignals('trip-123')).rejects.toThrow('Network error');
  });
});

describe('isSocialAvailable', () => {
  it('returns true for available social data', () => {
    expect(isSocialAvailable({ available: true, signals: [] })).toBe(true);
  });

  it('returns false for unavailable social data', () => {
    expect(isSocialAvailable({ available: false })).toBe(false);
  });
});
