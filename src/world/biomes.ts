// Biome data: 30+ biomes selected Minecraft-style from noise fields.
export type Liquid = 'water' | 'lava' | 'ice' | 'tar' | 'slime' | 'poison' | 'none';
export type Weather = 'clear' | 'rain' | 'snow' | 'storm' | 'sand' | 'ash' | 'aurora' | 'blight';
export interface Biome {
  id: string; name: string; family: string;
  ground: string; ground2: string; // base palette
  prop: string; propColor: string; liquid: Liquid; liquidColor: string;
  weather: Weather; light: number; // ambient brightness 0..1
  music: string; hazards: boolean;
  enemyFamilies: string[]; // used by spawn tables
  treeDensity: number; rockDensity: number; propDensity: number;
  blight?: boolean;
}
const B = (id: string, name: string, family: string, ground: string, ground2: string, prop: string, propColor: string, liquid: Liquid, liquidColor: string, weather: Weather, light: number, music: string, enemyFamilies: string[], trees = 0.02, rocks = 0.01, props = 0.06, hazards = false): Biome =>
  ({ id, name, family, ground, ground2, prop, propColor, liquid, liquidColor, weather, light, music, enemyFamilies, treeDensity: trees, rockDensity: rocks, propDensity: props, hazards });
export const BIOMES: Record<string, Biome> = {
  plains:        B('plains','Plains','temperate','#5da84f','#54a047','flower','#ffd23f','water','#3a6ea8','clear',1,'plains',['slime','wolf','beast']),
  forest:        B('forest','Forest','temperate','#3f8a43','#377d3b','mushroom','#d05a4e','water','#2e5f8f','rain',0.95,'forest',['wolf','goblin','plant','slime'],0.06,0.01,0.05),
  deep_forest:   B('deep_forest','Mirewood','temperate','#2e6b34','#265e2c','mushroom','#e0a33f','water','#244a73','rain',0.85,'forest',['wolf','plant','spirit','insect'],0.09,0.01,0.07),
  autumn_woods:  B('autumn_woods','Autumn Woods','temperate','#8a6a35','#7d5f2f','leafpile','#c46a2a','water','#3a6ea8','clear',0.95,'forest',['wolf','beast','insect'],0.07,0.01,0.06),
  cherry_grove:  B('cherry_grove','Cherry Grove','temperate','#6ab057','#5fa34e','petals','#f0a8c0','water','#4a80b8','clear',1,'plains',['spirit','beast'],0.05,0.005,0.08),
  meadow:        B('meadow','Sunmeadow','temperate','#6fbf5a','#66b352','flower','#ff8ab0','water','#3a6ea8','clear',1,'plains',['beast','insect'],0.01,0.005,0.09),
  desert:        B('desert','Desert','arid','#d9bd7a','#cfb26e','cactus','#3f7a3a','water','#4a90c8','sand',1.05,'desert',['scorpion','golem','serpent'],0.002,0.02,0.03,true),
  badlands:      B('badlands','Red Badlands','arid','#b56a3f','#a85f37','deadtree','#6b4a2f','none','#00000000','sand',1,'desert',['scorpion','bandit','golem'],0.003,0.03,0.03,true),
  salt_flats:    B('salt_flats','Salt Flats','arid','#e8e2d2','#ded7c5','crystal','#bfe8ff','none','#00000000','clear',1.1,'desert',['golem','spirit'],0,0.02,0.04),
  savanna:       B('savanna','Savanna','arid','#b8a85a','#ad9d52','acacia','#7a5a2f','water','#4a80b8','clear',1.05,'desert',['beast','scorpion'],0.01,0.01,0.03),
  tundra:        B('tundra','Tundra','cold','#cfe3ea','#c2d8e0','snowrock','#9fb8c4','ice','#a8d8f0','snow',0.95,'tundra',['wolf','icegolem','beast'],0.005,0.02,0.03,true),
  snow_forest:   B('snow_forest','Frostwood','cold','#b8ccd4','#adc2cb','pinetree','#4a6a5a','ice','#a8d8f0','snow',0.9,'snow',['wolf','icegolem','spirit'],0.05,0.015,0.04,true),
  ice_spikes:    B('ice_spikes','Ice Spikes','cold','#d8ecf2','#cde3ec','icespike','#bfe8ff','ice','#a8d8f0','snow',0.95,'tundra',['icegolem','spirit','serpent'],0,0.03,0.05,true),
  glacier:       B('glacier','Glacier Fields','cold','#e2f0f5','#d6e8f0','crevasse','#8ab8d0','ice','#9fd0ea','snow',1,'snow',['icegolem','wolf'],0,0.02,0.02,true),
  swamp:         B('swamp','Ashen Mire','wet','#4a6b3f','#42603a','boglog','#5a4a35','poison','#5a7a3a','rain',0.8,'swamp',['slime','insect','plant','spirit'],0.04,0.005,0.07,true),
  jungle:        B('jungle','Jungle','wet','#2f7a35','#287030','vine','#4a9a4a','water','#2e6b6b','rain',0.9,'jungle',['insect','serpent','plant','beast'],0.1,0.01,0.08),
  mushroom:      B('mushroom','Fungal Hollow','wet','#6b5a8a','#625382','bigshroom','#c84a6a','slime','#7a5aa8','clear',0.75,'cave',['plant','spirit','insect'],0.02,0.01,0.1),
  marsh_lights:  B('marsh_lights','Will-o-Wisp Marsh','wet','#3a5a4a','#335244','wisp','#a8f0d8','poison','#4a6a4a','rain',0.7,'swamp',['spirit','slime'],0.03,0.005,0.08),
  volcanic:      B('volcanic','Volcanic Wastes','fire','#4a3a3a','#423333','obsidian','#2a2025','lava','#e05a1e','ash',0.7,'volcanic',['imp','golem','serpent'],0,0.04,0.03,true),
  lava_fields:   B('lava_fields','Ember Fields','fire','#3a2f2f','#332828','emberrock','#c84a2a','lava','#f06a1e','ash',0.65,'volcanic',['imp','golem','firespirit'],0,0.05,0.03,true),
  ash_plains:    B('ash_plains','Ashen Plain','fire','#6b6060','#605655','ashflower','#c8c0b8','none','#00000000','ash',0.75,'volcanic',['imp','spirit'],0,0.02,0.04),
  highlands:     B('highlands','Highlands','mountain','#7a8a6a','#707f62','boulder','#8a8a8a','water','#3a6ea8','clear',1,'plains',['golem','beast','wolf'],0.01,0.05,0.03),
  storm_plains:  B('storm_plains','Storm Plains','mountain','#5a7a5a','#527052','lightningrod','#c8c8d8','water','#3a5a8a','storm',0.8,'plains',['spirit','beast','golem'],0.005,0.03,0.04,true),
  floating:      B('floating','Skyfall Highlands','mountain','#8aa87a','#809c70','floatrock','#b8c8d8','water','#7ab8e8','clear',1.1,'plains',['winged','spirit','golem'],0.02,0.03,0.05),
  crystal:       B('crystal','Crystal Caverns Edge','magic','#5a6a9a','#52608c','crystal','#8af0ff','water','#3a5aca','clear',0.85,'cave',['crystalgolem','spirit','bat'],0,0.04,0.08),
  haunted_moor:  B('haunted_moor','Haunted Moor','dark','#3f4a3f','#384338','gravestone','#8a8a92','tar','#1a1a22','rain',0.6,'dungeon',['skeleton','spirit','bat'],0.01,0.02,0.06),
  graveyard:     B('graveyard','Cursed Graveyard','dark','#4a4a52','#43434b','gravestone','#9a9aa2','tar','#1a1a22','clear',0.55,'dungeon',['skeleton','ghost','bat'],0.005,0.02,0.09),
  bone_fields:   B('bone_fields','Bone Fields','dark','#c8c0a8','#bcb398','bones','#e8e2d2','none','#00000000','clear',0.9,'desert',['skeleton','scorpion'],0,0.03,0.06),
  blightlands:   B('blightlands','Blightlands','blight','#5a3a5a','#523452','blightgrowth','#8a3a8a','tar','#3a1a3a','blight',0.6,'blight',['blighted','spirit','insect'],0.01,0.02,0.08,true),
  blight_forest: B('blight_forest','Withered Wood','blight','#4a3a4a','#433343','blighttree','#6a2a6a','poison','#5a2a5a','blight',0.55,'blight',['blighted','plant','spirit'],0.05,0.01,0.07,true),
  coral_coast:   B('coral_coast','Coral Coast','coast','#e8d8a8','#ddcfa0','coral','#f06a8a','water','#3aa8c8','clear',1.05,'plains',['crab','fish','serpent'],0,0.01,0.07),
  beach:         B('beach','Golden Beach','coast','#e8dba8','#ded09f','shell','#f0e8d8','water','#4a90c8','clear',1.05,'plains',['crab','beast'],0.005,0.005,0.04),
  sunken_city:   B('sunken_city','Sunken City','coast','#4a6a7a','#426070','ruinpillar','#6a8a9a','water','#2e5a7a','rain',0.7,'cave',['fish','serpent','spirit'],0,0.02,0.07),
  clockwork:     B('clockwork','Clockwork Ruins','magic','#6a6a5a','#615f52','gear','#b8903f','none','#00000000','clear',0.85,'dungeon',['golem','mech','spirit'],0,0.04,0.06),
  ancient_road:  B('ancient_road','Ancient Road','temperate','#6a6a62','#625f58','standingstone','#8a8a92','water','#3a6ea8','clear',0.95,'plains',['bandit','wolf'],0.01,0.02,0.03),
  geyser_field:  B('geyser_field','Geyser Fields','fire','#8a7a6a','#7f7060','geyser','#c8e8f0','water','#7ac8d8','ash',0.9,'volcanic',['beast','golem'],0,0.03,0.04,true),
  cloudberry:    B('cloudberry','Cloudberry Tundra','cold','#a8c8b0','#9cbda5','berry','#e88a3a','ice','#a8d8f0','snow',0.95,'snow',['beast','wolf'],0.02,0.01,0.06),
};
export const BIOME_LIST = Object.values(BIOMES);
// Selection from noise fields: temperature, humidity, continentalness, erosion, weirdness, blight
export function pickBiome(temp: number, hum: number, cont: number, ero: number, weird: number, blight: number): Biome {
  if (blight > 0.72) return weird > 0.5 ? BIOMES.blight_forest : BIOMES.blightlands;
  if (cont < 0.30) return BIOMES.sunken_city; // deep ocean
  if (cont < 0.36) return temp > 0.6 ? BIOMES.coral_coast : BIOMES.beach; // coasts
  const hybrid = weird > 0.78;
  if (temp < 0.25) {
    if (hybrid) return hum > 0.5 ? BIOMES.ice_spikes : BIOMES.glacier;
    return hum > 0.45 ? BIOMES.snow_forest : (hum > 0.25 ? BIOMES.cloudberry : BIOMES.tundra);
  }
  if (temp < 0.45) {
    if (hum > 0.7) return BIOMES.deep_forest;
    if (hum > 0.5) return hybrid ? BIOMES.cherry_grove : BIOMES.forest;
    if (hum > 0.3) return hybrid ? BIOMES.autumn_woods : BIOMES.plains;
    return ero > 0.6 ? BIOMES.highlands : BIOMES.meadow;
  }
  if (temp < 0.65) {
    if (hum > 0.75) return hybrid ? BIOMES.mushroom : BIOMES.jungle;
    if (hum > 0.55) return hybrid ? BIOMES.marsh_lights : BIOMES.swamp;
    if (hum > 0.35) return ero > 0.62 ? BIOMES.storm_plains : (hybrid ? BIOMES.crystal : BIOMES.plains);
    if (ero > 0.7) return BIOMES.floating;
    return hybrid ? BIOMES.ancient_road : BIOMES.savanna;
  }
  if (temp < 0.85) {
    if (hum > 0.6) return BIOMES.jungle;
    if (hum > 0.35) return hybrid ? BIOMES.bone_fields : BIOMES.savanna;
    return ero > 0.6 ? BIOMES.badlands : (hybrid ? BIOMES.salt_flats : BIOMES.desert);
  }
  // hot
  if (hum > 0.55) return BIOMES.geyser_field;
  if (ero > 0.6) return BIOMES.volcanic;
  return hybrid ? BIOMES.ash_plains : BIOMES.lava_fields;
}
// Generated two-word biome names per region (e.g. "Ashen Mirewood")
const NAME_A = ['Ashen','Ember','Silver','Thorn','Moss','Storm','Dusk','Dawn','Frost','Sun','Shadow','Gloom','Wild','Elder','Mist','Crimson','Pale','Golden','Ruin','Howling','Whisper','Sable','Verdant','Hollow'];
const NAME_B = ['wood','field','moor','reach','vale','expanse','barrow','hollow','ridge','march','fen','heath','crag','glade','wastes','shore','depths','wilds','scar','drift'];
export function regionName(rng: { int: (a: number, b: number) => number }, biomeName: string): string {
  return `${NAME_A[rng.int(0, NAME_A.length - 1)]}${NAME_B[rng.int(0, NAME_B.length - 1)]} (${biomeName})`;
}
