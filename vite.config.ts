import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createApi } from './server/api.mjs';

// Hosts allowed to reach the dev/preview server (e.g. a Cloudflare Tunnel).
// Add more with GL_HOSTS=a.example.com,b.example.com
const allowedHosts = ['geniuslab.ctgs.link', '.ctgs.link', ...(process.env.GL_HOSTS?.split(',').filter(Boolean) ?? [])];

/** Serves /api from the same port in dev and preview, so the tunnel needs one URL. */
function api(): Plugin {
  return {
    name: 'geniuslab-api',
    configureServer(server) {
      server.middlewares.use(createApi());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApi());
    },
  };
}

export default defineConfig({
  plugins: [react(), api()],
  server: { allowedHosts },
  preview: { allowedHosts },
});
