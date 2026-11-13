# Emberfall Chronicles

A complete, polished **retro 16-bit top-down action-RPG** built for phones in portrait.

## 🎮 Play now

**https://mobiclawtest-cell.github.io/**

No install, no build step — just open it on your phone.

## What's in it

- **Infinite procedural world** — hash-based deterministic chunks (32×32 tiles), safe arbitrarily far from the origin. 30+ biomes selected from Minecraft-style noise fields (temperature, humidity, continentalness, erosion, weirdness, Blight), blended borders, rivers, cliffs, oceans and landmarks.
- **Four vertical layers** — Surface → Caves → Deep Mines → Ember Realm, with their own generators, palettes and enemies.
- **Procedural enemies & bosses** — a genome system assembles creatures from generated body parts, recolored per biome and element, with modular AI, attack telegraphs, 8 elements, traits and tiers (common → elite → champion → mythic). Multi-phase bosses with arena hazards and guaranteed rare drops.
- **Combat** — 3-hit sword combos with real hit arcs, hit-stop, knockback, screen shake, crits and damage numbers; dodge roll with i-frames; shield blocking; charged bow; bombs; status effects (burn, freeze, poison, shock).
- **Worlds manager** — many independent worlds, each with generated pixel-art thumbnails, seeds, types, modes, playtime, level, act, biomes discovered and per-world achievements. Rename, duplicate, delete, export/import as a shareable code, favourite, sort, search.
- **Story** — a prologue, 5 acts, a finale and a post-game mode. Three branching endings (Restore / Rekindle / Consume), in-engine cutscenes, 30+ lore entries, a journal, and villages that remember your choices.
- **150+ items**, 5 rarities, crafting, shops, farms, pets, home base, 100+ achievements, daily quests, mini-games (fishing, knucklebones, cards, colosseum, boss rush, cooking, treasure digging, time-trial rifts), photo mode and statistics.
- **All art and audio generated in code at runtime** — pixel sprites, item icons, a bitmap font, chiptune music (16 tracks) and 40+ synthesized SFX via Web Audio. No external image or audio files.

## Controls

Portrait only. The canvas fills the top of the screen at 180×240 internal resolution,
integer-scaled with pixelated rendering; the bottom is a handheld-style touch panel.

| Button | Action |
| --- | --- |
| **D-pad** | Move (8-way) |
| **A** | Sword attack (3-hit combo) / place block |
| **B** | Dodge roll / hold to charge the bow |
| **X** | Use quick item / place block |
| **Y** | Interact / hold to block with a shield |
| **INV · MAP · JRNL · ⏸** | Inventory, map, journal, pause |

Keyboard fallback: **WASD**/arrows move, **J** attack, **K** dodge, **L** item, **I** interact, **Esc** pause.

## Development

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run build      # production build -> dist/
```

## Architecture

The game engine is plain TypeScript outside React; React is used only for menus, screens and overlays.

```
src/
  engine/    rng & noise, chiptune audio, pixel sprites, particles, fixed-timestep loop, IndexedDB saves
  world/     biome data (30+), terrain generation, chunk cache & canvas rendering
  entities/  player, enemy genome system, bosses, NPCs, pets
  combat/    damage, elements, status effects, projectiles
  items/     150+ items, inventory, crafting recipes
  story/     acts, cutscenes, lore, side quests
  game/      core orchestration: streaming, AI, events, rendering
  ui/        React screens
  data/      achievements (100+), world types, modes, mutators
```

## Deployment

This repository's workflow runs `tsc --noEmit` and `vite build`, then publishes `dist/` to the
`gh-pages` branch. A companion repository (`mobiclawtest-cell.github.io`) pulls that branch and
serves it as a GitHub Pages user site.

> Note: GitHub Pages cannot be enabled by the workflow token for a *project* repository
> (`POST /pages` returns `403 Resource not accessible by integration`), which is why the build is
> published to a user-site repository instead.
