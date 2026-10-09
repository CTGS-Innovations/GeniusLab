import type { Progress, Settings, ThemeId } from '../engine/progress';
import type { Cloud } from '../engine/useCloud';
import { ProfileSection } from './ProfileSection';

export const THEMES: { id: ThemeId; name: string; vibe: string; swatch: string[] }[] = [
  { id: 'lab', name: 'Lab', vibe: 'Deep navy, violet glow', swatch: ['#101222', '#8b5cf6', '#facc15'] },
  { id: 'street', name: 'Streetwear', vibe: 'Black, white, signal orange', swatch: ['#0b0b0b', '#ff3b1f', '#f5e400'] },
  { id: 'y2k', name: 'Y2K Chrome', vibe: 'Iridescent pink and cyan', swatch: ['#1a1033', '#ff4fd8', '#7df9ff'] },
  { id: 'studio', name: 'Sleek Studio', vibe: 'Light, minimal, focused', swatch: ['#f5f6f8', '#3b5bdb', '#14161c'] },
  { id: 'arcade', name: 'Arcade', vibe: 'Retro console glow', swatch: ['#05030f', '#00e5a0', '#ffd000'] },
];

interface Props {
  /** First launch: frame the sheet as picking a vibe. */
  welcome?: boolean;
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  progress: Progress;
  onImport: (p: Progress) => void;
  cloud: Cloud;
}

export function SettingsSheet({ welcome, settings, onChange, onClose, progress, onImport, cloud }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2>{welcome ? 'Welcome to Genius Lab' : 'Make it yours'}</h2>
            {welcome && <p className="muted small">Change it any time with 🎨 on Home.</p>}
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {welcome && <ProfileSection cloud={cloud} progress={progress} onImport={onImport} />}

        <span className="why-label">Theme</span>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} className={`theme-card ${settings.theme === t.id ? 'on' : ''}`} onClick={() => set('theme', t.id)}>
              <span className="swatch">
                {t.swatch.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              <strong>{t.name}</strong>
              <span className="small muted">{t.vibe}</span>
            </button>
          ))}
        </div>

        <span className="why-label">Play</span>
        <div className="toggles">
          <Toggle label="Speed mode" hint="Timed practice with speed bonuses. Lightning is always timed." on={settings.speed} onFlip={() => set('speed', !settings.speed)} />
          <Toggle label="Motion" hint="Animations and celebrations." on={settings.motion === 'full'} onFlip={() => set('motion', settings.motion === 'full' ? 'reduced' : 'full')} />
          <Toggle label="Haptics" hint="A little buzz on phones when you score." on={settings.haptics} onFlip={() => set('haptics', !settings.haptics)} />
          <Toggle label="Recap stories" hint="Quick highlight cards after each round." on={settings.recap} onFlip={() => set('recap', !settings.recap)} />
        </div>

        {!welcome && <ProfileSection cloud={cloud} progress={progress} onImport={onImport} />}

        {welcome && (
          <button className="btn btn-primary btn-block" onClick={onClose}>
            Let’s go
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, onFlip }: { label: string; hint: string; on: boolean; onFlip: () => void }) {
  return (
    <button className="toggle-row" role="switch" aria-checked={on} onClick={onFlip}>
      <span>
        <strong>{label}</strong>
        <span className="small muted">{hint}</span>
      </span>
      <span className={`knob ${on ? 'on' : ''}`} />
    </button>
  );
}
