import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockGetTripMap, mockGetTripSocialSignals } = vi.hoisted(() => ({
  mockGetTripMap: vi.fn(),
  mockGetTripSocialSignals: vi.fn(),
}));

vi.mock('../api/trips', () => ({
  getTripMap: mockGetTripMap,
  normalizeTripMap: vi.fn((raw) => raw),
  fallbackMapFromDays: vi.fn(() => ({ pins: [], center: null, unmapped: [], unmappedCount: 0 })),
}));

vi.mock('../api/socialSignals', () => ({
  getTripSocialSignals: mockGetTripSocialSignals,
}));

import TripMap from './TripMap';

const mockMapData = {
  pins: [
    {
      id: '1',
      day: 1,
      order: 1,
      title: 'Hotel Check-in',
      time: '14:00',
      location: 'Manali',
      latitude: 32.2396,
      longitude: 77.1887,
      itemType: 'hotel',
    },
  ],
  center: { latitude: 32.2396, longitude: 77.1887 },
  unmapped: [],
  unmappedCount: 0,
};

const mockSocialData = {
  available: true,
  signals: [
    {
      title: 'Heavy rain in Manali',
      summary: 'Heavy rain causing flooding',
      source: 'Google News',
      source_type: 'NEWS',
      source_url: 'https://example.com/1',
      published_at: '2026-09-27T12:00:00+00:00',
      location: 'Manali',
      latitude: 32.24,
      longitude: 77.19,
      signal_type: 'WEATHER_REPORT',
      weather_relation: 'DIRECT',
      confidence: 'MEDIUM',
      relevance_score: 0.85,
    },
  ],
  sources: ['RSS'],
  status: 'success',
  total: 1,
};

describe('TripMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTripMap.mockResolvedValue(mockMapData);
  });

  it('renders loading state initially', () => {
    mockGetTripMap.mockReturnValue(new Promise(() => {}));
    mockGetTripSocialSignals.mockReturnValue(new Promise(() => {}));
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    expect(screen.getByText(/Loading map/)).toBeInTheDocument();
  });

  it('renders map with trip pins after loading', async () => {
    mockGetTripSocialSignals.mockResolvedValue({ available: false, reason: 'unavailable' });
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/Trip Map/)).toBeInTheDocument();
    });
  });

  it('fetches social signals on mount', async () => {
    mockGetTripSocialSignals.mockResolvedValue(mockSocialData);
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(mockGetTripSocialSignals).toHaveBeenCalledWith('test-trip');
    });
  });

  it('renders social signal legend entries', async () => {
    mockGetTripSocialSignals.mockResolvedValue(mockSocialData);
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText('News')).toBeInTheDocument();
      expect(screen.getByText('Social')).toBeInTheDocument();
      expect(screen.getByText('Official')).toBeInTheDocument();
    });
  });

  it('handles social signals unavailable gracefully', async () => {
    mockGetTripSocialSignals.mockResolvedValue({ available: false, reason: 'provider_unavailable' });
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/Trip Map/)).toBeInTheDocument();
    });
  });

  it('handles social signals fetch error gracefully', async () => {
    mockGetTripSocialSignals.mockRejectedValue(new Error('Network error'));
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/Trip Map/)).toBeInTheDocument();
    });
  });

  it('renders day filter tabs', async () => {
    mockGetTripSocialSignals.mockResolvedValue({ available: false, reason: 'unavailable' });
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText('Day 1')).toBeInTheDocument();
      expect(screen.getByText('Day 2')).toBeInTheDocument();
      expect(screen.getByText('Day 3')).toBeInTheDocument();
    });
  });

  it('shows unmapped stops notice when applicable', async () => {
    const dataWithUnmapped = {
      ...mockMapData,
      pins: [],
      unmapped: [{ day: 1, title: 'Custom Stop' }],
      unmappedCount: 1,
    };
    mockGetTripMap.mockResolvedValue(dataWithUnmapped);
    mockGetTripSocialSignals.mockResolvedValue({ available: false, reason: 'unavailable' });
    render(<TripMap tripId="test-trip" dayCount={3} activeDay={1} fallbackDays={[]} />);
    await waitFor(() => {
      expect(screen.getByText(/no location/)).toBeInTheDocument();
    });
  });
});
