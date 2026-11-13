// Chunk generation: Minecraft-style multi-noise biome selection, 32x32 tiles, deterministic per (seed,cx,cy).
import { hash2, hash3, fbm, RNG } from '../engine/rng';
import { Biome, pickBiome } from './biomes';

export const CHUNK = 32;
export const TILE = 16;
// Tile ids
export const T = {
  GRASS: 0, DIRT: 1, SAND: 2, SNOW: 3, STONE: 4, WATER: 5, LAVA: 6, ICE: 7,
  TREE: 8, ROCK: 9, PROP: 10, FLOOR: 11, WALL: 12, BRIDGE: 13, PATH: 14,
  FLOWER: 15, ORE: 16, STAIRS_DOWN: 17, STAIRS_UP: 18, PORTAL: 19, CHEST: 20,
  CRACKED: 21, DOOR: 22, SWITCH: 23, TRAP: 24, TAR: 25, POISON: 26, SLIME: 27,
  FARM: 28, CROP: 29, BEDROCK: 30, SIGN: 31, SHRINE: 32, BED: 33, BENCH: 34,
  ANVIL: 35, WELL: 36, LANTERN: 37, TILLED: 38, PLACED: 39, DUNGEON_FLOOR: 40, DUNGEON_WALL: 41,
  GATE: 42, SPIKES: 43, KEY_PEDESTAL: 44, BOSS_GATE: 45, HOME_FLOOR: 46, GEYSER: 47,
} as const;
export type TileId = number;
export const SOLID = new Set<number>([T.TREE, T.ROCK, T.WALL, T.WATER, T.LAVA, T.TAR, T.DOOR, T.GATE, T.BOSS_GATE, T.BEDROCK, T.SHRINE, T.BENCH, T.ANVIL, T.WELL, T.BED, T.DUNGEON_WALL, T.ORE, T.CRACKED]);
export const BREAKABLE = new Set<number>([T.TREE, T.ROCK, T.ORE, T.CRACKED, T.PROP, T.FLOWER, T.CROP]);
export const LIQUID_TILES = new Set<number>([T.WATER, T.LAVA, T.ICE, T.TAR, T.POISON, T.SLIME]);
export const HAZARD_TILES = new Set<number>([T.LAVA, T.POISON, T.TRAP, T.SPIKES, T.GEYSER]);

export interface ChunkData {
  cx: number; cy: number; layer: number;
  tiles: Uint8Array;
  biomeIdx: Uint8Array; // index into chunk's biome list
  biomes: string[]; // biome ids used in chunk
  props: PropInst[];
  enemies: SpawnRef[];
  structures: StructureRef[];
  regionName: string;
  dirty: boolean;
}
export interface PropInst { x: number; y: number; kind: string; }
export interface SpawnRef { x: number; y: number; family: string; elite: boolean; }
export interface StructureRef { kind: string; x: number; y: number; w: number; h: number; id: string; }

export interface WorldGenOpts {
  seed: number; type: string; // normal, big, islands, frozen, desert, blight, chaos, flat
}

// ---- noise fields ----
function fields(wx: number, wy: number, o: WorldGenOpts) {
  const s = o.seed;
  let scale = 0.004, island = false, flatT = false;
  let tempBias = 0, humBias = 0, blightBias = 0;
  switch (o.type) {
    case 'big': scale = 0.0018; break;
    case 'islands': island = true; break;
    case 'frozen': tempBias = -0.45; break;
    case 'desert': tempBias = 0.45; humBias = -0.3; break;
    case 'blight': blightBias = 0.3; break;
    case 'chaos': scale = 0.012; break;
    case 'flat': flatT = true; break;
  }
  const cont = flatT ? 0.6 : fbm(wx * scale, wy * scale, s + 11, 4);
  const temp = Math.min(1, Math.max(0, fbm(wx * scale * 0.7 + 1000, wy * scale * 0.7, s + 23, 3) + tempBias));
  const hum = Math.min(1, Math.max(0, fbm(wx * scale * 0.9, wy * scale * 0.9 + 2000, s + 37, 3) + humBias));
  const ero = fbm(wx * scale * 1.3 + 3000, wy * scale * 1.3, s + 51, 3);
  const weird = fbm(wx * scale * 2 + 4000, wy * scale * 2 + 4000, s + 67, 2);
  let blight = fbm(wx * scale * 0.5 + 5000, wy * scale * 0.5, s + 83, 3) + blightBias;
  // Blight radiates from "Fallen Throne" far north-east
  const throneDist = Math.hypot(wx - 8000, wy + 8000);
  blight += Math.max(0, 0.35 - throneDist / 6000);
  let height = flatT ? 0.55 : fbm(wx * scale * 2.2, wy * scale * 2.2, s + 97, 4);
  if (island) {
    const falloff = fbm(wx * scale * 0.6, wy * scale * 0.6, s + 111, 2);
    height = height * 0.5 + (falloff - 0.35) * 1.2;
  }
  return { cont, temp, hum, ero, weird, blight, height };
}
export function biomeAt(wx: number, wy: number, o: WorldGenOpts): Biome {
  const f = fields(wx, wy, o);
  return pickBiome(f.temp, f.hum, f.cont, f.ero, f.weird, f.blight);
}
export function heightAt(wx: number, wy: number, o: WorldGenOpts): number {
  return fields(wx, wy, o).height;
}
export function liquidTileOf(b: Biome): number {
  switch (b.liquid) {
    case 'lava': return T.LAVA; case 'ice': return T.ICE; case 'tar': return T.TAR;
    case 'slime': return T.SLIME; case 'poison': return T.POISON; case 'water': return T.WATER;
    default: return T.WATER;
  }
}
function groundTileOf(b: Biome): number {
  switch (b.family) {
    case 'arid': return T.SAND; case 'cold': return T.SNOW; case 'mountain': return T.STONE;
    case 'fire': return T.STONE; case 'dark': return T.DIRT; case 'blight': return T.DIRT;
    case 'coast': return T.SAND; case 'magic': return T.STONE;
    default: return T.GRASS;
  }
}

const REGION_NAMES_A = ['Ashen','Ember','Silver','Thorn','Moss','Storm','Dusk','Frost','Sun','Shadow','Wild','Elder','Mist','Crimson','Pale','Golden','Howling','Whisper','Sable','Verdant'];
const REGION_NAMES_B = ['wood','field','moor','reach','vale','barrow','hollow','ridge','march','fen','heath','crag','glade','wastes','scar','drift','wood','wood'];

// Region-name per 8x8 chunks
function chunkRegionName(cx: number, cy: number, seed: number, biomeName: string): string {
  const rx = Math.floor(cx / 8), ry = Math.floor(cy / 8);
  const h = hash2(rx, ry, seed + 999);
  const a = REGION_NAMES_A[Math.floor(h * REGION_NAMES_A.length)];
  const b = REGION_NAMES_B[Math.floor(hash2(rx, ry, seed + 998) * REGION_NAMES_B.length)];
  return `${a}${b} (${biomeName})`;
}

// ---- structures: seeded region grid (4x4 chunk cells) ----
export function structureInCell(cellX: number, cellY: number, o: WorldGenOpts): { kind: string; chunkX: number; chunkY: number } | null {
  const h = hash2(cellX, cellY, o.seed + 7777);
  if (h < 0.72) return null;
  const kinds = h > 0.985 ? ['tower'] : h > 0.955 ? ['dungeon'] : h > 0.93 ? ['shrine'] : h > 0.9 ? ['camp'] : h > 0.86 ? ['ruins'] : ['village'];
  const kind = kinds[0];
  const jx = Math.floor(hash2(cellX, cellY, o.seed + 7778) * 3);
  const jy = Math.floor(hash2(cellX, cellY, o.seed + 7779) * 3);
  return { kind, chunkX: cellX * 4 + jx, chunkY: cellY * 4 + jy };
}
export function villageAt(cx: number, cy: number, o: WorldGenOpts): boolean {
  const cellX = Math.floor(cx / 4), cellY = Math.floor(cy / 4);
  const s = structureInCell(cellX, cellY, o);
  return !!s && s.kind === 'village' && s.chunkX === cx && s.chunkY === cy;
}

export function generateChunk(cx: number, cy: number, layer: number, o: WorldGenOpts): ChunkData {
  const tiles = new Uint8Array(CHUNK * CHUNK);
  const biomeIdx = new Uint8Array(CHUNK * CHUNK);
  const biomes: string[] = [];
  const biomeMap = new Map<string, number>();
  const props: PropInst[] = [];
  const enemies: SpawnRef[] = [];
  const structures: StructureRef[] = [];
  let mainBiome: Biome | null = null;
  const biomeCount = new Map<string, number>();

  const getBiomeIdx = (b: Biome): number => {
    let i = biomeMap.get(b.id);
    if (i === undefined) { i = biomes.length; biomes.push(b.id); biomeMap.set(b.id, i); }
    return i;
  };

  const set = (x: number, y: number, t: number) => { if (x >= 0 && x < CHUNK && y >= 0 && y < CHUNK) tiles[y * CHUNK + x] = t; };
  const get = (x: number, y: number) => tiles[y * CHUNK + x];

  if (layer === 0) {
    // ---- SURFACE ----
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = cx * CHUNK + x, wy = cy * CHUNK + y;
      const f = fields(wx, wy, o);
      const b = pickBiome(f.temp, f.hum, f.cont, f.ero, f.weird, f.blight);
      biomeCount.set(b.id, (biomeCount.get(b.id) || 0) + 1);
      biomeIdx[y * CHUNK + x] = getBiomeIdx(b);
      // water level from continentalness+height
      const waterLevel = 0.42;
      let t: number;
      if (f.cont < 0.30) t = liquidTileOf(b); // ocean
      else if (f.height < waterLevel && f.cont < 0.45) t = liquidTileOf(b); // lakes
      else t = groundTileOf(b);
      // rivers: thin bands of weirdness
      const river = Math.abs(f.weird - 0.5);
      if (river < 0.006 && f.cont > 0.35 && t !== T.SAND && b.liquid === 'water') t = T.WATER;
      tiles[y * CHUNK + x] = t;
      // beaches near water
      if (t !== T.WATER && t !== T.LAVA && f.cont < 0.38 && f.cont >= 0.30 && b.family !== 'coast') {
        if (hash2(wx, wy, o.seed + 5) > 0.4) tiles[y * CHUNK + x] = T.SAND;
      }
    }
    mainBiome = BIOMES_BY_ID[biomes.reduce((a, b) => (biomeCount.get(b)! > biomeCount.get(a)! ? b : a))] || BIOMES.plains;
    const mb = mainBiome;
    // props, trees, rocks, ore — deterministic per tile
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = cx * CHUNK + x, wy = cy * CHUNK + y;
      const b = BIOMES_BY_ID[biomes[biomeIdx[y * CHUNK + x]]] || BIOMES.plains;
      const t = get(x, y);
      if (SOLID.has(t) || LIQUID_TILES.has(t)) continue;
      const h = hash3(wx, wy, layer, o.seed + 300);
      if (h < b.treeDensity) { set(x, y, T.TREE); }
      else if (h < b.treeDensity + b.rockDensity) { set(x, y, T.ROCK); }
      else if (h < b.treeDensity + b.rockDensity + 0.012 && (b.family === 'fire' || b.family === 'magic')) { set(x, y, T.ORE); }
      else if (h < b.treeDensity + b.rockDensity + 0.012 + b.propDensity * 0.6) {
        set(x, y, h % 0.002 < 0.001 ? T.FLOWER : T.PROP);
        props.push({ x: wx, y: wy, kind: b.prop });
      }
    }
    // geysers
    if (mb.id === 'geyser_field') {
      for (let i = 0; i < 3; i++) {
        const gx = Math.floor(hash2(cx, cy, o.seed + i * 31) * CHUNK), gy = Math.floor(hash2(cx, cy, o.seed + i * 37) * CHUNK);
        if (!SOLID.has(get(gx, gy))) set(gx, gy, T.GEYSER);
      }
    }
    // enemy spawns
    const spawnRng = new RNG((hash2(cx, cy, o.seed + 900) * 4294967296) >>> 0);
    const nSpawn = spawnRng.int(1, 3);
    for (let i = 0; i < nSpawn; i++) {
      const ex = spawnRng.int(2, CHUNK - 3), ey = spawnRng.int(2, CHUNK - 3);
      if (!SOLID.has(get(ex, ey)) && !LIQUID_TILES.has(get(ex, ey))) {
        const fam = spawnRng.pick(mb.enemyFamilies);
        enemies.push({ x: cx * CHUNK + ex, y: cy * CHUNK + ey, family: fam, elite: spawnRng.chance(0.06) });
      }
    }
    // structures placed on this chunk
    const cellX = Math.floor(cx / 4), cellY = Math.floor(cy / 4);
    const st = structureInCell(cellX, cellY, o);
    if (st && st.chunkX === cx && st.chunkY === cy) {
      placeStructure(st.kind, tiles, cx, cy, o, structures, props);
    }
  } else if (layer === 1) {
    // ---- CAVES: noise-carved with ores, lava, underground lakes, glowing fungus ----
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = cx * CHUNK + x, wy = cy * CHUNK + y;
      const cave = fbm(wx * 0.05, wy * 0.05, o.seed + 201, 3);
      const cave2 = fbm(wx * 0.08 + 500, wy * 0.08, o.seed + 207, 2);
      let t: number;
      if (cave > 0.42 && cave < 0.62) {
        t = T.DUNGEON_FLOOR; // open cave floor
        const h = hash3(wx, wy, 1, o.seed + 300);
        if (h < 0.02) t = T.ORE;
        else if (h < 0.024) t = CRYSTAL_TILE;
        else if (h < 0.03 && cave2 > 0.6) t = T.WATER; // underground lake
        else if (h < 0.035 && cave2 < 0.35) t = T.LAVA;
      } else t = T.DUNGEON_WALL;
      tiles[y * CHUNK + x] = t;
      biomeIdx[y * CHUNK + x] = getBiomeIdx(BIOMES_BY_ID.crystal);
    }
    biomeCount.set('crystal', CHUNK * CHUNK);
    mainBiome = BIOMES_BY_ID.crystal;
    const spawnRng = new RNG((hash2(cx, cy, o.seed + 901) * 4294967296) >>> 0);
    for (let i = 0; i < spawnRng.int(1, 3); i++) {
      const ex = spawnRng.int(2, CHUNK - 3), ey = spawnRng.int(2, CHUNK - 3);
      if (get(ex, ey) === T.DUNGEON_FLOOR) enemies.push({ x: cx * CHUNK + ex, y: cy * CHUNK + ey, family: spawnRng.pick(['bat', 'skeleton', 'crystalgolem', 'spirit']), elite: spawnRng.chance(0.1) });
    }
  } else if (layer === 2) {
    // ---- DEEP MINES ----
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = cx * CHUNK + x, wy = cy * CHUNK + y;
      const cave = fbm(wx * 0.04, wy * 0.04, o.seed + 301, 4);
      tiles[y * CHUNK + x] = (cave > 0.45 && cave < 0.58) ? T.DUNGEON_FLOOR : T.DUNGEON_WALL;
      const h = hash3(wx, wy, 2, o.seed + 302);
      if (tiles[y * CHUNK + x] === T.DUNGEON_FLOOR && h < 0.035) tiles[y * CHUNK + x] = T.ORE;
      if (tiles[y * CHUNK + x] === T.DUNGEON_FLOOR && h > 0.995) tiles[y * CHUNK + x] = T.LAVA;
      biomeIdx[y * CHUNK + x] = getBiomeIdx(BIOMES_BY_ID.volcanic);
    }
    biomeCount.set('volcanic', CHUNK * CHUNK);
    mainBiome = BIOMES_BY_ID.volcanic;
    const spawnRng = new RNG((hash2(cx, cy, o.seed + 902) * 4294967296) >>> 0);
    for (let i = 0; i < spawnRng.int(2, 4); i++) {
      const ex = spawnRng.int(2, CHUNK - 3), ey = spawnRng.int(2, CHUNK - 3);
      if (get(ex, ey) === T.DUNGEON_FLOOR) enemies.push({ x: cx * CHUNK + ex, y: cy * CHUNK + ey, family: spawnRng.pick(['golem', 'imp', 'skeleton', 'serpent']), elite: spawnRng.chance(0.12) });
    }
  } else {
    // ---- EMBER REALM (layer 3) ----
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = cx * CHUNK + x, wy = cy * CHUNK + y;
      const n = fbm(wx * 0.03, wy * 0.03, o.seed + 401, 3);
      let t: number = n > 0.4 ? T.DUNGEON_FLOOR : T.DUNGEON_WALL;
      const h = hash3(wx, wy, 3, o.seed + 402);
      if (t === T.DUNGEON_FLOOR) {
        if (h < 0.04) t = T.LAVA;
        else if (h < 0.05) t = T.ORE;
        else if (h > 0.996) t = CRYSTAL_TILE;
      }
      tiles[y * CHUNK + x] = t;
      biomeIdx[y * CHUNK + x] = getBiomeIdx(BIOMES_BY_ID.blightlands);
    }
    biomeCount.set('blightlands', CHUNK * CHUNK);
    mainBiome = BIOMES_BY_ID.blightlands;
    const spawnRng = new RNG((hash2(cx, cy, o.seed + 903) * 4294967296) >>> 0);
    for (let i = 0; i < spawnRng.int(2, 4); i++) {
      const ex = spawnRng.int(2, CHUNK - 3), ey = spawnRng.int(2, CHUNK - 3);
      if (get(ex, ey) === T.DUNGEON_FLOOR) enemies.push({ x: cx * CHUNK + ex, y: cy * CHUNK + ey, family: spawnRng.pick(['blighted', 'imp', 'spirit', 'firespirit']), elite: spawnRng.chance(0.15) });
    }
  }
  const biomeName = mainBiome ? mainBiome.name : 'Wilds';
  return {
    cx, cy, layer, tiles, biomeIdx, biomes, props, enemies, structures,
    regionName: chunkRegionName(cx, cy, o.seed, biomeName),
    dirty: false,
  };
}
// crystal tile alias (glowing fungus/ore)
export const CRYSTAL_TILE = 48;
import { BIOMES } from './biomes';
const BIOMES_BY_ID: Record<string, Biome> = BIOMES;

function placeStructure(kind: string, tiles: Uint8Array, cx: number, cy: number, o: WorldGenOpts, structures: StructureRef[], props: PropInst[]) {
  const rng = new RNG((hash2(cx, cy, o.seed + 6000) * 4294967296) >>> 0);
  const set = (x: number, y: number, t: number) => { if (x >= 0 && x < CHUNK && y >= 0 && y < CHUNK) tiles[y * CHUNK + x] = t; };
  if (kind === 'village') {
    // plaza + houses ring
    const px = 16, py = 16;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) set(px + i, py + j, T.PATH);
    set(px, py, T.WELL);
    set(px + 1, py, T.LANTERN); set(px - 1, py, T.LANTERN); set(px, py + 1, T.LANTERN); set(px, py - 1, T.LANTERN);
    const houses = rng.int(3, 5);
    for (let hI = 0; hI < houses; hI++) {
      const ang = (hI / houses) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const hx = px + Math.round(Math.cos(ang) * rng.int(6, 9));
      const hy = py + Math.round(Math.sin(ang) * rng.int(6, 9));
      const w = rng.int(4, 5), h = rng.int(4, 5);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
        set(hx + i, hy + j, edge ? T.WALL : T.FLOOR);
      }
      set(hx + Math.floor(w / 2), hy + h - 1, T.FLOOR); // door
      if (hI === 0) set(hx + 1, hy + 1, T.BED);
      if (hI === 1) set(hx + 1, hy + 1, T.BENCH);
      if (hI === 2) set(hx + 1, hy + 1, T.ANVIL);
      if (hI === 3) set(hx + 1, hy + 1, T.CHEST);
    }
    // farm
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) set(px - 10 + i, py + 6 + j, j === 1 ? T.CROP : T.FARM);
    structures.push({ kind: 'village', x: cx * CHUNK + px - 10, y: cy * CHUNK + py - 10, w: 20, h: 20, id: `vil_${cx}_${cy}` });
  } else if (kind === 'dungeon') {
    const px = 16, py = 16;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) set(px + i, py + j, T.STONE);
    set(px, py, T.STAIRS_DOWN);
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) set(px + dx, py + dy, T.LANTERN);
    structures.push({ kind: 'dungeon', x: cx * CHUNK + px, y: cy * CHUNK + py, w: 5, h: 5, id: `dun_${cx}_${cy}` });
  } else if (kind === 'shrine') {
    const px = 16, py = 16;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) set(px + i, py + j, T.PATH);
    set(px, py, T.SHRINE);
    structures.push({ kind: 'shrine', x: cx * CHUNK + px, y: cy * CHUNK + py, w: 3, h: 3, id: `shr_${cx}_${cy}` });
  } else if (kind === 'camp') {
    const px = 16, py = 16;
    set(px, py, T.LANTERN);
    for (let i = 0; i < 3; i++) set(px + rng.int(-3, 3), py + rng.int(-3, 3), T.PROP);
    set(px + 1, py, T.CHEST);
    structures.push({ kind: 'camp', x: cx * CHUNK + px, y: cy * CHUNK + py, w: 5, h: 5, id: `camp_${cx}_${cy}` });
  } else if (kind === 'tower') {
    const px = 16, py = 16;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) set(px + i, py + j, (Math.abs(i) === 2 || Math.abs(j) === 2) ? T.WALL : T.FLOOR);
    set(px, py + 2, T.FLOOR); set(px, py, T.STAIRS_DOWN);
    structures.push({ kind: 'tower', x: cx * CHUNK + px, y: cy * CHUNK + py, w: 5, h: 5, id: `tow_${cx}_${cy}` });
  } else if (kind === 'ruins') {
    const px = 16, py = 16;
    for (let i = 0; i < 8; i++) set(px + rng.int(-5, 5), py + rng.int(-5, 5), rng.chance(0.5) ? T.WALL : T.ROCK);
    if (rng.chance(0.6)) set(px, py, T.CHEST);
    structures.push({ kind: 'ruins', x: cx * CHUNK + px, y: cy * CHUNK + py, w: 10, h: 10, id: `rui_${cx}_${cy}` });
  }
}
