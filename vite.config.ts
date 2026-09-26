import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev origin for this task — keep aligned with backend CORS.
    port: 5173,
    strictPort: true,
  },
});
