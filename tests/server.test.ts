import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApi } from '../server/api.mjs';
import { formatCode, newCode, normalizeCode } from '../src/engine/cloud';

let server: Server;
let base = '';
let dir = '';

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'gl-api-'));
  const api = createApi({ dataDir: dir, log: () => {} });
  server = createServer((req, res) => api(req, res));
  await new Promise<void>((ok) => server.listen(0, ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

const get = (code: string) => fetch(`${base}/api/save`, { headers: { Authorization: `Bearer ${code}` } });
const put = (code: string, body: unknown, ip = '1.1.1.1') =>
  fetch(`${base}/api/save`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${code}`, 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  });

describe('save codes', () => {
  it('are 16 Crockford base32 characters (80 bits) and never repeat', () => {
    const codes = new Set(Array.from({ length: 2000 }, newCode));
    expect(codes.size).toBe(2000);
    for (const c of codes) expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
  });

  it('accept what a kid types: lowercase, dashes, spaces, O/I/L look-alikes', () => {
    const c = newCode();
    expect(normalizeCode(formatCode(c).toLowerCase())).toBe(c);
    expect(normalizeCode(' k7qf 3mzp-9wxd-2htb ')).toBe('K7QF3MZP9WXD2HTB');
    expect(normalizeCode('O0IL-0000-0000-0000')).toBe('0011000000000000');
    expect(normalizeCode('too-short')).toBeNull();
  });
});

describe('save API', () => {
  const code = newCode();

  it('knows nothing about a code until something is saved under it', async () => {
    expect(await (await get(code)).json()).toEqual({ progress: null, updatedAt: 0 });
    expect((await get('not-a-code')).status).toBe(400);
  });

  it('saves and returns progress, and never lets an older copy overwrite a newer one', async () => {
    expect((await put(code, { progress: { version: 1, xp: 50 }, updatedAt: 200 })).status).toBe(200);
    expect((await put(code, { progress: { version: 1, xp: 10 }, updatedAt: 100 })).status).toBe(409);
    expect(await (await get(code)).json()).toEqual({ progress: { version: 1, xp: 50 }, updatedAt: 200 });
  });

  it('stores by hash, so the data folder never holds the code itself, and keeps old versions', async () => {
    await put(code, { progress: { version: 1, xp: 80 }, updatedAt: 300 });
    const saves = join(dir, 'saves');
    const names = readdirSync(saves);
    expect(names.join(' ')).not.toContain(code);
    const versions = names.find((n) => !n.endsWith('.json'))!;
    expect(readdirSync(join(saves, versions)).length).toBeGreaterThan(0);
    expect(readFileSync(join(saves, `${versions}.json`), 'utf8')).toContain('"xp":80');
  });

  it('rate-limits lookups of unknown codes per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i++) statuses.push((await fetch(`${base}/api/save`, { headers: { Authorization: `Bearer ${newCode()}`, 'cf-connecting-ip': '8.8.8.8' } })).status);
    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('rejects bad bodies', async () => {
    expect((await put(code, { progress: null, updatedAt: 1 })).status).toBe(400);
  });

  it('rate-limits new codes per IP so nobody can fill the disk', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) statuses.push((await put(newCode(), { progress: { version: 1 }, updatedAt: 1 }, '9.9.9.9')).status);
    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
