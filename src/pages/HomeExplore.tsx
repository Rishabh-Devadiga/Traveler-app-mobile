import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeView from '../components/GlobeView';
import { SparkIcon } from '../components/icons';
import { CategoryGrid, DestinationCard, FilterPills, SearchBar, SectionHeader } from '../components/home';
import {
  curatedDestinations,
  exploreGridCategories,
  filterCategories,
} from '../mocks/traveler';
import { filterCuratedByCategory, getCuratedCategory, resolveExploreCategory } from '../utils/curated';
import { useTravelerProfile } from '../state/useTravelerProfile';

export default function HomeExplore() {
  const navigate = useNavigate();
  const { profile } = useTravelerProfile();
  const travelerName = profile?.full_name.trim() || 'Traveler';
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Category pills filter the Curated slider from the already-loaded local
  // data — no extra requests, no invented destinations.
  const visibleDestinations = useMemo(
    () => filterCuratedByCategory(curatedDestinations, activeFilter),
    [activeFilter],
  );
  const activeCategory = getCuratedCategory(activeFilter);

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-3xl bg-[#050B18] shadow-card">
        <div
          onClick={() => navigate('/globe')}
          className="group relative h-[240px] cursor-pointer overflow-hidden"
        >
          <GlobeView
            mode="preview"
            height={240}
            onClickPreview={() => navigate('/globe')}
          />
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white shadow backdrop-blur-sm">
            Live Globe · 60 places
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">
            <p className="text-[17px] font-extrabold tracking-tight text-white">Hello, {travelerName}</p>
            <p className="mt-0.5 text-[13px] text-white/80">Where to next? Verified stays & routes.</p>
          </div>
        </div>
        <div className="flex gap-2 bg-[#050B18] p-3">
          <button
            type="button"
            onClick={() => navigate('/plan', { state: { reset: true, source: 'manual' } })}
            className="min-h-[48px] flex-1 rounded-full bg-tourflow-primary px-4 py-2.5 text-[15px] font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
          >
            Plan a trip
          </button>
          <button
            type="button"
            onClick={() => navigate('/globe')}
            className="min-h-[48px] flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[15px] font-bold text-white backdrop-blur-md hover:bg-white/20"
          >
            Explore 3D
          </button>
        </div>
      </section>

      <SearchBar
        value={query}
        placeholder='Try "5 days in Kerala under ₹50k"'
        onChange={setQuery}
        onSubmit={() =>
          navigate('/plan', {
            state: query.trim()
              ? { prompt: query.trim(), reset: true, source: 'manual' }
              : { reset: true, source: 'manual' },
          })
        }
      />

      <section className="space-y-2">
        <SectionHeader
          title="Curated For You"
          actionLabel="View all"
          onAction={() => navigate(`/curated?category=${activeFilter}`)}
        />
        <FilterPills items={filterCategories} activeId={activeFilter} onSelect={setActiveFilter} />
        {visibleDestinations.length === 0 ? (
          <div className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 text-center shadow-card">
            <p className="text-[15px] font-bold text-tourflow-dark">
              No {activeCategory.label} destinations yet
            </p>
            <p className="mt-1 text-[13px] text-tourflow-textMuted">
              Check back soon — new handpicked journeys are on the way.
            </p>
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {visibleDestinations.map((d) => (
              <DestinationCard
                key={d.id}
                destination={d}
                onPlan={() =>
                  navigate('/plan', {
                    state: {
                      destination: d.name.split(',')[0].trim(),
                      reset: true,
                      source: 'manual',
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader title="Explore by vibe" />
        <CategoryGrid
          items={exploreGridCategories.slice(0, 4)}
          onSelect={(id) => navigate(`/curated?category=${resolveExploreCategory(id)}`)}
        />
      </section>

      <section className="flex items-center gap-3 rounded-3xl bg-tourflow-dark p-4 text-white shadow-card">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
          <SparkIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">AI Guide</p>
          <p className="truncate text-[13px] text-white/70">Trip-aware concierge for your journey.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ai-guide')}
          className="min-h-[44px] shrink-0 rounded-full bg-tourflow-primary px-4 py-2 text-[14px] font-bold text-white hover:bg-tourflow-primaryHover"
        >
          Chat
        </button>
      </section>
    </div>
  );
}
