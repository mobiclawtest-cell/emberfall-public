import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Game, VIEW_W, VIEW_H, newInput } from '../game/game';
import { GameLoop } from '../engine/loop';
import { audio } from '../engine/audio';
import { WorldMeta, WorldSave } from '../data/worldtypes';
import { dbGet, dbSet } from '../engine/save';
import { applyKit } from '../entities/player';
import { ACH_MAP } from '../data/achievements';
import TouchControls from './TouchControls';
import { Settings } from './SettingsScreen';
import HUD from './HUD';
import InventoryScreen from './InventoryScreen';
import MapScreen from './MapScreen';
import JournalScreen from './JournalScreen';
import ShopScreen from './ShopScreen';
import CraftScreen from './CraftScreen';
import PauseScreen from './PauseScreen';
import MinigameScreen from './MinigameScreen';
import EndingChoice from './EndingChoice';
import StatsScreen from './StatsScreen';

interface Props {
  meta: WorldMeta; settings: Settings;
  pushToast: (text: string, ach?: boolean) => void;
  onExit: () => void;
}
type Overlay = 'none' | 'inventory' | 'map' | 'journal' | 'pause' | 'shop' | 'craft' | 'inn' | 'fasttravel' | 'minigame' | 'endingChoice' | 'stats';

export default function GameScreen({ meta, settings, pushToast, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const inputRef = useRef(newInput());
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [overlayData, setOverlayData] = useState<any>(null);
  const [dialogue, setDialogue] = useState<{ speaker: string; text: string; color?: string } | null>(null);
  const [hudTick, setHudTick] = useState(0);
  const [dead, setDead] = useState(false);
  const overlayRef = useRef<Overlay>('none');
  overlayRef.current = overlay;
  const dialogueRef = useRef(dialogue);
  dialogueRef.current = dialogue;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const openOverlay = useCallback((o: Overlay, data?: any) => {
    const g = gameRef.current;
    if (g) g.frozen = o !== 'none';
    setOverlay(o); setOverlayData(data);
    if (o !== 'none') audio.sfx('uiOpen'); else audio.sfx('uiClose');
  }, []);
  const openRef = useRef(openOverlay);
  openRef.current = openOverlay;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current!;
      // Integer-scale the canvas to fill as much of the phone screen as possible.
      // The wrap is sized to the scaled canvas height so nothing is ever clipped.
      const fit = () => {
        const wrap = canvas.parentElement as HTMLElement;
        const shell = (wrap.parentElement as HTMLElement) || document.body;
        const availW = shell.clientWidth || window.innerWidth || VIEW_W;
        const availH = Math.max(VIEW_H, (shell.clientHeight || window.innerHeight || VIEW_H) * 0.62);
        const scale = Math.max(1, Math.floor(Math.min(availW / VIEW_W, availH / VIEW_H)));
        canvas.style.width = `${VIEW_W * scale}px`;
        canvas.style.height = `${VIEW_H * scale}px`;
        wrap.style.flex = `0 0 ${VIEW_H * scale}px`;
      };
      fit();
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);
      const game = new Game(canvas, meta, {
        onEvent: (e) => {
          if (cancelled) return;
          switch (e.type) {
            case 'toast': pushToast(e.text); break;
            case 'achievement': {
              const a = ACH_MAP[e.id];
              if (a) pushToast(`${a.name} — ${a.desc}`, true);
              break;
            }
            case 'dialogue': setDialogue({ speaker: e.speaker, text: e.text, color: e.color }); break;
            case 'dialogueEnd': setDialogue(null); break;
            case 'openScreen': {
              const map: Record<string, Overlay> = { shop: 'shop', craft: 'craft', inn: 'inn', fasttravel: 'fasttravel', endingChoice: 'endingChoice' };
              openRef.current((map[e.screen] || 'none') as Overlay, e.data);
              break;
            }
            case 'vibrate': if (settingsRef.current.vibration && navigator.vibrate) navigator.vibrate(e.ms); break;
            case 'save': gameRef.current?.saveNow(); break;
            case 'gameOver': if (!e.hardcore) { setDead(true); setTimeout(() => setDead(false), 1800); } else { pushToast('HARDCORE: The world is lost forever.', true); setTimeout(() => onExitRef.current(), 2500); } break;
            case 'ending': break;
          }
        },
        onHudDirty: () => setHudTick(t => t + 1),
      });
      game.quality = settingsRef.current.quality;
      gameRef.current = game;
      const save = await dbGet<WorldSave>(`world_${meta.id}`);
      if (save && save.player) {
        game.load(save);
        const awayMs = Date.now() - (save.lastSavedAt || Date.now());
        if (awayMs > 86400000) {
          pushToast(`Welcome back! You were away ${Math.floor(awayMs / 86400000)}d.`);
          game.award('welcomeback');
        } else if (save.stats && Object.keys(save.stats).length) {
          pushToast(`Welcome back to ${meta.name}!`);
        }
      } else {
        game.spawnAtVillage();
        applyKit(game.player, meta.settings.kit);
        game.meta.achievementIds.push('loaded_once');
        game.startPlay();
        game.rollDailyQuests();
        if (meta.settings.type === 'chaos') game.award('chaos');
        if (meta.settings.type === 'islands') game.award('island');
        if (meta.settings.type === 'frozen') game.award('frozen');
      }
      if (save && save.player) game.startPlay();
      fit();
      const keymap: Record<string, string> = {
        w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
        j: 'a', k: 'b', l: 'x', i: 'y', escape: 'start', ' ': 'a', enter: 'y',
      };
      const keysDown = new Set<string>();
      const applyKeys = () => {
        const inp = inputRef.current;
        inp.dx = (keysDown.has('right') ? 1 : 0) - (keysDown.has('left') ? 1 : 0);
        inp.dy = (keysDown.has('down') ? 1 : 0) - (keysDown.has('up') ? 1 : 0);
        inp.a = keysDown.has('a'); inp.b = keysDown.has('b'); inp.x = keysDown.has('x'); inp.y = keysDown.has('y');
      };
      const kd = (e: KeyboardEvent) => {
        const k = e.key.toLowerCase();
        const m = keymap[k];
        if (!m) return;
        e.preventDefault();
        if (overlayRef.current !== 'none') { if (m === 'start') openRef.current('none'); return; }
        if (!keysDown.has(m)) {
          const inp = inputRef.current;
          if (m === 'a') inp.aP = true; if (m === 'b') inp.bP = true; if (m === 'x') inp.xP = true; if (m === 'y') inp.yP = true;
          if (m === 'start') openRef.current('pause');
        }
        keysDown.add(m); applyKeys();
      };
      const ku = (e: KeyboardEvent) => {
        const m = keymap[e.key.toLowerCase()];
        if (!m) return;
        keysDown.delete(m); applyKeys();
      };
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);
      const loop = new GameLoop(
        (dt) => {
          const g = gameRef.current;
          if (!g) return;
          g.input.dx = inputRef.current.dx; g.input.dy = inputRef.current.dy;
          g.input.a = inputRef.current.a; g.input.b = inputRef.current.b; g.input.x = inputRef.current.x; g.input.y = inputRef.current.y;
          g.input.aP = g.input.aP || inputRef.current.aP; g.input.bP = g.input.bP || inputRef.current.bP;
          g.input.xP = g.input.xP || inputRef.current.xP; g.input.yP = g.input.yP || inputRef.current.yP;
          g.input.startP = g.input.startP || inputRef.current.startP;
          inputRef.current.aP = inputRef.current.bP = inputRef.current.xP = inputRef.current.yP = inputRef.current.startP = false;
          g.update(dt);
        },
        () => { gameRef.current?.render(); },
      );
      loopRef.current = loop;
      loop.start();
      const saveOnHide = () => { if (document.hidden) gameRef.current?.saveNow(); };
      document.addEventListener('visibilitychange', saveOnHide);
      window.addEventListener('pagehide', saveOnHide);
      (canvas as any).__cleanup = () => {
        window.removeEventListener('resize', fit);
        window.removeEventListener('orientationchange', fit);
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        document.removeEventListener('visibilitychange', saveOnHide);
        window.removeEventListener('pagehide', saveOnHide);
      };
    })();
    return () => {
      cancelled = true;
      const c = canvasRef.current as any;
      c?.__cleanup?.();
      loopRef.current?.stop();
      gameRef.current?.saveNow();
      audio.stopMusic();
      gameRef.current = null;
    };
  }, [meta.id]);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const advanceDialogue = () => {
    const g = gameRef.current;
    if (g) g.emitNextDialogue();
  };
  const hudRefresh = () => setHudTick(t => t + 1);
  return (
    <div className="game-shell">
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} />
        <HUD gameRef={gameRef} tick={hudTick} />
        <div className="mini-btns">
          <button className="mini-btn" onClick={() => openOverlay('inventory')}>🎒INV</button>
          <button className="mini-btn" onClick={() => openOverlay('map')}>🗺MAP</button>
          <button className="mini-btn" onClick={() => openOverlay('journal')}>📖JRNL</button>
          <button className="mini-btn" onClick={() => { gameRef.current?.saveNow(); openOverlay('pause'); }}>⏸</button>
        </div>
        {dead && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(60,0,10,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 35 }}>
            <h1 className="pixel" style={{ color: '#e83a4a' }}>YOU FELL</h1>
          </div>
        )}
        {dialogue && (
          <div className="dialogue-box" onClick={advanceDialogue}>
            <div className="speaker" style={{ color: dialogue.color || '#ff9a3a' }}>{dialogue.speaker}</div>
            <div className="text">{dialogue.text}</div>
            <div className="next">▼ tap to continue</div>
          </div>
        )}
        {overlay === 'inventory' && <InventoryScreen game={gameRef.current!} onClose={() => { openOverlay('none'); hudRefresh(); }} />}
        {overlay === 'map' && <MapScreen game={gameRef.current!} onClose={() => openOverlay('none')} />}
        {overlay === 'journal' && <JournalScreen game={gameRef.current!} onClose={() => openOverlay('none')} />}
        {overlay === 'pause' && <PauseScreen game={gameRef.current!} meta={meta} settings={settings} onClose={() => openOverlay('none')} onExit={async () => { await gameRef.current?.saveNow(); onExit(); }} onStats={() => openOverlay('stats')} />}
        {overlay === 'stats' && <StatsScreen game={gameRef.current!} onClose={() => openOverlay('pause')} />}
        {overlay === 'shop' && <ShopScreen game={gameRef.current!} merchant={overlayData?.merchant} onClose={() => { openOverlay('none'); hudRefresh(); }} />}
        {overlay === 'craft' && <CraftScreen game={gameRef.current!} bench={overlayData?.bench || 'none'} onClose={() => { openOverlay('none'); hudRefresh(); }} />}
        {overlay === 'inn' && <MinigameScreen game={gameRef.current!} initial="inn" onClose={() => { openOverlay('none'); hudRefresh(); }} pushToast={pushToast} />}
        {overlay === 'minigame' && <MinigameScreen game={gameRef.current!} initial={overlayData?.game || 'inn'} onClose={() => { openOverlay('none'); hudRefresh(); }} pushToast={pushToast} />}
        {overlay === 'fasttravel' && <FastTravel game={gameRef.current!} onClose={() => openOverlay('none')} />}
        {overlay === 'endingChoice' && <EndingChoice game={gameRef.current!} onDone={() => { openOverlay('none'); }} />}
      </div>
      <TouchControls
        inputRef={inputRef} settings={settings}
        onOpenFishing={() => openOverlay('minigame', { game: 'fishing' })}
        gameRef={gameRef}
      />
    </div>
  );
}

function FastTravel({ game, onClose }: { game: Game; onClose: () => void }) {
  if (!game) return null;
  return (
    <div className="overlay">
      <div className="overlay-header"><h2>FAST TRAVEL</h2><button className="btn small" onClick={onClose}>✕</button></div>
      <div className="overlay-body">
        {game.shrinesFound.length === 0 && <div style={{ color: '#6a6280', textAlign: 'center', padding: 30 }}>No shrines activated yet.</div>}
        {game.shrinesFound.map((s, i) => (
          <button key={i} className="btn" style={{ width: '100%', marginBottom: 8 }} onClick={() => {
            game.player.x = s.x * 16 + 8; game.player.y = s.y * 16 + 16;
            game.layer = 0; game.spawnedChunks.clear(); game.enemies = [];
            audio.sfx('teleport'); onClose();
          }}>⛩ Shrine #{i + 1} ({s.x}, {s.y})</button>
        ))}
      </div>
    </div>
  );
}
