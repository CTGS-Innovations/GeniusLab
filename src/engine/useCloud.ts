import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { loadAccount, logout, pull, push, saveAccount, type Account, type SyncStatus } from './cloud';
import { newProgress, saveProgress, type Progress } from './progress';

const PUSH_DELAY = 1200;

/**
 * Offline-first sync. Every change saves on the device right away; signed-in kids also
 * get a copy on the family server. The newer copy (by updatedAt) wins.
 */
export function useCloud(progress: Progress, setProgress: Dispatch<SetStateAction<Progress>>) {
  const [account, setAccount] = useState<Account | null>(loadAccount);
  const [status, setStatus] = useState<SyncStatus>(account ? 'syncing' : 'guest');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const latest = useRef(progress);
  const fromServer = useRef<Progress | null>(null);
  const first = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  const accountRef = useRef(account);
  accountRef.current = account;

  const apply = useCallback(
    (p: Progress) => {
      fromServer.current = p;
      setProgress(p);
    },
    [setProgress],
  );

  const doPush = useCallback(async () => {
    const acct = accountRef.current;
    if (!acct) return;
    setStatus('syncing');
    const r = await push(acct.token, latest.current);
    if (r.kind === 'ok') {
      setStatus('saved');
      setLastSaved(Date.now());
    } else if (r.kind === 'conflict') {
      apply(r.server);
      setStatus('saved');
      setLastSaved(Date.now());
    } else setStatus(r.kind === 'auth' ? 'signed-out' : 'offline');
  }, [apply]);

  /** Pull the server copy; keep whichever is newer. preferServer: signing in on this device. */
  const sync = useCallback(
    async (preferServer = false) => {
      const acct = accountRef.current;
      if (!acct) return;
      setStatus('syncing');
      const r = await pull(acct.token);
      if (!r.ok) return setStatus(r.status === 401 ? 'signed-out' : 'offline');
      const server = r.data;
      if (server && (preferServer || server.updatedAt > latest.current.updatedAt)) {
        apply(server);
        setStatus('saved');
        setLastSaved(Date.now());
      } else if (!server || latest.current.updatedAt > server.updatedAt) await doPush();
      else {
        setStatus('saved');
        setLastSaved(Date.now());
      }
    },
    [apply, doPush],
  );

  // Save every change on the device; stamp and queue a push for changes made here.
  useEffect(() => {
    const changed = !first.current && progress !== fromServer.current;
    first.current = false;
    const p = changed ? { ...progress, updatedAt: Date.now() } : progress;
    latest.current = p;
    saveProgress(p);
    if (changed && accountRef.current) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(doPush, PUSH_DELAY);
    }
  }, [progress, doPush]);

  // Catch up when the app opens, comes back to the front, or gets a connection back.
  useEffect(() => {
    if (!account) return;
    void sync();
    const onVisible = () => document.visibilityState === 'visible' && void sync();
    const onOnline = () => void sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [account, sync]);

  const signIn = useCallback(
    (a: Account, isNew: boolean) => {
      saveAccount(a);
      accountRef.current = a;
      setAccount(a);
      // A new profile takes this device's progress with it; an existing one brings its own.
      void sync(!isNew);
    },
    [sync],
  );

  const signOut = useCallback(() => {
    const acct = accountRef.current;
    window.clearTimeout(timer.current);
    if (acct) void logout(acct.token);
    saveAccount(null);
    accountRef.current = null;
    setAccount(null);
    setStatus('guest');
    setLastSaved(null);
    // The next kid on this device starts clean; their theme picks stay.
    apply({ ...newProgress(), settings: latest.current.settings });
  }, [apply]);

  return { account, status, lastSaved, signIn, signOut, retry: () => void sync() };
}

export type Cloud = ReturnType<typeof useCloud>;
