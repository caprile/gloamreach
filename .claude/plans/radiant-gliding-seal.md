# M2: Resource node health/multi-hit, tool damage, swing + decay feedback

## Context

Per the locked inventory-overhaul roadmap (see memory `survivor-rpg-inventory-overhaul-plan`
and `STATUS.md`), M1 (unified slot-based item model) and the placement-mode feature are
done. Currently every chop/mine node (tree/boulder) is felled in a single click —
`ResourceNode.deplete()` fires immediately on the first successful `tryInteract()`. M2 makes
trees/boulders take multiple hits, gives tools a damage value (so better tiers fell things
faster later), and adds hit feedback (swing on the player, shake+decay tint on the node) so
multi-hit doesn't feel like clicking into a void. Loose pickups (branch/rock) are unaffected
— they stay single-hit, no tool required, exactly as today.

## Design decisions (scoped deliberately small)

- **Full yield only on the final hit** — no partial resource per hit. This avoids touching
  backpack-overflow logic and matches "loose drops" being explicitly deferred to M3.
- **No health bar / numeric UI** — decay tint + shake communicates progress. Adding a bar is
  a separate, later polish item if wanted.
- **Damage lives on the tool, not the recipe** — a `toolDamage(tool): number` function
  (mirrors the existing `toolKind()`/`requiredKind()` pattern in `ResourceNode.ts`) so future
  tool tiers (e.g. `iron_axe`) just return a bigger number and fell nodes in fewer hits,
  without changing node data.
- **Starting balance:** trees and boulders get `health: 3`; stone-tier tools deal `damage: 1`
  → 3 hits to fell, tunable later. Pickups get `health: 1` (unused in practice since they
  don't go through `takeHit`).
- **Swing animation is a stand-in, not a weapon sprite** — there's no facing direction or
  weapon-visual system in `Player.ts` today (confirmed via exploration), and building one is
  out of scope for this milestone. The "swing" is a quick rotate-punch tween on the player
  sprite itself (angle 0 → 25 → 0, ~140ms, yoyo), enough to register "you just swung" without
  a new asset/animation system.
- **Shake+decay is a new self-contained effect on `ResourceNode`** — no existing shake/flash
  code exists anywhere in the codebase (confirmed via grep), so this introduces the pattern.
  Tween conventions (short duration, named ease strings, cleanup via callbacks) follow
  `EventLogUI.ts`'s existing style.

## Implementation

### `src/entities/ResourceNode.ts`
- Extend `ResourceNodeConfig` with `health: number` (hits to deplete at damage 1).
- Add `maxHealth`/`health` fields, set from `cfg.health` in the constructor.
- Add `takeHit(damage: number): boolean` — decrements `health`, plays hit feedback (see
  below), returns `true` if the node is now depleted (health <= 0) so the caller can award
  resource + call `deplete()`. Returns `false` otherwise (node survives, stays interactable).
- Add a private `playHitFeedback()`: kill any in-flight tweens on `this`, do a quick
  side-to-side shake (`x` +4px, `yoyo: true, repeat: 1`, ~60ms, `Sine.easeInOut`, restoring
  exact `x` on complete), and set a tint interpolated between white (full health) and a
  darker "damaged" shade based on `health / maxHealth` (`Phaser.Display.Color.Interpolate`).
- Add `toolDamage(tool: ToolType): number` next to the existing `toolKind()`/`requiredKind()`
  functions, backed by a `Record<ToolType, number>` (`stone_axe: 1, stone_pickaxe: 1`) — same
  extensibility pattern as `toolKind`.

### `src/entities/Player.ts`
- Add `playSwing()`: stops any existing swing tween, resets `angle` to 0, tweens `angle` to
  25 and back (`yoyo: true`, ~70ms out, `Sine.easeOut`), restoring angle 0 on complete so
  rapid re-clicks don't leave it mid-rotation.

### `src/scenes/MainScene.ts`
- `spawnNodes()`: pass explicit `health` per scatter call — branch/rock: `1`, tree/boulder: `3`.
- `tryInteract()`: for the chop/mine branch (after the existing tool-kind gate), call
  `this.player.playSwing()`, then `node.takeHit(toolDamage(this.equippedTool))`. If it
  returns `false` (not depleted), return early — no backpack credit, node stays in `this.nodes`
  and keeps showing its hover prompt. If `true`, fall through to the existing
  award-resource/deplete/remove-from-array/refreshHud path unchanged. Pickups are untouched
  (no `takeHit` call, same as today).
- Import `toolDamage` alongside the existing `requiredKind`/`toolKind` imports.

No changes needed to `Items.ts`, `Recipes.ts`, or any UI file — this is entity + scene logic
only.

## Addendum (2026-07-06, same-day follow-up): move speed + tool hit-rate cooldown

Right after this milestone shipped, playtesting surfaced that M2's multi-hit
change made LMB-spam farming worse (nothing capped how fast repeated hits
landed), plus a separate complaint that player movement felt too fast. Both
were small enough to fold in as immediate follow-ups rather than their own
milestone:

- `Player.ts`: `SPEED` halved (190 → 95 px/s).
- `src/entities/ResourceNode.ts`: new `toolCooldownMs(tool)`, same
  `Record<ToolType, number>` pattern as `toolDamage`/`toolKind`
  (`stone_axe`/`stone_pickaxe` both `500`ms for now).
- `src/scenes/MainScene.ts`: `tryInteract()` tracks `lastToolHitAt` (via
  `this.time.now`) and bails out silently (no swing, no `takeHit`) if a
  chop/mine hit comes in before the cooldown elapses. Pickups are unaffected.
- This is the first "attack speed" concept in the codebase — the same table
  shape will be reused for weapon attack speed when Combat (roadmap item 4)
  is built.

Verified via `preview_eval`: first hit registers, an immediate second click is
blocked (health unchanged), a hit after the cooldown window lands again. See
`STATUS.md` for the full writeup and the sequencing decided for the other two
requests raised at the same time (stamina, equipped-item-on-player visual).

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — type-check.
2. `preview_start` (config `dev`), then via `preview_eval` against
   `window.__game.scene.getScene('MainScene')`:
   - Give the player a `stone_axe` (add to backpack/hotbar, select the slot so
     `recomputeEquipped()` picks it up), teleport player next to a tree node.
   - Call `tryInteract()` three times (re-hover if needed): assert `node.health` decrements
     each time, wood is NOT credited until the 3rd call, and the node is removed from
     `this.nodes` + `depleted === true` only after the 3rd.
   - Confirm rapid repeated calls don't throw and don't leave `angle`/tint in a stuck state
     (check `player.angle === 0` and node tint reset after tweens settle).
3. `preview_screenshot` to visually confirm the shake/tint darkening across hits, and the
   player's swing rotation mid-tween (may need to screenshot right after triggering a hit,
   before the tween completes).
4. `preview_console_logs` (level `error`) — confirm no runtime errors.
5. Repeat steps for a boulder + stone_pickaxe to confirm the mine path behaves identically.
