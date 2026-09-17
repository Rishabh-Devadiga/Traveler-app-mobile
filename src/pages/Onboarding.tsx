import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingCarousel from '../components/OnboardingCarousel';
import { onboardingCopy, onboardingSlides } from '../mocks/traveler';

const DISPLAY_DURATION_MS = 7000;

/**
 * Entry screen. Converted from
 * `home_explore_illustrated_india_carousel/code.html` with TourFlow branding.
 * No auth/backend — Sign In is a UI placeholder.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [signInNote, setSignInNote] = useState('');
  const activeSlide = onboardingSlides[activeIndex] ?? onboardingSlides[0];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % onboardingSlides.length);
    }, DISPLAY_DURATION_MS);
    return () => window.clearInterval(timer);
  }, []);

  const goHome = () => navigate('/home-explore');

  const handleSignIn = () => {
    setSignInNote(onboardingCopy.signInPlaceholder);
    window.setTimeout(() => setSignInNote(''), 2500);
  };

  return (
    <div className="min-h-dvh bg-[#0f1712] text-white">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between overflow-hidden bg-black shadow-2xl">
        <OnboardingCarousel slides={onboardingSlides} activeIndex={activeIndex} onSelect={setActiveIndex} />

        <div className="relative z-20 flex items-center justify-between px-4 pt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-white shadow-sm backdrop-blur-md">
            <span aria-hidden="true">✦</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
              {onboardingCopy.badge}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
            <span aria-hidden="true">📍</span>
            <span>{activeSlide.location}</span>
          </span>
        </div>

        <div className="relative z-20 flex flex-col items-center px-4 text-center">
          <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/20 px-4 py-1.5 text-white shadow-sm backdrop-blur-md">
            <span aria-hidden="true">✦</span>
            <span className="text-xs font-bold uppercase tracking-wide">{onboardingCopy.eyebrow}</span>
          </span>
          <h1 className="mt-1 max-w-xs text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            {onboardingCopy.titlePrefix}{' '}
            <span className="text-tourflow-primary">{onboardingCopy.titleBrand}</span>
          </h1>
          <p className="mt-2 max-w-[270px] text-sm font-medium leading-relaxed text-white/85 drop-shadow-sm">
            {onboardingCopy.subtitle}
          </p>
          <div className="mt-3.5 flex max-w-xs flex-wrap items-center justify-center gap-2">
            {onboardingCopy.quickTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-30 flex flex-col items-center gap-3.5 px-4 pb-8">
          <button
            type="button"
            onClick={goHome}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-tourflow-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
          >
            {onboardingCopy.startLabel}
            <span aria-hidden="true">→</span>
          </button>
          <div className="flex w-full items-center justify-between px-2">
            <button
              type="button"
              onClick={goHome}
              className="text-sm text-white/90 transition-colors hover:text-white"
            >
              {onboardingCopy.guestLabel}
            </button>
            <button
              type="button"
              onClick={handleSignIn}
              className="flex items-center gap-1 text-sm font-semibold text-white/90 transition-colors hover:text-white"
              aria-live="polite"
            >
              {onboardingCopy.signInLabel}
              <span aria-hidden="true">›</span>
            </button>
          </div>
          {signInNote ? (
            <p role="status" className="rounded-full bg-white/15 px-3 py-1 text-xs text-white backdrop-blur-md">
              {signInNote}
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-xs text-white/80 opacity-90">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-tourflow-primary" />
            {onboardingCopy.trustNote}
          </p>
        </div>
      </div>
    </div>
  );
}
