# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **S7 — Weapon identity redesign**
(2026-07-15, Opus, plan `playtest-2026-07-15-session-plan.md`). Reworked the three melee weapon
identities (all locked via `AskUserQuestion`): **pierce (spear/pike) = lowest arc + highest
single-target + best crit; slash (knife/sword) = biggest arc + best crowd AOE; blunt (club/warhammer)
= medium arc + a NEW movement-slow/cripple debuff.** The old `WEAPON_ARC`/crit tables were largely
inverted from this. Arc table rebalanced (slash widest, blunt medium, pierce near-single-target);
forged pikes bumped so pierce is the single-target DPS leader (sunsteel_pike 15→19, embersteel_pike
20→25, tier invariants preserved); pierce given the clearly-best base crit (spear/pike 10-11% / ×1.7).
The **blunt debuff** reuses the existing `Enemy.applySlow`/`slowMult`→`envSpeedMult` path (built for
the Executioner relic) — applied at the shared `MainScene.resolveWeaponHit` choke point when the
weapon type is blunt (0.6× speed / 1.5s, refreshes per hit, also cripples AOE-swept enemies), so
**zero new per-enemy state**; subtle icy-blue puff tell. New `weaponIdentityLine` surfaced on the
Tooltip, the inventory Combat column, and the dashboard weapons tab (new Arc column + identity note).
`tsc` clean; verified live (blunt slows 1→0.6 / pierce doesn't; sword sweeps a 45° secondary while
pike/club don't; identity lines render everywhere). **Next: S8 (biome-2 bow + arrows, Opus) — the
final session, fitting these finalized identities.** Full entry below.
Prior: **S3 — Inventory visuals +
upgrade-ready indicators** (2026-07-15, Opus, plan `playtest-2026-07-15-session-plan.md`). Three
parts. **(1) Bigger icons**: item icons were drawn at native texture size (~14-30px) and looked lost
in the slots — now fit within a `SLOT-12` box (aspect preserved) via a shared `fitIcon` in
`InventoryMenu` (backpack cells / equipment slots / relic gems) and inline in `HotbarUI`. The hotbar
`SLOT_SIZE` was also bumped **40→46 to match the inventory slot** (the user's ask — "same size"), so an
icon renders identically in the backpack or the hotbar. HP/stamina/XP bars and hotbar centering all
derive from the getters, so they re-layout automatically. **(2) "Upgrade ready" arrow**: a small gold
pulsing **▲** at a slot's top-right when the item has a discovered + affordable next-tier upgrade —
on backpack **weapons/tools**, worn **armor** (both via `MainScene.hasReadyUpgrade(key,tier)`, the
resultTier ladder), and placed **stations** (a floating world glyph over the object via
`stationHasReadyUpgrade` + `refreshStationUpgradeIndicators`, depth 2500). Deliberately
**materials-only** (ignores `upgradeBlockReason`/Workbench-proximity) so it's a stable "you have the
mats" nudge that doesn't flicker as the player moves — clicking Upgrade still surfaces any proximity
gate, like the crafting menu. Refreshed from `afterItemMove`/`refreshDiscovery`/placement/upgrade-
apply. Looping fade tweens are tracked + killed on every re-render / on station destroy (no
infinite-tween leak). **(3) Suppress armor-upgrade discovery toasts** — already satisfied: armor/weapon
upgrades never emitted a discovery toast (only station + tool upgrades do, kept); the affordable-arrow
is the new signal. `tsc` clean; verified live via `javascript_tool` (predicate false→true→false across
mats add/remove and max-tier; 1 backpack + 1 equipment arrow render at correct slot top-right screen
coords; hotbar arrow + icon enlarged 24→34 display px; station glyph appears/clears/recreates with mats
and is cleaned on destroy; no arrow-tween accumulation across 20 inventory toggles; hotbar/bars layout
intact at native 1080p; no console errors). **Next in the 8-session plan:** Wave 3 — S7 (weapon
identity redesign, **Opus**) → S8 (biome-2 bow + arrows, **Opus**, after S7).
Prior: **S1 — Quick HUD/UX fixes** (2026-07-15, Sonnet): sprint re-press latch (`Player.sprintLocked`),
level-up banner→center-toast overlap fix (measured, not `cy+80`), stagger bar `POISE_BAR_H` 20→16 +
numeric `"42/120"` readout, and armor/weapon tooltip flipped to `"7 (base 5)"` (upgraded value
primary). Full entry below.
Prior: **S2 — Onboarding/Tutorial rework**
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

### S7 — Weapon identity redesign (2026-07-15, Opus)
Wave 3 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`). A new
mechanic (the blunt debuff) + a full rebalance of the three melee weapon identities, all locked via
`AskUserQuestion`: **Spear/Pike (pierce) = lowest arc + highest single-target + best crit; Knife/Sword
(slash) = biggest arc + best crowd AOE; Club/Warhammer (blunt) = medium arc + a movement-slow/cripple
debuff.** The old tables were largely **inverted** from this — spears/pikes were the WIDEST sweepers
and swords near single-target.

- **`Weapons.ts` tables reworked:**
  - **`WEAPON_ARC`** — slash now the widest (bone_knife ±50°/54px, sunsteel_sword ±60°/66px,
    embersteel_sword ±62°/70px), blunt lower-medium (clubs ±35-38°, warhammers ±40-42°), pierce
    near-single-target (primal_spear ±18°/30px, pikes ±20-22°/34-36px). Ranged unchanged (no sweep);
    ember_brand stays a medium ±45° magic sweep.
  - **`WEAPON_DAMAGE`** — bumped the forged pikes so pierce is the single-target DPS leader:
    sunsteel_pike **15→19** (DPS 30.6, edges sunsteel_sword's 29.2), embersteel_pike **20→25** (DPS
    41.0 > embersteel_sword's 40.4). starter primal_spear stays 8 (already its tier's top
    single-target). Both bumps preserve the tier invariants (ember base ≥ steel base + 5; base forged
    still clears the maxed Primal Spear's 13).
  - **`WEAPON_BASE_CRIT_*`** — pierce is now clearly the crit king (spear/pike 10%/×1.70,
    embersteel_pike 11%/×1.75) over blunt (4-5%) and slash (5-6%); previously the warhammers held the
    highest base crit. Rationale comment updated: crit is a pierce-identity axis first, attack-speed
    lean second.
- **Blunt movement-slow debuff (net-new mechanic, but zero new state machine):** a blunt hit now calls
  `enemy.applySlow(BLUNT_SLOW_FACTOR 0.6, BLUNT_SLOW_MS 1500, now)` at the single melee/ranged choke
  point `MainScene.resolveWeaponHit` (only on a surviving enemy). This **reuses the exact
  `Enemy.applySlow`/`slowMult` path already built for the Executioner crit relic** — the scene folds
  `slowMult(now)` into `envSpeedMult` each frame, so the slow rides every aggressive-movement velocity
  with no per-subclass wiring. The slow **refreshes on each blunt hit** (sustained bludgeoning keeps a
  target crippled) and `applySlow` keeps the stronger of any overlapping slows. Because it's at the
  shared choke point, a blunt AOE-arc *sweep* cripples every swept enemy too (thematic crowd-control
  identity). Subtle tell: a one-shot icy-blue `light_soft` puff (`spawnSlowTell`) — deliberately NOT a
  persistent tint (would fight `Enemy.applyHpTint`/the wind-up tell); the enemy visibly slowing is the
  lasting feedback.
- **Identity surfaced everywhere:** new `weaponIdentityLine(weapon)` (keyed off primary damage type) +
  `weaponSlowsOnHit` helpers. Shown on the item **Tooltip** (a line under Crit), the inventory
  **Combat column** (muted line under the weapon name, new `CombatStatsView.identity`), and the
  **dashboard** weapons tab (new **Arc** column `±half° / range / falloff` + an "S7 weapon identities"
  note block, drift-free off `BLUNT_SLOW_FACTOR`/`_MS`).

`tsc` clean; verified live via `preview_start` + `javascript_tool` against the running game: a blunt
`resolveWeaponHit` drops `enemy.slowMult` 1→0.6 while a pierce hit leaves it at 1; combatStats reads
per-type (pike 19/25, pierce crit 10%/11%, correct identity strings); an end-to-end `tryMeleeAttack`
sweep test confirmed a **sunsteel_sword hits a 45°-offset secondary for 10.5 (=14×0.75 falloff) while
sunsteel_pike and stone_club do NOT** (pierce single-target; club's 38° cone excludes 45°); the Combat
column renders "Focused — top single-target & crit, narrow arc" and the Tooltip appends "Crushing —
cripples enemy movement"/"Focused …"; dashboard weapons tab renders the Arc column + notes; no console
errors. No `RECIPES.md` change (no recipe/cost edits — weapon damage stats aren't in it). **Next in the
plan:** S8 (biome-2 bow + arrows + ember material tweak, **Opus**) — the last session, and it should
fit these finalized identities.

### S3 — Inventory visuals + upgrade-ready indicators (2026-07-15, Opus)
Wave 2 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`). A new
upgrade-affordance indicator system + an icon-size pass. Three parts:

1. **Bigger icons.** Item icons are generated tiny (native ~14-30px, e.g. a 24px tool) and were
   drawn at native size via `scene.add.image(...)` with no `setDisplaySize`, so they floated small in
   the slot. Added a shared `InventoryMenu.fitIcon(img)` — scales each icon to fit within an `ICON_BOX`
   = `SLOT - 12` (34px) box, aspect preserved — applied to backpack cells, equipment slots, and the
   relic gem icons; `HotbarUI` does the same inline (its own `ICON_BOX = SLOT_SIZE - 12`). The hotbar
   `SLOT_SIZE` was **bumped 40→46 to match the inventory `SLOT`** (the user: "hotbar size up a little
   too, so things are the same size"), so an icon renders identically in the backpack or the hotbar.
   The HP/stamina/XP bars and hotbar centering all derive from `HotbarUI`'s `top`/`bottom`/`left`/
   `width` getters (which read `SLOT_SIZE`), so they re-layout automatically — verified intact at
   native 1080p (hotbar top 948 / bottom 1046 / width 462, centered).
2. **"Upgrade ready" arrow.** A small gold pulsing **▲** at a slot's top-right corner when that item
   has a discovered + affordable next-tier upgrade the player could apply right now. Three surfaces:
   backpack **weapons/tools** + worn **armor** (both via `MainScene.hasReadyUpgrade(itemKey, tier)` —
   the resultTier ladder: the single next-tier upgrade across the weapon/armor/tool tables, a given
   itemKey matching at most one), and placed **stations** (a floating world glyph over the object, via
   `stationHasReadyUpgrade(obj)` — the no-ladder "any discovered, not-yet-applied, affordable upgrade"
   model — reconciled by `refreshStationUpgradeIndicators()`, glyphs kept in a `placedUpgradeGlyphs`
   map keyed by the placed Image like `placedLabels`, depth 2500). **Design decision (logged):** the
   predicate is deliberately **materials-only** — it does NOT consult `upgradeBlockReason`
   (Workbench-proximity), so the arrow is a stable "you have the mats" nudge that doesn't flicker as
   the player walks near/away from a bench; clicking Upgrade still surfaces any proximity gate, exactly
   like the crafting menu shows affordable-but-needs-workbench recipes. Refreshed from `afterItemMove`
   (now also refreshes the hotbar, since a material change with nothing NEW discovered skips the
   `refreshDiscovery` path), `refreshDiscovery`, placement (`attemptPlaceObject` tail), and every
   upgrade-apply path. **Tween hygiene:** the looping fade tweens are tracked (`indicatorTweens[]` in
   each UI; per-glyph `tween` in the station map) and killed on every re-render / on station destroy —
   no orphaned `repeat:-1` tween (verified: no arrow-tween accumulation across 20 inventory toggles,
   zero stray world glyph tweens after destroy).
3. **Suppress armor-upgrade discovery toasts** — **already satisfied, no change.** Armor and weapon
   upgrades never emitted a discovery toast; only station upgrades (`STATION_UPGRADES`) and tool
   upgrades (`TOOL_UPGRADES`) do, in `refreshDiscovery`, and those are kept. The affordable-arrow is
   the new signal the triage wanted in their place.

`tsc` clean; verified live via `javascript_tool`: `hasReadyUpgrade('stone_club',0)` false with no
mats → true with exactly `{wood:3,stone:3}` → false at max tier; inventory renders 1 backpack + 1
equipment arrow at the correct slot top-right screen coords (72,253 / 402,105), each with a live fade
tween; icon display width 24→34; hotbar arrow + enlarged icon (34) render; station glyph (workbench
`tool_sharpener`, `{twine:3,wood:5,stone:2}`) appears with mats / clears on consume / recreates /
`placedUpgradeGlyphs` cleaned to 0 on `destroyPlacedObject`; no console errors. No `RECIPES.md`/
dashboard change (no recipes touched). **Next in the plan:** Wave 3 — S7 (weapon identity redesign,
Opus) → S8 (biome-2 bow + arrows, Opus, after S7).

