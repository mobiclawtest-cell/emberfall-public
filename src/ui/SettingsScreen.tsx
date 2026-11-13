import React from 'react';
import { dbSet, dbGet } from '../engine/save';

export interface Settings {
  controlSize: number; controlOpacity: number;
  music: number; sfx: number;
  vibration: boolean; quality: 'low' | 'medium' | 'high';
  lefty: boolean;
}
const DEFAULTS: Settings = { controlSize: 100, controlOpacity: 85, music: 0.6, sfx: 0.8, vibration: true, quality: 'medium', lefty: false };
export function loadSettings(): Settings {
  try {
    const s = localStorage.getItem('emberfall_settings');
    if (s) return { ...DEFAULTS, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULTS };
}
function persist(s: Settings) {
  try { localStorage.setItem('emberfall_settings', JSON.stringify(s)); } catch {}
  dbSet('settings', s).catch(() => {});
}
export default function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const upd = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    onChange(next); persist(next);
  };
  const Slider = ({ label, value, set, min = 0, max = 100, fmt }: { label: string; value: number; set: (v: number) => void; min?: number; max?: number; fmt?: (v: number) => string }) => (
    <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
      <div className="row"><span style={{ flex: 1, fontSize: 13 }}>{label}</span><b style={{ color: '#ffd23f' }}>{fmt ? fmt(value) : value}</b></div>
      <input type="range" min={min} max={max} value={value} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: '#c84a2a' }} />
    </div>
  );
  const Toggle = ({ label, value, set }: { label: string; value: boolean; set: (v: boolean) => void }) => (
    <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
      <div className="row">
        <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
        <button className={`btn small ${value ? 'primary' : ''}`} onClick={() => set(!value)}>{value ? 'ON' : 'OFF'}</button>
      </div>
    </div>
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overlay-header"><button className="btn small" onClick={onBack}>← Back</button><h2>SETTINGS</h2><div style={{ width: 60 }} /></div>
      <div className="overlay-body">
        <Slider label="Control size" value={settings.controlSize} set={v => upd({ controlSize: v })} min={70} max={140} fmt={v => `${v}%`} />
        <Slider label="Control opacity" value={settings.controlOpacity} set={v => upd({ controlOpacity: v })} min={30} max={100} fmt={v => `${v}%`} />
        <Slider label="Music volume" value={Math.round(settings.music * 100)} set={v => upd({ music: v / 100 })} fmt={v => `${v}%`} />
        <Slider label="SFX volume" value={Math.round(settings.sfx * 100)} set={v => upd({ sfx: v / 100 })} fmt={v => `${v}%`} />
        <Toggle label="Vibration" value={settings.vibration} set={v => upd({ vibration: v })} />
        <Toggle label="Left-handed layout" value={settings.lefty} set={v => upd({ lefty: v })} />
        <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 13 }}>Quality</span>
          <div className="option-row" style={{ marginTop: 8 }}>
            {(['low', 'medium', 'high'] as const).map(q => (
              <div key={q} className={`option-chip${settings.quality === q ? ' selected' : ''}`} onClick={() => upd({ quality: q })}>{q[0].toUpperCase() + q.slice(1)}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#6a6280', marginTop: 4 }}>Low reduces particles and lighting for weak devices.</div>
        </div>
        <div className="footer-note">Keyboard: WASD/arrows move · J attack · K dodge · L item · I interact · Esc pause</div>
      </div>
    </div>
  );
}
