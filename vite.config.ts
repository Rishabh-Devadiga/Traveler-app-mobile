import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Normalize a configured backend URL into a CSP source expression.
 *
 * A CSP source is `scheme://host[:port]` and nothing else — a path or query is
 * not valid there, which is exactly how a `VITE_TOURFLOW_API_URL` ending in
 * `/api` (or with a trailing slash) would silently invalidate the directive.
 * Returns null when the value is unset or not a plain http(s) URL.
 */
function cspOriginFromApiUrl(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // `.host` keeps an explicit port and drops any path/query/hash.
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Matches the CSP <meta> tag, capturing its `content` attribute on its own. */
const CSP_META_RE =
  /(<meta\s[^>]*?http-equiv=["']Content-Security-Policy["'][^>]*?content=")([^"]*)(")/i;

/**
 * Append `origin` to one directive of a CSP policy string when it is missing.
 *
 * Scheme-source semantics matter here: a bare `http:` also matches https URLs
 * (so it covers any origin), while a bare `https:` covers https origins only —
 * that is the exact reason an allow-list can look correct and still block
 * `http://<host>:8000`. Entries are only ever appended: never reordered, never
 * removed, so the policy stays valid for a browser that never runs this plugin.
 */
function ensureOriginInDirective(
  policy: string,
  directive: 'connect-src' | 'img-src',
  origin: string,
): string {
  const directiveRe = new RegExp(`(^|;)(\\s*)${directive}\\b([^;]*)`);
  return policy.replace(directiveRe, (match: string, sep: string, gap: string, sources: string) => {
    const tokens = sources.trim().split(/\s+/);
    const coveredByScheme =
      tokens.includes('http:') || (origin.startsWith('https:') && tokens.includes('https:'));
    if (tokens.includes(origin) || coveredByScheme) return match;
    return `${sep}${gap}${directive} ${tokens.join(' ')} ${origin}`;
  });
}

/**
 * Keep index.html's Content-Security-Policy in sync with the API base URL the
 * app actually calls.
 *
 * Why this exists: index.html hardcodes the trusted backend origins, while
 * src/api/client.ts resolves its base URL from `VITE_TOURFLOW_API_URL`. When the
 * two drift, the browser refuses every fetch() (and avatar <img>) to the backend
 * with `connect-src`/`img-src` violations — the request never leaves the browser
 * and the UI reports it as status 0. That is exactly the bug this guards against
 * (`VITE_TOURFLOW_API_URL=http://127.0.0.1:8000` vs a CSP that listed only
 * `http://localhost:8000`: the ports differ, so `'self'` does not help, and the
 * bare `https:` scheme-source does not cover an http origin either).
 *
 * The plugin reads the same env var the client reads, normalizes it, and appends
 * the origin to `connect-src` and `img-src` only when it is missing. Existing
 * entries are never removed or reordered, so index.html stays a valid, standalone
 * baseline for anyone who opens it without this build step.
 */
function injectApiOriginIntoCsp(): Plugin {
  let origin: string | null = null;

  return {
    name: 'wanderai:csp-api-origin',
    configResolved(config) {
      // Same resolution as import.meta.env: .env, .env.local, .env.[mode]...
      const env = loadEnv(config.mode, config.envDir, 'VITE_');
      origin = cspOriginFromApiUrl(env.VITE_TOURFLOW_API_URL || env.VITE_API_URL);
      if (origin) {
        config.logger.info(`[csp] allowing backend origin ${origin} in connect-src/img-src`);
      }
    },
    transformIndexHtml(html) {
      const apiOrigin = origin;
      if (apiOrigin === null) return html;
      // Only the CSP <meta> tag's content is rewritten — the words connect-src /
      // img-src also appear in the explanatory HTML comment above it.
      return html.replace(CSP_META_RE, (match: string, head: string, policy: string, tail: string) =>
        `${head}${ensureOriginInDirective(
          ensureOriginInDirective(policy, 'connect-src', apiOrigin),
          'img-src',
          apiOrigin,
        )}${tail}`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), injectApiOriginIntoCsp()],

  // Relative asset paths so the production build runs from file:// (Capacitor
  // WebView) as well as from any hosted sub-path.
  base: './',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    // Allow LAN access during on-device testing.
    host: true,

    // Local dev port — keep aligned with backend CORS.
    port: 5173,
    strictPort: true,
  },
});
