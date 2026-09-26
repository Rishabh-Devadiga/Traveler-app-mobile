import { useEffect, useState } from 'react';
import WanderAiWordmark from './WanderAiWordmark';

interface StartupSplashProps {
  onDone: () => void;
}

/**
 * One-time startup splash: true typewriter effect on the exact
 * WanderAI wordmark vector (W a n d e r A I, #EB7812).
 * Mask reveals W → I in 8 steps with a caret riding the edge,
 * baseline types in sync, then fade to app. Pure CSS.
 */
export default function StartupSplash({ onDone }: StartupSplashProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PLAY_MS = reduceMotion ? 400 : 2500;
    const FADE_MS = reduceMotion ? 50 : 450;
    const t1 = window.setTimeout(() => setLeaving(true), PLAY_MS);
    const t2 = window.setTimeout(() => onDone(), PLAY_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-label="Loading WanderAI"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white px-6 transition-opacity duration-[450ms] ease-out ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[400px] flex-col items-center text-center">
        {/* Orange sparkle badge — types in first, before the wordmark */}
        <div className="splash-star-badge mb-5 inline-flex items-center gap-2 rounded-full border border-[#EB7812]/25 bg-[#EB7812]/10 px-4 py-1.5">
          <span aria-hidden="true" className="splash-star text-base leading-none text-[#EB7812]">
            ✦
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#EB7812]">
            WanderAI
          </span>
        </div>
        <div className="splash-wordmark-wrap relative w-full">
          <div className="splash-type-mask">
            <WanderAiWordmark />
          </div>
          <span aria-hidden="true" className="splash-scan-full" />
        </div>
        <div className="mt-6 h-[2px] w-full overflow-hidden rounded-full bg-[#EB7812]/15">
          <div className="splash-baseline h-full w-full origin-left bg-[#EB7812]" />
        </div>
        <div className="splash-caption mt-4 flex items-center justify-center gap-1.5">
          <span aria-hidden="true" className="text-xs leading-none text-[#EB7812]">
            ✦
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-tourflow-textMuted">
            Traveler
          </span>
        </div>
      </div>
    </div>
  );
}

