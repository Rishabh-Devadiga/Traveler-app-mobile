import { describe, expect, it, vi, beforeEach } from 'vitest';
import { simulateTrip } from './trips';

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

const mockAuthPost = vi.mocked(apiClient.authPost);

describe('simulateTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the simulate endpoint with the correct trip ID', async () => {
    const mockResponse = {
      trip_id: 'trip-123',
      weather_context: { available: true },
      affected_items: [],
      dependencies: [],
      conflicts: [],
      replanning_required: false,
      simulation_timestamp: '2026-09-27T10:00:00+00:00',
    };
    mockAuthPost.mockResolvedValue(mockResponse);

    await simulateTrip('trip-123');

    expect(mockAuthPost).toHaveBeenCalledWith(
      '/api/trips/trip-123/simulate',
      {},
    );
  });

  it('sends scenario override when provided', async () => {
    const mockResponse = {
      trip_id: 'trip-123',
      weather_context: { available: true },
      scenario: 'severe',
      affected_items: [],
      dependencies: [],
      conflicts: [],
      replanning_required: true,
      simulation_timestamp: '2026-09-27T10:00:00+00:00',
    };
    mockAuthPost.mockResolvedValue(mockResponse);

    await simulateTrip('trip-123', 'severe');

    expect(mockAuthPost).toHaveBeenCalledWith(
      '/api/trips/trip-123/simulate',
      { scenario: 'severe' },
    );
  });

  it('encodes the trip ID in the URL', async () => {
    mockAuthPost.mockResolvedValue({
      trip_id: 'trip/123',
      weather_context: {},
      affected_items: [],
      dependencies: [],
      conflicts: [],
      replanning_required: false,
      simulation_timestamp: '2026-09-27T10:00:00+00:00',
    });

    await simulateTrip('trip/123');

    expect(mockAuthPost).toHaveBeenCalledWith(
      '/api/trips/trip%2F123/simulate',
      {},
    );
  });

  it('returns the full simulation response', async () => {
    const mockResponse = {
      trip_id: 'trip-123',
      weather_context: { available: true, current: { severity: 'high' } },
      scenario: 'heavy_rain',
      affected_items: [
        {
          item_id: 'item-1',
          day_number: 1,
          order_index: 1,
          item_type: 'transport',
          title: 'Airport Transfer',
          reason: 'Heavy rain may delay transport',
          severity: 'high',
          estimated_delay_minutes: 45,
        },
      ],
      dependencies: [
        {
          source_item_id: 'item-1',
          source_title: 'Airport Transfer',
          target_item_id: 'item-2',
          target_title: 'Hotel Check-in',
          dependency_type: 'cascading_delay',
          description: 'Transport delay may cause late hotel arrival',
        },
      ],
      conflicts: [],
      replanning_required: true,
      simulation_timestamp: '2026-09-27T10:00:00+00:00',
    };
    mockAuthPost.mockResolvedValue(mockResponse);

    const result = await simulateTrip('trip-123', 'heavy_rain');
    expect(result).toEqual(mockResponse);
    expect(result.affected_items).toHaveLength(1);
    expect(result.replanning_required).toBe(true);
  });

  it('propagates errors on failure', async () => {
    mockAuthPost.mockRejectedValue(new Error('Network error'));

    await expect(simulateTrip('trip-123')).rejects.toThrow('Network error');
  });
});
