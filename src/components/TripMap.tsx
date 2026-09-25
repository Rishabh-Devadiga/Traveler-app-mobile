import { useEffect, useMemo, useRef, useState } from 'react';
import * as L from 'leaflet';
import type { Map as LeafletMap, LayerGroup, TileEvent } from 'leaflet';
// Static CSS so .leaflet-container styles are guaranteed present BEFORE the
// map div ever paints (a late/missing dynamic CSS chunk = white blank canvas).
// The heavy Leaflet JS below stays dynamically imported (lazy).
import 'leaflet/dist/leaflet.css';
import { ApiError } from '../api/client';
import { fallbackMapFromDays, getTripMap, normalizeTripMap, type ApiMapStop, type NormalizedTripMap } from '../api/trips';
import { safeText } from '../api/traveler';
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

/** Finite-number coercion for raw coordinates ('' and junk become NaN, never Null Island). */
function toFiniteCoord(value: unknown): number {
  if (typeof value === 'string' && value.trim() === '') return NaN;
  return Number(value ?? NaN);
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
  const [rawDays, setRawDays] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDay, setSelectedDay] = useState(activeDay);
  const [plottedCount, setPlottedCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [tilesFailing, setTilesFailing] = useState(false);
  const [mapTick, setMapTick] = useState(0); // bumped after show / on retry so init re-runs on a live div
  // Consecutive Leaflet init/draw faults. At 3 the interactive map is
  // declared dead for this view and the server-rendered iframe takes over —
  // a JS crash can never blank it. Resets on any successful draw or retry.
  const [failCount, setFailCount] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const fallbackRef = useRef(fallbackDays);
  fallbackRef.current = fallbackDays;
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setData(null);
    setFallbackNotice(false);
    setFailCount(0);
    // Log the exact request so a wrong-ID call is visible instantly next to
    // the panel's trip in the Network tab. tripId always comes from the
    // CURRENT selection (draft.tripId) — never a stored/stale id.
    console.info('[trip-map] GET', `/api/trips/${tripId}/map`);
    getTripMap(tripId).then(
      (raw) => {
        if (!cancelled) {
          const normalized = normalizeTripMap(raw);
          console.log('[trip-map] stops:', normalized.pins.length, 'center:', normalized.center);
          setData(normalized);
          setRawDays(Array.isArray(raw.days) ? raw.days : []);
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
            setRawDays([]);
            setFallbackNotice(true);
            setLoading(false);
            return;
          }
        }
        setData(null);
        setRawDays([]);
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
  // from the first paint — but we still VERIFY clientHeight > 0 before
  // L.map() (a hidden/zero-height init blanks the canvas forever) and retry
  // a few frames if layout hasn't settled yet (Hide/Show toggle culprit).
  // invalidateSize() re-asserts correct sizing after every paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // L is statically imported (no chunk wait); log proves it for DONE WHEN.
        console.log('[trip-map] L defined:', typeof L !== 'undefined');
        // CSS is imported statically at module top (see above) — verify it
        // actually applied; without .leaflet-container rules tiles/markers
        // break into a white page even when JS + data are perfect.
        try {
          const hasLeafletCss = Array.from(document.styleSheets).some((sheet) => {
            try {
              return Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('.leaflet-container'));
            } catch {
              return false;
            }
          });
          if (!hasLeafletCss) {
            console.error('[trip-map] leaflet.css rules missing — check Network for the CSS chunk (should be 200).');
          }
        } catch {
          /* diagnostic only — never blocks the map */
        }
        if (cancelled || !divRef.current || mapRef.current) return;
        const div = divRef.current;
        console.log('[trip-map] div size:', div.clientWidth, div.clientHeight);
        let waitedFrames = 0;
        while (divRef.current.clientHeight === 0 && waitedFrames < 30 && !cancelled) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          waitedFrames += 1;
        }
        if (cancelled || !divRef.current || mapRef.current) return;
        if (divRef.current.clientHeight === 0) {
          console.error('[trip-map] init aborted: container still 0px after 30 frames', {
            tripId,
          });
          setLoadError('Map container has no height on this screen — try reopening the map.');
          return;
        }
        const center = dataRef.current?.center;
        const map = L.map(divRef.current, { scrollWheelZoom: false, attributionControl: false }).setView(
          center ? [center.latitude, center.longitude] : [20, 78],
          center ? 12 : 4,
        );
        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
          maxZoom: 19,
          detectRetina: true,
        });
        tiles.on('tileerror', (event: TileEvent) => {
          console.log('[trip-map] TILE FAIL');
          console.error('[trip-map] tile failed (check Network: tile.openstreetmap.fr should be 200):', {
            coords: event.coords ? `${event.coords.z}/${event.coords.x}/${event.coords.y}` : '(unknown)',
          });
          setTilesFailing(true);
        });
        tiles.on('tileload', () => setTilesFailing(false));
        tiles.addTo(map);
        mapRef.current = map;
        layersRef.current = L.layerGroup().addTo(map);
        // Paint first, then force Leaflet to re-measure (kills stale blank canvas).
        // whenReady fires once tiles/container settle; rAF covers the first frame.
        map.whenReady(() => {
          if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
        });
        // rAF stalls in background tabs — the timeout fallback guarantees the
        // pins still draw even if the frame never fires.
        let settled = false;
        const settle = () => {
          if (cancelled || settled || !mapRef.current) return;
          settled = true;
          mapRef.current.invalidateSize();
          setMapReady(true);
        };
        requestAnimationFrame(settle);
        window.setTimeout(settle, 500);
      } catch (error) {
        console.error('[trip-map] init failed:', error);
        if (!cancelled) {
          setFailCount((c) => c + 1);
          setLoadError('Could not start the map view on this device.');
        }
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, mapTick, loading, data]);

  // Redraw pins + dotted day-route whenever data or the day filter changes.
  // Uniform rows: raw days[] matched by day_number, or normalized fallback
  // pins in itinerary-fallback mode. Plotted skip: has_coordinates === false
  // (unmapped note covers them); plotted strictly on finite lat/lng, so
  // L.marker can never throw "Invalid LatLng". Only latitude/longitude are
  // read as coordinates — stop.lat/stop.coords do not exist.
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers || !data) return;
    try {
      map.invalidateSize();
      layers.clearLayers();
      interface PlotRow {
        latitude: unknown;
        longitude: unknown;
        title: unknown;
        start_time: unknown;
        kind: string;
        flag: unknown;
      }
      let rows: PlotRow[];
      if (rawDays.length > 0) {
        const dayEntry = rawDays.find((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const record = entry as { day_number?: unknown; day?: unknown };
          return Number(record.day_number ?? record.day) === selectedDay;
        });
        const raw = dayEntry && typeof dayEntry === 'object'
          ? (dayEntry as { stops?: unknown }).stops
          : undefined;
        rows = (Array.isArray(raw) ? raw : []).flatMap((s) => {
          if (!s || typeof s !== 'object') return [];
          const r = s as ApiMapStop;
          return [{
            latitude: r.latitude,
            longitude: r.longitude,
            title: r.title,
            start_time: r.start_time,
            kind: safeText(r.item_type ?? r.type).trim().toLowerCase(),
            flag: r.has_coordinates,
          }];
        });
      } else {
        rows = visiblePins.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          title: p.title,
          start_time: p.time,
          kind: p.itemType,
          flag: true,
        }));
      }
      const stops = rows.filter(
        (s) => s.flag !== false && Number.isFinite(toFiniteCoord(s.latitude)) && Number.isFinite(toFiniteCoord(s.longitude)),
      );
      // "Could not draw" ONLY when this day has zero plottable stops —
      // never as a catch-all.
      if (stops.length === 0) {
        setLoadError('Could not draw this day’s pins. Try another day.');
        setPlottedCount(0);
        return;
      }
      setLoadError(null);
      const plotted: Array<[number, number]> = [];
      console.log('[trip-map] first stop:', JSON.stringify(stops[0]));
      console.log('[trip-map] plotted:', stops.length, 'day:', selectedDay);
      stops.forEach((s, index) => {
        try {
          const lat = Number(s.latitude);
          const lng = Number(s.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const title = safeText(s.title).trim() || 'Stop';
          const time = safeText(s.start_time).trim();
          const icon = L.divIcon({
            className: '',
            html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${pinColor(s.kind)};color:#fff;font-size:12px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${index + 1}</span>`,
            iconSize: [26, 26], iconAnchor: [13, 13],
          });
          L.marker([lat, lng], { icon })
            .bindPopup(`${escapeHtml(title)}${time ? ` · ${escapeHtml(time)}` : ''}`)
            .addTo(layers);
          plotted.push([lat, lng]);
        } catch { /* ek kharab stop baaki pins ko nahi rokta */ }
      });
      if (plotted.length === 0) {
        setLoadError('Could not draw this day’s pins. Try another day.');
        return;
      }
      setLoadError(null);
      if (plotted.length === 1) {
        // Single pin: street-level view so roads/labels show (never empty).
        map.setView(plotted[0], 14);
      } else {
        try {
          L.polyline(plotted, { color: '#F05A28', weight: 2.5, dashArray: '2 7' }).addTo(layers);
        } catch { /* route decorative hai */ }
        const bounds = L.latLngBounds(plotted).pad(0.25);
        map.flyToBounds(bounds, { duration: 0.5 });
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        console.log('[trip-map] bounds:', `SW(${sw.lat},${sw.lng})`, `NE(${ne.lat},${ne.lng})`, `pins:${plotted.length}`);
      }
      window.setTimeout(() => map.invalidateSize(), 550);
      setFailCount(0);
      setPlottedCount(plotted.length);
    } catch (error) {
      console.error('[trip-map] draw fault:', error);
    }
  }, [data, rawDays, selectedDay, visiblePins, mapReady]);

  // Single tree: loading / error / empty states are overlays and messages —
  // the map div below mounts EXACTLY once and is never replaced, so Leaflet
  // always paints into the same node it measured.
  const emptyPins = !!data && data.pins.length === 0 && !loadError;

  // Last resort: Leaflet init/draw faulted 3+ times. The Google embed is
  // server-rendered (no key) — a JS crash can never blank it. Blank white
  // boxes are impossible from here: iframe, pins, or an explicit message.
  const iframeCenter = data?.center ?? null;
  if (failCount >= 3 && iframeCenter) {
    return (
      <section aria-label="Trip map" className="flex flex-col gap-2 rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Trip Map</h3>
          <p className="text-[11px] font-semibold text-tourflow-textMuted">Fallback view</p>
        </div>
        <iframe
          title="trip map"
          width="100%"
          height="320"
          style={{ border: 0, borderRadius: 16 }}
          loading="lazy"
          src={`https://maps.google.com/maps?q=${iframeCenter.latitude},${iframeCenter.longitude}&z=12&output=embed`}
        />
        <button
          type="button"
          onClick={() => {
            setFailCount(0);
            setReloadKey((k) => k + 1);
            setMapTick((t) => t + 1);
          }}
          className="w-full rounded-full border border-tourflow-cardBorder bg-white px-3 py-2 text-xs font-bold text-tourflow-dark"
        >
          Try interactive map again
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Trip map" className="flex flex-col gap-2 rounded-2xl border border-tourflow-cardBorder bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">
          Trip Map{!loading && data ? ` · Day ${selectedDay} · ${plottedCount} pin${plottedCount === 1 ? '' : 's'}` : ''}
        </h3>
        {data && data.unmappedCount > 0 ? (
          <p className="text-[11px] font-semibold text-tourflow-textMuted">
            {data.unmappedCount} custom stop{data.unmappedCount === 1 ? '' : 's'} {data.unmappedCount === 1 ? 'has' : 'have'} no location
          </p>
        ) : null}
      </div>
      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-semibold text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setReloadKey((k) => k + 1);
              setMapTick((t) => t + 1);
            }}
            className="mt-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white"
          >
            Try Again
          </button>
        </div>
      ) : null}
      {fallbackNotice ? (
        <p className="text-[11px] text-tourflow-textMuted">
          Live map unavailable for this trip — showing pins from your itinerary stops.
        </p>
      ) : null}
      {emptyPins ? (
        <div>
          <p className="mt-1 text-xs text-tourflow-textMuted">
            No mappable stops yet — none of this trip’s stops carry coordinates.
          </p>
          {data && data.unmapped.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {data.unmapped.map((u, i) => (
                <li key={`${u.day}-${u.title}-${i}`} className="text-xs text-tourflow-textMuted">
                  {u.title} — no map pin
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
      {loading ? <p className="text-xs text-tourflow-textMuted">Loading map…</p> : null}
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
