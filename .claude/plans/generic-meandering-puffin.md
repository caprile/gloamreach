# Plan: Timed Progress Bars for Crafting/Processing/Cooking + Slot-Machine Relic Rolls

## Context

Today **crafting, drying-rack processing, campfire cooking, and relic-forge rolls all
complete instantly** in a single synchronous call — the item just appears. The user wants a
short **loading bar per action before the result lands**, for two distinct feels:

1. **Craft / process / cook** — a *quick* bar (not a slog); a **single** bar even for a
   multi-part run (e.g. 8→4). Purely a small satisfying beat before the item drops in.
2. **Relic rolls** — a **slot-machine spin**: the bar filling *is* the suspense. When it
   lands, a **Common** result is a nice/satisfying pop; **Uncommon/Rare/Mythic** is a big
   deal — "giga satisfying, gamba style," escalating flourish by rarity. (There is no
   Uncommon/Rare *live* trophy path today — everything rolls Common — but the reveal must
   already scale by rarity so it pays off the moment deeper biomes/M-W1 add higher pools.)

All four entry points are currently synchronous (`STATUS.md`/exploration confirmed, no
per-station "busy" state exists):
- Craft: `MainScene.craftRecipe()` (~line 3282) ← `CraftingMenu` button (line 335)
- Process: `MainScene.processRackAmount()` (~line 1759) ← `DryingRackMenu` (line 380)
- Cook: `MainScene.cookAtCampfire()` (~line 1582) ← `CookingMenu` (line 215)
- Roll: `MainScene.rollRelic()` (~line 1537) ← `RelicForgeMenu.renderRollButtons` (line 196)

## Design overview

Two reusable pieces, then wire the four menus:

- **`src/ui/ProgressBar.ts`** (new) — a small, self-contained fill bar used by the three
  "quick" menus. Flat scrollFactor(0) GameObjects (bg `Rectangle` + fill `Rectangle`,
  origin-left scaleX 0→1, optional centered label), matching the existing menu convention.
  API: `setPosition/setSize/setFillColor/setLabel/setVisible/setDepth`, and
  `start(durationMs, { ease?, onUpdate?(frac), onComplete })` which tweens a `{v:0}` proxy
  and drives the fill; `stop()`/`destroy()`. Reuses the proven `scene.tweens.add` +
  `onComplete` idiom from `EventLogUI.spawnRecipeToast` (lines 247–309).

- **`src/ui/RelicRevealFx.ts`** (new) — the slot-machine spin + rarity-scaled payoff,
  owned by `RelicForgeMenu`. Not the generic bar (the feel is different): a wider central
  bar with `Quart.easeOut` deceleration (the "wheel slowing down"), a **reel gem** that
  rapid-swaps rarity icons and slows as it fills, then a reveal keyed on `RollResult`.

### Locked defaults (tunable constants, all in one place per file)
- Craft bar: **~450ms**, cook: **~500ms**, process: **~600ms** (single bar regardless of
  batch size — a 8→4 run is one bar). Ease `Sine.easeInOut`. All "pretty quick."
- Relic spin: **~1400ms**, `Quart.easeOut`, then a rarity-scaled reveal beat.
- Movement is **not** blocked; the busy flag only prevents re-clicking the same action.

### Commit-at-END, cancel-on-close (robustness)
The bar delays the *outcome*, not correctness. Nothing is consumed until the bar fills, so
the `busy` flag is the only thing needed to prevent a double action mid-bar.

> **Decision changed during implementation (was "complete after close"):** closing a menu
> mid-bar now **CANCELS** the bar cleanly (`progressBar.stop()` + `busy=false` in each menu's
> close path) rather than letting the tween still grant. Reason: the station menus lose their
> `openRack`/`openCampfire` ref on close, so their `onComplete` can't complete anyway —
> making crafting "complete after close" while cooking/drying silently no-op'd was an
> inconsistent, surprising split. Since nothing is consumed until completion, cancel is a
> true no-op (no lost resources, no half-craft) and uniform across all four menus. Verified:
> normal craft 0→1, cancel-on-close 1→1.

- **Craft/cook/process:** validate at click (as today — affordability, backpack room,
  workbench proximity). If valid, set `busy`, run the bar; on complete call the **existing
  synchronous method unchanged** (`deps.craft`/`processAmount`/`cook`) which consumes +
  grants, then re-render and clear `busy`. Inputs are consumed at completion — fine,
  because `busy` blocks any second action in the meantime. Minimal change, existing
  methods stay intact.
- **Relic:** the RNG must resolve at spin *start* (trophy consumed + `RelicManager` state
  mutated) so the world is consistent even if interrupted — but the **reveal is deferred**.
  `rollRelic` gains an optional `announce = true` param; the menu calls it with
  `announce:false` (suppresses the immediate event-log line + relic-bar sync), stores the
  `RollResult`, spins, and on completion calls a new `deps.announceRoll(result)` that fires
  the event-log line + `afterRelicChange()`. If the menu closes mid-spin the relic is
  already owned; it just shows on next open / bar sync — no loss.

## Changes by file

### New: `src/ui/ProgressBar.ts`
Generic fill bar as described. ~80 lines. No new textures (plain rects).

### New: `src/ui/RelicRevealFx.ts`
Owns the spin bar + reel gem + reveal. Reveal sequence keyed on `RollResult` (uses
`RARITY_COLOR`/`rarityHex`/`rarityIcon`/`rarityName` from `Relics.ts`):
- **Fail:** reel gem tints grey, small shrink+fade, subdued "crumbled to dust" line.
- **Common (success):** result gem placed at center scale 0 → punch to 1.25 → 1
  (`Back.easeOut`, ~300ms) + a small faint glow (reuse `light_soft` texture, tinted, scale
  up + alpha fade). Nice, modest.
- **Uncommon:** the above with a bigger punch + a brief **panel flash** (full-panel
  `Rectangle` fill of the rarity color, alpha 0→0.3→0).
- **Rare/Mythic:** bigger still + larger dual glow burst + panel flash + a radial **shard
  burst** (6–10 small rarity-colored `Image`s of the gem icon flung outward and faded via
  tweens) + a scaled-in banner line (e.g. `★ RARE! ★` above the result). Optional subtle
  `cameras.main.shake(120, 0.004)` for rare+ only.
Intensity comes from a small per-rarity config table (glow scale, flash alpha, shard count,
punch overshoot) so escalation is data, not branching. Reuses `light_soft` (BootScene line
717) as the glow brush (same as `NightOverlayUI`); **no new BootScene textures needed** —
the gem icons (`icon_relic_common/uncommon/rare/mythic`) already exist.

### `src/ui/CraftingMenu.ts`
- Add a `busy` flag + one `ProgressBar` instance (positioned over the detail-panel craft
  button area, rarity-neutral fill color).
- The craft button handler (line ~335): for **non-placeable** recipes, if not busy, start
  the bar instead of calling `deps.craft` immediately; on complete call `deps.craft(recipe)`
  + `render()`. **Placeable** recipes (`startPlacement`) are unchanged — no bar (the item
  lands on placement). Ignore clicks while `busy`; re-render disables/greys the button
  during the bar.

### `src/ui/DryingRackMenu.ts`
- Same pattern: `busy` + `ProgressBar` near the process button. On process click (line
  ~380), if valid + not busy, run one bar (single bar for the whole batch), then
  `deps.processAmount(inputAmount)`.

### `src/ui/CookingMenu.ts`
- Same pattern: `busy` + `ProgressBar` near the cook button (line ~215) → `deps.cook(id)`.

### `src/ui/RelicForgeMenu.ts`
- Add `busy` + a `RelicRevealFx` instance (centered in the panel).
- Roll-button handler (line 196): if not busy, call `this.deps.roll(trophyKey)` (which now
  resolves + consumes but does **not** announce), store the result, disable buttons, start
  the spin; on spin complete, run the reveal, then `this.deps.announceRoll(result)` +
  `render()` + clear busy.
- Keep the existing inline `renderResultLine` as the persistent post-reveal text (the FX
  handles the momentary flourish; the line remains until the menu reopens).
- Ensure `close()` also stops/destroys any in-flight FX.

### `src/scenes/MainScene.ts`
- `rollRelic(trophyKey, announce = true)`: gate the event-log lines + `afterRelicChange()`
  behind `announce`. Add a tiny `announceRelicResult(result)` (or reuse: pass `announce`
  through) that does the deferred log + `afterRelicChange()`.
- Extend `RelicForgeMenuDeps` with `announceRoll(result)`; wire in `create()` where the
  forge menu is constructed. Update `RelicForgeMenuDeps.roll` doc comment (no longer
  announces).
- No change needed to `craftRecipe`/`processRackAmount`/`cookAtCampfire` — they stay
  synchronous and are simply invoked from the bar's onComplete.

## Out of scope / deferred
- **Sound** (no audio system/assets exist) — the "satisfying" is purely visual for now.
- **Action queueing** (clicking craft 5× to queue 5 bars) — one at a time per menu; the
  `busy` flag blocks re-clicks. Note as a possible follow-up.
- Camera shake on rare+ is optional/subtle; drop it if it disturbs the HUD.

## Verification
1. `node node_modules/typescript/bin/tsc --noEmit` — type-check clean.
2. `preview_start` ("dev") → `preview_screenshot` to confirm boot; `preview_resize` if the
   render loop is paused (known quirk).
3. Via `preview_eval` on `window.__game.scene.getScene('MainScene')`:
   - Give the player resources, open the crafting menu, trigger a craft; confirm the bar
     runs (~450ms) and the item lands in the backpack **after** it fills (assert
     `backpack.count` before/after with an in-page `await new Promise(setTimeout…)`).
   - Repeat for drying rack (batch 8→4 = one bar) and campfire cook.
   - Give a `gremlin_trophy`, open the Relic Forge, roll: confirm the spin runs, the trophy
     is consumed at start (`backpack.count('gremlin_trophy')` drops immediately), and the
     relic appears in `relics.groupedForDisplay()` after the reveal; event-log line fires at
     reveal, not at click.
   - Force a success by pre-loading pity (`relics.roll` internals) or temporarily point a
     trophy at a `rare` pool to eyeball the escalated reveal; revert.
4. `preview_screenshot` mid-spin and at reveal for the gamba flourish; check
   `preview_console_logs` (level error) for runtime errors.
5. Confirm closing a menu mid-bar doesn't lose the item (grant still fires) and doesn't
   throw (FX/timer cleaned up).
```
No RECIPES.md change (no recipe/cost changes). Update STATUS.md + CLAUDE.md roadmap on ship.
```
