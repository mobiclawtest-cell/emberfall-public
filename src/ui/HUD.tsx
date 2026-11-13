import React from 'react';
import { Game } from '../game/game';
import { clamp } from '../engine/utils';

export default function HUD({ gameRef, tick }: { gameRef: React.MutableRefObject<Game | null>; tick: number }) {
  const g = gameRef.current;
  if (!g) return null;
  const p = g.player;
  const maxHp = p.totalMaxHp;
  const hearts = Math.ceil(maxHp / 10);
  const full = Math.floor(p.hp / 10);
  const half = p.hp % 10 >= 5 ? 1 : 0;
  const hour = Math.floor(g.timeOfDay * 24);
  const isNight = g.timeOfDay > 0.72 || g.timeOfDay < 0.25;
  return (
    <div className="hud-top">
      <div className="hearts">
        {Array.from({ length: hearts }).map((_, i) => (
          <svg key={i} className="heart" viewBox="0 0 10 9">
            <path d="M2 1h2l1 1 1-1h2v3L5 8 2 4z" fill={i < full ? '#e83a4a' : i === full && half ? '#a83040' : '#3a2430'} stroke="#1a1a22" strokeWidth="0.6" />
          </svg>
        ))}
      </div>
      <div className="stamina-bar"><div className="stamina-fill" style={{ width: `${(p.stamina / p.maxStamina) * 100}%` }} /></div>
      <div className="xp-bar"><div className="xp-fill" style={{ width: `${(p.xp / p.xpNeeded()) * 100}%` }} /></div>
      <div className="stat-row">
        <span>Lv{p.level}</span>
        <span>💰{p.inv.gold}</span>
        <span>{isNight ? '🌙' : '☀'} {String(hour).padStart(2, '0')}:00</span>
        <span>D{g.dayCount}</span>
        {p.status.burn > 0 && <span>🔥</span>}
        {p.status.poison > 0 && <span>☠</span>}
        {p.status.freeze > 0 && <span>❄</span>}
        {g.worldEvent && <span style={{ color: '#e83a4a' }}>{g.worldEvent.kind === 'bloodmoon' ? '🌕!' : g.worldEvent.kind === 'meteor' ? '☄' : '✨'}</span>}
      </div>
    </div>
  );
}
