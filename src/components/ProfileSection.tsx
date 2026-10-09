import { useRef, useState, type FormEvent } from 'react';
import { exportProgress, login, readBackup, register } from '../engine/cloud';
import { useInstall } from '../engine/install';
import type { Progress } from '../engine/progress';
import type { Cloud } from '../engine/useCloud';

interface Props {
  cloud: Cloud;
  progress: Progress;
  onImport: (p: Progress) => void;
}

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} hr ago`;
};

export function ProfileSection({ cloud, progress, onImport }: Props) {
  const { account, status, lastSaved } = cloud;
  const [mode, setMode] = useState<'idle' | 'signin' | 'new'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const hasLocal = progress.sessions.length > 0;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') ?? '').trim();
    const pin = String(f.get('pin') ?? '');
    setBusy(true);
    setError('');
    const r = mode === 'new' ? await register(name, pin, String(f.get('family') ?? '')) : await login(name, pin);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    cloud.signIn(r.data, mode === 'new');
    setMode('idle');
  }

  function signOut() {
    if (status === 'offline' && !window.confirm('This device can’t reach the server, so the newest progress isn’t backed up yet. Sign out anyway?')) return;
    cloud.signOut();
  }

  async function importFile(f: File | undefined) {
    if (!f) return;
    const p = await readBackup(f);
    if (!p) return setNote('That file isn’t a Genius Lab backup.');
    if (!window.confirm(`Replace current progress with this backup (${p.xp.toLocaleString()} XP)?`)) return;
    onImport(p);
    setNote(`Restored ${p.xp.toLocaleString()} XP from the backup.`);
  }

  const statusLine =
    status === 'saved'
      ? `Backed up to the family server${lastSaved ? `, ${ago(lastSaved)}` : ''}.`
      : status === 'syncing'
        ? 'Backing up…'
        : status === 'offline'
          ? 'Offline. Saved on this device; backs up when you reconnect.'
          : 'Session expired. Sign in again to keep backing up.';

  return (
    <section className="settings-group" aria-labelledby="profile-h">
      <h3 id="profile-h" className="group-title">Profile &amp; backup</h3>

      {account ? (
        <div className="profile-card">
          <div className="profile-who">
            <span className="avatar" aria-hidden>
              {account.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{account.name}</strong>
              <span className={`small sync sync-${status}`}>{statusLine}</span>
            </span>
          </div>
          <div className="row-tight">
            {(status === 'offline' || status === 'signed-out') && (
              <button className="btn" onClick={status === 'signed-out' ? () => setMode('signin') : cloud.retry}>
                {status === 'signed-out' ? 'Sign in' : 'Retry'}
              </button>
            )}
            <button className="btn btn-ghost" onClick={signOut}>
              Switch profile
            </button>
          </div>
        </div>
      ) : (
        mode === 'idle' && (
          <div className="profile-card">
            <p className="small">
              <strong>Playing as guest.</strong> Progress lives on this device only. Make a profile to back it up and play on any device.
            </p>
            <div className="row-tight">
              <button className="btn btn-primary" onClick={() => setMode('new')}>
                New profile
              </button>
              <button className="btn" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </div>
          </div>
        )
      )}

      {mode !== 'idle' && (
        <form className="profile-form" onSubmit={submit}>
          <label>
            <span>Name</span>
            <input name="name" autoComplete="username" maxLength={20} required defaultValue={account?.name ?? ''} />
          </label>
          <label>
            <span>PIN (4–8 digits)</span>
            <input name="pin" type="password" inputMode="numeric" pattern="\d{4,8}" autoComplete={mode === 'new' ? 'new-password' : 'current-password'} required />
          </label>
          {mode === 'new' && (
            <label>
              <span>Family code</span>
              <input name="family" inputMode="numeric" autoComplete="off" required />
              <span className="small muted">A parent gets this from the server window.</span>
            </label>
          )}
          {mode === 'new' && hasLocal && <p className="small muted">This device’s progress moves into the new profile.</p>}
          {mode === 'signin' && hasLocal && !account && <p className="small muted">Signing in loads that profile’s saved progress on this device.</p>}
          {error && (
            <p className="small form-error" role="alert">
              {error}
            </p>
          )}
          <div className="row-tight">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Checking…' : mode === 'new' ? 'Create profile' : 'Sign in'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="row-tight">
        <button className="btn btn-ghost" onClick={() => exportProgress(progress, account?.name ?? null)}>
          Download backup
        </button>
        <button className="btn btn-ghost" onClick={() => file.current?.click()}>
          Restore from file
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
      </div>
      {note && <p className="small muted">{note}</p>}

      <InstallRow />
    </section>
  );
}

function InstallRow() {
  const { state, install } = useInstall();
  if (state === 'installed') return null;
  return (
    <div className="install-row">
      <strong>Put it on your home screen</strong>
      {state === 'prompt' && (
        <button className="btn btn-primary" onClick={install}>
          Install app
        </button>
      )}
      {state === 'ios' && <span className="small muted">In Safari, tap Share, then Add to Home Screen.</span>}
      {state === 'manual' && <span className="small muted">Open the https link in Chrome or Safari and use Install or Add to Home Screen.</span>}
    </div>
  );
}
