import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { InspirationCard, PromptHero } from '../components/trip';
import { inspirationTrips, planJourney } from '../mocks/traveler';
import { useTripDraft } from '../state/useTripDraft';
import { parseTripPrompt } from '../utils/parseTripPrompt';
import { formatINR } from '../utils/format';
import {
  appendTranscript,
  displayWithInterim,
  isSpeechSupported,
  speechErrorMessage,
  startListening,
} from '../utils/speech';
import { extractPreferences } from '../api/ai';

function detectedTagsFor(prompt: string): string[] {
  const parsed = parseTripPrompt(prompt);
  const tags: string[] = [];
  if (parsed.destination) tags.push(parsed.destination);
  if (parsed.origin) tags.push(`From ${parsed.origin}`);
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
      return '';
    }
    // If a trip was already completed, or an uninitiated manual session encounters a stale globe draft:
    if (draft.itinerary !== null || (draft.destinationSource === 'globe' && navState?.source !== 'globe')) {
      return '';
    }
    if (draft.prompt) {
      return draft.prompt;
    }
    return '';
  });

  const [error, setError] = useState('');
  const [voiceNote, setVoiceNote] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const voiceSupported = useMemo(() => isSpeechSupported(), []);
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const voicedRef = useRef('');

  // Mic stops with the page — never left running after navigation.
  useEffect(() => () => stopVoiceRef.current?.(), []);

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
        setPrompt('');
      }
      navigate(location.pathname, { replace: true, state: null });
    } else if (draft.itinerary !== null || (draft.destinationSource === 'globe' && !globePrefill)) {
      resetTrip();
      setGlobePrefill(null);
      setPrompt('');
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
    // Tap-to-stop: final chunks already appended stay put.
    if (listening) {
      stopVoiceRef.current?.();
      return;
    }
    setVoiceNote('');
    setInterim('');
    voicedRef.current = '';
    const stop = startListening('en-IN', {
      onInterimText: (text) => setInterim(text),
      onFinalText: (text) => {
        setInterim('');
        voicedRef.current = appendTranscript(voicedRef.current, text);
        // Append — typed text is never wiped by dictation.
        setPrompt((previous) => appendTranscript(previous, text));
      },
      onSpeechError: (kind) => {
        setListening(false);
        setInterim('');
        stopVoiceRef.current = null;
        setVoiceNote(speechErrorMessage(kind));
      },
      onSpeechEnd: () => {
        setListening(false);
        const said = voicedRef.current;
        voicedRef.current = '';
        setInterim('');
        stopVoiceRef.current = null;
        setVoiceNote('');
        // Existing extract flow over the final dictated text so chips
        // (destination, days, travelers, budget, style) build from voice too.
        // Best-effort: chips already derive locally; typed text stays safe.
        if (said.trim()) void extractPreferences(said).catch(() => {});
      },
    });
    if (!stop) {
      setVoiceNote('Voice typing needs Chrome/Edge over HTTPS — type karo');
      return;
    }
    stopVoiceRef.current = stop;
    setListening(true);
    setVoiceNote('Listening… bolo "plan me a 6-day trip to Udaipur…"');
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
        value={displayWithInterim(prompt, interim, listening)}
        placeholder={planJourney.textareaPlaceholder}
        tags={prompt.trim() ? detectedTagsFor(prompt) : []}
        note={prompt.trim() ? planJourney.qualityNote : ''}
        onChange={(value) => {
          setPrompt(value);
          if (value.trim()) setError('');
        }}
        onClear={() => setPrompt('')}
        onVoice={handleVoice}
        listening={listening}
        voiceSupported={voiceSupported}
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
