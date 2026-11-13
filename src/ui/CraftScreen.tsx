import React, { useState } from 'react';
import { Game } from '../game/game';
import { ITEMS } from '../items/items';
import { getIcon } from '../items/items';
import { RECIPES, recipesFor, Recipe } from '../items/crafting';
import { audio } from '../engine/audio';

export default function CraftScreen({ game, bench, onClose }: { game: Game; bench: 'none' | 'bench' | 'anvil'; onClose: () => void }) {
  const [, force] = useState(0);
  if (!game) return null;
  const inv = game.player.inv;
  const recipes = recipesFor(bench);
  const canCraft = (r: Recipe) => r.needs.every(n => inv.count(n.id) >= n.n);
  return (
    <div className="overlay">
      <div className="overlay-header">
        <h2>{bench === 'anvil' ? '⚒ BLACKSMITH' : bench === 'bench' ? '🛠 CRAFTING BENCH' : '🖐 FIELD CRAFTING'}</h2>
        <button className="btn small" onClick={onClose}>✕</button>
      </div>
      <div className="overlay-body">
        {recipes.map(r => {
          const out = ITEMS[r.out];
          const ok = canCraft(r);
          return (
            <div key={r.id} className="shop-row">
              <img src={getIcon(out).toDataURL()} alt="" />
              <div className="info">
                <div className={`rarity-${out.rarity}`} style={{ fontSize: 13 }}>{out.name}{r.n > 1 ? ` x${r.n}` : ''}</div>
                <div style={{ fontSize: 10, color: ok ? '#5ad05a' : '#8a8299' }}>
                  {r.needs.map(n => `${ITEMS[n.id].name} ${inv.count(n.id)}/${n.n}`).join(' · ')}
                </div>
              </div>
              <button className="btn small primary" disabled={!ok} onClick={() => {
                for (const n of r.needs) inv.remove(n.id, n.n);
                inv.add(r.out, r.n);
                audio.sfx('craft');
                game.stats.crafted++;
                game.award('craft1');
                if (game.stats.crafted >= 10) game.award('craft10');
                if (game.stats.crafted >= 50) game.award('craft50');
                game.player = game.player;
                force(x => x + 1);
              }}>Craft</button>
            </div>
          );
        })}
        {recipes.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#6a6280' }}>No recipes here. Find a bench or anvil.</div>}
      </div>
    </div>
  );
}
