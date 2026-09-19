import { travelerTripName, type TravelerTripSummary } from '../api/trips';

interface TripPickerProps {
  trips: TravelerTripSummary[];
  selectedId?: string;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  onSelect: (tripId: string) => void;
  onRetry: () => void;
  onClose: () => void;
}

/**
 * Trip picker — ALWAYS fed from GET /api/traveler/trips (the logged-in
 * user's own trips). One row per trip, selected row checkmarked. No names,
 * destinations, or trips are hardcoded; everything renders from the list.
 */
export default function TripPicker({
  trips,
  selectedId,
  loading,
  error,
  disabled,
  onSelect,
  onRetry,
  onClose,
}: TripPickerProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select your trip"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-extrabold text-tourflow-dark">Your Trips</h3>
        <p className="mt-1 text-xs text-tourflow-textMuted">
          Only trips owned by you. Header, panel and Guide all follow this selection.
        </p>
        {loading ? (
          <div className="flex gap-1 p-3" aria-label="Loading your trips">
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
          </div>
        ) : error ? (
          <div role="alert" className="mt-3 rounded-2xl bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-600">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 w-full rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : trips.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-tourflow-surfaceMuted p-3 text-xs font-semibold text-tourflow-textMuted">
            No trips yet — plan a journey to create your first one.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {trips.map((trip) => {
              const selected = trip.id === selectedId;
              return (
                <li key={trip.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(trip.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left disabled:opacity-60 ${
                      selected
                        ? 'border-tourflow-primary bg-tourflow-primarySoft'
                        : 'border-tourflow-cardBorder bg-white'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-tourflow-dark">
                        {travelerTripName(trip)}
                      </span>
                      <span className="block text-xs text-tourflow-textMuted">
                        {[trip.status, trip.duration_days ? `${trip.duration_days} days` : null]
                          .filter(Boolean)
                          .join(' · ') || `Trip ${trip.id.slice(0, 8)}`}
                      </span>
                    </span>
                    {selected ? (
                      <span aria-label="Selected" className="shrink-0 text-sm font-extrabold text-tourflow-primary">
                        ✓
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-sm font-bold text-tourflow-dark"
        >
          Done
        </button>
      </div>
    </div>
  );
}
