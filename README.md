# Emberfall Chronicles

A complete retro 16-bit top-down action-RPG for mobile portrait play.

## Run it
- **Play instantly:** open `dist/index.html` via any static server (e.g. `npx serve dist`). Portrait phone recommended.
- **Develop:** `npm install && npm run dev`
- **Build:** `npm run build`

## How to play
- **D-pad** (left) moves. **A** = sword (3-hit combo) / place blocks. **B** = dodge roll (hold with bow equipped to charge shots). **X** = quick item. **Y** = interact / hold to block with shield.
- Small buttons top-right: Inventory, Map, Journal, Pause.
- Keyboard fallback: WASD/arrows, J/K/L/I, Esc.
- Break trees/rocks/ore with tools, craft at benches/anvils, fish at the inn, clear dungeons, follow the gold map marker for the story.

## Structure
- `src/engine/` — RNG/noise, chiptune audio, pixel sprites, particles, loop, IndexedDB saves
- `src/world/` — biomes (30+), terrain gen (32x32 chunks), chunk cache/rendering
- `src/entities/` — player, enemy genome system, bosses, NPCs
- `src/combat/` — damage, elements, status, projectiles
- `src/items/` — 150+ items, inventory, crafting
- `src/story/` — acts, cutscenes, lore, side quests
- `src/game/` — core game orchestration
- `src/ui/` — React screens (menus/overlays only)
- `src/data/` — achievements (100+), world types
