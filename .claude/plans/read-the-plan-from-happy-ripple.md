# Stamina System (Roadmap item 3: stamina, sprint, dash)

## Context

Per `CLAUDE.md`'s Roadmap and `STATUS.md`'s "Up next," the just-shipped M3
(loose drops + magnet) was the last milestone before **Stamina** — a pool
that gates sprint and dash (tool-swing already has a hit-rate cooldown; this
adds a stamina cost on top of it). This is the first player stat/resource in
the game (no health system exists yet either), so it also establishes the
first HUD bar and the pattern future bars will follow. Per the user, the
stamina bar should render **centered directly above the hotbar**, showing
live drain/regen — this is meant to be the bottom of a small vertical stack:
HP is planned to sit above stamina later, and possibly a mana-like bar above
that.

Decisions locked in with the user before/during this plan:
- **Sprint** is **hold-Shift-while-moving**, not a toggle — drains stamina
  steadily while held+moving, ends immediately on release or stopping.
- **Spacebar is a Dash/Dodge**, not a jump — a quick movement burst in the
  currently-held movement direction, gated by both a stamina cost and its own
  cooldown (independent of stamina) so it can't be chain-spammed even with a
  full pool. No jump/hop concept — removed from scope entirely.
- **Exhaustion is a hard block at 0** — same "silently do nothing" philosophy
  already used for out-of-reach/wrong-tool interactions (see `CLAUDE.md`'s
  prompt rules). No below-zero debuff mechanic.
- **Dash grants no invulnerability/i-frames yet** — there's no health/damage
  system to interact with (that's Combat, roadmap item 4). It's purely a
  movement burst for now; an i-frame window can be added later alongside
  Combat without changing this milestone's shape.

## Approach

### 1. New file: `src/systems/Stamina.ts`

A small Phaser-free state class (mirrors `Hotbar.ts`/`Inventory.ts`'s "plain
state class" convention — no rendering, no scene reference).

```ts
const MAX_STAMINA = 100;
const REGEN_PER_SEC = 20;       // full refill from empty in ~5s
const REGEN_DELAY_MS = 800;     // pause after any spend before regen resumes

export class Stamina {
  private current = MAX_STAMINA;
  private elapsed = 0;   // internal clock, fed only by tick(delta)
  private regenAt = 0;   // elapsed-time value regen may resume at

  get max(): number { return MAX_STAMINA; }
  value(): number { return this.current; }

  canAfford(amount: number): boolean { return this.current >= amount; }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.current -= amount;
    this.regenAt = this.elapsed + REGEN_DELAY_MS;
    return true;
  }

  tick(delta: number): void {
    this.elapsed += delta;
    if (this.elapsed < this.regenAt) return;
    if (this.current >= MAX_STAMINA) return;
    this.current = Math.min(MAX_STAMINA, this.current + REGEN_PER_SEC * (delta / 1000));
  }
}
```

`spend()` re-arms the delay on every call (including per-frame sprint drain),
so regen only resumes `REGEN_DELAY_MS` after the *last* drain — standard
survival-game feel.

**Instance lives on `MainScene`**, not `Player`: `MainScene.update(_time,
delta)` already receives `delta` (used today by `updateMagnet(delta)`), and
`tryInteract()` (which needs to spend stamina on tool swings) is scene-side.
This matches how `equippedTool`/`lastToolHitAt` already live on the scene
despite being conceptually "player state." Add `private stamina = new
Stamina();` as a `MainScene` field.

### 2. `src/entities/Player.ts` changes

Current state (verified): `SPEED = 95`, no delta param on `update()`, no
Shift/Space key handling, `playSwing()` tweens `angle` 0→25→0 over 70ms.

- Add `shiftKey`/`spaceKey` (`Phaser.Input.Keyboard.KeyCodes.SHIFT`/`SPACE`)
  in the constructor, alongside the existing `cursors`/`wasd` setup.
- Add constants: `SPRINT_MULTIPLIER = 1.6`, `DASH_SPEED = 340`,
  `DASH_DURATION_MS = 160`, `DASH_COOLDOWN_MS = 600`.
- Add private fields `private lastDashAt = -Infinity;` and `private
  dashingUntil = 0;`.
- Widen `update()` to `update(delta: number, canSprint: boolean, canDash:
  boolean): PlayerFrameResult` — the only call site is `MainScene.update()`,
  so this is a contained change. Both `canSprint`/`canDash` are the scene's
  veto (false when stamina can't cover the cost); `Player` still reads the
  raw input but the scene has final say on whether it "takes."
  ```ts
  export interface PlayerFrameResult {
    moving: boolean;
    sprinting: boolean;    // moving && canSprint && shiftKey.isDown
    dashStarted: boolean;  // true only on the frame a dash begins (for stamina spend)
  }
  ```
  Body:
  ```ts
  update(delta: number, canSprint: boolean, canDash: boolean): PlayerFrameResult {
    const now = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Mid-dash: let Arcade physics carry the velocity set when the dash
    // started; ignore normal input until it expires.
    if (now < this.dashingUntil) {
      return { moving: true, sprinting: false, dashStarted: false };
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    let vx = 0, vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;
    const moving = vx !== 0 || vy !== 0;

    // Dash requires a held movement direction (no facing/last-direction
    // memory exists yet — see STATUS.md's note that a real facing system is
    // deliberately deferred to land alongside Combat).
    const wantsDash =
      moving &&
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      now - this.lastDashAt >= DASH_COOLDOWN_MS;

    if (wantsDash && canDash) {
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * DASH_SPEED, (vy / len) * DASH_SPEED);
      this.lastDashAt = now;
      this.dashingUntil = now + DASH_DURATION_MS;
      return { moving: true, sprinting: false, dashStarted: true };
    }

    const sprinting = moving && canSprint && this.shiftKey.isDown;
    if (!moving) {
      body.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy);
      const speed = sprinting ? SPEED * SPRINT_MULTIPLIER : SPEED;
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
    }
    return { moving, sprinting, dashStarted: false };
  }
  ```
  If `wantsDash` is true but `canDash` is false (insufficient stamina),
  `lastDashAt` is **not** updated — a failed attempt doesn't burn the
  cooldown, matching the same "don't waste the gate on a blocked attempt"
  reasoning used for the tool-swing cooldown/stamina ordering below. The
  player can simply try again the next time Space is pressed once stamina
  recovers.
- `playSwing()` is unchanged.

No new `playJump`/hop method — dash's own movement burst *is* its feedback
(no separate cosmetic tween needed for this pass).

### 3. `src/entities/ResourceNode.ts` changes

Mirror the existing `TOOL_DAMAGE`/`TOOL_COOLDOWN_MS` pattern (verified at
lines 25-42) with a third table, placed right after `toolCooldownMs`:

```ts
const TOOL_STAMINA_COST: Record<ToolType, number> = {
  stone_axe: 6,
  stone_pickaxe: 6,
};
export function toolStaminaCost(tool: ToolType): number {
  return TOOL_STAMINA_COST[tool];
}
```

### 4. `src/scenes/MainScene.ts` changes

- Import `Stamina` and `toolStaminaCost`; add `private stamina = new
  Stamina();` and `private staminaBarFill!: Phaser.GameObjects.Rectangle;`.
- New constants near the top: `SPRINT_DRAIN_PER_SEC = 18`,
  `DASH_STAMINA_COST = 15`.
- **`update()`** (currently lines 185-190):
  ```ts
  update(_time: number, delta: number): void {
    const canSprint = this.stamina.value() > 0;
    const canDash = this.stamina.canAfford(DASH_STAMINA_COST);
    const frame = this.player.update(delta, canSprint, canDash);

    if (frame.sprinting) {
      this.stamina.spend(SPRINT_DRAIN_PER_SEC * (delta / 1000));
    }
    if (frame.dashStarted) {
      this.stamina.spend(DASH_STAMINA_COST);
    }
    this.stamina.tick(delta);
    this.refreshStaminaBar();

    if (this.placementMode) this.updatePlacementGhost();
    else if (!this.anyMenuOpen()) this.updateHover();
    this.updateMagnet(delta);
  }
  ```
  If stamina hits 0 mid-sprint, `canSprint` goes false next frame and
  `Player` itself silently stops applying the multiplier — sprint ending from
  exhaustion looks identical to releasing Shift, no jarring stop. Dash is an
  instantaneous affordability check at the moment Space is pressed — no
  mid-dash cancellation to handle since `DASH_STAMINA_COST` is spent in full
  atomically when it starts.
- **`tryInteract()`** (currently lines 430-468): insert the stamina gate
  right after the existing cooldown check, **before** updating
  `lastToolHitAt`:
  ```ts
  const cooldownMs = toolCooldownMs(this.equippedTool);
  if (this.time.now - this.lastToolHitAt < cooldownMs) return;

  const staminaCost = toolStaminaCost(this.equippedTool);
  if (!this.stamina.canAfford(staminaCost)) return; // exhausted — silent, same pattern as the guards above

  this.lastToolHitAt = this.time.now;
  this.stamina.spend(staminaCost);

  this.player.playSwing();
  const depleted = node.takeHit(toolDamage(this.equippedTool));
  // ...rest unchanged
  ```
  Checking stamina before consuming the cooldown window means a blocked swing
  doesn't also waste the cooldown — the instant stamina regenerates enough,
  the very next swing can land without an extra wait.
- **No new `keydown-SPACE` scene-level binding.** Dash is polled every frame
  inside `Player.update()` via `JustDown`, unlike the toggle-style
  `keydown-X` bindings (`V`, `T`, `Tab`) used for stateless menu actions —
  dash needs per-frame `delta`/cooldown/direction handling, which reads more
  naturally living alongside the rest of `Player.update()`'s movement logic.
- **Stamina bar placement — centered directly above the hotbar**, per the
  user: this is meant to be the first of a small vertical stack (HP later,
  maybe a mana-like bar after that), so it needs a stable anchor other bars
  can build on top of, not an ad hoc HUD corner. `HotbarUI` (constructed at
  `MainScene.ts:136`, right after `createHud()` runs at line 133) already
  computes its own centered origin (`originX`/`originY` in
  `src/ui/HotbarUI.ts:39-41`, currently private). Expose the anchor:
  ```ts
  // src/ui/HotbarUI.ts — add alongside the existing private fields
  get top(): number {
    return this.originY;
  }
  ```
  Then add a new `private createStaminaBar(): void` method in `MainScene.ts`,
  called **right after** `this.hotbarUI = new HotbarUI(...)` (not from inside
  `createHud()`, since that runs before `hotbarUI` exists):
  ```ts
  private createStaminaBar(): void {
    const barW = 220, barH = 14, gap = 8;
    const barX = this.scale.width / 2 - barW / 2;
    const barY = this.hotbarUI.top - gap - barH; // stacks directly above the hotbar; future HP/mana bars stack above this one the same way
    this.add
      .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x3a4250)
      .setScrollFactor(0)
      .setDepth(2000);
    this.staminaBarFill = this.add
      .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0x5ad1e0, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2001);
    this.refreshStaminaBar();
  }
  ```
  New method `refreshStaminaBar()`:
  ```ts
  private refreshStaminaBar(): void {
    const frac = this.stamina.value() / this.stamina.max;
    this.staminaBarFill.setScale(Math.max(0, frac), 1);
    const color = frac > 0.3 ? 0x5ad1e0 : frac > 0.12 ? 0xe0b23c : 0xe05a3c;
    this.staminaBarFill.setFillStyle(color);
  }
  ```
  Left-anchored origin means `setScale(frac, 1)` drains from the right edge —
  the standard health-bar visual. The cyan→amber→red color shift is the only
  feedback beyond width; deliberately no toast (see Out of scope). Called
  every frame from `update()`, not from the on-demand `refreshHud()` (which
  only fires after inventory-affecting actions).
- **`KeybindsUI` array** — add two lines:
  ```ts
  this.keybindsUI = new KeybindsUI(this, [
    "Move: WASD / Arrows",
    "Sprint: Hold Shift",
    "Dash: Space (while moving)",
    "Interact: Left Click",
    "Craft: T",
    "Inventory: Tab",
    "Auto-pickup: V",
  ]);
  ```

## Starting numbers (all tunable named constants)

**Revised once, right after first landing, per direct user feedback from
seeing it in preview** — the values below are final; see "Post-implementation
notes" for what changed and why.

| Constant | Value | File | Rationale |
|---|---|---|---|
| `MAX_STAMINA` | 100 | `Stamina.ts` | Round number for bar-fraction math |
| `REGEN_PER_SEC` | 20 | `Stamina.ts` | ~5s full refill from empty |
| `REGEN_DELAY_MS` | 800 | `Stamina.ts` | Brief deliberate pause before recovery |
| `SPRINT_MULTIPLIER` | 1.6 | `Player.ts` | 95→152 px/s, noticeably faster |
| `SPRINT_DRAIN_PER_SEC` | 33 (was 18) | `MainScene.ts` | Full 100-pool drains from continuous sprint in ~3s — an explicit user target, not just "roughly symmetric with regen" |
| `DASH_SPEED` | 340 | `Player.ts` | ~3.6x base speed, a sharp burst |
| `DASH_DURATION_MS` | 160 | `Player.ts` | Short enough to read as a burst, not a new movement mode |
| `DASH_COOLDOWN_MS` | 600 | `Player.ts` | Prevents chaining dashes even with full stamina |
| `DASH_STAMINA_COST` | 25 (was 15) | `MainScene.ts` | 4 dashes per full pool |
| `TOOL_STAMINA_COST` | 12 (was 6, both tools) | `ResourceNode.ts` | 3 hits/node × 12 = 36 — meaningfully draining without exhausting on one node |

## Post-implementation notes (follow-up tuning pass, same day)

Shipped as planned, then the user requested a round of changes after seeing
it live in preview:

- **Stamina usage was "way too low"** — the original numbers above (in
  parentheses) were bumped as shown. Sprint's 33/s figure directly targets
  "full bar drains in ~3s," which the user gave as a concrete number.
  **Forward-looking note** (comment left in `Stamina.ts` next to
  `MAX_STAMINA`, not implemented): a future food system will scale
  `MAX_STAMINA` down as food depletes, with 0 food intended to reach this
  same "~3s full sprint" feel on a much smaller pool.
- **Bar visuals overhauled**: the bright/neon cyan fill with a
  color-shift-on-deplete effect (cyan→amber→red) was replaced with a single
  fixed dark goldenrod (`0xb8860b`) — no color changes at all as the bar
  drains or regens. Size shrunk drastically, from 220x14 (a full-width bar)
  down to 76x20 — roughly 1.5-2x the size of one hotbar slot (40x40),
  per the user's explicit comparison. A centered numeric text label
  (`staminaBarText`, monospace 12px, dark text on the gold fill) was added
  showing the rounded current value (e.g. `"72"`) directly inside the bar.
- **Event log relocated — not originally in this plan's scope.** The user
  flagged, while looking at the shrunk bottom-center HUD cluster, that the
  bottom-right `EventLogUI` panel would eventually be "in the way" as more
  bars stack there, and asked for it to move to stack under the top-left
  `KeybindsUI` panel instead, hidden/collapsed by default (previously
  expanded by default). This required:
  - `EventLogUI` reanchored from a bottom-right, upward-growing layout
    (`rightX`/`bottomY`) to a top-left, downward-growing one (`PANEL_X = 12`,
    matching `KeybindsUI`'s column and width), with `collapsed` now
    defaulting `true`.
  - **A real coupling bug, caught via `preview_screenshot` (not
    `preview_eval`)**: computing `EventLogUI`'s top position once at
    construction (from `keybindsUI.bottom` at that moment) left the Log
    panel overlapped whenever `KeybindsUI` was expanded *after* Log was
    already positioned, since nothing told Log to move. Fixed by adding an
    `onToggle?: () => void` callback to `KeybindsUI`'s constructor (fired
    after every collapse-state change) and a new public
    `EventLogUI.setTopY(topY)` method; `MainScene` wires
    `onToggle: () => this.eventLogUI?.setTopY(this.keybindsUI.bottom + 8)`,
    so Log always repositions the instant Keybinds' height changes in either
    direction.

Verified via `preview_eval` (sprint draining the full bar in ~3.1s real time,
via `performance.now()` timing; bar text reading `"0"` and speed reverted to
base at empty) and `preview_screenshot` (bar size/color/number; Log stacked
correctly under both collapsed *and* expanded Keybinds — expanded was the
case that initially failed, before the `onToggle` fix). Type-check clean, no
console errors throughout.

## Out of scope

- **No i-frames/damage-avoidance from dash** — there's no health/damage
  system yet (Combat, roadmap item 4); the dash is purely a movement burst
  for now. An invulnerability window can be layered on later without
  reshaping this milestone.
- No jump/hop concept at all — removed from scope per the user's correction;
  Spacebar is dash-only.
- No below-zero debuff/"winded" mechanic — hard block only.
- No stamina cost for normal (non-sprint, non-dash) walking.
- No steering/curving mid-dash — direction is fixed for the whole burst,
  sampled once at the moment it starts.
- No low-stamina/exhaustion toast — bar's visual drain + color shift is the
  only feedback; a toast on every blocked swing/dash attempt would be noisy.
- No save/load persistence — no save system exists yet; resets to full on
  reload like everything else today.
- No numeric overlay, tick marks, or pulse animation on the bar — a clean
  two-rectangle bar is enough for this milestone.
- No weapon-attack stamina cost — Combat (roadmap item 4) doesn't exist yet;
  it gets its own hook later, analogous to today's tool-swing hook.
- No visible dash-cooldown indicator — invisible, same "silent" philosophy as
  every other gate in the game.

## Critical files

- `src/systems/Stamina.ts` (new)
- `src/entities/Player.ts`
- `src/scenes/MainScene.ts`
- `src/entities/ResourceNode.ts`
- `src/ui/HotbarUI.ts` — one-line addition: a public `top` getter exposing
  the existing private `originY`, so the stamina bar (and future HP/mana
  bars) can anchor directly above the hotbar without duplicating its
  centering math.
- `src/ui/KeybindsUI.ts` — **not modified**.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` — confirms the widened
   `Player.update()` signature and new imports type-check.
2. `preview_start` (config `"dev"`) + `preview_screenshot` — confirm boot,
   new stamina bar renders centered directly above the hotbar, doesn't
   overlap the hotbar slots, and stays centered if the window/canvas size
   changes.
3. `preview_eval` against `window.__game.scene.getScene('MainScene')`:
   - Hold Shift + a movement key across several frames (or call
     `player.update(delta, true, true)` directly) — assert `stamina.value()`
     decreases and velocity magnitude reflects `SPRINT_MULTIPLIER`.
   - Drain stamina near zero — confirm sprint's multiplier silently stops
     applying once `canSprint` is false (speed reverts to base `SPEED`).
   - Trigger a dash while moving — assert velocity spikes to `DASH_SPEED` and
     `dashStarted` is true once; assert a second Space press within
     `DASH_COOLDOWN_MS` doesn't start another dash or spend stamina again;
     after `DASH_DURATION_MS` elapses, confirm normal input-driven movement
     resumes.
   - Force stamina below `DASH_STAMINA_COST` and attempt a dash — assert it
     silently fails (no velocity spike, `dashStarted` false, `lastDashAt`
     unchanged so the very next affordable attempt isn't still cooling down).
   - Repeatedly call `tryInteract()` on a tree/boulder — assert stamina drops
     by `toolStaminaCost` per landed swing, and forcing stamina to near-0
     blocks the next swing silently (no tween, no `takeHit`, no negative
     stamina).
   - Confirm regen resumes only `REGEN_DELAY_MS` after the last spend, and
     the bar's width/color update accordingly.
4. `preview_console_logs` (level `error`) — no runtime errors.
