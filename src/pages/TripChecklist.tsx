import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTripDraft } from '../state/useTripDraft';
import { formatINR } from '../utils/format';
import { daysNightsLabel, durationDaysFromRange, formatTripDate, tripDateRangeLabel } from '../utils/dates';

const inputClass =
  'w-full bg-transparent text-sm font-bold text-tourflow-dark outline-none placeholder:font-normal placeholder:text-tourflow-textMuted/60 focus:border-b focus:border-tourflow-primary';

function FieldHint({ detected }: { detected: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        detected ? 'bg-tourflow-sageLight text-tourflow-sage' : 'bg-tourflow-surfaceMuted text-tourflow-textMuted'
      }`}
    >
      {detected ? '✓ Detected' : 'Not specified'}
    </span>
  );
}

export default function TripChecklist() {
  const navigate = useNavigate();
  const { draft, updateDraft, ensureParsed, capturedCount } = useTripDraft();
  const [dateError, setDateError] = useState('');
  // Double-tap guard: the button dies the moment generation starts, so one
  // tap can only ever kick off one creation flow.
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    ensureParsed();
  }, [ensureParsed]);

  if (!draft.prompt.trim()) {
    return <Navigate to="/plan" replace />;
  }

  const setCount = (value: string) => {
    const count = Number(value);
    if (value.trim() === '' || !Number.isFinite(count) || count <= 0) {
      updateDraft({ travelers: undefined, travelerLabel: undefined });
      return;
    }
    const rounded = Math.min(50, Math.floor(count));
    updateDraft({
      travelers: rounded,
      travelerLabel: rounded === 1 ? 'Solo' : rounded === 2 ? 'Couple' : `${rounded} travelers`,
    });
  };

  const setStartDate = (value: string) => {
    setDateError('');
    if (!value) {
      updateDraft({ startDate: undefined });
      return;
    }
    if (draft.endDate && durationDaysFromRange(value, draft.endDate) === undefined) {
      updateDraft({ startDate: value });
      setDateError('End date can’t be before the start date. Pick a later end date or clear it first.');
      return;
    }
    const days = draft.endDate ? durationDaysFromRange(value, draft.endDate) : undefined;
    updateDraft({ startDate: value, ...(days === undefined ? {} : { durationDays: days }) });
  };

  const setEndDate = (value: string) => {
    setDateError('');
    if (!value) {
      updateDraft({ endDate: undefined });
      return;
    }
    if (draft.startDate && durationDaysFromRange(draft.startDate, value) === undefined) {
      setDateError('End date can’t be before the start date. Pick a date on or after the start.');
      return;
    }
    const days = draft.startDate ? durationDaysFromRange(draft.startDate, value) : undefined;
    updateDraft({ endDate: value, ...(days === undefined ? {} : { durationDays: days }) });
  };

  const setBudget = (value: string) => {
    const amount = Number(value.replace(/,/g, ''));
    if (value.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
      updateDraft({ budgetAmount: undefined, budgetLabel: undefined });
      return;
    }
    updateDraft({ budgetAmount: amount, budgetLabel: formatINR(amount) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-sage">
          Step 2 of 3 · Trip Checklist · {capturedCount}/5 Captured
        </p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tourflow-sageBorder"
          role="progressbar"
          aria-valuenow={capturedCount}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-label="Checklist completion"
        >
          <div
            className="h-full rounded-full bg-tourflow-sage transition-all"
            style={{ width: `${(capturedCount / 5) * 100}%` }}
          />
        </div>
      </div>

      <blockquote className="rounded-2xl bg-tourflow-dark p-3 text-xs italic leading-relaxed text-white">
        “{draft.prompt}”
      </blockquote>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Trip Checklist</h2>
        <span className="text-[11px] text-tourflow-textMuted">Parsed from your prompt — tap a value to edit</span>
      </div>

      <div className="flex flex-col gap-2">
        <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Destination</p>
            <FieldHint detected={draft.destination !== undefined} />
          </div>
          <label htmlFor="checklist-destination" className="sr-only">Destination</label>
          <input
            id="checklist-destination"
            value={draft.destination ?? ''}
            placeholder="Not specified — e.g. Kashmir"
            onChange={(e) => updateDraft({ destination: e.target.value.trim() ? e.target.value : undefined })}
            className={`${inputClass} mt-1 border-b border-transparent pb-0.5`}
          />
        </article>

        <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Travelers</p>
            <FieldHint detected={draft.travelers !== undefined} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <label htmlFor="checklist-travelers" className="sr-only">Number of travelers</label>
            <input
              id="checklist-travelers"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              value={draft.travelers ?? ''}
              placeholder="—"
              onChange={(e) => setCount(e.target.value)}
              className={`${inputClass} w-20 border-b border-transparent pb-0.5`}
            />
            <span className="text-xs text-tourflow-textMuted">{draft.travelerLabel ?? 'Count not detected'}</span>
          </div>
        </article>

        <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Dates & Duration</p>
            <FieldHint detected={draft.durationDays !== undefined} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="checklist-start-date" className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">
                Start
              </label>
              <input
                id="checklist-start-date"
                type="date"
                value={draft.startDate ?? ''}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tourflow-cardBorder bg-tourflow-bg px-2 py-2 text-sm font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary"
              />
            </div>
            <div>
              <label htmlFor="checklist-end-date" className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">
                End
              </label>
              <input
                id="checklist-end-date"
                type="date"
                value={draft.endDate ?? ''}
                min={draft.startDate ?? undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-tourflow-cardBorder bg-tourflow-bg px-2 py-2 text-sm font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary"
              />
            </div>
          </div>
          {dateError ? (
            <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
              {dateError}
            </p>
          ) : null}
          <div className="mt-2 text-xs text-tourflow-textMuted" aria-live="polite">
            {draft.startDate && draft.endDate && durationDaysFromRange(draft.startDate, draft.endDate) !== undefined ? (
              <>
                <p className="text-sm font-bold text-tourflow-dark">
                  {tripDateRangeLabel(draft.startDate, draft.endDate)}
                </p>
                <p>{draft.durationDays ? daysNightsLabel(draft.durationDays) : ''}</p>
              </>
            ) : draft.startDate ? (
              <p>
                Starts {formatTripDate(draft.startDate)} — now select the <strong>end date</strong>.
              </p>
            ) : draft.endDate ? (
              <p>
                Ends {formatTripDate(draft.endDate)} — now select the <strong>start date</strong>.
              </p>
            ) : draft.durationDays ? (
              <p>
                {daysNightsLabel(draft.durationDays)} (from prompt) — pick dates for an exact range.
              </p>
            ) : (
              <p>Duration not detected — pick start and end dates.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">
              Travel Style <span className="font-semibold normal-case text-tourflow-textMuted/70">· Optional</span>
            </p>
            <FieldHint detected={draft.style !== undefined} />
          </div>
          <label htmlFor="checklist-style" className="sr-only">Travel style</label>
          <input
            id="checklist-style"
            value={draft.style ?? ''}
            placeholder="Not specified — e.g. Relaxed"
            onChange={(e) => updateDraft({ style: e.target.value.trim() ? e.target.value : undefined })}
            className={`${inputClass} mt-1 border-b border-transparent pb-0.5`}
          />
        </article>

        <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Trip Budget (₹)</p>
            <FieldHint detected={draft.budgetAmount !== undefined} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <label htmlFor="checklist-budget" className="sr-only">Trip budget in rupees</label>
            <input
              id="checklist-budget"
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.budgetAmount ?? ''}
              placeholder="—"
              onChange={(e) => setBudget(e.target.value)}
              className={`${inputClass} w-32 border-b border-transparent pb-0.5`}
            />
            <span className="text-xs text-tourflow-textMuted">
              {draft.budgetLabel ? `${draft.budgetLabel} Total` : 'Budget not detected'}
            </span>
          </div>
        </article>
      </div>

      <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-xs font-semibold text-tourflow-sage">
        ✓ Values come from your prompt — edit anything before generating. Mock itinerary only, no real prices.
      </p>

      <button
        type="button"
        disabled={creating}
        onClick={() => {
          if (creating) return;
          setCreating(true);
          navigate('/loading');
        }}
        className="w-full rounded-2xl bg-tourflow-primary px-4 py-3.5 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover disabled:opacity-70"
      >
        {creating ? 'Starting…' : 'Generate Itinerary'}
      </button>
    </div>
  );
}
