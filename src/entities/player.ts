// Player: stats, movement, combos, dodge roll, blocking, bow, bombs, status.
import { Inventory } from '../items/inventory';
import { ITEMS } from '../items/items';
import { StatusFx, newStatus } from '../combat/combat';
import { Element } from './enemies';
import { clamp } from '../engine/utils';

export type Facing = 0 | 1 | 2 | 3; // down,left,up,right
export interface SkillTree { offense: number; defense: number; utility: number; points: number; }
export class Player {
  x = 0; y = 0; vx = 0; vy = 0;
  facing: Facing = 0;
  hp = 40; maxHp = 40;
  stamina = 30; maxStamina = 30;
  level = 1; xp = 0;
  baseAtk = 4; baseDef = 0; baseSpeed = 62;
  inv = new Inventory();
  skills: SkillTree = { offense: 0, defense: 0, utility: 0, points: 0 };
  status: StatusFx = newStatus();
  // action state
  attackStage = 0; attackTimer = 0; comboWindow = 0;
  rollTimer = 0; rollDx = 0; rollDy = 0;
  blocking = false; blockHold = 0;
  bowCharge = -1;
  iframes = 0; hurtTimer = 0;
  dead = false; deadTimer = 0;
  goldDropOnDeath = 0;
  // cosmetics
  skin = '#e8b890'; tunic = '#4a7ac8'; hair = '#5a3a22'; hat: string | null = null;
  swordTrail: string | null = null;
  cinderTint = '#ff9a3a';
  moving = false; stepTimer = 0;
  swim = false;
  // skill bonuses
  get offenseMul() { return 1 + this.skills.offense * 0.08; }
  get defenseMul() { return 1 + this.skills.defense * 0.08; }
  get utilityMul() { return 1 + this.skills.utility * 0.06; }
  get equipStats() { return this.inv.statTotals(); }
  get totalAtk() { return Math.round((this.baseAtk + this.equipStats.atk) * this.offenseMul); }
  get totalDef() { return Math.round((this.baseDef + this.equipStats.def) * this.defenseMul); }
  get totalSpeed() { return this.baseSpeed * (1 + this.equipStats.speed * 0.012) * this.utilityMul; }
  get totalLuck() { return this.equipStats.luck; }
  get totalMaxHp() { return this.maxHp + this.equipStats.hp; }
  get weaponElement(): Element { const w = this.inv.weaponDef(); return (w?.element as Element) || 'none'; }
  get weaponAtk() { const w = this.inv.weaponDef(); return w?.atk || 0; }
  xpNeeded() { return Math.round(20 * Math.pow(this.level, 1.45)); }
  gainXp(n: number): boolean {
    this.xp += n;
    if (this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded(); this.level++;
      this.maxHp += 4; this.hp = this.totalMaxHp;
      this.maxStamina += 2; this.stamina = this.maxStamina;
      this.baseAtk += 1;
      if (this.level % 2 === 0) this.skills.points++;
      return true;
    }
    return false;
  }
  heal(n: number) { this.hp = clamp(this.hp + n, 0, this.totalMaxHp); }
  damage(n: number): boolean { // returns true if died
    if (this.iframes > 0 || this.rollTimer > 0) return false;
    this.hp -= n;
    this.iframes = 0.7; this.hurtTimer = 0.3;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deadTimer = 2.2; return true; }
    return false;
  }
  startRoll(dx: number, dy: number): boolean {
    if (this.rollTimer > 0 || this.stamina < 8) return false;
    this.stamina -= 8;
    this.rollTimer = 0.34;
    const l = Math.hypot(dx, dy) || 1;
    this.rollDx = dx / l; this.rollDy = dy / l;
    return true;
  }
  startAttack(hasBomb: boolean): 'slash1' | 'slash2' | 'slash3' | null {
    if (this.attackTimer > 0 || this.rollTimer > 0 || this.blocking) return null;
    if (this.comboWindow > 0 && this.attackStage === 2) this.attackStage = 3;
    else if (this.comboWindow > 0 && this.attackStage === 1) this.attackStage = 2;
    else this.attackStage = 1;
    this.attackTimer = this.attackStage === 3 ? 0.42 : 0.28;
    this.comboWindow = 0;
    return this.attackStage === 3 ? 'slash3' : this.attackStage === 2 ? 'slash2' : 'slash1';
  }
  update(dt: number) {
    if (this.attackTimer > 0) { this.attackTimer -= dt; if (this.attackTimer <= 0) { this.comboWindow = 0.45; } }
    else if (this.comboWindow > 0) { this.comboWindow -= dt; if (this.comboWindow <= 0) this.attackStage = 0; }
    if (this.rollTimer > 0) this.rollTimer -= dt;
    if (this.iframes > 0) this.iframes -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.stamina = clamp(this.stamina + dt * (this.blocking ? -6 : 7) * this.utilityMul, 0, this.maxStamina);
    if (this.blocking && this.stamina <= 0) this.blocking = false;
    // status ticks
    if (this.status.burn > 0) { this.status.burn -= dt; this.hp -= 3 * dt; if (this.hp <= 0) { this.hp = 0; this.dead = true; this.deadTimer = 2.2; } }
    if (this.status.poison > 0) { this.status.poison -= dt; this.hp -= 2 * dt; if (this.hp < 1) this.hp = 1; }
    if (this.status.freeze > 0) this.status.freeze -= dt;
    if (this.status.shock > 0) this.status.shock -= dt;
    if (this.dead && this.deadTimer > 0) this.deadTimer -= dt;
  }
  serialize() {
    return {
      x: this.x, y: this.y, hp: this.hp, maxHp: this.maxHp, stamina: this.stamina, maxStamina: this.maxStamina,
      level: this.level, xp: this.xp, baseAtk: this.baseAtk, baseDef: this.baseDef, baseSpeed: this.baseSpeed,
      inv: this.inv.serialize(), skills: this.skills,
      skin: this.skin, tunic: this.tunic, hair: this.hair, hat: this.hat, swordTrail: this.swordTrail, cinderTint: this.cinderTint,
    };
  }
  load(d: any) {
    if (!d) return;
    Object.assign(this, {
      x: d.x ?? 0, y: d.y ?? 0, hp: d.hp ?? 40, maxHp: d.maxHp ?? 40, stamina: d.stamina ?? 30, maxStamina: d.maxStamina ?? 30,
      level: d.level ?? 1, xp: d.xp ?? 0, baseAtk: d.baseAtk ?? 4, baseDef: d.baseDef ?? 0, baseSpeed: d.baseSpeed ?? 62,
      skin: d.skin ?? '#e8b890', tunic: d.tunic ?? '#4a7ac8', hair: d.hair ?? '#5a3a22',
      hat: d.hat ?? null, swordTrail: d.swordTrail ?? null, cinderTint: d.cinderTint ?? '#ff9a3a',
    });
    this.skills = { offense: 0, defense: 0, utility: 0, points: 0, ...(d.skills || {}) };
    this.inv.load(d.inv);
    this.dead = false; this.iframes = 0; this.attackTimer = 0; this.rollTimer = 0;
    this.status = newStatus();
  }
}
// starting kits
export function applyKit(p: Player, kit: string) {
  const inv = p.inv;
  inv.add('sword_wooden'); inv.add('potion_minor_potion', 2); inv.add('food_bread', 2);
  switch (kit) {
    case 'warrior': inv.add('shield_wooden'); inv.add('armor_leather'); break;
    case 'ranger': inv.add('bow_shortbow'); inv.add('boots_leather'); inv.add('food_berry', 5); break;
    case 'miner': inv.add('pick_wooden'); inv.add('axe_wooden'); inv.add('bomb', 3); break;
    case 'scholar': inv.add('scroll_fire'); inv.add('potion_stamina_tonic', 2); inv.add('ring_vigor_topaz'); break;
    case 'survivor': inv.add('axe_wooden'); inv.add('block_wood', 16); inv.add('seed_wheat', 6); inv.add('rod_basic'); break;
    default: inv.add('shield_wooden'); break;
  }
  // auto-equip basics
  const eq = (id: string) => {
    const slot = ITEMS[id].slot as string;
    if (slot in inv.equip) inv.equip[slot] = { id, n: 1 };
    // remove one from slots if present
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i];
      if (s && s.id === id) { s.n--; if (s.n <= 0) inv.slots[i] = null; break; }
    }
  };
  eq('sword_wooden');
  if (kit === 'warrior') { eq('shield_wooden'); eq('armor_leather'); }
  if (kit === 'ranger') { eq('bow_shortbow'); eq('boots_leather'); }
  if (kit === 'miner') eq('pick_wooden');
  inv.quick[0] = { id: 'potion_minor_potion', n: 2 };
  inv.quick[1] = { id: 'food_bread', n: 2 };
}
