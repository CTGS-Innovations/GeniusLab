import { normalizeProgress, type Progress } from './progress';

/**
 * A save code is the only identity: 16 random Crockford base32 characters (80 bits),
 * made on the device, shown as K7QF-3MZP-9WXD-2HTB. No names, no PINs.
 */
export type SyncStatus = 'syncing' | 'saved' | 'offline';

const CODE_KEY = 'geniuslab.code';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join('');
}

/** Accepts what a kid types: any case, dashes or spaces, and the look-alikes O/I/L. */
export function normalizeCode(input: string): string | null {
  const c = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(c) ? c : null;
}

export const formatCode = (code: string) => code.match(/.{1,4}/g)!.join('-');

export function loadCode(): string {
  try {
    const saved = normalizeCode(localStorage.getItem(CODE_KEY) ?? '');
    if (saved) return saved;
    const code = newCode();
    localStorage.setItem(CODE_KEY, code);
    return code;
  } catch {
    return newCode();
  }
}

export function storeCode(code: string): void {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // storage unavailable
  }
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, code: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method: body ? 'PUT' : 'GET',
      headers: { Authorization: `Bearer ${code}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, error: data.error ?? 'Something went wrong.' };
  } catch {
    return { ok: false, status: 0, error: 'Can’t reach the server. Progress is still saved on this device.' };
  }
}

/** The server's copy for this code; null when nothing has been saved under it yet. */
export async function pull(code: string): Promise<Result<Progress | null>> {
  const r = await call<{ progress: unknown; updatedAt: number }>('/api/save', code);
  if (!r.ok) return r;
  const p = normalizeProgress(r.data.progress);
  return { ok: true, data: p ? { ...p, updatedAt: r.data.updatedAt } : null };
}

/** 'conflict' carries the newer server copy, which should replace the local one. */
export async function push(code: string, progress: Progress): Promise<{ kind: 'ok' } | { kind: 'conflict'; server: Progress } | { kind: 'offline' }> {
  const r = await call('/api/save', code, { progress, updatedAt: progress.updatedAt });
  if (r.ok) return { kind: 'ok' };
  if (r.status === 409) {
    const res = await pull(code);
    if (res.ok && res.data) return { kind: 'conflict', server: res.data };
  }
  return { kind: 'offline' };
}

/** A save file carries the code and the progress, so loading it on any device picks up where it left off. */
export function exportSave(p: Progress, code: string): void {
  const blob = new Blob([JSON.stringify({ geniuslab: 1, code, progress: p }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `geniuslab-save-${code.slice(0, 4).toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Reads a save file (or an older progress-only backup). */
export async function readSave(file: File): Promise<{ code: string | null; progress: Progress } | null> {
  try {
    const raw = JSON.parse(await file.text());
    const progress = normalizeProgress(raw?.progress ?? raw);
    if (!progress) return null;
    return { code: typeof raw?.code === 'string' ? normalizeCode(raw.code) : null, progress };
  } catch {
    return null;
  }
}
