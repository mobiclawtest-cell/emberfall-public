// Chunk manager: bounded cache, time-sliced generation, canvas rendering, player modifications.
import { CHUNK, TILE, ChunkData, generateChunk, WorldGenOpts, T, SOLID, LIQUID_TILES, CRYSTAL_TILE } from './terrain';
import { BIOMES } from './biomes';
import { hash2 } from '../engine/rng';
import { makeCanvas } from '../engine/sprites';
import { mix, shade } from '../engine/utils';

const CACHE_LIMIT = 220;
export interface ModTile { t: number; }
export class ChunkManager {
  chunks = new Map<string, ChunkData>();
  canvases = new Map<string, HTMLCanvasElement>();
  private queue: { cx: number; cy: number; layer: number; pri: number }[] = [];
  private pending = new Set<string>();
  mods = new Map<string, Map<number, number>>(); // layer -> (wy*1e6+wx encoded) -> tile
  explored = new Set<string>(); // "cx,cy" explored for fog
  constructor(public opts: WorldGenOpts) {}
  key(cx: number, cy: number, layer: number) { return `${cx},${cy},${layer}`; }
  modKey(wx: number, wy: number) { return wy * 1000000 + wx; }
  getChunk(cx: number, cy: number, layer: number): ChunkData | null {
    return this.chunks.get(this.key(cx, cy, layer)) || null;
  }
  ensureRadius(px: number, py: number, layer: number, radiusTiles: number) {
    const pcx = Math.floor(px / CHUNK), pcy = Math.floor(py / CHUNK);
    const r = Math.ceil(radiusTiles / CHUNK) + 1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = pcx + dx, cy = pcy + dy;
      const k = this.key(cx, cy, layer);
      if (this.chunks.has(k) || this.pending.has(k)) continue;
      const pri = dx * dx + dy * dy;
      this.queue.push({ cx, cy, layer, pri });
      this.pending.add(k);
    }
    this.queue.sort((a, b) => a.pri - b.pri);
    if (this.queue.length > 120) this.queue.length = 120;
  }
  // time-sliced generation budget per frame (never stall a frame)
  processQueue(budgetMs: number) {
    const start = performance.now();
    while (this.queue.length && performance.now() - start < budgetMs) {
      const job = this.queue.shift()!;
      const k = this.key(job.cx, job.cy, job.layer);
      this.pending.delete(k);
      if (this.chunks.has(k)) continue;
      const chunk = generateChunk(job.cx, job.cy, job.layer, this.opts);
      this.applyMods(chunk);
      this.chunks.set(k, chunk);
      this.evictIfNeeded();
    }
  }
  applyPublic(chunk: ChunkData) {
    this.applyMods(chunk);
    this.chunks.set(this.key(chunk.cx, chunk.cy, chunk.layer), chunk);
  }
  private applyMods(chunk: ChunkData) {
    const layerMods = this.mods.get(String(chunk.layer));
    if (!layerMods) return;
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
      const wx = chunk.cx * CHUNK + x, wy = chunk.cy * CHUNK + y;
      const m = layerMods.get(this.modKey(wx, wy));
      if (m !== undefined) { chunk.tiles[y * CHUNK + x] = m; chunk.dirty = true; }
    }
  }
  private evictIfNeeded() {
    if (this.chunks.size <= CACHE_LIMIT) return;
    // evict farthest chunks (simple: oldest keys not near any recently used — approximate by insertion order)
    const it = this.chunks.keys();
    for (let i = 0; i < 20; i++) {
      const k = it.next().value as string | undefined;
      if (k === undefined) break;
      this.chunks.delete(k); this.canvases.delete(k);
    }
  }
  getTile(wx: number, wy: number, layer: number): number {
    const m = this.mods.get(String(layer))?.get(this.modKey(wx, wy));
    if (m !== undefined) return m;
    const cx = Math.floor(wx / CHUNK), cy = Math.floor(wy / CHUNK);
    const c = this.getChunk(cx, cy, layer);
    if (!c) return T.STONE;
    const lx = wx - cx * CHUNK, ly = wy - cy * CHUNK;
    return c.tiles[ly * CHUNK + lx];
  }
  setTile(wx: number, wy: number, layer: number, t: number) {
    let layerMods = this.mods.get(String(layer));
    if (!layerMods) { layerMods = new Map(); this.mods.set(String(layer), layerMods); }
    layerMods.set(this.modKey(wx, wy), t);
    const cx = Math.floor(wx / CHUNK), cy = Math.floor(wy / CHUNK);
    const c = this.getChunk(cx, cy, layer);
    if (c) { const lx = wx - cx * CHUNK, ly = wy - cy * CHUNK; c.tiles[ly * CHUNK + lx] = t; c.dirty = true; this.invalidateCanvas(cx, cy, layer); }
  }
  invalidateCanvas(cx: number, cy: number, layer: number) { this.canvases.delete(this.key(cx, cy, layer)); }
  isSolid(wx: number, wy: number, layer: number): boolean {
    return SOLID.has(this.getTile(wx, wy, layer));
  }
  isLiquid(wx: number, wy: number, layer: number): boolean {
    return LIQUID_TILES.has(this.getTile(wx, wy, layer));
  }
  markExplored(wx: number, wy: number, layer: number) {
    this.explored.add(`${Math.floor(wx / CHUNK)},${Math.floor(wy / CHUNK)},${layer}`);
  }
  serializeMods(): Record<string, Record<string, number>> {
    const out: Record<string, Record<string, number>> = {};
    for (const [layer, m] of this.mods) {
      out[layer] = {};
      for (const [k, v] of m) out[layer][String(k)] = v;
    }
    return out;
  }
  loadMods(data: Record<string, Record<string, number>>) {
    this.mods.clear();
    for (const [layer, m] of Object.entries(data || {})) {
      const mm = new Map<number, number>();
      for (const [k, v] of Object.entries(m)) mm.set(Number(k), v);
      this.mods.set(layer, mm);
    }
  }
  loadExplored(arr: string[]) { this.explored = new Set(arr || []); }

  // ---- chunk canvas rendering ----
  getCanvas(cx: number, cy: number, layer: number): HTMLCanvasElement | null {
    const k = this.key(cx, cy, layer);
    let c = this.canvases.get(k);
    if (c) return c;
    const chunk = this.chunks.get(k);
    if (!chunk) return null;
    c = renderChunk(chunk, this.opts.seed);
    this.canvases.set(k, c);
    if (this.canvases.size > CACHE_LIMIT) {
      const keys = [...this.canvases.keys()].slice(0, 30);
      for (const kk of keys) this.canvases.delete(kk);
    }
    return c;
  }
}

// ---- render a chunk to an offscreen canvas (called once per chunk, re-rendered on change) ----
export function renderChunk(chunk: ChunkData, seed: number): HTMLCanvasElement {
  const S = CHUNK * TILE;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d')!;
  const biomeOf = (i: number) => BIOMES[chunk.biomes[chunk.biomeIdx[i]]] || BIOMES.plains;
  for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) {
    const i = y * CHUNK + x;
    const t = chunk.tiles[i];
    const b = biomeOf(i);
    const wx = chunk.cx * CHUNK + x, wy = chunk.cy * CHUNK + y;
    const px = x * TILE, py = y * TILE;
    drawTile(g, t, b, px, py, wx, wy, seed, chunk.layer);
  }
  return c;
}
function dither(g: CanvasRenderingContext2D, px: number, py: number, c1: string, c2: string, wx: number, wy: number, seed: number) {
  g.fillStyle = c1; g.fillRect(px, py, TILE, TILE);
  g.fillStyle = c2;
  for (let j = 0; j < TILE; j += 4) for (let i = 0; i < TILE; i += 4) {
    if (hash2(wx * TILE + i, wy * TILE + j, seed + 1) > 0.55) g.fillRect(px + i + 1, py + j + 1, 2, 2);
  }
}
export function drawTile(g: CanvasRenderingContext2D, t: number, b: { ground: string; ground2: string; liquidColor: string; propColor: string }, px: number, py: number, wx: number, wy: number, seed: number, layer: number) {
  const h = hash2(wx, wy, seed);
  switch (t) {
    case T.GRASS: dither(g, px, py, b.ground, b.ground2, wx, wy, seed); break;
    case T.DIRT: dither(g, px, py, b.ground, shade(b.ground, -18), wx, wy, seed); break;
    case T.SAND: dither(g, px, py, b.ground, shade(b.ground, 14), wx, wy, seed); break;
    case T.SNOW: dither(g, px, py, b.ground, shade(b.ground, 12), wx, wy, seed); break;
    case T.STONE: dither(g, px, py, b.ground, shade(b.ground, -22), wx, wy, seed); break;
    case T.WATER: case T.LAVA: case T.TAR: case T.POISON: case T.SLIME: {
      g.fillStyle = b.liquidColor === '#00000000' ? '#3a6ea8' : b.liquidColor; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      if (h > 0.6) g.fillRect(px + 2, py + 3, 5, 1);
      if (h < 0.3) g.fillRect(px + 8, py + 10, 6, 1);
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(px, py + TILE - 2, TILE, 2);
      break;
    }
    case T.ICE: g.fillStyle = b.liquidColor === '#00000000' ? '#a8d8f0' : b.liquidColor; g.fillRect(px, py, TILE, TILE); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(px + 2, py + 2, 4, 1); g.fillRect(px + 9, py + 8, 5, 1); break;
    case T.TREE: {
      dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
      g.fillStyle = '#4a3220'; g.fillRect(px + 6, py + 9, 4, 7);
      g.fillStyle = b.propColor; // canopy tinted by biome
      g.fillRect(px + 2, py + 1, 12, 9);
      g.fillStyle = shade(b.propColor, -25); g.fillRect(px + 2, py + 7, 12, 3);
      g.fillStyle = shade(b.propColor, 22); g.fillRect(px + 4, py + 2, 4, 2);
      break;
    }
    case T.ROCK: {
      dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
      g.fillStyle = '#8a8a92'; g.fillRect(px + 3, py + 5, 10, 9);
      g.fillStyle = '#6a6a72'; g.fillRect(px + 3, py + 11, 10, 3); g.fillRect(px + 11, py + 5, 2, 6);
      g.fillStyle = '#a8a8b0'; g.fillRect(px + 4, py + 6, 4, 2);
      break;
    }
    case T.ORE: {
      dither(g, px, py, layer > 0 ? '#4a4a55' : b.ground, layer > 0 ? '#3f3f4a' : shade(b.ground, -15), wx, wy, seed);
      g.fillStyle = '#ffb43f';
      g.fillRect(px + 3, py + 3, 3, 3); g.fillRect(px + 9, py + 6, 3, 3); g.fillRect(px + 5, py + 11, 3, 3);
      g.fillStyle = '#fff3c4'; g.fillRect(px + 4, py + 4, 1, 1); g.fillRect(px + 10, py + 7, 1, 1);
      break;
    }
    case CRYSTAL_TILE: {
      dither(g, px, py, '#4a4a5e', '#3f3f52', wx, wy, seed);
      g.fillStyle = '#8af0ff'; g.fillRect(px + 6, py + 3, 4, 10); g.fillRect(px + 3, py + 7, 3, 6); g.fillRect(px + 10, py + 8, 3, 5);
      g.fillStyle = '#d8fbff'; g.fillRect(px + 7, py + 4, 2, 3);
      break;
    }
    case T.PROP: case T.FLOWER: {
      dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
      g.fillStyle = b.propColor;
      const kind = Math.floor(h * 4);
      if (t === T.FLOWER || kind === 0) { g.fillRect(px + 4, py + 8, 2, 2); g.fillRect(px + 9, py + 5, 2, 2); g.fillRect(px + 7, py + 11, 2, 2); g.fillStyle = '#fff'; g.fillRect(px + 4, py + 7, 1, 1); g.fillRect(px + 9, py + 4, 1, 1); }
      else if (kind === 1) { g.fillRect(px + 6, py + 6, 5, 6); g.fillStyle = shade(b.propColor, -30); g.fillRect(px + 6, py + 10, 5, 2); }
      else if (kind === 2) { g.fillRect(px + 3, py + 12, 10, 2); g.fillRect(px + 5, py + 10, 6, 2); }
      else { g.fillRect(px + 7, py + 4, 2, 8); g.fillRect(px + 5, py + 6, 6, 2); }
      break;
    }
    case T.WALL: case T.DUNGEON_WALL: {
      const base = t === T.WALL ? '#6a5a4a' : (layer >= 2 ? '#3a3040' : '#44404e');
      g.fillStyle = base; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = shade(base, 18); g.fillRect(px, py, TILE, 2); g.fillRect(px, py, 2, TILE);
      g.fillStyle = shade(base, -20); g.fillRect(px, py + TILE - 2, TILE, 2); g.fillRect(px + TILE - 2, py, 2, TILE);
      g.fillStyle = shade(base, -10); g.fillRect(px + 7, py + 2, 2, 5); g.fillRect(px + 2, py + 9, 5, 2);
      break;
    }
    case T.FLOOR: case T.DUNGEON_FLOOR: case T.HOME_FLOOR: {
      const base = t === T.FLOOR ? '#9a8567' : t === T.HOME_FLOOR ? '#a8895f' : (layer >= 2 ? '#4a4050' : '#555064');
      dither(g, px, py, base, shade(base, -12), wx, wy, seed);
      g.fillStyle = shade(base, -25);
      g.fillRect(px, py, TILE, 1); g.fillRect(px, py, 1, TILE);
      break;
    }
    case T.PATH: dither(g, px, py, '#a89a78', '#9c8e6c', wx, wy, seed); break;
    case T.BRIDGE: g.fillStyle = '#7a5a35'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#5f4426'; for (let i = 0; i < TILE; i += 4) g.fillRect(px, py + i, TILE, 1); break;
    case T.STAIRS_DOWN: g.fillStyle = '#3a3a45'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#22222c'; g.fillRect(px + 2, py + 2, 12, 12); g.fillStyle = '#0e0e14'; g.fillRect(px + 4, py + 4, 8, 8); g.fillStyle = '#8a8a92'; g.fillRect(px + 2, py + 2, 12, 2); break;
    case T.STAIRS_UP: g.fillStyle = '#9a8567'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#c8b89a'; g.fillRect(px + 2, py + 2, 12, 12); g.fillStyle = '#e8dcc0'; g.fillRect(px + 4, py + 4, 8, 8); break;
    case T.PORTAL: g.fillStyle = '#2a1a3a'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#8a3aff'; g.fillRect(px + 3, py + 1, 10, 14); g.fillStyle = '#c89aff'; g.fillRect(px + 5, py + 4, 6, 8); break;
    case T.CHEST: {
      dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
      g.fillStyle = '#8a5a2a'; g.fillRect(px + 2, py + 5, 12, 9);
      g.fillStyle = '#6b441d'; g.fillRect(px + 2, py + 9, 12, 2);
      g.fillStyle = '#ffd23f'; g.fillRect(px + 7, py + 8, 2, 3);
      g.fillStyle = '#a87840'; g.fillRect(px + 2, py + 5, 12, 2);
      break;
    }
    case T.CRACKED: {
      dither(g, px, py, '#5a5a66', '#4c4c58', wx, wy, seed);
      g.fillStyle = '#2a2a33';
      g.fillRect(px + 4, py + 2, 1, 6); g.fillRect(px + 5, py + 7, 4, 1); g.fillRect(px + 9, py + 8, 1, 5); g.fillRect(px + 10, py + 5, 4, 1);
      break;
    }
    case T.DOOR: g.fillStyle = '#5a3f22'; g.fillRect(px + 1, py, 14, TILE); g.fillStyle = '#7a5a35'; g.fillRect(px + 3, py + 2, 10, 12); g.fillStyle = '#ffd23f'; g.fillRect(px + 11, py + 8, 2, 2); break;
    case T.GATE: case T.BOSS_GATE: g.fillStyle = '#3a3a45'; g.fillRect(px, py, TILE, TILE); g.fillStyle = t === T.BOSS_GATE ? '#c84a2a' : '#8a8a92'; for (let i = 2; i < TILE; i += 4) g.fillRect(px + i, py, 2, TILE); break;
    case T.SWITCH: dither(g, px, py, '#555064', '#4a4658', wx, wy, seed); g.fillStyle = '#8a8a92'; g.fillRect(px + 5, py + 5, 6, 6); g.fillStyle = '#ffd23f'; g.fillRect(px + 7, py + 3, 2, 4); break;
    case T.TRAP: case T.SPIKES: dither(g, px, py, '#55504a', '#4a463f', wx, wy, seed); g.fillStyle = '#b8b8c0'; for (let i = 2; i < TILE; i += 5) { g.fillRect(px + i, py + 6, 2, 6); g.fillRect(px + i, py + 4, 1, 2); } break;
    case T.FARM: case T.TILLED: dither(g, px, py, '#5a4326', '#4e3a20', wx, wy, seed); g.fillStyle = '#3e2e18'; for (let i = 2; i < TILE; i += 4) g.fillRect(px, py + i, TILE, 1); break;
    case T.CROP: dither(g, px, py, '#5a4326', '#4e3a20', wx, wy, seed); g.fillStyle = '#e8b83f'; for (let i = 2; i < TILE; i += 4) { g.fillRect(px + i, py + 4, 2, 8); g.fillRect(px + i - 1, py + 5, 1, 2); g.fillRect(px + i + 2, py + 7, 1, 2); } break;
    case T.BEDROCK: g.fillStyle = '#1a1a22'; g.fillRect(px, py, TILE, TILE); g.fillStyle = '#2a2a35'; if (h > 0.5) g.fillRect(px + 3, py + 3, 6, 4); break;
    case T.SHRINE: {
      dither(g, px, py, '#a89a78', '#9c8e6c', wx, wy, seed);
      g.fillStyle = '#8a8a92'; g.fillRect(px + 3, py + 2, 10, 12);
      g.fillStyle = '#6a6a72'; g.fillRect(px + 3, py + 11, 10, 3);
      g.fillStyle = '#ffb43f'; g.fillRect(px + 6, py + 5, 4, 4);
      g.fillStyle = '#fff3c4'; g.fillRect(px + 7, py + 6, 2, 2);
      break;
    }
    case T.BED: dither(g, px, py, '#9a8567', '#8c7a5e', wx, wy, seed); g.fillStyle = '#a33a3a'; g.fillRect(px + 2, py + 6, 12, 7); g.fillStyle = '#e8e0d0'; g.fillRect(px + 2, py + 6, 4, 4); g.fillStyle = '#6b4a2f'; g.fillRect(px + 2, py + 12, 12, 2); break;
    case T.BENCH: dither(g, px, py, '#9a8567', '#8c7a5e', wx, wy, seed); g.fillStyle = '#7a5a35'; g.fillRect(px + 2, py + 6, 12, 4); g.fillStyle = '#5f4426'; g.fillRect(px + 3, py + 10, 2, 4); g.fillRect(px + 11, py + 10, 2, 4); g.fillStyle = '#b8b8c0'; g.fillRect(px + 4, py + 4, 3, 2); break;
    case T.ANVIL: dither(g, px, py, '#9a8567', '#8c7a5e', wx, wy, seed); g.fillStyle = '#4a4a55'; g.fillRect(px + 3, py + 6, 10, 3); g.fillRect(px + 6, py + 9, 4, 5); g.fillStyle = '#6a6a75'; g.fillRect(px + 3, py + 6, 10, 1); break;
    case T.WELL: dither(g, px, py, '#a89a78', '#9c8e6c', wx, wy, seed); g.fillStyle = '#7a7a85'; g.fillRect(px + 3, py + 6, 10, 8); g.fillStyle = '#2a4a6a'; g.fillRect(px + 5, py + 8, 6, 4); g.fillStyle = '#6b4a2f'; g.fillRect(px + 4, py + 2, 2, 4); g.fillRect(px + 10, py + 2, 2, 4); g.fillStyle = '#8a5a2a'; g.fillRect(px + 3, py + 1, 10, 2); break;
    case T.LANTERN: {
      dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
      g.fillStyle = '#4a4038'; g.fillRect(px + 7, py + 3, 2, 11);
      g.fillStyle = '#ffb43f'; g.fillRect(px + 5, py + 1, 6, 4);
      g.fillStyle = '#fff3c4'; g.fillRect(px + 6, py + 2, 4, 2);
      break;
    }
    case T.SIGN: dither(g, px, py, b.ground, b.ground2, wx, wy, seed); g.fillStyle = '#6b4a2f'; g.fillRect(px + 7, py + 6, 2, 8); g.fillStyle = '#8a5a2a'; g.fillRect(px + 3, py + 2, 10, 5); break;
    case T.GEYSER: dither(g, px, py, b.ground, b.ground2, wx, wy, seed); g.fillStyle = '#6a6a72'; g.fillRect(px + 3, py + 8, 10, 6); g.fillStyle = '#c8e8f0'; g.fillRect(px + 6, py + 5, 4, 3); break;
    case T.KEY_PEDESTAL: dither(g, px, py, '#555064', '#4a4658', wx, wy, seed); g.fillStyle = '#8a8a92'; g.fillRect(px + 5, py + 8, 6, 6); g.fillStyle = '#ffd23f'; g.fillRect(px + 7, py + 4, 2, 4); break;
    case T.PLACED: dither(g, px, py, '#7a6a55', '#6e5f4b', wx, wy, seed); break;
    default: dither(g, px, py, b.ground, b.ground2, wx, wy, seed);
  }
}
// Mini-map color per tile (for world thumbnails + map screen)
export function tileMapColor(t: number, b: { ground: string; liquidColor: string }): string {
  switch (t) {
    case T.WATER: case T.ICE: case T.SLIME: case T.POISON: case T.TAR: return b.liquidColor === '#00000000' ? '#3a6ea8' : b.liquidColor;
    case T.LAVA: return '#e05a1e';
    case T.TREE: return '#2d5a27';
    case T.ROCK: case T.STONE: return '#8a8a92';
    case T.WALL: case T.DUNGEON_WALL: return '#3a3542';
    case T.PATH: case T.BRIDGE: return '#a89a78';
    case T.SHRINE: return '#ffb43f';
    case T.CHEST: return '#ffd23f';
    default: return b.ground;
  }
}
