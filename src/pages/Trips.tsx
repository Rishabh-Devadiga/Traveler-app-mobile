import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { SafeImage } from '../components/content';
import { useTripDraft } from '../state/useTripDraft';
import {
  applyServerTrip,
  fetchPersistedTrip,
  listTravelerTrips,
  seedDraftFromTrip,
  travelerTripName,
  writeActiveTripId,
  type TravelerTripSummary,
} from '../api/trips';
import { ApiError, isApiConfigured } from '../api/client';
import { clearTravelerToken, hasTravelerToken } from '../api/auth';
import { safeText } from '../api/traveler';
import { formatINR } from '../utils/format';
import { formatTripDate, tripDateRangeLabel } from '../utils/dates';

function summaryTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function datesLine(trip: TravelerTripSummary): string {
  const formatted = safeText(trip.formatted_dates).trim();
  if (formatted) return formatted;
  const start = safeText(trip.start_date).slice(0, 10);
  const end = safeText(trip.end_date).slice(0, 10);
  if (start && end) return tripDateRangeLabel(start, end);
  if (typeof trip.duration_days === 'number' && trip.duration_days > 0) {
    return `${trip.duration_days} day${trip.duration_days === 1 ? '' : 's'}`;
  }
  return '';
}

function moneyLine(trip: TravelerTripSummary): string {
  const parts: string[] = [];
  if (typeof trip.total_cost === 'number') parts.push(`Total ${formatINR(trip.total_cost)}`);
  if (typeof trip.total_budget === 'number') parts.push(`Budget ${formatINR(trip.total_budget)}`);
  return parts.join(' · ');
}

function generatedLine(trip: TravelerTripSummary): string {
  const stamp = trip.created_at ?? trip.updated_at;
  const label = formatTripDate(safeText(stamp).slice(0, 10));
  return label ? `Generated ${label}` : '';
}

export default function Trips() {
  const navigate = useNavigate();
  const { updateDraft } = useTripDraft();
  const [trips, setTrips] = useState<TravelerTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const authed = hasTravelerToken();
  const configured = isApiConfigured();

  useEffect(() => {
    if (!configured || !authed) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTravelerTrips().then(
      (list) => {
        if (cancelled) return;
        // Newest generated trips first (backend already sorts desc; re-sort
        // defensively — never trust order, never invent dates).
        setTrips(
          list.slice().sort((a, b) => summaryTime(b.updated_at) - summaryTime(a.updated_at)),
        );
        setLoading(false);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (fetchError instanceof ApiError && fetchError.status === 401) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/trips' } });
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load your trips.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, configured, retryKey]);

  if (!configured) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-tight">Trips</h2>
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-sm font-bold">Trip history needs the WanderAI backend</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Set VITE_TOURFLOW_API_URL to load your generated trips.
          </p>
        </section>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: '/trips' }} />;
  }

  const openTrip = (tripId: string) => {
    setOpeningId(tripId);
    setOpenError(null);
    // The exact persisted record by UUID — never regenerated, never created.
    fetchPersistedTrip(tripId).then(
      (trip) => {
        const seed = seedDraftFromTrip(trip);
        updateDraft({ ...seed, ...applyServerTrip(trip, seed) });
        writeActiveTripId(trip.id);
        navigate('/itinerary');
      },
      (openErr: unknown) => {
        setOpeningId(null);
        if (openErr instanceof ApiError && openErr.status === 401) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/trips' } });
          return;
        }
        setOpenError(
          openErr instanceof ApiError && openErr.status === 404
            ? 'This trip is no longer available.'
            : openErr instanceof Error
              ? openErr.message
              : 'Could not open this trip.',
        );
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Trips</h2>
        <p className="text-xs text-tourflow-textMuted">Your generated journeys, newest first.</p>
      </div>

      {openError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
          {openError}
        </p>
      ) : null}

      {loading ? (
        <div className="flex gap-1 p-3" aria-label="Loading your trips">
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-sm font-bold text-red-700">Could not load trips</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-3 w-full rounded-full bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white"
          >
            Try Again
          </button>
        </section>
      ) : trips.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-tourflow-cardBorder bg-white p-8 text-center shadow-card">
          <span aria-hidden="true" className="text-4xl">🧭</span>
          <h3 className="text-base font-extrabold">No journeys yet.</h3>
          <p className="max-w-xs text-xs text-tourflow-textMuted">
            Tell us where you want to wander, and we&apos;ll build your first itinerary.
          </p>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            className="mt-1 rounded-full bg-tourflow-primary px-6 py-3 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
          >
            Start Planning
          </button>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => {
            const name = travelerTripName(trip);
            const destination =
              (typeof trip.destination === 'string' ? trip.destination : trip.destination?.name) ??
              trip.destination_name ??
              '';
            const dates = datesLine(trip);
            const money = moneyLine(trip);
            const generated = generatedLine(trip);
            const opening = openingId === trip.id;
            return (
              <li key={trip.id}>
                <button
                  type="button"
                  disabled={openingId !== null}
                  onClick={() => openTrip(trip.id)}
                  className="block w-full overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white text-left shadow-card transition-transform hover:scale-[1.01] disabled:opacity-70"
                >
                  <div className="relative">
                    <SafeImage
                      src={trip.hero_image_url ?? undefined}
                      alt={`${name} cover photo`}
                      className="h-32 w-full object-cover"
                    />
                    {trip.status ? (
                      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">
                        {safeText(trip.status)}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-base font-extrabold">{name}</h3>
                    {safeText(destination).trim() ? (
                      <p className="mt-0.5 truncate text-xs text-tourflow-textMuted">
                        📍 {safeText(destination).trim()}
                      </p>
                    ) : null}
                    {dates ? <p className="mt-1 text-xs font-semibold">{dates}</p> : null}
                    {money ? (
                      <p className="mt-0.5 text-xs text-tourflow-textMuted">{money}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-bold text-tourflow-primary">
                      {opening ? 'Opening…' : generated || 'View itinerary →'}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
