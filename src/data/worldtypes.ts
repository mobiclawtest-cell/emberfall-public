// World types, modes, kits, mutators — metadata for the New World wizard.
export interface WorldTypeDef { id: string; name: string; desc: string; icon: string; }
export const WORLD_TYPES: WorldTypeDef[] = [
  { id: 'normal', name: 'Normal', desc: 'Balanced terrain and biome mix.', icon: 'map' },
  { id: 'big', name: 'Big Biomes', desc: 'Vast, sweeping biome regions.', icon: 'map' },
  { id: 'islands', name: 'Islands', desc: 'Scattered landmasses in wide oceans.', icon: 'map' },
  { id: 'frozen', name: 'Frozen', desc: 'A world locked in eternal winter.', icon: 'map' },
  { id: 'desert', name: 'Desert', desc: 'Endless dunes and badlands.', icon: 'map' },
  { id: 'blight', name: 'Blight-Heavy', desc: 'The Blight already spreads far.', icon: 'map' },
  { id: 'chaos', name: 'Chaos', desc: 'Biomes shift every few steps.', icon: 'map' },
  { id: 'flat', name: 'Flat-Peaceful', desc: 'Gentle flat plains. Build freely.', icon: 'map' },
];
export interface ModeDef { id: string; name: string; desc: string; }
export const MODES: ModeDef[] = [
  { id: 'adventure', name: 'Adventure', desc: 'The intended experience. Death costs gold.' },
  { id: 'hardcore', name: 'Hardcore', desc: 'One life. Death locks the world forever.' },
  { id: 'peaceful', name: 'Peaceful', desc: 'No enemies. Explore, build, relax.' },
  { id: 'creative', name: 'Creative', desc: 'Unlimited building materials. No damage.' },
  { id: 'challenge', name: 'Challenge', desc: 'Adventure with extra mutators.' },
];
export const KITS = [
  { id: 'wanderer', name: 'Wanderer', desc: 'Sword, shield, potions. Balanced.' },
  { id: 'warrior', name: 'Warrior', desc: 'Extra armor and a sturdy shield.' },
  { id: 'ranger', name: 'Ranger', desc: 'Bow, swift boots, foraged food.' },
  { id: 'miner', name: 'Miner', desc: 'Pickaxe, axe, and bombs.' },
  { id: 'scholar', name: 'Scholar', desc: 'Scrolls, tonics, a lucky ring.' },
  { id: 'survivor', name: 'Survivor', desc: 'Axe, building blocks, seeds, rod.' },
];
export interface Mutator { id: string; name: string; desc: string; }
export const MUTATORS: Mutator[] = [
  { id: 'double_enemies', name: 'Swarm', desc: 'Twice as many enemies.' },
  { id: 'one_hit', name: 'Glass Hero', desc: 'You die in one hit.' },
  { id: 'fast', name: 'Quicksilver', desc: 'Everything moves 40% faster.' },
  { id: 'slow', name: 'Molasses', desc: 'Everything moves 30% slower.' },
  { id: 'no_regen', name: 'Bleak', desc: 'Stamina regenerates half as fast.' },
  { id: 'glass_jaw', name: 'Brittle', desc: 'Enemies deal double damage.' },
  { id: 'lucky', name: 'Fortunate', desc: 'Greatly increased luck.' },
  { id: 'eternal_night', name: 'Eternal Night', desc: 'The sun never rises.' },
];
export interface WorldSettings {
  type: string; mode: string; kit: string; mutators: string[];
}
export interface WorldMeta {
  id: string; name: string; seed: number; seedText: string;
  settings: WorldSettings;
  createdAt: number; lastPlayed: number; playtimeMs: number;
  playerLevel: number; storyAct: number; biomesDiscovered: string[];
  deepestLayer: number; achievementIds: string[]; favorite: boolean;
  thumbnail: string; // dataURL
  dead?: boolean; // hardcore locked
  ngPlus?: number;
}
export interface WorldSave {
  version: number;
  meta: WorldMeta;
  player: any; story: any; mods: any; explored: string[];
  bestiary: Record<string, number>; collection: string[];
  pets: any[]; home: any; stats: any; quests: any;
  chestsOpened: string[]; switchesHit: string[]; npcFriends: Record<string, number>;
  lastSavedAt: number;
}
export const SAVE_VERSION = 3;
