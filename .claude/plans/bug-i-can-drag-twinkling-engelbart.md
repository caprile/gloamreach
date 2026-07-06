# Survivor RPG — Inventory model overhaul + world-harvest loop

## Context

After the crafting/inventory/hotbar session, playtesting surfaced two bugs and a
batch of features. Investigating them shows they are **not independent** — both
bugs and most of the inventory features share one root cause: the current item
model is a *derived list*, not real ownership.

Today:
- **Resources** (`wood`/`stone`/`leather`) live as counts in `Inventory` (HUD only).
- **Crafted items** live in `ownedTools: Set<ToolType>` + `craftedItemCounts: Map`.
- The grid/hotbar render a *derived* `inventoryEntries()` list, and "assign to
  hotbar" **copies** a reference. Nothing has a single location.

Consequences:
- **Bug — item copies into many slots (drag & right-click):** assignment copies
  from an infinite derived source, so one item can occupy multiple slots.
- **Bug — crafting a 2nd axe eats resources but produces nothing:** `ownedTools`
  is a `Set`; the second add is a silent no-op while `Crafting.craft()` already
  deducted the cost.
- Features "move between hotbar slots", "rearrange inventory", "item leaves
  inventory when hotbarred", "stack to 99", "craft multiples" all require items
  to have identity and a single home slot.

**Locked decisions (from user):**
1. **Resources unify into the grid** as stackable items (max 99). Crafting and
   drops read/write the grid. Tools/durability items don't stack (max 1).
2. **Auto-pickup:** anything dropped from a *broken* object is "loose" and
   magnet-eligible. A future **carry-weight** system will gate pickup (not built
   yet). Pre-placed branch stays loose (magnet-eligible); pre-placed rock stays
   manual (`loose:false`).
3. **Hotbar eligibility:** a per-item `hotbarable` flag (tools/weapons/torch =
   yes; skewer/campfire = no).
4. **Rollout is phased** — one milestone per session, in the order below.

**Provenance:** this plan was authored from in-session knowledge (the same
session built these files), so no Explore/Plan subagents were spawned — the
relevant files were read directly and are named per milestone.

---

## Milestone 1 (Session 1) — Unified slot-based item model ✅ DONE (2026-07-06)

Implemented as designed below: `ItemContainer.ts` + `moveSlot`, resources
folded into the grid, `hotbarable`/`maxStack` on every `ItemDef`, scene-owned
drag (`MainScene.beginItemDrag`/`resolveItemDrag`/`quickMoveItem`), wheel-cycle
hotbar selection guarded by `EventLogUI.isPointerOver`. Both original bugs
(multi-slot copy, 2nd-craft-eats-resources) confirmed fixed via `preview_eval`.
Type-check clean. See `STATUS.md` for the fuller verification note (screenshots
were blocked by a backgrounded preview tab this session; eval-based checks
covered all listed behaviors instead).

Not yet done from the original M1 description: no changes were needed beyond
what's below — nothing was descoped.

### Follow-up UI polish pass ✅ DONE (2026-07-06, separate session)

Not part of the original M1/M2/M3 scope, but cleaned up rough edges M1 left
behind before starting M2: removed the redundant top HUD text, extracted a
shared `Tooltip` class (`src/ui/Tooltip.ts`) so the hotbar shows hover info
like the backpack grid does, reworked `InventoryMenu` into a side-by-side
6x6 backpack + 3x3 equipment layout, added item icons to the crafting menu's
recipe list, and redesigned recipe-unlock toasts as a staggered top-right
stack instead of a center-screen popup. See `STATUS.md` for full detail.
Type-check clean, verified via `preview_eval` + `preview_screenshot`.


The foundational change. Fixes both bugs and delivers all the
inventory/hotbar/crafting item features.

### New: `src/systems/ItemContainer.ts`
- `type ItemStack = { key: string; count: number }`.
- `class ItemContainer` wrapping `(ItemStack | null)[]` of fixed size:
  - `add(key, count) -> leftover` — fill matching stacks up to `maxStack`, then
    empty slots.
  - `hasRoomFor(key, count)` — used to pre-check crafts/pickups.
  - `count(key)`, `removeCount(key, n)` — for crafting ingredient consumption.
  - `slot(i)`, `set(i, stack)`.
- Free function `moveSlot(src: ItemContainer, si, dst: ItemContainer, di)` that
  merges same-key stackables (respecting `maxStack`, overflow left in source) or
  swaps otherwise. Works within one container (rearrange) and across
  backpack↔hotbar. This single op powers every drag/move.

### `src/systems/Items.ts`
- Add resource item defs: `wood`, `stone`, `leather` (new icons — below).
- Add to every `ItemDef`: `maxStack: number` (99 default; tools = 1) and
  `hotbarable: boolean` (tools/weapons/torch true; shishkabob/campfire false).

### `src/systems/Inventory.ts` → repurpose/replace
- Resources now live in the backpack `ItemContainer`. Keep a small
  `discovered: Set<string>` of item keys ever added (drives recipe discovery via
  `Crafting.refresh`). Simplest: track discovery on the container add path, or a
  thin wrapper. Remove the wood/stone/leather count fields.

### `src/systems/Hotbar.ts`
- Back the 9 hotbar slots with an `ItemContainer(9)`; keep `selectedSlot`.
  `HotbarItem` collapses into `ItemStack`. Selecting a slot equips it only if the
  slot's item def is a tool (drives `equippedTool`).

### `src/systems/Crafting.ts`
- `canAfford` / `craft` read `ItemContainer.count` / `removeCount` instead of
  `Inventory`. **Pre-check `hasRoomFor(output)` before deducting** so a full
  backpack can't eat resources (mirrors the bug we're fixing). On success
  `backpack.add(outputKey, 1)`. Crafting a 2nd axe now creates a new stack/slot.
- Recipe `costs` are already keyed by resource strings (now item keys) — no
  change to `Recipes.ts` except optional future `outputCount`.

### Drag/move — lift to a scene-level controller
Both the inventory grid **and** the hotbar must be drag *sources and targets*, so
drag state moves out of `InventoryMenu` up to `MainScene` (or a small
`ui/DragController.ts`).
- `MainScene` owns `dragSource: {container, index} | null` + ghost image.
- `InventoryMenu` slot and `HotbarUI` slot `pointerdown` → `scene.beginItemDrag(container, index, pointer)`.
- Scene `pointermove` moves ghost (screen-space `pointer.x/y`, as today — keep
  the manual-drag approach; **not** Phaser draggable — see
  `[[feedback-phaser-container-scrollfactor-input-bug]]`).
- Scene `pointerup` resolves the drop against `InventoryMenu.slotIndexAt(x,y)` and
  `HotbarUI.slotAt(x,y)`; calls `moveSlot`. Reject drops of non-`hotbarable`
  items onto hotbar slots (snap back). Refresh both UIs.
- **Right-click = move (not copy):** backpack slot → first empty/matching hotbar
  slot if hotbarable; hotbar slot → first empty backpack slot. Fixes the
  right-click copy bug.
- Because items now have a single home, the multi-slot copy bug and
  "item leaves inventory when hotbarred" are both resolved for free.

### Scroll-wheel hotbar selection (small, ships here)
- Scene `wheel` handler: if pointer is over the event-log panel, let
  `EventLogUI` scroll (guard with a new `EventLogUI.isPointerOver(pointer)`);
  otherwise cycle `selected = (selected + dir + 9) % 9` both directions, wrapping,
  and re-equip.

### `src/scenes/BootScene.ts`
- Add `icon_wood`, `icon_stone`, `icon_leather` to `makeItemIcons`.

### `src/scenes/MainScene.ts`
- Replace `Inventory` + `ownedTools` + `craftedItemCounts` with the backpack
  `ItemContainer`; rewire pickups (`tryInteract`) to `backpack.add`, crafting,
  HUD (wood/stone summary now read from container counts), discovery, and the
  drag controller + wheel selection.

### Files
`ItemContainer.ts` (new), `Items.ts`, `Inventory.ts`, `Hotbar.ts`,
`Crafting.ts`, `InventoryMenu.ts`, `HotbarUI.ts`, `BootScene.ts`, `MainScene.ts`,
maybe `ui/DragController.ts` (new).

---

## Milestone 2 (Session 2) — Resource health, multi-hit, swing animation, decay

### `src/entities/ResourceNode.ts`
- Add `health`/`maxHealth`; replace `deplete()` with `hit(damage): boolean`
  (returns true when it breaks). Trees ~3 hits, boulders ~4; ground pickups stay
  instant.

### Tool damage
- Add a `damage` (per-swing) value to tool `ItemDef`s (leaves room for tiers).

### `src/scenes/MainScene.ts`
- `tryInteract` chop/mine → `node.hit(toolDamage)`; only break/harvest at 0 HP.
- **Swing animation per click:** a short tween — e.g. a transient swing sprite
  using the equipped tool's icon arcing over the node, plus a node **shake**
  (small position tween) and progressive **decay** (tint darker / slight scale
  down) as HP drops. Pure Phaser tweens, no assets. A tool-in-hand sprite is
  optional polish (player currently has no held-tool sprite).
- **Seam with M3:** until M3, breaking still credits the backpack via
  `container.add`. M3 swaps this for loose drops.

### Files
`ResourceNode.ts`, `Items.ts` (tool damage), `MainScene.ts`, maybe `BootScene.ts`
(hit-flash texture).

---

## Milestone 3 (Session 3) — Loose drops, consolidation, magnet auto-pickup (V)

### New: `src/entities/LootDrop.ts`
- World sprite for a ground stack `{key, count}`, flagged `loose`, drawn with the
  item icon.

### `src/scenes/MainScene.ts`
- On resource break, spawn a **pile** of loose drops at the node instead of
  crediting inventory (removes the M2 seam).
- **Consolidation:** loose drops within a small radius merge counts into one
  stack (up to `maxStack`; overflow stays a separate stack). Run on spawn +
  periodically.
- **Magnet auto-pickup:** in `update`, loose drops within the magnet radius, after
  a short landing delay, drift to the player and get collected via
  `backpack.add`. (Carry-weight gate is future — leave a hook/TODO.)
- **`V` toggles auto-pickup** (`autoPickup` boolean + HUD indicator). When off,
  drops are picked up by clicking them in reach (reuse the branch pickup path).
- `loose` semantics reconciled: broken-object drops = loose (magnet); pre-placed
  branch loose:true (magnet); pre-placed rock loose:false (manual) — honors the
  original CLAUDE.md note *and* the new request.

### Files
`LootDrop.ts` (new), `MainScene.ts`, maybe a `systems/` drop manager,
`ResourceNode.ts` (drop tables).

---

## Out of scope (future, noted so they aren't lost)
- **Carry weight** (gates pickup; referenced by the magnet).
- **Tool durability** (why tools are `maxStack:1`).
- **Craft-quantity selector** (for now each Craft click = 1; stackables
  accumulate).
- **Stacking exceptions** beyond durability.

## Verification (each milestone)
1. `node node_modules/typescript/bin/tsc --noEmit` (prefix PATH with
   `C:\Program Files\nodejs;` in PowerShell).
2. `preview_start "dev"`, then drive with `preview_eval` against
   `window.__game.scene.getScene('MainScene')` — the container is plain data, so
   assert on `backpack.count(...)`, slot contents, hotbar selection, drop stacks,
   node health. `preview_screenshot` for visuals.
3. Regression must-checks: tool-gated chop/mine prompt rules unchanged; recipe
   discovery + event-log toasts still fire; the container/scrollFactor input
   pattern from `[[feedback-phaser-container-scrollfactor-input-bug]]` preserved
   (no interactive children inside scrollFactor(0) containers; manual screen-space
   drag).
4. Known preview quirk: a backgrounded tab pauses Phaser's render loop — if
   `preview_screenshot` hangs, `preview_stop` then `preview_start` fresh.
