import React, { useState } from 'react';
import { Game } from '../game/game';
import { LORE, ACTS } from '../story/story';
import { BIOMES } from '../world/biomes';
import { HANDMADE } from '../entities/enemies';
import { ELEMENT_COLORS, WEAK_TO } from '../entities/enemies';
import { genomeSprite } from '../engine/sprites';
import { LORE as L } from '../story/story';

export default function JournalScreen({ game, onClose }: { game: Game; onClose: () => void }) {
  const [tab, setTab] = useState<'story' | 'lore' | 'bestiary' | 'regions' | 'quests'>('story');
  if (!game) return null;
  const st = game.story;
  return (
    <div className="overlay">
      <div className="overlay-header"><h2>JOURNAL</h2><button className="btn small" onClick={onClose}>✕</button></div>
      <div className="journal-tabs">
        {(['story', 'quests', 'lore', 'bestiary', 'regions'] as const).map(t => (
          <div key={t} className={`journal-tab${tab === t ? ' selected' : ''}`} onClick={() => setTab(t)}>
            {{ story: '📜', quests: '❗', lore: '📖', bestiary: '👾', regions: '🗺' }[t]} {t[0].toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      <div className="overlay-body">
        {tab === 'story' && (
          <div>
            <div className="panel" style={{ padding: 12, marginBottom: 10 }}>
              <h3 style={{ color: '#ff9a3a', fontSize: 14 }}>The Shattered Heart</h3>
              <p style={{ fontSize: 11, color: '#b8b0c8', marginTop: 4 }}>The Ember Heart is shattered. The Blight spreads from the Fallen Throne. Recover the five embers.</p>
            </div>
            {ACTS.map(a => {
              const done = st.act > a.act;
              const current = st.act === a.act;
              const locked = st.act < a.act;
              return (
                <div key={a.act} className="panel" style={{ padding: 10, marginBottom: 8, opacity: locked ? 0.4 : 1, borderColor: current ? '#ff9a3a' : '#3a3250' }}>
                  <div className="row">
                    <b style={{ flex: 1, fontSize: 13, color: done ? '#5ad05a' : current ? '#ffd8a8' : '#8a8299' }}>
                      {done ? '✓ ' : current ? '▶ ' : ''}Act {a.act}: {a.title}
                    </b>
                  </div>
                  {(current || done) && <div style={{ fontSize: 11, color: '#b8b0c8', marginTop: 4 }}>{a.objective}</div>}
                  {current && <div style={{ fontSize: 10, color: '#8a8299', marginTop: 2 }}>Guardian: {a.boss} · Companion: {a.companion} · Follow the gold marker on the map</div>}
                </div>
              );
            })}
            {st.act >= 6 && !st.ending && <div className="panel" style={{ padding: 10, borderColor: '#ffd23f' }}><b style={{ color: '#ffd23f' }}>FINALE</b><div style={{ fontSize: 11 }}>Face the Ember Heart. Choose the world's fate.</div></div>}
            {st.ending && <div className="panel" style={{ padding: 10, borderColor: '#5ad05a' }}><b style={{ color: '#5ad05a' }}>ENDING: {st.ending.toUpperCase()}</b><div style={{ fontSize: 11, marginTop: 4 }}>The Endless Deep awaits below... (post-game)</div></div>}
          </div>
        )}
        {tab === 'quests' && (
          <div>
            <h3 style={{ fontSize: 13, color: '#ffd8a8', margin: '4px 0 8px' }}>Daily Quests (reset each dawn)</h3>
            {game.dailyQuests.length === 0 && <div style={{ color: '#6a6280', fontSize: 12 }}>Sleep or wait for dawn to receive quests.</div>}
            {game.dailyQuests.map((q: any) => (
              <div key={q.id} className="panel" style={{ padding: 10, marginBottom: 8, borderColor: q.done ? '#5ad05a' : '#3a3250' }}>
                <b style={{ fontSize: 12 }}>{q.done ? '✓ ' : ''}{q.kind === 'slay' ? `Defeat ${q.n} creatures` : q.kind === 'gather' ? `Gather ${q.n} materials` : q.kind === 'fish' ? `Catch ${q.n} fish` : `Explore ${q.n} new regions`}</b>
                <div style={{ fontSize: 10, color: '#8a8299' }}>{q.progress}/{q.n} · Reward: {q.reward.gold}g</div>
              </div>
            ))}
            <h3 style={{ fontSize: 13, color: '#ffd8a8', margin: '12px 0 8px' }}>Side Quests</h3>
            {game.sideQuests.length === 0 && <div style={{ color: '#6a6280', fontSize: 12 }}>Talk to villagers to find work.</div>}
            {game.sideQuests.map((q: any) => (
              <div key={q.id} className="panel" style={{ padding: 10, marginBottom: 8 }}>
                <b style={{ fontSize: 12 }}>{q.title}</b>
                <div style={{ fontSize: 11, color: '#b8b0c8' }}>{q.text}</div>
                <div style={{ fontSize: 10, color: '#8a8299' }}>Reward: {q.reward.gold}g + {q.reward.xp}xp</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'lore' && (
          <div>
            <div style={{ fontSize: 11, color: '#8a8299', marginBottom: 8 }}>{st.loreFound.length}/{LORE.length} pages found</div>
            {LORE.map(l => {
              const found = st.loreFound.includes(l.id);
              return (
                <div key={l.id} className="panel" style={{ padding: 10, marginBottom: 8, opacity: found ? 1 : 0.35 }}>
                  <b style={{ fontSize: 12, color: found ? '#ffd8a8' : '#6a6280' }}>{found ? l.title : '???'}</b>
                  {found && <div style={{ fontSize: 11, color: '#b8b0c8', marginTop: 4 }}>{l.text}</div>}
                </div>
              );
            })}
          </div>
        )}
        {tab === 'bestiary' && (
          <div>
            <div style={{ fontSize: 11, color: '#8a8299', marginBottom: 8 }}>{Object.keys(game.bestiary).length} enemies recorded · weaknesses revealed by fighting them</div>
            {Object.entries(game.bestiary).map(([id, kills]) => (
              <BestiaryRow key={id} id={id} kills={kills as number} />
            ))}
            {Object.keys(game.bestiary).length === 0 && <div style={{ color: '#6a6280' }}>No enemies encountered yet.</div>}
          </div>
        )}
        {tab === 'regions' && (
          <div>
            <div style={{ fontSize: 11, color: '#8a8299', marginBottom: 8 }}>{game.biomesSeen.size}/{Object.keys(BIOMES).length} biomes discovered</div>
            <div className="option-row">
              {[...game.biomesSeen].map(id => (
                <span key={id} className="tag" style={{ borderColor: BIOMES[id]?.ground }}>{BIOMES[id]?.name || id}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function BestiaryRow({ id, kills }: { id: string; kills: number }) {
  const [img, setImg] = useState('');
  useState(() => {
    try {
      // find def: handmade or reconstruct pseudo-genome
      const def = HANDMADE[id];
      if (def) setImg(genomeSprite(def.genome, 0).toDataURL());
    } catch {}
  });
  const def = HANDMADE[id];
  const name = def?.name || id.replace('gen_', 'Beast #');
  const weak = def ? WEAK_TO[def.element] : null;
  return (
    <div className="shop-row">
      {img ? <img src={img} width={32} height={32} style={{ imageRendering: 'pixelated' }} alt="" /> : <div style={{ width: 32, height: 32, background: '#14101f', border: '2px solid #3a3250', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>?</div>}
      <div className="info">
        <div style={{ fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 10, color: '#8a8299' }}>
          {kills} slain
          {def && kills >= 3 && weak && weak !== 'none' && <span style={{ color: ELEMENT_COLORS[weak] }}> · weak to {weak}</span>}
          {def && kills >= 5 && <span> · {def.desc}</span>}
        </div>
      </div>
    </div>
  );
}
