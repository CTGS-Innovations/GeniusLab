// Genius Lab API: progress backup keyed by a save code. Zero dependencies.
//
// A save code is 16 random Crockford base32 characters (80 bits) made on the device.
// It is the only credential: no names, no PINs. The server stores progress under a
// hash of the code, so the data folder never holds the codes themselves.
//
// Storage under GL_DATA (default ./data):
//   saves/<sha256(code)>.json          latest progress
//   saves/<sha256(code)>/<ts>.json     previous versions (last KEEP_VERSIONS)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const KEEP_VERSIONS = 20;
const MAX_BODY = 2_000_000;
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{16}$/;
const WINDOW_MS = 10 * 60_000;
const MAX_MISSES = 60; // unknown-code lookups per IP per window (a household shares one IP)
const MAX_NEW = 30; // new codes per IP per window

export function createApi({ dataDir = process.env.GL_DATA || 'data', log = console.log } = {}) {
  const root = resolve(dataDir, 'saves');
  mkdirSync(root, { recursive: true });
  log(`[geniuslab] saves: ${root}`);

  const readJson = (file) => {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  };
  const writeJson = (file, value) => {
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, file);
  };

  const id = (code) => createHash('sha256').update(code).digest('hex');
  const fileFor = (code) => join(root, `${id(code)}.json`);

  // Per-IP budgets so nobody can sweep for codes or fill the disk.
  const budgets = new Map();
  const spend = (ip, kind, max) => {
    const key = `${kind}:${ip}`;
    const now = Date.now();
    const b = budgets.get(key);
    if (!b || b.reset < now) {
      budgets.set(key, { n: 1, reset: now + WINDOW_MS });
      return true;
    }
    b.n++;
    return b.n <= max;
  };
  const ipOf = (req) => String(req.headers['cf-connecting-ip'] ?? req.socket?.remoteAddress ?? 'local');

  const codeOf = (req) => {
    const m = /^Bearer ([0-9A-Z]{16})$/.exec(req.headers.authorization ?? '');
    return m && CODE_RE.test(m[1]) ? m[1] : null;
  };

  function store(code, body) {
    const file = fileFor(code);
    if (existsSync(file)) {
      const dir = join(root, id(code));
      mkdirSync(dir, { recursive: true });
      renameSync(file, join(dir, `${Date.now()}.json`));
      const old = readdirSync(dir).sort();
      for (const f of old.slice(0, Math.max(0, old.length - KEEP_VERSIONS))) unlinkSync(join(dir, f));
    }
    writeJson(file, body);
  }

  const send = (res, status, value) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(value));
  };
  const readBody = (req) =>
    new Promise((ok, fail) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          fail(new Error('too large'));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
        } catch {
          fail(new Error('bad json'));
        }
      });
      req.on('error', fail);
    });

  const routes = {
    'GET /api/health': () => [200, { ok: true }],

    'GET /api/save': (req) => {
      const code = codeOf(req);
      if (!code) return [400, { error: 'That isn’t a save code.' }];
      const saved = readJson(fileFor(code));
      if (saved) return [200, saved];
      if (!spend(ipOf(req), 'miss', MAX_MISSES)) return [429, { error: 'Too many tries. Wait a few minutes.' }];
      // Not an error: a brand-new device simply has no save yet.
      return [200, { progress: null, updatedAt: 0 }];
    },

    'PUT /api/save': (req, body) => {
      const code = codeOf(req);
      if (!code) return [400, { error: 'That isn’t a save code.' }];
      if (!body.progress || typeof body.progress !== 'object' || typeof body.updatedAt !== 'number') return [400, { error: 'Bad progress.' }];
      const current = readJson(fileFor(code));
      if (!current && !spend(ipOf(req), 'new', MAX_NEW)) return [429, { error: 'Too many new saves. Wait a few minutes.' }];
      // An older copy never overwrites a newer one; the device pulls instead.
      if (current && current.updatedAt > body.updatedAt) return [409, current];
      store(code, { progress: body.progress, updatedAt: body.updatedAt });
      return [200, { updatedAt: body.updatedAt }];
    },
  };

  return async function api(req, res, next) {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/')) return next ? next() : send(res, 404, { error: 'Not found' });
    const route = routes[`${req.method} ${path}`];
    if (!route) return send(res, 404, { error: 'Not found' });
    try {
      const body = req.method === 'PUT' ? await readBody(req) : {};
      const [status, value] = route(req, body);
      send(res, status, value);
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : 'Bad request' });
    }
  };
}
