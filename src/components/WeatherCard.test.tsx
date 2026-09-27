import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherCard } from './WeatherCard';
import type { WeatherData } from '../types';

const mockWeather: WeatherData = {
  available: true,
  location: { latitude: 32.2396, longitude: 77.1887 },
  current: {
    temperature: 18.5,
    feels_like: 16.2,
    humidity: 45,
    precipitation: 0.0,
    wind_speed: 12.3,
    condition: 'Partly cloudy',
    severity: 'low',
  },
  forecast: [
    {
      timestamp: '2026-09-27',
      temperature: 19.0,
      feels_like: 17.0,
      precipitation: 2.1,
      wind_speed: 14.0,
      condition: 'Slight rain',
      severity: 'moderate',
    },
    {
      timestamp: '2026-09-28',
      temperature: 17.0,
      feels_like: 15.0,
      precipitation: 5.0,
      wind_speed: 18.0,
      condition: 'Rain',
      severity: 'moderate',
    },
  ],
  observed_at: '2026-09-27T10:00:00+00:00',
};

describe('WeatherCard', () => {
  describe('loading state', () => {
    it('renders loading message when weather is null', () => {
      render(<WeatherCard weather={null} />);
      expect(screen.getByText('Loading current conditions...')).toBeInTheDocument();
    });
  });

  describe('unavailable state', () => {
    it('renders unavailable message when weather is not available', () => {
      render(<WeatherCard weather={{ available: false, reason: 'provider_unavailable' }} />);
      expect(screen.getByText('Weather currently unavailable')).toBeInTheDocument();
    });
  });

  describe('available state', () => {
    it('renders the weather card', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('Weather')).toBeInTheDocument();
    });

    it('renders current temperature', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('19°C')).toBeInTheDocument();
    });

    it('renders feels-like temperature', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText(/Feels like 16°C/)).toBeInTheDocument();
    });

    it('renders humidity', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText(/Humidity 45%/)).toBeInTheDocument();
    });

    it('renders precipitation', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText(/Rain 0 mm/)).toBeInTheDocument();
    });

    it('renders wind speed', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText(/Wind 12 km\/h/)).toBeInTheDocument();
    });

    it('renders condition', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
    });

    it('renders severity', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('Low weather risk')).toBeInTheDocument();
    });

    it('renders forecast section', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });

    it('renders forecast items', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('renders observation timestamp', () => {
      render(<WeatherCard weather={mockWeather} />);
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });

  describe('severity variants', () => {
    it('renders moderate weather risk', () => {
      const w = { ...mockWeather, current: { ...mockWeather.current!, severity: 'moderate' } };
      render(<WeatherCard weather={w} />);
      expect(screen.getByText('Moderate weather risk')).toBeInTheDocument();
    });

    it('renders high weather risk', () => {
      const w = { ...mockWeather, current: { ...mockWeather.current!, severity: 'high' } };
      render(<WeatherCard weather={w} />);
      expect(screen.getByText('High weather risk')).toBeInTheDocument();
    });

    it('renders severe weather risk', () => {
      const w = { ...mockWeather, current: { ...mockWeather.current!, severity: 'severe' } };
      render(<WeatherCard weather={w} />);
      expect(screen.getByText('Severe weather risk')).toBeInTheDocument();
    });

    it('renders unavailable risk when severity is unknown', () => {
      const w = { ...mockWeather, current: { ...mockWeather.current!, severity: null } };
      render(<WeatherCard weather={w} />);
      expect(screen.getByText('Weather risk unavailable')).toBeInTheDocument();
    });
  });

  describe('missing data handling', () => {
    it('renders -- for missing temperature', () => {
      const w = { ...mockWeather, current: { ...mockWeather.current!, temperature: null } };
      render(<WeatherCard weather={w} />);
      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('renders without forecast section when forecast is empty', () => {
      const w = { ...mockWeather, forecast: [] };
      render(<WeatherCard weather={w} />);
      expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
    });
  });
});
