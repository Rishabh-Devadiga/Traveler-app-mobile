import { travelerTripName, type TravelerTripSummary } from '../api/trips';
import { safeText } from '../api/traveler';
import AppSheet from './Sheet';
import { CheckIcon } from './icons';

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
    <AppSheet label="Select your trip" title="Your Trips" subtitle="Only trips owned by you. Header, panel and Guide all follow this selection." onClose={onClose}>
        {loading ? (
          <div className="flex gap-1 p-3" aria-label="Loading your trips">
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
            <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
          </div>
        ) : error ? (
          <div role="alert" className="mt-3 rounded-2xl bg-red-50 p-3">
            <p className="text-[13px] font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 min-h-[44px] w-full rounded-full bg-red-600 px-3 py-1.5 text-[13px] font-bold text-white"
            >
              Try Again
            </button>
          </div>
        ) : trips.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-tourflow-surfaceMuted p-3 text-[13px] font-semibold text-tourflow-textMuted">
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
                    className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left disabled:opacity-60 ${
                      selected
                        ? 'border-tourflow-primary bg-tourflow-primarySoft'
                        : 'border-tourflow-cardBorder bg-white'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-tourflow-dark">
                        {travelerTripName(trip)}
                      </span>
                      <span className="block text-[13px] text-tourflow-textMuted">
                        {[safeText(trip.status), trip.duration_days ? `${trip.duration_days} days` : null]
                          .filter(Boolean)
                          .join(' · ') || `Trip ${trip.id.slice(0, 8)}`}
                      </span>
                    </span>
                    {selected ? (
                      <span aria-label="Selected" className="shrink-0 text-tourflow-primary">
                        <CheckIcon size={20} />
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
          className="mt-4 min-h-[48px] w-full rounded-xl border border-tourflow-cardBorder bg-white px-4 py-2.5 text-[14px] font-bold text-tourflow-dark"
        >
          Done
        </button>
    </AppSheet>
  );
}
