// Boss generator: 2-4 phases, arena hazards, generated name/lore, guaranteed rare drop.
import { RNG } from '../engine/rng';
import { EnemyDef, Element, ELEMENT_COLORS, WEAK_TO, Trait, MoveStyle, AttackStyle } from './enemies';
import { Biome } from '../world/biomes';
import { mix, shade } from '../engine/utils';

export interface BossPhase { hpPct: number; move: MoveStyle; attack: AttackStyle; speedMul: number; arenaHazard: 'none' | 'fire' | 'spikes' | 'poison' | 'meteors'; }
export interface BossDef extends EnemyDef {
  phases: BossPhase[]; lore: string; guaranteedDrop: string; arenaRadius: number; isBoss: true;
}
const TITLES = ['Devourer of Embers', 'Warden of the Hollow', 'the Pale Sovereign', 'Breaker of Dawn', 'the Root-Bound King', 'Herald of the Blight', 'the Starless Maw', 'Keeper of Cinders', 'the Ninth Talon', 'Empress of Ash'];
const BOSS_NAMES = ['Morgath', 'Velkira', 'Ossandrel', 'Thrym', 'Umbrix', 'Kelzara', 'Doomspore', 'Ashkalon', 'Vextris', 'Gravemaw', 'Sizzek', 'Palethorn'];
const LORE = [
  'Once a guardian of the Ember Heart, twisted when the flame shattered.',
  'It ate the light of its own village. Now it hungers still.',
  'Born in the first ash storm; it has never known peace.',
  'A king who bargained with the Blight and lost everything but power.',
  'The Blight grows through it like roots through soil.',
  'It remembers every flame it ever extinguished.',
];
export function generateBoss(seed: number, biome: Biome, playerLevel: number, distFromSpawn: number, storyBoss?: { name: string; element: Element }): BossDef {
  const rng = new RNG(seed);
  const nPhases = rng.int(2, 4);
  const element: Element = storyBoss?.element || (biome.family === 'fire' ? 'fire' : biome.family === 'cold' ? 'ice' : biome.family === 'blight' || biome.family === 'dark' ? 'shadow' : rng.pick(['fire', 'ice', 'poison', 'lightning', 'shadow', 'earth'] as Element[]));
  const body = rng.int(0, 9);
  const primary = mix(biome.ground, ELEMENT_COLORS[element], 0.6);
  const moves: MoveStyle[] = ['chase', 'teleport', 'orbit', 'charge', 'kite'];
  const attacks: AttackStyle[] = ['projectile', 'spread', 'homing', 'slam', 'summon', 'beam'];
  const hazards: BossPhase['arenaHazard'][] = ['none', 'fire', 'spikes', 'poison', 'meteors'];
  const phases: BossPhase[] = [];
  for (let i = 0; i < nPhases; i++) {
    phases.push({
      hpPct: 1 - i / nPhases,
      move: rng.pick(moves), attack: rng.pick(attacks),
      speedMul: 1 + i * 0.25, arenaHazard: i === 0 ? 'none' : rng.pick(hazards),
    });
  }
  const name = storyBoss?.name || `${BOSS_NAMES[rng.int(0, BOSS_NAMES.length - 1)]} ${TITLES[rng.int(0, TITLES.length - 1)]}`;
  const hp = Math.round((140 + playerLevel * 30 + Math.sqrt(distFromSpawn) * 3));
  const base: BossDef = {
    id: `boss_${seed.toString(36)}`,
    name,
    genome: { body, primary, secondary: shade(primary, -40), eye: '#ffffff', size: 5, eyes: rng.int(2, 3), horns: 2, spikes: 3, tail: true, legs: 4, glow: true, seed: rng.int(1, 999999) },
    hp, atk: Math.round(8 + playerLevel * 2.2 + Math.sqrt(distFromSpawn) * 0.3), def: 2 + Math.floor(playerLevel / 2),
    speed: 30, element, weakness: WEAK_TO[element],
    traits: ['shielded', ...(rng.chance(0.5) ? ['frenzied'] : ['regenerating'])] as Trait[],
    move: phases[0].move, attack: phases[0].attack, attackRange: 110, aggroRange: 200,
    tier: 'champion', xp: 60 + playerLevel * 12, goldMin: 40, goldMax: 90,
    drops: [], desc: 'A mighty guardian.', scale: 1.8, knockResist: 0.85,
    phases, lore: LORE[rng.int(0, LORE.length - 1)],
    guaranteedDrop: rng.pick(['sword_ember', 'sword_frost', 'armor_chain', 'amulet_power', 'gem_ruby', 'gem_sapphire', 'sword_gold']),
    arenaRadius: 10, isBoss: true,
  };
  return base;
}
// Story bosses (handcrafted)
export const STORY_BOSSES = [
  { act: 1, name: 'Bramblemaw, Root Guardian', element: 'earth' as Element, biome: 'forest' },
  { act: 2, name: 'Scaldra, the Ember Wyrm', element: 'fire' as Element, biome: 'volcanic' },
  { act: 3, name: 'Ysilde, Frost Regent', element: 'ice' as Element, biome: 'tundra' },
  { act: 4, name: 'Vessalius, Tide Caller', element: 'lightning' as Element, biome: 'sunken_city' },
  { act: 5, name: 'The Fallen King', element: 'shadow' as Element, biome: 'blightlands' },
  { act: 6, name: 'Ember Heart Reborn', element: 'holy' as Element, biome: 'blightlands' },
];
