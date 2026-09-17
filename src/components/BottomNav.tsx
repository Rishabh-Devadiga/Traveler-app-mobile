import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/home-explore', label: 'Home', icon: '⌂' },
  { to: '/plan', label: 'Plan', icon: '✎' },
  { to: '/itinerary', label: 'Trips', icon: '▤' },
  { to: '/ai-guide', label: 'AI Guide', icon: '✦' },
  { to: '/profile', label: 'Profile', icon: '☺' },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-tourflow-cardBorder bg-white/95 pb-safe backdrop-blur-md"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-tourflow-primary' : 'text-tourflow-textMuted hover:text-tourflow-dark'
              }`
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
