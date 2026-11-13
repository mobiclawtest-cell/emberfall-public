import React, { useMemo, useState } from 'react';
import { Game } from '../game/game';
import { ITEMS, ItemDef } from '../items/items';
import { getIcon } from '../items/items';
import { audio } from '../engine/audio';
import { RNG } from '../engine/rng';

const STOCK_POOLS: Record<string, string[]> = {
  default: ['potion_minor_potion', 'potion_potion', 'food_bread', 'food_cooked_fish', 'bomb', 'key_iron', 'mat_rope', 'seed_wheat', 'arrow_bundle', 'rod_basic', 'map_treasure', 'boots_leather', 'shield_wooden', 'scroll_fire', 'food_honey_cake', 'potion_stamina_tonic'],
  caravan: ['gem_topaz', 'gem_ruby', 'scroll_storm', 'sword_silver', 'armor_chain', 'relic_5', 'ring_fortune_topaz', 'potion_elixir', 'hat_hood', 'map_treasure', 'sword_fire_iron', 'flute'],
};
export default function ShopScreen({ game, merchant, onClose }: { game: Game; merchant?: string; onClose: () => void }) {
  const [, force] = useState(0);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const inv = game?.player.inv;
  const stock = useMemo(() => {
    // rotating daily stock
    const pool = STOCK_POOLS[merchant === 'caravan' ? 'caravan' : 'default'];
    const dayRng = new RNG(Math.floor(Date.now() / 86400000) + (merchant === 'caravan' ? 77 : 0));
    const shuffled = dayRng.shuffle([...pool]);
    return shuffled.slice(0, 6).map(id => ITEMS[id]).filter(Boolean);
  }, [merchant]);
  if (!game || !inv) return null;
  return (
    <div className="overlay">
      <div className="overlay-header">
        <h2>{merchant === 'caravan' ? '🐪 CARAVAN SHOP' : '🏪 SHOP'}</h2>
        <div className="row"><span style={{ color: '#ffd23f' }}>💰 {inv.gold}</span><button className="btn small" onClick={onClose}>✕</button></div>
      </div>
      <div className="journal-tabs">
        <div className={`journal-tab${tab === 'buy' ? ' selected' : ''}`} onClick={() => setTab('buy')}>Buy (daily stock)</div>
        <div className={`journal-tab${tab === 'sell' ? ' selected' : ''}`} onClick={() => setTab('sell')}>Sell</div>
      </div>
      <div className="overlay-body">
        {tab === 'buy' && stock.map((d: ItemDef) => (
          <div key={d.id} className="shop-row">
            <img src={getIcon(d).toDataURL()} alt="" />
            <div className="info">
              <div className={`rarity-${d.rarity}`} style={{ fontSize: 13 }}>{d.name}</div>
              <div style={{ fontSize: 10, color: '#8a8299' }}>{d.desc}</div>
            </div>
            <button className="btn small gold" disabled={inv.gold < d.value} onClick={() => {
              if (inv.gold < d.value) return;
              const rem = inv.add(d.id, 1);
              if (rem === 0) {
                inv.gold -= d.value; audio.sfx('coin');
                game.stats.bought++;
                if (game.stats.bought >= 10) game.award('shop10');
                force(x => x + 1);
              }
            }}>{d.value}g</button>
          </div>
        ))}
        {tab === 'sell' && inv.slots.map((s, i) => {
          if (!s) return null;
          const d = ITEMS[s.id];
          if (d.slot === 'relic' || d.slot === 'key') return null;
          const price = Math.max(1, Math.floor(d.value * 0.4));
          return (
            <div key={i} className="shop-row">
              <img src={getIcon(d).toDataURL()} alt="" />
              <div className="info">
                <div className={`rarity-${d.rarity}`} style={{ fontSize: 13 }}>{d.name} x{s.n}</div>
              </div>
              <button className="btn small" onClick={() => {
                inv.gold += price;
                s.n--;
                if (s.n <= 0) inv.slots[i] = null;
                audio.sfx('coin');
                game.stats.sold++;
                if (game.stats.sold >= 10) game.award('sell10');
                force(x => x + 1);
              }}>Sell {price}g</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
