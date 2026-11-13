import React from 'react';
import { Game } from '../game/game';
import { fmtTime } from '../engine/utils';

export default function StatsScreen({ game, onClose }: { game: Game; onClose: () => void }) {
  if (!game) return null;
  const s = game.stats;
  const rows: [string, number][] = [
    ['Enemies slain', s.kills], ['Critical hits', s.crits], ['Combo finishers', s.finishers],
    ['Bosses defeated', s.bosses], ['Elites slain', s.elites], ['Champions slain', s.champions],
    ['Deaths', s.deaths], ['Tiles walked', Math.floor(s.walked)],
    ['Chests opened', s.chests], ['Dungeons cleared', s.dungeons], ['Secrets found', s.secrets],
    ['Items crafted', s.crafted], ['Trees chopped', s.chopped], ['Rocks mined', s.mined],
    ['Fish caught', s.fish], ['Meals cooked', s.cooked], ['Treasures dug', s.treasures],
    ['Crops harvested', s.harvests], ['Side quests done', s.sidequests], ['Gifts given', s.gifts],
    ['Random events', s.events], ['Items bought', s.bought], ['Items sold', s.sold],
    ['Best arena wave', s.arenasBest], ['Dice games won', s.diceWins], ['Card games won', s.cardWins], ['Rifts cleared', s.rifts],
  ];
  return (
    <div className="overlay">
      <div className="overlay-header"><h2>STATISTICS</h2><button className="btn small" onClick={onClose}>✕</button></div>
      <div className="overlay-body">
        <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 12 }}>World records</div>
          <div style={{ fontSize: 11, color: '#8a8299', marginTop: 4 }}>
            Days survived: {game.dayCount} · Biomes: {game.biomesSeen.size} · Bestiary: {Object.keys(game.bestiary).length} · Collection: {game.collection.size} · 🏆 {game.achievements.size}
          </div>
          <div style={{ fontSize: 11, color: '#8a8299' }}>Deepest layer: {game.meta.deepestLayer} · Pins placed: {game.pins.length} · Shrines: {game.shrinesFound.length}</div>
        </div>
        {rows.map(([label, v]) => (
          <div key={label} className="shop-row" style={{ padding: '6px 10px' }}>
            <div className="info" style={{ fontSize: 12 }}>{label}</div>
            <b style={{ color: '#ffd23f' }}>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
