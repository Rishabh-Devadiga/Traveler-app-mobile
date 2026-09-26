import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { TripDraftProvider } from './state/TripDraftContext';
import './index.css';

// Capacitor serves the bundle from file:// (or capacitor://localhost) with no
// HTTP server to resolve client-side routes, so BrowserRouter deep-links /
// refreshes 404 and blank-screen inside the APK. HashRouter keeps routing
// after "#" so every screen works from a single bundled index.html.
const isNativeRuntime =
  (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ===
    true || window.location.protocol === 'file:';
const Router = isNativeRuntime ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <TripDraftProvider>
        <App />
      </TripDraftProvider>
    </Router>
  </React.StrictMode>,
);

