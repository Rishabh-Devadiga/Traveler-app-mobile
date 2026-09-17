import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InspirationCard, PromptHero } from '../components/trip';
import { inspirationTrips, planJourney } from '../mocks/traveler';

export default function PlanJourney() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(planJourney.defaultPrompt);
  const [voiceNote, setVoiceNote] = useState('');

  const handleVoice = () => {
    setVoiceNote('Listening… (mock) — try: “Solo trip to Pondicherry for 3 days under ₹18,000”.');
    window.setTimeout(() => {
      setPrompt('Solo trip to Pondicherry for 3 days under ₹18,000 with beach cafes and slow mornings.');
      setVoiceNote('');
    }, 1200);
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
        tags={planJourney.detectedTags}
        note={planJourney.qualityNote}
        onChange={setPrompt}
        onClear={() => setPrompt('')}
        onVoice={handleVoice}
      />
      {voiceNote ? <p className="text-xs text-tourflow-sage" role="status">{voiceNote}</p> : null}

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
        onClick={() => navigate('/checklist')}
        className="w-full rounded-full bg-tourflow-primary px-4 py-3.5 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
      >
        {planJourney.ctaLabel}
      </button>
    </div>
  );
}
