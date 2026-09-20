import type { ChecklistItem, InspirationTrip, LoadingStep } from '../types';

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
    <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">Freeform Intent</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-tourflow-sage">
          <span className="h-2 w-2 rounded-full bg-tourflow-sage animate-pulse-dot" aria-hidden="true" />
          TourFlow Listening
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
        rows={4}
        className="mt-3 w-full resize-none rounded-xl border border-tourflow-cardBorder bg-tourflow-bg p-3 text-sm outline-none focus:border-tourflow-primary"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-tourflow-sageBorder bg-tourflow-sageLight px-2.5 py-1 text-[11px] font-semibold text-tourflow-sage"
          >
            {tag}
          </span>
        ))}
      </div>
      {note ? <p className="mt-2 text-xs text-tourflow-textMuted">{note}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onClear}
          className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-xs font-bold text-tourflow-dark hover:border-tourflow-primary"
        >
          Clear
        </button>
        {voiceSupported ? (
          <button
            type="button"
            onClick={onVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Speak instead'}
            className="flex-1 rounded-full border border-tourflow-cardBorder px-3 py-2 text-xs font-bold text-tourflow-dark hover:border-tourflow-primary"
          >
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
      className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 text-left shadow-soft transition-transform hover:scale-[1.01]"
    >
      <p className="text-sm font-bold text-tourflow-dark">{trip.title}</p>
      <p className="mt-0.5 text-xs text-tourflow-textMuted">{trip.subtitle}</p>
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
  const icon = step.status === 'done' ? '✓' : step.status === 'active' ? '◌' : '○';
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
        step.status === 'active'
          ? 'border-tourflow-primaryBorder bg-tourflow-primarySoft font-semibold'
          : step.status === 'done'
            ? 'border-tourflow-sageBorder bg-white'
            : 'border-tourflow-cardBorder bg-white opacity-60'
      }`}
    >
      <span aria-hidden="true" className="w-5 text-center">
        {icon}
      </span>
      <span>{step.label}</span>
    </li>
  );
}
