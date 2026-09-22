import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type TravelerNotification,
} from '../api/notifications';
import { ApiError, isApiConfigured } from '../api/client';
import { hasTravelerToken } from '../api/auth';
import { formatTripDate } from '../utils/dates';

function relativeTime(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTripDate(iso.slice(0, 10));
}

function typeGlyph(type: string): { glyph: string; bubble: string } {
  const kind = type.toLowerCase();
  if (kind.includes('success') || kind.includes('trip') || kind.includes('book') || kind.includes('confirm')) {
    return { glyph: '✓', bubble: 'bg-tourflow-sageLight text-tourflow-sage' };
  }
  if (kind.includes('warn') || kind.includes('alert') || kind.includes('disrupt') || kind.includes('cancel')) {
    return { glyph: '!', bubble: 'bg-amber-50 text-amber-600' };
  }
  return { glyph: '✦', bubble: 'bg-tourflow-primarySoft text-tourflow-primary' };
}

interface NotificationsSheetProps {
  onClose: () => void;
  /** Keeps the header badge in sync with what the list reports. */
  onUnreadChange: (unread: number) => void;
  /** Opens the persisted trip behind a notification. Resolves an error message, or null. */
  onOpenTrip: (tripId: string) => Promise<string | null>;
  onAuthFail: () => void;
}

/**
 * WanderAI notification center — a dropdown panel over the current page.
 * Everything renders from GET /api/traveler/notifications (Bearer JWT):
 * loading, empty, error, read/unread, mark-read on open. No mock rows.
 */
export default function NotificationsSheet({ onClose, onUnreadChange, onOpenTrip, onAuthFail }: NotificationsSheetProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<TravelerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const authed = hasTravelerToken();
  const configured = isApiConfigured();
  const unread = items.filter((item) => !item.is_read).length;

  useEffect(() => {
    if (!configured || !authed) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listNotifications().then(
      ({ items: list, unread: count }) => {
        if (cancelled) return;
        setItems(list);
        onUnreadChange(count);
        setLoading(false);
      },
      (fetchError: unknown) => {
        if (cancelled) return;
        if (fetchError instanceof ApiError && fetchError.status === 401) {
          onAuthFail();
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : 'Could not load notifications.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, authed, retryKey]);

  const flipRead = (id: string, read: boolean) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, is_read: read } : item));
      onUnreadChange(next.filter((item) => !item.is_read).length);
      return next;
    });
  };

  const handleOpen = (item: TravelerNotification) => {
    setOpenError(null);
    if (!item.is_read) {
      // Mark-as-read is best-effort here: the row flips instantly and the
      // server call reconciles; a failure leaves the badge slightly stale
      // until the next open rather than blocking navigation.
      flipRead(item.id, true);
      markNotificationRead(item.id).then(
        (updated) => {
          if (updated && !updated.is_read) flipRead(item.id, false);
        },
        (markError: unknown) => {
          if (markError instanceof ApiError && markError.status === 401) {
            onAuthFail();
            return;
          }
          flipRead(item.id, false);
        },
      );
    }
    if (!item.trip_id) return;
    setOpeningId(item.id);
    onOpenTrip(item.trip_id).then((message) => {
      setOpeningId(null);
      if (message) setOpenError(message);
    });
  };

  const handleMarkAll = () => {
    if (markingAll || unread === 0) return;
    setMarkingAll(true);
    markAllNotificationsRead().then(
      () => {
        setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
        onUnreadChange(0);
        setMarkingAll(false);
      },
      (markError: unknown) => {
        setMarkingAll(false);
        if (markError instanceof ApiError && markError.status === 401) {
          onAuthFail();
          return;
        }
        setOpenError(markError instanceof Error ? markError.message : 'Could not mark notifications read.');
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="absolute left-1/2 top-[calc(4rem+env(safe-area-inset-top,0px)+0.5rem)] max-h-[75vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-y-auto rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-extrabold text-tourflow-dark">Notifications</h3>
            {unread > 0 && !loading && !error ? (
              <span className="rounded-full bg-tourflow-primarySoft px-2 py-0.5 text-[11px] font-bold text-tourflow-primary">
                {unread} new
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tourflow-textMuted transition-colors hover:bg-tourflow-surfaceMuted hover:text-tourflow-dark"
          >
            ✕
          </button>
        </div>
        {unread > 0 && !loading && !error ? (
          <button
            type="button"
            disabled={markingAll}
            onClick={handleMarkAll}
            className="mt-1 text-xs font-bold text-tourflow-primary hover:text-tourflow-primaryHover disabled:opacity-60"
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        ) : null}

        {openError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
            {openError}
          </p>
        ) : null}

        {!configured ? (
          <p className="mt-3 rounded-2xl bg-tourflow-surfaceMuted p-4 text-xs font-semibold text-tourflow-textMuted">
            Notifications need the WanderAI backend. Set VITE_TOURFLOW_API_URL to load them.
          </p>
        ) : !authed ? (
          <div className="mt-3 rounded-2xl bg-tourflow-surfaceMuted p-5 text-center">
            <p className="text-sm font-bold text-tourflow-dark">Stay in the loop</p>
            <p className="mt-1 text-xs text-tourflow-textMuted">Sign in to see your trip updates.</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-3 rounded-full bg-tourflow-primary px-6 py-2.5 text-xs font-bold text-white"
            >
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center gap-1 p-6" aria-label="Loading notifications">
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
          </div>
        ) : error ? (
          <div role="alert" className="mt-3 rounded-2xl bg-red-50 p-4 text-center">
            <p className="text-xs font-semibold text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="mt-2 rounded-full bg-red-600 px-6 py-1.5 text-xs font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
            <span aria-hidden="true" className="text-3xl">🔔</span>
            <p className="mt-2 text-sm font-extrabold text-tourflow-dark">You&apos;re all caught up</p>
            <p className="text-xs text-tourflow-textMuted">New travel updates and trip activity will appear here.</p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((item) => {
              const icon = typeGlyph(item.type);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={openingId !== null}
                    onClick={() => handleOpen(item)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-70 ${
                      item.is_read
                        ? 'border-tourflow-cardBorder bg-white'
                        : 'border-tourflow-primary/30 bg-tourflow-primarySoft/50'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${icon.bubble}`}
                    >
                      {icon.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-tourflow-dark">{item.title}</span>
                      {item.message ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-tourflow-textMuted">
                          {item.message}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-tourflow-textMuted">
                        {[relativeTime(item.created_at), item.trip_id ? (openingId === item.id ? 'Opening…' : 'View trip →') : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span
                      aria-label={item.is_read ? 'Read' : 'Unread'}
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.is_read ? 'bg-transparent' : 'bg-tourflow-primary'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
