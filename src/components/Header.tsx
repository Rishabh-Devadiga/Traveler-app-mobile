import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  /** Initial letter shown when there is no avatar image (backend profile). */
  avatarInitial?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, subtitle, avatarUrl, avatarInitial, showBack, onBack }: HeaderProps) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);
  return (
    <header className="sticky top-0 z-40 border-b border-tourflow-cardBorder bg-tourflow-bg/90 pt-safe backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full text-tourflow-dark transition-colors hover:bg-tourflow-surfaceMuted"
            >
              ←
            </button>
          ) : (
            <Link
              to="/home-explore"
              aria-label="TourFlow home"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-tourflow-primary to-[#FF7A45] text-white shadow-md shadow-tourflow-primary/25"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" />
              </svg>
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-tourflow-dark">{title}</h1>
              <span className="hidden rounded-full border border-tourflow-sageBorder bg-tourflow-sageLight px-2 py-0.5 text-[11px] font-semibold text-tourflow-sage sm:inline-flex">
                TourFlow
              </span>
            </div>
            {subtitle ? <p className="text-xs text-tourflow-textMuted">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full text-tourflow-dark transition-colors hover:bg-tourflow-surfaceMuted"
          >
            <span aria-hidden="true">🔔</span>
          </button>
          {avatarUrl && !imgFailed ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="h-9 w-9 overflow-hidden rounded-full border border-tourflow-cardBorder bg-tourflow-surfaceMuted"
            >
              <img
                src={avatarUrl}
                alt="Traveler avatar"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover"
              />
            </Link>
          ) : avatarInitial ? (
            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-tourflow-cardBorder bg-tourflow-primarySoft text-sm font-extrabold text-tourflow-primary"
            >
              {avatarInitial}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
