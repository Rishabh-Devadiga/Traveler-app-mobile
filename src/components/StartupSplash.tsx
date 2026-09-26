import { useEffect, useState } from 'react';

interface StartupSplashProps {
  onDone: () => void;
}

/**
 * One-time startup splash that recreates the WanderAI "W scan" effect:
 * peach-gradient W, vertical orange scan line sweeping across it once,
 * thin baseline that fills, then a smooth fade out into the app.
 *
 * Pure CSS animations — no new dependencies.
 */
export default function StartupSplash({ onDone }: StartupSplashProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Full play time matches the CSS (scan 1.4s + hold), fade is 450ms.
    const PLAY_MS = reduceMotion ? 400 : 2100;
    const FADE_MS = reduceMotion ? 50 : 450;

    const startLeave = window.setTimeout(() => setLeaving(true), PLAY_MS);
    const finish = window.setTimeout(() => onDone(), PLAY_MS + FADE_MS);
    return () => {
      window.clearTimeout(startLeave);
      window.clearTimeout(finish);
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
      <div className="w-[min(720px,86vw)]">
        {/* W + scan line */}
        <div className="relative inline-block leading-none">
          <span
            aria-hidden="true"
            className="splash-w block select-none font-display font-black tracking-tight"
          >
            W
          </span>
          {/* vertical orange scan line */}
          <span aria-hidden="true" className="splash-scan" />
          {/* soft sheen that sweeps with the scan */}
          <span aria-hidden="true" className="splash-sheen" />
        </div>

        {/* thin baseline that fills left → right */}
        <div className="mt-5 h-px w-full overflow-hidden bg-[#FED7AA]/40">
          <div className="splash-baseline h-full w-full origin-left bg-[#FED7AA]" />
        </div>

        {/* wordmark caption fades in after the scan */}
        <div className="splash-caption mt-4 flex items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight text-tourflow-dark">
            WanderAI
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-tourflow-textMuted">
            Traveler
          </span>
        </div>
      </div>
    </div>
  );
}
