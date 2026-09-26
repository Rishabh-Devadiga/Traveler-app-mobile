import { SparkIcon } from './icons';

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shared empty state — centered mark, title, body, optional CTA. */
export default function EmptyState({ title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-tourflow-cardBorder bg-white p-8 text-center shadow-card">
      <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-tourflow-primarySoft text-tourflow-primary">
        <SparkIcon size={24} />
      </span>
      <h3 className="text-[15px] font-extrabold text-tourflow-dark">{title}</h3>
      {body ? <p className="max-w-xs text-[13px] leading-relaxed text-tourflow-textMuted">{body}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-2 min-h-[44px] rounded-full bg-tourflow-primary px-6 py-2.5 text-[14px] font-bold text-white shadow-float hover:bg-tourflow-primaryHover">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
