// Procedural enemy genome system + 15 handcrafted enemies. Biome-colored, element-tinted.
import { RNG, hash2 } from '../engine/rng';
import { Genome } from '../engine/sprites';
import { Biome } from '../world/biomes';
import { mix, shade } from '../engine/utils';

export type Element = 'none' | 'fire' | 'ice' | 'poison' | 'lightning' | 'shadow' | 'holy' | 'earth';
export const ELEMENT_COLORS: Record<Element, string> = {
  none: '#c8c8c8', fire: '#ff6a2a', ice: '#8ad8f0', poison: '#7ad05a', lightning: '#f0e83f', shadow: '#8a5ae8', holy: '#fff3c4', earth: '#a87840',
};
// weakness chart: element -> element it is weak to
export const WEAK_TO: Record<Element, Element> = {
  none: 'none', fire: 'ice', ice: 'fire', poison: 'holy', lightning: 'earth', shadow: 'holy', holy: 'shadow', earth: 'lightning',
};
export type Trait = 'armored' | 'regenerating' | 'explosive' | 'splitting' | 'vampiric' | 'shielded' | 'frenzied' | 'reflective';
export type Tier = 'common' | 'elite' | 'champion' | 'mythic';
export type MoveStyle = 'hop' | 'charge' | 'flank' | 'kite' | 'burrow' | 'teleport' | 'swarm' | 'orbit' | 'ambush' | 'patrol' | 'chase';
export type AttackStyle = 'melee' | 'lunge' | 'projectile' | 'spread' | 'homing' | 'slam' | 'cloud' | 'summon' | 'beam' | 'trap';
export interface EnemyDef {
  id: string; name: string; genome: Genome;
  hp: number; atk: number; def: number; speed: number;
  element: Element; weakness: Element; traits: Trait[];
  move: MoveStyle; attack: AttackStyle; attackRange: number; aggroRange: number;
  tier: Tier; xp: number; goldMin: number; goldMax: number;
  drops: { id: string; chance: number }[];
  desc: string; scale: number; knockResist: number;
}
const NAME_A = ['Ash', 'Ember', 'Mire', 'Frost', 'Storm', 'Blight', 'Dusk', 'Thorn', 'Gloom', 'Cinder', 'Vile', 'Grim', 'Pale', 'Iron', 'Wild', 'Hex'];
const NAME_B = ['maw', 'fang', 'wing', 'crawler', 'stalker', 'fiend', 'wisp', 'hound', 'spawn', 'reaver', 'lurker', 'shambler', 'talon', 'horn', 'mote', 'king'];
const EPITHETS = ['the Insatiable', 'of the Deep', 'the Unbroken', 'Twice-Cursed', 'the Silent', 'Ember-Touched', 'the Devourer', 'of Nine Lives', 'the Pale', 'Star-Fallen'];
// ---- handmade early-game enemies ----
const H = (id: string, name: string, body: number, primary: string, secondary: string, eye: string, stats: Partial<EnemyDef> & { move: MoveStyle; attack: AttackStyle }): EnemyDef => ({
  id, name, genome: { body, primary, secondary, eye, size: 4, eyes: 2, horns: 0, spikes: 0, tail: false, legs: 2, glow: false, seed: id.length * 733 + body * 91 },
  hp: 20, atk: 5, def: 0, speed: 26, element: 'none', weakness: 'none', traits: [],
  attackRange: 14, aggroRange: 90, tier: 'common', xp: 5, goldMin: 1, goldMax: 4,
  drops: [], desc: '', scale: 1, knockResist: 0, ...stats,
});
export const HANDMADE: Record<string, EnemyDef> = {
  slime: H('slime', 'Slime', 0, '#5ac84a', '#3f9a35', '#1a2a1a', { move: 'hop', attack: 'melee', hp: 14, atk: 3, speed: 20, traits: ['splitting'], drops: [{ id: 'mat_slime_gel', chance: 0.7 }], desc: 'Splits when struck.' }),
  bat: H('bat', 'Cave Bat', 3, '#6a5a7a', '#4a3f5a', '#e83a4a', { move: 'swarm', attack: 'lunge', hp: 8, atk: 3, speed: 48, desc: 'Swoops unpredictably.' }),
  goblin: H('goblin', 'Goblin Archer', 2, '#5a8a3f', '#8a6a3f', '#ffd23f', { move: 'kite', attack: 'projectile', hp: 16, atk: 5, speed: 30, attackRange: 90, drops: [{ id: 'mat_hide', chance: 0.4 }], desc: 'Keeps its distance and shoots.' }),
  wolf: H('wolf', 'Gray Wolf', 1, '#7a7a85', '#5a5a65', '#ffd23f', { move: 'flank', attack: 'lunge', hp: 22, atk: 6, speed: 44, desc: 'Circles, then lunges. Hunts in packs.' }),
  skeleton: H('skeleton', 'Skeleton', 2, '#e8e2d2', '#b8b2a2', '#3a3a4a', { move: 'chase', attack: 'melee', hp: 26, atk: 7, speed: 28, weakness: 'holy', drops: [{ id: 'mat_bone', chance: 0.6 }], desc: 'Rattles toward you relentlessly.' }),
  scorpion: H('scorpion', 'Dune Scorpion', 6, '#c89a3f', '#8a6a2a', '#1a1a22', { move: 'ambush', attack: 'melee', hp: 24, atk: 8, speed: 26, element: 'poison', weakness: 'ice', traits: ['armored'], desc: 'Venomous sting.' }),
  ice_golem: H('ice_golem', 'Ice Golem', 7, '#a8d8f0', '#7ab8d8', '#1a3a5a', { move: 'chase', attack: 'slam', hp: 60, atk: 12, def: 4, speed: 16, element: 'ice', weakness: 'fire', traits: ['armored'], xp: 15, desc: 'Slow, crushing slams.' }),
  fire_imp: H('fire_imp', 'Fire Imp', 2, '#e05a1e', '#8a2a1a', '#fff3c4', { move: 'teleport', attack: 'projectile', hp: 18, atk: 8, speed: 32, element: 'fire', weakness: 'ice', drops: [{ id: 'mat_ember_shard', chance: 0.35 }], desc: 'Blinks around lobbing embers.' }),
  crab: H('crab', 'Coral Crab', 6, '#f06a6a', '#c84a4a', '#1a1a22', { move: 'patrol', attack: 'melee', hp: 30, atk: 6, def: 3, speed: 18, traits: ['armored'], desc: 'Sideways menace.' }),
  ghost: H('ghost', 'Moor Ghost', 9, '#c8d8e8', '#8aa8c8', '#3a5a8a', { move: 'teleport', attack: 'melee', hp: 20, atk: 9, speed: 24, element: 'shadow', weakness: 'holy', desc: 'Phases through the mist.' }),
  bandit: H('bandit', 'Road Bandit', 2, '#8a5a3a', '#5a3f28', '#ffd23f', { move: 'flank', attack: 'melee', hp: 30, atk: 8, speed: 34, drops: [{ id: 'mat_rope', chance: 0.4 }], desc: 'After your coin purse.' }),
  plant: H('plant', 'Snapper Vine', 8, '#3f9a4a', '#c84a6a', '#ffd23f', { move: 'ambush', attack: 'cloud', hp: 26, atk: 7, speed: 0, element: 'poison', weakness: 'fire', desc: 'Rooted. Spits poison clouds.' }),
  serpent: H('serpent', 'Marsh Serpent', 4, '#5a8a6a', '#3f6a4f', '#ffd23f', { move: 'burrow', attack: 'lunge', hp: 28, atk: 9, speed: 36, desc: 'Burrows and strikes.' }),
  mech: H('mech', 'Clockwork Drone', 5, '#b8903f', '#8a6a2a', '#e83a4a', { move: 'orbit', attack: 'projectile', hp: 34, atk: 9, def: 2, speed: 26, element: 'lightning', weakness: 'earth', drops: [{ id: 'mat_ancient_gear', chance: 0.5 }], desc: 'Ancient guardian automaton.' }),
  cultist: H('cultist', 'Blight Cultist', 2, '#5a3a6a', '#3a2a45', '#a83aff', { move: 'kite', attack: 'homing', hp: 32, atk: 10, speed: 28, element: 'shadow', weakness: 'holy', attackRange: 100, drops: [{ id: 'mat_dark_essence', chance: 0.4 }], desc: 'Serves the Fallen Throne.' }),
};
// family -> handmade def ids preference
const FAMILY_HANDMADE: Record<string, string[]> = {
  slime: ['slime'], wolf: ['wolf'], beast: ['wolf'], goblin: ['goblin'], plant: ['plant'],
  insect: ['scorpion'], scorpion: ['scorpion'], golem: ['ice_golem'], icegolem: ['ice_golem'],
  imp: ['fire_imp'], firespirit: ['fire_imp'], crab: ['crab'], fish: ['crab'],
  spirit: ['ghost'], ghost: ['ghost'], skeleton: ['skeleton'], bandit: ['bandit'],
  serpent: ['serpent'], bat: ['bat'], mech: ['mech'], blighted: ['cultist'],
  crystalgolem: ['ice_golem'], winged: ['bat'],
};
// ---- procedural generator ----
const BODY_MOVES: MoveStyle[][] = [
  ['hop', 'chase'], ['flank', 'chase', 'patrol'], ['chase', 'kite', 'ambush'], ['swarm', 'kite'],
  ['burrow', 'chase'], ['teleport', 'orbit'], ['swarm', 'kite'], ['chase', 'charge'],
  ['ambush', 'chase'], ['teleport', 'orbit', 'kite'],
];
const BODY_ATTACKS: AttackStyle[][] = [
  ['melee', 'cloud'], ['lunge', 'melee'], ['melee', 'projectile'], ['lunge', 'projectile'],
  ['lunge', 'melee'], ['projectile', 'homing', 'beam'], ['spread', 'projectile'], ['slam', 'melee'],
  ['cloud', 'trap'], ['homing', 'cloud'],
];
export function generateEnemy(seed: number, biome: Biome, tier: Tier, playerLevel: number, distFromSpawn: number): EnemyDef {
  const rng = new RNG(seed);
  const body = rng.int(0, 9);
  // element biased by biome family
  let element: Element = 'none';
  const elRoll = rng.next();
  const bias: Partial<Record<string, Element>> = {
    fire: 'fire', cold: 'ice', blight: 'shadow', dark: 'shadow', magic: 'lightning', wet: 'poison', arid: 'earth',
  };
  const bEl = bias[biome.family];
  if (bEl && elRoll < 0.75) element = bEl;
  else if (elRoll < 0.5) element = rng.pick(['fire', 'ice', 'poison', 'lightning', 'shadow'] as Element[]);
  // colors from biome palette + element tint
  const base = mix(biome.ground, biome.propColor, rng.range(0.2, 0.6));
  const primary = element !== 'none' && rng.chance(0.6) ? mix(base, ELEMENT_COLORS[element], 0.55) : shade(base, rng.int(-20, 25));
  const secondary = shade(primary, rng.int(-45, -20));
  const eye = rng.pick(['#ffd23f', '#e83a4a', '#8af0ff', '#a83aff', '#ffffff']);
  const genome: Genome = {
    body, primary, secondary, eye,
    size: rng.int(3, 5), eyes: rng.int(1, 3), horns: rng.int(0, 2), spikes: rng.int(0, 3),
    tail: rng.chance(0.4), legs: rng.int(2, 6), glow: element !== 'none' && rng.chance(0.5),
    seed: rng.int(1, 999999),
  };
  // stat budget scales with distance, tier, player level
  const budget = 20 + playerLevel * 8 + Math.sqrt(distFromSpawn) * 0.9;
  const tierMul = tier === 'mythic' ? 3.2 : tier === 'champion' ? 2.2 : tier === 'elite' ? 1.5 : 1;
  const hp = Math.round((budget * rng.range(0.7, 1.1)) * tierMul);
  const atk = Math.round((3 + playerLevel * 1.2 + Math.sqrt(distFromSpawn) * 0.12) * tierMul * rng.range(0.85, 1.15));
  const def = Math.round((budget * 0.04) * (tier === 'common' ? 1 : 1.6));
  const speed = rng.range(18, 46) * (tier === 'elite' ? 1.15 : 1);
  const move = rng.pick(BODY_MOVES[body]);
  const attack = rng.pick(BODY_ATTACKS[body]);
  const traits: Trait[] = [];
  if (tier !== 'common') {
    const all: Trait[] = ['armored', 'regenerating', 'explosive', 'splitting', 'vampiric', 'shielded', 'frenzied', 'reflective'];
    rng.shuffle(all);
    const n = tier === 'mythic' ? 3 : tier === 'champion' ? 2 : 1;
    for (let i = 0; i < n; i++) traits.push(all[i]);
  }
  // name
  let name = `${NAME_A[rng.int(0, NAME_A.length - 1)]}${NAME_B[rng.int(0, NAME_B.length - 1)]}`;
  if (tier === 'champion' || tier === 'mythic') name += ` ${EPITHETS[rng.int(0, EPITHETS.length - 1)]}`;
  const id = `gen_${seed.toString(36)}`;
  const weakness = WEAK_TO[element];
  return {
    id, name, genome, hp, atk, def, speed, element, weakness, traits,
    move, attack, attackRange: attack === 'melee' || attack === 'lunge' || attack === 'slam' ? 16 : 90,
    aggroRange: 85 + (tier !== 'common' ? 30 : 0),
    tier, xp: Math.round((4 + playerLevel * 1.5) * tierMul), goldMin: tier === 'common' ? 1 : 5,
    goldMax: (tier === 'common' ? 5 : 18) + playerLevel,
    drops: [{ id: rng.pick(['mat_slime_gel', 'mat_hide', 'mat_bone', 'mat_crystal_shard', 'mat_ember_shard', 'mat_dark_essence', 'mat_scale', 'mat_feather']), chance: 0.35 }],
    desc: `A ${tier} creature of the ${biome.name}.`, scale: tier === 'champion' ? 1.3 : tier === 'mythic' ? 1.5 : 1,
    knockResist: tier === 'common' ? 0 : 0.5,
  };
}
export function enemyForFamily(family: string, seed: number, biome: Biome, tier: Tier, playerLevel: number, distFromSpawn: number): EnemyDef {
  const handmade = FAMILY_HANDMADE[family];
  if (handmade && tier === 'common' && hash2(seed, 7, 1) > 0.25) {
    const base = HANDMADE[handmade[Math.floor(hash2(seed, 13, 1) * handmade.length)]];
    // scale stats
    const scale = 1 + playerLevel * 0.12 + Math.sqrt(distFromSpawn) * 0.012;
    return { ...base, hp: Math.round(base.hp * scale), atk: Math.round(base.atk * scale), xp: Math.round(base.xp * scale), id: base.id };
  }
  return generateEnemy(seed, biome, tier, playerLevel, distFromSpawn);
}
