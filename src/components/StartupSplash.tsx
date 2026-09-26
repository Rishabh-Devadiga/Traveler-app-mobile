import { useEffect, useRef, useState } from 'react';
import WanderAiWordmark from './WanderAiWordmark';

interface StartupSplashProps {
  onDone: () => void;
}

/**
 * Centered star-zoom intro into the EXISTING WanderAI splash.
 * Final composition (pill / wordmark / underline / label) is untouched.
 * Sequence: tiny star appears → slight zoom OUT → back to original →
 * rapid zoom IN toward viewer with expanding halo → smooth zoom OUT →
 * existing splash revealed underneath → settles. ~2.3s before fade.
 * StrictMode-safe, fires onDone exactly once.
 */
export default function StartupSplash({ onDone }: StartupSplashProps) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PLAY_MS = reduceMotion ? 200 : 2300;
    const FADE_MS = reduceMotion ? 150 : 350;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    };

    timersRef.current = [
      window.setTimeout(() => setLeaving(true), PLAY_MS),
      window.setTimeout(finish, PLAY_MS + FADE_MS),
    ];
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div
      role="status"
      aria-label="Loading WanderAI"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white px-6 pt-safe pb-safe transition-opacity duration-[350ms] ease-out ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="splash-stage relative mx-auto flex w-full max-w-[400px] flex-col items-center text-center">
        {/* STAR TRANSITION LAYER — centered above the existing splash */}
        <div aria-hidden="true" className="splash-star-layer">
          <span className="splash-star-halo" />
          <svg
            className="splash-star-core"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 0C25.4 14.2 29.8 18.6 44 20C29.8 21.4 25.4 25.8 24 40C22.6 25.8 18.2 21.4 4 20C18.2 18.6 22.6 14.2 24 0Z"
              fill="#EB7812"
            />
          </svg>
        </div>

        {/* EXISTING splash composition — unchanged final state */}
        <div className="splash-brand flex w-full flex-col items-center">
          <div className="splash-star-badge mb-5 inline-flex items-center gap-2 rounded-full border border-[#EB7812]/25 bg-[#EB7812]/10 px-4 py-1.5">
            <span aria-hidden="true" className="text-base leading-none text-[#EB7812]">
              ✦
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#EB7812]">
              WanderAI
            </span>
          </div>

          <div className="splash-wordmark-reveal w-full">
            <WanderAiWordmark />
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
    </div>
  );
}


