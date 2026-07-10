# Playtest Batch — Group B: HUD & Stats Display

## Context

Second-playtest Group B, the middle of three batches (order locked earlier via
`AskUserQuestion`: A → B → C). Group A (six quick fixes) shipped last session — plan at
`.claude/plans/delightful-tinkering-book.md`. Group B is the **HUD & stats-visibility**
pass: make the on-screen bars communicate the player's growing pools, relocate the XP
bar somewhere cleaner, and surface several combat/movement numbers that are computed
today but never shown. Group C (Elites + Trophy-gated Totem) is deliberately still
after this. **Not yet implemented — planned only, per the user's request to start
implementation in a fresh session.**

Three display/layout preferences were confirmed via `AskUserQuestion` this session:
- **Run Speed** shown in **both** the Character menu Stats tab (full breakdown) and the
  inventory Combat column (compact line).
- **HP/Stamina bars grow proportionally** with max pool, **capped at hotbar width**,
  kept centered.
- **XP bar moves under the hotbar** at hotbar width (nudging the hotbar up slightly to
  open room beneath it).

Researched via 2 parallel Explore agents + direct reads; findings folded in below.

## Items

### B1 — HP/Stamina bars widen proportionally (centered, capped at hotbar width)
Today both bars are a hardcoded `barW = 76`; the fill rect is stored
(`healthBarFill`/`staminaBarFill`) but the **background rect is created inline and never
stored**, so it can't be resized. Refresh only does `fill.setScale(frac, 1)`.
- **Store the bg rects** as new fields (`healthBarBg`, `staminaBarBg`).
- **Dynamic width**: `barW = clamp(round(BASE_BAR_W * max / BASE_MAX), BASE_BAR_W,
  hotbarWidth)` where `BASE_BAR_W = 76`, `BASE_MAX = 100`, and `hotbarWidth` comes from
  a new `HotbarUI.width` getter (B2). So 150 max → 114px, capped so it never exceeds the
  408px hotbar.
- **Extract a `layoutBar(bg, fill, text, barW, barY, frac, valueText)` helper** and call
  it from both `refreshHealthBar`/`refreshStaminaBar`: recompute `barX = round(
  scale.width/2 - barW/2)` (stays centered), then `bg.setPosition(barX,barY).setSize(
  barW,barH)`, `fill.setPosition(barX+1,barY+1).setSize(barW-2,barH-2).setScale(frac,1)`
  (origin stays (0,0), so the 1px inset + horizontal-scale-by-fraction behavior is
  preserved), `text.setPosition(barX+barW/2, barY+barH/2)`. `Phaser.GameObjects.
  Rectangle.setSize()` updates the shape geometry.
- **No new trigger needed**: `syncStatBonuses()` (`MainScene.ts:~2408`, run from
  `allocateStat` on any Vitality/Endurance point) already calls
  `refreshHealthBar()`/`refreshStaminaBar()` — the width recompute now lives inside those
  refreshes, so allocating a point re-lays-out the bar automatically. `Health.max` /
  `Stamina.max` are `100 + bonus` (base 100, +1 per point).

### B2 — XP bar under the hotbar, hotbar-width
The hotbar sits with only ~14px below it today (`row2Y = scale.height - SLOT_SIZE - 14`
in `HotbarUI.ts:53`), no room beneath. So:
- **HotbarUI**: promote the `14` to a named `BOTTOM_MARGIN` and bump to **~34** (opens
  ~20px of clearance below the hotbar). Add getters: `width` (`ROW1_COUNT*SLOT_SIZE +
  (ROW1_COUNT-1)*SLOT_GAP` = 408), `left` (returns `originX`), and `bottom` (`row2Y +
  SLOT_SIZE`). The existing `top` getter is unchanged; raising the hotbar shifts `top`
  up too, so the HP/stamina bars (anchored off `top`) rise with it automatically.
- **Relocate `createXpBar`**: `barX = hotbarUI.left`, `barW = hotbarUI.width` (408),
  `barY = hotbarUI.bottom + 4`, `barH ≈ 12`. Store the bg rect (needed only for a fixed
  width here, but store for consistency). "Lvl N" text centered at ~10px font. Fill:
  origin (0,0), width `barW-2`, `setScale(frac,1)` in `refreshXpBar` (unchanged math).
- **Restack HP/stamina**: with XP gone from the top stack, only stamina + HP remain
  above `hotbarUI.top`. Update `createHealthBar`'s Y to `staminaBarY - gap - barH` with
  no third XP offset (drop the extra `- gap - barH` that reserved the XP slot).

### B3 — Run Speed stat + breakdown (both places)
No item speed bonuses exist yet — the only inputs are base walk + the Running skill's
sprint multiplier.
- **Single-source the base speed**: `Player.ts`'s `const SPEED = 95` is module-private;
  export it as `PLAYER_WALK_SPEED` and keep `Player.update()` using it.
- **New `MainScene.runSpeedBreakdown()`** returning a `RunSpeedView`:
  `{ walk, sprintMultiplier, sprint, runningLevel, runningBonus, itemBonus }`, where
  `sprintMultiplier = runningSprintMultiplier(this.skills)` (`Skills.ts`, `1.75 +
  level*0.005`), `walk = PLAYER_WALK_SPEED`, `sprint = round(walk * sprintMultiplier)`,
  `runningBonus = round(level*0.005 * walk)` (px/s the skill adds vs. base sprint),
  `itemBonus = 0` (framework line — no speed items yet).
- **Character menu Stats tab** (`CharacterMenu.ts` `renderStatsTab`, after the
  `STAT_TYPES` loop): add `runSpeedBreakdown: () => RunSpeedView` to `CharacterMenuDeps`
  and render a read-only "Movement" block: a "Run Speed" header, then
  `Walk: 95` / `Sprint: 166 (x1.75)` and a breakdown line
  `base 1.75 + Running Lvl N (+X) + items (+0)`. `PANEL_H = 520` has room (6 rows ≈ 364px
  used).
- **Inventory Combat column** (`renderCombatStats`): add a compact
  `Move Speed: 95 / 166 spr` line at the bottom. Add the same `runSpeedBreakdown` dep to
  `InventoryMenuDeps`.

### B4 — Damage broken out by type ("8 Pierce") in the Combat column
- **`Weapons.ts`**: add `damageTypeDisplayName(type: DamageType): string` (capitalizes;
  `"pierce"` → `"Pierce"`). Weapons are single-type today (`weaponPrimaryDamageType`);
  multi-type is allowed by the data model but only `[0]` is used — note as future.
- **`CombatStatsView`** (`InventoryMenu.ts`): add `damageTypeName: string | null`.
- **`combatStats()`** (`MainScene.ts:~3002`): set `damageTypeName = damageTypeDisplayName(
  weaponPrimaryDamageType(this.equippedWeapon))`. The existing `damage` already folds in
  the skill multiplier + tier bonus.
- **`renderCombatStats`**: change the Damage line to `Damage: ${damage} ${damageTypeName}`
  → e.g. `Damage: 8 Pierce` (falls back to `Damage: -` when unarmed).

### B5 — Attack Range stat in the Combat column
- **`CombatStatsView`**: add `attackRange: number`.
- **`combatStats()`**: `attackRange = REACH` (the module-private `REACH = 64` in
  `MainScene.ts`; read directly, no export needed).
- **`renderCombatStats`**: add `Attack Range: 64` line after Armor.

## Files touched
- `src/scenes/MainScene.ts` — bar create/refresh refactor + `layoutBar` helper,
  `combatStats()` (damage type + attack range), new `runSpeedBreakdown()`, deps wiring.
- `src/ui/HotbarUI.ts` — `BOTTOM_MARGIN`; `width`/`left`/`bottom` getters.
- `src/ui/InventoryMenu.ts` — `CombatStatsView` fields (`damageTypeName`, `attackRange`),
  `renderCombatStats` new/changed lines, `InventoryMenuDeps.runSpeedBreakdown`.
- `src/ui/CharacterMenu.ts` — `CharacterMenuDeps.runSpeedBreakdown`, Stats-tab Movement
  block.
- `src/systems/Weapons.ts` — `damageTypeDisplayName()`.
- `src/entities/Player.ts` — export `PLAYER_WALK_SPEED` (was private `SPEED`).

No recipe/upgrade files change, so `RECIPES.md` needs no update this batch.

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (config `dev`) + `preview_eval`:
   - Allocate several Vitality/Endurance points; confirm `Health.max`/`Stamina.max` rise
     and both the bg AND fill rects widen, stay centered, and clamp at the hotbar width;
     confirm the fill fraction still tracks current/max correctly.
   - Read the XP bar's geometry: `x === hotbarUI.left`, width `=== hotbarUI.width`, and
     Y below `hotbarUI.bottom`; confirm HP/stamina restacked with no gap left by the
     departed XP bar.
   - `combatStats()` returns `damageTypeName` (e.g. "Pierce") and `attackRange: 64`;
     with a Primal Spear equipped, the Combat column reads `Damage: 8 Pierce`,
     `Attack Range: 64`, and a `Move Speed:` line.
   - Open the Character menu (K) Stats tab; confirm the Movement block shows Walk 95 /
     Sprint = round(95 * sprintMultiplier) and the breakdown line reflects the live
     Running level; level Running up and confirm the sprint number climbs.
3. `preview_screenshot` at base pools and again after inflating max HP/stamina — confirm
   the widened bars, the under-hotbar XP bar, and the Combat column all render cleanly
   with no overlap.
