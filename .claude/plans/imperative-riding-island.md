# Comfort item (replaces M-SB Sleep/Bed)

## Context

M-SB in the roguelike meta-loop master plan (`.claude/plans/roguelike-metaloop-master-plan.md`)
was originally "Sleep + Bed placeable" with a fast-forward-to-dawn mechanic. On discussion,
the user decided **not** to make night skippable — M-DN's night teeth (faster enemies,
nightfall surge) are one of the run's few real sources of time pressure, and a free
skip-to-dawn would let players opt out of that every night. Instead, M-SB becomes a
**Comfort item**: a placeable that grants passive HP regen when set up safely near a fire,
giving Beds a purpose without touching the clock. Locked via `AskUserQuestion` this session:

- **Live proximity only** — regen ticks only while all conditions hold; stops immediately
  the instant any condition breaks. Not a lingering timed buff (unlike food).
- **~1 HP/sec** — weaker than the weakest food buff (Cooked Boar Meat is 2 HP/s), so
  cooking/food still matters; Comfort is a free-but-slow, must-stand-still fallback.
- **"No enemies nearby" = any live enemy within radius**, aggro'd or not (simplest read of
  "safe area," avoids per-enemy aggro-state special-casing).
- **Tier 0** — craftable anywhere, matches Campfire's own tier-0 status (Comfort is inert
  without a placed Campfire nearby anyway, so a second gate is redundant).

This updates the master plan's locked build order to: M-FX → M-R1 → M-DN → **Comfort (was
M-SB)** → M-FA → M-RL → M-WC/M-TE → M-W1.

## Design

**Item:** `comfort` — a new placeable (a bedroll/cot, flavored as "stuffed with reeds for
cushioning"), tier 0, `maxStack: 1`, `hotbarable: true`. Recipe costs proposed as
`{ wood: 3, cattail: 5 }` — `cattail` is the existing creek-edge harvestable
(`src/systems/Items.ts` `cattail`, first-biome content) and reads as the "reeds" the
flavor text describes; no new raw resource needed. Numbers are first-pass/tunable per
project convention.

**Conditions, checked live every frame while placed comfort objects exist:**
1. Player within `COMFORT_RANGE` (proposed 80px, similar order to `WORKBENCH_RANGE`=100)
   of a placed `comfort` object. **No stillness requirement** — just being in range is
   enough, same as every other proximity-gated system in the game (Workbench, Drying
   Rack).
2. That same comfort object within `COMFORT_CAMPFIRE_RANGE` (proposed 120px) of a placed
   `campfire` object. **This is a hard requirement, not optional** — Comfort never does
   anything without a lit Campfire nearby, regardless of its own tier-0 craft-gating
   (tier 0 only means "no Workbench needed to craft/place it"; it says nothing about
   whether it functions once placed).
3. No live enemy within `COMFORT_SAFE_RADIUS` (proposed 350px) of the player.

**Reuses the existing `BuffManager`/`BuffBarUI` machinery directly**, rather than a new
heal call + new HUD element. Every frame all three conditions hold, call
`this.buffs.apply({ id: "comfort_rest", name: "Resting", icon: "icon_comfort", hpPerSec: 1,
durationMs: 400 })` — `apply()` refreshes-in-place by id (`Buffs.ts` line 40-45), so a
continuously-held condition just keeps resetting the timer to full every frame. The instant
any condition breaks, the scene simply stops calling `apply()` for that id, and the buff
naturally expires within its own short `durationMs` (400ms — long enough to survive a frame
hitch, short enough that "stops immediately" holds in practice) via the existing
`buffs.tick(delta, this.health)` call already wired into `update()`. This gets the
"Resting" icon, its `+1 HP/s` tooltip, and the depletion-meter visual **for free** from
`BuffBarUI` — it looks and behaves exactly like a food buff, per the ask, with zero new UI
code. One accepted cosmetic quirk: the tooltip's "Ns left" countdown will show a small
number (≈1s) instead of "infinite" while resting continues — not worth special-casing
`BuffBarUI` for.

`BuffManager.maxBuffs` is currently capped at 2 (`Buffs.ts` line 29) — bump it to 3 via
`this.buffs.setMaxBuffs(3)` once (in `create()`, alongside other per-run system setup) so
Comfort doesn't fight two simultaneous food buffs for a slot (the eviction logic in
`apply()` would otherwise likely evict Comfort every time, since its refreshed
`remainingMs` is almost always smaller than an in-progress food buff's).

## Implementation

1. **`src/systems/Items.ts`** — add `comfort` `ItemDef` (copy the Campfire entry's shape,
   lines 180-191, swap texture/name/description/`placeable: true`; description carries the
   "stuffed with reeds for cushioning" flavor).
2. **`BootScene.ts`** — generate a simple placeholder texture for `icon_comfort` /
   world sprite, same pattern as the existing campfire texture generation. This same
   texture key is reused as the buff icon (`BuffSpec.icon`), so only one texture is needed.
3. **`src/systems/Recipes.ts`** — add the `comfort` recipe, tier 0, `{ wood: 3, cattail: 5
   }`, mirroring the Campfire recipe block (lines 110-117).
4. **`src/scenes/MainScene.ts`**:
   - New constants: `COMFORT_RANGE`, `COMFORT_CAMPFIRE_RANGE`, `COMFORT_SAFE_RADIUS`
     near `WORKBENCH_RANGE` (line ~137). (`COMFORT_HP_PER_SEC` isn't needed as a separate
     constant — it's just the buff spec's `hpPerSec: 1`.)
   - New `isNearCampfire(x, y, radius)` helper, copied from the `isNearWorkbench` pattern
     (lines 3146-3164), filtering `placedObjects` by `itemKey === "campfire"`.
   - New `isEnemyNearby(x, y, radius)` helper iterating `this.enemies`, skipping
     `enemy.depleted`, using `Phaser.Math.Distance.Between` (mirrors the existing prompt
     reach-check pattern at line 2348).
   - New `updateComfortRegen()`: for each placed `comfort` object, check condition 1
     (player near it) AND condition 2 (it near a campfire); if any comfort object satisfies
     both, then check condition 3 (no enemy near player) — if all hold, call
     `this.buffs.apply({ id: "comfort_rest", name: "Resting", icon: "icon_comfort",
     hpPerSec: 1, durationMs: 400 })`. If not, do nothing (let the existing buff, if any,
     expire on its own via the normal tick).
   - Wire `updateComfortRegen()` into `update()` right **before** the existing
     `if (this.buffs.tick(...)) this.refreshHealthBar();` line (~725), so a freshly-applied
     buff is picked up by the same frame's tick — matches how eating food already flows
     into that same tick call.
   - `this.buffs.setMaxBuffs(3)` once in `create()` (per-run system setup, alongside the
     other system resets `scene.restart()` requires — see the standing "full field audit on
     restart" convention).
   - Placed `comfort` objects need the same hover/hover-name treatment other placed objects
     get for the right-click Destroy context menu (mirror the existing `itemKey ===
     "campfire"` branch around line 2253-2259) — Comfort should be destroyable/recoverable
     like every other placed object, no Upgrade tier needed (skip `StationUpgrades.ts`
     entirely, this item has none).
5. **`RECIPES.md`** — add the new Comfort recipe row (per the standing "keep RECIPES.md in
   sync" convention).
6. **`CLAUDE.md`** — add a roadmap entry (5j or similar) documenting Comfort as shipped,
   superseding the Sleep/Bed M-SB description, and update the master-plan's build-order
   line to reflect the rename.

## Explicitly out of scope

- No sleep/time-skip mechanic at all (the whole point of this pivot).
- No stillness requirement — proximity only, matching every other station-proximity system.
- No dormant respawn-point wiring (that was tied to the old Bed concept for a future
  easy-mode variant; Comfort has no such role).
- No station-upgrade tier for Comfort.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` (config `"dev"`), `preview_eval` to: place a Campfire and a Comfort
   object near each other, teleport the player next to Comfort, confirm HP climbs at ~1/s
   via repeated `health.current` reads across a few real-time ticks, and that
   `buffs.active()` contains a `comfort_rest` entry with `hpPerSec: 1`.
3. `preview_eval` to break each condition independently (move player away from Comfort;
   move Comfort away from Campfire; spawn/teleport an enemy within `COMFORT_SAFE_RADIUS`)
   and confirm regen stops and the `comfort_rest` buff disappears from `buffs.active()`
   shortly after (within its 400ms duration), each time.
4. `preview_screenshot` to confirm the placed Comfort object renders, and that the
   "Resting" icon appears in the existing buff bar above the HP bar (styled like a food
   buff) while active, and disappears when not.
5. Check `preview_console_logs` (level `error`) for runtime errors.
