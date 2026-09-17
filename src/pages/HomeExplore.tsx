import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeView from '../components/GlobeView';
import { CategoryGrid, DestinationCard, FilterPills, SearchBar, SectionHeader } from '../components/home';
import {
  curatedDestinations,
  exploreGridCategories,
  filterCategories,
  globeDestinations,
  homeGreeting,
  travelerUser,
} from '../mocks/traveler';

export default function HomeExplore() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/80 bg-white p-3 shadow-card">
        <div className="relative h-[220px] overflow-hidden rounded-xl bg-gradient-to-b from-[#0e272a] via-[#143e42] to-[#0c2225]">
          <GlobeView markers={globeDestinations} height={220} />
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">
            Live Globe · Drag to explore
          </span>
        </div>
        <div className="flex items-center justify-between px-1 pb-1 pt-3">
          <div>
            <p className="text-sm font-bold text-tourflow-dark">{homeGreeting.helloName}</p>
            <p className="text-xs text-tourflow-textMuted">Where to next? TourFlow verified stays & routes.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            className="rounded-full bg-tourflow-dark px-3 py-1.5 text-xs font-bold text-white"
          >
            Plan
          </button>
        </div>
      </section>

      <SearchBar
        value={query}
        placeholder={homeGreeting.searchPlaceholder}
        onChange={setQuery}
        onSubmit={() => navigate('/plan')}
      />

      <FilterPills items={filterCategories} activeId={activeFilter} onSelect={setActiveFilter} />

      <section className="space-y-2">
        <SectionHeader title="Curated For You" actionLabel="View all" />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {curatedDestinations.map((d) => (
            <DestinationCard key={d.id} destination={d} onPlan={() => navigate('/plan')} />
          ))}
        </div>
        <p className="text-[11px] text-tourflow-textMuted">Traveler: {travelerUser.name} · {homeGreeting.quickPromptLabel}</p>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Explore Categories" />
        <CategoryGrid items={exploreGridCategories} />
      </section>

      <section className="flex items-center gap-3 rounded-2xl bg-tourflow-dark p-4 text-white shadow-card">
        <span aria-hidden="true" className="text-2xl">✦</span>
        <div className="flex-1">
          <p className="text-sm font-bold">Smart Copilot</p>
          <p className="text-xs text-white/70">Hyper-personalized escapes from your intent in seconds.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ai-guide')}
          className="rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white hover:bg-tourflow-primaryHover"
        >
          Ask AI
        </button>
      </section>
    </div>
  );
}
