import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Hosts allowed to reach the dev/preview server (e.g. a Cloudflare Tunnel).
// Add more with GL_HOSTS=a.example.com,b.example.com
const allowedHosts = ['geniuslab.ctgs.link', '.ctgs.link', ...(process.env.GL_HOSTS?.split(',').filter(Boolean) ?? [])];

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts,
    proxy: { '/api': 'http://localhost:8787' },
  },
  preview: { allowedHosts },
});
