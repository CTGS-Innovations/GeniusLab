import { THEMES } from '../data/themes';
import type { Progress, Settings } from '../engine/progress';
import type { Cloud } from '../engine/useCloud';
import { Icon } from './Icon';
import { ProfileSection } from './ProfileSection';


interface Props {
  /** First launch: frame the sheet as picking a vibe. */
  welcome?: boolean;
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  progress: Progress;
  cloud: Cloud;
}

export function SettingsSheet({ welcome, settings, onChange, onClose, progress, cloud }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2>{welcome ? 'Welcome to Genius Lab' : 'Make it yours'}</h2>
            {welcome && <p className="muted small">Change any of this later from Theme &amp; settings on Home.</p>}
          </div>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

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

        <ProfileSection cloud={cloud} progress={progress} />

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
