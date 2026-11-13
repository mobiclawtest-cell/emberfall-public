import React, { useRef, useEffect, useState } from 'react';
import { InputState, Game } from '../game/game';
import { Settings } from './SettingsScreen';
import { audio } from '../engine/audio';
import { TILE, T } from '../world/terrain';
import { ITEMS } from '../items/items';

interface Props {
  inputRef: React.MutableRefObject<InputState>;
  settings: Settings;
  onOpenFishing: () => void;
  gameRef: React.MutableRefObject<Game | null>;
}
// Multi-touch with per-finger tracking via pointer events.
export default function TouchControls({ inputRef, settings, onOpenFishing, gameRef }: Props) {
  const fingers = useRef(new Map<number, { zone: string; dir?: { dx: number; dy: number } }>());
  const [active, setActive] = useState<Record<string, boolean>>({});
  const dpadRef = useRef<HTMLDivElement>(null);
  const setBtn = (zone: string, on: boolean) => {
    setActive(a => ({ ...a, [zone]: on }));
    const inp = inputRef.current;
    if (zone === 'A') { inp.a = on; if (on) inp.aP = true; }
    if (zone === 'B') { inp.b = on; if (on) inp.bP = true; }
    if (zone === 'X') { inp.x = on; if (on) inp.xP = true; }
    if (zone === 'Y') { inp.y = on; if (on) inp.yP = true; }
  };
  const applyDpad = () => {
    let dx = 0, dy = 0;
    for (const f of fingers.current.values()) {
      if (f.zone === 'dpad' && f.dir) { dx = f.dir.dx; dy = f.dir.dy; }
    }
    inputRef.current.dx = dx; inputRef.current.dy = dy;
  };
  const zoneFromPoint = (x: number, y: number): string => {
    // check action buttons container
    const ab = document.getElementById('action-btns');
    if (ab) {
      const r = ab.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        // hit test each button
        for (const z of ['A', 'B', 'X', 'Y']) {
          const el = ab.querySelector(`.abtn-${z.toLowerCase()}`) as HTMLElement;
          if (!el) continue;
          const br = el.getBoundingClientRect();
          const cx = br.left + br.width / 2, cy = br.top + br.height / 2;
          if (Math.hypot(x - cx, y - cy) < br.width * 0.75) return z;
        }
        return 'abpanel';
      }
    }
    const dp = dpadRef.current;
    if (dp) {
      const r = dp.getBoundingClientRect();
      if (x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 20 && y <= r.bottom + 20) return 'dpad';
    }
    return 'panel';
  };
  const dpadDir = (x: number, y: number): { dx: number; dy: number } => {
    const r = dpadRef.current!.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (x - cx) / (r.width / 2), dy = (y - cy) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    if (l < 0.2) { dx = 0; dy = 0; }
    return { dx, dy };
  };
  useEffect(() => {
    const el = document.getElementById('touch-panel');
    if (!el) return;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      audio.init();
      const zone = zoneFromPoint(e.clientX, e.clientY);
      const f: { zone: string; dir?: { dx: number; dy: number } } = { zone };
      if (zone === 'dpad') { f.dir = dpadDir(e.clientX, e.clientY); applyDpad(); setActive(a => ({ ...a, dpad: true })); }
      else if (['A', 'B', 'X', 'Y'].includes(zone)) setBtn(zone, true);
      fingers.current.set(e.pointerId, f);
    };
    const move = (e: PointerEvent) => {
      const f = fingers.current.get(e.pointerId);
      if (!f) return;
      e.preventDefault();
      if (f.zone === 'dpad') { f.dir = dpadDir(e.clientX, e.clientY); applyDpad(); }
    };
    const up = (e: PointerEvent) => {
      const f = fingers.current.get(e.pointerId);
      if (!f) return;
      if (f.zone === 'dpad') { f.dir = undefined; applyDpad(); setActive(a => ({ ...a, dpad: false })); }
      else if (['A', 'B', 'X', 'Y'].includes(f.zone)) setBtn(f.zone, false);
      fingers.current.delete(e.pointerId);
    };
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointermove', move, { passive: false });
    el.addEventListener('pointerup', up, { passive: false });
    el.addEventListener('pointercancel', up, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [settings.lefty]);
  const size = settings.controlSize / 100;
  const op = settings.controlOpacity / 100;
  const lefty = settings.lefty;
  // X double-duty: long-press X near water with rod = fishing
  const [quickItems, setQuickItems] = useState<string[]>([]);
  useEffect(() => {
    const t = setInterval(() => {
      const g = gameRef.current;
      if (g) setQuickItems(g.player.inv.quick.map(s => s ? s.id : ''));
    }, 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div id="touch-panel" className="controls-panel" style={{ touchAction: 'none' }}>
      {/* quick slots display */}
      <div style={{ position: 'absolute', top: 6, left: 8, display: 'flex', gap: 4, opacity: op }}>
        {quickItems.map((id, i) => (
          <div key={i} style={{ width: 30, height: 30, background: '#14101f', border: '2px solid #3a3250', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {id && ITEMS[id] && <QuickIcon id={id} />}
          </div>
        ))}
        <div style={{ fontSize: 9, color: '#6a6280', alignSelf: 'center', marginLeft: 4 }}>X = use</div>
      </div>
      {/* D-pad */}
      <div ref={dpadRef} className={`dpad${lefty ? ' righty' : ''}`} style={{ opacity: op, transform: `scale(${size})`, transformOrigin: lefty ? 'bottom right' : 'bottom left' }}>
        <div className={`dpad-btn${active.dpad ? ' active' : ''}`} style={{ top: 0, left: '33.33%', borderRadius: '6px 6px 0 0' }}>▲</div>
        <div className={`dpad-btn${active.dpad ? ' active' : ''}`} style={{ top: '33.33%', left: 0, borderRadius: '6px 0 0 6px' }}>◀</div>
        <div className="dpad-btn" style={{ top: '33.33%', left: '33.33%', background: 'rgba(20,16,32,0.6)', border: '2px solid rgba(60,52,80,0.4)' }}>✛</div>
        <div className={`dpad-btn${active.dpad ? ' active' : ''}`} style={{ top: '33.33%', right: 0, borderRadius: '0 6px 6px 0' }}>▶</div>
        <div className={`dpad-btn${active.dpad ? ' active' : ''}`} style={{ bottom: 0, left: '33.33%', borderRadius: '0 0 6px 6px' }}>▼</div>
      </div>
      {/* action buttons */}
      <div id="action-btns" className={`action-btns${lefty ? ' lefty' : ''}`} style={{ opacity: op, transform: `scale(${size})`, transformOrigin: lefty ? 'bottom left' : 'bottom right' }}>
        <div className={`abtn abtn-a${active.A ? ' active' : ''}`}>A</div>
        <div className={`abtn abtn-b${active.B ? ' active' : ''}`}>B</div>
        <div className={`abtn abtn-x${active.X ? ' active' : ''}`}>X</div>
        <div className={`abtn abtn-y${active.Y ? ' active' : ''}`}>Y</div>
      </div>
      <div style={{ position: 'absolute', bottom: 4, width: '100%', textAlign: 'center', fontSize: 9, color: '#4a4462', pointerEvents: 'none' }}>
        A attack/place · B dodge/bow · X item · Y interact/block
      </div>
    </div>
  );
}
import { getIcon } from '../items/items';
function QuickIcon({ id }: { id: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    try { setUrl(getIcon(ITEMS[id]).toDataURL()); } catch {}
  }, [id]);
  return url ? <img src={url} style={{ width: '82%', height: '82%', imageRendering: 'pixelated' }} alt="" /> : null;
}
