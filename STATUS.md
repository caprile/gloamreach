# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B3-P4a — Biome-3 Phase 4a:
Duskmire Bayou terrain, environment & material sources** (2026-07-22, Opus, roadmap
`.claude/plans/biome-3-and-new-systems-roadmap.md`). Phase 4 was **sliced into three sessions** by
the user: **4a = terrain + environment + sources (this)**, **4b = the melee enemy roster**, **4c =
POIs + the Miretyrant boss + the win-con swap**. The bayou is now a real walkable, harvestable third
biome, and every material that shipped **dormant** in Phases 2b/3 finally has a world source.
Locked this session: water **slows by depth, never blocks**; the bayou boss **will** become the new
win-con (4c); and **`poison` is a SUBTYPE OF MAGIC** — a new `IncomingDamageType` that bypasses flat
armor and takes the *same* heavy-armor magic mitigation (new `Weapons.isMagicFamily()`), while adding
its own identity: it ticks over time and **suppresses HP regen**. New `src/systems/Poison.ts`
**composes** `BleedManager` and exposes two modes — `apply()` (discrete stacking dose, for 4b's
creatures) and `sustain()` (continuous environmental source, refresh-don't-stack). New
`src/systems/Bayou.ts` palette + `bayouWaterAt()`; `WorldBiomes` gained **bayou at tier 3** (unlock
6500) and **demoted the content-less Dunes placeholder to tier 4** (10500, deep frontier);
`pickBayouPoint` mirrors `pickBadlandsPoint` with an `avoidDeepWater` option; `BadlandsZone` was split
into a shared **`ZoneShape`** so 14 new **miasma zones** (regen-suppressing + 3 dps poison — the
Phase-1 env hook's real payoff) reuse `zoneEdge`/`drawZoneFloor` verbatim. **443 nodes:** cypress/
mirestone/driftwood/shellrock (universal wood/stone), **Bog Ore** 46, **Moonsilver** 22, and **three
separate geodes** (9 each) that each drop one specific ability gem — one node per gem, honoring
Phase 2b's "gem source dictates build". New Swamp Moss + Water Lily flora (persistent, no recipes
yet). **Two real bugs caught in verification:** the water slow used a raw coverage cutoff instead of
*dominance* (edge water didn't slow; the badlands DRY RAVINE did), and the miasma stacked to the cap
(3 dps became 15 and killed an idle test player) — both fixed and re-verified. Palette also gained a
uniform **gloam wash** after it composited olive and read as "more green biome": now forest `#3f6a36`
/ badlands `#755f39` / bayou `#44454b` / dunes `#cab47e`. Verified live; `tsc` clean, zero console
errors. **Deliberately left out:** **Mirehide** (a *creature* hide — it lands with 4b's roster, not a
node), and the bayou is gated out of the enemy-respawn/nightfall top-up until 4b ships. No
`RECIPES.md`/dashboard change. See B3-P4a below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P3 — Biome-3 Phase 3: Bayou gear progression (reforge tier + gem augments)**
(2026-07-21, Opus) — gem augments (mix-and-match, consumed, max 2/instance) reusing the existing
per-instance `upgrades` field + `UpgradeMenu`, plus the Gloamsteel/Mirehide reforge tier, Workbench
Lvl 5, Gloamsteel Arrows and the lifelink Gloamdrinker. Authored dormant; **4a now sources its Bog
Ore + gems** (Mirehide still pending 4b). See B3-P3 below.
Prior: **B3-P2b — Biome-3 Phase 2b:
Jewelry-effect pipeline + Gemwright's Table (jewelry station)** (2026-07-21, Opus, plan
`.claude/plans/biome-3-phase-2b-jewelry-station.md`). Makes 2a's abilities obtainable + lays the jewelry
economy. **Built live (biome-agnostic):** `src/systems/EquipmentEffects.ts` — the first mechanical
stat/effect path for equipped non-armor items (rings/amulet), summed on every equip. DELIBERATELY a
different layer from relics (relics = raw-% combat stats): jewelry is **ability-augment** (−ability
cooldown / +ability power — scales blink distance + nova dmg/radius) + **utility/explorer** (+magnet
radius / +bonus-gather chance / +light radius), wired into the ability-cast + magnet/gather/light hooks,
NOT the relic combat hooks. `ItemDef.passive` holds the data; `describePassive` feeds the Tooltip +
menu. Rings now fill **either** ring slot (wear two). **New dedicated station** — the placeable
**Gemwright's Table** (`src/systems/Jewelry.ts` + `src/ui/JewelryMenu.ts`, a near-clone of the
Campfire+Cooking pattern): its own recipe-list menu, tier-gated by the station's own upgrades —
**tier 0 = 4 passive rings/amulets; tier 1 = the 3 ability specials**, unlocked by a **Gloamheart
Setting** upgrade gated on a NEW **Duneshaper's Heart** boss drop (mirrors Gremlin King's Heart →
Smelter Ember Crucible). **DORMANT / biome-3:** the 4 new materials (Moonsilver + Gloam/Ember/Blood
gems), all jewelry recipes, and the heart are authored now but have **no in-game source yet** — Moonsilver
mining, gem drops, and the Duneshaper demotion (its kill currently ends the run, so the heart is
unreachable) all land in the biome-3 content phases (3/4); test via `__dev.give`. Verified live
(`javascript_tool`): two-ring resolution + all 5 effect channels exact; ability cooldown −15% on the real
cast path (5100/6000ms) + HUD sweep match; station tier-gating + tier-0 craft + the heart-gated upgrade
(0→1, Workbench-proximity-gated per the standing rule, heart consumed, ability recipes unlock) + menu
render; `tsc` clean, zero console errors. `RECIPES.md` updated (dashboard picks recipes up live). See
B3-P2b below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P2a — Biome-3 Phase 2a:
Activated abilities + Dota QER HUD** (2026-07-21, Opus, plan
`.claude/plans/biome-3-and-new-systems-roadmap.md`). The Q/E/R **cooldown-only, equipment-granted**
active-ability framework. An item in a special slot grants one active (`special1→Q`, `special2→E`,
`back→R`, via `Abilities.SLOT_ABILITY_KEY`); `AbilityDef` is pure data (new `src/systems/Abilities.ts`,
mirrors the relic-def pattern), effect logic lives in MainScene's `castAbility` dispatcher.
**3 starter abilities:** **Gloamstep Blink** (Q — 220px teleport toward aim + 250ms i-frames, 6s CD),
**Gloam Nova** (E — 150px radial magic burst, 30 dmg + 64px shove + brief slow, 10s CD), **Bloodpact**
(R — a 6s timed **lifelink**: strikes heal 35% of damage dealt via the `resolveWeaponHit` tail, 24s CD;
locked as lifelink, NOT heal-over-time — the user). New **`src/ui/AbilityBarUI.ts`** — a Dota-style fixed
Q/E/R bar right of the hotbar (the passive bar owns the left): empty slots show a dim frame + key letter,
filled slots the ability icon + top-down cooldown sweep + numeric seconds + active-window glow (Bloodpact)
+ hover tooltip; depth clears WORLD_H. **Sourcing is deliberately dev-only for now** (new `__dev.give(key)`)
— real sources (epic loot, biome-3 craftables, the post-boss reward picker) are Phase 2b / Phase 5, a
locked call from the user (avoids pre-committing loot tables the later phases should own). Equip reuses the
generic `armorSlot` path (zero new equip code); `recomputeAbilities()` runs from `afterItemMove`; **R is
context-sensitive** (take-all when a chest is open, else cast). Deferred to 2b: gems/jewelry material
class, epic-loot pool, ring/amulet passive stat aggregation, the 4th (T) slot. `tsc` clean; verified live
(`javascript_tool`): equip→map, all 3 casts (blink 220px + i-frame + cooldown-gate, nova 20 dmg
magic-resist-aware + 64px shove, bloodpact heal 35%), empty-slot no-op, run-over/menu guards, and the bar
renders (icons / cooldown-numeric / active-glow) with no console errors. No `RECIPES.md`/dashboard change
(dev-only items, no recipes). See B3-P2a below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P1 / B3-P1a — Biome-3 Phase 1: Terrain-that-matters + badlands macro-zones** (2026-07-21,
Opus). ~10 large themed sub-zones (`badlandsZones`/`subZoneAt`): boulderfields (solid grey rock in the
`solids` group — player collides, enemies roll through via `Enemy.collidesWithTerrain`) + thornfields
(0.6× player slow + rich foraging), each with a bold ground decal + themed enemies; wild content avoids
zone cores. Generic `environmentEffectAt → {moveMult, blockRegen}` env-zone hook (slow live, no-regen
DORMANT for the biome-3 miasma). See B3-P1 / B3-P1a below.
Prior: **PB18 — Backpack armor upgrade fix + reforge-returns-to-slot** (2026-07-18, Opus): right-clicking
armor opens its Upgrade panel (generic `gearSlot`/`openGearUpgrade`/`applyGearUpgrade`); reforging an
equipped/hotbar base piece returns the result to that slot. See PB18 below.
Prior milestones (newest first; full writeups in Recent Entries below or STATUS-archive.md): **PB17**
(boss tuning + Cinderwrought solo rework + silent placement), **PB16** (crit/Onslaught additive rework
+ 15 fixes), and the 2026-07-15 8-session playtest plan (**S1–S8**: HUD/UX, onboarding, relic economy +
single-family redesign, weapon-identity redesign, biome-2 Warbow) — all shipped. Earlier: the entire
**biome-2 (Sunscorch Badlands) umbrella (Phases 0–5)** — patchwork worldgen, the combat-systems layer,
the 4-enemy roster (Duskrunner/Cragscale/Hexling/Sandmaw), the Duneshaper win-boss + Sunken Forge /
Duskrunner Warren POIs, the smelting/forging gear tier (Sunsteel/Duskhide + Embersteel/Emberhide +
Ember Brand), and the relic rework (family-loadout + tier-2 relics + Ember Shard). Full detail in
STATUS-archive.md + the milestone plans.

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. The world is now circular + much larger (M-W1 geometry prep, above); deterministic
seeded world-gen and actual multi-biome content are still deferred to M-W1 proper.

**In progress / next.** The **biome-2 (Sunscorch Badlands) umbrella is COMPLETE** (all 6 phases 0–5 —
patchwork worldgen through the relic rework; the badlands is a fully populated second biome with a
4-enemy roster, POIs, the Duneshaper win-boss, and the smelting/forging gear + tier-2 relic tiers). The
current arc is the **biome-3 (haunted bayou, working name "Duskmire Bayou") + new-systems roadmap**
(`.claude/plans/biome-3-and-new-systems-roadmap.md`, 5 phases). **Shipped so far:** **Phase 1**
(terrain-that-matters + badlands macro-zones), **Phase 2a** (the activated-ability framework + Dota
QER HUD), **Phase 2b** (the jewelry-effect pipeline + the Gemwright's Table), **Phase 3** (the bayou
gear progression — gem augments + the Gloamsteel/Mirehide reforge tier), and now **Phase 4a** (the
bayou's terrain, environment and material sources — above). **Phase 4 is sliced into three sessions;
4a is done.** **Next: Phase 4b — the bayou's melee-core roster** (Mirejaw / Blighttoad / Mosswretch /
Murkling / Fenlurker + the one ranged Corpselight haunt, per the roadmap), which is also where
**Mirehide** gets its source and where the bayou re-enters the enemy-respawn top-up. **Then Phase 4c**
(1-2 bayou POIs + the **Miretyrant** melee boss-with-adds, which **becomes the new win-con** — locked
this session — demoting the Duneshaper to a mid-boss and finally making its **Heart** obtainable, which
unlocks the Gemwright's ability recipes). **Then Phase 5** (post-big-boss RNG reward choice).
Ability/jewelry numbers and everything biome-3 are first-pass/tunable. The master-plan tail
**M-TE** (trophy-gated gear) is folded into the shipped biome-2 work; real pixel art/animations stay
deliberately deferred until content/balance settle (roadmap item 8).

**Dev tooling (2026-07-13, Sonnet):** `window.__dev` browser-console commands for playtesting without a
full playthrough — `god()` (still takes damage/knockback/shows real damage numbers, just floors HP at 1
and never dies), `heal()`, `nobuildcost()`, `setstat(name|"all", value)`, `spawn(name, elite?)`,
`give(key, count?)` (drop any item into the backpack — B3-P2a, the way to obtain the ability specials),
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

### B3-P4a — Biome-3 Phase 4a: Duskmire Bayou terrain, environment & material sources (2026-07-22, Opus)

Phase 4 of the biome-3 roadmap (`.claude/plans/biome-3-and-new-systems-roadmap.md`), **sliced into
three sessions** at the user's direction (`AskUserQuestion`): **4a = terrain + environment + sources
(this)**, 4b = the melee enemy roster, 4c = POIs + the Miretyrant boss + the win-con swap. The bayou
is now a real, walkable, harvestable third biome — and every material that shipped **dormant** in
Phases 2b/3 finally has a world source.

**Locked this session (the user):** water **slows by depth, never blocks**; the bayou boss **will**
become the new win-con (4c); and — the notable one — **`poison` is a SUBTYPE OF MAGIC**.

**Poison damage type.** `IncomingDamageType` gained `"poison"` alongside `fire`. Per the user's call it
is mechanically a magic subtype, so a new `Weapons.isMagicFamily()` is the helper anything asking "is
this magic?" for MITIGATION must use — poison bypasses flat armor and is reduced by the *same*
heavy-armor magic mitigation + Gloamweave Lining channel as a Hexling bolt. Its own identity on top:
it ticks over time and **suppresses HP regen while active**. New `src/systems/Poison.ts`
(`PoisonManager`) **composes** `BleedManager` rather than duplicating its stack/tick math, and exposes
**two application modes** — `apply()` for a discrete stacking dose (creature bites, 4b) and
`sustain()` for a continuous environmental source (refresh-don't-stack, safe to call every frame).
`currentEnvBlockRegen` now ORs in `poison.isPoisoned()`, so poison gates food-buff healing and
Comfort exactly like a no-regen zone. Green damage numbers; a new `poisoned` tutorial hint.

**`src/systems/Bayou.ts`** — palette + `bayouWaterAt()`, same shape as `Badlands.ts`/`Dunes.ts`. The
shared feature Biome is reinterpreted a third way (forestWeight → cypress hammocks, grassy → open
muck, creekWeight → deep gloam channels). The water thresholds drive **both** the color and the
movement penalty, so what looks like deep water always is.

**`WorldBiomes` registration.** `BiomeId` gained `"bayou"` at **tier 3** (unlock radius 6500); the
content-less **Dunes placeholder was demoted to tier 4** (unlock 10500, the deep frontier) — where it
always belonged, since it exists only to make the patchwork read as varied. `BIOME_NAMES` →
"Duskmire Bayou"; ground, minimap, world map, HUD label and the first-entry discovery toast all
followed automatically.

**Sampler + environment.** `pickBayouPoint` mirrors `pickBadlandsPoint` (dominance-gated, honors every
POI exclusion) plus an `avoidDeepWater` option so solid/mineable things never sit out in the heavy
slow. `BadlandsZone` was split into a shared **`ZoneShape`** so the new `BayouZone` reuses `zoneEdge`
and `drawZoneFloor` verbatim; 14 **miasma zones** (regen-suppressing + 3 dps poison) are the Phase-1
environment hook's real payoff, each with a decal + fume props so the hazard is legible from outside.

**Content (443 nodes).** Cypress/Mirestone/Driftwood/Shellrock supply the universal `wood`/`stone`
keys (the "every biome supplies the basics" rule); **Bog Ore** (46) feeds the reforge tier;
**Moonsilver** (22) the jewelry metal; and **three separate geodes** (9 each) each drop one specific
ability gem — one node type per gem, honoring Phase 2b's locked "gem source dictates build" rather
than one geode rolling randomly. Flora: **Swamp Moss** + **Water Lily** (new `ResourceType`s, no
recipes yet — future ingredients like Emberbloom/Sunfruit), persistent on the Blackberry regrow path;
lilies deliberately DO generate in deep water (wading for them is the point).

**Two real bugs caught in verification, both fixed:**
1. **Water slow used a raw coverage cutoff (0.5)** while content placement and the HUD label use
   *dominance* — so water at the bayou's edge visibly rendered but didn't slow, and the badlands' DRY
   RAVINE slowed wherever a bayou blob merely overlapped (8/300 samples). Now gated on
   `dominantBiomeAt`, the one rule that makes "am I in the swamp?" mean the same thing everywhere.
2. **The miasma stacked to the cap.** Re-applying every frame through the stacking `apply()` path
   multiplied 3 dps into 15 and killed a full-HP idle test player in ~7s. That's what motivated
   `sustain()`. Re-verified: 3 dps sustained = exactly 3 damage/sec.

Also tuned: the shallow-water band was widened (0.30/0.62 → 0.22/0.70) after measuring ~80% of bayou
water as deep, and a uniform **gloam wash** was added to the palette — the biome composited to an
olive `#525b41` and read as "more green biome" next to the forest. Measured after: forest `#3f6a36`,
badlands `#755f39`, bayou `#44454b` (cold violet-slate), dunes `#cab47e` — four distinct reads.

**Verified live** (`javascript_tool`): the ceiling curve's unlock radii; biome dominance across the
whole radial sweep (forest-only inside 2000 → badlands → bayou dominant 6000-10000 → dunes 10000+);
all 443 nodes in-band with **0 in the wrong biome and 0 in the forest disc**; water multipliers
(dry 1 / shallow 0.78 / deep 0.5) and **0/400 badlands dry-ravine false positives**; miasma env
(`blockRegen` + 3 poisonDps) and the real update loop draining **22 HP over 7.53s (expected 22.6)**;
poison vs magic under a full heavy set (physical 40→8, magic 40→32, **poison 40→32 — identical**,
confirming the subtype contract); poison sustained/lapse/discrete-stacking math; and every node type
depleted to its correct loose drop (all 3 gems, bog ore, moonsilver, stone, wood) plus the
persistent-flora texture swap. `tsc` clean, zero console errors. Screenshot confirms the discovery
toast, minimap label, violet ground and miasma field.

**Left out of 4a, deliberately:** **Mirehide** has no source yet — it's a *creature* hide, so a node
source would be dishonest; it lands with the 4b roster. The bayou is also gated out of the
enemy-respawn/nightfall top-up (`makeRespawnEnemy` returns null for it) so it doesn't spawn forest
boars in a swamp before 4b ships. No `RECIPES.md`/dashboard change (no new recipes).

### B3-P3 — Biome-3 Phase 3: Bayou gear progression (reforge tier + gem augments) (2026-07-21, Opus)

Plan: `.claude/plans/biome-3-phase-3-bayou-gear.md`. Two locked calls from the user (`AskUserQuestion`):
gem augments are **mix-and-match and CONSUMED** (not removable sockets, not a linear ladder), and biome 3
**does** add one reforge tier on top of them.

**A. Gem augments — `src/systems/GearAugments.ts` (new).** `GearAugmentDef` mirrors `StationUpgradeDef`'s
shape (so the existing `UpgradeMenu` serves it unchanged) plus an `augment: true` discriminator and an
`AugmentEffect` payload. **No new per-instance data model:** applied ids reuse `ItemStack.upgrades` for
gear in a container and a new `EquippedItem.upgrades` for a worn piece — and an augment never touches the
item's `tier`, so the Lvl 2/3 right-click ladder and up to **2 augments** compose on the same piece.
Deliberately its own effect layer (relics = raw-% combat stats, jewelry = ability/explorer utility), so
augments stay gear-flavored: **Gloam Edge** +3 dmg, **Serrated Fang** +6% crit chance, **Cruel Weight**
+0.30x crit dmg, **Widened Sweep** +30% arc reach, **Swift Grip** −12% stamina (weapons); **Warded
Plating** +2 armor, **Stoneheart Core** +3 armor, **Gloamweave Lining** −10% magic/fire, **Fleetfoot
Stitching** +4% move (armor). Fit the **Ember + new Gloam tiers only** (gems are a late-game sink, not a
way to keep a Wood Club alive) and gate on a **Workbench Lvl 4**. Every effect hooks the single existing
chokepoint — a new `equippedWeaponBaseDamage()` (which also collapsed three copies of the
`weaponDamage + weaponTierDamageBonus` expression), `critChanceTotal`/`critMultTotal`, the melee arc's
range, `effectiveStaminaCostMult`, `ArmorUpgrades.totalPlayerDefense`, `applyDamageToPlayer`'s
armor-bypass branch (summed with heavy-armor skill mitigation, capped 75%), and the `moveMult` bucket.
`UpgradeMenu` gained an `appliedAugmentIds` dep: augment rows run the no-ladder model even while a tier
ladder is listed above them, with a `Gem augments: N/2` header and a "Gem slots full" block at the cap.
The item Tooltip lists a specific instance's gems.

**B. The bayou reforge tier (dormant — sourced in Phase 4).** New materials **Bog Ore** → **Gloamsteel
Ingot** (Smelter + Hex Essence, needs the tier-1 Ember Crucible) and **Mirehide**; new Workbench **Lvl 5**
upgrade **Gloamforge Anvil**. 11 recipes at `requiresWorkbenchTier: 4`, each **consuming its Ember
counterpart** (roadmap locked decision 6 — no fresh base sets): **Gloamsteel** heavy set (13/16/13 = 42)
+ **Mirehide** light set (9/12/9 = 30) + Gloamsteel Warhammer/Longsword/Pike/Warbow and the **Gloam
Brand** (30/25/32/20/23), all holding the S7 identity invariants. Both sets get the existing two
right-click levels (sunk in Gloamsteel) and their own set bonuses — **Gloam Bulwark** / **Mireblink**,
deliberately the *same two mechanics* as the Ember sets turned up (22% DR + 15 thorns; 1.9x dash +
120px/26 dmg nova); MainScene picks the stronger rather than stacking. New **Bayou** inventory tab
(`ItemBiome`) covering this tier and 2b's jewelry economy.

**Verified live** (`javascript_tool`): all 15 new textures generate; augment apply **blocked** without a
Lvl-5 bench ("Requires nearby Workbench Lvl 4") and applies with one, exact costs deducted, a **third
augment refused at the cap**; equipped weapon 30→33 dmg and crit 6%→12%; Swift Grip stamina mult 0.88;
**Widened Sweep proven functionally** (a secondary enemy at 62px is OUT of the warhammer's 54px sweep and
IN at +30%); armor 42→47 with two augments; a magic hit 60→48 with two Linings while physical stays
60−30 armor = 30; `moveMult` 1→1.08 arriving at `Player.update` with dash 1.9 from the Mirehide set; all
11 recipes gate at bench tier 4 (craft refused without, succeeds with, base piece consumed); Bog Ore
smelts only at Smelter tier 1; equip→unequip round-trips both `tier` and `upgrades`. `tsc` clean, zero
console errors. `RECIPES.md` + the dashboard (new Gem-augments table) updated.

**Same-session follow-up pass (the user's feedback).** (1) **Crafting menu was too short** — its fixed
440px height was authored when the Armor/Weapons tabs held a handful of recipes; the forged + bayou tiers
ran the list straight out the bottom. It now **sizes itself** to the space between its top margin and the
bottom HUD, and the recipe list is a **windowed scrollable viewport** (own wheel handler + ▲/▼ hints, only
in-view rows created — `CookingMenu`'s pattern). At 1080p: 670 tall, full 24-row Armor tab fits with no
scroll. (2) **Gem-slot visibility** — the Tooltip now shows `Gem augments: N/2` for *any* augmentable
piece (filled or empty, so empty no longer reads like "takes no gems") plus the applied ones, and every
slot icon (backpack / hotbar / paper-doll) draws **diamond pips** at its bottom-left, violet for used and
hollow for free. (3) **This biome's arrows** — **Gloamsteel Arrows** (1 Gloamsteel Ingot + 5 Wood → 60);
unlike the Sunsteel/Embersteel pair (which both make the same plain `arrows`), these are their own ammo
item and the **Gloamsteel Warbow fires only them**. (4) **A bespoke bayou magic weapon — the
Gloamdrinker** (not a reforge of anything): the only weapon with **lifelink**, a new data-driven
`Weapons.WEAPON_LIFELINK_PCT` healing **12% of damage dealt** on every hit (arc-swept targets included) at
the same `resolveWeaponHit` choke point Bloodpact uses — always on, no relic family slot, stacks with
Leech/Bloodpact, paid for with 19 dmg (below the Gloam Brand's 23) and a tighter arc. Verified live:
panel 670 tall / 0 overflowing rows / detail column bottoms at 722 vs 890, scroll path exercised by
shrinking the panel; pips + tooltip exact (`0/2`, `2/2` + names, nothing on a Stone Club); Gloamdrinker
19 dmg → heal 2 vs Gloam Brand 23 → heal 0; the bow refuses to fire with no ammo AND with plain arrows,
fires + decrements 10→9 with Gloamsteel Arrows. Zero console errors.

**Not built (deliberate):** no world source for Bog Ore/Mirehide/gems — that lands in Phase 4 with the
bayou itself (same authored-dormant pattern as 2b; test via `__dev.give`).

### B3-P2b — Biome-3 Phase 2b: Jewelry-effect pipeline + Gemwright's Table (2026-07-21, Opus)

Makes 2a's abilities obtainable and lays the jewelry/gems economy. Plan:
`.claude/plans/biome-3-phase-2b-jewelry-station.md`. the user's scope corrections mid-planning: gems +
jewelry crafting are **biome-3+ content** (gems not findable before biome 3; no badlands node); the
station is a **dedicated new station with a Duneshaper-boss-drop-gated upgrade** (the Gremlin King's
Heart → Smelter pattern); and passive jewelry must feel **distinct from relics** (which own raw-% combat
stats) — so it's the **ability-augment + utility/explorer** layer. Since biome 3 has no world content
yet, this session built the biome-agnostic systems **live** and authored the materials/recipes/heart as
**dormant** biome-3 data (test via `__dev.give`).

**Built live (biome-agnostic):**
- **`src/systems/EquipmentEffects.ts` (new)** — the first mechanical effect path for equipped non-armor
  items (`ItemDef.stats` was display-only). `ItemDef.passive?: EquipPassive` holds the data; the class
  sums equipped pieces (recomputed in `afterItemMove`, reset in `create`) and exposes getters modeled on
  the relic summer. **Distinct channels (never relic-overlapping):** `abilityCooldownPct` (clamped ≥0.4),
  `abilityPowerPct`, `magnetRadiusPct`, `gatherBonusPct`, `lightRadiusPct`. `describePassive()` feeds
  the Tooltip, the JewelryMenu row, AND the HUD passive strip so display can't drift. Equipped jewelry
  shows on the shared **`PassiveBarUI`** (left of the hotbar, alongside relic passives + armor
  set-bonuses) — one always-on icon per equipped ring/amulet, gloam-violet border + hover tooltip.
- **Hook sites (bespoke, one edit each):** cooldown → `tryCastAbility` + `abilityEntries` (HUD sweep
  matches); power → `castBlink` distance + `castNova` dmg/radius; magnet → `MAGNET_RADIUS` gate; gather →
  the depleted-node bonus-drop roll (alongside the M-SS chopping/mining chance); light → the player term
  in `collectLights`. No `syncStatBonuses`/damage/crit change — that stays relics' turf.
- **Ring-slot resolution** in `equipArmorFromContainer`: a ring (`armorSlot:"ring1"`) fills the first
  empty of ring1/ring2, so two rings can be worn.
- **4 passive pieces:** Ring of Quickening (−15% ability CD), Amulet of Channeling (+20% ability power),
  Ring of the Forager (+15% gather, +30% magnet), Amulet of Farsight (+40% light, +20% magnet).

**New dedicated jewelry station (built now, dormant recipes):**
- **Gemwright's Table** — a placeable station (`Items.ts` def + `Recipes.ts` craft recipe, tier-1 /
  Workbench-gated, costs Moonsilver) with its own recipe-list menu **`src/ui/JewelryMenu.ts` (new)** +
  table **`src/systems/Jewelry.ts` (new)**, a near-clone of the Campfire+Cooking pattern (`craftAtJewelry`
  / `maxJewelryBatches` / open/close mirror the campfire methods; hover/prompt/interact added to the
  shared placed-station loop). Tier gates the recipes: **tier 0 = the 4 passives; tier 1 = the 3 ability
  specials** (the existing 2a `special_*`/`back_*` items — 2b only adds their recipes).
- **`Gloamheart Setting`** station upgrade (`StationUpgrades.ts`, resultTier 1) unlocks the tier-1
  recipes, gated on a NEW **`duneshaper_heart`** guaranteed drop (`Duneshaper.ts` loot + `Items.ts` def +
  BootScene icon) — mirroring `gremlin_king_heart` → Ember Crucible. Reuses the generic right-click
  Upgrade/Pick-up ContextMenu + `applyStationUpgrade` verbatim (no new upgrade wiring).

**Dormant / biome-3 (no in-game source this session):** 4 new materials (`moonsilver` +
`gem_gloam`/`gem_ember`/`gem_blood`, `ResourceType` + `Items.ts` + BootScene icons via the `relicGem`
helper), all jewelry recipes, and the heart. **Deferred to Phases 3/4:** Moonsilver mining, gem drops
from bayou enemies/bosses, the epic-loot chest pool, and wiring the Duneshaper kill to continue-the-run
(its demotion) so the heart is legitimately obtainable.

**Verified live** (`javascript_tool` against `MainScene`; loop hand-stepped to boot the backgrounded
preview): baseline effects neutral → equip 2 rings + amulet → **two-ring resolution** (ring1+ring2) and
all 5 channels exact (0.85 CD / 1.2 power / 1.3 magnet / 0.15 gather / 1.4 light); equip a Q special +
Ring of Quickening → real cast sets a **5100ms** cooldown (vs 6000 unringed) and the HUD `cooldownMs`
reads 5100; station **tier 0** shows only the 4 passives, **tier 1** adds the 3 abilities, a tier-1
craft at tier 0 is a **no-op**, a tier-0 passive craft lands in the bag; the **Gloamheart Setting
upgrade** (with a Workbench nearby per the standing tier-≥1 rule) bumps the placed table 0→1, consumes
the Duneshaper's Heart, and unlocks the ability recipes; the menu opens/renders/closes cleanly. `tsc`
clean; **zero console errors**. `RECIPES.md` updated (station recipe + upgrade + a new Jewelry section);
dashboard reads recipes live.

### B3-P2a — Biome-3 Phase 2a: Activated abilities + Dota QER HUD (2026-07-21, Opus)
Plan: `.claude/plans/biome-3-and-new-systems-roadmap.md` (Phase 2, split 2a/2b — this is 2a). The
**cooldown-only, equipment-granted** activated-ability framework, built as the reusable system that
Phase 2b's gems/epic-loot and Phase 5's post-boss picker will feed. Locked with the user via
`AskUserQuestion`: **2a only** this session; abilities should come from **epic loot / biome-3
craftables / boss "special" drops — NOT easy early craftables**, so 2a ships the framework + HUD + how
gear plugs in and is **granted dev-only for now** (his call — building a real source now would force the
epic-loot or picker prematurely); **R = Bloodpact lifelink, NOT heal-over-time** (HoT stays a food-buff
thing).

- **`src/systems/Abilities.ts`** (new, pure data, mirrors the relic-def pattern): `AbilityDef {id,
  name, description, cooldownMs, activeMs?, icon}` + `ABILITY_DEFS` for the 3 starters +
  `SLOT_ABILITY_KEY` (`special1→q`, `special2→e`, `back→r`). Effect logic lives in MainScene's
  `castAbility()` dispatcher (like relic uniques) — an `AbilityDef` never reaches into the scene.
- **3 starter abilities:** **Gloamstep Blink** (Q) — teleport 220px toward the aim point (mouse world
  point, else facing) + a 250ms i-frame window (reuses `invulnerableUntil` + `clampPlayerToWorld`), 6s
  CD. **Gloam Nova** (E) — 150px radial `magic` burst, 30 dmg (resist-aware, new `dealAbilityDamage`
  mirroring `dealSetBonusDamage`) + a 64px outward shove + 500ms slow per enemy (no per-enemy stun state
  exists, so the pop-back + slow IS the knockback), reuses the `emberblinkBurst` snapshot-loop + flash
  idiom, 10s CD. **Bloodpact** (R) — opens a 6s **lifelink** window; `resolveWeaponHit` heals 35% of
  each hit's damage while `time.now < bloodpactUntil` (parallel to the Leech relic), 24s CD.
- **`src/ui/AbilityBarUI.ts`** (new) — a Dota-style fixed Q/E/R bar anchored right of the hotbar (the
  passive bar owns the left). Fixed 3-slot set (built once, updated per frame — no structural rebuild):
  empty = dim frame + key letter; equipped = ability icon + a top-down cooldown sweep + centered numeric
  seconds; Bloodpact's active window shows a crimson glow instead of the sweep; hover tooltip
  (name/desc/cooldown/state). Flat `scrollFactor(0)` objects, depth 2836-2839 / tip 2955 (clears
  WORLD_H). T reserved (not rendered).
- **Wiring (`MainScene.ts`):** `grantsAbility?: AbilityId` on `ItemDef`; 3 dev-only special items
  (`special_gloamstep_band`/`special_gloam_focus`/`back_bloodpact_shroud`, `special1`/`special2`/`back`
  slots) that equip via the existing generic `armorSlot` path — **zero new equip code**.
  `recomputeAbilities()` scans the 3 slots → `abilityByKey {q,e,r}`, called from `afterItemMove()` +
  reset in `create()` (with `abilityReadyAt`/`bloodpactUntil`, the `scene.restart()` gotcha). Input:
  `keydown-Q/E/R` → `tryCastAbility` (guards run-over/pause/dead/any-menu/cooldown); **R is
  context-sensitive** — take-all when a chest is open, else cast (no relearn). New `__dev.give(key,
  count?)` to obtain the specials; 3 gloam-violet ability icons in `BootScene` (shared by item + bar);
  KeybindsUI gains the Q/E/R + updated take-all lines.
- **Same-session UI polish (the user playtest):** the ability-bar key letters were too small to read
  (an empty slot's "E" looked like "F"). Fixed by enlarging them and **moving them into a chip
  centered BELOW each slot** (own `LABEL_H` band, the whole bar still bottom-aligns to the hotbar) so
  they're off the slot face entirely and never overlap the cooldown numeric/sweep. The Inventory
  equipment paper-doll also shows a large **Q/E/R badge** on the `special1`/`special2`/`back` slots
  (shown even when empty) so it's clear which slot feeds which key when choosing a special to equip.
- **Deferred to 2b / Phase 5:** gems/jewelry material class, the game-wide epic-loot pool, ring/amulet
  passive stat aggregation, the 4th (T) slot, and every *real* ability source.
- **Verified live** (`preview_start` + `javascript_tool`): equip → `abilityByKey` maps Q/E/R correctly;
  Blink moved exactly 220px + i-frame active + second cast blocked by cooldown; Nova dealt 20 (magic,
  resist-default-1) + 64px shove + cooldown; Bloodpact healed exactly 7 on a 20-dmg hit (35%);
  empty-slot cast is a safe no-op; run-over/menu guards block casting; the bar renders (Q "6"s cooldown
  overlay, R active-glow) with icons visible and **no console errors**; `tsc --noEmit` clean. No
  `RECIPES.md`/dashboard change (dev-only items, no recipes).

### B3-P1a — Enemy terrain-collision gate + roll-through (2026-07-21, Opus)
Follow-up to B3-P1 off the user's playtest: the "spinny guys" (Cragscale rolling charge) got
**wedged on boulderfield rocks**. B3-P1 added real solids to the `solids` group (rocks) for the
first time since trees/boulders were made non-solid back in July, so the pre-existing
`enemyGroup ↔ solids` collider (`MainScene.ts`) started blocking every enemy — and a
straight-line chaser wedges (the exact zigzag-avoidance problem that got obstacles made
non-solid originally; see [[feedback_enemy_obstacle_avoidance]] / [[feedback_boar_zigzag_movement]]).
**Fix:** a new per-enemy `Enemy.collidesWithTerrain` flag (default **false**) gates that collider
via a `processCallback` — every current enemy now **rolls freely through rocks; the player still
collides** (its own `player ↔ solids` collider is unchanged, no callback). The callback resolves the
Enemy by `instanceof` on both args (group-vs-static-group arg order isn't guaranteed). **This is
also the future hook:** a terrain-blocked enemy just sets the flag `true` (verified: the gate then
returns `true` → Arcade separates it). **Confirmed no change needed for the other ask** — enemies
were never slowed by thornfield terrain: `BRAMBLE_SLOW_MULT`/`environmentEffectAt` is read only for
the *player* (`Player.update` `envMult`); enemy speed uses `envSpeedMult` (day/night × relic slow),
which is terrain-independent. `tsc` clean; verified live (`javascript_tool`): all 602 enemies default
`collidesWithTerrain:false`; the enemy↔solids collider's process callback returns `false` for a
default Cragscale (both arg orders) and `true` once the flag is flipped; the player↔solids collider
has no callback; no console errors. **Deferred (needs a real consumer — Opus session):** the actual
stuck-response AI for a future terrain-blocked enemy — recommended default is to keep most enemies
roll-through and reserve blocking for a specific heavy archetype with a light slide-along-contact
nudge, only building the full near-tangent wall-follow heuristic if a genuine maze-navigation enemy
is ever designed (the deleted heuristic worked but read as "trash" zigzag — don't re-derive it
blindly). No `RECIPES.md`/dashboard change.
