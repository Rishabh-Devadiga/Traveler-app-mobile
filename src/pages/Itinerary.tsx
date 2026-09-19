import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OptionCard, SafeImage, StayCard, TimelineStopCard } from '../components/content';
import { FilterPills } from '../components/home';
import { copilotSuggestions } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import {
  addActivity,
  applyServerTrip,
  asApiTrip,
  changeAccommodation,
  changeDayAccommodation,
  clearActiveTripId,
  clearTravelerToken,
  confirmTrip,
  deleteActivity,
  getPossibleOptions,
  getTrip,
  isTripConfirmedStatus,
  isTripMarkedConfirmed,
  isUnauthorized,
  markTripConfirmed,
  optimizeTrip,
  readActiveTripId,
  swapActivity,
  toStayOption,
  updateTripDates,
  type ApiTripWithItinerary,
} from '../api';
import { ApiError, isApiConfigured } from '../api/client';
import type { ItineraryStop, PossibleOption, TripDraft } from '../types';
import { formatINR } from '../utils/format';
import { diffNights, parseISODate, tripDateRangeLabel } from '../utils/dates';
import { buildTripPdfInput, exportTripToPDF } from '../utils/pdfExport';

type Sheet =
  | { kind: 'dates' }
  | { kind: 'stay'; stopId: string; dayNumber: number }
  | { kind: 'swap'; stop: ItineraryStop }
  | { kind: 'add' }
  | { kind: 'remove'; stop: ItineraryStop }
  | null;

/** Bottom-sheet shell shared by the itinerary mutation sheets. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function stopKind(stop: ItineraryStop): string {
  return stop.tags[0] ?? '';
}

export default function Itinerary() {
  const navigate = useNavigate();
  const { draft, updateDraft, isItineraryStale } = useTripDraft();
  const [activeDay, setActiveDay] = useState(1);
  const [optionFilter, setOptionFilter] = useState('all');
  const [options, setOptions] = useState<PossibleOption[] | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Refresh survival: the in-memory draft is gone after reload, but the
  // backend trip id persists — reload the trip (including its confirmed
  // status) instead of bouncing to /plan.
  const [storedTripId] = useState<string | null>(() => readActiveTripId());
  const [restoring, setRestoring] = useState(
    () => !draft.prompt.trim() && draft.itinerary === null && readActiveTripId() !== null && isApiConfigured(),
  );
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreKey, setRestoreKey] = useState(0);

  useEffect(() => {
    if (!restoring || !storedTripId) return;
    let cancelled = false;
    setRestoreError(null);
    getTrip(storedTripId).then(
      (trip) => {
        if (cancelled) return;
        const seed: TripDraft = {
          prompt: trip.title?.trim() || `Trip to ${trip.destination?.name ?? 'your destination'}`,
          destination: trip.destination?.name ?? undefined,
          durationDays: trip.duration_days,
          travelers: trip.traveler_count,
          startDate: trip.start_date?.slice(0, 10) || undefined,
          endDate: trip.end_date?.slice(0, 10) || undefined,
          budgetAmount: trip.total_budget,
          itinerary: null,
        };
        updateDraft({ ...seed, ...applyServerTrip(trip, seed) });
        setRestoring(false);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/itinerary' } });
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          clearActiveTripId();
          setRestoring(false); // trip is gone — fall through to /plan
          return;
        }
        setRestoreError(error instanceof Error ? error.message : 'Could not reload your trip. Please try again.');
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring, storedTripId, restoreKey]);

  const isLive = draft.itinerarySource === 'api';
  const apiTrip = asApiTrip(draft.apiTrip);
  const tripId = draft.tripId;
  // Traveler-visible confirmed state: backend status (case-tolerant) OR the
  // local per-trip flag written on any successful confirm call.
  const isConfirmed =
    (apiTrip ? isTripConfirmedStatus(apiTrip.status) : false) || (tripId ? isTripMarkedConfirmed(tripId) : false);

  // Day tabs come from the authoritative trip duration (backend guarantees
  // items span every day 1..duration, leisure placeholders where free), not
  // from distinct item days. Mock trips fall back to their generated days.
  const liveDayCount = isLive && apiTrip ? apiTrip.duration_days : (draft.itinerary?.length ?? 0);
  const dayNumbers = Array.from({ length: Math.max(liveDayCount, 1) }, (_, i) => i + 1);
  const stopsByDay = useMemo(() => {
    const map = new Map<number, NonNullable<typeof draft.itinerary>[number]['stops']>();
    for (const d of draft.itinerary ?? []) map.set(d.day, d.stops);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.itinerary]);

  useEffect(() => {
    if (activeDay > dayNumbers.length) setActiveDay(1);
  }, [activeDay, dayNumbers.length]);

  useEffect(() => {
    if (!isLive || !apiTrip || !draft.destination) return;
    let cancelled = false;
    setOptions(null);
    setOptionFilter('all');
    getPossibleOptions(draft.destination, draft.tripId)
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, draft.tripId]);

  const stay = useMemo(
    () => (apiTrip?.selected_accommodation ? toStayOption(apiTrip.selected_accommodation) : null),
    [apiTrip],
  );
  const stayAlternatives = useMemo(
    () => (apiTrip?.accommodation_alternatives ?? []).map(toStayOption),
    [apiTrip],
  );
  const optionCategories = useMemo(() => {
    const unique = [...new Set((options ?? []).map((o) => o.category))].sort();
    return [{ id: 'all', label: 'All', icon: '' }, ...unique.map((c) => ({ id: c, label: c, icon: '' }))];
  }, [options]);
  const visibleOptions = useMemo(
    () => (options ?? []).filter((o) => optionFilter === 'all' || o.category === optionFilter),
    [options, optionFilter],
  );

  if (restoring && !draft.prompt.trim()) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 p-1" aria-label="Reloading your trip">
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
        </div>
        <p className="text-xs text-tourflow-textMuted">Reloading your trip…</p>
        {restoreError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-red-700">Couldn’t reload your trip</p>
            <p className="mt-1 text-xs text-tourflow-textMuted">{restoreError}</p>
            <button
              type="button"
              onClick={() => setRestoreKey((k) => k + 1)}
              className="mt-3 w-full rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : null}
      </div>
    );
  }
  if (!draft.prompt.trim()) {
    return <Navigate to="/plan" replace />;
  }
  if (draft.itinerary === null || isItineraryStale) {
    return <Navigate to="/loading" replace />;
  }

  const days = draft.itinerary;
  const dayNumber = Math.min(activeDay, dayNumbers.length);
  const dayStops = stopsByDay.get(dayNumber) ?? [];
  const dayTitle = days.find((d) => d.day === dayNumber)?.title;
  // The backend has no day titles — the mapper emits `Day N`, so dedupe the
  // prefix instead of rendering "Day 1: Day 1".
  const dayHeading = dayTitle && dayTitle !== `Day ${dayNumber}` ? `Day ${dayNumber}: ${dayTitle}` : `Day ${dayNumber}`;
  // Stale-data guard only: new trips always satisfy this by backend guarantee.
  const emptyDays = isLive ? dayNumbers.filter((n) => (stopsByDay.get(n) ?? []).length === 0) : [];
  // Header + hero always name the trip's real destination.
  const destinationLabel = apiTrip?.destination?.name ?? draft.destination ?? 'Your destination';
  const travelersLabel = draft.travelerLabel ?? (draft.travelers ? `${draft.travelers} travelers` : 'Group');
  const totalStops = days.reduce((sum, d) => sum + d.stopsCount, 0);
  const perDayMock = draft.budgetAmount ? formatINR(draft.budgetAmount / days.length) : '—';
  const perDayLive =
    isLive && draft.totalCost !== undefined ? formatINR(draft.totalCost / liveDayCount) : perDayMock;
  const dateRange =
    draft.startDate && draft.endDate ? tripDateRangeLabel(draft.startDate, draft.endDate) : '';
  const heroImage = isLive ? apiTrip?.destination?.hero_image_url ?? undefined : undefined;
  const transportStops = days.flatMap((d) =>
    d.stops.filter((s) => s.tags.includes('Transport')).map((s) => ({ ...s, dayLabel: `Day ${d.day}` })),
  );
  const hotelStops = days.flatMap((d) =>
    d.stops.filter((s) => s.tags.includes('Stay')).map((s) => ({ ...s, dayLabel: `Day ${d.day}` })),
  );

  const closeSheet = () => {
    if (pendingKey) return;
    setSheet(null);
    setDateError(null);
  };

  /** Send the user to login when the session died (Guide-style handling). Returns true when redirected. */
  const redirectOnUnauthorized = (error: unknown): boolean => {
    if (!isUnauthorized(error)) return false;
    clearTravelerToken();
    navigate('/login', { replace: true, state: { from: '/itinerary' } });
    return true;
  };

  /** Run a trip mutation and re-render the draft from the returned trip. */
  const runMutation = async (key: string, mutate: (id: string) => Promise<ApiTripWithItinerary>) => {
    if (!tripId || pendingKey) return;
    setPendingKey(key);
    setActionError(null);
    try {
      const updated = await mutate(tripId);
      updateDraft(applyServerTrip(updated, draft));
      setSheet(null);
    } catch (error) {
      if (redirectOnUnauthorized(error)) return;
      if (error instanceof ApiError && error.status === 422) {
        setActionError('The backend needs valid trip dates for this change. Adjust your dates and try again.');
        openDatesSheet();
      } else {
        setActionError(error instanceof Error ? error.message : 'This change failed. Please try again.');
      }
    } finally {
      setPendingKey(null);
    }
  };

  const openDatesSheet = () => {
    setDateStart(draft.startDate ?? '');
    setDateEnd(draft.endDate ?? '');
    setDateError(null);
    setSheet({ kind: 'dates' });
  };

  const handleDatesSave = async () => {
    if (!tripId || pendingKey) return;
    if (!parseISODate(dateStart) || !parseISODate(dateEnd)) {
      setDateError('Pick a valid start and end date.');
      return;
    }
    if (diffNights(dateStart, dateEnd) === undefined) {
      setDateError('End date can’t be before the start date.');
      return;
    }
    setDateError(null);
    setPendingKey('dates');
    setActionError(null);
    try {
      const updated = await updateTripDates(tripId, dateStart, dateEnd);
      updateDraft({ startDate: dateStart, endDate: dateEnd });
      updateDraft(applyServerTrip(updated, { ...draft, startDate: dateStart, endDate: dateEnd }));
      setSheet(null);
    } catch (error) {
      if (redirectOnUnauthorized(error)) return;
      setDateError(error instanceof Error ? error.message : 'Could not save your dates. Please try again.');
    } finally {
      setPendingKey(null);
    }
  };

  /**
   * Generate again after Adjust Dates: TWO calls — PUT the new dates, then
   * POST /optimize to respread stops across the new range (a plain re-GET
   * keeps existing items). Day tabs re-render 1..duration_days from the
   * returned trip.
   */
  const handleRegenerate = async () => {
    if (!tripId || pendingKey) return;
    if (!parseISODate(dateStart) || !parseISODate(dateEnd)) {
      setDateError('Pick a valid start and end date.');
      return;
    }
    if (diffNights(dateStart, dateEnd) === undefined) {
      setDateError('End date can’t be before the start date.');
      return;
    }
    setDateError(null);
    setPendingKey('regenerate');
    setActionError(null);
    try {
      await updateTripDates(tripId, dateStart, dateEnd);
      const updated = await optimizeTrip(tripId);
      updateDraft({ startDate: dateStart, endDate: dateEnd });
      updateDraft(applyServerTrip(updated, { ...draft, startDate: dateStart, endDate: dateEnd }));
      setActiveDay(1);
      setSheet(null);
    } catch (error) {
      if (redirectOnUnauthorized(error)) return;
      setDateError(error instanceof Error ? error.message : 'Regeneration failed. Please try again.');
    } finally {
      setPendingKey(null);
    }
  };

  const handleConfirm = async () => {
    if (!tripId || pendingKey) return;
    setPendingKey('confirm');
    setActionError(null);
    try {
      const updated = await confirmTrip(tripId);
      // Idempotent 2xx = the backend confirmed it: persist the traveler-side
      // flag immediately so "Trip Confirmed" shows right where they tapped.
      markTripConfirmed(tripId);
      updateDraft(applyServerTrip(updated, draft));
    } catch (error) {
      if (redirectOnUnauthorized(error)) return;
      // Confirm 422s when dates are missing — route straight to Adjust Dates
      // with guidance inside the sheet; never a raw backend error.
      if (error instanceof ApiError && error.status === 422) {
        setDateStart(draft.startDate ?? '');
        setDateEnd(draft.endDate ?? '');
        setDateError('Confirm needs trip dates first — pick your dates, then confirm again.');
        setSheet({ kind: 'dates' });
      } else {
        setActionError(error instanceof Error ? error.message : 'Confirm failed. Please try again.');
      }
    } finally {
      setPendingKey(null);
    }
  };

  const stopFooter = (stop: ItineraryStop, dayNumber: number): ReactNode => {
    if (!isLive || !tripId || isConfirmed) return null;
    const kind = stopKind(stop);
    const busy = pendingKey !== null;
    if (kind === 'Stay') {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => setSheet({ kind: 'stay', stopId: stop.id, dayNumber })}
          className="rounded-full border border-tourflow-cardBorder px-3 py-1.5 text-[11px] font-bold text-tourflow-primary disabled:opacity-60"
        >
          Change stay
        </button>
      );
    }
    if (kind === 'Activity' || kind === 'Meal' || kind === 'Leisure') {
      return (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSheet({ kind: 'swap', stop })}
            className="rounded-full border border-tourflow-cardBorder px-3 py-1.5 text-[11px] font-bold text-tourflow-primary disabled:opacity-60"
          >
            Swap
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSheet({ kind: 'remove', stop })}
            className="rounded-full border border-tourflow-cardBorder px-3 py-1.5 text-[11px] font-bold text-red-600 disabled:opacity-60"
          >
            Remove
          </button>
        </>
      );
    }
    return null;
  };

  const handleDownloadPdf = () => {
    if (!apiTrip) return;
    const breakdown = apiTrip.cost_breakdown;
    exportTripToPDF(
      buildTripPdfInput({
        title: apiTrip.title,
        destination: apiTrip.destination?.name ?? destinationLabel,
        dateRange,
        travelersLabel: `${apiTrip.traveler_count} travelers`,
        budgetLine: `Budget ${formatINR(apiTrip.total_budget)}`,
        totalLine: `Live total ${formatINR(apiTrip.total_cost)}`,
        costLines: [
          { label: 'Transport', value: formatINR(breakdown.transport) },
          { label: 'Stays', value: formatINR(breakdown.accommodation) },
          { label: 'Activities', value: formatINR(breakdown.activities) },
          { label: 'Remaining', value: formatINR(breakdown.remaining_budget) },
        ],
        stay: stay
          ? {
              name: stay.name,
              location: stay.location,
              roomType: stay.roomType,
              totalPrice: formatINR(stay.totalPrice),
              nights: stay.nights,
            }
          : null,
        stayAlternatives: stayAlternatives.map((s) => s.name),
        days,
      }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-2xl bg-tourflow-dark text-white shadow-card">
        {heroImage ? (
          <>
            <SafeImage
              src={heroImage}
              alt={`${destinationLabel} hero photo`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" aria-hidden="true" />
          </>
        ) : null}
        <div className="relative p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">
            {isLive ? 'Live TourFlow Itinerary' : 'Mock Itinerary'} ·{' '}
            {draft.style ? `${draft.style} pacing` : 'Pacing: Relaxed'}
          </p>
          <h2 className="mt-1 text-xl font-extrabold">{destinationLabel}</h2>
          <p className="text-xs text-white/70">
            {travelersLabel} · {isLive ? liveDayCount : days.length}{' '}
            {(isLive ? liveDayCount : days.length) === 1 ? 'Day' : 'Days'}
          </p>
          {dateRange ? <p className="text-xs text-white/70">{dateRange}</p> : null}
          <p className="mt-1 text-xs font-bold text-tourflow-primaryBorder">
            {isLive && draft.totalCost !== undefined
              ? `Live trip total ${formatINR(draft.totalCost)} (backend)`
              : draft.budgetLabel
                ? `${draft.budgetLabel} Total (your budget)`
                : 'Budget not specified'}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { id: 'travelers', value: draft.travelers ? String(draft.travelers) : '–', label: 'Travelers' },
              { id: 'days', value: String(isLive ? liveDayCount : days.length), label: 'Days' },
              { id: 'stops', value: String(totalStops), label: 'Stops' },
              { id: 'perday', value: isLive ? perDayLive : perDayMock, label: isLive ? 'Per day' : 'Per day*' },
            ].map((m) => (
              <div key={m.id} className="rounded-xl bg-white/10 p-2 text-center backdrop-blur-[1px]">
                <p className="truncate text-sm font-extrabold">{m.value}</p>
                <p className="text-[11px] text-white/70">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isLive ? (
        <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-xs font-semibold text-tourflow-sage">
          ✓ Generated by the TourFlow backend
          {draft.tripId ? ` · Trip ${draft.tripId.slice(0, 8)}…` : ''} — stays, activities and
          transport carry live catalog metadata where available.
        </p>
      ) : (
        <p className="rounded-xl bg-tourflow-primarySoft px-3 py-2 text-xs font-semibold text-tourflow-primary">
          * Preview only — stays, activities, transport and prices are MOCK placeholders, not real bookings.
        </p>
      )}

      {isConfirmed ? (
        <p role="status" className="rounded-xl bg-tourflow-sageLight px-3 py-2.5 text-center text-sm font-extrabold text-tourflow-sage">
          ✓ Trip confirmed — you’re all set!
        </p>
      ) : null}

      {isLive && emptyDays.length > 0 ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-bold text-amber-800">
            Heads up: {emptyDays.length === 1 ? `Day ${emptyDays[0]} has` : `Days ${emptyDays.join(', ')} have`} no
            planned stops yet — this trip predates the full-range guarantee.
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Adjust your dates and choose Generate again to respread the itinerary across every day.
          </p>
          <button
            type="button"
            onClick={openDatesSheet}
            className="mt-2 rounded-full bg-tourflow-dark px-3 py-1.5 text-xs font-bold text-white"
          >
            Adjust Dates
          </button>
        </div>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {actionError}
        </p>
      ) : null}

      {isLive && apiTrip ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex-1 rounded-full border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark shadow-soft hover:border-tourflow-primary"
          >
            ⬇ Download PDF
          </button>
          <button
            type="button"
            onClick={openDatesSheet}
            disabled={pendingKey !== null}
            className="flex-1 rounded-full border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark shadow-soft hover:border-tourflow-primary disabled:opacity-60"
          >
            Adjust Dates
          </button>
        </div>
      ) : null}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Itinerary days">
        {dayNumbers.map((n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === dayNumber}
            onClick={() => setActiveDay(n)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              n === dayNumber
                ? 'bg-tourflow-primary text-white shadow-float'
                : 'border border-tourflow-cardBorder bg-white text-tourflow-dark'
            }`}
          >
            Day {n}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-base font-bold">{dayHeading}</h3>
        <p className="text-xs text-tourflow-textMuted">{dayStops.length} Stops</p>
      </div>

      <ul className="relative flex flex-col gap-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-0.5 before:bg-tourflow-cardBorder">
        {dayStops.map((stop) => (
          <TimelineStopCard key={stop.id} stop={stop} footer={stopFooter(stop, dayNumber)} />
        ))}
      </ul>

      {isLive && tripId && !isConfirmed ? (
        <button
          type="button"
          onClick={() => setSheet({ kind: 'add' })}
          disabled={pendingKey !== null}
          className="w-full rounded-full border border-dashed border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-primary disabled:opacity-60"
        >
          + Add activity to Day {dayNumber}
        </button>
      ) : null}

      {isLive && apiTrip ? (
        <section aria-label="Transport and stays" className="flex flex-col gap-2">
          <h3 className="text-base font-bold">Transport & Stays</h3>
          {stay ? (
            <StayCard stay={stay} />
          ) : (
            <p className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 text-xs text-tourflow-textMuted shadow-soft">
              No stay suggestion for this trip yet — accommodation is unavailable rather than shown as a guess.
            </p>
          )}
          {transportStops.length > 0 ? (
            <div className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 shadow-soft">
              <p className="text-xs font-bold">Transfers in this plan</p>
              <ul className="mt-1 space-y-1">
                {transportStops.map((s) => (
                  <li key={s.id} className="text-xs text-tourflow-textMuted">
                    <span className="font-semibold text-tourflow-dark">{s.dayLabel} · </span>
                    {s.title}
                    {s.costLabel ? ` — ${s.costLabel}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {hotelStops.length > 0 ? (
            <div className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 shadow-soft">
              <p className="text-xs font-bold">Stay check-ins in this plan</p>
              <ul className="mt-1 space-y-1">
                {hotelStops.map((s) => (
                  <li key={s.id} className="text-xs text-tourflow-textMuted">
                    <span className="font-semibold text-tourflow-dark">{s.dayLabel} · </span>
                    {s.title}
                    {s.costLabel ? ` — ${s.costLabel}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 shadow-soft">
          <p className="text-xs font-bold">
            {destinationLabel} local loop · easy pace{isLive ? '' : ' (mock)'}
          </p>
          <p className="text-[11px] text-tourflow-textMuted">
            {isLive
              ? 'Transfers and stays carry backend catalog data where available.'
              : 'Transfers are placeholders — real routes arrive with maps.'}
          </p>
        </section>
      )}

      {isLive && draft.destination ? (
        <section aria-label="Possible options" className="flex flex-col gap-2">
          <div>
            <h3 className="text-base font-bold">Possible Options</h3>
            <p className="text-xs text-tourflow-textMuted">
              {options === null
                ? 'Checking live alternatives…'
                : options.length > 0
                  ? `${options.length} live alternative${options.length === 1 ? '' : 's'} from the catalog`
                  : 'No alternative experiences listed for this destination yet.'}
            </p>
          </div>
          {options !== null && options.length > 0 ? (
            <>
              <FilterPills items={optionCategories} activeId={optionFilter} onSelect={setOptionFilter} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visibleOptions.map((option) => (
                  <OptionCard key={option.id} option={option} />
                ))}
              </div>
              {stayAlternatives.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-bold">Alternative stays</h4>
                  {stayAlternatives.map((alt) => (
                    <StayCard key={alt.id} stay={alt} />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {isLive && tripId ? (
        isConfirmed ? (
          <p
            role="status"
            className="w-full rounded-full bg-tourflow-sageLight px-4 py-3 text-center text-sm font-extrabold text-tourflow-sage shadow-card"
          >
            ✓ Trip Confirmed
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={pendingKey !== null}
            className="w-full rounded-full bg-tourflow-primary px-4 py-3 text-sm font-bold text-white shadow-card hover:bg-tourflow-primaryHover disabled:opacity-60"
          >
            {pendingKey === 'confirm' ? 'Confirming…' : 'Confirm Trip'}
          </button>
        )
      ) : null}

      <div className="sticky bottom-20 rounded-full border border-tourflow-cardBorder bg-white/95 p-2 shadow-card backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-1">
          {copilotSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => navigate('/ai-guide')}
              className="shrink-0 rounded-full bg-tourflow-surfaceMuted px-3 py-1.5 text-xs font-semibold hover:bg-tourflow-primarySoft hover:text-tourflow-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Adjust Dates sheet */}
      {sheet?.kind === 'dates' ? (
        <Sheet label="Adjust trip dates" onClose={closeSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Adjust Dates</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Dates are sent to the backend as ISO datetimes and are required before a trip can be confirmed.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Start</span>
              <input
                type="date"
                value={dateStart}
                disabled={pendingKey !== null}
                onChange={(e) => setDateStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-sm font-semibold outline-none focus:border-tourflow-primary disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">End</span>
              <input
                type="date"
                value={dateEnd}
                min={dateStart || undefined}
                disabled={pendingKey !== null}
                onChange={(e) => setDateEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tourflow-cardBorder px-3 py-2.5 text-sm font-semibold outline-none focus:border-tourflow-primary disabled:opacity-60"
              />
            </label>
          </div>
          {dateError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
              {dateError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeSheet}
                disabled={pendingKey !== null}
                className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDatesSave()}
                disabled={pendingKey !== null}
                className="flex-1 rounded-xl bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
              >
                {pendingKey === 'dates' ? 'Saving…' : 'Save Dates'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={pendingKey !== null}
              className="w-full rounded-xl bg-tourflow-dark px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {pendingKey === 'regenerate' ? 'Regenerating…' : 'Save & Generate Again'}
            </button>
          </div>
        </Sheet>
      ) : null}

      {/* Change stay sheet */}
      {sheet?.kind === 'stay' ? (
        <Sheet label="Change stay" onClose={closeSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Change stay</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Pick an alternative for the entire trip or for Day {sheet.dayNumber} only.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {stayAlternatives.length === 0 ? (
              <p className="text-xs text-tourflow-textMuted">No alternative stays for this trip.</p>
            ) : (
              stayAlternatives.map((alt) => (
                <div key={alt.id} className="rounded-2xl border border-tourflow-cardBorder p-3">
                  <p className="text-sm font-bold text-tourflow-dark">{alt.name}</p>
                  <p className="text-xs text-tourflow-textMuted">
                    {formatINR(alt.totalPrice)} total · {alt.badge.replace(/_/g, ' ')}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pendingKey !== null}
                      onClick={() => void runMutation(`stay:${alt.id}:all`, (id) => changeAccommodation(id, alt.id))}
                      className="flex-1 rounded-full bg-tourflow-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {pendingKey === `stay:${alt.id}:all` ? 'Saving…' : 'Entire trip'}
                    </button>
                    <button
                      type="button"
                      disabled={pendingKey !== null}
                      onClick={() =>
                        void runMutation(`stay:${alt.id}:day`, (id) =>
                          changeDayAccommodation(id, alt.id, sheet.dayNumber),
                        )
                      }
                      className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                    >
                      {pendingKey === `stay:${alt.id}:day` ? 'Saving…' : `Day ${sheet.dayNumber} only`}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={closeSheet}
            disabled={pendingKey !== null}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Cancel
          </button>
        </Sheet>
      ) : null}

      {/* Swap activity sheet */}
      {sheet?.kind === 'swap' ? (
        <Sheet label="Swap activity" onClose={closeSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Swap activity</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            Replace “{sheet.stop.title}” with a live catalog alternative.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {options === null ? (
              <p className="text-xs text-tourflow-textMuted">Checking live alternatives…</p>
            ) : options.length === 0 ? (
              <p className="text-xs text-tourflow-textMuted">No alternative experiences listed for this destination yet.</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={pendingKey !== null}
                  onClick={() =>
                    void runMutation(`swap:${sheet.stop.id}:${option.id}`, (id) =>
                      swapActivity(id, {
                        item_id: sheet.stop.id,
                        new_title: option.title,
                        new_description: option.description,
                        new_cost: option.cost,
                        new_image_url: option.imageUrl,
                      }),
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-tourflow-cardBorder p-2 text-left hover:border-tourflow-primary disabled:opacity-60"
                >
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tourflow-surfaceMuted">
                      🎯
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-tourflow-dark">{option.title}</span>
                    <span className="block text-xs text-tourflow-textMuted">
                      {option.duration} · {formatINR(option.cost)}
                    </span>
                  </span>
                  {pendingKey === `swap:${sheet.stop.id}:${option.id}` ? (
                    <span className="text-xs font-bold text-tourflow-primary">Saving…</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={closeSheet}
            disabled={pendingKey !== null}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Cancel
          </button>
        </Sheet>
      ) : null}

      {/* Add activity sheet */}
      {sheet?.kind === 'add' ? (
        <Sheet label={`Add activity to Day ${dayNumber}`} onClose={closeSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Add activity · Day {dayNumber}</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">Pick a live catalog experience to append to this day.</p>
          <div className="mt-3 flex flex-col gap-2">
            {options === null ? (
              <p className="text-xs text-tourflow-textMuted">Checking live alternatives…</p>
            ) : options.length === 0 ? (
              <p className="text-xs text-tourflow-textMuted">No alternative experiences listed for this destination yet.</p>
            ) : (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={pendingKey !== null}
                  onClick={() =>
                    void runMutation(`add:${option.id}`, (id) =>
                      addActivity(id, {
                        title: option.title,
                        day_number: dayNumber,
                        cost: option.cost,
                        location: option.location,
                        description: option.description,
                      }),
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-tourflow-cardBorder p-2 text-left hover:border-tourflow-primary disabled:opacity-60"
                >
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tourflow-surfaceMuted">
                      🎯
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-tourflow-dark">{option.title}</span>
                    <span className="block text-xs text-tourflow-textMuted">
                      {option.duration} · {formatINR(option.cost)}
                    </span>
                  </span>
                  {pendingKey === `add:${option.id}` ? (
                    <span className="text-xs font-bold text-tourflow-primary">Saving…</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={closeSheet}
            disabled={pendingKey !== null}
            className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
          >
            Cancel
          </button>
        </Sheet>
      ) : null}

      {/* Remove activity confirmation */}
      {sheet?.kind === 'remove' ? (
        <Sheet label="Remove activity" onClose={closeSheet}>
          <h3 className="text-base font-extrabold text-tourflow-dark">Remove this stop?</h3>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            “{sheet.stop.title}” will be removed from Day {dayNumber}. This can’t be undone.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={closeSheet}
              disabled={pendingKey !== null}
              className="flex-1 rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runMutation(`remove:${sheet.stop.id}`, (id) => deleteActivity(id, sheet.stop.id))}
              disabled={pendingKey !== null}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pendingKey === `remove:${sheet.stop.id}` ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
