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