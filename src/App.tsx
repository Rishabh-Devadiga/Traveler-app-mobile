import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import StartupSplash from './components/StartupSplash';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Trips from './pages/Trips';
import HomeExplore from './pages/HomeExplore';
import CuratedForYou from './pages/CuratedForYou';
import PlanJourney from './pages/PlanJourney';
import TripChecklist from './pages/TripChecklist';
import AiLoading from './pages/AiLoading';
import Itinerary from './pages/Itinerary';
import AiGuide from './pages/AiGuide';
import Profile from './pages/Profile';
import GlobePage from './pages/GlobePage';
import ErrorBoundary from './components/ErrorBoundary';
import { API_URL_OVERRIDE_KEY, isApiConfigured } from './api/client';
import { hasTravelerToken, restoreTravelerSession } from './api/auth';

interface ApiConfigFile {
  apiUrl?: unknown;
}

const API_URL_SOURCE_KEY = 'tourflow.apiUrlSource.v1';

/**
 * Load the shipped backend URL before the session check runs.
 *
 * Desktop Vite development:
 * - localhost/127.0.0.1 should use the local backend.
 * - stale LAN overrides from previous mobile testing must not win.
 *
 * Mobile/production:
 * - a genuinely manual API URL override wins.
 * - otherwise the shipped api-config.json value is used.
 * - if the shipped config is unavailable, preserve the existing value.
 */
function isLoopbackHost(): boolean {
  try {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]'
    );
  } catch {
    return false;
  }
}

function applyShippedApiConfig(config: ApiConfigFile | null): void {
  if (typeof window === 'undefined') return;

  const apiUrl =
    config && typeof config.apiUrl === 'string'
      ? config.apiUrl.trim().replace(/\/+$/, '')
      : '';

  try {
    const stored = window.localStorage.getItem(API_URL_OVERRIDE_KEY);
    const source = window.localStorage.getItem(API_URL_SOURCE_KEY);

    // Desktop Vite browser: do not allow a stale mobile/LAN URL to poison
    // localhost development.
    if (isLoopbackHost()) {
      if (source !== 'manual') {
        window.localStorage.removeItem(API_URL_OVERRIDE_KEY);
        window.localStorage.removeItem(API_URL_SOURCE_KEY);
      }

      return;
    }

    // If api-config.json is unavailable, preserve an existing override.
    if (!apiUrl) return;

    // A genuinely manual override always wins.
    if (stored && source === 'manual') return;

    // Already using the same shipped URL.
    if (stored && stored.trim().replace(/\/+$/, '') === apiUrl) {
      window.localStorage.setItem(API_URL_SOURCE_KEY, 'shipped');
      return;
    }

    // Refresh stale shipped configuration.
    window.localStorage.setItem(API_URL_OVERRIDE_KEY, apiUrl);
    window.localStorage.setItem(API_URL_SOURCE_KEY, 'shipped');
  } catch {
    try {
      if (apiUrl) {
        window.__TOURFLOW_API_URL__ = apiUrl;
      }
    } catch {
      // Non-browser/runtime storage unavailable.
    }
  }
}

export default function App() {
  // One-time startup splash on full page load / refresh only.
  // It overlays the first paint, plays the W scan once, then unmounts.
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);
  // Gate the traveler session check until the shipped api-config.json resolves
  // so the very first backend call already uses the correct backend URL.
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Same-directory fetch works over http(s), file://, and capacitor://.
    fetch('./api-config.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((config: ApiConfigFile | null) => {
        if (!cancelled) {
          applyShippedApiConfig(config);
          setConfigReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setConfigReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the traveler session at startup: validate the stored JWT via
  // GET /api/auth/traveler/me. A 401 clears the expired token (handled
  // inside restoreTravelerSession); other failures keep the session.
  useEffect(() => {
    if (!configReady) return;
    if (!isApiConfigured() || !hasTravelerToken()) return;
    void restoreTravelerSession();
  }, [configReady]);

  return (
    <>
      {showSplash ? <StartupSplash onDone={handleSplashDone} /> : null}
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/home-explore" element={<HomeExplore />} />
          <Route path="/curated" element={<CuratedForYou />} />
          <Route path="/globe" element={<GlobePage />} />
          <Route path="/plan" element={<PlanJourney />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/checklist" element={<TripChecklist />} />
          <Route path="/loading" element={<AiLoading />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/itinerary/:tripId" element={<Itinerary />} />
          <Route path="/ai-guide" element={<AiGuide />} />
          <Route path="/profile" element={<ErrorBoundary fallbackLabel="Profile error"><Profile /></ErrorBoundary>} />
        </Route>
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </>
  );
}