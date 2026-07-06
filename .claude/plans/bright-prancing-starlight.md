# Milestone 3: Loose world drops + magnet auto-pickup

## Context

Per the inventory-overhaul roadmap (STATUS.md "Up next", memory
`survivor-rpg-inventory-overhaul-plan`), M1 (unified item model) and M2
(resource health/multi-hit) are done. M3 is next: chopping/mining currently
credits the backpack the instant a tree/boulder is depleted
(`MainScene.tryInteract`, `src/scenes/MainScene.ts:398`). The new design:
depleted nodes "explode" into a few scattered loose item pieces on the
ground that must be collected — either by walking up and clicking, or
automatically via a magnet radius. Loose items bob gently so they read as
"interactable clutter" at a glance.

**Revised from the original CLAUDE.md note (per this session):** pre-placed
branches/rocks are now *both* `loose: false` — always manual-click, no
magnet. Only pieces spawned from a depleted tree/boulder are `loose: true`
and magnet-eligible. `CLAUDE.md`'s "loose flag" section will be updated to
reflect this (the old text said pre-placed branches were loose; that's
superseded).

Explicitly out of scope: carry-weight gating of the magnet (system doesn't
exist yet), and destroying already-placed build objects (campfire) —
unrelated to this milestone.

## Approach

Reuse `ResourceNode` for drop pieces instead of a parallel entity class — a
piece is a pickup-action, loose node whose texture is the resource's
inventory icon (`icon_wood` / `icon_stone`, already generated in
`BootScene.ts`). This gets hover, in-reach prompting, and click-to-collect
for free from the existing `updateHover`/`promptFor`/`tryInteract` code.

### 1. `src/entities/ResourceNode.ts`

- Change `readonly amount: number` → `amount: number` (mutable — a piece's
  count grows when a later depletion's piece lands near it and consolidates).
- Add `isDrop?: boolean` to `ResourceNodeConfig` (default false), stored as
  `readonly isDrop: boolean` — marks spawned pieces so consolidation only
  merges pieces with pieces, and the magnet only ever considers pieces (see
  below), never pre-placed branches/rocks.
- Add `exploding: boolean` (starts `true` for drop pieces, `false`
  otherwise) — true while the spawn-scatter tween is running; the magnet
  loop skips a node while `exploding` so it isn't fighting the scatter tween
  over `x`/`y` in the same frame.
- Add a mutable stack-count label: a small world-space `Phaser.GameObjects.Text`
  (~10px, white w/ dark stroke, origin (0.5, 0), a few px below the sprite),
  shown only when `amount > 1`. Add `setAmount(n: number)` to update
  `amount` + the label. Destroy the label in `deplete()`.
- Add a `startBob()` method (called once a drop piece finishes exploding):
  a slow, small vertical tween (`y: baseY - 3`, yoyo, repeat -1, ~1100ms,
  `Sine.easeInOut`) so loose pieces read as interactable without flicker.
  Not used for pre-placed branches/rocks (still fully static).

### 2. `src/scenes/MainScene.ts`

**Pre-placed nodes** — in `spawnNodes()`, change the branch `scatter(...)`
call's `loose` from `true` to `false` (rocks are already `false`). Both free
pickups are now manual-only; only depletion pieces are loose.

**Spawning pieces on deplete** — in `tryInteract()`, once `takeHit` reports
`depleted` on a chop/mine node, call a new
`spawnLooseDrop(node.resource, node.amount, node.x, node.y)` instead of
`addToBackpack`, then deplete/remove the node as today. The direct-click
pickup path (branch/rock/piece) is unchanged — still calls `addToBackpack`
straight away.

**`spawnLooseDrop(resource, amount, x, y)`** — the "explode":
- Split `amount` into 2-4 pieces (`Phaser.Math.Between(2, Math.min(4, amount))`
  pieces when `amount > 1`, else just 1), distributing the total as evenly
  as possible with any remainder on the last piece.
- For each piece: create a `ResourceNode` at `(x, y)` with `action:
  "pickup"`, `loose: true`, `isDrop: true`, `exploding: true`, `health: 1`,
  `texture: itemDef(resource)?.texture`, `displayName:
  itemDef(resource)?.name`, push into `this.nodes` immediately (hoverable
  right away, matches "loot flies out and you can still click it mid-air"
  feel — simplest option, no need to block interaction during the tween).
  Pick a random angle and a scatter distance (~20-45px, comfortably inside
  `MAGNET_RADIUS`) from `(x, y)`, and tween the piece's `x`/`y` to that
  landing point over ~250ms (`Cubic.easeOut`). `onComplete`: set
  `exploding = false`, call `startBob()`, then run the **landing-site
  consolidation** check: look for another `isDrop && loose && !depleted &&
  resource === resource` node within a small radius (~28px) of the landing
  point (excluding itself) — if found, transfer this piece's amount into it
  via `setAmount(existing.amount + piece.amount)` and destroy/remove this
  piece; otherwise leave it standing as its own pickup node.

**Magnet loop** — add `magnetEnabled = true`, `MAGNET_RADIUS` (~100px, a bit
past `REACH`), `MAGNET_SPEED` (~220 px/s) constants, and an
`updateMagnet(delta)` method called from `update()` every frame (passive,
not mouse-driven, so no need to gate on menus/placement). Scans `this.nodes`
for `isDrop && loose && !depleted && !exploding` within `MAGNET_RADIUS` of
the player, steps `x/y` toward the player by `MAGNET_SPEED * delta/1000`.
When remaining distance drops under a pickup threshold (~14px): award via
`addToBackpack`, `deplete()`, collect into a list during the scan and filter
`this.nodes` once after the loop (avoid mutating mid-iteration).
`MainScene.update()` needs Phaser's `delta` param to drive this.

**Toggle** — bind `keydown-V` to flip `magnetEnabled`, log the new state via
`this.eventLog.add("info", ...)` (same pattern as placement/crafting
messages), and add `Auto-pickup: V` to the top-left controls line
(`src/scenes/MainScene.ts:572`).

### 3. `CLAUDE.md`

Update the "Interaction & resource model" section's `loose` flag bullet:
pre-placed branches and rocks are now both `loose: false` (manual pickup
only); only pieces spawned from a depleted tree/boulder are `loose: true`
and magnet-eligible. Keep the rest of that section as-is.

## Post-implementation notes (2026-07-06)

Shipped as planned, plus two follow-up fixes found during manual playtesting
after the initial pass:

- **Magnet is purely radius-gated, no lock-on.** The first pass literally
  matched this plan, but real play made it look like pulled pieces "trailed
  the player at a fixed offset" instead of reaching them. Root cause wasn't
  the magnet logic — it was `startBob()`'s idle `y` tween fighting the
  magnet's manual `node.y` write every frame. Fixed by
  `this.tweens.killTweensOf(node)` the instant a piece enters
  `MAGNET_RADIUS`, before the pull is applied. (A "lock on and always finish
  the pull even if the player leaves range" variant was tried first per a
  misreading of the symptom, then explicitly reverted — the user wants pure
  per-frame radius gating: outside `MAGNET_RADIUS`, a piece doesn't move at
  all, no persistence.)
- **Tween leak on early piece destruction.** `startBob()`'s `repeat: -1`
  tween never completes on its own; nothing killed it when a piece was
  destroyed early — merged away by `consolidateDrop`, or clicked mid-flight
  during its explosion (pieces are hoverable/clickable immediately, even
  while `exploding`). Each left an orphaned tween animating a destroyed
  sprite forever; over a play session of repeatedly breaking rocks/trees
  these piled up unbounded and dragged the frame rate down to what looked
  like a frozen/crashed game — a real bug report, not hypothetical. Fixed by
  killing a node's own tweens in `ResourceNode.deplete()`, plus a
  `node.depleted` guard in the explosion tween's `onComplete` so an
  already-collected piece doesn't get a new bob tween started on it
  afterward. See memory `feedback-phaser-infinite-tween-leak` — this is a
  general pattern to watch for with any future looping tween in this
  codebase.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (config `dev`), then via `preview_eval` against
   `window.__game.scene.getScene('MainScene')`:
   - Deplete a tree/boulder (right tool equipped, hit to 0 health) — assert
     2-4 new drop-piece nodes appear scattered around its position (not
     stacked at one point, not an instant backpack credit), each bobbing
     once `exploding` clears.
   - Let two pieces' landing points fall within the consolidation radius (or
     deplete two boulders close together) and confirm they merge into one
     node with a combined `amount` and a visible count label, rather than
     staying as separate nodes.
   - Confirm a pre-placed branch and rock are *not* pulled by the magnet
     (still `loose: false`) even when the player stands next to them.
   - With `magnetEnabled` true, position the player within `MAGNET_RADIUS`
     of a landed (non-exploding) piece and step `update(time, delta)` a few
     times — assert its position moves toward the player and it's eventually
     removed from `nodes` with the backpack credited.
   - Press `V` (or call the handler) and confirm pieces stop moving while
     `magnetEnabled` is false, and an event log entry was added on toggle.
3. `preview_screenshot` to sanity-check the explode scatter, bob, and
   stack-count label render correctly.
4. `preview_console_logs` (level `error`) — no runtime errors.
