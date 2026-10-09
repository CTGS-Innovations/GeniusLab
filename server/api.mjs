// Genius Lab API: kid profiles and progress backup. Zero dependencies.
// Storage is plain JSON on disk under GL_DATA (default ./data):
//   config.json            family code (generated on first run unless GL_FAMILY_CODE is set)
//   users.json             profiles: id, name, pin hash, session token hashes
//   progress/<id>.json     latest progress
//   progress/<id>/<ts>.json  previous versions (last KEEP_VERSIONS)
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const KEEP_VERSIONS = 20;
const MAX_BODY = 2_000_000;
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60_000;
const NAME_RE = /^[\p{L}\p{N} _-]{1,20}$/u;
const PIN_RE = /^\d{4,8}$/;

export function createApi({ dataDir = process.env.GL_DATA || 'data', log = console.log } = {}) {
  const root = resolve(dataDir);
  mkdirSync(join(root, 'progress'), { recursive: true });

  const readJson = (file, fallback) => {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  };
  const writeJson = (file, value) => {
    const tmp = `${file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, file);
  };

  const configFile = join(root, 'config.json');
  const config = readJson(configFile, {});
  if (process.env.GL_FAMILY_CODE) config.familyCode = process.env.GL_FAMILY_CODE;
  if (!config.familyCode) config.familyCode = String(randomInt(100000, 1000000));
  writeJson(configFile, config);
  log(`[geniuslab] family code: ${config.familyCode}  (data: ${root})`);

  const usersFile = join(root, 'users.json');
  let users = readJson(usersFile, []);
  const saveUsers = () => writeJson(usersFile, users);
  const fails = new Map(); // name -> { count, until }

  const sha = (s) => createHash('sha256').update(s).digest('hex');
  const hashPin = (pin, salt = randomBytes(16).toString('hex')) => `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
  const pinOk = (pin, stored) => {
    const [salt, hash] = stored.split(':');
    const a = Buffer.from(hash, 'hex');
    const b = scryptSync(pin, salt, 32);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  const sameText = (a, b) => {
    const x = Buffer.from(sha(String(a)));
    const y = Buffer.from(sha(String(b)));
    return timingSafeEqual(x, y);
  };
  const byName = (name) => users.find((u) => u.name.toLowerCase() === String(name).trim().toLowerCase());
  const issueToken = (user) => {
    const token = randomBytes(32).toString('hex');
    user.tokens = [...(user.tokens ?? []), sha(token)].slice(-10);
    saveUsers();
    return token;
  };
  const authed = (req) => {
    const m = /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization ?? '');
    if (!m) return null;
    const h = sha(m[1]);
    return users.find((u) => u.tokens?.includes(h)) ?? null;
  };

  const progressFile = (id) => join(root, 'progress', `${id}.json`);
  const versionsDir = (id) => join(root, 'progress', id);

  function storeProgress(user, body) {
    const file = progressFile(user.id);
    if (existsSync(file)) {
      const dir = versionsDir(user.id);
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

    'POST /api/register': (req, body) => {
      const name = String(body.name ?? '').trim();
      const pin = String(body.pin ?? '');
      if (!sameText(String(body.familyCode ?? '').trim(), config.familyCode)) return [403, { error: 'That family code isn’t right. Ask a parent.' }];
      if (!NAME_RE.test(name)) return [400, { error: 'Use 1–20 letters or numbers for your name.' }];
      if (!PIN_RE.test(pin)) return [400, { error: 'PIN must be 4–8 digits.' }];
      if (byName(name)) return [409, { error: 'That name is taken. Sign in instead.' }];
      const user = { id: randomBytes(8).toString('hex'), name, pin: hashPin(pin), created: new Date().toISOString(), tokens: [] };
      users.push(user);
      return [201, { token: issueToken(user), name: user.name }];
    },

    'POST /api/login': (req, body) => {
      const name = String(body.name ?? '').trim().toLowerCase();
      const f = fails.get(name);
      if (f && f.until > Date.now()) return [429, { error: 'Too many tries. Wait 5 minutes.' }];
      const user = byName(name);
      if (!user || !pinOk(String(body.pin ?? ''), user.pin)) {
        const count = (f?.count ?? 0) + 1;
        fails.set(name, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
        return [401, { error: 'Name or PIN doesn’t match.' }];
      }
      fails.delete(name);
      return [200, { token: issueToken(user), name: user.name }];
    },

    'POST /api/logout': (req) => {
      const user = authed(req);
      if (user) {
        const h = sha(req.headers.authorization.slice(7));
        user.tokens = user.tokens.filter((t) => t !== h);
        saveUsers();
      }
      return [200, { ok: true }];
    },

    'GET /api/progress': (req) => {
      const user = authed(req);
      if (!user) return [401, { error: 'Sign in again.' }];
      return [200, readJson(progressFile(user.id), { progress: null, updatedAt: 0 })];
    },

    'PUT /api/progress': (req, body) => {
      const user = authed(req);
      if (!user) return [401, { error: 'Sign in again.' }];
      if (!body.progress || typeof body.progress !== 'object' || typeof body.updatedAt !== 'number') return [400, { error: 'Bad progress.' }];
      const current = readJson(progressFile(user.id), { updatedAt: 0 });
      // An older copy never overwrites a newer one; the client pulls instead.
      if (current.updatedAt > body.updatedAt) return [409, current];
      storeProgress(user, { progress: body.progress, updatedAt: body.updatedAt });
      return [200, { updatedAt: body.updatedAt }];
    },
  };

  return async function api(req, res, next) {
    const path = (req.url ?? '').split('?')[0];
    if (!path.startsWith('/api/')) return next ? next() : send(res, 404, { error: 'Not found' });
    const route = routes[`${req.method} ${path}`];
    if (!route) return send(res, 404, { error: 'Not found' });
    try {
      const body = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : {};
      const [status, value] = route(req, body);
      send(res, status, value);
    } catch (e) {
      send(res, 400, { error: e instanceof Error ? e.message : 'Bad request' });
    }
  };
}
