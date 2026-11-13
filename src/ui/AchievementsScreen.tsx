import React, { useMemo, useState } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import { dbGet } from '../engine/save';

export default function AchievementsScreen({ onBack, unlocked }: { onBack: () => void; unlocked: string[] }) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const set = useMemo(() => new Set(unlocked), [unlocked]);
  const list = ACHIEVEMENTS.filter(a => filter === 'all' || (filter === 'unlocked') === set.has(a.id));
  const pct = Math.round((set.size / ACHIEVEMENTS.length) * 100);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="overlay-header"><button className="btn small" onClick={onBack}>← Back</button><h2>🏆 TROPHIES</h2><div style={{ width: 60 }} /></div>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2438' }}>
        <div className="row"><span style={{ fontSize: 12 }}>{set.size}/{ACHIEVEMENTS.length} unlocked</span><b style={{ color: '#ffd23f' }}>{pct}%</b></div>
        <div className="xp-bar" style={{ width: '100%', marginTop: 6 }}><div className="xp-fill" style={{ width: `${pct}%` }} /></div>
        <div className="option-row" style={{ marginTop: 8 }}>
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <div key={f} className={`option-chip${filter === f ? ' selected' : ''}`} onClick={() => setFilter(f)}>{f}</div>
          ))}
        </div>
      </div>
      <div className="scroll-list" style={{ flex: 1, padding: 8 }}>
        {list.map(a => {
          const un = set.has(a.id);
          return (
            <div key={a.id} className={`ach-row${un ? ' unlocked' : ''}`}>
              <span className="check">{un ? '✅' : a.secret ? '❓' : '⬜'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: un ? '#ffd8a8' : '#8a8299' }}>{a.secret && !un ? '???' : a.name}</div>
                <div style={{ fontSize: 10, color: '#6a6280' }}>{a.secret && !un ? 'A hidden feat awaits...' : a.desc}</div>
                {a.title && un && <div style={{ fontSize: 10, color: '#b05ae8' }}>Title unlocked: “{a.title}”</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
