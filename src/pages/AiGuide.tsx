import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChatBubble, SuggestionChips } from '../components/content';
import type { ChatMessage } from '../types';
import { ApiError, isApiConfigured } from '../api/client';
import { clearTravelerToken, hasTravelerToken } from '../api/auth';
import { apiItineraryToDays, getTrip } from '../api/trips';
import { getGuideGreeting, getGuideHistory, postGuideChat, type GuideTripCard } from '../api/guide';
import { useTripDraft } from '../state/useTripDraft';
import { formatINR, formatMoney } from '../utils/format';

interface TripInfo {
  tripId: string | null;
  userName: string;
  hasActiveTrip: boolean;
}

let messageSeq = 0;
function nextId(prefix: string): string {
  messageSeq += 1;
  return `${prefix}-${Date.now()}-${messageSeq}`;
}

function toChatMessage(role: 'user' | 'assistant', text: string): ChatMessage {
  return { id: nextId(role === 'user' ? 'u' : 'a'), role: role === 'user' ? 'user' : 'ai', text };
}

/**
 * AI Travel Guide — same visual design, now backed by the real Guide API.
 *
 * - Opening message is the backend `greeting` verbatim; stored history
 *   messages render as-is (conversation survives refresh).
 * - `tripId` comes from the app's selected trip (`draft.tripId`) and is
 *   omitted when none is selected so the backend resolves the active trip.
 * - Switching trips clears state and reloads history for the new trip.
 * - Trip-context cards render only real data from the shared trip draft /
 *   backend trip payload — never hardcoded hotels, bookings, or budgets.
 */
export default function AiGuide() {
  const navigate = useNavigate();
  const { draft, updateDraft } = useTripDraft();
  const activeTripId = draft.tripId;
  const authed = hasTravelerToken();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tripCard, setTripCard] = useState<GuideTripCard | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [draftText, setDraftText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [showTripPanel, setShowTripPanel] = useState(false);
  const requestRef = useRef(0);

  const redirectToLogin = () => {
    clearTravelerToken();
    navigate('/login', { replace: true, state: { from: '/ai-guide' } });
  };

  // Load greeting + history on open and on every trip switch. State is
  // cleared first so Trip A's messages never show under Trip B; stale
  // responses are ignored via the request id.
  useEffect(() => {
    if (!authed) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setMessages([]);
    setSuggestions([]);
    setTripCard(null);
    setBanner(null);
    setValidationError(null);
    setFailedText(null);
    setTripInfo(null);
    setLoadingHistory(true);

    let cancelled = false;
    const finish = () => {
      if (!cancelled && requestRef.current === requestId) setLoadingHistory(false);
    };

    Promise.all([getGuideGreeting(activeTripId), getGuideHistory(activeTripId)])
      .then(([greeting, history]) => {
        if (cancelled || requestRef.current !== requestId) return;
        const opening = greeting.greeting || history.greeting;
        const next: ChatMessage[] = [];
        if (opening) next.push(toChatMessage('assistant', opening));
        for (const item of history.messages ?? []) {
          if (typeof item.message !== 'string' || !item.message) continue;
          next.push(toChatMessage(item.role === 'user' ? 'user' : 'assistant', item.message));
        }
        setMessages(next);
        setTripCard(history.trip_card ?? null);
        setTripInfo({
          tripId: history.trip_id ?? greeting.trip_id,
          userName: history.user_name || greeting.user_name || '',
          hasActiveTrip: history.has_active_trip ?? greeting.has_active_trip ?? false,
        });
        finish();
      })
      .catch((error: unknown) => {
        if (cancelled || requestRef.current !== requestId) return;
        if (error instanceof ApiError && error.status === 401) {
          redirectToLogin();
          return;
        }
        if (error instanceof ApiError && error.status === 404) {
          setBanner('Trip not found. It may belong to another traveler — select one of your trips.');
        } else if (error instanceof ApiError && error.status === 0) {
          setBanner('Could not reach the TourFlow server. Check your connection and retry.');
        } else {
          setBanner(error instanceof Error ? error.message : 'Could not load your conversation.');
        }
        finish();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTripId, authed]);

  const refreshTripData = async (tripId: string | null) => {
    if (!tripId) return;
    try {
      const trip = await getTrip(tripId);
      updateDraft({
        tripId: trip.id,
        itinerary: apiItineraryToDays(trip.itinerary),
        itinerarySource: 'api',
        totalCost: trip.total_cost,
        apiTrip: trip,
      });
    } catch {
      // Chat already succeeded — a stale trip panel is non-fatal.
    }
  };

  const postMessage = async (text: string) => {
    setThinking(true);
    setBanner(null);
    try {
      const chat = await postGuideChat(activeTripId ? { message: text, tripId: activeTripId } : { message: text });
      // Every question visibly gets an answer slot — a blank backend reply
      // becomes an honest retry note, never a silent hang.
      const answer = chat.response?.trim();
      setMessages((prev) => [
        ...prev,
        toChatMessage('assistant', answer || 'The guide didn’t return an answer for that. Please try asking again.'),
      ]);
      setSuggestions(Array.isArray(chat.suggestions) ? chat.suggestions.filter((s) => typeof s === 'string' && s.trim()) : []);
      if (chat.trip_card) setTripCard(chat.trip_card);
      setFailedText(null);
      if (chat.action?.applied) void refreshTripData(chat.trip_id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        redirectToLogin();
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        setBanner('Trip not found. It may belong to another traveler — select one of your trips.');
      } else if (error instanceof ApiError && error.status === 422) {
        setValidationError('Your message was rejected. Please type a message and try again.');
      } else if (error instanceof ApiError && error.status === 0) {
        setBanner('Message not sent — connection issue. Your message is kept above.');
        setFailedText(text);
      } else {
        setBanner(error instanceof Error ? error.message : 'The guide could not reply. Please try again.');
        setFailedText(text);
      }
    } finally {
      setThinking(false);
    }
  };

  const send = (text: string, options?: { appendUser?: boolean }) => {
    const clean = text.trim();
    if (!clean) {
      setValidationError('Please type a message first.');
      return;
    }
    if (clean.length > 2000) {
      setValidationError('Messages are limited to 2000 characters. Please shorten yours.');
      return;
    }
    if (thinking || loadingHistory) return;
    setValidationError(null);
    setFailedText(null);
    if (options?.appendUser !== false) {
      setMessages((prev) => [...prev, toChatMessage('user', clean)]);
    }
    setDraftText('');
    void postMessage(clean);
  };

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: '/ai-guide' }} />;
  }

  const headerSubtitle = loadingHistory
    ? 'Connecting…'
    : tripInfo && tripInfo.hasActiveTrip
      ? `Active trip${tripInfo.tripId ? ` · ${tripInfo.tripId.slice(0, 8)}` : ''}`
      : 'No active trip selected';
  const contextPill = tripInfo?.userName ? tripInfo.userName : 'Guide';

  const apiTrip =
    draft.apiTrip && typeof draft.apiTrip === 'object' && 'destination' in (draft.apiTrip as Record<string, unknown>)
      ? (draft.apiTrip as {
          destination: { name: string } | null;
          traveler_count: number;
          duration_days: number;
          total_budget: number;
          total_cost: number;
          selected_accommodation: { name: string } | null;
        })
      : null;
  const tripTitle = tripCard?.destination ?? apiTrip?.destination?.name ?? draft.destination ?? 'No trip selected';
  const tripMeta = [
    tripCard?.duration_days ?? draft.durationDays ? `${tripCard?.duration_days ?? draft.durationDays} days` : null,
    tripCard?.traveler_count ?? draft.travelers
      ? `${tripCard?.traveler_count ?? draft.travelers} traveler(s)`
      : null,
    draft.budgetLabel ?? (draft.budgetAmount ? formatINR(draft.budgetAmount) : null),
  ].filter(Boolean);
  // Budget Pulse prefers the backend trip_card (total/spent/remaining/currency);
  // the shared draft is the fallback. Stay below still comes from the itinerary.
  const cardSpent = tripCard?.spent ?? tripCard?.total_spent ?? undefined;
  const cardTotal = tripCard?.total_budget ?? undefined;
  const cardRemaining = tripCard?.remaining ?? tripCard?.remaining_budget ?? undefined;
  const cardCurrency = tripCard?.currency ?? undefined;
  const useCard = cardSpent !== undefined && cardTotal !== undefined;
  const budgetUsed = useCard ? cardSpent : apiTrip?.total_cost;
  const budgetTotal = useCard ? cardTotal : (draft.budgetAmount ?? apiTrip?.total_budget);
  const budgetPercent =
    budgetUsed !== undefined && budgetTotal ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : null;
  const fmt = (n: number) => (useCard ? formatMoney(n, cardCurrency) : formatINR(n));
  const bookingsCount = tripCard?.bookings_count ?? undefined;
  const firstDayStops = draft.itinerary?.[0]?.stops.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-3xl border border-tourflow-cardBorder bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-tourflow-cardBorder p-3">
          <div>
            <p className="text-sm font-extrabold">Your AI Travel Guide</p>
            <p className="text-xs text-tourflow-textMuted">{headerSubtitle}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-tourflow-sageLight px-2.5 py-1 text-[11px] font-bold text-tourflow-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-tourflow-sage animate-pulse-dot" aria-hidden="true" />
            {contextPill}
          </span>
        </div>

        <div className="flex max-h-[52vh] flex-1 flex-col gap-2 overflow-y-auto p-3 thin-scroll" aria-live="polite">
          {!isApiConfigured() ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              The TourFlow server is not configured (VITE_TOURFLOW_API_URL). The guide needs the backend.
            </p>
          ) : null}
          {loadingHistory ? (
            <div className="flex gap-1 p-1" aria-label="Loading conversation">
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
            </div>
          ) : null}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {!loadingHistory && tripInfo && !tripInfo.hasActiveTrip ? (
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="mt-1 w-full rounded-full bg-tourflow-surfaceMuted py-1.5 text-xs font-bold hover:bg-tourflow-primarySoft hover:text-tourflow-primary"
            >
              Plan a journey
            </button>
          ) : null}
          {banner ? (
            <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              <p>{banner}</p>
              {failedText ? (
                <button
                  type="button"
                  onClick={() => {
                    setBanner(null);
                    setFailedText(null);
                    void postMessage(failedText);
                  }}
                  disabled={thinking}
                  className="mt-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {thinking ? (
            <div className="flex gap-1 p-1" aria-label="TourFlow is typing">
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-tourflow-cardBorder p-3">
          {suggestions.length > 0 ? (
            <div className={thinking ? 'pointer-events-none opacity-60' : undefined}>
              <SuggestionChips items={suggestions} onPick={(v) => send(v)} />
            </div>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draftText);
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="guide-input" className="sr-only">
              Ask your travel guide
            </label>
            <input
              id="guide-input"
              value={draftText}
              onChange={(e) => {
                setDraftText(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Ask your travel guide anything..."
              className="w-full rounded-full border border-tourflow-cardBorder bg-tourflow-bg px-4 py-2.5 text-sm outline-none focus:border-tourflow-primary"
            />
            <button
              type="submit"
              disabled={thinking}
              className="shrink-0 rounded-full bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              Send
            </button>
          </form>
          {validationError ? (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {validationError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setShowTripPanel((v) => !v)}
            className="w-full rounded-full border border-tourflow-cardBorder py-2 text-xs font-bold lg:hidden"
            aria-expanded={showTripPanel}
          >
            {showTripPanel ? 'Hide trip context' : 'Show trip context'}
          </button>
        </div>
      </section>

      <aside
        className={`${showTripPanel ? 'flex' : 'hidden'} w-full flex-col gap-3 lg:flex lg:w-80`}
        aria-label="Trip context"
      >
        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Your Trip</p>
          <h3 className="mt-1 text-base font-extrabold">{tripTitle}</h3>
          <p className="text-xs text-tourflow-textMuted">
            {tripMeta.length > 0 ? tripMeta.join(' · ') : 'Select or create a trip to see it here.'}
          </p>
          {apiTrip?.selected_accommodation ? (
            <p className="mt-1 text-xs text-tourflow-textMuted">Stay: {apiTrip.selected_accommodation.name}</p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Today&apos;s Plan</h3>
          {firstDayStops.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {firstDayStops.map((item) => (
                <li key={item.id} className="flex gap-2 text-xs">
                  <span aria-hidden="true">●</span>
                  <span>
                    {item.time ? <span className="font-bold">{item.time} · </span> : null}
                    {item.title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-tourflow-textMuted">No plan yet — create a trip to see your day here.</p>
          )}
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Trip Budget Pulse</h3>
          {budgetUsed !== undefined && budgetTotal ? (
            <>
              <p className="mt-1 text-lg font-extrabold">
                {fmt(budgetUsed)}{' '}
                <span className="text-xs font-normal text-tourflow-textMuted">of {fmt(budgetTotal)}</span>
              </p>
              {useCard && cardRemaining !== undefined ? (
                <p className="mt-0.5 text-xs text-tourflow-textMuted">Remaining: {fmt(cardRemaining)}</p>
              ) : null}
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-tourflow-surfaceMuted" aria-hidden="true">
                <div className="h-full rounded-full bg-tourflow-sage" style={{ width: `${budgetPercent ?? 0}%` }} />
              </div>
              <button
                type="button"
                onClick={() => send('How much have I spent?')}
                className="mt-2 w-full rounded-full bg-tourflow-surfaceMuted py-1.5 text-xs font-bold hover:bg-tourflow-primarySoft hover:text-tourflow-primary"
              >
                Audit spend
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs text-tourflow-textMuted">No budget tracked yet for this trip.</p>
          )}
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Bookings</h3>
          {bookingsCount !== undefined ? (
            <p className="mt-1 text-xs text-tourflow-textMuted">
              {bookingsCount === 0
                ? 'No bookings recorded for this trip yet.'
                : `${bookingsCount} booking${bookingsCount === 1 ? '' : 's'} linked to this trip.`}
            </p>
          ) : (
            <p className="mt-1 text-xs text-tourflow-textMuted">No bookings linked yet.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
