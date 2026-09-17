import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimelineStopCard } from '../components/content';
import { copilotSuggestions, itineraryDays, itineraryHero, itineraryMetrics } from '../mocks/traveler';

export default function Itinerary() {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(1);
  const day = itineraryDays.find((d) => d.day === activeDay) ?? itineraryDays[0];

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-tourflow-dark p-4 text-white shadow-card">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">AI Curated · {itineraryHero.pacing}</p>
        <h2 className="mt-1 text-xl font-extrabold">{itineraryHero.title}</h2>
        <p className="text-xs text-white/70">{itineraryHero.subtitle}</p>
        <p className="mt-1 text-xs font-bold text-tourflow-primaryBorder">{itineraryHero.totalEstimate}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {itineraryMetrics.map((m) => (
            <div key={m.id} className="rounded-xl bg-white/10 p-2 text-center">
              <p className="text-sm font-extrabold">{m.value}</p>
              <p className="text-[11px] text-white/70">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Itinerary days">
        {itineraryDays.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.day === activeDay}
            onClick={() => setActiveDay(d.day)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              d.day === activeDay
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

      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 shadow-soft">
        <p className="text-xs font-bold">Day 1 Walking & Boat Route · Lake Pichola</p>
        <p className="text-[11px] text-tourflow-textMuted">3.8 km total · mostly flat lakeside path</p>
      </section>

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
