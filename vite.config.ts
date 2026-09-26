import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the production build runs from file:// (Capacitor
  // WebView) as well as from any hosted sub-path. Without this Vite emits
  // absolute "/assets/..." URLs which 404 inside the APK.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Allow LAN access during on-device testing (e.g. http://192.168.137.100:5173).
    host: true,
  },
});

