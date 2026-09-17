import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChecklistCard } from '../components/trip';
import { budgetSummary, checklistItems, checklistQuote } from '../mocks/traveler';

export default function TripChecklist() {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-sage">Step 2 of 3 · Trip Checklist · 5/5 Captured</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tourflow-sageBorder" aria-hidden="true">
          <div className="h-full w-full rounded-full bg-tourflow-sage" />
        </div>
      </div>

      <blockquote className="rounded-2xl bg-tourflow-dark p-3 text-xs italic leading-relaxed text-white">
        “{checklistQuote}”
      </blockquote>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Trip Checklist</h2>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="text-xs font-bold text-tourflow-primary"
          aria-pressed={editMode}
        >
          {editMode ? 'Done' : 'Edit All'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {checklistItems.map((item) => (
          <div key={item.id} className={editMode ? 'rounded-2xl ring-2 ring-tourflow-primary/60' : ''}>
            <ChecklistCard item={item} />
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft" aria-label="Trip budget">
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Trip Budget</p>
        <p className="mt-1 text-lg font-extrabold text-tourflow-dark">{budgetSummary.total}</p>
        <p className="text-xs text-tourflow-textMuted">
          {budgetSummary.perPerson} · {budgetSummary.tier}
        </p>
        <p className="mt-1 text-xs text-tourflow-dark">{budgetSummary.interests}</p>
      </section>

      <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-xs font-semibold text-tourflow-sage">
        ✓ Checklist verified — palace queues, lake cafes and sunset windows checked.
      </p>

      <button
        type="button"
        onClick={() => navigate('/loading')}
        className="w-full rounded-2xl bg-tourflow-primary px-4 py-3.5 text-sm font-bold text-white shadow-float hover:bg-tourflow-primaryHover"
      >
        Generate Itinerary
      </button>
    </div>
  );
}
