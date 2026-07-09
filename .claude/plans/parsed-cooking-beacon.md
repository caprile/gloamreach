# Plan: Minimap with Fog of War

## Context

CLAUDE.md's roadmap item 6 ("World & discovery") calls out a minimap with fog of
war as idea-stage, not started — a corner HUD map that reveals terrain as the
player physically explores it, staying revealed once seen. This is the next
unbuilt piece of that milestone. Locked via `AskUserQuestion` this session:
**passive display only** (no fast-travel/waypoints), **terrain + player position
only** (no entity blips), **fixed reveal radius** around the player (no
skill/item scaling).

## Design

**New file: `src/systems/Fog.ts`** — a `FogOfWar` class owning:
- A `Uint8Array` revealed-grid sized to the minimap's pixel resolution (see
  below), independent of `Biome.ts`'s own 40px `CELL` grid.
- `reveal(playerX, playerY)`: called from `MainScene.update()`, marks every
  unrevealed cell within `REVEAL_RADIUS` (world px) of the player as revealed.
  Only iterates a local radius window around the player's current cell, not the
  whole grid — cheap every frame (bounded to a fixed circle of cells).
- Exposes newly-revealed cells since the last call (a small array cleared each
  reveal) so the minimap can incrementally draw just those cells rather than
  redrawing the whole map.

**Resolution/scale:** minimap panel = 224×168px (exact 4:3 match for the
3584×2688 world, scale factor 16 world-px per minimap-px — clean division, no
rounding artifacts). `REVEAL_RADIUS` world px ≈ 260 (rough parity with
Boar/Gremlin aggro-radius scale already used elsewhere) → ~16px reveal radius in
minimap space.

**New file: `src/ui/MinimapUI.ts`** — corner HUD panel, following the
`EventLogUI.ts`/`KeybindsUI.ts` pattern (raw `Rectangle`/`Image`/`Graphics`
GameObjects with `.setScrollFactor(0)`, no Container — per
[[feedback_phaser_container_scrollfactor_input_bug]], nesting interactive UI in a
scroll-locked Container breaks hit detection; the minimap has no interaction
today but staying consistent avoids the trap if it gains a toggle later):
- A `Phaser.GameObjects.RenderTexture` (224×168, `.setScrollFactor(0)`,
  depth ~2500 — same band as `EventLogUI`) is the terrain layer. Starts
  fully black/transparent. On each `FogOfWar` reveal batch, `MinimapUI` samples
  terrain color for each newly-revealed cell via `Biome.forestWeight()`/
  `creekWeight()` (reusing `MainScene.ts:1037-1046`'s exact color logic: base
  grass `0x4a7a3a`, forest overlay `0x24421c` blended by weight, creek overlay
  `0x3a6ea5` blended by weight) and draws a 1×1-minimap-px rect into the
  RenderTexture at that cell — incremental draws only, never a full redraw.
- A small triangle/dot `Graphics` object drawn on top for the player marker,
  repositioned every frame (`player.x/16, player.y/16` mapped into the panel's
  screen rect) — this one *does* need per-frame update since it moves, unlike
  the mostly-static terrain layer.
- A border `Rectangle` outline, matching `EventLogUI`'s panel-chrome style.
- Positioned top-right corner (screen space), clear of the existing
  top-right `[Tab] Menu` icon and stat-points badge — verify final coordinates
  against `HotbarUI`/`CharacterMenu` HUD anchors during implementation to avoid
  overlap.

**Wiring in `MainScene.ts`:**
- Construct `this.fog = new FogOfWar(...)` and `this.minimapUI = new
  MinimapUI(this, this.biome, this.fog)` alongside the other UI systems
  (near where `eventLogUI`/`keybindsUI` are constructed).
- In `update()`, call `this.fog.reveal(this.player.x, this.player.y)` then
  `this.minimapUI.update()` in the same ambient-loop batch as
  `updateMagnet`/`updateEnemies`/`updateTreeOcclusion` (`MainScene.ts:481-483`).

**Not doing:** waypoints/click-to-travel, entity blips (enemies/stations),
skill-scaled reveal radius, save/load persistence of fog state (no save/load
system exists yet at all — fog resets each session like everything else),
zoom/pan on the minimap itself.

## Files touched
- `src/systems/Fog.ts` (new)
- `src/ui/MinimapUI.ts` (new)
- `src/scenes/MainScene.ts` — construct + wire both, one new `update()` call site
- `CLAUDE.md` — mark the minimap roadmap bullet (item 6) as shipped, matching
  every other milestone's documentation convention
- `STATUS.md` — new "Just finished" entry, following the existing format

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit` — type-check.
2. `preview_start` (config `dev`), `preview_screenshot` to confirm the game
   boots with the new corner panel visible (starts all-black/fog-covered except
   the initial reveal radius around spawn).
3. `preview_eval`: move the player a fixed distance (e.g. teleport
   `player.x/y` then call `fog.reveal()` directly) and assert the revealed-cell
   count/array grew as expected; confirm previously-revealed cells stay revealed
   after the player moves away (fog doesn't re-hide).
4. `preview_screenshot` after simulated movement to visually confirm terrain
   colors (green forest/grass, blue creek) appear correctly in revealed regions
   and unrevealed regions stay dark.
5. Check `preview_console_logs` (level `error`) for runtime errors.

## Post-ship follow-up (same day)

The initial implementation placed the panel **bottom-left**, deviating from this
plan's own "top-right" line (54) without flagging it — bottom-left was picked at
build time to dodge the then-existing `[Tab] Menu` icon/stat-points badge/
CraftingMenu panel rather than displacing them. The user asked to move it back to
top-right per the original design and, since that corner was occupied, to clear
it properly instead of finding another dodge:

- **`[Tab] Menu` icon deleted entirely** (`CraftingMenu.ts`) — Tab and Escape
  already opened/closed the combined crafting+inventory menu on their own
  (`MainScene.toggleCombinedMenu()`), so the icon was a redundant click-to-open
  affordance, not the only entry point. `CraftingMenuDeps.onIconClick` and the
  icon `GameObject` are both gone.
- **`CraftingMenu` panel and the stat-points badge shifted down** to sit below
  the minimap. `MinimapUI` now exports `MARGIN` alongside `PANEL_W`/`PANEL_H` so
  both of those compute their Y from those constants instead of separate
  hardcoded offsets — they stay stacked without overlap if the minimap's size
  ever changes.
- **Bonus fix while auditing that corner:** `MainScene.createHud()`'s
  `KeybindsUI` list had a stale `"Craft: T"` line predating the combined-Tab-menu
  design (no T-key handler exists anywhere in `src/`, confirmed via grep before
  deleting) — removed; `"Inventory: Tab"` already covers the real binding.

Verified live: `keydown-TAB` opens the combined menu with `CraftingMenu`
rendering cleanly below the minimap (no overlap); forcing `unspentPoints = 3`
places the stat-points badge at `y ≈ 189`, between the minimap's bottom edge
(180) and the crafting panel's top edge (220); the expanded `KeybindsUI` panel
screenshot confirms `"Craft: T"` is gone. Type-check clean, no console errors.
