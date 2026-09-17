import type { ChatMessage, ItineraryStop, ProfileInfoRow, ProfileMenuItem, RestaurantPick } from '../types';

export function TimelineStopCard({ stop }: { stop: ItineraryStop }) {
  return (
    <li className="relative pl-10">
      <span
        aria-hidden="true"
        className="absolute left-4 top-4 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-tourflow-primary"
      />
      <article className="rounded-2xl border border-tourflow-cardBorder bg-white p-3 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">{stop.time}</p>
        <h4 className="mt-0.5 text-sm font-bold text-tourflow-dark">{stop.title}</h4>
        <p className="mt-1 text-xs text-tourflow-textMuted">{stop.description}</p>
        {stop.imageUrl ? (
          <img src={stop.imageUrl} alt={stop.imageAlt ?? stop.title} loading="lazy" className="mt-2 h-36 w-full rounded-xl object-cover" />
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {stop.badge ? (
            <span className="rounded-full bg-tourflow-dark px-2 py-0.5 text-[11px] font-bold text-white">{stop.badge}</span>
          ) : null}
          {stop.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-tourflow-surfaceMuted px-2 py-0.5 text-[11px] font-semibold text-tourflow-dark"
            >
              {tag}
            </span>
          ))}
          {stop.costLabel ? (
            <span className="ml-auto text-[11px] font-bold text-tourflow-sage">{stop.costLabel}</span>
          ) : null}
        </div>
      </article>
    </li>
  );
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isAi = message.role === 'ai';
  return (
    <div className={`msg-fade-in flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-soft ${
          isAi
            ? 'rounded-bl-md border border-tourflow-sageBorder bg-white text-tourflow-dark'
            : 'rounded-br-md bg-tourflow-dark text-white'
        }`}
      >
        {message.text}
      </p>
    </div>
  );
}

export function SuggestionChips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Suggested questions">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="shrink-0 rounded-full border border-tourflow-cardBorder bg-white px-3 py-1.5 text-xs font-semibold text-tourflow-dark hover:border-tourflow-primary hover:text-tourflow-primary"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function RestaurantCard({ pick, onAdd }: { pick: RestaurantPick; onAdd: (id: string) => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-card">
      <img src={pick.imageUrl} alt={pick.imageAlt} loading="lazy" className="h-28 w-full object-cover" />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-bold">{pick.name}</h4>
          <span className="shrink-0 rounded-full bg-tourflow-sageLight px-2 py-0.5 text-[11px] font-bold text-tourflow-sage">
            {pick.matchLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-tourflow-textMuted">
          {pick.area} · ★ {pick.rating} {pick.reviews}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-bold">{pick.priceForTwo}</span>
          <button
            type="button"
            onClick={() => onAdd(pick.id)}
            className="rounded-full bg-tourflow-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-tourflow-primaryHover"
          >
            Add to Day 4
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProfileInfoCard({ rows }: { rows: ProfileInfoRow[] }) {
  return (
    <section className="rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft" aria-label="Personal information">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? 'border-t border-tourflow-cardBorder' : ''}`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">{row.label}</p>
            <p className="text-sm font-semibold text-tourflow-dark">
              {row.value} {row.verified ? <span className="text-xs text-tourflow-sage">· Verified</span> : null}
            </p>
          </div>
          <button type="button" aria-label={`Edit ${row.label}`} className="text-xs font-bold text-tourflow-primary">
            Edit
          </button>
        </div>
      ))}
    </section>
  );
}

export function ProfileMenuCard({ title, items }: { title: string; items: ProfileMenuItem[] }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
      <h3 className="border-b border-tourflow-cardBorder px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
        {title}
      </h3>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-tourflow-bg"
        >
          <span>
            <span className="block text-sm font-bold text-tourflow-dark">{item.title}</span>
            <span className="block text-xs text-tourflow-textMuted">{item.subtitle}</span>
          </span>
          <span aria-hidden="true" className="text-tourflow-textMuted">
            ›
          </span>
        </button>
      ))}
    </section>
  );
}
