# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **third playtest fix
batch — one-shot placement, no more full-screen level-up flash, station-label depth
fix, aggro-based Comfort resting, output-based craft slider, Cook menu overflow fix,
craft-into-hotbar stacking, boss return-to-spawn on deaggro, War Camp guards no longer
respawn (or map-clutter) mid-fight, and a Victory/Death-screen input lock**,
**2026-07-11**._

**The game.** Top-down 2D pixel survival-ARPG (Phaser 3 + TypeScript + Vite; all
textures are placeholders generated in `BootScene`). One forest biome sitting in the
center of a large **circular** world (8000px, `WORLD_RADIUS` 4000; the biome fills a
central `BIOME_RADIUS` 2000 circle, the rest empty grass reserved for future biomes —
danger scales outward, the locked M-W1 direction). Day/night cycle and a hardcore
run/score meta-loop (seed is display-only for now). Shipped systems: gather/craft with
tool-KIND gating + a Workbench tier gate;
souls-like telegraphed combat on **every** enemy (Boar charge, Snake coil-lunge,
Gremlin/Gremling claws) plus the first boss (Gremlin King — poise/stagger + leaping
smash / charge / ground slam, enrage <50% HP); stamina/sprint/dash with dash i-frames;
Skills + Player Level progression; placeable stations (Campfire, Drying Rack, Relic
Forge, Bedroll); cooking → timed HP-regen food buffs; wearable 3-tier Gremlin armor +
weapon/station upgrades; elites (chance-based rolls + forced-elite shack guards)
dropping per-species trophies; a probabilistic trophy→Relic economy with a gated
**trophy-refinement** loop (the Gloaming Vein ore POI + Gloamwarden mini-boss →
Gloam Shards → the Relic Forge's Refine tab); a **nearby-view
minimap + full-screen zoomable/pannable world map** (M / Map button) with fog of war and
discovered-POI icons; the Gremlin War Camp + Gloaming Vein POIs; contextual hints + a
pause menu; and a drift-free balancing dashboard at `/dashboard.html` (second Vite entry,
imports live data modules).

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. The world is now circular + much larger (M-W1 geometry prep, above); deterministic
seeded world-gen and actual multi-biome content are still deferred to M-W1 proper.

**In progress / next.** the user is prepping for the first outside playtesters. This
session's batch (see below) is a further round of playtest fixes on top of 5z. A
brainstorm/plan is also in flight (not yet built): reworking Stats + Skills, which feel
negligible next to Relics now — the user's own direction is relics = the stats/buffs
layer, recipes = the uniqueness layer (e.g. a weapon recipe with a proc chance), with
Skills/Stats needing their own distinct reason to invest. See the plan doc once
committed. Real pixel art/animations stay deliberately deferred until content/balance
settle further (the whole texture pipeline is built to swap late — see `CLAUDE.md`
roadmap item 8). Next: finish the Stats/Skills rework brainstorm + plan, then resume the
locked build order — **M-TE** (trophy-gated special gear), then **M-W1** (multi-biome
content in the now-circular world) last.

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).
- **World Y-sort depth is now compressed** (`systems/depth.ts` `ysortDepth` = `y * 0.3`)
  so world objects stay below the fixed HUD even though the world is 8000px tall. Any NEW
  world object that Y-sorts by position must use `ysortDepth(y)`, not raw `y`, or it can
  draw over the HUD. Fixed-HUD depths (2600–6000) are unchanged and still clear it.

## Recent Entries

> Older entries in STATUS-archive.md.

### 5aa — Third playtest fix batch (placement, level-up flash, resting, sliders, boss/camp fixes, victory-screen lock)

An 11-item feedback batch off the user's continued playtesting (post-5z). Sonnet-class
fixes/tuning on already-designed systems — no new mechanic.

**Placement mode no longer re-arms after one placement (`MainScene.attemptPlaceObject`).**
The "stays armed so you can place several in a row" behavior (shipped in 5z) was built
anticipating a workflow the user doesn't want — a successful placement now always calls
`cancelPlacement()` immediately, both for crafted placements and re-placing an owned
stack (previously that path only exited once the very last owned copy was placed).
Placing another requires a fresh Place click / hotbar selection, matching how every
other equip-and-act flow already works.

**Level-up feedback drops the whole-screen `camera.flash` entirely
(`MainScene.showLevelUpBanner`).** Two prior tuning passes (5z included) dialed it down
and it still read as "annoying" — cut outright, replaced with a small local glow circle
behind the punch-in banner text (a growing, fading `Graphics` circle, screen-space,
scoped to the banner's own area) so there's still a "big deal" beat without washing the
whole screen.

**Station label depth fix — "hover a bench, the text is hidden behind other benches"
(`MainScene.refreshStationLabel`).** The per-station upgrade-tier label
(`this.placedLabels`) was a world-space `Text` with no explicit depth (default 0), so
any nearby placed object's own y-sorted depth (up to ~2400) could render right over it.
Now pinned to depth 2500 — above every world object, still below the fixed HUD
(2600+), same convention the hover-highlight outline already uses.

**Comfort resting is now aggro-gated, not radius-gated
(`MainScene.isAnyEnemyAggro`, replaces `isEnemyNearby`).** "As long as no enemies are
aggro'd on you, you should be able to rest" — the flat `COMFORT_SAFE_RADIUS` (350px)
blocked resting even when nearby enemies were just idling/wandering, not a real threat.
"Safe" is now `enemy.isAggro()` across all live enemies, regardless of distance.

**Crafting-menu batch slider now reads in OUTPUT units, not craft-repetitions
(`CraftingMenu.ts`).** Most recipes are 1:1 so this was invisible, but Shishkabob (x2),
Slingshot Pellets (x25), and Javelin (x2) all grant more than one item per craft — the
"Qty: N / max" readout and the "Craft xN" button now show `batch * recipe.output.count`
instead of the raw batch count, so the slider reads as "how many items," matching the
Drying Rack's existing output-based slider (4f).

**Cook menu intro blurb no longer overflows the panel, and is confirmed pinned at the
top (`CookingMenu.ts`).** The "Cook meat and vegetables..." blurb rendered as one
unwrapped line that could run past the panel's right edge; now wrapped to the panel
width with its real (possibly 2-line) height measured up front so the panel is sized/
centered around it correctly, right under the title. Also fixed a second, worse overflow
in the footer's selected-dish cost line: it repeated the dish's own name
(`"${recipe.name} — ${costParts}"`, already shown on the row above) which was wide
enough on 3-ingredient dishes to run under the Cook button — now cost-only, plus a
wordWrap safety net stopping short of the button column either way.

**Crafting a stackable item you already have in the hotbar now tops that stack up
first (`MainScene.addToBackpack`/`topUpExistingHotbarStack`).** Previously EVERY craft/
cook/process/refine output landed straight in the backpack regardless of what was
already equipped in the hotbar. `addToBackpack` now tops up a matching hotbar stack
(any slot, up to its max) before falling back to `backpack.add()` — but only tops up an
EXISTING stack, never places a new item into an empty hotbar slot (that would be a
surprising side effect of crafting).

**Boss wanders back to its spawn point once deaggro'd (`GremlinKing.updateIdle`).**
Getting kited past the leash mid-charge used to leave the King standing wherever it
ended up, fully idle. The deaggro'd branch now walks it back toward `spawnX/spawnY` at
`BOSS_MOVE_SPEED` (re-aggroing normally if the player wanders back within
`BOSS_AGGRO_RADIUS` along the way) instead of freezing in place.

**Gremlin Shack guards near the War Camp never respawn, and the huts are folded into
one map POI (`GremlinShack.nearCamp`, `MainScene`).** The 3 shacks fanned inside the War
Camp (vs. the 2 wild standalone ones) had their guards firing the same 6-min respawn
timer as every other shack — with no idea a Gremlin King fight might be in progress,
guards could pop mid-boss-fight. `onShackGuardKilled` now no-ops the respawn schedule
entirely for `nearCamp` shacks (the camp's own density — `spawnAltarDensity` — covers
ongoing camp danger instead); wild shacks are unaffected. `updateAltarDiscovery` also
now skips adding a separate "Gremlin Shack" landmark for `nearCamp` shacks — they're
part of the "Gremlin War Camp" POI, not their own, so the map doesn't show 4 markers
stacked on top of each other.

**Victory/Death screen now actually freezes input (`MainScene.create`'s global
listeners).** `update()` already early-returned on `runOver`, but the global
`pointerdown` handler and several `keydown-*` listeners (TAB, K, M, R, V, O, H, the
hotbar-select keys, mouse wheel) had no `runOver` guard at all — a player could still
craft, gather, attack, or open menus behind the RunEndUI. All now short-circuit on
`this.runOver`.

**Verification:** `tsc --noEmit` clean; full build unaffected. Extensive live
`preview_eval` verification (console error-free throughout): placement exits after one
object; hotbar stack topped 2→4 on a matching craft; `isAnyEnemyAggro` replaces the old
radius check; crafting-menu Qty/button read output units (Shishkabob batch 5 → "Qty: 10
/ 238", `output.count` 2); station labels report depth 2500; boss walked back toward
spawn (velocity pointed home, x decreasing) once forced deaggro'd from 700px out; a
War-Camp shack's guards left `respawnAt: null` after both were killed; the explored-map
landmark list held exactly one "Gremlin War Camp" entry near 3 discovered huts; TAB
opened the crafting menu normally but was a no-op once `runOver` was set (verified via
real `keyboard.emit('keydown-TAB')` dispatches); Cook menu blurb wrapped to 2 lines
within the panel; footer cost line for a 3-ingredient dish rendered without running
under the Cook button.

### 5z — Second playtest polish batch (SFX feel, toast fix, batch sliders, gating, forge UI)

Plan: `.claude/plans/nimble-polishing-lantern.md`. A 14-item feedback batch off the user's
5y playtest — fixes/tuning/UI on already-designed systems, built on **Sonnet** per the
model-switch convention (no new mechanic). Two forks locked via `AskUserQuestion` before
starting: Javelin's gate = tier-1 (Workbench-proximity, like Stone Pickaxe), not an
upgraded-Workbench gate; the trophy-generalization discussion (#14) = don't merge the
data model, just consolidate the Relic Forge's roll UI.

**SFX/feel tuning (`Sfx.ts`, `MainScene.ts`, `Boar.ts`).** `hit()` gain 0.1→0.035 and
shortened 90→55ms (was "annoying" at sustained combat pace — it fires on every hit both
directions). New `Sfx.skillUp()` (quiet two-note blip) fires from `skills.onLevelUp`,
distinct from the fuller `levelUp()` triad reserved for Player-level. The Player level-up
`camera.flash` cut 300ms@(48,36,12) → 150ms@(20,15,5) (still no shake) — "full screen
flash is too much" was itself a second dial-down of an already-softened flash from an
earlier batch. Boar charge `CHARGE_MAX_DISTANCE` 230→170 and `CHARGE_RECOVER_MS` 820→550
(still a real punish window, less brutal overshoot/recovery).

**Top-middle toast overlap — root cause found and fixed (`EventLogUI.ts`).**
`showToast`'s old `y = 72 + activeToasts * 40` counter decremented on fade-**complete**,
but toasts share a fixed delay+duration so the earliest-created one always completes
first — its slot could free up while a LATER toast was still visible, and the next toast
reused that Y and overlapped it (rapid cooking made "Cooked X" toasts collide; affected
every `info`/`combat`/`levelup` toast, not just cooking). Replaced with a reflowing
`activeCenterToasts: {height}[]` list (mirrors the `activeRecipeToasts` pattern already in
the same file for the side toasts) — each toast gets a real cumulative-height slot and
splices itself out on fade-complete. *Verified live: 3 rapid `info` toasts got distinct
stable-height slots (34px each), no overlap.*

**Crafting menu stays open through placement + re-arms on a new Place click
(`MainScene.ts`, `CraftingMenu.ts`).** Reverses a 40-min-batch fix that CLOSED the
crafting menu on `startPlacement` (to kill an "every craft click drops a workbench"
fall-through bug). That old bug is now prevented a different way: the global pointerdown
handler already returns early for any click landing on the still-open crafting panel
while `placementMode` is set (`craftingMenu.containsPoint` guard, pre-existing) — so
`startPlacement` no longer needs to close the panel to stay safe. `startPlacement` is now
idempotent/re-entrant: calling it again while already mid-placement (e.g. clicking a
DIFFERENT placeable recipe's "Place" button) destroys the old ghost and re-arms to the new
recipe instead of leaking a ghost or stacking placements. `attemptPlaceObject` also now
calls `craftingMenu.refresh()` so the live cost readout stays accurate as materials are
spent across repeated placements. *Verified live: workbench→campfire re-arm swapped the
ghost texture cleanly with the crafting menu staying open and zero actual placements
landing; the old fall-through bug confirmed still dead (panel clicks return early).*

**Batch-quantity sliders for stackable crafting + cooking
(`CraftingMenu.ts`, `CookingMenu.ts`, `MainScene.ts`, `ItemContainer.ts`).**
`craftRecipe`/`cookAtCampfire` both gained a `batches` param (default 1, loops the
existing per-unit craft/cook + grants total output, one shared commit) backed by new
`maxCraftBatches`/`maxCookBatches` (min of cost-affordable batches and
`ItemContainer.roomFor()`-bounded batches — `roomFor` is a new `ItemContainer` method,
`hasRoomFor`'s boolean check generalized to return the actual remaining capacity).
**CraftingMenu**: a slider appears above the Craft button only for non-placeable,
stackable-output (`maxStack > 1`) recipes with >1 batch affordable; the ingredient-cost
readout scales live with the slider, button reads "Craft x{N}", one `ProgressBar` covers
the whole batch. **CookingMenu was restructured** from "each row has its own inline Cook
button" into a select-a-row-then-shared-footer flow (mirrors CraftingMenu's list+detail
shape) — clicking a dish row selects it (highlighted border) instead of cooking it
immediately; a new footer below the row list shows the selected dish's batch-scaled
ingredient cost, a slider (when >1 batch is affordable), and one Cook button. Both
sliders share MainScene's existing global pointermove/pointerup drag plumbing (extended
with `isDraggingSlider`/`updateSliderFromPointer`/`endSliderDrag`, same pattern
`DryingRackMenu`'s amount slider already used). *Verified live: 3-batch Shishkabob craft
spent 3 wood → 6 shishkabob (recipe now 1 wood → 2, see below); 4-batch Cooked Boar Meat
spent 4 boar_meat → 4 dishes; dragging the cooking slider to max showed "Qty: 6/6" and
"Cook x6" with the ingredient text scaling to match.*

**Drying Rack output slot shows the output item's icon (`DryingRackMenu.ts`).** The
"→ N Twine" preview text now sits next to a small icon of the actual output item
(`itemDef(recipe.output).texture`), reading visually like the input slot instead of
text-only.

**Shishkabob recipe + art (`Recipes.ts`, `BootScene.ts`).** Output bumped to `count: 2`
(1 Wood → 2 Shishkabob, cost unchanged). Texture redrawn from a stick-with-red/green-
chunks (which "already looked full of stuff") to a bare wooden skewer with a sharpened
tip — chunks now only belong on the COOKED dishes.

**Javelin + Slingshot Pellets recipe gating (`Recipes.ts`, `Crafting.ts`).** Javelin
bumped tier 0→1 (Workbench-proximity gate, like Stone Pickaxe/Slingshot — the locked fork
answer) + `requiredSkills: [{skill: "pierce", level: 5}]` — a free starter javelin at
Pierce 0 undercut the point of the (also-ranged, pierce-typed) Slingshot as the actual
early opener. New `Recipe.requiresDiscovered?: string[]` field + a
`Crafting.otherRecipesDiscovered` check: Slingshot Pellets now stays hidden until the
player has crafted a Slingshot at least once (`requiresDiscovered: ["slingshot"]`) — stone
is common enough it would otherwise appear immediately, well before there's a launcher to
load it into. *Verified live: both hidden pre-gate, both discovered immediately after
placing a workbench+Pierce 5 / crafting a slingshot respectively.*

**Relic Forge roll UI consolidated to one button per RARITY, not per species
(`RelicForgeMenu.ts`).** From the #14 discussion: species trophies (Boar/Snake/Gremlin)
stay separate as drops (flavor + M-W1 per-source-rarity scaffolding — NOT merged), but
since they already share identical odds/pity by rarity (5n), showing 3 near-identical
"Bind X Trophy" buttons was pure UI noise. New `rarityGroups()` groups every owned trophy
key by its `TROPHY_ROLL` rarity and renders ONE button per group ("Roll a Common Trophy",
showing the combined count); `pickTrophyToRoll()` consumes whichever species has the
highest count on click, draining stock evenly rather than favoring one arbitrarily. Odds/
pity/reveal-fx are unaffected (same `beginRoll` path, just fed a different key). *Verified
live: 3 owned trophy types (gremlin/boar/snake, totaling 9) collapsed into one Common
group; the picker correctly chose the highest-count species (boar_trophy, 5 owned).*

**Dashboard "sometimes doesn't load" — investigated, no bug found.** `/dashboard.html` is
a second Vite entry that only serves while `npm run dev` is running THIS project.
`.claude/launch.json`'s Preview config has `"autoPort": true`; if a stale/orphaned Vite
process from an earlier closed session is still holding port 5173 (exactly what happened
in 5y — 5 orphaned processes), a *new* session's dev server silently starts on 5174+
instead, but a bookmarked fixed-port URL still points at 5173 — looks broken even though a
server IS running. No code fix applies; environmental (kill orphaned `node.exe` processes
before starting a fresh session).

**Verification:** `tsc --noEmit` clean; full `npm run build` succeeds (main bundle
>500kB warning is pre-existing/unrelated). Extensive live `preview_eval` verification per
item above (console error-free throughout). `RECIPES.md` updated (Shishkabob output x2,
Javelin tier 1 + Pierce 5, Slingshot Pellets discovery-gate footnote).

### 5y — Inventory sort/split + ranged starter weapons (Slingshot + Javelin) + minimal SFX

Closes out the rest of the playtest-polish backlog from 5x/5q/5r. Plan:
`.claude/plans/twinkly-orbiting-backus.md`. Two Sonnet-class quick fixes plus one new
mechanic (ranged weapons + a new Equipment slot) built on Opus per the model-switch
convention, plus a small standalone SFX addition.

**Inventory auto-sort + Shift-Click split-stack.** `ItemContainer.sortAndStack()` (new)
re-flows a container into merged, sorted, re-packed stacks — a "Sort" text button next to
the Backpack header in `InventoryMenu.ts` calls it. Shift+Left-Click on any stack of >1
(backpack/hotbar/chest/drying-rack — anywhere `beginItemDrag` is the entry point) now
splits it roughly in half into another empty slot in the same container, then drags the
split-off half — reuses 100% of the existing drag/drop/merge machinery
(`MainScene.trySplitStack` + `beginItemDrag`), no new resolve-time logic needed. Falls back
to a normal whole-stack drag if the container has no empty slot to split into.

**Ranged weapons (Slingshot + Javelin) + Ammo equipment slot.** Locked via
`AskUserQuestion` + a side-chat balance discussion: ranged aiming reuses the existing
click-a-hovered-enemy-in-reach model (NOT free-aim); Slingshot uses a new **`"ammo"`**
`EquipSlot` (paper-doll grid, now 10 slots — `ARMOR_ROWS_MAX` is computed, not a literal);
Javelin is a self-contained disposable hotbar weapon (no ammo slot — throwing depletes its
own stack). **`EquippedItem` gained a `count?: number`** field so the ammo slot could reuse
the *existing* armor-equip machinery (`equipArmorFromContainer`/`unequipArmorSlot`/
`armorSlotAt`/right-click context menu) almost verbatim — it branches on `slot === "ammo"`
for merge-not-swap semantics (topping up a matching key vs. swapping a different one out),
rather than building a parallel ammo system. `slingshot_pellets`'s `ItemDef.armorSlot` is
literally `"ammo"`, so `quickMoveItem`'s existing `armorSlot` branch covered double-click
equip for free with zero new code there.
`tryAttackEnemy` is now a thin dispatcher (`isRangedWeapon` check) over `tryMeleeAttack`
(the old body, unchanged) and new `tryRangedAttack`; both funnel into a new shared
`resolveWeaponHit(enemy, dmg, dmgType)` extracted from the old kill-resolution tail (skill
XP/loot/armor-XP/run-scoring), so melee and ranged can't drift out of sync on kill logic.
Ranged damage (incl. any stagger multiplier) is computed once at fire time and carried by
the `Projectile` — reused verbatim, it was already built anticipating this (`sourceIsPlayer`
was defined but unused). New `playerProjectiles` group + overlap-vs-`enemyGroup` (mirrors
the enemy-projectile-vs-player overlap exactly, including the arg-order gotcha). A new
`RANGED_WEAPONS` config in `Weapons.ts` (`maxRangePx` replaces melee `enemyReach()` for both
the attack gate and the hover prompt/reach-ring). **Balance is deliberately weak per
the user's locked side-chat direction — an opener/softener, not a solo tool:** Slingshot 2
dmg/650ms/6 stam (below even Wood Club's 3 dmg), Javelin 5 dmg/900ms/16 stam, both slow
projectiles (420/300 px/s) and bounded range (260/220px) — stamina cost + slow travel +
bounded range are the anti-kite governor this batch; **no enemy-AI changes**. Both use
`"ranged"` as their primary damage type, finally giving the long-dormant Ranged weapon skill
a real XP source (`weaponSkillDamageMultiplier` already generic over `DamageType` — zero
`Skills.ts` changes needed). `Recipe.output` gained an optional `count` field (defaults 1)
so Slingshot Pellets (5 Stone → 25) and Javelin (3 Wood + 1 Stone → 2) can batch-output —
`craftRecipe` now grants `output.count ?? 1` instead of a hardcoded 1.

**Minimal SFX layer.** `src/systems/Sfx.ts` (`SfxPlayer`) — raw Web Audio
`OscillatorNode`/`GainNode` envelopes synthesized at call time, no asset files, same
"generate in code, swap for real assets later" ethos `BootScene` established for textures.
Six cues (`hit`/`pickup`/`craft`/`levelUp`/`nightfall`/`death`) wired into existing hook
points (`resolveWeaponHit`, `applyDamageToPlayer`, `collectNode`, `craftRecipe`/
`processRackAmount`/`cookAtCampfire`/`refineTrophies`, `showLevelUpBanner`, the day→night
edge in `updateDayNight`, `onPlayerDeath`). A persisted on/off toggle
(`survivor-rpg:sfx-enabled:v1`, same pattern as Hints') lives in `PauseMenuUI` next to the
Hints toggle. `sfx` is deliberately **not** re-created in `create()` (unlike `hints`) so the
`AudioContext` + preference survive a "New Run" restart instead of resetting with the rest
of per-run state.

**Verification:** `tsc --noEmit` clean; full `npm run build` succeeds. **Live-verified via
`preview_eval`** (after clearing 5 orphaned Vite processes from closed chats that were
holding the per-folder server cap): Slingshot fires a player projectile at a 150px enemy
(out of melee reach) → 2 dmg on impact, projectile despawns, ammo 30→29, stamina −6,
cooldown stamped; firing at 0 ammo is a clean silent no-op (no projectile/stamina/
cooldown); out-of-range (400 > 260) doesn't fire or consume ammo; the hover prompt +
`attackRangeFor` correctly report the 260px ranged radius. Javelin self-consumes 1/throw
and auto-unequips (weapon→null, slot→null) at 0. Melee is unaffected (Wood Club still hits
at 50px for 3 dmg, reach stays 64, does NOT inherit the ranged radius; no-ops at 200px).
Auto-sort merges+front-packs (wood 5+10→15, alphabetical); Shift-split 11→6+5 into the
next slot, null fallback when the container is full. All 6 SFX cues fire with no console
errors. The inventory panel renders the Sort button, the Ammo equipment slot (with count
badge), and the "Ammo: N …" Combat-column line.

### 5x — Playtest-readiness Tier 1 (discovered-material toast + hover highlight + first-damage hint)

Off the playtest-polish backlog (see the previous "Balancing dashboard" entry's triage
notes), the three cheapest comprehension-gap fixes ahead of handing the build to outside
playtesters. Sonnet-class fixes/UI on existing systems — no new mechanic. Passive HP regen
(the fourth backlog item) was explicitly cut per the user: Comfort (Bedroll) + cooked-food
buffs already own HP sustain, and a passive trickle on top would make both feel pointless.

**Discovered-material toast** (`EventLog.ts`/`EventLogUI.ts`/`MainScene.ts`). New
`LogKind: "material"` reuses the existing recipe-unlock slide-in/stack/fade toast verbatim
(`EventLogUI`'s `enqueueRecipeToast`/`spawnRecipeToast`, which only ever hardcoded the
`recipe` color — now reads `KIND_COLORS[entry.kind]` so both kinds share one queue/stack
instead of colliding if they fire the same beat), in a new blue accent (`#8ac2e0`) distinct
from recipe's amber. New `MainScene.discoverMaterial(key)` centralizes every
`discovered.add()` call site (world pickup via `collectNode`, `addToBackpack` — crafting/
cooking/processing output included — and `reconcileBackpackDiscovery` for chest/rack loot)
so the toast fires exactly once, wherever a key is first obtained, regardless of path. A
new module-level `CRAFTED_OUTPUT_KEYS` (unioned from `RECIPES`/`PROCESS_RECIPES`/
`COOK_RECIPES`/`REFINE_RECIPES` output keys) excludes crafted/cooked/processed/refined
goods from the toast — those already get their own "New Recipe Unlocked!" toast the moment
they become craftable, so a second "Discovered: X" on first craft would be redundant.
*Verified live: first `wood` pickup → "Discovered: Wood" material toast + its recipe
unlocks; a second `wood` pickup → no new entries (dedup); adding a crafted `stone_axe` →
no material toast.*

**Hover highlight** (`MainScene.ts`). A world-space `Graphics` outline (`hoverHighlight`,
mirrors `attackRangeRing`'s idiom) redrawn each frame in `updateHover()`, strictly gated on
the SAME `prompt` string the bottom-right text already uses — so a no-tool-equipped or
out-of-reach hover shows no highlight either, preserving the prompt-gating design's
"reveal nothing" rule. Depth = `ysortDepth(target.y) + 0.5` (mirrors GremlinKing's
telegraph-graphics depth convention), so it draws just above whatever's hovered — works
uniformly across nodes/enemies/racks/shacks/altars/workbench/campfire/forge since they all
expose `x`/`y`/`displayWidth`/`displayHeight`. *Verified live: `commandBuffer.length` is 0
with a null prompt, 14 (a drawn circle) with a hovered node + non-null prompt; depth
computed correctly for the target's y.*

**First-damage hint, not 30%-HP-threshold hint.** The `low_hp` hint used to poll
`health/max <= 0.3` every frame; renamed to `took_damage` and moved to fire once, right
when `applyDamageToPlayer()` actually lands a hit — a fresh player doesn't need to bleed
down to 30% before learning food/rest heal over time, and the old poll could also fire
well into a fight rather than at the actually-informative moment (first hit ever). Text
updated to mention both cooked food and Comfort/campfire resting. *Verified live: one hit
→ hint fires once with the new text; a second hit → no re-fire (idempotent, matches every
other `HintManager.trigger()` call).*

**Verification:** `tsc --noEmit` clean; preview boots console-error-free (driven via
`preview_eval` — the preview tab loaded backgrounded/hidden this session, the documented
quirk in `CLAUDE.md`'s verification workflow; `window.__game.scene.start('MainScene')`
force-advanced the stalled scene transition so live state could still be exercised).
`RECIPES.md` unchanged (no recipe/cost changes).

**Still queued:** inventory auto-sort, a ranged starter weapon, then a minimal
code-generated SFX layer (hit/pickup/craft/level-up/nightfall/death — same placeholder
ethos as the generated textures, swappable later) before a second/wider playtest round.
Real pixel art + animations stay deferred until content/balance settle further (last, per
`CLAUDE.md` roadmap item 8). Then the master-plan tail: **M-TE** (trophy gear), **M-W1**
(multi-biome world).

### Previously: Gloaming Vein (rarity-ore POI + mini-boss + trophy refinement)

Built the next locked feature after the world/map rework — plan:
`.claude/plans/amethyst-warding-vein.md`. Built on **Opus** (new mechanic: a POI + a
bespoke mini-boss + a refinement data model). A content+economy pass on the M-RL relic
loop: kill elites → raw Common trophies (86.5% crumble when rolled) → find + clear the ore
POI → Gloam Shards → spend them at the Relic Forge's new **Refine tab** to climb a raw
trophy one rarity up into a **Refined trophy that never fails a roll** (Uncommon outcome
table = 100% floor). Fully gated behind exploration + a mini-boss ("nothing free").

**The POI (world-gen, `MainScene`).** `veinPosition` is chosen once in `create()` after
the altar (so it stays ≥900px from BOTH world center and the war camp — verified 1290px
from center / 2429px from camp) and before node/enemy spawning, so a new
`VEIN_CLEAR_RADIUS` (160) exclusion in `pickSpawnPoint` keeps ordinary trees/rocks/enemies
out of the ore clearing (same pattern as the war camp — [[feedback_poi_busy_not_placeholder]]).
`spawnGloamingVein()` drops the **Gloamwarden** guardian at the clearing center ringed by
**5 shielded ore `ResourceNode`s** (Stone-Pickaxe-gated `mine` action, non-respawning, 1–2
Gloam Shard each, ~2 hits) plus **10 decorative amethyst crystal clusters**
(`gloam_crystal_cluster`). New `ResourceNode.shielded` flag + `crack(texture)`: shielded
nodes are skipped by hover/prompt/interact (like `harvested`) and swap
`gloaming_vein_shielded` → `gloaming_vein` when the guardian dies. **Unique area look** (so
the ore reads as its own place, like the war-camp floor does for the altar):
`buildBiomeTexture()` stamps a distinct **gloam-blighted crystalline floor** over the
clearing (dark-violet wash + a brighter amethyst core). Vein node + a few crystal positions
feed `veinLightPoints` that `collectLights()` iterates, so the crystals **glow purple at
night** — a navigation beacon like the war-camp braziers. Discovered within `REVEAL_RADIUS`
→ a purple **minimap landmark** (`map_vein`, generalized `updateAltarDiscovery`). New
per-run fields reset in `create()`.

**The guardian (`src/entities/Gloamwarden.ts`).** A bespoke mini-boss following
GremlinKing's telegraph/poise pattern but **lighter** (per the "no shared boss framework"
lock — a trimmed sibling, not a subclass of GremlinKing). Extends `Enemy`, fully overrides
`update()`. 260 HP, scale 1.7, poise 60 → stagger (2.5s, ×1.5 damage punish), difficulty
between an elite and the King; regens 10 HP/s while deaggro'd. Two **bespoke** purple-
telegraphed attacks — deliberately NOT the roster's charge/radial-slam (the user: those read
as "Boar charge / King slam again"): a **Leaping Smash** (leap to a locked landing spot +
AoE 95px, 22 dmg + kb — kept to preview the Gremlin King's own leaping smash) and a **Gloam
Eruption** (the warden roots itself and channels, then crystal spikes erupt at the player's
locked ground spot, 72px, 24 dmg + small launch — boss stays put + vulnerable = a punish
window; dodge is to leave the marked ground). Area damage flows through `checkPlayerHit()`
(queried in `updateEnemies` alongside GremlinKing) into the same `applyDamageToPlayer` choke
point, so dash i-frames/armor "just work." On death, `onGloamwardenKilled()` cracks the vein
+ guaranteed drop 3–4 Gloam Shard + 1 Refined Trophy. Scored as an **elite** kill (no
dedicated mini-boss band — the plan's "simplest" open sub-decision).

**Refinement (`Relics.ts` + `RelicForgeMenu.ts`).** New `REFINE_RECIPES` (data-driven,
tier-keyed) + `refinableTrophyKeys`/`ownedRefineInput`/`canAffordRefine` helpers. Biome-1
recipe: **3 raw Common trophies (any species mix) + 2 Gloam Shards → 1 Refined Trophy**;
an Uncommon→Radiant scaffold row exists but never surfaces (no raw Uncommon source in
biome 1). Refined trophies are **roll-only** `TROPHY_ROLL` keys (never dropped, never a
refine input — single-step + terminal, which caps biome 1 at Refined Uncommon and blocks
an infinite ladder). The forge menu gained a **Bind / Refine tab toggle** ("Bind" is the
in-universe name for rolling — the forge "binds trophies into relics"); the Refine tab
lists affordable recipes with a live cost readout + a **timed `ProgressBar`** (650ms,
commit-at-end + cancel-on-close, same as craft/process/cook). `MainScene.refineTrophies()`
consumes inputs greedily across species + grants the output at bar completion. **The Refine
tab is hidden entirely until the Relic Forge reaches Lvl 2** (no locked tab, no hint) — a new
**Gloam Conduit** station upgrade (`StationUpgrades.ts`, 15 Stone + 1 Gloam Shard, right-click
the forge → Upgrade) unlocks it. So you can't refine until you've mined at least one shard
(which the upgrade itself costs).

**Verified live** (`preview_eval` + screenshots): all new textures load; POI spawns 5
shielded nodes + guardian at correct distances; shielded nodes un-hoverable even with a
pickaxe equipped; guardian cycles telegraph → **Leaping Smash** (22, kb 200) / **Gloam
Eruption** (24, kb 120) → recover, and poise-0 → staggered; killing it cracks all 5 nodes
(texture swap, `shielded` false); the vein clearing shows its distinct gloam floor + crystal
props (screenshotted); the **Refine tab is hidden entirely at forge Lvl 1** (only the Roll
tab shows) and **appears at Lvl 2**, and the **Gloam Conduit** upgrade applies near a Workbench
(tier 0→1, −15 Stone/−1 Gloam Shard); refine consumes 3 mixed-species commons + 2 shards →
1 refined; a Refined trophy rolls **200/200 successes** (Uncommon 100% floor); the
ProgressBar commits at end (nothing consumed mid-bar); 9 vein light points reach
`collectLights`.
`tsc --noEmit` clean; console error-free. `RECIPES.md` + the dashboard (Relics Refine
table + Enemies Gloamwarden row) updated. See [[survivor-rpg-gloaming-vein-plan]].

**Next:** **M-TE** (trophy-gated special gear), then **M-W1** (multi-biome content in the
now-circular world) last.

### Previously: Circular bigger world + minimap nearby-view + full-map overlay

Off the master-plan build order (the user paused the Gloaming Vein to first do the world/map
rework, prepping for M-W1). Built on **Opus** (new world-gen geometry + two new map
systems). Three asks: (1) make the world **circular + much bigger**, keeping the current
biome ~its size but leaving room (empty for now) for future biomes; (2) the corner minimap
should show a **nearby view** (what's on screen), not the whole world; (3) a **full map**
opened by a button, **zoomable (scroll) + pannable (drag)**, with **POI icons once
discovered**.

**Circular bigger world.** New geometry constants in `MainScene`: `WORLD_RADIUS` 4000
(→ `WORLD_SIZE` 8000px square that bounds the world circle), `BIOME_RADIUS` 2000 (the
central content circle, ~the old 3584×2688 biome, slightly larger), centered at
`WORLD_CX/CY` = 4000. `WORLD_W`/`WORLD_H` kept as back-compat aliases = `WORLD_SIZE` (all
the existing `WORLD_W/2`-is-center math still holds). **`Biome` is now origin-aware**
(`new Biome(originX, originY, regionW, regionH, rng)`) — it generates only a centered
`BIOME_SIZE` region and `forestWeight`/`creekWeight` return 0 outside it, so the outer ring
is plain grass. `buildBiomeTexture()` bakes only that region (a `BIOME_SIZE`×`BIOME_SIZE`
RenderTexture placed at the region origin — kept well under the GPU texture-size limit
instead of a full-world 8000px bake). All spawn samplers (`pickSpawnPoint`,
`pickCreekEdgePoint`, `pickPointNearAltar`) now sample within the region and reject points
outside `BIOME_RADIUS`, so all first-biome content stays in the central circle (verified:
0/396 nodes outside; a few war-camp/shack guards spill ~120px past onto grass, as the camp
sits at the biome's outer edge — fine/thematic). `clampPlayerToWorld()` pins the player to
the world circle each frame; `drawWorldBoundary()` fills a dark **void ring** beyond
`WORLD_RADIUS` (cheap concentric thick strokes, no giant texture) + a shoreline accent, so
the playable area reads as a round island.

**Depth regression fixed (important).** Enlarging the world pushed world-object Y-sort
depth (`= y`) up to ~8000, which drew low trees/enemies OVER the fixed HUD (2600–6000).
New **`src/systems/depth.ts` `ysortDepth(y) = y * 0.3`** compresses the world Y range into
a bounded band (max ~2400, below the HUD), applied at every world Y-sort site
(Player/Enemy/ResourceNode/GremlinShack/BossAltar + war-camp props). Order preserved;
ground/ring negatives + low-depth drops/damage-numbers unaffected. **Any new Y-sorting
world object must use `ysortDepth`.**

**Map rework — three pieces.**
- **`src/systems/ExploredMap.ts`** (new, framework-light) — the shared explored-world
  model behind both views: a world-space fog color cache (one 0xRRGGBB per 40px fog cell,
  −1 = unrevealed) + the discovered-POI landmark list. It's the **single consumer** of
  `FogOfWar`'s reveal queue (`drainRevealed()` updates the cache + returns changed cells),
  so the two views can't race. Fog grid is now world-space (200×200 @ 40px), decoupled from
  any HUD panel resolution.
- **`MinimapUI` rewritten** — the corner panel is now a **player-centered nearby window**
  (~2240×1680 world px, a touch past the 1920×1080 viewport), repainted each frame from the
  color cache as clipped Graphics rects (no whole-world shrink). Landmark dots + player
  marker + night dim. A small **"🗺 Map (M)"** button is tucked in its corner.
- **`src/ui/WorldMapUI.ts`** (new) — the full-screen overlay (M key / Map button / ✕ /
  Esc). Draws the whole explored fog cache as clipped, zoom/pan-transformed Graphics rects
  (a dirty flag rebuilds terrain only on zoom/pan/new-reveal; the same reliable fixed-HUD
  clipping the minimap uses, no geometry-mask-vs-scroll drift). **Scroll = zoom (1–10×),
  drag = pan (clamped)**; discovered POIs get an **icon + label** (`map_altar` red/gold war
  camp, `map_shack` brown — new BootScene markers). **Non-modal** per the locked design —
  the game keeps running and the player can walk while it's open (world clicks/hover
  suppressed over it; it doesn't pause). Keybinds panel gained a "World map: M" line.

**Verified live** (`preview_eval` + screenshots): player spawns at center (4000,4000);
biome origin (2000,2000)/region 4000²/fog 200²@40; altar 1955px from center (in-biome);
0 nodes outside the biome circle; player shoved to (4000,8300) clamps to dist 3980
(`WORLD_RADIUS`−20); void/shoreline ring renders at the edge; nearby minimap scrolls with
the player and shows the edge as void; full map renders the explored trail + war-camp +
3 shack icons/labels, zoom scales cleanly (clipped to panel), a 250px drag pans and a huge
drag clamps to 1611; and — the depth fix — trees no longer draw over the map panel (a
mid-test RunEndUI correctly sat above it at 3500). `tsc --noEmit` clean; console
error-free. No `RECIPES.md` change (no recipe/cost changes).

**Next:** the **Gloaming Vein** (mineable rarity-ore POI + trophy refinement, plan
committed at `.claude/plans/amethyst-warding-vein.md`), then **M-TE**, then **M-W1** proper
(multi-biome content + deterministic seeded gen in this now-circular world).

