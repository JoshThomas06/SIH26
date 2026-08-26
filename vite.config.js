import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    cors: {
      origin: [/^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/, 'http://localhost:5173'],
    },
    allowedHosts: ['.trycloudflare.com'],
  },
});
