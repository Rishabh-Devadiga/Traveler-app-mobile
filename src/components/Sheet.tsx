import type { ReactNode } from 'react';
import { CloseIcon } from './icons';

interface SheetProps {
  label: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared mobile bottom-sheet shell — backdrop, grabber, safe-area, sticky footer. */
export default function Sheet({ label, title, subtitle, onClose, children, footer }: SheetProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-tourflow-surfaceMuted" aria-hidden="true" />
        {(title || subtitle) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? <h3 className="text-[17px] font-extrabold tracking-tight text-tourflow-dark">{title}</h3> : null}
              {subtitle ? <p className="mt-0.5 text-[13px] text-tourflow-textMuted">{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tourflow-dark hover:bg-tourflow-bg">
              <CloseIcon size={20} />
            </button>
          </div>
        )}
        <div>{children}</div>
        {footer ? <div className="sticky bottom-0 -mx-5 mt-4 border-t border-tourflow-cardBorder bg-white/95 px-5 pb-safe pt-3 backdrop-blur-md">{footer}</div> : null}
      </div>
    </div>
  );
}
