// Grid inventory with stacking, equipment, and quick slots.
import { ITEMS, ItemDef, ItemStack } from './items';
export const INV_SIZE = 32;
export class Inventory {
  slots: (ItemStack | null)[] = new Array(INV_SIZE).fill(null);
  quick: (ItemStack | null)[] = new Array(4).fill(null);
  equip: Record<string, ItemStack | null> = { weapon: null, shield: null, armor: null, boots: null, ring: null, amulet: null, bow: null, tool: null };
  gold = 25;
  add(id: string, n = 1): number {
    const def = ITEMS[id]; if (!def) return n;
    let remaining = n;
    if (def.stack > 1) {
      for (const arr of [this.quick, this.slots]) {
        for (let i = 0; i < arr.length && remaining > 0; i++) {
          const s = arr[i];
          if (s && s.id === id && s.n < def.stack) {
            const take = Math.min(def.stack - s.n, remaining);
            s.n += take; remaining -= take;
          }
        }
      }
    }
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (!this.slots[i]) { const take = Math.min(def.stack, remaining); this.slots[i] = { id, n: take }; remaining -= take; }
    }
    return remaining; // >0 means inventory full
  }
  remove(id: string, n = 1): boolean {
    if (this.count(id) < n) return false;
    let remaining = n;
    for (const arr of [this.quick, this.slots]) {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        const s = arr[i];
        if (s && s.id === id) {
          const take = Math.min(s.n, remaining);
          s.n -= take; remaining -= take;
          if (s.n <= 0) arr[i] = null;
        }
      }
    }
    return true;
  }
  count(id: string): number {
    let c = 0;
    for (const arr of [this.quick, this.slots]) for (const s of arr) if (s && s.id === id) c += s.n;
    return c;
  }
  equipItem(slotIdx: number, fromQuick: boolean): void {
    const arr = fromQuick ? this.quick : this.slots;
    const s = arr[slotIdx]; if (!s) return;
    const def = ITEMS[s.id];
    if (!def || !(def.slot in this.equip)) return;
    const prev = this.equip[def.slot];
    this.equip[def.slot] = { id: s.id, n: 1 };
    arr[slotIdx] = null;
    if (prev) this.add(prev.id, 1);
  }
  unequip(slot: string) {
    const e = this.equip[slot]; if (!e) return;
    if (this.add(e.id, 1) === 0) this.equip[slot] = null;
  }
  statTotals() {
    const t = { atk: 0, def: 0, speed: 0, luck: 0, hp: 0 };
    for (const k of Object.keys(this.equip)) {
      const e = this.equip[k]; if (!e) continue;
      const d = ITEMS[e.id]; if (!d) continue;
      t.atk += d.atk || 0; t.def += d.def || 0; t.speed += d.speed || 0; t.luck += d.luck || 0; t.hp += d.hp || 0;
    }
    return t;
  }
  weaponDef(): ItemDef | null { const e = this.equip.weapon; return e ? ITEMS[e.id] : null; }
  serialize() { return { slots: this.slots, quick: this.quick, equip: this.equip, gold: this.gold }; }
  load(d: any) {
    if (!d) return;
    this.slots = (d.slots || []).concat(Array(INV_SIZE).fill(null)).slice(0, INV_SIZE);
    this.quick = (d.quick || []).concat(Array(4).fill(null)).slice(0, 4);
    this.equip = { weapon: null, shield: null, armor: null, boots: null, ring: null, amulet: null, bow: null, tool: null, ...(d.equip || {}) };
    this.gold = d.gold ?? 25;
  }
}
