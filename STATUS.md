# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **PB18 — Backpack armor upgrade fix +
reforge-returns-to-slot** (2026-07-18, Opus). Two playtest bug fixes: (1) right-clicking armor in the
inventory now opens its Upgrade panel (was a no-op — the branch only handled weapons/tools; the generic
container-upgrade path is now named `gearSlot`/`openGearUpgrade`/`applyGearUpgrade`); (2) reforging a base
gear piece (e.g. Sunsteel → Embersteel) that's equipped or in the hotbar now returns the result to that
same slot instead of the backpack. See PB18 below.
Prior: **PB17 — Boss tuning + Cinderwrought solo
rework + silent placement** (2026-07-16, Opus). A small badlands-playtest batch (the user: "felt really
good"): (1) object **placement is now silent** (dropped the craft-cue on place); (2) the **Duneshaper**
(final boss) is **HP 1250→2500 + poise 170→400** (tankier, staggers less); (3) the **Cinderwrought** was
reworked from an awkward 2v1 into a **solo, tanky (260→650 HP), unstaggerable** mini-boss whose two attacks
**re-aim at execute** (wide/long → can't be walked out of, must be dash-dodged), still dropping **5-8 Ember
Shards + a Refined Trophy**. See PB17 below.
Prior: **PB16 — Playtest batch: crit/Onslaught
rework + 15 fixes** (2026-07-15, Opus). A 16-item playtest batch off the user's lvl-14 run. **Combat math
rework (the headline):** crit and Onslaught are now **additive conditional bonuses on the normal hit**,
never multiplied together (was crit×onslaught → the "17→84 / 196-dmg" spikes; now normal 24 → crit 56 →
onslaught 48 → both ~80). Onslaught trimmed to a flat **+100% (×2), no power-tier scaling**
(Berserker's Mantle 120→100). Split `applyCrit` → `critChanceTotal`/`critMultTotal`/`rollCrit`/`critBonus`
(one source of truth, shared by the tooltip). **Badlands resistances normalized** to weak ×1.25 / resist
×0.5 (the user: "weak/resist numbers unclear"); **Cinderwrought lost all weakness** (fully neutral) + poise
45→60; **Duneshaper** dropped physical weakness, gained **fire ×1.25** as its standout (magic-resist kept).
Floating damage numbers now COLOR-code effectiveness (no text): neutral white / resisted greyed-out /
weak gold / crit hot-orange+"!" + bigger. **Relic dominance** now prompts
**Keep New/Old** when a roll's tier & rarity disagree (was rarity-first → a T2 Rare auto-deleted by a T1
Mythic). **Refined-Uncommon Rare rate 5%→12%.** **Sandmaw** gained a signature **bleed** (4/s×5s) + faster
erupt (560→470ms). **Mini-boss HP/stagger bars enlarged** (barScale 2.4 on Gloamwarden/Cinderwrought).
New **ProcBarUI** (mid-left): Onslaught pip-counter (1..2..3..proc) + Guardian block-ready/cooldown.
**Weapon tooltip** now shows total crit chance + crit damage (base + STR/AGI/relics) via a `critTotals`
callback. **Ironshod axe** gets distinct tier-1 art (generic `${base}_t{tier}` texture resolver, now covers
tools/weapons too). **Ember sword/pike** reforges consume a base creature-material (sandmaw_chitin /
cragscale_plate). **Craft/upgrade SFX** (new `Sfx.upgrade()` + placement cue). **Menu text +1px** across
all read-heavy panels. **Bug:** opening the Character/level-up menu now closes the Relic Forge menu (was
rendering on top of it). `tsc` clean; verified live via `javascript_tool` (additive hit = 51.84 not 63.02;
onslaught cycle [0,0,0,1]; all 5 badlands resist tables; Sandmaw bleed; mini-boss barW 52.8; proc bar
pips/label; tiered axe texture; menus render no-overflow; no console errors).
**Same-session follow-up (3 more):** (1) **Cinderwrought bugs** — now aggros from ranged hits
(`takeHit` sets `aggroed`), only telegraphs when the player is actually in reach (was whiffing from up
to 260px), `checkPlayerHit` adds `reachBonus()` for the 1.8× sprite, and gains **pack behavior** (hitting/
aggroing one forge-guard wakes its mate via `packAggro` + a `forceAggro` override). (2) **Duneshaper** —
dropped its magic resist entirely (the user: fire is a magic subtype + the Ember Brand deals fire), so its
ONLY resist line is now fire ×1.25 weak. (3) **Unified passive/proc HUD** — the mid-left ProcBarUI +
bottom-left relic-gem bar are REPLACED by one `PassiveBarUI` (Dota-style icons LEFT of the hotbar):
relic passives + armor set-bonuses + proc counters (Onslaught count + ready-glow) / cooldowns (Guardian
sweep), all hoverable, showing cleanly together. Verified live (5-icon strip renders; Onslaught count
"3"+glow; Guardian 27px cooldown overlay; ranged-aggro + pack + in-range-gate all confirmed; no errors).
Full entry below.
Prior: **S8 — Biome-2 Warbow + arrows +
ember material tweak** (2026-07-15, Opus, plan `playtest-2026-07-15-session-plan.md`) — **the FINAL
session of the 8-session 2026-07-15 playtest plan; that plan is now fully shipped.** Added the
badlands ranged tier: a **Sunsteel Warbow** (forged, WB Lvl 3 — 11 dmg / 750ms / 12 stam / 380px)
that reforges into an **Embersteel Warbow** (WB Lvl 4 — 15 dmg / 730ms / 15 stam / 400px), plus a new
`arrows` ammo item (Sunsteel `1 ingot + 5 wood → 50`; Embersteel `1 embersteel_ingot + 5 wood → 50` —
same arrows, alt metal; both gated behind the Warbow via `requiresDiscovered`). **Entirely
data-driven — ZERO `MainScene.ts` changes** (the ranged pipeline reads all config from
`Weapons.ts`/`Items.ts`; adding `warbow` to `WeaponType` compiler-forced a row in every table); bow &
slingshot share the one `"ammo"` slot (loading arrows evicts pellets). New icons + `arrow_projectile`
in `BootScene`. **Ember material tweak (the user-directed, expanded live):** every ember-tier reforge
now carries its **precursor's secondary materials** (cragscale plate / duskrunner pelt / sandmaw
chitin / bones), upgrades any plain `wood` haft to **`ironbark`**, and adds **`hex_essence`** as the
ember-temper agent — chosen over `gloam_shard` specifically because gloam is relic currency (the user's
call: "add something not used for relic creation"). So ember gear reads as its Sunsteel/Duskhide base
plus the upgrade, not "base + ingot." `tsc` clean; verified live via `preview_start` +
`javascript_tool` (all textures/data; end-to-end fire = ammo 10→9 + projectile spawn + cooldown + an
11-dmg ranged hit HP 20→9; out-of-range / no-ammo / wrong-ammo all clean no-ops that don't consume;
icons render; no console errors). `RECIPES.md` synced; dashboard auto-populates (Items/Recipes tabs)
— its weapon-stats table stays melee-only as before (slingshot/javelin were never in it).
**Same-session follow-up fix:** the shared `"ammo"` slot is now **weapon-aware** — a new
`MainScene.reconcileAmmoSlot()` (called from `recomputeEquipped`) evicts any ammo that doesn't match
the equipped ranged weapon's `ammoItemKey` back to the backpack and auto-loads the correct ammo, so a
Warbow's slot only ever holds Arrows and the Slingshot's only Pellets (playtest: leftover pellets sat
"loaded" while a bow was equipped and couldn't fire, reading as the game loading the wrong ammo).
Switching bow↔slingshot now swaps ammo seamlessly; melee/Javelin are no-ops. Full entry
below.
Prior: **S7 — Weapon identity redesign**
(2026-07-15, Opus). Reworked the three melee weapon identities: **pierce (spear/pike) = lowest arc +
highest single-target + best crit; slash (knife/sword) = biggest arc + best crowd AOE; blunt
(club/warhammer) = medium arc + a NEW movement-slow/cripple debuff** (reuses `Enemy.applySlow` at the
`resolveWeaponHit` choke point, 0.6×/1.5s). Full entry below.
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

### PB18 — Backpack armor upgrade fix + reforge-returns-to-slot (2026-07-18, Opus)
Two bug fixes off the user's playtest. **(1) Right-click armor in the inventory did nothing.**
The InventoryMenu/HotbarUI right-click branch only handled `edible` / `weapon || tool` /
`placeable` — armor (`armorSlot`, not `weapon`/`tool`) fell through with no branch, so a
backpack armor piece could never open its Upgrade panel (weapons already worked via the
container path). Fixed by adding an armor branch (`armorSlot && !== "ammo"`) in both the
inventory and hotbar right-click handlers. The generic container-item upgrade plumbing was
renamed `weaponSlot`/`openWeaponUpgrade*`/`isWeaponUpgradeTarget`/`applyWeaponUpgrade` →
`gearSlot`/`openGearUpgrade*`/`isGearUpgradeTarget`/`applyGearUpgrade` so it reads honestly now
that it handles weapons/tools AND armor (equipped armor still upgrades via the paper-doll slot,
unchanged). `applyGearUpgrade` only reads `costs`+`resultTier`, so `WeaponUpgradeDef`/
`ArmorUpgradeDef` are interchangeable through it. **(2) Reforging gear now returns the result to
where the base piece was.** A single-craft recipe that outputs gear and consumes a base gear
piece living ONLY equipped or in the hotbar now deposits the reforged result back into that same
slot instead of the backpack (`reforgeReturnTarget`/`placeReforgeOutput` in `craftRecipe`;
`craft()` frees the consumed slot first, so no backpack room is needed). A backpack copy is
consumed first (craft's own priority), so the result stays in the backpack in that case —
unchanged. Equip case also recomputes cached set bonuses. Verified live (`javascript_tool`):
backpack armor right-click opens the menu bound to the piece + applies (tier 0→1); reforge with
base equipped → embersteel equipped, hotbar → same hotbar slot, backpack → stays backpack, hotbar
untouched. `tsc` clean, no console errors.

### PB17 — Boss tuning + Cinderwrought solo rework + silent placement (2026-07-16, Opus)
A small playtest batch off the user's badlands run ("felt really good" overall). Three items:
1. **Silent bench placement** — removed the `sfx.craft()` cue that fired on every object
   placement (`MainScene.attemptPlaceObject`, the user: "placing benches down doesn't need to make
   a noise"). Actual crafting of non-placeables still plays the craft cue; only placement is now
   silent.
2. **Duneshaper (the "2nd boss") tankier + staggers less** — HP **1250→2500** (≥2× — a real
   endurance fight) and poise **170→400** (scaled MORE than the HP bump so it staggers genuinely
   less often, not just over a longer fight — the user: "shouldn't stagger so fast").
3. **Cinderwrought rework — solo, tanky, unstaggerable, must-dash attacks** (the user: "emberwrought
   fight still feels awkward… the Gloom guy is a much more cohesive mini boss"). **Diagnosis:** the
   Sunken Forge spawned **two** Cinderwroughts (2v1) vs the Gloamwarden's clean solo fight, and both
   its attacks were stationary front-swings that could be walked out of. **Fix (locked with the user):**
   - **One** Cinderwrought per forge now (`armForge` spawns 1, was `[-70,70].forEach`). The 5 forges =
     5 mini-bosses (was 10).
   - **Way tankier:** HP **260→650**.
   - **Can't be staggered:** the entire poise/stagger machinery was removed from `Cinderwrought.ts`
     (poise field, poise bar, `updatePoiseRegen`, `enterStaggered`, the `staggered` state). It's a pure
     survive-and-DPS wall now. `isStaggered()` kept (always `false`) for MainScene's shared
     `staggerMultiplierFor` switch; `CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER` kept exported (inert = 1).
   - **Attacks force i-frames:** both the **Cinder Cone** (300px / ±44° fire, bypasses armor, 32→**44**)
     and the **Forge Hammer** (235px / ±70° physical, 40→**52**) now **re-aim at the player at execute**
     (lock at execute, track through the wind-up) with wide/long hitboxes — a slow-walking player (95px/s)
     can't sidestep or back-pedal out, so the only reliable dodge is a dash's i-frames (`applyDamageToPlayer`
     skips damage during `invulnerableUntil`, while `checkPlayerHit` still consumes the swing via
     `hasHitThisAttack`). Attack cooldown 1050→**850ms** (solo cadence, matches the Gloamwarden).
   - **Ember shards stay high** (the user: "gotta be worth it"): the single boss drops **5-8 Ember Shard +
     1 Refined Trophy (Uncommon T2)** (was 2-4 across two guards). `onCinderwroughtKilled` already works with
     a one-element `bosses` array (cracks the ore once the sole guard dies).

   `tsc` clean; verified live via `javascript_tool`: 5 forges × 1 boss, Cinderwrought HP 650 / no poise bar /
   `isStaggered()` false / loot 5-8 shards + trophy; Duneshaper HP 2500 / poiseMax 400; the Cinder Cone
   re-aims (telegraph started with the player to the RIGHT, player moved DOWN mid-wind-up → attack locked to
   90° and hit at the new position); Forge Hammer hits in-range/center (52 dmg) and correctly misses beyond
   range and behind the boss; no console errors. Dashboard Enemies tab updated (both bosses). No `RECIPES.md`
   change (enemy loot isn't tracked there). See [[survivor-rpg-biome-2-plan]].

### PB16 — Playtest batch: crit/Onslaught rework + 15 fixes (2026-07-15, Opus)
Off the user's lvl-14 playtest ("almost 1-3 shotting everything by steel+embersteel; 17→84, 196 hits —
crit feels bananas"). Root cause diagnosed live (not a math bug): **Onslaught (every-4th-hit +120%) was a
separate multiplier stacking multiplicatively with crit** (`~2.2× × ~2.2× ≈ 4.9×`), amplified further by
power tier. Fix locked with the user.

- **Combat math — additive conditional bonuses (`tryMeleeAttack`/`tryRangedAttack`, MainScene).** The
  "normal hit" = `base × (1 + weaponSkill% + relic damage%)` (the always-on additive bucket). Crit and
  Onslaught are now **conditional bonuses that ADD onto the normal hit** — `normalHit × (1 + onsBonus +
  critBonus) × stagger × resist` — never multiplied by each other. So crit-alone and onslaught-alone are
  unchanged, but the double-dip that produced the 149/196 spikes is gone (both together ≈ 80, not 149).
  Onslaught is now a **flat +100% (×2), no power-tier scaling** (Berserker's Mantle bonusPct 120→100).
  `applyCrit` split into `critChanceTotal`/`critMultTotal`/`rollCrit`/`critBonus` (one source of truth;
  the combatStats panel + weapon tooltip now read the same helpers). Onslaught proc → `onslaughtBonus()`
  (returns the flat fraction, still one roll per swing shared by the AOE-arc secondaries).
  **Verified live:** a real melee hit with a forced crit on the 4th (Onslaught) swing dealt **51.84**, the
  additive value — not the multiplicative 63.02. Onslaught cycle = `[0,0,0,1,0,0,0,1]`.
- **Badlands resistances normalized** (the user: "weak/resist numbers unclear; too much damage on top of
  weapon stuff"). Every weak → **×1.25**, every resist → **×0.5** (`Cragscale`/`Sandmaw`/`Hexling`/
  `Duneshaper` tables). **Cinderwrought lost ALL weakness** (fully neutral — a mini-boss weakness stacked
  too hard) + poise **45→60** (harder to stagger). **Duneshaper** dropped its physical weakness (now
  neutral) and gained **fire ×1.25** as its one standout weakness (burning it down is the intended
  counter; the magic-resist it initially kept was dropped in the same-session follow-up — see below).
  Floating damage numbers COLOR-code effectiveness with **no text label** (the user): neutral **white** /
  resisted **greyed-out** (dim) / weak **gold** / crit **hot-orange + "!"** (distinct from weak's gold),
  and are a touch bigger (14→16 / 20→22 crit).
- **Relic dominance (`compareInstances`, Relics.ts).** Was rarity-first (a Mythic always beat a Rare
  regardless of tier), so a newly-rolled **T2 Rare was auto-declined by an owned T1 Mythic**. Now returns
  **"ambiguous" → the Keep New / Keep Old prompt** whenever rarity and tier disagree (higher tier but
  lower rarity, or vice versa); strict dominance on both axes still auto-replaces/declines. Locked with
  the user ("not always want mythic over rare depending on tier").
- **Refined-Uncommon Rare roll rate 5%→12%** (uncommon outcome table's Rare band). the user's ask.
- **Sandmaw** (`Sandmaw.ts`) — signature **bleed** (4/s×5s) added to the erupt hit (returned from
  `checkPlayerHit` + threaded through `applyDamageToPlayer`'s existing bleed param), and a **faster erupt**
  (windup 560→470ms). No new vulnerability window (the user: "just bleed + faster").
- **Mini-boss bars** — new per-enemy `EnemyConfig.barScale` (default 1); Gloamwarden/Cinderwrought pass
  **2.4**, so their HP bar (22→52.8px) + poise bar sit big and overhead over the 1.7–1.8× sprite. The
  poise bar now anchors under the enlarged HP bar via the instance `barW`/`barOffsetY`/`barH`.
- **Proc counter HUD** (`src/ui/ProcBarUI.ts`, new) — mid-left (empty screen area; hints sit mid-right).
  Onslaught row = a pip counter filling 1..2..3.. then resetting on the proc (glows gold on the pre-proc
  hit); Guardian row = a shield bar that reads **BLOCK READY** (green) or **BLOCK N.Ns** with a cooldown
  sweep. Rows hide entirely unless the player owns that proc's relic. Fed each frame by
  `MainScene.procHudState()`.
- **Weapon tooltip crit totals** (Task 6) — the tooltip now shows **total crit chance + crit damage**
  (weapon base + Strength/Agility + relics, capped) alongside the per-weapon base, via a `critTotals`
  callback threaded through HotbarUI/InventoryMenu → Tooltip (sourced from MainScene's own crit helpers).
- **Ironshod axe art** — distinct tier-1 `icon_stone_axe_t1` texture (sunsteel head + gold ingot bands).
  `tieredStationTexture` generalized from workbench/smelter-only to **any item with a `${base}_t{tier}`
  texture**, so upgraded tools/weapons get their art in the hotbar, on the player, and in the backpack.
- **Ember reforge ingredients** — the Embersteel **Longsword/Pike** were the only reforges consuming just
  ingot+ironbark+hex; now also take a base creature-material (2 Sandmaw Chitin / 2 Cragscale Plate), like
  the armor/warhammer/warbow already did.
- **Craft/upgrade SFX** — new `Sfx.upgrade()` (a heftier metallic rise) fires on every station/armor/
  weapon upgrade; a `craft()` cue now also plays when a placeable is placed.
- **Menu text +1px** across every read-heavy panel (Crafting/Inventory/Character/RelicForge/Cooking/
  DryingRack/Chest/Upgrade/Pause/Tooltip/Welcome/Tips) — the user: "text everywhere too small, especially
  menus."
- **Bug fix** — opening the Character/level-up menu (K or the stat-points badge) now closes the Relic
  Forge menu first (and vice versa); it was rendering on top of an open forge menu.

`tsc` clean; RECIPES.md + dashboard Enemies tab synced. See [[survivor-rpg-relics]] +
[[survivor-rpg-stats-skills-relics-direction]].

**Same-session follow-up (3 more items from the user):**
- **Cinderwrought AI bugs** (`Cinderwrought.ts`). Three fixes + pack behavior: (1) **ranged aggro** —
  `takeHit` now sets `aggroed = true` (proximity was the ONLY aggro path, so ranged pokes were ignored);
  (2) **out-of-range / whiffing attacks** — `updateIdle` only begins a telegraph when
  `dist <= ATTACK_INIT_RANGE (192) + reachBonus()`; it was telegraphing the instant the cooldown was up
  regardless of distance, so it attacked/whiffed from up to `AGGRO_RADIUS` 260px while its attacks reach
  only 168–235; out of range now = keep approaching; (3) `checkPlayerHit` adds `reachBonus()` (~17px for
  the 1.8× sprite) to the cone/hammer range checks so a hit registers at the sprite's visual edge; (4)
  **pack behavior** — `packAggro = true` / `packAggroRadius = 320` + a `forceAggro()` override (flips the
  subclass's own `aggroed` field, since the base `forceAggro` drives the `state` machine it doesn't use),
  so hitting or aggroing one forge-guard wakes its mate (the pair spawns 140px apart) via
  `MainScene.updatePackAggro`. Verified live: hit-one-of-a-pair → both aggro; far player = idle/approach,
  near player = telegraph.
- **Duneshaper resist** (`Duneshaper.ts`). Dropped the magic resist ×0.5 — the user: fire is a subtype of
  magic AND the Ember Brand deals fire, so resisting magic while being fire-weak punished the ember/fire
  path it's meant to reward. Now its ONLY resist line is **fire ×1.25 (weak)**; everything else neutral.
- **Unified passive/proc HUD** (`src/ui/PassiveBarUI.ts`, new — REPLACES `RelicBarUI` + `ProcBarUI`, both
  deleted). the user wanted Dota-style passive/proc icons LEFT of the hotbar. One data-driven strip of
  hoverable square icons: one per owned relic (proc relics carry live state — **Onslaught** shows the
  1·2·3 count + a ready-glow on the pre-proc hit; **Guardian** shows a draining cooldown cover + a
  BLOCK-armed glow) + one per active **armor set-bonus** (Molten Bulwark / Emberblink, icon = the set's
  chest piece, hover = the bonus). Built each frame by `MainScene.passiveEntries()` (from
  `relics.groupedForDisplay()` + `activeSetIds`), synced from the update loop + `afterRelicChange`.
  Positioned off `hotbarUI.left`/`.bottom`, growing left + wrapping up. The timed food-buff bar
  (`BuffBarUI`, above HP) stays separate. Verified live: 5-icon strip (4 relics + Embersteel set),
  Onslaught count "3"+glow, Guardian 27px cooldown overlay, hover tooltips, no console errors.
