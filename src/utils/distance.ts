/**
 * Straight-line (haversine) distance helpers for stay proximity.
 *
 * Estimates only: straight-line distance underestimates real road travel,
 * so callers must present results as approximate ("~X km"), never as exact
 * routing or travel-time data. Returns null when any coordinate is missing
 * or invalid so callers fall back to the unsorted order.
 */

export function haversineKm(
  aLat: number | null | undefined,
  aLng: number | null | undefined,
  bLat: number | null | undefined,
  bLng: number | null | undefined,
): number | null {
  if (
    typeof aLat !== 'number' ||
    typeof aLng !== 'number' ||
    typeof bLat !== 'number' ||
    typeof bLng !== 'number' ||
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng)
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const arc =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, arc))));
}

/** "~X km" label for a distance, or null when it cannot be estimated. */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) return null;
  return `~${Math.round(km)} km`;
}
