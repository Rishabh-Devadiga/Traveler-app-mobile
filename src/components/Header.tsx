import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationsSheet from './NotificationsSheet';
import { useTripDraft } from '../state/useTripDraft';
import { ApiError, isApiConfigured } from '../api/client';
import { clearTravelerToken, hasTravelerToken } from '../api/auth';
import { applyServerTrip, fetchPersistedTrip, getUnreadCount, seedDraftFromTrip, writeActiveTripId } from '../api';

interface HeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  /** Initial letter shown when there is no avatar image (backend profile). */
  avatarInitial?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, subtitle, avatarUrl, avatarInitial, showBack, onBack }: HeaderProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { updateDraft } = useTripDraft();
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  // Unread badge from real backend data. Refreshed on mount, on every route
  // change (Layout persists, so mount alone would go stale), and whenever
  // the sheet reports a new count. Anonymous/unconfigured → badge hidden.
  useEffect(() => {
    if (!isApiConfigured() || !hasTravelerToken()) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    getUnreadCount().then(
      (count) => {
        if (!cancelled) setUnread(count);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) clearTravelerToken();
        setUnread(0);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  const openSheetTrip = async (tripId: string): Promise<string | null> => {
    try {
      const trip = await fetchPersistedTrip(tripId);
      const seed = seedDraftFromTrip(trip);
      updateDraft({ ...seed, ...applyServerTrip(trip, seed) });
      writeActiveTripId(trip.id);
      setBellOpen(false);
      navigate('/itinerary');
      return null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTravelerToken();
        navigate('/login', { replace: true, state: { from: pathname } });
        return null;
      }
      return error instanceof Error ? error.message : 'Could not open this trip.';
    }
  };

  const authFail = () => {
    clearTravelerToken();
    setBellOpen(false);
    navigate('/login', { replace: true, state: { from: pathname } });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-tourflow-cardBorder bg-tourflow-bg/90 pt-safe backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full text-tourflow-dark transition-colors hover:bg-tourflow-surfaceMuted"
            >
              ←
            </button>
          ) : (
            <Link
              to="/home-explore"
              aria-label="WanderAI home"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-tourflow-primary to-[#FF7A45] text-white shadow-md shadow-tourflow-primary/25"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-tourflow-dark">{title}</h1>
              <span className="hidden rounded-full border border-tourflow-sageBorder bg-tourflow-sageLight px-2 py-0.5 text-[11px] font-semibold text-tourflow-sage sm:inline-flex">
                WanderAI
              </span>
            </div>
            {subtitle ? <p className="text-xs text-tourflow-textMuted">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            onClick={() => setBellOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-tourflow-dark transition-colors hover:bg-tourflow-surfaceMuted"
          >
            <span aria-hidden="true">🔔</span>
            {unread > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tourflow-primary px-1 text-[10px] font-extrabold text-white"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>
          {avatarUrl && !imgFailed ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="h-9 w-9 overflow-hidden rounded-full border border-tourflow-cardBorder bg-tourflow-surfaceMuted"
            >
              <img
                src={avatarUrl}
                alt="Traveler avatar"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            </Link>
          ) : avatarInitial ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-tourflow-cardBorder bg-tourflow-primarySoft text-sm font-extrabold text-tourflow-primary"
            >
              {avatarInitial}
            </Link>
          ) : null}
        </div>
      </div>
      {bellOpen ? (
        <NotificationsSheet
          onClose={() => setBellOpen(false)}
          onUnreadChange={setUnread}
          onOpenTrip={openSheetTrip}
          onAuthFail={authFail}
        />
      ) : null}
    </header>
  );
}
