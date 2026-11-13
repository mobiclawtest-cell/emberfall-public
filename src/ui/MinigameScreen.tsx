import React, { useEffect, useRef, useState } from 'react';
import { Game } from '../game/game';
import { audio } from '../engine/audio';
import { RNG } from '../engine/rng';
import { ITEMS } from '../items/items';
import { getIcon } from '../items/items';
import { generateEnemy } from '../entities/enemies';
import { generateBoss } from '../entities/bosses';
import { BIOMES } from '../world/biomes';

type MG = 'inn' | 'fishing' | 'dice' | 'cards' | 'arena' | 'bossrush' | 'cooking' | 'treasure' | 'rift';
export default function MinigameScreen({ game, initial, onClose, pushToast }: { game: Game; initial: string; onClose: () => void; pushToast: (t: string, ach?: boolean) => void }) {
  const [mg, setMg] = useState<MG>(initial as MG);
  if (!game) return null;
  return (
    <div className="overlay">
      <div className="overlay-header">
        <h2>🍻 {mg === 'inn' ? 'THE EMBER ARMS INN' : mg.toUpperCase()}</h2>
        <button className="btn small" onClick={onClose}>✕</button>
      </div>
      {mg === 'inn' && (
        <div className="overlay-body center-col">
          <div style={{ fontSize: 12, color: '#b8b0c8', textAlign: 'center' }}>A warm fire crackles. The regulars glance up.</div>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('dice')}>🎲 Knucklebones (5g bet)</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('cards')}>🃏 Ember Cards</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('arena')}>⚔ Colosseum (waves)</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('bossrush')}>👑 Boss Rush</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('fishing')}>🎣 Fishing</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('cooking')}>🍳 Cooking</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('treasure')}>🗺 Treasure Dig</button>
          <button className="btn" style={{ width: '100%' }} onClick={() => setMg('rift')}>⏱ Time-Trial Rift</button>
          <button className="btn gold" style={{ width: '100%' }} onClick={() => {
            game.player.heal(game.player.totalMaxHp);
            game.player.stamina = game.player.maxStamina;
            audio.sfx('sleep');
            pushToast('You rest at the inn. Fully healed!');
            onClose();
          }}>🛏 Rest (free heal)</button>
        </div>
      )}
      {mg === 'dice' && <DiceGame game={game} pushToast={pushToast} />}
      {mg === 'cards' && <CardGame game={game} pushToast={pushToast} />}
      {mg === 'arena' && <Arena game={game} pushToast={pushToast} bossRush={false} />}
      {mg === 'bossrush' && <Arena game={game} pushToast={pushToast} bossRush={true} />}
      {mg === 'fishing' && <Fishing game={game} pushToast={pushToast} />}
      {mg === 'cooking' && <Cooking game={game} pushToast={pushToast} />}
      {mg === 'treasure' && <TreasureDig game={game} pushToast={pushToast} />}
      {mg === 'rift' && <Rift game={game} pushToast={pushToast} />}
    </div>
  );
}
// ---------- Knucklebones (dice) ----------
function DiceGame({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [bet, setBet] = useState(5);
  const [rolls, setRolls] = useState<number[]>([]);
  const [opp, setOpp] = useState<number[]>([]);
  const [result, setResult] = useState('');
  const inv = game.player.inv;
  const roll = () => {
    if (inv.gold < bet) { pushToast('Not enough gold!'); return; }
    inv.gold -= bet;
    audio.sfx('dice');
    const mine = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const theirs = [1 + floor6(), 1 + floor6()];
    setRolls(mine); setOpp(theirs);
    const m = mine[0] + mine[1], t = theirs[0] + theirs[1];
    const pair = mine[0] === mine[1], opair = theirs[0] === theirs[1];
    let win = false, tie = false;
    if (pair && opair) { win = mine[0] > theirs[0]; tie = mine[0] === theirs[0]; }
    else if (pair) win = true;
    else if (opair) win = false;
    else { win = m > t; tie = m === t; }
    if (win) {
      const prize = pair ? bet * 4 : bet * 2;
      inv.gold += prize;
      setResult(`You win! +${prize}g`);
      game.stats.diceWins++;
      game.award('dice_win');
      if (game.stats.diceWins >= 10) game.award('dice_win10');
      audio.sfx('coin');
    } else if (tie) { inv.gold += bet; setResult('Tie. Bet returned.'); }
    else setResult('House wins...');
  };
  return (
    <div className="overlay-body minigame-area">
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>Roll two bones. Pairs beat sums. Pairs pay 4x!</div>
      <div className="row">
        {rolls.map((r, i) => <div key={i} className="dice">{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][r - 1]}</div>)}
        <b style={{ margin: '0 10px' }}>VS</b>
        {opp.map((r, i) => <div key={i} className="dice" style={{ background: '#3a2438', color: '#e8e0d0' }}>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][r - 1]}</div>)}
      </div>
      {result && <b style={{ color: '#ffd23f' }}>{result}</b>}
      <div className="row">
        <button className="btn small" onClick={() => setBet(Math.max(1, bet - 5))}>−</button>
        <span>Bet: {bet}g (have {inv.gold}g)</span>
        <button className="btn small" onClick={() => setBet(bet + 5)}>+</button>
      </div>
      <button className="btn primary" style={{ width: '80%' }} onClick={roll}>🎲 ROLL THE BONES</button>
    </div>
  );
}
const floor6 = () => 1 + Math.floor(Math.random() * 6);
// ---------- Ember Cards ----------
const CARD_SUITS = ['🔥', '❄', '⚡', '🌑'];
function CardGame({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [hand, setHand] = useState<number[]>([]);
  const [oppHand, setOppHand] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ me: 0, opp: 0 });
  const [done, setDone] = useState('');
  const deal = () => {
    const mk = () => Array.from({ length: 3 }, () => 1 + Math.floor(Math.random() * 12));
    setHand(mk()); setOppHand(mk()); setRound(0); setScore({ me: 0, opp: 0 }); setDone('');
    audio.sfx('card');
  };
  const play = (i: number) => {
    if (done || round >= 3) return;
    const mine = hand[i], theirs = oppHand[round];
    const ns = { ...score };
    if (mine > theirs) ns.me++; else if (theirs > mine) ns.opp++;
    setScore(ns);
    setHand(h => h.filter((_, j) => j !== i));
    audio.sfx('card');
    const nr = round + 1;
    setRound(nr);
    if (nr >= 3) {
      if (ns.me > ns.opp) {
        setDone('You win the match! +20g');
        game.player.inv.gold += 20;
        game.stats.cardWins++;
        game.award('card_win');
        game.collection.add('card_ember');
        if (game.collection.has('card_ember')) game.award('card10');
        audio.sfx('coin');
      } else if (ns.me < ns.opp) setDone('You lose the match.');
      else setDone('Draw! +5g');
      if (ns.me === ns.opp) game.player.inv.gold += 5;
    }
  };
  return (
    <div className="overlay-body minigame-area">
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>Best of 3 rounds. Higher card wins the round.</div>
      <div>You {score.me} — {score.opp} Opponent · Round {Math.min(3, round + 1)}/3</div>
      {hand.length === 0 && !done && <button className="btn primary" onClick={deal}>DEAL CARDS</button>}
      {oppHand.length > 0 && <div className="row">
        {oppHand.map((c, i) => (
          <div key={i} className="dice" style={{ background: '#3a2438', color: i === Math.min(round, 2) ? '#ffd23f' : '#4a4462', fontSize: 18 }}>{i <= round - 1 ? c : '?'}</div>
        ))}
      </div>}
      <div className="row">
        {hand.map((c, i) => (
          <button key={i} className="dice" style={{ fontSize: 18, cursor: 'pointer' }} onClick={() => play(i)}>{c}</button>
        ))}
      </div>
      {done && <><b style={{ color: '#ffd23f' }}>{done}</b><button className="btn primary" onClick={deal}>PLAY AGAIN</button></>}
    </div>
  );
}
// ---------- Arena / Boss Rush (simulated quick battles) ----------
function Arena({ game, pushToast, bossRush }: { game: Game; pushToast: (t: string, a?: boolean) => void; bossRush: boolean }) {
  const [wave, setWave] = useState(0);
  const [hp, setHp] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [fighting, setFighting] = useState(false);
  const [over, setOver] = useState(false);
  const start = () => {
    setWave(1); setHp(game.player.totalMaxHp); setLog([bossRush ? 'Boss rush begins!' : 'Wave 1!']); setFighting(true); setOver(false);
    audio.play('boss');
  };
  const fightRound = () => {
    if (!fighting || over) return;
    const p = game.player;
    const enemyPow = bossRush ? 10 + wave * 8 : 3 + wave * 3;
    const myDmg = p.totalAtk * (1 + Math.random() * 0.5);
    const theirDmg = Math.max(1, enemyPow - p.totalDef * 0.5);
    const newHp = hp - theirDmg;
    const survived = Math.random() < 0.5 + myDmg / (enemyPow * 6);
    if (!survived || newHp <= 0) {
      setHp(Math.max(0, newHp));
      setLog(l => [`Defeated on ${bossRush ? 'boss' : 'wave'} ${wave}.`, ...l]);
      setOver(true); setFighting(false);
      audio.play('title');
      return;
    }
    setHp(newHp);
    const prize = wave * (bossRush ? 25 : 8);
    game.player.inv.gold += prize;
    setLog(l => [`${bossRush ? 'Boss' : 'Wave'} ${wave} cleared! +${prize}g`, ...l.slice(0, 6)]);
    setWave(w => w + 1);
    audio.sfx('crit');
    if (!bossRush) {
      if (wave >= 5) game.award('arena5');
      if (wave >= 10) game.award('arena10');
      if (wave >= 20) game.award('arena20');
      game.stats.arenasBest = Math.max(game.stats.arenasBest, wave);
    }
    if (bossRush && wave >= 3) {
      game.award('bossrush');
      if (hp === game.player.totalMaxHp) game.award('win_boss_rush_perfect');
      setLog(l => ['BOSS RUSH COMPLETE! Legendary loot!', ...l]);
      game.player.inv.add('gem_diamond');
      setOver(true); setFighting(false);
    }
  };
  return (
    <div className="overlay-body minigame-area">
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>{bossRush ? 'Face 3 bosses back to back. No healing.' : 'Escalating waves. Cash out anytime!'}</div>
      {!fighting && !over && <button className="btn primary" onClick={start}>{bossRush ? 'START BOSS RUSH' : 'ENTER THE PIT'}</button>}
      {fighting && (
        <>
          <div className="fish-bar" style={{ width: '90%' }}><div className="fish-fill" style={{ width: `${(hp / game.player.totalMaxHp) * 100}%`, background: '#e83a4a' }} /></div>
          <div className="row">
            <button className="btn primary" onClick={fightRound}>⚔ FIGHT</button>
            {!bossRush && <button className="btn gold" onClick={() => { setFighting(false); setOver(true); pushToast(`Cashed out at wave ${wave - 1}!`); }}>💰 Cash Out</button>}
          </div>
        </>
      )}
      <div style={{ width: '100%', maxHeight: 200, overflowY: 'auto' }}>
        {log.map((l, i) => <div key={i} style={{ fontSize: 12, padding: 3, color: i === 0 ? '#ffd23f' : '#8a8299' }}>{l}</div>)}
      </div>
      {over && <button className="btn primary" onClick={start}>AGAIN</button>}
    </div>
  );
}
// ---------- Fishing ----------
function Fishing({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [state, setState] = useState<'idle' | 'waiting' | 'bite' | 'reeling' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [tension, setTension] = useState(0);
  const [caught, setCaught] = useState('');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const cast = () => {
    if (!game.player.inv.count('rod_basic')) { pushToast('You need a fishing rod!'); return; }
    setState('waiting'); setCaught('');
    audio.sfx('splash');
    timers.current.push(window.setTimeout(() => {
      setState('bite');
      audio.sfx('fish');
      timers.current.push(window.setTimeout(() => { setState(s => s === 'bite' ? 'idle' : s); }, 1400));
    }, 1500 + Math.random() * 3500));
  };
  const hook = () => {
    if (state !== 'bite') return;
    timers.current.forEach(clearTimeout);
    setState('reeling'); setProgress(20); setTension(30);
  };
  const reel = () => {
    if (state !== 'reeling') return;
    const pull = 8 + Math.random() * 10;
    const fight = Math.random() * 14;
    setProgress(p2 => {
      const np = p2 + pull - fight * 0.4;
      setTension(t => {
        const nt = t + fight - pull * 0.5;
        if (nt > 100) { setState('idle'); setCaught('The line snapped!'); audio.sfx('break'); return 0; }
        return Math.max(0, nt);
      });
      if (np >= 100) {
        setState('done');
        const rare = Math.random();
        const fishId = rare > 0.97 ? 'fish_void_eel' : rare > 0.9 ? 'fish_golden_carp' : rare > 0.75 ? 'fish_ember_koi' : rare > 0.55 ? 'fish_trout' : rare > 0.35 ? 'fish_frostfin' : 'fish_minnow';
        const treasure = Math.random() < 0.08;
        game.player.inv.add(fishId);
        game.stats.fish++;
        game.award('fish1');
        if (game.stats.fish >= 10) game.award('fish10');
        if (game.stats.fish >= 50) game.award('fish50');
        if (rare > 0.9) game.award('fish_rare');
        if (treasure) { game.player.inv.add('map_treasure'); game.stats.treasures++; game.award('treasure1'); }
        setCaught(`Caught: ${ITEMS[fishId].name}!${treasure ? ' + TREASURE MAP!' : ''}`);
        audio.sfx('catch');
        for (const q of game.dailyQuests) if (q.kind === 'fish' && !q.done) { q.progress++; if (q.progress >= q.n) { q.done = true; game.player.inv.gold += q.reward.gold; pushToast(`Daily quest done! +${q.reward.gold}g`); } }
        return 0;
      }
      if (np <= 0) { setState('idle'); setCaught('It got away...'); return 0; }
      return np;
    });
    audio.sfx('splash');
  };
  return (
    <div className="overlay-body minigame-area" onClick={state === 'bite' ? hook : undefined}>
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>Cast, wait for <b style={{ color: '#4a9af0' }}>!!!</b>, tap to hook, then REEL — but mind the tension!</div>
      <div style={{ fontSize: 48, height: 60 }}>{state === 'bite' ? '‼️' : state === 'waiting' ? '〜〜' : state === 'reeling' ? '🐟' : '🎣'}</div>
      {state === 'idle' && <button className="btn primary" style={{ width: '80%' }} onClick={cast}>CAST LINE</button>}
      {state === 'waiting' && <div>Waiting for a bite...</div>}
      {state === 'bite' && <b style={{ color: '#ffd23f', fontSize: 18 }}>TAP NOW!</b>}
      {state === 'reeling' && (
        <>
          <div className="fish-bar"><div className="fish-fill" style={{ width: `${progress}%`, background: '#5ad05a' }} /></div>
          <div className="fish-bar"><div className="fish-fill" style={{ width: `${tension}%`, background: tension > 75 ? '#e83a4a' : '#f0a83f' }} /></div>
          <button className="btn primary" style={{ width: '80%' }} onClick={reel}>REEL!</button>
        </>
      )}
      {caught && <b style={{ color: '#ffd23f' }}>{caught}</b>}
      {(state === 'done' || (state === 'idle' && caught)) && <button className="btn" onClick={cast}>CAST AGAIN</button>}
    </div>
  );
}
// ---------- Cooking ----------
const RECIPES_COOK: { name: string; needs: { id: string; n: number }[]; out: string }[] = [
  { name: 'Cooked Fish', needs: [{ id: 'fish_trout', n: 1 }], out: 'food_cooked_fish' },
  { name: 'Fish Feast', needs: [{ id: 'fish_ember_koi', n: 1 }, { id: 'food_bread', n: 1 }], out: 'food_meat_stew' },
  { name: 'Honey Cake', needs: [{ id: 'seed_wheat', n: 2 }, { id: 'food_berry', n: 2 }], out: 'food_honey_cake' },
  { name: 'Emberfruit Pie', needs: [{ id: 'food_emberfruit', n: 1 }, { id: 'seed_wheat', n: 1 }], out: 'food_golden_apple' },
  { name: 'Trail Rations', needs: [{ id: 'food_berry', n: 3 }], out: 'food_bread' },
];
function Cooking({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [, force] = useState(0);
  const inv = game.player.inv;
  return (
    <div className="overlay-body">
      {RECIPES_COOK.map(r => {
        const ok = r.needs.every(n => inv.count(n.id) >= n.n);
        return (
          <div key={r.name} className="shop-row">
            <img src={getIcon(ITEMS[r.out]).toDataURL()} width={32} height={32} alt="" />
            <div className="info">
              <div style={{ fontSize: 13 }}>{r.name}</div>
              <div style={{ fontSize: 10, color: ok ? '#5ad05a' : '#8a8299' }}>{r.needs.map(n => `${ITEMS[n.id].name} ${inv.count(n.id)}/${n.n}`).join(' · ')}</div>
            </div>
            <button className="btn small primary" disabled={!ok} onClick={() => {
              for (const n of r.needs) inv.remove(n.id, n.n);
              inv.add(r.out);
              audio.sfx('cook');
              game.stats.cooked++;
              game.award('cook1');
              if (game.stats.cooked >= 10) game.award('cook10');
              force(x => x + 1);
            }}>Cook</button>
          </div>
        );
      })}
    </div>
  );
}
// ---------- Treasure dig ----------
function TreasureDig({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [grid, setGrid] = useState<('hid' | 'dug' | 'loot' | 'empty')[]>(Array(16).fill('hid'));
  const [target, setTarget] = useState(-1);
  const [digs, setDigs] = useState(3);
  const [found, setFound] = useState('');
  const start = () => {
    if (!game.player.inv.count('map_treasure')) { pushToast('You need a Treasure Map!'); return; }
    game.player.inv.remove('map_treasure', 1);
    setTarget(Math.floor(Math.random() * 16));
    setGrid(Array(16).fill('hid'));
    setDigs(3); setFound('');
    audio.sfx('ui');
  };
  const dig = (i: number) => {
    if (target < 0 || digs <= 0 || grid[i] !== 'hid') return;
    const ng = [...grid];
    audio.sfx('mine');
    if (i === target) {
      ng[i] = 'loot';
      const roll = Math.random();
      const loot = roll > 0.85 ? 'gem_diamond' : roll > 0.6 ? 'gem_ruby' : roll > 0.3 ? 'mat_gold_ore' : 'mat_iron_ore';
      game.player.inv.add(loot, 2);
      game.player.inv.gold += 30;
      setFound(`TREASURE! ${ITEMS[loot].name} x2 + 30g`);
      game.stats.treasures++;
      game.award('treasure1');
      if (game.stats.treasures >= 5) game.award('treasure5');
      audio.sfx('chest');
    } else {
      ng[i] = Math.abs(i % 4 - target % 4) + Math.abs(Math.floor(i / 4) - Math.floor(target / 4)) <= 1 ? 'dug' : 'empty';
      setDigs(d2 => {
        const nd = d2 - 1;
        if (nd <= 0 && !found) setFound('Nothing but dirt... buy another map.');
        return nd;
      });
    }
    setGrid(ng);
  };
  return (
    <div className="overlay-body minigame-area">
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>Uses 1 Treasure Map. 3 digs. 🔥 = warm!</div>
      <div className="inv-grid" style={{ gridTemplateColumns: 'repeat(4, 56px)' }}>
        {grid.map((c, i) => (
          <div key={i} className="inv-cell" style={{ fontSize: 20 }} onClick={() => dig(i)}>
            {c === 'hid' ? '🟫' : c === 'loot' ? '💰' : c === 'dug' ? '🔥' : '🕳'}
          </div>
        ))}
      </div>
      <div>Digs left: {digs}</div>
      {found && <b style={{ color: '#ffd23f' }}>{found}</b>}
      <button className="btn primary" onClick={start} disabled={!game.player.inv.count('map_treasure')}>NEW DIG (1 map · have {game.player.inv.count('map_treasure')})</button>
    </div>
  );
}
// ---------- Rift time trial ----------
function Rift({ game, pushToast }: { game: Game; pushToast: (t: string, a?: boolean) => void }) {
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [gates, setGates] = useState(0);
  const [done, setDone] = useState('');
  const interval = useRef<number | null>(null);
  useEffect(() => () => { if (interval.current) clearInterval(interval.current); }, []);
  const start = () => {
    setRunning(true); setTime(0); setGates(0); setDone('');
    interval.current = window.setInterval(() => setTime(t => t + 0.1), 100);
    audio.sfx('portal');
  };
  const gate = () => {
    if (!running) return;
    audio.sfx('switch');
    const ng = gates + 1;
    setGates(ng);
    if (ng >= 5) {
      setRunning(false);
      if (interval.current) clearInterval(interval.current);
      const t = time;
      game.stats.rifts++;
      game.award('rift1');
      if (t < 60) game.award('rift_fast');
      const prize = Math.max(10, Math.round(120 - t));
      game.player.inv.gold += prize;
      setDone(`Rift cleared in ${t.toFixed(1)}s! +${prize}g`);
      audio.sfx('achieve');
    }
  };
  return (
    <div className="overlay-body minigame-area">
      <div style={{ fontSize: 12, color: '#b8b0c8' }}>A rift tears open! Hit 5 rift-gates as fast as you can. Under 60s = bonus title!</div>
      <div style={{ fontSize: 34, fontFamily: 'monospace', color: '#8af0ff' }}>{time.toFixed(1)}s</div>
      <div>Gates: {'⬢'.repeat(gates)}{'⬡'.repeat(5 - gates)}</div>
      {!running && <button className="btn primary" onClick={start}>ENTER RIFT</button>}
      {running && <button className="btn primary" style={{ width: '80%', padding: 20, fontSize: 18 }} onClick={gate}>⬢ GATE!</button>}
      {done && <b style={{ color: '#ffd23f' }}>{done}</b>}
    </div>
  );
}
