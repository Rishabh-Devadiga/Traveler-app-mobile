import type { Category, Destination } from '../types';
import { SafeImage } from './content';
import { SearchIcon, SparkIcon } from './icons';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[17px] font-bold tracking-tight text-tourflow-dark">{title}</h2>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="min-h-[44px] px-2 text-[13px] font-bold text-tourflow-primary hover:text-tourflow-primaryHover"
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
      className="flex min-h-[52px] items-center gap-2 rounded-full border border-tourflow-cardBorder bg-white p-2 pl-4 shadow-soft"
      role="search"
    >
      <span aria-hidden="true" className="text-tourflow-textMuted">
        <SearchIcon size={20} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Describe your trip"
        className="w-full min-w-0 bg-transparent text-[16px] text-tourflow-dark outline-none placeholder:text-tourflow-textMuted"
      />
      <button
        type="submit"
        className="min-h-[44px] shrink-0 rounded-full bg-tourflow-primary px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-tourflow-primaryHover"
      >
        Plan
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
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="tablist" aria-label="Filter destinations">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`min-h-[36px] shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
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

export function DestinationCard({ destination, onPlan, className }: { destination: Destination; onPlan: (id: string) => void; className?: string }) {
  return (
    <article className={`w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-tourflow-cardBorder bg-white shadow-card sm:w-[274px]${className ? ` ${className}` : ''}`}>
      <div className="relative h-36 w-full overflow-hidden bg-tourflow-surfaceMuted">
        <SafeImage
          src={destination.imageUrl}
          alt={destination.imageAlt}
          className="h-full w-full object-cover"
        />
        {destination.tag ? (
          <span className="absolute left-2 top-2 rounded-full bg-tourflow-dark/85 px-2 py-0.5 text-[11px] font-bold text-white">
            {destination.tag}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="clamp-2 min-h-[40px] text-[15px] font-bold leading-snug text-tourflow-dark">{destination.name}</h3>
        {destination.reviewsLabel ? (
          <p className="truncate text-[13px] text-tourflow-textMuted">{destination.reviewsLabel}</p>
        ) : null}
        {destination.subThemes && destination.subThemes.length > 0 ? (
          <p className="truncate text-xs font-medium text-tourflow-textMuted">
            {destination.subThemes.slice(0, 2).join(' · ')}
          </p>
        ) : null}
        <p className="text-[13px] font-semibold text-tourflow-dark">
          {destination.pricePerPerson} · <span className="font-normal">{destination.idealDays}</span>
        </p>
        <button
          type="button"
          onClick={() => onPlan(destination.id)}
          className="mt-1 min-h-[44px] w-full rounded-full bg-tourflow-primarySoft px-3 py-2 text-[13px] font-bold text-tourflow-primary transition-colors hover:bg-tourflow-primary hover:text-white"
        >
          Plan →
        </button>
      </div>
    </article>
  );
}

export function CategoryGrid({ items, onSelect }: { items: Category[]; onSelect?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => {
        const content = (
          <>
            {item.imageUrl ? (
              <span className="h-14 w-14 overflow-hidden rounded-full border border-tourflow-cardBorder shadow-soft">
                <SafeImage
                  src={item.imageUrl}
                  alt={item.imageAlt ?? `${item.label} photo`}
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-tourflow-cardBorder bg-white text-tourflow-primary shadow-soft"
              >
                <SparkIcon size={22} />
              </span>
            )}
            <span className="clamp-2 w-full text-xs font-semibold leading-tight text-tourflow-dark">{item.label}</span>
          </>
        );
        return onSelect ? (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-label={`Explore ${item.label} destinations`}
            className="flex min-h-[44px] min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-transform active:scale-95"
          >
            {content}
          </button>
        ) : (
          <div key={item.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
            {content}
          </div>
        );
      })}
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
