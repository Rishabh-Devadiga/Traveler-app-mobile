import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { draft, startTrip } = useTripDraft();
  const [prompt, setPrompt] = useState(draft.prompt || planJourney.defaultPrompt);
  const [error, setError] = useState('');
  const [voiceNote, setVoiceNote] = useState('');

  const handleVoice = () => {
    setVoiceNote('Listening… (mock) — try: “Solo trip to Pondicherry for 3 days under ₹18,000”.');
    window.setTimeout(() => {
      setPrompt('Solo trip to Pondicherry for 3 days under ₹18,000 with beach cafes and slow mornings.');
      setVoiceNote('');
    }, 1200);
  };

  const handleContinue = () => {
    if (!prompt.trim()) {
      setError('Describe your trip first — e.g. “4 days in Kashmir for a family of 4 under ₹60,000”.');
      return;
    }
    setError('');
    startTrip(prompt);
    navigate('/checklist');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-primary">{planJourney.stepLabel}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">{planJourney.title}</h2>
      </div>

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
