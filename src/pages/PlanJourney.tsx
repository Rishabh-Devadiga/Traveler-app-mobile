import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { InspirationCard, PromptHero } from '../components/trip';
import { inspirationTrips, planJourney } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { parseTripPrompt } from '../utils/parseTripPrompt';
import { formatINR } from '../utils/format';

function detectedTagsFor(prompt: string): string[] {
  const parsed = parseTripPrompt(prompt);
  const tags: string[] = [];
  if (parsed.destination) tags.push(parsed.destination);
  if (parsed.durationDays) tags.push(`${parsed.durationDays} Days`);
  if (parsed.travelerLabel) tags.push(parsed.travelerLabel);
  else if (parsed.travelers) tags.push(`${parsed.travelers} Travelers`);
  if (parsed.budgetLabel) tags.push(`< ${parsed.budgetLabel}`);
  else if (parsed.budgetAmount) tags.push(`< ${formatINR(parsed.budgetAmount)}`);
  if (parsed.style) tags.push(parsed.style);
  return tags;
}

export default function PlanJourney() {
  const navigate = useNavigate();
  const location = useLocation();
  const { draft, startTrip, resetTrip } = useTripDraft();

  const navState = location.state as {
    destination?: string;
    source?: 'globe' | 'manual';
    prompt?: string;
    reset?: boolean;
  } | null;

  // Track the Globe prefill destination for this editing session (if initiated from Globe)
  const [globePrefill, setGlobePrefill] = useState<string | null>(() => {
    if (navState?.source === 'globe' && navState.destination) {
      return navState.destination;
    }
    return null;
  });

  const [prompt, setPrompt] = useState<string>(() => {
    if (navState?.source === 'globe' && navState.destination) {
      return `Trip to ${navState.destination}`;
    }
    if (navState?.prompt) {
      return navState.prompt;
    }
    if (navState?.reset) {
      return planJourney.defaultPrompt;
    }
    // If a trip was already completed, or an uninitiated manual session encounters a stale globe draft:
    if (draft.itinerary !== null || (draft.destinationSource === 'globe' && navState?.source !== 'globe')) {
      return planJourney.defaultPrompt;
    }
    if (draft.prompt) {
      return draft.prompt;
    }
    return planJourney.defaultPrompt;
  });

  const [error, setError] = useState('');
  const [voiceNote, setVoiceNote] = useState('');

  // Handle incoming navigation state transitions and session cleanups
  useEffect(() => {
    const s = location.state as {
      destination?: string;
      source?: 'globe' | 'manual';
      prompt?: string;
      reset?: boolean;
    } | null;

    if (s?.source === 'globe' && s.destination) {
      const dest = s.destination;
      setGlobePrefill(dest);
      setPrompt(`Trip to ${dest}`);
      setError('');
      startTrip(`Trip to ${dest}`, { destination: dest, destinationSource: 'globe' });
      navigate(location.pathname, { replace: true, state: null });
    } else if (s?.reset || s?.source === 'manual') {
      resetTrip();
      setGlobePrefill(null);
      setError('');
      if (s?.prompt) {
        setPrompt(s.prompt);
      } else if (s?.destination) {
        setPrompt(`Trip to ${s.destination}`);
      } else {
        setPrompt(planJourney.defaultPrompt);
      }
      navigate(location.pathname, { replace: true, state: null });
    } else if (draft.itinerary !== null || (draft.destinationSource === 'globe' && !globePrefill)) {
      resetTrip();
      setGlobePrefill(null);
      setPrompt(planJourney.defaultPrompt);
    }
  }, [location.state, location.pathname, draft.itinerary, draft.destinationSource, globePrefill, navigate, resetTrip, startTrip]);

  // Dynamically parse the current prompt input
  const parsed = useMemo(() => parseTripPrompt(prompt), [prompt]);

  // Derive active destination and whether it is prefilled from Globe
  const { activeDestination, isFromGlobe } = useMemo(() => {
    if (parsed.destination) {
      if (globePrefill && parsed.destination.toLowerCase() === globePrefill.toLowerCase()) {
        return { activeDestination: globePrefill, isFromGlobe: true };
      }
      return { activeDestination: parsed.destination, isFromGlobe: false };
    }
    return { activeDestination: undefined, isFromGlobe: false };
  }, [parsed.destination, globePrefill]);

  const handleVoice = () => {
    setVoiceNote('Listening… (mock) — try: “Solo trip to Pondicherry for 3 days under ₹18,000”.');
    window.setTimeout(() => {
      setPrompt('Solo trip to Pondicherry for 3 days under ₹18,000 with beach cafes and slow mornings.');
      setVoiceNote('');
    }, 1200);
  };

  const handleContinue = () => {
    if (!prompt.trim()) {
      setError('Describe your trip first — e.g. “Trip to Agra” or “4 days in Kashmir for a family of 4 under ₹60,000”.');
      return;
    }
    setError('');
    const resolvedDestination = activeDestination || parsed.destination;
    startTrip(prompt, {
      destination: resolvedDestination,
      destinationSource: isFromGlobe ? 'globe' : 'manual',
    });
    navigate('/checklist');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-primary">{planJourney.stepLabel}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">{planJourney.title}</h2>
      </div>

      {activeDestination ? (
        <div className="flex items-center justify-between rounded-2xl border border-tourflow-cardBorder bg-white p-3.5 shadow-soft">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Destination</p>
            <p className="mt-0.5 text-base font-extrabold text-tourflow-dark">{activeDestination}</p>
          </div>
          <span className="rounded-full bg-tourflow-sageLight px-2.5 py-1 text-[11px] font-bold text-tourflow-sage">
            {isFromGlobe ? '✓ Pre-filled from Globe' : '✓ Detected'}
          </span>
        </div>
      ) : null}

      <PromptHero
        value={prompt}
        placeholder={planJourney.textareaPlaceholder}
        tags={detectedTagsFor(prompt)}
        note={planJourney.qualityNote}
        onChange={(value) => {
          setPrompt(value);
          if (value.trim()) setError('');
        }}
        onClear={() => setPrompt('')}
        onVoice={handleVoice}
      />
      {voiceNote ? <p className="text-xs text-tourflow-sage" role="status">{voiceNote}</p> : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-tourflow-sageBorder bg-tourflow-sageLight p-3">
        <p className="text-sm font-bold text-tourflow-sage">{planJourney.bannerTitle}</p>
        <p className="text-xs text-tourflow-dark/80">{planJourney.bannerSubtitle}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold">{planJourney.inspirationTitle}</h3>
        <div className="grid grid-cols-1 gap-2">
          {inspirationTrips.map((trip) => (
            <InspirationCard key={trip.id} trip={trip} onUse={setPrompt} />
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleContinue}
        className="w-full rounded-full bg-tourflow-primary px-4 py-3.5 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
      >
        {planJourney.ctaLabel}
      </button>
    </div>
  );
}
