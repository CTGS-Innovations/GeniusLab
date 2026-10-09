// Production server: the built app (dist/) plus the API on one port.
// npm start  →  build, then serve on GL_PORT (default 18420, same as dev). Point the tunnel here.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { createApi } from './api.mjs';

const PORT = Number(process.env.GL_PORT || process.env.PORT) || 18420;
const DIST = resolve('dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No build found. Run: npm run build');
  process.exit(1);
}

const api = createApi();

function serveStatic(req, res) {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end();
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  const name = file.slice(DIST.length);
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
  // Hashed assets never change; the shell and service worker must always revalidate.
  res.setHeader('Cache-Control', name.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  if ((req.url ?? '').startsWith('/api/')) return api(req, res);
  serveStatic(req, res);
})
  .on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other server or set GL_PORT.` : e);
    process.exit(1);
  })
  .listen(PORT, () => console.log(`[geniuslab] http://localhost:${PORT}`));
