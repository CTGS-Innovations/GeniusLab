import { normalizeProgress, type Progress } from './progress';

/** A signed-in kid on this device. The token is the only secret kept locally. */
export interface Account {
  name: string;
  token: string;
}

export type SyncStatus = 'guest' | 'syncing' | 'saved' | 'offline' | 'signed-out';

const ACCOUNT_KEY = 'geniuslab.account';

export function loadAccount(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null');
    return a && typeof a.name === 'string' && typeof a.token === 'string' ? a : null;
  } catch {
    return null;
  }
}

export function saveAccount(a: Account | null): void {
  try {
    if (a) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // storage unavailable
  }
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: data as T } : { ok: false, status: res.status, error: data.error ?? 'Something went wrong.' };
  } catch {
    return { ok: false, status: 0, error: 'Can’t reach the server. Your progress is still saved on this device.' };
  }
}

export const register = (name: string, pin: string, familyCode: string) =>
  call<Account>('/api/register', { method: 'POST', body: { name, pin, familyCode } });

export const login = (name: string, pin: string) => call<Account>('/api/login', { method: 'POST', body: { name, pin } });

export const logout = (token: string) => call('/api/logout', { method: 'POST', token });

/** The server's copy, or null if it has none yet. */
export async function pull(token: string): Promise<Result<Progress | null>> {
  const r = await call<{ progress: unknown; updatedAt: number }>('/api/progress', { token });
  if (!r.ok) return r;
  const p = normalizeProgress(r.data.progress);
  return { ok: true, data: p ? { ...p, updatedAt: r.data.updatedAt } : null };
}

/** 'conflict' carries the newer server copy, which should replace the local one. */
export async function push(token: string, progress: Progress): Promise<{ kind: 'ok' } | { kind: 'conflict'; server: Progress } | { kind: 'auth' } | { kind: 'offline' }> {
  const r = await call<{ progress?: unknown; updatedAt: number }>('/api/progress', {
    method: 'PUT',
    token,
    body: { progress, updatedAt: progress.updatedAt },
  });
  if (r.ok) return { kind: 'ok' };
  if (r.status === 401) return { kind: 'auth' };
  if (r.status === 409) {
    const res = await pull(token);
    if (res.ok && res.data) return { kind: 'conflict', server: res.data };
  }
  return { kind: 'offline' };
}

/** Download progress as a backup file. */
export function exportProgress(p: Progress, name: string | null): void {
  const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `geniuslab-${(name ?? 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readBackup(file: File): Promise<Progress | null> {
  try {
    return normalizeProgress(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}
