import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { SafeImage } from '../components/content';
import { useTripDraft } from '../state/useTripDraft';
import {
  applyServerTrip,
  deleteTrip,
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'planning' | 'confirmed'>('all');

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

  const visibleTrips = trips.filter((trip) => {
    if (statusFilter !== 'all' && safeText(trip.status).toLowerCase() !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = travelerTripName(trip).toLowerCase();
    const dest = (typeof trip.destination === 'string' ? trip.destination : trip.destination?.name ?? trip.destination_name ?? '').toLowerCase();
    return name.includes(q) || dest.includes(q);
  });

  const openTrip = (tripId: string) => {
    if (openingId !== null || deletingId !== null) return;
    setOpeningId(tripId);
    setOpenError(null);    // The exact persisted record by UUID — never regenerated, never created.
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

  const handleDelete = (tripId: string) => {
    if (deletingId !== null || openingId !== null) return;
    // Two-tap inline confirm: first tap arms, second tap deletes.
    if (confirmDeleteId !== tripId) {
      setConfirmDeleteId(tripId);
      setOpenError(null);
      window.setTimeout(() => {
        setConfirmDeleteId((armed) => (armed === tripId ? null : armed));
      }, 5000);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(tripId);
    setOpenError(null);
    deleteTrip(tripId).then(
      () => {
        setDeletingId(null);
        setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      },
      (deleteErr: unknown) => {
        setDeletingId(null);
        // Already gone server-side counts as deleted — drop the card anyway.
        if (deleteErr instanceof ApiError && deleteErr.status === 404) {
          setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
          return;
        }
        if (deleteErr instanceof ApiError && deleteErr.status === 401) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/trips' } });
          return;
        }
        setOpenError(deleteErr instanceof Error ? deleteErr.message : 'Could not delete this trip.');
      },
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight">Your trips</h2>
        <p className="mt-1 text-[13px] text-tourflow-textMuted">
          Your generated journeys{trips.length > 0 ? ` · ${trips.length}` : ''}, newest first.
        </p>
      </div>

      <label className="flex min-h-[48px] items-center gap-2 rounded-full border border-tourflow-cardBorder bg-white px-4 shadow-soft">
        <span className="sr-only">Search trips</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trips" className="w-full bg-transparent text-[16px] outline-none placeholder:text-tourflow-textMuted" />
      </label>
      <div className="flex gap-2" role="tablist" aria-label="Trip status filter">
        {(['all', 'planning', 'confirmed'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={statusFilter === s} onClick={() => setStatusFilter(s)} className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-bold ${statusFilter === s ? 'border-tourflow-primary bg-tourflow-primary text-white' : 'border-tourflow-cardBorder bg-white text-tourflow-dark'}`}>
            {s === 'all' ? 'All' : s === 'planning' ? 'Planning' : 'Confirmed'}
          </button>
        ))}
      </div>

      {openError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700" role="alert">
          {openError}
        </p>
      ) : null}

      {!configured ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-[15px] font-bold">Backend not configured</p>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">
            Sign-in needs the WanderAI server. Set VITE_TOURFLOW_API_URL to load your trips.
          </p>
        </section>
      ) : !authed ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-6 text-center shadow-card">
          <h3 className="text-[17px] font-extrabold">Your trips live here</h3>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">Sign in to see journeys you generate.</p>
          <button
            type="button"
            onClick={() => navigate('/login', { state: { from: '/trips' } })}
            className="mt-3 min-h-[48px] rounded-full bg-tourflow-primary px-6 py-2.5 text-[14px] font-bold text-white"
          >
            Sign In
          </button>
        </section>
      ) : loading ? (
        <div className="flex flex-col gap-2" aria-label="Loading your trips">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton-shimmer h-[120px] rounded-3xl border border-tourflow-cardBorder" aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-[15px] font-bold text-red-700">Could not load trips</p>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-3 min-h-[44px] w-full rounded-full bg-tourflow-primary px-4 py-2.5 text-[14px] font-bold text-white"
          >
            Try Again
          </button>
        </section>
      ) : trips.length === 0 ? (
        <section className="flex flex-col items-center gap-2 rounded-3xl border border-tourflow-cardBorder bg-white p-8 text-center shadow-card">
          <h3 className="text-[17px] font-extrabold">No trips yet</h3>
          <p className="max-w-xs text-[13px] text-tourflow-textMuted">
            Tell us where you want to wander, and we&apos;ll build your first itinerary.
          </p>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            className="mt-2 min-h-[48px] rounded-full bg-tourflow-primary px-6 py-2.5 text-[14px] font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
          >
            Plan your first trip
          </button>
        </section>
      ) : visibleTrips.length === 0 && (query.trim() || statusFilter !== 'all') ? (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-6 text-center shadow-card">
          <h3 className="text-[15px] font-extrabold">No matching trips</h3>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">Try a different search or filter.</p>
          <button type="button" onClick={() => { setQuery(''); setStatusFilter('all'); }} className="mt-3 min-h-[44px] rounded-full border border-tourflow-cardBorder px-6 py-2 text-[14px] font-bold">
            Clear filters
          </button>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleTrips.map((trip) => {
            const name = travelerTripName(trip);
            const destination =
              (typeof trip.destination === 'string' ? trip.destination : trip.destination?.name) ??
              trip.destination_name ??
              '';
            const dates = datesLine(trip);
            const money = moneyLine(trip);
            const generated = generatedLine(trip);
            const opening = openingId === trip.id;
            const armed = confirmDeleteId === trip.id;
            const deleting = deletingId === trip.id;
            const busy = openingId !== null || deletingId !== null;
            return (
              <li key={trip.id} className="relative">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openTrip(trip.id)}
                  className="block w-full overflow-hidden rounded-3xl border border-tourflow-cardBorder bg-white text-left shadow-card transition-transform active:scale-[0.99] disabled:opacity-70"
                >
                  <div className="relative">
                    <SafeImage
                      src={trip.hero_image_url ?? undefined}
                      alt={`${name} cover photo`}
                      className="aspect-[16/9] w-full object-cover"
                    />
                    {trip.status ? (
                      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">
                        {safeText(trip.status)}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="clamp-2 text-[16px] font-extrabold">{name}</h3>
                    {safeText(destination).trim() ? (
                      <p className="mt-0.5 truncate text-[13px] text-tourflow-textMuted">
                        {safeText(destination).trim()}
                      </p>
                    ) : null}
                    {dates ? <p className="mt-1 text-[13px] font-semibold">{dates}</p> : null}
                    {money ? (
                      <p className="mt-0.5 text-[13px] text-tourflow-textMuted">{money}</p>
                    ) : null}
                    <p className="mt-2 text-[13px] font-bold text-tourflow-primary">
                      {opening ? 'Opening…' : generated || 'View itinerary →'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(trip.id)}
                  aria-label={armed ? `Confirm delete ${name}` : `Delete ${name}`}
                  className={`absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 py-1 text-[13px] font-bold shadow backdrop-blur-sm transition-colors disabled:opacity-60 ${
                    armed
                      ? 'bg-red-600 text-white'
                      : deleting
                        ? 'bg-black/55 text-white'
                        : 'bg-black/55 text-white hover:bg-red-600'
                  }`}
                >
                  {deleting ? 'Deleting…' : armed ? 'Confirm?' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
