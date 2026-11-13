import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WorldMeta, WorldSettings, WORLD_TYPES, MODES, KITS, MUTATORS, WorldSave, SAVE_VERSION } from './data/worldtypes';
import { dbGet, dbSet, dbDel, initDB, compress, decompress } from './engine/save';
import { seedFromString, RNG } from './engine/rng';
import { audio } from './engine/audio';
import GameScreen from './ui/GameScreen';
import AchievementsScreen from './ui/AchievementsScreen';
import CollectionScreen from './ui/CollectionScreen';
import SettingsScreen, { Settings, loadSettings } from './ui/SettingsScreen';
import { fmtTime, fmtDate, uid, escapeHtml } from './engine/utils';
import { renderChunk } from './world/chunks';
import { generateChunk } from './world/terrain';
import { BIOMES } from './world/biomes';

type Screen = 'title' | 'worlds' | 'game' | 'achievements' | 'collection' | 'settings';
interface Toast { id: number; text: string; ach?: boolean; }

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [worlds, setWorlds] = useState<WorldMeta[]>([]);
  const [activeWorld, setActiveWorld] = useState<WorldMeta | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalStats, setGlobalStats] = useState({ worlds: 0, playtime: 0 });
  const toastId = useRef(1);
  const pushToast = useCallback((text: string, ach = false) => {
    const id = toastId.current++;
    setToasts(t => [...t.slice(-3), { id, text, ach }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  useEffect(() => {
    (async () => {
      await initDB();
      const idx = (await dbGet<WorldMeta[]>('worlds_index')) || [];
      setWorlds(idx);
      setGlobalStats({ worlds: idx.length, playtime: idx.reduce((a, w) => a + w.playtimeMs, 0) });
    })();
  }, [screen === 'title' || screen === 'worlds']);
  useEffect(() => {
    audio.musicVol = settings.music; audio.sfxVol = settings.sfx;
    if (audio.musicGain) audio.setMusicVol(settings.music);
    if (audio.sfxGain) audio.setSfxVol(settings.sfx);
  }, [settings]);
  // first-tap audio unlock
  useEffect(() => {
    const unlock = () => { audio.init(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  const refreshWorlds = async () => {
    const idx = (await dbGet<WorldMeta[]>('worlds_index')) || [];
    setWorlds(idx);
    setGlobalStats({ worlds: idx.length, playtime: idx.reduce((a, w) => a + w.playtimeMs, 0) });
  };
  const playWorld = (meta: WorldMeta) => {
    audio.init();
    setActiveWorld(meta);
    setScreen('game');
  };
  const deleteWorld = async (id: string) => {
    await dbDel(`world_${id}`);
    const idx = worlds.filter(w => w.id !== id);
    await dbSet('worlds_index', idx);
    setWorlds(idx);
    pushToast('World deleted.');
  };
  const duplicateWorld = async (meta: WorldMeta) => {
    const save = await dbGet<WorldSave>(`world_${meta.id}`);
    if (!save) return;
    const copy: WorldSave = JSON.parse(JSON.stringify(save));
    copy.meta = { ...copy.meta, id: uid(), name: `${meta.name} (copy)`, createdAt: Date.now(), lastPlayed: Date.now() };
    await dbSet(`world_${copy.meta.id}`, copy);
    const idx = [...worlds, copy.meta];
    await dbSet('worlds_index', idx);
    setWorlds(idx);
    pushToast('World duplicated.');
  };
  const renameWorld = async (id: string, name: string) => {
    const save = await dbGet<WorldSave>(`world_${id}`);
    if (save) { save.meta.name = name; await dbSet(`world_${id}`, save); }
    const idx = worlds.map(w => w.id === id ? { ...w, name } : w);
    await dbSet('worlds_index', idx);
    setWorlds(idx);
  };
  const toggleFav = async (id: string) => {
    const save = await dbGet<WorldSave>(`world_${id}`);
    if (save) { save.meta.favorite = !save.meta.favorite; await dbSet(`world_${id}`, save); }
    const idx = worlds.map(w => w.id === id ? { ...w, favorite: !w.favorite } : w);
    await dbSet('worlds_index', idx);
    setWorlds(idx);
  };
  const exportWorld = async (meta: WorldMeta) => {
    const save = await dbGet<WorldSave>(`world_${meta.id}`);
    if (!save) return;
    const code = btoa(unescape(encodeURIComponent(compress(JSON.stringify({ ...save, meta: { ...save.meta, thumbnail: '' } })))));
    try {
      await navigator.clipboard.writeText(code);
      pushToast('World code copied to clipboard!');
    } catch {
      const blob = new Blob([code], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${meta.name.replace(/[^a-z0-9]/gi, '_')}.emberfall`;
      a.click();
      pushToast('World exported as file.');
    }
  };
  const importWorld = async (code: string) => {
    try {
      const json = decompress(decodeURIComponent(escape(atob(code.trim()))));
      const save: WorldSave = JSON.parse(json);
      if (!save.meta || !save.player) throw new Error('bad');
      save.meta.id = uid();
      save.meta.name = save.meta.name + ' (imported)';
      save.meta.lastPlayed = Date.now();
      await dbSet(`world_${save.meta.id}`, save);
      const idx = [...worlds, save.meta];
      await dbSet('worlds_index', idx);
      setWorlds(idx);
      pushToast('World imported!');
      return true;
    } catch { pushToast('Invalid world code.'); return false; }
  };
  const createWorld = async (name: string, seedText: string, settingsW: WorldSettings) => {
    const seed = seedFromString(seedText || String(Date.now()));
    const meta: WorldMeta = {
      id: uid(), name: name || 'New World', seed, seedText,
      settings: settingsW, createdAt: Date.now(), lastPlayed: Date.now(),
      playtimeMs: 0, playerLevel: 1, storyAct: 0, biomesDiscovered: [],
      deepestLayer: 0, achievementIds: [], favorite: false, thumbnail: makePreviewThumb(seed, settingsW.type),
    };
    // create empty save; GameScreen will initialize player on first play
    const save: WorldSave = {
      version: SAVE_VERSION, meta, player: null, story: null, mods: {}, explored: [],
      bestiary: {}, collection: [], pets: [], home: null, stats: null, quests: null,
      chestsOpened: [], switchesHit: [], npcFriends: {}, lastSavedAt: Date.now(),
    };
    await dbSet(`world_${meta.id}`, save);
    const idx = [...worlds, meta];
    await dbSet('worlds_index', idx);
    setWorlds(idx);
    if (settingsW.type === 'chaos') pushToast('Chaos world created. Good luck.');
    playWorld(meta);
  };
  return (
    <>
      {screen === 'title' && <TitleScreen onNav={setScreen} globalStats={globalStats} audioStarted={() => audio.play('title')} />}
      {screen === 'worlds' && (
        <WorldsScreen
          worlds={worlds} globalStats={globalStats}
          onBack={() => setScreen('title')} onPlay={playWorld} onDelete={deleteWorld}
          onDuplicate={duplicateWorld} onRename={renameWorld} onFav={toggleFav}
          onExport={exportWorld} onImport={importWorld} onCreate={createWorld}
        />
      )}
      {screen === 'achievements' && <AchievementsScreen onBack={() => setScreen('title')} unlocked={worlds.flatMap(w => w.achievementIds)} />}
      {screen === 'collection' && <CollectionScreen onBack={() => setScreen('title')} />}
      {screen === 'settings' && <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setScreen('title')} />}
      {screen === 'game' && activeWorld && (
        <GameScreen
          meta={activeWorld} settings={settings} pushToast={pushToast}
          onExit={async () => { await refreshWorlds(); setActiveWorld(null); setScreen('worlds'); }}
        />
      )}
      <div className="toast-stack">
        {toasts.map(t => <div key={t.id} className={`toast${t.ach ? ' achievement' : ''}`}>{t.ach ? '🏆 ' : ''}{t.text}</div>)}
      </div>
    </>
  );
}

// ---- preview thumbnail from seed ----
export function makePreviewThumb(seed: number, type: string): string {
  try {
    const c = document.createElement('canvas'); c.width = 64; c.height = 48;
    const g = c.getContext('2d')!;
    const chunk = generateChunk(0, 0, 0, { seed, type });
    const cv = renderChunk(chunk, seed);
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, 0, 0, 64, 64);
    // mini player marker
    g.fillStyle = '#ff6a2a'; g.fillRect(30, 22, 4, 4);
    return c.toDataURL('image/png');
  } catch { return ''; }
}

function TitleScreen({ onNav, globalStats, audioStarted }: { onNav: (s: Screen) => void; globalStats: { worlds: number; playtime: number }; audioStarted: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // rotating animated pixel-art title background
    const c = canvasRef.current!;
    const g = c.getContext('2d')!;
    c.width = 180; c.height = 160;
    let raf = 0;
    const draw = (t: number) => {
      const s = t / 1000;
      // sky gradient bands
      for (let y = 0; y < 160; y += 4) {
        const f = y / 160;
        const r = Math.round(20 + f * 60 + Math.sin(s * 0.3) * 8);
        const gr = Math.round(10 + f * 25);
        const b = Math.round(35 + f * 40);
        g.fillStyle = `rgb(${r},${gr},${b})`;
        g.fillRect(0, y, 180, 4);
      }
      // sun (ember)
      const sx = 90 + Math.sin(s * 0.1) * 20, sy = 45 + Math.cos(s * 0.13) * 6;
      g.fillStyle = '#ff6a2a'; g.fillRect(sx - 8, sy - 8, 16, 16);
      g.fillStyle = '#ffb43f'; g.fillRect(sx - 5, sy - 5, 10, 10);
      g.fillStyle = '#fff3c4'; g.fillRect(sx - 2, sy - 2, 4, 4);
      // mountains
      g.fillStyle = '#2a2438';
      for (let x = 0; x < 180; x += 4) {
        const h = 30 + Math.sin(x * 0.05) * 10 + Math.sin(x * 0.13) * 5;
        g.fillRect(x, 130 - h, 4, h + 30);
      }
      // embers rising
      for (let i = 0; i < 24; i++) {
        const ex = (i * 37 + s * 14) % 180;
        const ey = 160 - ((i * 23 + s * 26) % 170);
        g.fillStyle = i % 3 ? '#ff9a3a' : '#ffd23f';
        g.fillRect(ex, ey, 2, 2);
      }
      // silhouettes of trees
      g.fillStyle = '#14101f';
      for (let x = 0; x < 180; x += 14) {
        const h = 12 + ((x * 7) % 10);
        g.fillRect(x + 5, 138 - h, 3, h + 10);
        g.fillRect(x + 1, 138 - h, 11, 7);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => { audioStarted(); }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20, paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
      <canvas ref={canvasRef} style={{ width: '88vw', maxWidth: 360, imageRendering: 'pixelated', borderRadius: 6, border: '3px solid #3a3250' }} />
      <h1 className="pixel title-glow" style={{ textAlign: 'center' }}>EMBERFALL<br />CHRONICLES</h1>
      <div style={{ fontSize: 11, color: '#8a8299' }}>A shattered flame. A wandering spark.</div>
      <div className="center-col" style={{ width: '70%', maxWidth: 260 }}>
        <button className="btn primary" style={{ width: '100%' }} onClick={() => onNav('worlds')}>⚔ PLAY</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => onNav('worlds')}>🌍 WORLDS</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => onNav('achievements')}>🏆 ACHIEVEMENTS</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => onNav('collection')}>📖 COLLECTION</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => onNav('settings')}>⚙ SETTINGS</button>
      </div>
      <div className="footer-note">{globalStats.worlds} worlds · {fmtTime(globalStats.playtime)} played · v1.0</div>
    </div>
  );
}

// ---------- Worlds Screen ----------
function WorldsScreen(props: {
  worlds: WorldMeta[]; globalStats: { worlds: number; playtime: number };
  onBack: () => void; onPlay: (w: WorldMeta) => void; onDelete: (id: string) => void;
  onDuplicate: (w: WorldMeta) => void; onRename: (id: string, n: string) => void; onFav: (id: string) => void;
  onExport: (w: WorldMeta) => void; onImport: (code: string) => Promise<boolean>;
  onCreate: (name: string, seed: string, settings: WorldSettings) => void;
}) {
  const { worlds, onBack, onPlay, onDelete, onDuplicate, onRename, onFav, onExport, onImport, onCreate, globalStats } = props;
  const [sort, setSort] = useState<'last' | 'created' | 'name' | 'playtime' | 'fav'>('last');
  const [search, setSearch] = useState('');
  const [wizard, setWizard] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const sorted = [...worlds].sort((a, b) => {
    if (sort === 'fav') return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.lastPlayed - a.lastPlayed;
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'created') return b.createdAt - a.createdAt;
    if (sort === 'playtime') return b.playtimeMs - a.playtimeMs;
    return b.lastPlayed - a.lastPlayed;
  }).filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()));
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overlay-header">
        <button className="btn small" onClick={onBack}>← Back</button>
        <h2>MY WORLDS</h2>
        <button className="btn small primary" onClick={() => setWizard(true)}>+ New</button>
      </div>
      <div style={{ padding: '8px 12px', fontSize: 11, color: '#8a8299', borderBottom: '1px solid #2a2438' }}>
        {globalStats.worlds} worlds · {fmtTime(globalStats.playtime)} total playtime
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 8, alignItems: 'center' }}>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ background: '#14101f', color: '#e8e0d0', border: '2px solid #3a3250', padding: 8, borderRadius: 4, fontFamily: 'inherit' }}>
          <option value="last">Last played</option>
          <option value="created">Created</option>
          <option value="name">Name</option>
          <option value="playtime">Playtime</option>
          <option value="fav">Favorite</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px' }}>
        <button className="btn small grow" onClick={() => setImporting(true)}>📥 Import code</button>
        <button className="btn small grow" onClick={() => fileRef.current?.click()}>📁 Import file</button>
        <input ref={fileRef} type="file" accept=".emberfall,.txt" style={{ display: 'none' }} onChange={async e => {
          const f = e.target.files?.[0];
          if (f) { const txt = await f.text(); await onImport(txt); }
          e.target.value = '';
        }} />
      </div>
      <div className="scroll-list" style={{ flex: 1 }}>
        {sorted.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#6a6280' }}>No worlds yet.<br />Tap "+ New" to begin your journey.</div>}
        {sorted.map(w => (
          <div key={w.id} className="panel world-card">
            {w.thumbnail ? <img src={w.thumbnail} width={64} height={48} alt="" /> : <div style={{ width: 64, height: 48, background: '#14101f', border: '2px solid #3a3250' }} />}
            <div className="meta">
              <div className="row"><b className="grow">{w.name}{w.dead ? ' 💀' : ''}{w.ngPlus ? ` NG+${w.ngPlus}` : ''}</b>
                <span style={{ cursor: 'pointer', color: w.favorite ? '#ffd23f' : '#4a4062', fontSize: 16 }} onClick={() => onFav(w.id)}>★</span>
              </div>
              <div>
                <span className="tag">{WORLD_TYPES.find(t => t.id === w.settings.type)?.name || w.settings.type}</span>
                <span className="tag">{MODES.find(m => m.id === w.settings.mode)?.name || w.settings.mode}</span>
                <span className="tag">seed {w.seedText.slice(0, 12)}</span>
              </div>
              <div style={{ color: '#8a8299' }}>
                Lv {w.playerLevel} · Act {w.storyAct > 6 ? '★' : w.storyAct} · {w.biomesDiscovered.length} biomes · depth {w.deepestLayer} · 🏆{w.achievementIds.length}
              </div>
              <div style={{ color: '#6a6280' }}>Created {fmtDate(w.createdAt)} · Played {fmtTime(w.playtimeMs)}</div>
              <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                <button className="btn small primary" onClick={() => !w.dead && onPlay(w)} disabled={!!w.dead}>{w.dead ? 'LOCKED' : '▶ PLAY'}</button>
                <button className="btn small" onClick={() => { const n = prompt('Rename world:', w.name); if (n) onRename(w.id, n); }}>✏</button>
                <button className="btn small" onClick={() => onDuplicate(w)}>⧉</button>
                <button className="btn small" onClick={() => onExport(w)}>⇪</button>
                <button className="btn small danger" onClick={() => setConfirmDel(w.id)}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {confirmDel && (
        <div className="overlay" style={{ zIndex: 60 }}>
          <div className="center-col" style={{ margin: 'auto', padding: 30 }}>
            <div className="panel" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 10 }}>Delete this world?</h3>
              <p style={{ fontSize: 12, color: '#8a8299', marginBottom: 16 }}>This cannot be undone. All progress, items, and story choices will be lost.</p>
              <div className="row">
                <button className="btn danger grow" onClick={() => { onDelete(confirmDel); setConfirmDel(null); }}>DELETE</button>
                <button className="btn grow" onClick={() => setConfirmDel(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {importing && (
        <div className="overlay" style={{ zIndex: 60 }}>
          <div className="center-col" style={{ margin: 'auto', padding: 20, width: '90%' }}>
            <div className="panel" style={{ padding: 20, width: '100%' }}>
              <h3 style={{ marginBottom: 10 }}>Import World</h3>
              <textarea value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="Paste world code here..." style={{ width: '100%', height: 120, background: '#0e0c16', color: '#e8e0d0', border: '2px solid #3a3250', borderRadius: 4, padding: 8, fontFamily: 'inherit', fontSize: 11, userSelect: 'text' as any }} />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary grow" onClick={async () => { if (await onImport(importCode)) { setImporting(false); setImportCode(''); } }}>Import</button>
                <button className="btn grow" onClick={() => setImporting(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {wizard && <NewWorldWizard onClose={() => setWizard(false)} onCreate={(n, s, st) => { setWizard(false); onCreate(n, s, st); }} />}
    </div>
  );
}

// ---------- New World Wizard ----------
function NewWorldWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, seed: string, settings: WorldSettings) => void }) {
  const rngRef = useRef(new RNG(Date.now()));
  const [name, setName] = useState('');
  const [seed, setSeed] = useState(String(Math.floor(Math.random() * 999999)));
  const [type, setType] = useState('normal');
  const [mode, setMode] = useState('adventure');
  const [kit, setKit] = useState('wanderer');
  const [mutators, setMutators] = useState<string[]>([]);
  const [thumb, setThumb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setThumb(makePreviewThumb(seedFromString(seed || '0'), type)), 300);
    return () => clearTimeout(t);
  }, [seed, type]);
  const dailySeed = () => {
    const d = new Date();
    return `DAILY-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  };
  return (
    <div className="overlay" style={{ zIndex: 60 }}>
      <div className="overlay-header">
        <h2>NEW WORLD</h2>
        <button className="btn small" onClick={onClose}>✕</button>
      </div>
      <div className="overlay-body">
        <div className="wizard-section center-col">
          {thumb && <img src={thumb} width={128} height={96} style={{ imageRendering: 'pixelated', border: '3px solid #3a3250', borderRadius: 4 }} alt="preview" />}
          <div style={{ fontSize: 10, color: '#6a6280' }}>Live terrain preview</div>
        </div>
        <div className="wizard-section">
          <h3>World name</h3>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Adventure" style={{ width: '100%' }} />
        </div>
        <div className="wizard-section">
          <h3>Seed</h3>
          <div className="row">
            <input type="text" value={seed} onChange={e => setSeed(e.target.value)} style={{ flex: 1 }} />
            <button className="btn small" onClick={() => setSeed(String(Math.floor(Math.random() * 999999999)))}>🎲</button>
            <button className="btn small gold" onClick={() => setSeed(dailySeed())}>☀ Daily</button>
          </div>
        </div>
        <div className="wizard-section">
          <h3>World type</h3>
          <div className="option-row">
            {WORLD_TYPES.map(t => (
              <div key={t.id} className={`option-chip${type === t.id ? ' selected' : ''}`} onClick={() => setType(t.id)} title={t.desc}>{t.name}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#6a6280', marginTop: 4 }}>{WORLD_TYPES.find(t => t.id === type)?.desc}</div>
        </div>
        <div className="wizard-section">
          <h3>Mode</h3>
          <div className="option-row">
            {MODES.map(m => (
              <div key={m.id} className={`option-chip${mode === m.id ? ' selected' : ''}`} onClick={() => setMode(m.id)}>{m.name}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#6a6280', marginTop: 4 }}>{MODES.find(m => m.id === mode)?.desc}</div>
        </div>
        {mode === 'challenge' && (
          <div className="wizard-section">
            <h3>Mutators</h3>
            <div className="option-row">
              {MUTATORS.map(m => (
                <div key={m.id} className={`option-chip${mutators.includes(m.id) ? ' selected' : ''}`}
                  onClick={() => setMutators(ms => ms.includes(m.id) ? ms.filter(x => x !== m.id) : [...ms, m.id])} title={m.desc}>{m.name}</div>
              ))}
            </div>
          </div>
        )}
        <div className="wizard-section">
          <h3>Starting kit</h3>
          <div className="option-row">
            {KITS.map(k => (
              <div key={k.id} className={`option-chip${kit === k.id ? ' selected' : ''}`} onClick={() => setKit(k.id)} title={k.desc}>{k.name}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#6a6280', marginTop: 4 }}>{KITS.find(k => k.id === kit)?.desc}</div>
        </div>
        <div className="wizard-section">
          <button className="btn primary" style={{ width: '100%', padding: 16, fontSize: 16 }} onClick={() => onCreate(name || 'New World', seed || String(Date.now()), { type, mode, kit, mutators })}>
            ⚔ CREATE & PLAY
          </button>
        </div>
      </div>
    </div>
  );
}
