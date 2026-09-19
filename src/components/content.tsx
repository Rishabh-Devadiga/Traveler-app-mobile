import { useState } from 'react';
import type { ReactNode } from 'react';
import type {
  ChatMessage,
  ItineraryStop,
  PossibleOption,
  ProfileInfoRow,
  ProfileMenuItem,
  RestaurantPick,
  StayOption,
} from '../types';
import { formatINR } from '../utils/format';

/** Image with a clean inline fallback — never a broken-image icon, never a fake photo. */
export function SafeImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className ?? ''} flex items-center justify-center bg-tourflow-surfaceMuted text-xl text-tourflow-textMuted`}
      >
        <span aria-hidden="true">✦</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const STOP_TYPE_ICONS: Record<string, string> = {
  Stay: '🏨',
  Activity: '🎯',
  Transport: '🚌',
  Meal: '🍽️',
  Leisure: '🌿',
  Note: '📝',
};

export function TimelineStopCard({ stop, footer }: { stop: ItineraryStop; footer?: ReactNode }) {
  const timeRange = [stop.time, stop.endTime].filter(Boolean).join(' – ');
  const typeLabel = stop.tags[0] ?? 'Stop';
  // Leisure placeholders (free days the backend guarantees per 1..duration)
  // render as relaxed free-time cards, never as empty days.
  const isLeisure = typeLabel === 'Leisure';
  return (
    <li className="relative pl-10">
      <span
        aria-hidden="true"
        className="absolute left-4 top-4 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-tourflow-primary"
      />
      <article
        className={`overflow-hidden rounded-2xl border shadow-soft ${
          isLeisure ? 'border-tourflow-sageBorder bg-tourflow-sageLight/50' : 'border-tourflow-cardBorder bg-white'
        }`}
      >
        {stop.imageUrl ? (
          <SafeImage src={stop.imageUrl} alt={stop.imageAlt ?? stop.title} className="h-36 w-full object-cover" />
        ) : (
          <div
            role="img"
            aria-label={`${typeLabel} stop`}
            className={`flex h-16 w-full items-center justify-center gap-2 ${
              isLeisure ? 'bg-tourflow-sageLight text-tourflow-sage' : 'bg-tourflow-surfaceMuted text-tourflow-textMuted'
            }`}
          >
            <span aria-hidden="true" className="text-xl">
              {STOP_TYPE_ICONS[typeLabel] ?? '📍'}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide">
              {isLeisure ? 'Free time' : typeLabel}
            </span>
          </div>
        )}
        <div className="p-3">
          {timeRange ? (
            <p className="text-[11px] font-bold uppercase tracking-wide text-tourflow-textMuted">{timeRange}</p>
          ) : null}
          <h4 className="mt-0.5 text-sm font-bold text-tourflow-dark">{stop.title}</h4>
          {stop.location ? <p className="mt-0.5 text-[11px] text-tourflow-textMuted">📍 {stop.location}</p> : null}
          {stop.description ? <p className="mt-1 text-xs text-tourflow-textMuted">{stop.description}</p> : null}
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
          {footer ? <div className="mt-2 flex flex-wrap gap-2">{footer}</div> : null}
        </div>
      </article>
    </li>
  );
}

/** Real catalog stay. No booking/deep-link exists in backend data, so none is shown. */
export function StayCard({ stay }: { stay: StayOption }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-card">
      <div className="relative">
        <SafeImage src={stay.heroImage} alt={`${stay.name} photo`} className="h-32 w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-tourflow-dark/85 px-2 py-0.5 text-[11px] font-bold text-white">
          {stay.badge.replace(/_/g, ' ')} · ★ {stay.rating}
        </span>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-tourflow-dark">{stay.name}</h4>
        <p className="text-[11px] text-tourflow-textMuted">{stay.location}</p>
        <p className="mt-1 text-xs text-tourflow-textMuted">{stay.roomType}</p>
        {stay.amenities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stay.amenities.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-tourflow-sageLight px-2 py-0.5 text-[11px] font-semibold text-tourflow-sage"
              >
                {amenity}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs italic text-tourflow-textMuted">{stay.whyItMatches}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm font-extrabold text-tourflow-dark">{formatINR(stay.totalPrice)}</span>
          <span className="text-[11px] text-tourflow-textMuted">
            {formatINR(stay.pricePerNight)} / night · {stay.nights} night(s)
          </span>
        </div>
      </div>
    </article>
  );
}

/** Real catalog activity alternative. Display only — no booking actions in this phase. */
export function OptionCard({ option }: { option: PossibleOption }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
      <div className="relative">
        <SafeImage src={option.imageUrl} alt={`${option.title} photo`} className="h-28 w-full object-cover" />
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
          {option.duration}
        </span>
      </div>
      <div className="p-3">
        <h4 className="truncate text-sm font-bold text-tourflow-dark">{option.title}</h4>
        <p className="mt-0.5 truncate text-[11px] text-tourflow-textMuted">📍 {option.location}</p>
        {option.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-tourflow-textMuted">{option.description}</p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-tourflow-surfaceMuted px-2 py-0.5 text-[11px] font-semibold capitalize">
            {option.walkingIntensity} walk
          </span>
          <span className="text-xs font-extrabold text-tourflow-dark">{formatINR(option.cost)}</span>
        </div>
      </div>
    </article>
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

export function ProfileInfoCard({ rows, onEdit }: { rows: ProfileInfoRow[]; onEdit?: (id: string) => void }) {
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
          <button
            type="button"
            aria-label={`Edit ${row.label}`}
            onClick={onEdit ? () => onEdit(row.id) : undefined}
            className="text-xs font-bold text-tourflow-primary"
          >
            Edit
          </button>
        </div>
      ))}
    </section>
  );
}

export function ProfileMenuCard({ title, items, onSelect }: { title: string; items: ProfileMenuItem[]; onSelect?: (id: string) => void }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-tourflow-cardBorder bg-white shadow-soft">
      <h3 className="border-b border-tourflow-cardBorder px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-tourflow-textMuted">
        {title}
      </h3>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={onSelect ? () => onSelect(item.id) : undefined}
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
