import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApi } from '../server/api.mjs';

let server: Server;
let base = '';
let dir = '';
const FAMILY = '424242';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'gl-api-'));
  process.env.GL_FAMILY_CODE = FAMILY;
  const api = createApi({ dataDir: dir, log: () => {} });
  server = createServer((req, res) => api(req, res));
  await new Promise<void>((ok) => server.listen(0, ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.GL_FAMILY_CODE;
});

const post = (path: string, body: unknown, token?: string, method = 'POST') =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

describe('profiles and backup API', () => {
  let token = '';

  it('needs the family code to register', async () => {
    const r = await post('/api/register', { name: 'Ava', pin: '1234', familyCode: '000000' });
    expect(r.status).toBe(403);
  });

  it('registers, then rejects a duplicate name in any case', async () => {
    const r = await post('/api/register', { name: 'Ava', pin: '1234', familyCode: FAMILY });
    expect(r.status).toBe(201);
    token = (await r.json()).token;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect((await post('/api/register', { name: 'ava', pin: '9999', familyCode: FAMILY })).status).toBe(409);
  });

  it('validates PINs and names', async () => {
    expect((await post('/api/register', { name: 'Ben', pin: '12', familyCode: FAMILY })).status).toBe(400);
    expect((await post('/api/register', { name: '<script>', pin: '1234', familyCode: FAMILY })).status).toBe(400);
  });

  it('saves and returns progress, and never lets an older copy overwrite a newer one', async () => {
    expect((await fetch(`${base}/api/progress`)).status).toBe(401);
    const empty = await (await fetch(`${base}/api/progress`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(empty.progress).toBeNull();
    expect((await post('/api/progress', { progress: { version: 1, xp: 50 }, updatedAt: 200 }, token, 'PUT')).status).toBe(200);
    const stale = await post('/api/progress', { progress: { version: 1, xp: 10 }, updatedAt: 100 }, token, 'PUT');
    expect(stale.status).toBe(409);
    const got = await (await fetch(`${base}/api/progress`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(got).toEqual({ progress: { version: 1, xp: 50 }, updatedAt: 200 });
  });

  it('keeps previous versions', async () => {
    await post('/api/progress', { progress: { version: 1, xp: 80 }, updatedAt: 300 }, token, 'PUT');
    const users = readdirSync(join(dir, 'progress')).filter((f) => !f.endsWith('.json'));
    expect(readdirSync(join(dir, 'progress', users[0])).length).toBeGreaterThan(0);
  });

  it('signs in with name and PIN, and locks out after repeated wrong PINs', async () => {
    expect((await post('/api/login', { name: 'AVA', pin: '1234' })).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await post('/api/login', { name: 'Ava', pin: '0000' })).status).toBe(401);
    expect((await post('/api/login', { name: 'Ava', pin: '1234' })).status).toBe(429);
  });

  it('logout revokes the token', async () => {
    await post('/api/logout', {}, token);
    expect((await fetch(`${base}/api/progress`, { headers: { Authorization: `Bearer ${token}` } })).status).toBe(401);
  });
});
