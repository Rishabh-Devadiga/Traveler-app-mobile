import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeView from '../components/GlobeView';
import { SparkIcon } from '../components/icons';
import { CategoryGrid, DestinationCard, FilterPills, SearchBar, SectionHeader } from '../components/home';
import {
  curatedDestinations,
  exploreGridCategories,
  filterCategories,
} from '../mocks/traveler';
import { filterCuratedByCategory, getCuratedCategory, resolveExploreCategory } from '../utils/curated';
import { useTravelerProfile } from '../state/useTravelerProfile';
import { useTripDraft } from '../state/useTripDraft';
import { parseTripPrompt } from '../utils/parseTripPrompt';
import {
  appendTranscript,
  displayWithInterim,
  isSpeechSupported,
  speechErrorMessage,
  startListening,
} from '../utils/speech';

export default function HomeExplore() {
  const navigate = useNavigate();
  const { profile } = useTravelerProfile();
  const { startTrip, resetTrip, draft } = useTripDraft();
  const travelerName = profile?.full_name.trim() || 'Traveler';
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [voiceNote, setVoiceNote] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const voiceSupported = useMemo(() => isSpeechSupported(), []);
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const voicedRef = useRef('');

  // Category pills filter the Curated slider from the already-loaded local
  // data — no extra requests, no invented destinations.
  const visibleDestinations = useMemo(
    () => filterCuratedByCategory(curatedDestinations, activeFilter),
    [activeFilter],
  );
  const activeCategory = getCuratedCategory(activeFilter);

  // The mic must never keep recording after leaving Home.
  useEffect(() => () => stopVoiceRef.current?.(), []);

  /**
   * Single Home → planning entry point, shared by the typed "Plan" button, the
   * mic dictation and the destination cards.
   *
   * The Intent screen is gone, so this seeds the shared TripDraft and opens the
   * existing Checklist directly (Checklist's ensureParsed() fills duration,
   * travelers, budget, origin and style from the prompt — identical data to the
   * old flow). A completed trip's residue is cleared first so a stale itinerary
   * can never leak in, and startTrip's resume fast-path still preserves
   * in-progress checklist edits when the exact same prompt is resubmitted.
   */
  const beginTrip = (
    promptText: string,
    options?: { destination?: string; source?: 'manual' | 'globe' },
  ) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    const destination = options?.destination ?? parseTripPrompt(trimmed).destination;
    if (draft.itinerary !== null || draft.tripId !== undefined) {
      resetTrip();
    }
    startTrip(trimmed, {
      destination,
      destinationSource: destination ? options?.source ?? 'manual' : undefined,
    });
    setFormError('');
    setVoiceNote('');
    setInterim('');
    navigate('/checklist');
  };

  /** Plan button / Enter in the search field → Checklist. */
  const handleHomePromptSubmit = () => {
    const trimmed = query.trim();
    if (trimmed) {
      beginTrip(trimmed);
      return;
    }
    // Empty field: resume an in-progress draft exactly like the Plan tab does.
    // With nothing in progress there is no prompt to review, so ask for one
    // instead of bouncing through an empty Checklist.
    if (draft.prompt.trim() && draft.itinerary === null) {
      setFormError('');
      navigate('/checklist');
      return;
    }
    setFormError(
      'Describe your trip first — e.g. “Trip to Agra” or “4 days in Kashmir for a family of 4 under ₹60,000” — or tap the mic and speak it.',
    );
  };

  /**
   * Mic button beside Plan. Reuses the shared Web Speech wrapper in
   * src/utils/speech.ts (the same implementation the removed Intent screen
   * used) — no duplicate voice logic. Interim words stream into the search
   * field, final words are appended (typed text survives), and when the user
   * stops talking the dictated trip goes through beginTrip() → Checklist.
   */
  const handleVoice = () => {
    // Tap-to-stop: final chunks already appended stay put.
    if (listening) {
      stopVoiceRef.current?.();
      return;
    }
    setFormError('');
    setVoiceNote('');
    setInterim('');
    voicedRef.current = '';
    const stop = startListening('en-IN', {
      onInterimText: (text) => setInterim(text),
      onFinalText: (text) => {
        setInterim('');
        voicedRef.current = appendTranscript(voicedRef.current, text);
        setQuery((previous) => appendTranscript(previous, text));
      },
      onSpeechError: (kind) => {
        setListening(false);
        setInterim('');
        stopVoiceRef.current = null;
        setVoiceNote(speechErrorMessage(kind));
      },
      onSpeechEnd: () => {
        setListening(false);
        setInterim('');
        stopVoiceRef.current = null;
        const said = voicedRef.current;
        voicedRef.current = '';
        // Spoken trip request → same seeding/navigation as a typed Plan.
        if (said.trim()) {
          beginTrip(said);
          return;
        }
        setVoiceNote('');
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

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-3xl bg-[#050B18] shadow-card">
        <div
          onClick={() => navigate('/globe')}
          className="group relative h-[240px] cursor-pointer overflow-hidden"
        >
          <GlobeView
            mode="preview"
            height={240}
            onClickPreview={() => navigate('/globe')}
          />
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white shadow backdrop-blur-sm">
            Live Globe · 60 places
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-10">
            <p className="text-[17px] font-extrabold tracking-tight text-white">Hello, {travelerName}</p>
            <p className="mt-0.5 text-[13px] text-white/80">Where to next? Verified stays & routes.</p>
          </div>
        </div>
        <div className="flex gap-2 bg-[#050B18] p-3">
          {/* The large "Plan a trip" hero button was removed on purpose: planning
              starts from the search + Plan area below (typed or spoken), which now
              opens the Checklist directly. */}
          <button
            type="button"
            onClick={() => navigate('/globe')}
            className="min-h-[48px] flex-1 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[15px] font-bold text-white backdrop-blur-md hover:bg-white/20"
          >
            Explore 3D
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <SearchBar
          value={displayWithInterim(query, interim, listening)}
          placeholder='Try "5 days in Kerala under ₹50k"'
          onChange={(value) => {
            setQuery(value);
            if (value.trim()) setFormError('');
          }}
          onSubmit={handleHomePromptSubmit}
          voiceSupported={voiceSupported}
          listening={listening}
          onVoice={handleVoice}
        />
        {voiceNote ? (
          <p className="text-[13px] text-tourflow-sage" role="status">
            {voiceNote}
          </p>
        ) : null}
        {formError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <section className="space-y-2">
        <SectionHeader
          title="Curated For You"
          actionLabel="View all"
          onAction={() => navigate(`/curated?category=${activeFilter}`)}
        />
        <FilterPills items={filterCategories} activeId={activeFilter} onSelect={setActiveFilter} />
        {visibleDestinations.length === 0 ? (
          <div className="rounded-2xl border border-tourflow-cardBorder dark:border-tourflow-cardBorderDark bg-white dark:bg-tourflow-surfaceDark p-4 text-center shadow-card">
            <p className="text-[15px] font-bold text-tourflow-dark dark:text-tourflow-darkDark">
              No {activeCategory.label} destinations yet
            </p>
            <p className="mt-1 text-[13px] text-tourflow-textMuted dark:text-tourflow-textMutedDark">
              Check back soon — new handpicked journeys are on the way.
            </p>
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {visibleDestinations.map((d) => (
              <DestinationCard
                key={d.id}
                destination={d}
                onPlan={() => {
                  // Same direct entry point as the search "Plan" button: seed the
                  // shared draft and open the Checklist (no Intent screen between).
                  const name = d.name.split(',')[0].trim();
                  beginTrip(`Trip to ${name}`, { destination: name, source: 'manual' });
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader title="Explore by vibe" />
        <CategoryGrid
          items={exploreGridCategories.slice(0, 4)}
          onSelect={(id) => navigate(`/curated?category=${resolveExploreCategory(id)}`)}
        />
      </section>

      <section className="flex items-center gap-3 rounded-3xl bg-tourflow-dark p-4 text-white shadow-card">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
          <SparkIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">AI Guide</p>
          <p className="truncate text-[13px] text-white/70">Trip-aware concierge for your journey.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ai-guide')}
          className="min-h-[44px] shrink-0 rounded-full bg-tourflow-primary px-4 py-2 text-[14px] font-bold text-white hover:bg-tourflow-primaryHover"
        >
          Chat
        </button>
      </section>
    </div>
  );
}
