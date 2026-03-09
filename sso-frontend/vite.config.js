import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api/* and /auth/* go to your EXISTING backend at 4000
      '/api':                { target: 'http://localhost:4000', changeOrigin: true, credentials: true },
      '/auth':               { target: 'http://localhost:4000', changeOrigin: true, credentials: true },
      '/backchannel-logout': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
