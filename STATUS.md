# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **S7 — pre-push inventory/dev-cmd
tweaks** (2026-07-13, Opus): search-box insta-clear `✕` button, confirmed search state resets on
close, `nobuildcost` now TEMPORARILY lists all recipes (display-only via
`CraftingMenu.visibleRecipes()` — reverts cleanly when toggled off, never mutates the discovered
set), and a **taller backpack grid** (`BACKPACK_ROWS 6 → 15`) so a per-biome tab shows every row
with no scroll. See the S7 entry below.
Prior: **S5 + S6 — gating/dev-cmd fixes,
UX polish + Inventory rework** (2026-07-13, Opus). The final two triaged badlands-playtest
sessions (`.claude/plans/badlands-playtest-triage.md`), merged — **the entire 6-session triage
batch (S1–S6) is now done.** The S6 "inventory sort" item grew into a full **inventory rework**
(plan: `inventory-rework-and-s5-s6.md`): the backpack is now an **effectively-unlimited (240-slot)
auto-organized tabbed inventory** — biome tabs (Forest/Badlands/All), a click-to-focus **search
box** (spans all items; locks player movement + gameplay hotkeys while typing), and a
**sectioned, wheel-scrollable grid** (window-rendered, no free-arrange — drops route to the first
free slot). New `Items.ts` `itemBiome()`/`itemCategory()` helpers drive grouping; `sortAndStack`
clusters by biome→category→name. **Equipment→trash drag** added (last missing drag path);
**processor menus show only compatible materials** (fixing them for the bigger backpack too).
**S5**: WB Lvl 3+ recipes gate discovery on a sticky `everMaxWorkbenchTier`; placing a station
marks it discovered (Ember Crucible visible while placed); `nobuildcost` de-inverted (no
permanent recipe unlock, upgrades now free). **S6**: Molten Bulwark → flat 15% DR + fire thorns
(no more knockback-immunity); Effigy "Fetish"→"Totem" text; Emberblink tooltip wraps; placed
stations get a dark postFX outline. `tsc` clean; verified live via `preview_eval`. Next: master-plan
tail (a 3rd biome / deterministic seeded world-gen for M-W1 proper) or a fresh playtest pass.
See the entry below + [[survivor-rpg-biome-2-plan]].
Prior: **S4 — Badlands POI placement, respawn & spawn bugs** (2026-07-13, Sonnet). Fourth of the 6
triaged badlands-playtest sessions — four fixes on the badlands POI/spawn systems: biome-aware
night-surge, Warren wave-2 delay (`DEN_WAVE2_DELAY_MS`), Sunken Forges + Duneshaper altars pushed
deeper (`POI_DEEP_R_MIN`/`POI_MIN_SEPARATION`), and general POI respawn (dens/Gloaming Vein/Sunken
Forges re-arm 8 min after full clear; boss-summon altars stay one-shot via `updatePoiRespawns`).
Prior: **S3 — Relic Forge menu UI + "all relic effects" panel** (2026-07-13, Sonnet). Third of the
6 triaged badlands-playtest sessions — pure UI/wiring on the relic system, no new mechanic or data
change. **Forge result-line/grid overlap fixed**; owned-relic grid groups by **power tier**
(`COLS` 6→5); **new aggregated "all relic effects" list** in the Inventory Relics column
(`RelicManager.effectSummary()`). See the entry below + [[survivor-rpg-relics]].
Prior: **S2 — Badlands boss & enemy combat
tuning** (2026-07-13, Opus). Second of the 6 triaged badlands-playtest sessions
(`.claude/plans/badlands-playtest-triage.md`). **Duneshaper** made a real gate: HP 900→1050, the
Gloam Volley reworked to a **beam-like 6-bolt spray** (was 3) — near-instant (bolt speed 240→460,
wind-up 700→420ms) so it can't be lazily sidestepped, in a tight ±9° fan; Lance wind-up 900→700;
damage up across attacks (spikes 50→56, nova 42→50, lance 46→54, barrage 30→34, volley 24→22/bolt);
and **much harder to stagger-lock** (poise 120→170, punish 1.5×→1.35× / 3s→2.2s, poise regens sooner
& faster). **Cinderwrought** harder to dodge (telegraphs cone 820→620 / hammer 720→560, reach cone
210→235 / hammer 155→168, cooldown 850→650) + HP 300→340. **Hexling** teleports far less (blink
cooldown 2600→5200 + no longer blinks after every flame strike). **Fire resistance layer** (decision
3): `Enemy.resistances`/`resistMultiplier` widened to `IncomingDamageType` so **"fire" is
resist-able**, and `MainScene.dealSetBonusDamage` now honors it (Emberblink nova / thorns) with an
effectiveness-tinted damage number — **Cragscale + Sandmaw resist fire ×0.5, Hexling weak ×1.5, all
others neutral** (the counterweight to Emberblink's fire-nova being a blanket answer). `tsc` clean;
verified live (`preview_eval`: all stats + 6-bolt/460px volley + fire-scaled set-bonus damage 40→20
Cragscale / 40→60 Hexling); dashboard Enemies tab updated. **Remaining triage: S3–S6** (relic UI, POI
placement/respawn, recipe gating, UX polish). See the entry below + [[survivor-rpg-biome-2-plan]].
Prior: **S1 — Badlands metal economy &
forged-gear balance** (2026-07-13, Opus). First of the 6 triaged badlands-playtest sessions
(`.claude/plans/badlands-playtest-triage.md`), the "not grindy" pass: **smelt ratio → 1 ore + 1 hex
→ 1 ingot** (both ingots); **ore nodes yield a handful + scatter denser** (Sunscorch 60×3–5,
Cinderforged 14×2–4 + Sunken Forge deposits 4–7); base **Sunsteel weapons bumped to 17/14/15** so
they all clear the max-upgraded Primal Spear (13) — Embersteel 23/19/20, Ember Brand 17 to keep the
T2 gap; **Duskhide light armor → 4/5/4 = 13** (matches maxed Gremlin Lvl 3) using **zero metal**
(pelt/chitin/bone); and a **dedicated Fuel slot on the Smelter menu** (Hex Essence is loaded into its
own slot rather than pulled silently from the backpack — `ProcessingStation.fuel` + a fuel-gated
`maxPossibleOutput`/`process`; the shared Drying Rack menu is visually unchanged). `tsc` clean;
verified live; `RECIPES.md` updated (dashboard reads the data modules live, so no manual edit).
Prior: **Ember-tier armor set bonuses**
(2026-07-13, Opus). The deferred payoff for building the best-in-biome forged gear: two full-set
(3-piece) bonuses, both **unique mechanics** (not the raw-% channels relics own). **Embersteel (heavy)
→ Molten Bulwark**: knockback immunity + fire thorns on melee attackers. **Emberhide (light) →
Emberblink**: +60% dash distance + a fire nova at the landing point. New `src/systems/SetBonuses.ts`
(membership only; magnitudes = `SET_*` consts in MainScene); a `resolveKill` extraction so set-bonus
fire shares the weapon kill path; active bonuses shown in the inventory Combat column + a `Set (3)`
tooltip line on each Ember piece. `tsc` clean; verified live. See the entry below. Prior:
**Biome-aware enemy respawn** (2026-07-13, Sonnet). A small correctness fix on the fog-top-up respawn
system (an open Biome-2 item): `makeRespawnEnemy` now picks the respawn roster from the biome at each
spawn point (`worldBiomes.dominantBiomeAt`) — forest/base → the forest mix, badlands → the badlands
roster (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing. Prior: **Biome-wide wood/stone + Ironbark
axe-upgrade chain + relic-UI fixes** (2026-07-13, Opus). Off the master-plan build order — a mixed
batch. **Relic-UI fixes:** the Character menu (K) and Tab combined menu are now mutually exclusive
(they z-fought over the new Relics column), and the relic hover tooltip shows the relic's family/class.
**Every biome now supplies wood + stone:** new badlands dead-tree/boulder/branch/scrap-rock gatherables
(`spawnBadlandsNodes`) drop the same universal `wood`/`stone` keys. **Tool tiers are finally implemented**
(the long-reserved hook): `ResourceNode.minToolTier` + a tracked `equippedToolTier` mean a too-weak tool
bounces off (prompt still shows the verb — never reveals the tier). A new **Ironbark tree** (new `ironbark`
wood, `minToolTier: 1`) needs an upgraded axe; the **Woodcutter's Axe now upgrades in place** via a new
`ToolUpgrades.ts` (Ironshod Axe, `2 Sunsteel Ingot + 6 Stone`) that reuses the entire weapon-upgrade path.
Ironbark feeds the **Forge Anvil / Emberforge Anvil** Workbench upgrades + the **Embersteel Warhammer/Pike**
reforges (so the axe upgrade gates the forged tier). **Deferred to its own session (the user):** Ember-tier
uniqueness + armor **set bonuses**, ungated ore-gear upgrades, and a **QERT activated-ability** system.
Verified live; `tsc` clean; `RECIPES.md` + dashboard updated. See the entry below.
[[survivor-rpg-biome-2-plan]] [[survivor-rpg-placed-object-management]]_

_Prior: **Campfire tiers + cross-biome cooking +
no-ladder station upgrades** (2026-07-13, Opus). **Station/processor upgrades are now no-ladder** (any
discovered upgrade applies in any order; applying = +1 level; weapon/armor keep their ladder), plus
Campfire Lvl 3/4, 5 new HP-regen dishes, and a collapsible/scrollable cooking-menu rework. Full detail
in STATUS-archive.md + [[survivor-rpg-no-ladder-station-upgrades]] [[survivor-rpg-cooking-food-buffs]]._

_Prior: **Biome 2 — Phase 5: Relics rework**
(2026-07-13, Opus). The relic economy for biome 2 + the requested rebalance, closing out the biome-2
umbrella plan's final milestone. Three parts, all locked via `AskUserQuestion`: **(1) Family loadout,
not stacking.** Every relic now has a `family` (damage/move/defense/stamina/lifesteal/vitality/crit/xp,
8 total) and a player holds **at most one relic per family**. Rolling into an owned family runs a
direction-normalized **dominance comparison**: new relic strictly better on every shared stat →
**auto-replaces** (old relic refunds Gloam/Ember Shards, scaled by its own rarity × power tier); old
strictly better/equal → the new roll **auto-declines** (refunds itself instead); **neither dominates**
(e.g. a differing secondary stat) → **ambiguous**, and the Relic Forge shows a **Keep New / Keep Old**
prompt, blocking further rolls until resolved (closing the menu mid-choice defaults to declining the
new one, so a spent trophy never yields literally nothing). **(2) Trimmed magnitudes** — every relic's
effect numbers scaled to ~0.625× the original (Common dmg +8%→+5%, Mythic +40%→+25%) per the locked
"Common damage +8%→~+5%, Mythic +40%→~+25%" spec. **(3) Tier-2 relics** — all four badlands elite
trophies (Duskrunner/Cragscale/Hexling/Sandmaw) bumped from Tier 1 → **Tier 2** (×1.5 magnitude), and a
new **Ember Shard** currency (Gloam Shards rendered down at the Relic Forge's new **Ember Kiln**
upgrade, Lvl 3, `{embersteel_ingot:3, stone:20}`, 3 Gloam → 1 Ember) feeds a new tier-2 refine recipe
(`refine_common_t2`: 3 Common-T2 trophies + 2 Ember → 1 Ember-Refined Trophy, rolls Uncommon capped at
Rare). New **Relics column on the Inventory panel** (Tab) — 8 fixed paper-doll-style slots, one per
family, filled or empty with hover tooltips — addresses playtester confusion (they were checking the
Equipment tab for relics instead of the HUD bar). `RelicManager` internals moved from an array of
stackable instances to `Partial<Record<RelicFamily, RelicInstance>>`; the aggregate effect getters
(`damageMult()` etc.) are unchanged, so every `MainScene` call site kept working with zero edits.
Verified via `tsc --noEmit` (clean) and live `preview_eval` (all three roll verdicts, tier-scaling
dominance, refund math, Ember conversion + its tier gating, both new UI panels rendered and measured
for overlap — caught and fixed a real layout bug where a 2-line "replaced/declined" result or the
choice-button block could overlap the relic grid below it). See the Phase 5 entry
below. **This completes the biome-2 umbrella plan (`.claude/plans/biome-2-sunscorch-badlands.md`).**
[[survivor-rpg-relics]]_

_Earlier milestones (full writeups in STATUS-archive.md): Biome 2 Phase 4a/4b (smelting + base/enhanced
forged gear + Gremlin King's Heart + Ember Brand), the 19-item badlands playtest batch, Phase 3
(Duneshaper boss + win-swap, Sunken Forge, Duskrunner Warren), Phase 2b Sandmaw, Phase 2 badlands roster,
Phase 0/1 patchwork worldgen + combat-systems layer, and the whole roguelike meta-loop._

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. The world is now circular + much larger (M-W1 geometry prep, above); deterministic
seeded world-gen and actual multi-biome content are still deferred to M-W1 proper.

**In progress / next.** **Biome 2 (Sunscorch Badlands) is underway** — a phased umbrella
plan (`.claude/plans/biome-2-sunscorch-badlands.md`) drives it. **Phases 0–2b have shipped:**
Phase 0 (patchwork worldgen — world grew to 28000px for ~5 biomes), Phase 1 (combat systems
layer — resist/weak, AOE arcs, pack-aggro, magic-bypass, all dormant hooks), **Phase 2**
(the core badlands roster — Duskrunner/Cragscale/Hexling + Emberbloom/Sunfruit flora, which
light up those hooks; plan `.claude/plans/biome-2-phase-2-enemies.md`), and **Phase 2b**
(the 4th native creature — the **Sandmaw** burrowing ambusher; plan
`.claude/plans/biome-2-phase-2b-sandmaw.md`). The badlands is now **walkable + populated with a
complete 4-enemy roster**. **Phase 3 is underway** — the user chose "two POIs first," which shipped
(Duskrunner Warren + Sunken Forge), and now the **badlands final boss has shipped too: the
Duneshaper** (`src/entities/Duneshaper.ts`), the **new win-condition** (a Duneshaper kill wins the
run; the Gremlin King is demoted to a mid-boss). Summoned via **3 scattered badlands Tyrant Altars**
+ an **Effigy of the Duneshaper** crafted from **Warren-cache fetishes**, with a **clue system**
(reveal-all-altars-on-craft + night glow + map landmarks). **Phase 3 is complete** (the King
critical-drop rework, its one deferred item, shipped as part of Phase 4a below). **Phase 4
(smelting/forging gear tier) is COMPLETE (both sessions shipped).** **Session 1 (Phase 4a):** the
Smelter station (ore + Hex Essence = ingot), Clay + scattered ore mining, the **Gremlin King's Heart**
(replaces the fang — it upgrades the Smelter to melt rare ore), Workbench Lvl 3 + a new
`requiresWorkbenchTier` recipe gate, and the **base forged gear** (Sunsteel heavy set wiring the dormant
`heavy_armor` skill w/ magic-fire mitigation; Duskhide light set; blunt/slash/pierce weapons).
**Session 2 (Phase 4b):** Workbench Lvl 4 (**Emberforge Anvil**) + the 9 T2 **enhanced**
reforge recipes (each consumes its base forged piece + Embersteel Ingot → Embersteel heavy set / Emberhide
light set / three enhanced weapons) + the first **magic weapon** (the **Ember Brand**, rare-ore-exclusive
melee, `magic` damage type). **Phase 5 (just shipped): the relic rework** — family-loadout
(one relic per family, dominance-based auto-replace/decline/choice), trimmed biome-1 magnitudes (~0.625×),
tier-2 badlands relics (Duskrunner/Cragscale/Hexling/Sandmaw trophies now Tier 2), and a new Ember Shard
currency (Gloam→Ember at the Relic Forge's new Ember Kiln upgrade) feeding a tier-2 refine recipe. Also
added a dedicated Relics column on the Inventory panel. **This completes the biome-2 umbrella plan
(`.claude/plans/biome-2-sunscorch-badlands.md`) — all 6 phases (0–5) are shipped.** The master-plan tail
**M-TE** (trophy-gated gear) is folded into this biome-2 work and is done. Real pixel art/animations stay
deliberately deferred until content/balance settle (roadmap item 8). Badlands stats/counts + the
forged-tier + relic numbers are all first-pass — expect a tuning pass once outside playtesters weigh in.
**Next up:** no locked next milestone — likely a broader playtest/tuning pass, or a new biome-3 scoping
session per the master roadmap's "at least 5 total biomes" note.

**Dev tooling (2026-07-13, Sonnet):** `window.__dev` browser-console commands for playtesting without a
full playthrough — `god()` (still takes damage/knockback/shows real damage numbers, just floors HP at 1
and never dies), `heal()`, `nobuildcost()`, `setstat(name|"all", value)`, `spawn(name, elite?)`,
`killall(radius?)`, `exploremap()`, `list()` (dumps valid skill/stat/enemy names), plus a
`run("spawn duneshaper")`-style one-line parser. DEV-build-gated (`import.meta.env.DEV`, new
`src/vite-env.d.ts`) — unreachable in a production build. `nobuildcost` also fixed a real latent bug: the
Crafting/Cooking/Upgrade menus each computed their own greyed-out/affordability state independently of
MainScene's cost gates, so the first ship only fixed the click-to-craft path, not the menu display —
the user hit this immediately (craft button stayed greyed with nobuildcost on). See the Recent Entries
below + [[survivor-rpg-dev-console]].

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).
- **World Y-sort depth is compressed** (`systems/depth.ts` `ysortDepth` = `y * 0.09`,
  shrunk when the world grew to 28000px in biome-2 Phase 0) so world objects stay below the
  fixed HUD. Max-world-y depth 28000×0.09 = 2520, clear of the 2600 HUD floor. Any NEW world
  object that Y-sorts by position must use `ysortDepth(y)`, not raw `y`. **If the world grows
  further, shrink this again** (invariant: `WORLD_SIZE × scale < 2600`).
- **A world-sized `tileSprite` is out-of-memory** and must never be recreated. Phaser
  TileSprite allocates a canvas its own size; at 28000² that's ~3GB → boot OOM (this bit us
  this session). The grass tilesprite now covers only the forest region (`BIOME_SIZE`); the
  outer ground is a single bounded `bakeOuterOverlay` RenderTexture (`OVERLAY_TEX` 4096²,
  LINEAR-filtered, stretched over the world — constant GPU cost at any world size). Never size
  a tilesprite/RenderTexture to the whole world.
- **Badlands has content now (Phase 2/2b); dunes + deep ring are still empty.** The forest disc
  holds the biome-1 roster/POIs; the **badlands patchwork now holds the Duskrunner/Cragscale/
  Hexling/Sandmaw roster + Emberbloom/Sunfruit flora** (via `pickBadlandsPoint`). Everything past
  the badlands band (dunes, the empty outer ring) is still terrain only until later phases.
- ~~**Enemy respawn top-up is forest-species-only, biome-agnostic.**~~ **FIXED (2026-07-13)** —
  `makeRespawnEnemy` now picks the roster from the biome at each chosen spawn point
  (`worldBiomes.dominantBiomeAt`): forest/base → the forest mix, badlands → the badlands mix
  (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing (empty placeholder). See the entry below.

## Recent Entries

> Older entries in STATUS-archive.md.

### S7 — Pre-push inventory/dev-cmd tweaks (2026-07-13, Opus)

Four small final tweaks before push, no new mechanic:
- **Taller backpack grid** — `BACKPACK_ROWS 6 → 15` (viewport ~252px → ~720px). Each
  biome holds ~45-48 unique items (~9-11 rows at 6 cols), so a per-biome tab
  (Forest/Badlands) now shows **every row with no scroll**; panel bottom lands ~y=898,
  still clear of the bottom hotbar (~960). The "All" tab (93 unique items) still scrolls
  a little (~284px) — expected for the everything-view; only a wider grid would make it
  scroll-free too. Cols unchanged (6). Verified live with one of every item loaded.
- **Search-box insta-clear button** — the Inventory search field now renders a `✕` at its
  right edge whenever there's a query (`InventoryMenu.renderSearch`), wiping the search
  instantly on click and keeping the box focused so the player can retype.
- **Search state doesn't persist on close** — confirmed already handled: `teardown()`
  (run on every close path via `toggle()`) resets `search`/`searchFocused`/`scrollY`/
  `activeTab`. Verified live (`ore` → close → empty → reopen → empty).
- **`nobuildcost` now TEMPORARILY unlocks all recipes** (reverses the S5 de-invert, but
  cleanly): while the cheat is on, `CraftingMenu.visibleRecipes()` lists **all** `RECIPES`
  instead of just `crafting.discoveredRecipes()` — display-only, so it never mutates the
  discovered set. Toggling off snaps the list straight back (verified: 8 discovered → 41
  all → 8, discovered set untouched). Free-craft/free-upgrade behavior unchanged.

Verified live via `preview_eval` + screenshots (full inventory with all sections +
wheel-scroll + paper-doll/Combat/Relics columns; clear button; recipe unlock revert).
`tsc` clean, no console errors.

### S5 + S6 — Gating/dev-cmd fixes, UX polish + Inventory rework (2026-07-13, Opus)

Final two triaged badlands-playtest sessions (`badlands-playtest-triage.md`), merged. The
S6 "inventory sort" item grew — via a locked design conversation — into a full **inventory
rework** (new data model + tabbed UI), which is why the session ran on Opus. Plan:
`inventory-rework-and-s5-s6.md`.

**Inventory rework** (locked via `AskUserQuestion`: auto-organized pages / effectively
unlimited / tabs-by-biome). Backpack container grew **36 → 240** slots (`BACKPACK_CAPACITY`,
effectively unlimited — a hardcore run can't overflow it). New `ItemDef` organization
helpers in `Items.ts`: `itemBiome()` (forest/badlands, explicit badlands-key set; "first
biome it appears in" — King heart/fang, Gloam shards + forest-POI refined trophies stay
forest) and `itemCategory()` (material/gear/station/food/curio, derived from existing def
flags + a curio/trophy key set). `ItemContainer.sortAndStack` now clusters by
(biome, category, name). `InventoryMenu` backpack column rebuilt: a **biome tab strip**
(All + each biome present), a **click-to-focus search box** (spans ALL items by name;
typing locks player movement via a new `Player.update(inputEnabled)` param + `typingInSearch()`
guards on every single-key hotkey 1-9/V/O/K/R/H/J/M + Esc-unfocuses-first), and a
**sectioned, wheel-scrollable grid** (window-rendered — only in-viewport cells become
GameObjects, mapped to real container indices via `visibleCells`; `handleWheel` consumes the
wheel over the grid so the hotbar doesn't cycle). No free-arrange in the backpack (it's
auto-organized) — drops anywhere over the grid route to the first free/merge slot
(`isOverBackpackGrid` + `findAssignable`). **Equipment-slot → trash drag** added
(`destroyEquippedSlot`, the last missing drag path). **Processor menus (Drying Rack/Smelter)
now show ONLY compatible materials** (input/fuel the player owns) instead of the whole
backpack dimmed — also fixes them for the bigger backpack (they used to iterate the first 36
slots only). Verified live via `preview_eval`: tabs filter (all 25 / badlands 10 / forest 15),
search spans biomes, scroll advances + consumes over grid, movement lock zeroes velocity,
equipment→trash destroys w/o refund, processor shows 1 of 24 items; zero console errors.

**S5 — gating & dev-command bugs.** WB Lvl 3+ recipes now gate discovery on a sticky
`everMaxWorkbenchTier` (bumped on place/upgrade) via a new `Crafting.refresh` param, so
Sunsteel/Embersteel recipes stay hidden until the bench is actually upgraded. Placing any
station marks its key discovered (fixes Ember Crucible only appearing after picking the
Smelter back up). `nobuildcost` de-inverted: dropped the permanent `unlockAll()` (verified:
stays 7 recipes on/off) and made upgrades freely available (bypasses the upgrade
ingredient-discovery gate; cost was already waived).

**S6 — polish.** Molten Bulwark reworked (decision 2): knockback-immunity → **flat 15%
damage reduction (all types) + fire thorns** (`SET_MOLTEN_DAMAGE_REDUCTION`, applied before
armor/bypass in `applyDamageToPlayer`; knockback now always applies). Effigy text:
`warren_fetish` "Gloam-Bone Fetish" → "Gloam-Bone Totem" + fixed the stale "warren fetishes"
wording (Items/Recipes/RECIPES.md). Emberblink set-bonus desc now word-wraps to the Combat
column (`addText` gained an optional wrap width). Placed stations get a soft dark postFX
outline (WebGL-guarded) to read against the badlands floor. `tsc` clean throughout.

### S4 — Badlands POI placement, respawn & spawn bugs (2026-07-13, Sonnet)

Fourth of the 6 triaged badlands-playtest sessions (`.claude/plans/badlands-playtest-triage.md`).
Four independent fixes on the badlands POI/spawn systems — no new mechanic, no recipe/data change
(`RECIPES.md` + dashboard untouched). `tsc` clean; all four verified live via `preview_eval` (a
fresh server booted clean after an earlier contended/wedged boot state — the double-banner quirk).

- **Night-surge biome bug (`MainScene.spawnNightBatch`).** The nightfall surge hardcoded the
  forest roster (2 Boar/2 Snake/2 Gremlin) regardless of where the player was, so a badlands
  nightfall spawned forest animals. Now each of the ~6 surge spawns draws its species from its own
  spawn point's biome via the already-biome-aware `makeRespawnEnemy` (dunes → null → skipped).
  Verified: player parked at a deep-badlands forge, every surge enemy matched its own point's
  biome (a Hexling on a badlands point; forest species only on the forest blobs the ring straddled).
- **Warren wave-2 delay (`MainScene.onDenGuardKilled` + `DEN_WAVE2_DELAY_MS` 1600ms).** Clearing
  wave 1 insta-popped + insta-aggro'd the elite wave 2 in the same frame. Now the den "stirs"
  immediately and the 3 elite Duskrunners burst a 1.6s beat later (a `time.delayedCall`, guarded on
  phase so a den reset/destroyed before it fires can't spawn a ghost wave). Verified: guards empty
  immediately after wave-1 clear, then 3 elite Duskrunners after the delay.
- **POI spacing / push deeper (`pickBadlandsPoint` gains an `rMin` param; `POI_DEEP_R_MIN` 3600,
  `POI_MIN_SEPARATION` 1000, `clearsOtherPois`).** The Sunken Forges + Duneshaper altars now pick
  from a deeper radial band (off the forest edge — they're destinations), and the altars keep
  `POI_MIN_SEPARATION` from the camp/vein/forges. Verified: forges all ≥3688 / altars all ≥4175
  from center (one per quadrant), min forge↔altar gap 1279. Warren dens intentionally stay near-ish
  (unchanged).
- **General POI respawn (locked decision 4; `updatePoiRespawns`, `POI_RESPAWN_MS` 8min).** Warren
  dens, the Gloaming Vein, and Sunken Forges now re-arm 8 min after being **fully cleared** (den
  looted + cache emptied; vein/forge mini-boss dead + all its ore mined) — boss-summon altars
  (gremlin/tyrant) stay one-shot. Polled each frame (the clear conditions are themselves polled
  states). Extracted `BadlandsDen.reset()`, `armVein()`, `armForge()` (the initial spawns now call
  the same arm helpers; night-glow points pushed only on the first arm since they're static). A
  respawned vein/forge builds **fresh** shielded ore (the old nodes were destroyed on depletion).
  Verified: all three armed at T0+8min then, on firing, reset to their guarded state — den → wave1
  with 3 *normal* guards, vein → fresh Gloamwarden + 5 shielded nodes, forge → fresh Cinderwrought
  + 4 shielded ore.

**Remaining triage: S5–S6** (recipe/upgrade gating + dev-cmd bugs; UX/text polish).

### S3 — Relic Forge menu UI + "all relic effects" panel (2026-07-13, Sonnet)

Third of the 6 triaged badlands-playtest sessions (`.claude/plans/badlands-playtest-triage.md`).
Pure UI/wiring on the already-designed relic system — no new mechanic, no recipe/data change (so
`RECIPES.md` + dashboard are untouched; the dashboard reads `Relics.ts` live regardless). `tsc`
clean; verified live via `preview_eval` with a seeded loadout (numeric layout assertions —
screenshots hit the backgrounded-render quirk).

- **Result-line / relic-grid overlap fixed (`RelicForgeMenu.ts`).** A plain-success roll's
  reserved result-block height (26px) was smaller than the "Forged: X" line + the grid's own
  "Your Relics" header gap, so the header rode up onto the result text. Phase 5 had only fixed the
  2-line "replaced/declined" and "choice" verdicts; the common plain case was still wrong.
  `resultBlockH` now branches by state: none 24 / plain 46 / auto-resolved conflict 64 / choice
  134. Verified: Forged line bottom 530 vs "Your Relics" header y 540 (10px clear).
- **Forge grid wrap + tier grouping.** The owned-relic grid used `COLS = 6` at 84px chips = 544px,
  overflowing the 528px usable panel once a run filled several families → chips ran off the right
  edge. `COLS` 6→5 (452px, fits). The grid is now grouped by **power tier** (`groupsByTier`): a
  "Tier N" subheader precedes each tier's chips (wrapping within the tier), so a run can see a T1
  relic beside the T2 that would displace it. Grid height is now measured (`relicGridHeight`) so
  the panel grows to fit; each chip shows its family label. Verified: 8 chips across Tier 1 / Tier
  2, max chip right 1148 ≤ panel-right 1232.
- **Aggregated "all relic effects" panel (`InventoryMenu.ts` + `Relics.ts`).** New
  `RelicManager.effectSummary()` returns one row per effect **channel** the loadout actually
  touches — a formatted grand total (tier-scaled) plus the per-relic contributions behind it
  (`RelicEffectSummary`). Rendered as a compact "Effects" list under the 8 relic slots in the
  Inventory Relics column; hovering a channel pops a tooltip listing which relics grant it + each
  one's amount (reuses the column's inline tipBg/tipText surface). `InventoryMenu.PANEL_H` now
  grows to reserve room for the realistic worst case (9 active channels — one relic per family,
  crit family feeds only one crit channel); verified the 9-channel case fits (list bottom 471 ≤
  panel bottom 483). New `relicEffectSummary` dep wired in `MainScene`.
- **Bug caught + fixed during verification:** the effects-list render call passed `PANEL_Y +
  RELIC_FX_Y`, double-adding the panel offset (`RELIC_FX_Y` is already absolute, built from
  `RELICS_Y`). It happened to fit with a light 6-channel loadout but the worst-case 9 channels
  would have clipped ~40px past the panel; fixed to pass `RELIC_FX_Y` directly (matching how
  `PANEL_H` reserves the space).
- Files: `RelicForgeMenu.ts`, `InventoryMenu.ts`, `Relics.ts`, `MainScene.ts`.
  **Remaining triage: S4–S6** (POI placement/respawn, recipe gating, UX polish).

### S2 — Badlands boss & enemy combat tuning (2026-07-13, Opus)

Second of the 6 triaged badlands-playtest sessions (`.claude/plans/badlands-playtest-triage.md`).
Combat feel + balance on the badlands roster + the two bosses. All numbers first-pass/tunable.

- **Duneshaper** (`Duneshaper.ts`) — the final boss read as a speed bump, not a gate. Fixes:
  - **Gloam Volley → a beam-like 6-bolt spray** (was 3): `VOLLEY_BOLTS` 3→6, `VOLLEY_BOLT_SPEED`
    240→**460** (near-instant/beam-like travel), `VOLLEY_TELEGRAPH_MS` 700→**420** (short react
    window so it can't be lazily sidestepped), `VOLLEY_SPREAD` 18°→**9°** (a tight ~45° fan reading
    as a rapid beam-spray), `VOLLEY_BOLT_DAMAGE` 24→**22**/bolt (more bolts land now — a face-full
    hurts more, a clipping single hit ≈ the same), range 460→520. Matches the user's "beam-like, 6
    not 3, near-instant, short react window."
  - **More damage across attacks:** spikes 50→56 (physical), nova 42→50, lance 46→54, barrage 30→34
    (all magic bypass armor). Lance wind-up 900→**700** (a real beam — harder to sidestep).
  - **Tankier + much harder to stagger-lock:** HP 900→**1050**; poise 120→**170** (more damage to
    break); stagger punish **1.5×→1.35×** and **3s→2.2s**; poise regen delay 4000→3000ms + rate
    15→22/s (recovers between stagger attempts). Resists easy stagger-locking per the balance target.
- **Cinderwrought** (`Cinderwrought.ts`) — playtest took **zero hits**. Harder + harder to dodge:
  telegraphs cone **820→620** / hammer **720→560** (less react time), reach cone **210→235** /
  hammer **155→168** (a lazy back-pedal no longer clears it), attack cooldown **850→650** (attacks
  more often), HP **300→340**. Damage unchanged (already bumped in the 19-item batch).
- **Hexling** (`Hexling.ts`) — "teleports too much." Blink cooldown **2600→5200ms**, and the
  post-flame reposition blink is now **gated on that cooldown** (was unconditional — it blinked after
  every single flame strike on top of every corner). It now commits to standing and casting far more.
- **Fire resistance layer** (decision 3, the counterweight to Emberblink's fire-nova being a blanket
  answer). `Enemy.resistances` + `resistMultiplier()` widened from `DamageType` to
  `IncomingDamageType` so **"fire" is resist-able**; `MainScene.dealSetBonusDamage` (Emberblink nova
  + Molten Bulwark thorns) now applies `resistMultiplier("fire")` and tints the damage number by
  effectiveness (was flat, always-"weak"). Data: **Cragscale ×0.5, Sandmaw ×0.5** (fire-resistant),
  **Hexling ×1.5** (fire-weak), all other badlands enemies neutral. `Enemy.ts` dropped the now-unused
  `DamageType` import.
- **Verified live** (`preview_eval`, this session's own dev server): spawned all five and asserted
  Duneshaper `{maxHealth:1050, poise:170, magic:0.5, pierce:1.3}`, Cinderwrought `{maxHealth:340}`,
  the Gloam Volley spawning **6 bolts at 460 px/s**, and fire scaling through `dealSetBonusDamage`
  (40 base → **20** on a Cragscale (×0.5), **60** on a Hexling (×1.5)); Cragscale/Sandmaw/Hexling
  fire multipliers 0.5/0.5/1.5. `tsc --noEmit` clean, no console errors. **Dashboard Enemies tab
  updated** (the one hand-mirrored source: Duneshaper/Cinderwrought/Hexling stats + Cragscale/Sandmaw
  fire-resist notes). No `RECIPES.md` change (no recipe/data-module change). **Remaining triage:
  S3–S6.**

### S1 — Badlands metal economy & forged-gear balance (2026-07-13, Opus)

First of the 6 triaged badlands-playtest sessions (`.claude/plans/badlands-playtest-triage.md`)
— the "not grindy" interlocking economy pass. Locked decisions applied from the triage's
shared block.

- **Smelt ratio → 1:1** (`Processing.ts` `SMELT_RECIPES`): sunscorch→sunsteel and
  ember→embersteel are both now **1 ore + 1 hex → 1 ingot** (was 2 ore + 1/2 hex). A node's
  yield now equals its ingot potential. (Watch-item from decision 1 — hex bottleneck — is
  *eased* by this, not worsened: ember fuel dropped 2→1 hex, sunsteel unchanged.)
- **Ore economy** (`MainScene.spawnBadlandsMinerals`): `scatterOre` now takes an amount
  range. Sunscorch **60 nodes × 3–5** (was 44 × 1–2), Cinderforged scatter **14 × 2–4**
  (was 8 × 1–2), Clay 44 × 2–3. The **Sunken Forge POI ember deposits → 4–7 each** (was
  1–2) — the POI is now the rich ember source.
- **Weapon damage** (`Weapons.ts`): the max-**upgraded** Primal Spear is **13** (base 8 +2 +3;
  RECIPES.md said 12 — a stale doc bug, fixed). Base forged Sunsteel now **17/14/15**
  (warhammer/sword/pike, was 14/10/12 — sword & pike sat *below* 13, reading as a downgrade),
  all clearing 13. Embersteel bumped to **23/19/20** to keep the T2 gap; Ember Brand 14→**17**.
- **Duskhide light armor** (`Items.ts` + `Recipes.ts`): base **4/5/4 = 13** (was 3/4/3 = 10),
  matching a fully-upgraded Gremlin Lvl 3 set (< Sunsteel heavy's 14). Recipes now use
  **zero metal** (pelt/chitin/bone only) — a "no forge required" light path. Descriptions
  de-steeled.
- **Dedicated fuel slot** (`Processing.ts` + `DryingRackMenu.ts` + `MainScene.ts`): the
  Smelter's Hex Essence is now loaded into its **own slot** (was pulled silently from the
  backpack). `ProcessingStation` gained `fuel`/`usesFuelSlot()`/`canAcceptFuel()`/`addFuel()`/
  `takeFuel()`; `maxPossibleOutput()` caps by loaded fuel and `process()` burns fuel from the
  slot. The shared menu renders a second **Fuel** slot beside **Ore** (with its own Take Out
  link + an empty "Load Hex Essence" hint) only when `usesFuelSlot()` — the Drying Rack is
  visually unchanged. Drag-drop (`isOverFuel` → `loadRackFuel`), right-click quick-load
  (`quickLoadStation` routes ore→input / hex→fuel), retrieve, and Smelter-destroy refund
  all handle fuel. `processSmelterAmount` deleted (fuel now lives in the slot, so smelt uses
  the same `processRackAmount` path).

Verified live via `preview_eval` (fuel-gated 1:1 smelt end-to-end; drying rack still 2:1 with
no fuel slot; both menus screenshotted; new weapon/armor/ratio numbers confirmed off the live
modules — which the dashboard reads directly, so it needs no manual edit). `tsc` clean; no
console errors. `RECIPES.md` updated (smelt table, armor totals, weapon table, Primal-Spear-13
fix). **Remaining triage sessions: 2 (boss/enemy tuning), 3 (relic UI), 4 (POI placement/
respawn), 5 (recipe gating/dev cmds), 6 (UX/text polish).** See [[survivor-rpg-biome-2-plan]].

### Ember-tier armor set bonuses (2026-07-13, Opus)

The deferred "Ember-tier uniqueness + armor **set bonuses**" item (a payoff for building the
best-in-biome forged gear). Two full-set (3-piece) bonuses, both **unique mechanics, not the raw-%
channels relics own** (the user: "really reward the player, non-relic-overlapping"), each leaning into
its armor-skill identity. Locked via `AskUserQuestion`.
- **`src/systems/SetBonuses.ts`** (new, framework-free) — `ARMOR_SETS` (id/pieces/bonusName/desc) +
  `activeSets(slots)` (full-set membership by item key; no partials) + `setById`. Effect *magnitudes*
  live in MainScene (`SET_*` consts) next to where they apply; SetBonuses.ts only owns membership.
- **Embersteel (heavy) → Molten Bulwark:** immune to knockback + melee attackers seared for fire
  (thorns, 9 dmg). Knockback immunity guards the `if (knockback)` block in `applyDamageToPlayer` (so
  bite-shoves AND boss slams are negated); thorns fires in `updateEnemies`' melee-**bite** branch only
  (ranged projectiles never touch the plate).
- **Emberhide (light) → Emberblink:** dash burst distance ×1.6 (new `dashDistMult` param on
  `Player.update`, scales `DASH_SPEED` only — kept separate from the relic `moveMult`) + a fire nova
  at the landing point (`emberblinkBurst`, 16 dmg in a 95px radius, expanding orange `light_soft`
  flash). Scheduled `delayedCall(DASH_DURATION_MS)` off `frame.dashStarted` so it lands at the
  destination (`DASH_DURATION_MS` now exported from Player).
- **Shared kill path:** extracted `resolveKill(enemy)` out of `resolveWeaponHit`'s tail; new
  `dealSetBonusDamage(enemy, dmg)` (thorns/nova) runs takeHit → the SAME loot/scoring/heal tail, so
  set-bonus fire can kill without drifting from weapon kills. No weapon-skill XP (not a weapon hit);
  flat fire, no resist lookup this pass (noted hook if a fire-immune enemy ever ships).
- **Surfacing:** cached `activeSetIds` (recomputed in `afterItemMove` + reset in `create()`);
  `hasSet(id)`; active bonuses shown in the inventory **Combat column** (amber) via a new
  `CombatStatsView.setBonuses`; each of the 6 Ember pieces got a `Set (3): <bonus>` tooltip line so the
  set is discoverable before it's complete.
Verified live via `preview_eval`: set detection both sets, Combat-column data, knockback velocity stays
0 under Molten Bulwark, thorns 20→11 + clean kill, Emberblink 16 dmg in-radius + far enemy untouched +
kills handled, no console errors. `tsc` clean. No `RECIPES.md` change (no recipes/costs). Numbers are
first-pass/tunable. See [[survivor-rpg-biome-2-plan]].

### Biome-aware enemy respawn (2026-07-13, Sonnet)

Off the master-plan build order — a small correctness fix on the existing fog-top-up respawn
system (an open Biome-2 item, not a new mechanic). **The gap:** `MainScene.makeRespawnEnemy`
always drew from the biome-1 forest roster (Boar/Snake/RangedGremlin/MeleeGremling) regardless
of where the player stood, so a player camping in the badlands got **forest** enemies topped up
around them and the badlands roster (spawned once at world-gen) never replenished — draining
badlands food/loot over a long run.

**Fix:** `makeRespawnEnemy` now queries `worldBiomes.dominantBiomeAt(x, y)` at each chosen spawn
point (per-**point**, not per-player, so a spawn ring straddling a biome border spawns the right
roster on each side) and branches:
- **forest / base** (the universal between-blobs layer) → unchanged forest mix (Boar 24 / Snake 28 /
  RangedGremlin 22 / MeleeGremling 8 = 82). Meat sources still ~63%.
- **badlands** → the badlands mix, weighted ~ `spawnBadlandsEnemies()` counts (Duskrunner 84 /
  Cragscale 46 / Hexling 44 / Sandmaw 46 = 220). Duskrunners respawn as **lone** runners (no pack —
  a top-up, not a fresh war party); their `duskrunner_meat` is the badlands food drop, so the
  ~38% Duskrunner share keeps food renewable there the same way Boar/Snake do in the forest.
- **dunes** → returns `null` (empty placeholder biome, no roster yet); `updateRespawns` skips a
  null with `continue`, so no top-up happens out there.

Return type widened `Enemy → Enemy | null`; the only caller (`updateRespawns`) guards the null.
Elite rolls (night-boosted) + the density/cap/ring machinery are all unchanged — only the species
choice became biome-aware. **Still open (unchanged):** the *density targeting* is still
player-radius-based and biome-agnostic (fine — it's just a "how many nearby" measure), and the
dunes/deep-ring biomes remain content-less by design.

Verified live (`preview_eval`, 300 samples/biome): a forest point produced **only** the 4 forest
species (0 badlands), a badlands point (r=2220) produced **only** the 4 badlands species (0 forest),
and 50 dunes samples all returned null. `tsc --noEmit` clean, no console errors. `RECIPES.md`
unchanged (no recipe/data change); dashboard unchanged (respawn weighting isn't mirrored there).

### Biome-wide wood/stone + Ironbark axe-upgrade chain + relic-UI fixes (2026-07-13, Opus)

Off the master-plan build order — a mixed batch (two small fixes + two content adds). Locked
via `AskUserQuestion`: menus **mutually exclusive**, axe **upgrades in place**, Ironbark feeds
**Workbench Lvl 3/4 upgrades + the enhanced (T2) weapon reforges**.

- **Relic UI fixes.** (1) The Character menu (K) and the Tab combined menu are now **mutually
  exclusive** — opening one closes the other (both were depth-3000 and z-fought over the new
  Relics column). `toggleCombinedMenu()` closes `characterMenu`; the K handler closes the
  inventory/crafting menus first. (2) The relic hover tooltip in the Inventory panel now shows
  the relic's **family/class** (`relicFamilyName(group.family)` — "Damage", "Move Speed", …),
  inserted next to the rarity line.
- **Wood + stone in EVERY biome (item 3).** New `MainScene.spawnBadlandsNodes()` scatters
  badlands-themed gatherables via `pickBadlandsPoint` that drop the **same universal `wood`/`stone`
  keys** (so all recipes work anywhere): **Dead Tree** (chop→wood, 54), **Badlands Boulder**
  (mine→stone, 46), **Dry Branch** (pickup→wood, 40), **Scrap Rock** (pickup→stone, 40). New
  `badlands_deadtree`/`badlands_boulder`/`badlands_branch`/`badlands_scraprock` placeholder
  textures in `BootScene`.
- **Tool tiers, finally implemented (item 4).** The codebase reserved a tool-tier hook for a year
  ("a stone axe shows [LMB] Chop but fails on a hardwood tree; a better axe succeeds") — now live.
  New `ResourceNode.minToolTier`; `MainScene` tracks `equippedToolTier` (the equipped tool stack's
  tier, mirroring `equippedWeaponTier`); `tryInteract` bounces a too-weak tool off (shake + tint +
  a throttled event-log line, **no XP/stamina spent, prompt still shows the verb** — never reveals
  the tier). New **Ironbark tree** (`ironbark_tree`, chop→new `ironbark` resource, `minToolTier: 1`,
  34 spawned) needs the upgraded axe. **Axe upgrades IN PLACE** via a new `src/systems/ToolUpgrades.ts`
  (mirrors `WeaponUpgrades`) — **Ironshod Woodcutter's Axe** (tier 0→1, `2 Sunsteel Ingot + 6 Stone`,
  "Fells Ironbark trees"), discoverable once Sunsteel Ingot is known. Reuses the **entire** weapon-
  upgrade path with near-zero new plumbing: right-click a tool → `openWeaponUpgradeMenu` (added a
  `def?.tool` branch in InventoryMenu/HotbarUI), `ToolUpgradeDef` added to the `UpgradeMenu` union +
  the `upgradesFor` concat, and `applyWeaponUpgrade` (generic — just bumps the stack tier) handles it;
  `stationDisplayName` now checks the tool table too so an upgraded axe reads "Woodcutter's Axe Lvl 2".
- **Ironbark sinks (item 4 proposal, locked).** Ironbark feeds the **Forge Anvil** (Workbench Lvl 3,
  +5) and **Emberforge Anvil** (Lvl 4, +8) station upgrades, and the **Embersteel Warhammer** (+4)
  and **Embersteel Pike** (+3, replacing its 2 Wood) reforges — the two haft/shaft weapons ("some,
  not all": the mostly-metal Longsword and the magic Ember Brand are untouched). Because Forge Anvil
  gates all forged gear, this makes the axe upgrade a **genuine prerequisite** for the forged tier —
  intended, and thematically the hardwood reinforces the bench.
- **Deferred to their own session (the user's call, captured for follow-up):** Ember-tier uniqueness +
  **heavy/light armor set bonuses**; **ungated** upgrades for basic/T2 ore gear (no workbench gate);
  and a **QERT activated-ability** system (armor/weapon actives with cooldowns) — biome-2 keeps a
  simple passive/static special, saving QERT actives for biome 3 to avoid piling too many new
  mechanics into one biome. See [[survivor-rpg-biome-2-plan]].

Verified live (`preview_eval` + screenshots): all node types spawn (chop:wood 158→212, mine:stone→80,
34 Ironbark trees w/ minToolTier 1) and render; base axe **bounces off** Ironbark (health unchanged)
while the upgraded axe fells it in 4 swings + drops ironbark; base axe fells a badlands dead tree
(ungated); the upgrade apply path deducts `2 Sunsteel`, bumps tier, updates `equippedToolTier`; menu
mutual exclusion (Tab↔K); relic family names correct; recipe/upgrade costs updated. `tsc` clean, no
console errors. `RECIPES.md` (new Tool Upgrades section + updated station/weapon costs) + dashboard
(new Tool-upgrade table) updated.

