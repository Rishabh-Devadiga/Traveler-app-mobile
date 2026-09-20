import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown when the page crashes instead of a blank screen. */
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Page-level error boundary: a crashing page shows a retry card instead of
 * blanking the whole app. Resets whenever different children mount.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[page-error]', error);
  }

  render(): ReactNode {
    if (this.state.error) {
      const dev = import.meta.env?.DEV === true;
      return (
        <div className="flex flex-col gap-4" role="alert" aria-label={this.props.fallbackLabel ?? 'Page error'}>
          <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-red-700">Something went wrong here</p>
            <p className="mt-1 text-xs text-tourflow-textMuted">
              This page hit an unexpected error. Your data is safe — try again.
            </p>
            {dev ? (
              <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-red-50 p-2 text-[11px] text-red-800">
                {this.state.error.message}
                {this.state.error.stack ? `\n${this.state.error.stack}` : ''}
              </pre>
            ) : null}
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 w-full rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
