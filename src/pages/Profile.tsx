import { useState } from 'react';
import { ProfileInfoCard, ProfileMenuCard } from '../components/content';
import {
  profileInfoRows,
  profileMenuPrimary,
  profileMenuSupport,
  travelerUser,
} from '../mocks/traveler';

export default function Profile() {
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-center gap-3 rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
        <div className="relative">
          <img
            src={travelerUser.avatarUrl}
            alt={`${travelerUser.name} profile photo`}
            className="h-16 w-16 rounded-full border-2 border-tourflow-primary object-cover"
          />
          <button
            type="button"
            aria-label="Change avatar"
            onClick={() => showToast('Avatar picker opened (mock).')}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tourflow-primary text-xs text-white"
          >
            ✎
          </button>
        </div>
        <div className="flex-1">
          <h2 className="text-base font-extrabold">{travelerUser.name}</h2>
          <p className="text-xs text-tourflow-textMuted">{travelerUser.tier}</p>
          <p className="mt-1 inline-block rounded-full bg-tourflow-primarySoft px-2 py-0.5 text-[11px] font-bold text-tourflow-primary">
            {travelerUser.activeTripLabel}
          </p>
        </div>
      </section>

      <ProfileInfoCard rows={profileInfoRows} />
      <ProfileMenuCard title="Preferences & Settings" items={profileMenuPrimary} />
      <ProfileMenuCard title="Support & About" items={profileMenuSupport} />

      <button
        type="button"
        onClick={() => showToast('Logged out of TourFlow (mock, no auth in Phase 1).')}
        className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
      >
        Log out
      </button>

      {toast ? (
        <p role="status" className="fixed bottom-24 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full bg-tourflow-dark px-4 py-2.5 text-center text-xs font-semibold text-white shadow-float">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
