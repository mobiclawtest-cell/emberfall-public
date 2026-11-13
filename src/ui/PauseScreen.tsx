import React from 'react';
import { Game } from '../game/game';
import { WorldMeta } from '../data/worldtypes';
import { Settings } from './SettingsScreen';
import { audio } from '../engine/audio';
import { fmtTime } from '../engine/utils';

export default function PauseScreen({ game, meta, settings, onClose, onExit, onStats }: {
  game: Game; meta: WorldMeta; settings: Settings; onClose: () => void; onExit: () => void; onStats: () => void;
}) {
  if (!game) return null;
  const p = game.player;
  return (
    <div className="overlay">
      <div className="overlay-header"><h2>PAUSED</h2><button className="btn small" onClick={onClose}>▶ Resume</button></div>
      <div className="overlay-body center-col">
        <div className="panel" style={{ padding: 14, width: '100%' }}>
          <b style={{ color: '#ffd8a8' }}>{meta.name}</b>
          <div style={{ fontSize: 11, color: '#8a8299', marginTop: 4 }}>
            {meta.settings.mode} · {meta.settings.type} · Day {game.dayCount} · Act {game.story.act > 6 ? '★' : game.story.act}
          </div>
          <div style={{ fontSize: 11, color: '#8a8299' }}>Level {p.level} · {p.xp}/{p.xpNeeded()} xp · 💰{p.inv.gold}</div>
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={onStats}>📊 Statistics & Records</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => {
          const name = prompt('Name your home base here? (sets respawn)', 'Homestead');
          if (name) {
            game.home = { owned: true, x: game.player.x, y: game.player.y, level: game.home.level + 1, decorations: game.home.decorations };
            game.respawn = { x: game.player.x, y: game.player.y, layer: game.layer };
            game.award('home1');
            game.toast(`Home established: ${name}`, 'house');
            if (game.home.level > 1) game.award('home_up');
          }
        }}>🏠 Set Home Here</button>
        <button className="btn" style={{ width: '100%' }} onClick={() => { game.saveNow(); game.toast('Saved!'); audio.sfx('ui'); }}>💾 Save Now</button>
        <button className="btn gold" style={{ width: '100%' }} onClick={async () => {
          // photo mode: hide HUD, screenshot
          try {
            const canvas = game.canvas;
            const scale = 3;
            const shot = document.createElement('canvas');
            shot.width = canvas.width * scale; shot.height = canvas.height * scale;
            const sg = shot.getContext('2d')!;
            sg.imageSmoothingEnabled = false;
            game.render();
            sg.drawImage(canvas, 0, 0, shot.width, shot.height);
            const a = document.createElement('a');
            a.href = shot.toDataURL('image/png');
            a.download = `emberfall_${Date.now()}.png`;
            a.click();
            game.award('photo');
            game.toast('Photo saved!', 'gem');
          } catch { game.toast('Photo failed.'); }
        }}>📷 Photo Mode</button>
        {game.story.ending && (
          <button className="btn primary" style={{ width: '100%' }} onClick={() => {
            meta.ngPlus = (meta.ngPlus || 0) + 1;
            game.story.act = 1;
            game.story.ending = null;
            game.player.level += 5;
            game.toast('New Game+! Enemies grow stronger...', 'relic');
            game.award('ngplus');
            onClose();
          }}>🔁 New Game+</button>
        )}
        <button className="btn danger" style={{ width: '100%' }} onClick={onExit}>🚪 Save & Exit to Worlds</button>
      </div>
    </div>
  );
}
