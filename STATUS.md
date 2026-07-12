# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Playtest polish batch
(11 fixes) — F11/right-click hints, elite red hover tooltip, diagonal javelin icon +
nose-first thrown angle, dash afterimage VFX, Gloamwarden return-to-spawn leash, slower
text fades, altar/totem win-path guidance hints, and a "Now:" total-effect line per stat
on the Character menu**, **2026-07-12**. Prior: Enemy respawn (fog top-up); M-SS (stats/
skills depth pass — crit + distinct-axis effects + relic synergy)._

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

**In progress / next.** A playtest polish batch (11 fixes — see the top entry below) shipped
this session off the build order (discoverability hints, elite/boss hover tooltip, javelin
art + throw angle, dash VFX, mini-boss leash, slower text fades, altar/totem guidance, stat
total-effect display). Before that, enemy respawn (fog top-up) made the roster renewable, and
M-SS gave Stats + Skills each a distinct, always-live axis
relics don't touch (crit, regen/healing, XP/buff-duration, gather bonuses, dash-window), and
converted HP/stamina relics flat→percent so they multiply a stats build instead of dwarfing it.
Real pixel art/animations stay deliberately deferred until content/balance settle further
(the whole texture pipeline is built to swap late — see `CLAUDE.md` roadmap item 8). Next:
resume the locked build order — **M-TE** (trophy-gated special gear; it will read the
untouched-but-reserved weapon-skill threshold hook for procs), then **M-W1** (multi-biome
content in the now-circular world) last. Crit numbers, per-point stat values, and the
skill-effect rates are all first-pass — expect a tuning pass after a playtest (per-weapon
base crit is the lever if a weapon feels off; re-check the "boss slightly overtuned" gap
now that crit is a player-driven damage ramp).

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

### Playtest polish batch — hints, elite tooltip, javelin, dash VFX, miniboss leash, text timings, stats display

Grab-bag of 11 playtest-feedback fixes (Sonnet-class polish on existing systems, no
new mechanic). Verified live via `preview_eval` + screenshots; `tsc --noEmit` clean.

- **F11 fullscreen reminder** — folded into the `awaken` hint text and added a
  "Fullscreen: F11" line to the Keybinds panel (F11 is the browser's own native
  fullscreen; nothing to wire).
- **Right-click discoverability** — new `right_click_tip` hint ("Right-click equipped
  gear or a placed station to inspect and upgrade it") triggered the first time the
  player places a station OR equips an armor piece, plus a "Inspect / upgrade: Right
  Click" Keybinds line.
- **Elite/boss red hover tooltip** — `promptForEnemy` now prefixes `Elite ` for
  `enemy.elite`, and a new `promptColorFor()` tints the bottom-right prompt text:
  crimson `#ff5a5a` for a boss/mini-boss (`GremlinKing`/`Gloamwarden`), orange
  `#ff9d5c` for elites, white otherwise. Verified: "[LMB] Attack Elite Boar".
- **Javelin art + thrown angle** — `icon_javelin` redrawn DIAGONALLY (bottom-left →
  top-right) so it no longer reads like the vertical Primal Spear icon. The in-flight
  javelin now flies nose-first: added `ProjectileConfig.artAngleOffset` (applied in
  `setRotation`) + `RangedWeaponConfig.projectileArtAngleOffset` = `Math.PI/2` for the
  javelin (its streak art points up). Verified rotation = angle+90°.
- **Dash more obvious** — `Player.playDashFx()` spawns 3 staggered translucent
  blue-tinted afterimage ghosts of the player sprite that fade/shrink over 260ms;
  called from the `frame.dashStarted` branch in `update()`.
- **Gloamwarden roams back to spawn** — its `updateIdle` deaggro branch now walks the
  mini-boss back toward its spawn point (mirrors `GremlinKing`'s `RETURN_HOME_EPS`
  return-home behavior) instead of idling wherever it was kited to.
- **All text fades slower** (playtest: "text isn't fading out slow enough", gloam-shard
  help vanished too fast) — HintUI HOLD 5200→8000 / FADE 700→1400; EventLogUI recipe/
  material toast HOLD 3200→5500 / FADE 900→1500; center toast delay 2200→4000 /
  duration 900→1500.
- **Altar/win-path guidance** — two new hints so the goal is clear after clearing camps:
  `altar_found` (fires when the War Camp altar is discovered on the map) and
  `totem_ready` (per-frame idempotent poll — fires once the player holds a
  `gremlin_totem`, pointing them to place it in the Boss Altar's fire). This
  deliberately relaxes the old "never spell out the win condition" hint rule, per
  the user's request.
- **Stats page total effect** — new `Progression.statTotalEffect(stat, p)` returns the
  CURRENT cumulative effect of points already spent (e.g. Vitality 5 → "+20 max HP,
  +7.5% healing"); shown as an amber "Now: …" line under each stat in `CharacterMenu`'s
  Stats tab (row height 44→52 to fit the third line).

### Enemy respawn — fog top-up (playtest food-economy fix)

Off the master-plan build order, built on **Opus** (a new spawn subsystem with its own
timing/state, not just a tuning change). Playtesters were burning through food far faster
than expected because the enemy roster was **one-shot and finite** — only wild (non-camp)
Gremlin Shack guards ever came back (their own 6-min pair timer). Meat sources (Boar/Snake)
drained to empty over a run. Now the world keeps itself huntable.

**Model (locked with the user via `AskUserQuestion`): fog top-up**, chosen over per-kill
replacement and full-world repopulation. A periodic check (`MainScene.updateRespawns`, every
`RESPAWN_TICK_MS` = **30s**, called from `update()`'s **alive branch only**) keeps the live
non-boss enemy count within `RESPAWN_NEARBY_RADIUS` (1500px) of the player topped up toward
`RESPAWN_NEARBY_TARGET` (10), spawning at most `RESPAWN_PER_TICK` (1) replacement per tick. At
1/30s that repopulates a fully cleared area in **~5 min** — the locked pace (an initial 7s/
~1-2 min tick felt way too fast in playtest; the user wanted ~5 min/area max). Bounded both
locally (the target) and globally (`RESPAWN_MAX_LIVE` 160) so camping can't build a swarm and
a long run can't run away.

**Off-screen spawns.** Reuses the nightfall-surge spawner: `pickNightSpawnPoint` gained
optional `ringMin`/`ringMax` params (default to the night constants), and respawns call it
with `RESPAWN_RING_MIN`/`_MAX` = **1150–1600px** — just past the camera's ~1102px
half-diagonal, so a replacement never materializes on-screen. Verified live via
`preview_eval`: at every realistic in-biome player position (center out to the ~1800px biome
edge) **100% of 200 sampled spawns landed >1102px away**; the only close spawns occur way out
in the empty outer grass (2800+px from center) where ring points clip the world edge and get
clamped — a spot players never hunt.

**Species mix.** `makeRespawnEnemy` weights by the baseline `spawnEnemies()` counts
(Boar 24 / Snake 28 / RangedGremlin 22 / MeleeGremling 8 = 82), so meat sources (~63%)
dominate — respawns fix the food shortage directly while keeping variety. Elite rolls at the
standard `rollElite` chance, night-boosted (`NIGHT_ELITE_CHANCE_MULT`) like every other spawn
path, so trophies stay renewable too.

**Excluded:** Gremlin King / Gloamwarden (one-shot win/mini-boss — filtered from both the
count and the spawn table), and the Gremlin Shack guards keep their own timer untouched.
`respawnAccumMs` resets in `create()` per the `scene.restart()` field-init gotcha. Verified:
tsc clean; the top-up paces exactly 1/tick up to the target of 10 then stops; no console
errors. No `RECIPES.md`/dashboard change (no recipe or enemy-stat change). One bounded
tradeoff, noted in-code: enemies you kite far away and abandon still count toward
`RESPAWN_MAX_LIVE`, so a very long roaming run could eventually park at the cap — the cap is
generous enough that this stays theoretical.

### M-SS — Stats & Skills depth pass (crit + distinct-axis effects + relic synergy)

Plan: `.claude/plans/crit-tempering-lodestar.md`. Built on **Opus** (crit is a new combat
mechanic + the relic change is a data-model change). Fixes the "Stats/Skills feel
negligible next to Relics" problem via the locked three-layer split: Relics = raw-% stat
layer, crafted gear = uniqueness/procs (M-TE, later), and **Stats/Skills = the reliable,
player-steered layer on axes relics don't touch** — plus making relics *synergize with*
stats instead of dwarfing them.

**Crit system (the headline).** Split by AXIS, not weapon class: **Strength = crit
multiplier** (+0.04×/pt, retired the old melee stamina-cost knob), **Agility = crit
chance** (+0.5%/pt, retired the ranged one), both **all-weapon**, multiplying together so a
crit build wants both. **Per-weapon base crit** lives in `Weapons.ts`
(`WEAPON_BASE_CRIT_CHANCE`/`_MULT` + getters) — slow/heavy weapons get higher base
(primal_spear 8%/1.6×, fast bone_knife 4%/1.5×), doubling as an attack-speed lever. The
locked pipeline is `weaponBase × (1+skill%) × (1+relic dmg%) × staggerMult ×
(critRoll?critMult:1)` — crit is the final multiplicative step. `MainScene.applyCrit()`
rolls it (chance/mult = weapon base + stat + relic, soft-capped `CRIT_CHANCE_CAP` 0.60 /
`CRIT_MULT_CAP` 3.0, `Math.random` — combat crit isn't seeded), called from both
`tryMeleeAttack` (rolled at hit) and `tryRangedAttack` (rolled at fire, baked into the
projectile via a new `Projectile.isCrit` — no weapon context at impact). A crit tints the
floating damage number orange-yellow + "!" and plays a new `Sfx.crit()` cue. The inventory
Combat column + the weapon Tooltip both surface crit (base + live stat/relic rollup).

**Stat rework (`Progression.ts`).** Every stat now has a live effect: **Endurance** +3 max
stam **and** +2% stamina-regen rate/pt; **Vitality** +4 max HP **and** +1.5%
healing-received/pt (amplifies food/Comfort/kill-heal, NOT passive regen — there is none);
**Intelligence** +1.5% skill-XP/pt (stacks with the Scholar's-Idol relic + is applied in
`awardSkillXp`); **`willpower` renamed `wisdom`** = +2% buff/food duration/pt. New getters:
`critChanceBonus`/`critMultBonus`/`healingReceivedMult`/`staminaRegenMult`/`xpMult`/
`buffDurationMult`. `weaponStaminaCostMultiplier` **retired** — grep'd out of MainScene (×3),
Tooltip, and CraftingMenu (their weapon "Stamina" tooltip line now shows the authored base;
only relics discount stamina now).

**Skill rework (`Skills.ts`).** Second/first real effects for one-note & dormant skills:
**light_armor** → +5ms dash i-frame/level over the 150ms base, cap +100ms (Monster Hunter
"Evade Window", added to `DASH_IFRAME_MS`); **running** also cuts sprint stamina drain
−1%/level cap −40%; **chopping/mining** → +1%/level (cap 60%) chance for a bonus +1 drop on
a depleted tree/rock (incl. cracked Gloam ore), rolled in the tool-swing path. `heavy_armor`
+ `blocking` stay deliberately dormant (biome-2 heavy gear / a real block mechanic) with an
explicit "no effect yet" impact line. **Per-piece armor XP** — the kill loop now awards +30
per *worn piece* (`armorTypesWornPerPiece`, replacing the old per-distinct-type
`armorTypesWorn`), so full-light (3) gives 3 light ticks and heavy_armor will accrue
naturally once biome-2 heavy gear ships. The 5 weapon-damage skills are unchanged (+0.5%/lvl)
— reserved as the M-TE proc-threshold hook.

**Relic synergy (`Relics.ts`).** HP/stamina relic channels went **flat → percent**
(`maxHpPct`/`maxStaminaPct` + `maxHpPctMult`/`maxStaminaPctMult` getters): Stout 15→15%,
Vigor 25/20→20%/18%, Titan 50/35→40%/30%. `MainScene.syncStatBonuses` now compounds
`(100 + statBonus) × relicPctMult − 100`, so stats × relics multiply (verified: 20 Vitality
→ base 180, +Stout+Vigor 35% → 243 max HP). New **crit relic channels** (`critChancePct`/
`critDamagePct` + getters) with two seeds — Common **Keen Charm** (+5% crit chance),
Uncommon **Savage Idol** (+0.30× crit dmg). `scaledEffectText` updated for all new channels;
`allocateStat` now always re-syncs (every stat feeds a cached multiplier now).

**Verified live** (`preview_eval`, console error-free): every stat getter (20 Vit → healMult
1.3, 10 End → regenMult 1.2, 10 Str → +0.4 crit mult, 10 Agi → +0.05 crit chance, 5 Int →
xpMult 1.075, 5 Wis → buffDurationMult 1.1); relic %-HP compounds the stat base (180×1.35=243
HP, 130×1.18=153.4 stam); crit rolls & applies (primal_spear 18%×2.30 → 10 dmg crits to 23,
non-crit 10) and both caps hold (mult 3.0 → 30, chance 0.60); heal 10×1.3=+13, buff 1000×1.1
→ 1100ms, stamina regen 20×1.2 → +24/s; all four skill getters + impact strings correct
(dash +100ms cap, drain 0.6, chop 30%, mine 60% cap); per-piece armor XP returns 3 light
entries for 3 worn pieces; Combat column reports crit 18%×2.30. `tsc --noEmit` + full build
clean. `RECIPES.md` relic table + dashboard weapons tab (base-crit + eff-DPS columns)
updated. See [[survivor-rpg-stats-skills-relics-direction]].

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
