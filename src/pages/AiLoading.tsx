import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { StepRow } from '../components/trip';
import { loadingMockNote, loadingPreviewImages, loadingScreen, planningSteps } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { tripDateRangeLabel } from '../utils/dates';
import { isApiConfigured } from '../api/client';
import { ApiError } from '../api/client';
import { clearTravelerToken, hasTravelerToken } from '../api/auth';
import { saveTravelerTrip, type ResolvedItinerary } from '../api/trips';

const STEP_INTERVAL_MS = 900;

function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Could not reach the WanderAI backend. Check that it is running and try again.';
    }
    return error.message;
  }
  return 'Something went wrong while creating your trip. Please try again.';
}

export default function AiLoading() {
  const navigate = useNavigate();
  const { draft, generateItinerary, generateServerItinerary, isItineraryStale } = useTripDraft();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const finishedRef = useRef(false);
  // Last successfully generated trip (createTrip response). Retry after a
  // history-save failure re-saves THIS trip — it never re-POSTs creation.
  const savedTripRef = useRef<ResolvedItinerary | null>(null);
  // Single in-flight POST shared across effect re-runs. React 18 StrictMode
  // (dev) mounts → runs effects → cleans up → re-runs effects: without this,
  // the second run would either fire a duplicate POST or (with a plain
  // done-flag) drop the first POST's result forever, freezing the UI.
  const inflightRef = useRef<ReturnType<typeof generateServerItinerary> | null>(null);

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
    const stepTimer = window.setInterval(() => {
      setCompletedSteps((value) => (value < planningSteps.length - 1 ? value + 1 : value));
    }, STEP_INTERVAL_MS);

    if (!inflightRef.current) {
      inflightRef.current = generateServerItinerary(draft);
    }
    const finishTo = (path: '/itinerary' | '/trips') => {
      window.clearInterval(stepTimer);
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
      setApiStatus(error instanceof ApiError ? error.status : null);
      setApiError(friendlyErrorMessage(error));
    };
    inflightRef.current.then(
      (resolved) => {
        if (cancelled) return;
        savedTripRef.current = resolved;
        // Generation succeeded. Logged-in travelers persist the trip into
        // history, then land on Trips; the anonymous flow keeps /itinerary
        // (nothing to persist without a session).
        if (!hasTravelerToken() || !resolved.tripId || !resolved.trip) {
          finishTo('/itinerary');
          return;
        }
        saveTravelerTrip(resolved.tripId, resolved.trip).then(
          () => {
            if (!cancelled) finishTo('/trips');
          },
          (error: unknown) => {
            if (cancelled) return;
            window.clearInterval(stepTimer);
            inflightRef.current = null;
            failWith(error);
          },
        );
      },
      (error: unknown) => {
        if (cancelled) return;
        window.clearInterval(stepTimer);
        inflightRef.current = null;
        failWith(error);
      },
    );

    return () => {
      cancelled = true;
      window.clearInterval(stepTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, apiError, useBackend]);

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

  const handleRetry = () => {
    // Generation already succeeded but the history save failed — retry ONLY
    // the save (never re-POST a duplicate trip).
    const saved = savedTripRef.current;
    if (saved && saved.tripId && saved.trip) {
      const { tripId, trip } = saved;
      saveTravelerTrip(tripId, trip).then(
        () => navigate('/trips'),
        (error: unknown) => {
          if (error instanceof ApiError && error.status === 401) {
            clearTravelerToken();
            navigate('/login', { replace: true, state: { from: '/home-explore' } });
            return;
          }
          setApiStatus(error instanceof ApiError ? error.status : null);
          setApiError(friendlyErrorMessage(error));
        },
      );
      return;
    }
    finishedRef.current = false;
    inflightRef.current = null;
    setApiError(null);
    setApiStatus(null);
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

      {missingDestination && !apiError ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
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

      {apiError ? (
        <section className="rounded-2xl border border-red-200 bg-white p-4 shadow-card" role="alert">
          <p className="text-sm font-bold text-red-700">Trip creation failed</p>
          <p className="mt-1 text-xs text-tourflow-textMuted">{apiError}</p>
          {apiStatus === 422 ? (
            <p className="mt-1 text-xs text-tourflow-textMuted">
              The backend can’t build this trip as specified — long stays need more distinct
              experiences than the catalog holds. Try fewer days or different dates.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-tourflow-textMuted">Your prompt and checklist edits are preserved.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="flex-1 rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white hover:bg-tourflow-primaryHover"
            >
              Try Again
            </button>
            {apiStatus === 422 ? (
              <button
                type="button"
                onClick={() => navigate('/checklist')}
                className="flex-1 rounded-full bg-tourflow-dark px-3 py-2 text-xs font-bold text-white"
              >
                Adjust Dates
              </button>
            ) : null}
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
