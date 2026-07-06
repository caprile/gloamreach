# Plan: Top-Down Survival/ARPG — Vertical Slice 1 ("Explore & Gather")

## Context
the user wants to learn the Claude Code "vibecoding" workflow by building a game he's
passionate about. The long-term vision is a **Valheim-like**: exploration, discovery,
leveling, crafting, and bosses, with **ARPG** elements layered on top (item/recipe
attainment, replayability). That is a large game, so we treat the full vision as the
**north star** and start with a small, self-contained **vertical slice** that is playable
on day one and grows toward the vision.

Decisions locked in this session:
- **2D top-down pixel** (not 3D). Captures the Valheim exploration/gather/combat feel
  without the 3D asset pipeline, camera math, and physics complexity that stall beginners.
- **Stack: Phaser 3 + TypeScript + Vite.** Genre-perfect 2D browser framework (tilemaps,
  sprites, arcade physics, input, scenes, asset loading built in); browser-based so the
  game can be live-previewed and screenshotted each iteration (tight vibecoding loop);
  TypeScript pays off once inventory/recipes/save data appear.
- **First slice: "Explore & gather"** — move a character around a tile world, camera
  follows, gather a resource from a node into a basic inventory.

Fresh project — the working directory is empty except `.claude/settings.local.json`.

## Stack & Project Setup
- Scaffold with **Vite (vanilla-ts template)** + add the `phaser` dependency.
- Node/npm assumed available; run `npm run dev` for the live dev server.
- **Placeholder art**: generate simple colored/pixel textures in code (Boot scene) so the
  slice needs **no downloaded assets**. Real pixel-art tilesets get swapped in later.

## Milestone 1 — "Explore & Gather" (the slice we build first)
Playable goal: *Walk around a small world, walk up to a branch or a small rock on the
ground, press a key to pick it up (no tool needed), and watch the resource count go up.*

**Resource model (informs everything below):**
- **Free pickups — no tool:** ground **branches → `wood`** and **small rocks/pebbles →
  `stone`**. This is the full M1 gather loop.
- **Tool-gated — later:** **trees** need a **stone axe**, **boulders** need a **stone
  pickaxe**; those tools must be crafted (crafting = M2). In M1 we place a few trees/boulders
  for flavor, but interacting without the tool just shows a hint (e.g. "Needs a stone axe")
  and yields nothing. Full tree/boulder harvesting unlocks in M2.

Files to create:
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` — project scaffold.
- `src/main.ts` — Phaser `Game` config (canvas size, pixel-art rendering on, arcade
  physics, scene list).
- `src/scenes/BootScene.ts` — generate placeholder textures (player, grass tile, tree,
  rock) via `this.textures.generate` / graphics, then start MainScene.
- `src/scenes/MainScene.ts` — build the world, spawn player + resource nodes, wire the
  camera, run the gather interaction, draw the HUD.
- `src/entities/Player.ts` — arcade-physics sprite; WASD/arrow 4- or 8-direction movement.
- `src/entities/ResourceNode.ts` — a gatherable with `resource` (`wood`/`stone`), `amount`,
  and `requiredTool` (`null` for free pickups like branches/pebbles; `'stone_axe'` for
  trees, `'stone_pickaxe'` for boulders). Handles depletion and optional respawn.
- `src/systems/Inventory.ts` — plain class tracking resource counts (`add`, `get`), the
  seed of the later crafting system.

Behavior:
1. Small tile world (e.g. 40×30 tiles of grass) with world bounds; scatter ground
   **branches** and **small rocks** (free pickups), plus a few **trees** and **boulders**
   (tool-gated flavor).
2. Player moves with WASD/arrows via arcade physics; `camera.startFollow(player)` with
   bounds so the world scrolls.
3. Proximity + action key (`E` or `Space`): if a node is in range, check `requiredTool`.
   No tool needed → `Inventory.add(resource, amount)` and deplete the node. Tool needed but
   not held → show a brief "Needs a stone axe/pickaxe" hint and yield nothing.
4. HUD text (top-left, fixed to camera) shows current counts: `Wood: N  Stone: N`.

## Controls (current)
- **Move:** WASD / Arrow keys.
- **Interact:** **Left click** on a hovered object that is in reach — picks up loose items,
  or chops/mines when the matching tool is equipped. A floating prompt (`[LMB] Pick up …`
  / `[LMB] Chop` / `[LMB] Mine`, or `Needs a stone axe/pickaxe`) shows on hover in range.
- **Spacebar:** reserved (intended for **jump**, later).

## Roadmap (north star — later milestones)

**Done so far** (see `STATUS.md` in the repo for full detail on each):
- **M2 Crafting & tools** — craft a stone axe/pickaxe from gathered resources
  (unlocks harvesting trees/boulders), plus a full slot-based inventory/hotbar
  grid UI, a crafting menu with recipe discovery, and a placement mode for
  placeable items (campfire).
- Resource node health/multi-hit + tool hit-rate cooldown.
- **Loose-object drops + magnet** — chopping/mining spawns loose drops instead
  of crediting inventory directly; a magnet radius (toggle `V`) auto-collects
  them. Revised from the original plan: pre-placed branches/rocks are never
  loose/magnet-eligible, only spawned drop pieces are.
- Small UI polish along the way: collapsible bottom-right event log, staggered
  recipe-unlock toasts, and (most recently) a collapsible top-left **Keybinds**
  panel (`src/ui/KeybindsUI.ts`) replacing the single always-on controls line,
  since the bind list will keep growing as more systems land.

**Not yet built, in rough order:**
- **Movement systems**: **stamina**, **sprint**, and **jump** (jump on Spacebar) — next up.
- **M3 Combat**: enemies that chase, player attack, health/damage, death & respawn.
  Equipped-item-on-sprite visuals are deliberately deferred to land alongside this,
  since it needs a real facing/weapon-attachment system built once and reused.
- **M4 Progression**: XP, levels, stat/skill growth.
- **M5 World & discovery**: larger procedural world (much bigger than the current PoC map),
  biomes, map/discovery.
- **M6 Bosses**.
- **M7 ARPG loot**: item rarity, randomized drops/recipes, seeded runs for replayability.
- **Cross-cutting**: save/load (localStorage), and swapping placeholder art for real
  pixel-art tilesets.

## Verification
- `npm run dev` starts Vite; open the local URL (I'll use the Preview tooling — creating
  `.claude/launch.json` for the dev server — to load, screenshot, and inspect the canvas).
- Confirm end-to-end: character visible → moves with WASD/arrows → camera follows and
  world scrolls → approaching a tree/rock and pressing the action key increments the HUD
  count → node depletes.
- Check the browser console for errors via the preview tools.

## Learning notes (vibecoding loop)
We'll work in small, visible increments: make one change → run/preview → look at it →
adjust. Code stays readable and lightly commented so each step is a learning moment, and
we keep the game runnable at every step.
