# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **S2 — Onboarding/Tutorial rework**
(2026-07-15, Sonnet, plan `playtest-2026-07-15-session-plan.md`). Replaced `TipsUI`'s dynamic
discovered-hints dump (an un-scrollable joined Text that overflowed the panel) with a curated
**static "How to Play" reference** (movement/sprint/dash, mouse-only interact/right-click-upgrade,
inventory/hotbar rows, food-buff stacking, character/map keys, the goal stated in generic
no-spoiler terms). **The panel is now dynamically sized to the real measured text height**
(build title/body at panel-relative Y first, read their actual `.height` after wordWrap, then
compute the panel's final height/centered Y and shift everything down in one pass — same
"measure real Text heights, then shift" pattern as this codebase's other dynamic-row-height
panels) rather than a fixed guess — a first pass used a fixed 600×520 that undershot the real
wrapped-text height at the game's native 1920x1080 resolution (only visible full-size; a
scaled-down screenshot hid it) and let the Close button render mid-paragraph. `Hints.discovered()` removed (no longer
consumed). Added two new one-off tutorial hints to `Hints.ts`: `dash_tip` (fires on the player's
first `frame.dashStarted`) and `multi_food_tip` (fires on the player's first `eatItem()` call,
teaching that food buffs stack). `KeybindsUI` already covered dash + right-click-upgrade lines, no
change needed there. `tsc` clean; verified live via `javascript_tool` (opened the pause-menu Tips
panel, screenshotted the new static panel, confirmed both new hints fire exactly once and are
idempotent on a repeat `trigger()` call). **Next in the 8-session plan:** Wave 2 (S1, S3), then
Wave 3 (S7 → S8).
Prior: **S6 — Cinderwrought rebalance**
(2026-07-15, Sonnet, plan `playtest-2026-07-15-session-plan.md`). The Sunken Forge's two-guard
fight was too tough with both Cinderwroughts perma-attacking at once; goal is stagger-one-while-
you-1v1-the-other. Poise 70→45 (stagger comes up more), attack cooldown 650→1050ms (more downtime
between telegraphs), both telegraphs lengthened (cone 620→750ms, hammer 560→680ms), damage cut
(cone 46→32, hammer 58→40). Fixed a backwards resist: blunt was **resisted** (×0.8), now correctly
**weak** (×1.3, "blunt cracks the crust"); pierce weak ×1.25 unchanged. Forge Hammer switched from
fire→**physical** (armor now applies) so the pair is one fire attack (Cinder Cone, armor-bypass) +
one physical (Forge Hammer) — was both fire. `tsc` clean; verified live via `javascript_tool`
(spawned a Cinderwrought, confirmed `poise === 45` and `resistMultiplier('blunt') === 1.3`).
Dashboard Enemies tab updated.
Prior: **S5 — Relic forge SFX per rarity** (2026-07-15, Sonnet): per-rarity relic-forge reveal
audio cues (`relicReelTick`/`relicCommon`/`relicUncommon`/`relicRare`/`relicMythic`/`relicCrumble`
in `Sfx.ts`), hooked into `RelicRevealFx.ts` at the reveal landing. Full entry below.
Prior: **Relic redesign — single-family + Rare/Mythic unique procs + additive buckets**
(2026-07-15, Opus): every relic touches ONE family axis; Common/Uncommon = a small flat stat
plateauing at Uncommon; Rare/Mythic add a bespoke conditional proc (8 procs). All buff categories
additive-within-category (nothing scales exponentially). Full entry below + [[survivor-rpg-relics]].
Prior: **S4 — Relic economy rework**
(2026-07-15, Opus): first of the 8-session 2026-07-15 playtest plan. Filled the **full 8×4 relic
matrix** (net +11 — 12 added, the boss-named duplicate damage mythic "Gremlin King's Wrath" dropped
per the user — → **32 total, one per family per rarity**; closes the "no stamina relic" gap). **Main bosses guarantee a Mythic**: Gremlin King → Boss Trophy (Mythic T1),
Duneshaper → new **Tyrant Trophy** (`boss_refined_trophy_t2`, Mythic T2 ×1.5). A **Rare/Mythic roll
never repeats an owned id** (owned-id pool filter, full-pool fallback). **Common crumble softened**
(band 10%→20%, success 13.5%→23.5%, pity 12→8) and the **refined-trophy Mythic cap lifted** (mini-boss
refined trophies can gamba to Mythic ~1%). All in `Relics.ts` + the two boss loot tables; `RECIPES.md`
+ dashboard synced. `tsc` clean; verified live via `javascript_tool`. **Next in the plan:** S5 (forge
SFX, Sonnet, fully parallel), S6 (Cinderwrought rebalance, Sonnet), S2 (onboarding, Sonnet), then Wave
2 S1/S3 and Wave 3 S7→S8. See the S4 entry below + [[survivor-rpg-relics]].
Prior: **PB2 — post-Duneshaper playtest batch
(15 items)** (2026-07-14, Opus): **Relic/trophy economy** — new **Boss Trophy** from Gremlin King +
Duneshaper (bespoke odds: Rare with a 50% roll-up to Mythic, never fails); **Cinderwrought now drops
Ember Shards** (2-4) + a tier-2 Ember-Refined Trophy (was Gloam + tier-1 — Gloam never made sense for
a badlands mob), and there are now **2 Cinderwroughts per Sunken Forge** (**260 HP each**, trimmed
340→260 for the two-boss fight; ore cracks only when both die; **both drop 2-4 Ember Shard, only one
drops the refined trophy** so a two-guard site doesn't flood trophies); **replaced relics now partial-refund**
(1/2/3/5 shards by rarity ×1.5 T2) on top of the declined-roll refund; **Ember-Shard refine recipe
hidden until Ember Shard discovered** (`hasDiscovered` gate). **Gear** — **+2 right-click levels for
ALL forged armor & weapons** (steel + ember, via ArmorUpgrades/WeaponUpgrades, tuned so Lvl-1 ember
always out-stats Lvl-3 steel — Emberhide Legs base bumped 7→8), sunk in ingots; **hotbar items now
count toward reforge recipes** (`Crafting.setHotbar` — a Sunsteel Pike in the hotbar is now visible to
the Embersteel Pike reforge); higher-tier weapons cost **more stamina** (starter < Sunsteel < Ember).
**Duneshaper sharpen pass** — HP 1050→1250, cooldown 900→700ms; the **Lance tracks the player through
60% of the wind-up then commits + sweeps ±20° on the strike** (was locked at telegraph start,
trivially sidesteppable); **Sand Spikes reworked from 3 spaced circles to a tracked 5-circle cross**
(distinct from the Hexling, only a diagonal/dash clears it). **HUD** — bigger boss stagger bars
(mini-boss world bars 22×3→56×6, top boss-bar poise 12→20px); **center-toast burst capped at 4 +
repacked from the top** so "Defeated X" bursts no longer march over the player; **POI-respawn toasts
only fire when within 900px**; **tier-aware bench art in the hotbar**. **World** — emberblooms +
dustblooms grow in **patches of 3-5** (cactus/mushroom stay solo). `tsc` clean; verified live via
`preview_eval`. **Flagged non-repro:** the "duskrunner stacks to 98" report — every stacking primitive
(`add`/`sortAndStack`/`moveSlot`/hotbar top-up) fills to the full 99; no off-by-one found. See the
PB2 entry below + [[survivor-rpg-relics]].
Prior: **PB1 — post-2nd-boss playtest fix batch (3 sessions)** (2026-07-14): forged armor up
(Emberhide 16→23, Embersteel 23→32), stone costs −30-40%, faster leveling, Duskrunner Skewer;
equipped pieces count toward reforge; per-tier relic roll buttons; relic refund = 50% of a discarded
roll's trophy cost; enemy **wander-anchor**; **Hexling** rework (hex-essence drops 4-6/elite 9-11);
populated forest blobs + extended badlands band (`BADLANDS_R_MAX_OUTER` 8500). A pre-existing minor
bug flagged (spawn task `task_c1db4f83`: `pickSpawnPoint` exhaustion fallback). See the PB1 entry below.
Prior: **S7 — pre-push inventory/dev-cmd tweaks** (2026-07-13, Opus): search-box insta-clear `✕`
button, `nobuildcost` TEMPORARILY lists all recipes (display-only), taller backpack grid
(`BACKPACK_ROWS 6 → 15`). See the S7 entry below.
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
- **Forest blobs + a wider badlands band have content now (PB1 Session 3); dunes + the true deep
  frontier are still empty.** The forest disc holds the biome-1 roster/POIs; **forest patchwork
  blobs beyond `BIOME_RADIUS` also now get a (lighter) content pass** via `pickOuterForestPoint`;
  the badlands patchwork holds the Duskrunner/Cragscale/Hexling/Sandmaw roster + Emberbloom/Sunfruit
  flora out to `BADLANDS_R_MAX_OUTER` (8500, was 5200) via `pickBadlandsPoint`. Dunes and everything
  beyond ~8500-9000 is still terrain only, deliberately reserved for a future biome.
- ~~**Enemy respawn top-up is forest-species-only, biome-agnostic.**~~ **FIXED (2026-07-13)** —
  `makeRespawnEnemy` now picks the roster from the biome at each chosen spawn point
  (`worldBiomes.dominantBiomeAt`): forest/base → the forest mix, badlands → the badlands mix
  (Duskrunner/Cragscale/Hexling/Sandmaw), dunes → nothing (empty placeholder). See the entry below.

## Recent Entries

> Older entries in STATUS-archive.md.

### S2 — Onboarding/Tutorial rework (2026-07-15, Sonnet)
Wave 1 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`). Locked:
Tips → a static How-to-Play reference (core controls, no spoilers/win-condition), keep the
existing specific one-off popups. **`TipsUI.ts` reworked**: the old body was a dynamic dump of
every `Hints.discovered()` entry joined into one un-scrollable Text — fine early, but overflowed
`PANEL_H 460` once a run had racked up more than a handful of hints. Replaced with a curated
static block (movement/sprint/dash, mouse-only interact + right-click-to-upgrade,
inventory/crafting + hotbar rows, food-buff stacking, character/map keys, and the goal stated in
generic terms only — no win-condition spoilers). `show()` no longer takes a `tips` param (the
content is static now); the now-unused `Hints.discovered()` method was removed rather than left
dead. **Two new tutorial hints added to `Hints.ts`** (`HintId`/`HINT_DEFS`): `dash_tip` (fires on
the player's first `frame.dashStarted`, teaching Spacebar-dash + its dodge window) and
`multi_food_tip` (fires on the player's first `eatItem()` call, teaching that different food buffs
stack rather than replace each other) — both follow the standing "once per run if enabled,
idempotent" `HintManager.trigger()` contract, no new machinery. `KeybindsUI.ts` already listed
both "Dash: Space (while moving)" and "Inspect / upgrade: Right Click" — no change needed there.
**Playtest fix (same session):** a first pass used a fixed 600×520 panel that read fine in a
scaled-down screenshot but actually undershot the real wrapped-text height at the game's native
1920x1080 resolution, so the Close button rendered mid-paragraph. Fixed by measuring the title/body
`Text` objects' real `.height` after wordWrap and sizing the panel (and re-centering + shifting
content) to fit exactly, floored at a `PANEL_H_MIN` of 300 — same "measure real heights, then
shift" pattern as this codebase's other dynamic-row-height panels. `tsc` clean; verified live via
`javascript_tool` at the game's native 1920x1080 resolution (measured each object's real `y`/
`height`, confirmed a real gap between the body text's bottom and the Close button's top with no
overlap, then screenshotted to confirm visually); triggered both new hints, confirmed each fires
exactly once and a repeat `trigger('dash_tip')` call is a no-op; confirmed pause/resume state stays
correct after closing Tips). No `RECIPES.md` change (no recipe/cost changes). **Next in the plan:**
Wave 2 (S1, S3), then Wave 3 (S7 → S8).

### S6 — Cinderwrought rebalance (2026-07-15, Sonnet)
Wave 1 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`). the user's
locked play-pattern goal for the Sunken Forge's two-guard fight: **stagger one while you 1v1 the
other** — today it's too tough with both Cinderwroughts perma-attacking at once. All changes in
`src/entities/Cinderwrought.ts`:
- **Easier stagger:** `WROUGHT_MAX_POISE` 70→45, `POISE_REGEN_DELAY_MS` 3500→4200 (a stagger sticks
  a little longer before poise starts clawing back).
- **More downtime:** `ATTACK_COOLDOWN_MS` 650→1050 — meaningfully more idle time between telegraphs
  so a 1v1 window actually opens up while the other guard is between attacks or staggered.
- **Longer telegraphs (easier to read/dodge):** `CONE_TELEGRAPH_MS` 620→750, `HAMMER_TELEGRAPH_MS`
  560→680.
- **Less damage:** `CONE_DAMAGE` 46→32, `HAMMER_DAMAGE` 58→40.
- **Resist fix (was backwards):** `resistances.blunt` 0.8→1.3 — the crust was accidentally
  *resisting* blunt (0.8 = damage reduced); now it's correctly *weak* to blunt (1.3 = extra damage,
  "blunt cracks the hard crust"), matching the in-code comment's own stated intent. `pierce: 1.25`
  (weak) unchanged.
- **One fire + one physical (was both fire):** `checkPlayerHit()`'s Forge Hammer branch dropped its
  `dmgType: "fire"` so it's now plain physical (flat armor applies); **Cinder Cone stays fire**
  (bypasses flat armor, like magic) — armor now matters against exactly one of the two attacks.
- Did **not** add a per-forge attack-turn token (the plan's fallback if tuning alone didn't fix the
  overlap feel) — the cooldown/telegraph/poise changes together should be enough; that's the thing
  to watch for in the next playtest if the two guards still feel synced.

`tsc --noEmit` clean. Verified live via `preview_start` + `javascript_tool` against the running
game: `window.__dev.spawn('cinderwrought')`, then read the live instance's `poise` (45) and
`resistMultiplier('blunt')`/`resistMultiplier('pierce')` (1.3 / 1.25) directly off the running
`Enemy` — confirms the new numbers are actually wired, not just typed into the constants. Updated
the dashboard's manual Enemies-tab mirror (damage/telegraph numbers, resist note, fire-vs-physical
split, and the rebalance rationale) to match. No `RECIPES.md` change (no recipe/cost edits).

### S5 — Relic forge SFX per rarity (2026-07-15, Sonnet)
Wave 1 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`), the only
session that never touches `MainScene.ts` (cleanest parallel-safe pick). Gave the Relic Forge's
slot-machine reveal per-rarity audio to match its per-rarity visual escalation.
- **`Sfx.ts`** — new "Relic Forge" cue group, all raw Web-Audio oscillator/gain envelopes synthesized
  at call time (same ethos as every existing cue, no asset files): `relicReelTick()` (a faint 14ms
  click, gain 0.018, per reel-gem swap — many fire per spin, near-inaudible individually, together
  read as a spinning reel), and escalating reveal fanfares — `relicCommon()` (modest single rising
  blip), `relicUncommon()` (brighter two-note rise), `relicRare()` (low body + ascending C-major
  arpeggio + C6 sparkle), `relicMythic()` (MASSIVE: sub-boom + full ascending run + sustained shimmer
  pad + high sparkle tail, ~1s layered) — plus `relicCrumble()` (dusty downward fizzle for fails).
- **`RelicRevealFx.ts`** — fires the cues in sync with the visuals: reel tick on each `tickReel` swap;
  the per-rarity fanfare (`playRevealCue`) at the **gem-land** inside `reveal()`'s success branch (NOT
  the ~900ms-later `announceRoll`, so audio lands with the punch); `relicCrumble()` in the fail branch.
- **Kept to just these two files** per the plan's parallel-safety constraint. `RelicRevealFx` only holds
  `this.scene`, which IS the MainScene instance, so it reads the private `sfx` field via a structural
  cast (`(this.scene as unknown as { sfx?: SfxPlayer }).sfx`) — no MainScene edit, no dep threading,
  no second `AudioContext`; no-ops safely if unavailable. Also imports `type SfxPlayer` (type-only).
- **Verified** (`tsc` clean + live `javascript_tool`): all 6 methods exist + call without throwing;
  a real guaranteed-success first roll (landed `uncommon`) fired 7 `relicReelTick`s during the spin then
  exactly `relicUncommon` at landing (rarity→method map correct); a forced `{success:false}` roll fired
  reel ticks then `relicCrumble`; `revealFx.scene === MainScene` confirmed (accessor resolves); no
  console errors. Audio itself is by-ear (can't be auto-verified). No `RECIPES.md`/dashboard change.

### Relic redesign — single-family purity + Rare/Mythic unique procs + additive buckets (2026-07-15, Opus)

Plan: `.claude/plans/steady-humming-sphinx.md` (approved over a long design conversation).
Off the user's dislike of relics mixing effects across families + wanting bespoke unique
effects (reversing his earlier "only recipes are unique") + a balance worry about exponential
scaling. Locked via `AskUserQuestion`: **single-family always; Rare/Mythic get curated
within-family procs (StS/Hades-style, NOT Diablo rolled affixes); conservative %s, spicy
uniques; additive-within-category across ALL buffs.**

- **Single-family relics** (`Relics.ts`) — every relic touches one axis. Common/Uncommon = a
  small flat stat; the number **PLATEAUS at Uncommon** (Rare/Mythic reuse it), so a relic is
  never a *growing* damage/HP multiplier (a Mythic damage relic is still just +7% raw). New
  `RelicUnique`/`UniqueKind` + `RelicDef.unique`; `RelicManager.unique(kind)` returns the
  owned proc's params + tier; `uniqueText()` appended to `relicEffectText`. **`compareInstances`
  reworked to order by rarity→tier** (not numeric) — that's what frees the stat to plateau
  without breaking auto-replace; the "choice" verdict now effectively never fires.
- **8 bespoke procs** (Rare→Mythic scaled), all reusing one existing hook each:
  **Onslaught** (damage, every Nth hit +bonus), **Fleetfoot** (move, on-kill speed burst +
  dash refund), **Guardian** (defense, negate-next-hit on cd + Mythic hit-cap), **Second
  Wind** (stamina, on-kill % restore + Mythic free-attack window), **Leech** (lifesteal, heal
  % of dmg dealt + Mythic overheal→shield), **Undying** (vitality, low-HP heal + Mythic
  once-per-run revive), **Executioner** (crit, crit splash + Mythic slow), **Prodigy** (xp,
  kill-streak ramp). Net-new: player shield (+ cyan HP-bar overlay), `Stamina.restore()`,
  `Enemy.slowUntil`/`applySlow` (folded into `envSpeedMult`), `Player.resetDashCooldown()`,
  10 per-run scene fields (all reset in `create()`).
- **Additive-within-category (all buffs)** — no category compounds across % sources:
  **damage** (`damageBonusMult` = 1 + skill% + relic%, replacing `× skill × relic` at all 3
  damage sites + display); **damage reduction** (relic% + Molten add, capped 75%, in
  `applyDamageToPlayer`); **move** (relic + Fleetfoot + sprint add in `Player.update`); **XP**
  (relic + Intelligence + streak add in `awardSkillXp`); **max HP/stamina** (linear
  `100 + statFlat + 100×relicPct%`, superseding M-SS's compounding — a minor high-stat nerf,
  the anti-exponential choice). Crit chance/mult + stamina cost were already additive. Crit,
  stagger, and the procs stay their own conditional multipliers.
- Also: dropped the boss-named **Gremlin King's Wrath** relic (the user: no boss-named
  relics) — the damage mythic is now just **Berserker's Mantle**, mythic pool a clean 8.

**Verified live** (`javascript_tool`): all 8 unique() lookups; Onslaught fires every 4th hit
(2.2×); Fleetfoot burst +35% + dash refund; Second Wind restores 40% max stam + free window
(cost mult→0, →0.9 on expiry); Prodigy streak 1.10→1.20; Guardian negate + cooldown; Guardian
cap (100→30); Leech shield absorb (20→12, HP unchanged) + HUD overlay renders; Undying revives
once to 40% then dies; linear max HP 112; **additive damage 1.57 vs 1.605 multiplicative**;
**additive reduction 78 vs 79 multiplicative** (relic-only 93). `tsc` clean; dashboard renders
all proc text; no console errors. See [[survivor-rpg-relics]].

### S4 — Relic economy rework (2026-07-15, Opus)

First of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`).
All changes in `src/systems/Relics.ts` + the two main-boss loot tables; `RECIPES.md` +
dashboard Relics tab kept in sync. Four locked pieces:

- **Full 8×4 relic matrix** — added **12 relics** so every family
  (damage/move/defense/stamina/lifesteal/vitality/crit/xp) has a
  Common/Uncommon/Rare/Mythic (**32 total, one per family per rarity** — the old boss-named
  duplicate damage mythic "Gremlin King's Wrath" was dropped per the user so no relic is tied
  to a specific boss; Avatar's Mantle stays the damage mythic). New: Scholar's Charm (xp C),
  Tireless Idol (stamina U), Aegis/Endless/
  Deadeye/Sage Totems (defense/stamina/crit/xp R), Windwalker's/Perpetual/Bloodlord's/
  Colossus/Assassin's/Enlightened Mantles (move/stamina/lifesteal/vitality/crit/xp M).
  Magnitudes follow the existing per-rarity curve (Charm→Idol→Totem→Mantle naming). This
  closes the 50-rolls-no-stamina-relic complaint (only one stamina relic existed).
- **Main bosses → guaranteed Mythic of their tier** (locked: main bosses only). The
  shared `boss_refined_trophy` (Rare, 50%→Mythic) is now the **Gremlin King's** guaranteed
  **Mythic Tier 1** (`outcomeOdds:[{mythic,1.0}]`); a new `boss_refined_trophy_t2` item —
  **"Tyrant Trophy"** — is the **Duneshaper's** guaranteed **Mythic Tier 2** (×1.5), so the
  two tiers don't share a key. New item def + `Inventory.ts` type + ember-orange BootScene
  icon.
- **Never re-roll an owned Rare/Mythic id** — the pool pick now filters out ids already in
  the loadout when the produced rarity is rare/mythic (Common/Uncommon can still repeat —
  small pools, churn through the family-dominance compare fine). Guards the own-everything
  case by falling back to the full pool.
- **Softened Common crumble + lifted refined cap** — Common own-rarity band **10%→20%**
  (success **13.5%→23.5%**), pity **12→8**; the `maxRarity:"rare"` cap is removed from both
  `refined_trophy_uncommon` + `_t2`, so a mini-boss refined (Uncommon) trophy can now gamba
  into a **Mythic** (~1%), not just main bosses.

**Verified live** (`javascript_tool` against the running `RelicManager`): boss trophy →
100% Mythic T1 / tyrant → 100% Mythic T2 (300 each); pool sizes C8/U8/R8/M9 (full matrix);
2713 rare rolls with an owned rare id → **0 leaked** the owned id; empty-pool fallback still
returns a rare when all 8 are owned; Common success **23.55%** (200k rolls); refined Uncommon
+ refined-t2 both reach Mythic ~1.0%. `tsc` clean, dashboard boots with no console errors.
