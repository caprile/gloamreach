# Status

Last updated: 2026-07-06

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
