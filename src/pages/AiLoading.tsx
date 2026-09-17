import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepRow } from '../components/trip';
import { loadingPreviews, loadingScreen, loadingSteps } from '../mocks/traveler';

export default function AiLoading() {
  const navigate = useNavigate();
  const [remaining, setRemaining] = useState(3);

  useEffect(() => {
    if (remaining <= 0) {
      const t = window.setTimeout(() => navigate('/itinerary'), 900);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRemaining((v) => v - 1), 1200);
    return () => window.clearTimeout(t);
  }, [remaining, navigate]);

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

      <h2 className="text-xl font-extrabold tracking-tight">{loadingScreen.title}</h2>

      <section className="relative overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white p-6 text-center shadow-card">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-tourflow-primarySoft blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-tourflow-sageLight blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tourflow-primarySoft" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tourflow-primary/20" />
          <span className="text-2xl">✦</span>
        </div>
        <p className="relative mt-3 text-sm font-semibold">TourFlow is curating your days…</p>
        <p className="relative mt-1 inline-block rounded-full bg-tourflow-surfaceMuted px-3 py-1 text-xs font-bold">
          {loadingScreen.capsule}
        </p>
        <p className="relative mt-2 text-xs text-tourflow-textMuted">{loadingScreen.summary}</p>
      </section>

      <ul className="flex flex-col gap-2">
        {loadingSteps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        {loadingPreviews.map((preview) => (
          <article key={preview.id} className="overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
            <img src={preview.imageUrl} alt={preview.imageAlt} loading="lazy" className="h-20 w-full object-cover" />
            <div className="p-2">
              <p className="truncate text-xs font-bold">{preview.name}</p>
              <p className="text-[11px] text-tourflow-textMuted">{preview.region}</p>
            </div>
          </article>
        ))}
      </div>

      <p className="rounded-2xl bg-tourflow-surfaceMuted p-3 text-xs leading-relaxed">
        <span className="font-bold">Did you know? </span>
        {loadingScreen.trivia}
      </p>
      <p className="text-xs text-tourflow-textMuted">{loadingScreen.weatherNote}</p>

      <div className="flex items-center gap-2">
        <p className="flex-1 rounded-full border border-tourflow-cardBorder bg-white px-3 py-2 text-center text-xs font-semibold" role="status">
          {remaining > 0 ? (
            <>
              Estimated time: <strong>{remaining} seconds</strong>
            </>
          ) : (
            'Polishing final schedule…'
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate('/itinerary')}
          className="rounded-full bg-tourflow-dark px-4 py-2 text-xs font-bold text-white"
        >
          View Itinerary
        </button>
      </div>
    </div>
  );
}
