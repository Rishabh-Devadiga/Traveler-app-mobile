import { useEffect, useState } from 'react';
import WanderAiWordmark from './WanderAiWordmark';

interface StartupSplashProps {
  onDone: () => void;
}

/**
 * One-time startup splash using the exact WanderAI wordmark vector
 * provided by the user (W a n d e r A I paths, #EB7812).
 * Letters rise left->right, scan line sweeps once, then fade to app.
 * Pure CSS — no new dependencies.
 */
export default function StartupSplash({ onDone }: StartupSplashProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PLAY_MS = reduceMotion ? 400 : 2300;
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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-[450ms] ease-out ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="w-[min(760px,88vw)]">
        <div className="splash-wordmark-wrap relative">
          <WanderAiWordmark />
          <span aria-hidden="true" className="splash-scan-full" />
        </div>
        <div className="mt-6 h-[2px] w-full overflow-hidden rounded-full bg-[#EB7812]/15">
          <div className="splash-baseline h-full w-full origin-left bg-[#EB7812]" />
        </div>
        <div className="splash-caption mt-4 flex items-baseline justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-tourflow-textMuted">
            Traveler
          </span>
        </div>
      </div>
    </div>
  );
}

