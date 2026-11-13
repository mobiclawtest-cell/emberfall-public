// Story: prologue, 5 acts, 3 endings, cutscenes, lore, side quests.
export interface StoryState {
  act: number; // 0 prologue, 1-5 acts, 6 finale, 7 post-game
  flags: Record<string, boolean>;
  choices: string[];
  ending: string | null;
  reputation: number;
  loreFound: string[];
}
export function newStory(): StoryState {
  return { act: 0, flags: {}, choices: [], ending: null, reputation: 0, loreFound: [] };
}
export interface DialogueLine { speaker: string; text: string; color?: string; }
export interface Cutscene { id: string; lines: DialogueLine[]; letterbox: boolean; panX?: number; panY?: number; }
export const CUTSCENES: Record<string, Cutscene> = {
  prologue: {
    id: 'prologue', letterbox: true,
    lines: [
      { speaker: 'Narrator', text: 'Long ago, the Ember Heart burned at the center of the world, and all living things drew warmth from its flame.', color: '#c8b89a' },
      { speaker: 'Narrator', text: 'Then the King reached into the Heart, greedy for its power — and the flame shattered into five embers.', color: '#c8b89a' },
      { speaker: 'Narrator', text: 'The Blight bloomed from the Fallen Throne like a wound. Villages went dark. Rivers forgot their names.', color: '#c8b89a' },
      { speaker: 'Cinder', text: 'Hey. Hey! You\'re awake. Good. I found you half-frozen by the road, wanderer.', color: '#ff9a3a' },
      { speaker: 'Cinder', text: 'I\'m Cinder. Last spark of the Ember Heart. No pressure, but... the whole world needs us.', color: '#ff9a3a' },
      { speaker: 'Cinder', text: 'That cracked sword of yours still holds an ember. Five more are out there, guarded. Let\'s find the Elder.', color: '#ff9a3a' },
    ],
  },
  act1_intro: {
    id: 'act1_intro', letterbox: true,
    lines: [
      { speaker: 'Elder', text: 'So Cinder chose you. Then listen well: the first ember lies in the root-vaults, guarded by Bramblemaw.', color: '#8af0a8' },
      { speaker: 'Elder', text: 'The forest has grown cruel since the shattering. Take this blessing — and watch for blighted things.', color: '#8af0a8' },
      { speaker: 'Cinder', text: 'Root-vaults. Big scary tree monster. Got it. This is fine. This is totally fine.', color: '#ff9a3a' },
    ],
  },
  act1_done: {
    id: 'act1_done', letterbox: true,
    lines: [
      { speaker: 'Cinder', text: 'The first ember! Feel that? I feel warmer already. Four to go.', color: '#ff9a3a' },
      { speaker: 'Narrator', text: 'Far away, on a throne of ash, something ancient opened one eye.', color: '#c8b89a' },
    ],
  },
  act2_intro: {
    id: 'act2_intro', letterbox: true,
    lines: [
      { speaker: 'Cinder', text: 'The next ember burns in the Ember Fields — inside Scaldra, the wyrm who swallowed it.', color: '#ff9a3a' },
      { speaker: 'Cinder', text: 'Bring something cold. Seriously. I\'m a fire spirit and even I\'m saying that.', color: '#ff9a3a' },
    ],
  },
  act3_intro: {
    id: 'act3_intro', letterbox: true,
    lines: [
      { speaker: 'Cinder', text: 'The Frost Regent hoards an ember in her glacier court. She was kind, once.', color: '#ff9a3a' },
      { speaker: 'Cinder', text: 'The Blight took her people. It gave her back a crown of ice.', color: '#ff9a3a' },
    ],
  },
  act4_intro: {
    id: 'act4_intro', letterbox: true,
    lines: [
      { speaker: 'Cinder', text: 'Beneath the waves, the Sunken City rings its bells for no one. Vessalius holds the fourth ember.', color: '#ff9a3a' },
      { speaker: 'Narrator', text: 'The tide remembers what the land forgets.', color: '#c8b89a' },
    ],
  },
  act5_intro: {
    id: 'act5_intro', letterbox: true,
    lines: [
      { speaker: 'Cinder', text: 'The last ember... is on the Fallen Throne itself. With the King.', color: '#ff9a3a' },
      { speaker: 'Cinder', text: 'Whatever he says to you — remember he broke the world to save it. In his mind, that\'s still true.', color: '#ff9a3a' },
    ],
  },
  finale_choice: {
    id: 'finale_choice', letterbox: true,
    lines: [
      { speaker: 'The Fallen King', text: 'You carry my failure back to me, wanderer. All five embers. The Heart yearns to be whole.', color: '#8a5ae8' },
      { speaker: 'The Fallen King', text: 'Restore it as it was. Rekindle it anew. Or consume it, and become the flame yourself.', color: '#8a5ae8' },
      { speaker: 'Cinder', text: 'This is your choice, wanderer. I\'ll burn with you either way.', color: '#ff9a3a' },
    ],
  },
  ending_restore: {
    id: 'ending_restore', letterbox: true,
    lines: [
      { speaker: 'Narrator', text: 'You set the embers back into the Heart, and it burned as it had before — familiar, golden, safe.', color: '#c8b89a' },
      { speaker: 'Narrator', text: 'The Blight receded like a tide. Villages relit their lanterns. The world remembered its name.', color: '#c8b89a' },
      { speaker: 'Cinder', text: 'It\'s quiet now. A good quiet. ...Thank you for carrying me home.', color: '#ff9a3a' },
    ],
  },
  ending_rekindle: {
    id: 'ending_rekindle', letterbox: true,
    lines: [
      { speaker: 'Narrator', text: 'You broke the old Heart\'s cage and let the embers choose their own shape. A new fire — wilder, younger — took root.', color: '#c8b89a' },
      { speaker: 'Narrator', text: 'Some feared it. Some worshipped it. All of them warmed their hands by it.', color: '#c8b89a' },
      { speaker: 'Cinder', text: 'I don\'t know what we made. But it\'s ours. And it\'s ALIVE.', color: '#ff9a3a' },
    ],
  },
  ending_consume: {
    id: 'ending_consume', letterbox: true,
    lines: [
      { speaker: 'Narrator', text: 'You drew the embers into your own chest. The Heart went dark. You did not.', color: '#c8b89a' },
      { speaker: 'Narrator', text: 'The Blight bowed to a new flame. The world is warm — because you burn for it. Forever.', color: '#c8b89a' },
      { speaker: 'Cinder', text: '...You\'re still you in there, right? Blink twice. Oh good. Oh thank the ash.', color: '#ff9a3a' },
    ],
  },
};
export interface ActInfo {
  act: number; title: string; objective: string; hubBiome: string; dungeonDist: number; boss: string; companion: string;
}
export const ACTS: ActInfo[] = [
  { act: 1, title: 'Roots of Ash', objective: 'Find the root-vault and defeat Bramblemaw.', hubBiome: 'forest', dungeonDist: 26, boss: 'Bramblemaw, Root Guardian', companion: 'Wren the Scout' },
  { act: 2, title: 'The Ember Fields', objective: 'Slay Scaldra in the volcanic deep.', hubBiome: 'volcanic', dungeonDist: 52, boss: 'Scaldra, the Ember Wyrm', companion: 'Kell the Smith' },
  { act: 3, title: 'Crown of Ice', objective: 'Free Ysilde from her frozen court.', hubBiome: 'tundra', dungeonDist: 82, boss: 'Ysilde, Frost Regent', companion: 'Bryn the Skald' },
  { act: 4, title: 'The Sunken Bells', objective: 'Silence the Tide Caller below the waves.', hubBiome: 'sunken_city', dungeonDist: 116, boss: 'Vessalius, Tide Caller', companion: 'Delia the Diver' },
  { act: 5, title: 'The Fallen Throne', objective: 'Confront the Fallen King.', hubBiome: 'blightlands', dungeonDist: 154, boss: 'The Fallen King', companion: 'Cinder' },
];
// Act dungeon positions, deterministic from seed: ring at increasing distance, seeded angle.
import { hash2 } from '../engine/rng';
export function actDungeonPos(act: number, seed: number): { x: number; y: number } {
  const info = ACTS[act - 1];
  const ang = hash2(act, 0, seed + 555) * Math.PI * 2;
  const d = info.dungeonDist * 16; // tiles -> px
  return { x: Math.cos(ang) * d, y: Math.sin(ang) * d };
}
export interface LoreEntry { id: string; title: string; text: string; }
export const LORE: LoreEntry[] = [
  { id: 'l1', title: 'The First Flame', text: 'Before villages, before names, the Ember Heart burned alone in the dark. It is said the world grew around it like frost on a window.' },
  { id: 'l2', title: 'The Shattering', text: 'The King reached into the Heart on the longest night. Five embers scattered to the corners of the world. The sixth — the smallest — became Cinder.' },
  { id: 'l3', title: 'On the Blight', text: 'Blight is not evil, the monks say. It is grief, made flesh. It grows where the Heart\'s warmth used to reach.' },
  { id: 'l4', title: 'The Fallen King', text: 'He wanted to end winter forever. Every famine, every frozen child — he carried them all into that chamber. He still believes he was right.' },
  { id: 'l5', title: 'Wanderers', text: 'Some are born with ember-dust in their blood. They cannot settle. The road calls them, and the road provides.' },
  { id: 'l6', title: 'Village of Hearthlight', text: 'Every village keeps a hearth that never goes out. It is bad luck — and bad survival — to let it die.' },
  { id: 'l7', title: 'Root-Vaults', text: 'The old forests keep their dead in root-vaults. Bramblemaw was planted as a seed of protection. It grew into a jailer.' },
  { id: 'l8', title: 'Ember Wyrms', text: 'Wyrms swallow fire to keep warm. Scaldra swallowed an ember of the Heart itself, and it has burned in her belly for a hundred years.' },
  { id: 'l9', title: 'The Frost Regent', text: 'Ysilde froze her own court to preserve them — a moment of beauty, held forever. The Blight found her there, jealous.' },
  { id: 'l10', title: 'Bells Below', text: 'The Sunken City drowned when the Heart shattered and the seas rose in confusion. Its bells still ring when storms come.' },
  { id: 'l11', title: 'Clockwork Monks', text: 'The monks of the Clockwork Ruins built bodies of brass to outlast the Blight. Some say a few still wind themselves.' },
  { id: 'l12', title: 'Salt & Memory', text: 'Merchants say salt remembers the sea. Carry a pinch, and you will never be lost on the water.' },
  { id: 'l13', title: 'Mushroom Hollows', text: 'Fungal Hollows glow because the mushrooms drink old light from the soil. What light? The mushrooms do not say.' },
  { id: 'l14', title: 'Standing Stones', text: 'The standing stones predate the Heart. Wanderers leave offerings: a coin, a button, a true name whispered once.' },
  { id: 'l15', title: 'The Ember Realm', text: 'Below the deepest mines burns the Ember Realm — the world\'s old furnace. The Heart was only ever its pilot light.' },
  { id: 'l16', title: 'Blood Moons', text: 'When the moon turns red, the veil thins. Spirits walk. Lock your door, or leave out bread. Both are traditions.' },
  { id: 'l17', title: 'Meteor Showers', text: 'Falling stars are the Heart\'s tears, children say. Where they land, ember shards grow like flowers.' },
  { id: 'l18', title: 'The Three Flames', text: 'The Mirror of Endings shows three fires: the restored, the rekindled, the consumed. Every wanderer sees a different one burning brightest.' },
  { id: 'l19', title: 'Knucklebones', text: 'Inn-folk play knucklebones with sheep bones. Champions play with dragon knuckles. The stakes scale accordingly.' },
  { id: 'l20', title: 'Fishing Wisdom', text: 'Old fishers say: the Void Eel only bites when you have stopped hoping. Nobody has verified this. Hopeless fishers catch no fish either.' },
  { id: 'l21', title: 'Of Pets', text: 'A tamed wolf remembers two things: who fed it, and who threw the stick. Be both, and it will follow you past death itself.' },
  { id: 'l22', title: 'The Wandering Caravan', text: 'Merchant caravans walk roads that no longer exist. Their wares are strange, their prices fair, their maps superb.' },
  { id: 'l23', title: 'Graveyards', text: 'Cursed graveyards hum at night. Sextons say it is the dead, singing what little they remember.' },
  { id: 'l24', title: 'Arena Law', text: 'The Colosseum has one law: what wins in the pit, lives free outside it. Champions retire rich. The rest retire.' },
  { id: 'l25', title: 'Crystal Caverns', text: 'Crystals grow toward music. Miners hum while they work, and the veins lean toward the sound like sunflowers.' },
  { id: 'l26', title: 'The Deep Mines', text: 'Every mine has a floor the miners sealed. Behind those doors, the dark is older and the ore is better. Trade-offs.' },
  { id: 'l27', title: 'Emberfruit', text: 'Emberfruit grows only where something has burned. Farmers joke it tastes like bonfires. It is not a joke. It does.' },
  { id: 'l28', title: 'The Ninth Talon', text: 'A mythic beast wanders the far reaches. Hunters chase it for glory. It collects their swords. It has many.' },
  { id: 'l29', title: 'Home', text: 'A wanderer\'s home is not a place, they say. But a garden plot, a warm bed, and a trophy wall do not hurt.' },
  { id: 'l30', title: 'Cinder\'s Secret', text: 'The smallest ember remembers being part of something infinite. Every night it dreams of being whole. Every night it wakes, and chooses you anyway.' },
  { id: 'l31', title: 'The Endless Deep', text: 'Below the Ember Realm, the world has no floor. Scholars call it the Endless Deep. Fools call it a shortcut. Both are right.' },
  { id: 'l32', title: 'Aurora Nights', text: 'When the sky dances green, the Heart is dreaming. Make a wish. The Heart has excellent hearing.' },
];
// procedural side quests tied to biome themes
export interface SideQuest { id: string; title: string; text: string; type: 'slay' | 'gather' | 'deliver' | 'explore'; target: string; n: number; reward: { gold: number; xp: number }; done: boolean; }
const SQ_TEMPLATES: { type: SideQuest['type']; title: string; text: string }[] = [
  { type: 'slay', title: 'Pest Control', text: 'Creatures menace the roads. Thin them out.' },
  { type: 'gather', title: 'The Missing Stock', text: 'Gather materials for the village stores.' },
  { type: 'explore', title: 'What Lies Beyond', text: 'Scout the wilds and return safely.' },
  { type: 'slay', title: 'Blightbane', text: 'Destroy blighted creatures before they spread.' },
  { type: 'gather', title: 'A Warm Hearth', text: 'The village needs fuel for the hearth.' },
];
export function makeSideQuest(seed: number, biomeName: string, rng: { int: (a: number, b: number) => number; pick: <T>(arr: readonly T[]) => T }): SideQuest {
  const t = SQ_TEMPLATES[Math.abs(seed) % SQ_TEMPLATES.length];
  const n = 3 + (Math.abs(seed) % 5);
  const target = t.type === 'slay' ? 'creatures' : t.type === 'gather' ? 'materials' : 'wilds';
  return {
    id: `sq_${seed}`, title: t.title, text: `${t.text} (${biomeName})`,
    type: t.type, target, n, reward: { gold: 15 + n * 4, xp: 10 + n * 3 }, done: false,
  };
}
