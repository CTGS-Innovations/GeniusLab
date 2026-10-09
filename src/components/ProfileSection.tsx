import { useRef, useState, type FormEvent } from 'react';
import { exportSave, formatCode, readSave } from '../engine/cloud';
import { useInstall } from '../engine/install';
import type { Progress } from '../engine/progress';
import type { Cloud } from '../engine/useCloud';
import { Icon } from './Icon';

interface Props {
  cloud: Cloud;
  progress: Progress;
}

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} hr ago`;
};

export const saveLink = (code: string) => `${window.location.origin}/#s=${code}`;

/** The save code: the one thing that identifies a kid's progress. No names, no PINs. */
export function ProfileSection({ cloud, progress }: Props) {
  const { code, status, lastSaved } = cloud;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const hasProgress = progress.sessions.length > 0;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${what} copied.`);
    } catch {
      setNote(text);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = String(new FormData(e.currentTarget).get('code') ?? '');
    if (hasProgress && !window.confirm('Load that save? It replaces the progress on this device. Your current code still works anywhere.')) return;
    setBusy(true);
    setError('');
    const err = await cloud.loadSave(input);
    setBusy(false);
    if (err) return setError(err);
    setLoading(false);
    setNote('Save loaded.');
  }

  async function loadFile(f: File | undefined) {
    if (!f) return;
    const save = await readSave(f);
    if (!save) return setNote('That file isn’t a Genius Lab save.');
    if (!window.confirm(`Load this save (${save.progress.xp.toLocaleString()} XP)? It replaces the progress on this device.`)) return;
    cloud.restore(save.progress, save.code);
    setNote(`Loaded ${save.progress.xp.toLocaleString()} XP from the file.`);
  }

  function startNew() {
    if (!window.confirm('Start a new save on this device? Write down or copy the current code first if you want to come back to it.')) return;
    cloud.startNew();
    setNote('New save started.');
  }

  const statusLine =
    status === 'saved'
      ? lastSaved
        ? `Backed up ${ago(lastSaved)}.`
        : 'Backs up as soon as you play.'
      : status === 'syncing'
        ? 'Backing up…'
        : 'Offline. Saved on this device; backs up when it reconnects.';

  return (
    <section className="settings-group" aria-labelledby="save-h">
      <h3 id="save-h" className="group-title">
        Your save
      </h3>
      <p className="small muted">This code is your progress. Keep it private, like a password. Open your link or enter the code on any device to pick up where you left off.</p>

      <div className="save-code-card">
        <code className="save-code" aria-label={`Save code ${formatCode(code).split('').join(' ')}`}>
          {formatCode(code)}
        </code>
        <span className={`small sync sync-${status}`}>{statusLine}</span>
        <div className="row-tight">
          <button className="btn btn-primary" onClick={() => copy(saveLink(code), 'Link')}>
            <Icon name="external" /> Copy my link
          </button>
          <button className="btn" onClick={() => copy(formatCode(code), 'Code')}>
            Copy code
          </button>
          {status === 'offline' && (
            <button className="btn btn-ghost" onClick={cloud.retry}>
              Retry
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <form className="profile-form" onSubmit={submit}>
          <label>
            <span>Save code</span>
            <input name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" required />
          </label>
          {error && (
            <p className="small form-error" role="alert">
              {error}
            </p>
          )}
          <div className="row-tight">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Load save'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setLoading(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="row-tight">
          <button className="btn" onClick={() => setLoading(true)}>
            Use another code
          </button>
          <button className="btn btn-ghost" onClick={() => exportSave(progress, code)}>
            Download save file
          </button>
          <button className="btn btn-ghost" onClick={() => file.current?.click()}>
            Load save file
          </button>
          <button className="btn btn-ghost" onClick={startNew}>
            Start a new save
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
        </div>
      )}
      {note && (
        <p className="small muted" role="status">
          {note}
        </p>
      )}

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
