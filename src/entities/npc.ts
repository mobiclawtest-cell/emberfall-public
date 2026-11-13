// NPCs: names, routines, dialogue reacting to quest state / time / reputation.
import { RNG } from '../engine/rng';
export type NpcRole = 'elder' | 'merchant' | 'innkeeper' | 'blacksmith' | 'farmer' | 'child' | 'guard' | 'monk' | 'traveler';
const NAMES = ['Aldric','Bryn','Cedra','Doran','Elfi','Fenn','Greta','Halla','Ivo','Jora','Kell','Lira','Mael','Nessa','Orin','Pell','Quinn','Runa','Sef','Tilda','Ulric','Vanna','Wren','Yara','Zeph','Brigid','Corin','Delia','Eamon','Faye'];
const SURNAMES = ['Ashford','Birch','Cole','Dunmore','Emberly','Frost','Gale','Harlow','Ingwald','Kettle','March','Oake','Pyke','Reed','Stone','Thatcher','Vale','Wick','Yew'];
export interface NpcDef {
  id: string; name: string; role: NpcRole; portrait: number;
  home: { x: number; y: number }; greet: string[];
}
export function makeVillageNpcs(seed: number, centerX: number, centerY: number): NpcDef[] {
  const rng = new RNG(seed);
  const roles: NpcRole[] = ['elder', 'merchant', 'innkeeper', 'blacksmith', 'farmer', 'child'];
  const out: NpcDef[] = [];
  const n = rng.int(4, 6);
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const role = roles[i % roles.length];
    let name = rng.pick(NAMES); if (used.has(name)) name = rng.pick(NAMES);
    used.add(name);
    const full = `${name} ${rng.pick(SURNAMES)}`;
    out.push({
      id: `npc_${seed}_${i}`, name: role === 'elder' ? `Elder ${name}` : full, role,
      portrait: rng.int(0, 999),
      home: { x: centerX + rng.int(-8, 8), y: centerY + rng.int(-8, 8) },
      greet: [],
    });
  }
  return out;
}
export function npcDialogue(npc: NpcDef, ctx: { act: number; timeOfDay: number; reputation: number; questFlags: Record<string, boolean>; rng: RNG }): string {
  const { act, timeOfDay, reputation, questFlags } = ctx;
  const tod = timeOfDay < 0.25 ? 'night' : timeOfDay < 0.5 ? 'morning' : timeOfDay < 0.75 ? 'afternoon' : 'evening';
  const lines: Record<NpcRole, string[]> = {
    elder: [
      `The Ember Heart is shattered, child. ${act < 5 ? 'The Blight creeps closer each day.' : 'You carry the world\'s last hope.'}`,
      questFlags.prologue_done ? 'I knew you had the wanderer\'s fire in you.' : 'Speak with me when you are ready to hear of the Heart.',
      'Cinder follows you? Then the flame has chosen. Do not waste it.',
      'The Fallen King was once our protector. Remember that, when you face him.',
    ],
    merchant: [
      tod === 'morning' ? 'Fresh stock! Come see, come see.' : 'Best prices this side of the Blightlands.',
      reputation > 20 ? 'For my favorite customer — special deals today.' : 'Coin first, friendship later, eh?',
      'I heard a caravan went missing near the ash fields. Shame. Good wares gone.',
    ],
    innkeeper: [
      'A bed for the night? Best sleep you\'ll get outside the grave. Ha!',
      'Fancy a game of knucklebones? The regulars owe me money anyway.',
      'Hot stew, cold ale, and no questions asked.',
    ],
    blacksmith: [
      'Bring me ore and I\'ll forge you something with teeth.',
      'That cracked ember sword of yours... it could be reforged. In time.',
      reputation > 40 ? 'For you? I\'ll work through the night.' : 'Steel doesn\'t shape itself, friend.',
    ],
    farmer: [
      'Blight ruined my east field. If you clear the blighted ones, I can replant.',
      'Chickens keep wandering off. Foxes, maybe. Or worse.',
      tod === 'evening' ? 'Day\'s done. My back feels every stone in this field.' : 'Good soil here, if the weather holds.',
    ],
    child: [
      'Are you REALLY a wanderer? Do you have a sword?!',
      'Cinder is SO pretty. Can I pet the little flame?',
      'My grandma says the sky used to be more... orange? Is that true?',
      'When I grow up I\'m going to fight the Blight too!',
    ],
    guard: ['Keep your blade sheathed in the plaza.', 'Wolves on the roads at night. Travel armed.', 'The elder speaks highly of you.'],
    monk: ['The flame keeps us all. Even now.', 'Sit. Breathe. The ember listens.'],
    traveler: ['Roads are dangerous, friend. Watch the moors.', 'I saw a wandering merchant caravan, two days north.'],
  };
  const pool = lines[npc.role] || lines.traveler;
  return pool[Math.floor(ctx.rng.next() * pool.length)];
}
// ---- ambient entities + tameable pets/mounts ----
export type AmbientKind = 'chicken' | 'cow' | 'dog' | 'cat' | 'bird' | 'fish' | 'butterfly' | 'firefly';
export const AMBIENTS: Record<AmbientKind, { color: string; speed: number; biome: string[] }> = {
  chicken: { color: '#e8e2d2', speed: 12, biome: ['temperate'] },
  cow: { color: '#8a6a4a', speed: 8, biome: ['temperate'] },
  dog: { color: '#a87840', speed: 20, biome: ['temperate'] },
  cat: { color: '#5a5a66', speed: 18, biome: ['temperate'] },
  bird: { color: '#4a8ac8', speed: 26, biome: ['temperate', 'arid'] },
  fish: { color: '#4a9af0', speed: 10, biome: ['coast', 'wet'] },
  butterfly: { color: '#f0a8c0', speed: 14, biome: ['temperate', 'wet'] },
  firefly: { color: '#e8f07a', speed: 8, biome: ['wet', 'dark', 'forest'] },
};
export interface PetDef { id: string; name: string; kind: 'wolf' | 'cat' | 'bird' | 'slime'; level: number; xp: number; skill: string; }
export const PET_NAMES = ['Ember','Biscuit','Shadow','Pip','Nyx','Toast','Willow','Ziggy'];
