import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

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
