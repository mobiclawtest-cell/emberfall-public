// Emberfall core game: world streaming, rendering, combat, AI, events, day/night.
import { ChunkManager } from '../world/chunks';
import { CHUNK, TILE, T, SOLID, LIQUID_TILES, HAZARD_TILES, BREAKABLE, CRYSTAL_TILE, WorldGenOpts, biomeAt, generateChunk, villageAt } from '../world/terrain';
import { BIOMES, Biome } from '../world/biomes';
import { Player, Facing } from '../entities/player';
import { EnemyDef, generateEnemy, enemyForFamily, Tier, Element, ELEMENT_COLORS, WEAK_TO } from '../entities/enemies';
import { BossDef, generateBoss } from '../entities/bosses';
import { NpcDef, makeVillageNpcs, npcDialogue, AMBIENTS, AmbientKind } from '../entities/npc';
import { Particles } from '../engine/particles';
import { ProjectilePool, computeDamage, newStatus, StatusFx, elementOfStatus, inArc } from '../combat/combat';
import { playerSprite, cinderSprite, genomeSprite, Genome } from '../engine/sprites';
import { audio } from '../engine/audio';
import { RNG, hash2 } from '../engine/rng';
import { clamp, lerp, dist, hit as circleHit, shade } from '../engine/utils';
import { StoryState, newStory, actDungeonPos, CUTSCENES, ACTS } from '../story/story';
import { WorldMeta, WorldSave, SAVE_VERSION, WorldSettings } from '../data/worldtypes';
import { ITEMS } from '../items/items';
import { rollLoot, getIcon } from '../items/items';
import { dbSet } from '../engine/save';

export const VIEW_W = 180, VIEW_H = 240;
export interface InputState {
  dx: number; dy: number;
  a: boolean; b: boolean; x: boolean; y: boolean;
  aP: boolean; bP: boolean; xP: boolean; yP: boolean;
  startP: boolean;
}
export function newInput(): InputState {
  return { dx: 0, dy: 0, a: false, b: false, x: false, y: false, aP: false, bP: false, xP: false, yP: false, startP: false };
}
export interface EnemyInst {
  uid: number; def: EnemyDef; x: number; y: number; hp: number; maxHp: number;
  status: StatusFx; state: 'idle' | 'chase' | 'windup' | 'attack' | 'recover' | 'dead' | 'stunned';
  stateT: number; vx: number; vy: number; frame: number; animT: number;
  homeX: number; homeY: number; telegraph: number; targetX: number; targetY: number;
  flash: number; kb: { x: number; y: number }; summoned: boolean;
}
export interface NpcInst { def: NpcDef; x: number; y: number; frame: number; wanderT: number; tx: number; ty: number; }
export interface AmbientInst { kind: AmbientKind; x: number; y: number; t: number; dir: number; }
export interface PetInst { kind: string; name: string; x: number; y: number; level: number; xp: number; }
export interface DroppedItem { id: string; n: number; x: number; y: number; t: number; }
export type GameEvent =
  | { type: 'toast'; text: string; icon?: string }
  | { type: 'achievement'; id: string }
  | { type: 'dialogue'; speaker: string; text: string; color?: string }
  | { type: 'dialogueEnd' }
  | { type: 'openScreen'; screen: string; data?: any }
  | { type: 'vibrate'; ms: number }
  | { type: 'save' }
  | { type: 'gameOver'; hardcore: boolean }
  | { type: 'ending'; ending: string };

export interface GameCallbacks {
  onEvent: (e: GameEvent) => void;
  onHudDirty: () => void;
}

let UID = 1;

export class Game {
  canvas: HTMLCanvasElement; g: CanvasRenderingContext2D;
  player = new Player();
  chunks: ChunkManager;
  opts: WorldGenOpts & { settings: WorldSettings };
  meta: WorldMeta;
  story: StoryState;
  particles = new Particles();
  projectiles = new ProjectilePool();
  enemies: EnemyInst[] = [];
  npcs: NpcInst[] = [];
  ambients: AmbientInst[] = [];
  drops: DroppedItem[] = [];
  pets: PetInst[] = [];
  input: InputState = newInput();
  cam = { x: 0, y: 0 };
  shake = 0; hitStop = 0;
  timeOfDay = 0.35; // 0..1
  dayCount = 1;
  weather: { kind: string; t: number } = { kind: 'clear', t: 60 };
  layer = 0;
  rng = new RNG(Date.now() % 100000);
  cb: GameCallbacks;
  paused = false;
  inCutscene: string[] | null = null; cutsceneIdx = 0; cutsceneChar = 0; cutsceneTimer = 0;
  achievements = new Set<string>();
  stats: Record<string, number> = { kills: 0, crits: 0, finishers: 0, deaths: 0, walked: 0, chests: 0, crafted: 0, chopped: 0, mined: 0, fish: 0, cooked: 0, treasures: 0, dungeons: 0, bosses: 0, elites: 0, champions: 0, secrets: 0, sidequests: 0, gifts: 0, events: 0, bought: 0, sold: 0, arenasBest: 0, diceWins: 0, cardWins: 0, rifts: 0, harvests: 0 };
  bestiary: Record<string, number> = {};
  collection = new Set<string>();
  biomesSeen = new Set<string>();
  chestsOpened = new Set<string>();
  switchesHit = new Set<string>();
  npcFriends: Record<string, number> = {};
  sideQuests: any[] = [];
  dailyQuests: any[] = [];
  pins: { x: number; y: number; label: string; color: string }[] = [];
  shrinesFound: { x: number; y: number }[] = [];
  home: { owned: boolean; x: number; y: number; level: number; decorations: string[] } = { owned: false, x: 0, y: 0, level: 0, decorations: [] };
  activeBoss: (EnemyInst & { bossDef?: BossDef; phase?: number }) | null = null;
  bossArena: { x: number; y: number; r: number } | null = null;
  eventTimer = 90; // random events
  autosaveT = 30;
  playSessionStart = Date.now();
  spawnedChunks = new Set<string>();
  interactedVillage = new Set<string>();
  companion: { name: string; x: number; y: number; frame: number } | null = null;
  cinder = { x: 0, y: 0, frame: 0, hintT: 20 };
  screenFlash = 0; flashColor = '#fff';
  dialogQueue: { speaker: string; text: string; color?: string }[] = [];
  sleepBlack = 0;
  fishingState: any = null;
  worldEvent: { kind: string; t: number } | null = null;
  merchantCaravan: { x: number; y: number } | null = null;
  frozen = false; // UI open
  quality: 'low' | 'medium' | 'high' = 'medium';
  timeMul = 1;
  constructor(canvas: HTMLCanvasElement, meta: WorldMeta, cb: GameCallbacks) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d')!;
    this.g.imageSmoothingEnabled = false;
    this.meta = meta;
    this.opts = { seed: meta.seed, type: meta.settings.type, settings: meta.settings };
    this.chunks = new ChunkManager(this.opts);
    this.story = newStory();
    this.cb = cb;
    if (meta.settings.mutators.includes('fast')) this.timeMul = 1.4;
    if (meta.settings.mutators.includes('slow')) this.timeMul = 0.7;
  }
  emit(e: GameEvent) { this.cb.onEvent(e); }
  vibrate(ms: number) { this.emit({ type: 'vibrate', ms }); }
  toast(text: string, icon?: string) { this.emit({ type: 'toast', text, icon }); }
  award(id: string) {
    if (this.achievements.has(id)) return;
    this.achievements.add(id);
    this.meta.achievementIds = [...this.achievements];
    this.emit({ type: 'achievement', id });
    audio.sfx('achieve');
  }
  // ---------- setup ----------
  spawnAtVillage() {
    // find nearest village structure to origin
    for (let r = 0; r < 12; r++) {
      for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) {
        if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
        if (villageAt(cx, cy, this.opts)) {
          this.player.x = cx * CHUNK * TILE + 16 * TILE + 8;
          this.player.y = cy * CHUNK * TILE + 17 * TILE;
          return;
        }
      }
    }
    this.player.x = 16 * TILE; this.player.y = 16 * TILE;
  }
  startPlay() {
    this.chunks.ensureRadius(this.player.x / TILE, this.player.y / TILE, this.layer, 60);
    // generate center chunk synchronously so we never spawn in void
    const pcx = Math.floor(this.player.x / TILE / CHUNK), pcy = Math.floor(this.player.y / TILE / CHUNK);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = this.chunks.key(pcx + dx, pcy + dy, this.layer);
      if (!this.chunks.chunks.has(k)) {
        const c = generateChunk(pcx + dx, pcy + dy, this.layer, this.opts);
        this.chunks.applyPublic(c);
      }
    }
    this.cinder.x = this.player.x - 10; this.cinder.y = this.player.y - 8;
        if (!this.meta.achievementIds.includes('loaded_once') && this.story.act === 0 && !this.story.flags.prologue_done) {
      this.startCutscene('prologue');
    }
  }
  // ---------- persistence ----------
  serialize(): WorldSave {
    this.meta.playtimeMs += Date.now() - this.playSessionStart;
    this.playSessionStart = Date.now();
    this.meta.playerLevel = this.player.level;
    this.meta.storyAct = this.story.act;
    this.meta.biomesDiscovered = [...this.biomesSeen];
    this.meta.deepestLayer = Math.max(this.meta.deepestLayer, this.layer);
    this.meta.lastPlayed = Date.now();
    this.meta.thumbnail = this.makeThumbnail();
    return {
      version: SAVE_VERSION,
      meta: this.meta,
      player: this.player.serialize(),
      story: { ...this.story, loreFound: [...this.story.loreFound] },
      mods: this.chunks.serializeMods(),
      explored: [...this.chunks.explored],
      bestiary: this.bestiary,
      collection: [...this.collection],
      pets: this.pets.map(p => ({ ...p })),
      home: this.home,
      stats: this.stats,
      quests: { side: this.sideQuests, pins: this.pins, shrines: this.shrinesFound },
      chestsOpened: [...this.chestsOpened],
      switchesHit: [...this.switchesHit],
      npcFriends: this.npcFriends,
      lastSavedAt: Date.now(),
    };
  }
  load(save: WorldSave) {
    this.player.load(save.player);
    this.story = { ...newStory(), ...(save.story || {}) };
    this.chunks.loadMods(save.mods || {});
    this.chunks.loadExplored(save.explored || []);
    this.bestiary = save.bestiary || {};
    this.collection = new Set(save.collection || []);
    this.pets = (save.pets || []).map((p: any) => ({ ...p }));
    this.home = save.home || this.home;
    Object.assign(this.stats, save.stats || {});
    this.sideQuests = save.quests?.side || [];
    this.pins = save.quests?.pins || [];
    this.shrinesFound = save.quests?.shrines || [];
    this.chestsOpened = new Set(save.chestsOpened || []);
    this.switchesHit = new Set(save.switchesHit || []);
    this.npcFriends = save.npcFriends || {};
    this.achievements = new Set(save.meta.achievementIds || []);
    this.biomesSeen = new Set(save.meta.biomesDiscovered || []);
    this.layer = 0;
  }
  async saveNow() {
    const data = this.serialize();
    try {
      await dbSet(`world_${this.meta.id}`, data);
      const idx = (await (await import('../engine/save')).dbGet<WorldMeta[]>('worlds_index')) || [];
      const i = idx.findIndex(w => w.id === this.meta.id);
      if (i >= 0) idx[i] = data.meta; else idx.push(data.meta);
      await dbSet('worlds_index', idx);
    } catch { /* in-memory fallback handles it */ }
  }
  makeThumbnail(): string {
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 48;
      const g = c.getContext('2d')!;
      const pcx = Math.floor(this.player.x / TILE / CHUNK), pcy = Math.floor(this.player.y / TILE / CHUNK);
      for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 8; dx++) {
        const cx = pcx + dx - 4, cy = pcy + dy - 3;
        const ch = this.chunks.getChunk(cx, cy, 0);
        if (ch) {
          const cv = this.chunks.getCanvas(cx, cy, 0);
          if (cv) g.drawImage(cv, dx * 8, dy * 8, 8, 8);
        } else {
          const b = biomeAt(cx * CHUNK + 16, cy * CHUNK + 16, this.opts);
          g.fillStyle = b.ground; g.fillRect(dx * 8, dy * 8, 8, 8);
        }
      }
      g.fillStyle = '#ff6a2a'; g.fillRect(30, 22, 4, 4);
      return c.toDataURL('image/png');
    } catch { return ''; }
  }
  // ---------- main update ----------
  update(dtRaw: number) {
    if (this.frozen) { this.clearEdges(); return; }
    const dt = dtRaw * this.timeMul;
    if (this.hitStop > 0) { this.hitStop -= dtRaw; this.clearEdges(); return; }
    const p = this.player;
    // cutscene mode: only advance text
    if (this.inCutscene) {
      this.updateCutscene(dtRaw);
      this.clearEdges();
      return;
    }
    // day/night
    if (!this.meta.settings.mutators.includes('eternal_night')) {
      const prev = this.timeOfDay;
      this.timeOfDay += dt / 240; // 4 min day
      if (this.timeOfDay >= 1) { this.timeOfDay = 0; this.dayCount++; this.onNewDay(); }
      if (prev < 0.75 && this.timeOfDay >= 0.75) this.toast('Night falls...', 'moon');
    }
    // weather
    this.weather.t -= dt;
    if (this.weather.t <= 0) this.rollWeather();
    // world events
    this.eventTimer -= dt;
    if (this.eventTimer <= 0) this.rollWorldEvent();
    if (this.worldEvent) {
      this.worldEvent.t -= dt;
      if (this.worldEvent.t <= 0) this.worldEvent = null;
    }
    // chunk streaming
    const ptx = p.x / TILE, pty = p.y / TILE;
    this.chunks.ensureRadius(ptx, pty, this.layer, 70);
    this.chunks.processQueue(4);
    this.chunks.markExplored(ptx, pty, this.layer);
    this.spawnFromChunks();
    // player
    this.updatePlayer(dt);
    // entities
    this.updateEnemies(dt);
    this.updateNpcs(dt);
    this.updateAmbients(dt);
    this.updateDrops(dt);
    this.projectiles.update(dt, (pr) => this.projectileHit(pr));
    this.particles.update(dt);
    // cinder follows
    const cd = this.cinder;
    cd.x = lerp(cd.x, p.x - 8 + Math.sin(performance.now() / 400) * 4, dt * 3);
    cd.y = lerp(cd.y, p.y - 10 + Math.cos(performance.now() / 500) * 3, dt * 3);
    cd.frame = Math.floor(performance.now() / 200) % 4;
    cd.hintT -= dt;
    if (cd.hintT <= 0) { this.cinderHint(); cd.hintT = 45 + this.rng.range(0, 30); }
    // pets
    for (const pet of this.pets) {
      pet.x = lerp(pet.x, p.x + 10, dt * 2.5);
      pet.y = lerp(pet.y, p.y + 8, dt * 2.5);
    }
    // autosave
    this.autosaveT -= dtRaw;
    if (this.autosaveT <= 0) { this.autosaveT = 30; this.emit({ type: 'save' }); }
    // death
    if (p.dead && p.deadTimer <= 0) this.onPlayerDeath();
    // camera
    const tx = p.x - VIEW_W / 2, ty = p.y - VIEW_H / 2 - 10;
    this.cam.x = lerp(this.cam.x, tx, Math.min(1, dt * 8));
    this.cam.y = lerp(this.cam.y, ty, Math.min(1, dt * 8));
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.screenFlash > 0) this.screenFlash -= dt;
    this.clearEdges();
  }
  clearEdges() { const i = this.input; i.aP = i.bP = i.xP = i.yP = i.startP = false; }
  onNewDay() {
    this.toast(`Day ${this.dayCount}`, 'moon');
    this.rollDailyQuests();
  }
  rollWeather() {
    const b = this.currentBiome();
    const r = this.rng.next();
    if (b.family === 'cold') this.weather = { kind: r < 0.5 ? 'snow' : 'clear', t: 60 + this.rng.range(0, 90) };
    else if (b.family === 'arid') this.weather = { kind: r < 0.35 ? 'sand' : 'clear', t: 60 + this.rng.range(0, 90) };
    else if (b.family === 'fire') this.weather = { kind: r < 0.5 ? 'ash' : 'clear', t: 60 + this.rng.range(0, 90) };
    else if (b.family === 'blight') this.weather = { kind: r < 0.4 ? 'blight' : 'clear', t: 60 + this.rng.range(0, 90) };
    else this.weather = { kind: r < 0.25 ? 'rain' : r < 0.3 ? 'storm' : r < 0.36 ? 'aurora' : 'clear', t: 60 + this.rng.range(0, 120) };
    if (this.weather.kind === 'rain' || this.weather.kind === 'storm') audio.sfx('rain');
  }
  rollWorldEvent() {
    this.eventTimer = 120 + this.rng.range(0, 180);
    const roll = this.rng.next();
    if (roll < 0.18) { // blood moon
      this.worldEvent = { kind: 'bloodmoon', t: 45 };
      this.toast('A BLOOD MOON rises!', 'moon');
      audio.sfx('roar');
      this.stats.events++; this.award('event10'); this.trackEvent();
    } else if (roll < 0.32) { // meteor shower
      this.worldEvent = { kind: 'meteor', t: 20 };
      this.toast('A meteor shower streaks the sky!', 'moon');
      this.award('meteor'); this.stats.events++; this.trackEvent();
      audio.sfx('meteor');
    } else if (roll < 0.45) { // aurora
      this.worldEvent = { kind: 'aurora', t: 60 };
      this.toast('An aurora dances overhead.', 'moon');
      this.award('aurora'); this.stats.events++; this.trackEvent();
    } else if (roll < 0.6) { // merchant caravan
      this.merchantCaravan = { x: this.player.x + this.rng.range(-80, 80), y: this.player.y + this.rng.range(60, 120) };
      this.toast('A wandering caravan approaches!', 'coin');
      this.stats.events++; this.trackEvent();
    } else if (roll < 0.75) { // ambush
      this.toast('Ambush!', 'sword');
      this.stats.events++; this.trackEvent();
      for (let i = 0; i < 3; i++) {
        const a = this.rng.range(0, Math.PI * 2);
        this.spawnEnemyNear(this.player.x + Math.cos(a) * 70, this.player.y + Math.sin(a) * 70, 'common');
      }
    } else { // mysterious shrine / lost traveler
      if (this.rng.chance(0.5)) this.toast('You hear bells in the distance...', 'shrine');
      else this.toast('A lost traveler waves you down nearby.', 'house');
      this.stats.events++; this.trackEvent();
    }
  }
  trackEvent() { if (this.stats.events >= 10) this.award('event10'); }
  rollDailyQuests() {
    this.dailyQuests = [];
    const r = new RNG(Math.floor(Date.now() / 86400000));
    const kinds = ['slay', 'gather', 'fish', 'explore'];
    for (let i = 0; i < 3; i++) {
      const kind = r.pick(kinds);
      this.dailyQuests.push({ id: `dq_${r.int(0, 99999)}`, kind, n: r.int(3, 8), progress: 0, reward: { gold: r.int(15, 40) }, done: false });
    }
  }
  cinderHint() {
    const hints = [
      'Cinder: "Press A to attack. Chain three hits for a finisher!"',
      'Cinder: "B is a dodge roll. You\'re invincible mid-roll!"',
      'Cinder: "Trees and rocks break with tools. Free materials!"',
      'Cinder: "Shrines let you fast travel. Activate them!"',
      'Cinder: "Enemies have elements. Match their weakness!"',
      'Cinder: "Beds set your respawn. Sleep to pass the night."',
      'Cinder: "The Blight spreads from the northeast. Careful there."',
      'Cinder: "Bombs crack open cracked walls. Loot inside!"',
      'Cinder: "I can smell treasure when we\'re near chests..."',
      'Cinder: "Check your Journal for lore we\'ve found."',
    ];
    this.toast(hints[this.rng.int(0, hints.length - 1)]);
  }
  currentBiome(): Biome {
    return biomeAt(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE), this.opts);
  }
  // ---------- player ----------
  updatePlayer(dt: number) {
    const p = this.player;
    p.update(dt);
    if (p.dead) return;
    const inp = this.input;
    let mx = inp.dx, my = inp.dy;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    p.moving = ml > 0.15;
    const frozenMul = p.status.freeze > 0 ? 0.45 : 1;
    const shockMul = p.status.shock > 0 ? 0.8 : 1;
    let speed = p.totalSpeed * frozenMul * shockMul;
    // swimming slows
    const pTileX = Math.floor(p.x / TILE), pTileY = Math.floor(p.y / TILE);
    const onTile = this.chunks.getTile(pTileX, pTileY, this.layer);
    p.swim = onTile === T.WATER;
    if (p.swim) speed *= 0.5;
    if (p.rollTimer > 0) {
      this.moveEntity(p, p.rollDx * speed * 2.6 * dt, p.rollDy * speed * 2.6 * dt);
      if (Math.random() < 0.5) this.particles.spawn(p.x, p.y, 0, 0, 0.3, '#aaaaaa88', 1);
    } else if (p.attackTimer <= 0) {
      this.moveEntity(p, mx * speed * dt, my * speed * dt);
      if (p.moving) {
        this.stats.walked += speed * dt / TILE;
        if (this.stats.walked > 10000) this.award('walk10k');
        if (this.stats.walked > 100000) this.award('walk100k');
        p.stepTimer -= dt;
        if (p.stepTimer <= 0) { p.stepTimer = 0.32; if (!p.swim) audio.sfx('step'); }
        if (Math.abs(mx) > Math.abs(my)) p.facing = mx > 0 ? 3 : 1;
        else p.facing = my > 0 ? 0 : 2;
      }
    }
    // hazard tiles
    if (HAZARD_TILES.has(onTile) && p.rollTimer <= 0) {
      p.hurtTimer -= 0; // tick handled by hazard cooldown below
      this.hazardTick(dt, onTile);
    }
    // actions
    if (inp.aP) this.doAttack();
    if (inp.bP) {
      const dx = p.moving ? inp.dx : [0, -1, 0, 1][p.facing] === 0 ? (p.facing === 1 ? -1 : p.facing === 3 ? 1 : 0) : 0;
      const dy = p.moving ? inp.dy : (p.facing === 0 ? 1 : p.facing === 2 ? -1 : 0);
      if (p.startRoll(dx, dy)) { audio.sfx('roll'); this.vibrate(15); }
    }
    if (inp.yP) this.interact();
    if (inp.xP) this.useQuickItem();
    // blocking via holding shield slot? simple: hold X when shield equipped? We map: hold Y near nothing = block if shield equipped
    p.blocking = inp.y && !this.interactableNear() && !!p.inv.equip.shield && p.stamina > 0;
    // bow charge: hold A with bow equipped in bow slot
    const bow = p.inv.equip.bow;
    if (bow && inp.b && p.bowCharge >= 0) {
      p.bowCharge += dt;
    } else if (bow && !inp.b && p.bowCharge > 0.2) {
      this.fireArrow(Math.min(1, p.bowCharge));
      p.bowCharge = -1;
    } else if (bow && inp.b && p.bowCharge < 0 && p.rollTimer <= 0) {
      p.bowCharge = 0;
    }
    // biome discovery + music
    const b = this.currentBiome();
    if (!this.biomesSeen.has(b.id)) {
      this.biomesSeen.add(b.id);
      this.collection.add(`biome_${b.id}`);
      this.toast(`Discovered: ${b.name}`, 'map');
      audio.sfx('quest');
      const n = this.biomesSeen.size;
      if (n >= 3) this.award('biome3');
      if (n >= 10) this.award('biome10');
      if (n >= 20) this.award('biome20');
      if (n >= 30) this.award('biome30');
    }
    audio.play(this.layer === 0 ? b.music : this.layer === 1 ? 'cave' : this.layer === 2 ? 'dungeon' : 'blight');
  }
  hazardT = 0;
  hazardTick(dt: number, tile: number) {
    this.hazardT -= dt;
    if (this.hazardT > 0) return;
    this.hazardT = 0.5;
    const p = this.player;
    let dmg = 2;
    if (tile === T.LAVA) { dmg = 8; p.status.burn = 2; }
    else if (tile === T.POISON) { dmg = 2; p.status.poison = 3; }
    else if (tile === T.TRAP || tile === T.SPIKES) { dmg = 6; audio.sfx('trap'); }
    else if (tile === T.GEYSER) { dmg = 5; }
    const res = computeDamage(dmg + (this.meta.settings.mutators.includes('glass_jaw') ? dmg : 0), p.totalDef, 'none', 'none', 'none', 0, Math.random);
    if (this.meta.settings.mutators.includes('one_hit')) res.amount = 9999;
    p.damage(res.amount);
    this.particles.damage(p.x, p.y - 6, res.amount, false, '#ff6a6a');
    this.shake = Math.max(this.shake, 3);
    audio.sfx('hurt'); this.vibrate(30);
  }
  moveEntity(e: { x: number; y: number }, dx: number, dy: number) {
    // axis-separated tile collision, hitbox ~10px
    const r = 5;
    const tryMove = (nx: number, ny: number): boolean => {
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        const tx = Math.floor((nx + ox) / TILE), ty = Math.floor((ny + oy) / TILE);
        if (this.chunks.isSolid(tx, ty, this.layer)) return false;
      }
      return true;
    };
    if (tryMove(e.x + dx, e.y)) e.x += dx;
    if (tryMove(e.x, e.y + dy)) e.y += dy;
  }
  doAttack() {
    const p = this.player;
    // if quick slot block selected, A places block instead
    const stage = p.startAttack(false);
    if (!stage) return;
    const heavy = stage === 'slash3';
    audio.sfx(stage);
    this.vibrate(heavy ? 25 : 10);
    const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
    const reach = heavy ? 30 : 24;
    const arc = heavy ? 2.4 : 1.6;
    const el = p.weaponElement;
    const baseDmg = p.totalAtk + (heavy ? 6 : stage === 'slash2' ? 2 : 0);
    let hitAny = false;
    for (const e of this.enemies) {
      if (e.state === 'dead') continue;
      if (inArc(p.x, p.y, ang, e.x, e.y, reach + e.def.genome.size * e.def.scale, arc)) {
        this.hitEnemy(e, baseDmg, el, ang, heavy ? 14 : 7);
        hitAny = true;
      }
    }
    // slash particles
    const sx = p.x + Math.cos(ang) * 14, sy = p.y + Math.sin(ang) * 14;
    const trailColor = p.swordTrail || (el !== 'none' ? ELEMENT_COLORS[el] : '#ffffff');
    for (let i = 0; i < (heavy ? 10 : 6); i++) {
      const a2 = ang + (this.rng.range(-1, 1)) * arc / 2;
      this.particles.spawn(sx + Math.cos(a2) * this.rng.range(0, 12), sy + Math.sin(a2) * this.rng.range(0, 12), Math.cos(a2) * 30, Math.sin(a2) * 30, 0.25, trailColor, 1, 0, 1);
    }
    if (hitAny) {
      this.hitStop = heavy ? 0.09 : 0.05;
      this.shake = Math.max(this.shake, heavy ? 4 : 2);
      if (heavy) { this.stats.finishers++; if (this.stats.finishers >= 50) this.award('combo50'); }
    } else {
      // no enemy hit: try breaking resource tiles
      this.tryBreakTile(ang, reach);
    }
  }
  tryBreakTile(ang: number, reach: number) {
    const p = this.player;
    const tx = Math.floor((p.x + Math.cos(ang) * 16) / TILE);
    const ty = Math.floor((p.y + Math.sin(ang) * 16) / TILE);
    const t = this.chunks.getTile(tx, ty, this.layer);
    if (!BREAKABLE.has(t) && t !== CRYSTAL_TILE) return;
    const tool = p.inv.equip.tool ? ITEMS[p.inv.equip.tool.id] : null;
    let power = 1;
    if (tool?.kind === 'axe' && t === T.TREE) power = 3;
    if (tool?.kind === 'tool' && (t === T.ROCK || t === T.ORE)) power = 3;
    this.tileDamage(tx, ty, power, t);
  }
  tileHp = new Map<string, number>();
  tileDamage(tx: number, ty: number, power: number, t: number) {
    const key = `${this.layer}_${tx}_${ty}`;
    const maxHp = t === T.TREE ? 3 : t === T.ROCK ? 4 : t === T.ORE ? 6 : t === T.CRACKED ? 99 : 2;
    const cur = (this.tileHp.get(key) ?? maxHp) - power;
    audio.sfx(t === T.TREE ? 'chop' : 'mine');
    this.particles.burst(tx * TILE + 8, ty * TILE + 8, 5, t === T.TREE ? '#4a8a3a' : '#8a8a92', 25, 0.4);
    if (cur <= 0) {
      this.tileHp.delete(key);
      this.breakTile(tx, ty, t);
    } else this.tileHp.set(key, cur);
  }
  breakTile(tx: number, ty: number, t: number) {
    const p = this.player;
    this.chunks.setTile(tx, ty, this.layer, this.baseGroundFor(tx, ty));
    audio.sfx('break');
    let loot: { id: string; n: number } | null = null;
    if (t === T.TREE) { loot = { id: 'mat_wood', n: this.rng.int(1, 3) }; this.stats.chopped++; if (this.stats.chopped >= 50) this.award('chop50'); }
    else if (t === T.ROCK) { loot = { id: 'mat_stone_chunk', n: this.rng.int(1, 2) }; this.stats.mined++; }
    else if (t === T.ORE) { loot = { id: this.rng.pick(['mat_iron_ore', 'mat_gold_ore', 'mat_coal', 'mat_crystal_shard']), n: this.rng.int(1, 2) }; this.stats.mined++; }
    else if (t === CRYSTAL_TILE) { loot = { id: 'mat_crystal_shard', n: 1 }; this.stats.mined++; }
    else if (t === T.CROP) { loot = { id: this.rng.chance(0.2) ? 'food_emberfruit' : 'food_berry', n: 1 }; this.stats.harvests++; this.award('farm1'); if (this.stats.harvests >= 20) this.award('farm20'); }
    else if (t === T.PROP || t === T.FLOWER) { if (this.rng.chance(0.3)) loot = { id: 'seed_wheat', n: 1 }; }
    if (this.stats.mined >= 50) this.award('mine50');
    if (loot) {
      const rem = p.inv.add(loot.id, loot.n);
      if (rem === 0) { this.toast(`+${loot.n} ${ITEMS[loot.id].name}`, 'material'); audio.sfx('pickup'); }
      else this.drops.push({ id: loot.id, n: loot.n, x: tx * TILE + 8, y: ty * TILE + 8, t: 60 });
    }
    this.particles.burst(tx * TILE + 8, ty * TILE + 8, 8, '#c8b89a', 35, 0.5);
  }
  baseGroundFor(tx: number, ty: number): number {
    if (this.layer > 0) return T.DUNGEON_FLOOR;
    const b = biomeAt(tx, ty, this.opts);
    if (b.family === 'arid' || b.family === 'coast') return T.SAND;
    if (b.family === 'cold') return T.SNOW;
    return T.GRASS;
  }
  fireArrow(charge: number) {
    const p = this.player;
    const bowDef = ITEMS[p.inv.equip.bow!.id];
    const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
    const sp = 140 + charge * 120;
    this.projectiles.spawn({
      x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.2,
      dmg: Math.round((bowDef.atk || 6) * (0.5 + charge)), element: (bowDef.element as any) || 'none',
      fromPlayer: true, kind: 'arrow', radius: 4,
    });
    audio.sfx('bow');
  }
  // ---------- enemies ----------
  spawnFromChunks() {
    if (this.meta.settings.mode === 'peaceful') return;
    const p = this.player;
    const ptx = p.x / TILE, pty = p.y / TILE;
    const pcx = Math.floor(ptx / CHUNK), pcy = Math.floor(pty / CHUNK);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = pcx + dx, cy = pcy + dy;
      const ck = `${cx},${cy},${this.layer}`;
      if (this.spawnedChunks.has(ck)) continue;
      const chunk = this.chunks.getChunk(cx, cy, this.layer);
      if (!chunk) continue;
      this.spawnedChunks.add(ck);
      if (this.spawnedChunks.size > 400) { const k0 = this.spawnedChunks.values().next().value; if (k0) this.spawnedChunks.delete(k0); }
      const mult = this.meta.settings.mutators.includes('double_enemies') ? 2 : 1;
      const night = this.timeOfDay > 0.72 || this.timeOfDay < 0.25;
      for (const sp of chunk.enemies) {
        for (let m = 0; m < mult; m++) {
          if (this.enemies.length >= 22) break;
          const wx = sp.x * TILE + 8 + this.rng.range(-8, 8), wy = sp.y * TILE + 8 + this.rng.range(-8, 8);
          if (dist(wx, wy, p.x, p.y) < 40) continue; // don't spawn on player
          this.spawnEnemyAt(sp.family, wx, wy, sp.elite || (night && this.rng.chance(0.08)) ? 'elite' : 'common');
        }
      }
      // structures: village NPCs
      for (const st of chunk.structures) {
        if (st.kind === 'village' && !this.interactedVillage.has(st.id)) {
          this.interactedVillage.add(st.id);
          this.stats.events += 0;
          const vcx = st.x + 10 * TILE, vcy = st.y + 10 * TILE;
          for (const npc of makeVillageNpcs(hash2(cx, cy, this.opts.seed + 42) * 1e9 | 0, vcx, vcy)) {
            this.npcs.push({ def: npc, x: npc.home.x, y: npc.home.y, frame: 0, wanderT: this.rng.range(0, 3), tx: npc.home.x, ty: npc.home.y });
          }
          this.award('village1');
        }
      }
    }
  }
  spawnEnemyNear(x: number, y: number, tier: Tier) {
    const b = this.currentBiome();
    const fam = this.rng.pick(b.enemyFamilies);
    this.spawnEnemyAt(fam, x, y, tier);
  }
  spawnEnemyAt(family: string, x: number, y: number, tier: Tier): EnemyInst {
    const b = this.layer === 0 ? this.currentBiome() : this.layer === 1 ? BIOMES.crystal : this.layer === 2 ? BIOMES.volcanic : BIOMES.blightlands;
    const d0 = dist(x, y, 0, 0);
    let def = enemyForFamily(family, (hash2(Math.floor(x), Math.floor(y), this.opts.seed) * 1e9) | 0, b, tier, this.player.level, d0 / 16);
    if (this.worldEvent?.kind === 'bloodmoon') {
      def = { ...def, hp: Math.round(def.hp * 1.5), atk: Math.round(def.atk * 1.3) };
    }
    const e: EnemyInst = {
      uid: UID++, def, x, y, hp: def.hp, maxHp: def.hp,
      status: newStatus(), state: 'idle', stateT: this.rng.range(0, 1),
      vx: 0, vy: 0, frame: 0, animT: 0, homeX: x, homeY: y,
      telegraph: 0, targetX: x, targetY: y, flash: 0, kb: { x: 0, y: 0 }, summoned: false,
    };
    this.enemies.push(e);
    if (!this.bestiary[def.id]) { this.bestiary[def.id] = 1; this.collection.add(`enemy_${def.id}`); }
    return e;
  }
  spawnBoss(bossDef: BossDef, x: number, y: number) {
    const e = this.spawnEnemyAt('boss', x, y, 'champion');
    e.def = bossDef as EnemyDef;
    e.hp = bossDef.hp; e.maxHp = bossDef.hp;
    this.activeBoss = e as any;
    (this.activeBoss as any).bossDef = bossDef;
    (this.activeBoss as any).phase = 0;
    this.bossArena = { x, y, r: bossDef.arenaRadius * TILE };
    audio.play('boss');
    audio.sfx('roar');
    this.toast(bossDef.name, 'relic');
    this.vibrate(80);
  }
  updateEnemies(dt: number) {
    const p = this.player;
    const bloodMoon = this.worldEvent?.kind === 'bloodmoon';
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.state === 'dead') {
        e.stateT -= dt;
        if (e.stateT <= 0) this.enemies.splice(i, 1);
        continue;
      }
      // despawn far
      if (dist(e.x, e.y, p.x, p.y) > 400 && !(this.activeBoss === e)) { this.enemies.splice(i, 1); continue; }
      e.animT += dt;
      if (e.animT > 0.22) { e.animT = 0; e.frame++; }
      if (e.flash > 0) e.flash -= dt;
      // status effects
      if (e.status.burn > 0) { e.status.burn -= dt; e.hp -= 4 * dt; if (Math.random() < dt * 4) this.particles.spawn(e.x, e.y - 4, 0, -20, 0.4, '#ff6a2a', 1); }
      if (e.status.poison > 0) { e.status.poison -= dt; e.hp -= 2.5 * dt; if (e.hp < 1) e.hp = 1; }
      if (e.status.freeze > 0) e.status.freeze -= dt;
      if (e.status.shock > 0) e.status.shock -= dt;
      if (e.def.traits.includes('regenerating')) e.hp = Math.min(e.maxHp, e.hp + 2 * dt);
      if (e.hp <= 0) { this.killEnemy(e); continue; }
      // knockback decay
      e.x += e.kb.x * dt; e.y += e.kb.y * dt;
      e.kb.x *= 0.85; e.kb.y *= 0.85;
      const d = dist(e.x, e.y, p.x, p.y);
      const speedMul = (e.status.freeze > 0 ? 0.4 : 1) * (bloodMoon ? 1.2 : 1);
      const sp = e.def.speed * speedMul;
      e.stateT -= dt;
      const aggro = d < e.def.aggroRange && !p.dead;
      // boss phase check
      const bd = (e as any).bossDef as BossDef | undefined;
      if (bd) {
        const ph = bd.phases;
        const cur = (e as any).phase as number;
        const pct = e.hp / e.maxHp;
        let np = cur;
        for (let k = 0; k < ph.length; k++) if (pct <= ph[k].hpPct) np = k;
        if (np !== cur) {
          (e as any).phase = np;
          e.def = { ...e.def, move: ph[np].move, attack: ph[np].attack };
          this.toast(`${bd.name} shifts tactics!`, 'relic');
          this.shake = 8; audio.sfx('roar'); this.vibrate(60);
          this.particles.burst(e.x, e.y, 24, ELEMENT_COLORS[e.def.element], 70, 0.8);
        }
      }
      switch (e.state) {
        case 'idle': {
          if (e.def.move === 'patrol' || e.def.move === 'ambush') {
            if (e.stateT <= 0) { e.stateT = this.rng.range(1, 2.5); const a = this.rng.range(0, Math.PI * 2); e.targetX = e.homeX + Math.cos(a) * 30; e.targetY = e.homeY + Math.sin(a) * 30; }
            this.enemyMoveToward(e, e.targetX, e.targetY, sp * 0.4, dt);
          }
          if (aggro && e.def.move !== 'ambush') { e.state = 'chase'; }
          else if (aggro && d < 30) e.state = 'chase';
          break;
        }
        case 'chase': {
          if (!aggro && e.stateT < -4) { e.state = 'idle'; e.stateT = 1; break; }
          const style = e.def.move;
          if (style === 'hop') {
            if (e.stateT <= 0) { e.stateT = 0.7; const a = Math.atan2(p.y - e.y, p.x - e.x); e.vx = Math.cos(a) * sp * 3; e.vy = Math.sin(a) * sp * 3; }
            this.moveEntity(e, e.vx * dt, e.vy * dt); e.vx *= 0.9; e.vy *= 0.9;
          } else if (style === 'flank') {
            const ang = Math.atan2(p.y - e.y, p.x - e.x) + Math.sin(performance.now() / 700 + e.uid) * 1.2;
            this.enemyMoveToward(e, p.x - Math.cos(ang) * -20, p.y - Math.sin(ang) * -20, sp, dt);
          } else if (style === 'kite') {
            if (d < 55) { const a = Math.atan2(e.y - p.y, e.x - p.x); this.moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); }
            else this.enemyMoveToward(e, p.x, p.y, sp * 0.7, dt);
          } else if (style === 'teleport') {
            if (e.stateT <= 0) {
              e.stateT = this.rng.range(1.4, 2.6);
              this.particles.burst(e.x, e.y, 10, ELEMENT_COLORS[e.def.element], 40, 0.4);
              const a = this.rng.range(0, Math.PI * 2), rr = this.rng.range(30, 70);
              e.x = p.x + Math.cos(a) * rr; e.y = p.y + Math.sin(a) * rr;
              audio.sfx('teleport');
              this.particles.burst(e.x, e.y, 10, ELEMENT_COLORS[e.def.element], 40, 0.4);
            }
          } else if (style === 'orbit') {
            const a = Math.atan2(e.y - p.y, e.x - p.x) + dt * 1.4;
            const rr = 55;
            this.enemyMoveToward(e, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, sp, dt);
          } else if (style === 'burrow') {
            if (e.stateT <= 0) { e.stateT = this.rng.range(1, 2); e.summoned = !e.summoned; } // summoned flag doubles as "underground"
            if (!e.summoned) this.enemyMoveToward(e, p.x, p.y, sp * 1.4, dt);
          } else if (style === 'swarm') {
            const a = Math.atan2(p.y - e.y, p.x - e.x) + Math.sin(performance.now() / 300 + e.uid * 2) * 0.9;
            this.moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
          } else if (style === 'charge') {
            this.enemyMoveToward(e, p.x, p.y, sp * 0.6, dt);
          } else {
            this.enemyMoveToward(e, p.x, p.y, sp, dt);
          }
          // attack decision
          const inRange = d < e.def.attackRange;
          if (inRange && e.stateT <= 0 && e.telegraph <= 0) {
            e.telegraph = e.def.attack === 'slam' || e.def.attack === 'beam' ? 0.7 : 0.45;
            e.state = 'windup';
            e.stateT = e.telegraph;
          }
          break;
        }
        case 'windup': {
          e.targetX = p.x; e.targetY = p.y;
          if (e.stateT <= 0) { this.enemyAttack(e); e.state = 'recover'; e.stateT = e.def.attack === 'slam' ? 1.1 : 0.7; }
          break;
        }
        case 'recover': {
          if (e.stateT <= 0) { e.state = 'chase'; e.stateT = this.rng.range(0.2, 0.8); }
          break;
        }
      }
      // contact damage (light)
      if (d < 9 && e.telegraph <= 0 && !p.dead) {
        const res = computeDamage(Math.round(e.def.atk * 0.5), p.totalDef, e.def.element, 'none', 'none', 0, Math.random);
        this.damagePlayer(res.amount, e.def.element, e.x, e.y);
      }
    }
  }
  enemyMoveToward(e: EnemyInst, tx: number, ty: number, sp: number, dt: number) {
    const a = Math.atan2(ty - e.y, tx - e.x);
    this.moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
  }
  enemyAttack(e: EnemyInst) {
    const p = this.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const el = e.def.element;
    switch (e.def.attack) {
      case 'melee': case 'lunge': {
        if (e.def.attack === 'lunge') { e.kb.x = Math.cos(a) * e.def.speed * 4; e.kb.y = Math.sin(a) * e.def.speed * 4; }
        if (dist(e.x, e.y, p.x, p.y) < e.def.attackRange + 6 && inArc(e.x, e.y, a, p.x, p.y, e.def.attackRange + 8, 2.2)) {
          const res = computeDamage(e.def.atk, p.totalDef, el, 'none', 'none', 0, Math.random);
          this.damagePlayer(res.amount, el, e.x, e.y);
        }
        break;
      }
      case 'projectile': {
        this.projectiles.spawn({ x: e.x, y: e.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 2.5, dmg: e.def.atk, element: el, fromPlayer: false, kind: el === 'fire' ? 'ember' : el === 'ice' ? 'shard' : 'orb', radius: 4 });
        audio.sfx('bow');
        break;
      }
      case 'spread': {
        for (let k = -2; k <= 2; k++) {
          const a2 = a + k * 0.3;
          this.projectiles.spawn({ x: e.x, y: e.y, vx: Math.cos(a2) * 70, vy: Math.sin(a2) * 70, life: 2.2, dmg: e.def.atk, element: el, fromPlayer: false, kind: 'orb', radius: 4 });
        }
        audio.sfx('bow');
        break;
      }
      case 'homing': {
        this.projectiles.spawn({ x: e.x, y: e.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, life: 4, dmg: e.def.atk, element: el, fromPlayer: false, kind: 'homing', target: { x: p.x, y: p.y, id: 0 }, radius: 5 });
        audio.sfx('shock');
        break;
      }
      case 'slam': {
        this.shake = Math.max(this.shake, 6); audio.sfx('bosshit'); this.vibrate(40);
        this.particles.burst(e.x, e.y, 16, '#c8b89a', 60, 0.5);
        if (dist(e.x, e.y, p.x, p.y) < 40) {
          const res = computeDamage(Math.round(e.def.atk * 1.3), p.totalDef, el, 'none', 'none', 0, Math.random);
          this.damagePlayer(res.amount, el, e.x, e.y);
        }
        break;
      }
      case 'cloud': {
        for (let k = 0; k < 6; k++) this.particles.spawn(e.x + this.rng.range(-10, 10), e.y + this.rng.range(-10, 10), this.rng.range(-8, 8), this.rng.range(-8, 8), 1.6, '#7ad05a', 2);
        if (dist(e.x, e.y, p.x, p.y) < 34) { p.status.poison = 4; audio.sfx('poison'); }
        break;
      }
      case 'summon': {
        if (this.enemies.length < 20) {
          for (let k = 0; k < 2; k++) this.spawnEnemyNear(e.x + this.rng.range(-20, 20), e.y + this.rng.range(-20, 20), 'common');
          this.toast(`${e.def.name} calls for aid!`, 'sword');
        }
        break;
      }
      case 'beam': {
        // instant line damage
        const steps = 8;
        for (let s2 = 1; s2 <= steps; s2++) {
          const bx = e.x + Math.cos(a) * s2 * 12, by = e.y + Math.sin(a) * s2 * 12;
          this.particles.spawn(bx, by, 0, 0, 0.3, ELEMENT_COLORS[el] !== '#c8c8c8' ? ELEMENT_COLORS[el] : '#ff6a2a', 2);
          if (dist(bx, by, p.x, p.y) < 8) {
            const res = computeDamage(Math.round(e.def.atk * 1.2), p.totalDef, el, 'none', 'none', 0, Math.random);
            this.damagePlayer(res.amount, el, e.x, e.y);
          }
        }
        audio.sfx('shock');
        break;
      }
      case 'trap': {
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        if (!SOLID.has(this.chunks.getTile(tx, ty, this.layer))) {
          this.chunks.setTile(tx, ty, this.layer, T.TRAP);
        }
        break;
      }
    }
  }
  damagePlayer(amount: number, el: string, srcX: number, srcY: number) {
    const p = this.player;
    if (p.dead) return;
    if (this.meta.settings.mode === 'creative') return;
    if (this.meta.settings.mutators.includes('glass_jaw')) amount *= 2;
    if (this.meta.settings.mutators.includes('one_hit')) amount = 9999;
    // blocking reduces
    if (p.blocking) {
      const ang = Math.atan2(p.y - srcY, p.x - srcX);
      const facingAng = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
      let da = ang - facingAng;
      while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > Math.PI / 2) {
        amount = Math.max(0, Math.round(amount * 0.25));
        p.stamina -= 6; audio.sfx('hit');
        this.particles.sparks(p.x, p.y, 5, '#b8b8c0');
      }
    }
    if (amount <= 0) return;
    const died = p.damage(amount);
    const statusKey = elementOfStatus(el as any);
    if (statusKey && Math.random() < 0.4) (p.status as any)[statusKey] = 3;
    this.particles.damage(p.x, p.y - 8, amount, false, '#ff6a6a');
    this.shake = Math.max(this.shake, 4);
    this.vibrate(40);
    audio.sfx('hurt');
    this.particles.burst(p.x, p.y, 6, '#e83a4a', 40, 0.4);
    if (died) {
      audio.sfx('die');
      this.stats.deaths++;
      this.award('die1');
      if (this.stats.deaths >= 10) this.award('die10');
    }
  }
  hitEnemy(e: EnemyInst, baseDmg: number, el: Element, ang: number, kb: number) {
    const p = this.player;
    if (e.def.traits.includes('shielded') && Math.random() < 0.25) {
      this.particles.sparks(e.x, e.y, 5, '#b8b8c0'); audio.sfx('hit');
      return;
    }
    let dmg = baseDmg;
    if (e.def.traits.includes('armored')) dmg = Math.round(dmg * 0.7);
    if (e.def.traits.includes('reflective') && Math.random() < 0.2) {
      this.damagePlayer(Math.round(dmg * 0.3), 'none', e.x, e.y);
    }
    const res = computeDamage(dmg, e.def.def, el, e.def.weakness, e.def.element, p.totalLuck + (this.meta.settings.mutators.includes('lucky') ? 20 : 0), Math.random);
    e.hp -= res.amount;
    e.flash = 0.12;
    const kbm = 1 - e.def.knockResist;
    e.kb.x += Math.cos(ang) * kb * 8 * kbm; e.kb.y += Math.sin(ang) * kb * 8 * kbm;
    // status apply
    const sk = elementOfStatus(el);
    if (sk && Math.random() < 0.35) (e.status as any)[sk] = 3;
    this.particles.damage(e.x, e.y - e.def.genome.size, res.amount, res.crit);
    this.particles.sparks(e.x, e.y, res.crit ? 8 : 4, res.elementMul > 1 ? ELEMENT_COLORS[el] : '#ffd8a8');
    if (res.crit) { this.stats.crits++; if (this.stats.crits >= 10) this.award('crit10'); }
    audio.sfx(res.crit ? 'crit' : 'hit');
    if (e.def.traits.includes('vampiric')) e.hp = Math.min(e.maxHp, e.hp + res.amount * 0.2);
    this.bestiary[e.def.id] = (this.bestiary[e.def.id] || 0) + 1;
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e: EnemyInst) {
    if (e.state === 'dead') return;
    e.state = 'dead'; e.stateT = 0.4;
    const p = this.player;
    this.stats.kills++;
    this.award('kill1');
    if (this.stats.kills >= 10) this.award('kill10');
    if (this.stats.kills >= 50) this.award('kill50');
    if (this.stats.kills >= 100) this.award('kill100');
    if (this.stats.kills >= 500) this.award('kill500');
    if (e.def.tier === 'elite') { this.stats.elites++; this.award('elite1'); }
    if (e.def.tier === 'champion' && !(e as any).bossDef) { this.stats.champions++; this.award('champion1'); }
    if (e.def.traits.includes('explosive')) {
      this.particles.burst(e.x, e.y, 20, '#ff6a2a', 80, 0.6);
      audio.sfx('explosion');
      if (dist(e.x, e.y, p.x, p.y) < 30) this.damagePlayer(Math.round(e.def.atk * 0.8), 'fire', e.x, e.y);
    }
    if (e.def.traits.includes('splitting') && e.def.id === 'slime' && e.def.scale > 0.7) {
      for (let k = 0; k < 2; k++) {
        const child = this.spawnEnemyAt('slime', e.x + (k ? 8 : -8), e.y, 'common');
        child.def = { ...child.def, scale: e.def.scale * 0.65, hp: Math.round(e.maxHp * 0.3) };
        child.hp = child.def.hp; child.maxHp = child.def.hp;
      }
    }
    this.particles.burst(e.x, e.y, 14, e.def.genome.primary, 55, 0.6);
    audio.sfx('die');
    // drops
    const gold = this.rng.int(e.def.goldMin, e.def.goldMax);
    p.inv.gold += gold;
    if (gold > 0) { this.particles.damage(e.x, e.y - 10, gold, false, '#ffd23f'); audio.sfx('coin'); }
    for (const d of e.def.drops) {
      if (this.rng.chance(d.chance)) this.drops.push({ id: d.id, n: 1, x: e.x, y: e.y, t: 60 });
    }
    const loot = rollLoot(this.rng, Math.min(4, Math.floor(p.level / 4) + (e.def.tier === 'common' ? 0 : 1)), p.totalLuck);
    if (loot) this.drops.push({ ...loot, x: e.x + 4, y: e.y + 4, t: 60 });
    // xp
    if (p.gainXp(e.def.xp)) {
      audio.sfx('levelup');
      this.toast(`Level ${p.level}!`, 'amulet');
      this.particles.burst(p.x, p.y, 20, '#ffd23f', 50, 0.8);
      if (p.level >= 5) this.award('level5');
      if (p.level >= 10) this.award('level10');
      if (p.level >= 20) this.award('level20');
      if (p.level >= 30) this.award('level30');
      if (this.meta.settings.mode === 'hardcore' && p.level >= 10) this.award('hardcore1');
    }
    // quest progress
    for (const q of this.dailyQuests) if (q.kind === 'slay' && !q.done) { q.progress++; if (q.progress >= q.n) { q.done = true; p.inv.gold += q.reward.gold; this.toast(`Daily quest complete! +${q.reward.gold}g`, 'coin'); this.award('daily1'); } }
    // boss killed
    const bd = (e as any).bossDef as BossDef | undefined;
    if (bd) {
      this.activeBoss = null; this.bossArena = null;
      this.stats.bosses++;
      this.award('boss1');
      if (this.stats.bosses >= 5) this.award('boss5');
      this.drops.push({ id: bd.guaranteedDrop, n: 1, x: e.x, y: e.y, t: 120 });
      this.toast(`${bd.name} defeated!`, 'relic');
      audio.play('victory');
      setTimeout(() => audio.play(this.currentBiome().music), 4000);
      this.screenFlash = 0.6; this.flashColor = '#fff3c4';
      this.onBossDefeated(bd);
    }
    this.cb.onHudDirty();
  }
  onBossDefeated(bd: BossDef) {
    // story progression
    const act = this.story.act;
    if (act >= 1 && act <= 5 && bd.name.includes(['Bramblemaw', 'Scaldra', 'Ysilde', 'Vessalius', 'Fallen King'][act - 1].split(',')[0])) {
      this.story.act = act + 1;
      if (act === 5) {
        this.startCutscene('finale_choice');
        setTimeout(() => this.emit({ type: 'openScreen', screen: 'endingChoice' }), 1000);
      } else {
        this.award(`act${act}` as any);
        this.toast(`Act ${act} complete!`, 'relic');
        if (act === 1) this.startCutscene('act1_done');
        this.story.loreFound.push(`l${3 + act}`);
      }
      const relicId = `relic_${act - 1}`;
      this.player.inv.add(relicId);
      this.collection.add(relicId);
      this.award('relic1');
    }
  }
  projectileHit(pr: any): boolean {
    const p = this.player;
    // walls
    if (this.chunks.isSolid(Math.floor(pr.x / TILE), Math.floor(pr.y / TILE), this.layer)) {
      this.particles.sparks(pr.x, pr.y, 3, '#c8b89a');
      return true;
    }
    if (pr.fromPlayer) {
      for (const e of this.enemies) {
        if (e.state === 'dead') continue;
        if (dist(pr.x, pr.y, e.x, e.y) < pr.radius + e.def.genome.size * e.def.scale + 2) {
          this.hitEnemy(e, pr.dmg, pr.element, Math.atan2(pr.vy, pr.vx), 5);
          return true;
        }
      }
    } else {
      if (dist(pr.x, pr.y, p.x, p.y) < pr.radius + 5) {
        const res = computeDamage(pr.dmg, p.totalDef, pr.element, 'none', 'none', 0, Math.random);
        this.damagePlayer(res.amount, pr.element, pr.x, pr.y);
        return true;
      }
    }
    return false;
  }
  updateNpcs(dt: number) {
    const p = this.player;
    for (const npc of this.npcs) {
      if (dist(npc.x, npc.y, p.x, p.y) > 300) continue;
      npc.wanderT -= dt;
      if (npc.wanderT <= 0) {
        npc.wanderT = this.rng.range(2, 5);
        // routine: day wander, night go home
        if (this.timeOfDay > 0.72 || this.timeOfDay < 0.25) { npc.tx = npc.def.home.x; npc.ty = npc.def.home.y; }
        else { npc.tx = npc.def.home.x + this.rng.range(-40, 40); npc.ty = npc.def.home.y + this.rng.range(-40, 40); }
      }
      const d = dist(npc.x, npc.y, npc.tx, npc.ty);
      if (d > 6) {
        const a = Math.atan2(npc.ty - npc.y, npc.tx - npc.x);
        npc.x += Math.cos(a) * 14 * dt; npc.y += Math.sin(a) * 14 * dt;
        npc.frame++;
      }
    }
  }
  updateAmbients(dt: number) {
    const p = this.player;
    if (this.ambients.length < 8 && this.rng.chance(0.01)) {
      const b = this.currentBiome();
      const kinds = (Object.keys(AMBIENTS) as AmbientKind[]).filter(k => AMBIENTS[k].biome.includes(b.family) || AMBIENTS[k].biome.includes('temperate'));
      if (kinds.length) {
        const kind = this.rng.pick(kinds);
        const a = this.rng.range(0, Math.PI * 2);
        this.ambients.push({ kind, x: p.x + Math.cos(a) * this.rng.range(60, 140), y: p.y + Math.sin(a) * this.rng.range(60, 140), t: this.rng.range(0, 5), dir: this.rng.range(0, Math.PI * 2) });
      }
    }
    for (let i = this.ambients.length - 1; i >= 0; i--) {
      const a = this.ambients[i];
      if (dist(a.x, a.y, p.x, p.y) > 260) { this.ambients.splice(i, 1); continue; }
      a.t -= dt;
      if (a.t <= 0) { a.t = this.rng.range(1, 4); a.dir = this.rng.range(0, Math.PI * 2); }
      const def = AMBIENTS[a.kind];
      a.x += Math.cos(a.dir) * def.speed * dt;
      a.y += Math.sin(a.dir) * def.speed * dt;
    }
  }
  updateDrops(dt: number) {
    const p = this.player;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.t -= dt;
      if (d.t <= 0) { this.drops.splice(i, 1); continue; }
      if (dist(d.x, d.y, p.x, p.y) < 12) {
        const def = ITEMS[d.id];
        if (def) {
          const rem = p.inv.add(d.id, d.n);
          if (rem < d.n) {
            audio.sfx('pickup');
            this.toast(`+${d.n - rem} ${def.name}`, def.kind);
            this.collection.add(`item_${d.id}`);
            if (def.rarity === 'legendary') this.award('legendary1');
            this.checkCollectionAchievements();
          }
          if (rem === 0) this.drops.splice(i, 1); else d.n = rem;
        } else this.drops.splice(i, 1);
      }
    }
  }
  checkCollectionAchievements() {
    const n = this.collection.size;
    if (n >= 25) this.award('collect25');
    if (n >= 50) this.award('collect50');
    if (n >= 100) this.award('collect100');
  }
  // ---------- interaction ----------
  interactableNear(): { tx: number; ty: number; t: number } | null {
    const p = this.player;
    const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
    const checks = [
      [Math.floor(p.x / TILE), Math.floor(p.y / TILE)],
      [Math.floor((p.x + Math.cos(ang) * 14) / TILE), Math.floor((p.y + Math.sin(ang) * 14) / TILE)],
      [Math.floor((p.x + 10) / TILE), Math.floor(p.y / TILE)],
      [Math.floor((p.x - 10) / TILE), Math.floor(p.y / TILE)],
      [Math.floor(p.x / TILE), Math.floor((p.y + 10) / TILE)],
      [Math.floor(p.x / TILE), Math.floor((p.y - 10) / TILE)],
    ];
    const INTER = new Set<number>([T.CHEST, T.SHRINE, T.BED, T.BENCH, T.ANVIL, T.STAIRS_DOWN, T.STAIRS_UP, T.PORTAL, T.WELL, T.SIGN, T.DOOR, T.SWITCH, T.FARM, T.TILLED, T.CROP, T.KEY_PEDESTAL, T.CRACKED]);
    for (const [tx, ty] of checks) {
      const t = this.chunks.getTile(tx, ty, this.layer);
      if (INTER.has(t)) return { tx, ty, t };
    }
    return null;
  }
  interact() {
    const p = this.player;
    // NPCs first
    for (const npc of this.npcs) {
      if (dist(npc.x, npc.y, p.x, p.y) < 16) { this.talkToNpc(npc); return; }
    }
    // caravan merchant
    if (this.merchantCaravan && dist(this.merchantCaravan.x, this.merchantCaravan.y, p.x, p.y) < 20) {
      audio.sfx('ui');
      this.emit({ type: 'openScreen', screen: 'shop', data: { merchant: 'caravan' } });
      this.award('caravan');
      return;
    }
    const it = this.interactableNear();
    if (!it) return;
    const { tx, ty, t } = it;
    const key = `${this.layer}_${tx}_${ty}`;
    switch (t) {
      case T.CHEST: {
        if (this.chestsOpened.has(key)) { this.toast('Empty.'); return; }
        this.chestsOpened.add(key);
        audio.sfx('chest');
        this.stats.chests++;
        this.award('chest10'); // awarded by count below
        const gold = this.rng.int(5, 25);
        p.inv.gold += gold;
        const loot = rollLoot(this.rng, Math.min(4, Math.floor(p.level / 3) + this.layer), p.totalLuck);
        this.toast(`Found ${gold} gold!`, 'coin');
        if (loot) {
          const rem = p.inv.add(loot.id, loot.n);
          if (rem === 0) this.toast(`Found ${ITEMS[loot.id].name}!`, ITEMS[loot.id].kind);
          else this.drops.push({ ...loot, x: tx * TILE + 8, y: ty * TILE + 8, t: 60 });
          this.collection.add(`item_${loot.id}`);
        }
        if (this.rng.chance(0.15)) {
          const lore = `l${this.rng.int(1, 32)}`;
          if (!this.story.loreFound.includes(lore)) { this.story.loreFound.push(lore); this.toast('Found a lore page! Check Journal.', 'scroll'); audio.sfx('secret'); }
        }
        if (this.stats.chests >= 10) this.award('chest10');
        if (this.stats.chests >= 50) this.award('chest50');
        break;
      }
      case T.SHRINE: {
        if (!this.shrinesFound.some(s => Math.abs(s.x - tx) < 2 && Math.abs(s.y - ty) < 2)) {
          this.shrinesFound.push({ x: tx, y: ty });
          this.award('shrine1');
          if (this.shrinesFound.length >= 5) this.award('shrine5');
          audio.sfx('shrine');
          this.toast('Shrine activated. Fast travel unlocked.', 'shrine');
          p.heal(p.totalMaxHp);
          this.particles.burst(tx * TILE + 8, ty * TILE + 8, 20, '#ffb43f', 40, 0.8);
        } else {
          this.emit({ type: 'openScreen', screen: 'fasttravel' });
        }
        break;
      }
      case T.BED: {
        this.player.x = p.x; // set respawn
        this.respawn = { x: tx * TILE + 8, y: ty * TILE + 16, layer: this.layer };
        audio.sfx('sleep');
        this.toast('Respawn set. You rest...', 'house');
        this.sleepBlack = 1.5;
        p.heal(p.totalMaxHp);
        p.stamina = p.maxStamina;
        if (this.timeOfDay > 0.72 || this.timeOfDay < 0.25) { this.timeOfDay = 0.28; this.dayCount++; this.onNewDay(); }
        break;
      }
      case T.BENCH: this.emit({ type: 'openScreen', screen: 'craft', data: { bench: 'bench' } }); audio.sfx('ui'); break;
      case T.ANVIL: this.emit({ type: 'openScreen', screen: 'craft', data: { bench: 'anvil' } }); audio.sfx('ui'); break;
      case T.WELL: {
        p.heal(10); audio.sfx('splash'); this.toast('Refreshing! +10 HP');
        break;
      }
      case T.STAIRS_DOWN: {
        if (this.layer < 3) {
          this.layer++;
          this.movePlayerToLayerEntry();
          audio.sfx('door');
          this.toast(this.layer === 1 ? 'The Caves' : this.layer === 2 ? 'Deep Mines' : 'The Ember Realm', 'pick');
          if (this.layer === 1) this.award('cave1');
          if (this.layer === 2) this.award('mine1');
          if (this.layer === 3) { this.award('ember_realm'); }
          this.spawnedChunks.clear();
          this.enemies = [];
          this.chunks.ensureRadius(p.x / TILE, p.y / TILE, this.layer, 70);
        }
        break;
      }
      case T.STAIRS_UP: {
        if (this.layer > 0) {
          this.layer--;
          this.movePlayerToLayerEntry();
          audio.sfx('door');
          this.spawnedChunks.clear();
          this.enemies = [];
        }
        break;
      }
      case T.PORTAL: {
        audio.sfx('portal');
        this.toast('The portal hums with ember-light...', 'relic');
        this.layer = 3;
        this.movePlayerToLayerEntry();
        this.spawnedChunks.clear(); this.enemies = [];
        break;
      }
      case T.SIGN: this.toast('“Beware the Blight. Keep your hearth lit.”', 'sign'); break;
      case T.DOOR: {
        if (p.inv.count('key_iron') > 0) {
          p.inv.remove('key_iron', 1);
          this.chunks.setTile(tx, ty, this.layer, T.DUNGEON_FLOOR);
          audio.sfx('door'); this.toast('Unlocked!', 'key');
        } else this.toast('Locked. Need an Iron Key.', 'key');
        break;
      }
      case T.SWITCH: {
        if (!this.switchesHit.has(key)) {
          this.switchesHit.add(key);
          audio.sfx('switch');
          this.toast('Something rumbles nearby...', 'key');
          // open nearby gates
          for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const t2 = this.chunks.getTile(tx + dx, ty + dy, this.layer);
            if (t2 === T.GATE) this.chunks.setTile(tx + dx, ty + dy, this.layer, T.DUNGEON_FLOOR);
          }
        }
        break;
      }
      case T.CRACKED: {
        if (p.inv.count('bomb') > 0) { this.toast('Place the bomb with X to crack this wall.', 'bomb'); }
        else this.toast('Cracked. A bomb could break it.', 'bomb');
        break;
      }
      case T.FARM: case T.TILLED: {
        if (p.inv.count('seed_wheat') > 0 || p.inv.count('seed_ember') > 0) {
          const seed = p.inv.count('seed_ember') > 0 ? 'seed_ember' : 'seed_wheat';
          p.inv.remove(seed, 1);
          this.chunks.setTile(tx, ty, this.layer, T.CROP);
          audio.sfx('place');
          this.toast('Planted!', 'seed');
        } else this.toast('You need seeds.', 'seed');
        break;
      }
      case T.CROP: this.breakTile(tx, ty, T.CROP); break;
      case T.KEY_PEDESTAL: {
        p.inv.add('key_iron');
        this.chunks.setTile(tx, ty, this.layer, T.DUNGEON_FLOOR);
        audio.sfx('pickup'); this.toast('Got an Iron Key!', 'key');
        break;
      }
    }
  }
  respawn: { x: number; y: number; layer: number } | null = null;
  movePlayerToLayerEntry() {
    // find a walkable tile near same position
    const p = this.player;
    for (let r = 0; r < 20; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const tx = Math.floor(p.x / TILE) + dx, ty = Math.floor(p.y / TILE) + dy;
        if (!SOLID.has(this.chunks.getTile(tx, ty, this.layer))) {
          p.x = tx * TILE + 8; p.y = ty * TILE + 8;
          return;
        }
      }
    }
  }
  talkToNpc(npc: NpcInst) {
    const p = this.player;
    audio.sfx('talk');
    const role = npc.def.role;
    if (role === 'merchant') { this.emit({ type: 'openScreen', screen: 'shop', data: { merchant: npc.def.id } }); return; }
    if (role === 'innkeeper') { this.emit({ type: 'openScreen', screen: 'inn' }); return; }
    if (role === 'blacksmith') { this.emit({ type: 'openScreen', screen: 'craft', data: { bench: 'anvil' } }); return; }
    if (role === 'elder' && this.story.act === 0) {
      this.queueDialogue([
        { speaker: npc.def.name, text: 'So Cinder chose you, wanderer. The Ember Heart is shattered — five embers scattered to the far corners of the world.', color: '#8af0a8' },
        { speaker: npc.def.name, text: 'Reclaim them. Face each guardian. And when you stand before the Fallen King... choose wisely.', color: '#8af0a8' },
        { speaker: 'Cinder', text: 'You heard the Elder! First ember\'s in the root-vaults. Let\'s move!', color: '#ff9a3a' },
      ]);
      this.story.act = 1;
      this.story.flags.prologue_done = true;
      this.award('prologue');
      return;
    }
    const line = npcDialogue(npc.def, {
      act: this.story.act, timeOfDay: this.timeOfDay,
      reputation: this.story.reputation, questFlags: this.story.flags, rng: this.rng,
    });
    this.queueDialogue([{ speaker: npc.def.name, text: line, color: '#e8e0d0' }]);
    // friendship
    const f = (this.npcFriends[npc.def.id] || 0);
    this.npcFriends[npc.def.id] = Math.min(100, f + 1);
    if (f + 1 >= 10) this.award('friend1');
    if (f + 1 >= 100) this.award('friend5');
  }
  queueDialogue(lines: { speaker: string; text: string; color?: string }[]) {
    this.dialogQueue = lines;
    this.emitNextDialogue();
  }
  emitNextDialogue() {
    const next = this.dialogQueue.shift();
    if (next) this.emit({ type: 'dialogue', ...next });
    else this.emit({ type: 'dialogueEnd' });
  }
  useQuickItem() {
    const p = this.player;
    const qs = p.inv.quick[0] ? 0 : -1;
    // cycle: use first non-null quick slot, or use X to place block from first quick slot
    let idx = -1;
    for (let i = 0; i < 4; i++) if (p.inv.quick[i]) { idx = i; break; }
    if (idx < 0) { this.toast('Quick slots empty. Assign items in Inventory.'); return; }
    const s = p.inv.quick[idx]!;
    const def = ITEMS[s.id];
    if (!def) return;
    this.useItem(s.id, 'quick', idx);
  }
  useItem(id: string, from: 'quick' | 'slots', idx: number) {
    const p = this.player;
    const def = ITEMS[id];
    if (!def) return;
    const consume = () => {
      const arr = from === 'quick' ? p.inv.quick : p.inv.slots;
      const s = arr[idx]; if (!s) return;
      s.n--; if (s.n <= 0) arr[idx] = null;
    };
    switch (def.kind) {
      case 'potion': {
        if (def.heal) { p.heal(def.heal); this.particles.heal(p.x, p.y - 8, def.heal); audio.sfx('heal'); }
        if (id === 'potion_antidote') { p.status.poison = 0; this.toast('Poison cured.'); }
        if (id === 'potion_stamina_tonic') { p.stamina = p.maxStamina; this.toast('Stamina restored!'); }
        consume(); audio.sfx('potion');
        this.cb.onHudDirty();
        break;
      }
      case 'food': {
        p.heal(def.heal || 5);
        this.particles.heal(p.x, p.y - 8, def.heal || 5);
        audio.sfx('eat'); consume();
        this.cb.onHudDirty();
        break;
      }
      case 'bomb': {
        consume();
        audio.sfx('bomb');
        this.shake = 8; this.vibrate(60);
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
        this.particles.burst(p.x, p.y + 14, 24, '#ff6a2a', 90, 0.8);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const t = this.chunks.getTile(tx + dx, ty + dy, this.layer);
          if (t === T.CRACKED || t === T.ROCK) this.breakTile(tx + dx, ty + dy, t);
        }
        for (const e of this.enemies) if (dist(e.x, e.y, p.x, p.y + 14) < 40) this.hitEnemy(e, 25 + p.level * 2, 'fire', 0, 12);
        break;
      }
      case 'scroll': {
        consume();
        const el = def.element || 'fire';
        if (id === 'scroll_holy') {
          // return to spawn
          p.x = 16 * TILE; p.y = 17 * TILE; this.layer = 0;
          this.toast('Returned to Hearthlight.', 'scroll');
          audio.sfx('teleport');
        } else {
          const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
          this.projectiles.spawn({ x: p.x, y: p.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 1.5, dmg: def.effectPower || 20, element: el as any, fromPlayer: true, kind: el === 'fire' ? 'ember' : 'orb', radius: 6 });
          audio.sfx(el === 'fire' ? 'fire' : el === 'ice' ? 'ice' : 'shock');
        }
        break;
      }
      case 'fish': case 'food_item': {
        p.heal(def.heal || 5); consume(); audio.sfx('eat');
        this.cb.onHudDirty();
        break;
      }
      case 'block': {
        // place block in front
        const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
        const tx = Math.floor((p.x + Math.cos(ang) * 18) / TILE);
        const ty = Math.floor((p.y + Math.sin(ang) * 18) / TILE);
        const t = this.chunks.getTile(tx, ty, this.layer);
        if (!SOLID.has(t) && !LIQUID_TILES.has(t) && dist(tx * TILE + 8, ty * TILE + 8, p.x, p.y) > 8) {
          this.chunks.setTile(tx, ty, this.layer, def.placeTile ?? T.PLACED);
          consume(); audio.sfx('place');
        } else this.toast('Can\'t place here.');
        break;
      }
      default:
        this.toast(`${def.name} can't be used right now.`);
    }
  }
  // ---------- cutscenes ----------
  startCutscene(id: string) {
    const cs = CUTSCENES[id];
    if (!cs) return;
    this.inCutscene = cs.lines.map((l: any) => `${l.speaker}|||${l.color || '#e8e0d0'}|||${l.text}`);
    this.cutsceneIdx = 0; this.cutsceneChar = 0; this.cutsceneTimer = 0;
    audio.play('cutscene');
  }
  updateCutscene(dt: number) {
    if (!this.inCutscene) return;
    this.cutsceneTimer += dt;
    const line = this.inCutscene[this.cutsceneIdx];
    const text = line.split('|||')[2];
    if (this.cutsceneChar < text.length) {
      this.cutsceneChar = Math.min(text.length, this.cutsceneChar + dt * 40);
      if (Math.floor(this.cutsceneChar) % 3 === 0 && Math.random() < 0.3) audio.sfx('talk');
      if (this.input.aP || this.input.yP) this.cutsceneChar = text.length;
    } else if (this.input.aP || this.input.yP) {
      this.cutsceneIdx++;
      this.cutsceneChar = 0;
      if (this.cutsceneIdx >= this.inCutscene.length) {
        this.inCutscene = null;
        audio.play(this.currentBiome().music);
      }
    }
  }
  // ---------- death/respawn ----------
  onPlayerDeath() {
    const p = this.player;
    if (this.meta.settings.mode === 'hardcore') {
      this.meta.dead = true;
      this.emit({ type: 'gameOver', hardcore: true });
      this.saveNow();
      return;
    }
    const lost = Math.floor(p.inv.gold * 0.2);
    p.inv.gold -= lost;
    p.dead = false;
    p.hp = p.totalMaxHp; p.stamina = p.maxStamina;
    p.status = newStatus();
    if (this.respawn) {
      p.x = this.respawn.x; p.y = this.respawn.y; this.layer = this.respawn.layer;
    } else { p.x = 16 * TILE; p.y = 17 * TILE; this.layer = 0; }
    this.spawnedChunks.clear();
    this.enemies = [];
    this.projectiles.list = [];
    this.toast(lost > 0 ? `You wake up... (-${lost} gold)` : 'You wake up...', 'house');
    this.emit({ type: 'gameOver', hardcore: false });
  }
  // ---------- render ----------
  render() {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    const p = this.player;
    const shx = this.shake > 0 ? this.rng.range(-this.shake, this.shake) : 0;
    const shy = this.shake > 0 ? this.rng.range(-this.shake, this.shake) : 0;
    const ox = Math.round(this.cam.x + shx), oy = Math.round(this.cam.y + shy);
    // background
    const b = this.layer === 0 ? this.currentBiome() : this.layer === 1 ? BIOMES.crystal : this.layer === 2 ? BIOMES.volcanic : BIOMES.blightlands;
    g.fillStyle = this.layer === 0 ? shade(b.ground, -35) : '#14121c';
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // chunks
    const c0x = Math.floor((ox) / (CHUNK * TILE)), c0y = Math.floor((oy) / (CHUNK * TILE));
    for (let cy = c0y - 1; cy <= c0y + 1; cy++) for (let cx = c0x - 1; cx <= c0x + 1; cx++) {
      const cv = this.chunks.getCanvas(cx, cy, this.layer);
      if (cv) g.drawImage(cv, cx * CHUNK * TILE - ox, cy * CHUNK * TILE - oy);
    }
    // drops
    for (const d of this.drops) {
      const def = ITEMS[d.id];
      if (!def) continue;
      const bob = Math.sin(performance.now() / 300 + d.x) * 1.5;
      g.drawImage(getIcon(def), Math.round(d.x - ox - 8), Math.round(d.y - oy - 8 + bob), 8, 8);
    }
    // ambients
    for (const a of this.ambients) this.drawAmbient(g, a, ox, oy);
    // npcs
    for (const npc of this.npcs) {
      if (Math.abs(npc.x - p.x) > VIEW_W || Math.abs(npc.y - p.y) > VIEW_H) continue;
      this.drawNpc(g, npc, ox, oy);
    }
    // caravan merchant
    if (this.merchantCaravan) {
      const m = this.merchantCaravan;
      g.fillStyle = '#8a5a2a'; g.fillRect(Math.round(m.x - ox - 8), Math.round(m.y - oy - 6), 16, 10);
      g.fillStyle = '#d9a85a'; g.fillRect(Math.round(m.x - ox - 6), Math.round(m.y - oy - 10), 12, 5);
      g.fillStyle = '#e8b890'; g.fillRect(Math.round(m.x - ox - 2), Math.round(m.y - oy - 14), 5, 5);
    }
    // enemies
    for (const e of this.enemies) {
      const sx = Math.round(e.x - ox - 8 * e.def.scale), sy = Math.round(e.y - oy - 8 * e.def.scale);
      const spr = genomeSprite(e.def.genome, e.state === 'dead' ? 2 : e.frame);
      const sz = Math.round(16 * e.def.scale);
      if (e.flash > 0) {
        g.globalAlpha = 0.85;
        g.drawImage(spr, sx, sy, sz, sz);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.5;
        g.drawImage(spr, sx, sy, sz, sz);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
      } else {
        g.drawImage(spr, sx, sy, sz, sz);
      }
      // telegraph
      if (e.state === 'windup') {
        g.strokeStyle = 'rgba(255,60,40,0.8)';
        g.lineWidth = 1;
        const rr = (e.def.attackRange + 6);
        g.strokeRect(Math.round(e.x - ox - rr / 2), Math.round(e.y - oy - rr / 2), rr, rr);
        g.fillStyle = '#ff3c28';
        g.fillRect(Math.round(e.x - ox - 3), Math.round(e.y - oy - 18 * e.def.scale), 6, 4);
      }
      // hp bar
      if (e.hp < e.maxHp && e.state !== 'dead') {
        const w = 14;
        g.fillStyle = '#1a1a22'; g.fillRect(Math.round(e.x - ox - w / 2), Math.round(e.y - oy - 14 * e.def.scale), w, 2);
        g.fillStyle = e.def.tier === 'common' ? '#e83a4a' : e.def.tier === 'elite' ? '#f0a83f' : '#b05ae8';
        g.fillRect(Math.round(e.x - ox - w / 2), Math.round(e.y - oy - 14 * e.def.scale), Math.max(1, Math.round(w * e.hp / e.maxHp)), 2);
      }
      // element tint sparkle
      if (e.def.element !== 'none' && Math.random() < 0.05) {
        this.particles.spawn(e.x + this.rng.range(-5, 5), e.y + this.rng.range(-5, 5), 0, -8, 0.4, ELEMENT_COLORS[e.def.element], 1);
      }
    }
    // pets
    for (const pet of this.pets) {
      g.fillStyle = pet.kind === 'wolf' ? '#7a7a85' : pet.kind === 'cat' ? '#5a5a66' : pet.kind === 'slime' ? '#5ac84a' : '#4a8ac8';
      g.fillRect(Math.round(pet.x - ox - 3), Math.round(pet.y - oy - 3), 6, 6);
      g.fillStyle = '#ffd23f'; g.fillRect(Math.round(pet.x - ox - 1), Math.round(pet.y - oy - 2), 1, 1); g.fillRect(Math.round(pet.x - ox + 1), Math.round(pet.y - oy - 2), 1, 1);
    }
    // companion
    if (this.companion) {
      g.fillStyle = '#4a8ac8'; g.fillRect(Math.round(this.companion.x - ox - 4), Math.round(this.companion.y - oy - 6), 8, 12);
    }
    // player
    this.drawPlayer(g, ox, oy);
    // cinder
    const cspr = cinderSprite(this.cinder.frame, p.cinderTint);
    g.drawImage(cspr, Math.round(this.cinder.x - ox - 4), Math.round(this.cinder.y - oy - 4));
    // projectiles
    this.projectiles.draw(g, ox, oy);
    // particles
    this.particles.draw(g, ox, oy);
    // weather
    this.drawWeather(g, ox, oy);
    // lighting / night (skipped on low quality)
    if (this.quality !== 'low') this.drawLighting(g, ox, oy);
    // minimap
    this.drawMinimap(g);
    // boss bar
    if (this.activeBoss) this.drawBossBar(g);
    // screen flash
    if (this.screenFlash > 0) {
      g.globalAlpha = Math.min(1, this.screenFlash * 2);
      g.fillStyle = this.flashColor;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.globalAlpha = 1;
    }
    // sleep fade
    if (this.sleepBlack > 0) {
      this.sleepBlack -= 1 / 60;
      g.globalAlpha = clamp(this.sleepBlack, 0, 1);
      g.fillStyle = '#000'; g.fillRect(0, 0, VIEW_W, VIEW_H);
      g.globalAlpha = 1;
    }
    // cutscene letterbox + text
    if (this.inCutscene) this.drawCutscene(g);
    // region name popup (bottom of canvas)
    this.drawRegionName(g);
  }
  regionToast = { name: '', t: 0 };
  lastRegion = '';
  drawRegionName(g: CanvasRenderingContext2D) {
    const pcx = Math.floor(this.player.x / TILE / CHUNK), pcy = Math.floor(this.player.y / TILE / CHUNK);
    const chunk = this.chunks.getChunk(pcx, pcy, this.layer);
    if (chunk && chunk.regionName !== this.lastRegion) {
      this.lastRegion = chunk.regionName;
      this.regionToast = { name: chunk.regionName, t: 3 };
    }
    if (this.regionToast.t > 0) {
      this.regionToast.t -= 1 / 60;
      g.globalAlpha = Math.min(1, this.regionToast.t);
      g.fillStyle = 'rgba(10,8,16,0.7)';
      g.fillRect(0, 210, VIEW_W, 14);
      g.font = '7px monospace'; g.fillStyle = '#e8dcc0'; g.textAlign = 'center';
      g.fillText(this.regionToast.name, VIEW_W / 2, 220);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
  }
  drawPlayer(g: CanvasRenderingContext2D, ox: number, oy: number) {
    const p = this.player;
    if (p.dead) return;
    const frame = p.moving ? Math.floor(performance.now() / 150) % 4 : 0;
    const spr = playerSprite(p.facing, frame, { skin: p.skin, tunic: p.tunic, hair: p.hair, hat: p.hat, swordTrail: p.swordTrail });
    const sx = Math.round(p.x - ox - 8), sy = Math.round(p.y - oy - 8);
    if (p.iframes > 0 && Math.floor(performance.now() / 80) % 2 === 0) g.globalAlpha = 0.4;
    if (p.rollTimer > 0) {
      g.save();
      g.translate(sx + 8, sy + 8);
      g.rotate((0.34 - p.rollTimer) / 0.34 * Math.PI * 2 * (p.rollDx < 0 ? -1 : 1));
      g.drawImage(spr, -8, -8);
      g.restore();
    } else {
      g.drawImage(spr, sx, sy);
    }
    g.globalAlpha = 1;
    // sword swing arc
    if (p.attackTimer > 0) {
      const stage = p.attackStage;
      const total = stage === 3 ? 0.42 : 0.28;
      const t = 1 - p.attackTimer / total;
      const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
      const sweep = stage === 3 ? 2.4 : 1.6;
      const a0 = ang - sweep / 2 + t * sweep * (stage === 2 ? -1 : 1);
      const el = p.weaponElement;
      const col = p.swordTrail || (el !== 'none' ? ELEMENT_COLORS[el] : '#e8e8f0');
      g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(p.x - ox, p.y - oy, 12 + t * (stage === 3 ? 8 : 5), a0 - 0.4, a0 + 0.4);
      g.stroke();
      g.globalAlpha = 1; g.lineWidth = 1;
      // weapon blade
      const wx = p.x - ox + Math.cos(a0) * 14, wy = p.y - oy + Math.sin(a0) * 14;
      g.fillStyle = col; g.fillRect(Math.round(wx) - 1, Math.round(wy) - 3, 2, 6);
    }
    // blocking shield
    if (p.blocking) {
      g.fillStyle = '#8a6a3f';
      const ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][p.facing];
      g.fillRect(Math.round(p.x - ox + Math.cos(ang) * 8) - 3, Math.round(p.y - oy + Math.sin(ang) * 8) - 3, 6, 6);
    }
    // bow charge indicator
    if (p.bowCharge > 0) {
      g.fillStyle = '#1a1a22'; g.fillRect(Math.round(p.x - ox - 8), Math.round(p.y - oy - 14), 16, 3);
      g.fillStyle = '#5ad05a'; g.fillRect(Math.round(p.x - ox - 8), Math.round(p.y - oy - 14), Math.round(16 * Math.min(1, p.bowCharge)), 3);
    }
  }
  drawAmbient(g: CanvasRenderingContext2D, a: AmbientInst, ox: number, oy: number) {
    const def = AMBIENTS[a.kind];
    const sx = Math.round(a.x - ox), sy = Math.round(a.y - oy);
    g.fillStyle = def.color;
    switch (a.kind) {
      case 'chicken': g.fillRect(sx - 2, sy - 2, 4, 4); g.fillStyle = '#e83a3a'; g.fillRect(sx - 1, sy - 4, 2, 2); break;
      case 'cow': g.fillRect(sx - 4, sy - 3, 8, 6); g.fillStyle = '#e8e2d2'; g.fillRect(sx - 4, sy - 3, 3, 3); break;
      case 'dog': g.fillRect(sx - 3, sy - 2, 6, 4); g.fillRect(sx + 2, sy - 4, 3, 3); break;
      case 'cat': g.fillRect(sx - 3, sy - 2, 6, 4); g.fillRect(sx - 2, sy - 4, 1, 2); g.fillRect(sx + 1, sy - 4, 1, 2); break;
      case 'bird': g.fillRect(sx - 2, sy - 1, 4, 2); g.fillRect(sx - 3, sy - 3 + (Math.floor(performance.now() / 150) % 2), 2, 1); g.fillRect(sx + 1, sy - 3 + (Math.floor(performance.now() / 150) % 2), 2, 1); break;
      case 'fish': g.fillRect(sx - 2, sy - 1, 4, 2); break;
      case 'butterfly': g.fillRect(sx - 1, sy - 1, 2, 2); g.fillStyle = '#fff'; g.fillRect(sx - 2, sy - 2 + (Math.floor(performance.now() / 120) % 2), 1, 2); g.fillRect(sx + 1, sy - 2 + (Math.floor(performance.now() / 120) % 2), 1, 2); break;
      case 'firefly': if (Math.floor(performance.now() / 400 + a.x) % 2) { g.fillStyle = '#e8f07a'; g.fillRect(sx, sy, 1, 1); } break;
    }
  }
  drawNpc(g: CanvasRenderingContext2D, npc: NpcInst, ox: number, oy: number) {
    const sx = Math.round(npc.x - ox - 5), sy = Math.round(npc.y - oy - 7);
    const roleColors: Record<string, string> = { elder: '#8a6a4a', merchant: '#c8a83f', innkeeper: '#a85a6a', blacksmith: '#5a5a66', farmer: '#6a8a3f', child: '#e8a85a', guard: '#7a7a92', monk: '#8a7ac8', traveler: '#6a8a8a' };
    const col = roleColors[npc.def.role] || '#8a7a6a';
    const walk = Math.floor(npc.frame / 8) % 2;
    g.fillStyle = col; g.fillRect(sx + 1, sy + 4, 8, 8);
    g.fillStyle = '#e8b890'; g.fillRect(sx + 2, sy, 6, 5);
    g.fillStyle = '#3a2a1a'; g.fillRect(sx + 2, sy, 6, 2);
    g.fillStyle = '#2a2018'; g.fillRect(sx + 3, sy + 2, 1, 1); g.fillRect(sx + 6, sy + 2, 1, 1);
    g.fillStyle = '#3a2f28'; g.fillRect(sx + 2, sy + 12, 2, 2 + walk); g.fillRect(sx + 6, sy + 12, 2, 2 + (1 - walk));
    // interact indicator
    if (dist(npc.x, npc.y, this.player.x, this.player.y) < 16) {
      g.fillStyle = '#ffd23f';
      g.font = '7px monospace';
      g.fillText('Y', sx + 3, sy - 3);
    }
  }
  drawWeather(g: CanvasRenderingContext2D, ox: number, oy: number) {
    const w = this.weather.kind;
    const t = performance.now() / 1000;
    if (w === 'rain' || w === 'storm') {
      g.strokeStyle = 'rgba(140,180,230,0.5)';
      g.beginPath();
      for (let i = 0; i < (this.quality === 'low' ? 16 : 40); i++) {
        const x = (hash2(i, 0, 5) * VIEW_W + t * 130) % VIEW_W;
        const y = (hash2(i, 1, 5) * VIEW_H + t * 260) % VIEW_H;
        g.moveTo(x, y); g.lineTo(x - 1.5, y + 5);
      }
      g.stroke();
      if (w === 'storm' && Math.random() < 0.003) { audio.sfx('thunder'); this.screenFlash = 0.25; this.flashColor = '#e8f0ff'; }
    } else if (w === 'snow') {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < (this.quality === 'low' ? 12 : 30); i++) {
        const x = (hash2(i, 2, 6) * VIEW_W + Math.sin(t + i) * 8) % VIEW_W;
        const y = (hash2(i, 3, 6) * VIEW_H + t * 22) % VIEW_H;
        g.fillRect(x, y, 1, 1);
      }
    } else if (w === 'sand' || w === 'ash') {
      g.fillStyle = w === 'sand' ? 'rgba(220,190,120,0.35)' : 'rgba(120,110,105,0.35)';
      for (let i = 0; i < 25; i++) {
        const x = (hash2(i, 4, 7) * VIEW_W + t * 60) % VIEW_W;
        const y = (hash2(i, 5, 7) * VIEW_H + Math.sin(t * 2 + i) * 5 + VIEW_H) % VIEW_H;
        g.fillRect(x, y, 2, 1);
      }
    } else if (w === 'blight') {
      g.fillStyle = 'rgba(150,60,170,0.25)';
      for (let i = 0; i < 20; i++) {
        const x = (hash2(i, 6, 8) * VIEW_W + Math.sin(t * 0.7 + i) * 12 + VIEW_W) % VIEW_W;
        const y = (hash2(i, 7, 8) * VIEW_H + t * 10) % VIEW_H;
        g.fillRect(x, y, 1, 2);
      }
    }
    if (this.worldEvent?.kind === 'meteor') {
      if (Math.random() < 0.06) {
        const x = Math.random() * VIEW_W;
        g.strokeStyle = '#ffd8a8'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 30, 45); g.stroke();
      }
    }
    if (this.worldEvent?.kind === 'aurora') {
      g.globalAlpha = 0.18;
      for (let b2 = 0; b2 < 3; b2++) {
        g.fillStyle = ['#3ae88a', '#3ac8e8', '#8a5ae8'][b2];
        for (let x = 0; x < VIEW_W; x += 6) {
          const h = 10 + Math.sin(x * 0.06 + t * (0.5 + b2 * 0.3)) * 6;
          g.fillRect(x, 10 + b2 * 8 + Math.sin(x * 0.04 + t) * 4, 6, h);
        }
      }
      g.globalAlpha = 1;
    }
  }
  drawLighting(g: CanvasRenderingContext2D, ox: number, oy: number) {
    let darkness = 0;
    if (this.layer === 0) {
      const t = this.timeOfDay;
      // night: 0.75-1.0 & 0-0.25
      if (t > 0.75) darkness = Math.min(0.62, (t - 0.75) * 4 * 0.62);
      else if (t < 0.25) darkness = 0.62;
      else if (t > 0.68) darkness = (t - 0.68) * 2.2;
      if (this.worldEvent?.kind === 'bloodmoon') darkness = Math.max(darkness, 0.5);
    } else {
      darkness = this.layer === 1 ? 0.5 : this.layer === 2 ? 0.66 : 0.58;
    }
    if (darkness <= 0.01) return;
    // light canvas
    const lc = this.lightCanvas || (this.lightCanvas = (() => { const c = document.createElement('canvas'); c.width = VIEW_W; c.height = VIEW_H; return c; })());
    const lg = lc.getContext('2d')!;
    lg.clearRect(0, 0, VIEW_W, VIEW_H);
    lg.fillStyle = this.worldEvent?.kind === 'bloodmoon' ? `rgba(60,8,20,${darkness})` : `rgba(8,8,24,${darkness})`;
    lg.fillRect(0, 0, VIEW_W, VIEW_H);
    lg.globalCompositeOperation = 'destination-out';
    const cut = (x: number, y: number, r: number, str = 1) => {
      const gr = lg.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${str})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr;
      lg.beginPath(); lg.arc(x, y, r, 0, Math.PI * 2); lg.fill();
    };
    const p = this.player;
    cut(p.x - ox, p.y - oy, 46 + Math.sin(performance.now() / 200) * 2);
    cut(this.cinder.x - ox, this.cinder.y - oy, 30, 0.9);
    // lanterns & lit windows: scan visible chunks for lantern tiles
    const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const t = this.chunks.getTile(ptx + dx, pty + dy, this.layer);
      if (t === T.LANTERN) cut((ptx + dx) * TILE + 8 - ox, (pty + dy) * TILE + 8 - oy, 34);
      else if (t === T.LAVA) cut((ptx + dx) * TILE + 8 - ox, (pty + dy) * TILE + 8 - oy, 22, 0.8);
      else if (t === T.GEYSER) cut((ptx + dx) * TILE + 8 - ox, (pty + dy) * TILE + 8 - oy, 18, 0.6);
      else if (t === T.SHRINE) cut((ptx + dx) * TILE + 8 - ox, (pty + dy) * TILE + 8 - oy, 26, 0.8);
      else if (t === CRYSTAL_TILE) cut((ptx + dx) * TILE + 8 - ox, (pty + dy) * TILE + 8 - oy, 20, 0.7);
    }
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(lc, 0, 0);
  }
  lightCanvas: HTMLCanvasElement | null = null;
  drawMinimap(g: CanvasRenderingContext2D) {
    const p = this.player;
    const S = 46, R = 10; // px radius on map = tiles
    const mx = VIEW_W - S - 3, my = 3;
    g.fillStyle = 'rgba(10,8,16,0.75)';
    g.fillRect(mx - 1, my - 1, S + 2, S + 2);
    const ptx = p.x / TILE, pty = p.y / TILE;
    for (let dy = 0; dy < S; dy += 2) for (let dx = 0; dx < S; dx += 2) {
      const wx = Math.floor(ptx + (dx - S / 2) / 1.2), wy = Math.floor(pty + (dy - S / 2) / 1.2);
      const t = this.chunks.getTile(wx, wy, this.layer);
      const b2 = this.layer === 0 ? biomeAt(wx, wy, this.opts) : BIOMES.crystal;
      let col: string = b2.ground;
      if (LIQUID_TILES.has(t)) col = t === T.LAVA ? '#e05a1e' : (b2.liquidColor === '#00000000' ? '#3a6ea8' : b2.liquidColor);
      else if (t === T.TREE) col = '#2d5a27';
      else if (t === T.WALL || t === T.DUNGEON_WALL) col = '#3a3542';
      else if (t === T.ROCK) col = '#8a8a92';
      g.fillStyle = col;
      g.fillRect(mx + dx, my + dy, 2, 2);
    }
    // enemies as red dots
    for (const e of this.enemies) {
      const ex = (e.x / TILE - ptx) * 1.2 + S / 2, ey = (e.y / TILE - pty) * 1.2 + S / 2;
      if (ex >= 0 && ex < S && ey >= 0 && ey < S) { g.fillStyle = '#e83a4a'; g.fillRect(mx + ex, my + ey, 1, 1); }
    }
    // quest marker (act dungeon)
    if (this.story.act >= 1 && this.story.act <= 5) {
      const dp = actDungeonPos(this.story.act, this.opts.seed);
      const ex = (dp.x / TILE - ptx) * 1.2 + S / 2, ey = (dp.y / TILE - pty) * 1.2 + S / 2;
      if (ex >= 0 && ex < S && ey >= 0 && ey < S) { g.fillStyle = '#ffd23f'; g.fillRect(mx + ex - 1, my + ey - 1, 3, 3); }
    }
    // player arrow
    g.fillStyle = '#fff';
    const cx2 = mx + S / 2, cy2 = my + S / 2;
    g.fillRect(cx2 - 1, cy2 - 1, 3, 3);
  }
  drawBossBar(g: CanvasRenderingContext2D) {
    const b = this.activeBoss!;
    const w = 140, x = (VIEW_W - w) / 2, y = 12;
    g.fillStyle = 'rgba(10,8,16,0.8)';
    g.fillRect(x - 2, y - 8, w + 4, 22);
    g.font = '6px monospace'; g.fillStyle = '#e8dcc0'; g.textAlign = 'center';
    const bd = (b as any).bossDef as BossDef | undefined;
    g.fillText(bd ? bd.name : b.def.name, VIEW_W / 2, y - 2);
    g.fillStyle = '#3a1020'; g.fillRect(x, y, w, 6);
    g.fillStyle = '#e83a4a'; g.fillRect(x, y, Math.round(w * Math.max(0, b.hp) / b.maxHp), 6);
    // phase markers
    if (bd) {
      g.fillStyle = '#ffd23f';
      for (const ph of bd.phases) g.fillRect(Math.round(x + w * ph.hpPct), y, 1, 6);
    }
    g.textAlign = 'left';
  }
  drawCutscene(g: CanvasRenderingContext2D) {
    if (!this.inCutscene) return;
    g.fillStyle = '#000';
    g.fillRect(0, 0, VIEW_W, 30);
    g.fillRect(0, VIEW_H - 60, VIEW_W, 60);
    const line = this.inCutscene[this.cutsceneIdx];
    const [speaker, color, text] = line.split('|||');
    const shown = text.slice(0, Math.floor(this.cutsceneChar));
    g.font = '6px monospace';
    g.fillStyle = color;
    g.fillText(speaker, 8, VIEW_H - 48);
    g.fillStyle = '#e8e0d0';
    // word wrap
    const words = shown.split(' ');
    let line1 = '', lines: string[] = [];
    for (const w of words) {
      if ((line1 + ' ' + w).length > 42) { lines.push(line1); line1 = w; }
      else line1 = line1 ? line1 + ' ' + w : w;
    }
    lines.push(line1);
    lines.slice(0, 3).forEach((l, i) => g.fillText(l, 8, VIEW_H - 36 + i * 8));
    if (this.cutsceneChar >= text.length) {
      g.fillStyle = '#ffd23f';
      g.fillText('▼ A', VIEW_W - 20, VIEW_H - 8);
    }
  }
}
