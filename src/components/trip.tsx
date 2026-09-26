import type { ChecklistItem, LoadingStep } from '../types';
import { CheckIcon } from './icons';

// The Intent-screen prompt components (PromptHero / InspirationCard) were
// removed together with the PlanJourney page: the trip prompt is now typed or
// dictated in the Home search bar, and the mic lives there (see
// src/components/home.tsx SearchBar + src/pages/HomeExplore.tsx).

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
