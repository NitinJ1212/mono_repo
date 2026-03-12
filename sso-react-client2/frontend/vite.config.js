// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api/* and /auth/* calls go to Express backend
      '/api': {
        target:      'http://localhost:4001',
        changeOrigin: true,
        credentials: true,
      },
      '/auth': {
        target:      'http://localhost:4001',
        changeOrigin: true,
        credentials: true,
      },
      '/backchannel-logout': {
        target:       'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});
