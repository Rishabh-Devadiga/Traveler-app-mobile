import type { SocialResponse, SocialSignal, SourceType } from '../types';

function confidenceColor(confidence: string | null | undefined): string {
  switch ((confidence ?? '').toUpperCase()) {
    case 'HIGH':
      return 'text-tourflow-sage';
    case 'MEDIUM':
      return 'text-yellow-600';
    case 'LOW':
      return 'text-orange-500';
    default:
      return 'text-tourflow-textMuted';
  }
}

function sourceTypeIcon(sourceType: SourceType | null | undefined): string {
  switch (sourceType) {
    case 'OFFICIAL':
      return '🏛';
    case 'NEWS':
      return '📰';
    case 'SOCIAL':
      return '💬';
    default:
      return '📡';
  }
}

function sourceTypeLabel(sourceType: SourceType | null | undefined): string {
  switch (sourceType) {
    case 'OFFICIAL':
      return 'Official';
    case 'NEWS':
      return 'News';
    case 'SOCIAL':
      return 'Public report';
    default:
      return 'Unknown';
  }
}

function signalTypeLabel(signalType: string | null | undefined): string {
  switch (signalType) {
    case 'TRAVELER_REPORT':
      return 'Traveler';
    case 'WEATHER_REPORT':
      return 'Weather';
    case 'TRANSPORT_REPORT':
      return 'Transport';
    case 'ROAD_CONDITION':
      return 'Road';
    case 'FLIGHT_DISRUPTION':
      return 'Flight';
    case 'TREND':
      return 'Trend';
    case 'EMERGING_CONDITION':
      return 'Emerging';
    default:
      return 'Signal';
  }
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diffMs = now - d.getTime();
    if (diffMs < 0) return 'just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function SignalItem({ signal }: { signal: SocialSignal }) {
  return (
    <li className="rounded-xl bg-tourflow-surfaceMuted px-3 py-2">
      <div className="flex items-start gap-2">
        <span className="text-[14px] mt-0.5">{sourceTypeIcon(signal.source_type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-tourflow-dark truncate">
              {signal.title ?? 'Signal'}
            </p>
            <span className={`text-[10px] font-bold uppercase shrink-0 ${confidenceColor(signal.confidence)}`}>
              {signal.confidence ?? 'UNKNOWN'}
            </span>
          </div>
          {signal.summary && (
            <p className="text-[11px] text-tourflow-textMuted mt-0.5 line-clamp-2">{signal.summary}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-tourflow-textMuted">
              {sourceTypeLabel(signal.source_type)}
            </span>
            {signal.source && (
              <span className="text-[10px] text-tourflow-textMuted">{signal.source}</span>
            )}
            {signal.signal_type && (
              <span className="text-[10px] text-tourflow-textMuted">
                {signalTypeLabel(signal.signal_type)}
              </span>
            )}
            {signal.published_at && (
              <span className="text-[10px] text-tourflow-textMuted">
                {formatRelativeTime(signal.published_at)}
              </span>
            )}
          </div>
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-tourflow-accent mt-1 inline-block underline"
            >
              View source
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

interface SocialSignalsCardProps {
  social: SocialResponse | null;
  loading?: boolean;
  onRetry?: () => void;
}

export function SocialSignalsCard({ social, loading, onRetry }: SocialSignalsCardProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Social Signals</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">Loading social signals...</p>
      </section>
    );
  }

  if (!social) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Social Signals</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">Loading social signals...</p>
      </section>
    );
  }

  if (!social.available) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Social Signals</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">Unable to load social signals.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-[12px] font-semibold text-tourflow-accent underline"
          >
            Retry
          </button>
        )}
      </section>
    );
  }

  const { signals, status, sources, generated_at } = social;

  if (signals.length === 0) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Social Signals</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">No relevant social signals found for this trip.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[15px] font-bold text-tourflow-dark">Social Signals</p>
        {status === 'partial' && (
          <span className="text-[10px] font-bold uppercase text-yellow-600">
            Partial
          </span>
        )}
      </div>

      {status === 'partial' && (
        <p className="text-[11px] text-tourflow-textMuted mb-2">
          Some sources unavailable. Showing available signals.
        </p>
      )}

      <ul className="space-y-2">
        {signals.slice(0, 5).map((signal, i) => (
          <SignalItem key={i} signal={signal} />
        ))}
      </ul>

      <div className="flex items-center gap-2 mt-2">
        {sources && sources.length > 0 && (
          <p className="text-[10px] text-tourflow-textMuted">
            Sources: {sources.join(', ')}
          </p>
        )}
        {generated_at && (
          <p className="text-[10px] text-tourflow-textMuted">
            Updated {formatRelativeTime(generated_at)}
          </p>
        )}
      </div>
    </section>
  );
}
