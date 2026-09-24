import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DestinationCard } from '../components/home';
import { curatedDestinations } from '../mocks/traveler';
import {
  filterCuratedByCategory,
  getCuratedCategory,
  normalizeCuratedCategory,
} from '../utils/curated';

/**
 * Dedicated "Curated For You" page, reusable per category via
 * `/curated?category=<id>` (Option A). Reuses the Home page data source
 * (`curatedDestinations`) and the shared `DestinationCard` component. The
 * global Layout header supplies the Back button + dynamic category title;
 * this page adds the subtitle/count and the vertical list. Unknown or
 * missing categories fall back to `all`, so direct navigation and refresh
 * never crash.
 */
export default function CuratedForYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = normalizeCuratedCategory(searchParams.get('category'));
  const category = getCuratedCategory(categoryId);
  const visibleDestinations = useMemo(
    () => filterCuratedByCategory(curatedDestinations, categoryId),
    [categoryId],
  );

  const handlePlan = (destinationId: string) => {
    const match = curatedDestinations.find((d) => d.id === destinationId);
    const destination = match ? match.name.split(',')[0].trim() : undefined;
    navigate('/plan', {
      state: {
        destination,
        reset: true,
        source: 'manual',
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="space-y-1">
        <h2 className="text-xl font-extrabold tracking-tight">{category.title}</h2>
        <p className="text-xs text-tourflow-textMuted">{category.subtitle}</p>
        <p className="text-[11px] font-semibold text-tourflow-textMuted">
          {visibleDestinations.length} destination{visibleDestinations.length === 1 ? '' : 's'}
          {categoryId === 'all' ? ' curated for you' : ` in ${category.label}`}
        </p>
      </section>

      {visibleDestinations.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-tourflow-cardBorder bg-white p-8 text-center shadow-card">
          <span aria-hidden="true" className="text-4xl">
            🧭
          </span>
          <h3 className="text-base font-extrabold">No {category.label} destinations yet.</h3>
          <p className="max-w-xs text-xs text-tourflow-textMuted">
            Check back soon — new handpicked journeys are on the way.
          </p>
          <button
            type="button"
            onClick={() => navigate('/home-explore')}
            className="mt-1 rounded-full bg-tourflow-primary px-6 py-3 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
          >
            Back to Home
          </button>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleDestinations.map((d) => (
            <li key={d.id}>
              <DestinationCard
                destination={d}
                onPlan={handlePlan}
                className="w-full sm:w-full"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
