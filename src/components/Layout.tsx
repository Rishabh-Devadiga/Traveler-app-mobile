import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { useTravelerProfile } from '../state/useTravelerProfile';
import { avatarUrlFor, profileInitial } from '../api/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { asApiTrip } from '../api/trips';
import { tripDateRangeLabel } from '../utils/dates';
import { getCuratedCategory, normalizeCuratedCategory } from '../utils/curated';

const titles: Record<string, { title: string; subtitle?: string; wide?: boolean; back?: boolean; flush?: boolean; fallback?: string }> = {
  '/home-explore': { title: 'Home', subtitle: 'Intelligent travel companion' },
  '/curated': {
    title: 'Curated For You',
    subtitle: 'Explore destinations picked for your next journey',
    back: true,
    fallback: '/home-explore',
  },
  '/globe': {
    title: 'Incredible India',
    subtitle: '3D Travel Globe · 60 Iconic Destinations',
    back: true,
    flush: true,
    fallback: '/home-explore',
  },
  '/plan': { title: 'Plan Your Journey', subtitle: 'Step 1 of 3 · AI Conversational Planner', back: true, fallback: '/home-explore' },
  '/trips': { title: 'Trips', subtitle: 'Your generated journeys' },
  '/checklist': { title: 'Trip Checklist', subtitle: 'Step 2 of 3 · Review details', back: true, fallback: '/plan' },
  '/loading': { title: 'Crafting Trip', subtitle: 'Live Generation', back: true, fallback: '/checklist' },
  '/itinerary': { title: 'Day-by-Day Itinerary', subtitle: 'Your trip', back: true, fallback: '/trips' },
  '/ai-guide': {
    title: 'AI Guide',
    subtitle: 'Trip-aware concierge',
    wide: true,
  },
  '/profile': { title: 'Profile', subtitle: 'WanderAI Sync' },
};

export function backFallbackFor(pathname: string, hasTripId: boolean): string {
  if (pathname === '/curated') return '/home-explore';
  if (pathname === '/globe') return '/home-explore';
  if (pathname === '/plan') return '/home-explore';
  if (pathname === '/checklist') return '/plan';
  if (pathname === '/loading') return '/checklist';
  if (pathname === '/itinerary') return hasTripId ? '/trips' : '/home-explore';
  return '/home-explore';
}

export default function Layout() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const meta = titles[pathname] ?? { title: 'WanderAI' };
  const { profile: travelerProfile } = useTravelerProfile();
  const { draft, capturedCount } = useTripDraft();

  let title = meta.title;

  let subtitle = meta.subtitle;
  if (pathname === '/curated') {
    const category = getCuratedCategory(normalizeCuratedCategory(searchParams.get('category')));
    title = category.title;
    subtitle = category.subtitle;
  }
  if (pathname === '/checklist') {
    subtitle = `Step 2 of 3 · ${capturedCount} of 5 captured`;
  }
  if (pathname === '/itinerary') {
    const liveName = asApiTrip(draft.apiTrip)?.destination?.name;
    const destination = liveName ?? draft.destination ?? 'Your trip';
    const range = draft.startDate && draft.endDate ? tripDateRangeLabel(draft.startDate, draft.endDate) : '';
    subtitle = range ? `${destination} · ${range}` : destination;
  }
  // AI Guide header follows the selected trip too — never a hardcoded place.
  if (pathname === '/ai-guide') {
    const liveName = asApiTrip(draft.apiTrip)?.destination?.name;
    const destination = liveName ?? draft.destination;
    const days = draft.durationDays;
    subtitle = destination
      ? `Trip-aware concierge · ${destination}${days ? ` · ${days} day${days === 1 ? '' : 's'}` : ''}`
      : 'Trip-aware concierge';
  }

  const handleBack = () => {
    const fallback = (meta as { fallback?: string }).fallback ?? backFallbackFor(pathname, Boolean(draft.tripId));
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1);
        // Safety: if history entry leaves app dead-end, fallback handled by caller routes.
        return;
      }
    } catch {
      /* fall through to fallback */
    }
    navigate(fallback);
  };

  return (
    <div className="min-h-screen bg-tourflow-bg text-tourflow-dark">
      <Header
        title={title}
        subtitle={subtitle}
        avatarUrl={travelerProfile ? (avatarUrlFor(travelerProfile) ?? undefined) : undefined}
        avatarInitial={travelerProfile ? profileInitial(travelerProfile) : undefined}
        showBack={meta.back}
        onBack={handleBack}
      />
      <main
        className={`mx-auto w-full flex-1 ${
          meta.flush
            ? 'p-0 max-w-md'
            : meta.wide
            ? 'max-w-7xl px-4 pb-36 pt-4'
            : 'max-w-md px-4 pb-36 pt-4'
        }`}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
