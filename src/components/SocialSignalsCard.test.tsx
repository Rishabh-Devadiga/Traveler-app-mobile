import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SocialSignalsCard } from './SocialSignalsCard';

const mockSignal = {
  title: 'Heavy rain in Goa',
  summary: 'Heavy rain causing flooding near Goa airport',
  source: 'GDELT',
  source_type: 'NEWS' as const,
  source_url: 'https://example.com/article/1',
  published_at: '2026-09-27T12:00:00+00:00',
  location: 'Goa',
  signal_type: 'WEATHER_REPORT' as const,
  weather_relation: 'DIRECT' as const,
  confidence: 'MEDIUM' as const,
  relevance_score: 0.85,
  category: null,
  severity: null,
  observed_at: null,
  relevance: null,
};

const mockSocial = {
  available: true,
  signals: [mockSignal],
  overall_risk: 'medium',
  observed_at: '2026-09-27T12:00:00+00:00',
  sources: ['GDELT'],
  generated_at: '2026-09-27T12:00:01+00:00',
  status: 'success',
  total: 1,
};

describe('SocialSignalsCard', () => {
  describe('loading state', () => {
    it('renders loading message when loading is true', () => {
      render(<SocialSignalsCard social={null} loading={true} />);
      expect(screen.getByText('Loading social signals...')).toBeInTheDocument();
    });

    it('renders loading message when social is null', () => {
      render(<SocialSignalsCard social={null} loading={false} />);
      expect(screen.getByText('Loading social signals...')).toBeInTheDocument();
    });
  });

  describe('unavailable state', () => {
    it('renders unavailable message when social is not available', () => {
      render(<SocialSignalsCard social={{ available: false, reason: 'provider_unavailable' }} />);
      expect(screen.getByText('Unable to load social signals.')).toBeInTheDocument();
    });

    it('renders retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(<SocialSignalsCard social={{ available: false, reason: 'provider_unavailable' }} onRetry={onRetry} />);
      const retryBtn = screen.getByText('Retry');
      expect(retryBtn).toBeInTheDocument();
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<SocialSignalsCard social={{ available: false, reason: 'provider_unavailable' }} />);
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  describe('empty signals', () => {
    it('renders no signals message when signals array is empty', () => {
      render(<SocialSignalsCard social={{ available: true, signals: [], sources: [], status: 'success' }} />);
      expect(screen.getByText('No relevant social signals found for this trip.')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('renders the social signals card', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('Social Signals')).toBeInTheDocument();
    });

    it('renders signal title', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('Heavy rain in Goa')).toBeInTheDocument();
    });

    it('renders signal summary', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('Heavy rain causing flooding near Goa airport')).toBeInTheDocument();
    });

    it('renders source type label', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('News')).toBeInTheDocument();
    });

    it('renders source name', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('GDELT')).toBeInTheDocument();
    });

    it('renders signal type', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('Weather')).toBeInTheDocument();
    });

    it('renders confidence', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders relative time', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getAllByText(/ago|just now/).length).toBeGreaterThan(0);
    });

    it('renders source link when source_url exists', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      const link = screen.getByText('View source');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/article/1');
    });

    it('renders sources list', () => {
      render(<SocialSignalsCard social={mockSocial} />);
      expect(screen.getByText(/Sources: GDELT/)).toBeInTheDocument();
    });
  });

  describe('partial state', () => {
    it('renders partial indicator when status is partial', () => {
      const partialSocial = { ...mockSocial, status: 'partial' as const, sources: ['GDELT'] };
      render(<SocialSignalsCard social={partialSocial} />);
      expect(screen.getByText('Partial')).toBeInTheDocument();
    });

    it('renders partial message when status is partial', () => {
      const partialSocial = { ...mockSocial, status: 'partial' as const, sources: ['GDELT'] };
      render(<SocialSignalsCard social={partialSocial} />);
      expect(screen.getByText(/Some sources unavailable/)).toBeInTheDocument();
    });
  });

  describe('social source type', () => {
    it('renders public report label for SOCIAL source type', () => {
      const socialSignal = { ...mockSignal, source_type: 'SOCIAL' as const, source: 'Bluesky', confidence: 'LOW' as const };
      const socialResponse = { ...mockSocial, signals: [socialSignal], sources: ['Bluesky'] };
      render(<SocialSignalsCard social={socialResponse} />);
      expect(screen.getByText('Public report')).toBeInTheDocument();
    });

    it('renders LOW confidence for social signals', () => {
      const socialSignal = { ...mockSignal, source_type: 'SOCIAL' as const, source: 'Bluesky', confidence: 'LOW' as const };
      const socialResponse = { ...mockSocial, signals: [socialSignal], sources: ['Bluesky'] };
      render(<SocialSignalsCard social={socialResponse} />);
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });
  });

  describe('official source type', () => {
    it('renders Official label for OFFICIAL source type', () => {
      const officialSignal = { ...mockSignal, source_type: 'OFFICIAL' as const, source: 'IMD' };
      const officialResponse = { ...mockSocial, signals: [officialSignal], sources: ['IMD'] };
      render(<SocialSignalsCard social={officialResponse} />);
      expect(screen.getByText('Official')).toBeInTheDocument();
    });
  });

  describe('missing optional fields', () => {
    it('handles signal with missing optional fields', () => {
      const minimalSignal = {
        title: 'Test signal',
        source: 'Test',
      };
      const minimalSocial = {
        available: true,
        signals: [minimalSignal],
        sources: ['Test'],
        status: 'success' as const,
      };
      render(<SocialSignalsCard social={minimalSocial} />);
      expect(screen.getByText('Test signal')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('handles signal with null source_url', () => {
      const noUrlSignal = { ...mockSignal, source_url: null };
      const noUrlSocial = { ...mockSocial, signals: [noUrlSignal] };
      render(<SocialSignalsCard social={noUrlSocial} />);
      expect(screen.queryByText('View source')).not.toBeInTheDocument();
    });

    it('handles signal with null published_at', () => {
      const noTimeSignal = { ...mockSignal, published_at: null };
      const noTimeSocial = { ...mockSocial, signals: [noTimeSignal] };
      render(<SocialSignalsCard social={noTimeSocial} />);
      expect(screen.getByText('Heavy rain in Goa')).toBeInTheDocument();
    });
  });
});
