import type { WeatherResponse } from '../types';
import {
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  DropletIcon,
  EyeIcon,
  SunIcon,
  ThermometerIcon,
  WindIcon,
} from './icons';

function conditionIcon(condition: string | null | undefined) {
  const c = (condition ?? '').toLowerCase();
  if (c.includes('thunder') || c.includes('lightning')) return CloudLightningIcon;
  if (c.includes('snow') || c.includes('blizzard') || c.includes('ice')) return CloudSnowIcon;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return CloudRainIcon;
  if (c.includes('cloud') || c.includes('overcast')) return CloudIcon;
  return SunIcon;
}

function severityLabel(severity: string | null | undefined): string {
  switch ((severity ?? '').toLowerCase()) {
    case 'low':
      return 'Low weather risk';
    case 'moderate':
      return 'Moderate weather risk';
    case 'high':
      return 'High weather risk';
    case 'severe':
      return 'Severe weather risk';
    default:
      return 'Weather risk unavailable';
  }
}

function severityColor(severity: string | null | undefined): string {
  switch ((severity ?? '').toLowerCase()) {
    case 'low':
      return 'text-tourflow-sage';
    case 'moderate':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'severe':
      return 'text-red-600';
    default:
      return 'text-tourflow-textMuted';
  }
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDayLabel(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, today)) return 'Today';
    if (sameDay(d, tomorrow)) return 'Tomorrow';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return timestamp;
  }
}

export function WeatherCard({ weather }: { weather: WeatherResponse | null }) {
  if (!weather) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Weather</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">Loading current conditions...</p>
      </section>
    );
  }

  if (!weather.available) {
    return (
      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
        <p className="text-[15px] font-bold text-tourflow-dark">Weather</p>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">Weather currently unavailable</p>
      </section>
    );
  }

  const { current, forecast, observed_at } = weather;
  const ConditionIcon = conditionIcon(current?.condition);

  return (
    <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-tourflow-dark">Weather</p>
        <div className="flex items-center gap-1.5 text-tourflow-textMuted">
          <ConditionIcon size={20} />
          <span className="text-[13px] font-medium">{current?.condition ?? 'Unknown'}</span>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[32px] font-bold leading-none text-tourflow-dark">
            {current?.temperature != null ? `${Math.round(current.temperature)}°C` : '--'}
          </p>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">
            Feels like {current?.feels_like != null ? `${Math.round(current.feels_like)}°C` : '--'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <DropletIcon size={16} className="text-tourflow-textMuted" />
          <span className="text-[12px] text-tourflow-textMuted">
            Humidity {current?.humidity != null ? `${Math.round(current.humidity)}%` : '--'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CloudRainIcon size={16} className="text-tourflow-textMuted" />
          <span className="text-[12px] text-tourflow-textMuted">
            Rain {current?.precipitation != null ? `${current.precipitation} mm` : '--'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <WindIcon size={16} className="text-tourflow-textMuted" />
          <span className="text-[12px] text-tourflow-textMuted">
            Wind {current?.wind_speed != null ? `${Math.round(current.wind_speed)} km/h` : '--'}
          </span>
        </div>
      </div>

      <p className={`mt-3 text-[13px] font-semibold ${severityColor(current?.severity)}`}>
        {severityLabel(current?.severity)}
      </p>

      {forecast && forecast.length > 0 && (
        <div className="mt-3 border-t border-tourflow-cardBorder pt-3">
          <p className="text-[13px] font-semibold text-tourflow-dark">Upcoming</p>
          <ul className="mt-2 space-y-1.5">
            {forecast.slice(0, 5).map((item, i) => {
              const Icon = conditionIcon(item.condition);
              return (
                <li key={`${item.timestamp}-${i}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-tourflow-textMuted" />
                    <span className="text-[12px] text-tourflow-dark">{formatDayLabel(item.timestamp)}</span>
                  </div>
                  <span className="text-[12px] text-tourflow-textMuted">
                    {item.temperature != null ? `${Math.round(item.temperature)}°C` : '--'}
                    {item.condition ? ` · ${item.condition}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {observed_at && (
        <p className="mt-2 text-[11px] text-tourflow-textMuted">Updated {formatTime(observed_at)}</p>
      )}
    </section>
  );
}
