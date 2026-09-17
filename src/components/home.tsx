import type { Category, Destination } from '../types';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-bold tracking-tight text-tourflow-dark">{title}</h2>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-tourflow-primary hover:text-tourflow-primaryHover"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function SearchBar({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 rounded-full border border-tourflow-cardBorder bg-white p-2 pl-4 shadow-soft"
      role="search"
    >
      <span aria-hidden="true">✦</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Ask TourFlow AI"
        className="w-full bg-transparent text-sm text-tourflow-dark outline-none placeholder:text-tourflow-textMuted"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-tourflow-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-tourflow-primaryHover"
      >
        Ask
      </button>
    </form>
  );
}

export function FilterPills({
  items,
  activeId,
  onSelect,
}: {
  items: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Filter destinations">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'border-tourflow-primary bg-tourflow-primary text-white'
                : 'border-tourflow-cardBorder bg-white text-tourflow-dark hover:border-tourflow-primary'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function DestinationCard({ destination, onPlan }: { destination: Destination; onPlan: (id: string) => void }) {
  return (
    <article className="w-[240px] shrink-0 overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-card sm:w-[274px]">
      <div className="relative h-32 w-full overflow-hidden bg-tourflow-surfaceMuted">
        <img src={destination.imageUrl} alt={destination.imageAlt} loading="lazy" className="h-full w-full object-cover" />
        {destination.tag ? (
          <span className="absolute left-2 top-2 rounded-full bg-tourflow-dark/85 px-2 py-0.5 text-[11px] font-bold text-white">
            {destination.tag}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-bold text-tourflow-dark">{destination.name}</h3>
        <p className="text-xs text-tourflow-textMuted">{destination.reviewsLabel}</p>
        <p className="text-xs font-semibold text-tourflow-dark">
          {destination.pricePerPerson} · <span className="font-normal">{destination.idealDays}</span>
        </p>
        <button
          type="button"
          onClick={() => onPlan(destination.id)}
          className="mt-2 w-full rounded-full bg-tourflow-primarySoft px-3 py-1.5 text-xs font-bold text-tourflow-primary transition-colors hover:bg-tourflow-primary hover:text-white"
        >
          Plan {destination.name.split(',')[0]} Journey
        </button>
      </div>
    </article>
  );
}

export function CategoryGrid({ items }: { items: Category[] }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col items-center gap-1 text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-tourflow-cardBorder bg-white text-lg shadow-soft"
          >
            ✦
          </span>
          <span className="text-[11px] font-semibold text-tourflow-dark">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PrimaryButton({
  label,
  onClick,
  to,
}: {
  label: string;
  onClick?: () => void;
  to?: string;
}) {
  const className =
    'block w-full rounded-full bg-tourflow-primary px-4 py-3.5 text-center text-sm font-bold text-white shadow-float transition-colors hover:bg-tourflow-primaryHover';
  if (to) {
    // Rendered as button-styled link by the caller via react-router in pages.
    return (
      <button type="button" onClick={onClick} className={className}>
        {label}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
