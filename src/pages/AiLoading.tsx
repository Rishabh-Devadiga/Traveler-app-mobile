import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StepRow } from '../components/trip';
import { loadingMockNote, loadingPreviewImages, loadingScreen, planningSteps } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { tripDateRangeLabel } from '../utils/dates';
import { isApiConfigured } from '../api/client';
import { ApiError } from '../api/client';
import { clearTravelerToken, hasTravelerToken } from '../api/auth';
import {
  applyServerTrip,
  fetchPersistedTrip,
  findPlanningDuplicate,
  listTravelerTrips,
  saveTravelerTrip,
  seedDraftFromTrip,
  travelerTripName,
  writeActiveTripId,
  type ResolvedItinerary,
  type TravelerTripSummary,
} from '../api/trips';

const STEP_INTERVAL_MS = 900;

function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'timeout') {
      return 'The itinerary is taking longer than expected. Please try again.';
    }
    if (error.status === 0) {
      return 'Could not reach the WanderAI backend. Check that it is running and try again.';
    }
    return error.message;
  }
  return 'Something went wrong while creating your trip. Please try again.';
}

export default function AiLoading() {
  const navigate = useNavigate();
  const { draft, generateItinerary, generateServerItinerary, isItineraryStale, updateDraft } = useTripDraft();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [dup, setDup] = useState<{ status: 'idle' | 'checking' | 'found' | 'clear'; trip?: TravelerTripSummary }>({
    status: 'idle',
  });
  const [dupError, setDupError] = useState<string | null>(null);
  const [openingDup, setOpeningDup] = useState(false);
  const [retryingSave, setRetryingSave] = useState(false);
  const finishedRef = useRef(false);
  // Last successfully generated trip (createTrip response). Retry after a
  // history-save failure re-saves THIS trip — it never re-POSTs creation.
  const savedTripRef = useRef<ResolvedItinerary | null>(null);
  // Single in-flight POST shared across effect re-runs. React 18 StrictMode
  // (dev) mounts → runs effects → cleans up → re-runs effects: without this,
  // the second run would either fire a duplicate POST or (with a plain
  // done-flag) drop the first POST's result forever, freezing the UI.
  const inflightRef = useRef<ReturnType<typeof generateServerItinerary> | null>(null);
  // Single in-flight duplicate check shared across effect re-runs — the same
  // StrictMode hazard as the POST above. Run #1 starts the race; run #2
  // attaches its own result handlers to the SAME race instead of requiring a
  // fresh one, so a remount can neither duplicate the GET nor drop its
  // result (which previously froze `dup.status` on "checking" forever).
  const dupRaceRef = useRef<{
    race: Promise<TravelerTripSummary[] | null>;
    clearTimer: () => void;
  } | null>(null);

  // Backend is the source of truth when configured AND any destination is set.
  // Any non-empty destination — known or arbitrary — is attempted via the
  // backend's dynamic discovery. Never gate this on the frontend
  // known-destination list. Otherwise the existing mock flow runs.
  const useBackend = isApiConfigured() && draft.destination !== undefined;
  const missingDestination = isApiConfigured() && draft.destination === undefined;

  useEffect(() => {
    if (!draft.prompt.trim()) return;
    if (apiError) return;

    if (!useBackend) {
      // Mock path (also covers: API unconfigured).
      if (completedSteps >= planningSteps.length) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          generateItinerary();
          const done = window.setTimeout(() => navigate('/itinerary'), 900);
          return () => window.clearTimeout(done);
        }
        return;
      }
      const tick = window.setTimeout(() => setCompletedSteps((value) => value + 1), STEP_INTERVAL_MS);
      return () => window.clearTimeout(tick);
    }

    // Backend path: animate steps while POST /api/trips runs, holding the
    // final step active until the real response arrives. The POST is created
    // once and shared via inflightRef, so StrictMode remounts and retries
    // can't duplicate it — but every run attaches its own result handlers so
    // the response is never dropped.
    if (missingDestination) return;

    let cancelled = false;

    // Duplicate guard: same destination + same dates already planning → ask
    // first, POST only on explicit "Create new". The history read is LIGHT
    // (GET /api/traveler/trips only — never the full /api/trips list) and
    // capped at 3s: on timeout the check is skipped and creation continues.
    // A slow history read must never block creation.
    const canDupCheck =
      hasTravelerToken() && !!draft.destination && !!draft.startDate && !!draft.endDate;
    if (canDupCheck && dup.status !== 'clear') {
      if (!dupRaceRef.current) {
        setDup({ status: 'checking' });
        const DUP_CHECK_TIMEOUT_MS = 3000;
        let dupTimer = 0;
        const timeout = new Promise<null>((resolve) => {
          dupTimer = window.setTimeout(() => resolve(null), DUP_CHECK_TIMEOUT_MS);
        });
        const race: Promise<TravelerTripSummary[] | null> = Promise.race([
          listTravelerTrips(),
          timeout,
        ]);
        dupRaceRef.current = {
          race,
          clearTimer: () => window.clearTimeout(dupTimer),
        };
      }
      // Attach this run's handlers to the shared race (created above or by
      // an earlier run): exactly one GET is ever in flight, and whichever
      // run is still mounted when it settles processes the result.
      const shared = dupRaceRef.current;
      shared.race.then(
        (list) => {
          shared.clearTimer();
          dupRaceRef.current = null;
          if (cancelled) return;
          // null = timed out → skip the check, continue to creation.
          if (!Array.isArray(list)) {
            setDup({ status: 'clear' });
            return;
          }
          const match = findPlanningDuplicate(
            {
              destination: draft.destination,
              origin: draft.origin,
              startDate: draft.startDate,
              endDate: draft.endDate,
            },
            list,
          );
          setDup(match ? { status: 'found', trip: match } : { status: 'clear' });
        },
        () => {
          shared.clearTimer();
          dupRaceRef.current = null;
          if (!cancelled) setDup({ status: 'clear' });
        },
      );
      return () => {
        cancelled = true;
      };
    }

    const stepTimer = window.setInterval(() => {
      setCompletedSteps((value) => (value < planningSteps.length - 1 ? value + 1 : value));
    }, STEP_INTERVAL_MS);
    // Long-running feedback only: the POST keeps running until the trip-creation
    // timeout or completion. This timer never cancels or re-fires the request.
    const slowTimer = window.setTimeout(() => {
      if (!cancelled) setShowSlowNotice(true);
    }, 90_000);

    if (!inflightRef.current) {
      inflightRef.current = generateServerItinerary(draft);
    }
    const finishTo = (path: string) => {
      window.clearInterval(stepTimer);
      window.clearTimeout(slowTimer);
      setShowSlowNotice(false);
      setCompletedSteps(planningSteps.length);
      window.setTimeout(() => {
        if (!cancelled) navigate(path);
      }, 900);
    };
    const failWith = (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        // Session died mid-creation — same handling as the Guide.
        clearTravelerToken();
        navigate('/login', { replace: true, state: { from: '/home-explore' } });
        return;
      }
      setApiError(friendlyErrorMessage(error));
      window.clearInterval(stepTimer);
      window.clearTimeout(slowTimer);
    };
    inflightRef.current.then(
      (resolved) => {
        if (cancelled) return;
        savedTripRef.current = resolved;
        // Generation succeeded. Logged-in travelers persist the trip into
        // history, then land DIRECTLY on its Day-by-Day detail — never the
        // list. The anonymous flow keeps /itinerary too (nothing to persist
        // without a session).
        if (!hasTravelerToken() || !resolved.tripId || !resolved.trip) {
          finishTo(resolved.tripId ? `/itinerary/${resolved.tripId}` : '/itinerary');
          return;
        }
        saveTravelerTrip(resolved.tripId, resolved.trip).then(
          () => {
            if (!cancelled) finishTo(`/itinerary/${resolved.tripId}`);
          },
          (error: unknown) => {
            if (cancelled) return;
            window.clearInterval(stepTimer);
            window.clearTimeout(slowTimer);
            inflightRef.current = null;
            failWith(error);
          },
        );
      },
      (error: unknown) => {
        if (cancelled) return;
        window.clearInterval(stepTimer);
        window.clearTimeout(slowTimer);
        inflightRef.current = null;
        failWith(error);
      },
    );

    return () => {
      cancelled = true;
      window.clearInterval(stepTimer);
      window.clearTimeout(slowTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, apiError, useBackend, dup.status]);

  if (!draft.prompt.trim()) {
    return <Navigate to="/plan" replace />;
  }

  const destinationLabel = draft.destination ?? 'Your getaway';
  const dateRange =
    draft.startDate && draft.endDate ? tripDateRangeLabel(draft.startDate, draft.endDate) : '';
  const capsule = [
    draft.destination ?? 'Destination not set',
    draft.durationDays ? `${draft.durationDays} Days` : 'Days not set',
    draft.travelerLabel ?? (draft.travelers ? `${draft.travelers} Travelers` : 'Travelers not set'),
    ...(dateRange ? [dateRange] : []),
  ].join(' · ');
  const previews = loadingPreviewImages(draft.destination);
  // Backend 422 detail is shown VERBATIM (it carries quota/budget hints like
  // "cheapest workable plan ≈ ₹X") — no generic copy is ever substituted.

  const handleRetry = () => {
    // Generation already succeeded but the history save failed — retry ONLY
    // the save (never re-POST a duplicate trip). Button dies while saving.
    const saved = savedTripRef.current;
    if (saved && saved.tripId && saved.trip) {
      const { tripId, trip } = saved;
      setRetryingSave(true);
      saveTravelerTrip(tripId, trip).then(
        () => navigate(`/itinerary/${tripId}`),
        (error: unknown) => {
          setRetryingSave(false);
          if (error instanceof ApiError && error.status === 401) {
            clearTravelerToken();
            navigate('/login', { replace: true, state: { from: '/home-explore' } });
            return;
          }
          setApiError(friendlyErrorMessage(error));
        },
      );
      return;
    }
    finishedRef.current = false;
    inflightRef.current = null;
    setApiError(null);
    setShowSlowNotice(false);
    setCompletedSteps(0);
    setRetryKey((key) => key + 1);
  };

  const handleViewItinerary = () => {
    if (!useBackend) generateItinerary();
    // In backend mode only leave when a fresh itinerary exists — otherwise
    // Itinerary would bounce straight back here and re-POST a duplicate trip.
    if (!useBackend || (draft.itinerary !== null && !isItineraryStale)) {
      navigate('/itinerary');
    }
  };

  const openDuplicate = () => {
    const trip = dup.trip;
    if (!trip || openingDup) return;
    setOpeningDup(true);
    setDupError(null);
    // Open the exact persisted record — never regenerated, never created.
    fetchPersistedTrip(trip.id).then(
      (full) => {
        const seed = seedDraftFromTrip(full);
        updateDraft({ ...seed, ...applyServerTrip(full, seed) });
        writeActiveTripId(full.id);
        navigate(`/itinerary/${full.id}`);
      },
      (error: unknown) => {
        setOpeningDup(false);
        if (error instanceof ApiError && error.status === 401) {
          clearTravelerToken();
          navigate('/login', { replace: true, state: { from: '/home-explore' } });
          return;
        }
        setDupError(error instanceof Error ? error.message : 'Could not open that trip.');
      },
    );
  };

  const createNewAnyway = () => {
    if (openingDup) return;
    setDupError(null);
    // Explicit user choice — the effect below fires the single POST.
    setDup({ status: 'clear' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-primary">
          {loadingScreen.statusLabel}
        </p>
        <button
          type="button"
          onClick={() => navigate('/plan')}
          aria-label="Cancel generation"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-tourflow-cardBorder bg-white"
        >
          ✕
        </button>
      </div>

      <h2 className="text-xl font-extrabold tracking-tight">Crafting {destinationLabel} Getaway...</h2>

      {missingDestination && !apiError ? (        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-sm font-bold text-red-700">Destination needed for live planning</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            The backend needs a destination to generate your trip. Type any destination —
            well-known or not, it is discovered dynamically — then continue.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/checklist')}
              className="flex-1 rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white hover:bg-tourflow-primaryHover"
            >
              Back to Checklist
            </button>
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-xs font-bold"
            >
              Back to Plan
            </button>
          </div>
        </section>
      ) : null}

      {dup.status === 'checking' && !apiError ? (
        <p className="rounded-xl bg-tourflow-surfaceMuted px-3 py-2 text-xs font-semibold text-tourflow-textMuted" role="status">
          Checking your existing trips…
        </p>
      ) : null}

      {dup.status === 'found' && dup.trip && !apiError ? (
        <section
          className="rounded-2xl border border-tourflow-primaryBorder bg-white p-4 shadow-card"
          role="alertdialog"
          aria-label="Trip already in progress"
        >
          <p className="text-sm font-bold">Trip already in progress</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            {travelerTripName(dup.trip)}
            {dup.trip.start_date && dup.trip.end_date
              ? ` · ${tripDateRangeLabel(
                  dup.trip.start_date.slice(0, 10),
                  dup.trip.end_date.slice(0, 10),
                )}`
              : ''}
            {' '}— continue where you left off, or plan it again from scratch.
          </p>
          {dupError ? (
            <p className="mt-1 text-xs font-semibold text-red-600" role="alert">{dupError}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={openDuplicate}
              disabled={openingDup}
              autoFocus
              className="flex-1 rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {openingDup ? 'Opening…' : 'Open existing'}
            </button>
            <button
              type="button"
              onClick={createNewAnyway}
              disabled={openingDup}
              className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-xs font-bold disabled:opacity-60"
            >
              Create new
            </button>
          </div>
        </section>
      ) : null}

      {apiError ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-sm font-bold text-red-700">{apiError.split('\n')[0]}</p>
          <p className="mt-1 whitespace-pre-line text-xs text-tourflow-textMuted">{apiError}</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">Your prompt and checklist edits are preserved.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retryingSave}
              className="flex-1 rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60"
            >
              {retryingSave ? 'Saving…' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/checklist')}
              className="flex-1 rounded-full bg-tourflow-dark px-3 py-2 text-xs font-bold text-white"
            >
              Adjust Dates
            </button>
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-xs font-bold"
            >
              Back to Plan
            </button>
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white p-6 text-center shadow-card">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-tourflow-primarySoft blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-tourflow-sageLight blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tourflow-primarySoft" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tourflow-primary/20" />
          <span className="text-2xl">✦</span>
        </div>
          <p className="relative mt-3 text-sm font-semibold">WanderAI is curating your days…</p>
        <p className="relative mt-1 inline-block rounded-full bg-tourflow-surfaceMuted px-3 py-1 text-xs font-bold">
          {capsule}
        </p>
        {useBackend && showSlowNotice && !apiError ? (
          <p className="relative mt-2 rounded-2xl bg-tourflow-surfaceMuted p-3 text-xs leading-relaxed" role="status">
            <span className="font-bold">Still working — </span>
            Your itinerary is taking a little longer than usual. Please keep this screen open.
          </p>
        ) : null}
        <p className="relative mt-2 text-xs text-tourflow-textMuted">
          {draft.style ? `${draft.style} tempo · ` : ''}
          {useBackend ? 'Live backend generation — no mock data.' : 'Simulated planning — no AI or API calls.'}
        </p>
      </section>

      <ul className="flex flex-col gap-2">
        {planningSteps.map((step, index) => (
          <StepRow
            key={step.id}
            step={{
              id: step.id,
              label: step.label,
              status: index < completedSteps ? 'done' : index === completedSteps ? 'active' : 'pending',
            }}
          />
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        {previews.map((preview, index) => (
          <article key={`${preview.imageAlt}-${index}`} className="overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
            <img src={preview.imageUrl} alt={preview.imageAlt} loading="lazy" className="h-20 w-full object-cover" />
            <div className="p-2">
              <p className="truncate text-xs font-bold">{index === 0 ? destinationLabel : 'Mock inspiration'}</p>
              <p className="text-[11px] text-tourflow-textMuted">Preview · mock</p>
            </div>
          </article>
        ))}
      </div>

      <p className="rounded-2xl bg-tourflow-surfaceMuted p-3 text-xs leading-relaxed">
        <span className="font-bold">Did you know? </span>
        {loadingMockNote.trivia}
      </p>
      <p className="text-xs text-tourflow-textMuted">{loadingMockNote.weather}</p>

      <div className="flex items-center gap-2">
        <p
          className="flex-1 rounded-full border border-tourflow-cardBorder bg-white px-3 py-2 text-center text-xs font-semibold"
          role="status"
        >
          {completedSteps < planningSteps.length ? (
            <>
              Planning step <strong>{completedSteps + 1} of {planningSteps.length}</strong>
            </>
          ) : (
            'Polishing final schedule…'
          )}
        </p>
        <button
          type="button"
          onClick={handleViewItinerary}
          disabled={useBackend && completedSteps < planningSteps.length}
          className="rounded-full bg-tourflow-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          View Itinerary
        </button>
      </div>
    </div>
  );
}
