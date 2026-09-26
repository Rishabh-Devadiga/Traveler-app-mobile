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

/**
 * Load the shipped backend URL before the session check runs.
 * `public/api-config.json` is copied verbatim to `dist/` by Vite, so the APK
 * ships the LAN backend (http://192.168.137.100:8000) instead of localhost —
 * which on a physical device would point at the phone itself. A stored
 * localStorage override wins when present (see `API_URL_OVERRIDE_KEY`); the
 * build-time env is the final fallback. Route tree below is untouched.
 */
function applyShippedApiConfig(config: ApiConfigFile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(API_URL_OVERRIDE_KEY)) return;
  } catch {
    return;
  }
  const apiUrl = config && typeof config.apiUrl === 'string' ? config.apiUrl.trim().replace(/\/+$/, '') : '';
  if (apiUrl) {
    try {
      window.localStorage.setItem(API_URL_OVERRIDE_KEY, apiUrl);
    } catch {
      window.__TOURFLOW_API_URL__ = apiUrl;
    }
  }
}

export default function App() {
  // One-time startup splash on full page load / refresh only.
  // It overlays the first paint, plays the W scan once, then unmounts.
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);
  // Gate the traveler session check until the shipped api-config.json resolves
  // so the very first backend call already uses the on-device LAN URL.
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
