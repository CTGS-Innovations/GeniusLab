import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createApi } from './server/api.mjs';

// One fixed port for dev, preview, and `npm start`, so a Cloudflare Tunnel can be pinned to it.
// Change with GL_PORT=12345. strictPort: if it's taken, fail loudly instead of drifting to another port.
const port = Number(process.env.GL_PORT) || 18420;

// Hosts allowed to reach the server through a tunnel. Add your domains with
// GL_HOSTS=geniuslab.example.com,.example.com (a leading dot allows subdomains), or GL_HOSTS=* for any.
const extra = process.env.GL_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean) ?? [];
const allowedHosts: string[] | true = extra.includes('*') ? true : ['geniuslab.ctgs.link', '.ctgs.link', ...extra];

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
  server: { port, strictPort: true, host: true, allowedHosts },
  preview: { port, strictPort: true, host: true, allowedHosts },
});
