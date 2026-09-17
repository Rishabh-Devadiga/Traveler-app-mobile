import { useState } from 'react';
import { ChatBubble, RestaurantCard, SuggestionChips } from '../components/content';
import type { ChatMessage } from '../types';
import {
  aiGuide,
  aiGuideMessages,
  aiGuideSuggestions,
  bookingItems,
  restaurantPicks,
  todayPlan,
} from '../mocks/traveler';

function mockReply(input: string): string {
  const text = input.toLowerCase();
  if (text.includes('spent') || text.includes('budget')) {
    return `You've used ${aiGuide.budgetUsed} of your ${aiGuide.budgetTotal} allocation (81%). Biggest spends: stay and the sunset boat. Want a cheaper Day 4?`;
  }
  if (text.includes('pack')) {
    return 'Pack layers for 16°C mornings, sunscreen, and walking shoes. Rohtang needs a permit (₹550) — I can start it for you.';
  }
  if (text.includes('booking')) {
    return 'Hotel Apple Country Resort is confirmed (#TF-9428, checkout Oct 21). Rohtang permit still needs action.';
  }
  return 'Noted — I’ll adjust Day 4 around that and keep your vegetarian preference. The Old Manali bazaar cab is 10 mins away.';
}

export default function AiGuide() {
  const [messages, setMessages] = useState<ChatMessage[]>(aiGuideMessages);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showTripPanel, setShowTripPanel] = useState(false);
  const [confirmed, setConfirmed] = useState<string[]>([]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: clean }]);
    setDraft('');
    setThinking(true);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'ai', text: mockReply(clean) }]);
      setThinking(false);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-3xl border border-tourflow-cardBorder bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-tourflow-cardBorder p-3">
          <div>
            <p className="text-sm font-extrabold">{aiGuide.headerTitle}</p>
            <p className="text-xs text-tourflow-textMuted">
              {aiGuide.dayLabel} · {aiGuide.stopsLeft}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-tourflow-sageLight px-2.5 py-1 text-[11px] font-bold text-tourflow-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-tourflow-sage animate-pulse-dot" aria-hidden="true" />
            {aiGuide.contextPill}
          </span>
        </div>

        <div className="flex max-h-[52vh] flex-1 flex-col gap-2 overflow-y-auto p-3 thin-scroll" aria-live="polite">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {thinking ? (
            <div className="flex gap-1 p-1" aria-label="TourFlow is typing">
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
              <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-tourflow-cardBorder p-3">
          <SuggestionChips items={aiGuideSuggestions} onPick={send} />
          <div className="grid gap-2 sm:grid-cols-2">
            {restaurantPicks.map((pick) => (
              <RestaurantCard
                key={pick.id}
                pick={pick}
                onAdd={(id) => setConfirmed((prev) => (prev.includes(id) ? prev : [...prev, id]))}
              />
            ))}
          </div>
          {confirmed.length > 0 ? (
            <p className="rounded-xl bg-tourflow-sageLight px-3 py-2 text-xs font-semibold text-tourflow-sage" role="status">
              ✓ {confirmed.length} place(s) added to Day 4 (mock, no backend).
            </p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="guide-input" className="sr-only">
              Ask your travel guide
            </label>
            <input
              id="guide-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={aiGuide.inputPlaceholder}
              className="w-full rounded-full border border-tourflow-cardBorder bg-tourflow-bg px-4 py-2.5 text-sm outline-none focus:border-tourflow-primary"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-tourflow-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-tourflow-primaryHover"
            >
              Send
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowTripPanel((v) => !v)}
            className="w-full rounded-full border border-tourflow-cardBorder py-2 text-xs font-bold lg:hidden"
            aria-expanded={showTripPanel}
          >
            {showTripPanel ? 'Hide trip context' : 'Show trip context'}
          </button>
        </div>
      </section>

      <aside
        className={`${showTripPanel ? 'flex' : 'hidden'} w-full flex-col gap-3 lg:flex lg:w-80`}
        aria-label="Trip context"
      >
        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">Your Trip</p>
          <h3 className="mt-1 text-base font-extrabold">{aiGuide.tripTitle}</h3>
          <p className="text-xs text-tourflow-textMuted">{aiGuide.tripProgress}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-tourflow-surfaceMuted" aria-hidden="true">
            <div className="h-full w-[43%] rounded-full bg-gradient-to-r from-tourflow-primary to-[#FF7A45]" />
          </div>
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Today&apos;s Plan</h3>
          <ul className="mt-2 space-y-2">
            {todayPlan.map((item) => (
              <li key={item.id} className="flex gap-2 text-xs">
                <span aria-hidden="true">{item.done ? '✓' : item.current ? '●' : '○'}</span>
                <span>
                  <span className="font-bold">{item.time} · </span>
                  {item.title} — {item.subtitle}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Trip Budget Pulse</h3>
          <p className="mt-1 text-lg font-extrabold">
            {aiGuide.budgetUsed} <span className="text-xs font-normal text-tourflow-textMuted">of {aiGuide.budgetTotal}</span>
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-tourflow-surfaceMuted" aria-hidden="true">
            <div className="h-full rounded-full bg-tourflow-sage" style={{ width: `${aiGuide.budgetPercent}%` }} />
          </div>
          <button
            type="button"
            onClick={() => send('How much have I spent?')}
            className="mt-2 w-full rounded-full bg-tourflow-surfaceMuted py-1.5 text-xs font-bold hover:bg-tourflow-primarySoft hover:text-tourflow-primary"
          >
            Audit spend
          </button>
        </section>

        <section className="rounded-3xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
          <h3 className="text-sm font-bold">Bookings</h3>
          <ul className="mt-2 space-y-2">
            {bookingItems.map((b) => (
              <li key={b.id} className="rounded-xl bg-tourflow-bg p-2 text-xs">
                <p className="font-bold">{b.label}</p>
                <p className="text-tourflow-textMuted">{b.detail}</p>
                <p className="mt-0.5 font-semibold text-tourflow-sage">{b.status}</p>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
