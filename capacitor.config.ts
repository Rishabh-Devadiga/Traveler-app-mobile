// Physical-device build: `dist/` (relative asset URLs, HashRouter) is bundled
// into the APK.
//
// Networking notes (both REQUIRED for http://192.168.137.100:8000):
// - `cleartext: true` — Android 9+ blocks plain-HTTP by default
//   ("Cleartext HTTP traffic not permitted"). This sets the manifest /
//   network-security flag that re-allows it.
// - `androidScheme: 'http'` (the Capacitor default, stated explicitly) — the
//   WebView origin stays http://localhost so calls to the HTTP LAN backend are
//   same-scheme. An `https` scheme here would get every API call blocked as
//   mixed content. Flip BOTH to https (scheme + cleartext false) only when the
//   backend itself gets TLS.
//
// NOTE: intentionally untyped (no `import ... from '@capacitor/cli'`) so
// `npm run build` still type-checks before `npm install` pulls Capacitor.
const config = {
  appId: 'com.wanderai.traveler',
  appName: 'WanderAI Traveler',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
