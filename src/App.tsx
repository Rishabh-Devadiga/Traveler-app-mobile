import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import HomeExplore from './pages/HomeExplore';
import PlanJourney from './pages/PlanJourney';
import TripChecklist from './pages/TripChecklist';
import AiLoading from './pages/AiLoading';
import Itinerary from './pages/Itinerary';
import AiGuide from './pages/AiGuide';
import Profile from './pages/Profile';
import GlobePage from './pages/GlobePage';
import { isApiConfigured } from './api/client';
import { hasTravelerToken, restoreTravelerSession } from './api/auth';

export default function App() {
  // Restore the traveler session at startup: validate the stored JWT via
  // GET /api/auth/traveler/me. A 401 clears the expired token (handled
  // inside restoreTravelerSession); other failures keep the session.
  useEffect(() => {
    if (!isApiConfigured() || !hasTravelerToken()) return;
    void restoreTravelerSession();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/home-explore" element={<HomeExplore />} />
        <Route path="/globe" element={<GlobePage />} />
        <Route path="/plan" element={<PlanJourney />} />
        <Route path="/checklist" element={<TripChecklist />} />
        <Route path="/loading" element={<AiLoading />} />
        <Route path="/itinerary" element={<Itinerary />} />
        <Route path="/ai-guide" element={<AiGuide />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  );
}
