import { useState } from 'react';
import type { SimulationResponse } from '../types';
import { simulateTrip } from '../api/trips';
import { ApiError } from '../api/client';

const SCENARIOS = [
  { id: '', label: 'Current Weather' },
  { id: 'heavy_rain', label: 'Heavy Rain' },
  { id: 'high_wind', label: 'High Wind' },
  { id: 'severe', label: 'Severe Weather' },
  { id: 'unavailable', label: 'Unavailable' },
] as const;

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'low':
      return 'text-tourflow-sage';
    case 'moderate':
      return 'text-yellow-600';
    case 'high':
      return 'text-orange-600';
    case 'severe':
      return 'text-red-600';
    default:
      return 'text-tourflow-textMuted';
  }
}

function impactTypeLabel(impactType: string | undefined): string {
  switch ((impactType || '').toLowerCase()) {
    case 'none':
      return 'No impact';
    case 'delay':
      return 'Delay';
    case 'modified':
      return 'Modified';
    case 'postponed':
      return 'Postponed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

function actionLabel(action: string | undefined): string {
  switch ((action || '').toLowerCase()) {
    case 'no_change':
      return 'No change';
    case 'monitor':
      return 'Monitor';
    case 'reschedule':
      return 'Reschedule';
    case 'move_indoors':
      return 'Move indoors';
    case 'cancel':
      return 'Cancel';
    default:
      return '—';
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      const detail = typeof err.detail === 'string' ? err.detail : '';
      if (detail.includes('Not Found')) {
        return 'Simulation service not found. Please ensure the backend is up to date.';
      }
      return 'Trip could not be found. Please refresh the trip and try again.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'You are not authorized to simulate this trip.';
    }
    if (err.status === 502 || err.status === 503) {
      return 'Simulation service is temporarily unavailable.';
    }
    if (err.code === 'timeout') {
      return 'Simulation request timed out. Please try again.';
    }
    return err.message || 'Simulation failed';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Simulation failed';
}

interface SimulationCardProps {
  tripId: string;
}

export function SimulationCard({ tripId }: SimulationCardProps) {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await simulateTrip(tripId, scenario || undefined);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[15px] font-bold text-tourflow-dark">Trip Simulation</span>
      </div>
      <p className="text-[11px] text-tourflow-textMuted mb-3">
        This is a what-if simulation. Your actual itinerary will not be changed.
      </p>

      <div className="mb-3">
        <label className="text-[12px] font-semibold text-tourflow-dark block mb-1.5">
          What-if scenario
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                scenario === s.id
                  ? 'bg-tourflow-primary text-white border-tourflow-primary'
                  : 'bg-white text-tourflow-textMuted border-tourflow-cardBorder hover:border-tourflow-primary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="w-full rounded-full bg-tourflow-primary px-4 py-2.5 text-[13px] font-bold text-white hover:bg-tourflow-primaryHover disabled:opacity-60 transition-colors"
      >
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </button>

      {error && (
        <p className="mt-3 text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          {result.affected_items.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-tourflow-dark mb-1.5">
                {result.affected_items.length} item{result.affected_items.length === 1 ? '' : 's'} affected
              </p>
              <ul className="space-y-1.5">
                {result.affected_items.map((item) => (
                  <li
                    key={item.item_id}
                    className="rounded-xl bg-tourflow-surfaceMuted px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-tourflow-dark">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${severityColor(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-tourflow-textMuted mt-0.5">{item.reason}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-tourflow-textMuted">
                        {impactTypeLabel(item.impact_type)}
                      </span>
                      {item.recommended_action && (
                        <span className="text-[10px] text-tourflow-textMuted">
                          · {actionLabel(item.recommended_action)}
                        </span>
                      )}
                    </div>
                    {item.estimated_delay_minutes != null && item.estimated_delay_minutes > 0 && (
                      <p className="text-[10px] text-tourflow-textMuted mt-0.5">
                        Est. delay: {item.estimated_delay_minutes} min
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.dependencies.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-tourflow-dark mb-1.5">Dependencies</p>
              <ul className="space-y-1">
                {result.dependencies.map((dep, i) => (
                  <li key={i} className="rounded-xl bg-tourflow-surfaceMuted px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-tourflow-dark">{dep.source_title}</span>
                      <span className="text-tourflow-textMuted">→</span>
                      <span className="font-semibold text-tourflow-dark">{dep.target_title}</span>
                    </div>
                    <p className="text-[10px] text-tourflow-textMuted mt-0.5">{dep.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.conflicts.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-tourflow-dark mb-1.5">Conflicts</p>
              <ul className="space-y-1">
                {result.conflicts.map((conflict, i) => (
                  <li key={i} className="rounded-xl bg-red-50 px-3 py-2">
                    <span className="text-[11px] font-semibold text-red-700">{conflict.item_title}</span>
                    <p className="text-[10px] text-red-600 mt-0.5">{conflict.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-tourflow-surfaceMuted px-3 py-2">
            <span className="text-[12px] font-semibold text-tourflow-dark">Replanning Required</span>
            <span
              className={`text-[12px] font-bold ${
                result.replanning_required ? 'text-red-600' : 'text-tourflow-sage'
              }`}
            >
              {result.replanning_required ? 'Yes' : 'No'}
            </span>
          </div>

          <p className="text-[10px] text-tourflow-textMuted">
            Simulated at {new Date(result.simulation_timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </section>
  );
}
