import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTripDraft } from '../state/useTripDraft';
import { getTransportOptions, type TransportOption } from '../api/trips';
import { ApiError, isApiConfigured } from '../api/client';
import { clearTravelerToken } from '../api/auth';
import { formatINR } from '../utils/format';

type TransportMode = 'Flight' | 'Train' | 'Road';

const MODES: TransportMode[] = ['Flight', 'Train', 'Road'];

function modeOf(type: string): TransportMode {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'flight') return 'Flight';
  if (normalized === 'train') return 'Train';
  return 'Road';
}

function priceLabel(option: TransportOption): string {
  if (!(option.price > 0)) return 'Price on request';
  if (!option.currency || option.currency.toUpperCase() === 'INR') return formatINR(option.price);
  return `${option.currency} ${Math.round(option.price).toLocaleString('en-IN')}`;
}

function durationLabel(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '';
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes > 0 ? `${whole}h ${minutes}m` : `${whole}h`;
}

export default function TransportStep() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useTripDraft();
  const [options, setOptions] = useState<TransportOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const configured = isApiConfigured();
  const origin = draft.origin?.trim() ? draft.origin.trim() : undefined;
  const destination = draft.destination?.trim() ? draft.destination.trim() : undefined;
  const canQuery = configured && !!origin && !!destination;

  useEffect(() => {
    if (!canQuery || !origin || !destination) return;
    let cancelled = false;
    setOptions(null);
    setError(null);
    getTransportOptions(origin, destination).then(
      (list) => {
        if (!cancelled) setOptions(list);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (fetchError instanceof ApiError && fetchError.status === 401) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/transport' } });
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load transport options.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [canQuery, origin, destination, retryKey, navigate]);

  if (!draft.prompt.trim()) {
    return <Navigate to="/plan" replace />;
  }

  const select = (option: TransportOption | null) => {
    if (!option) {
      updateDraft({ transportId: undefined, transportLabel: undefined });
      return;
    }
    updateDraft({
      transportId: option.id,
      transportLabel: `${option.name} · ${priceLabel(option)}`,
    });
  };

  const capacityOk = (option: TransportOption): boolean =>
    draft.travelers === undefined || (option.capacity || 0) >= draft.travelers;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-sage">
          Step 3 of 4 · Transportation
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">How will you get there?</h2>
        <p className="mt-1 text-xs text-tourflow-textMuted">
          {origin && destination ? (
            <>
              Real verified options for <strong>{origin} → {destination}</strong>
              {typeof draft.travelers === 'number' ? ` · ${draft.travelers} traveler${draft.travelers === 1 ? '' : 's'}` : ''}.
              Pick one or skip — times shown are the standard day-1 transfer window.
            </>
          ) : (
            <>Add an origin and destination on the checklist to see verified options — or skip this step.</>
          )}
        </p>
      </div>

      {!configured ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-sm font-bold">Transport options need the WanderAI backend</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Set VITE_TOURFLOW_API_URL to load them. You can still continue without selecting.
          </p>
        </section>
      ) : !canQuery ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-sm font-bold">Route not specified yet</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Go back to the checklist and add your starting city{!destination ? ' and destination' : ''}.
          </p>
          <button
            type="button"
            onClick={() => navigate('/checklist')}
            className="mt-3 w-full rounded-full border border-tourflow-cardBorder px-4 py-2.5 text-sm font-bold"
          >
            Back to Checklist
          </button>
        </section>
      ) : options === null ? (
        <div className="flex gap-1 p-3" aria-label="Loading transport options">
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-sm font-bold text-red-700">Could not load transport options</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-3 w-full rounded-full bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Try Again
          </button>
        </section>
      ) : options.length === 0 ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-sm font-bold">No verified options for this route yet</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Nothing in the verified catalog covers {origin} → {destination} right now.
            Continue and the trip will still generate — transfers stay traveler-arranged.
          </p>
        </section>
      ) : (
        <div role="radiogroup" aria-label="Transport options" className="flex flex-col gap-4">
          {MODES.map((mode) => {
            const group = options.filter((o) => modeOf(o.type) === mode);
            return (
              <section key={mode} aria-label={`${mode} options`}>
                <h3 className="text-sm font-extrabold text-tourflow-dark">{mode}</h3>
                {group.length === 0 ? (
                  <p className="mt-1 rounded-xl bg-tourflow-surfaceMuted px-3 py-2 text-xs font-semibold text-tourflow-textMuted">
                    No verified {mode.toLowerCase()} options for this route.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {group.map((option) => {
                      const selected = draft.transportId === option.id;
                      const fits = capacityOk(option);
                      const duration = durationLabel(option.duration_hours);
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={!fits}
                            onClick={() => select(selected ? null : option)}
                            className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60 ${
                              selected
                                ? 'border-tourflow-primary bg-tourflow-primarySoft/40'
                                : 'border-tourflow-cardBorder bg-white'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? 'border-tourflow-primary' : 'border-tourflow-cardBorder'
                              }`}
                            >
                              {selected ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-tourflow-primary" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-tourflow-dark">
                                {option.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-tourflow-textMuted">
                                {option.route_from} → {option.route_to}
                                {duration ? ` · ${duration}` : ''}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-tourflow-textMuted">
                                <strong className="text-tourflow-dark">{priceLabel(option)}</strong>
                                <span>{option.capacity} seats</span>
                                {option.provider_name ? <span>· {option.provider_name}</span> : null}
                                {!fits ? (
                                  <span className="font-semibold text-red-600">
                                    · Only {option.capacity} seats
                                  </span>
                                ) : null}
                              </span>
                              {option.features && option.features.length > 0 ? (
                                <span className="mt-1 flex flex-wrap gap-1.5">
                                  {option.features.slice(0, 4).map((feature) => (
                                    <span
                                      key={feature}
                                      className="rounded-full bg-tourflow-surfaceMuted px-2 py-0.5 text-[11px] font-semibold"
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {draft.transportLabel ? (
        <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-xs font-semibold text-tourflow-sage" role="status">
          ✓ Selected: {draft.transportLabel} — it will be your day-1 transfer.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => navigate('/loading')}
        className="w-full rounded-2xl bg-tourflow-primary px-4 py-3.5 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
      >
        Generate Itinerary
      </button>
      <button
        type="button"
        onClick={() => {
          select(null);
          navigate('/loading');
        }}
        className="w-full rounded-2xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark"
      >
        Skip transportation
      </button>
    </div>
  );
}
