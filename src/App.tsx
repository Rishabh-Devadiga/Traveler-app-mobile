import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import HomeExplore from './pages/HomeExplore';
import PlanJourney from './pages/PlanJourney';
import TripChecklist from './pages/TripChecklist';
import AiLoading from './pages/AiLoading';
import Itinerary from './pages/Itinerary';
import AiGuide from './pages/AiGuide';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/home-explore" element={<HomeExplore />} />
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
