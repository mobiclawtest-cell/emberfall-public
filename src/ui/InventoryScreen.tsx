import React, { useState } from 'react';
import { Game } from '../game/game';
import { ITEMS, RARITY_COLORS, ItemDef } from '../items/items';
import { getIcon } from '../items/items';
import { audio } from '../engine/audio';

const EQUIP_SLOTS = ['weapon', 'shield', 'armor', 'boots', 'ring', 'amulet', 'bow', 'tool'];
export default function InventoryScreen({ game, onClose }: { game: Game; onClose: () => void }) {
  const [, force] = useState(0);
  const [sel, setSel] = useState<{ from: 'slots' | 'quick'; idx: number } | null>(null);
  const [tab, setTab] = useState<'items' | 'equip' | 'skills'>('items');
  if (!game) return null;
  const inv = game.player.inv;
  const refresh = () => { force(x => x + 1); };
  const selDef: ItemDef | null = sel ? (() => { const s = (sel.from === 'slots' ? inv.slots : inv.quick)[sel.idx]; return s ? ITEMS[s.id] : null; })() : null;
  const selStack = sel ? (sel.from === 'slots' ? inv.slots : inv.quick)[sel.idx] : null;
  const stats = inv.statTotals();
  return (
    <div className="overlay">
      <div className="overlay-header">
        <h2>INVENTORY</h2>
        <div className="row"><span style={{ color: '#ffd23f', fontSize: 13 }}>💰 {inv.gold}</span><button className="btn small" onClick={onClose}>✕</button></div>
      </div>
      <div className="journal-tabs">
        {(['items', 'equip', 'skills'] as const).map(t => (
          <div key={t} className={`journal-tab${tab === t ? ' selected' : ''}`} onClick={() => setTab(t)}>
            {t === 'items' ? '🎒 Items' : t === 'equip' ? '⚔ Gear' : '✨ Skills'}
          </div>
        ))}
      </div>
      {tab === 'items' && (
        <div className="overlay-body" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ fontSize: 11, color: '#8a8299', padding: '6px 12px 0' }}>Quick slots (X uses them)</div>
          <div className="inv-grid" style={{ gridTemplateColumns: 'repeat(4, 64px)', justifyContent: 'center' }}>
            {inv.quick.map((s, i) => (
              <div key={i} className={`inv-cell${sel?.from === 'quick' && sel.idx === i ? ' selected' : ''}`} onClick={() => { setSel({ from: 'quick', idx: i }); audio.sfx('ui'); }}>
                {s && <><img src={getIcon(ITEMS[s.id]).toDataURL()} alt="" />{s.n > 1 && <span className="qty">{s.n}</span>}</>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#8a8299', padding: '6px 12px 0' }}>Backpack</div>
          <div className="inv-grid scroll-list" style={{ flex: 1 }}>
            {inv.slots.map((s, i) => (
              <div key={i} className={`inv-cell${sel?.from === 'slots' && sel.idx === i ? ' selected' : ''}`} onClick={() => { setSel({ from: 'slots', idx: i }); audio.sfx('ui'); }}>
                {s && <><img src={getIcon(ITEMS[s.id]).toDataURL()} alt="" />{s.n > 1 && <span className="qty">{s.n}</span>}</>}
              </div>
            ))}
          </div>
          {selStack && selDef && (
            <div className="panel" style={{ margin: 8, padding: 10 }}>
              <div className="row">
                <img src={getIcon(selDef).toDataURL()} width={32} height={32} style={{ imageRendering: 'pixelated' }} alt="" />
                <div>
                  <div className={`rarity-${selDef.rarity}`} style={{ fontSize: 13, fontWeight: 'bold' }}>{selDef.name} {selStack.n > 1 ? `x${selStack.n}` : ''}</div>
                  <div style={{ fontSize: 10, color: '#8a8299' }}>{selDef.rarity} {selDef.slot} · {selDef.value}g</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#b8b0c8', margin: '6px 0' }}>{selDef.desc}</div>
              <div style={{ fontSize: 11, color: '#5ad05a' }}>
                {selDef.atk ? `+${selDef.atk} ATK ` : ''}{selDef.def ? `+${selDef.def} DEF ` : ''}{selDef.speed ? `+${selDef.speed} SPD ` : ''}{selDef.luck ? `+${selDef.luck} LCK ` : ''}{selDef.hp ? `+${selDef.hp} HP ` : ''}{selDef.heal ? `Heals ${selDef.heal} ` : ''}{selDef.element ? `· ${selDef.element}` : ''}
              </div>
              <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                {selDef.slot in inv.equip && <button className="btn small primary" onClick={() => { inv.equipItem(sel!.idx, sel!.from === 'quick'); audio.sfx('ui'); setSel(null); refresh(); game.cb.onHudDirty(); }}>Equip</button>}
                {['potion', 'food', 'bomb', 'scroll', 'fish', 'block'].includes(selDef.kind) && (
                  <button className="btn small primary" onClick={() => { game.useItem(selStack.id, sel!.from, sel!.idx); setSel(null); refresh(); }}>Use</button>
                )}
                {sel!.from === 'slots' && <button className="btn small" onClick={() => {
                  const qi = inv.quick.findIndex(q => !q);
                  if (qi >= 0) { inv.quick[qi] = inv.slots[sel!.idx]; inv.slots[sel!.idx] = null; setSel(null); refresh(); audio.sfx('ui'); }
                }}>→ Quick</button>}
                {sel!.from === 'quick' && <button className="btn small" onClick={() => {
                  const s = inv.quick[sel!.idx]; inv.quick[sel!.idx] = null;
                  if (s) inv.add(s.id, s.n); setSel(null); refresh(); audio.sfx('ui');
                }}>→ Pack</button>}
                <button className="btn small danger" onClick={() => {
                  const arr = sel!.from === 'slots' ? inv.slots : inv.quick;
                  const s = arr[sel!.idx];
                  if (s) { game.drops.push({ id: s.id, n: s.n, x: game.player.x + 10, y: game.player.y, t: 120 }); arr[sel!.idx] = null; }
                  setSel(null); refresh();
                }}>Drop</button>
              </div>
            </div>
          )}
        </div>
      )}
      {tab === 'equip' && (
        <div className="overlay-body">
          <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>Attack <b style={{ color: '#ff8a5a' }}>{game.player.totalAtk}</b> · Defense <b style={{ color: '#8ad8f0' }}>{game.player.totalDef}</b> · Speed <b style={{ color: '#5ad05a' }}>{Math.round(game.player.totalSpeed)}</b> · Luck <b style={{ color: '#ffd23f' }}>{game.player.totalLuck}</b></div>
            <div style={{ fontSize: 11, color: '#8a8299' }}>Gear bonuses: +{stats.atk} atk / +{stats.def} def / +{stats.speed} spd / +{stats.luck} lck / +{stats.hp} hp</div>
          </div>
          {EQUIP_SLOTS.map(slot => {
            const e = inv.equip[slot];
            const d = e ? ITEMS[e.id] : null;
            return (
              <div key={slot} className="shop-row">
                {d ? <img src={getIcon(d).toDataURL()} alt="" /> : <div style={{ width: 32, height: 32, background: '#14101f', border: '2px dashed #3a3250', borderRadius: 4 }} />}
                <div className="info">
                  <div style={{ fontSize: 10, color: '#8a8299' }}>{slot.toUpperCase()}</div>
                  {d ? <div className={`rarity-${d.rarity}`} style={{ fontSize: 13 }}>{d.name}</div> : <div style={{ fontSize: 12, color: '#4a4462' }}>— empty —</div>}
                </div>
                {d && <button className="btn small" onClick={() => { inv.unequip(slot); refresh(); audio.sfx('ui'); game.cb.onHudDirty(); }}>Unequip</button>}
              </div>
            );
          })}
          <div className="panel" style={{ padding: 12, marginTop: 10 }}>
            <h3 style={{ fontSize: 13, marginBottom: 6 }}>Cosmetics</h3>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {['hat_hood', 'hat_crown', 'hat_horn'].map(id => {
                const has = inv.count(id) > 0 || game.player.hat === ITEMS[id].effect;
                if (!has && inv.count(id) === 0) return null;
                return (
                  <button key={id} className="btn small" disabled={inv.count(id) === 0 && game.player.hat !== ITEMS[id].effect}
                    onClick={() => { game.player.hat = game.player.hat === ITEMS[id].effect ? null : (ITEMS[id].effect || null); refresh(); }}>
                    {game.player.hat === ITEMS[id].effect ? '✓ ' : ''}{ITEMS[id].name}
                  </button>
                );
              })}
              {['#ff6a2a', '#8ad8f0', '#b08aff', '#5ad05a', '#ffd23f'].map(c => (
                <button key={c} className="btn small" style={{ background: c, minWidth: 40 }} onClick={() => { game.player.swordTrail = c; refresh(); }} title="Sword trail" />
              ))}
              {['#ff9a3a', '#8ad8f0', '#ff5a8a', '#5ad05a'].map(c => (
                <button key={c + 'c'} className="btn small" style={{ boxShadow: `inset 0 0 0 3px ${c}` }} onClick={() => { game.player.cinderTint = c; refresh(); }}>Cinder</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {tab === 'skills' && <SkillTree game={game} refresh={refresh} />}
    </div>
  );
}
function SkillTree({ game, refresh }: { game: Game; refresh: () => void }) {
  const sk = game.player.skills;
  const branch = (name: string, key: 'offense' | 'defense' | 'utility', desc: string[], color: string) => (
    <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
      <div className="row">
        <h3 style={{ fontSize: 14, color, flex: 1 }}>{name} <span style={{ fontSize: 11, color: '#8a8299' }}>Lv {sk[key]}</span></h3>
        <button className="btn small primary" disabled={sk.points <= 0} onClick={() => { sk[key]++; sk.points--; refresh(); audio.sfx('levelup'); game.award('skill1'); if (sk.offense + sk.defense + sk.utility >= 10) game.award('skill10'); }}>
          + Learn
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#8a8299' }}>{desc[Math.min(desc.length - 1, sk[key])]}</div>
    </div>
  );
  return (
    <div className="overlay-body">
      <div style={{ textAlign: 'center', padding: 8, fontSize: 13 }}>Skill points: <b style={{ color: '#ffd23f' }}>{sk.points}</b> <span style={{ fontSize: 10, color: '#8a8299' }}>(earned every 2 levels)</span></div>
      {branch('⚔ Offense', 'offense', ['+8% damage per rank.', 'Combos hit harder.', 'Finishers knock back farther.', 'Attacks pierce armor.', 'Crit chance rises.'], '#ff8a5a')}
      {branch('🛡 Defense', 'defense', ['+8% defense per rank.', 'Blocking costs less stamina.', 'Hazard resistance.', 'Shorter hurt stun.', 'Second wind at low HP.'], '#8ad8f0')}
      {branch('✨ Utility', 'utility', ['+6% speed & stamina regen per rank.', 'Faster rolls.', 'Swim faster.', 'Better loot luck.', 'Cinder hints more often.'], '#5ad05a')}
    </div>
  );
}
