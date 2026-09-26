import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, PlanIcon, ProfileIcon, SparkIcon, TripsIcon } from './icons';
import { useTripDraft } from '../state/useTripDraft';

// Plan opens the Checklist directly — the Intent screen (and its /plan page)
// was removed from the flow, so /checklist is the planning entry.
const tabs = [
  { to: '/home-explore', label: 'Home', Icon: HomeIcon },
  { to: '/checklist', label: 'Plan', Icon: PlanIcon },
  { to: '/trips', label: 'Trips', Icon: TripsIcon },
  { to: '/ai-guide', label: 'AI Guide', Icon: SparkIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { draft, resetTrip } = useTripDraft();
  // Resume usable draft instead of blind reset. A draft is resumable when it
  // has a prompt but no generated itinerary yet (planning in progress).
  const hasResumableDraft = Boolean(draft.prompt.trim()) && draft.itinerary === null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-tourflow-cardBorder bg-white/95 pb-safe backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            // Plan tab = Checklist. A draft that cannot be resumed (no prompt, or
            // an already-completed trip) is cleared first, so Plan always starts a
            // fresh journey — the same reset the Intent screen used to apply when
            // it received the old `{ reset: true }` navigation state.
            onClick={() => {
              if (to === '/checklist' && !hasResumableDraft) resetTrip();
            }}
            className={({ isActive }) => {
              const active =
                to === '/checklist'
                  ? pathname === '/checklist' || pathname === '/loading' || pathname === '/plan'
                  : isActive;
              return `flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold transition-colors ${
                active ? 'text-tourflow-primary' : 'text-tourflow-textMuted hover:text-tourflow-dark'
              }`;
            }}
          >
            <span aria-hidden="true" className="leading-none">
              <Icon size={22} />
            </span>
            <span>{label}</span>
            {to === '/checklist' && hasResumableDraft && pathname !== '/checklist' ? (
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-tourflow-primary" />
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

