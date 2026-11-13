// Crafting recipes (bench & blacksmith).
export interface Recipe {
  id: string; out: string; n: number; bench: 'none' | 'bench' | 'anvil';
  needs: { id: string; n: number }[]; unlock?: string;
}
export const RECIPES: Recipe[] = [
  { id: 'r1', out: 'block_wood', n: 4, bench: 'none', needs: [{ id: 'mat_wood', n: 2 }] },
  { id: 'r2', out: 'sword_wooden', n: 1, bench: 'none', needs: [{ id: 'mat_wood', n: 4 }] },
  { id: 'r3', out: 'axe_wooden', n: 1, bench: 'none', needs: [{ id: 'mat_wood', n: 3 }, { id: 'mat_rope', n: 1 }] },
  { id: 'r4', out: 'rod_basic', n: 1, bench: 'bench', needs: [{ id: 'mat_wood', n: 3 }, { id: 'mat_silk', n: 2 }] },
  { id: 'r5', out: 'sword_stone', n: 1, bench: 'bench', needs: [{ id: 'mat_stone_chunk', n: 4 }, { id: 'mat_wood', n: 2 }] },
  { id: 'r6', out: 'axe_stone', n: 1, bench: 'bench', needs: [{ id: 'mat_stone_chunk', n: 3 }, { id: 'mat_wood', n: 2 }] },
  { id: 'r7', out: 'pick_stone', n: 1, bench: 'bench', needs: [{ id: 'mat_stone_chunk', n: 3 }, { id: 'mat_wood', n: 2 }] },
  { id: 'r8', out: 'shield_wooden', n: 1, bench: 'bench', needs: [{ id: 'mat_wood', n: 5 }] },
  { id: 'r9', out: 'armor_leather', n: 1, bench: 'bench', needs: [{ id: 'mat_hide', n: 6 }, { id: 'mat_rope', n: 2 }] },
  { id: 'r10', out: 'boots_leather', n: 1, bench: 'bench', needs: [{ id: 'mat_hide', n: 3 }] },
  { id: 'r11', out: 'bomb', n: 2, bench: 'bench', needs: [{ id: 'mat_coal', n: 2 }, { id: 'mat_salt', n: 1 }] },
  { id: 'r12', out: 'potion_minor_potion', n: 2, bench: 'bench', needs: [{ id: 'food_berry', n: 3 }] },
  { id: 'r13', out: 'bow_shortbow', n: 1, bench: 'bench', needs: [{ id: 'mat_wood', n: 4 }, { id: 'mat_silk', n: 2 }] },
  { id: 'r14', out: 'sword_iron', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 4 }, { id: 'mat_coal', n: 2 }, { id: 'mat_wood', n: 1 }] },
  { id: 'r15', out: 'axe_iron', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 3 }, { id: 'mat_wood', n: 2 }] },
  { id: 'r16', out: 'pick_iron', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 3 }, { id: 'mat_wood', n: 2 }] },
  { id: 'r17', out: 'shield_iron', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 5 }] },
  { id: 'r18', out: 'armor_iron', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 8 }, { id: 'mat_hide', n: 2 }] },
  { id: 'r19', out: 'sword_steel', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 6 }, { id: 'mat_coal', n: 4 }, { id: 'mat_crystal_shard', n: 1 }] },
  { id: 'r20', out: 'sword_ember', n: 1, bench: 'anvil', needs: [{ id: 'mat_ember_shard', n: 5 }, { id: 'mat_iron_ore', n: 3 }] },
  { id: 'r21', out: 'armor_chain', n: 1, bench: 'anvil', needs: [{ id: 'mat_iron_ore', n: 6 }, { id: 'mat_rope', n: 3 }] },
  { id: 'r22', out: 'potion_potion', n: 1, bench: 'bench', needs: [{ id: 'potion_minor_potion', n: 2 }, { id: 'mat_slime_gel', n: 1 }] },
  { id: 'r23', out: 'food_bread', n: 2, bench: 'bench', needs: [{ id: 'seed_wheat', n: 3 }] },
  { id: 'r24', out: 'block_stone', n: 4, bench: 'none', needs: [{ id: 'mat_stone_chunk', n: 2 }] },
  { id: 'r25', out: 'ring_power_ruby', n: 1, bench: 'anvil', needs: [{ id: 'gem_ruby', n: 1 }, { id: 'mat_gold_ore', n: 2 }] },
  { id: 'r26', out: 'sword_fire_steel', n: 1, bench: 'anvil', needs: [{ id: 'sword_steel', n: 1 }, { id: 'mat_ember_shard', n: 4 }] },
  { id: 'r27', out: 'sword_ice_steel', n: 1, bench: 'anvil', needs: [{ id: 'sword_steel', n: 1 }, { id: 'mat_frost_shard', n: 4 }] },
  { id: 'r28', out: 'sword_storm_steel', n: 1, bench: 'anvil', needs: [{ id: 'sword_steel', n: 1 }, { id: 'mat_crystal_shard', n: 4 }] },
  { id: 'r29', out: 'amulet_fortune', n: 1, bench: 'anvil', needs: [{ id: 'gem_topaz', n: 1 }, { id: 'mat_gold_ore', n: 3 }] },
  { id: 'r30', out: 'armor_emberplate', n: 1, bench: 'anvil', needs: [{ id: 'armor_iron', n: 1 }, { id: 'mat_ember_shard', n: 8 }] },
];
export function recipesFor(bench: 'none' | 'bench' | 'anvil'): Recipe[] {
  const order = { none: 0, bench: 1, anvil: 2 };
  return RECIPES.filter(r => order[r.bench] <= order[bench]);
}
