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
errors. **SAME-SESSION REDIRECT (the user):** the **most precious materials moved off the
surface** — the 3 ability geodes + Moonsilver are now **dungeon-only loot** (a Valheim
burial-chamber/sunken-crypt mechanic, added to the arc as its own phase); **Bog Ore stays
surface-mineable** so the reforge tier is still reachable by exploring. Their textures/node shapes
are KEPT for the dungeon phase to re-site; the gems + moonsilver are dormant again meanwhile. To
keep the surface characterful, `BayouZone` widened to **three themed macro-zones** (6 each):
**miasma** (poison + halved regen), **bonemire** (bleached dead-tree boneyard, 0.62 slow), **hammock**
(raised cypress island, no penalty + the densest foraging). Per the user the **miasma is very common
and large** — 46 zones at avg r 652 (vs 8 each of the others), placed first and allowed to merge into
big fog banks, covering **34.8% of the bayou** with 62.4% left clear; measured, not guessed, and at
no FPS cost. Also new: **`src/ui/StatusBarUI.ts`**, a
**generic debuff strip** above the buff bar (poison/bleed/slow/no-regen — bleed had NO HUD tell since
the badlands), timed effects get a meter + countdown, conditional ones just show; No Regen is
suppressed while poisoned as redundant. **Poison's regen penalty is 50%, not a block** (the user):
`blockRegen` became a `regenMult` multiplier end-to-end (`BuffManager.tick` included), the miasma
zone moved to the same 50% (a full block would have made the rule unobservable, since miasma is the
only poison source), sources take the MIN not the product, and Comfort's double-penalty bug was
caught + fixed. Verified: +19.4 HP over 9.69s in a miasma under a food buff vs +19.4 expected. **Deliberately left out:** **Mirehide** (a *creature* hide —
lands with 4b's roster, not a node), and the bayou is gated out of the enemy-respawn/nightfall top-up
until 4b ships. No `RECIPES.md`/dashboard change. See B3-P4a below + [[survivor-rpg-biome-3-roadmap]].
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
bayou's terrain, environment and material sources — above). **Phase 4 is now sliced into FOUR sessions**
(the Dungeon mechanic was added mid-session): **4a terrain/env/surface-sources — DONE**; **4b — the
melee-core roster** (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker + the one ranged
Corpselight haunt), which also sources **Mirehide** and re-enables the bayou's respawn top-up;
**4c — DUNGEONS** (Valheim burial-chamber/sunken-crypt interiors; where the ability gems + Moonsilver
actually live — ordered after the roster because a dungeon needs creatures to populate it); **4d —
surface POIs + the **Miretyrant** melee boss-with-adds**, which **becomes the new win-con** (locked),
demoting the Duneshaper to a mid-boss and finally making its **Heart** obtainable, unlocking the
Gemwright's ability recipes. **Then Phase 5** (post-big-boss RNG reward choice).
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

**SAME-SESSION REDIRECT (the user) — the precious materials moved underground.** After reviewing
4a, the user redirected: *"I want the key resource nodes to be part of the future Dungeon mechanic —
think Valheim's burial chambers or sunken crypts. I don't want the most precious things to be found
on the surface. I want the surface of the bayou to feel dangerous and murky while you look for these
dungeons. I do still want surface POIs and diverse areas that give the bayou its signature looks."*
Locked via `AskUserQuestion` and applied this session:

- **Surface/dungeon split.** The three **ability geodes** and **Moonsilver seams** were removed from
  `spawnBayouNodes` — they're **dungeon-only loot** now. **Bog Ore stays on the surface** on purpose:
  it's the bulk metal behind the whole Gloamsteel/Mirehide reforge tier, so exploring the swamp still
  pays while abilities + jewelry stay gated. Their **textures and ResourceNode shapes are kept**, so
  the dungeon phase re-sites the exact same nodes rather than rebuilding them. `moonsilver` + the 3
  gems are dormant again in the interim (`__dev.give`) — chosen over a placeholder surface trickle so
  playtesters never learn the wrong acquisition loop.
- **Dungeons are their own phase, ordered after 4b** (the enemy roster) and before the boss —
  a dungeon needs the bayou creatures to populate it, or it's an empty crypt. Phase 4 is now
  **4a terrain (done) → 4b roster → 4c dungeons → 4d POIs + Miretyrant + win-con swap**.
- **Three themed macro-zones instead of one**, so the surface carries the biome's signature look now
  that its payoff moved underground. `BayouZone` widened to `miasma | bonemire | hammock`, all reusing
  the shared `ZoneShape`/`zoneEdge`/`drawZoneFloor` (6 of each, 18 total): **miasma** = the gloam-fog
  hazard (no-regen + 3 dps poison); **bonemire** = a drowned boneyard of bleached dead trunks + bone
  litter that slows to 0.62 (props non-solid, so it stays a place you can flee across); **hammock** =
  a raised cypress island, **no penalty** and the swamp's densest foraging (cypress + moss/lilies) —
  the counterweight that makes somewhere worth reaching. New `scatterInZone` helper shared by all
  three fills. Verified visually: three unmistakably distinct areas.

**Status-effect HUD (`src/ui/StatusBarUI.ts`, new).** the user: *"when you are affected by poison /
slow there needs to be a symbol status effect on your character somewhere in the HUD."* Built
**generic** rather than poison-specific — **bleed had shipped since the badlands with no HUD tell at
all**, so this closes an existing gap and every future debuff gets an icon by adding one row to
`MainScene.statusEffects()`. A centered row of icons in its own band directly **above** the buff bar
(fixed offset, so debuff icons don't jump when a food buff starts/expires), in the red/amber that the
standing "reserve red/green for buff/debuff deltas" convention was holding for exactly this case.
Handles both flavors of debuff: **timed** ones (poison, bleed) get a depletion meter + a seconds
countdown, **conditional** ones (slowed, no-regen) simply show while active. `BleedManager`/
`PoisonManager` gained `remainingMs()`/`dps()` accessors; `currentEnvMoveMult` is now cached beside
`currentEnvBlockRegen` so the HUD can report *why* you're slow (e.g. "Movement 38% slower here").
**No Regen is deliberately suppressed while poisoned** — poison's own tooltip already says it stops
healing, so pairing the icons every time would be pure noise. Verified live: correct set per zone
type, the no-regen de-duplication both ways, 3 icons rendering with 0 overlap, row centered exactly
on screen center, depth 2803 (clears WORLD_H), and the hover tooltip.

**Poison regen penalty softened to 50% (the user).** *"Poison shouldn't completely negate regen but
it should make it significantly worse (50% regen)."* The boolean `blockRegen` became a **multiplier**
end-to-end: `environmentEffectAt` returns `regenMult`, `currentEnvBlockRegen` became
`currentRegenMult`, and `BuffManager.tick`'s `suppressHeal` flag became a `regenMult` scalar (buffs
still tick DOWN at full rate regardless, so a debuff can't be waited out under a food buff).
`POISON_REGEN_MULT = 0.5`.
- **The miasma zone's own regen effect moved from a total block to the same 50%.** Called out because
  it's a change beyond the literal ask: the miasma is currently the game's ONLY poison source, so
  leaving it at 0 would have made the new 50% rule unobservable in play. `regenMult: 0` is still
  supported for a future genuine no-heal zone.
- **Sources take the MINIMUM, not the product** — poisoned inside a miasma is 50%, not a compounded
  25% the player was never told about.
- **Bug caught in verification:** the first pass scaled Comfort's `hpPerSec` at apply time *and* let
  `tick()` scale it again, double-penalizing it to 0.25 HP/s. Now the penalty is applied once,
  centrally, so every heal source shares the same math.
- HUD/wording followed: the poison tooltip reads "healing -50%", and the standalone environmental
  icon is now **"Weakened Healing"** ("Healing 50% weaker here") when reduced-but-nonzero, still
  "No Regen" at 0.
- **Verified live:** a 10 HP/s buff heals exactly 10/s clean, 5/s poisoned, 0/s at `regenMult` 0;
  Comfort 1.0/s clean and 0.5/s poisoned (not 0.25); and end-to-end through the real update loop in a
  miasma with a food buff, **+19.4 HP over 9.69s against +19.4 expected** (+5/s healing −3/s poison).
  Poison is now real pressure you can out-heal with good food rather than a hard shutoff.

**Miasma made very common + large (the user).** Zone placement moved from an even 6/6/6 split to
**per-type targets** (`PLAN` in `placeBayouZones`): **46 miasmas at r 520-780** (avg 652, up from 6 at
avg 235) vs 8 bonemires + 8 hammocks. Miasma is placed **first** so it claims ground freely, and it's
the only type allowed near its own kind (`selfSep` 520 vs 700) so neighbouring fog **merges into big
irregular banks** rather than staying tidy separate discs. A separate, much larger `CROSS_SEP` (1250)
keeps other types clear — it has to exceed the largest miasma radius plus the other zone's own radius,
or a fog bank simply swallows the hammock it was meant to spare (and since miasma is placed first,
`bayouZoneAt` would resolve that overlap in its favour). Fume density now scales with area under a
cap of 120 — holding the old small-zone density across r-780 blobs would have put thousands of extra
sprites in the world, and the ground decal already fills the whole organic outline, so fumes read as
an accent on it rather than as the fog itself.
**Tuned against measurement, not guesswork:** a first pass at 30 zones/avg r 459 covered only **13.1%**
of the bayou — common, but not *very* common. At 46/avg 652 it's **34.8% miasma, 62.4% clear ground**,
so the swamp reads as choked with gloam fog while staying navigable. All 8 hammocks verified intact
(none swallowed). **No perf cost:** 60 fps standing inside the largest bank (r 777) vs 58 in the
forest — an earlier 65-vs-71 reading was just an unsettled loop, not a regression.

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
