import React, { useEffect, useState } from 'react';
import { dbGet } from '../engine/save';
import { WorldSave } from '../data/worldtypes';
import { ITEMS, ALL_ITEMS, RARITY_COLORS } from '../items/items';
import { getIcon } from '../items/items';
import { BIOMES } from '../world/biomes';

export default function CollectionScreen({ onBack }: { onBack: () => void }) {
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'items' | 'biomes' | 'relics'>('items');
  useEffect(() => {
    (async () => {
      // union of all worlds' collections
      const idx = (await dbGet<any[]>('worlds_index')) || [];
      const all = new Set<string>();
      for (const w of idx) {
        const save = await dbGet<WorldSave>(`world_${w.id}`);
        if (save?.collection) for (const c of save.collection) all.add(c);
      }
      setCollected(all);
    })();
  }, []);
  const itemCount = ALL_ITEMS.filter(i => collected.has(`item_${i.id}`)).length;
  const biomeCount = Object.keys(BIOMES).filter(id => collected.has(`biome_${id}`)).length;
  const relicCount = ALL_ITEMS.filter(i => i.slot === 'relic' && collected.has(`item_${i.id}`)).length;
  const relicTotal = ALL_ITEMS.filter(i => i.slot === 'relic').length;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overlay-header"><button className="btn small" onClick={onBack}>← Back</button><h2>📖 COLLECTION</h2><div style={{ width: 60 }} /></div>
      <div className="journal-tabs">
        <div className={`journal-tab${tab === 'items' ? ' selected' : ''}`} onClick={() => setTab('items')}>Items {itemCount}/{ALL_ITEMS.length}</div>
        <div className={`journal-tab${tab === 'biomes' ? ' selected' : ''}`} onClick={() => setTab('biomes')}>Biomes {biomeCount}/{Object.keys(BIOMES).length}</div>
        <div className={`journal-tab${tab === 'relics' ? ' selected' : ''}`} onClick={() => setTab('relics')}>Relics {relicCount}/{relicTotal}</div>
      </div>
      <div className="scroll-list" style={{ flex: 1, padding: 8 }}>
        {tab === 'items' && (
          <div className="inv-grid">
            {ALL_ITEMS.map(d => {
              const has = collected.has(`item_${d.id}`);
              return (
                <div key={d.id} className="inv-cell" style={{ opacity: has ? 1 : 0.25 }} title={`${d.name} — ${d.desc}`}>
                  <img src={getIcon(d).toDataURL()} alt={has ? d.name : '???'} />
                </div>
              );
            })}
          </div>
        )}
        {tab === 'biomes' && (
          <div>
            {Object.values(BIOMES).map(b => {
              const has = collected.has(`biome_${b.id}`);
              return (
                <div key={b.id} className="shop-row">
                  <div style={{ width: 32, height: 32, background: has ? b.ground : '#14101f', border: `2px solid ${has ? b.propColor : '#3a3250'}`, borderRadius: 4 }} />
                  <div className="info">
                    <div style={{ fontSize: 13, color: has ? '#e8e0d0' : '#4a4462' }}>{has ? b.name : '???'}</div>
                    {has && <div style={{ fontSize: 10, color: '#8a8299' }}>{b.family} · {b.weather} · {b.liquid}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'relics' && (
          <div>
            <div style={{ fontSize: 11, color: '#8a8299', margin: 8 }}>Collect all relics to earn the “Setseeker” title.</div>
            {ALL_ITEMS.filter(i => i.slot === 'relic').map(d => {
              const has = collected.has(`item_${d.id}`);
              return (
                <div key={d.id} className="shop-row" style={{ opacity: has ? 1 : 0.35 }}>
                  <img src={getIcon(d).toDataURL()} width={32} height={32} alt="" />
                  <div className="info">
                    <div style={{ fontSize: 13, color: has ? '#f0a83f' : '#6a6280' }}>{has ? d.name : '???'}</div>
                    {has && <div style={{ fontSize: 10, color: '#8a8299' }}>{d.desc}</div>}
                  </div>
                  {has && <span style={{ color: '#5ad05a' }}>✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="footer-note">Completing sets grants rewards in-world.</div>
    </div>
  );
}
