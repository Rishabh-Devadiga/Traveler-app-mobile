import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTripDraft } from '../state/useTripDraft';
import { Stepper } from '../components/trip';
import { CalendarIcon, MapPinIcon, MinusIcon, PlusIcon, UsersIcon, WalletIcon } from '../components/icons';
import { formatINR } from '../utils/format';
import { daysNightsLabel, durationDaysFromRange, formatTripDate, tripDateRangeLabel } from '../utils/dates';

const inputClass =
  'w-full rounded-xl border border-tourflow-cardBorder bg-white px-3 py-2.5 text-[16px] font-semibold text-tourflow-dark outline-none placeholder:font-normal placeholder:text-tourflow-textMuted/60 focus:border-tourflow-primary';

function FieldHint({ detected }: { detected: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
        detected ? 'bg-tourflow-sageLight text-tourflow-sage' : 'bg-tourflow-surfaceMuted text-tourflow-textMuted'
      }`}
    >
      {detected ? 'Detected' : 'Not specified'}
    </span>
  );
}

function RowShell({ icon, label, hint, children }: { icon: React.ReactNode; label: string; hint: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-tourflow-surfaceMuted text-tourflow-primary">{icon}</span>
          {label}
        </p>
        {hint}
      </div>
      <div className="mt-2">{children}</div>
    </article>
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
    <div className="flex flex-col gap-5">
      <div>
        <Stepper steps={['Intent', 'Details', 'Trip']} current={1} />
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-tourflow-primary">
          Step 2 of 3 · Details · {capturedCount} of 5 captured
        </p>
        <h2 className="mt-1 text-[22px] font-extrabold tracking-tight">Review your trip</h2>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tourflow-surfaceMuted"
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

      <blockquote className="rounded-2xl bg-tourflow-dark p-4 text-[13px] italic leading-relaxed text-white">
        “{draft.prompt}”
      </blockquote>

      <div className="flex flex-col gap-2">
        <RowShell icon={<MapPinIcon size={18} />} label="Destination" hint={<FieldHint detected={draft.destination !== undefined} />}>
          <label htmlFor="checklist-destination" className="sr-only">Destination</label>
          <input
            id="checklist-destination"
            value={draft.destination ?? ''}
            placeholder="Not specified — e.g. Kashmir"
            onChange={(e) =>
              updateDraft({
                destination: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            className={inputClass}
          />
        </RowShell>

        <RowShell icon={<MapPinIcon size={18} />} label="Starting From" hint={<FieldHint detected={draft.origin !== undefined} />}>
          <label htmlFor="checklist-origin" className="sr-only">Starting city (origin)</label>
          <input
            id="checklist-origin"
            value={draft.origin ?? ''}
            placeholder="Not specified — e.g. Mumbai"
            onChange={(e) =>
              updateDraft({
                origin: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            className={inputClass}
          />
        </RowShell>

        <RowShell icon={<UsersIcon size={18} />} label="Travelers" hint={<FieldHint detected={draft.travelers !== undefined} />}>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Fewer travelers" onClick={() => setCount(String((draft.travelers ?? 2) - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-tourflow-cardBorder text-tourflow-dark hover:border-tourflow-primary">
              <MinusIcon size={18} />
            </button>
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
              className={`${inputClass} text-center`}
            />
            <button type="button" aria-label="More travelers" onClick={() => setCount(String((draft.travelers ?? 1) + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-tourflow-cardBorder text-tourflow-dark hover:border-tourflow-primary">
              <PlusIcon size={18} />
            </button>
          </div>
          <p className="mt-1 text-[13px] text-tourflow-textMuted">{draft.travelerLabel ?? 'Count not detected'}</p>
        </RowShell>

        <RowShell icon={<CalendarIcon size={18} />} label="Dates & Duration" hint={<FieldHint detected={draft.durationDays !== undefined} />}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="checklist-start-date" className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
                Start
              </label>
              <input
                id="checklist-start-date"
                type="date"
                value={draft.startDate ?? ''}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-tourflow-cardBorder bg-tourflow-bg px-2 py-2 text-[14px] font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary"
              />
            </div>
            <div>
              <label htmlFor="checklist-end-date" className="text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
                End
              </label>
              <input
                id="checklist-end-date"
                type="date"
                value={draft.endDate ?? ''}
                min={draft.startDate ?? undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-tourflow-cardBorder bg-tourflow-bg px-2 py-2 text-[14px] font-semibold text-tourflow-dark outline-none focus:border-tourflow-primary"
              />
            </div>
          </div>
          {dateError ? (
            <p className="mt-2 text-[13px] font-semibold text-red-700" role="alert">
              {dateError}
            </p>
          ) : null}
          <div className="mt-2 text-[13px] text-tourflow-textMuted" aria-live="polite">
            {draft.startDate && draft.endDate && durationDaysFromRange(draft.startDate, draft.endDate) !== undefined ? (
              <>
                <p className="text-[14px] font-bold text-tourflow-dark">
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
        </RowShell>

        <RowShell icon={<WalletIcon size={18} />} label="Trip Budget" hint={<FieldHint detected={draft.budgetAmount !== undefined} />}>
          <label htmlFor="checklist-budget" className="sr-only">Trip budget in rupees</label>
          <input
            id="checklist-budget"
            type="number"
            min={1}
            inputMode="numeric"
            value={draft.budgetAmount ?? ''}
            placeholder="—"
            onChange={(e) => setBudget(e.target.value)}
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[30000, 60000, 100000].map((amt) => (
              <button key={amt} type="button" onClick={() => setBudget(String(amt))} className={`min-h-[36px] rounded-full border px-3.5 py-1.5 text-[13px] font-bold ${draft.budgetAmount === amt ? 'border-tourflow-primary bg-tourflow-primary text-white' : 'border-tourflow-cardBorder bg-white text-tourflow-dark'}`}>
                {amt === 30000 ? '30k' : amt === 60000 ? '60k' : '1L'}
              </button>
            ))}
            <span className="text-[13px] text-tourflow-textMuted">
              {draft.budgetLabel ? `${draft.budgetLabel} Total` : 'Budget not detected'}
            </span>
          </div>
        </RowShell>
        <RowShell icon={<WalletIcon size={18} />} label="Other Preferences" hint={<span className="shrink-0 rounded-full bg-tourflow-surfaceMuted px-2 py-0.5 text-xs font-bold text-tourflow-textMuted">Optional</span>}>
          <label htmlFor="checklist-preferences" className="sr-only">Other preferences</label>
          <textarea
            id="checklist-preferences"
            value={draft.specialRequests ?? ''}
            placeholder="Anything else — e.g. heritage & slow evenings, pure veg food, boutique stays"
            rows={3}
            onChange={(e) =>
              updateDraft({
                specialRequests: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            className="w-full resize-none rounded-xl border border-tourflow-cardBorder bg-white p-3 text-[16px] font-medium text-tourflow-dark outline-none placeholder:font-normal placeholder:text-tourflow-textMuted/60 focus:border-tourflow-primary"
          />
        </RowShell>
      </div>

      <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-[13px] font-semibold text-tourflow-sage">
        Values come from your prompt — edit anything before generating. Transfers are researched
        automatically for your route and included in the itinerary.
      </p>

      <div className="sticky bottom-24 z-10 -mx-4 bg-gradient-to-t from-tourflow-bg via-tourflow-bg to-transparent px-4 pb-2 pt-6">
        <button
          type="button"
          disabled={creating}
          onClick={() => {
            if (creating) return;
            setCreating(true);
            navigate('/loading');
          }}
          className="min-h-[52px] w-full rounded-full bg-tourflow-primary px-4 py-3 text-[15px] font-bold text-white shadow-float hover:bg-tourflow-primaryHover disabled:opacity-70"
        >
          {creating ? 'Starting…' : 'Confirm & Generate →'}
        </button>
      </div>
    </div>
  );
}
