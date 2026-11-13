// Item system: 150+ generated items, 5 rarities, stat modifiers, pixel icons.
import { RNG, seedFromString } from '../engine/rng';
import { itemIcon } from '../engine/sprites';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#c8c8c8', uncommon: '#5ad05a', rare: '#4a9af0', epic: '#b05ae8', legendary: '#f0a83f',
};
export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export type Slot = 'weapon' | 'shield' | 'armor' | 'boots' | 'ring' | 'amulet' | 'bow' | 'tool' | 'consumable' | 'material' | 'key' | 'relic' | 'cosmetic' | 'block' | 'seed' | 'misc';
export interface ItemDef {
  id: string; name: string; kind: string; slot: Slot; rarity: Rarity;
  color: string; accent: string; iconSeed: number;
  atk?: number; def?: number; speed?: number; luck?: number; hp?: number; stamina?: number;
  element?: string; effect?: string; effectPower?: number;
  heal?: number; staminaUse?: number;
  value: number; stack: number; desc: string;
  placeTile?: number;
}
export interface ItemStack { id: string; n: number; }
const SWORD_MATS: [string, string, number, number][] = [ // name,color,atk,tier
  ['Wooden', '#8a6a3f', 3, 0], ['Stone', '#8a8a92', 5, 0], ['Copper', '#c87a4a', 7, 0],
  ['Iron', '#b8b8c0', 10, 1], ['Steel', '#d0d0d8', 13, 1], ['Silver', '#e8ecf4', 16, 1],
  ['Gold', '#ffd23f', 19, 2], ['Ember', '#e05a1e', 23, 2], ['Frost', '#8ad8f0', 26, 2],
  ['Storm', '#8a5ae8', 30, 3], ['Shadow', '#6a3a8a', 34, 3], ['Holy', '#fff3c4', 38, 3],
  ['Dragonbone', '#e8e2d2', 43, 4], ['Voidglass', '#3a2a5a', 48, 4], ['Emberheart', '#ff6a2a', 55, 4],
];
const ELEMENTS: [string, string][] = [['fire', '#ff6a2a'], ['ice', '#8ad8f0'], ['storm', '#b08aff'], ['poison', '#7ad05a'], ['shadow', '#8a5ae8'], ['holy', '#fff3c4'], ['earth', '#a87840']];
const PREFIXES = ['', 'Sturdy', 'Sharp', 'Swift', 'Lucky', 'Ancient', 'Gleaming', 'Brutal', 'Warded', 'Fierce', 'Runed'];
const ARMOR_MATS: [string, string, number][] = [['Cloth', '#a8906a', 1], ['Leather', '#8a5a2a', 3], ['Hide', '#6b4a2f', 4], ['Chain', '#9a9aa5', 6], ['Iron', '#b8b8c0', 9], ['Steel', '#d0d0d8', 12], ['Emberplate', '#e05a1e', 16], ['Frostmail', '#8ad8f0', 19], ['Dragonscale', '#c84a6a', 24]];
const FOODS: [string, string, number][] = [['Berry', '#c84a6a', 4], ['Apple', '#d05a4e', 5], ['Bread', '#d9a85a', 8], ['Cooked Fish', '#c8863f', 12], ['Meat Stew', '#a86a3a', 16], ['Honey Cake', '#e8c25a', 20], ['Emberfruit', '#ff6a2a', 25], ['Golden Apple', '#ffd23f', 40]];
const MATERIALS: [string, string][] = [['Wood', '#8a6a3f'], ['Stone Chunk', '#8a8a92'], ['Iron Ore', '#b8905a'], ['Gold Ore', '#ffd23f'], ['Crystal Shard', '#8af0ff'], ['Ember Shard', '#ff6a2a'], ['Frost Shard', '#8ad8f0'], ['Slime Gel', '#7ad05a'], ['Bone', '#e8e2d2'], ['Hide', '#a87840'], ['Silk', '#e8e8f0'], ['Dark Essence', '#8a5ae8'], ['Blight Sample', '#a83aa8'], ['Scale', '#5a8a6a'], ['Feather', '#e8e2d2'], ['Salt', '#f0f0f0'], ['Coal', '#3a3a42'], ['Rope', '#b8a878'], ['Glass', '#c8e8f0'], ['Ancient Gear', '#b8903f']];
const GEMS: [string, string][] = [['Ruby', '#e83a4a'], ['Sapphire', '#3a5ae8'], ['Emerald', '#3ad05a'], ['Topaz', '#f0b83f'], ['Amethyst', '#a85ae8'], ['Diamond', '#c8f0ff'], ['Onyx', '#3a3a4a'], ['Opal', '#f0d8e8']];
const RELICS: [string, string, string][] = [
  ['Ember Sigil', '#ff6a2a', 'A fragment of the Ember Heart. Warm to the touch.'],
  ['Crown of the Fallen King', '#ffd23f', 'Torn from the Fallen Throne. It whispers.'],
  ['Heartwood Seed', '#5ad05a', 'The last seed of the First Tree.'],
  ['Tidecaller Conch', '#4a9af0', 'Sounds of a drowned city.'],
  ['Storm Jar', '#b08aff', 'Lightning, bottled by clockwork monks.'],
  ['Ashen Hourglass', '#c8c0b8', 'Time runs upward.'],
  ['Wyrm Lantern', '#8af0ff', 'A light that never dies.'],
  ['Mirror of Endings', '#e8e8f0', 'Shows three flames: one restored, one rekindled, one consumed.'],
];
function def(id: string, name: string, kind: string, slot: Slot, rarity: Rarity, color: string, accent: string, extra: Partial<ItemDef>): ItemDef {
  return { id, name, kind, slot, rarity, color, accent, iconSeed: seedFromString(id) % 9999, value: 5, stack: 1, desc: '', ...extra };
}
export const ITEMS: Record<string, ItemDef> = {};
function add(d: ItemDef) { ITEMS[d.id] = d; }
// swords
for (let i = 0; i < SWORD_MATS.length; i++) {
  const [mat, color, atk, tier] = SWORD_MATS[i];
  const rarity = RARITY_ORDER[Math.min(4, tier)] as Rarity;
  add(def(`sword_${mat.toLowerCase()}`, `${mat} Sword`, 'sword', 'weapon', rarity, color, '#e8e0d0', {
    atk, value: 10 + atk * 4, desc: `A ${mat.toLowerCase()} blade.`,
    element: mat === 'Ember' || mat === 'Emberheart' ? 'fire' : mat === 'Frost' ? 'ice' : mat === 'Storm' ? 'storm' : undefined,
  }));
}
// elemental variants (generated)
for (const [el, col] of ELEMENTS) {
  for (const base of ['Iron', 'Steel', 'Ember']) {
    const id = `sword_${el}_${base.toLowerCase()}`;
    const atk = base === 'Iron' ? 12 : base === 'Steel' ? 16 : 24;
    add(def(id, `${el[0].toUpperCase() + el.slice(1)} ${base} Sword`, 'sword', 'weapon', base === 'Ember' ? 'epic' : 'rare', col, '#fff', {
      atk, element: el, effect: el, effectPower: 3, value: atk * 6, desc: `Infused with ${el}.`,
    }));
  }
}
// shields
for (const [mat, color, defV] of [['Wooden', '#8a6a3f', 2], ['Iron', '#b8b8c0', 5], ['Kite', '#4a9af0', 8], ['Emberguard', '#e05a1e', 12], ['Aegis of Dawn', '#ffd23f', 18]] as [string, string, number][]) {
  add(def(`shield_${mat.toLowerCase().replace(/ /g, '_')}`, `${mat} Shield`, 'shield', 'shield', defV > 10 ? 'epic' : defV > 5 ? 'rare' : 'common', color, '#e8e0d0', { def: defV, value: defV * 6, desc: 'Hold to block.' }));
}
// armor sets
for (const [mat, color, defV] of ARMOR_MATS) {
  add(def(`armor_${mat.toLowerCase()}`, `${mat} Armor`, 'armor', 'armor', defV > 14 ? 'epic' : defV > 8 ? 'rare' : defV > 3 ? 'uncommon' : 'common', color, '#fff', { def: defV, hp: defV * 2, value: defV * 8, desc: `${mat} protection.` }));
}
// boots
for (const [mat, color, sp] of [['Leather', '#8a5a2a', 4], ['Swift', '#5ad05a', 9], ['Windrunner', '#8ad8f0', 15], ['Emberstride', '#ff6a2a', 20]] as [string, string, number][]) {
  add(def(`boots_${mat.toLowerCase()}`, `${mat} Boots`, 'boots', 'boots', sp > 12 ? 'rare' : 'common', color, '#fff', { speed: sp, def: Math.floor(sp / 5), value: sp * 6, desc: 'Move faster.' }));
}
// rings & amulets (generated combos)
{
  const rng = new RNG(4242);
  const ringStats: [string, keyof ItemDef][] = [['Power', 'atk'], ['Guard', 'def'], ['Haste', 'speed'], ['Fortune', 'luck'], ['Vigor', 'hp']];
  let n = 0;
  for (const [sName, stat] of ringStats) for (const [gem, gcol] of GEMS.slice(0, 5)) {
    const p = 2 + (n % 4) * 2;
    add(def(`ring_${sName.toLowerCase()}_${gem.toLowerCase()}`, `${gem} Ring of ${sName}`, 'ring', 'ring', n % 5 === 4 ? 'rare' : 'uncommon', gcol, '#ffd23f', { [stat]: p, value: 30 + p * 8, desc: `+${p} ${String(stat)}.` } as any));
    n++;
  }
  for (const [sName, stat] of ringStats) {
    const p = 4 + rng.int(0, 6);
    add(def(`amulet_${sName.toLowerCase()}`, `Amulet of ${sName}`, 'amulet', 'amulet', 'rare', '#ffd23f', rng.pick(['#e83a4a', '#3a5ae8', '#3ad05a', '#a85ae8']), { [stat]: p, value: 60 + p * 10, desc: `+${p} ${String(stat)}.` } as any));
  }
}
// bows
for (const [mat, color, atk] of [['Shortbow', '#8a6a3f', 6], ['Longbow', '#6b4a2f', 10], ['Composite', '#b8b8c0', 14], ['Stormbow', '#b08aff', 20], ['Phoenix Bow', '#ff6a2a', 27]] as [string, string, number][]) {
  add(def(`bow_${mat.toLowerCase().replace(/ /g, '_')}`, mat, 'bow', 'bow', atk > 18 ? 'epic' : atk > 12 ? 'rare' : 'common', color, '#e8e0d0', { atk, value: atk * 5, desc: 'Hold B to charge. Release to fire.' }));
}
// tools
for (const [mat, color, tier] of [['Wooden', '#8a6a3f', 1], ['Stone', '#8a8a92', 2], ['Iron', '#b8b8c0', 3], ['Steel', '#d0d0d8', 4], ['Ember', '#ff6a2a', 5]] as [string, string, number][]) {
  add(def(`axe_${mat.toLowerCase()}`, `${mat} Axe`, 'axe', 'tool', tier > 3 ? 'rare' : 'common', color, '#6b4a2f', { atk: tier * 2, effectPower: tier, value: tier * 15, desc: `Chops trees fast (tier ${tier}).` }));
  add(def(`pick_${mat.toLowerCase()}`, `${mat} Pickaxe`, 'tool', 'tool', tier > 3 ? 'rare' : 'common', color, '#6b4a2f', { atk: tier * 2, effectPower: tier, value: tier * 15, desc: `Mines rock & ore (tier ${tier}).` }));
}
// potions
for (const [n2, col, heal, rarity] of [['Minor Potion', '#e83a4a', 20, 'common'], ['Potion', '#e05a6a', 45, 'common'], ['Greater Potion', '#c83a8a', 90, 'uncommon'], ['Elixir', '#ffd23f', 180, 'rare'], ['Stamina Tonic', '#5ad05a', 0, 'common'], ['Antidote', '#7ad05a', 0, 'common'], ['Fire Ward', '#ff6a2a', 0, 'uncommon'], ['Frost Ward', '#8ad8f0', 0, 'uncommon']] as [string, string, number, Rarity][]) {
  add(def(`potion_${n2.toLowerCase().replace(/ /g, '_')}`, n2, 'potion', 'consumable', rarity, col, '#fff', { heal, stack: 9, value: 10 + heal, desc: heal ? `Restores ${heal} HP.` : 'A useful brew.' }));
}
// foods
for (const [n2, col, heal] of FOODS) add(def(`food_${n2.toLowerCase().replace(/ /g, '_')}`, n2, 'food', 'consumable', heal > 22 ? 'rare' : heal > 10 ? 'uncommon' : 'common', col, '#fff', { heal, stack: 12, value: 3 + heal, desc: `Tasty. Restores ${heal} HP.` }));
// materials
for (const [n2, col] of MATERIALS) add(def(`mat_${n2.toLowerCase().replace(/ /g, '_')}`, n2, 'material', 'material', 'common', col, '#fff', { stack: 99, value: 4, desc: 'A crafting material.' }));
// gems
for (const [n2, col] of GEMS) add(def(`gem_${n2.toLowerCase()}`, n2, 'gem', 'material', 'rare', col, '#fff', { stack: 9, value: 120, desc: 'A precious gem.' }));
// relics
for (let i = 0; i < RELICS.length; i++) {
  const [n2, col, dsc] = RELICS[i];
  add(def(`relic_${i}`, n2, 'relic', 'relic', 'legendary', col, '#fff', { value: 999, desc: dsc }));
}
// scrolls
for (const [n2, el] of [['Scroll of Fireball', 'fire'], ['Scroll of Frost', 'ice'], ['Scroll of Storm', 'storm'], ['Scroll of Return', 'holy']] as [string, string][]) {
  const col = (ELEMENTS.find(e => e[0] === el) || ['holy', '#fff3c4'])[1];
  add(def(`scroll_${el}`, n2, 'scroll', 'consumable', 'uncommon', col, '#fff', { stack: 5, value: 40, element: el, desc: `Cast ${el} magic.`, effectPower: 20 }));
}
// keys, bombs, blocks, seeds, cards, cosmetics
add(def('key_iron', 'Iron Key', 'key', 'key', 'uncommon', '#b8b8c0', '#ffd23f', { value: 50, desc: 'Opens a locked dungeon door.' }));
add(def('bomb', 'Bomb', 'bomb', 'consumable', 'common', '#3a3a45', '#ff6a2a', { stack: 9, value: 25, desc: 'Breaks cracked walls. Handle with care.' }));
add(def('block_wood', 'Wood Block', 'block', 'block', 'common', '#8a6a3f', '#fff', { stack: 99, value: 1, placeTile: 39, desc: 'Place to build.' }));
add(def('block_stone', 'Stone Block', 'block', 'block', 'common', '#8a8a92', '#fff', { stack: 99, value: 1, placeTile: 12, desc: 'Place to build.' }));
add(def('seed_wheat', 'Wheat Seeds', 'seed', 'seed', 'common', '#e8b83f', '#fff', { stack: 99, value: 2, desc: 'Plant on tilled soil.' }));
add(def('seed_ember', 'Emberfruit Seeds', 'seed', 'seed', 'uncommon', '#ff6a2a', '#fff', { stack: 99, value: 8, desc: 'Plant on tilled soil.' }));
add(def('rod_basic', 'Fishing Rod', 'tool', 'tool', 'common', '#8a6a3f', '#e8e0d0', { value: 30, desc: 'Use near water to fish.' }));
add(def('map_treasure', 'Treasure Map', 'scroll', 'misc', 'rare', '#d9c89a', '#c83a3a', { value: 80, desc: 'X marks the spot...' }));
add(def('flute', 'Ember Flute', 'misc', 'misc', 'rare', '#d9a85a', '#ff6a2a', { value: 60, desc: 'Its song calms wild creatures.' }));
// fish
for (const [n2, col, v] of [['Minnow', '#8ab8c8', 3], ['Trout', '#c8863f', 8], ['Ember Koi', '#ff6a2a', 30], ['Frostfin', '#8ad8f0', 25], ['Void Eel', '#8a5ae8', 60], ['Golden Carp', '#ffd23f', 120]] as [string, string, number][]) {
  add(def(`fish_${n2.toLowerCase().replace(/ /g, '_')}`, n2, 'fish', 'consumable', v > 50 ? 'epic' : v > 20 ? 'rare' : 'common', col, '#fff', { heal: Math.floor(v / 3) + 2, stack: 9, value: v, desc: 'A fine catch.' }));
}
// cosmetics
for (const [n2, hat] of [['Traveler Hood', 'hood'], ['Ember Crown', 'crown'], ['Horned Helm', 'horn']] as [string, string][]) {
  add(def(`hat_${hat}`, n2, 'cosmetic', 'cosmetic', hat === 'crown' ? 'legendary' : 'rare', '#8a5ae8', '#ffd23f', { value: 150, desc: 'A cosmetic hat.', effect: hat }));
}
export const ALL_ITEMS = Object.values(ITEMS);
export function rollRarity(rng: RNG, luck = 0): Rarity {
  const r = rng.next() * 100 - luck * 0.4;
  if (r < 1) return 'legendary'; if (r < 6) return 'epic'; if (r < 20) return 'rare'; if (r < 45) return 'uncommon'; return 'common';
}
// Random loot drop
export function rollLoot(rng: RNG, tier: number, luck = 0): ItemStack | null {
  const roll = rng.next();
  if (roll < 0.35) return null;
  const rarity = rollRarity(rng, luck);
  const pool = ALL_ITEMS.filter(i => {
    if (i.slot === 'relic' || i.slot === 'key') return false;
    const idx = RARITY_ORDER.indexOf(i.rarity);
    return idx <= Math.min(4, tier) + (rarity === 'legendary' ? -1 : 0) && idx <= RARITY_ORDER.indexOf(rarity) + 1;
  });
  if (!pool.length) return { id: 'mat_wood', n: rng.int(1, 3) };
  const item = rng.pick(pool);
  return { id: item.id, n: item.stack > 1 ? rng.int(1, Math.min(3, item.stack)) : 1 };
}
export function getIcon(def: ItemDef): HTMLCanvasElement {
  return itemIcon(def.kind, def.color, def.accent, def.iconSeed);
}
