import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { OptionCard, SafeImage, StayCard, TimelineStopCard } from '../components/content';
import { FilterPills } from '../components/home';
import { copilotSuggestions } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { asApiTrip, getPossibleOptions, toStayOption } from '../api';
import type { PossibleOption } from '../types';
import { formatINR } from '../utils/format';
import { tripDateRangeLabel } from '../utils/dates';
import { buildTripPdfInput, exportTripToPDF } from '../utils/pdfExport';

export default function Itinerary() {
  const navigate = useNavigate();
  const { draft, isItineraryStale } = useTripDraft();
  const [activeDay, setActiveDay] = useState(1);
  const [optionFilter, setOptionFilter] = useState('all');
  const [options, setOptions] = useState<PossibleOption[] | null>(null);

  const isLive = draft.itinerarySource === 'api';
  const apiTrip = asApiTrip(draft.apiTrip);

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

  if (!draft.prompt.trim()) {
    return <Navigate to="/plan" replace />;
  }
  if (draft.itinerary === null || isItineraryStale) {
    return <Navigate to="/loading" replace />;
  }

  const days = draft.itinerary;
  const day = days.find((d) => d.day === activeDay) ?? days[0];
  const destinationLabel = draft.destination ?? 'Your destination';
  const travelersLabel = draft.travelerLabel ?? (draft.travelers ? `${draft.travelers} travelers` : 'Group');
  const totalStops = days.reduce((sum, d) => sum + d.stopsCount, 0);
  const perDayMock = draft.budgetAmount ? formatINR(draft.budgetAmount / days.length) : '—';
  const perDayLive =
    isLive && draft.totalCost !== undefined ? formatINR(draft.totalCost / days.length) : perDayMock;
  const dateRange =
    draft.startDate && draft.endDate ? tripDateRangeLabel(draft.startDate, draft.endDate) : '';
  const heroImage = isLive ? apiTrip?.destination?.hero_image_url ?? undefined : undefined;
  const transportStops = days.flatMap((d) =>
    d.stops.filter((s) => s.tags.includes('Transport')).map((s) => ({ ...s, dayLabel: `Day ${d.day}` })),
  );
  const hotelStops = days.flatMap((d) =>
    d.stops.filter((s) => s.tags.includes('Stay')).map((s) => ({ ...s, dayLabel: `Day ${d.day}` })),
  );

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
            {travelersLabel} · {days.length} {days.length === 1 ? 'Day' : 'Days'}
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
              { id: 'days', value: String(days.length), label: 'Days' },
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

      {isLive && apiTrip ? (
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="w-full rounded-full border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark shadow-soft hover:border-tourflow-primary"
        >
          ⬇ Download PDF
        </button>
      ) : null}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Itinerary days">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.day === day.day}
            onClick={() => setActiveDay(d.day)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              d.day === day.day
                ? 'bg-tourflow-primary text-white shadow-float'
                : 'border border-tourflow-cardBorder bg-white text-tourflow-dark'
            }`}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-base font-bold">
          Day {day.day}: {day.title}
        </h3>
        <p className="text-xs text-tourflow-textMuted">{day.stopsCount} Stops</p>
      </div>

      <ul className="relative flex flex-col gap-3 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-0.5 before:bg-tourflow-cardBorder">
        {day.stops.map((stop) => (
          <TimelineStopCard key={stop.id} stop={stop} />
        ))}
      </ul>

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
    </div>
  );
}
