import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/game';
import { CHUNK, TILE, LIQUID_TILES, T } from '../world/terrain';
import { biomeAt } from '../world/terrain';
import { tileMapColor } from '../world/chunks';
import { actDungeonPos } from '../story/story';
import { BIOMES } from '../world/biomes';

export default function MapScreen({ game, onClose }: { game: Game; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  useEffect(() => {
    draw();
  }, [zoom, pan]);
  const draw = () => {
    const c = canvasRef.current; if (!c || !game) return;
    const g = c.getContext('2d')!;
    const W = c.width, H = c.height;
    g.fillStyle = '#0a0812'; g.fillRect(0, 0, W, H);
    const ptx = game.player.x / TILE + pan.x, pty = game.player.y / TILE + pan.y;
    const scale = zoom; // px per tile
    const tilesW = W / scale, tilesH = H / scale;
    const startX = Math.floor(ptx - tilesW / 2), startY = Math.floor(pty - tilesH / 2);
    for (let ty = 0; ty < tilesH; ty++) for (let tx = 0; tx < tilesW; tx++) {
      const wx = startX + tx, wy = startY + ty;
      const ck = `${Math.floor(wx / CHUNK)},${Math.floor(wy / CHUNK)},${game.layer}`;
      if (!game.chunks.explored.has(ck)) {
        g.fillStyle = '#0a0812';
        g.fillRect(tx * scale, ty * scale, scale + 1, scale + 1);
        continue;
      }
      const t = game.chunks.getTile(wx, wy, game.layer);
      const b = game.layer === 0 ? biomeAt(wx, wy, game.opts) : BIOMES.crystal;
      g.fillStyle = tileMapColor(t, b);
      g.fillRect(tx * scale, ty * scale, scale + 1, scale + 1);
    }
    // pins
    g.font = '10px monospace';
    for (const pin of game.pins) {
      const px = (pin.x - startX) * scale, py = (pin.y - startY) * scale;
      if (px < 0 || px > W || py < 0 || py > H) continue;
      g.fillStyle = pin.color; g.fillRect(px - 3, py - 3, 6, 6);
    }
    // quest marker
    if (game.story.act >= 1 && game.story.act <= 5) {
      const dp = actDungeonPos(game.story.act, game.opts.seed);
      const px = (dp.x / TILE - startX) * scale, py = (dp.y / TILE - startY) * scale;
      g.fillStyle = '#ffd23f';
      g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1626'; g.fillText('!', px - 1.5, py + 3.5);
    }
    // shrines
    for (const s of game.shrinesFound) {
      const px = (s.x - startX) * scale, py = (s.y - startY) * scale;
      g.fillStyle = '#ffb43f'; g.fillRect(px - 2, py - 2, 4, 4);
    }
    // player
    const px = (game.player.x / TILE - startX) * scale, py = (game.player.y / TILE - startY) * scale;
    g.fillStyle = '#fff'; g.fillRect(px - 3, py - 3, 6, 6);
    g.fillStyle = '#ff6a2a'; g.fillRect(px - 1, py - 1, 2, 2);
  };
  const addPin = () => {
    const label = prompt('Pin label:', 'Marker');
    if (!label) return;
    game.pins.push({ x: game.player.x / TILE, y: game.player.y / TILE, label, color: '#e83a4a' });
    draw();
  };
  return (
    <div className="overlay">
      <div className="overlay-header">
        <h2>WORLD MAP</h2>
        <div className="row">
          <button className="btn small" onClick={addPin}>📍 Pin</button>
          <button className="btn small" onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}>
        <canvas
          ref={canvasRef} width={320} height={320} className="map-canvas"
          style={{ width: 'min(88vw, 46vh)', height: 'min(88vw, 46vh)' }}
          onPointerDown={e => { dragRef.current = { x: e.clientX, y: e.clientY, pan: { ...pan } }; }}
          onPointerMove={e => {
            const d = dragRef.current; if (!d) return;
            const scale = zoom;
            const c = canvasRef.current!;
            setPan({ x: d.pan.x - (e.clientX - d.x) / scale * (320 / c.clientWidth) , y: d.pan.y - (e.clientY - d.y) / scale * (320 / c.clientWidth) });
          }}
          onPointerUp={() => { dragRef.current = null; }}
        />
        <div className="row">
          <button className="btn small" onClick={() => setZoom(z => Math.max(1, z - 1))}>−</button>
          <span style={{ fontSize: 12 }}>Zoom {zoom}x</span>
          <button className="btn small" onClick={() => setZoom(z => Math.min(8, z + 1))}>+</button>
          <button className="btn small" onClick={() => { setPan({ x: 0, y: 0 }); }}>Center</button>
        </div>
        <div style={{ fontSize: 10, color: '#6a6280' }}>Drag to pan · gold ! = quest · explored areas only · {game.chunks.explored.size} regions explored</div>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {game.pins.map((pin, i) => (
            <span key={i} className="tag" onClick={() => { game.pins.splice(i, 1); draw(); }} style={{ cursor: 'pointer' }}>📍{pin.label} ✕</span>
          ))}
        </div>
      </div>
    </div>
  );
}
