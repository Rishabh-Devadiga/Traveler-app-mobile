import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { travelerUser } from '../mocks/traveler';
import { useUserProfile } from '../state/useUserProfile';
import { useTripDraft } from '../state/useTripDraft';
import { asApiTrip } from '../api/trips';
import { tripDateRangeLabel } from '../utils/dates';

const titles: Record<string, { title: string; subtitle?: string; wide?: boolean; back?: boolean; flush?: boolean }> = {
  '/home-explore': { title: 'Home Explore', subtitle: 'Intelligent travel companion' },
  '/globe': {
    title: 'Incredible India',
    subtitle: '3D Travel Globe · 60 Iconic Destinations',
    back: true,
    flush: true,
  },
  '/plan': { title: 'Plan Your Journey', subtitle: 'Step 1 of 3 · AI Conversational Planner', back: true },
  '/checklist': { title: 'Trip Checklist', subtitle: 'Step 2 of 3 · 5/5 Captured', back: true },
  '/loading': { title: 'Crafting Trip', subtitle: 'Live Generation', back: true },
  '/itinerary': { title: 'Day-by-Day Itinerary', subtitle: 'Udaipur · Oct 18–21', back: true },
  '/ai-guide': {
    title: 'TourFlow AI Guide',
    subtitle: 'Live Concierge · Manali Day 3/7',
    wide: true,
  },
  '/profile': { title: 'Profile', subtitle: 'TourFlow Sync' },
};

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = titles[pathname] ?? { title: 'TourFlow' };
  const { profile } = useUserProfile();
  const { draft } = useTripDraft();

  // The itinerary header names the trip's real destination (never a stale
  // hardcoded one) plus the selected date range when set.
  let subtitle = meta.subtitle;
  if (pathname === '/itinerary') {
    const liveName = asApiTrip(draft.apiTrip)?.destination?.name;
    const destination = liveName ?? draft.destination ?? 'Your trip';
    const range = draft.startDate && draft.endDate ? tripDateRangeLabel(draft.startDate, draft.endDate) : '';
    subtitle = range ? `${destination} · ${range}` : destination;
  }

  return (
    <div className="min-h-screen bg-tourflow-bg text-tourflow-dark">
      <Header
        title={meta.title}
        subtitle={subtitle}
        avatarUrl={profile.avatarDataUrl ?? travelerUser.avatarUrl}
        showBack={meta.back}
        onBack={() => navigate(-1)}
      />
      <main
        className={`mx-auto w-full flex-1 ${
          meta.flush
            ? 'p-0 max-w-md'
            : meta.wide
            ? 'max-w-7xl px-4 pb-28 pt-4'
            : 'max-w-md px-4 pb-28 pt-4'
        }`}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
