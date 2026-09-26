import type { ChecklistItem, InspirationTrip, LoadingStep } from '../types';
import { CheckIcon, ChevronRightIcon, MicIcon } from './icons';

export function PromptHero({
  value,
  placeholder,
  tags,
  note,
  onChange,
  onClear,
  onVoice,
  listening,
  voiceSupported,
}: {
  value: string;
  placeholder: string;
  tags: string[];
  note: string;
  onChange: (v: string) => void;
  onClear: () => void;
  onVoice: () => void;
  listening: boolean;
  voiceSupported: boolean;
}) {
  return (
    <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">Freeform Intent</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-tourflow-sage">
          <span className="h-2 w-2 rounded-full bg-tourflow-sage animate-pulse-dot" aria-hidden="true" />
          WanderAI
        </span>
      </div>
      <label htmlFor="travel-prompt" className="sr-only">
        Describe your trip
      </label>
      <textarea
        id="travel-prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-3 min-h-[120px] w-full resize-none rounded-xl border border-tourflow-cardBorder bg-tourflow-bg p-3 text-[16px] outline-none focus:border-tourflow-primary"
      />
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-tourflow-sageBorder bg-tourflow-sageLight px-2.5 py-1 text-xs font-semibold text-tourflow-sage"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {note ? <p className="mt-2 text-[13px] text-tourflow-textMuted">{note}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onClear}
          className="min-h-[44px] flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-[14px] font-bold text-tourflow-dark hover:border-tourflow-primary"
        >
          Clear
        </button>
        {voiceSupported ? (
          <button
            type="button"
            onClick={onVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Speak instead'}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border border-tourflow-cardBorder px-3 py-2 text-[14px] font-bold text-tourflow-dark hover:border-tourflow-primary"
          >
            <MicIcon size={18} />
            {listening ? 'Listening… Tap to stop' : 'Speak instead'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function InspirationCard({ trip, onUse }: { trip: InspirationTrip; onUse: (prompt: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onUse(trip.prompt)}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl border border-tourflow-cardBorder bg-white p-4 text-left shadow-soft transition-transform active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-tourflow-dark">{trip.title}</span>
        <span className="mt-0.5 block text-[13px] text-tourflow-textMuted">{trip.subtitle}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-tourflow-primary">
        <ChevronRightIcon size={20} />
      </span>
    </button>
  );
}

export function ChecklistCard({ item }: { item: ChecklistItem }) {
  return (
    <article className="group rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">{item.label}</p>
          <p className="mt-1 text-sm font-bold text-tourflow-dark">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-xs text-tourflow-textMuted">{item.hint}</p> : null}
        </div>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tourflow-sageLight text-tourflow-sage"
        >
          ✓
        </span>
      </div>
    </article>
  );
}

export function StepRow({ step }: { step: LoadingStep }) {
  return (
    <li
      className={`flex min-h-[44px] items-center gap-3 rounded-xl border p-3 text-[14px] ${
        step.status === 'active'
          ? 'border-tourflow-primaryBorder bg-tourflow-primarySoft font-semibold'
          : step.status === 'done'
            ? 'border-tourflow-sageBorder bg-white'
            : 'border-tourflow-cardBorder bg-white opacity-60'
      }`}
    >
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tourflow-surfaceMuted text-tourflow-sage">
        {step.status === 'done' ? <CheckIcon size={14} /> : step.status === 'active' ? <span className="h-2 w-2 rounded-full bg-tourflow-primary animate-pulse-dot" /> : <span className="h-2 w-2 rounded-full bg-tourflow-cardBorder" />}
      </span>
      <span>{step.label}</span>
    </li>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Trip planning progress">
      {steps.map((label, i) => (
        <li key={label} className="flex flex-1 items-center gap-1.5">
          <span className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-tourflow-primary' : 'bg-tourflow-surfaceMuted'}`} aria-hidden="true" />
          <span className="sr-only">{label}{i === current ? ' (current)' : ''}</span>
        </li>
      ))}
    </ol>
  );
}
