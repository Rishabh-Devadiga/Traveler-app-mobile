import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { ApiError } from '../api/client';
import { fallbackMapFromDays, getTripMap, normalizeTripMap, type NormalizedTripMap } from '../api/trips';
import type { ItineraryDay } from '../types';

const TYPE_COLORS: Record<string, string> = {
  hotel: '#F05A28',
  stay: '#F05A28',
  activity: '#3B6E4A',
  transport: '#142018',
  meal: '#B45309',
  leisure: '#B45309',
};

function pinColor(itemType: string): string {
  return TYPE_COLORS[itemType] ?? '#5C6E61';
}

/** Escape backend strings injected into Leaflet popup HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface TripMapProps {
  tripId: string;
  dayCount: number;
  activeDay: number;
  /** Itinerary days (their stops already carry backend lat/lng) — used ONLY
   *  when the /map endpoint 404s, so the view still shows real pins. */
  fallbackDays: ItineraryDay[];
}

/**
 * Trip map view — same card language as the rest of the page. Leaflet is
 * lazy-loaded only when this mounts, so the page stays light without the map.
 * Pins come ONLY from GET /api/trips/{id}/map (never invented); stops
 * without coordinates render in the honest "no map pin" list instead.
 */
export default function TripMap({ tripId, dayCount, activeDay, fallbackDays }: TripMapProps) {
  const [data, setData] = useState<NormalizedTripMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDay, setSelectedDay] = useState(activeDay);
  const [mapReady, setMapReady] = useState(false);
  const [tilesFailing, setTilesFailing] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef(fallbackDays);
  fallbackRef.current = fallbackDays;
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layersRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setData(null);
    setFallbackNotice(false);
    getTripMap(tripId).then(
      (raw) => {
        if (!cancelled) {
          setData(normalizeTripMap(raw));
          setFallbackNotice(false);
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (cancelled) return;
        // The /map endpoint 404s for trips without a stored map — fall back
        // to the itinerary stops' own backend coordinates instead of an
        // error wall. Every other failure keeps error + retry.
        if (error instanceof ApiError && error.status === 404) {
          const fallback = fallbackMapFromDays(fallbackRef.current);
          if (fallback.pins.length > 0) {
            setData(fallback);
            setFallbackNotice(true);
            setLoading(false);
            return;
          }
        }
        setLoadError(error instanceof Error ? error.message : 'Could not load the trip map.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tripId, reloadKey]);

  const days = useMemo(
    () => Array.from({ length: Math.max(dayCount, 1) }, (_, i) => i + 1),
    [dayCount],
  );

  useEffect(() => {
    if (activeDay <= dayCount) setSelectedDay(activeDay);
    else setSelectedDay(1);
  }, [activeDay, dayCount]);

  const visiblePins = useMemo(
    () =>
      (data?.pins ?? [])
        .filter((p) => p.day === selectedDay)
        .slice()
        .sort((a, b) => a.order - b.order),
    [data, selectedDay],
  );

  const unmappedForDay = useMemo(
    () => (data?.unmapped ?? []).filter((u) => u.day === selectedDay),
    [data, selectedDay],
  );

  // Init Leaflet lazily (JS + CSS) exactly once per mount. The component only
  // mounts when the map is SHOWN, and the div carries a fixed inline height
  // from the first paint — L.map() never sees a hidden/zero-height div.
  // invalidateSize() re-asserts correct sizing after every paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !divRef.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(divRef.current, { scrollWheelZoom: false }).setView([20, 78], 4);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        tiles.on('tileerror', () => setTilesFailing(true));
        tiles.on('tileload', () => setTilesFailing(false));
        tiles.addTo(map);
        mapRef.current = map;
        layersRef.current = L.layerGroup().addTo(map);
        // Paint first, then force Leaflet to re-measure (kills stale blank canvas).
        requestAnimationFrame(() => {
          if (!cancelled && mapRef.current) {
            mapRef.current.invalidateSize();
            setMapReady(true);
          }
        });
      } catch {
        if (!cancelled) setLoadError('Could not start the map view on this device.');
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Redraw pins + dotted day-route whenever data or the day filter changes.
  // One bad stop must never blank the whole map: per-pin try/catch + skip.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!L || !map || !layers || !data) return;
    try {
      map.invalidateSize();
      layers.clearLayers();
      const plotted: typeof visiblePins = [];
      visiblePins.forEach((pin, index) => {
        try {
          const icon = L.divIcon({
            className: '',
            html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${pinColor(pin.itemType)};color:#fff;font-size:12px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${index + 1}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const lines = [`<strong>${escapeHtml(pin.title)}</strong>`];
          if (pin.time) lines.push(escapeHtml(pin.time));
          if (pin.location) lines.push(escapeHtml(pin.location));
          L.marker([pin.latitude, pin.longitude], { icon }).bindPopup(lines.join('<br/>')).addTo(layers);
          plotted.push(pin);
        } catch {
          /* skip this stop, keep the rest of the map alive */
        }
      });
      if (plotted.length > 1) {
        const line = plotted.map((p) => [p.latitude, p.longitude] as [number, number]);
        try {
          L.polyline(line, { color: '#F05A28', weight: 2.5, dashArray: '2 7' }).addTo(layers);
        } catch {
          /* route is decorative — pins matter */
        }
      }
      const targets: Array<[number, number]> = visiblePins.map((p) => [p.latitude, p.longitude]);
      if (targets.length > 0) {
        map.flyToBounds(L.latLngBounds(targets).pad(0.25), { duration: 0.5 });
        // Re-measure after the animated move settles.
        window.setTimeout(() => map.invalidateSize(), 550);
      } else if (data.center) {
        map.setView([data.center.latitude, data.center.longitude], 10);
        map.invalidateSize();
      }
    } catch {
      setLoadError('Could not draw this day’s pins. Try another day.');
    }
  }, [data, visiblePins, mapReady]);

  if (loading) {
    return (
      <section aria-label="Trip map" className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
        <div className="flex gap-1 p-1" aria-label="Loading map">
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-1" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-2" />
          <span className="h-2 w-2 rounded-full bg-tourflow-primary typing-dot-3" />
        </div>
        <p className="mt-1 text-xs text-tourflow-textMuted">Loading map…</p>
      </section>
    );
  }

  if (loadError || !data) {
    return (
      <section aria-label="Trip map" className="rounded-2xl border border-red-200 bg-white p-4 shadow-card">
        <p role="alert" className="text-xs font-semibold text-red-600">{loadError ?? 'Map unavailable.'}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-2 w-full rounded-full bg-tourflow-primary px-3 py-2 text-xs font-bold text-white"
        >
          Try Again
        </button>
      </section>
    );
  }

  if (data.pins.length === 0) {
    return (
      <section aria-label="Trip map" className="rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
        <h3 className="text-sm font-bold">Trip Map</h3>
        <p className="mt-1 text-xs text-tourflow-textMuted">
          No mappable stops yet — none of this trip’s stops carry coordinates.
        </p>
        {data.unmapped.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {data.unmapped.map((u, i) => (
              <li key={`${u.day}-${u.title}-${i}`} className="text-xs text-tourflow-textMuted">
                {u.title} — no map pin
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label="Trip map" className="flex flex-col gap-2 rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Trip Map</h3>
        {data.unmappedCount > 0 ? (
          <p className="text-[11px] font-semibold text-tourflow-textMuted">
            {data.unmappedCount} custom stop{data.unmappedCount === 1 ? '' : 's'} {data.unmappedCount === 1 ? 'has' : 'have'} no location
          </p>
        ) : null}
      </div>
      {fallbackNotice ? (
        <p className="text-[11px] text-tourflow-textMuted">
          Live map unavailable for this trip — showing pins from your itinerary stops.
        </p>
      ) : null}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="tablist" aria-label="Map day filter">
        {days.map((n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === selectedDay}
            onClick={() => setSelectedDay(n)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              n === selectedDay
                ? 'bg-tourflow-primary text-white'
                : 'border border-tourflow-cardBorder bg-white text-tourflow-dark'
            }`}
          >
            Day {n}
          </button>
        ))}
      </div>
      <div
        ref={divRef}
        style={{ height: 320 }}
        className="z-0 w-full overflow-hidden rounded-2xl border border-tourflow-cardBorder"
      />
      {tilesFailing ? (
        <p role="status" className="text-[11px] font-semibold text-tourflow-textMuted">
          Map tiles aren’t loading — check your connection (pins still plot underneath).
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Map legend">
        {[
          ['Stay', '#F05A28'],
          ['Activity', '#3B6E4A'],
          ['Transport', '#142018'],
          ['Leisure', '#B45309'],
        ].map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-tourflow-textMuted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      {unmappedForDay.length > 0 ? (
        <ul className="space-y-1 border-t border-tourflow-cardBorder pt-2">
          {unmappedForDay.map((u, i) => (
            <li key={`${u.title}-${i}`} className="text-xs text-tourflow-textMuted">
              {u.title} — no map pin
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
