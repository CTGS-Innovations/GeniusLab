import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { loadCode, newCode, normalizeCode, pull, push, storeCode, type SyncStatus } from './cloud';
import { newProgress, saveProgress, type Progress } from './progress';

const PUSH_DELAY = 1200;

/** A save link (…/#s=CODE) opened on this device, if any. Removed from the address bar once read. */
function codeFromLink(): string | null {
  const m = /[#&]s=([0-9A-Za-z-]+)/.exec(window.location.hash);
  if (!m) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return normalizeCode(m[1]);
}

/**
 * Offline-first sync keyed by a save code. Every change saves on the device right away and
 * backs up to the server under the code. The newer copy (by updatedAt) wins.
 */
export function useCloud(progress: Progress, setProgress: Dispatch<SetStateAction<Progress>>) {
  const [code, setCode] = useState(loadCode);
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  /** A code from a save link, waiting for the kid to confirm loading it. */
  const [linked, setLinked] = useState<string | null>(() => {
    const c = codeFromLink();
    return c && c !== loadCode() ? c : null;
  });
  const latest = useRef(progress);
  const fromServer = useRef<Progress | null>(null);
  const first = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  /** This code was already looked up and had no save: an untouched device needn't ask again. */
  const knownEmpty = useRef<string | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  const apply = useCallback(
    (p: Progress) => {
      fromServer.current = p;
      setProgress(p);
    },
    [setProgress],
  );

  const saved = () => {
    setStatus('saved');
    setLastSaved(Date.now());
  };

  const doPush = useCallback(async () => {
    setStatus('syncing');
    const r = await push(codeRef.current, latest.current);
    if (r.kind === 'conflict') apply(r.server);
    if (r.kind === 'offline') setStatus('offline');
    else saved();
  }, [apply]);

  /** Keep whichever copy is newer. */
  const sync = useCallback(async () => {
    if (knownEmpty.current === codeRef.current && latest.current.updatedAt === 0) return setStatus('saved');
    setStatus('syncing');
    const r = await pull(codeRef.current);
    if (!r.ok) return setStatus('offline');
    const server = r.data;
    if (server && server.updatedAt > latest.current.updatedAt) {
      apply(server);
      saved();
    } else if (server ? latest.current.updatedAt > server.updatedAt : latest.current.updatedAt > 0) await doPush();
    else if (server) saved();
    // An untouched device has nothing to back up yet: the first real change creates the save.
    else {
      knownEmpty.current = codeRef.current;
      setStatus('saved');
    }
  }, [apply, doPush]);

  // Save every change on the device; stamp it and queue a backup.
  useEffect(() => {
    const changed = !first.current && progress !== fromServer.current;
    first.current = false;
    const p = changed ? { ...progress, updatedAt: Date.now() } : progress;
    latest.current = p;
    saveProgress(p);
    if (changed) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(doPush, PUSH_DELAY);
    }
  }, [progress, doPush]);

  // Catch up when the app opens, comes back to the front, or gets a connection back.
  useEffect(() => {
    void sync();
    const onVisible = () => document.visibilityState === 'visible' && void sync();
    const onOnline = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [code, sync]);

  /** Switch this device to another save code. Returns an error message, or null when loaded. */
  const loadSave = useCallback(
    async (input: string): Promise<string | null> => {
      const next = normalizeCode(input);
      if (!next) return 'That doesn’t look like a save code. It has 16 letters and numbers.';
      if (next === codeRef.current) return null;
      const r = await pull(next);
      if (!r.ok) return r.error;
      if (!r.data) return 'No save found for that code.';
      window.clearTimeout(timer.current);
      storeCode(next);
      codeRef.current = next;
      setCode(next);
      apply(r.data);
      saved();
      return null;
    },
    [apply],
  );

  /** Bring in a save file: its progress, and its code when it has one. */
  const restore = useCallback(
    (p: Progress, fileCode: string | null) => {
      if (fileCode && fileCode !== codeRef.current) {
        storeCode(fileCode);
        codeRef.current = fileCode;
        setCode(fileCode);
      }
      setProgress({ ...p }); // a fresh object: stamped and backed up like any change
    },
    [setProgress],
  );

  /** A brand-new save on this device (for a sibling). Theme picks stay. */
  const startNew = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = newCode();
    storeCode(next);
    codeRef.current = next;
    setCode(next);
    apply({ ...newProgress(), settings: latest.current.settings });
    setLastSaved(null);
  }, [apply]);

  const dismissLink = useCallback(() => setLinked(null), []);

  return { code, status, lastSaved, linked, loadSave, restore, startNew, dismissLink, retry: () => void sync() };
}

export type Cloud = ReturnType<typeof useCloud>;
