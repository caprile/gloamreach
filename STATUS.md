# Status

Last updated: 2026-07-07

### Just finished: 16:9 resolution, smoothed biome borders, crafting-menu inventory count

Three small QoL fixes requested in the same session, unrelated to each other:

- **Resolution**: `main.ts`'s Phaser config was a fixed 800x600 canvas from the very first
  session. Bumped the base resolution to 1920x1080 and added `scale: { mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH }` so it scales to fit the browser window
  letterboxed at 16:9 instead of stretching or clipping. Verified safe first — every HUD
  element already anchors off `scene.scale.width/height` rather than hardcoded 800/600
  (`CraftingMenu`, `Tooltip`, `EventLogUI`, `HotbarUI`, `MainScene`'s HP/stamina bars), so
  nothing needed repositioning.
- **Biome border smoothing**: the forest/grassy/creek overlay bake
  (`MainScene.buildBiomeTexture()`) previously filled one flat-colored rectangle per 40px
  `Biome` zone-lookup cell, so boundaries were big jagged 40px staircases. `Biome.ts` now
  exposes `forestWeight(x,y)`/`creekWeight(x,y)` — bilinear interpolation across the same
  underlying zone/creek grids (cell values anchored at cell centers) — and the bake
  supersamples at an 8px stride, blending each overlay's alpha by the interpolated weight
  instead of a hard on/off fill. Same zone data, same gameplay grid/queries
  (`zoneAt`/`isCreekAt` untouched, still hard-edged for spawning logic) — only the render
  bake changed, into a soft multi-cell gradient band that reads as a rounded line.
  `forEachCell()` (now unused) was deleted rather than left dead. Verified visually via
  `preview_screenshot`: forest/grassy boundary is a smooth wavy curve, not a staircase.
- **Crafting menu**: the `*` prefix on already-crafted-at-least-once recipes (`isOwned`)
  is gone — per user feedback it read as visual noise. In its place, the recipe **detail**
  panel (opened by clicking a recipe) now shows `In inventory: X` (via
  `backpack.count(outputKey(recipe))`) for any recipe whose output actually lands in the
  backpack — skipped for placeable recipes (build pieces go into the world, not the
  backpack, so a count would always read 0). `CraftingMenuDeps.isOwned` and its only
  caller (`MainScene.createCraftingMenu`) were removed as dead code rather than left
  unused. Verified via `preview_eval`: crafted a Stone Axe with the detail panel open,
  confirmed the line went from `In inventory: 0` to `In inventory: 1` live.

### Just finished: Trees/boulders no longer solid + Y-depth occlusion fade + no-spawn-in-water fix

Plan file: `.claude/plans/review-the-plan-and-witty-cloud.md`. Resolves the Milestone B
follow-up below by picking the "let enemies (and the player) walk through trees" option
over improving the escape-heading heuristic further, plus adds a Stardew-Valley-style
occlusion fade and fixes a water-spawn bug surfaced in the same discussion.

- **Trees/boulders are no longer solid** (`MainScene.spawnNodes()`): their `scatter()`
  configs flipped `solid: true` → `false`, so they're no longer added to the `solids`
  static group. That group (and its colliders against both `player` and `enemyGroup`)
  stays wired up unchanged — it's just empty for now, reserved for future
  structures/walls/mountains that genuinely should block movement.
- **`Enemy.ts`'s obstacle-avoidance heuristic was deleted outright**, not left inert: the
  ground-truth stuck-detection + randomized near-tangent escape-heading + per-instance
  `escapeSide` mechanism (see the entry below) is gone along with its constants
  (`STUCK_CHECK_INTERVAL_MS`, `STUCK_DISPLACEMENT_PX`, `ESCAPE_DURATION_MS`) and fields.
  With nothing solid left to get stuck on, chase movement is back to a plain "always head
  straight at the player" angle every frame. Verified via `preview_eval` with real physics
  ticks: a Boar forced into `chasing` across the map's densest tree cluster (auto-detected
  the same way prior sessions did) cut a perfectly straight line through it (y didn't
  move at all, x closed monotonically) all the way to melee range — no zigzag.
- **Y-depth sorting (new)**: previously `Player`/`Enemy` were pinned to fixed depths
  (10/9) regardless of Y position specifically so trees could never visually cover them —
  a comment on `Player.ts` said so outright. That's superseded now: `Player` and `Enemy`
  both track `depth = this.y` every frame (in their own `preUpdate()` overrides, so it
  keeps working even while the player is frozen on death), and `ResourceNode` sets a
  one-time `depth = y` at construction for any non-pickup node (trees/boulders — ground
  clutter like branches/rocks/loose drops stays at the default depth, never occluding,
  same as before). The player's equipped-item icon and the enemy HP bar both now track
  `owner.depth + 1` per frame instead of a stale fixed depth, so they stay glued visually
  on top of whichever owns them regardless of the new Y-based scale.
- **Occlusion fade (new)**: `MainScene.updateTreeOcclusion()`, run every frame (both the
  normal path and the death-freeze path, alongside `updateMagnet`/`updateEnemies`), fades
  a tree/boulder's alpha down (to `0.45`) when the player is horizontally overlapping it
  and positioned close enough "above/behind" it (per the new Y-sort) that it would
  otherwise be drawn over them — and back to `1` once they're clear. Deliberately **fades
  the obstruction, not the player/enemy** (explicit user correction during planning — the
  Stardew-style effect people usually mean is "make the thing in front translucent," not
  "make the character translucent"). Implemented as a manual per-frame `Phaser.Math.Linear`
  alpha lerp rather than a Tween, specifically so it can't fight
  `ResourceNode.playHitFeedback()`'s own tweens (shake/tint) on the same object. A
  dedicated `obstacleNodes` array (populated alongside `nodes` in `spawnNodes()`, filtered
  to non-pickup nodes) avoids filtering the full, much larger `nodes` list every frame.
  Verified via `preview_eval`: placing the player directly above a tree dropped its alpha
  to `0.46` within 500ms and raised the player's computed depth below the tree's (matching
  the intended draw order), and moving far away recovered it back to `~1`.
  `preview_screenshot` confirms the visual read — a faded, ghostly tree with the player
  (blue square) fully visible in front of it, distinct from the solid-green unfaded trees
  elsewhere in frame.
- **Bug fix**: pre-placed branches/rocks could previously spawn inside the creek (their
  `scatter()` calls never passed `avoidCreek: true`, unlike trees/boulders which already
  did). Now both do. Verified via `preview_eval`: scanning every pre-placed branch/rock
  against `biome.isCreekAt()` returns zero hits.
- **Line-of-sight-gated aggro was explicitly scoped out** — raised as a discussion point,
  but the user clarified the intended rule is "only things you can't move through block
  line of sight." Since trees/boulders are now non-solid, they don't block LOS either —
  there's nothing to build this session. This becomes relevant automatically once a
  future *solid* obstacle (wall, mountain, etc.) exists; no code was added for it now
  beyond keeping solidity as the single source of truth for both movement-blocking and
  (eventually) LOS-blocking.
- Regression-checked: chop/mine hover/interact (manual `REACH` distance math, not
  collision-based) is unaffected by trees/boulders going non-solid — confirmed via
  `preview_eval` (equipping a stone axe and hovering a tree still resolves
  `[LMB] Chop`). No console errors throughout. Type-check clean.

### Noted, not acted on: Boar's obstacle-avoidance movement feels bad

User feedback after the "stuck between multiple trees" fixes (below): the movement
*works* now (no more freezing/oscillating/losing the player — see those entries), but the
zigzag pattern from the randomized near-tangent escape headings "is kind of trash" to look
at. Two directions raised, **neither implemented**: (1) smooth/improve the avoidance
heuristic itself, or (2) skip the problem entirely by letting Boars **walk through trees**
(exempt tree solids from the enemy collider). Needs a product decision first — logged in
the plan file (`.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone
B's follow-up note) and in memory, to revisit whenever Milestone B (Boar tuning) is
actually picked up.

### Just finished: default "give up after prolonged failed pursuit" behavior

Formalizes a standing decision (see memory / the note in the Combat
foundation entry below) with concrete numbers, implemented as **reusable
base-class behavior on `Enemy`** (not a Boar-only special case), so future
enemies that subclass `Enemy` can opt into the same mechanism instead of
reimplementing it:

- **`CHASE_GIVEUP_MS` (30s):** if continuous pursuit (`state === "chasing"`)
  runs this long without landing a single attack, the enemy gives up —
  `state` flips to `"idle"` and it enters a **re-aggro immunity window**
  (`enterGivenUpState()`). This is a *pursuit* clock (`pursuitClockStart`),
  distinct from the pre-existing distance-based deaggro
  (`dist > DEAGGRO_RADIUS`) — that one still fires instantly with no
  immunity, since "the target simply walked away" isn't the same as "I've
  been trying and failing for half a minute."
  - The clock resets on `startPursuit()` (fresh chase begins) and
    `markAttackLanded()` (an attack actually connects) — a fight that's
    landing hits never times out, only a fruitless one does.
- **`POST_GIVEUP_IMMUNITY_MS` (5s):** while active, ordinary aggro-radius
  proximity (`canAggro()`) is ignored — the enemy won't re-engage just
  because the player is nearby again, for a short cooldown.
- **Two overrides, both requested explicitly:**
  1. **`CLOSE_REAGGRO_RADIUS` (50px):** proximity tighter than this still
     re-triggers aggro even mid-immunity — the player standing right next to
     a "fled" enemy still wakes it up.
  2. **Being attacked** (`takeHit()`) unconditionally clears
     `aggroImmuneUntil` and, if idle, immediately flips back to `"chasing"`
     — an enemy doesn't pointlessly tank hits without fighting back just
     because it recently gave up.
- Implemented as `protected` fields/helpers (`pursuitClockStart`,
  `aggroImmuneUntil`, `startPursuit`/`markAttackLanded`/`hasGivenUpPursuit`/
  `canAggro`/`enterGivenUpState`) on the `Enemy` base class specifically so a
  future subclass overriding `update()` entirely (per the standing "don't
  assume the 3-state machine is final" decision) can still call the same
  helpers rather than re-deriving the mechanism — the *numbers* stay
  per-enemy-tunable, but the *mechanism* is meant to be a shared default.

Verified via `preview_eval`, all via direct state manipulation rather than
waiting 30 real seconds (reading/writing the "private" TS fields works fine
at runtime): backdating `pursuitClockStart` by 31s while mid-chase (dist
inside aggro, outside melee, so no bite could land and reset the clock)
correctly gave up and set a ~5s immunity window; staying within ordinary
aggro range during that window correctly held `idle`; moving within
`CLOSE_REAGGRO_RADIUS` correctly force-reaggro'd mid-immunity; calling
`takeHit()` on an idle+immune enemy correctly cleared immunity and flipped
to `chasing` synchronously; letting immunity expire naturally (backdating
`aggroImmuneUntil` into the past) correctly allowed normal-range re-aggro
again; landing an actual bite mid-chase correctly reset the clock (confirmed
`pursuitClockStart` recent afterward); and — checked separately with an
explicit clean-slate reset after an earlier test's incidental interaction
briefly muddied one assertion — plain distance-based deaggro (target simply
out of `DEAGGRO_RADIUS`) still sets **no** immunity and re-aggros instantly
on return, unchanged from before this feature. No console errors.

### Just finished: Milestone A — world resize + procedural biome generation

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (the
"first-biome content pass" — 7 milestones A–G; **only A is done**, B–G are
future sessions). This is the foundation the enemy/spawn milestones (B Boar
tuning, C Gremlin, D Snake) all depend on.

The flat 1280x960 single-grass world is now a **2560x1920 procedurally
generated biome** with three readable sub-areas:

- **`src/systems/Biome.ts`** (new) — framework-light like `Stamina.ts` (only
  `Phaser.Math.RandomDataGenerator`, owns no GameObjects). A coarse **40px
  zone-lookup grid** (deliberately independent of the 32px render `TILE` — it's
  a gameplay/query grid, not a tilemap; 64x48 = 3072 cells, flat arrays).
  Generation: (1) **Voronoi** — 6-10 random seed points each tagged
  forest/grassy, every cell takes its nearest seed's type; (2) **cellular-
  automaton smoothing** (4 passes, double-buffered, flip a cell when ≥5/8
  Moore neighbors disagree) to round the jagged Voronoi edges into organic
  blobs; (3) a separate **random-walk creek** carved edge-to-edge (horizontal
  or vertical, wobbling laterally, tapering 1-2 cell width) into its own
  `boolean[]` grid decoupled from zone type — a cell can be forest AND creek.
  A **degenerate-layout guard** re-rolls (cap 3) if either zone covers <10%.
- **Query API:** `zoneAt(x,y)` and `isCreekAt(x,y)` — both O(1) flat-array
  bounds-checked lookups. `isCreekAt` is deliberately the cheap primitive a
  future **"Wet" status debuff** hooks into (creek is visual-only + walkable
  this pass — no collision, per user decision).
- **Rendering** (`MainScene.buildBiomeTexture()`): a **one-time bake** into a
  single world-sized `RenderTexture` at depth -9 (grass tileSprite dropped to
  -10, all entities stay at default 0 above both). Forest cells get a
  translucent darker-green overlay; grassy cells left showing the base grass;
  creek cells a translucent blue on top. Flat per-cell fills keep the visual
  WYSIWYG with the gameplay grid (no art/logic mismatch). One GameObject total
  — not one per tile.
- **Zone-biased spawning** (`spawnNodes`/`spawnEnemies`): new `pickSpawnPoint(rng,
  preferred, clearRadius, avoidCreek)` helper does **rejection sampling** (cap
  200 attempts, graceful fallback to last draw so a tiny/absent zone can't
  hang). Trees are **dense in forest (70) + sparse in grassy (14)**; boulders
  (18) prefer grassy; branches (40) prefer forest; loose rocks (30) anywhere;
  8 Boars prefer forest. Trees + boulders pass `avoidCreek: true` — the creek
  overlays forest/grassy cells, so without it a "forest" point could land a
  tree on the water (looked wrong). Counts scaled up for the 4x-area world.
- **Follow-up tuning (same session, from playtest feedback):** tree density
  raised and split forest/grassy (was a flat 28 forest-only); trees pulled off
  the creek; Boar **`BITE_DAMAGE` 8 → 25** so ~4 bites kill a full-health (100)
  player — the old 8 (≈12 hits) felt far too weak. Boar count/aggro-radius
  tuning is still **Milestone B**; only the damage was bumped here on request.
- **Unrelated bug fixes bundled in (playtest reports, not part of any
  milestone):** (1) Boars had **no obstacle avoidance** — the chase branch
  aimed straight at the player every frame, so a tree/boulder directly between
  them fully blocked the Boar (it just pushed into the solid forever). Fixed
  with a minimal steer-around: `Enemy` now checks `body.touching.none` (set by
  the existing collider against the solids group) and, if blocked, offsets the
  chase angle by a **fixed per-instance ±60°** (`avoidDir`, randomized once at
  construction so it doesn't flicker between left/right every frame) to slide
  along the obstacle instead of pushing into it. Not real pathfinding — just
  enough to get around a single tree. (2) The Boar sprite never flipped to
  face its direction of travel. Added `applyFacing(vx)` (flips `flipX` once
  horizontal velocity is decisive, i.e. `|vx| > 5`, to avoid flicker near
  zero), called from both the chase-move and idle-wander branches, plus once
  when settling into bite range (faces the player). Verified via `preview_eval`
  with **real physics ticks** (not manual position math): placed a Boar and
  player on opposite sides of a real tree, forced `chasing`, and let 2.5s of
  actual physics run — distance-to-player closed (90px → 78.5px) instead of
  staying frozen, and `flipX` matched the sign of `body.velocity.x`. Ran
  longer (6 more seconds) and confirmed the Boar fully closed the gap, bit the
  player enough times to kill them at the new 25 dmg rate, and the existing
  death/respawn pipeline fired correctly (teleport to world center, health
  reset to 100, no console errors) — full end-to-end proof the chase-around-
  obstacle path actually reaches and kills, not just "unstuck but never
  arrives."
- **Follow-up fix to the fix (same session, from a second playtest report):**
  the reactive per-frame `touching` check above still visibly vibrated left-
  right in place at certain approach angles — losing contact for a single
  frame immediately re-aimed straight at the player, which re-hit the
  obstacle next frame, re-triggering avoidance, forever. Fixed with
  **hysteresis**: a new `avoidUntil` timestamp is (re-)armed to `now +
  AVOID_HOLD_MS` (450ms) every frame contact is detected, and the offset
  heading stays committed until that window fully expires — so it now commits
  to a slide for at least ~450ms past the *last* contact instead of
  re-deciding every frame. Also widened the offset from ±60° to a fixed ±90°
  (`AVOID_TURN`). Also addressed in the same pass: **the Boar only ever
  flipped left/right** — replaced with **full continuous rotation**
  (`applyFacing(vx, vy)` now calls `setRotation(Math.atan2(vy, vx) + Math.PI)`,
  the `+PI` correcting for the texture's nose being drawn pointing left at
  rotation 0), so it now visibly points in its exact direction of travel
  instead of only two discrete states. Skips the rotation update when
  velocity is near-zero so it keeps its last facing while stopped/biting.
  Verified via `preview_eval` sampling real position/velocity/rotation every
  150ms for 3.6s with a Boar and player placed in exact head-on alignment
  across a tree (the reported "stuck" geometry): only **3 heading changes**
  occurred (each held 150-1050ms, not per-frame), rotation values were
  genuine intermediate angles (90°→1°→8°→...→129°→...→166°, not just 0°/180°
  snaps), and the Boar again fully closed the gap and killed the player
  (health reset to 100 + `isDead: false` afterward, matching a completed
  death/respawn cycle) — repeat proof it reliably reaches the target now, not
  just "visibly calmer but still failing to arrive." No console errors.
- **Third round (same session, "still gets stuck between multiple trees"):**
  the touching-flag/hysteresis approach above was fundamentally too easy to
  defeat with 2+ close obstacles — a fixed offset angle could just aim
  straight into a *second* tree, wedging the Boar (frozen, near-zero velocity,
  for 5+ seconds straight in one reproduction). Replaced the whole mechanism
  with **ground-truth stuck detection**: every `STUCK_CHECK_INTERVAL_MS`
  (350ms), compare actual displacement to `STUCK_DISPLACEMENT_PX` (12); if
  too small, commit to a **randomized escape heading** for
  `ESCAPE_DURATION_MS` (900ms) instead of re-deciding every frame. This alone
  fixed the permanent-freeze case but surfaced two follow-on bugs, found via
  `preview_eval` traces with real physics ticks (position/velocity/state
  sampled every 150-300ms) against deliberately placed obstacle clusters
  (found by scanning `s.nodes` for trees within 70-90px of each other) with
  every *other* enemy parked off-map to rule out cross-contamination (an
  earlier trace briefly looked like a "runaway" bug but was actually a
  *different*, untracked Boar independently killing the player mid-test):
  1. **Escape angle range had a net-backward bias.** The first attempt biased
     escape headings to ±(99°-162°) off the direct-to-player line to avoid
     "near-forward" (re-hits the obstacle) — but that whole range has a
     *negative* cosine projection onto the goal direction, meaning every
     single escape attempt had a small backward component. Chained across
     several consecutive stuck-cycles (common against a real 3-4 tree
     cluster), this reliably walked the Boar out past `DEAGGRO_RADIUS` over a
     few seconds. Fixed by narrowing the range to near-tangent, ±(65°-100°) —
     roughly perpendicular to the goal, which slides around an obstacle at
     close to constant distance instead of steadily retreating.
  2. **Deaggro could fire mid-maneuver.** Even with a good escape angle,
     `state` flips `chasing`→`idle` the instant `dist > DEAGGRO_RADIUS`
     (140/200 at the time) on ANY frame — including mid-escape, when the
     Boar is deliberately taking a temporary detour. Getting flipped to idle
     right then abandoned the maneuver permanently (it'd just idle-wander a
     step away from finishing). Fixed by gating the deaggro check on
     `now >= escapeUntil` (only allowed once the current escape commitment
     has fully ended) and widening `DEAGGRO_RADIUS` 200→**280** to give
     chained escape attempts against wide/dense clusters more slack before
     giving up at all.
  3. **Escape side re-randomized on every stuck-trigger**, which zigzagged
     between both sides of a wide obstacle instead of committing to one edge
     (classic wall-following needs a persistent side). Replaced the per-
     trigger coin flip with `escapeSide: 1 | -1`, fixed once per Boar
     instance (mirroring the original `avoidDir` idea from the first
     attempt, but now combined with the corrected tangent-range angle and
     ground-truth stuck detection instead of the flawed `touching`-flag
     reactive version).
  - **Verified** via `preview_eval` against the map's actual densest tree
    clusters (auto-detected by scanning `s.nodes` for trees within 70-90px of
    each other, 2-4 trees per cluster), placing the Boar and player at a fixed
    150px separation through each cluster's centroid (a bbox-edge-relative
    placement was tried first and turned out to be its own test bug — wide
    clusters could push the *initial* separation past `DEAGGRO_RADIUS` before
    any movement happened at all, invalidating that run). Across multiple
    dense (3-4 tree) clusters, the Boar consistently reached melee range
    (worst observed case: ~8.4s against a 4-tree cluster; most resolved in
    2-5s) without freezing, oscillating, or losing the player. Also hit (and
    recovered from) the documented "backgrounded preview tab stalls Phaser's
    loop" quirk mid-testing — resolved per `CLAUDE.md`'s guidance by
    `preview_stop`/`preview_start` fresh rather than trusting a stuck tab's
    output. No console errors. This remains a **heuristic, not real
    pathfinding** (none exists in the project) — it resolves every
    configuration tested during this pass, but isn't a mathematical
    guarantee against arbitrarily adversarial obstacle layouts.
- **Seeded-RNG convention changed:** biome layout, node scatter, and enemy
  scatter are now **three separate session-random generators** (`sessionRng()`,
  seeded off `Date.now()` + `Math.random()`), replacing the old fixed strings
  (`"explore-and-gather"`, `"boar-country"`). Rationale: once the biome layout
  is random per session, a fixed content seed no longer reproduces a coherent
  world anyway, so the reproducibility benefit was already gone.

Verified via `preview_eval` (world 2560x1920 / 64x48 grid; a sampled layout at
forest 0.69 / grassy 0.31 / creek 0.06 with all 28 trees + 8 boars in forest and
all 18 boulders in grassy — zone bias working; **40 fresh random seeds** all
landed in [0.11, 0.86] forest coverage with zero degenerate layouts, confirming
the re-roll guard) plus `preview_screenshot` (winding blue creek, darker forest
vs lighter grassy, entities placed sensibly). Type-check clean, no console
errors.

### Combat polish pass (same day, right after the foundation landed)

Three small enhancements requested after trying the Combat foundation out:

- **Axe doubles as a weapon** — `stone_axe` now carries both `tool:
  "stone_axe"` and `weapon: "stone_axe"` in its `ItemDef` (`src/systems/
  Items.ts`). Since `MainScene.recomputeEquipped()` already derives
  `equippedTool`/`equippedWeapon` independently from the same selected
  hotbar stack, this needed zero scene-level changes — having the axe out
  now lets you both chop trees and fight, no separate weapon slot.
  `WeaponType` (`src/systems/Weapons.ts`) gained a `"stone_axe"` member with
  its own combat numbers (6 dmg/500ms/12 stamina — distinct from its
  `toolDamage` of 1 used for chopping, since those are tuned against very
  different health pools). Pickaxe wasn't extended the same way (not asked
  for), but the same one-line change would do it if wanted.
- **Enemy HP bars** — `Enemy.ts` now owns a thin (22x3px) two-Rectangle bar
  (dark track + red fill, no number) that stays glued above the sprite via
  a `preUpdate()` override — the same "sync every frame regardless of
  MainScene's own update cadence" trick `ResourceNode` already uses for its
  count label. Always visible (not gated on "has taken damage"), destroyed
  alongside the enemy in `playDeathFeedback()`.
- **Floating damage numbers** — `MainScene.spawnDamageNumber(x, y, amount)`
  spawns plain white/black-outline text at the hit enemy's position that
  rises 24px and fades over 700ms, then destroys itself. Called from
  `tryAttackEnemy()` right after `enemy.takeHit(dmg)`. Deliberately just a
  plain number for now — damage types (slash/pierce/blunt) and resistances
  were flagged as a "later" concern, not built; the spot to hook in
  type-based coloring is called out with a comment on `spawnDamageNumber`.

Verified via `preview_eval`: axe equips as both tool and weapon
simultaneously from one hotbar slot; an axe hit deals exactly 6 (not the
tool's chop damage of 1); the HP bar's fill `scaleX` matches
`health/maxHealth` after a real frame tick and its position tracks the
enemy after it moves; the damage-number text object carries the exact
weapon damage dealt and becomes inactive/alpha-0 (destroyed) ~700ms later
(captured by temporarily wrapping `scene.add.text` to grab the exact
object, since a naive "any Text with digit content" filter was catching
the unrelated stamina/HP bar labels); enemy HP bar Rectangles are destroyed
(not leaked) when the enemy dies. Type-check clean, no console errors.

**Balance observation, not acted on:** during testing, a fresh spawn's HP
dropped noticeably within a few real seconds of idling — 6 Boars scattered
in a 1280x960 world with a 140px aggro radius and only a 150px spawn-clear
zone means an enemy can start closing in almost immediately. Not asked to
fix; flagging in case it feels too aggressive once played for real (easy
knobs: bigger clear zone, smaller aggro radius, or fewer Boars).

**User decision on future enemy variety (2026-07-06):** the shipped Boar is
a **proof-of-concept for the player/enemy interaction loop**, not a
template whose exact numbers get copied onto future enemies. As
Gremlin/Snake and later enemies get built, each is expected to tune its own
**aggro radius + aggro condition**, **deaggro time/radius/condition**,
**DPS**, **HP**, **speed**, and **attack methods** independently — including
different *conditions*, not just different numbers on the same logic (e.g.
a future enemy might aggro on line-of-sight or noise instead of flat
radius, or deaggro on a timer instead of radius hysteresis). Implication:
don't generalize `Enemy.ts`'s current constants into one shared config
table too early, and don't assume the current idle/chase/bite three-state
machine is the final shape — revisit the architecture once a second enemy
actually needs different behavioral logic, not just different numbers. See
the plan file's section 19 for the fuller note.

### Just finished: Combat foundation (roadmap item 4, scoped down)

Plan file: `.claude/plans/polymorphic-sparking-lynx.md`.

The user's first-biome design notes (folded into `CLAUDE.md`'s "First biome
— content notes" section) describe a much bigger combat roster than one
pass could reasonably cover — 3 enemies with distinct AI, a ranged
Slingshot/ammo system, Workbench gating. Asked to scope it down, the user
picked **"Foundation + one enemy"**: build the real combat systems (health,
facing, equipped-weapon visuals, melee equip, death/respawn) against a
single simplified enemy, leaving Gremlin/Snake/ranged/ambush/charge/
fire-fear/Workbench as explicit follow-ups.

- **`src/systems/Health.ts`** (new) — a Phaser-free pool adapted from
  `Stamina.ts`'s shape but not copied verbatim: `takeDamage`/`heal`/`reset`/
  `isDead`, no passive regen (that's deferred to a future food/rest system).
- **Facing direction** (`src/entities/Player.ts`) — the player finally
  tracks a 4-way `Facing` (`up`/`down`/`left`/`right`), persisting while
  idle, vertical winning ties on diagonal input. Widened `PlayerFrameResult`
  to report it every frame.
- **Equipped-item-on-sprite visual** — long deferred (per `CLAUDE.md`,
  pending "a real facing/weapon-attachment system"). Resolved with zero new
  art pipeline: `Player` attaches a small child `Image` reusing the
  item's existing 24x24 icon texture (the same ones already baked for
  tooltips), offset 16px from the player's center in the current facing
  direction, hidden when nothing's equipped. `MainScene.recomputeEquipped()`
  is still the single place equip state is derived — it now also drives
  this icon (`player.setEquippedIcon(...)`), and calls
  `player.syncEquippedIconPosition()` every frame (even during the death
  freeze) so it never lags a moved/teleported player.
- **Melee weapon equip** (`src/systems/Weapons.ts`, new) — `WeaponType =
  "wood_club" | "stone_club"` plus damage/cooldown/stamina-cost tables,
  exactly mirroring `ResourceNode.ts`'s existing tool-table pattern.
  `ItemDef` gained a `weapon?: WeaponType` field alongside `tool?: ToolType`;
  `wood_club`/`stone_club` (previously inert item stubs with display-only
  "Damage" tooltip text) now actually equip via the hotbar, the same way
  tools already did — no parallel equip path.
- **`src/entities/Enemy.ts`** (new) — a single enemy for this pass, "Boar":
  an Arcade-physics sprite (unlike the non-physics `ResourceNode`) with a
  simple idle-wander / chase state machine (aggro 140px, deaggro 200px —
  hysteresis to avoid boundary flicker) and a cooldown-gated melee bite (8
  dmg, 1s cooldown). `takeHit()`/hit feedback (shake + white-to-red tint
  lerp) mirror `ResourceNode`'s feel; `playDeathFeedback()` fades and
  destroys, then hands control back to `MainScene` to award loot. No charge
  attack, no fire-fear, no ranged attack — explicitly out of scope.
- **Attack reuses the existing hover/interact model**, not a parallel one —
  `updateHover()` now tracks whichever of a `ResourceNode` or an `Enemy` is
  closest to the cursor (only one prompt ever shows), gated the same way
  tool-kind gating already works: no weapon equipped → show nothing; weapon
  equipped + in reach → `[LMB] Attack <name>`. `tryInteract()` dispatches to
  a new `tryAttackEnemy()` when an enemy is hovered, using the identical
  cooldown/stamina-afford/silent-fail guard shape `tryInteract()`'s tool
  branch already used.
- **Enemy death loot** reuses the existing loose-drop/magnet pipeline
  unchanged rather than instant-crediting the backpack — `ResourceType`
  widened to include `boar_meat` (same trivial-extension precedent as
  `leather`), dropped via `spawnLooseDrop("boar_meat", ...)` at the kill
  position.
- **Player death & respawn** — a new `Health` instance on `MainScene`,
  a red HP bar stacked directly above the stamina bar (same
  `hotbarUI.top`-anchored construction pattern, 28px higher). On death:
  freezes the player (skips `Player.update()` entirely, though ambient
  systems — stamina tick, magnet, enemy AI, equipped-icon sync — keep
  running so the world doesn't visually pause too), toasts "You died...",
  and after a 2s delay teleports back to world-center spawn, refills health,
  and grants a 1.5s post-respawn invulnerability window. New `"combat"`
  `LogKind` (red-ish) added to `EventLog`/`EventLogUI` for all of this
  rather than overloading `"info"`.
- 6 Boars scattered map-wide via the same seeded-RNG scatter pattern
  `spawnNodes()` already used (slightly larger clear zone around player
  spawn); a physics collider keeps player/enemy bodies from passing through
  each other, but the actual bite/attack range check stays manual distance
  math against a tight `MELEE_RANGE` (28px) — consistent with how `REACH`
  already works, not a Phaser overlap callback.

Verified via `preview_eval` (facing tracking + persistence while idle;
equipped-icon visibility/texture/position-by-facing and hiding on an empty
slot; tool/weapon equip mutual exclusivity; enemy idle/chase state
transitions and velocity direction; melee attack cooldown and stamina-
afford gating both silently blocking extra hits; a full kill draining
exact per-hit damage, removing the enemy, logging "Defeated Boar", and
crediting `boar_meat` to the backpack via the existing magnet pipeline;
one-shot player death freezing movement while leaving enemy AI running;
automatic respawn via the real delayed-call timer resetting position/
health and opening the invulnerability window) plus `preview_screenshot`/
`preview_inspect` for the HP bar (exactly 28px above the stamina bar,
matching X/width) and the on-player equipped-icon rendering. Regression-
checked the existing chop/mine flow and confirmed hovering a node vs. an
enemy always resolves to exactly one prompt (whichever is closer). Type-
check clean, no console errors.

### Follow-up tuning pass on the stamina bar/panels (same day)

Right after the stamina milestone landed, the user requested a round of
polish based on actually seeing it in the preview:

- **Bar visuals** — was a bright cyan 220x14 bar with a color-shift-on-
  deplete effect; now a small (76x20, ~1.5-2x a hotbar slot) fixed dark
  goldenrod (`0xb8860b`) bar with no color changes on deplete/regen, and a
  centered numeric text label (`staminaBarText`) showing the rounded current
  value (e.g. `"72"`).
- **Event log relocated** — was bottom-right, expanded by default, growing
  upward. Now stacks directly under the top-left Keybinds panel (both
  `PANEL_X = 12`, same width), defaults **collapsed** like Keybinds, and
  grows downward. This was ahead of the bottom-center HUD area (hotbar +
  stamina bar) getting busier as more bars land there.
  - **Real coupling needed, not just a one-time position**: since
    `KeybindsUI` can expand/collapse independently, `EventLogUI`'s top
    position has to track it live, not just be computed once at
    construction — the first pass (`topY` set once in the constructor) left
    the Log panel overlapped whenever Keybinds was expanded after Log was
    already positioned, caught via `preview_screenshot` during verification.
    Fixed with `KeybindsUI(scene, binds, onToggle?)` — an `onToggle` callback
    fired after every collapse toggle — wired in `MainScene` to call the new
    `EventLogUI.setTopY(keybindsUI.bottom + 8)`, so Log always repositions
    the instant Keybinds' height changes.
- **Stamina usage bumped up** — the shipped numbers (`SPRINT_DRAIN_PER_SEC:
  18`, `DASH_STAMINA_COST: 15`, `toolStaminaCost: 6`) felt too cheap. Now
  `SPRINT_DRAIN_PER_SEC: 33` (a full 100-stamina bar drains from continuous
  sprint in ~3s — matches the user's explicit target), `DASH_STAMINA_COST:
  25` (4 dashes/full bar), `toolStaminaCost: 12` (both stone tools). Regen
  (20/s, 800ms delay) unchanged — draining faster than it refills is
  intentional.
  - **Forward-looking note left as a comment** (`src/systems/Stamina.ts`,
    next to `MAX_STAMINA`): a future food system will scale max stamina down
    as food depletes, with 0 food intended to reach roughly this same
    "~3s full sprint" feel on a much smaller pool. Not implemented — no food
    system exists yet — just documented so the eventual hookup target is
    clear.

Verified via `preview_eval` (sprint draining the full bar in ~3.1s real
time, confirmed via `performance.now()` timing, with the bar's text reading
`"0"` and speed reverted to base at the end) and `preview_screenshot`
(bar size/color/number, Log correctly stacked under both collapsed and
*expanded* Keybinds — the overlap bug was caught this way before the
`onToggle` fix). Type-check clean, no console errors.

### Just finished: Stamina, sprint, dash (roadmap item 3)

Plan file: `.claude/plans/read-the-plan-from-happy-ripple.md` (was only in the
global plans dir at the time; recovered and copied into the repo later — see
CLAUDE.md's "Plans must be committed in-repo" convention).

The player now has a stamina pool — the first player stat/resource bar in
the game (no health system exists yet either):

- **`src/systems/Stamina.ts`** (new) — a small Phaser-free state class:
  `current`/`max`, `canAfford(amount)`, `spend(amount)` (fails silently if
  unaffordable, re-arms a regen delay on success), and `tick(delta)` (called
  every frame from `MainScene.update()`, regenerates after the delay elapses).
  100 max, ~20/s regen, an 800ms delay after any spend before regen resumes.
- **Sprint** — hold **Shift** while moving multiplies speed by 1.6x and
  drains stamina at 18/s. Gated on affording *that frame's* drain cost
  (not just "stamina > 0") — an early version used a `> 0` check and a bug
  surfaced during `preview_eval` testing: a partial remainder too small to
  spend would sit there regenerating just enough to keep passing a `>0`
  check forever, so sprint's speed multiplier never actually turned off
  under sustained holding. Fixed by checking `canAfford(costThisFrame)`
  instead, matching how dash is already gated.
- **Dash** — **Spacebar** while holding a movement direction triggers a
  quick 340px/s burst for 160ms, spending 15 stamina and starting its own
  600ms cooldown (independent of stamina, so it can't be chain-spammed even
  with a full pool). `Player.update()` was widened to
  `update(delta, canSprint, canDash): PlayerFrameResult` — `MainScene`
  computes both stamina gates and reads back `sprinting`/`dashStarted` to
  know what to spend, rather than `Player` reaching into scene state
  directly. Mid-dash, `Player.update()` returns early and lets Arcade
  physics carry the velocity set when the dash started, ignoring normal
  input until the burst window elapses.
  - **This replaced an original "cosmetic hop jump on Spacebar" plan.**
    Jump was scoped first (matching the older roadmap wording), but the
    user corrected it mid-planning: Spacebar should be a dash/dodge instead,
    with no jump concept at all. Removed before any jump code was written.
  - No i-frames/damage-avoidance from dash — deliberately deferred, since
    there's no health/damage system yet to interact with (Combat, roadmap
    item 4).
- **Tool-swing stamina cost** — `toolStaminaCost(tool)` in
  `src/entities/ResourceNode.ts`, a third `Record<ToolType, number>` table
  alongside the existing `toolDamage`/`toolCooldownMs` (both stone tools:
  6 stamina/hit). `MainScene.tryInteract()` checks affordability right after
  the existing hit-rate cooldown check and before updating
  `lastToolHitAt` — an exhausted swing attempt doesn't burn the cooldown
  either, so the very next swing can land the instant stamina recovers
  enough, without also waiting out an unrelated cooldown window.
- **HUD stamina bar** — centered directly above the hotbar (two overlapping
  `Rectangle`s: a dark track + a cyan fill that scales/recolors). Per the
  user, this is meant to anchor a future vertical stack — HP is planned to
  land above it once Combat ships, maybe a mana-like bar after that. Added a
  `top` getter to `HotbarUI` (exposing its existing private `originY`) so
  the bar (and future bars) can anchor without duplicating the hotbar's
  centering math. `KeybindsUI` gained two new lines ("Sprint: Hold Shift",
  "Dash: Space (while moving)") but was otherwise untouched.

Verified via `preview_eval`: sprint's speed multiplier (1.6x) and stamina
drain while Shift+movement held (via direct `Key.isDown` manipulation, since
Phaser's `Key` objects don't respond to synthetic property writes for
`JustDown` — that needs `_justDown` set directly, which was used for the
dash tests instead); sprint hard-blocking once a frame's cost is
unaffordable (post-fix); dash's velocity spike to 340, the mid-dash lockout,
cooldown blocking a too-soon re-dash and allowing one after 600ms elapses
(all via a single self-contained `preview_eval` call with real `setTimeout`
waits, to avoid inter-tool-call latency confusing the cooldown math); dash
silently failing when unaffordable; tool swings costing exactly
`toolStaminaCost` and being silently blocked (no `takeHit`, no negative
stamina) when exhausted; and the regen-delay math directly against the
`Stamina` class. Plus `preview_screenshot` for the bar's placement/fill and
the expanded Keybinds panel. Type-check clean, no console errors.

### Small fix: collapsible Keybinds panel

The top-left "Move: WASD..." line was a single always-visible line that would
only keep growing as more binds get added. Replaced with **`src/ui/KeybindsUI.ts`**
(new) — a collapsible top-left panel mirroring `EventLogUI`'s header
collapse/expand mechanics (click header to toggle `[+]`/`[-]`), but simpler:
no scrolling/toasts, just a static list of bind strings passed in once from
`MainScene.createHud()`. Starts **collapsed** by default (the point of the
change was to declutter). Wired into `pointerOverHud()` and the wheel-routing
check alongside `eventLogUI` so clicks/scroll over the panel don't leak
through to world interaction or hotbar cycling.

Verified via `preview_eval` (real simulated mouse events toggling collapse
state, `isPointerOver` gating wheel-driven hotbar cycling while expanded) plus
`preview_screenshot` for collapsed/expanded layout. Type-check clean, no
console errors.

## Where things stand

Core loop works: move (WASD/arrows, sprint on Shift, dash on Spacebar — both
stamina-gated, see below), gather (branches/rocks free; trees/boulders need
the right tool kind equipped and now take multiple hits, see below), craft
(T), manage inventory/hotbar (Tab, 1-9, scroll wheel), equip tools via the
hotbar. Recipe discovery is gated by "have you picked up the ingredients" +
skill level; unlocks announce themselves via a toast + persistent event log
(bottom-right, collapsible). Placeable items (currently just the campfire)
skip the backpack entirely — crafting one enters a placement mode instead.
Chopping/mining a tree/boulder now explodes its yield into scattered loose
pieces on the ground instead of crediting the backpack instantly (see below),
with an auto-pickup magnet (toggle: `V`) to collect them. A stamina bar
(centered above the hotbar) gates sprint/dash/tool-swings and regenerates
after a short delay. Combat exists in foundation form: equip a club via the
hotbar (same flow as tools) to fight Boars scattered around the world —
`[LMB] Attack` when one's hovered in reach, same prompt-gating convention as
chop/mine. A red HP bar (above the stamina bar) tracks player health; dying
freezes the player briefly, then respawns them at world center with full
health and a short invulnerability window. The equipped tool/weapon now
shows as a small icon on the player, offset toward whichever direction
they're last facing.

### Just finished: Milestone 3 — loose world drops + magnet auto-pickup

Plan file: `.claude/plans/bright-prancing-starlight.md`.

Depleting a tree/boulder no longer credits the backpack directly — it
"explodes" into 2-4 scattered loose pieces that must be collected:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`): `amount` is now
  mutable (stacks can grow via consolidation), plus new fields `isDrop`
  (marks a spawned piece vs. a pre-placed branch/rock) and `exploding`
  (true while the spawn-scatter tween runs, so the magnet doesn't fight it
  over x/y). `setAmount()` keeps a small `x<N>` world-space count label
  (only shown when >1) glued to the sprite via a `preUpdate` override — this
  is what makes the label track through the explode tween, magnet pull, and
  bob without extra bookkeeping. `startBob()` is a slow yoyo'd vertical
  tween, used only on landed drop pieces, that reads as "loose item" (the
  brainstormed alternative to a blink — chosen over blink/glow for being
  less flickery/noisy).
- **`MainScene.spawnLooseDrop()`** splits a depleted node's yield into 2-4
  pieces, each a `ResourceNode` with `action:"pickup", loose:true,
  isDrop:true`, tweened outward from the origin to a random point 20-45px
  away (`Cubic.easeOut`, 250ms — the "explode"). On landing, each piece runs
  `consolidateDrop()`: if another non-exploding piece of the same resource
  sits within 28px, it merges in (`setAmount`) and destroys itself, so
  repeated fells in one area collapse into fewer stacks instead of
  carpeting the ground.
- **`MainScene.updateMagnet()`** runs every frame (`update()` now takes
  Phaser's `delta`), pulling any `isDrop && loose && !exploding` piece
  within `MAGNET_RADIUS` (100px) toward the player at `MAGNET_SPEED`
  (220px/s), collecting it into the backpack once within 14px. Toggled with
  **`V`** (`magnetEnabled`, default on) — logs an event-log entry on toggle,
  and the binding is listed in the top-left controls line. Purely
  radius-gated per frame (deliberately no "lock on"/persistence, per user
  correction) — a piece stops dead the instant the player leaves
  `MAGNET_RADIUS`, and resumes/fully closes the gap the instant they're back
  inside it.
- **Bug fix during this milestone**: pulled pieces appeared to trail the
  player at a fixed offset instead of reaching them. Root cause was the idle
  `startBob()` tween — its yoyo/repeat-forever `y` animation kept
  overwriting the magnet's manual `node.y` write every frame, fighting for
  the property. Fixed by `this.tweens.killTweensOf(node)` the moment a piece
  enters magnet range, before applying the pull.
- **Follow-up bug fix (freeze/perf-death during extended play)**:
  `startBob()`'s `repeat: -1` tween never completes on its own, and nothing
  was stopping it when the piece it targeted got destroyed — either merged
  away by `consolidateDrop`, or clicked mid-explosion (pieces are
  hoverable/clickable immediately, even while still `exploding`). Each such
  piece left a tween permanently animating a destroyed sprite; over a play
  session of repeatedly breaking rocks/trees these piled up unbounded and
  dragged the frame rate down to what looked like a stuck/crashed game.
  Fixed by killing a node's own tweens in `ResourceNode.deplete()`, plus a
  `node.depleted` guard in the explosion tween's `onComplete` so an
  already-collected piece doesn't get a *new* bob tween started on it after
  the fact. Verified via `preview_eval`: depleting every boulder/tree in the
  world while never letting the magnet collect them (worst case) left tween
  count matching live-piece count exactly (no orphans), and fully collecting
  everything afterward left zero leaked node tweens.
- **Revised from the original plan**: pre-placed branches/rocks are now
  *both* `loose:false` — always manual-click, never magnet-eligible. Only
  spawned drop pieces are loose. `CLAUDE.md`'s "loose flag" bullet was
  updated to match (the old text said branches were loose; superseded).
- **Unrelated fix bundled in**: `vite.config.ts` hardcoded port 5173, which
  meant the Preview tooling's `autoPort` fallback (used when another
  session's dev server already holds 5173) couldn't actually redirect Vite
  to a free port. Now reads `process.env.PORT` (falls back to 5173), and
  `.claude/launch.json` no longer hardcodes `--port`/`port` and sets
  `autoPort: true` — future sessions running alongside another chat's `dev`
  server will just work instead of hitting a blank/unreachable preview.

Verified via `preview_eval` (explode scatter into multiple pieces summing to
the original amount, landing-site consolidation merging pieces and their
count labels, magnet pulling a landed piece in and crediting the backpack
while `exploding` pieces and pre-placed branches/rocks are correctly
untouched, the `V` toggle stopping/resuming the pull and logging both
transitions) plus `preview_screenshot` for the scatter/label rendering.
Type-check clean, no console errors.

### Previously: Move speed halved + tool hit-rate cooldown

Two small follow-ups requested right after M2 landed (M2's multi-hit change
made LMB-spam farming worse, since nothing capped how fast repeated hits
could land):

- **`Player.ts`**: `SPEED` halved (190 → 95 px/s) — movement felt too fast.
- **Tool hit cooldown**: `toolCooldownMs(tool)` (`src/entities/ResourceNode.ts`),
  same `Record<ToolType, number>` pattern as `toolDamage`/`toolKind`
  (`stone_axe`/`stone_pickaxe` both `500`ms for now). `MainScene.tryInteract()`
  tracks `lastToolHitAt` (via `this.time.now`) and bails out silently (no
  swing, no `takeHit`) if a chop/mine attempt comes in before the cooldown
  elapses — spamming LMB now can't out-farm the tool's swing rate. Pickups are
  unaffected (single-click, no cooldown, same as before).
- This is the first piece of "attack speed" as a per-tool/weapon concept;
  future tiers/weapons can tune their own cooldown independently, and this is
  the hook combat (roadmap item 4) will reuse for weapon attack speed.

Verified via `preview_eval`: first hit registers, an immediate second click on
the same node is blocked (health unchanged), and after waiting past the
cooldown window a hit lands again. Type-check clean, no console errors.

### Previously: Resource node health / multi-hit (Milestone 2)

Plan file: `.claude/plans/radiant-gliding-seal.md`.

Trees and boulders now take 3 hits to fell instead of one:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`) gained `health`/
  `maxHealth` (set via a new `health` field on `ResourceNodeConfig`) and a
  `takeHit(damage)` method — decrements health, plays shake+tint feedback,
  returns `true` only once health hits 0. The resource `amount` is awarded
  **only on the depleting hit**, not per-hit — no partial-yield/overflow
  logic needed, matches loose-drops still being deferred to M3.
- **Tool damage** is a new `toolDamage(tool)` function next to the existing
  `toolKind()`/`requiredKind()` pattern, backed by a `Record<ToolType, number>`
  (`stone_axe`/`stone_pickaxe` both deal `1` for now) — future higher tiers
  return a bigger number and fell nodes in fewer hits without any node-data
  changes.
- **Hit feedback** lives entirely in `ResourceNode.playHitFeedback()`: a quick
  side-to-side shake tween plus a tint interpolated from white toward a
  darker "damaged" shade as health drops — the first shake/tint-style effect
  in the codebase (tween conventions follow `EventLogUI.ts`'s established
  style: short durations, named eases, cleanup via callbacks).
- **`Player.playSwing()`** (`src/entities/Player.ts`) is a quick rotate-punch
  tween (angle 0→25→0) played on every successful chop/mine hit — a stand-in
  for a real swing animation since there's no facing-direction or
  weapon-sprite system yet; kills any in-flight swing tween first so rapid
  clicks can't leave the player stuck mid-rotation.
- Pickups (branch/rock) are untouched — `health: 1`, but they never go
  through `takeHit`, so behavior is identical to before.
- Trees/boulders that survive a hit stay in `this.nodes` and keep showing
  their hover prompt; nothing is removed/credited until the depleting hit.

Verified via `preview_eval` (health decrementing per hit, resource awarded
only on the 3rd/depleting hit for both chop and mine, node correctly removed
from `nodes` only when depleted, rapid back-to-back hits leaving no stuck
tween/angle state) plus a `preview_screenshot` for the tint darkening. Type-
check clean, no console errors.

### Previously: Placement mode for build/placeable items

Plan file: `.claude/plans/ancient-painting-petal.md`.

Items flagged `placeable: true` in `Items.ts` (currently just `campfire`) no
longer land in the backpack when crafted. Instead:

- The crafting menu's button reads **"Place"** instead of "Craft" for these
  recipes (`isPlaceableRecipe()` in `Recipes.ts`, checked in `CraftingMenu.ts`).
  Clicking it closes the crafting menu and enters **placement mode**
  (`MainScene.startPlacement`) — no cost is deducted yet.
- A semi-transparent ghost preview follows the cursor, clamped to
  `PLACEMENT_RADIUS = REACH * 1.25` (80px) of the player (recomputed live each
  frame, so walking repositions the radius). A small hint —
  `[LMB] Place <item>   [RMB] Cancel` — shows under the top-left controls
  line (`placementHintText`, 12px, `(12, 30)` — deliberately NOT the shared
  bottom-right gather-prompt text, and deliberately not overlapping the
  hotbar or the `[T] Craft` tab).
- **LMB** (`attemptPlaceObject`) deducts the recipe cost only at that moment,
  spawns a plain world image at the ghost's position, and **re-arms**
  placement mode immediately so the next one can be placed without reopening
  the crafting menu — this loop is the "ask to place another" behavior,
  expressed as the persisting prompt rather than a separate confirm dialog.
  Running out of materials mid-loop auto-cancels with an event-log message.
- **RMB**, **Escape**, or **Tab** cancel placement mode outright — free,
  since nothing is spent until a successful LMB.
- A same-click double-fire bug (Phaser fires both the "Place" button's own
  `pointerdown` and the scene-wide generic `pointerdown` for one click, which
  was placing the object right where "Place" was clicked) is fixed via a
  one-shot `suppressNextPointerdown` flag consumed by the scene's global
  pointerdown handler.
- No loose-world-drop system was needed for this — since materials are only
  spent on a successful LMB, a cancelled placement has nothing to destroy.
  That concept is still deferred to Milestone 3 (or to whenever destroying
  *already-placed* build pieces becomes a feature).
- Placed objects are currently just visual (`this.add.image`, no physics
  body, no interaction) — intentionally minimal; a real placed-object entity
  can come later alongside the destroy-for-pieces feature.

Verified via `preview_eval` (radius clamping, cost-only-on-LMB, free RMB
cancel, Escape/Tab cancelling instead of opening menus, the double-click fix
via simulated real Phaser pointer events, and clicking "Place" through the
actual crafting-menu UI). Type-check clean, no console errors.

### Previously: Milestone 1 of the inventory-overhaul plan, plus a UI polish pass

Plan file: `.claude/plans/bug-i-can-drag-twinkling-engelbart.md` (3 milestones;
M1 done, M2/M3 not started).

**M1** replaced the old derived-list item model (`Inventory` counts + `ownedTools`
Set + `craftedItemCounts` Map) with a single unified slot-based model:

- **`src/systems/ItemContainer.ts`** (new) — fixed-size array of `{key, count}`
  stacks. `add`/`hasRoomFor`/`count`/`removeCount`/`findAssignable`, plus the
  free function `moveSlot(src, si, dst, di)` that merges-or-swaps. This one
  primitive backs every drag, rearrange, and hotbar assignment.
- **Backpack** (`MainScene.backpack`) and **Hotbar** (`Hotbar.container`) are
  each an `ItemContainer`. Resources (wood/stone/leather) are now regular
  stackable items living in the grid (max 99), not a separate counter.
- **`Items.ts`** — every item def now carries `maxStack` (99, or 1 for
  tools/weapons) and `hotbarable` (false for shishkabob/campfire).
- Drag is scene-owned (`MainScene.beginItemDrag/resolveItemDrag`), not
  per-widget — this is what lets items move backpack<->hotbar and rearrange
  within either. Right-click quick-moves via `quickMoveItem`.
- Mouse wheel cycles the hotbar 1-9 (wraps both directions) unless the pointer
  is over the event log, which scrolls its own history instead
  (`EventLogUI.isPointerOver`).

This fixed both reported bugs (item duplicating into multiple slots on
drag/right-click; crafting a 2nd tool eating resources with no result) as a
side effect of giving every item a single home slot instead of a derived
count.

**Then a follow-up UI polish session** cleaned up rough edges left by M1:

- Removed the top-left `Wood/Stone/Tool` HUD text (redundant once items live
  visibly in the grid/hotbar) and moved the "Move: WASD..." controls line up
  to `(12, 10)` now that nothing sits above it.
- **`src/ui/Tooltip.ts`** (new) — extracted the item-info popup (name,
  description, stats) that `InventoryMenu` already had into a shared class
  with two placement modes: `"right"` (flips left near the screen edge — used
  by the backpack grid) and `"above"` (opens upward, centered — used by the
  hotbar, which sits at the very bottom of the screen). `HotbarUI` now shows
  the same hover tooltip the backpack grid does.
- **`InventoryMenu`** reworked into a horizontal layout — backpack grid grown
  from 5x4 (20 slots) to **6x6 (36 slots)** on the left, with the 3x3
  equipment grid repositioned to its right (was stacked above it), using the
  vertical space freed up by that move.
- **Crafting menu** recipe rows now show the item's icon next to its name
  (`[icon] Stone Axe`). `outputKey(recipe)` (tool/itemId -> item key) moved
  from `MainScene.ts` into `Recipes.ts` as a shared export so both
  `MainScene` and `CraftingMenu` use one implementation.
- **Recipe-unlock toasts** redesigned: previously a center-screen toast shared
  with level-up/info messages; now recipe unlocks get their own small
  icon+text card that slides in from the right edge, lands in a stack
  top-right (below the `[T] Craft` button, clear of the bottom-right event
  log), holds, then fades. Multiple unlocks queue and stagger in one at a
  time (~200ms apart) instead of popping in simultaneously. Level-up/info
  toasts are unchanged (still center-screen via `EventLogUI.showToast`).

**Verified via `preview_eval` + `preview_screenshot`** — direct scene-method
calls to inspect state precisely (container/text object positions, contents,
tween state via an in-page `await new Promise(setTimeout...)` before
inspecting), plus visual screenshots for layout confirmation. Type-check
clean throughout. No console errors.

### Up next

Combat (roadmap item 4) now exists in **foundation** form (see "Just
finished" above) — health/damage, facing, equipped-item visuals, melee
weapon equip, one enemy (Boar), death & respawn. Per `CLAUDE.md` convention
(one milestone/feature per session), the follow-ups below should each start
in a fresh chat session rather than continuing this one.

**Explicitly deferred from this pass (not forgotten — see `CLAUDE.md`'s
"First biome — content notes" for the fuller design):**

- **Gremlin** (ranged rock-throw + melee claw, keep-distance AI) and
  **Snake** (hidden-in-grass ambush) — the other two first-biome enemies.
  Gremlin's ranged attack means this is also where the game's first
  projectile system needs to get built.
- **Boar's charge attack + fear-of-fire** (flees near a torch/campfire) —
  the shipped Boar this pass is bite-only/no-fear, a deliberate
  simplification.
- **Slingshot + Slingshot Pellets** — first ranged *weapon* + first
  consumable-ammo concept.
- **Workbench crafting-tier gate** — `Recipe.tier` still exists as the
  unused hook for this (see `Recipes.ts`); nothing enforces it yet.
- **Dash i-frames** — dash is still a pure movement burst with no
  invulnerability window. Now that Health exists, this is unblocked
  whenever it's wanted; just not bundled into this pass.
- **Cooking/food** (Empty Shishkabob + raw meat → cooked over a campfire) —
  no rest/food/hunger system exists yet; `boar_meat` currently just sits in
  the backpack as a plain stackable with no use.
- Combat XP/skill (`Skills.ts` still only has `axes`/`pickaxes`) — ties into
  roadmap item 5 (Progression) more than item 4.

### Known rough edges / deferred (see plan's "Out of scope" section)

Carry weight, tool durability, craft-quantity selector, stacking exceptions
beyond durability — all intentionally deferred, not forgotten. The magnet
(M3) has no carry-weight gating yet since that system doesn't exist. Placed
objects (campfire) have no collision/overlap checks and can't be destroyed
yet — deferred until a destroy-for-pieces feature exists, which can now
reuse the M3 loose-drop system for the resulting pieces.
