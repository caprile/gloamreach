# Plan: Non-solid trees/boulders, Y-depth occlusion fade, no-spawn-in-water fix

## Context

This session picks up the open Milestone B follow-up flagged in `STATUS.md` ("Boar's
obstacle-avoidance movement feels bad") and the first-biome plan
(`.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone B note): the
ground-truth-stuck-detection/escape-heading heuristic in `Enemy.ts` technically works but
reads as an ugly zigzag, and the user flagged it as worth revisiting rather than polishing
further.

Discussed and decided this session:
- **Trees and boulders stop blocking movement** for both the player and Boars — this
  eliminates the zigzag problem at its root (nothing left to get stuck on) rather than
  improving the avoidance heuristic. Structures/walls/mountains will still need real
  blocking collision later; that infrastructure (the `solids` static group) stays in
  place for that future use, it's just no longer fed trees/boulders.
- **Y-depth sorting + occlusion fade**: introduce real top-down depth-sorting (player/
  enemies/trees/boulders draw in front-to-back order by Y position, like Stardew Valley),
  and when a tree/boulder ends up rendering in front of the player, fade *the tree/
  boulder* down to partial alpha (not the player) so the player sprite is never hidden.
- **Line-of-sight aggro gating is *not* a separate system to build**: the user clarified
  the rule is "only things you can't move through block line of sight." Since trees/
  boulders are becoming non-solid this session, they don't block LOS either — there's
  nothing to implement now. This becomes relevant automatically once a future *solid*
  obstacle (wall, mountain, etc.) exists; no code needed today beyond keeping solidity as
  the single source of truth for both concerns going forward.
- **Bug fix**: pre-placed branches and rocks can currently spawn in the creek —
  `scatter()` calls for `branch`/`rock` in `MainScene.spawnNodes()` don't pass
  `avoidCreek: true` (trees/boulders already do). One-line fix, bundled in since it's in
  the same area of code.

## Changes

### 1. `src/scenes/MainScene.ts` — stop water-spawning branches/rocks
In `spawnNodes()` (~L518-519), add `avoidCreek: true` to both the `branch` and `rock`
`scatter()` calls, matching the tree/boulder calls just below them.

### 2. `src/scenes/MainScene.ts` — trees/boulders no longer solid
In the same `scatter()` calls (~L523-525), change `solid: true` → `solid: false` for both
tree calls and the boulder call. The `solids` static group (built at ~L144, colliding
with both `player` and `enemyGroup` at ~L146/153) stays as infrastructure — it'll just be
empty until a future placeable/structure feeds it. No changes needed to the collider
wiring itself, since an empty static group is a harmless no-op.

### 3. `src/entities/Enemy.ts` — remove the now-dead obstacle-avoidance heuristic
With nothing solid left to get stuck on during a chase, the ground-truth stuck-detection/
escape-heading mechanism (STUCK_*/ESCAPE_* constants, `escapeAngle`/`escapeUntil`/
`escapeSide`/`lastProgressCheckAt`/`lastProgressX`/`lastProgressY` fields, and the block in
`update()` that samples displacement and picks an escape heading) is dead weight — delete
it entirely rather than leaving it inert. Chase movement simplifies back to always heading
`directAngle` (straight at the player) every frame.
- The deaggro check's `now >= this.escapeUntil` gate (added specifically to avoid
  interrupting an escape maneuver) is removed along with it — deaggro goes back to a
  plain `dist > DEAGGRO_RADIUS` check.
- The give-up/immunity mechanism (`CHASE_GIVEUP_MS`, `POST_GIVEUP_IMMUNITY_MS`,
  `CLOSE_REAGGRO_RADIUS`, `pursuitClockStart`/`aggroImmuneUntil` and their helpers) is
  unrelated to obstacle avoidance and stays untouched.
- Leave `AGGRO_RADIUS`/`DEAGGRO_RADIUS`/counts as-is — retuning those (Milestone B's
  original "too aggressive" numbers concern) is a separate, not-yet-requested task; don't
  bundle it in silently.

### 4. Y-depth sorting (new behavior — player, enemies, trees, boulders)
Currently there's no Y-sorting at all: `Player` is hardcoded to `setDepth(10)` and `Enemy`
to `setDepth(9)`, both fixed regardless of Y position — the code comment even says this is
deliberately "so the player stays visible." That fixed-depth approach is superseded by
real sorting + the fade fallback below.
- **`Player.ts`**: replace the fixed `setDepth(10)` with a per-frame depth update tied to
  Y (e.g. `this.setDepth(this.y)`), set from `Player.update()` (or wherever the sprite's
  position is finalized each frame) rather than once at construction.
- **`Enemy.ts`**: same idea in the existing `preUpdate()` override (which already runs
  every frame independent of `MainScene`'s cadence, per its HP-bar-sync comment) — depth
  tracks `this.y` instead of the fixed `9`.
- **`ResourceNode.ts`**: trees/boulders are static, so depth can be set once — at
  construction, set depth from the sprite's Y (representing its visual "base"/trunk),
  consistent with the same Y-depth scale player/enemies use. Ground-clutter nodes
  (branches, rocks, loose drop pieces — anything flagged `loose`/pickup-only) keep a low
  fixed depth below the sort range so they never occlude anything, matching today's
  behavior for those.
- Keep existing high fixed depths for true UI/overlay elements untouched (HP bars,
  prompt text, tooltips, toasts, etc. at 1000+/2000+/5000) — only ground-plane entities
  (player, enemies, trees, boulders) move onto the Y-based scale.

### 5. Occlusion fade (new — likely lives in `MainScene`, e.g. a small
`updateTreeOcclusion()` called from `update()`)
For each tree/boulder `ResourceNode`, each frame:
- Skip nodes far from the player first (cheap distance cull) before doing the finer
  overlap check.
- Consider the player "behind" a tree/boulder when they horizontally overlap (within
  roughly the sprite's width) and the player's Y places them above/behind it by less than
  roughly the sprite's height (i.e., the player would currently be visually covered by it
  under the new Y-depth sort).
- When behind: tween/lerp the node's `alpha` down to a partial value (e.g. ~0.45-0.55);
  when not: tween/lerp back to `1`. Use short tweens (matching the existing
  `ResourceNode`/`Enemy` tween-feedback conventions — kill any in-flight alpha tween
  before starting a new one) rather than an instant snap, so it doesn't flicker.
- Only trees/boulders fade — never the player/enemy sprites themselves (per explicit user
  correction: the obstruction fades, not the character).

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first check.
2. `preview_start` (config `dev`) → `preview_screenshot` to confirm boot.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - Confirm no branch/rock nodes exist at creek cells across a full node scan
     (`s.nodes.filter(n => n.resource !== 'wood'/'stone' tree/boulder... )` cross-checked
     with `biome.isCreekAt`).
   - Confirm trees/boulders are absent from the `solids` group / that walking the player
     directly through a tree's position no longer blocks movement (position keeps
     advancing instead of stopping at the collider).
   - Force a Boar into `chasing` directly across a former dense-tree-cluster location
     (the same kind of cluster STATUS.md's obstacle-avoidance testing used) and confirm it
     now cuts straight through in a smooth, non-zigzag path.
   - Sample player/enemy `depth` while moving vertically past a tree's Y and confirm it
     crosses over/under the tree's depth as expected; sample the tree's `alpha` during that
     pass and confirm it dips then recovers to `1`.
4. `preview_screenshot` for the visual read: player walking through a dense tree area,
   catching at least one frame where a tree is partially transparent with the player
   visible "through"/behind it.
5. `preview_console_logs` (level `error`) — Phaser boot banner / Vite HMR noise is normal,
   no real errors expected.
6. Regression-check that chop/mine interaction (hover prompt, tool-kind gating, reach)
   still works on trees/boulders now that they're non-solid — reach/interact logic is
   manual distance math (`REACH`), not collision-based, so it shouldn't be affected, but
   confirm via `preview_eval`.
