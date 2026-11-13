import React from 'react';
import { Game } from '../game/game';
import { audio } from '../engine/audio';

export default function EndingChoice({ game, onDone }: { game: Game; onDone: () => void }) {
  if (!game) return null;
  const choose = (ending: 'restore' | 'rekindle' | 'consume') => {
    game.story.ending = ending;
    game.story.choices.push(ending);
    game.story.act = 7;
    game.award(`ending_${ending}` as any);
    game.startCutscene(`ending_${ending}`);
    audio.play('victory');
    onDone();
  };
  return (
    <div className="overlay" style={{ background: 'rgba(4,2,10,0.96)' }}>
      <div className="center-col" style={{ margin: 'auto', padding: 24, maxWidth: 380 }}>
        <h2 className="pixel title-glow" style={{ fontSize: 20, textAlign: 'center' }}>THE EMBER HEART</h2>
        <p style={{ fontSize: 12, color: '#b8b0c8', textAlign: 'center' }}>Five embers burn in your hands. The Heart awaits its fate. Choose.</p>
        <button className="btn primary" style={{ width: '100%', padding: 16 }} onClick={() => choose('restore')}>
          🔥 RESTORE — Return the flame to what it was. Safe. Golden. Familiar.
        </button>
        <button className="btn" style={{ width: '100%', padding: 16, borderColor: '#5ad05a' }} onClick={() => choose('rekindle')}>
          🌱 REKINDLE — Let the embers become something new. Wilder. Alive.
        </button>
        <button className="btn" style={{ width: '100%', padding: 16, borderColor: '#8a5ae8' }} onClick={() => choose('consume')}>
          🌑 CONSUME — Take the fire into yourself. Burn for the world, forever.
        </button>
        <div style={{ fontSize: 10, color: '#6a6280' }}>The villages will remember your choice.</div>
      </div>
    </div>
  );
}
