# STATUS Archive — older milestone entries (grep by id; never Read in full)

### "God run" triage session 3 — creature identity pass, C1/C2/C3 (2026-07-23, Opus)

Plan: `.claude/plans/vagabond-god-run-triage.md`. Sessions 1 (bugs/ammo/summary) and 2 (the
balance pass) shipped earlier the same day; this is the final session, closing the whole triage.
Three bespoke bayou-creature reworks, each off a specific the user complaint and each following the
roster's "own state machine, own numbers in enemyStats.ts, no shared config table" rule.

**C1 — Mirejaw ("feels like a glorified boar").** Two additions give it an alligator's identity.
(1) DEATH ROLL: a chomp that CONNECTS (and is off cooldown) latches into a thrashing roll — 3
ticks @360ms in a tight 62px grip, each re-checked against the player's CURRENT position (break
away to cut losses), 18 dmg + 7/s bleed each, ending in a 1s planted recovery (the biggest punish
the creature offers), 7s cooldown. Only ever entered from a hit that already landed — a punish for
being caught, not a new way to catch you. Routed through `checkPlayerHit` (Mirejaw added to that
union); the barrel-roll spin is driven manually rather than by a tween because
`Enemy.playHitFeedback` calls `killTweensOf(this)` on a planted enemy and would strand the sprite
crooked. (2) WATER TERRITORY: new generic `Enemy.ignoresTerrainSlow` (default false) exempts a
creature from the environmental move-slow the player suffers — only the TERRAIN term, so night
speed + Executioner slow still apply. On dry ground you outpace it; in deep water the player wades
at 0.5x and it doesn't, inverting the relationship. Verified live: full cycle fires 3 ticks at
900/1260/1620ms; breaking the grip after tick 1/2 takes exactly 1/2 hits; on a sampled 0.62-
moveMult tile the Mirejaw reads envSpeedMult 1.0 vs a Murkling's 0.62.

**C2 — Mosswretch ("lacks attack moves / feels weird").** Its whole kit was one slow overhead
swing on the slowest body in the game — trivially walked away from. (1) SPORE BURST: it can't
catch you so it stops you — a mid-range (outside smash reach) planted 700ms heave with NO impact
damage drops a lingering cloud on your CURRENT ground that slows 0.6x + poisons 5/s for 6s, used
to cut off the retreat so the next smash lands. Rides the same `environmentEffectAt` path the
Miretyrant's mire pools use (refactored into `baseSurfaceEnvironmentAt` + `foldSporeCloud`, so a
cloud stacks correctly with water/thornfield/miasma — harsher slow wins, poison max'd), inheriting
slow + poison + regen-suppression + status-resist with zero bespoke damage code. (2) DEATH-SPAWN:
comes apart into 3 Mosslings (same class scaled 0.58, 16% HP / 42% dmg / 1.9x speed, forceAggro'd
so they swarm the moment you'd relaxed), via the "creature asks (`deathSpawnCount`), scene spawns
(`spawnMosslings`)" split the bellow uses. Guarded 3 ways: a spawnling reports deathSpawnCount 0
(no recursion), is never elite (one kill can't pay 4 trophies), drops only 1 token swamp_moss.
Verified live (after page-reload to fix an HMR dual-class `instanceof` artifact): a real
dev-spawned kill spawns exactly 3 aggro'd Mosslings, killing a Mossling spawns none, the cloud
reads moveMult 0.6 / poison 5 / regen 0.75 inside and neutral outside.

**C3 — Corpselight ("just a ranged gremlin").** A genuine TWO-FORM TRANSFORM — the user explicitly
rejected phase-out and blink as done-before and asked for a melee-form transform, so this is a new
shape for the roster (nothing else transforms). At range = the wisp (unchanged: fragile, floaty,
armor-bypassing homing orbs). Within 96px it COLLAPSES into a corporeal husk: 1.7x scale, slow
62px/s lurch, a PHYSICAL maul (30 — armor answers the husk, unlike the wisp's magic orbs), and it
takes only 0.5x damage. Stay 190px away for 2s and it DISSOLVES back (hysteresis: revert range >
transform range, so no boundary strobe). ONE shared HP pool (chipping the wisp is real progress,
but a given DPS goes further at range than into the tanky husk — the "commit to a strategy"
lever). BOTH transitions deal telegraphed magic AoE (collapse drop-slam 26 + 150kb, dodgeable by
stepping out of the 104px tell; dissolve puff 13) via `checkPlayerHit` (Corpselight added to the
union); the husk maul uses the boolean-bite path with `biteDamage` overridden to the maul value.
1.6s transform cooldown caps flicker. Verified live: full wisp->collapse->husk->dissolve->wisp
cycle with correct scales/damage; husk takes exactly 0.5x (40->-40 wisp, -20 husk); collapse slam
lands 26 standing still / whiffs when you sprint clear; the scene loop dealt slam+maul to the
player through the real applyDamageToPlayer path (138->82).

`enemyStats.ts` holds every number (new attack entries per creature); dashboard Enemies tab
resynced for all three (stale primary-damage numbers corrected in passing since those entries were
being edited anyway — Blighttoad/Murkling's stay flagged). `tsc` + `npm run build` clean, zero
console errors. **The god-run triage (sessions 1-3, D1-D10 + C1-C3) is complete; next is a
playtest.**

### B4-P5 — Gear branching, set bonuses → jewelry, pickaxe gate, Gemwright UI (2026-07-22, Opus)

Plan: `.claude/plans/b4-p5-gear-branch-and-jewelry.md`. Follow-up to B4-P4 from the user's
weapon/armor/gem callouts. Every decision was locked via `AskUserQuestion` before any code — and
one of those rounds corrected my own framing, which is the most important thing in this entry.

**The framing correction.** I first proposed the new set as a *badlands* mid-tier sitting between
Sunsteel and Embersteel. the user pushed back ("why would the new set be anything Badlands
related?"), and re-reading his original note ("upgraded straight from sunsteel") the real defect
was obvious: **Sunsteel is a dead end.** Gloamsteel reforges from an *Embersteel* piece, so a
player who skipped the Embersteel tier had no path into bayou-grade gear at all. The branch
belongs at the bayou end, built from bayou materials, reforging from a Sunsteel base. Worth
remembering that the ask was already precise; I'd added a tier where he'd asked for a route.

**The Mirebronze branch** (9 recipes + a new ingot). `Sunsteel → Mirebronze/Bogweave` runs
parallel to `Sunsteel → Embersteel → Gloamsteel`; both are terminal. Armor is deliberately
between the two existing tiers — heavy **20 → 32 → 36 → 42**, light **15 → 24 → 26 → 30** — so
the Sunsteel route is a complete endgame set while the longer Embersteel road stays the stronger
one (locked decision 4: with set bonuses leaving armor, the reward is simply bigger numbers).

**Ore economy, counted before deciding.** the user asked me to think through supply, so I did:
Sunscorch 90 nodes / Bog Ore 46 / Ember Ore ~58 / **Moonsilver 36, every one behind a crypt
warden**. His proposal (new set = Sunsteel + Bog Ore, Gloamsteel = Bog Ore + Moonsilver) works
precisely *because* Moonsilver is the scarce gated one — it makes the Embersteel route the
dungeon-clearing route, which is the reward he asked for, with no special-casing. Seams went
**3 → 4 per vault** to cover the added demand. One implementation note: Mirebronze smelts from
the **ingot** (fuelled by Bog Ore) rather than from ore, because two smelt recipes sharing an
input key would make `processRecipeFor` ambiguous.

**Set bonuses moved off armor onto jewelry.** All four (Molten Bulwark / Emberblink / Gloam
Bulwark / Mireblink) are now single craftable Gemwright pieces; the effects and numbers are
untouched, only the source moved. `activeSets()` keeps its signature and every MainScene call
site (`hasSet`, `moltenDamageReduction`, `emberblinkDashMult`, the thorns branch, the burst) is
unchanged — it just reads jewelry keys now. The rule also **inverted**: because each bonus is a
self-contained item, "a partial set" no longer exists, so wearing several of a lineage grants the
**highest** rank rather than B4-P4's weakest-piece rule. This is what frees armor to be pure flat
armor, which is what makes branching gear balanceable at all.

**Pickaxe gate**, the exact mirror of an existing precedent: `stone_axe_ironshod` (Sunsteel +
Stone) already gates Ironbark trees via `minToolTier`. Added `stone_pickaxe_ironshod` (2 Sunsteel
Ingot + 4 Ironbark — badlands-crafted, so it's something you prepare *before* travelling) and put
`minToolTier: 1` on Bog Ore's 46 surface nodes. Since Bog Ore is the bayou's only surface ore,
that one flag gates the whole bayou metal economy.

**Gemwright UI.** Ability-granting designs now show a **Q / E / R badge**, derived from the item's
own `armorSlot` through `SLOT_ABILITY_KEY` rather than written per recipe — the list previously
said only "Gloamstep Band" with no hint which key it filled. And gem setting moved out of the
shared right-click Upgrade panel (which was serving station, armor, weapon *and* gem concepts at
once) into a **Set Gems tab** on the Gemwright: gear on the left, gem on the right, and a footer
previewing the exact effect and cost before committing. The preview text comes from a new
`describeAugmentEffect()` derived from the effect object, so it can't disagree with what gets
applied. Gem rows are gone from `UpgradeMenu`, which now only does upgrade ladders; its slot
readout stays and points at the Gemwright. A new addressable API (`augmentTargets` /
`applyAugmentToTarget`) was needed because the old `applyGearAugment` was bound to whatever the
Upgrade panel happened to be pointing at.

**Two things needed no work, and saying so was the right answer:** heavy-armor magic mitigation
already covered magic, fire *and* poison (the user asked for poison+fire to be included), and armor
pieces already carried no resistances or stat bonuses at all — so "raw armor only" was already
true.

**Verified live + in Node**: all 9 recipes present with correct costs and bench tier; the armor
ordering invariant measured on both lineages; the four smelt recipes reading
`bog_ore+moonsilver→gloamsteel` and `sunsteel_ingot+bog_ore→mirebronze`; full Embersteel *armor*
now granting no bonus while the amulet alone gives 0.15 reduction and the Mireblink ring gives a
1.9x dash; both rings worn resolving to the higher rank; Bog Ore at 46 nodes with `minToolTier 1`;
4 seams per vault; all 14 new textures present; and gem setting applying end-to-end with duplicate
and 2-per-item cap both refused. `tsc` + `npm run build` clean.

**Next: a playtest.** All numbers are first-pass — especially whether Moonsilver at ~120 supply
comfortably covers Gloamsteel *and* the four new jewelry pieces in one run.

### B4-P4 — 25-item playtest omnibus: bugs, bayou gaps, world density, combat feel (2026-07-22, Opus)

Plan: `.claude/plans/b4-p4-playtest-omnibus.md`. the user's 95-minute Ascetic run (lvl 18, ~60 in
three stats) cleared the **whole bayou and killed the final boss in EMBERSTEEL gear** — a full tier
below the set that content gates. That, not any single bug, is the thesis: the endgame tier was
never necessary and the map was too big for the materials in it. 25 items, all four buckets in one
session (an explicit override of the one-milestone-per-chat convention). Four design calls locked
via `AskUserQuestion`, all as recommended: magic = **on-hit AOE**, set bonuses **span tiers**,
bosses get **new mechanics + presentation**, and **densify hard while keeping `WORLD_RADIUS`**.

**Three reported bugs turned out to be the same class of defect — a reference to something that
was never built:** the crypt chest pointed at texture `shack_chest` (BootScene only makes
`gremlin_shack_chest`), so it drew as Phaser's missing-texture placeholder — exactly the "black box
with green outline"; the crypt gem geodes wore `gloaming_vein_shielded`, *literally the surface
gloam-ore texture*, which is why a gem node read as a Gloam Shard node while the purpose-built
`geode_gloam/ember/blood` textures went unused; and `refreshDiscovery()` announced station and tool
upgrades but simply **had no loop for `WEAPON_UPGRADES` or `ARMOR_UPGRADES`**, so an entire
progression axis could never be discovered ("I never got any weapon upgrade unlocks").

**Perf ("overall performance feels worse") was structural, not incremental.** `updateEnemies` ran
full AI for *every* enemy in the world each frame — measured live at **1142**, including every
dweller in every prebuilt dungeon interior tens of thousands of pixels away. A distance cull
(`ENEMY_ACTIVE_RADIUS` 2000, comfortably past both the ~1536px camera and the roster's longest
620px leash) drops that to **115 per frame**. Safe because every give-up/attack timer is absolute
rather than an accumulator, so nothing drifts while an enemy sits out frames.

**"I can see crypts next to the one I am in"** was fixed by making interiors *not render* unless
occupied (`setDungeonVisible`) rather than by separating them — separation can't win, since the
camera sees ~1536px and the dead corners are finite. That inverted the constraint on dungeon
density: cells only need to not overlap, so `CRYPT_REALM` grew to the largest square that still
clears `WORLD_RADIUS` (3700 square, inner corner 14283 > 14000) and packs **4x3 = 12 crypts, up
from 6**.

**Other fixes:** the Emberblink nova and Gloam Nova both damaged submerged/stalking enemies (they
skipped the `isTargetable()` guard every other damage sweep honors); Comfort's rest check was
aggro-only **world-wide**, so on a 28000px map with a 620px-leash Duskrunner *something* was always
hunting you and resting silently never fired again in the badlands (now scoped to 900px); dungeon
dwellers got a free hit on arrival (descending now calls a new `Enemy.resetAttackState`, so the
first swing you see underground plays its full telegraph); epic loot at 4/6/8% made "never saw one"
the *likely* outcome for a run, so rates went to 10/16/22% **plus a pity counter** (guaranteed after
8 dud containers — verified forcing at exactly 8); the Corpselight orb's 9000ms lifetime at 170px/s
was ~1.5km of chase, now 4200ms **plus a real miss rule** in `Projectile` (once it has come close
and is drifting away again, the dodge *succeeded* — it stops tracking and fizzles); and a Class tab
was added to the Character menu, deriving its text from `affinityLines` so it can't drift from the
picker card.

**Content gaps closed:** the bayou had **no food at all** — `mirejaw_meat` shipped in Phase 4b
marked "cooking recipes land later" and that never happened — so three dishes now land, also giving
`swamp_moss`/`water_lily` their first use. And all six bayou trophies are Common/**Tier 3** with
`REFINE_RECIPES` stopping at tier 2, so the deepest trophies could only ever be gambled raw: added
**Mire Shard**, a tier-3 refine row, and a **Mire Crucible** (Relic Forge Lvl 4). The Convert tab
was generalized over a new `SHARD_CONVERSIONS` table rather than gaining a second hardcoded block.
Note `tsc` *passed* on the half-done version of this — TypeScript's arity rule let the old
zero-arg `convertGloamToEmber` satisfy the new `convert(id)` signature while silently ignoring the
id; caught by reading, not by the compiler.

**World:** the content-less **Windswept Dunes are gone** from the biome pool (`Dunes.ts` kept on
disk unreferenced — tier 4 is where the next real biome slots in, per the user: "1 but there will
eventually be another biome"). Bayou's unlock radius came in 6500 to 4200, `LOWER_FALLOFF` 0.9 to
1.2, and the bayou content band tightened to r 4400-9000. Measured live: **0 dunes coverage**, and
beyond the badlands the mix is **63% bayou / 24% badlands / 8% forest**. POI counts up across the
board (dens 16 to 30, forges/shrines/lodges 4-5 to 9, shacks 8 to 14), and the Sunken Gorge now has
**two maws into one interior** — separate lairs would mean two bosses and two win conditions in a
one-life run, whereas separate doors just mean the finale isn't a cross-map trek.

**Combat feel:** magic weapons' whole selling point was bypassing flat armor — but **enemies have
no armor stat**, so against them the bypass did *nothing*, leaving the Gloam Brand at 44 DPS vs the
Pike's 52 and Sword's 53 *and* resisted by the gloam-casters. They now carry a data-driven on-hit
detonation (`WEAPON_ON_HIT_BURST`), fired only from the primary hit so it can never chain. Set
bonuses now match on **lineage + rank**, granting the bonus of the **weakest piece worn**, so
crafting one next-tier piece no longer deletes it (verified: 1 and 2 Mirehide pieces both keep
Emberblink; the full set upgrades to Mireblink). Poison capped **5 to 3 stacks** with the dose cut
9 to 6 dps (45 dps that bypassed armor *and* halved healing was a delete button; measured 18 now).
The Mosswretch now **rears back** and swells 1.4x in green via a new optional `SwingConfig.tell`,
so its reach is readable without violating the "no world-space red arcs" lock. Every named fight
now announces itself with a **name card, camera kick and sting** (`BOSS_SUBTITLES` — a future boss
is one row), and the Miretyrant went 3200 to 4600 HP and gained a phase-3 hazard: its slams and
rolls leave **permanent mire pools** that slow and poison, so the arena closes in rather than the
bar just getting longer.

**Verified live throughout** (`preview_eval`): 12 crypts all hidden and outside the world circle
with zero overlaps, 2 maws, biome mix, the 1142 to 115 cull, the set-bonus matrix across both
lineages, magic burst hitting a 40px neighbour for 60 while a 400px one is untouched and the source
is never double-hit, poison capping at 18 dps, epic pity firing at container 8, upgrade-ladder
discovery holding lvl3 back until lvl2, attack reset on descend, Comfort ignoring a 5000px hunter
but not a 100px one, and the boss card being idempotent. `tsc` + `npm run build` clean, zero
console errors. **One caveat worth a playtest:** a dodged homing orb still trails for ~2.4s when the
player is only just outpacing it (170px/s orb vs sprint) — much better than the old 9s, not instant.

**Two verification traps worth remembering.** The preview tab throttles when backgrounded (frame
73 to 75 across a whole call), which made a projectile look immortal; and a fresh reload sits behind
the character picker, which uses the **pause freeze** — so physics never steps and *nothing moves*,
which reads exactly like a broken projectile. Both were mine, not the game's. Drive the loop with
`game.loop.step()` and check `isPaused`/`physics.world.running` before trusting any motion test.

**Next: a playtest.** Every number here is first-pass, and the density/biome-mix changes especially
want real play rather than sampling.

### Biome 2 — Phase 3: Duskrunner Warren POI (two-wave destructible den)

Plan: `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 3, umbrella). Built on **Opus** (new
POI mechanic). the user scoped Phase 3 to **"two POIs first"** (the badlands boss + Gremlin King
critical-drop rework stay deferred), then specced POI 1 in detail — it is deliberately NOT a
Gremlin-Shack clone.

**The Warren** (`src/entities/BadlandsDen.ts`) — a plain data class (not a GameObject subclass;
MainScene owns the wave/smash scheduling), a burrow-mound `image` + a lazily-created cache
`image` + `LootContainer`. Its lifecycle is a state machine (`DenPhase`):
- **wave1** — 3 normal Duskrunners guard the den; the mound is inert (not hoverable/interactable).
- **wave2** — clearing wave 1 spawns **3 ELITE Duskrunners** (`onDenGuardKilled` → `spawnDenWave`).
- **attackable** — with both waves dead the den is exposed; smash it with a **melee weapon** (it
  has HP `DEN_HEALTH` 42; ranged doesn't apply to a structure). `tryAttackDen` mirrors
  `tryMeleeAttack`'s cooldown/stamina/reach guards + a size-scaled `denReach` (mirrors
  `enemyReach`), deals `(weaponDamage+tier)×skill×relic` dmg, spawns a damage number.
- **looted** — on the killing hit the mound swaps to `duskrunner_den_wrecked`, a `warren_cache`
  sprite + warm pulsing glow appear, and the cache loot rolls. Opening reuses the shared
  `ChestMenu` (`openChestMenu` was generalized from `(shack)` to `(loot, table)`).

So **loot is gated behind destruction** (both waves must die first, automatically) and the Warren
**does NOT respawn** — you destroy it. **Spawn: 10 dens** (the user: dens should be **fairly common**,
~one per sizable badlands chunk — bumped 3→10) spread ≥`DEN_MIN_SPACING` (950px) apart via
`pickBadlandsPoint`, picked **before** the wild badlands packs so a new `DEN_CLEAR_RADIUS` (200)
exclusion in `pickBadlandsPoint` keeps ordinary spawns out of a den's clearing (the standing
"POI busy = missing exclusion zone" lesson). **Cache loot** (`DUSKRUNNER_WARREN_LOOT_TABLE`):
guaranteed pelts, likely meat/bones, chances at `sandmaw_chitin`/`gloam_shard` + a
`duskrunner_trophy` — richer than a shack (a two-wave elite fight earns it).

**Duskrunners are now a badlands food source** (the user): every Duskrunner (den *and* wild) drops
raw **`duskrunner_meat`** alongside its pelt (elite 2×). New `ResourceType` + `ItemDef` +
`icon_duskrunner_meat`; the cook/eat specifics are **deferred** — it's a "future cooking
ingredient" like sunfruit/emberbloom, so the food exists in the world without over-designing it.

**Map + night:** a discovered Warren fires a prominent **discovery popup toast** (new `"poi"`
`LogKind` in `EventLog`/`EventLogUI`, routed through `showToast` like a biome-discovery toast, in a
warm orange matching the map marker) **and** adds a `map_den` minimap/world-map landmark ("Duskrunner
Warren", dusty orange-brown `0xc06a34`) via the generalized `updateAltarDiscovery` pass; dens glow
a faint gloam-ember at night (`denLightPoints` in `collectLights`, radius 90 — subtler than a full
POI). Hover/prompt/interact reuse the exact existing chain (new `hoveredDen`, `promptForDen`,
`tryInteract` branch, hover-highlight target = `den.target`), interactable only while
attackable/looted so the mound doesn't block enemy hovers during the fight.

Files: new `BadlandsDen.ts`; `Inventory.ts` + `Items.ts` (`duskrunner_meat`); `Duskrunner.ts`
(meat loot); `BootScene.ts` (`duskrunner_den`/`_wrecked`/`warren_cache`/`map_den`/
`icon_duskrunner_meat` textures); `MainScene.ts` (den fields/reset, `spawnBadlandsDens`/
`spawnDenWave`/`onDenGuardKilled`/`tryAttackDen`/`denReach`, `pickBadlandsPoint` exclusion, hover/
prompt/interact/discovery/lights wiring, `openChestMenu` generalized); `dashboard/main.ts` (Enemies
tab Duskrunner loot row). No `RECIPES.md` change (no recipes — cache is a loot table, meat has no
recipe yet). **Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors;
`preview_eval` — 10 dens spread across r 2505–5004 (minGap 1214px), wave1(normal)→wave2(elite)→
attackable→wrecked+cache→loot, prompt gating (guarded=null / attackable-no-weapon=null /
melee="Smash" / ranged=null / looted="Search the remains" / out-of-reach=null), Duskrunner rollLoot
yields pelt+meat, discovery fires the "poi" popup toast + adds the `map_den` landmark; screenshots
confirm the den mound + guards render and the discovery toast pops. **Next: POI 2 — the Sunken
Forge mini-boss.**


### Biome 2 — Phase 0: Patchwork worldgen (bigger world + base-layer + biome blobs)

Plan: `.claude/plans/biome-2-phase-0-world-ring.md` (Phase 0 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (world-gen rework). **Note:** an
initial concentric-**rings** version shipped and was **reworked same session** — the user found
rings too uniform and wanted Valheim-style diversity. This is the patchwork rebuild.

**Locked model (this session's brainstorm):** biome 1 = a solid **protected forest disc**
(unchanged, safe tutorial); *beyond* it a **universal base layer** (grades grass→dusty outward)
with biome **blobs** on top, each blob's biome drawn weighted by `danger = radialTier(r) + noise`
(moderate variance). Biome types repeat; blobs blend at seams with base-layer gaps between. World
grows **~2×** for ~5 biomes. Map centers on the player.

- **World grown to `WORLD_RADIUS` 14000 (28000px).** `depth.ts` `WORLD_DEPTH_SCALE` 0.3→**0.09**
  (28000×0.09 = 2520 < 2600 HUD floor; all Y-sort sites already use `ysortDepth`).
- **`src/systems/WorldBiomes.ts` (new, framework-light).** The level-1 biome-TYPE map: a
  jittered-grid **blob seed scatter** (which also serves as the spatial bucket for O(3×3)
  `coverageAt`), each seed's biome picked by `dangerAt(seed)` (nearest tier: badlands=2,
  dunes=3). `coverageAt` = metaball smoothstep falloff w/ noisy edges; `forestCoverage(r)`
  forces a solid disc ≤2000. **`worldBiomeColorAt`** is the single terrain-color source (base
  graded + badlands + dunes + forest-on-top) used by BOTH the bake and the map → no drift.
- **Palettes:** `Badlands.ts` (dusty red-brown `0x8f5a42` clay + mesa + ravine) and new
  `Dunes.ts` (pale sand) — a **placeholder terrain-only** biome so the patchwork reads with >1
  outer biome. Both reuse **one tiled `Biome`** for feature detail (new `Biome` `tiled` mode
  wraps coords, so a small cheap Biome repeats across the huge world vs a 28000px Voronoi).
  `colorUtil.ts` holds the shared `blendColors`.
- **Rendering (bounded, GPU-safe at any world size).** Forest keeps its crisp 4000² bake (now
  faded by `forestCoverage` so it never paints past the edge) — biome 1 pixel-identical. The
  outer ground is ONE `bakeOuterOverlay` RenderTexture (`OVERLAY_TEX` 4096², ~64MB,
  LINEAR-filtered, stretched over the world; skips the forest core). **A world-sized
  `tileSprite` OOMs** (28000²≈3GB — the boot bug this session, found via a stack trap since the
  uncaught error wasn't in the console filter); grass is now forest-region-sized only.
- **Map.** `ExploredMap.terrainColorFn = worldBiomeColorAt`; `WorldMapUI.openMap(px,py)` now
  **centers on the player** (new `centerOn`), framed to a ~5000px nearby view (wheel zooms out).

**Verified** (`tsc --noEmit` clean; `preview_eval` + screenshots, console error-free): boot OK;
forest core pixel-identical; coverage gradient forest→badlands→dunes with `dangerAt` rising
2.1→4.4 outward; badlands = dusty red-brown, dunes = pale sand, base-layer gaps between blobs,
all smoothly blended; world map shows the patchwork centered on the player; **all 401 nodes +
103 enemies stayed in the forest disc** (no leak into the empty patchwork). No `RECIPES.md`/
dashboard change. See [[survivor-rpg-biome-2-plan]], [[survivor-rpg-circular-world]].

**Same-session refinements (the user's feedback):**
- **Biome ordering → radius sets a danger CEILING** (`WorldBiomes.ceilingTier`/`pickBiome`), not
  a fixed tier. A blob may be any biome with `tier ≤ ceiling(r)`, weighted toward the ceiling —
  higher biomes gated behind an unlock radius (no out-of-order danger), lower biomes appear
  anywhere. **Forest is now a blob biome too** (spawns beyond the disc); the center chunk stays
  biome-1-only via `forestCoverage`. Verified across 600 samples/band: **dunes = 0 in every band
  before ~6500**; forest present at all radii (307→136→186→69→74).
- **Current-biome HUD label** on the minimap + a **first-entry discovery toast** (new `"biome"`
  `LogKind`, gold center toast; forest pre-marked so the first toast is genuinely new). Verified:
  entering badlands/dunes updated the label + fired one toast each. `BIOME_NAMES` = placeholder
  flavor (Verdant Woods / Sunscorch Badlands / Windswept Dunes / The Wilds).
- **Dev command `Ctrl+Shift+M`** (`revealEntireMap`) clears all fog + opens the world map for
  worldgen inspection (undocumented — not in the Keybinds panel). Verified: 490k cells revealed.

### Welcome overlay — show once per page load during early access

Off the build order, built on Sonnet (gating tweak on an existing system, no new
mechanic). the user reopened the deployed playtest link and didn't get the welcome — not a
deploy bug: the overlay's `localStorage` flag (`survivor-rpg:welcome-seen:v1`) is
once-ever-per-browser, and his browser had already dismissed it. Locked direction: for an
early-access playtest, show it **every session** (once per fresh page load) without
re-spamming on in-session New Run restarts.

- **`src/ui/WelcomeUI.ts`** — added `ALWAYS_SHOW_EACH_LOAD` (const, `true`) + a
  module-scoped `shownThisLoad` flag. `hasSeenWelcome()` returns `shownThisLoad` in
  early-access mode (falls back to the untouched localStorage gate when the const is
  flipped off); `markWelcomeSeen()` always sets `shownThisLoad`, and only writes
  localStorage in the non-early-access path. The module re-evaluates on a full page reload
  (→ shows again) but persists across `scene.restart()` (→ New Run does NOT re-show) —
  exactly the wanted granularity. Reverting to permanent "once ever" is a one-line flip.
- **`MainScene.ts`** — comment-only: the first-launch note by the `openWelcome()` trigger
  now describes the per-page-load behavior. No logic change (the `!hasSeenWelcome()` guard
  is unchanged; only its return value semantics moved).
- Note: playtesters get this only after the next push to `main` triggers the Pages deploy.
  No `RECIPES.md` change.

### Welcome + How to Play overlay, keybind clarity fix

Off the playtest-readiness backlog, built on Sonnet (new UI on existing freeze/menu
patterns, no new core mechanic). the user flagged two gaps: Ctrl+Click and Shift+Click
(quick-move / split-stack) had no in-game callout anywhere, and there was no cold-start
"what is this game" moment for new playtesters.

- **Keybinds panel** (`MainScene.ts`'s `KeybindsUI` bind list) gained two lines:
  `"Quick-move item: Ctrl+Click"` / `"Split stack in half: Shift+Click"`, next to the
  existing Left/Right Click lines.
- **`src/ui/WelcomeUI.ts`** (new) — a 2-page modal (Welcome / How to Play), styled after
  `PauseMenuUI`/`RunEndUI` (flat scrollFactor(0) GameObjects, depth 3600-3602, above
  every other menu). Page 1: early-access framing (placeholder art/sound, balance still
  tuning) + a thank-you for playtesting alongside development. Page 2: the
  Explore→Gather→Craft→Level→Fight loop at a high level, "play at your own pace but the
  score rewards speed," core controls (LMB/Tab/K/Esc), and the two click-modifier
  shortcuts above. **Deliberately spoiler-free**, matching `Hints.ts`'s standing rule —
  never names the totem/altar/boss win condition.
  - `hasSeenWelcome()`/`markWelcomeSeen()` persist a `localStorage` flag
    (`survivor-rpg:welcome-seen:v1`), same pattern as `HintManager`'s on/off pref — shows
    once per browser, not once per run.
- **`MainScene.ts` wiring**: `openWelcome()` reuses the exact `isPaused` freeze
  `openPauseMenu()` already establishes (`physics.world.pause()` + `time.paused = true`)
  rather than a second parallel freeze flag; `create()` calls it once if
  `!hasSeenWelcome()`. The pause menu (`PauseMenuUI`) gained a **"How to Play"** button
  (`onHowToPlay` dep) that re-shows the same overlay on demand — `openPauseMenu()` was
  split into itself (freeze + guard) and a new `showPauseMenuPanel()` (just the
  `.show()` call, no guard), so closing "How to Play" opened *from* the pause menu can
  re-invoke `showPauseMenuPanel()` without tripping `openPauseMenu()`'s
  `if (this.isPaused) return` guard (confirmed via `preview_eval` — the naive first
  version silently no-op'd on that exact path). Esc closes the welcome overlay first
  (before the pause-menu/menu-close checks), acting as "Start Playing."
- Verified via `preview_eval`: first-load overlay renders (both pages, Back/Next/Start
  Playing), `finish()` unfreezes + sets the localStorage flag, and the pause-menu →
  "How to Play" → close → back-to-pause-menu round-trip restores the correct frozen
  state. No console errors. No `RECIPES.md` change (no recipe/cost changes).

### Previously: 40-min playtest fix batch (12 items) + relic rarity/tier rework

A grab-bag off the user's 40-min "almost died a lot, feels harder — good" session. Built on
Opus (the relic change is a new data model). No new milestone letter. All 12 items done +
verified in the live preview.

**Relic rarity/tier rework (the big one — `Relics.ts`).** Trophies now carry a **rarity +
tier**, and a trophy's rarity drives an **outcome table** over the RESULT rarity (locked
odds, the user): a **Common** trophy → 1% Rare / 2.5% Uncommon / 10% Common (else 86.5% fail,
never Mythic); **Uncommon** → 1% Mythic / 5% Rare / rest Uncommon (never fails); **Rare** →
10% Mythic / rest Rare. A relic's **power tier always equals the trophy's tier**
(Tier-1 trophy → Tier-1 relic only). New `TROPHY_OUTCOME_ODDS` + `rollOutcomeRarity()` (walks
the bands, subtracting each — the listed chances ARE the exact odds) +
`trophyOverallSuccessChance()`. `TrophyRoll` dropped its `successChance` field;
`RARITY_SUCCESS_CHANCE` removed. `RollResult.rarity` is now the PRODUCED rarity (may exceed
the trophy's — a Common trophy CAN roll up into an Uncommon/Rare relic, and the
`RelicRevealFx` slot-machine shows that bigger reveal, which is the gamba payoff). **First
roll of a run is a guaranteed success** (the "hook" the user floated) via a `firstRollDone`
flag + `isFirstRollPending()`; the forge button surfaces "first roll guaranteed". Pity kept
as a floor (common 12). All first-biome trophies stay Common/Tier 1. Verified live: 20k-roll
sample gave Rare 1.02% / Uncommon 2.71% / Common 12.74% / Mythic 0% / fail 83.5% (matches
spec + pity), first roll guaranteed. `RelicForgeMenu` readout + the dashboard Relics tab
(outcome breakdown) + `RECIPES.md` all updated.

**The other 11 (playtest notes):**
- **Dashboard armor Lvl 3.** The Armor tab only showed Base + Lvl 2 (the 3-tier rebalance
  shipped but the dashboard never got a Lvl 3 column). Now Base/Lvl 2/Lvl 3 columns
  (full-set 7/10/13) + an "Armor upgrade costs" table. Balance tab's "Full armor" card now
  uses the max tier (Lvl 3). Verified live.
- **Boar faces its charge.** `applyFacing()` silently no-ops on a unit vector (magnitude < 3),
  so the charge/coil wind-up tells never rotated the sprite. New `Enemy.faceAngle(angle)`
  bypasses the guard; Boar's charge wind-up + Snake's coil now point the right way.
- **Committed attacks aren't interruptible by hits.** `Enemy.playHitFeedback()`'s x-shake
  tween fought a charging Boar's own body velocity + snapped it back on complete — read as
  "attacking cancels the charge." Now skips the shake only while an attack is *moving*
  (wind-up/recovery punish windows still flash).
- **Boss regens while deaggro'd.** `GremlinKing` heals 12 HP/s (+ poise refill) only while
  fully deaggro'd, so kiting away to rest doesn't bank chip damage for free.
- **Smash is dodgeable (i-frames confirmed working).** i-frames DO work — the slam routes
  through `applyDamageToPlayer`'s `invulnerableUntil` guard. The real bug: `SMASH_RADIUS` 120
  was bigger than the ~102px a walking player (95px/s) can travel in the ~1080ms telegraph+
  leap, so it was undodgeable by movement. Cut to **95** (walk-dodge viable, sprint/dash gives
  margin).
- **Snake Meat + 2 dishes.** New `snake_meat` resource (Snake drops 1, elite 2, alongside
  leather) → **Cooked Snake Meat** (shishkabob + snake_meat, +2 HP/s 22s) and **Blood-Glazed
  Snake Skewer** (+ gremlin blood, Lvl 2 campfire, +3 HP/s 35s). New Items/textures/Cooking
  rows; verified textures load.
- **Bones economy.** Boar bones drop 1→**1-2** (elite 2→2-3); Bone Knife Lvl 2 cost 5→**3**
  bones. (Chose drop-bump + cost-ease over a boar respawn system — noted as a future option.)
- **Stamina hint reworded** — no longer blames sprinting ("Sprinting, dashing, and attacking
  all drain it").
- **Workbench placement bug.** Crafting a placeable left the crafting menu open; a following
  recipe click fell through and placed ANOTHER workbench. `startPlacement()` now closes the
  crafting menu (mirrors `startItemPlacement`), + a belt-and-suspenders guard skips placement
  clicks over the crafting panel.
- **"Destroy" → "Pick up"** on the placed-object context menu + its event-log line (it
  returns a recoverable item, not a delete). Backpack-stack "Destroy" (a real delete) kept.
- **Relic Forge description** dropped the stale "or combine relics" (combine was removed).

### Previously: Enemy-dmg buff + boss dmg bump + GremlinKing "leaping smash"

The remaining balance half of the 25-min-playtest triage's "light both rebalance"
([[survivor-rpg-playtest-feedback-2026-07-11]]), plus the boss damage bump and the
cleave-replacement design. Number tuning + swapping one attack inside the *existing*
GremlinKing state machine — Sonnet-class work, built on Opus. the user locked the two open
forks via `AskUserQuestion`: cleave replacement = **leaping smash**; scope = **full balance
pass this session**.

**Enemy-dmg buff (gremlin-focused).** The dashboard Balance tab confirmed the "1 dmg/hit in
Lvl 2 armor" complaint was *specifically the gremlins* — flat mitigation
(`max(1, round(dmg − def))`) floored their 8-10 dmg to 1 against Lvl-2 (10) / Lvl-3 (13)
armor, while Boar (25) / Snake (20) still hurt. So the buff is a targeted gremlin bump, not
across-the-board (keeps it "light"): `RangedGremlin` claw **10→15**, projectile **8→11**,
`Gremling` claw **8→12** (`src/entities/Gremlin.ts`). Ordering preserved
(projectile < gremling claw < ranged claw < Snake < Boar); elite ×1.5 scales automatically
(claw→23/18). vs Lvl-2 armor gremlins now chip ~2-5 instead of 1; vs Lvl-3 they trickle to
1-2. Boar/Snake untouched (already threatening; buffing them would be "heavy").

**Boss dmg bump (~2-shot a full-armor player).** `GremlinKing.ts` charge **40→55**, slam
**45→55**, new smash **60** — sized so two hits through full armor (Lvl-3 = 13) roughly kill
a base 100-HP player (e.g. `(60−13)×2 = 94`). All three stay fully telegraphed/dodgeable, so
the threat is "respect the tells," not an undodgeable wall.

**Leaping smash replaces the cleave.** The old 140° forward cleave read as "just a worse
360° slam" (the user). Replaced with a **gap-closer**: at telegraph-start the boss locks the
player's position (clamped to `SMASH_MAX_LEAP` = 380px, like the charge target), draws a
growing **landing-zone marker circle at that locked point** (distinct from the boss's own
position), then leaps to it over `SMASH_LEAP_MS` (300ms) and impacts a 120px AoE + knockback
on landing. It *punishes running away* (the zone chases where you were) — dodge is to step
laterally out of the marked circle during the 780ms telegraph, a genuinely different read
from charge (fixed line, sidestep) and slam (fires where the boss stands). New state plumbing:
`smashTargetX/Y` + `smashLanded`/`smashElapsed`; `checkPlayerHit` gates the AoE on
`smashLanded` so it only connects after the leap arrives (null mid-air). `MELEE_STOP_RANGE`
(was `CLEAVE_RANGE`) is the new approach-stop distance. `BossAttackType` `cleave`→`smash`
throughout; `telegraphMsFor`/`recoverMsFor`/`pickAttack`/`drawTelegraph`/`beginExecute`/
`updateExecuting` all updated.

**Dashboard Enemies tab** (the one hand-mirrored data source) updated: gremlin damages, boss
attack list (Leaping Smash 60 / Charge 55 / Slam 55), and two now-stale "no telegraph" notes
corrected. No `RECIPES.md` change (no recipe/cost changes).

**Verification:** `tsc --noEmit` clean; preview boots error-free. Drove a live-spawned boss
via `preview_eval`: synchronous state-machine walk asserted `checkPlayerHit` returns null
mid-leap and `{60, kb 220}` only after `smashLanded`, plus charge `{55}` / slam `{55, kb 260}`;
a second **async** eval under the real physics loop confirmed the leap actually moves the boss
— it landed exactly on the locked point (`distToTarget: 0`, `movedFromStart: 380` = clamped
max toward a far player). `preview_screenshot` confirmed the landing-zone marker renders as a
distinct offset circle. Live enemies read the new claw damages (Gremlin 15 / Gremling 12,
elites 23/18; Boar 25 / Snake 20 unchanged). Zero console errors.

**Still queued from the triage:** 2 small features — Workbench-placement contextual hint
(`Hints.ts`) and an in-game relic compendium. Then the master-plan tail: **M-TE** (trophy
gear), **M-W1** (multi-biome world).

### Previously: Armor rebalance (3-tier set) + upgrade-menu polish

The armor half of the 25-min-playtest triage's "light both rebalance"
([[survivor-rpg-playtest-feedback-2026-07-11]]). Number tuning + extending the existing
(already-designed) armor-upgrade tables plus UI polish on the shared upgrade menu — Sonnet-class
work, built on Opus. Plan: `.claude/plans/hashed-enchanting-finch.md` (armor-rebalance follow-up
section).

**Armor: 9→16-in-one-tier was too much.** The old Gremlin set leapt the full-set defense from 9
(Lvl 1) to 16 (Lvl 2) in a single upgrade. Reworked into a **3-tier set, flat +1 armor per
tier**, to the user's exact spec:

- Base defenses (`Items.ts`): shirt 4→3, pants 3→2 (cap 2 unchanged). Per-piece per-tier:
  **cap 2/3/4, shirt 3/4/5, pants 2/3/4**.
- Full-set totals: **Lvl 1 = 7, Lvl 2 = 10, Lvl 3 = 13** — verified live via `armorDefenseForTier`.
- `ArmorUpgrades.ts`: existing lvl-2 `defenseBonus` retuned to +1-cumulative; new **lvl-3** rows
  (`resultTier: 2`) added per piece — costs escalate from lvl 2, all still gated on a
  Workbench-Lvl-2 (Tool Sharpener), since no higher Workbench tier exists yet. `deltaLabel` is
  the incremental +1; the stored `defenseBonus` is the cumulative bonus over base (matches
  `armorDefenseForTier`). **No wiring needed** — the UpgradeMenu / `applyArmorUpgrade` path was
  already tier-generic (weapon lvl2/lvl3 already exercised it).
- the user's note: the +1/tier proportional impact shrinks as raw armor numbers climb, so this
  curve is expected to be re-scaled per future biome, not assumed to hold deeper in.

**Upgrade-menu UX polish** (`src/ui/UpgradeMenu.ts` — one menu serves station/armor/weapon
upgrades, so both changes apply to all three):

1. **Timed loading bar before the upgrade lands** — reuses `ProgressBar` (roadmap 5p,
   [[survivor-rpg-timed-bars-gamba-relics]]) with the same commit-at-end + `busy` flag +
   cancel-on-close pattern as craft/process/cook (`UPGRADE_BAR_MS = 500`). Clicking a tier runs
   the bar (`startUpgrade()`) and only calls `deps.apply` — which consumes materials + bumps the
   tier — in the bar's `onComplete`. Every row greys + shows `(Upgrading…)` while it fills;
   closing the menu mid-bar cancels cleanly (nothing consumed). Multi-row tracking via
   `busyUpgradeId` + a `busyRowRect` (baseline rect captured in `renderUpgradeRow`, re-pinned over
   the filling row after render()'s panelY shift).
2. **Already-applied tiers are hidden, not greyed "(Applied)".** `render()` now filters
   `resultTier > target.tier`, so only the next (clickable) tier + any still-locked future tiers
   show. A fully-upgraded piece reads **"Fully upgraded."**; an undiscovered-higher-tier piece
   still reads "No upgrades discovered yet."

**Verification:** `tsc --noEmit` clean; preview boots error-free. Drove the real menu live via
`preview_eval` on an equipped cap with a placed tier-1 Workbench: rows showed Lvl 2 (clickable) +
Lvl 3 (Requires previous tier) with no "Applied" row; clicking played the bar (`busy`/`running`
true, tier still 0 mid-bar); on completion tier bumped 0→1, materials 20→19, and the applied Lvl 2
row vanished leaving only Lvl 3; a second upgrade reached tier 2 → "Fully upgraded."; a mid-bar
`close()` consumed nothing and reset `busy`/tier. `RECIPES.md` armor-upgrades table updated to
match (now lists Lvl 2 + Lvl 3 rows and the 7/10/13 set totals).

**Still queued from the triage:** the enemy-damage-buff half of the rebalance, the boss damage
bump + GremlinKing cleave replacement, and 2 small features (Workbench-placement hint, in-game
relic compendium). Then the master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).


### Previously: M-RL relic economy rework (probabilistic roll + power tiers) + all-elites-drop-trophy

Reworked the M-RL relic economy the user shipped earlier the same day, per a new
locked spec, and did the trophy-drop prerequisite first. Detailed plan:
`.claude/plans/radiant-binding-relic.md` (rewritten). Built on Opus (core-system
rework).

**Part 1 — every elite drops a trophy (prerequisite, standalone).** Reverses the
M-EL2-era "Elite Gremlings drop no trophy" special case. Centralized in base
`Enemy`: `EnemyConfig` gained `elite?: boolean`, and the constructor now does
`this.elite = cfg.elite ?? false` + appends a shared `ELITE_TROPHY_DROP`
(`gremlin_trophy` ×1) to `loot` when elite. `Boar`/`Snake`/`RangedGremlin`/
`MeleeGremling` pass `elite` through to `super({...})` and dropped their own
`this.elite = true` lines; the ranged Gremlin's inline trophy entry was deleted
(no double-drop) and the melee Gremling's stale "do NOT drop a trophy" comment
fixed. Boss unchanged (drops `gremlin_king_fang`, not an elite → no
`gremlin_trophy`). Verified via `preview_eval`: elite Boar/Snake/Gremlin/Gremling
each `rollLoot()` → exactly 1 trophy; ranged elite still 1 (not 2); all normals 0;
King → 1 fang, 0 trophies.

**Part 2 — probabilistic economy (replaces the combine ladder).** Two axes:
- **Rarity** (Common/Uncommon/Rare/Mythic) = effect pool + roll odds,
  **source-determined by the trophy, NOT climbable — no manual combine.**
- **Power tier** (biome depth) = a magnitude multiplier on a relic's numbers
  (`POWER_TIER_MULT`, geometric ×1.0/1.5/2.25/3.375). **Flat ×1.0 this milestone**;
  scaffolding that activates in M-W1.
- **Probabilistic roll:** 1 trophy per attempt; **success chance by rarity — Common
  5% / Uncommon 10% / Rare 100%**; a **failed roll still consumes the trophy**. A
  **per-rarity pity counter** (`PITY_THRESHOLD`, Common 15) guarantees a success
  after N consecutive misses. Trophy map (`TROPHY_ROLL`): `gremlin_trophy →
  Common/tier1`, `gremlin_king_fang → Rare/tier1` (dormant, boss=win).
- **Duplicate auto-stacking replaces combine:** rolling a relic id (at a power
  tier) you own merges into that entry with ×N + aggregated stats — effects were
  always additive (each instance contributes `base × its power-tier mult`).

- **`src/systems/Relics.ts`** rewritten — `RelicInstance {id, powerTier}`,
  `POWER_TIER_MULT`/`powerTierMult`, `RARITY_SUCCESS_CHANCE`, `PITY_THRESHOLD`,
  `TROPHY_ROLL` (`{rarity, powerTier, successChance}`); `RelicManager` holds
  instances + a per-rarity miss counter, `roll(trophyKey, rng)` → a `RollResult`
  (`{success, rarity, id?, powerTier?, pity?}`), `missStreak()`,
  `groupedForDisplay()` (groups by id@powerTier), and the same aggregate getters
  (now summed over instances × power-tier mult). No `add()`/`combine()`/`nextRarity`.
  The 19-relic `RELIC_DEFS` pool is unchanged (only Common is reachable now).
- **`src/ui/RelicForgeMenu.ts`** rewritten — a **roll button per trophy** showing
  `"5% · pity in N"` (or "guaranteed" for Rare), an inline **result line** (forged
  relic name, or "The trophy crumbled to dust — no relic this time"), and a
  read-only owned-relics grid with a **T#** power-tier badge + scaled-number
  tooltips. **Combine bar removed.** `deps.roll` now returns the `RollResult` so the
  menu shows feedback. **`RelicBarUI.ts`** gained a small **T#** power-tier badge +
  power-tier in its grouping signature/tooltip.
- **MainScene** — `rollRelic(trophyKey)` now consumes the trophy **unconditionally**
  (before the roll), announces success or the "crumbled" failure, and returns the
  `RollResult`; `combineRelics` deleted; import `TROPHY_ROLL_RARITY→TROPHY_ROLL`;
  `.grouped()→.groupedForDisplay()`. All the effect hook points (damage/damage-taken/
  stamina/move/maxHP/maxStamina/killHeal/xp) are unchanged from the first ship.

**Verified** — `tsc --noEmit` clean; live `preview_eval`: forced fail (rng 0.99 >
5%) → no relic, miss streak 1, trophy consumed; forced success (rng 0) → Warrior's
Charm T1 added, streak reset; Rare (fang) always succeeds; **pity fires exactly at
attempt 15** (flagged `pity:true`); duplicate rolls → `groupedForDisplay()` "Warrior's
Charm T1 x2", `damageMult` 1.16; scene `rollRelic` consumes a trophy on **both** fail
(5→4, 0 relics) and success (4→3, +1 relic), returns null with no trophy;
`preview_screenshot` of the reworked forge menu (roll button with "5% · pity in 15",
"Forged:" result line, no Combine, T1 badges, ×2 stack) + bottom-left relic bar. No
console errors. (UI-render evals hit a canvas-context-pool exhaustion on the
long-HMR'd tab — an environment artifact that also hit untouched HotbarUI; a page
reload cleared it and the screenshot confirms the layout.) Next per the locked build
order: **M-WC (Gremlin War Camp) + M-TE (trophy-gated gear)**, then **M-W1** last.

### Previously: M-FA cut (design discussion, no code change)

The locked build order's next milestone was M-FA (Fresh Assault: a per-biome decaying
kill-bonus timer starting on entering a new biome). Reviewed with the user before starting
implementation: M-FA's premise already has no real trigger (only one biome exists until
M-W1 ships), and more fundamentally it would be **redundant with M-R1's already-shipped
score formula** — the speed multiplier there already applies only to the final-boss
completion bonus, which is already the "go fast, end-to-end" reward the game wants (locked
decision 4 in the master plan). Rather than build a workaround version (e.g. anchoring the
timer to run-start instead of biome-entry), the user opted to **cut M-FA from the build
order entirely**, revisiting only if M-W1's eventual multi-biome world exposes a real gap
the end-of-run multiplier doesn't cover.

Docs updated to reflect the cut: `.claude/plans/roguelike-metaloop-master-plan.md` (M-FA
section rewritten as "CUT", build-order list updated, header status line), `CLAUDE.md`
(new "5l. M-FA cut" roadmap entry + the umbrella-plan summary paragraph), and this file.
No code changed. Next up: **M-RL (trophy → RNG relics)** — self-contained, builds directly
on the trophy system M-EL2/Group C already shipped.

### Previously: M-EL2 — Generalized elite spawning

New milestone stub inserted into the roguelike meta-loop plan
(`.claude/plans/roguelike-metaloop-master-plan.md`) between M-FA and M-RL, per a
plan-review discussion with the user (locked via `AskUserQuestion`: do this before M-FA,
since M-FA's premise — "decaying bonus on entering a new biome" — has no real biome to
discover until M-W1 ships, while this milestone is self-contained). Built on Sonnet:
extends an already-established pattern (Group C's Gremlin/Gremling elites) to two more
enemy types and a probabilistic roll, rather than introducing new architecture.

- **Boar and Snake now have elite variants**, following the Gremlin/Gremling precedent
  exactly: +50% HP/damage, +10% move speed (`speedMult`), 1.3x scale, 2x loot, and a
  distinct crimson/gold recolor (`boar_elite`/`snake_elite` in `BootScene.ts`). Boar
  previously had no dedicated class — MainScene constructed a bare `Enemy` inline at two
  call sites — so it got a new `src/entities/Boar.ts` (mirrors `Gremlin.ts`'s shape) to
  hold the elite-scaling logic in one place instead of duplicating it. Snake's existing
  class gained an `elite?: boolean` constructor param; its `STRIKE_SPEED`/`FLEE_SPEED`
  velocity calculations previously multiplied only by `envSpeedMult` (the night buff) and
  not `speedMult` at all, so elite Snake's own speed bonus would have been silently
  inert — fixed alongside the elite work.
- **Chance-based elite rolls** replace the old all-or-nothing-per-site model: a new
  `MainScene.rollElite(rng, chanceMult)` helper (base `ELITE_SPAWN_CHANCE = 0.08`) is now
  called at every normal spawn site — `spawnEnemies()` (Boar/Snake/Gremlin/Gremling),
  `spawnAltarDensity()`'s extra gremlin-family spawns, and the M-DN nightfall surge
  (`spawnNightBatch()`, now also spawning Boar/Snake via the new `Boar` class instead of
  its own inline `Enemy` literal).
- **Higher elite chance at night**: `NIGHT_ELITE_CHANCE_MULT = 3` (→ ~24%) applied only in
  `spawnNightBatch()` — a third night effect alongside M-DN's existing speed buff and
  nightfall surge, still no damage buff.
- **Gremlin Shack guards are unchanged** (still hardcoded `elite: true`, not rolled) — per
  the open sub-decision noted in the master plan, they stay a deliberate fixed difficulty
  spike guarding a chest rather than folding into the probabilistic system.
- Kill-scoring needed **zero changes** — `MainScene`'s kill-category classifier already
  reads the generic `enemy.elite` field (`Run.ts` scoring), so Boar/Snake elite kills
  automatically count as `"elite"` kills same as Gremlin/Gremling always did.

Verified via `preview_eval`: spawned the world and confirmed elite Boar/Snake instances
carry correct stats (Elite Boar: 30 HP / 38 bite dmg / scale 1.3 / texture `boar_elite`;
Elite Snake: 17 HP / 30 bite dmg / scale 1.3 / texture `snake_elite`) and doubled loot
rolls (`rollLoot()` → 2/2 instead of 1/1). Ran `spawnNightBatch()` 30x (180 spawns) and
measured an observed 23.9% elite rate against the expected 24% (8% × 3). `tsc --noEmit`
clean, no console errors.

Two smaller backlog items flagged in the same review pass (not yet built, see
`CLAUDE.md`'s 2026-07-10 "second round" note): Gremlin Shacks should get the same minimap
landmark the Boss Altar already has, and interactables should show a hover highlight
border. Next per the locked build order: **M-FA (Fresh Assault discovery timer)** — a new
core mechanic, needs Opus, though its single-biome scope should be revisited before
starting (see the master plan's M-FA note).

### Previously: Comfort item (Bedroll) — replaces M-SB Sleep/Bed

Fourth milestone slot of the roguelike meta-loop (`.claude/plans/roguelike-metaloop-master-plan.md`),
after M-FX/M-R1/M-DN. Plan: `.claude/plans/imperative-riding-island.md`. Built on Sonnet
per the model-switch convention (a small, self-contained addition on top of already-designed
systems — placement, `Health`, `BuffManager` — not a new core mechanic).

The master plan's original M-SB was "Sleep + Bed, fast-forward to dawn." Discussed with the
user first: night is one of the run's few real sources of time pressure (M-DN's faster
enemies + nightfall surge), and a free skip-to-dawn would let players opt out of it every
night, so **the sleep/skip mechanic was dropped entirely**. Replaced with:

- **New placeable `comfort`** ("Bedroll" — "stuffed with reeds for cushioning"), tier 0
  (`src/systems/Items.ts`, `src/systems/Recipes.ts`), costing `{ wood: 3, cattail: 5 }` —
  reuses the existing `cattail` harvestable as the "reeds," no new raw resource. New
  placeholder texture in `BootScene.ts` (`icon_comfort`), doubles as the buff icon.
- **Live/conditional HP regen, +1 HP/s** (weaker than the weakest food buff, Cooked Boar
  Meat's +2 HP/s, so cooking still matters) — checked every frame in the new
  `MainScene.updateComfortRegen()`, no stillness required:
  1. Player within `COMFORT_RANGE` (80px) of a placed Bedroll.
  2. That Bedroll within `COMFORT_CAMPFIRE_RANGE` (120px) of a placed Campfire — **a hard
     requirement**, independent of Bedroll's own tier-0 craft-gating (tier 0 only means "no
     Workbench needed"; Comfort still does nothing without a lit fire nearby). New
     `isNearCampfire()` helper, copied from the existing `isNearWorkbench` pattern.
  3. No live enemy (aggro'd or not — simplest "safe area" read) within
     `COMFORT_SAFE_RADIUS` (350px) of the player. New `isEnemyNearby()` helper.
- **Reuses `BuffManager`/`BuffBarUI` directly instead of a new heal call + new HUD
  element** — every qualifying frame re-applies a short-lived (`durationMs: 400`)
  `comfort_rest` buff via the existing refresh-by-id `apply()` path; the instant a
  condition breaks, the scene stops calling `apply()` and the buff expires on its own
  within that same short window. This gets the "Resting" icon + `+1 HP/s` tooltip +
  depletion-meter look **for free**, identical to a food buff, with zero new UI code.
  `BuffManager`'s concurrent-buff cap raised 2→3 (`this.buffs.setMaxBuffs(3)` in
  `create()`) so Comfort doesn't get evicted by two simultaneous food buffs.
- **Destroy/recover needed zero new wiring** — the existing right-click context menu
  (`findPlacedObjectNear`/`destroyPlacedObject`) is already itemKey-agnostic, and
  `stationDisplayName()` already falls back to the plain item name when an itemKey has no
  upgrade table, so Comfort "just works" as a destroyable/recoverable placed object.

Verified live via `preview_eval`: placed a Campfire + Bedroll, confirmed the
`comfort_rest` buff (id/hpPerSec/refreshing `remainingMs`) appears while all three
conditions hold; independently broke each condition (player far from Bedroll, Bedroll far
from Campfire, a live enemy within `COMFORT_SAFE_RADIUS`) and confirmed the buff clears
each time, then confirmed it resumes when the condition is restored. `preview_screenshot`
confirmed the "Resting" icon renders in the existing buff bar above the HP bar, same visual
treatment as a food buff. One test-methodology note for future sessions: teleporting an
enemy far outside world bounds to "remove" it for a test gets silently undone by Arcade
Physics' `collideWorldBounds` clamp (it snaps back near the map corner, which can land
close to the player) — use `enemy.depleted = true` instead, which `isEnemyNearby()`
already skips regardless of position. `tsc --noEmit` clean, no console errors.

`RECIPES.md`, `CLAUDE.md` (roadmap 5j), and the master plan's M-SB entry updated to reflect
the supersede. Next per the locked build order: **M-FA (Fresh Assault discovery timer)** —
a new core mechanic, needs Opus.

### Previously: M-DN — Day/Night cycle (clock, night threat, torch lighting)

Third milestone of the roguelike meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`), after M-FX and M-R1. Plan:
`.claude/plans/clever-sparking-gem.md`. Built on Opus per the model-switch convention (a
new core mechanic — a global clock + night state machine + a lighting layer). The
survival-time layer later milestones hang off (M-SB sleep-to-dawn, M-FA reads in-game time).

- **`src/systems/DayNight.ts`** (new, framework-free like `Run`/`Health`/`Buffs`) — the
  clock. **10 min day + 5 min night** (15-min cycle, run starts at dawn), ticked with
  `delta` from `MainScene.update()` so it freezes exactly when the run does. `phase()`/
  `isNight()`/`dayNumber()`, `enemySpeedMultiplier()` (binary: 1 by day, **1.15** at night),
  and `nightIntensity01()` (0 in full day, ramps 0→1 over a 20s dusk window, 1 through deep
  night, 1→0 at dawn — drives the tint alpha only). Verified live: the four phase samples +
  the dusk/dawn ramp all compute exactly (midday 0, dusk-mid 0.5, deep night 1, dawn 0.25).
- **Night enemy speed (locked: slightly faster, no damage buff)** — new public
  `Enemy.envSpeedMult` (default 1), assigned each frame in `updateEnemies()` from
  `dayNight.enemySpeedMultiplier()` and multiplied into every aggressive-movement velocity
  (base `Enemy` chase, `RangedGremlin` kite/pursue, `MeleeGremling` chase, `Snake`
  strike/flee — idle *wander* deliberately left at base speed). **GremlinKing is exempt with
  zero special-casing** — its overridden `update()` never reads the field. Verified live: a
  chasing Boar's body speed went 60 (day) → 69 (night), exactly ×1.15.
- **Nightfall surge + dawn cleanup (locked bound against density creep)** — at each
  day→night edge `spawnNightBatch()` drops ~6 normal enemies (2 Boar / 2 Snake / 2 Gremlin)
  into still-fogged cells in a 500–850px ring around the player (new
  `pickNightSpawnPoint()`, biased to `!fog.isRevealed()` non-creek cells; new `Fog.isRevealed()`),
  tracked in `nightSpawns`. At the night→day edge `cleanupNightSpawns()` destroys any tracked
  spawn that **never aggro'd and is off-screen**, so density returns to baseline every
  morning and can't creep upward over a long run; ones that engaged (or are on-screen) stay
  and fold into the roster. `Enemy.isAggro()` promoted `protected`→`public` for the filter.
  Surge only fires while alive; both edges run from a shared `updateDayNight()` called in the
  alive *and* dead branches of `update()`. Verified live: forcing the edge grew the roster by
  6 (all 6 in fogged cells, 560–850px out); forcing dawn with 5 idle+off-screen removed
  exactly those 5 and kept the 1 chasing one.
- **Torch lighting (added this pass, user request)** — the night visual is a light-**mask**,
  not a flat tint. `src/ui/NightOverlayUI.ts` (new) is a full-screen `RenderTexture` filled
  with dark blue at `nightIntensity01() × 0.42`, from which soft radial light circles are
  *erased* (new `light_soft` canvas-gradient texture in `BootScene`). Lights: the player
  when a **Torch** is the held hotbar item (`equippedLightRadius`, data-driven per item in
  `LIGHT_RADIUS_BY_ITEM` so a future Lantern just adds a row — torch 180px), plus each
  on-screen **Gremlin Shack / Boss Altar** (150px). Torch is now **non-stackable**
  (`maxStack: 1`). `collectLights()` computes screen-space holes (camera zoom 1). Depth ~2700
  sits above the world but below the minimap/HUD, so only the world dims. Verified live:
  torch equipped → one player light at screen-center r180 (0 when deselected); camera on a
  shack → 3 POI lights r150; screenshot shows a clean readable light pool on the player in a
  dimmed world.
- **HUD/minimap** — `RunHudUI` prefixes `[Day N]`/`[Night]`; `MinimapUI.setNightIntensity()`
  fades a light dark-blue overlay over the minimap panel (below the player marker).
- **Reset** — `create()` resets `dayNight`/`wasNight`/`nightSpawns`/`equippedLightRadius` per
  the standing `scene.restart()`-doesn't-re-run-field-initializers gotcha (M-R1's freeze
  bug). Verified: New Run → clock back to dawn, no carried-over night state.

**Verified** — `tsc --noEmit` clean; live `preview_eval` for every bullet above;
`preview_screenshot` of the torch-lit night; `preview_console_logs` clean. Next per the
locked build order: **M-SB (Sleep/Bed)**.

### Previously: M-R1 playtest fixes — New Run freeze, Clear Scores, boss tuning

First real playtest of M-R1 (14:17 run, max spear + max Gremlin armor, 6 elite kills, 1
boss kill at player level 5, score 3170) surfaced a real bug plus balance feedback. Built
on Sonnet (fixes on an existing system, no new mechanic).

- **"New Run" froze the game — real bug, not a preview quirk.** `MainScene.create()`'s
  M-R1 reset only covered `runOver`/`isDead`/`run` (see below), but `this.enemies`,
  `this.nodes`, `this.obstacleNodes`, `this.placedObjects`, `this.gremlinShacks`,
  `this.bossAltars`, `this.dryingRacks`, `this.placedLabels`, `this.discovered*` Sets, and
  every per-run **system** (`Skills`, `PlayerProgression`, `Crafting`, `backpack`
  `ItemContainer`, `Hotbar`, `Equipment`, `EventLog`, `Stamina`, `Health`, `BuffManager`)
  are all field-initialized **once at construction** and — per the standing
  `scene.restart()`-doesn't-re-run-field-initializers gotcha — silently carried over into
  the "new" run. `this.enemies` etc. specifically still held references to GameObjects the
  scene shutdown had already destroyed; the first `update()` tick of the new run iterated
  them and threw, freezing the game loop entirely (confirmed via `window.__game.loop.frame`
  staying static across ticks — a genuinely stuck rAF, not the documented backgrounded-tab
  preview quirk, which was a red herring encountered while first investigating this). Fix:
  `create()` now explicitly resets every one of those fields at the top, so "New Run" is
  the clean full reset (fresh character too — Skills/Progression/inventory/equipment all
  reset, only the localStorage high-score table survives) the original M-R1 plan doc always
  said it should be. Verified live: killed a run with 102 live enemies, clicked New Run,
  confirmed `window.__game.loop.frame` kept advancing afterward and the world was fully
  playable (screenshotted).
- **"Clear Scores" button** — `HighScores.clearHighScores()` (new, wipes the
  `localStorage` key) wired to a `[ Clear ]` link on `RunEndUI`'s high-score table header;
  `MainScene.showRunEndUI()` factored out of `endRun()` so the button can re-show the same
  screen with an emptied table without a full run restart.
- **Boss tuning** (`GremlinKing.ts`, all playtest-driven, first-pass numbers): cleave
  range 70→90 / arc 120°→140° / damage 22→30; **charge (the "line attack") speed
  340→480** (telegraph duration left alone — the dodge window stays readable, only the
  punish for not dodging got harsher); slam radius 110→150 / damage 35→45; attack
  cooldown 1200→950ms (less passive between attacks). The player's playtest was with
  max-tier gear (max spear, full Gremlin armor set) and no numeric baseline for "boss
  damage taken" was captured, so these are directional bumps to retest, not a tuned-to-a-
  target-DPS pass.

**Verified** — `tsc --noEmit` clean; live `preview_eval` (see New Run section above);
`preview_console_logs` clean.

### Previously: M-R1 — Run + Score + Hardcore Death

Second milestone of the roguelike run/score meta-loop
(`.claude/plans/roguelike-metaloop-master-plan.md`; detailed plan:
`.claude/plans/rustling-weaving-lovelace.md`), built on Opus per the model-switch
convention (new core mechanic). The run container the whole meta-loop hangs off:
a seed-stamped run with a live clock + score, hardcore permadeath, a boss-kill win
condition, and the game's **first localStorage save** (high-score table only).

- **`src/systems/Run.ts`** (new, framework-free like `Health`/`Buffs`) — owns a
  display-only `seed`, ticked `elapsedMs`, a kill tally (`normal`/`elite`/`boss`), and a
  pure `score()`. **Score formula (first-pass, all tunable):** flat kill points
  (`normal 10 / elite 30 / boss 500`) + a **completion bonus** (`2000`, win only) scaled
  by a **speed multiplier** (`clamp(10min / elapsedMs, 1, 3)`) applied to the bonus only.
  So a fast final-boss kill (mult ×3) dominates a slow full-clear, and grinding kills
  (flat) can't out-scale it — the master plan's core scoring constraint. Death score =
  kill points only; win score = `round(2000 × speedMult + killPoints)`.
- **Seed is display-only for now** (locked): generated + shown + recorded per run, but
  "New Run" just `scene.restart()`s with fresh RNG. True deterministic world-gen from a
  seed is deferred to M-W1 (which reworks world-gen anyway) — avoids refactoring every
  existing `Phaser.Math.Between` spawn/loot call.
- **`src/systems/HighScores.ts`** (new — first `localStorage` use anywhere) —
  `loadHighScores()` / `recordHighScore()`, key `survivor-rpg:highscores:v1`, sorted desc,
  capped at 20, tolerant of a missing/corrupt store (returns `[]` on any parse error).
  Returns the just-posted entry's 1-based rank for highlighting.
- **Hardcore death** (`HARDCORE = true` const, MainScene) — `onPlayerDeath()` now ends the
  run instead of respawning (after the existing ~2s death beat). The legacy
  `respawnPlayer()` path stays live behind the flag — the documented future "easy-mode"
  hook (master plan decision 3); nothing toggles it yet.
- **Win** — `tryAttackEnemy()`'s kill path classifies the kill (`GremlinKing` → boss, the
  `Enemy.elite` flag → elite, else normal) into `run.recordKill()`; a `GremlinKing` kill
  fires `endRun("won")` after a 1.2s beat so the death feedback plays first. (`elite` is
  now a readable field on `Enemy`, set by the two elite Gremlin constructors.)
- **`endRun(outcome)`** — freezes the world (a new `runOver` guard early-returns from
  `update()`), posts the `ScoreEntry`, and shows the run-end screen. Guarded against
  double-posting (e.g. dying during the post-win delay). `create()` now explicitly resets
  `runOver`/`isDead` and builds a fresh `Run`, since `scene.restart()` re-runs `create()`
  without re-firing boolean field initializers.
- **`src/ui/RunEndUI.ts`** (new, modeled on `CharacterMenu`'s flat-GameObject /
  `scrollFactor(0)` pattern, depth 3500-3502 above every in-game menu) — full-screen
  scrim + panel: **VICTORY!** (green) / **YOU DIED** (red) title — the one sanctioned
  red/green use per the reserve-red/green convention — final score, a breakdown block
  (time, kills, elite/boss, level, kill points, and on a win the completion bonus + speed
  mult), a top-5 high-score table (this run's row highlighted), and a **New Run** button
  (`scene.restart()`).
- **`src/ui/RunHudUI.ts`** (new, fixed-HUD depth 2820, top-left) — live run clock + score,
  minimizable to just the clock via **J** (new keybind, added to the Keybinds panel).
  KeybindsUI's panel nudged down (`PANEL_Y` 10→44) to clear it; EventLogUI follows
  automatically (anchored to the panel's top).

**Verified** — `tsc --noEmit` clean; live `preview_eval`: kill-point math exact
(`2×10 + 30 = 50`), forced death → `runOver`, YOU DIED screen (screenshotted), score
posted to `localStorage`; forced win → VICTORY! (only title in the display list),
fast-win score `510 + 2000×3 = 6510` exact, slow-win speed mult clamps to 1; New Run →
fresh run (kills 0, new seed, unfrozen) with scores persisted; HUD toggle collapses to
clock-only. No console errors. (Screenshots of the win screen were blocked by the known
paused-render-loop quirk — the live display list was authoritative instead.)

### Previously: M-FX — roguelike-batch warm-up fixes (fractional damage, chest re-arm, stat-panel recolor)

First milestone of the new roguelike run/score meta-loop plan
(`.claude/plans/roguelike-metaloop-master-plan.md`) — three small, independent fixes
surfaced while designing that plan, built on Sonnet per the model-switch convention
(fixes on existing systems, no new mechanic).

- **Weapon damage is now kept fractional all the way to `Enemy.takeHit()`.**
  `MainScene.tryAttackEnemy()` used to `Math.round()` damage before applying it, which
  silently discarded a weapon skill's +0.5%/level bonus whenever it didn't cross a whole
  number (e.g. Blunt lvl 10 on a base-5 weapon rounds right back to 5 — the bonus existed
  in the multiplier but had **zero actual effect** on the hit). Now the float is applied
  directly to `enemy.health` (a plain `number`, no type change needed) and only the
  floating damage-number popup rounds for display (`Math.round(dmg)` in
  `spawnDamageNumber`'s call site) — every skill level now has a real, cumulative effect
  even when two consecutive hits show the same displayed number. Verified live: a Stone
  Club hit at Blunt lvl 4 (mult ×1.02) dealt exactly 5.1 real damage (20 → 14.9 HP) while
  still displaying "5".
- **Gremlin Shack chest re-arm timing fixed** — `LootContainer.rearmIfEmpty()` was called
  from `MainScene.onShackGuardKilled()` at guard-*death* time, which let a player loot an
  emptied chest, kill the guards, and get an **immediate** fresh roll before the 6-minute
  respawn timer ever elapsed (the doc comment claimed it fired "once both guards respawn,"
  which was never true). The call moved into `respawnShackGuards()` itself, firing only
  when the guards actually come back. Verified live: killing both guards leaves
  `loot['rolled'] === true` (chest stays claimed-empty, no early re-roll); calling
  `respawnShackGuards()` is what flips it back to `false`.
- **Character menu Stats tab recolored off green** — green (`#8fe38f`) was used for
  "Unspent points" and the `[ + ]` allocate button (plus the Skills tab's "MAX" label);
  per the user, green/red should be reserved exclusively for buff/debuff markers (e.g.
  "boosted by an item") added later, so these are now neutral amber (`#e3b25a`) — same
  color already used for skill-group headers, so it reads as "info/action," not "buffed."
  Verified via `preview_screenshot`: the Stats tab with 3 unspent points shows amber
  throughout, no green.
- **Inventory (Tab) Combat column also recolored off its red/green rainbow** — the
  actual panel the user meant (the live equipped-stats readout next to Equipment in the
  Inventory menu, not the Character menu's Stats tab above — both got fixed). `Damage`
  was red (`#c25a5a`), `Armor` was green (`#7ac27a`), `Attack Speed`/`Attack Stamina` had
  their own cyan/gold — a decorative per-line rainbow with no actual meaning. All five
  stat lines (`InventoryMenu.renderCombatStats`) are now one neutral grey (`#8a93a3`,
  matching the already-bland Attack Range/Move Speed lines), freeing red/green for real
  buff/debuff deltas later. Verified via `preview_screenshot`: a Stone Club equipped
  shows "Damage: 5 Blunt" / "Attack Speed: 1.8/s" / "Attack Stamina: 14" / "Armor: 0"
  all in matching grey.

Type-check clean (`tsc --noEmit`), no console errors, `preview_screenshot` confirms the
recolored Stats tab. See the master plan doc for the full roguelike milestone list (M-R1
Run/Score/Hardcore death next, then Day/Night → Sleep/Bed → Fresh Assault timer → Relics →
Gremlin War Camp/trophy gear → circular world last — locked build order, confirmed by
the user).

### Previously: Cooking & Food Buffs (first food/consumable loop + first status-effect system)

The first food loop and the game's first **status-effect (buff)** system. Plan:
`.claude/plans/savory-simmering-hearth.md`. Built on Opus per the model-switch
convention (a new core mechanic — buff state machine + a new station interaction).
Locked design decisions (from the user this session):

- **Eating = a timed HP-regen buff only** — no instant heal (the user dislikes
  spam-insta-heal). Each food defines its own `hpPerSec` + `durationMs`; the buff
  heals over time and expires. Overheal at full HP is simply wasted (a natural
  anti-spam property). No HP *regen system* beyond buffs, no hunger meter.
- **Cooking is instant + station-based** — interact with a placed campfire → a
  cook menu → produce the dish now. No cook-over-time timer.
- **Foods this pass:** **Cooked Boar Meat** (`boar_meat` + `shishkabob` at any
  campfire → +2 HP/s for 20s) and **Bramble-Glazed Boar Skewer** (`boar_meat` +
  `blackberry` ×2 + `shishkabob`, at a **Lvl 2 campfire** → +3 HP/s for 30s).
- **Campfire is now upgradable to Lvl 2** (the "Stone Hearth" upgrade, **4 Twine
  + 20 Stone**) which unlocks the tier-1 dish.

New systems/UI:

- **`src/systems/Buffs.ts`** (`BuffManager`) — framework-free (no Phaser), like
  Health/Stamina. `apply(spec)` (re-applying the same food id refreshes duration
  rather than stacking; different foods run concurrently and their HP/s add up),
  `tick(delta, health)` (heals per active buff, drops expired, returns
  `{healed, changed}`), `active()`, `clear()`. `MainScene.update()` ticks it;
  refreshes the HP bar only when it actually healed.
- **`src/ui/BuffBarUI.ts`** — a centered row of food-buff icons just above the HP
  bar (icon = the food's own texture), each with a thin green depletion meter and
  a hover tooltip (name, HP/s, seconds remaining). Rebuilds the icon row only when
  the active *set* changes; updates meters/tooltip every frame. Depth 2803-2806
  (clears WORLD_H, below the 3000+ panels).
- **`src/systems/Cooking.ts`** (`COOK_RECIPES` + `canAffordCook`) — a small,
  self-contained multi-ingredient cook table (deliberately NOT a `RecipeCategory`
  in Recipes.ts, since cooking is a station interaction and this leaves room for a
  dedicated cooking station later). Each recipe gates on the campfire's own tier.
- **`src/ui/CookingMenu.ts`** — opened by clicking a placed campfire; a recipe
  LIST (unlike the Drying Rack's single-input slider, since dishes are
  multi-ingredient) showing each dish's ingredients (have/need, colored), buff
  summary, and a Cook button. Self-contained (no drag/drop) — a Cook click
  consumes straight from the backpack. (Initial ship showed higher-tier dishes
  dimmed with a "Requires Campfire Lvl N" note; superseded same-session — see
  the follow-up below, dishes above the open campfire's tier aren't listed at
  all.)

Wiring (`MainScene.ts` + others):

- **Eating gesture:** right-click an `edible` item (new `ItemDef.edible` field) in
  the backpack or hotbar eats one — wired into `InventoryMenu`/`HotbarUI`'s
  existing right-button branches (before the weapon/placeable checks). Foods are
  `hotbarable` so they can sit in the hotbar for quick eating. `Tooltip.ts`
  derives the "Effect: +X HP/s for Ns" line from `edible` (single source of truth).
- **Campfire hover/interact:** folded into the same placedObjects hover loop as
  the Workbench (distinguished by `itemKey`), a new `promptForCampfire()` →
  `"[LMB] Cook"`, and a `tryInteract()` branch → `openCookingMenu()`. Added to
  `anyMenuOpen()`, the Escape handler, every menu-open close-all site, and
  `destroyPlacedObject()` (destroying the open campfire closes its menu).
- **Campfire upgrade** reuses `StationUpgrades.ts` + the generic right-click
  Upgrade/Destroy popup wholesale — "Campfire Lvl 2" label, tier-survives-Destroy,
  and discovery-on-ingredients-known all work with **zero** new upgrade wiring
  (just the one `stone_hearth` table entry). New food + campfire-dish tables added
  to `RECIPES.md`.
- **Death clears active buffs** (`onPlayerDeath`), and the buff HUD re-syncs.

**Same-session playtest follow-up (6 tweaks):** (1) cook recipes are now
**discovered** (recipe-unlock toast, `discoverCookRecipeIds`) — Cooked Boar Meat on
first campfire placement, the Skewer on first upgrade to Lvl 2; (2) the cook menu
now **lists only dishes at/below the open campfire's tier** (the Skewer isn't shown
at all until Lvl 2, no more dimmed "Requires Lvl 2" row) and the panel resizes to
the visible rows; (3) the Stone Hearth upgrade now costs **4 Twine + 20 Stone**;
(4) **right-click → Destroy no longer falls through to reopen the station's menu**
(Campfire *and* Workbench) — the generic `openContextMenuForObject` now sets
`suppressNextPointerdown` in its Upgrade/Destroy handlers, since the ContextMenu row
closes the popup before running onClick and the same click's scene pointerdown fired
afterward with the menu already closed; (5) food in the hotbar can now be eaten by
**selecting it + left-clicking** (open ground; skipped when hovering a node so
gathering still works) in addition to right-click; (6) a **max of 2 concurrent food
buffs** (`BuffManager.maxBuffs`, settable for future items) — a 3rd distinct buff
evicts whichever active buff has the least time left.

Verified via `preview_eval` + `preview_screenshot` (type-check clean, no console
errors): cook menu opens on the campfire; Cooked Boar Meat cooks at tier 0
(consuming 1 skewer + 1 meat); the Skewer is blocked at tier 0 and cooks only
after the tier bumps to 1 (consuming 2 berries); eating a Cooked Boar Meat at 40
HP applies a +2 HP/s buff, decrements the stack, and HP climbs +2 over ~1.2s;
re-eating refreshes the timer to 20s without a second buff entry; the buff HUD
icon + green meter render above the HP bar with a working "Cooked Boar Meat / +2
HP/s · 20s left" hover tooltip; death clears all buffs;
`promptForCampfire` reads "[LMB] Cook" in reach / null out of reach; the Stone
Hearth upgrade is present in the shared table.

Follow-up tweaks verified separately via `preview_eval` (no console errors):
`discoverCookRecipes(0)` announces only Cooked Boar Meat, `(1)` adds the Skewer;
the cook menu's `panelH` grows from a 1-row to a 2-row layout going tier 0 → 1
(dish list length changes, not just visibility); triggering Destroy via the
context-menu's row `pointerdown` sets `suppressNextPointerdown` and leaves both
the placed object gone and the cook menu closed (no reopen); selecting a food
slot and calling `tryInteract()` with nothing hovered eats it and applies the
buff; applying 3 distinct buffs (5s/9s/9s remaining) leaves only the 2 with the
most time left active, confirming the least-remaining-first eviction.

### Previously: Second post-boss playtest batch, Group C — Elite Gremlins + Trophy-gated Totem

Third and final batch of the second Gremlin King playtest feedback (locked order
A → B → C — all three now shipped). Plan: `.claude/plans/witty-drifting-aurora.md`. The
biggest of the three: the game's first **Elite enemy variant** concept, plus a rework of
the Gremlin Totem's craft gate from a skill level to a hard-won trophy currency. Built on
Opus per the model-switch convention (a new mechanic, not just UI/tuning).

- **Elite Gremlins are the Gremlin Shack guards** — and *only* the shack guards. Every
  shack's 1 ranged + 1 melee guard is now elite (**+50% HP, +50% damage, +10% move speed,
  1.4x scale, distinct crimson/gold texture**). Gremlins anywhere else — including
  `spawnEnemies()`'s roster and `spawnAltarDensity()`'s altar-camp extras — stay normal.
  Hooked in via a single `elite: true` on both `new RangedGremlin`/`new MeleeGremling`
  calls in `MainScene.respawnShackGuards()`, the one shared spawn path for both the
  initial spawn and every 6-minute respawn cycle. 5 shacks × 2 guards = 10 elites in the
  world at once (respawning). Since 2 of the 5 shacks already bias near the Boss Altar,
  an altar-proximity elite cluster still falls out naturally — the tougher content marks
  the approach to the boss.
- **Elite variant model** — an opt-in `elite?: boolean` on both `RangedGremlin` and
  `MeleeGremling` constructors (`src/entities/Gremlin.ts`). No AI/state-machine change:
  the flag only swaps texture/displayName, multiplies `maxHealth`/`biteDamage` by 1.5
  (rounded), doubles each base loot entry, appends `{ gremlin_trophy: 1 }` **on the ranged
  Elite Gremlin only** (the melee Elite Gremling drops no trophy — user decision; **superseded
  by the M-RL economy rework: ALL elites now drop a trophy, centralized in `Enemy` — see the
  top entry**), and sets a new
  `protected speedMult` (`Enemy.ts`, default 1 → 1.1 for elites) that the two AIs multiply
  into their chase/pursue/kite speeds. Bigger `setScale(1.4)` is the tint-proof visual
  tell (hit-feedback `setTint` recolors the base texture during combat, same as every
  enemy). `MainScene.enemyReach()` already scales attack/prompt reach with sprite radius
  (post-boss batch), so the larger elite hitbox is covered with zero special-casing —
  same principle as the earlier Gremlin King reach fix. The kill path
  (`tryAttackEnemy` → `rollLoot` → `spawnLooseDrop`) and `onShackGuardKilled` (matches by
  object identity) needed no changes.
- **New resource `gremlin_trophy`** — `ResourceType` (`Inventory.ts`), `ITEM_DEFS`
  (`Items.ts`, `maxStack: 99`, non-hotbarable), and generated textures in `BootScene.ts`
  (`icon_gremlin_trophy` inventory/loose-drop icon + `gremlin_elite`/`gremling_elite`
  enemy sprites, all palette-consistent crimson/gold).
- **Gremlin Totem recipe reworked** (`Recipes.ts`) — cost changed from
  `{ gremlin_leather: 4, gremlin_guck: 3, bones: 8, twine: 4 }` +
  `light_armor` lvl-3 gate to **`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`** with
  the skill gate removed (`requiredSkills: []`). Stays tier 1 (Workbench-gated to craft);
  discovery now keys off owning the ingredients — the trophy is the meaningful gate. So
  the difficulty ramp toward the boss (killing elites) and the means to summon it are the
  same content loop. `RECIPES.md` updated to match.

Verified via `preview_eval`: elite `RangedGremlin` = HP 48/dmg 15/scale 1.4/speedMult
1.1/texture `gremlin_elite`, loot = 2 skin + 2 blood + 1 trophy; elite `MeleeGremling` =
HP 18/dmg 12, loot = 2 blood (no trophy); both normals unchanged (HP 32/12, scale 1, no
trophy). All 5 shacks' guards read as elite (10 elites), 40 map gremlins stay normal —
only the 5 ranged elites drop trophies (still ≥ the 3 a Totem needs). The
Totem recipe unlocks once its 3 ingredients are discovered + a Workbench placed, exposes
`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }` / `requiredSkills: []` / tier 1, and is
affordable with 3 trophy + 1 wood + 1 guck. Type-check clean (`tsc --noEmit`), no console
errors, `preview_screenshot` confirms crimson elite guards at the shack vs green gremlins
elsewhere. **With Group C shipped, the entire second-playtest A → B → C batch is done.**

### Previously: Second post-boss playtest batch, Group B — HUD & stats display

Second of three grouped batches off the second Gremlin King playtest (locked order
A → B → C). Plan: `.claude/plans/group-b-hud-stats-display.md`. Pure display/wiring
work on top of already-designed systems (bar geometry, a new derived-stat readout) — no
new state machine or data model, so this batch stayed on Sonnet per the new
model-switch convention (see `CLAUDE.md`'s "Working conventions").

- **HP/Stamina bars now grow proportionally with max pool, capped at hotbar width.**
  Both bars used a hardcoded `barW = 76` and only rescaled the fill; the background
  rect was never stored so it couldn't resize. New `MainScene.layoutBar()` helper
  repositions/resizes both bg and fill (plus re-centers the label) from a computed
  `statBarWidth(max)` = `round(76 * max/100)`, clamped to `[76, hotbarUI.width]` (408px).
  `healthBarBg`/`staminaBarBg` are now stored fields. Verified: 20 Vitality + 20
  Endurance points widen both bars to 91px, still centered; artificially pushing max to
  720 clamps the bar at exactly 408px (the hotbar's own width).
- **XP bar relocated from "stacked above HP/stamina" to directly under the hotbar**,
  spanning its exact width. `HotbarUI` gained `width`/`left`/`bottom` getters and its
  `BOTTOM_MARGIN` (was an inline `14`) bumped to `34` to open clearance beneath it.
  HP/stamina bars, still anchored off `hotbarUI.top`, rose automatically since raising
  the hotbar moved `top` too — no separate reflow needed. Verified: XP bar geometry is
  `x === hotbarUI.left`, `width === hotbarUI.width`, `y === hotbarUI.bottom + 4`.
- **Run Speed breakdown** — new `MainScene.runSpeedBreakdown()` (walk/sprint/
  sprintMultiplier/runningLevel/runningBonus/itemBonus, the last always 0 today — no
  speed items exist yet), read by the inventory Combat column's compact
  "Move Speed: 95 / 166 spr" line (`RunSpeedView` interface, `InventoryMenu.ts`).
  `Player.ts`'s private `SPEED` constant is now exported `PLAYER_WALK_SPEED`.
- **Damage broken out by type** in the Combat column — new `Weapons.
  damageTypeDisplayName()`; `CombatStatsView` gained `damageTypeName`, and the Damage
  line now reads e.g. `Damage: 8 Pierce` instead of a bare number.
- **New Attack Range stat line** in the Combat column — `CombatStatsView.attackRange`
  reads the module-private `REACH` constant directly (64px today).
- **Same-day follow-up, per the user:** Run Speed moved off a standalone Stats-tab
  block and into the **Skills tab**, as the Running skill's own hover tooltip — and
  **every** skill row is now hoverable (not just the 5 weapon skills + Running), each
  showing its **live-computed current impact**, not a static per-level rate.
  `Skills.skillImpactDescription(skill, skills)` now takes the live `Skills` instance
  and returns e.g. `"+0.5% weapon damage per level — currently +4.5% at Lvl 9"` for a
  weapon skill, `"+0.5% sprint speed per level — Walk 95 / Sprint 187 (x1.97) at Lvl
  44"` for Running (reads `PLAYER_WALK_SPEED` directly, no more `CharacterMenuDeps`
  plumbing needed for it), and `"No combat/gather effect yet — recipe gate only"` for
  every skill with no wired mechanical effect (chopping/mining/heavy_armor/light_armor/
  blocking) — previously those 6 skills had no hover tooltip at all. `CharacterMenu`'s
  tooltip text object gained `wordWrap: { width: 300 }` since the live-computed strings
  run longer than the old static ones.

Verified via `preview_eval`: `import()`-ing `Skills.ts` directly and calling
`skillImpactDescription` for all 11 `SKILL_TYPES` against a live `Skills` instance
(Blunt lvl 9, Running lvl 44) returns correct per-skill strings, including the exact
"Sprint 187 (x1.97)" figure the old Stats-tab breakdown used to show; emitting a real
`pointerover` on the Running row's hit-rectangle sets the on-screen tooltip to that same
text and makes it visible; same for a zero-effect skill (Chopping), confirming the "no
effect yet" message renders correctly.

Verified via `preview_eval` + `preview_screenshot`: all of the above, plus both the
Inventory (Tab) Combat column and Character menu (K) Stats tab render cleanly with no
overlap in a live screenshot. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Second post-boss playtest batch, Group A — quick fixes

First of three grouped batches off a second Gremlin King playtest (player beat it at
lvl 5, Blunt 5/Pierce 10/Light Armor 5/Running 3/Chopping 4, max-lvl Primal Spear).
User locked the order via `AskUserQuestion`: **Group A (this batch) → Group B
(HUD/stats display) → Group C (Elites + Trophy-gated Totem)**. Plan:
`.claude/plans/delightful-tinkering-book.md`. A "notes for later" list (food system, HP
regen, roguelike ideas, minimap small-section + full-map-overlay rework, trophy
equipment slot, etc.) was appended to `CLAUDE.md`'s Long-term design notes section as
pure documentation, no code yet.

- **Running levels faster early** (`MainScene.ts`) — sprint's flat running-XP rate
  extracted to `RUNNING_XP_PER_SEC` and bumped 10→20 XP/sec; `skillXpToNext`'s curve
  itself is unchanged.
- **Ctrl+Click unequips armor** (`InventoryMenu.ts`/`MainScene.ts`) — the one remaining
  gesture without the standing Ctrl+Click-aliases-double-click-quick-move pattern. New
  `InventoryMenuDeps.unequipArmorSlot`, checked before the existing right-click
  (context menu) and left-click (drag) branches on an armor slot's `pointerdown`.
- **Clicking a placed Workbench opens the crafting menu** — previously a Workbench had
  zero hover/interact behavior at all (proximity-gating only). New `hoveredWorkbench`
  tracking (sourced by filtering `placedObjects` by `itemKey`, no new parallel array
  needed) mirrors the Drying Rack/Shack hover-and-prompt pattern; `tryInteract()`'s new
  branch calls the existing `toggleCombinedMenu()` (same one Tab already calls), so
  clicking the workbench a second time while the menu's open closes it.
- **Smart scroll-wheel hotbar cycling** — `cycleHotbar()` now steps up to a full lap
  looking for the next occupied slot instead of moving exactly one slot per tick,
  respecting the existing `wheelSpansBothRows` toggle's range.
- **Boss Altar now spawns further from world center** — the "minimum distance from
  center" mechanism the user asked for already existed (`pickSpawnPoint`'s
  `clearRadius` param, shared by every spawn-point picker); it was just tuned too
  small. Promoted the inline local `900` to a named `ALTAR_CLEAR_RADIUS` module
  constant and raised it to `1400` (world's half-diagonal is ~2240px).
- **Boss charge attack now reliably damages on contact** — `checkPlayerHit()` was
  already called every frame during the charge's travel (this was never a missing
  per-frame check), but `CHARGE_HIT_RADIUS` was a flat `34` that never accounted for
  `BOSS_SCALE = 2.4` — the boss's scaled-up visual footprint could visually overlap the
  player without the hit registering. Same class of bug the earlier
  `MainScene.enemyReach()` fix addressed for normal attack/prompt reach, just not
  previously applied to the boss's own charge math. Fixed: `CHARGE_HIT_RADIUS = 34 *
  BOSS_SCALE` (≈82px).

Verified via `preview_eval`: 5s of simulated sprint XP at the new rate lands exactly on
Running lvl 1 (was ~10s before); a scripted `unequipArmorSlot` call (the same path
Ctrl+Click now triggers) confirms the item returns to the backpack and the dep is wired
as a real function on `InventoryMenu`'s deps; placing a workbench at the pointer's
world position and calling the real hover/interact path shows the `"[LMB] Craft"`
prompt and opens both `inventoryMenu`/`craftingMenu`; a hotbar with only slots 0/3/7
filled cycles `0→3→7→0→3`, never landing on an empty slot; `pickAltarPosition()`
returns a point 1505px from world center (comfortably past the new 1400 threshold); a
live `GremlinKing.checkPlayerHit()` call during a scripted charge confirms a hit at
60px (previously would have missed under the old 34px radius) and 30px, and correctly
still misses at 90px. Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` confirms the world boots normally.

### Next up: Group C — Elites + Trophy-gated Totem (not started)

Group B (above) shipped this session. Group C remains planned-only, per the locked
A → B → C order — no plan file drafted for it yet.

### Previously: Post-boss-fight playtest batch — boss HUD/hitbox, chest take-all, 2nd hotbar row

A same-day playtest batch off the first real Gremlin King fight — grab-bag of fixes
plus one small feature (the 2nd hotbar row), plan:
`.claude/plans/post-boss-playtest-batch.md`. See `CLAUDE.md`'s new "5d." roadmap entry
for the full list; highlights:

- **Boss HUD** (`src/ui/BossHealthUI.ts`) — a big fixed top-of-screen HP + poise bar,
  Elden-Ring/Valheim style, visible only while `GremlinKing.isEngaged()`. The existing
  small floating world-space bars are untouched (both now show).
- **Boss hitbox/reach fix** — `MainScene.enemyReach()` scales attack/prompt reach with
  an enemy's visual radius past a ~13px baseline (the roster's normal sprite size), so
  the 2.4x-scaled Gremlin King is no longer nearly unreachable at its own edge. Generic
  by sprite size, not a King-specific special case.
- **Fixed-HUD depth bug fixed** — hotbar, minimap, HP/stamina/XP bars, and hover/
  placement prompt text all used `setDepth()` values below `WORLD_H` (2688), so a tree
  or enemy near the bottom of the map could render on top of them. Bumped into
  2800-2902 (still below the crafting/inventory panels' 3000+ and Tooltip's 4500).
- **Minimap Boss Altar landmark** — once the player explores within fog-of-war's own
  reveal radius of a Boss Altar, `MinimapUI.revealLandmark()` burns a one-time marker
  into the minimap's terrain `RenderTexture`. A discovered fixed structure, not a live
  entity blip — keeps the minimap's locked "no entity blips" rule intact.
- **Workbench recipe-discovery persistence bug fixed** — `hasWorkbenchPlaced()` used
  to check *currently placed* workbenches, so destroying one re-locked every tier-1+
  recipe's discovery/visibility even though the player had already unlocked it. New
  sticky `everPlacedWorkbench` flag (set once, never reset) fixes it; proximity checks
  are separate and still correctly track live placement state.
- **Gremlin Totem description no longer spoils what it summons** — describes the
  totem object itself; still points at the Boss Altar as where it's used.
- **Equipment stats panel** — the inventory menu (Tab) gained a third "Combat" column
  (next to Backpack/Equipment) showing live equipped-weapon damage/attack speed/attack
  stamina cost plus total armor (`MainScene.combatStats()`, mirrors `Tooltip.ts`'s
  existing weapon math).
- **Chest Take All (R) + Ctrl-click quick-move** — an open chest supports **R** to
  move everything into the backpack in one go (auto-stacking). **Ctrl+Left-Click** is
  now a one-press alias for every double-click quick-move gesture, including two new
  ones added this pass: the chest menu (chest ↔ backpack) and the Drying Rack menu
  (backpack → input, mirroring its existing right-click quickLoad).
- **Second hotbar row for stations/processors** — `Hotbar` (`src/systems/Hotbar.ts`)
  is now one flat 18-slot container; row 2 (Alt+1-9, `ROW1_COUNT`/`ROW2_COUNT`) is a
  dedicated spot for placeables. Auto-pickup of a loose station now prefers an empty
  row-2 slot before falling back to the backpack. Locked via `AskUserQuestion`: Alt+1-9
  selects row 2 directly (not a click-only fallback); scroll wheel spans both rows by
  default, togglable back to current-row-only with **H**.

Verified live via `preview_eval`/`preview_screenshot`: boss HUD bar shows/hides
correctly on aggro/deaggro with accurate HP/poise fractions; `hasWorkbenchPlaced()`
stays true after a scripted destroy; `takeAllFromChest()` empties a chest into the
backpack; a scripted Ctrl-click (`fakePointer.event.ctrlKey = true`) quick-moves items
backpack↔hotbar and both directions of the chest menu; the two-row hotbar renders with
a distinct green-tinted row 2, Alt+3 selects row-2 slot index 2 and engages placement
mode, and a simulated loose `drying_rack` pickup lands in row 2 first, falling back to
the backpack once row 2 is full. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Minimap + fog of war

First piece of roadmap item 6 (World & discovery), plan:
`.claude/plans/parsed-cooking-beacon.md`. Locked via `AskUserQuestion` before building:
**passive display only** (no fast-travel/waypoints — a future addition, not this pass),
**terrain + player position only** (no enemy/station blips), **fixed reveal radius**
(no skill/item scaling).

- **New `src/systems/Fog.ts` (`FogOfWar`)** — a `Uint8Array` reveal grid sized 1:1 to
  the minimap's own pixel resolution (224x168 — an exact 4:3 match for the 3584x2688
  world at a clean scale-16), independent of `Biome.ts`'s own 40px gameplay grid.
  `reveal(playerX, playerY)` marks every unrevealed cell within a 260px world radius
  (rough parity with existing enemy aggro-radius scale) as revealed, bounded to a local
  window around the player's current cell so it's cheap to call every frame regardless
  of world size — revealed cells never re-fog once seen. Exposes a drained
  `consumeNewlyRevealed()` queue so the UI layer only ever draws what changed, never a
  full-grid redraw.
- **New `src/ui/MinimapUI.ts`** — a top-right corner HUD panel, following the
  `EventLogUI`/`KeybindsUI` pattern of raw scrollFactor(0) GameObjects, no Container
  (per the standing Phaser Container+scrollFactor(0)+interactive-input bug — the
  minimap has no interaction today, but staying consistent avoids the trap if it gains
  one later). A `Phaser.GameObjects.RenderTexture` terrain layer starts fully black and
  fills in one pixel per newly-revealed `FogOfWar` cell (incremental draws only),
  sampling `Biome.forestWeight()`/`creekWeight()` and blending the *exact* same colors
  `MainScene.buildBiomeTexture()`'s real-world terrain bake uses (base grass `0x4a7a3a`,
  forest overlay `0x24421c`, creek overlay `0x3a6ea5`) so the minimap reads as a shrunk
  version of the real ground, not a different palette. A small `Graphics` marker dot is
  repainted every frame at the player's live position (the one piece that can't be
  incremental, since it moves).
- **Wired into `MainScene.update()`** — `this.fog.reveal(...)` +
  `this.minimapUI.update(...)` added to the same ambient-loop batch as
  `updateMagnet`/`updateEnemies`/`updateTreeOcclusion`, in both the normal and
  frozen-on-death branches (matching how those other ambient systems already keep
  running while dead).
- **Same-day follow-up, per the user: moved to top-right, and the old "[Tab] Menu" icon
  is gone entirely** — first shipped bottom-left; the user asked for top-right instead,
  which meant clearing that corner of its previous occupant first. The always-visible
  `"[Tab] Menu"` icon (`CraftingMenu.ts`) was deleted outright rather than just hidden or
  relocated — Tab and Escape already drove the combined crafting+inventory menu
  independently (`MainScene.toggleCombinedMenu()`), so the icon was a redundant
  click-to-open affordance, not the only entry point; `CraftingMenuDeps.onIconClick` and
  the icon `GameObject` are both gone, no dead code left behind. The stat-points badge
  and the `CraftingMenu` panel both shifted down to sit below the minimap —
  `MinimapUI` now exports `MARGIN`/`PANEL_W`/`PANEL_H` (was just `PANEL_W`/`PANEL_H`) so
  `CraftingMenu`'s `MARGIN_TOP` and `MainScene.createStatPointsBadge()`'s Y both compute
  off those constants instead of separate hardcoded offsets, so the three stay stacked
  without overlap if the minimap's size ever changes.
- **`CLAUDE.md` roadmap updated** — new "5a. Minimap + fog of war" entry (shipped);
  item 6 (World & discovery) trimmed to note the minimap piece is done, the rest
  (bigger generated world/biomes) still pending.
- **Stale "Craft: T" keybind label removed** — spotted while auditing the top-right
  corner for the icon removal above; `MainScene.createHud()`'s `KeybindsUI` list had
  carried a "Craft: T" line since before crafting was folded into the combined Tab
  menu. Grepped for any T-key handler first (`keydown-T`/`addKey("T")`/etc.) and found
  none anywhere in `src/` — Tab is the only entry point, already covered by the
  existing "Inventory: Tab" line — so the line was deleted rather than fixed to a real
  binding.

Verified via `preview_eval` + `preview_screenshot`: `FogOfWar` constructs at exactly
`cols: 224, rows: 168, scale: 16`; teleporting the player to a distant point, calling
`reveal()`/`minimapUI.update()`, then teleporting back and revealing again shows *two*
separate revealed circles on the minimap screenshot (the original spawn-area circle and
the new distant one) — confirming previously-revealed cells persist and don't re-fog once
the player leaves; a real `keydown-TAB` emit opens the combined menu with the
`CraftingMenu` panel rendering cleanly below the minimap with no overlap; forcing
`unspentPoints = 3` shows the stat-points badge at `y ≈ 189`, directly under the
minimap's bottom edge and well clear of the crafting panel (which starts at `y = 220`).
`preview_screenshot` confirms the panel renders top-right with a
correctly-colored (green/dark-green/blue) revealed patch around the player and solid
black everywhere unexplored; the expanded `KeybindsUI` panel screenshot confirms
"Craft: T" is gone and every remaining line still matches a real binding. Type-check
clean (`tsc --noEmit`), no console errors.

### Previously: Weapon stat display — stamina/hit and attack speed

Small same-day follow-up, no new milestone letter. Weapon tooltips (`InventoryMenu`/
`HotbarUI`, via `Tooltip.ts`) and the crafting-menu detail panel (`CraftingMenu.ts`) now
show two new stat lines for every weapon (Wood Club, Stone Club, Bone Knife, Primal
Spear): **Stamina** (cost per hit, live-adjusted by the Strength/Agility stamina-cost
multiplier exactly like the existing Damage line is skill-adjusted — reuses
`Progression.ts`'s `weaponStaminaCostMultiplier`, which was already computed for actual
combat but never surfaced in UI) and **Attack Speed** (`attacks/s`, new
`Weapons.weaponAttacksPerSecond()` = `1000 / weaponCooldownMs`, static — nothing
currently modifies attack speed). Both `Tooltip` and `CraftingMenu` needed a new
`progression: PlayerProgression` dependency threaded in from `MainScene` (mirroring the
existing `skills: Skills` dependency) since the Stamina line needs live player-stat data,
not just skill data. Verified live via `preview_eval`: a Stone Club tooltip reads
`Stamina: 14` / `Attack Speed: 1.8/s` at 0 Strength, and `Stamina: 14 (13)` after
allocating 10 Strength points — matching the crafting-menu preview's own
`statValue()` output for the same inputs.

Also added to `CLAUDE.md`'s roadmap (World & discovery, item 6): a **minimap with fog of
war** — idea-stage only, not started. Corner HUD map revealing explored terrain as the
player physically visits it; reveal radius/map scale/fast-travel-or-not all undecided.

### Previously: Playtest fixes batch — Gremlin Guck processing, bigger map, crafting-menu stats, Place context menu, level-up banner

Plan: `.claude/plans/bright-prancing-starlight-playtest-batch.md`. A same-day
follow-up batch off a fresh playtest, no new milestone letter:

- **Gremlin Guck** (new item/`ResourceType`, `icon_gremlin_guck` in `BootScene.ts`) is
  a new Drying Rack output: raw `gremlin_blood` -> `gremlin_guck` at 2:1
  (`Processing.ts` `PROCESS_RECIPES`), mirroring cattail->twine. Every recipe that
  previously spent raw Gremlin Blood now spends Gremlin Guck instead — Bone Knife Lvl 3
  and Primal Spear Lvl 3 (`WeaponUpgrades.ts`) — so raw blood is no longer a direct
  crafting ingredient anywhere, only a processing input.
- **Bone Knife now requires a Workbench.** Recipe changed from tier 0 (4 Bones) to tier
  1 (1 Leather Scraps, 4 Bones) — `Recipes.ts`. Primal Spear was already tier 1
  (workbench-gated); no change needed there, just confirmed.
- **Map roughly doubled** (`MainScene.ts`): `WORLD_W`/`WORLD_H` 80x60 -> 112x84 tiles
  (2560x1920 -> 3584x2688px, ~2x area) — per-playtest feedback that the old map ran dry
  of enemies/resources before a player could craft everything on offer. Every fixed
  spawn count scaled up to match (~1.8-2x each): Boar 12->24, Snake 15->28, RangedGremlin
  12->22, Gremling 4->8, Cattail 22->42, Branch 40->76, Rock 30->56, Tree(forest)
  70->132, Tree(grassy) 14->26, Boulder 18->34, Blackberry-bush total 16->30. Density-tuning
  constants (cluster radius/max, aggro/deaggro numbers) were left alone — only raw counts
  changed, since the map itself is proportionally bigger.
- **Player Level-up is now a real "in your face" moment.** New
  `MainScene.showLevelUpBanner()` — a big centered "LEVEL UP!" + "Level N • +N Stat
  Points" callout that punch-scales in (`Back.easeOut`), holds ~1.7s, then fades and
  destroys itself, plus a brief `cameras.main.flash()`. Non-blocking (scrollFactor(0)
  text, no interactivity, doesn't intercept input) — stacks alongside the existing
  quieter EventLog line and bobbing stat-points badge rather than replacing them.
- **Crafting menu now shows the Damage/Armor number for weapon/armor recipes.**
  `CraftingMenu.renderDetail()` gained a `statValue()` helper mirroring `Tooltip.ts`'s
  (base weapon damage adjusted by the relevant skill's live multiplier; armor shows its
  flat base defense) — rendered right under the description, above the cost lines.
  `CraftingMenuDeps` gained a `skills: Skills` field (MainScene already had the instance,
  just wasn't threading it through). Freshly-crafted output is always tier 0 ("Lvl 1"),
  so no tier-upgrade math is needed here unlike the owned-item Tooltip case.
- **Right-click a backpack placeable for an explicit "Place" option.** New
  `InventoryMenuDeps.openPlaceContextMenu`, wired to `MainScene.openPlaceContextMenu()` —
  a one-row `ContextMenu` popup (mirrors the armor-slot and placed-object popups) whose
  "Place" click just calls the existing `startItemPlacement()` path. A single left-click
  on a backpack placeable already entered placement mode (deferred behind the
  double-click window) — this is a discoverable, explicit alternative for players who
  don't know that, not a replacement for it. Right-click on a backpack slot still opens
  the weapon-upgrade panel for weapons; placeables are the other branch.

Verified live via `preview_eval`: world bounds report 3584x2688; the Bone Knife's
crafting-menu detail panel shows "Damage: 4" with 1 Leather/4 Bones costs and requires a
placed Workbench to discover; Gremlin Cap's panel shows "Armor: 2"; right-clicking a
backpack Campfire stack opens a "Place" popup whose click engages `placementMode` with a
ghost; the level-up banner's text objects are created at alpha 0/scale 0.3 and are fully
destroyed ~3s later once their tweens finish.

### Previously: Combat depth pass — enemy AI polish, armor defense, weapon upgrades, playtest fixes

Plan: `.claude/plans/recursive-bubbling-spring.md`. A fresh-session batch spanning enemy
AI bugs, new combat-depth content, and a grab-bag of playtest fixes + a documentation
ask, built across 6 milestones in one session. Confirmed with the user via
`AskUserQuestion`: the new Club upgrade path applies to **Stone Club only** (Wood Club
stays a fixed starter weapon).

- **Enemy AI: random initial facing, Gremlin wander, no-spawn-in-water.**
  `Enemy.ts`'s constructor now sets a randomized initial rotation
  (`setRotation(FloatBetween(0, 2π))`) — every enemy (including Snake, which extends
  Enemy) used to default to one unrotated orientation and only ever rotated once it
  moved, which read as "always facing the same direction" for anything that spends most
  of its life stationary (Snake hidden, Gremlin idle). `RangedGremlin` (`Gremlin.ts`)
  gained an idle wander state it never had before — confirmed via code read that its
  `idle` branch did nothing but check aggro radius. Unlike Boar/Gremling's incremental
  "drift from current position" wander, RangedGremlin's wander target is drawn fresh
  from its stored spawn point every cycle (`RANGED_WANDER_RADIUS = 70`), so it can never
  random-walk away — "a small area around their spawn" per the request.
  `MainScene.spawnEnemies()` now passes `avoidCreek: true` to every enemy spawn point
  pick (Boar/Snake/Gremlin/Gremling); `pickSpreadSpawnPoint()` widened to forward the
  param. Verified live: wander target lands within the radius of spawn, rotation varies
  across spawns, and the live enemy roster spawns with zero enemies on creek cells
  (an enemy chasing a player near the creek can still walk onto it afterward — no
  terrain-collision system exists, out of scope here, called out explicitly rather than
  silently left unaddressed).
- **Armor now has real defense numbers.** New `ItemDef.armorDefense` (base/tier-0):
  Gremlin Cap 2, Shirt 4, Pants 3. New `ArmorUpgradeDef.defenseBonus` on each existing
  lvl2 upgrade: Cap +2 (4 total), Shirt +3 (7 total), Pants +2 (5 total) — full tier-0 set
  9 armor, full tier-1 set 16 armor. `ArmorUpgrades.ts` gained
  `armorDefenseForTier()`/`totalPlayerDefense()`; `MainScene.applyDamageToPlayer()` now
  applies a flat deduction (`Math.max(1, amount - totalPlayerDefense(...))`) — per the
  user, everything dealt today is physical damage (no magic/elemental sources exist yet),
  flagged inline as the spot to branch on damage type later. `Tooltip.ts`'s "Armor" stat
  line mirrors the existing weapon "base (adjusted)" pattern. Verified live: a 25-damage
  hit reduces to exactly 16 at the tier-0 set and 9 at the tier-1 set, matching the math.
- **Weapon upgrade system — Stone Club gets Lvl 2/3, plus two brand-new weapons.** New
  `src/systems/WeaponUpgrades.ts` (`WeaponUpgradeDef`, structurally identical to
  `ArmorUpgradeDef`/`StationUpgradeDef`), reusing the existing generic `ItemStack.tier`
  field — no new data model. **Bone Knife** (new, tier 0, 4 Bones, slash — first-ever
  slash weapon) and **Primal Spear** (new, tier 1/workbench-gated, 4 Wood/2 Stone/1
  Leather Scraps, pierce — first-ever pierce weapon) fill the two weapon-damage-type
  skills that previously had zero XP sources. Stone Club/Bone Knife/Primal Spear each get
  2 upgrade tiers (Lvl 2, Lvl 3 — the base crafted weapon already counts as Lvl 1), all
  flat damage bonuses. Deliberate deviation from the Stone Club precedent: neither new
  weapon has a skill-level gate on its recipe (Stone Club requires Blunt 3, reachable
  "for free" from the pre-existing Wood Club — there's no pre-existing slash/pierce
  weapon to grind on before Bone Knife/Primal Spear exist, so gating them the same way
  would make them permanently uncraftable). `MainScene` gained `equippedWeaponTier`
  (read from the selected hotbar slot's `stack.tier` in `recomputeEquipped()`) and
  `tryAttackEnemy()` adds `weaponTierDamageBonus()` to base damage before the existing
  skill multiplier. **Right-click a weapon (backpack or hotbar) to upgrade it** — new
  branch in `InventoryMenu.ts`/`HotbarUI.ts` (right-click was otherwise a no-op per the
  last playtest batch's "reserved for context menus" decision) opens the same
  `UpgradeMenu` panel armor/station upgrades already use; `MainScene.upgradeTarget`
  widened to a third variant (`{weaponSlot: {container, index}}`) alongside the existing
  placed-object/armor-slot cases. Verified live: upgrading a hotbar Stone Club through
  both tiers bumps `equippedWeaponTier` immediately (no re-select needed) and a live
  `tryAttackEnemy()` call deals exactly 9 damage (5 base + 2 + 2), matching the table.
- **UpgradeMenu shows what an upgrade actually grants.** New optional `deltaLabel` field
  on `ArmorUpgradeDef`/`WeaponUpgradeDef`/`StationUpgradeDef` (authored directly per
  entry, e.g. `"+2 Armor"`/`"+2 Damage"` — left unset for Tool Sharpener, which only
  unlocks a gate rather than granting a direct numeric effect). `UpgradeMenu.ts` renders
  it in green between the cost and description lines, extending the existing
  measured-row-height pattern so longer rows still don't overlap. Verified live: both
  Stone Club upgrade rows render their delta line at the right offset with no overlap
  into the row below.
- **Playtest fixes batch:**
  - **Ghost placement bug fixed** — placing the last owned instance of a placeable
    (Workbench, Drying Rack, ...) from an owned stack used to leave a faded ghost armed
    on the cursor until the *next* click noticed the stack was empty. `attemptPlaceObject()`
    now checks immediately after a successful item-source placement and calls
    `cancelPlacement()` right away if the stack just hit zero. Verified live: placing a
    single owned Workbench now exits placement mode (ghost destroyed) in the same call.
  - **All three Gremlin armor lvl2 upgrades now require Workbench Lvl 2** (was Pants
    only) — `requiresWorkbenchTier: 1` added to Cap/Shirt's `ArmorUpgradeDef` entries.
    Investigated the user's separate "Pants lvl2 shows before Workbench Lvl 2 exists"
    report by reading `UpgradeMenu`/`upgradeBlockReason` directly — found no code bug;
    it's the existing, intentional "visible but blocked with a reason" design from
    Milestone K (the whole upgrade path stays visible so the player can see what's
    ahead), enforced at both click and apply time. No change made for that item beyond
    the Cap/Shirt gate above.
  - **Inventory stays open during placement.** `startItemPlacement()` no longer closes
    the `InventoryMenu` (still closes the crafting menu and Drying Rack popup, which do
    need to get out of the way). The global placement-mode click guard widened to also
    bail out on a click inside the still-open inventory panel, so several items can now
    be placed in a row without reopening it each time, and clicks on the panel itself
    don't fall through and place something underneath it. Verified live.
  - **Attack-range ring off by default** — `rangeRingEnabled` now starts `false` (was
    `true`); the `O` toggle is unchanged.
  - **Running rescaled**: sprint is now 1.75x walk speed at Running Lvl 0, climbing to
    2.25x at the Lvl-100 soft cap (was 1.15x -> 1.65x) — only `BASE_SPRINT_MULTIPLIER`
    changed (1.15 -> 1.75); the existing +0.5%-of-base-speed-per-level bonus already
    landed exactly on the new target spread with no further change.
- **New `RECIPES.md` dashboard** at the repo root — hand-authored markdown tables for
  every `Recipes.ts` entry, plus Station/Armor/Weapon upgrade tables (with the new
  defense/damage numbers) and the Drying Rack's processing ratios. Not generated — a new
  line in `CLAUDE.md`'s "Working conventions" section asks future sessions to keep it in
  sync whenever the underlying recipe/upgrade files change, mirroring the existing
  "plans must be committed in-repo" convention entry.

Verified via `preview_eval` (a stuck-on-BootScene preview tab needed a `preview_resize`
call to un-pause `requestAnimationFrame` mid-session — noted here in case it recurs):
live enemy roster spawns 12 Boar/15 Snake/12 RangedGremlin/4 MeleeGremling with no
enemy spawning on a creek cell; a scripted idle `RangedGremlin.update()` sequence
confirms its wander target lands within 70px of its spawn point and its rotation is
non-default from construction; a full tier-0 and tier-1 Gremlin armor set reduces a
25-damage hit to exactly 16 and 9 respectively; upgrading a hotbar Stone Club through
both new tiers updates `equippedWeaponTier` live and a real `tryAttackEnemy()` call deals
9 damage (5 base + 2 + 2); placing a single owned Workbench from the backpack now exits
placement mode cleanly (no residual ghost); all three Gremlin armor lvl2 upgrades block
with "Requires nearby Workbench Lvl 2" until a tier-1 Workbench is nearby, then clear;
placing an item while the inventory is open leaves it open and a click on the panel
doesn't place through it; `rangeRingEnabled` starts `false`. Type-check clean
(`tsc --noEmit`), no console errors, `preview_screenshot` confirms the world boots
normally and the UpgradeMenu's new delta line renders cleanly.

### Previously: Third Progression playtest batch — sprint rework, right-click reserved, workbench gate

Third same-day playtest pass. Per the user's own request this round, four ambiguous
items were clarified via `AskUserQuestion` before any code changed (sprint-speed
numbers, workbench-gate scope, quick-move scope, right-click's remaining job) — answers
below.

- **Sprint slowed substantially; Running skill now claws it back slowly**
  (`src/entities/Player.ts`, `src/systems/Skills.ts`). `Player`'s hardcoded
  `SPRINT_MULTIPLIER` constant is gone — `Player.update()` now takes a `sprintMultiplier`
  param computed by the scene each frame via new `Skills.runningSprintMultiplier()`:
  `1.15 + runningLevel * 0.005`. Base sprint dropped from the old flat 1.6x (~152 px/s)
  to ~1.15x (~109 px/s), climbing back up +0.5% of base speed per Running level,
  reaching ~1.65x only at the level-100 soft cap — a long, deliberate grind. Running
  also gained a hover-tooltip impact description ("+0.5% sprint speed per level") since
  it's no longer a no-op skill.
- **Weapon damage tooltip / recipe-toast fixes carried over from last batch, this batch adds:**
  **Recipe-unlock toast moved from top-right to the left side**, anchored directly
  under the `InventoryMenu` panel's box (`EventLogUI.ts` now imports `PANEL_X`/`PANEL_Y`/
  the newly-exported `PANEL_H` from `InventoryMenu.ts`) — slides in from off-screen left
  instead of the right.
- **Upgrade menu now closes when its target armor slot is unequipped** — `unequipArmorSlot()`
  checks `upgradeTarget` (mirrors the identical existing check in `destroyPlacedObject()`
  for a destroyed station) and closes the panel if it was open for that slot.
- **General workbench-proximity gate for ALL upgrades**, not just Gremlin Pants' existing
  special case. Per the user: "whatever workbench is required to craft an item, you must
  be near that item to upgrade it." `armorUpgradeBlockReason()` → renamed/generalized
  `upgradeBlockReason()`: looks up the upgrade's base `Recipe` via `appliesToItemKey` and
  requires `isNearWorkbench()` if that recipe's `tier > 0` — layered *underneath* Pants'
  existing `requiresWorkbenchTier` check (the general one shows first/is more helpful when
  the player has no workbench nearby at all). This was a real gap: Gremlin Cap/Shirt's
  lvl2 upgrades previously had **no workbench check at all**; only Pants did (and only its
  stricter tier-specific one). Workbench's own upgrade (Tool Sharpener) needs no separate
  check — right-clicking it already requires standing at that very workbench (tier 0).
  Both `applyStationUpgrade`/`applyArmorUpgrade` now defensively re-check this too, not
  just the UI-level `extraBlockReason`.
- **Quick-move is now double-left-click; right-click is reserved for context-menu/upgrade
  actions.** Per the user (clarified: applies to every backpack item uniformly; right-click
  becomes a no-op for plain items, no new context menu built for them yet): `InventoryMenu`'s
  backpack slots and `HotbarUI`'s slots dropped their `rightButtonDown() → quickMove(...)`
  branch (now just `return` on right-click) and the now-unused `quickMove` dep entirely.
  Double-click detection lives in `MainScene.resolveItemDrag()` via two new small helpers:
  `isDoubleClickInPlace(key)` (350ms window, keyed per-slot e.g. `"bag:5"`/`"hotbar:2"`) and
  `deferSingleClick(action)`. Hotbar's click-in-place (slot **select**) still fires
  immediately/undeferred (idempotent, no latency added) with double-click *additionally*
  triggering `quickMoveItem` back to the backpack. Backpack's click-in-place is trickier: a
  **single** click on a placeable enters placement mode — but that's now **deferred** behind
  the same 350ms window, so a genuine double-click quick-moves the item instead of arming
  placement mode first (which would otherwise reference a now-stale backpack slot once the
  item moved to the hotbar — a real correctness bug the deferral avoids, not just a style
  choice). A single click on a non-placeable stays a no-op, unchanged. Armor's own
  right-click gestures (equipped-slot Unequip/Upgrade popup, placed-station Upgrade/Destroy)
  are untouched — those were never the "quick-move" gesture.
- **Character menu (`K`) defaults to the Stats tab whenever `unspentPoints > 0`** —
  recomputed fresh on every `openMenu()` call (not remembered across opens).
- **New animated stat-points badge** — a small bobbing "N Stat Points Available!" tag
  under the `[Tab] Menu` icon (top-right), visible only while points are unspent,
  clickable to open the Character menu. Refreshed alongside the XP bar wherever
  `unspentPoints` changes (level-up, `allocateStat`).

Verified via `preview_eval`: sprint speed at Running lvl 0 reads ~109.25 px/s and ~156.75
px/s at the lvl-100 soft cap (matches the formula exactly); Gremlin Cap's lvl2 upgrade
blocks with "Requires a nearby Workbench" far from one and clears once a workbench is
placed nearby; Gremlin Pants' lvl2 still additionally blocks with "Requires nearby
Workbench Lvl 2" when only a tier-0 workbench is nearby; opening the Upgrade panel for
an equipped helmet then unequipping it closes the panel; a single click-in-place on a
non-placeable backpack item is a no-op (item stays put), while two clicks in the same
tick move it from backpack to hotbar; the `InventoryMenu`/`HotbarUI` deps objects no
longer carry a `quickMove` field at all; the recipe-toast container spawns at
`x:-240, y:442` — exactly off-screen-left and directly under the inventory panel's
bottom edge. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Second Progression playtest batch — UI polish + gremlin range tuning

Second same-day playtest pass, five independent small fixes:

- **Gremlin/Gremling attack + trigger ranges cut ~15%** (`src/entities/Gremlin.ts`):
  `RANGED_AGGRO_RADIUS` 160→136, `MELEE_AGGRO_RADIUS` 130→110, `PROJECTILE_MAX_RANGE`
  260→220, `RANGED_MELEE_RANGE`/`MELEE_RANGE` 24→20, `RANGED_MELEE_EXIT_RANGE` 40→34
  (kept proportional to its paired range so the hysteresis gap ratio is unchanged).
  Deaggro radii, speeds, and damage/cooldowns untouched — only the "notices you" /
  "can hit you from here" ranges shrank.
- **Weapon damage tooltip now shows "base (adjusted)"** — `Tooltip.ts`'s generic
  `def.stats` rendering gained a `statValue()` override: a weapon's "Damage" line
  computes the live skill-adjusted number (`weaponSkillDamageMultiplier` from
  `Skills.ts`) alongside the static base, e.g. "Damage: 3 (4)" once Blunt is high
  enough to round up. `Tooltip` now takes an optional `skills` param at construction;
  `InventoryMenu`/`HotbarUI`/`DryingRackMenu` all gained a `skills: Skills` dep field
  and pass it through to their own `new Tooltip(scene, deps.skills)` call.
- **Recipe-unlock toast stacking fixed** (`EventLogUI.ts`) — the toast box was a fixed
  40px tall but its wrapped message text wasn't, so a longer name (2-3 wrapped lines)
  could visually spill into whatever toast was stacked below it, reading as "toasts
  overlapping in the same place" when several unlocked close together. Toast height is
  now measured from the real wrapped text (`Math.max(40, text.height + 16)`) and each
  toast's Y offset is the actual cumulative height of every currently-active toast
  above it (`activeRecipeToasts: {height}[]`, replacing a bare counter) — no more
  fixed slot-height math. Also **hold/fade duration increased** (hold 2400→3200ms,
  fade 600→900ms) per "should fade out slower."
- **Placement-mode hint relocated to bottom-right** (`MainScene.ts`) — was anchored
  top-left under the controls line, disconnected from every other contextual
  prompt/instruction in the HUD (all of which live bottom-right, e.g. the interact
  prompt). Now anchored bottom-right (origin 1,1) stacked directly above `promptText`,
  matching its exact visual style (same font size/background/padding).

Verified via `preview_eval`: a wood_club tooltip at Blunt lvl 62 (~31% bonus) reads
"Damage: 3 (4)" (base 3, adjusted rounds up at that level; lower levels round back to
the same "3 (3)" honestly, which is expected/by-design); queuing a long recipe-unlock
message confirms toast height grows well past the 40px minimum (measured 68px) instead
of a fixed box; the placement hint renders at (1908, 1036) on a 1920x1080 screen,
origin (1,1), directly above the interact-prompt corner. `preview_screenshot` confirms
the tooltip and placement hint both render cleanly bottom-right with no overlap.
Type-check clean, no console errors.

### Previously: Progression playtest fixes — recipe visibility, stat rebalance, gremlin density

Same-day playtest pass on the Progression milestone below, requested directly by the
user after a real session:

- **Skill-gated recipes reverted to fully hidden (discovery-time gate), not
  visible-but-greyed.** The Progression milestone's own craft-time-gating decision
  (flagged for the user to override) was overridden: `Crafting.refresh()` checks
  `skillsMet()` again for discovery, matching how ingredients already work — a
  skill-locked recipe (e.g. `stone_club` before Blunt lvl 3) is invisible, not shown
  amber-greyed. The now-dead amber "Requires <Skill> Lvl N" line was removed from
  `CraftingMenu.ts` (unreachable once discovery already guarantees it's met), along
  with the redundant `skillsMet` rechecks in `isCraftable`/`craftRecipe` — skill levels
  never decrease, so the discovery-time check is sufficient forever, same reasoning
  `Recipe.tier`'s "workbench ever placed" discovery gate already relies on (as opposed
  to *proximity*, which does change and is correctly still rechecked at craft time).
- **Stat system fully reworked** (`src/systems/Progression.ts`) — the original
  Strength/Agility/Intelligence damage-bonus design is gone; damage now scales with the
  **weapon skill's own level** instead (see below), and player stats are pool-size /
  cost-reduction only:
  - `endurance`: +1 max Stamina/point (was +2)
  - `vitality` (**new stat**, split out of the old combined Endurance): +1 max HP/point
    (was +4 bundled into Endurance)
  - `strength`: -0.5% stamina cost, melee weapons only (was +2% dmg / -1.5% cost)
  - `agility`: -0.5% stamina cost, ranged weapons only (same change)
  - `intelligence`: -0.5% spell cast time/point (**placeholder** — no spell-casting
    system exists; repurposed from its old melee-magic-damage role)
  - `willpower` (**new stat**): -0.5% mana cost to magic attacks/point (**placeholder**
    — no mana system exists). Per the user, Intelligence/Willpower are explicitly
    placeholders for magic systems that don't exist yet.
  - `weaponDamageMultiplier` deleted from `Progression.ts` entirely; `Health.ts`/
    `Stamina.ts` wiring renamed `enduranceHealthBonus`→`vitalityHealthBonus` (now reads
    the `vitality` stat) and `MainScene.syncEnduranceBonus`→`syncStatBonuses`
    (`allocateStat` now re-syncs pools for either `endurance` or `vitality`).
- **Weapon skill levels now grant their own damage bonus** (`Skills.ts`,
  `weaponSkillDamageMultiplier`): +0.5% weapon damage per level, for the 5 weapon
  skills only (armor/general skills have none). This is the mechanic that replaced the
  old player-stat damage bonus — "getting better with a weapon type" now lives on the
  skill, while player stats stay pool-size/cost-reduction only. Applied in
  `tryAttackEnemy()` in place of the old `weaponDamageMultiplier` call.
- **Skill hover tooltips** (`CharacterMenu.ts`) — hovering a Skills-tab row now shows a
  small floating tooltip with its mechanical impact via a new `skillImpactDescription()`
  (`Skills.ts`), e.g. "+0.5% weapon damage per level" for the 5 weapon skills; rows with
  no mechanical effect (armor/general skills) get no hit-area/tooltip at all, per the
  user's "if applicable" framing. A persistent `tooltip` Text object (not rebuilt every
  `render()` like the row list) is shown/hidden via `pointerover`/`pointerout` on an
  invisible per-row hit rectangle, positioned just below the row so it never overlaps
  the row above it.
- **Player-level XP curve steepened significantly**: `XP_BASE` 40→**150**, `XP_EXPONENT`
  1.6→**1.9**. The user hit player level 8→9 from "only a few enemies" and asked if it
  was bugged — audited every XP hook (`addXp` loop, weapon/chop/mine/sprint/kill grants)
  and found no double-counting; the real cause was the curve being tuned too gently
  against 11 concurrently-leveling skills (passive `running` XP especially, which
  requires no combat at all) each feeding Player XP on every level-up. The new curve is
  roughly 3.5x steeper by level 10 than the original.
- **Gremlin/Gremling density cut** (`MainScene.spawnEnemies()`) — still felt overrun
  despite Milestone O's spacing fix. `RANGED_GREMLIN_COUNT` 18→**12** (still ~20% margin
  over the ~10 `gremlin_leather` estimate that justified 18 in the first place),
  `MELEE_GREMLING_COUNT` 6→**4** (no unique resource, safe to cut further), and spacing
  tightened: `GREMLIN_CLUSTER_RADIUS` 140→**220**, `GREMLIN_CLUSTER_MAX` 2→**1** (no more
  than 1 gremlin-family enemy within 220px of another, down from 2 within 140px).

Verified via `preview_eval`: `stone_club` stays absent from `discoveredRecipes()` at
Blunt lvl 0 and appears once Blunt hits lvl 3 (both via the real `refreshDiscovery()`
path); allocating 5 Vitality + 5 Endurance bumps HP 100→105 and Stamina 100→105 exactly
(+1 each); the same 600 skill-XP dump that previously reached Player Level 3 (247/368
xp) now reaches only **Level 2 (40/1210 xp)** — matching `round(150*2^1.9)=560`
consumed exactly; a live `tryAttackEnemy()` call at Blunt lvl 3 applies the weapon-skill
damage multiplier (1.015x on a 3-dmg club, rounds to 3 — expected, the bonus is subtle
at low levels by design); live enemy roster confirms exactly 12 Gremlin + 4 Gremling.
`preview_screenshot` confirms the Skills tab (with a working hover tooltip positioned
cleanly below its row) and Stats tab (all 6 stats, correct descriptions, no panel
overflow) both render correctly. Type-check clean, no console errors.

### Previously: Progression — Skills, Player Level, damage types, stat points

The roadmap's **Progression** milestone (plan:
`.claude/plans/refactored-napping-metcalfe.md`), built in four ordered sub-milestones
(A–D). Introduces two *separate* systems — many small per-activity **Skills** and one
overall **Player Level** — plus **weapon damage types** as new content. Built on top of
the previously-dormant `Skills.ts` seed (`axes`/`pickaxes`, never wired to any XP source;
`MainScene.gainSkillLevel()` was dead code, now deleted).

- **A — Skill/Weapon foundation.** `Weapons.ts` gained `DamageType`
  (`slash|blunt|pierce|ranged|magic`) + `WEAPON_DAMAGE_TYPES` (`wood_club`/`stone_club`
  → `["blunt"]`) + `weaponPrimaryDamageType()`. `Skills.ts` rewritten: expanded
  `SkillType` (5 weapon damage-type skills + `heavy_armor`/`light_armor` +
  `running`/`blocking`/`chopping`/`mining`), `WEAPON_SKILLS`/`ARMOR_SKILLS`/
  `GENERAL_SKILLS` grouping arrays, `MAX_SKILL_LEVEL = 100`, `skillXpToNext(level) =
  100*(level+1)`, `skillDisplayName()`, and an XP-based `Skills` class with fractional
  `addXp()` (loops through multi-level dumps) + an `onLevelUp` subscriber (mirrors
  `EventLog.onAdd`). `Recipe.requiredSkill` (singular) widened to `requiredSkills[]`;
  `stone_axe`→chopping0, `stone_pickaxe`→mining0, `stone_club`→**blunt3** (new),
  gremlin cap/shirt/pants→**light_armor0** (new). `Crafting.skillMet` → public
  `skillsMet` (checks all entries). `Items.ts` gained `ArmorType`, `ItemDef.armorType`
  (gremlin pieces = light_armor), hand-written "Damage Type"/"Armor Type" stat lines,
  and an `armorTypesWorn(slots)` helper.
- **B — Skill XP hooks + crafting-menu gating.** `MainScene` constructs `Skills` with an
  `onLevelUp` that logs a `"levelup"` toast, feeds Player XP, and refreshes the crafting
  menu. Four XP sources: weapon hit → 30 to the primary damage-type skill
  (`tryAttackEnemy`); tool hit → 30 chopping/mining (`tryInteract`, reusing the in-scope
  `kind`); sprint → 10/sec running (`update`); kill → 30 per distinct worn armor type
  (`tryAttackEnemy` kill branch, via `armorTypesWorn`). **Skill requirements are a
  CRAFT-TIME gate, not a discovery gate** (a resolved plan ambiguity — see decision note
  below): `Crafting.refresh()` no longer calls `skillMet` for discovery, so a skill-locked
  recipe shows once its ingredients+workbench are known but greys out with an amber
  `"Requires Blunt Lvl 3 (currently Lvl 0)"` line (mirrors the existing Workbench-proximity
  line) and `craftRecipe` guards on `skillsMet`.
- **C — Player Progression.** New `src/systems/Progression.ts`: `PlayerProgression`
  (level starts 1, `xp`, `unspentPoints`, per-stat counts), `StatType =
  endurance|strength|agility|intelligence` (**no luck**), `xpToNextPlayerLevel(level) =
  round(40*(level+1)^1.6)` (fast early, steep later), `addXp` (awards `level` points per
  level gained), `allocate`, `onLevelUp`, plus `weaponDamageMultiplier`/
  `weaponStaminaCostMultiplier` keyed generically off damage type (magic→INT, ranged→AGI,
  else STR — so a future ranged/magic weapon needs no changes). Every **skill** level-up
  feeds Player XP equal to that level's cost. `Health.ts`/`Stamina.ts` gained
  `setBonusMax` (Endurance → +4 HP / +2 stamina per point; `Health.reset()` now refills
  to the bonused max). Strength/Agility/Int scale weapon damage (+2%/pt) and stamina cost
  (−1.5%/pt, floored) — Strength is live today (all weapons are melee); AGI/INT are
  framework-only until ranged/magic weapons exist.
- **D — UI.** A third stacked HUD bar (purple XP + "Lvl N", above HP/stamina via the same
  `hotbarUI.top` anchor chain). New `src/ui/CharacterMenu.ts` (key **K**), full-page popup
  in `UpgradeMenu`'s style: **Skills tab** (all 11 skills grouped Weapon/Armor/General,
  each with level + XP bar) and **Stats tab** (player level/XP bar, unspent points, a
  "+" per stat with its effect description, immediate-apply). Wired into `anyMenuOpen`,
  the ESC chain, and the `KeybindsUI` list.

**Decision note (craft-time vs discovery skill gating):** the plan requested an amber
"Requires <Skill> Lvl N" line, which is only reachable if skill is a *craft-time* gate
(recipe visible-but-greyed), not a *discovery* gate (recipe hidden until met). The
existing `skillMet` sat in the discovery path, which would have made that line dead. Chose
craft-time gating — it's the only interpretation where all three requested UI changes
(skillsMet/amber line/isCraftable) function together, it surfaces "level this skill to
unlock this recipe" as a visible goal (matching the user's wish for leveling to feel
meaningful), and it's consistent with how recipes already reveal cost/Workbench
requirements. Only `stone_club`'s behavior actually changes (visible-greyed before blunt3
instead of hidden); the other current recipes are all level-0 gates. **Flag for the user:
say so if you'd rather skill-locked recipes stay fully hidden until met.**

Verified via `preview_eval`: 20 blunt hits (600 XP) level blunt 0→3 exactly (0 leftover)
and feed the player to Level 3 with 247/368 XP and 5 points (2+3) — matching the curve
math; allocating 3 Endurance bumps HP max 100→112 and stamina 100→106 (current HP tracks
up too); a real `tryAttackEnemy` grants +30 blunt on hit and +30 light_armor on the kill
(gremlin_cap worn); a 27-Strength boost visibly cut a Boar kill to 3 hits; `stone_club`
becomes discovered-but-greyed at blunt 0 with the amber "Requires Blunt Lvl 3 (currently
Lvl 0)" line and `skillsMet` false. `preview_screenshot` confirms the 3-bar HUD and both
Character-menu tabs render cleanly. Type-check clean (`tsc --noEmit`), no console errors.

### Previously: Playtest fixes after O — Gremlin spawn spacing + kite/pursue AI loop

Immediate follow-up after Milestone O's spawn-count bump surfaced two issues: Gremlins/
Gremlings could spawn in dense packs, and the ranged Gremlin's "kiting" AI always fled
regardless of distance, so a player who just held distance past shot range could never be
re-engaged. Both fixed in `src/scenes/MainScene.ts`/`src/entities/Gremlin.ts`, addressed now
rather than deferred to the planned "safe-center, danger-toward-edges" world-gen rework
(independent, small, worth fixing immediately).

- **Spawn spacing** — new `MainScene.pickSpreadSpawnPoint()` (parallel to `pickSpawnPoint`,
  same 200-attempt-then-fallback shape) rejects a candidate point if `maxNearby` or more
  existing points already sit within `minSpacing` of it. `spawnEnemies()`'s Gremlin/Gremling
  loops now share one `gremlinPoints` pool (both variants count against each other, since
  they read as one "gremlin problem" to the player) with `GREMLIN_CLUSTER_RADIUS = 140,
  GREMLIN_CLUSTER_MAX = 2` — no more than 2 gremlin-family enemies within 140px of each other.
  Snake/Boar spawn loops untouched (density complaint was Gremlin-specific).
- **Kite/pursue AI loop** (`RangedGremlin.update()`, `src/entities/Gremlin.ts`) — "ranged" mode
  used to always flee (back directly away) regardless of distance. Reworked into three bands:
  **< `RANGED_MIN_KITE_DIST` (140px)** flees (unchanged `KITE_SPEED`); **`RANGED_MIN_KITE_DIST`
  to `PROJECTILE_MAX_RANGE` (140-260px)** holds ground and fires bursts; **>
  `PROJECTILE_MAX_RANGE` (260px)** pursues straight at the player (new
  `RANGED_PURSUE_SPEED = 70`) instead of firing. `RANGED_DEAGGRO_RADIUS` bumped 260→400 to
  leave room for the pursue band — it previously equaled `PROJECTILE_MAX_RANGE` exactly, so
  any out-of-shot-range distance instantly deaggro'd instead of ever being pursued. This
  produces the flee→hold→pursue loop as the player closes and backs off, matching
  Boar/Gremling/Snake's more standard chase-until-engaged pattern instead of a Gremlin being a
  pure kiter.
- **Stop-to-shoot (same-day follow-up)** — the gremlin was still firing bursts while moving
  (kiting away, or approaching), which read wrong. `RangedGremlin.update()` now only starts a
  *fresh* burst while holding ground in the mid-range band (`inHoldBand`); a burst already
  underway (`midBurst`) forces `holdingStill = true`, overriding whatever the distance-based
  flee/pursue branch would otherwise pick, so the gremlin plants itself for the whole 2-shot
  burst even if the player closes distance mid-burst. Once the burst finishes
  (`shotsFiredInBurst` resets to 0), normal flee/hold/pursue resumes on the very next frame.
- **Shoot-while-cornered (second same-day follow-up)** — per the user, a Gremlin being chased
  in close shouldn't *only* flee; it should still periodically stop and try to shoot back, then
  resume fleeing. `holdingStill` widened from `midBurst || inHoldBand` to also allow a fresh
  burst anywhere in shot range (`inShotRange && readyForFreshBurst`, not just the ideal
  `inHoldBand`) — so a fully-close, off-cooldown gremlin now plants and fires instead of
  fleeing forever; once that burst's cooldown starts, it resumes fleeing (since `midBurst` and
  `readyForFreshBurst` are both false again) until the cooldown expires, at which point it
  plants and fires again. This produces a flee→stop-and-shoot→flee loop while cornered, not a
  pure kiter that never fights back up close.
- **Longer stand-still (third same-day follow-up)** — per the user, the plant duration itself
  needed to be at least 2x longer; it previously resumed fleeing the instant the burst finished
  (~200ms total stationary time). New `standGroundUntil` timestamp + `RANGED_STAND_GROUND_MS =
  450`: every frame the gremlin is mid-burst or starting a fresh one, `standGroundUntil` is
  pushed forward to `now + 450`, so `holdingStill` (now `inHoldBand || now < standGroundUntil`)
  stays true for a full 450ms *after* the burst's last shot fires, not just for the burst's own
  duration. Total stand-still time per stop-and-shoot episode is now ~640ms (190ms burst +
  450ms hold), over 3x the old ~200ms.

Verified via `preview_eval`: a scripted sequence at a fixed close distance (50px) confirms
`standGroundUntil` reads exactly `now + 450` the instant the burst completes, and sampling
every 100ms afterward shows the gremlin holding still (`vx: 0`) through the 400ms mark and
only resuming flee (`vx: -55`) between 400-500ms after burst completion — matching the 450ms
constant. Earlier 5-frame scripted sequence at the same close distance (50px, well
inside the old flee-only zone) confirms the loop end to end — frame 1 (cooldown ready) stops
and fires shot 1 (`vx/vy: 0`); frame 2 stays planted for shot 2 (mid-burst); frame 3 fires
shot 2 and completes the burst; frame 4 (burst now on cooldown, still close) **flees**
(`vx: -55`); frame 5 (cooldown expired, still close) **stops and fires again**
(`shotsFired: 1`, `vx/vy: 0`). Live spawn roster (18 RangedGremlin + 6 MeleeGremling = 24) has a
max of 1 same-family neighbor within 140px for every entity (no 3+ clusters); a real
`RangedGremlin.update()` sequence — aggro at 100px, then player backs to 350px (pursue,
`vx: 70` toward player), then 200px (hold, `vx/vy: 0`), then 50px (flee, `vx: -55` away) —
confirms all three bands fire correctly on the live object; a forced immediate burst at
200px shows `vx/vy: 0` while firing, moving the player to 50px away mid-burst keeps velocity
at `0,0` and the burst still in progress (not yet fleeing), and once the burst completes on a
later frame velocity flips to fleeing (`vx: -55`) on the very next `update()` call. Type-check
clean, no console errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestones N + O — Blackberry persist-on-harvest, resource-density spawn bump

Final two milestones of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`). With
these, **the entire I–O batch is done.**

- **Milestone N — Blackberry bushes harvest without destroying.** First "stays in the world
  after harvest" node in the game — every other node (branch/rock/tree/boulder/cattail) still
  destroys on collect. New `ResourceNodeConfig`/`ResourceNode` fields: `persistent?: boolean`,
  `pickedTexture?: string`, `regrowMs?: number`, plus a `harvested` runtime flag distinct from
  `depleted` (a harvested-but-alive bush must stay in `MainScene.nodes`/keep its sprite, unlike
  a depleted one, which is destroyed and filtered out). `ResourceNode.harvest()` sets
  `harvested = true`, swaps to `pickedTexture` (new `blackberry_bush_picked` — same leafy mound,
  no berry dots, `BootScene.ts`), and schedules `regrow()` via `scene.time.delayedCall(regrowMs,
  ...)` if set; `regrow()` reverts both. `tryInteract()`'s pickup branch now branches on
  `node.persistent`: persistent nodes call `collectNode()` + `harvest()` and stay in `nodes`;
  everything else keeps the old `collectNode()` + `deplete()` + remove-from-array path
  unchanged. `updateHover()`/`tryInteract()`'s existing `node.depleted` gates both grew an
  `|| node.harvested` check so a harvested bush shows no prompt and can't be re-clicked.
  Blackberry's `scatterClustered()` call (`MainScene.spawnNodes()`) now passes `persistent:
  true, pickedTexture: "blackberry_bush_picked", regrowMs: BLACKBERRY_REGROW_MS` (new constant,
  3 in-game minutes) — **regrow timing was an explicit recommendation, not a locked user
  decision**, since the original note only specified "berries removed, not the whole bush."
- **Milestone O — Resource-density spawn bump.** Per the plan's own math (worked out in the
  planning session, not redone here): RangedGremlin count **4 → 18** and Snake count **6 → 15**
  (`MainScene.spawnEnemies()`), covering the new Gremlin Armor set's `gremlin_leather`
  (~10 needed, was capped at 4 ever obtainable) and `leather`/Leather Scraps (~9 new demand on
  top of already-tight existing costs, was capped at 6) demand with margin. This is a deliberate
  departure from Milestone C's original "rarer, stronger" ranged-Gremlin tuning intent, called
  out explicitly rather than silently overridden, per the plan. `bones`/`twine`/other resources
  already had comfortable margin (Milestone L's Boar loot, existing cattail/bush counts) and
  needed no change.

Verified via `preview_eval`: a real `tryInteract()` on a hovered blackberry bush credits 2
`blackberry` to the backpack, sets `harvested: true`, swaps texture to
`blackberry_bush_picked`, and leaves the bush in `scene.nodes` (not destroyed/depleted); a
forced re-click on the same harvested bush is a no-op (berries count unchanged) and
`updateHover()` never re-selects a harvested bush as `hoveredNode`; calling the private
`regrow()` directly reverts both `harvested` and the texture back to `blackberry_bush`.
Enemy roster counts confirmed exactly `{Enemy: 12, Snake: 15, RangedGremlin: 18,
MeleeGremling: 6}` (51 total). Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` shows the world booting normally with the denser enemy roster.

### Previously: Playtest fixes batch #2 — armor equip/unequip polish, upgrade-menu docking, UI/tuning fixes

Follow-up playtest fixes on top of Milestone M, requested directly by the user in the same
session.

- **Armor Upgrade panel now docks beside the InventoryMenu** instead of floating
  screen-centered, and no longer closes the inventory when opened. `UpgradeMenu.openMenu()`
  gained an optional `anchor: {x, y}` — when set, `render()` positions the panel there instead
  of centering; `MainScene.openArmorUpgradeMenu()` passes `{x: INVENTORY_PANEL_X +
  INVENTORY_PANEL_W + 12, y: INVENTORY_PANEL_Y}` (both now exported from `InventoryMenu.ts`)
  and no longer calls `inventoryMenu.close()`. A placed station's Upgrade panel is unaffected
  (still opens with no anchor → centered, still closes the inventory, since that flow wasn't
  changed). The panel's existing "[ESC] Close" text is now also clickable (`setInteractive` +
  `close()` on `pointerdown`) as an explicit close affordance beyond the ESC key.
- **Unequip now works** — previously there was no way to take off worn armor short of
  equipping something else into the same slot. Two new gestures, both funneling into a new
  `MainScene.unequipArmorSlot(slot, toIndex?)`: **drag the equipped item out of its paper-doll
  slot** (new `beginArmorDrag`/`resolveArmorDrag`, widening `dragSource` to a
  `{container,index} | {armorSlot} | null` union) drops it into the backpack slot under the
  cursor (or the first available slot / the floor, if that target's occupied or the drop
  lands outside any panel); **right-click an occupied slot** now opens a small context menu
  (reusing `ContextMenu.ts`, same component the placed-station Upgrade/Destroy popup uses)
  with **"Unequip"/"Upgrade"** rows — an *empty* slot shows the same two rows greyed out
  ("Equip"/"Upgrade", both `enabled: false`) rather than nothing, so the interaction is
  consistent regardless of slot state. This replaced the old direct right-click-opens-Upgrade
  behavior from Milestone M (`InventoryMenuDeps.openArmorUpgrade` → `openArmorContextMenu`).
- **Event log moved beside Keybinds, not stacked underneath.** `EventLogUI` used to anchor at
  `keybindsUI.bottom + 8`, landing inside the same top-left region an open `InventoryMenu`
  panel occupies (y ≥ 48) — so opening the inventory always covered it. Now anchored at
  `keybindsUI.right + 12, keybindsUI.top` (both new getters on `KeybindsUI`) — same row as
  Keybinds, clear of the inventory panel in the common (collapsed) case. Dropped the now-dead
  `onToggle` reposition-callback plumbing between the two (`KeybindsUI` no longer takes one).
- **Crafting menu now stays open when placement mode starts** — `CraftingMenu.ts`'s "Place"
  button handler no longer calls `this.close()` after `deps.startPlacement(recipe)`. Matches
  how a plain "Craft" click already left the menu open; only inventory was staying up before,
  which was the inconsistency being fixed.
- **Tuning**: Stone Axe recipe → **4 wood, 4 stone** (was 3 wood/2 stone); Boar loot →
  **exactly 1 boar_meat and 1 bones** per kill (was 1-2 each).

Verified via `preview_eval`: right-click equips/unequips correctly through the new context
menu (occupied → real rows, empty → greyed no-ops); a simulated drag from the helmet slot
onto an occupied backpack slot correctly falls back to the next empty slot rather than
clobbering it; the Upgrade panel opens at `(532, 48)` — flush against the inventory panel's
right edge, top-aligned — with the inventory still open behind it; clicking the panel's
"[ESC] Close" text closes only the panel; a simulated real crafting-menu "Place" click (after
switching to the Crafting category tab and selecting the Workbench recipe) leaves
`craftingMenu.isOpen()` true while entering placement mode. Type-check clean, no console
errors.

### Previously: Milestone M — Gremlin Armor (first wearable armor)

Fifth milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
following the playtest fixes batch. Wires up the long-dormant `Equipment.ts` slot system
for real.

- **`Equipment.ts`** now stores `EquippedItem { key, tier }` per slot instead of a bare
  `string | null` — a worn piece's upgrade level lives on the same field a placed station's
  tier does (Milestone K's plumbing, reused rather than re-invented).
- **Three new armor items** replace the old undifferentiated `gremlin_leather_armor`:
  **Gremlin Cap** (helmet), **Gremlin Shirt** (chest), **Gremlin Pants** (legs) — new
  `ItemDef.armorSlot` field, new `BootScene.ts` icons, `Recipes.ts` entries at the plan's
  costs (tier 1, workbench-gated).
- **Equip via drag-onto-paper-doll-slot or right-click-in-backpack**, both funneling into
  `MainScene.equipArmorFromContainer()`: standard swap semantics — whatever was previously
  worn returns to the backpack (or drops on the floor if full), never silently lost.
- **Per-piece lvl-2 upgrades, triggered by right-clicking the equipped slot** — this was the
  one open design question the plan left unresolved (armor doesn't live in the world for a
  context-menu like stations do); confirmed with the user that right-click on an *occupied*
  paper-doll slot should open the same `UpgradeMenu.ts` panel a placed station's Upgrade
  button does. `UpgradeMenu` was generalized from a `StationUpgradeDef`-only panel to a
  `UpgradeDef = StationUpgradeDef | ArmorUpgradeDef` union (new `src/systems/
  ArmorUpgrades.ts`, parallel to `StationUpgrades.ts`) — same component, no duplicate UI.
- **Gremlin Pants' lvl 2 additionally requires a nearby Workbench that has itself reached
  tier 1** — new `MainScene.isNearWorkbenchAtTier()` + `armorUpgradeBlockReason()`, surfaced
  in the panel as a distinct `"(Requires nearby Workbench Lvl 2)"` suffix (new optional
  `UpgradeMenuDeps.extraBlockReason`) rather than lumped under the generic "Missing
  materials" message. Per the user, this is the template for future armor tiers gating on
  future Workbench tiers, not a Pants-only special case.
- **No numeric defense stat** — per the plan's own hedge and the standing "damage
  types/resistances are later" note, equipping is visual (paper-doll icon) + trackable
  (tier persists through Destroy/re-equip semantics the same way a station's does) only.

Verified via `preview_eval`: right-click equips all three pieces; equipping a second Cap
swaps the first back to the backpack with the total item count unchanged; a simulated real
drag onto the helmet slot's screen coordinates also equips correctly; applying the Shirt's
lvl-2 upgrade deducts `gremlin_leather`/`bones` and bumps its tier; the Pants lvl-2 upgrade
is blocked with the Workbench-tier message until a tier-1 Workbench is placed nearby, then
succeeds; the panel renders the block-reason and "(Applied)" states correctly; the real
`Crafting`/`Recipes` discovery-and-craft path (not just a direct backpack add) produces a
`gremlin_cap` once a Workbench is placed and ingredients are known. Type-check clean, no
console errors. See `.claude/plans/this-is-a-plan-cached-pixel.md`'s Milestone M section for
full file-level detail.

Also corrected two stale `CLAUDE.md` statements found while updating the roadmap for this
milestone: the 4f roadmap bullet previously described Blackberry's harvest-without-destroy
mode (Milestone N) as already shipped when it isn't — bushes still deplete/destroy on
harvest today, unchanged by this session.

### Previously: Playtest fixes batch — Gremlin/Gremling naming split, combined Tab menu, bush clustering, upgrade cost display

Small independent fixes requested directly by the user (not from the I-O plan's own list),
landed in one session between Milestone K and Milestone M.

- **Gremlin/Gremling naming split.** The two gremlin-family enemies now have distinct names:
  the ranged+melee variant (`RangedGremlin`, `src/entities/Gremlin.ts`) is **"Gremlin"**; the
  weaker melee-only variant (renamed `MeleeGremling`) is **"Gremling"** (texture
  `gremling_weak`, was "Weak Gremlin"). Confirmed with the user: **item/resource names stay
  "Gremlin ___" regardless of which variant drops them** — `gremlin_blood` drops from both,
  `gremlin_skin`/`gremlin_leather`/`gremlin_leather_armor` only from the ranged one, and none
  of those keys/display names change. This reverses an earlier same-session pass that (based on
  an ambiguous initial request) had renamed everything uniformly to "Gremling" — that pass was
  undone in full (file back to `Gremlin.ts`, all item keys/textures back to `gremlin_*`) before
  applying just the melee-only rename on top.
- **Tab now opens crafting + inventory together; no more standalone crafting key.** `T` no
  longer toggles `CraftingMenu` on its own — `MainScene.toggleCombinedMenu()` opens/closes both
  `craftingMenu` and `inventoryMenu` in lockstep, driven by `inventoryMenu.isOpen()` as the
  source of truth. `CraftingMenu`'s top-right icon changed from `[T] Craft` to `[Tab] Menu` and
  now calls a new `CraftingMenuDeps.onIconClick` callback instead of toggling itself directly,
  so the icon and the Tab key both go through the same combined-toggle path. The two panels
  already sit on opposite sides of the 1920-wide screen (inventory left, crafting right) so
  showing both at once needed no repositioning.
- **Blackberry bushes now spawn in clusters of 2-4** instead of scattered individually. New
  `scatterClustered(totalCount, clusterMin, clusterMax, cfg)` in `MainScene.spawnNodes()`
  samples one cluster center per clump via the existing `pickSpawnPoint`, then jitters each
  bush in the clump ±40px around it (falling back to the exact center if jitter pushes a point
  onto the creek, rather than rejection-sampling per-node — keeps clumps tight). Total bush
  count unchanged (16); only the distribution changed. `scatter()` itself is untouched and still
  used for every other node type.
- **Workbench upgrade popup now shows owned/required material counts**, matching
  `CraftingMenu`'s detail-panel format. `MainScene.formatUpgradeCost()` changed from `"3 Twine,
  5 Wood, 2 Stone"` to `"Twine: 3/10, Wood: 5/10, Stone: 2/5"` (have/need per resource,
  `this.backpack.count(r)` against the upgrade's cost); `UpgradeMenu.ts`'s unaffordable-row
  suffix changed from `"(Can't afford)"` to `"(Missing materials)"` to match the wording the
  user asked for.

Verified via `preview_eval` + `preview_screenshot`: Tab opens both panels side by side and
toggles them together; a spawned Boar/Snake/Gremlin/Gremling roster reports `displayName`
"Gremlin" for the 4 ranged spawns and "Gremling" for the 6 melee spawns; a test Workbench's
Upgrade panel renders `"Tool Sharpener  (Missing materials)"` / `"Twine: 2/3, Wood: 5/5, Stone:
2/2"` when under-resourced. Type-check clean throughout, no console errors.

### Previously: Milestone K follow-up round 2 — discovery toast, hover-only label, panel layout, tooltip level

Second same-day playtest pass on the Milestone K follow-up above: four small, independent fixes.

- **Station upgrades now fire the "New Recipe Unlocked!"-style toast.** They live entirely
  outside the `Recipe`/`Crafting` system (a separate `StationUpgradeDef` table), so they never
  had their own "just became discoverable" tracking — `refreshDiscovery()` silently updated
  `craftingMenu`/`inventoryMenu` but never announced anything for upgrades. New
  `discoveredUpgradeIds` (`MainScene.ts`, mirrors `Crafting`'s internal `discoveredIds` for a
  different table) + a loop in `refreshDiscovery()` that fires
  `eventLog.add("recipe", "New Upgrade Unlocked! ${upg.name}", icon)` the first time an
  upgrade's ingredients are all discovered — same `"recipe"` `LogKind`, so it rides the existing
  toast queue in `EventLogUI.ts` for free.
- **The floating "Workbench Lvl N" label is now hover-only.** `refreshStationLabel()` creates it
  `setVisible(false)`; `updateHover()` gained a small loop over `placedLabels` toggling each
  label's visibility by distance-to-pointer, independent of the existing hovered-node/enemy/rack
  "winner" logic (a label and a chop/mine prompt can never conflict, since only upgradable
  stations get a label at all).
- **`UpgradeMenu.ts` row layout reworked to stop the description from overlapping the row
  below.** The old layout used a fixed `ROW_H` with the description squeezed into a narrow
  right-aligned column — a long description could wrap past the row's box into the next row's.
  Rows are now stacked (name → cost → description, full-width wordWrap) and **each row's height
  is derived from the description's actual rendered height** (`Math.max(42 + descText.height +
  10, MIN_ROW_H)`), not a constant. Since the panel is screen-centered, this creates a
  chicken-and-egg problem (panelY depends on total content height, which depends on text objects
  that must already exist to measure) — solved by building every row at a y-baseline of 0 first,
  measuring as it goes, then shifting every created object down by the final centered `panelY` in
  one pass at the end.
- **Station level now shows in inventory/hotbar tooltips, not just the panel/floating label.**
  `stationDisplayName()` moved out of `MainScene.ts` into `StationUpgrades.ts` (no circular
  import risk — `Items.ts` doesn't depend on `StationUpgrades.ts`) so it's reusable outside the
  scene. `Tooltip.show()` gained an optional `tier` param and swaps in `stationDisplayName(key,
  tier)` for the title line when provided; `HotbarUI.ts`/`InventoryMenu.ts`/`DryingRackMenu.ts`'s
  three `tooltipUI.show(...)` call sites now all pass `stack.tier` through.

Verified via `preview_eval` + `preview_screenshot`: discovering the Tool Sharpener's last
missing ingredient (twine, after wood/stone) logs "New Upgrade Unlocked! Tool Sharpener" as a
`"recipe"`-kind entry; a placed Workbench's label is hidden until the pointer is within its hover
radius, hidden again once it leaves; the Tool Sharpener row's description now sits fully inside
its own row's box (measured: box bottom 581.5px vs. description text bottom 577.5px, no
overlap); both the backpack and hotbar tooltips for a tier-1 Workbench stack read "Workbench Lvl
2". Type-check clean, no console errors.

### Previously: Milestone K follow-up — full Upgrade panel + station level display

Same-day playtest feedback on Milestone K's inline Upgrade popup: the user wanted a real,
crafting-menu-sized panel instead of a two-line list stuffed into the right-click popup, plus
the station's level surfaced beyond just a tint.

- **`src/ui/UpgradeMenu.ts` (new)** — a full-page popup, same visual language as
  `DryingRackMenu`/`CraftingMenu` (centered panel, `[ESC] Close` hint, row list). Opened by the
  context menu's **"Upgrade" button, which is now always present and always opens this panel**
  (previously the popup only listed upgrades inline and could show nothing at all). The panel
  lists every `StationUpgradeDef` for the target's `itemKey` whose ingredients are discovered —
  **undiscovered upgrades stay invisible** (unchanged locked decision), but **already-applied
  tiers are now shown greyed with an "(Applied)" suffix instead of disappearing**, so the player
  can see the whole upgrade path on one screen. A tier beyond `current + 1` renders
  "(Requires previous tier)"; an affordable, not-yet-applied, in-order upgrade is clickable
  (green stroke). An empty discovered list renders "No upgrades discovered yet." instead of a
  blank/absent panel.
- **`MainScene.ts`**: `openContextMenuForObject()` collapsed to two always-enabled rows
  ("Upgrade"/"Destroy") — all the discovery/afford/cost logic moved into `UpgradeMenu`'s deps
  (`upgradeIngredientsKnown`/`canAffordUpgrade`/`formatUpgradeCost` are reused, not duplicated).
  New `openUpgradeMenu`/`closeUpgradeMenu`/`createUpgradeMenu`, wired into `anyMenuOpen()` and
  the existing TAB/T/ESC close chains alongside the other big menus.
- **Station level display, two places**: new `stationDisplayName(itemKey, tier)` returns
  `"<Name> Lvl <tier+1>"` for any item with at least one defined upgrade (currently just
  Workbench) and the plain name otherwise — used in the UpgradeMenu title and the
  upgrade/destroy event-log lines. New `refreshStationLabel()` creates/updates a small floating
  text label (`"Workbench Lvl 1"`, etc.) anchored above the placed sprite itself, called at both
  placement points and after every upgrade; `destroyPlacedObject()` cleans the label up. Display
  levels are 1-based (`tier` 0 → "Lvl 1") since "Lvl 0" reads as broken to a player even though
  the underlying tier field still starts at 0.

Verified via `preview_eval` + `preview_screenshot`: Upgrade button opens the full panel showing
"Workbench Lvl 1" and the Tool Sharpener row; applying it deducts cost, bumps the title/label to
"Workbench Lvl 2", and re-renders the row as greyed "(Applied)" without closing the panel;
Destroy → magnet-collected pickup → re-Place carries tier 1 (tint + "Lvl 2" label) through
correctly; an object with an undiscovered upgrade ingredient shows the "No upgrades discovered
yet." empty state at a shrunk panel height. Type-check clean, no console errors.

### Previously: Milestone K — Per-instance station tiers + named upgrade system

Fourth milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
per the recommended `L → I → J → K → M → N → O` order. Replaces the single generic
`workbench_upgrade` consumable with a **named, per-station upgrade system**, and makes a
station's upgrade tier **survive Destroy → pickup → re-Place** with a visual tell — genuinely
new plumbing, since no per-slot inventory metadata existed anywhere before this.

- **New `ItemStack.tier?: number`** (`src/systems/ItemContainer.ts`), additive-only —
  ordinary stackables (wood/stone/…) never set it. Placeable ItemDefs
  (`workbench`/`campfire`/`drying_rack`) dropped to `maxStack: 1` so two different-tier
  instances never merge into one count. New `ItemContainer.addStack()` drops a whole stack
  (preserving `tier`) into the first empty slot — `add()`'s merge-by-key path would silently
  discard the metadata.
- **Tier threaded end-to-end**: `ResourceNodeConfig`/`ResourceNode` gained a `tier?` field;
  `spawnLooseDrop()` takes an optional `tier` and tags the piece; `consolidateDrop()` refuses
  to merge tiered pieces (they carry per-instance state). A new `collectNode()` routes both
  the manual-click and magnet pickup paths through `addStack` when tiered (re-dropping the
  same tier if the backpack is full). `destroyPlacedObject()` reads the placed Image's `tier`
  into the drop; `attemptPlaceObject()`'s item-source branch consumes the exact slot (new
  `findConsumableStack`, not `removeCount`, so it can read that slot's tier before removal) and
  re-applies the tier + visual to the newly placed Image. This fixes the old latent bug where
  an upgraded Workbench's tier was silently discarded on Destroy.
- **Named upgrade table** (`src/systems/StationUpgrades.ts`): `StationUpgradeDef` +
  `STATION_UPGRADES` + `upgradesForItem()`. First entry **Tool Sharpener** — `{ appliesTo:
  workbench, resultTier: 1, costs: { twine: 3, wood: 5, stone: 2 } }`. The old
  `workbench_upgrade` ItemDef, Recipe, and BootScene texture were removed entirely — no
  intermediate craftable item, no separate consume-then-apply step.
- **Right-click Upgrade popup reworked** (`openContextMenuForObject`, `ContextMenu.ts` unchanged):
  lists each matching `StationUpgradeDef` whose next step is `tier + 1` and whose ingredients are
  all discovered (invisible otherwise — not greyed, mirroring recipe discovery), showing name +
  formatted cost. Clicking deducts resources directly from the backpack and calls the generalized
  `applyStationUpgrade` → `applyTierVisual` (a shared gold-tint tell applied at both the
  live-upgrade and re-placement render points, so they never diverge). Gremlin armor (Milestone M)
  reuses this same `tier` field on worn items rather than a parallel mechanism.

**Deviation (minor):** the visual tell is a shared gold tint (`applyTierVisual`), not distinct
per-tier art — the plan allowed "texture/tint," and a tint is the minimal generic choice matching
the old `upgradeWorkbench` behavior. A `textureForTier` lookup can slot into `applyTierVisual`
later with no call-site changes.

Verified via `preview_eval`: applying Tool Sharpener deducts twine 5→2 / wood 40→35 / stone 20→18
and tags tier=1 + gold tint; Destroy → loose drop carries tier=1 → pickup → inventory stack tier=1
→ re-place → tier=1 Workbench with tint (not tier=0); a tier-0 and tier-1 Workbench never share a
slot; the popup shows the upgrade only when discovered+affordable (hidden when twine is
undiscovered, absent on a maxed tier-1 bench). Type-check clean (`tsc --noEmit`), no console
errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestone J — Placement-mode robustness + re-placing owned stations

Third milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
per the recommended `L → I → J → K → M → N → O` order. Two related fixes to the
placement flow, both in `src/scenes/MainScene.ts` (+ a one-line-each flag flip in
`src/systems/Items.ts`):

- **Failed tier-gate no longer cancels placement mode.** `attemptPlaceObject()`'s
  `recipe.tier > 0 && !isNearWorkbench(...)` branch used to call `cancelPlacement()` —
  clicking a Drying Rack ghost while not near a Workbench dumped you out of placement mode
  entirely, forcing a trip back through the crafting menu. It now just logs "Requires a
  nearby Workbench" and returns, leaving the ghost on the cursor. Because
  `attemptPlaceObject()` re-checks `isNearWorkbench()` fresh every click, walking into
  range and clicking again just succeeds — no menu round-trip. Only an explicit cancel
  (RMB/ESC/TAB/T) or a successful placement leaves placement mode now.
- **Re-enter placement mode for a placeable you already own** (e.g. a station recovered via
  Destroy, sitting in the backpack). `placementMode` gained an optional
  `itemSource: { container, key }`: when armed from an owned stack, each placement consumes
  one of that stack (`container.removeCount(key, 1)`) instead of the recipe's ingredients,
  and running out auto-cancels. New `startItemPlacement(container, index, suppressClick)`
  closes any open menu (placement intercepts world clicks, so a menu would sit in front of
  the ghost — mirrors the crafting menu's Place flow), arms placement, and spawns the ghost.
  Entry points (both fire on pointerup, so `startItemPlacement` needs no `suppressNextPointerdown`
  trick — unlike the crafting menu's Place button):
  - **Left-click a placeable in the backpack** → enters placement mode for it. Inventory
    interactions now **match other items**: right-click a backpack placeable **quick-moves it
    to the hotbar** like any hotbar-able item (`quickMoveItem` no longer special-cases
    placeables), and the *left*-click gesture is what enters placement — specifically a
    click-in-place (drag that releases on the same backpack slot it started on), handled in
    `resolveItemDrag`'s backpack branch. A real drag to a different slot still rearranges;
    click-in-place on a non-placeable stays a no-op. (This revises Milestone J's first-pass
    behavior, where right-click entered placement — see decision note below.)
  - **Selecting a hotbar slot that holds a placeable** — placement mode now *follows the
    hotbar selection* (playtest follow-up — the original one-shot "arm on number-key" version
    was reworked): whichever slot is selected drives what's active, exactly like equipping a
    tool. Selecting a placeable enters place mode (ghost armed for it); selecting a
    tool/weapon/empty slot **exits** place mode (fixing the reported bug where switching off a
    workbench mid-placement equipped the club but left you stuck in place mode). All three
    select gestures route through one `setHotbarSelection(slot)` and behave identically:
    **number key (1-9)**, **scroll wheel** (`cycleHotbar` — now included, previously excluded),
    and **left-clicking the slot** (new — a click that releases on the same hotbar slot it
    started on is a select, not the old no-op re-drop; this also makes left-click select *any*
    item, equipping tools/weapons too, matching wheel/number). Real drags (releasing on a
    *different* slot) still rearrange. Placing consumes from the selected slot and re-arms;
    the last one running out auto-exits.
  - `campfire`/`workbench`/`drying_rack` are now `hotbarable: true` (were `false`, since
    before Destroy they never lived in a container) so they can actually be dragged into the
    hotbar. Consuming from a hotbar slot also refreshes `hotbarUI` (refreshHud only touches
    the crafting/inventory menus).
  - Consume-on-success-only carries over unchanged, so cancelling refunds nothing (nothing
    was spent yet) — the item stays in its slot.

**Decision note (recorded this session):** inventory interactions for placeables should mirror
every other item — **right-click = quick-move to hotbar**, and **left-click = enter place mode**
for that placeable (processors/stations especially). This replaced Milestone J's first-pass
"right-click enters placement" behavior after playtest feedback.

Verified via `preview_eval`: right-clicking a backpack workbench quick-moves it to the hotbar
(backpack slot cleared, workbench now in hotbar, **not** in place mode); left-click-in-place on
a backpack Drying Rack enters placement (itemSource from backpack, inventory auto-closed, item
still in the bag pending a successful place), while left-click-in-place on a non-placeable
(wood) is a no-op and a real drag to a *different* backpack slot still rearranges; placing a
2-stack tier-0 workbench from the hotbar twice depletes it (2→1→0, two objects placed, still
armed) then auto-cancels on the third empty attempt; a tier-1 Drying Rack stays armed on a
failed workbench-gate click then consumes + registers a `dryingRacks[]` entry once a Workbench
is nearby; selecting a placeable hotbar slot via number key / wheel / left-click enters place
mode and selecting a tool/weapon/empty slot exits it (equipping the tool); dragging a Drying
Rack from the backpack onto a hotbar slot lands there (the `hotbarable` flip). Type-check clean
(`tsc --noEmit`), no console errors, `preview_screenshot` shows the world booting normally.

### Previously: Milestone I — Drying Rack polish (output-based slider, recipe, tab reorg)

Second milestone out of the I–O batch (`.claude/plans/this-is-a-plan-cached-pixel.md`),
next in the recommended `L → I → J → K → M → N → O` order. Small, independent fixes
bundled because they all touch `DryingRackMenu.ts`/`Processing.ts`/`Items.ts`/`Recipes.ts`
in one pass:

- **Slider is now output-amount based**, not input-unit based. `src/systems/Processing.ts`
  gained `ProcessingStation.recipeForLoaded()` (returns the `ProcessRecipe` governing the
  loaded input, if any) and `maxPossibleOutput()` (`floor(input.count / inputPerOutput)`).
  `DryingRackMenu.ts`'s `selectedAmount` now means "desired output count" everywhere it's
  set or read (`openMenu`, `selectFullAmount`, `updateSliderFromPointer`, `render`'s clamp,
  `promptForAmount`) — e.g. loading 20 cattail (2:1 ratio) now shows a slider scaled 0..10,
  not 0..20. Input-unit conversion (`selectedAmount * recipe.inputPerOutput`) happens only
  at the `previewFor`/`process`/`deps.processAmount` call boundary inside `renderProcess()`,
  per the plan's "call-site conversion only" note — `Processing.ts`'s core `previewFor`/
  `process` signatures are unchanged. This also let the old hacky `previewOutputKey()`
  input-key-string-matching helper be deleted in favor of `recipe.output` from
  `recipeForLoaded()`.
- **Cattail's description no longer spoils processing** (`Items.ts`) — trimmed from "A reed
  from the creek's edge. Dried into twine at a Drying Rack." to "A reed harvested from the
  creek's edge.", matching how other raw pickups are described.
- **Drying Rack recipe → `wood: 5, leather: 4, bones: 2`** (was `wood: 8, leather: 1`,
  `Recipes.ts`) — now that `bones` exists (Milestone L).
- **Crafting-menu tab reorg** (`Recipes.ts` `category` field only, no cost changes):
  `campfire` moved `misc` → `crafting`, `shishkabob` moved `crafting` → `misc`, `drying_rack`
  moved `misc` → `crafting` (`workbench` was already `crafting`, untouched). Workbench,
  Campfire, and Drying Rack now all sit together in the Crafting tab; Misc's sole occupant
  is now Shishkabob.

Verified via `preview_eval`: `discoveredRecipes()` grouped by category confirms the tab
reorg (`crafting`: campfire/workbench/drying_rack/workbench_upgrade, `misc`: shishkabob
only) and the new drying_rack costs (`{bones: 2, leather: 4, wood: 5}`); loading 7 cattail
(2:1 ratio) into a real placed Drying Rack reports `maxPossibleOutput: 3` (vs. old
`maxProcessable: 7` input units) with 1 leftover correctly un-selectable; opening the rack
menu defaults `selectedAmount` to the full possible output (3, not 7); selecting 2 output
units converts to 4 input units at the process call site, yields +2 twine, and leaves 3
cattail loaded (7 - 4 = 3) — confirmed via the real `processRackAmount` path, not a direct
`ProcessingStation.process` call. Type-check clean (`tsc --noEmit`), no console errors,
`preview_screenshot` shows the reworked rack menu mid-session (live "Amount: 1 / 1" after
the test above left 1 output's worth of cattail loaded, "-> 1 twine" preview, no progress
bar/output slot per the earlier rework).

### Previously: Milestone L — new `bones` resource (Boar loot)

First implementation milestone out of the I–O batch planned last session
(`.claude/plans/this-is-a-plan-cached-pixel.md`), picked first per its own recommended
`L → I → J → K → M → N → O` order since bones unblocks both Milestone I's Drying Rack
recipe change and Milestone M's Gremlin Shirt. Small, mechanical addition, no new systems:

- **`src/systems/Inventory.ts`**: added `bones` to the `ResourceType` union.
- **`src/systems/Items.ts`**: new `bones` `ItemDef` (non-hotbarable, stacks to 99),
  following the `boar_meat`/`gremlin_blood` loot-item pattern exactly.
- **`src/scenes/BootScene.ts`**: new `icon_bones` texture (two crossed off-white bone
  shapes) generated the same way every other placeholder icon is.
- **`src/scenes/MainScene.ts` `spawnEnemies()`**: Boar's `loot: LootEntry[]` gained a
  second entry, `{ resource: "bones", min: 1, max: 2 }`, alongside the existing
  `boar_meat` entry — `LootEntry`/`rollLoot()` already supported multiple independently-
  rolled entries per enemy (added back in Milestone C for the ranged Gremlin's
  skin+blood drop), so no type or loot-rolling logic changes were needed.

Verified via `preview_eval`: a live Boar's `rollLoot()` now returns both
`{resource: "boar_meat", amount: 1-2}` and `{resource: "bones", amount: 1-2}` in one
call; `icon_bones` texture exists and loads. Type-check clean (`tsc --noEmit`),
`preview_screenshot` shows the world booting normally, no console errors.

### Previously: Planning session — Drying Rack polish, station-upgrade rework, Gremlin armor (Milestones I–O)

Plan-update session (no code changes) following a fresh round of playtest feedback after
Milestone H. Full plan: `.claude/plans/this-is-a-plan-cached-pixel.md`, referenced from
`CLAUDE.md`'s new roadmap item **4f**. Three Explore agents surveyed `Items.ts`/`Recipes.ts`/
`Inventory.ts`, `Processing.ts`/`DryingRackMenu.ts`/`ResourceNode.ts`/the placement-mode flow,
and `Enemy.ts`/hotbar/right-click handling before the plan was written, so implementation
sessions for I–O shouldn't need to re-explore those areas.

**Locked decisions from this session:**
- **Crafting-menu tab reorg**: Workbench, Campfire, and Drying Rack all move into the
  **Crafting** tab (campfire is conceptually a processor too, per the user); Shishkabob moves
  to **Misc**. No new "Stations"/"Processors" tabs — simpler than what was first proposed.
- **Station-upgrade popup** (right-click "Upgrade") only lists upgrades whose ingredients have
  all been discovered at least once — mirrors the existing tier-1 recipe-discovery gating,
  not "show everything greyed out."
- **Armor equip** supports both **drag onto the paper-doll slot** and **right-click to
  auto-equip** — matches the existing hotbar right-click-to-quick-move precedent.

**New milestones planned (I–O, continuing the A–H lettering), not yet built:**
- **I** — Drying Rack polish: slider reworked to represent desired **output** amount
  (auto-scaled 0..max possible output, not input units), Cattail's description stops
  spoiling what it processes into, recipe changes to `wood:5, leather:4, bones:2`, tab reorg.
- **J** — Placement-mode bug fix (a failed tier-gate check no longer cancels placement mode —
  it stays armed so walking into Workbench range lets the next click succeed) + a new way to
  re-enter placement mode from an inventory/hotbar item (e.g. a Workbench recovered via
  Destroy) via right-click or hotbar-select.
- **K** — Per-instance station tiers + named upgrade system: replaces the single generic
  `workbench_upgrade` consumable with named recipes (e.g. "Tool Sharpener": 3 twine/5 wood/2
  stone) applied directly via the right-click Upgrade popup, and fixes a **latent bug found
  during exploration**: an upgraded Workbench's tier is currently silently discarded on
  Destroy (no tier tag survives placed-Image → loose-pickup → inventory-stack today).
  Flagged as new architecture — recommend Opus.
- **L** — New `bones` resource (Boar loot), unblocks I and M.
- **M** — Gremlin Armor set (Cap/Shirt/Pants → helmet/chest/legs), the first real use of the
  long-dormant `Equipment.ts` slot system (exists since Milestone H, nothing ever called
  `equipment.set()` until now). Replaces the old undifferentiated `gremlin_leather_armor`
  recipe. Each piece has its own lvl-2 upgrade cost; Pants' lvl 2 additionally requires the
  Workbench's own upgrade tier.
- **N** — Blackberry bushes gain a harvest-without-destroy mode (berries picked, bush stays
  in the world) — the game's first persistent-after-harvest node; no such pattern existed
  anywhere in the codebase before this.
- **O** — Resource-density audit. **Two real shortfalls found by math, not guesswork**:
  the Gremlin Armor set needs ~10 `gremlin_leather` (base + lvl-2 upgrades) but only
  RangedGremlin drops `gremlin_skin` and only 4 spawn per session (max 4 ever obtainable);
  new `leather` scrap demand (~9, on top of existing Stone Pickaxe/Club costs) exceeds what
  6 Snakes per session can ever supply. Recommends bumping RangedGremlin (~4→16-20) and
  Snake (~6→14-16) spawn counts — a real departure from Milestone C's original
  "rarer, stronger" ranged-Gremlin tuning intent, called out deliberately rather than
  silently overridden when O is implemented.

Recommended implementation order: **L → I → J → K → M → N → O** (bones first since two other
milestones need it; J and N can slot in anywhere convenient). See the plan file for full
per-milestone detail, file:line references, and verification steps.

### Previously: Drying Rack rework (instant processing + slider), placed-object Upgrade/Destroy, inventory Drop/Destroy

Playtest follow-up right after Milestone H landed — several user-requested changes to the
system, all in one session:

- **Cattail now spawns IN the shallow water at the creek's edge**, not on the surrounding
  land. `Biome.isCreekEdge` was inverted: it now returns true for a *creek* cell that
  touches dry land (the outer ring of the water), instead of a *land* cell that touches
  creek. Verified: all 22 cattails land on-water (`isCreekAt` true), 0 on land.
- **Drying Rack now requires a Workbench**: its recipe tier 0→1. This doubles as "must be
  placed near a Workbench," since tier-1 gating already checks proximity at craft/place
  time. **Bug found + fixed while verifying this**: `attemptPlaceObject()` (the placeable
  path) never actually enforced the tier/workbench-proximity gate — only `craftRecipe()`
  (the backpack-item path) did. Harmless before (every placeable was tier 0), but silently
  let a tier-1 placeable go down anywhere once Drying Rack became one. Added the same
  `recipe.tier > 0 && !isNearWorkbench(...)` guard to `attemptPlaceObject()`.
- **New `workbench_upgrade` item/recipe** (tier 1, `wood: 10, stone: 8, twine: 3`) — costing
  `twine` means it's only discoverable once the player has produced twine at least once,
  which is exactly "making twine unlocks Workbench Upgrade" via the existing
  ingredient-known discovery mechanism, no bespoke flag needed.
- **New generic placed-object right-click menu** (`src/ui/ContextMenu.ts`) — Right-click any
  placed object (Workbench/Campfire/Drying Rack) within reach pops "Upgrade" (only shown for
  Workbench; consumes 1 `workbench_upgrade`, tags `tier: 1` on that specific placed image via
  `setData`, tints it gold — the *mechanical* payoff of an upgraded tier is intentionally
  undesigned this pass, this just wires the consume-and-flag mechanism + a visual tell) and
  "Destroy" (always shown; removes the object and spawns it back as a Minecraft-style
  recoverable loose pickup — a Drying Rack's still-loaded raw input is refunded the same way
  first, so destroying one doesn't eat whatever was inside it). One system covers every
  placeable type, not per-type code.
- **Drying Rack reworked to instant processing** — `src/systems/Processing.ts` dropped its
  `tick()`/duration model entirely. `ProcessingStation` now just holds the loaded input;
  `previewFor(amount)`/`process(amount)` let the player pick *how much* of the loaded stack
  to run through in one instant action (rounds down to a whole multiple of the recipe's
  ratio — e.g. processing 7 of a 2:1 input consumes 6, yields 3, leaves 1 loaded). No more
  progress bar or "Collect" button: processed output auto-deposits into the backpack, and
  overflow (backpack full) drops on the floor next to the player instead of being lost —
  same fallback the new Drop/Destroy system below uses.
- **`DryingRackMenu` UI reworked**: removed the progress bar, output slot, and "drag reeds or
  skins here" hint (replaced with the Drying Rack's own `itemDef` description, always
  visible). Added an **amount slider** (drag the track, or click the "Amount: N / max" label
  to type an exact number via `window.prompt` — a pragmatic choice given this project has no
  DOM text-input UI anywhere yet) driving a live "→ M Twine" preview, and a **Process**
  button. The slider's drag gesture reuses the same global `pointermove`/`pointerup` pair
  `MainScene` already had for item-drag ghosts (`DryingRackMenu.isDraggingSlider()` /
  `updateSliderFromPointer()` / `endSliderDrag()`), rather than a separate input path.
  Loading input resets the slider to the new full amount (`selectFullAmount()`, called from
  `loadRackInput`) — but only on a fresh load, not every re-render, so it never fights a
  manual mid-session adjustment.
- **New inventory Drop/Destroy system** — dragging a stack out of any open menu **onto the
  game world** (not over any panel or fixed HUD) drops it as a recoverable loose pickup near
  the player; dragging it onto a new **trash box** in the `InventoryMenu` (bottom-right,
  below the equipment grid) destroys it permanently, no refund. Both reuse the same
  `resolveItemDrag()` entry point item-move already used, branching on where the pointer
  ended up. `ResourceNode.resource` was widened from `ResourceType` to a plain `string` (and
  gained an optional `magnetReadyAt` cooldown field) so a dropped/destroyed-placeable pickup
  can carry *any* item key (tools, weapons, the Drying Rack itself), not just raw resources
  — `spawnLooseDrop()` picked up a `magnetCooldownMs` param (default 0, unchanged behavior
  for normal resource-node drops) so player-initiated drops don't instantly fly back into
  the inventory that just released them; `updateMagnet()` now skips a piece until its
  `magnetReadyAt` has passed. Manual click-pickup is unaffected by the cooldown.

Verified via `preview_eval`: all 22 cattails now `isCreekAt`-true (was land-adjacent before);
Drying Rack placement blocked far from a Workbench and succeeds standing at one (confirming
the `attemptPlaceObject` fix); `workbench_upgrade` undiscoverable until wood+stone+twine are
all known; `previewFor`/`process` round correctly on non-multiple amounts (7 of a 2:1 ratio
→ consumes 6, yields 3, 1 remains loaded — confirmed across two sequential partial-amount
calls); a full backpack correctly floor-drops processing output/retrieved input with an
active magnet cooldown; dragging a stack onto the trash box destroys it with no floor
pickup, dragging one out to the world spawns a magnet-cooldown-gated pickup; right-click
context menu opens on a placed Workbench, "Upgrade" consumes the item and sets
`tier: 1` + gold tint, "Destroy" removes the object, spawns it back as a pickup, and (for a
Drying Rack with loaded input) also refunds that input as separate loose pieces; normal
chop/mine interaction still works unchanged post-rework. Type-check clean (`tsc --noEmit`),
no console errors, `preview_screenshot` confirms the reworked rack menu (description text,
slider, live preview, Process button, no progress bar), the inventory trash box, and the
context menu popup all render correctly.

### Previously: Milestone H — Harvestables + Drying Rack (first processing station)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone H, the
last open item in the first-biome content pass — **built on Opus per the plan's "net-new
architecture → Opus" guidance**). This introduces the game's **first timed processing
system** (load raw input → wait → collect a different output, distinct from Crafting's
instant spend-get model) and its **first drag-and-drop interaction**.

- **New resources** (`Inventory.ts` `ResourceType`, `Items.ts` `ITEM_DEFS`, `BootScene.ts`
  icons + world textures): `cattail`, `blackberry` (harvestables) and `twine`,
  `gremlin_leather` (processed outputs). New world sprites `cattail`, `blackberry_bush`,
  `drying_rack`; new icons for all four resources plus `icon_drying_rack` and
  `icon_gremlin_leather_armor`.
- **Harvestables** (`MainScene.spawnNodes`): **Blackberry bushes** (16, forest, free
  pickup — a future food item, no eating mechanic yet, deliberately per the plan).
  **Cattail** (22) uses a bespoke spawn constraint — the reedy **creek *border*** (dry land
  adjacent to water), not just "off the creek". New `Biome.isCreekEdge(x,y)` (4-neighborhood
  creek-adjacency) + `MainScene.pickCreekEdgePoint()` rejection sampler, since scatter's
  zone/avoidCreek sampling can't express "shoreline". Verified: all 22 cattails land on
  creek-edge cells (0 on water); all 16 berries in forest (0 on water).
- **New file `src/systems/Processing.ts`** — framework-light like Stamina/Biome (no Phaser
  dep, owns no GameObjects). `PROCESS_RECIPES` (ratios locked in the plan: `cattail→twine`
  **2:1** at 3s/unit, `gremlin_skin→gremlin_leather` **1:1** at 4s/unit — durations were a
  first-pass tuning call, unset in the plan). `ProcessingStation` holds `input`/`output`
  slots + progress; `tick(deltaMs)` produces as many whole batches as elapsed time allows
  (so a rack left running while its menu was closed catches up in one tick, not one
  batch/frame); `previewOutput()` returns the total yield (produced + still-extractable)
  for the live preview; `canAccept()` enforces one-input-type-at-a-time.
- **Drying Rack** — new placeable (`drying_rack` recipe: tier 0, 8 wood + 1 leather, `misc`
  tab), placed via the exact existing campfire/workbench placement flow. Each placed rack
  gets its own `ProcessingStation`, tracked in a new `dryingRacks[]` (paired with its image),
  ticked every frame in a new `MainScene.updateProcessing()` (runs in both the normal and
  death-freeze update branches — drying is real-time, not gated on the player watching).
- **New file `src/ui/DryingRackMenu.ts`** — the game's first processing-station UI and
  first drag-and-drop. Opened by interacting with a placed rack (`[LMB] Use Drying Rack`
  hover prompt, gated on reach; racks are hover-tested alongside nodes/enemies in
  `updateHover`). Shows the **backpack alongside** the station's input/output; backpack
  items that aren't a valid input for this station are **dimmed** (affordance only, keyed
  off `station.canAccept`, mirroring the crafting menu's grey-out pattern). Player **drags**
  a valid item onto the input slot (`resolveItemDrag` now routes to `loadRackInput` when the
  drop is over the input box, reusing MainScene's existing shared drag controller);
  right-click a valid stack **quick-loads** the whole thing. A **live output preview box**
  under the input shows the projected total (e.g. 10 cattail → "5 Twine"); a **progress bar**
  + "Drying…/Idle/Empty" status; a **Collect** button moves ready output to the backpack;
  clicking a loaded input pulls the raw material back out. Re-rendered every frame while open
  (MainScene drives it) so progress/counts/preview stay live as drying advances on its own.
  Flat `scrollFactor(0)` objects, no Containers — same input-hit-testing constraint as the
  other menus.
- **Downstream payoff wired in**: `gremlin_leather_armor` recipe (tier 1, `armor` tab —
  which already existed — 2 gremlin_leather + 2 twine) gives the two processed outputs a
  crafting sink. It's discoverable once twine + gremlin_leather are first collected AND a
  Workbench has been placed (tier-1 gate). **Not yet wearable** — the armor-equip system
  doesn't exist yet, so it sits in inventory like boar_meat/shishkabob do; that's expected.
  The Slingshot's twine ingredient remains a noted-not-built downstream hook.

Verified via `preview_eval` (snapshotting **primitive values**, not live object refs — a
gotcha this session: returning live `st.input`/`st.output` refs let the still-running game
loop mutate them to completion before the tool serialized the result, which briefly looked
like a tick bug but wasn't): spawn constraints exact (22 cattail all creek-edge, 16 berries
all forest, 0 on water); station 2:1/1:1 ratios + 3s/4s pacing + half-progress fraction;
`loadRackInput`/`collectRackOutput`/`retrieveRackInput` move items correctly and respect a
full backpack; menu open/close/binding + `anyMenuOpen`; discovery unlocks `drying_rack`
(tier 0) and `gremlin_leather_armor` (tier 1, needs a bench); drop-target geometry
(backpack slot indices + input box) matches the drawn boxes; and a full simulated
drag-from-backpack-onto-input-slot loads the stack and empties the bag slot end to end.
Type-check clean (`tsc --noEmit`), no console errors, `preview_screenshot` shows the world
booting with cattails on the banks + blackberry bushes in the trees, and the rack menu
rendering correctly (dimmed non-inputs, mid-progress bar, Collect button).

### Previously: Fixed enemies still walking off world bounds (Arcade Group defaults gotcha)

User reported enemies were *still* able to run off the map/screen, despite `Enemy.ts`'s
constructor already calling `this.setCollideWorldBounds(true)` (added in an earlier
session — see the "Enemies no longer walk off world bounds" entry further down). Root
cause was one level up: `MainScene.create()` builds `this.enemyGroup =
this.physics.add.group()` with **no config**, then `spawnEnemies()` calls
`this.enemyGroup.add(enemy)` for every spawned enemy. Phaser's `PhysicsGroup.
createCallbackHandler` re-applies the **group's own defaults** to every member's body on
`add()` — including `setCollideWorldBounds`, which defaults to `false` unless the group
is configured with `collideWorldBounds: true`. That silently *undid* the per-entity
`setCollideWorldBounds(true)` the instant each enemy was added to the group, for every
enemy type (Boar/`Enemy`, `Snake`, `RangedGremlin`, `MeleeGremlin`) — same class of bug
as the already-documented `Projectile` velocity-zeroing gotcha (STATUS.md, Milestone C),
just resetting a boolean instead of a vector, and in a different Group (`enemyGroup` vs
`enemyProjectiles`). See `[[survivor-rpg-phaser-arcade-group-defaults-reset]]` in memory
for the general pattern — this is the second time it's bitten this codebase and is worth
checking any time a fresh Group is created and used to `.add()` already-constructed
entities that set body properties in their own constructor.

- **Fix** (`src/scenes/MainScene.ts`, `create()`): `this.physics.add.group({
  collideWorldBounds: true })` instead of the no-config call. Applies to every current
  and future `Enemy` subclass automatically — no per-species change needed, same as the
  original per-entity fix intended.

Verified via `preview_eval`: before the fix, `enemyGroup.getChildren()[i].body.
collideWorldBounds` read `false` for every spawned enemy (confirming the bug
reproduces). After the fix and a page reload, all 28 spawned enemies across all four
types (`Enemy`: 12, `Snake`: 6, `RangedGremlin`: 4, `MeleeGremlin`: 6) report
`collideWorldBounds: true`. Type-check clean, no console errors, world renders normally.

### Previously: Range-ring toggle (O key)

Follow-up to the attack-range ring below, same session — user asked for a way to turn
the ring on/off. Mirrors the existing magnet toggle (`V`) pattern exactly:

- **`src/scenes/MainScene.ts`**: new `rangeRingEnabled = true` field, `keydown-O` binds
  to a new `toggleRangeRing()` (flips the flag, logs to the event log, and clears the
  Graphics immediately if turning off so it doesn't linger a stale frame). `updateAttackRangeRing()`
  now checks `!this.rangeRingEnabled` before the equip check — toggle wins even while a
  weapon/tool is equipped. Added `"Range ring: O"` to the `KeybindsUI` list.

Verified via `preview_eval`: with a tool equipped, `updateAttackRangeRing()` draws (14
commands), calling `toggleRangeRing()` clears it to 0 regardless of equip state, toggling
again restores the draw. Confirmed the real `keydown-O` event (via
`scene.input.keyboard.emit`) flips `rangeRingEnabled` end-to-end, not just the
direct-method-call path. Type-check clean, no console errors, `preview_screenshot` shows
the ring rendering around the player when enabled.

### Just finished: Dash i-frames (Milestone E) + attack-range ring (Milestone F)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestones E
and F — both flagged "fully independent," picked up together since they're small and
don't touch overlapping code).

- **Milestone E — dash → dodge + i-frames** (`src/entities/Player.ts`,
  `src/scenes/MainScene.ts`): `DASH_SPEED` 340→450 and `DASH_DURATION_MS` 160→105 for a
  sharper burst-then-stop feel (net displacement stays similar). New
  `DASH_IFRAME_MS` (150, in `MainScene.ts`) set on `this.invulnerableUntil` at the same
  site `DASH_STAMINA_COST` is already spent (`frame.dashStarted` branch in `update()`) —
  slightly outlasts the dash itself. Reuses the existing `invulnerableUntil` field/guard
  in `applyDamageToPlayer()` unchanged (already generic to any code setting it) — same
  mechanism as respawn invuln, different constant, not shared. `DASH_COOLDOWN_MS` (600)
  left as-is per the plan.
- **Milestone F — attack-range indicator** (`src/scenes/MainScene.ts`): new
  `attackRangeRing: Phaser.GameObjects.Graphics` created in `create()` (depth -5, just
  above ground/-10, below entities), redrawn each frame in a new
  `updateAttackRangeRing()` called alongside `syncEquippedIconPosition()` in both
  `update()` branches (normal and the frozen-on-death branch, so it doesn't vanish on
  death). Equipped-gated only (`!equippedTool && !equippedWeapon` → `clear()` and
  return — empty draw, cheapest hide), deliberately **not** target-gated per the plan
  (would flicker during approach). Radius = flat `REACH` (64) — no per-weapon range
  table exists yet, so the ring reads the same constant all melee already uses.

Verified via `preview_eval`: `updateAttackRangeRing()` with nothing equipped leaves the
Graphics' `commandBuffer` empty (len 0); equipping `stone_axe` and calling it again
produces draw commands (len 14); unequipping clears it back to 0 — confirms the
show/hide gating end-to-end without needing real mouse/pointer simulation. Manually
set `invulnerableUntil` to mirror the dash-start branch and confirmed
`time.now < invulnerableUntil` reads true immediately after, matching what
`applyDamageToPlayer()`'s existing guard checks. Type-check clean
(`tsc --noEmit`), `preview_screenshot` shows the world booting normally with no ring
visible pre-equip (correct), no console errors.

### Previously: Boar tuning for the 2x world (Milestone B)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone B —
the numeric-tuning half; the movement/zigzag half was already resolved earlier via
non-solid trees). Addresses the long-standing "Boar too aggressive" flag from `STATUS.md`
now that the world is the larger 2560x1920 size.

- **`src/entities/Enemy.ts`**: `AGGRO_RADIUS` 140 → 105 (smaller, per the plan —
  complaint was aggression, not size), `DEAGGRO_RADIUS` 280 → 190 (kept the same ~1.8x
  ratio to AGGRO_RADIUS for the hysteresis gap).
- **`src/scenes/MainScene.ts` `spawnEnemies()`**: Boar count 8 → 12, now split 80%
  forest / 20% grassy (was 100% forest) via two `pickSpawnPoint` calls instead of one —
  matches "Boar common in Forest, rare in grassy" from the plan. Player-spawn clear
  radius 200 → 220 (~2x the new, smaller aggro radius, keeping the same ratio the plan
  called out as the actual point of the original 150→200 change).

Verified via `preview_eval`: spawn counts are exactly 12 Boars (11 forest / 1 grassy in
the sampled run — consistent with 80/20 weighting under normal RNG variance); real
`Enemy.update()` calls confirm a Boar stays `idle` at 110px and flips to `chasing` at
100px (matching the new `AGGRO_RADIUS`), and a chasing Boar stays `chasing` at 185px but
drops to `idle` past 195px (matching the new `DEAGGRO_RADIUS`). Type-check clean, no
console errors, world renders normally in `preview_screenshot`.

### Just finished: Enemies no longer walk off world bounds

Enemies were missing `setCollideWorldBounds(true)` — `Player.ts` has always had this, but
`Enemy.ts`'s constructor never did, so chase/flee/kite AI (Boar chasing, Snake fleeing,
RangedGremlin kiting) could push an enemy straight through the edge of the 2560x1920
world. Fixed with a one-line addition in `Enemy.ts`'s constructor, right next to
`scene.physics.add.existing(this)` — mirrors `Player`'s existing call exactly. Applies to
every `Enemy` subclass (Boar, Snake, RangedGremlin, MeleeGremlin) for free, no per-species
changes needed.

### Noted, not acted on: Hold LMB to continuously attack/chop/mine

User request (2026-07-07): holding left-mouse-button down should continuously
attack/chop/mine the hovered target, rather than requiring a fresh click per hit. Today
`tryInteract()` only fires from the `pointerdown` event handler — a held button doesn't
re-trigger it. The existing per-tool/weapon cooldown gating (`lastToolHitAt`/
`lastWeaponHitAt` + `toolCooldownMs`/`weaponCooldownMs`) already caps the effective hit
rate correctly, so the fix is purely about *triggering* on hold (checking
`pointer.isDown` each frame against the cooldown, alongside — or instead of — the
one-shot `pointerdown` handler), not about changing any damage/cooldown numbers. Not
implemented yet — flagging for a future session.

### Noted, not acted on: Player attack speed too high starting off (needs per-item tuning)

User feedback (2026-07-07): starting weapon/tool attack speed feels too fast right out of
the gate. Current cooldowns live in `weaponCooldownMs()` (`src/systems/Weapons.ts`: Wood
Club 450ms, Stone Club 550ms) and `toolCooldownMs()` (`src/entities/ResourceNode.ts`: both
stone tools 500ms) — these should be tuned up (slower) for the starting tier. Longer-term,
the user wants attack speed to be a **buffable stat** (something that can later be sped up
via gear/skills/consumables) and to **vary per item** (already partly true via the
per-`WeaponType`/`ToolType` cooldown tables, but the starting values across the board are
too fast and haven't been deliberately tuned as a set). Not implemented yet — flagging for
a future session; when tackled, revisit both tables together rather than one weapon at a
time so the relative pacing across items stays coherent.

### Just finished: Fixed the real freeze — projectile-overlap callback was destroying the player

The hysteresis fix below didn't resolve the reported freeze; the user then reproduced it
again and this time captured the actual browser console error, which pinned it down
immediately:

```
Player.ts:71 Uncaught TypeError: Cannot read properties of undefined (reading 'time')
    at Player.update (Player.ts:71:28)
    at MainScene.update (MainScene.ts:283:31)
```

**Root cause**: `MainScene`'s `enemyProjectiles` vs `player` overlap callback
(`this.physics.add.overlap(this.enemyProjectiles, this.player, (proj) => {...})`) assumed
Phaser always calls the callback as `(object1, object2)` matching registration order —
i.e. that the first argument is always the projectile. That's a real Phaser gotcha for a
**Group-vs-single-object** overlap specifically: argument order isn't guaranteed to match
registration order the way it reliably does for single-vs-single. When it came back
swapped, `proj` was actually **the player**, and `projectile.destroy()` destroyed the
player sprite instead of the projectile — leaving `this.player` a dead reference with no
`.scene`, so the very next frame's `this.player.update()` (`Player.ts:71`,
`this.scene.time.now`) threw and killed the game loop. This exactly matches the reported
repro ("right when projectile hits me the game freezes") — freezes right where the earlier
"known verification gap" note (this session's Milestone C entry) had flagged the live
overlap path as unverified.

- **Fix** (`MainScene.ts`, the overlap callback): instead of trusting argument position,
  pick whichever of the two callback args is actually `instanceof Projectile` and destroy
  *that* one — correct regardless of which slot Phaser puts it in.

Verified: type-check clean, world boots and renders with no console errors. Real-time
physics-driven overlap firing still couldn't be exercised end-to-end via `preview_eval`
this session (same environment throttling as before — manual `world.step()`/`world.update()`
calls don't reproduce a live overlap outside the real per-frame loop), but the fix removes
the exact failure mode the user's own console trace identified, and the surrounding logic
(damage application, i-frames) was already verified correct in the prior entry.

### Just finished: RangedGremlin melee/ranged mode hysteresis (freeze report follow-up)

User reported the game "freezing" while engaging a ranged Gremlin at melee range, right
after the combat-pattern rework below shipped. Extensive stress-testing (300 synthetic
frame ticks via direct `s.update()` calls, 200 direct `updateEnemies()` calls, a full
attack-to-kill sequence via `tryAttackEnemy()`) turned up **zero exceptions and no
infinite loop** — so this wasn't a crash in the reproducible sense. It did turn up a real
design gap, though: the melee↔ranged mode toggle used a **single shared distance
threshold** (`RANGED_MELEE_RANGE`, 24px) for both entering and leaving melee — every other
aggro/deaggro transition in this codebase (Boar/Snake/MeleeGremlin) deliberately uses a
*gap* between its enter/exit radii specifically to avoid boundary flicker, and this one
didn't. With the player-enemy physics collider constantly separating overlapping bodies,
hovering right at ~24px could flip the mode every single frame — very plausibly reading
as a "freeze"/stutter even without a real crash.

- **New `RANGED_MELEE_EXIT_RANGE` (40px)** — entering melee still triggers at 24px, but
  leaving it now requires backing out past 40px, not just past 24px again. Implemented as
  an explicit two-branch check (`if mode is meleeing: only leave past exit range; else:
  only enter at/under the enter range`) rather than a single ternary re-evaluated every
  frame, so the mode is now sticky within that 16px buffer band instead of knife-edged.

Verified via `preview_eval`: jittering the player back and forth across the *old* 24px
boundary (samples at 22-38px) all correctly stayed in `"meleeing"` instead of flickering;
only actually crossing 40px flipped it back to `"ranged"`. Type-check clean, no console
errors, world renders normally. **Flagged to the user**: since no crash was reproducible
despite significant effort, if the freeze persists after this fix, the browser console
error (F12 → Console) at the moment it happens would be the fastest way to pin down an
actual exception, if one exists beyond this flicker issue.

### Just finished: RangedGremlin combat pattern rework + HP doubled

Playtest follow-up right after Milestone C landed — the ranged Gremlin's old
kiting/throwing/melee-fallback split didn't match the intended feel:

- **New pattern**: once the player is in range, the Gremlin **always kites** (backs
  directly away) while managing a **2-shot burst** (`BURST_SHOT_COUNT`, fired
  `BURST_SHOT_INTERVAL_MS` (180ms) apart — a quick "double tap"), then a longer
  `BURST_COOLDOWN_MS` (2400ms) before the next burst — replacing the old flat
  `THROW_COOLDOWN_MS` single-shot-per-cooldown behavior and the old
  `PREFERRED_RANGE` band (no more "hold ground between preferred and aggro" state;
  it's just always retreating now while in ranged mode).
- **Melee is now a real two-way mode toggle, not a one-way fallback**: `this.mode =
  dist <= RANGED_MELEE_RANGE ? "meleeing" : "ranged"` is recomputed every frame off
  the same threshold — closing inside melee range flips it into meleeing (fights
  back, same claw/cooldown as before); backing back out immediately flips it back
  to ranged/kiting, resuming the burst cycle. Previously melee was only entered as
  a fallback and there was no explicit "kiting" mode separate from "throwing."
  `RangedMode` narrowed from `"idle" | "kiting" | "throwing" | "meleeing"` to
  `"idle" | "ranged" | "meleeing"`.
- **`RANGED_MAX_HEALTH` doubled, 16 → 32** — the old HP felt too fragile for how
  much pressure the ranged pattern is meant to apply.

Verified via `preview_eval`: a fresh contact fires shot 1 immediately, a second
shot at +100ms is correctly withheld (inside `BURST_SHOT_INTERVAL_MS`), fires at
+200ms (burst complete), stays withheld through +500ms (burst cooldown), and a
new burst starts once `BURST_COOLDOWN_MS` has elapsed (4 total projectiles spawned
across that sequence, matching the expected 1/1/2/2/3 running counts at each
checkpoint). Separately: a Gremlin placed within `RANGED_MELEE_RANGE` immediately
reports `mode: "meleeing"`, zero velocity, and lands a claw hit (respecting its own
cooldown on a second call); moving the player back out to 100px on the same
Gremlin flips it back to `mode: "ranged"` with velocity pointing away from the
player. `maxHealth` confirmed at 32. Type-check clean, no console errors,
`preview_screenshot` shows the world/enemies rendering normally.

### Just finished: Projectile system + Gremlin (Milestone C) — two variants

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone C,
now done — picked ahead of B's remaining Boar-tuning half since it unblocks the
Drying Rack's `gremlin_skin → gremlin_leather` line, per the plan's "Priority note #2").

- **New file `src/entities/Projectile.ts`** — the game's first ranged-attack primitive,
  generic and reusable (not Gremlin-specific): `ProjectileConfig` (`x, y, angle, speed,
  damage, texture, maxRangePx, sourceIsPlayer`), self-destroys once traveled distance
  reaches `maxRangePx` (distance-based despawn, not a timer, so faster projectiles
  aren't accidentally shorter-ranged). A `ProjectileHost` interface
  (`spawnProjectile(cfg): Projectile`) lets `Enemy` subclasses call
  `(this.scene as unknown as ProjectileHost).spawnProjectile(...)` without importing
  `MainScene` directly (would be circular — `MainScene` already imports entity classes).
  **Gotcha hit + fixed**: setting the physics body's velocity in the constructor was
  silently zeroed the moment `MainScene.spawnProjectile()` added the sprite to the
  `enemyProjectiles` Arcade Group — Arcade Groups overwrite a freshly-enabled body's
  velocity with their own (zeroed) defaults on `add()`. Fixed by storing the computed
  velocity and exposing a `launch()` method the spawner calls *after* `group.add()`.
- **`MainScene.ts`**: new `enemyProjectiles` Arcade group + an overlap collider against
  the player that calls the same `applyDamageToPlayer()` entry point melee damage
  already goes through (so it respects i-frames/death same as everything else), then
  destroys the projectile. No `playerProjectiles` group yet — nothing fires one until
  the Slingshot exists; that'll need its own group + overlap-vs-enemies wiring then.
- **`src/entities/Enemy.ts` loot generalized**: `EnemyConfig.lootResource/lootMin/lootMax`
  (single-drop) replaced with `loot: LootEntry[]` (one or more independently-rolled
  `{resource, min, max}` entries) and `rollLoot()` now returns an array instead of a
  single object — needed because the ranged Gremlin drops two different resources
  (skin + blood) on death, and the existing single-entry shape couldn't express that
  without per-species branching in `MainScene`. Boar and Snake's spawn configs updated to
  the new one-entry-array shape (behavior unchanged); `MainScene.tryAttackEnemy()` now
  loops over `rollLoot()`'s array, spawning one loose-drop pile per entry.
- **New file `src/entities/Gremlin.ts`** — two separate classes per the plan's "two
  gremlin variants" note (added 2026-07-07), each with its own state machine/numbers
  rather than one class with a "ranged?" flag:
  - **`RangedGremlin`** (stronger) — `idle | kiting | throwing | meleeing` state machine.
    Aggro 160px (larger than melee — notices earlier), backs away below `PREFERRED_RANGE`
    (120px), holds and throws rocks on a 2s cooldown between preferred and aggro range,
    falls back to a claw (10 dmg) if the player closes to melee range (24px). Drops
    **Gremlin Skin + Gremlin Blood** (skin is exclusive to this variant — feeds the
    Drying Rack's `gremlin_leather` output, and shouldn't be trivially farmable from the
    weak variant). 16 max HP. Overrides `isAggro()`/`takeHit()` off its own `mode` field
    (doesn't use `Enemy`'s shared `state` field), mirroring the pattern `Snake` already
    established for enemies with bespoke state machines.
  - **`MeleeGremlin`** (weaker) — plain `idle | chasing` chase-and-claw, no
    kiting/throwing states at all, but its own tuned numbers (not copied from Boar):
    130px aggro, 70px/s chase speed, 8 dmg claw (vs Boar's 25), 12 max HP. Drops
    **Gremlin Blood only** (no skin).
  - Both reuse `Enemy`'s protected give-up/re-aggro-immunity helpers
    (`startPursuit`/`hasGivenUpPursuit`/`canAggro`/`enterGivenUpState`/`markAttackLanded`)
    rather than reimplementing that mechanism, same as `Snake` does.
- **`ResourceType`** gained `gremlin_blood` and `gremlin_skin`; new `ItemDef` entries +
  `icon_gremlin_blood`/`icon_gremlin_skin` textures (`BootScene.ts`, matching the
  `boar_meat` icon precedent). New `gremlin`/`gremlin_weak`/`gremlin_rock` placeholder
  textures — the ranged variant is drawn bigger with a lighter belly highlight so it
  visually reads as tougher than the smaller, duller melee variant.
- **`MainScene.spawnEnemies()`**: 4 `RangedGremlin` + 6 `MeleeGremlin`, both
  grassy-preferred (per `CLAUDE.md`'s first-biome content notes) — melee more common,
  ranged rarer/stronger, matching the plan's tuning note.

Verified via `preview_eval`: spawn counts match (8 Enemy/Boar, 6 Snake, 4 RangedGremlin, 6
MeleeGremlin); `RangedGremlin.update()` correctly transitions idle→throwing on first
contact at mid-range (spawns a real projectile into `enemyProjectiles`, confirmed via
group child count), transitions to kiting when the player closes inside
`PREFERRED_RANGE` (velocity vector points away, confirmed by sign/magnitude), and
correctly melees (returns `true`, respects `RANGED_MELEE_COOLDOWN_MS`) once inside
`RANGED_MELEE_RANGE`; `rollLoot()` returns exactly `[gremlin_skin, gremlin_blood]` for
`RangedGremlin` and `[gremlin_blood]` for `MeleeGremlin`; `applyDamageToPlayer` correctly
deducts a projectile's `damage` and correctly no-ops during the i-frame window (tested by
calling it directly, matching the project's established "drive state directly via
`preview_eval`" convention). Type-check clean (`tsc --noEmit`), no console errors, world
boots and renders normally in `preview_screenshot` with both gremlin variants visible.

**Known verification gap, flagged rather than glossed over**: the live
Phaser-physics-driven overlap between a real in-flight projectile and the player (as
opposed to calling `applyDamageToPlayer` directly) could not be exercised end-to-end this
session — the preview browser tab was backgrounded throughout (`document.hasFocus()`
false), and real-time `requestAnimationFrame`/scene-`postupdate` ticks were severely
throttled-to-frozen (a 30-tick wait via scene events timed out after 30s with only a
couple of frames having run), matching `CLAUDE.md`'s documented "backgrounded preview tab
stalls Phaser's loop" quirk, just more severe than previously seen. What *is* confirmed:
the overlap collider is registered correctly (`physics.world.colliders` shows the new
`overlapOnly: true` entry alongside the existing solids/enemy colliders), the
projectile's velocity is correctly non-zero after the `launch()` fix, and the damage-
application path it calls into is independently correct. The remaining gap is narrow —
whether Arcade Physics's own overlap detection fires for two small moving bodies, which
is exercised elsewhere in this same engine version — but it's true that this specific
path wasn't watched happen live, so a fresh session with a focused/foreground preview tab
should double check a real thrown rock actually lands before calling ranged combat fully
battle-tested.

### Just finished: Snake deaggro + fight-back-before-fleeing behavior

Follow-up playtest feedback on Snake right after the previous fixes: it never deaggro'd
while chasing (would pursue forever if it just never landed a hit), and every hit from
the player made it flee immediately — even before it had ever landed a bite of its own,
which read as "runs away for no reason."

- **New deaggro while `striking`** (`src/entities/Snake.ts`): own condition (per
  CLAUDE.md's "different condition, not different number" rule), not a copy of Boar's
  30s/no-hit-landed giveup — Snake gives up much faster since it's a hit-and-run
  ambusher, not a sustained hunter. New `CHASE_GIVEUP_MS` (4000) and
  `CHASE_GIVEUP_RADIUS` (150px) — either the player stays out of melee range for 4s of
  continuous pursuit, or gets farther than 150px, and it gives up (`giveUp()`: back to
  `hidden`, alpha down, `ambushReadyAt` cooldown starts). Checked every frame at the top
  of the `striking` branch, before the melee/chase logic.
- **`takeHit()` now branches on whether it's already landed a bite this engagement** (new
  `hasBitten` field, reset whenever it fully re-hides): hasn't bitten yet → reveal and
  fight back (`enterStriking()`) instead of fleeing; already bitten → flee for a few
  seconds (new `RETALIATION_FLEE_MS`, 2500) then **want to strike again** rather than
  fully disengaging. `beginFlee()` gained a `reengage: boolean` param — post-bite flee
  (bit landed, no retaliation) ends back in `hidden` with the long rehide cooldown;
  post-retaliation-hit flee ends back in `striking` with a fresh pursuit clock. The
  original "bite → flee → hide" loop (no interruptions) is unchanged.

Verified via `preview_eval` (single synchronous blocks, per the project's cooldown-timing
testing convention): a snake stuck chasing a kiting player (held just outside melee, well
within giveup radius) auto-deaggros back to `hidden` once `CHASE_GIVEUP_MS` elapses; a
snake chasing a player who suddenly jumps past `CHASE_GIVEUP_RADIUS` deaggros
immediately; hitting a snake that hasn't bitten the player yet flips it straight to
`striking` (alpha 1) without ever fleeing; hitting a snake that already landed a bite
(currently `fleeing`) sets `reengageAfterFlee: true` and, after `RETALIATION_FLEE_MS`
elapses, lands back in `striking`; an uninterrupted bite still ends the cycle in `hidden`
after the normal (shorter) post-bite flee. Type-check clean, no console errors.

### Just finished: Snake playtest follow-ups + crafting-menu tab reorg

Four small fixes requested right after Snake (Milestone D) landed, in the same session:

- **Snake bite damage 5 → 20** (`src/entities/Snake.ts`) — a landed ambush bite should
  actually hurt; the low-HP (11) side of its tradeoff stays as-is, only the damage side
  was under-tuned.
- **Enemy HP bars now only show while aggro'd**, not at rest. New `Enemy.isAggro()`
  (protected, default `this.state === "chasing"`) gates `healthBarBg`/`healthBarFill`
  visibility every frame in `preUpdate()`. `Snake` overrides it (`this.mode !== "hidden"`)
  since it tracks aggro via its own mode field, not the shared `state` field — mirrors how
  `Snake.takeHit()` already had its own override pattern.
- **"Leather" → "Leather Scraps"** — display-name-only rename in `Items.ts` (`name`/
  `description`), resolving the open naming question CLAUDE.md had flagged ("leather" key
  vs "leather scrap" from the design notes). The `ResourceType`/item **key** stays
  `"leather"` — renaming the key would've meant touching `Snake.ts`, `Recipes.ts`,
  `Inventory.ts`, and every drop/cost reference for a cosmetic change with no functional
  upside.
- **Crafting-menu tab reorg**: `RecipeCategory`'s `"build"` tab is gone, replaced with a
  new `"misc"` tab. Workbench moved `"build"` → `"crafting"` (now sits in the Crafting tab
  next to Shishkabob); Campfire moved `"build"` → `"misc"` (first occupant of the new Misc
  tab, where future placeables like it will live). `CraftingMenu.ts`'s `CATEGORIES` list
  updated to match (`Build Pieces` label removed, `Misc` added). No recipe **costs**
  changed, only `category`.

Verified via `preview_eval`: forcing a Boar into `chasing` and a Snake into `striking`
both flip their HP bar to visible; both start hidden/idle with bars invisible. Snake's
`biteDamage` getter reads `20`. Crafting menu's `crafting` category recipe list includes
both `"Shishkabob"` and `"Workbench"`; `misc` includes `"Campfire"`; `preview_screenshot`
confirms the five tabs read Tools/Weapons/Armor/Crafting/Misc and the event log fires
"New Recipe Unlocked: Campfire" once wood/stone are known. Type-check clean, no console
errors.

### Just finished: Snake (Milestone D) — first ambush enemy, first leather source

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone D,
now done — prioritized ahead of B/C specifically because it's the only planned source of
`leather`, which Stone Pickaxe/Stone Club require to ever finish discovering).

- **New file `src/entities/Snake.ts`**, subclassing `Enemy` for rendering/HP-bar/depth
  reuse but **fully overriding `update()`** with its own `hidden | striking | fleeing`
  state machine — not a re-tuned copy of Boar's chase AI (per the "different condition,
  not just different number" standing decision in CLAUDE.md). `hidden`: motionless at
  alpha 0.35 ("in the grass," reuses the placeholder texture, no new art) — dist to
  player must cross a *tight* `AMBUSH_RADIUS` (45px, vs Boar's 140) **and** be past its
  own `ambushReadyAt` cooldown to trigger `striking` (alpha snaps to 1, lunges in). On a
  landed bite it immediately `beginFlee()`s (retreats away from the player for
  `FLEE_DURATION_MS`), then re-hides (`ambushReadyAt = now + REHIDE_COOLDOWN_MS`, alpha
  back to 0.35) — hit-and-retreat, not a sustained chase. Own numbers only: 11 max HP, 5
  bite damage (vs Boar's 20/25). **Getting attacked directly always reveals + flees**,
  even while nominally "hidden" (`Snake.takeHit()` overrides the base reaction) — a weak
  ambush enemy doesn't stand and fight once actually engaged, distinct from Boar's
  idle-to-chasing-on-hit.
- **`Enemy.ts` made loot and combat stats data-driven** (new `EnemyConfig` fields
  `lootResource`/`lootMin`/`lootMax`/`maxHealth`/`biteDamage`, replacing the old
  module-level `MAX_HEALTH`/`BITE_DAMAGE` constants and the hardcoded `"boar_meat"` drop
  in `MainScene.tryAttackEnemy()`) — new `Enemy.rollLoot()` returns `{resource, amount}`
  generically so MainScene doesn't need per-species branching. `applyFacing()` promoted
  private → protected so Snake can reuse the same 360°-rotation helper instead of
  duplicating it. `Snake`'s own `lastStrikeBiteAt` field is intentionally *not* named
  `lastBiteAt` — that name collides with `Enemy`'s existing private field of the same
  name (TS treats same-named private fields in base/derived classes as incompatible
  declarations, caught by `tsc`).
- **`MainScene.spawnEnemies()`**: Boar spawn now passes its stats explicitly through the
  new config fields (behavior unchanged — still 20 HP/25 dmg, forest-preferred, count 8).
  New Snake spawn loop (count 6) biased to **grassy** zone via the existing
  `pickSpawnPoint(rng, "grassy", 200)`, per the plan's "Snake weighted toward grassy."
- **New `snake` texture** in `BootScene.ts` (20x8 — long green body + darker head patch,
  low-profile silhouette that reads as "in the grass" even before the hidden-alpha fade).
- **Naming resolution locked in** (per the plan's explicit callout): reused the existing
  `leather` `ResourceType`/item key for Snake's drop — no duplicate `leather_scrap` type
  was added.

Verified via `preview_eval` (single synchronous eval blocks per the project's "run
cooldown-timing tests in one call" convention, since the real game loop's own
`updateEnemies()` would otherwise clobber manually-set state between separate tool
calls): a Snake spawns hidden at alpha 0.35; stepping `update()` with a player 10px away
triggers striking (alpha 1) then a landed bite (`bit: true`) on the next call; jumping
the clock past `FLEE_DURATION_MS` returns it to hidden (alpha 0.35); a further call
during the re-hide cooldown does not re-trigger striking; `takeHit()` on a hidden Snake
immediately sets alpha to 1 and flees; `rollLoot()` returns exactly `{resource:
"leather", amount: 1}`; Boar's stats are unchanged post-refactor (20 HP, 25 bite dmg,
1-2 boar_meat). Type-check clean, no console errors, world renders normally in
`preview_screenshot`.

### Just finished: Leather re-added to Stone Pickaxe/Stone Club + Workbench-gated recipes hidden until a bench exists

Follow-up requests right after the Workbench (Milestone G) + follow-up-fixes entries
below landed:

- **Leather is back as a cost** on Stone Pickaxe (`wood: 3, stone: 4, leather: 1`, per
  `CLAUDE.md`'s target numbers) and Stone Club (`wood: 3, stone: 2, leather: 1`) — the
  previous session had dropped it because `leather` has no drop source yet, which made
  those two recipes permanently undiscoverable. **User clarified that's intentional**:
  leather-gating both recipes is correct game design; it's fine that they don't show up
  until a leather source (Snake, still unbuilt) exists. Plan file updated — Milestone D
  (Snake) is now called out as **prioritized next** specifically because it's the game's
  only planned leather source (see
  `.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone D's "Why
  prioritized" note).
- **Workbench-gated recipes are now invisible until a Workbench has ever been placed** —
  previously, `tier >= 1` recipes (Stone Pickaxe, Stone Club) would appear in the
  discovered-recipes list as soon as their *ingredients* were known, even with zero
  workbenches ever placed (they'd just always fail the *craft*-time proximity check).
  Per user request, discovery itself is now gated too: `Crafting.refresh()` gained a
  third `workbenchPlaced: boolean` param — a `tier > 0` recipe is skipped entirely (not
  added to `discoveredIds`) unless `workbenchPlaced` is true, checked *before* the
  existing ingredients/skill checks. `MainScene.hasWorkbenchPlaced()` (new — "has the
  player ever placed one, anywhere," distinct from `isNearWorkbench`'s "currently in
  range") supplies this in `refreshDiscovery()`. `attemptPlaceObject()` now calls
  `refreshDiscovery()` immediately after a successful Workbench placement (previously it
  only refreshed the HUD/inventory) so tier-1 recipes can appear the instant one lands,
  without waiting for the next resource pickup to trigger discovery.

Verified via `preview_eval`: with `wood`/`stone`/`leather` all discovered but no
Workbench placed, `stone_pickaxe`/`stone_club` are absent from
`crafting.discoveredRecipes()`; placing a workbench (both via a direct
`placedObjects.push` and via the real `startPlacement()`/`attemptPlaceObject()` flow)
immediately adds them. Type-check clean, no console errors.

### Just finished: Stone Axe is tool-only + Workbench (Milestone G)

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (Milestone G,
now done — "fully independent," not blocked on B/C/D). Two related requests in one
session: nerf the axe, then build the Workbench crafting-tier gate it was blocking on
(the notes call for Stone Pickaxe/Stone Club to be workbench-gated).

- **Stone Axe is tool-only again** — the Combat-polish-pass decision to give it
  `weapon: "stone_axe"` (so it doubled as both tool and weapon from one hotbar slot) is
  reverted: `ItemDef.stone_axe` no longer sets `weapon`, its "Damage" tooltip stat is
  gone, and `"stone_axe"` was removed from `WeaponType` (`src/systems/Weapons.ts`) along
  with its damage/cooldown/stamina-cost table entries. Reason: it made the axe a
  no-brainer over the Wood Club (free weapon slot + tool in one item), undermining
  weapon choice. `MainScene.recomputeEquipped()` needed no changes — it already derives
  `equippedWeapon` from `ItemDef.weapon`, so removing the field was sufficient. Wood Club
  stays a normal tier-0 (no workbench) weapon.
- **Workbench, new placeable** (`workbench` in `Items.ts`/`Recipes.ts`, new
  `icon_workbench` texture in `BootScene.ts` — brown tabletop + legs) — tier 0, 6 wood/4
  stone, placed via the exact same placement-mode flow the campfire already uses.
- **Tier enforcement (new, previously just an unused `Recipe.tier` hook):** Stone Pickaxe
  and Stone Club retargeted `tier: 0` → `tier: 1`. `MainScene.isNearWorkbench(x, y,
  radius = WORKBENCH_RANGE)` (100px — looser than `REACH`, "am I near it" not a precise
  click) filters `placedObjects` by a new `image.setData("itemKey", ...)` tag (set in
  `attemptPlaceObject()`) within range. Both `MainScene.craftRecipe()` (belt-and-
  suspenders, mirrors the existing `canAfford` guard) and `CraftingMenu`'s new
  `isCraftable()` helper (`canAfford && (tier === 0 || isNearWorkbench())`, composed at
  the call site — `Crafting.canAfford` stays pure resource-math, unchanged) gate on this.
  `CraftingMenuDeps` gained `isNearWorkbench: () => boolean`, wired from `MainScene` off
  the player's live position.
- **Non-silent feedback** — per the plan, tier-gating never says "tier 1" or a px number;
  the crafting-menu detail panel shows an amber (`#e3b25a`) "Requires a nearby Workbench"
  line, distinct from the existing red "can't afford" resource-line color, whenever
  `recipe.tier >= 1 && !isNearWorkbench()`.

Verified via `preview_eval`: crafting Stone Axe onto the hotbar has `equippedTool:
"stone_axe"` but `equippedWeapon: null`; Stone Pickaxe craft attempt silently no-ops
(inventory count stays 0, no resources deducted) with no workbench placed, then succeeds
(count 1, wood deducted) once a workbench object is placed within range; opening the
crafting menu on the Stone Pickaxe detail panel while far from any workbench renders the
exact "Requires a nearby Workbench" line among the other detail rows. Type-check clean,
no console errors.

**Follow-up fixes (same day, from playtest feedback right after landing):**

- **Live workbench-proximity refresh** — the amber "Requires a nearby Workbench" line and
  the affordable/craftable state only reflected proximity as of when the crafting menu
  was opened; walking into or out of range while it stayed open never updated it.
  `MainScene.update()` now calls a new `updateCraftingMenuWorkbenchProximity()` every
  frame that compares `isNearWorkbench()` against a cached
  `craftingMenuLastNearWorkbench` and only calls `craftingMenu.refresh()` (a full
  re-render) on an actual state change — avoids re-rendering every frame while sitting
  still near/far from a bench.
- **Workbench cost changed to 10 wood** (was 6 wood/4 stone) — no stone cost anymore, per
  user request.
- **Stone Club recipe fixed — it could never actually be discovered.** Its cost included
  `leather`, which has zero drop sources anywhere in the current game (`ResourceType`
  exists, but nothing awards it — `leather`'s intended source, Snake, is still an
  unbuilt milestone). `Crafting.refresh()`'s discovery check requires every cost
  ingredient to have been picked up at least once, so a `leather`-costing recipe was
  permanently locked. Dropped `leather` from the cost, matching the recipe to
  `CLAUDE.md`'s own target numbers for Stone Club (3 wood/2 stone) — `leather` will come
  back into weapon costs once Snake ships a real source for it.

Verified via `preview_eval`: placing a workbench and walking the player in/out of
`WORKBENCH_RANGE` while the crafting menu stays open toggles the amber line and button
affordability live, without needing to close/reopen the menu; Workbench recipe now costs
exactly `{wood: 10}`; discovering `wood`+`stone` (no `leather`) now unlocks Stone Club.
Type-check clean, no console errors.

### Just finished: 16:9 resolution, smoothed biome borders, crafting-menu inventory count

Three small QoL fixes requested in the same session, unrelated to each other:

- **Resolution**: `main.ts`'s Phaser config was a fixed 800x600 canvas from the very first
  session. Bumped the base resolution to 1920x1080 and added `scale: { mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH }` so it scales to fit the browser window
  letterboxed at 16:9 instead of stretching or clipping. Verified safe first — every HUD
  element already anchors off `scene.scale.width/height` rather than hardcoded 800/600
  (`CraftingMenu`, `Tooltip`, `EventLogUI`, `HotbarUI`, `MainScene`'s HP/stamina bars), so
  nothing needed repositioning.
- **Biome border smoothing**: the forest/grassy/creek overlay bake
  (`MainScene.buildBiomeTexture()`) previously filled one flat-colored rectangle per 40px
  `Biome` zone-lookup cell, so boundaries were big jagged 40px staircases. `Biome.ts` now
  exposes `forestWeight(x,y)`/`creekWeight(x,y)` — bilinear interpolation across the same
  underlying zone/creek grids (cell values anchored at cell centers) — and the bake
  supersamples at an 8px stride, blending each overlay's alpha by the interpolated weight
  instead of a hard on/off fill. Same zone data, same gameplay grid/queries
  (`zoneAt`/`isCreekAt` untouched, still hard-edged for spawning logic) — only the render
  bake changed, into a soft multi-cell gradient band that reads as a rounded line.
  `forEachCell()` (now unused) was deleted rather than left dead. Verified visually via
  `preview_screenshot`: forest/grassy boundary is a smooth wavy curve, not a staircase.
- **Crafting menu**: the `*` prefix on already-crafted-at-least-once recipes (`isOwned`)
  is gone — per user feedback it read as visual noise. In its place, the recipe **detail**
  panel (opened by clicking a recipe) now shows `In inventory: X` (via
  `backpack.count(outputKey(recipe))`) for any recipe whose output actually lands in the
  backpack — skipped for placeable recipes (build pieces go into the world, not the
  backpack, so a count would always read 0). `CraftingMenuDeps.isOwned` and its only
  caller (`MainScene.createCraftingMenu`) were removed as dead code rather than left
  unused. Verified via `preview_eval`: crafted a Stone Axe with the detail panel open,
  confirmed the line went from `In inventory: 0` to `In inventory: 1` live.

### Just finished: Trees/boulders no longer solid + Y-depth occlusion fade + no-spawn-in-water fix

Plan file: `.claude/plans/review-the-plan-and-witty-cloud.md`. Resolves the Milestone B
follow-up below by picking the "let enemies (and the player) walk through trees" option
over improving the escape-heading heuristic further, plus adds a Stardew-Valley-style
occlusion fade and fixes a water-spawn bug surfaced in the same discussion.

- **Trees/boulders are no longer solid** (`MainScene.spawnNodes()`): their `scatter()`
  configs flipped `solid: true` → `false`, so they're no longer added to the `solids`
  static group. That group (and its colliders against both `player` and `enemyGroup`)
  stays wired up unchanged — it's just empty for now, reserved for future
  structures/walls/mountains that genuinely should block movement.
- **`Enemy.ts`'s obstacle-avoidance heuristic was deleted outright**, not left inert: the
  ground-truth stuck-detection + randomized near-tangent escape-heading + per-instance
  `escapeSide` mechanism (see the entry below) is gone along with its constants
  (`STUCK_CHECK_INTERVAL_MS`, `STUCK_DISPLACEMENT_PX`, `ESCAPE_DURATION_MS`) and fields.
  With nothing solid left to get stuck on, chase movement is back to a plain "always head
  straight at the player" angle every frame. Verified via `preview_eval` with real physics
  ticks: a Boar forced into `chasing` across the map's densest tree cluster (auto-detected
  the same way prior sessions did) cut a perfectly straight line through it (y didn't
  move at all, x closed monotonically) all the way to melee range — no zigzag.
- **Y-depth sorting (new)**: previously `Player`/`Enemy` were pinned to fixed depths
  (10/9) regardless of Y position specifically so trees could never visually cover them —
  a comment on `Player.ts` said so outright. That's superseded now: `Player` and `Enemy`
  both track `depth = this.y` every frame (in their own `preUpdate()` overrides, so it
  keeps working even while the player is frozen on death), and `ResourceNode` sets a
  one-time `depth = y` at construction for any non-pickup node (trees/boulders — ground
  clutter like branches/rocks/loose drops stays at the default depth, never occluding,
  same as before). The player's equipped-item icon and the enemy HP bar both now track
  `owner.depth + 1` per frame instead of a stale fixed depth, so they stay glued visually
  on top of whichever owns them regardless of the new Y-based scale.
- **Occlusion fade (new)**: `MainScene.updateTreeOcclusion()`, run every frame (both the
  normal path and the death-freeze path, alongside `updateMagnet`/`updateEnemies`), fades
  a tree/boulder's alpha down (to `0.45`) when the player is horizontally overlapping it
  and positioned close enough "above/behind" it (per the new Y-sort) that it would
  otherwise be drawn over them — and back to `1` once they're clear. Deliberately **fades
  the obstruction, not the player/enemy** (explicit user correction during planning — the
  Stardew-style effect people usually mean is "make the thing in front translucent," not
  "make the character translucent"). Implemented as a manual per-frame `Phaser.Math.Linear`
  alpha lerp rather than a Tween, specifically so it can't fight
  `ResourceNode.playHitFeedback()`'s own tweens (shake/tint) on the same object. A
  dedicated `obstacleNodes` array (populated alongside `nodes` in `spawnNodes()`, filtered
  to non-pickup nodes) avoids filtering the full, much larger `nodes` list every frame.
  Verified via `preview_eval`: placing the player directly above a tree dropped its alpha
  to `0.46` within 500ms and raised the player's computed depth below the tree's (matching
  the intended draw order), and moving far away recovered it back to `~1`.
  `preview_screenshot` confirms the visual read — a faded, ghostly tree with the player
  (blue square) fully visible in front of it, distinct from the solid-green unfaded trees
  elsewhere in frame.
- **Bug fix**: pre-placed branches/rocks could previously spawn inside the creek (their
  `scatter()` calls never passed `avoidCreek: true`, unlike trees/boulders which already
  did). Now both do. Verified via `preview_eval`: scanning every pre-placed branch/rock
  against `biome.isCreekAt()` returns zero hits.
- **Line-of-sight-gated aggro was explicitly scoped out** — raised as a discussion point,
  but the user clarified the intended rule is "only things you can't move through block
  line of sight." Since trees/boulders are now non-solid, they don't block LOS either —
  there's nothing to build this session. This becomes relevant automatically once a
  future *solid* obstacle (wall, mountain, etc.) exists; no code was added for it now
  beyond keeping solidity as the single source of truth for both movement-blocking and
  (eventually) LOS-blocking.
- Regression-checked: chop/mine hover/interact (manual `REACH` distance math, not
  collision-based) is unaffected by trees/boulders going non-solid — confirmed via
  `preview_eval` (equipping a stone axe and hovering a tree still resolves
  `[LMB] Chop`). No console errors throughout. Type-check clean.

### Noted, not acted on: Boar's obstacle-avoidance movement feels bad

User feedback after the "stuck between multiple trees" fixes (below): the movement
*works* now (no more freezing/oscillating/losing the player — see those entries), but the
zigzag pattern from the randomized near-tangent escape headings "is kind of trash" to look
at. Two directions raised, **neither implemented**: (1) smooth/improve the avoidance
heuristic itself, or (2) skip the problem entirely by letting Boars **walk through trees**
(exempt tree solids from the enemy collider). Needs a product decision first — logged in
the plan file (`.claude/plans/let-s-proceed-with-option-crystalline-petal.md`, Milestone
B's follow-up note) and in memory, to revisit whenever Milestone B (Boar tuning) is
actually picked up.

### Just finished: default "give up after prolonged failed pursuit" behavior

Formalizes a standing decision (see memory / the note in the Combat
foundation entry below) with concrete numbers, implemented as **reusable
base-class behavior on `Enemy`** (not a Boar-only special case), so future
enemies that subclass `Enemy` can opt into the same mechanism instead of
reimplementing it:

- **`CHASE_GIVEUP_MS` (30s):** if continuous pursuit (`state === "chasing"`)
  runs this long without landing a single attack, the enemy gives up —
  `state` flips to `"idle"` and it enters a **re-aggro immunity window**
  (`enterGivenUpState()`). This is a *pursuit* clock (`pursuitClockStart`),
  distinct from the pre-existing distance-based deaggro
  (`dist > DEAGGRO_RADIUS`) — that one still fires instantly with no
  immunity, since "the target simply walked away" isn't the same as "I've
  been trying and failing for half a minute."
  - The clock resets on `startPursuit()` (fresh chase begins) and
    `markAttackLanded()` (an attack actually connects) — a fight that's
    landing hits never times out, only a fruitless one does.
- **`POST_GIVEUP_IMMUNITY_MS` (5s):** while active, ordinary aggro-radius
  proximity (`canAggro()`) is ignored — the enemy won't re-engage just
  because the player is nearby again, for a short cooldown.
- **Two overrides, both requested explicitly:**
  1. **`CLOSE_REAGGRO_RADIUS` (50px):** proximity tighter than this still
     re-triggers aggro even mid-immunity — the player standing right next to
     a "fled" enemy still wakes it up.
  2. **Being attacked** (`takeHit()`) unconditionally clears
     `aggroImmuneUntil` and, if idle, immediately flips back to `"chasing"`
     — an enemy doesn't pointlessly tank hits without fighting back just
     because it recently gave up.
- Implemented as `protected` fields/helpers (`pursuitClockStart`,
  `aggroImmuneUntil`, `startPursuit`/`markAttackLanded`/`hasGivenUpPursuit`/
  `canAggro`/`enterGivenUpState`) on the `Enemy` base class specifically so a
  future subclass overriding `update()` entirely (per the standing "don't
  assume the 3-state machine is final" decision) can still call the same
  helpers rather than re-deriving the mechanism — the *numbers* stay
  per-enemy-tunable, but the *mechanism* is meant to be a shared default.

Verified via `preview_eval`, all via direct state manipulation rather than
waiting 30 real seconds (reading/writing the "private" TS fields works fine
at runtime): backdating `pursuitClockStart` by 31s while mid-chase (dist
inside aggro, outside melee, so no bite could land and reset the clock)
correctly gave up and set a ~5s immunity window; staying within ordinary
aggro range during that window correctly held `idle`; moving within
`CLOSE_REAGGRO_RADIUS` correctly force-reaggro'd mid-immunity; calling
`takeHit()` on an idle+immune enemy correctly cleared immunity and flipped
to `chasing` synchronously; letting immunity expire naturally (backdating
`aggroImmuneUntil` into the past) correctly allowed normal-range re-aggro
again; landing an actual bite mid-chase correctly reset the clock (confirmed
`pursuitClockStart` recent afterward); and — checked separately with an
explicit clean-slate reset after an earlier test's incidental interaction
briefly muddied one assertion — plain distance-based deaggro (target simply
out of `DEAGGRO_RADIUS`) still sets **no** immunity and re-aggros instantly
on return, unchanged from before this feature. No console errors.

### Just finished: Milestone A — world resize + procedural biome generation

Plan file: `.claude/plans/let-s-proceed-with-option-crystalline-petal.md` (the
"first-biome content pass" — 7 milestones A–G; **only A is done**, B–G are
future sessions). This is the foundation the enemy/spawn milestones (B Boar
tuning, C Gremlin, D Snake) all depend on.

The flat 1280x960 single-grass world is now a **2560x1920 procedurally
generated biome** with three readable sub-areas:

- **`src/systems/Biome.ts`** (new) — framework-light like `Stamina.ts` (only
  `Phaser.Math.RandomDataGenerator`, owns no GameObjects). A coarse **40px
  zone-lookup grid** (deliberately independent of the 32px render `TILE` — it's
  a gameplay/query grid, not a tilemap; 64x48 = 3072 cells, flat arrays).
  Generation: (1) **Voronoi** — 6-10 random seed points each tagged
  forest/grassy, every cell takes its nearest seed's type; (2) **cellular-
  automaton smoothing** (4 passes, double-buffered, flip a cell when ≥5/8
  Moore neighbors disagree) to round the jagged Voronoi edges into organic
  blobs; (3) a separate **random-walk creek** carved edge-to-edge (horizontal
  or vertical, wobbling laterally, tapering 1-2 cell width) into its own
  `boolean[]` grid decoupled from zone type — a cell can be forest AND creek.
  A **degenerate-layout guard** re-rolls (cap 3) if either zone covers <10%.
- **Query API:** `zoneAt(x,y)` and `isCreekAt(x,y)` — both O(1) flat-array
  bounds-checked lookups. `isCreekAt` is deliberately the cheap primitive a
  future **"Wet" status debuff** hooks into (creek is visual-only + walkable
  this pass — no collision, per user decision).
- **Rendering** (`MainScene.buildBiomeTexture()`): a **one-time bake** into a
  single world-sized `RenderTexture` at depth -9 (grass tileSprite dropped to
  -10, all entities stay at default 0 above both). Forest cells get a
  translucent darker-green overlay; grassy cells left showing the base grass;
  creek cells a translucent blue on top. Flat per-cell fills keep the visual
  WYSIWYG with the gameplay grid (no art/logic mismatch). One GameObject total
  — not one per tile.
- **Zone-biased spawning** (`spawnNodes`/`spawnEnemies`): new `pickSpawnPoint(rng,
  preferred, clearRadius, avoidCreek)` helper does **rejection sampling** (cap
  200 attempts, graceful fallback to last draw so a tiny/absent zone can't
  hang). Trees are **dense in forest (70) + sparse in grassy (14)**; boulders
  (18) prefer grassy; branches (40) prefer forest; loose rocks (30) anywhere;
  8 Boars prefer forest. Trees + boulders pass `avoidCreek: true` — the creek
  overlays forest/grassy cells, so without it a "forest" point could land a
  tree on the water (looked wrong). Counts scaled up for the 4x-area world.
- **Follow-up tuning (same session, from playtest feedback):** tree density
  raised and split forest/grassy (was a flat 28 forest-only); trees pulled off
  the creek; Boar **`BITE_DAMAGE` 8 → 25** so ~4 bites kill a full-health (100)
  player — the old 8 (≈12 hits) felt far too weak. Boar count/aggro-radius
  tuning is still **Milestone B**; only the damage was bumped here on request.
- **Unrelated bug fixes bundled in (playtest reports, not part of any
  milestone):** (1) Boars had **no obstacle avoidance** — the chase branch
  aimed straight at the player every frame, so a tree/boulder directly between
  them fully blocked the Boar (it just pushed into the solid forever). Fixed
  with a minimal steer-around: `Enemy` now checks `body.touching.none` (set by
  the existing collider against the solids group) and, if blocked, offsets the
  chase angle by a **fixed per-instance ±60°** (`avoidDir`, randomized once at
  construction so it doesn't flicker between left/right every frame) to slide
  along the obstacle instead of pushing into it. Not real pathfinding — just
  enough to get around a single tree. (2) The Boar sprite never flipped to
  face its direction of travel. Added `applyFacing(vx)` (flips `flipX` once
  horizontal velocity is decisive, i.e. `|vx| > 5`, to avoid flicker near
  zero), called from both the chase-move and idle-wander branches, plus once
  when settling into bite range (faces the player). Verified via `preview_eval`
  with **real physics ticks** (not manual position math): placed a Boar and
  player on opposite sides of a real tree, forced `chasing`, and let 2.5s of
  actual physics run — distance-to-player closed (90px → 78.5px) instead of
  staying frozen, and `flipX` matched the sign of `body.velocity.x`. Ran
  longer (6 more seconds) and confirmed the Boar fully closed the gap, bit the
  player enough times to kill them at the new 25 dmg rate, and the existing
  death/respawn pipeline fired correctly (teleport to world center, health
  reset to 100, no console errors) — full end-to-end proof the chase-around-
  obstacle path actually reaches and kills, not just "unstuck but never
  arrives."
- **Follow-up fix to the fix (same session, from a second playtest report):**
  the reactive per-frame `touching` check above still visibly vibrated left-
  right in place at certain approach angles — losing contact for a single
  frame immediately re-aimed straight at the player, which re-hit the
  obstacle next frame, re-triggering avoidance, forever. Fixed with
  **hysteresis**: a new `avoidUntil` timestamp is (re-)armed to `now +
  AVOID_HOLD_MS` (450ms) every frame contact is detected, and the offset
  heading stays committed until that window fully expires — so it now commits
  to a slide for at least ~450ms past the *last* contact instead of
  re-deciding every frame. Also widened the offset from ±60° to a fixed ±90°
  (`AVOID_TURN`). Also addressed in the same pass: **the Boar only ever
  flipped left/right** — replaced with **full continuous rotation**
  (`applyFacing(vx, vy)` now calls `setRotation(Math.atan2(vy, vx) + Math.PI)`,
  the `+PI` correcting for the texture's nose being drawn pointing left at
  rotation 0), so it now visibly points in its exact direction of travel
  instead of only two discrete states. Skips the rotation update when
  velocity is near-zero so it keeps its last facing while stopped/biting.
  Verified via `preview_eval` sampling real position/velocity/rotation every
  150ms for 3.6s with a Boar and player placed in exact head-on alignment
  across a tree (the reported "stuck" geometry): only **3 heading changes**
  occurred (each held 150-1050ms, not per-frame), rotation values were
  genuine intermediate angles (90°→1°→8°→...→129°→...→166°, not just 0°/180°
  snaps), and the Boar again fully closed the gap and killed the player
  (health reset to 100 + `isDead: false` afterward, matching a completed
  death/respawn cycle) — repeat proof it reliably reaches the target now, not
  just "visibly calmer but still failing to arrive." No console errors.
- **Third round (same session, "still gets stuck between multiple trees"):**
  the touching-flag/hysteresis approach above was fundamentally too easy to
  defeat with 2+ close obstacles — a fixed offset angle could just aim
  straight into a *second* tree, wedging the Boar (frozen, near-zero velocity,
  for 5+ seconds straight in one reproduction). Replaced the whole mechanism
  with **ground-truth stuck detection**: every `STUCK_CHECK_INTERVAL_MS`
  (350ms), compare actual displacement to `STUCK_DISPLACEMENT_PX` (12); if
  too small, commit to a **randomized escape heading** for
  `ESCAPE_DURATION_MS` (900ms) instead of re-deciding every frame. This alone
  fixed the permanent-freeze case but surfaced two follow-on bugs, found via
  `preview_eval` traces with real physics ticks (position/velocity/state
  sampled every 150-300ms) against deliberately placed obstacle clusters
  (found by scanning `s.nodes` for trees within 70-90px of each other) with
  every *other* enemy parked off-map to rule out cross-contamination (an
  earlier trace briefly looked like a "runaway" bug but was actually a
  *different*, untracked Boar independently killing the player mid-test):
  1. **Escape angle range had a net-backward bias.** The first attempt biased
     escape headings to ±(99°-162°) off the direct-to-player line to avoid
     "near-forward" (re-hits the obstacle) — but that whole range has a
     *negative* cosine projection onto the goal direction, meaning every
     single escape attempt had a small backward component. Chained across
     several consecutive stuck-cycles (common against a real 3-4 tree
     cluster), this reliably walked the Boar out past `DEAGGRO_RADIUS` over a
     few seconds. Fixed by narrowing the range to near-tangent, ±(65°-100°) —
     roughly perpendicular to the goal, which slides around an obstacle at
     close to constant distance instead of steadily retreating.
  2. **Deaggro could fire mid-maneuver.** Even with a good escape angle,
     `state` flips `chasing`→`idle` the instant `dist > DEAGGRO_RADIUS`
     (140/200 at the time) on ANY frame — including mid-escape, when the
     Boar is deliberately taking a temporary detour. Getting flipped to idle
     right then abandoned the maneuver permanently (it'd just idle-wander a
     step away from finishing). Fixed by gating the deaggro check on
     `now >= escapeUntil` (only allowed once the current escape commitment
     has fully ended) and widening `DEAGGRO_RADIUS` 200→**280** to give
     chained escape attempts against wide/dense clusters more slack before
     giving up at all.
  3. **Escape side re-randomized on every stuck-trigger**, which zigzagged
     between both sides of a wide obstacle instead of committing to one edge
     (classic wall-following needs a persistent side). Replaced the per-
     trigger coin flip with `escapeSide: 1 | -1`, fixed once per Boar
     instance (mirroring the original `avoidDir` idea from the first
     attempt, but now combined with the corrected tangent-range angle and
     ground-truth stuck detection instead of the flawed `touching`-flag
     reactive version).
  - **Verified** via `preview_eval` against the map's actual densest tree
    clusters (auto-detected by scanning `s.nodes` for trees within 70-90px of
    each other, 2-4 trees per cluster), placing the Boar and player at a fixed
    150px separation through each cluster's centroid (a bbox-edge-relative
    placement was tried first and turned out to be its own test bug — wide
    clusters could push the *initial* separation past `DEAGGRO_RADIUS` before
    any movement happened at all, invalidating that run). Across multiple
    dense (3-4 tree) clusters, the Boar consistently reached melee range
    (worst observed case: ~8.4s against a 4-tree cluster; most resolved in
    2-5s) without freezing, oscillating, or losing the player. Also hit (and
    recovered from) the documented "backgrounded preview tab stalls Phaser's
    loop" quirk mid-testing — resolved per `CLAUDE.md`'s guidance by
    `preview_stop`/`preview_start` fresh rather than trusting a stuck tab's
    output. No console errors. This remains a **heuristic, not real
    pathfinding** (none exists in the project) — it resolves every
    configuration tested during this pass, but isn't a mathematical
    guarantee against arbitrarily adversarial obstacle layouts.
- **Seeded-RNG convention changed:** biome layout, node scatter, and enemy
  scatter are now **three separate session-random generators** (`sessionRng()`,
  seeded off `Date.now()` + `Math.random()`), replacing the old fixed strings
  (`"explore-and-gather"`, `"boar-country"`). Rationale: once the biome layout
  is random per session, a fixed content seed no longer reproduces a coherent
  world anyway, so the reproducibility benefit was already gone.

Verified via `preview_eval` (world 2560x1920 / 64x48 grid; a sampled layout at
forest 0.69 / grassy 0.31 / creek 0.06 with all 28 trees + 8 boars in forest and
all 18 boulders in grassy — zone bias working; **40 fresh random seeds** all
landed in [0.11, 0.86] forest coverage with zero degenerate layouts, confirming
the re-roll guard) plus `preview_screenshot` (winding blue creek, darker forest
vs lighter grassy, entities placed sensibly). Type-check clean, no console
errors.

### Combat polish pass (same day, right after the foundation landed)

Three small enhancements requested after trying the Combat foundation out:

- **Axe doubles as a weapon** — `stone_axe` now carries both `tool:
  "stone_axe"` and `weapon: "stone_axe"` in its `ItemDef` (`src/systems/
  Items.ts`). Since `MainScene.recomputeEquipped()` already derives
  `equippedTool`/`equippedWeapon` independently from the same selected
  hotbar stack, this needed zero scene-level changes — having the axe out
  now lets you both chop trees and fight, no separate weapon slot.
  `WeaponType` (`src/systems/Weapons.ts`) gained a `"stone_axe"` member with
  its own combat numbers (6 dmg/500ms/12 stamina — distinct from its
  `toolDamage` of 1 used for chopping, since those are tuned against very
  different health pools). Pickaxe wasn't extended the same way (not asked
  for), but the same one-line change would do it if wanted.
- **Enemy HP bars** — `Enemy.ts` now owns a thin (22x3px) two-Rectangle bar
  (dark track + red fill, no number) that stays glued above the sprite via
  a `preUpdate()` override — the same "sync every frame regardless of
  MainScene's own update cadence" trick `ResourceNode` already uses for its
  count label. Always visible (not gated on "has taken damage"), destroyed
  alongside the enemy in `playDeathFeedback()`.
- **Floating damage numbers** — `MainScene.spawnDamageNumber(x, y, amount)`
  spawns plain white/black-outline text at the hit enemy's position that
  rises 24px and fades over 700ms, then destroys itself. Called from
  `tryAttackEnemy()` right after `enemy.takeHit(dmg)`. Deliberately just a
  plain number for now — damage types (slash/pierce/blunt) and resistances
  were flagged as a "later" concern, not built; the spot to hook in
  type-based coloring is called out with a comment on `spawnDamageNumber`.

Verified via `preview_eval`: axe equips as both tool and weapon
simultaneously from one hotbar slot; an axe hit deals exactly 6 (not the
tool's chop damage of 1); the HP bar's fill `scaleX` matches
`health/maxHealth` after a real frame tick and its position tracks the
enemy after it moves; the damage-number text object carries the exact
weapon damage dealt and becomes inactive/alpha-0 (destroyed) ~700ms later
(captured by temporarily wrapping `scene.add.text` to grab the exact
object, since a naive "any Text with digit content" filter was catching
the unrelated stamina/HP bar labels); enemy HP bar Rectangles are destroyed
(not leaked) when the enemy dies. Type-check clean, no console errors.

**Balance observation, not acted on:** during testing, a fresh spawn's HP
dropped noticeably within a few real seconds of idling — 6 Boars scattered
in a 1280x960 world with a 140px aggro radius and only a 150px spawn-clear
zone means an enemy can start closing in almost immediately. Not asked to
fix; flagging in case it feels too aggressive once played for real (easy
knobs: bigger clear zone, smaller aggro radius, or fewer Boars).

**User decision on future enemy variety (2026-07-06):** the shipped Boar is
a **proof-of-concept for the player/enemy interaction loop**, not a
template whose exact numbers get copied onto future enemies. As
Gremlin/Snake and later enemies get built, each is expected to tune its own
**aggro radius + aggro condition**, **deaggro time/radius/condition**,
**DPS**, **HP**, **speed**, and **attack methods** independently — including
different *conditions*, not just different numbers on the same logic (e.g.
a future enemy might aggro on line-of-sight or noise instead of flat
radius, or deaggro on a timer instead of radius hysteresis). Implication:
don't generalize `Enemy.ts`'s current constants into one shared config
table too early, and don't assume the current idle/chase/bite three-state
machine is the final shape — revisit the architecture once a second enemy
actually needs different behavioral logic, not just different numbers. See
the plan file's section 19 for the fuller note.

### Just finished: Combat foundation (roadmap item 4, scoped down)

Plan file: `.claude/plans/polymorphic-sparking-lynx.md`.

The user's first-biome design notes (folded into `CLAUDE.md`'s "First biome
— content notes" section) describe a much bigger combat roster than one
pass could reasonably cover — 3 enemies with distinct AI, a ranged
Slingshot/ammo system, Workbench gating. Asked to scope it down, the user
picked **"Foundation + one enemy"**: build the real combat systems (health,
facing, equipped-weapon visuals, melee equip, death/respawn) against a
single simplified enemy, leaving Gremlin/Snake/ranged/ambush/charge/
fire-fear/Workbench as explicit follow-ups.

- **`src/systems/Health.ts`** (new) — a Phaser-free pool adapted from
  `Stamina.ts`'s shape but not copied verbatim: `takeDamage`/`heal`/`reset`/
  `isDead`, no passive regen (that's deferred to a future food/rest system).
- **Facing direction** (`src/entities/Player.ts`) — the player finally
  tracks a 4-way `Facing` (`up`/`down`/`left`/`right`), persisting while
  idle, vertical winning ties on diagonal input. Widened `PlayerFrameResult`
  to report it every frame.
- **Equipped-item-on-sprite visual** — long deferred (per `CLAUDE.md`,
  pending "a real facing/weapon-attachment system"). Resolved with zero new
  art pipeline: `Player` attaches a small child `Image` reusing the
  item's existing 24x24 icon texture (the same ones already baked for
  tooltips), offset 16px from the player's center in the current facing
  direction, hidden when nothing's equipped. `MainScene.recomputeEquipped()`
  is still the single place equip state is derived — it now also drives
  this icon (`player.setEquippedIcon(...)`), and calls
  `player.syncEquippedIconPosition()` every frame (even during the death
  freeze) so it never lags a moved/teleported player.
- **Melee weapon equip** (`src/systems/Weapons.ts`, new) — `WeaponType =
  "wood_club" | "stone_club"` plus damage/cooldown/stamina-cost tables,
  exactly mirroring `ResourceNode.ts`'s existing tool-table pattern.
  `ItemDef` gained a `weapon?: WeaponType` field alongside `tool?: ToolType`;
  `wood_club`/`stone_club` (previously inert item stubs with display-only
  "Damage" tooltip text) now actually equip via the hotbar, the same way
  tools already did — no parallel equip path.
- **`src/entities/Enemy.ts`** (new) — a single enemy for this pass, "Boar":
  an Arcade-physics sprite (unlike the non-physics `ResourceNode`) with a
  simple idle-wander / chase state machine (aggro 140px, deaggro 200px —
  hysteresis to avoid boundary flicker) and a cooldown-gated melee bite (8
  dmg, 1s cooldown). `takeHit()`/hit feedback (shake + white-to-red tint
  lerp) mirror `ResourceNode`'s feel; `playDeathFeedback()` fades and
  destroys, then hands control back to `MainScene` to award loot. No charge
  attack, no fire-fear, no ranged attack — explicitly out of scope.
- **Attack reuses the existing hover/interact model**, not a parallel one —
  `updateHover()` now tracks whichever of a `ResourceNode` or an `Enemy` is
  closest to the cursor (only one prompt ever shows), gated the same way
  tool-kind gating already works: no weapon equipped → show nothing; weapon
  equipped + in reach → `[LMB] Attack <name>`. `tryInteract()` dispatches to
  a new `tryAttackEnemy()` when an enemy is hovered, using the identical
  cooldown/stamina-afford/silent-fail guard shape `tryInteract()`'s tool
  branch already used.
- **Enemy death loot** reuses the existing loose-drop/magnet pipeline
  unchanged rather than instant-crediting the backpack — `ResourceType`
  widened to include `boar_meat` (same trivial-extension precedent as
  `leather`), dropped via `spawnLooseDrop("boar_meat", ...)` at the kill
  position.
- **Player death & respawn** — a new `Health` instance on `MainScene`,
  a red HP bar stacked directly above the stamina bar (same
  `hotbarUI.top`-anchored construction pattern, 28px higher). On death:
  freezes the player (skips `Player.update()` entirely, though ambient
  systems — stamina tick, magnet, enemy AI, equipped-icon sync — keep
  running so the world doesn't visually pause too), toasts "You died...",
  and after a 2s delay teleports back to world-center spawn, refills health,
  and grants a 1.5s post-respawn invulnerability window. New `"combat"`
  `LogKind` (red-ish) added to `EventLog`/`EventLogUI` for all of this
  rather than overloading `"info"`.
- 6 Boars scattered map-wide via the same seeded-RNG scatter pattern
  `spawnNodes()` already used (slightly larger clear zone around player
  spawn); a physics collider keeps player/enemy bodies from passing through
  each other, but the actual bite/attack range check stays manual distance
  math against a tight `MELEE_RANGE` (28px) — consistent with how `REACH`
  already works, not a Phaser overlap callback.

Verified via `preview_eval` (facing tracking + persistence while idle;
equipped-icon visibility/texture/position-by-facing and hiding on an empty
slot; tool/weapon equip mutual exclusivity; enemy idle/chase state
transitions and velocity direction; melee attack cooldown and stamina-
afford gating both silently blocking extra hits; a full kill draining
exact per-hit damage, removing the enemy, logging "Defeated Boar", and
crediting `boar_meat` to the backpack via the existing magnet pipeline;
one-shot player death freezing movement while leaving enemy AI running;
automatic respawn via the real delayed-call timer resetting position/
health and opening the invulnerability window) plus `preview_screenshot`/
`preview_inspect` for the HP bar (exactly 28px above the stamina bar,
matching X/width) and the on-player equipped-icon rendering. Regression-
checked the existing chop/mine flow and confirmed hovering a node vs. an
enemy always resolves to exactly one prompt (whichever is closer). Type-
check clean, no console errors.

### Follow-up tuning pass on the stamina bar/panels (same day)

Right after the stamina milestone landed, the user requested a round of
polish based on actually seeing it in the preview:

- **Bar visuals** — was a bright cyan 220x14 bar with a color-shift-on-
  deplete effect; now a small (76x20, ~1.5-2x a hotbar slot) fixed dark
  goldenrod (`0xb8860b`) bar with no color changes on deplete/regen, and a
  centered numeric text label (`staminaBarText`) showing the rounded current
  value (e.g. `"72"`).
- **Event log relocated** — was bottom-right, expanded by default, growing
  upward. Now stacks directly under the top-left Keybinds panel (both
  `PANEL_X = 12`, same width), defaults **collapsed** like Keybinds, and
  grows downward. This was ahead of the bottom-center HUD area (hotbar +
  stamina bar) getting busier as more bars land there.
  - **Real coupling needed, not just a one-time position**: since
    `KeybindsUI` can expand/collapse independently, `EventLogUI`'s top
    position has to track it live, not just be computed once at
    construction — the first pass (`topY` set once in the constructor) left
    the Log panel overlapped whenever Keybinds was expanded after Log was
    already positioned, caught via `preview_screenshot` during verification.
    Fixed with `KeybindsUI(scene, binds, onToggle?)` — an `onToggle` callback
    fired after every collapse toggle — wired in `MainScene` to call the new
    `EventLogUI.setTopY(keybindsUI.bottom + 8)`, so Log always repositions
    the instant Keybinds' height changes.
- **Stamina usage bumped up** — the shipped numbers (`SPRINT_DRAIN_PER_SEC:
  18`, `DASH_STAMINA_COST: 15`, `toolStaminaCost: 6`) felt too cheap. Now
  `SPRINT_DRAIN_PER_SEC: 33` (a full 100-stamina bar drains from continuous
  sprint in ~3s — matches the user's explicit target), `DASH_STAMINA_COST:
  25` (4 dashes/full bar), `toolStaminaCost: 12` (both stone tools). Regen
  (20/s, 800ms delay) unchanged — draining faster than it refills is
  intentional.
  - **Forward-looking note left as a comment** (`src/systems/Stamina.ts`,
    next to `MAX_STAMINA`): a future food system will scale max stamina down
    as food depletes, with 0 food intended to reach roughly this same
    "~3s full sprint" feel on a much smaller pool. Not implemented — no food
    system exists yet — just documented so the eventual hookup target is
    clear.

Verified via `preview_eval` (sprint draining the full bar in ~3.1s real
time, confirmed via `performance.now()` timing, with the bar's text reading
`"0"` and speed reverted to base at the end) and `preview_screenshot`
(bar size/color/number, Log correctly stacked under both collapsed and
*expanded* Keybinds — the overlap bug was caught this way before the
`onToggle` fix). Type-check clean, no console errors.

### Just finished: Stamina, sprint, dash (roadmap item 3)

Plan file: `.claude/plans/read-the-plan-from-happy-ripple.md` (was only in the
global plans dir at the time; recovered and copied into the repo later — see
CLAUDE.md's "Plans must be committed in-repo" convention).

The player now has a stamina pool — the first player stat/resource bar in
the game (no health system exists yet either):

- **`src/systems/Stamina.ts`** (new) — a small Phaser-free state class:
  `current`/`max`, `canAfford(amount)`, `spend(amount)` (fails silently if
  unaffordable, re-arms a regen delay on success), and `tick(delta)` (called
  every frame from `MainScene.update()`, regenerates after the delay elapses).
  100 max, ~20/s regen, an 800ms delay after any spend before regen resumes.
- **Sprint** — hold **Shift** while moving multiplies speed by 1.6x and
  drains stamina at 18/s. Gated on affording *that frame's* drain cost
  (not just "stamina > 0") — an early version used a `> 0` check and a bug
  surfaced during `preview_eval` testing: a partial remainder too small to
  spend would sit there regenerating just enough to keep passing a `>0`
  check forever, so sprint's speed multiplier never actually turned off
  under sustained holding. Fixed by checking `canAfford(costThisFrame)`
  instead, matching how dash is already gated.
- **Dash** — **Spacebar** while holding a movement direction triggers a
  quick 340px/s burst for 160ms, spending 15 stamina and starting its own
  600ms cooldown (independent of stamina, so it can't be chain-spammed even
  with a full pool). `Player.update()` was widened to
  `update(delta, canSprint, canDash): PlayerFrameResult` — `MainScene`
  computes both stamina gates and reads back `sprinting`/`dashStarted` to
  know what to spend, rather than `Player` reaching into scene state
  directly. Mid-dash, `Player.update()` returns early and lets Arcade
  physics carry the velocity set when the dash started, ignoring normal
  input until the burst window elapses.
  - **This replaced an original "cosmetic hop jump on Spacebar" plan.**
    Jump was scoped first (matching the older roadmap wording), but the
    user corrected it mid-planning: Spacebar should be a dash/dodge instead,
    with no jump concept at all. Removed before any jump code was written.
  - No i-frames/damage-avoidance from dash — deliberately deferred, since
    there's no health/damage system yet to interact with (Combat, roadmap
    item 4).
- **Tool-swing stamina cost** — `toolStaminaCost(tool)` in
  `src/entities/ResourceNode.ts`, a third `Record<ToolType, number>` table
  alongside the existing `toolDamage`/`toolCooldownMs` (both stone tools:
  6 stamina/hit). `MainScene.tryInteract()` checks affordability right after
  the existing hit-rate cooldown check and before updating
  `lastToolHitAt` — an exhausted swing attempt doesn't burn the cooldown
  either, so the very next swing can land the instant stamina recovers
  enough, without also waiting out an unrelated cooldown window.
- **HUD stamina bar** — centered directly above the hotbar (two overlapping
  `Rectangle`s: a dark track + a cyan fill that scales/recolors). Per the
  user, this is meant to anchor a future vertical stack — HP is planned to
  land above it once Combat ships, maybe a mana-like bar after that. Added a
  `top` getter to `HotbarUI` (exposing its existing private `originY`) so
  the bar (and future bars) can anchor without duplicating the hotbar's
  centering math. `KeybindsUI` gained two new lines ("Sprint: Hold Shift",
  "Dash: Space (while moving)") but was otherwise untouched.

Verified via `preview_eval`: sprint's speed multiplier (1.6x) and stamina
drain while Shift+movement held (via direct `Key.isDown` manipulation, since
Phaser's `Key` objects don't respond to synthetic property writes for
`JustDown` — that needs `_justDown` set directly, which was used for the
dash tests instead); sprint hard-blocking once a frame's cost is
unaffordable (post-fix); dash's velocity spike to 340, the mid-dash lockout,
cooldown blocking a too-soon re-dash and allowing one after 600ms elapses
(all via a single self-contained `preview_eval` call with real `setTimeout`
waits, to avoid inter-tool-call latency confusing the cooldown math); dash
silently failing when unaffordable; tool swings costing exactly
`toolStaminaCost` and being silently blocked (no `takeHit`, no negative
stamina) when exhausted; and the regen-delay math directly against the
`Stamina` class. Plus `preview_screenshot` for the bar's placement/fill and
the expanded Keybinds panel. Type-check clean, no console errors.

### Small fix: collapsible Keybinds panel

The top-left "Move: WASD..." line was a single always-visible line that would
only keep growing as more binds get added. Replaced with **`src/ui/KeybindsUI.ts`**
(new) — a collapsible top-left panel mirroring `EventLogUI`'s header
collapse/expand mechanics (click header to toggle `[+]`/`[-]`), but simpler:
no scrolling/toasts, just a static list of bind strings passed in once from
`MainScene.createHud()`. Starts **collapsed** by default (the point of the
change was to declutter). Wired into `pointerOverHud()` and the wheel-routing
check alongside `eventLogUI` so clicks/scroll over the panel don't leak
through to world interaction or hotbar cycling.

Verified via `preview_eval` (real simulated mouse events toggling collapse
state, `isPointerOver` gating wheel-driven hotbar cycling while expanded) plus
`preview_screenshot` for collapsed/expanded layout. Type-check clean, no
console errors.

## Where things stand

Core loop works: move (WASD/arrows, sprint on Shift, dash on Spacebar — both
stamina-gated, see below), gather (branches/rocks free; trees/boulders need
the right tool kind equipped and now take multiple hits, see below), craft
(T), manage inventory/hotbar (Tab, 1-9, scroll wheel), equip tools via the
hotbar. Recipe discovery is gated by "have you picked up the ingredients" +
skill level; unlocks announce themselves via a toast + persistent event log
(bottom-right, collapsible). Placeable items (currently just the campfire)
skip the backpack entirely — crafting one enters a placement mode instead.
Chopping/mining a tree/boulder now explodes its yield into scattered loose
pieces on the ground instead of crediting the backpack instantly (see below),
with an auto-pickup magnet (toggle: `V`) to collect them. A stamina bar
(centered above the hotbar) gates sprint/dash/tool-swings and regenerates
after a short delay. Combat exists in foundation form: equip a club via the
hotbar (same flow as tools) to fight Boars scattered around the world —
`[LMB] Attack` when one's hovered in reach, same prompt-gating convention as
chop/mine. A red HP bar (above the stamina bar) tracks player health; dying
freezes the player briefly, then respawns them at world center with full
health and a short invulnerability window. The equipped tool/weapon now
shows as a small icon on the player, offset toward whichever direction
they're last facing.

### Just finished: Milestone 3 — loose world drops + magnet auto-pickup

Plan file: `.claude/plans/bright-prancing-starlight.md`.

Depleting a tree/boulder no longer credits the backpack directly — it
"explodes" into 2-4 scattered loose pieces that must be collected:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`): `amount` is now
  mutable (stacks can grow via consolidation), plus new fields `isDrop`
  (marks a spawned piece vs. a pre-placed branch/rock) and `exploding`
  (true while the spawn-scatter tween runs, so the magnet doesn't fight it
  over x/y). `setAmount()` keeps a small `x<N>` world-space count label
  (only shown when >1) glued to the sprite via a `preUpdate` override — this
  is what makes the label track through the explode tween, magnet pull, and
  bob without extra bookkeeping. `startBob()` is a slow yoyo'd vertical
  tween, used only on landed drop pieces, that reads as "loose item" (the
  brainstormed alternative to a blink — chosen over blink/glow for being
  less flickery/noisy).
- **`MainScene.spawnLooseDrop()`** splits a depleted node's yield into 2-4
  pieces, each a `ResourceNode` with `action:"pickup", loose:true,
  isDrop:true`, tweened outward from the origin to a random point 20-45px
  away (`Cubic.easeOut`, 250ms — the "explode"). On landing, each piece runs
  `consolidateDrop()`: if another non-exploding piece of the same resource
  sits within 28px, it merges in (`setAmount`) and destroys itself, so
  repeated fells in one area collapse into fewer stacks instead of
  carpeting the ground.
- **`MainScene.updateMagnet()`** runs every frame (`update()` now takes
  Phaser's `delta`), pulling any `isDrop && loose && !exploding` piece
  within `MAGNET_RADIUS` (100px) toward the player at `MAGNET_SPEED`
  (220px/s), collecting it into the backpack once within 14px. Toggled with
  **`V`** (`magnetEnabled`, default on) — logs an event-log entry on toggle,
  and the binding is listed in the top-left controls line. Purely
  radius-gated per frame (deliberately no "lock on"/persistence, per user
  correction) — a piece stops dead the instant the player leaves
  `MAGNET_RADIUS`, and resumes/fully closes the gap the instant they're back
  inside it.
- **Bug fix during this milestone**: pulled pieces appeared to trail the
  player at a fixed offset instead of reaching them. Root cause was the idle
  `startBob()` tween — its yoyo/repeat-forever `y` animation kept
  overwriting the magnet's manual `node.y` write every frame, fighting for
  the property. Fixed by `this.tweens.killTweensOf(node)` the moment a piece
  enters magnet range, before applying the pull.
- **Follow-up bug fix (freeze/perf-death during extended play)**:
  `startBob()`'s `repeat: -1` tween never completes on its own, and nothing
  was stopping it when the piece it targeted got destroyed — either merged
  away by `consolidateDrop`, or clicked mid-explosion (pieces are
  hoverable/clickable immediately, even while still `exploding`). Each such
  piece left a tween permanently animating a destroyed sprite; over a play
  session of repeatedly breaking rocks/trees these piled up unbounded and
  dragged the frame rate down to what looked like a stuck/crashed game.
  Fixed by killing a node's own tweens in `ResourceNode.deplete()`, plus a
  `node.depleted` guard in the explosion tween's `onComplete` so an
  already-collected piece doesn't get a *new* bob tween started on it after
  the fact. Verified via `preview_eval`: depleting every boulder/tree in the
  world while never letting the magnet collect them (worst case) left tween
  count matching live-piece count exactly (no orphans), and fully collecting
  everything afterward left zero leaked node tweens.
- **Revised from the original plan**: pre-placed branches/rocks are now
  *both* `loose:false` — always manual-click, never magnet-eligible. Only
  spawned drop pieces are loose. `CLAUDE.md`'s "loose flag" bullet was
  updated to match (the old text said branches were loose; superseded).
- **Unrelated fix bundled in**: `vite.config.ts` hardcoded port 5173, which
  meant the Preview tooling's `autoPort` fallback (used when another
  session's dev server already holds 5173) couldn't actually redirect Vite
  to a free port. Now reads `process.env.PORT` (falls back to 5173), and
  `.claude/launch.json` no longer hardcodes `--port`/`port` and sets
  `autoPort: true` — future sessions running alongside another chat's `dev`
  server will just work instead of hitting a blank/unreachable preview.

Verified via `preview_eval` (explode scatter into multiple pieces summing to
the original amount, landing-site consolidation merging pieces and their
count labels, magnet pulling a landed piece in and crediting the backpack
while `exploding` pieces and pre-placed branches/rocks are correctly
untouched, the `V` toggle stopping/resuming the pull and logging both
transitions) plus `preview_screenshot` for the scatter/label rendering.
Type-check clean, no console errors.

### Previously: Move speed halved + tool hit-rate cooldown

Two small follow-ups requested right after M2 landed (M2's multi-hit change
made LMB-spam farming worse, since nothing capped how fast repeated hits
could land):

- **`Player.ts`**: `SPEED` halved (190 → 95 px/s) — movement felt too fast.
- **Tool hit cooldown**: `toolCooldownMs(tool)` (`src/entities/ResourceNode.ts`),
  same `Record<ToolType, number>` pattern as `toolDamage`/`toolKind`
  (`stone_axe`/`stone_pickaxe` both `500`ms for now). `MainScene.tryInteract()`
  tracks `lastToolHitAt` (via `this.time.now`) and bails out silently (no
  swing, no `takeHit`) if a chop/mine attempt comes in before the cooldown
  elapses — spamming LMB now can't out-farm the tool's swing rate. Pickups are
  unaffected (single-click, no cooldown, same as before).
- This is the first piece of "attack speed" as a per-tool/weapon concept;
  future tiers/weapons can tune their own cooldown independently, and this is
  the hook combat (roadmap item 4) will reuse for weapon attack speed.

Verified via `preview_eval`: first hit registers, an immediate second click on
the same node is blocked (health unchanged), and after waiting past the
cooldown window a hit lands again. Type-check clean, no console errors.

### Previously: Resource node health / multi-hit (Milestone 2)

Plan file: `.claude/plans/radiant-gliding-seal.md`.

Trees and boulders now take 3 hits to fell instead of one:

- **`ResourceNode`** (`src/entities/ResourceNode.ts`) gained `health`/
  `maxHealth` (set via a new `health` field on `ResourceNodeConfig`) and a
  `takeHit(damage)` method — decrements health, plays shake+tint feedback,
  returns `true` only once health hits 0. The resource `amount` is awarded
  **only on the depleting hit**, not per-hit — no partial-yield/overflow
  logic needed, matches loose-drops still being deferred to M3.
- **Tool damage** is a new `toolDamage(tool)` function next to the existing
  `toolKind()`/`requiredKind()` pattern, backed by a `Record<ToolType, number>`
  (`stone_axe`/`stone_pickaxe` both deal `1` for now) — future higher tiers
  return a bigger number and fell nodes in fewer hits without any node-data
  changes.
- **Hit feedback** lives entirely in `ResourceNode.playHitFeedback()`: a quick
  side-to-side shake tween plus a tint interpolated from white toward a
  darker "damaged" shade as health drops — the first shake/tint-style effect
  in the codebase (tween conventions follow `EventLogUI.ts`'s established
  style: short durations, named eases, cleanup via callbacks).
- **`Player.playSwing()`** (`src/entities/Player.ts`) is a quick rotate-punch
  tween (angle 0→25→0) played on every successful chop/mine hit — a stand-in
  for a real swing animation since there's no facing-direction or
  weapon-sprite system yet; kills any in-flight swing tween first so rapid
  clicks can't leave the player stuck mid-rotation.
- Pickups (branch/rock) are untouched — `health: 1`, but they never go
  through `takeHit`, so behavior is identical to before.
- Trees/boulders that survive a hit stay in `this.nodes` and keep showing
  their hover prompt; nothing is removed/credited until the depleting hit.

Verified via `preview_eval` (health decrementing per hit, resource awarded
only on the 3rd/depleting hit for both chop and mine, node correctly removed
from `nodes` only when depleted, rapid back-to-back hits leaving no stuck
tween/angle state) plus a `preview_screenshot` for the tint darkening. Type-
check clean, no console errors.

### Previously: Placement mode for build/placeable items

Plan file: `.claude/plans/ancient-painting-petal.md`.

Items flagged `placeable: true` in `Items.ts` (currently just `campfire`) no
longer land in the backpack when crafted. Instead:

- The crafting menu's button reads **"Place"** instead of "Craft" for these
  recipes (`isPlaceableRecipe()` in `Recipes.ts`, checked in `CraftingMenu.ts`).
  Clicking it closes the crafting menu and enters **placement mode**
  (`MainScene.startPlacement`) — no cost is deducted yet.
- A semi-transparent ghost preview follows the cursor, clamped to
  `PLACEMENT_RADIUS = REACH * 1.25` (80px) of the player (recomputed live each
  frame, so walking repositions the radius). A small hint —
  `[LMB] Place <item>   [RMB] Cancel` — shows under the top-left controls
  line (`placementHintText`, 12px, `(12, 30)` — deliberately NOT the shared
  bottom-right gather-prompt text, and deliberately not overlapping the
  hotbar or the `[T] Craft` tab).
- **LMB** (`attemptPlaceObject`) deducts the recipe cost only at that moment,
  spawns a plain world image at the ghost's position, and **re-arms**
  placement mode immediately so the next one can be placed without reopening
  the crafting menu — this loop is the "ask to place another" behavior,
  expressed as the persisting prompt rather than a separate confirm dialog.
  Running out of materials mid-loop auto-cancels with an event-log message.
- **RMB**, **Escape**, or **Tab** cancel placement mode outright — free,
  since nothing is spent until a successful LMB.
- A same-click double-fire bug (Phaser fires both the "Place" button's own
  `pointerdown` and the scene-wide generic `pointerdown` for one click, which
  was placing the object right where "Place" was clicked) is fixed via a
  one-shot `suppressNextPointerdown` flag consumed by the scene's global
  pointerdown handler.
- No loose-world-drop system was needed for this — since materials are only
  spent on a successful LMB, a cancelled placement has nothing to destroy.
  That concept is still deferred to Milestone 3 (or to whenever destroying
  *already-placed* build pieces becomes a feature).
- Placed objects are currently just visual (`this.add.image`, no physics
  body, no interaction) — intentionally minimal; a real placed-object entity
  can come later alongside the destroy-for-pieces feature.

Verified via `preview_eval` (radius clamping, cost-only-on-LMB, free RMB
cancel, Escape/Tab cancelling instead of opening menus, the double-click fix
via simulated real Phaser pointer events, and clicking "Place" through the
actual crafting-menu UI). Type-check clean, no console errors.

### Previously: Milestone 1 of the inventory-overhaul plan, plus a UI polish pass

Plan file: `.claude/plans/bug-i-can-drag-twinkling-engelbart.md` (3 milestones;
M1 done, M2/M3 not started).

**M1** replaced the old derived-list item model (`Inventory` counts + `ownedTools`
Set + `craftedItemCounts` Map) with a single unified slot-based model:

- **`src/systems/ItemContainer.ts`** (new) — fixed-size array of `{key, count}`
  stacks. `add`/`hasRoomFor`/`count`/`removeCount`/`findAssignable`, plus the
  free function `moveSlot(src, si, dst, di)` that merges-or-swaps. This one
  primitive backs every drag, rearrange, and hotbar assignment.
- **Backpack** (`MainScene.backpack`) and **Hotbar** (`Hotbar.container`) are
  each an `ItemContainer`. Resources (wood/stone/leather) are now regular
  stackable items living in the grid (max 99), not a separate counter.
- **`Items.ts`** — every item def now carries `maxStack` (99, or 1 for
  tools/weapons) and `hotbarable` (false for shishkabob/campfire).
- Drag is scene-owned (`MainScene.beginItemDrag/resolveItemDrag`), not
  per-widget — this is what lets items move backpack<->hotbar and rearrange
  within either. Right-click quick-moves via `quickMoveItem`.
- Mouse wheel cycles the hotbar 1-9 (wraps both directions) unless the pointer
  is over the event log, which scrolls its own history instead
  (`EventLogUI.isPointerOver`).

This fixed both reported bugs (item duplicating into multiple slots on
drag/right-click; crafting a 2nd tool eating resources with no result) as a
side effect of giving every item a single home slot instead of a derived
count.

**Then a follow-up UI polish session** cleaned up rough edges left by M1:

- Removed the top-left `Wood/Stone/Tool` HUD text (redundant once items live
  visibly in the grid/hotbar) and moved the "Move: WASD..." controls line up
  to `(12, 10)` now that nothing sits above it.
- **`src/ui/Tooltip.ts`** (new) — extracted the item-info popup (name,
  description, stats) that `InventoryMenu` already had into a shared class
  with two placement modes: `"right"` (flips left near the screen edge — used
  by the backpack grid) and `"above"` (opens upward, centered — used by the
  hotbar, which sits at the very bottom of the screen). `HotbarUI` now shows
  the same hover tooltip the backpack grid does.
- **`InventoryMenu`** reworked into a horizontal layout — backpack grid grown
  from 5x4 (20 slots) to **6x6 (36 slots)** on the left, with the 3x3
  equipment grid repositioned to its right (was stacked above it), using the
  vertical space freed up by that move.
- **Crafting menu** recipe rows now show the item's icon next to its name
  (`[icon] Stone Axe`). `outputKey(recipe)` (tool/itemId -> item key) moved
  from `MainScene.ts` into `Recipes.ts` as a shared export so both
  `MainScene` and `CraftingMenu` use one implementation.
- **Recipe-unlock toasts** redesigned: previously a center-screen toast shared
  with level-up/info messages; now recipe unlocks get their own small
  icon+text card that slides in from the right edge, lands in a stack
  top-right (below the `[T] Craft` button, clear of the bottom-right event
  log), holds, then fades. Multiple unlocks queue and stagger in one at a
  time (~200ms apart) instead of popping in simultaneously. Level-up/info
  toasts are unchanged (still center-screen via `EventLogUI.showToast`).

**Verified via `preview_eval` + `preview_screenshot`** — direct scene-method
calls to inspect state precisely (container/text object positions, contents,
tween state via an in-page `await new Promise(setTimeout...)` before
inspecting), plus visual screenshots for layout confirmation. Type-check
clean throughout. No console errors.

### Up next

Combat (roadmap item 4) now exists in **foundation** form (see "Just
finished" above) — health/damage, facing, equipped-item visuals, melee
weapon equip, one enemy (Boar), death & respawn. Per `CLAUDE.md` convention
(one milestone/feature per session), the follow-ups below should each start
in a fresh chat session rather than continuing this one.

**Explicitly deferred from this pass (not forgotten — see `CLAUDE.md`'s
"First biome — content notes" for the fuller design):**

- **Gremlin** (ranged rock-throw + melee claw, keep-distance AI) and
  **Snake** (hidden-in-grass ambush) — the other two first-biome enemies.
  Gremlin's ranged attack means this is also where the game's first
  projectile system needs to get built.
- **Boar's charge attack + fear-of-fire** (flees near a torch/campfire) —
  the shipped Boar this pass is bite-only/no-fear, a deliberate
  simplification.
- **Slingshot + Slingshot Pellets** — first ranged *weapon* + first
  consumable-ammo concept.
- **Workbench crafting-tier gate** — `Recipe.tier` still exists as the
  unused hook for this (see `Recipes.ts`); nothing enforces it yet.
- **Dash i-frames** — dash is still a pure movement burst with no
  invulnerability window. Now that Health exists, this is unblocked
  whenever it's wanted; just not bundled into this pass.
- **Cooking/food** (Empty Shishkabob + raw meat → cooked over a campfire) —
  no rest/food/hunger system exists yet; `boar_meat` currently just sits in
  the backpack as a plain stackable with no use.
- Combat XP/skill (`Skills.ts` still only has `axes`/`pickaxes`) — ties into
  roadmap item 5 (Progression) more than item 4.

### Known rough edges / deferred (see plan's "Out of scope" section)

Carry weight, tool durability, craft-quantity selector, stacking exceptions
beyond durability — all intentionally deferred, not forgotten. The magnet
(M3) has no carry-weight gating yet since that system doesn't exist. Placed
objects (campfire) have no collision/overlap checks and can't be destroyed
yet — deferred until a destroy-for-pieces feature exists, which can now
reuse the M3 loose-drop system for the resulting pieces.

### Previously: M-WC — Gremlin War Camp (altar POI upgrade + hints)

Next milestone in the locked roguelike meta-loop build order
(`.claude/plans/roguelike-metaloop-master-plan.md`; detailed plan:
`.claude/plans/snug-leaping-mochi.md`). Built on Sonnet — content + layout on the existing
altar/shack/camp-spawn, `MinimapUI.revealLandmark`, and M-DN night-light systems, no new
mechanic. Promotes the lone Boss Altar into a **walled Gremlin War Camp** so it reads as a
*place*. Two locked decisions this session (the user): shacks stay scattered but cluster denser
near the camp (2→3), and the camp glows at night as a navigation hint.

- **`MainScene.spawnWarCamp()`** (new; called after `spawnAltarDensity()` in `create()`,
  guard-returns if `altarPosition` is null, deterministic via `sessionRng`) lays out
  decoration around the altar. All props are plain `scene.add.image(...).setDepth(y)` —
  non-solid + Y-sorted like every other world structure, and untracked (auto-destroyed on
  `scene.restart`) except braziers:
  - **Palisade ring** — stakes every ~14° at ~230px radius (±8px jitter), **skipping a ~55°
    entrance-gate arc** whose facing points toward world center (`Phaser.Math.Angle.Between` +
    `Angle.Wrap` shortest-angular-distance test), so the player walks in the gate. Verified:
    22 stakes placed out of 26 candidate positions (the ~4 in the gate arc correctly skipped).
  - **Banners ×4 / totems ×2** scattered inside the camp; **braziers ×3** (two flanking the
    gate, one deep in) whose world positions are pushed to a new `campLightPoints` field.
  - **Breadcrumb trail** — 2 sparse outer `gremlin_camp_prop` bands (500–750px ×6, 750–1050px
    ×4) extending the existing 3 inner bands, so clutter increases toward the camp. Enemy
    counts unchanged (locked decision 7 — prefer a bigger world over more enemies).
- **Four new placeholder textures** in `BootScene.ts` (`palisade_stake` 12×26, `gremlin_banner`
  16×30, `war_totem` 18×38, `camp_brazier` 14×22), same crude-pixel style / gremlin palette;
  the brazier's flame matches the altar's orange (`0xe8862c`).
- **Braziers glow at night** — `collectLights()` gained a loop over `campLightPoints` pushing a
  `POI_LIGHT_RADIUS` light per on-screen brazier (reuses the existing `onScreen`/`toScreen`
  helpers, no new lighting code). The M-DN light-mask does the rest. Verified: with the camera
  on the camp and the clock forced to deep night, `collectLights()` returned 7 lights (altar +
  3 braziers + nearby shacks) and a screenshot shows a warm light pool over the camp against
  the dark forest.
- **Shacks cluster denser** — `SHACK_NEAR_ALTAR_COUNT` 2→3 in `spawnGremlinShacks()`; the other
  2 stay wild standalone POIs. Verified against a live seed: 3 shacks within ~500px of the
  altar, 2 far away.
- **Minimap landmarks** — `GremlinShack.discoveredOnMap` added; `updateAltarDiscovery()`
  generalized to also reveal each shack once the player explores within `REVEAL_RADIUS`, in a
  distinct **wood-brown** (`0x8a6a3a`, r1.5), while the altar/war-camp landmark is now a
  **larger red** dot (`0xd6483a`, r2.5) so the camp stands out. `MinimapUI.revealLandmark()`
  gained an optional `radius` param (default 1.5) for this. Folds in the standing "shacks
  should get the altar's landmark treatment" backlog item. Verified: driving the discovery
  pass over all 5 shacks + the altar flips every `discoveredOnMap` flag true and draws the
  dots.
- **Reset** — `campLightPoints` resets to `[]` at the top of `create()` per the
  `scene.restart()`-doesn't-re-run-field-initializers gotcha. Verified: New Run → exactly 3
  brazier light points again (not leaked/doubled), 5 fresh shacks, no stale discovery flags.

**Verified** — `tsc --noEmit` clean; live `preview_eval` for every bullet above;
`preview_screenshot` of the camp layout (palisade ring + props), the night glow, and the
minimap; `preview_console_logs` (error) clean.

**Same-day playtest follow-up (the user: "the camp just looks so busy"):** the first ship
above layered its new dressing on top of `spawnAltarDensity()`'s pre-existing (pre-M-WC)
40-prop clutter band and let ordinary trees/rocks/bushes/wild enemies scatter right through
the camp — the actual busy/messy look wasn't placeholder art, it was two independent
systems drawing over each other with no exclusion zone. Fixed with a real design pass, not
a tweak:

- **Nothing can spawn inside the camp anymore.** New shared module constants
  `WAR_CAMP_RADIUS` (230, the palisade wall — one source of truth now used by the wall
  itself, the floor stamp, and the exclusion check) and `WAR_CAMP_CLEAR_RADIUS` (300, padded
  past the wall to absorb cluster jitter). `pickSpawnPoint()` (used by every tree/rock/
  boulder/bush/enemy scatter call) and `pickCreekEdgePoint()` (Cattail's own bespoke
  sampler, which doesn't go through `pickSpawnPoint`) both reject any candidate within
  `WAR_CAMP_CLEAR_RADIUS` once `altarPosition` is set; `scatterClustered()`'s per-node jitter
  (bushes) gets an extra fallback-to-cluster-center check since jitter can push an
  already-valid center point back inside the wall. `altarPosition` is now picked *before*
  ground/node/enemy spawning in `create()` (previously chosen only after nodes+enemies were
  already scattered) so all of this can actually see it. Verified across multiple fresh
  seeds: 0 of ~396 world nodes ever land within 300px of the altar (a stray Cattail at 260px
  surfaced the `pickCreekEdgePoint` gap on the first check — fixed and reverified at 0).
- **Distinct camp floor** — `buildBiomeTexture()` stamps a packed-dirt color
  (`0x5a4a30`, 230px radius, 40px soft edge, same falloff idea as the forest/creek blend)
  over the ground bake once `altarPosition` is known, so the camp reads as a cleared
  campground instead of the same grass/forest texture as everywhere else.
- **Removed the old redundant clutter** — `spawnAltarDensity()`'s original 3-band
  `gremlin_camp_prop` scatter (0–500px, 40 props) predated the real camp structures and is
  gone entirely; `spawnWarCamp()` is now the single source of all camp dressing, both inside
  the wall and the breadcrumb trail leading to it (rebased to start at 300px, just outside
  the clear zone, instead of 500px).
- **Huts are evenly spaced, not randomly clumped** — the 3 near-altar Gremlin Shacks no
  longer roll a random `pickPointNearAltar` point; `spawnGremlinShacks()` now fans them at a
  fixed ~170px radius, 100° apart (± small jitter), centered on the side of the camp
  *opposite* the entrance gate (new `campGateFacing()` helper, shared with the palisade
  gate/brazier placement so they all agree on the same facing). Banner/totem scatter radii
  were also tightened (140px / 110px, down from 200px / 130px) so they stay in the courtyard
  instead of competing with the hut ring.

Verified live across several reloads/reseeds: 0 nodes inside `WAR_CAMP_CLEAR_RADIUS`; the 3
huts land at ~161–177px from the altar (target 170±10); screenshots (both a wide shot and a
close zoom) show a clean dirt clearing, palisade ring, altar + banners/totems centered, and
the 3 huts fanned evenly opposite the gate, with zero stray trees/rocks/bushes inside the
wall and only the breadcrumb trail visible approaching from outside. `tsc --noEmit` clean,
no console errors.

Next per the locked build order: **M-TE (trophy-gated gear)**, then **M-W1** (circular
multi-biome world) last.

### Previously: M-RL playtest follow-up — per-species elite trophies + night-number HUD fix

Small follow-up batch off the first M-RL relic playtest (the user, 20-min run: got 1
Common relic before the boss — "okay, hoping it scales" with more enemies/biomes; no
scaling change made this pass, just noted the design already supports it). Built on
Sonnet (extends the already-designed loot + relic systems + a one-line HUD fix, no new
mechanic).

- **Every elite now drops a UNIQUE trophy by species** (was: all elites dropped
  `gremlin_trophy`). Boar → **Boar Trophy**, Snake → **Snake Trophy**, Gremlin/Gremling →
  **Gremlin Trophy** (unchanged). The trophy type is data-driven, not another centralized
  constant: `EnemyConfig` gained an optional `eliteTrophy?: ResourceType` (defaults to
  `gremlin_trophy`); the base `Enemy` constructor appends `{ resource: cfg.eliteTrophy ??
  DEFAULT_ELITE_TROPHY, min: 1, max: 1 }` to `loot` when elite (the old `ELITE_TROPHY_DROP`
  const was replaced by `DEFAULT_ELITE_TROPHY`). `Boar`/`Snake` pass their own
  `eliteTrophy`; Gremlin/Gremling ride the default. **New resources** `boar_trophy` /
  `snake_trophy` (`Inventory.ts` `ResourceType`, `Items.ts` `ITEM_DEFS`, `BootScene.ts`
  `icon_boar_trophy`/`icon_snake_trophy` — crossed-tusks / coiled-fanged-head icons in the
  same crimson/gold elite palette as the gremlin trophy; the item texture doubles as the
  loose-drop sprite).
- **All three trophies roll the same Common pool + shared pity counter** — new
  `TROPHY_ROLL` entries `boar_trophy`/`snake_trophy` → `{ common, tier 1, 5% }`. Because
  pity is per-*rarity* (not per-trophy), more elite variety just funnels more attempts into
  Common without fragmenting the odds. Deeper biomes (M-W1) can remap a species' trophy to a
  higher rarity/tier per source — the plumbing already supports it.
- **Relic Forge menu wraps its roll buttons** — the layout hardcoded 2 buttons on one row
  (fit the 560px panel); with up to 3 Common trophies it now wraps into rows of `BTN_COLS`
  (2) and the result line + owned-relic grid stack below the measured button block, so
  nothing overlaps as trophy variety grows. Each button is now labelled by its **trophy
  name** ("Roll Boar Trophy"), not just its rarity, so same-rarity buttons are
  distinguishable.
- **HUD night number fix** — `RunHudUI` showed `[Day N]` by day but a bare `[Night]` at
  night. New `DayNight.nightNumber()` (a night shares the number of the day it follows) →
  the HUD now reads `[Night N]`, symmetric with `[Day N]`.

**Verified** — `tsc --noEmit` clean; live `preview_eval`: elite Boar/Snake/Gremlin/Gremling
each `rollLoot()` → their own unique trophy ×1 (normal Boar → none); `TROPHY_ROLL` has all
4 keys; both new trophies roll into the Common pool (forced-success → Warrior's Charm,
forced-miss → streak++); the HUD reads `[Night 1]`/`[Night 2]`/`[Day 1]` across cycles;
`preview_screenshot` of the forge menu shows the 3 roll buttons wrapping cleanly (Gremlin +
Boar on row 1, Snake on row 2) over the owned-relics grid. No console errors. Next per the
locked build order: **M-WC (Gremlin War Camp) + M-TE (trophy-gated gear)**, then **M-W1**.


### Previously: Contextual hints + pause menu (playtest-readiness pass)

Off the master-plan build order: the user paused M-TE (trophy gear) to instead polish the
first biome enough for outside playtesters. The first item of that pass tackles the
biggest cold-start problem — a fresh player has no idea what the goal is or how the
controls work. Built on Opus (two new systems). Plan:
`.claude/plans/contextual-hints-and-pause-menu.md`.

- **`src/systems/Hints.ts`** (`HintManager`, framework-free like Run/Buffs) — a
  Valheim-Hugin-style contextual tip system (explicitly **not** a mascot; the "raven" was
  only a behavioral reference). `trigger(id)` shows a tip **once per run** if enabled
  (idempotent — safe from a per-frame hover path). Locked with the user: **keep it a
  challenge** — 8 tips teach controls + nudge toward mechanics but **never** spell out the
  totem→altar→boss win condition. "Already shown" state **resets each run** (fresh instance
  in `create()`); the **on/off preference persists** in localStorage
  (`survivor-rpg:hints-enabled:v1`, tolerant of a blocked/corrupt store). Disabled is a
  **true no-op that doesn't mark the hint shown**, so flipping hints back on mid-run still
  surfaces future first-occurrences.
- **`src/ui/HintUI.ts`** — corner popup card: right-edge, mid-height (~42%), clear of the
  minimap/hotbar/prompt/left-column. Slides in from the right, holds 5.2s, fades, click to
  dismiss; only one at a time (a new hint replaces the current). Flat scrollFactor(0)
  objects (no Container), depth 2860/2861 (clears WORLD_H, below menus). The slide tween is
  killed on replace so a stale `onComplete` can't fade the next card early.
- **8 triggers** wired at existing hook points: `awaken` (spawn +1.5s: WASD + explore),
  `pickup_reach` (first reachable free pickup: left-click to interact), `tool_locked`
  (clicked a chop/mine node without the right tool KIND — nudges toward tools, **never
  names which**, preserving the prompt-gating design), `open_menu` (first recipe unlock:
  press Tab), `stamina_empty`, `low_hp` (≤30%: cooked food heals), `nightfall` (torch +
  danger), `elite_trophy` (gremlin/boar/snake trophy in hand → Relic Forge; NOT the boss
  fang, which is a win-state drop).
- **`src/ui/PauseMenuUI.ts`** + MainScene wiring — a pause overlay (**Esc**), modeled on
  RunEndUI. Chosen over a standalone settings panel because it delivers three playtest
  needs at once: the pause players expect, a Resume/New Run escape hatch, and the home for
  the Hints ON/OFF toggle (settings didn't exist). **Freeze:** `openPauseMenu()` sets
  `isPaused`, zeroes player velocity, `physics.world.pause()`, `time.paused = true`;
  `update()` early-returns on `isPaused` so `run.tick`/day-night never advance — **pausing
  doesn't burn the speedrun clock**. Blocked once `runOver`/`isDead` (RunEndUI owns the
  frozen world then). World pointerdown guarded with `isPaused`; **Esc** opens pause only
  when no other menu is open (else it just closes that menu). All new fields reset in
  `create()` per the `scene.restart()` field-init gotcha (with a defensive
  `physics.world.resume()` + `time.paused = false` in case New Run was clicked from the
  pause menu). Keybinds panel gained a `"Pause / close: Esc"` line for discoverability.
- `tsc --noEmit` clean; preview console clean. Verified live: card renders + idempotent +
  one-at-a-time; disabled no-op doesn't burn the hint (re-enable re-shows); pause freezes
  physics + scene clock + `isPaused` and resumes clean; toggle persists. Screenshots of the
  PAUSED overlay + the right-edge TIP card. No `RECIPES.md` change (no recipes touched).

### Previously: Timed action bars + slot-machine relic rolls

A playtest feel request from the user (off the standing roguelike loop, not a master-plan
milestone): crafting/processing/cooking/relic-rolls all completed **instantly** — he wanted
a short **loading bar before the result lands**, with two distinct feels. Built on Opus
(new UI-animation mechanic + a per-station "busy" concept that didn't exist). Detailed plan:
`.claude/plans/generic-meandering-puffin.md`.

- **`src/ui/ProgressBar.ts`** (new) — a small reusable fill bar (flat scrollFactor(0) rects,
  no Container per the CraftingMenu note). Tweens a `{v}` proxy 0→1 (not the Rectangle
  itself) so the visuals can hide/cancel without killing the tween. One instance is owned
  per menu, positioned over the action button, **not** part of the per-frame-cleared `rows`.
  Used by the three "quick" menus: **craft ~450ms, cook ~500ms, process ~600ms**
  (`Sine.easeInOut`). A **single bar for a whole batch** (an 8→4 dry is one bar, verified).
- **Commit-at-end:** inputs are consumed + output granted only when the bar fills (the
  existing synchronous `craft`/`processAmount`/`cook` methods are unchanged, just invoked
  from `onComplete`). A `busy` flag greys the button + blocks re-clicks meanwhile.
  **Closing a menu mid-bar cancels cleanly** (nothing consumed until it fills, so a no-op —
  chosen over "complete after close" because the station menus lose their station ref on
  close; uniform + predictable). Verified: normal craft 0→1, cancel-on-close 1→1 (no
  double-craft, no lost resources), and item lands **after** the bar, not at click.
- **`src/ui/RelicRevealFx.ts`** (new) — the Relic Forge's **slot-machine** spin (not the
  generic bar; the feel is different). The roll RESULT is resolved by the caller *before*
  the spin (trophy consumed + `RelicManager` mutated immediately — verified 5→4 trophies /
  0→1 relic at click), so an interrupted spin never changes what was won — it's pure theater
  over a known outcome. A ~1400ms `Quart.easeOut` bar decelerates while a **reel gem**
  rapid-swaps rarity icons and slows down, then a **rarity-scaled reveal** (data-driven
  `REVEAL_CFG`, not branching): **Common** = a modest gem punch + faint glow;
  **Uncommon** adds a panel flash + light shards; **Rare/Mythic** pile on a big additive
  glow burst (reuses the M-DN `light_soft` texture, tinted per rarity), panel flash, a
  radial shard burst, a scaled-in `★ RARITY! ★` banner, and a subtle camera shake. A
  full-panel scrim dims the busy grid + eats clicks during the spin. **Fail** = a grey
  crumble fizzle. Verified: mid-spin frame (scrim + reel + bar) and the frozen **mythic**
  payoff (glow blowing past the panel + banner) via a tween-pause trick.
- **Deferred announce:** `MainScene.rollRelic(trophyKey, announce=false)` for the menu path
  — the event-log line + `afterRelicChange()` (relic-bar sync, stat bonuses) fire at the
  **reveal landing** via a new `announceRelicResult()` + the menu's `announceRoll` dep, not
  at click, so the payoff is the satisfying moment. Verified: log/bar update on reveal, and
  `busy`/`fxActive` both clear afterward.
- No `RECIPES.md` change (no recipe/cost changes). `tsc --noEmit` clean; `preview_console_logs`
  (error) clean across all tests.

### Previously: Balancing dashboard + 25-min playtest triage

Off the master-plan build order (like 5q). the user's 25-min run (player lvl 7, ~lvl 16
Slash on a Bone Knife, 18 kills + 1 boss, 2 relics) produced a 12-item feedback dump.
Triaged and locked the order/scope via `AskUserQuestion`; **tackled the dashboard first**
this session (a tooling deliverable, not a game mechanic). Combat + balance work is queued
for later sessions.

- **Live HTML balancing dashboard** — `dashboard.html` (repo root) + `src/dashboard/main.ts`,
  wired as a **second Vite entry** (`vite.config.ts` `build.rollupOptions.input`). Open at
  **`/dashboard.html`** while `npm run dev` runs (served on whatever port Vite prints).
  Framework-free plain DOM (no new npm dep); no item icons (BootScene-generated at runtime,
  unavailable to a static page). **Drift-free by construction:** it imports the SAME
  source-of-truth data modules the game does (`Recipes`, `Items`, `Weapons`,
  `WeaponUpgrades`, `ArmorUpgrades`, `StationUpgrades`, `Processing`, `Cooking`, `Relics`) —
  all Phaser-free, so the page stays lean and updates automatically on any recipe/cost/stat/
  relic change. 8 searchable tabs: Recipes, Weapons (w/ DPS + upgrade costs), Armor (base +
  Lvl2 defense, set totals), Stations & Food, Relics (trophy→roll odds/pity + every relic's
  effect text — answers "Tireless Charm −12% to *what*" → **stamina cost**, and is the
  see-all-relics list), Enemies, **Balance Overview**, All Items.
- **Balance Overview tab** — the analysis payload. Computes incoming-damage-vs-armor
  (flat-deduction, floored at 1) at three armor breakpoints, flagging red where a hit floors
  to ≤2. Directly **quantifies the "1 damage per hit in Lvl 2 armor" complaint**: Gremling
  claw (8) and Gremlin claw (10) both floor to **1 dmg = 100 hits to kill you** in armor.
  Plus weapon time-to-kill per enemy. This is the reference for the queued rebalance.
- **The one drift risk** (documented in-UI + `RECIPES.md`): the **Enemies tab's `ENEMIES`
  array is manually mirrored** from the Phaser entity subclasses (Boar/Snake/Gremlin/
  GremlinKing) — enemy stats live in constructors, not exported tables. Keep in sync when
  tuning enemies. Everything else is live-imported.
- `RECIPES.md` got a pointer to the dashboard at the top (kept as the quick static reference).

**Locked decisions from the triage (for the queued follow-up sessions):**
- **Souls-like combat — ALL enemies, next combat session (Opus, new mechanic):** every enemy
  (Boar/Snake/Gremlin/Gremling) gets a telegraphed attack + a clear attack/dodge window, like
  the Gremlin King already has. Goal: kill the "kite forever by spam-left-click + walk away"
  feel. Boring common enemies are fine, but all need a readable tell + punish window.
- **Balance — "both, lightly" (Sonnet):** small armor-mitigation nerf + small enemy-damage
  buff so armor is a bonus, not near-immunity (see the Balance tab).
- **Boss (Sonnet):** bump Gremlin King damage MORE — should ~2-shot a full-armor player
  (damage already felt good vs max armor). **Replace the cleave/cone attack** — it reads as a
  strictly worse 360° slam; design a genuinely different attack.
- **Bug fixes (Sonnet):** (1) twine picked up from a chest didn't unlock recipes (container
  pickups skip discovery refresh); (2) Cooked Boar Meat recipe shown before ever making a
  shishkabob (cook-recipe discovery gating); (3) relic appears in "Your Relics" grid *before*
  the roll notification (5p deferred-announce missed the grid repaint); (4) "Roll Gremlin
  Trophy" button stuck in the Relic Forge at 0 count while other trophies vanish; (5) level-up
  full-screen flash is a jumpscare — keep it a big deal, dial intensity down.
- **Small features:** contextual hint to place a Workbench (Hints.ts); in-game relic
  compendium (see-all-relics view — the dashboard covers the dev side, he wants it in-game too).
### Previously: Souls-like common-enemy combat (telegraphed attacks)

Off the master-plan build order — the next item in the 25-min-playtest triage after the
dashboard ([[survivor-rpg-playtest-feedback-2026-07-11]]): kill the "kite forever by
spam-left-click + walk away" feel by giving **every** common enemy a telegraphed attack +
dodge window + recovery/punish window, the way the Gremlin King already works. Built on
**Opus** (new mechanic). Plan: `.claude/plans/hashed-enchanting-finch.md`. **Mechanic only —
the balance-number rebalance (armor/enemy-dmg/boss) stays deferred to a separate Sonnet pass**,
per the user's "get core mechanics playtest-ready first."

**Locked direction (the user):** per-enemy *bespoke* attacks, NOT one uniform system (harder
enemies feel distinct; common trash can stay simple + kiteable). Tells are **animation/motion/
tint** (rear-back, wind-up scale-pulse, lunge) — **NO world-space red arcs/lines** ("too
goofy"); players learn hitboxes over time. No audio system exists (confirmed) → sound tells
deferred. Ranged Gremlin: telegraph the **melee claw only** (projectile burst untouched).

- **Shared mechanism on base `Enemy`** (`src/entities/Enemy.ts`) — a *mechanism* with
  per-subclass *numbers* (like the existing `startPursuit`/`hasGivenUpPursuit`/`canAggro`
  give-up helpers; NOT a shared config table, per the standing "don't fold per-enemy combat
  stats into one table" rule). New `AttackPhase` (`none|windup|strike|recover`),
  `SwingConfig` (reach/windup/strike/recover/cooldown + optional `knockback`), `isAttacking()`,
  `playWindupTell()`/`endWindupTell()` (finite scale-punch ×1.18 + warning tint, restored via
  an extracted `applyHpTint()` — no `repeat:-1` leak, no x/y tween to fight the arcade body),
  and `tickMeleeSwing()` (drives a full in-place swing, holds the enemy planted, returns true
  only at the strike frame **if the player is STILL within reach** — re-checking current
  position instead of damaging on contact is what makes wind-up dodging real). Damage path is
  unchanged: `update()` returns true → `applyDamageToPlayer(biteDamage)`. Public
  `pendingAttackKnockback` (set by `tickMeleeSwing` from `SwingConfig.knockback` or by Boar's
  charge) is read in `MainScene.updateEnemies()` and fed to `applyDamageToPlayer`'s existing
  knockback param. Base `Enemy.update()`'s own bite was converted to the telegraphed swing too
  (canonical reference; deaggro now guarded with `!isAttacking()` so a committed swing plays
  out). GremlinKing untouched — already has telegraph/poise.
- **Gremling** (`MeleeGremling`, `Gremlin.ts`) — simple `tickMeleeSwing` claw, the
  intentionally-boring, still-kiteable baseline.
- **Snake** (`Snake.ts`) — **coil → locked lunge-bite**: a coil wind-up captures the strike
  direction on its first frame and never re-aims (stopped its old per-frame homing), then a
  straight locked lunge (`STRIKE_SPEED` bumped 90→150); a sidestep during the coil makes it
  whiff, and the existing flee IS the recovery/punish. Fleeing far during the coil cancels
  the strike; the whole lunge always resolves within COIL_MS+LUNGE_MS so it can't chase forever.
- **Boar** (`Boar.ts`) — now its own `update()` override (was bare base `Enemy`). Signature
  **CHARGE**: paws-the-ground wind-up (locks direction like GremlinKing's charge), a fast
  committed lunge (270px/s) that **overshoots** past the player, then a long
  recovery/turnaround (the main punish window). Plus a quick point-blank **gore-bite** so it
  can't be trivially circled. Both feed damage through the boolean contract; the charge sets a
  300px/s shove. (Renamed its wander fields to `boarWanderTarget`/`boarNextWanderAt` to avoid
  clashing with base `Enemy`'s privates.)
- **RangedGremlin** (`Gremlin.ts`) — kiting + 2-shot burst untouched; the melee claw is now a
  telegraphed `tickMeleeSwing` with a **shove knockback** (210px/s), and won't flip out of
  melee mode mid-swing.
- **Verified**: `tsc --noEmit` clean; preview console error-free. Live `preview_eval`
  (isolated one enemy, banished the rest) confirmed all four: Boar charge
  (windup→strike→recover→none, 25 dmg at strike, **sidestep whiffs → 0 dmg**, scale 1.18 +
  orange tint tell — screenshotted), Gremling swipe (cyclic, 8 dmg at strike), Snake coil→lunge
  (striking→fleeing→hidden, 20 dmg on the lunge), Ranged Gremlin claw (windup→strike→recover,
  10 dmg, kb=210 plumbed). **No damage ever lands during wind-up.** **Known limitation**: the
  shove knockback is currently near-cosmetic because `Player.update()` zeroes idle velocity
  every frame (overwriting the impulse the frame after) — a *pre-existing* trait of the exact
  path GremlinKing's slam already uses; fixing it is a boss-feel change, left for the deferred
  combat-feel/balance pass. No `RECIPES.md` change (no recipes touched).

**Still queued from the triage** (see [[survivor-rpg-playtest-feedback-2026-07-11]]): light
"both" rebalance (armor nerf + enemy-dmg buff), boss damage bump + replace the GremlinKing
cleave, 5 bug fixes, 2 small features (Workbench-placement hint, in-game relic compendium).
Then the master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).
### Previously: Playtest bug-fix batch (5 fixes)

The first chunk of the 25-min-playtest triage backlog after the souls-like combat pass —
five independent bug fixes ([[survivor-rpg-playtest-feedback-2026-07-11]]). Fixes/UI on
already-designed systems (Sonnet-class work, though built this session on Opus). No
`RECIPES.md` change (no recipe/cost changes).

1. **Chest-looted materials never unlocked recipes.** Picking a material up off the ground
   goes through `MainScene.addToBackpack()` → `discovered.add()` + `refreshDiscovery()`, but
   moving one out of a chest (or drying rack) uses `moveSlot()` directly + `afterItemMove()`,
   which never recorded discovery — so e.g. twine looted from a Gremlin Shack chest never
   unlocked its recipes. New `MainScene.reconcileBackpackDiscovery()` (called from
   `afterItemMove()`) scans the backpack, marks any not-yet-discovered key discovered, and
   runs `refreshDiscovery()` only when something new actually appears. General across every
   container→backpack path, not chest-specific. *Verified: twine placed into the backpack via
   the move hook went undiscovered→discovered.*
2. **Cook recipes shown before their ingredients were discovered.** `CookingMenu` filtered
   dishes only by campfire tier, so "Cooked Boar Meat" advertised itself before the player had
   ever obtained a shishkabob. Added a `discovered: () => ReadonlySet<string>` dep (wired to
   `MainScene.discovered`); a dish now also stays hidden until ALL its ingredients are
   discovered — the same "don't reveal locked info" rule `Crafting.ts` uses. Empty-state note
   when nothing's known yet. *Verified: 0 dishes at fresh state → 1 (Cooked Boar Meat) after
   discovering boar_meat + shishkabob.*
3. **New relic appeared in the "Your Relics" grid before the reveal landed.** The forge's
   `roll()` mutates `RelicManager` immediately (so an interrupted spin can't change the
   outcome — 5p), but `render()` then repainted the grid live, popping the new relic in before
   the slot-machine spin resolved. `RelicForgeMenu` now snapshots `groupedForDisplay()` into
   `preRollGroups` BEFORE the roll and renders that (via `displayGroups()`) while `busy`,
   clearing it when the reveal's `onComplete` fires. *Verified via forced-pity roll: mid-spin
   the manager holds the relic (live len 1) but the grid renders the frozen snapshot (len 0).*
4. **"Roll Gremlin Trophy" button stuck at 0 while other trophy buttons vanished.**
   `visibleTrophyKeys()` special-cased `gremlin_trophy` to always show (for at-0
   discoverability), which read as a broken button next to Boar/Snake buttons disappearing at
   0. Now every trophy button shows only when owned (count > 0), with a "No trophies — defeat
   elite enemies to earn them." empty-state note (and the grid's empty message reworded off the
   Gremlin-Trophy-specific text). The forge recipe itself costs a Gremlin Trophy, so a placed
   forge already implies the player has met them. *Verified: 0 trophies → note only; +1 gremlin
   trophy → "Roll Gremlin Trophy" button.*
5. **Level-up flash was a jumpscare.** `cameras.main.flash()` peak amber dialed well down
   (90,70,20 → 48,36,12) and the fade lengthened (180→300ms) so it reads as a soft warm pulse,
   not a hard full-screen pop; the punch-in "LEVEL UP!" banner stays the "big deal" part. No
   camera shake.

**Verification:** `tsc --noEmit` clean; preview boots console-error-free; the four logic fixes
asserted live via `preview_eval`. (The "YOU DIED" screen seen during testing was just the idle
player killed by an enemy over the eval minute — confirms the hardcore run-end flow still works,
unrelated to these changes.)

**Still queued from the triage** (see [[survivor-rpg-playtest-feedback-2026-07-11]]): the light
"both" rebalance (armor nerf + enemy-dmg buff), the boss damage bump + GremlinKing cleave
replacement, and 2 small features (Workbench-placement hint, in-game relic compendium). Then the
master-plan tail: **M-TE** (trophy gear), **M-W1** (multi-biome world).
### Previously: Elite melee reach fix + Gloaming Vein design

Two things this session: a live combat bug fix, and the locked design + committed plan for
the next feature (the Gloaming Vein — not built yet). The bug fix is Sonnet-class (a fix on
an existing system); it was done on Opus alongside the new-mechanic brainstorm.

**Elite Gremling "runs up but never attacks" — fixed.** Root cause: an elite's
`setScale(1.4)` also grows its **Arcade physics body** (verified live: a Gremling's 14px
body → 19.6px), and the player↔enemy collider then holds their centers ~19.8px apart —
right at the flat 20px swing-*start* threshold. On any diagonal approach the Euclidean
center distance exceeds 20, so `dist <= MELEE_RANGE` never fires and it never winds up
(hence "sometimes"). This is the **mirror** of the earlier `MainScene.enemyReach()` fix
(which scales the *player's* reach vs big enemies) — nobody had scaled the *enemy's own*
reach vs its own scaled body. Fix: a principled `Enemy.reachBonus()` =
`(baseScale-1) * max(width,height)/2` (the exact body-half the scaling added; **0 for
non-elites**, uses `baseScale` not the live wind-up-pulsed scale), added to **every** melee
reach check across the roster: `tickMeleeSwing`'s strike + the base/Gremling `MELEE_RANGE`
starts, RangedGremlin's enter/exit-melee thresholds, Boar's gore-start + gore-strike +
charge-hit, and Snake's lunge bite. Any future scaled/elite enemy gets it for free.
*Verified live against a real elite Gremling: a 22px swing that whiffed at the flat 20px
reach now walks windup→strike and lands (`observedHit: true`); `reachBonus` = 3.2px
(gremling texture is 14×16, so it uses the 16px dimension), restoring the same ~3px reach
margin a normal Gremling has. `tsc --noEmit` clean; console clean.*

**Gloaming Vein — designed + locked, plan committed, NOT yet built.** Brainstormed with
the user and locked via `AskUserQuestion`; full plan at
`.claude/plans/amethyst-warding-vein.md`. A mineable, rare, finite **purple ore POI** (glows
at night) guarded by a **mini-boss** (the "Gloamwarden"); mining it yields a magical
resource ("Gloam Shard") used at the **Relic Forge (new "Refine" tab)** to **climb trophy
rarity** — turning crumble-prone raw Common trophies into guaranteed-roll Refined Uncommons.
Locked rules: refine happens on the existing forge (not a new station); refined trophies are
**species-agnostic**; the vein is **hard-gated** (un-mineable until the guardian dies);
refinement is **single-step + terminal** (raw→one-up, refined trophies are roll-only, no
refined→refined) — so biome 1 naturally caps at Refined Uncommon while the system already
supports raw-Uncommon→Refined-Rare for deeper biomes. This **deliberately overrides M-RL's
"rarity not climbable / no manual combine" lock** — but as a *gated* climb (rare resource +
mini-boss), consistent with "nothing free." First-pass numbers in the plan; relic-strength
retune is a separate later pass. New-mechanic build is Opus territory.


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

### Biome 2 — Phase 2: Badlands enemies & wildlife (core 3 + flora)

Plan: `.claude/plans/biome-2-phase-2-enemies.md` (Phase 2 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (new content/AI). Scope locked
with the user via `AskUserQuestion`: **the core 3 enemies + arid flora** (the 4th native creature
deferred to Phase 2b); difficulty **noticeably tougher** than the forest roster; Cragscale
resist = **resist slash, neutral blunt, weak pierce**. First *content* in the badlands — three
bespoke enemies that each light up a Phase 1 dormant hook, spawned out in the badlands
patchwork, never the forest disc.

**1. Duskrunner** (`src/entities/Duskrunner.ts`) — gloam-touched canid swarm. Fast (92), low-HP
(20), short 220ms telegraphed bite. Deliberately drives the **base `state` field** (not a
private `mode`), so the inherited `Enemy.forceAggro()`/`isAggro()` work with **zero override** —
the reference `packAggro` user (radius 260). The AOE-arc payoff enemy (neutral resists). Spawns
in **packs of 3-4** so `updatePackAggro` visibly converges them. Loot: Duskrunner Pelt (+
Duskrunner Trophy elite).

**2. Cragscale** (`src/entities/Cragscale.ts`) — slow (40) armored bruiser, tanky (HP 60), one
heavy telegraphed basher (520ms tell + 180 knockback). **Teaches the damage-type layer** via
`resistances: { slash: 0.5, blunt: 1.0, pierce: 1.6 }` — the resist math + damage-number tint
already live in `resolveWeaponHit` (Phase 1), so this just declares data. Loot: Cragscale Plate
(+ trophy).

**3. Hexling** (`src/entities/Hexling.ts`) — compact **stand-and-cast magic kiter** (its own
subclass, NOT extending RangedGremlin — tracks a private `mode`, overrides `isAggro()`). Casts a
single **`hex_bolt`** per 2s with `damageType: "magic"` → **bypasses the player's flat armor**
(the dormant Phase 1 `applyDamageToPlayer` hook goes live). `Projectile` gained an optional
`damageType`; the enemy-projectile→player overlap now forwards it (physical Gremlin rocks leave
it undefined = unchanged). Resists `{ magic: 0.4, slash/blunt/pierce: 1.4 }` (resists magic,
weak to physical). Loot: Hex Essence (+ trophy).

**Flora** — Emberbloom (desert herb) + Sunfruit (cactus fruit), both persistent free-pickups
reusing the Blackberry `persistent`/`pickedTexture`/`regrowMs` path. **No recipes wired** —
future alchemy/food ingredients, surfaced only via the discovered-material toast.

**Integration** — new `MainScene.pickBadlandsPoint(rng, minCoverage=0.5)` sweeps a polar annulus
in the badlands radius band (2600-6400) and requires real `worldBiomes.coverageAt(..,"badlands")`
there, honoring the War-Camp/Vein exclusions. `spawnBadlandsEnemies()` (6 packs + 10 Cragscale +
10 Hexling, each `rollElite`) + `spawnBadlandsFlora()` (24 Emberbloom + 20 Sunfruit). 8 new
`ResourceType`s + `Items.ts` defs (Gloamreach flavor) + `TROPHY_ROLL` entries (Common/tier1 for
now — Phase 5 retiers to tier-2 + Ember refinement) + ~17 `BootScene` textures.

**Verified live** (`preview_eval`, console error-free; `tsc` clean): 39 badlands enemies
(Duskrunner ×19 / Cragscale ×10 / Hexling ×10) + 44 flora, all at r∈[2657, 6279] — **none in the
forest disc** (forest roster capped at r=2001, unchanged). Cragscale resist damage: 10 slash →
5, 10 pierce → 16. Hexling bolt spawns with `damageType:"magic"`; pack-aggro leader +
`updatePackAggro` woke both packmates (class-gated). Biome discovery toast + "Sunscorch
Badlands" minimap label confirmed. **Dashboard Enemies tab + trophy-source map updated** (manual
mirror); no `RECIPES.md` change (no new recipes). See [[survivor-rpg-biome-2-plan]].

**Same-session feedback pass (the user playtested):** four fixes. (1) **Density** — the badlands
was ~22× sparser than the forest (39 enemies over the whole huge ring), so the user walked into a
badlands area and found **0 enemies**. `pickBadlandsPoint` now concentrates in the **accessible
inner band** (r 2500-5200, inner-weighted `frac^1.7`) with a lower coverage threshold (0.5→0.4),
and counts jumped: Duskrunner **16 packs (~56)** / Cragscale **34** / Hexling **34** (~124 total,
was 39) + flora 40/32. Verified: ~5-9 badlands enemies near a typical r≈3000 entry point.
(2) **Terrain too red/pink** — `badlandsGroundColorAt` was a near-flat clay fill that the coarse
LINEAR-stretched overlay washed into solid color. Rewrote it with **multi-scale value-noise
mottling** (new `colorUtil.valueNoise2D`) across a dustier warm-earth palette (clay/ochre/sand/
taupe/rust, browner + a cooler taupe drift to kill the pink); verified 47 distinct tones across a
patch (channel spread R 74-166). (3) **Jagged straight borders** — `WorldBiomes.seedCoverage` now
uses a **3-harmonic angular wobble** (was a single sine) + bigger lobes (`wAmp` 0.18-0.36) + wider
soft falloff, so blob edges read as organic curves. (4) **Distinctive enemy kits** (the user: give
the new enemies unique attacks) — **Duskrunner** gained a **pounce** (locked-direction leap
gap-closer, built on Boar's charge mechanism); **Cragscale** a **rolling charge** (shell-roll to
catch kiters, spins during the roll) on top of its basher; **Hexling** a **blink** (teleports
~215px when the player closes inside 96px — a magical evade with a fading ghost VFX). All three
verified firing (state machines progress through every phase; blink teleports 164px). `tsc` clean,
no console errors. Dashboard Enemies tab updated for the new attacks.

### Biome 2 — Phase 1: Combat systems layer (damage types, resist/weak, AOE arcs, swarm base)

Plan: `.claude/plans/biome-2-phase-1-combat-systems.md` (Phase 1 of the
`biome-2-sunscorch-badlands.md` umbrella). Built on **Opus** (new combat mechanics). Three
reusable mechanics built *before* the biome-2 content so Phase 2 enemies / Phase 4 weapons can
declare them as data — all dormant until then, so biome-1 combat is unchanged. No new
enemies/weapons/content; verified by temporarily flagging existing enemies/weapons via eval.

**1. Damage-type resist/weakness.** `magic` already existed in `DamageType`; this adds the
multiplier layer. `EnemyConfig.resistances?: Partial<Record<DamageType, number>>` (`<1` resist,
`>1` weak, absent = 1) → stored on `Enemy`, exposed via `resistMultiplier(type)`. Applied at
the single choke point `resolveWeaponHit` (so it covers **both** melee and ranged and can't
drift), which also derives an effectiveness (`weak`/`resist`/`normal`) and passes it to
`spawnDamageNumber` — a non-crit number tints bright orange-red (weak) / dim blue (resisted);
crit's yellow still wins. Empty for every biome-1 enemy.

**2. Player-side magic-armor bypass (dormant hook).** `applyDamageToPlayer` gained an optional
`dmgType?: DamageType`; when `"magic"` it **skips the flat-armor term** (relic %-reduction
still applies, still floored at 1). No enemy deals magic until Phase 2's magical gremlin, so
every current caller uses the unchanged physical path. Verified live: 30 magic vs 30 blunt in
10-armor gremlin set → 30 taken (bypassed) vs 20 taken (30−10).

**3. Per-weapon AOE arc** (locked decision 6). `WEAPON_ARC: Record<WeaponType, {halfAngleDeg;
range; falloff}>` + `weaponArc()` in `Weapons.ts` — knife 25°/34px/0.5 (near single-target),
clubs medium, **primal_spear 50°/58px/0.7 (wide sweeper)**, ranged `range: 0`. `tryMeleeAttack`
now computes a shared pre-stagger/pre-crit `raw`, resolves the primary, then (if `arc.range > 0`)
sweeps other live enemies within `range` and `±halfAngle` of the swing direction (player →
primary target), each taking `raw × staggerMult × falloff` with **its own per-target crit**
through the same `resolveWeaponHit` (own resist, kill/loot/XP). Extracted
`staggerMultiplierFor(enemy)` (the GremlinKing/Gloamwarden `isStaggered()` checks) so
primary/secondary/ranged share it. `enemyRadiusBonus()` lets the cone still catch a big
elite/boss at its edge. Verified live: spear hit primary + in-cone neighbor (falloff) but not
the out-of-cone one; knife hit only the primary (neighbor beyond its 34px range).

**4. Swarm pack-aggro base** (opt-in). Public `Enemy.packAggro`/`packAggroRadius` (220) +
`forceAggro(now)` (wakes idle→chasing without damage; clears post-giveup immunity).
`MainScene.updatePackAggro(now)` (called each frame from `updateEnemies`) wakes idle **same-class**
`packAggro` neighbors of any aggro'd `packAggro` member — O(k·n) with k = packAggro count (0
today → effectively free). `forceAggro` drives the base `state` machine; a subclass tracking
aggro via its own field (Boar/Snake/Gremlin's private `mode`) must **override** it, exactly as
they already override `isAggro()` — documented in-code for Phase 2's swarm author. Verified live:
leader woke a 120px neighbor, not a 600px one, and not a different-class enemy 10px away.

**Verification.** `tsc --noEmit` clean. Live `preview_eval` against `MainScene` confirmed all
four (the render loop was throttled/backgrounded — pumped `game.loop.step` to reach RUNNING, per
CLAUDE.md's "assert against scene state, not screenshots" guidance). No `RECIPES.md`/dashboard
change (no recipe or enemy-stat data change — resist values arrive with Phase 2 enemies). See
[[survivor-rpg-biome-2-plan]].
### Biome 2 — Phase 2 playtest fix batch (spawn/reach/damage/Hexling-mage/Cragscale-bleed/worldgen)

Off the phase order — a feedback pass off the user's first badlands playtest. Built on **Opus**
(the Hexling redesign + the new bleed DoT are new mechanics). Fixes + two enemy-identity reworks:

- **Spawn leak (badlands enemies + Emberbloom "in the woods")** — `MainScene.pickBadlandsPoint`
  gated on `coverageAt(badlands) >= 0.4`, but near the forest transition a point can carry >=0.4
  badlands coverage while forest (disc or an overlapping forest blob) still WINS the blend, so a
  Duskrunner/Emberbloom placed there read as "in the forest." Now gates on
  `worldBiomes.dominantBiomeAt(x,y) === "badlands"` (which already resolves the winner incl. the
  forest disc). Verified live: **0** badlands enemies + **0** flora inside the forest disc
  (nearest at r≈2385/2500, just past the forest edge 2300).
- **Duskrunner melee "doesn't hit at some angles"** — a flat 20px bite/22px pounce reach whiffed
  on diagonal approaches (the player↔enemy collider holds centers ~24px apart on the diagonal).
  Bumped `MELEE_RANGE` 20→30 + `POUNCE_HIT_RADIUS` 22→32. Verified: a bite at 25px now connects.
- **"Duskrunner does 1 dmg in max armor"** — flat armor (full Tier-2 Gremlin set = 13) floored a
  14-dmg bite to 1. Per the user (locked via `AskUserQuestion`) kept the flat-armor model and
  **raised badlands damage** instead of reworking the formula: Duskrunner bite 14→20 (~7 through
  max armor; a pack landing that together is real pressure).
- **Duskrunner pack-attack sync** — packs of 3-4 already spawned, but attacked one at a time. New
  `Duskrunner.isPounceWindup()`/`joinPounce()` + `MainScene.updateDuskrunnerPacks`: a pouncing
  dog rallies chasing packmates within 210px to leap in the same beat (no-ops for anything out of
  band / on cooldown, so it's cheap and self-limiting).
- **Hexling → a real MAGE** (the user: "make it FEEL like a mage"). Was a recolored gremlin
  silhouette that kited + teleported (uncatchable) and threw one rock. Rewritten:
  (1) **distinct texture** — a taller 20×30 hooded/robed staff-caster (was the 18×22 squat
  gremlin body); (2) **stand-and-cast** — it no longer kites/back-pedals, only repositions via
  blink; (3) a second attack, **Flame Strike** — when the player closes to 150px it plants and
  calls down a cluster of 3 delayed fire circles at the player's LOCKED position (walk out to
  dodge), which detonate as **magic** AoE (18, bypasses armor) after an 820ms telegraph, then it
  **blinks away** to resume casting (blink is also the cornered-fallback when flame's on
  cooldown); (4) HP 30→55 so it's not 1-2-shot the instant you reach it. Routed through the same
  `checkPlayerHit()` area-damage path the bosses use (Hexling added to that instanceof union; the
  return shape widened to carry the magic `dmgType`). Verified live via a deterministic
  update-loop trace: telegraph→impact→`{damage:18,dmgType:"magic"}`→blink-to-~220px.
- **Cragscale roll "too easy to sidestep / feels the same as Duskrunner"** — the roll was a
  slow-ish locked charge you could stroll around. Now `ROLL_SPEED` 240→300 + `ROLL_HIT_RADIUS`
  30→40 (a casual sidestep no longer clears the shell — you need a dash/committed move), and a
  connect opens a **BLEED** wound on top of the big shove. First DoT in the game:
  `src/systems/Bleed.ts` (`BleedManager`, framework-free like Buffs) — stacking
  {dmgPerSec, remainingMs}, ticked in `update()`, applied via a new optional `bleed` param on
  `applyDamageToPlayer` (so it rides the **same i-frame guard** — a dashed-through roll opens no
  wound) carried by a new `Enemy.pendingBleed` hook (parallel to `pendingAttackKnockback`).
  Cragscale roll = 5/s for 4s (~20, stacks). Cleared on death. This is the heavy "must-dodge"
  threat that separates the tank from the Duskrunner's quick light pounce. Verified: roll connect
  sets `pendingBleed{5,4000}` + kb 230; the manager ticks whole points.
- **Worldgen "huge straight vertical/horizontal lines that don't blend"** — the crisp grass
  tilesprite + forest bake are a 4000px **square** (`BIOME_SIZE`) centered on spawn, so their
  edges met the blurry outer overlay as hard axis-aligned lines at ±2000 from center (plus a
  blocky core-skip circle sampled at the coarse overlay resolution). Fix: (1) the outer overlay
  now bakes **continuously** (dropped the `forestCoverage>=0.999` skip) as a smooth base under
  everything; (2) the grass tilesprite moved ABOVE it (depth -9.5→-9.4) and both crisp layers get
  a **soft-disc bitmap mask** (`forest_feather`, a canvas radial gradient — opaque across the
  play area, fading to 0 by the square edge), so the crisp core dissolves into the overlay as a
  circle instead of a square. Verified live from the west-edge midpoint: the straight line is
  gone, replaced by a soft blend; the forest core is still crisp; no console errors.

Files: `Duskrunner.ts`, `Cragscale.ts`, `Hexling.ts` (rewrite), `Enemy.ts` (`pendingBleed`), new
`systems/Bleed.ts`, `BootScene.ts` (hexling texture + `forest_feather`), `MainScene.ts` (spawn
gate, pack sync, bleed wiring, area-hit `dmgType`, overlay continuity + feather mask). Dashboard
Enemies tab updated (manual mirror). No `RECIPES.md` change. See [[survivor-rpg-biome-2-plan]].


### 16-item playtest fix batch (naming/UI/aggro/ammo/glow/tips/food-balance)

Off a fresh end-to-end playtest (the user), built on **Sonnet** — every item is a fix, tuning
number, or UI addition on an already-shipped system; nothing here is a new mechanic. No
`RECIPES.md` change (no recipe/cost changes).

- **Woodcutter's Axe** — `stone_axe`'s display `name` changed from "Stone Axe" (the item key,
  recipe, and every code reference stay `stone_axe`).
- **`"Attack Elite Elite Snake"` fixed** — `MainScene.promptForEnemy` was prepending its own
  "Elite " on top of `enemy.displayName`, which already carries the prefix per-species (e.g.
  `Snake.ts`'s `displayName: elite ? "Elite Snake" : "Snake"`). The prompt now just reads
  `enemy.displayName` directly.
- **Boar/Snake outranged by the Slingshot, fixed at the root** — investigating "hitting enemies
  should aggro them" found `Enemy.forceAggro()` (the pack-aggro wake mechanism) is only ever
  overridden by nothing — every `mode`-driven subclass (Boar/Snake/RangedGremlin/MeleeGremling/
  Hexling) ignores it, since it flips the base `state` field their own `update()` never reads.
  The ACTUAL existing fix pattern is a per-subclass `takeHit()` override that flips `mode` on a
  landed hit while idle — already present on RangedGremlin, Hexling, and (via its own bespoke
  reveal-and-fight-back logic) Snake, but **missing on Boar and MeleeGremling**. Added matching
  `takeHit()` overrides to both, mirroring RangedGremlin's exact idiom. (A `resolveWeaponHit()`-
  level `forceAggro()` call was tried first but proven fully redundant — base `Enemy.takeHit()`
  already does the same idle→chasing flip for state-field enemies — and removed.) Verified live:
  an idle Boar/MeleeGremling's `isAggro()` flips true on `takeHit()`.
- **"Out of ammo!" feedback** — firing a ranged weapon with no ammo loaded now spawns a small
  rising/fading callout at the player (`MainScene.spawnFeedbackText`, an explicit, narrow
  deviation from the standing "never reveal what's missing" silent-guard convention — used only
  where a playtester specifically asked for feedback).
- **Ammo auto-refill + bigger stacks** — when a shot empties the equipped ammo slot, it now
  auto-tops-up from the backpack (same key, up to `maxStack`) instead of unequipping to `null`.
  Slingshot Pellets' `maxStack` 50→99 (covers both the backpack stack cap and the ammo slot's own
  cap, which reads `itemDef(key).maxStack`).
- **Hotbar-drag-to-place** — dragging a placeable OUT of the hotbar (row 1 or row 2 — mechanically
  one container, see the standing hotbar note) into the game world now re-arms placement mode
  (`setHotbarSelection`) instead of dropping it as a loose pickup. Backpack-sourced drags are
  unchanged (still an explicit "get rid of this" world-drop).
- **Tip popup depth fix** — `HintUI`'s corner card was depth 2860/2861, below the crafting/
  inventory panel's 3000/3001, so a tip firing while a menu was open rendered behind it. Bumped to
  3200/3201 — above every menu, still below the pause overlay (3500).
- **"Defeated" / "Level Up!" text overlap fixed** — two related issues: (1) the dedicated
  `showLevelUpBanner()` callout and the EventLog's own generic center-toast stack
  (`EventLogUI.showToast`) were BOTH firing for the same player-level-up event, competing for the
  same screen region — the EventLog line is now passed a new `silent` flag (`EventLog.add`'s 4th
  param) so only the dedicated banner shows (still logged to the persistent side panel). (2) Even
  with that dedupe, a same-beat "Defeated X" combat toast could still land under the banner on a
  short viewport — `EventLogUI.setTopOffset()` lets `showLevelUpBanner()` reserve that vertical
  space for ~2.15s (matching the banner's own fade timing), pushing the toast stack below it.
- **Denser Gremlin Shacks** — count 5→8. Only the wild-standalone pool grew (2→5); the War Camp's
  3-hut fan (`SHACK_NEAR_ALTAR_COUNT`, carefully spaced opposite the gate) is untouched.
- **Lvl-2 food rebalanced** — Bramble-Glazed Boar Skewer / Blood-Glazed Snake Skewer were ~2.3x
  their Lvl-1 counterpart's total heal (e.g. 90 HP vs Cooked Boar Meat's 40). Per the user, a Lvl-2
  dish should read as "faster healing, not just a straight-up bigger number" — both now heal at a
  higher `hpPerSec` (2→2.5) over the SAME duration as their Lvl-1 counterpart (was extended
  30s/35s), landing at a flat **+25%** total (50/55 HP). Vitality's healing-received multiplier
  (`Health.healMult`, M-SS) applies equally to both tiers, so it doesn't change this ratio.
- **Chest + Gloam Shard glow** — both were easy to miss as interactable/mineable. Gremlin Shack
  chests now have a constant warm-gold pulsing halo (added in `GremlinShack`'s constructor);
  Gloaming Vein ore nodes get a purple pulsing halo the moment they're cracked open
  (`ResourceNode.crack()` → new private `startGlow()`, cleaned up in `deplete()`). Both reuse the
  `light_soft` additive-glow texture already established for the Gloam Shard drop-pop/night
  lighting — same visual language, just now a persistent day-and-night effect instead of a
  one-shot pop or a night-only light point.
- **Tips panel (Pause menu)** — a new `src/ui/TipsUI.ts` panel, opened via a "Tips" button on
  `PauseMenuUI` (panel height 384→436 to fit it), lists every hint discovered so far this run
  (`HintManager.discovered()`, new — `Set` insertion order needs no separate tracking). Modeled on
  `WelcomeUI`'s swap-over-the-hidden-pause-panel pattern (`openTips`/`closeTips` mirror
  `openHowToPlay`/`closeWelcome` exactly, including an Esc-key branch — a real gap in the first
  draft, since without it Esc while Tips was open fell through to a no-op `openPauseMenu()` guard
  rather than closing back to the pause panel). Addresses the "right-click to upgrade is not
  obvious" feedback — it's taught once by a corner popup and otherwise gone; this is the
  look-it-back-up escape hatch.
- **Wolf howl SFX — noted, not built.** Every existing cue in `Sfx.ts` is a raw Web Audio
  oscillator/gain envelope synthesized at call time (no asset files); a convincing howl doesn't
  fit that same simple-envelope approach. Left as an in-code comment on `nightfall()` — revisit
  once real audio assets are in scope (deliberately last on the roadmap).

Verified live via `preview_eval` (own dev server instance): Elite-Boar prompt reads "Attack Elite
Boar" (not doubled); an idle Boar/MeleeGremling's `isAggro()` flips on `takeHit()`; firing an empty
Slingshot spawns the feedback text with no crash; a 1-round ammo stack auto-refills to the backpack's
supply on the depleting shot; a 99-count Slingshot Pellets stack holds; `gremlinShacks.length` is 8
post-`create()`; the full Pause→Tips→Close→Resume loop (including Esc mid-Tips) preserves
`isPaused`/pause-panel state correctly; the Tips panel renders the two hints triggered in-test; and
the chest's gold glow halo is visible in a full-scene screenshot. `tsc --noEmit` clean throughout.

### Placeholder art pass — all creatures + non-rotating facing (2026-07-12, Opus)

the user: bring the placeholder art up to real effort even before real pixel art, using the new
**Hexling as the minimum detail bar** (it "looks awesome"), revamp every model that hadn't had
love, and make enemies follow the Hexling's **non-rotating** facing — noting this is visual only
and must NOT change attack direction (an enemy can still hit you while not facing exactly at you).

**Non-rotating facing (Enemy.ts).** The `upright` flag already existed (Hexling-only) — flipped its
default from `?? false` to `?? true`, so EVERY enemy is now non-rotating: `applyUprightFacing`
mirrors left/right via `flipX` with a ≤~11° (`UPRIGHT_MAX_TILT` 0.22 rad) up/down tilt, never
rotating off-vertical. The old default (`applyFacing`'s full-360° rotation-toward-travel + a random
full spawn rotation) was literally flipping the vertically-drawn Gremlin King / Gloamwarden
upside-down as they walked. Base `Enemy` is never instantiated directly (all subclasses), and no
subclass passes `upright:false`, so the single default flip covers the whole roster; the spawn
randomizer now only picks a random `flipX` mirror. **Purely visual** — attack hit-checks all use
x/y distance math (`tickMeleeSwing`, `checkPlayerHit`, charge/pounce/roll contact radii), never
sprite facing, so nothing about who-can-hit-whom changed. Kept the **Cragscale roll-spin** (it sets
`rotation` directly as a deliberate rolling-ball attack tell); after the roll it settles via
`faceAngle` back to the upright tilt. Comments on `EnemyConfig.upright` / the constructor /
`applyFacing` updated to describe the new default.

**Art (BootScene.ts).** Every creature texture redrawn to the Hexling's bar (layered silhouette +
base/shadow/highlight shading + feature details + glow), **preserving each texture's exact
dimensions** so reach/scale/body-separation tuning is untouched. All side-view creatures are now
drawn facing **RIGHT** (was nose-left) so the `flipX` convention reads correctly. Each with a
parameterized `draw*` helper generating normal + a crimson/gold **elite** recolor of the identical
silhouette (matching the existing `drawHexling` pattern):
- **player** (20x20) — front-facing blue-tunic adventurer: head+hair+eyes, tunic w/ belt+buckle,
  arms+hands, legs+boots. (Player is its own class, not `upright`; orientation is static, only the
  equipped-icon offset tracks facing — so a symmetric front view is correct.)
- **Boar** (26x20) — bristly hog, back-spikes, upward tusk, snout+nostrils, beady eye+glint.
- **Snake** (20x8) — head+yellow eye+forked tongue at right, scale flecks, belly underline.
- **Gremlin** (18x22) / **Gremling** (14x16) — hunched imps: pointed ears, glowing eyes, snaggle
  teeth, pot-belly, clawed hands (Gremling smaller/simpler = lesser threat).
- **Duskrunner** (24x14) — lean jackal: bushy tail, pointed ear, ember eye, four legs.
- **Cragscale** (28x18) — armored reptile: ridged + spiked stone-plate back, stubby legs, tail.
- **Gremlin King** (40x48) — hulking ogre-gremlin: bone crown, glowing eyes, upward tusks, huge
  fists, muscled torso + loincloth.
- **Gloamwarden** (34x42) — amethyst brute: violet body, shoulder/head crystal growths, crystalline
  fists, glowing chest core + eyes.
- **Hexling** left as-is (the benchmark). World props (trees/rocks/stations) + item icons left
  as-is — out of scope for a creature pass.

**Verification.** Type-check clean; no console errors. Live `preview_eval` texture-showcase overlay
confirmed all sprites render with the intended detail; a follow-up query confirmed all 233 live
enemies report `upright:true` with near-zero rotation and varied `flipX`. Real pixel art +
animations still deferred (roadmap item 8) — this is a polish-the-placeholder pass, not the final
art.

### Biome 2 playtest fix batch #2 (worldgen seam, ground texture, Hexling rotation, damage)

Off a second badlands playtest (the user), built on **Sonnet** — fixes/tuning on already-shipped
systems, no new mechanic. Four items:

1. **Worldgen seam (the real "flat lines" cause).** The tiled `outerFeatureBiome` (badlands/dunes/
   outer-forest feature layer, `MainScene.ts`) generates its Voronoi zones + CA smoothing + creek
   ribbon as a bounded, non-toroidal grid, but `Biome.bilinear()` samples it with wraparound for
   tiled instances — bilinearly blending the grid's two UNRELATED edges together, which bakes a
   hard seam every `OUTER_FEATURE_SIZE` (4000 world px) in both x and y. Confirmed live via
   `preview_eval`: `worldBiomeColorAt` scan found nothing (smooth data), but a direct screenshot at
   a tile-boundary-adjacent player position showed one clean horizontal line — later confirmed via
   `outerFeatureBiome.forestWeight()` boundary scans. Fixed in `Biome.ts`: `buildVoronoiZones` now
   uses a toroidal (shortest-way-around) delta for seed distance when `tiled`; `smooth()`'s CA
   neighbor lookup wraps via `Biome.wrapCell` instead of the old "out-of-bounds counts as agreeing"
   rule; `carveCreek()` swaps its free random walk for a periodic sine wobble when tiled (guarantees
   `wobble(0) === wobble(mainLen)`, so the ribbon's start/end lateral position always matches at the
   wrap). Re-verified post-fix: 0 big `forestWeight` jumps scanned across 5 tile boundaries × 5
   sample points each. This is a DIFFERENT root cause than the prior "Phase 2 playtest fix batch"'s
   forest-disc-square-edge fix (see below) — that one didn't touch the tiled outer layer at all.
2. **Ground texture ("loses the speckled texture" outside spawn).** New `colorUtil.mottleColor()`
   — a generic two-octave brightness-noise pass (broad 150px + fine 55px), applied in
   `WorldBiomes.worldBiomeColorAt()` to the base layer + outer-forest-blob color (skipped inside the
   protected forest core, which keeps its real crisp tileSprite bake). Badlands/Dunes already had
   their own richer noise (barely touched by this subtle a pass); the open-wilds base layer and
   Dunes' flat fill had none at all — this was the actual "flat light green" the user saw. Explicit
   placeholder pass (comment points at CLAUDE.md's real-art-later note).
3. **Hexling rotation** ("shouldn't rotate and look upside down... should be upright, maybe mirror
   left/right with slight angles up/down"). New `EnemyConfig.upright` flag (`Enemy.ts`) — only
   Hexling sets it. Skips the base `Enemy` constructor's random-360°-spawn-rotation (replaced by a
   random initial `flipX`) and `applyFacing`'s full-rotation-toward-travel (the Boar/Snake/
   Duskrunner/Cragscale nose-first pattern), replaced by a new `applyUprightFacing()`: mirrors via
   `flipX` on horizontal movement, tilts `rotation` at most `UPRIGHT_MAX_TILT` (0.22 rad, ~11°)
   toward vertical movement, clamped so it's never near horizontal/upside-down. `faceAngle()` (used
   by locked-direction telegraphs) branches the same way, though Hexling doesn't currently call it.
   Verified live: `applyFacing` at all 8 compass directions stayed within ±0.192 rad.
4. **Biome-2 damage bumped significantly** ("badlands enemies don't do enough damage... should hurt
   even with lvl 3 armor... base hexlings should kill you in like 3 hits... make the game hard").
   Raw damage (net-of-armor in parens, vs. the 13-flat Lvl-3-armor cap): Duskrunner bite 20→**34**
   (net 21, was 7); Cragscale basher/roll 22→**40** (net 27, was 9); Hexling bolt 14→**22** and
   flame 18→**34** (both `magic` — bypass armor entirely, so raw IS net; 3 flame hits ≈ 102 now
   kills a base 100-HP player). For comparison, biome-1's hardest hitters net ~12 (Boar) and ~7
   (Snake) through the same armor cap — biome-2 is now clearly, deliberately harder. Also fixed a
   latent bug found while touching this: **Elite Hexling dealt the exact same bolt/flame damage as
   a base Hexling** — every other elite gets +50% dmg via its `maxHealth`/`biteDamage` constructor
   scaling, but Hexling's magic damage was two module-level consts never read against `elite`. Now
   `boltDamage`/`flameDamage` are per-instance fields scaled `elite ? round(BASE*1.5) : BASE`,
   assigned after `super()` (can't reference `this` before it) and read at both call sites.
5. **Map cell blockiness** (secondary polish alongside #1, same "sharp edges" complaint). New
   `ExploredMap.colorAtSmoothed()` — a center-weighted 3x3 average over revealed neighbor fog cells
   (still -1/fog if the cell itself is unrevealed, never bleeds color INTO fog) — wired into both
   `WorldMapUI`'s dirty-triggered terrain rebuild and `MinimapUI`'s per-frame cell fill, softening
   the visible hard rectangular cell edges especially at `WorldMapUI`'s higher zoom levels.

Verified: `tsc --noEmit` clean, `npm run build` clean, live `preview_eval` on all four items (seam
scan, mottle visible in a fresh screenshot, Hexling facing at 8 directions, live damage constant
readout), no console errors. No `RECIPES.md` change (no recipe/cost changes).

### Biome 2 — Phase 2b: Sandmaw (burrowing ambusher, the 4th native creature)

Plan: `.claude/plans/biome-2-phase-2b-sandmaw.md`. Built on **Opus** (new enemy AI / state
machine). The "+1 native creature" deferred out of Phase 2's core-3 scope. Creature identity
locked with the user via `AskUserQuestion`: **a burrowing ambusher** (over an aerial diver or a
stealth flanker).

**The Sandmaw** (`src/entities/Sandmaw.ts`) — a gloam-touched burrowing ambush predator, the
badlands roster's 4th and most distinct threat vector. The existing trio is swarm-pounce
(Duskrunner) / armored roll-tank (Cragscale) / stationary flame-mage (Hexling); the Sandmaw adds
**"watch the ground / don't stand still near a lurker."** Own bespoke state machine, fully
overrides `update()` (does NOT call super — same precedent as Snake/Hexling):
`submerged → surfacing → erupting → exposed → burrowing → submerged`.
- **submerged** — near-invisible (alpha 0.18, a subtler Snake), slow-stalks (30px/s) toward a
  player within `STALK_RADIUS` 240px but outside the ambush ring to reposition (holds still
  otherwise — a slow drift so it isn't an invisible shove). Triggers on `AMBUSH_RADIUS` 62px.
- **surfacing** — pops to full alpha + `playWindupTell` load-up + a growing dust-ring telegraph
  previewing the exact burst radius. `SURFACE_WINDUP_MS` 560ms = the dodge window.
- **erupting** — a radial **sand-burst** (`BURST_RADIUS` 95px, 38 physical + 220 knockback), one
  hit per eruption, dealt via `checkPlayerHit()` (queried by the scene like the bosses / Hexling
  flame — NOT a melee bite; `biteDamage: 0`). Added `Sandmaw` to that `instanceof` union.
- **exposed** — fully surfaced + planted 1100ms: the vulnerable punish window.
- **burrowing** — dives back under (350ms), then a 2600ms re-ambush cooldown.

Numbers first-pass: HP 45 (between Duskrunner 20 / Cragscale 60), erupt 38 (~25 net through the
13-flat Lvl-3 armor cap, badlands-rebalance tier). Elite ×1.5 HP/dmg, ×1.1 speed, ×1.3 scale, 2×
loot, crimson/gold recolor. **Dodge math:** a walking player (95px/s) covers ~52px in the 560ms
wind-up; from 62px in they just clear the 95px burst with a beat of reaction — greedy/advancing
players eat it, reactive ones (or a dash + its i-frames) escape (same movement-dodgeable
principle as 5t's smash fix). **Resist profile (locked):** `{ pierce: 0.6, blunt: 1.4 }` — the
**inverse of Cragscale** (resist-slash/weak-pierce), so clubs/warhammer shine on Sandmaws where
the Primal Spear shines on Cragscales; the damage-type layer now rewards carrying more than one
weapon. **Reveal-and-retaliate:** attacked while submerged → surfaces + erupts (Snake/Hexling
`takeHit` precedent). `isAggro()` hidden while submerged (HP bar shows only once surfaced).
**Spawn:** scattered **lone** ambushers (no pack — a lurker is a solo trap), 24 via
`pickBadlandsPoint` in `spawnBadlandsEnemies()`, elite via `rollElite`. **Loot:**
`sandmaw_chitin` ×1 (×2 elite; a light-but-tough plating shard, no recipe yet); elite +
`sandmaw_trophy` (Common/tier1 in `TROPHY_ROLL`, like the other badlands trophies — Phase 5
retiers to tier-2 + Ember).

Files: new `Sandmaw.ts`; `Inventory.ts` + `Items.ts` (2 resources); `Relics.ts` (`TROPHY_ROLL`);
`BootScene.ts` (`drawSandmaw` normal + elite 26×18 plated burrower facing right, + chitin/trophy
icons); `MainScene.ts` (import, spawn 24, area-hit union); `dashboard/main.ts` (Enemies-tab entry
+ trophy-source row). No `RECIPES.md` change (no recipes). **Verified:** `tsc --noEmit` clean;
`preview_start` boots with no console errors; `preview_eval` — 24 Sandmaws spawn, all 4 textures
load, full state cycle submerged→surfacing(α1)→erupting→hit `{38, kb220}`→single-hit-per-erupt→
exposed→burrowing→submerged(α0.18); a player 300px out at erupt = no hit (dodge); resists
pierce×0.6/blunt×1.4/slash×1.0; takeHit-while-submerged flips to surfacing; `isAggro()` false
while submerged; sprite + elite recolor render correctly. **Next: Phase 3** (badlands boss = new
win-con + Gremlin King critical-drop rework + 2 POIs).

### 4-item playtest fix batch (Cragscale art, axe name, boss-continue, refined-relic cap)

Off the user's latest playtest notes. Sonnet-class fixes/tuning on already-shipped systems, no new
mechanic. Four items:

1. **Boar/Cragscale too similar.** Both were warm-brown quadrupeds facing right — the Cragscale
   hide `0x7a5040` was nearly the Boar body `0x6b4a2a`. Re-toned the **normal** Cragscale to a cool
   slate-grey palette (hide `0x69726c`, cooler belly/head, lighter stone plates) so the rock
   reptile reads as stony, not a second boar. Elite (crimson/gold) unchanged. Verified via texture
   pixel sample: Boar body `#6b4a2a` vs Cragscale body `#69726c`.
2. **Woodcutter's Axe name in the crafting menu.** The prior batch renamed only the item's inventory
   `name` (`Items.ts`); the `stone_axe` RECIPE in `Recipes.ts` still read "Stone Axe", and the
   crafting menu shows the recipe name. Changed `Recipes.ts` recipe `name` → "Woodcutter's Axe"
   (id/key/output all stay `stone_axe`). RECIPES.md table row updated.
3. **Continue past the win (in-progress playtesting).** Beating the current end-game boss (Gremlin
   King) fires `endRun("won")` which froze the world at the run-end screen, blocking end-to-end
   testing into biome 2. `RunEndUI` now shows a green **[ Continue ]** button beside [ New Run ]
   **only on a win** (`RunEndDeps.onContinue`, two-button layout; death shows only New Run), plus a
   caption ("Continue = explore in-progress content past this boss"). `MainScene.resumeAfterWin()`
   hides the screen, clears `runOver`, sets `inProgressMode`, and raises a **persistent top-center
   caveat banner** ("⚠ IN-PROGRESS CONTENT — past the current end-game target") so it's clear you're
   past finished content — this sets the precedent for pushing live builds before a biome is done, as
   the end-game target moves outward with future bosses. The win's score is posted at the kill.
   **Death is UNaffected** — a hardcore death always ends the run, even after Continuing (the user: no
   respawn during playtesting): `onPlayerDeath`'s `endRun("died")` no longer gates on the continue
   flag, and `endRun` calls a new `Run.setOutcome()` when `inProgressMode` so a continued-then-died
   run's end screen correctly reads **YOU DIED** (the win's `end()` had already locked the outcome to
   "won"; `setOutcome` overrides it) and hides the banner. New fields reset in `create()` per the
   `scene.restart()` field-init gotcha. Verified live: win screen carries both buttons + caption;
   Continue sets `runOver=false`/`inProgressMode=true` + shows the banner (screenshot, top-center,
   clear of HUD); a death after Continue forces outcome "died", hides the banner, and shows the YOU
   DIED screen (no completion bonus). Phase 3 of the biome-2 plan properly demotes the Gremlin King
   from win-con to a mid-boss with a critical drop.
4. **No Mythic from a Refined (Uncommon) trophy.** A `refined_trophy_uncommon` has rarity `uncommon`
   and rolls the Uncommon outcome table, which has a 1% Mythic band — so a gated refinement could
   still gamba a Mythic. Added an optional `TrophyRoll.maxRarity`; `refined_trophy_uncommon` now sets
   `maxRarity: "rare"`, and `RelicManager.roll()` clamps any rolled-up result above the cap down to
   it (the 1% Mythic band merges into Rare → ~6% Rare, rest Uncommon). Raw Common trophies and the
   deeper-biome-scaffold `refined_trophy_rare` are uncapped (Rare-refined can still hit Mythic — a
   Phase-5 concern, unreachable in biome 1). The dashboard "Trophy → outcome odds" breakdown now
   merges capped bands so its display matches the roll clamp; RECIPES.md refined-trophy row notes the
   cap. Verified live: 30k refined-Uncommon rolls → **0 Mythic** (1782 Rare ≈ 6%, rest Uncommon);
   30k rare-refined rolls → ~10% Mythic (uncapped, confirming the cap is trophy-specific).

Files: `BootScene.ts` (Cragscale tint), `Recipes.ts` (axe name), `RunEndUI.ts` + `MainScene.ts`
(continue button + resume + death gate), `Relics.ts` (`maxRarity` + clamp), `dashboard/main.ts`
(capped breakdown), `RECIPES.md`. `tsc --noEmit` clean; verified live via `preview_eval` +
screenshot; no console errors.


### Biome 2 — Phase 3: The Duneshaper (badlands final boss + win-con swap)

Plan: `.claude/plans/biome-2-phase-3-badlands-boss.md` (Phase 3, umbrella `biome-2-sunscorch-badlands.md`).
Built on **Opus** (new boss mechanic). The **badlands final boss** and the game's **new
win-condition**, demoting the Gremlin King to a mid-boss. Locked with the user via `AskUserQuestion` +
a follow-up: scope = boss + win-swap now (King's critical-drop rework deferred to Phase 4); identity
= a gloam-warped apex sorcerer; difficulty = phase-gated attack escalation; summon = its own altars
but the totem is gathered from a POI (the Warrens); **plus** multiple altars + a clue system.

**`src/entities/Duneshaper.ts`** — bespoke telegraph/poise AI (GremlinKing/Gloamwarden precedent,
NOT a shared framework); extends `Enemy`, fully overrides `update()`; `idle → telegraphing →
executing → recovering → staggered`. HP **900** (final boss, above the King's 600), poise 120
(stagger → ×1.5 for 3s), scale 2.3, aggro 300, leash 580, regens 14 HP/s deaggro'd. A **caster**:
holds ~220px and casts. `resistances: { magic: 0.5, slash/blunt/pierce: 1.3 }` (soft caster hide).
**Damage-type mix** so gear reads: Sand Spikes are PHYSICAL pierce (flat armor applies); Volley/Nova/
Lance/Barrage are `magic` (bypass flat armor, Phase-1 hook).
- **Phase-gated escalation** (`availableAttacks()` grows as HP drops; `pickAttack` never repeats):
  - **100%→:** Gloam Volley (3 magic `gloam_bolt` projectiles, ±18°), Sand Spikes (3 physical circles
    across the player's spot), Blink Nova (teleport to the player + radial magic burst 132px).
  - **≤70% HP:** + Gloamfire Lance (locked-direction magic beam, 340px/±10° — sidestep the wind-up).
  - **≤50% HP:** + Sunscorch Barrage (7-circle magic carpet — find a gap) **and** enrage timing
    (shorter telegraph/recovery + faster move, captured per state-entry).
- Area attacks resolve via `checkPlayerHit()` (`{damage, knockback?, dmgType?}`) → `applyDamageToPlayer`
  (dash i-frames/armor just work); the volley self-resolves as projectiles (the enemy-projectile→
  player overlap forwards `dmgType: "magic"`). One hit per attack instance. Loot: **2
  `refined_trophy_uncommon` + 5-8 `gloam_shard`** (Phase 5 re-tiers the badlands trophy set).

**Summon (the user: own altar, totem gathered from a POI):**
- **`warren_fetish`** ("Gloam-Bone Fetish", new `ResourceType`) added to `DUSKRUNNER_WARREN_LOOT_TABLE`
  (guaranteed 1/cache). **`tyrant_totem`** ("Effigy of the Duneshaper", new crafted item) — tier-1
  recipe `{ warren_fetish: 3, gloam_shard: 2, bones: 8 }`, a consumable like `gremlin_totem`.
- **`BossAltar.kind`** (`"gremlin" | "tyrant"`). The forest War-Camp altar stays `"gremlin"`;
  `spawnTyrantAltars` adds **3** `"tyrant"` altars (own `tyrant_altar` texture) via
  `pickTyrantAltarPositions` (`pickBadlandsPoint`, ≥2600px apart), pushed into `bossAltars` so hover/
  night-light/discovery reuse. Positions picked in `create()` before spawning; a `TYRANT_ALTAR_CLEAR_
  RADIUS` (170) exclusion keeps content off the clearings. `attemptSummonBoss` branches on kind →
  `attemptSummonDuneshaper` (consumes the effigy, guards a global `tyrantSummoned` flag, spawns the
  boss after the ritual delay). `promptForAltar` tyrant → "[LMB] Offer the Effigy".

**Clue system (the user — the world is huge, a single altar could be across the map):** (1) all
tyrant altars glow at night (`collectLights` already lights `bossAltars`); (2) `updateAltarDiscovery`
gives them a distinct violet `map_tyrant_altar` landmark + "Duneshaper's Altar" label when explored
near; (3) **the load-bearing fix** — crafting the effigy (`onTyrantTotemCrafted`, hooked in
`craftRecipe`) reveals **ALL** tyrant altars on the map at once + an event-log directional nudge
("The effigy tugs toward the north-west…") toward the nearest (a `compassDir` helper).

**Win-con swap:** a `Duneshaper` kill fires `endRun("won")`; the `GremlinKing` win trigger was
removed (still `classifyKill` "boss" = 500 pts, still drops `gremlin_king_fang` — Phase-4 rework).
Wired into `classifyKill`, the `checkPlayerHit` boss union, `staggerMultiplierFor`, the boss
prompt-color union, and the respawn `isBoss` exclusion. **BossHealthUI generalized** from a
`GremlinKing`-typed param to a `BossBarTarget` interface (`displayName/health/maxHealth/poise/
poiseMax/depleted/isEngaged()`); the scene passes `engagedBigBoss()` (Gremlin King or Duneshaper,
whichever is engaged). GremlinKing got a `poiseMax` getter. Mini-bosses stay off the big HUD.

**`BootScene`** — `duneshaper` (44×54 hooded gloam-tyrant w/ staff + gloam-crystal), `tyrant_altar`
(64×56 sandstone ring + violet gloamfire), `gloam_bolt` (violet magic bolt), `icon_warren_fetish`,
`icon_tyrant_totem`, `map_tyrant_altar` (violet marker).

Files: new `Duneshaper.ts` + plan; `BossAltar.ts` (kind), `Inventory.ts` (+warren_fetish), `Items.ts`
(+2 defs), `Recipes.ts` (+tyrant_totem), `BootScene.ts` (6 textures), `BossHealthUI.ts` (interface),
`GremlinKing.ts` (`poiseMax`), `MainScene.ts` (fields/reset, positions, spawn, exclusion, altar
branching, summon, win/HUD/hooks, craft-clue, warren loot), `dashboard/main.ts` (Enemies mirror),
`RECIPES.md`. **Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors;
`preview_eval` — 3 spread tyrant altars (r 2563–3978) + all 6 textures load; summon consumes the
effigy + prompt gating (in-reach / summoned=null); boss HP 900 / poise 120 / scale 2.3 / resists /
loot; phase pool 3→4→5 by HP; full state-machine cycle; **all 5 attacks' `checkPlayerHit`** — spikes
50 physical (armor applies) / nova 42 magic kb220 / lance 46 magic / barrage 30 magic, one hit per
instance, miss when far; volley = 3 magic gloam bolts; **Duneshaper kill → `endRun("won")` (the
VICTORY screen rendered), Gremlin King kill → NO win**; effigy craft reveals all 3 altars + fires the
directional nudge; `engagedBigBoss()` returns "The Duneshaper"; boss renders (visible/alpha 1/
onScreen, night 0). Dashboard Enemies tab updated (the one manual mirror). **Next: the Gremlin King
critical-drop rework** (Phase 4 gear gate).

### Biome 2 — Phase 3 POI 2: the Sunken Forge (Cinderwrought fire/forge mini-boss)

Plan: `.claude/plans/biome-2-phase-3-pois.md` (Phase 3, umbrella `biome-2-sunscorch-badlands.md`).
Built on **Opus** (new mini-boss mechanic). The second of Phase 3's two POIs. Locked with the user
via `AskUserQuestion`: **loot = Uncommon relic trophy + Gloam Shards** (mirror the Gloamwarden);
**attacks = Cinder Cone + Forge Hammer**; **names = The Sunken Forge / Cinderwrought**.

**`src/entities/Cinderwrought.ts`** — a bespoke fire/forge mini-boss modeled on `Gloamwarden.ts`'s
telegraph/poise/stagger skeleton (a **trimmed sibling, NOT a shared framework** — per the "no boss
framework" lock). Extends `Enemy` for the HP-bar/loot/death machinery, fully overrides `update()`
(Snake/Boar/Gloamwarden precedent): `idle → telegraphing → executing → recovering → staggered`. A
poise meter (70; `takeHit` chips 1:1 → stagger ×1.5 for 2.5s) drawn as a second amber bar below the
HP bar. HP **300** (badlands-tough, above the forest Gloamwarden's 260), scale **1.8**, move 52,
aggro 260, leash 520, regens 12 HP/s deaggro'd. `resistances: { blunt: 0.8, pierce: 1.25 }` — a
molten-slag crust (the Phase-1 damage-type nudge, the inverse of a Sandmaw). Two **new-feeling**
attacks, deliberately distinct from Gloamwarden (leap-smash/eruption) and GremlinKing (charge/slam):
- **Cinder Cone** — the game's **only cone**: exhales a fire fan (±32°, 210px) in a direction
  **locked at telegraph START** (820ms wind-up), so a sidestep clears it. 30 dmg / 140 kb.
- **Forge Hammer** — a heavy **wide-but-short front-arc** smash (±70°, 155px), direction re-locked
  at execute (tracks the player through the 720ms telegraph); the dodge is to back out of the wedge
  (or dash). 44 dmg / 240 kb.
Both attacks resolve via `checkPlayerHit()` (wedge geometry: dist + angular diff vs the locked
`attackAngle`) — queried by the scene like the other area-damage bosses — funnelling through the
same `applyDamageToPlayer` choke point, so dash i-frames/armor "just work" with no special-casing.
Fire-colored `Graphics` telegraph + execute visuals (fan/wedge fills). Guaranteed loot: **1
`refined_trophy_uncommon` + 3-5 `gloam_shard`** (mirrors the Gloamwarden's payoff).

**`MainScene`** — `forgePosition` picked once in `create()` (after the vein) via `pickForgePosition`
over `pickBadlandsPoint`, kept ≥1000px from the war camp / ≥900px from the Gloaming Vein so it reads
as its own destination; picked **before** spawning so a new `FORGE_CLEAR_RADIUS` (220) exclusion in
`pickBadlandsPoint` keeps ordinary badlands content out of the clearing (the standing exclusion-zone
lesson). `spawnSunkenForge()` drops the `sunken_forge` structure + the Cinderwrought + 9 scattered
`slag_chunk` props; `forgeLightPoints` glow ember at night (`collectLights`, radius 130). Discovery
(`updateAltarDiscovery`) adds a `map_forge` minimap/world landmark ("The Sunken Forge", fiery
`0xd6481a`) + fires the `"poi"` discovery toast. Wired into the `checkPlayerHit` boss `instanceof`
union, `staggerMultiplierFor` (`CINDERWROUGHT_STAGGER_DAMAGE_MULTIPLIER`), `classifyKill` (**elite** —
no dedicated mini-boss band, like the Gloamwarden), the boss prompt-color union, and the respawn
`isBoss` exclusion. **No smelting wiring** (Phase 4 doesn't exist — the smithy theme ships as loot +
the fight only, per the Phase-4 hook) and **no post-kill interactable** (loot is the guaranteed
drop, unlike the vein's mineable nodes).

**`BootScene`** — `cinderwrought` (34×42 charred-iron brute: molten cracks + forge-hammer fists +
ember eyes, warm fire palette contrasting the Gloamwarden's violet), `sunken_forge` (48×38 ruined
smithy w/ molten crucible + broken anvil), `slag_chunk` (16×14 cooled-lava rubble), `map_forge`
marker (fiery orange-red).

Files: new `Cinderwrought.ts`; `MainScene.ts` (import, constants, fields/reset, `pickForgePosition`/
`spawnSunkenForge`, exclusion, lights, discovery, 4 combat unions); `BootScene.ts` (4 textures);
`dashboard/main.ts` (Enemies-tab entry — the one manual mirror). No `RECIPES.md` change (no recipes).
**Verified:** `tsc --noEmit` clean; `preview_start` boots with no console errors; `preview_eval` +
screenshot — forge at r≈4174 (accessible badlands), 3377px from camp / 3167px from vein; all 4
textures load; boss HP 300/poise 70/scale 1.8; aggro + poise-bar-on-aggro; full `idle→telegraph→
execute→recover→idle` cycle for BOTH attacks (manual-clock driven, since the backgrounded preview
throttles rAF); cone hits the fan / misses at 90° sidestep / misses beyond 210px; hammer hits front
/ misses behind / misses beyond 155px; resists blunt 0.8 / pierce 1.25 / slash 1.0; poise→0 staggers
(×1.5); the fight kills a full-HP player (damage path end-to-end); discovery adds the `map_forge`
landmark + fires the `"poi"` toast; the Cinderwrought + forge structure + slag render in the
badlands. **Next: the badlands final boss (new win-con) + the Gremlin King critical-drop rework.**

### Badlands playtest batch (19 items, 2026-07-13, Opus)

Broad polish/tuning pass off a badlands playtest. No new milestone letter. All verified live via
`preview_eval` + a demo screenshot; `tsc --noEmit` clean.

1. **HUD toast overlap** (`EventLogUI.ts`) — "Defeated X" (combat) and "Slash leveled up" (levelup)
   center toasts overlapped "sometimes." Root cause: the Y was summed over live-toast heights, but the
   earliest toast always fades first, so a freed FRONT slot got reused under a still-visible toast. Fixed
   with a monotonic `centerStackNextY` cursor that only resets to the top when the stack is fully empty.
2. **Fire damage type** (`Weapons.ts` + `MainScene`) — new `IncomingDamageType = DamageType | "fire"`
   (kept OUT of `DamageType`/`SkillType` so it isn't a bogus weapon skill) + `bypassesArmor()` (magic|fire).
   `applyDamageToPlayer` bypasses flat armor for fire like magic. New `spawnPlayerDamageNumber()` floats a
   colored number over the player on every hit (fire orange / magic violet / physical red) so incoming type
   is clear (the user: "fire damage should be clear").
3. **Cinderwrought rework** (`Cinderwrought.ts`) — attacks now return `dmgType: "fire"`, damage up (cone
   30→46, hammer 44→58). On death, `onCinderwroughtKilled` cracks its shielded Ember Deposit nodes into
   mineable **Cinderforged Ore** (`ember_ore`, new resource + `Ember Deposit` node) — the "something mineable
   after we kill him" for smelting/metalworking (Phase-4 hook).
4. **More Sunken Forges** — refactored the single `forgePosition`/`cinderwrought` into `forgePositions[]` +
   `forges[]`; **`FORGE_COUNT` = 5** (the user: "way more of the ember POIs"), spread `FORGE_MIN_SPACING` apart,
   each with its own boss + ore ring + dressing.
5. **Badlands damage bump** — Duskrunner 34→42, Cragscale 40→48, Hexling bolt 22→26 / flame 34→40,
   Sandmaw 38→46.
6. **Duskrunner tuning** — deaggro leash 280→**620** (very sticky, the user), attack cooldowns faster
   (pounce 850→560, bite 220→140); den guards take a `wanderAnchor` and stay leashed to the den (no idle
   wander off the POI).
7. **Cragscale** roll hit radius 40→**58** (bigger spin lane).
8. **Sandmaw** — new `Enemy.isTargetable()` (default `!depleted`); Sandmaw overrides it to `false` while
   submerged, and the hover-target loop + AOE-arc sweep both honor it → can't be clicked/swept while invisible.
9. **Density** — Sandmaws 24→46, dens 10→16, packs 16→24, cragscales 34→46, hexlings 34→44.
10. **Badlands flora** — bumped counts + 2 new harvestables (**Gloamcap**, **Dustbloom**) with node/picked/
    icon textures + `Items`/`Inventory` defs.
11. **POI rings/floors/decor** — new `decoratePoi(rng, cx, cy, {floor, ring})` helper + `poi_floor_*` soft
    radial decals (depth -7) + `poi_ring_*` marker props; wired into forges, dens, Duneshaper altars, and the
    Gloaming Vein.
12. **Duneshaper altar arena** — `TYRANT_ALTAR_CLEAR_RADIUS` 170→360 + a wide gloam floor + a ring of standing
    stones + scattered gloam crystals (night-glowing via `tyrantAltarLightPoints`) + **4 elite Hexling guards**
    each.
13. **One altar per quadrant** — `pickTyrantAltarPositions` now places one Duneshaper altar in each of the 4
    map quadrants (the user: "start thinking in # per quadrant") instead of 3 scattered.
14. **POI discovery radius** — new `POI_DISCOVERY_RADIUS` (~760px, was fog's 260) so shacks/vein/dens/forges
    land on the minimap + world map from much further out.
15. **Reveal-map shows POIs** — `updateAltarDiscovery(forceAll)`; the dev reveal-whole-map command
    (`Ctrl+Shift+M`) now force-adds every POI landmark, not just terrain.
16. **Rename** — "Gloam-Bone Fetish" → "Gloam-Bone Totem" (display name; key `warren_fetish` unchanged).
17. **Decorative immersion props** — `makeDecorProps` (8 textures) + `scatterDecor` drops ~480 non-interactive
    props across both biomes (forest: fern/flowers/mushrooms/log; badlands: skull/dead bush/mesa boulder/bones),
    routed through the spawn samplers so they respect every POI exclusion zone.

**Verified** (`preview_eval`, single clean server after clearing a stale one): 5 forges / 16 dens / 46 Sandmaws
/ 5 Cinderwroughts / 4 tyrant altars (quadrants EN/ES/WN/WS) / 21 elite Hexlings / 20 ember-ore nodes / 44
Gloamcap + 52 Dustbloom; all 15 sampled textures exist; Cinderwrought cone→`{46,fire}` / hammer→`{58,fire}`;
fire bypasses armor (40 full vs slash 36 through 4 armor); Sandmaw `isTargetable()` false while submerged; den
guard has anchor; `updateAltarDiscovery(true)` drops 32 landmarks (1 altar + 16 den + 5 forge + 5 shack + 4
tyrant + 1 vein). Files: `EventLogUI.ts`, `Weapons.ts`, `Enemy.ts`, `Duskrunner.ts`, `Cragscale.ts`,
`Hexling.ts`, `Sandmaw.ts`, `Cinderwrought.ts`, `MainScene.ts`, `BootScene.ts`, `Items.ts`, `Inventory.ts`,
`dashboard/main.ts`, `RECIPES.md`.
### Biome 2 — Phase 4a: Smelting economy + Gremlin King gate + base forged gear (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-phase-4-forging.md` (Phase 4 of the biome-2 umbrella, **sliced into two
sessions** — this is **Session 1**). Built on **Opus** (new mechanic: smelting station + a new gear
tier + new gating). The deferred **Gremlin King critical-drop rework** (locked decision 10) finally
lands here, gating the forged tier. All verified live via `preview_eval` (module-level + end-to-end
scene flow); `tsc --noEmit` clean; no console errors.

**The forged progression (Session 1):** Mine **Clay** → build the **Smelter**; smelt **ore + Hex
Essence = ingot** (A+B); common **Sunscorch Ore → Sunsteel Ingot**; upgrade **Workbench to Lvl 3**
(Forge Anvil, costs Sunsteel Ingots) → unlocks the base forged recipes; kill the **Gremlin King →
Heart** → upgrade the **Smelter** (Ember Crucible) → smelt rare **Cinderforged Ore → Embersteel
Ingot** (the T2 metal Session 2's enhanced recipes will consume).

- **Smelter** (`Items`/`Recipes`, tier-1 placeable, `{clay:10, stone:15}`) — a new station that
  **reuses the Drying Rack's menu + `ProcessingStation`** (both are processing stations). `Processing.ts`:
  new `SMELT_RECIPES` + `ProcessRecipe.fuel`/`minStationTier`; `ProcessingStation` parameterized with a
  `recipes` list + `setTier()`. `DryingRackMenu` gained optional `title/descKey/actionLabel/busyLabel`
  (functions) + a **fuel readout/gate** dep, so ONE menu instance serves both (switched by
  `openStationKind`). MainScene: `smelters[]` array, `openSmelterMenu`, `processSmelterAmount` (deducts
  Hex Essence fuel from the backpack), hover via the shared `placedObjects` loop (`hoveredSmelter`,
  `promptForSmelter` → "[LMB] Use Smelter"), placement/destroy (refunds loaded ore).
- **Gremlin King rework:** now drops **`gremlin_king_heart`** (was `gremlin_king_fang`, retired to a
  plain trophy). The Heart is the **`ember_crucible`** Smelter upgrade's ingredient (`StationUpgrades.ts`,
  Smelter tier 0→1) → unlocks rare-ore smelting. Skipping the King costs the whole rare/T2 tier.
- **Workbench Lvl 3:** new `forge_anvil` StationUpgrade (workbench tier 1→2). New
  **`Recipe.requiresWorkbenchTier`** field (enforced in `craftRecipe`/placement + a live "Requires
  Workbench Lvl 3" line in `CraftingMenu` via a new `isNearWorkbenchAtTier` dep). All 9 forged recipes
  gate on tier 2.
- **Base forged gear** (all `requiresWorkbenchTier: 2`): **Sunsteel heavy set** (Helm/Cuirass/Greaves,
  4/6/4 = 14 armor, `armorType: heavy_armor`) + **Duskhide light set** (Hood/Vest/Leggings, 3/4/3 = 10,
  `light_armor`) + three weapons covering each melee type (**Sunsteel Warhammer** blunt wide-AOE /
  **Longsword** slash / **Pike** pierce). Ingredients all drop from **normal** badlands enemies
  (Cragscale Plate / Duskrunner Pelt / Sandmaw Chitin) + Sunsteel Ingots — verified not over-gated.
- **`heavy_armor` skill wired + given an identity:** XP accrues per worn piece (free, existing kill
  path); its effect is **partial magic/fire mitigation** (`Skills.heavyArmorMagicMitigation`, −0.4%/lvl
  cap −30%) applied in `applyDamageToPlayer`'s bypass branch while wearing ≥1 heavy piece (the
  counterpart to light armor's dash i-frames). Verified: 50 magic → 40 in heavy@Lvl50 vs 50 in light.
- **Mineable minerals** (`spawnBadlandsMinerals`): Clay (~40), Sunscorch Ore (~44), rare Cinderforged
  veins (~8, plus the ~20 Sunken Forge POI deposits) scattered via `pickBadlandsPoint` (POI exclusions
  honored), all confirmed in the badlands. **Bench visuals per tier:** `applyTierVisual` now swaps
  Workbench/Smelter textures (`icon_workbench_t1/t2`, `icon_smelter_t1`) instead of only tinting.
- **BootScene:** 19 new textures (2 ore/clay nodes, ingots, Heart, Smelter + tier, Workbench Lvl 2/3,
  3 weapons, 6 armor). Weapons reuse their icon as the equipped-on-sprite visual.
- **Verified live:** smelt ratio 2:1 + fuel-per-recipe + rare-ore tier-gate; end-to-end fuel deduction
  + fuel-short no-op; King → Heart drop; Ember Crucible/Forge Anvil upgrades; heavy mitigation; bench
  texture-swap on a real placed object; Smelter menu opens with the right title/verb. Files:
  `Processing.ts`, `DryingRackMenu.ts`, `CraftingMenu.ts`, `Recipes.ts`, `Items.ts`, `Inventory.ts`,
  `Weapons.ts`, `Skills.ts`, `StationUpgrades.ts`, `GremlinKing.ts`, `MainScene.ts`, `BootScene.ts`,
  `RECIPES.md`, `dashboard/main.ts`.
- **Deferred to Session 2:** Workbench Lvl 4 (Emberforge Anvil); the T2 **enhanced** reforge recipes
  (base piece + Embersteel → new item, both sets + weapons); the first **magic weapon** (melee-range
  fire brand, rare-ore-exclusive). Also deferred: forged tool tier, a forged ranged weapon.



### Biome 2 — Phase 4b: enhanced (T2) gear tier + first magic weapon (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-phase-4-forging.md` (**Session 2**, completing Phase 4). Built on **Opus**
(new gear tier + first magic weapon). **No new MainScene logic** — everything routes through generic
machinery Session 1 (5ak) and earlier phases already built. `tsc --noEmit` clean; verified live via
`preview_eval`; no console errors.

- **Workbench Lvl 4 (Emberforge Anvil):** new `StationUpgrades.ts` row (`emberforge_anvil`, workbench
  tier 2→3, `{embersteel_ingot:5, stone:15}`, "Unlocks enhanced gear"). Only **discoverable** once an
  Embersteel Ingot has been smelted (`canDiscoverUpgrade` gates on cost keys being discovered — no new
  wiring). The upgrade chain reads `tool_sharpener@t1 → forge_anvil@t2 → emberforge_anvil@t3` (verified).
  `applyTierVisual` swaps the placed bench to a new `icon_workbench_t3` (ember-fed-anvil sprite) via the
  existing `tieredStationTexture` — confirmed live on a real placed bench.
- **`Recipe.costs` widened** `Partial<Record<ResourceType, number>>` → `Partial<Record<string, number>>`
  so a **crafted base piece** (e.g. `sunsteel_helm`) works as an ingredient — the enhanced tier's core
  mechanic. All cost lookups already go through the backpack's string-keyed count/removeCount + the
  discovered set, so nothing else changed; the base piece just has to be **unequipped/in the backpack**
  to reforge.
- **9 enhanced recipes** (all `requiresWorkbenchTier: 3`, each **consumes its base forged piece**):
  **Embersteel heavy set** (Helm 7 / Cuirass 9 / Greaves 7 = 23 armor) + **Emberhide light set** (Hood 5 /
  Vest 6 / Leggings 5 = 16) + three enhanced weapons (**Embersteel Warhammer** 20 blunt / **Longsword** 15
  slash / **Pike** 17 pierce). Armor keeps the base sets' `heavy_armor`/`light_armor` categorization gate
  (level 0) + `armorType`, so heavy XP + magic/fire mitigation carry over free. No right-click ArmorUpgrades
  (the reforge IS the progression).
- **First MAGIC weapon — the Ember Brand** (`{embersteel_ingot:3, hex_essence:4}`, rare-ore-exclusive,
  `requiresWorkbenchTier: 3`, `magic` type, 14 dmg / 520ms / 15 stam / 45° arc). Its DPS ≈ the Embersteel
  Pike on a **neutral** target; `magic` is **resisted** (~×0.4–0.5) by the gloam-casters (Hexlings 0.4, the
  Duneshaper 0.5) and neutral (×1.0) vs Duskrunner/Cragscale/Sandmaw — a sidegrade, not flatly best, and
  the **only `magic` weapon-skill XP source**. Routes through the existing `resolveWeaponHit` resist +
  `awardSkillXp(dmgType)` path with zero new code. **Note:** no badlands enemy is *weak* to magic, so it
  never lands super-effective — a hook for a future magic-vulnerable foe (flagged in `RECIPES.md`).
- **`Weapons.ts`:** 4 new `WeaponType` keys (`embersteel_warhammer`/`_sword`/`_pike`, `ember_brand`) —
  TS forced entries in every `Record<WeaponType,…>` table (damage/cooldown/stamina/types/base-crit/arc).
- **BootScene:** 11 new textures (3 enhanced-weapon icons, 6 enhanced-armor icons, Ember Brand icon,
  `icon_workbench_t3`) — all confirmed present, drawn without error. Enhanced gear recasts the base
  silhouettes in dark ember-veined steel; the Ember Brand is a fire-brand rod with a gloamfire wisp.
- **Verified live** (`preview_eval`): all 10 new recipes present w/ correct costs & tier 3; all 10 items
  defined; Emberforge upgrade @t3 in the chain; `isNearWorkbenchAtTier(3)=true / (4)=false`; a **Lvl-2
  bench blocks** an enhanced craft while a **Lvl-3 bench allows** it (base `sunsteel_helm` + ingots
  consumed → `embersteel_helm` produced); bench t3 texture swap; weapon stats/arc; badlands magic resists.
- **Dashboard/RECIPES.md:** dashboard weapon arrays (previously stuck at the biome-1 four) extended to a
  shared `MELEE_WEAPONS` covering base forged + enhanced + magic; `RECIPES.md` crafting/upgrade/armor/weapon
  tables updated. Files: `Weapons.ts`, `Items.ts`, `Recipes.ts`, `StationUpgrades.ts`, `BootScene.ts`,
  `dashboard/main.ts`, `RECIPES.md`. **Phase 4 complete.**
- **Deferred beyond Phase 4** (unchanged): forged **tool** tier, a forged **ranged** weapon. The
  Gloam→Ember-Shard conversion + tier-2 relics both shipped in **Phase 5** — see that entry above.

### Dev console commands for playtesting (2026-07-13, Sonnet)

Off-roadmap dev tooling, not a game milestone — the user flagged that testing a change deep in a build
(e.g. a badlands weapon) meant playing through a full run to reach it. `window.__dev`, installed once
from `MainScene.create()` via `installDevConsole()`, gated on `import.meta.env.DEV` (new
`src/vite-env.d.ts` referencing `vite/client` types — never reachable in a production build, unlike the
pre-existing unconditional `Ctrl+Shift+M` reveal-map cheat). Eight commands + a one-line parser (shipped
in two passes this session — the second off the user's own testing of the first):
- **`god(on?)`** — **still takes damage/knockback and shows the true computed damage number** (the user
  wanted to keep testing damage numbers), but floors the applied amount at `current HP - 1` so it never
  drops below 1 or dies. First ship blocked damage entirely via an early-return; reworked same-session
  once the user said he still wanted to see numbers/feedback.
- **`heal()`** (new) — `Health.reset()` (refill to current max, bypassing the Vitality heal-mult food/
  Comfort uses) + HUD refresh. The natural pair to `god()`.
- **`nobuildcost(on?)`** — when ON, calls `Crafting.unlockAll()` (marks every recipe discovered) and
  makes `isNearWorkbench`/`isNearWorkbenchAtTier` unconditionally return true. **Bug found + fixed
  same-session:** the first ship only patched the actual craft/place/upgrade *execution* paths
  (`craftRecipe`, the placement confirm handler, `applyStationUpgrade`/`applyArmorUpgrade`/
  `applyWeaponUpgrade`, `cookAtCampfire`) — but `CraftingMenu.isCraftable()`, `CookingMenu`'s inline
  `canAffordCook` check, and `MainScene.maxCraftBatches`/`maxCookBatches` each independently recomputed
  affordability straight from `Crafting.canAfford`/backpack counts for **display** (grey-out + the
  batch-quantity slider), completely bypassing the flag. the user hit this immediately: nobuildcost ON,
  craft button still greyed out. Fixed by adding a `noBuildCost: () => boolean` dep to both
  `CraftingMenuDeps` and `CookingMenuDeps` (short-circuits `isCraftable`/`canCook` to true) and making
  `maxCraftBatches`/`maxCookBatches` skip their cost-cap loop (room cap stays) when the flag is set.
  Also extended to the Upgrade menu chain (`canAffordUpgrade` + the three `apply*Upgrade` deduction
  loops) — same bug shape, would've hit the same wall next. Drying Rack/Smelter untouched — that menu
  loads raw input first then slides a fraction, a different paradigm the bug doesn't apply to.
  Deliberately does NOT skip the placement-mode "consume one owned stack" step — placing an item you
  already have isn't a build cost.
- **`setstat(name|"all", value)`** — routes by name: a `SkillType` (e.g. `"blunt"`) calls
  `Skills.setLevel()` (clamped [0,100], resets XP, skips level-up listeners); a `StatType` (e.g.
  `"vitality"`) calls `PlayerProgression.setStat()` (bypasses `unspentPoints`) then `syncStatBonuses()`.
  **`"all"`** (added same-session) loops every `SkillType` and every `StatType` to the same value in one
  call. Unknown name → `console.warn`, no throw.
- **`spawn(name, elite?)`** — `src/systems/DevSpawnTable.ts` (`DEV_ENEMY_SPAWN_TABLE`, standalone
  name→factory map covering the full roster incl. all 4 bosses/mini-bosses) scatters the enemy ~100px
  around the player at a random angle and pushes it through normal `enemies`/`enemyGroup` registration.
- **`killall(radius = 2000)`** — mirrors `resolveWeaponHit`'s death-cleanup path but **scoped to
  non-boss enemies only** and skips loot/score recording — clearing trash to test in peace, not sniping
  a boss encounter.
- **`exploremap()`** — thin wrapper over `revealEntireMap()`.
- **`list()`** (new) — returns `{ skills, stats, enemies }` (the valid names for `setstat`/`spawn`) and
  logs each as a console line, so the names don't have to be memorized or looked up in source.
- **`run("spawn duneshaper")`** — single-string convenience parser dispatching to all of the above.

Verified live via `preview_eval` against the real running scene (not just type-checked), across both
passes: god mode takes a real 30-dmg hit normally (100→70), floors a 9999-dmg hit at 1 HP without dying,
stays at 1 HP on a further hit, and `heal()` restores to full; `setstat` confirmed on a skill, a stat
(with `health.max` recompute), and `"all"` (all 11 skills + 6 stats set in one call, via both direct call
and `run(...)`); `nobuildcost` unlocked all 41 recipes, crafted with backpack counts unchanged, and —
**after the fix** — `maxCraftBatches`/`maxCookBatches`/`canAffordUpgrade` all confirmed to ignore a
monkey-patched always-false `canAfford`, and a live-rendered `CraftingMenu` panel showed zero recipe rows
in the disabled grey color even with `canAfford` forced to fail; `spawn`/`killall`/`exploremap`/`list()`
all confirmed as in the first pass. `tsc --noEmit` clean; zero console errors throughout. No `RECIPES.md`
change (no recipe/cost changes — these are bypasses, not new content).

### Campfire tiers + cross-biome cooking + no-ladder station upgrades (2026-07-13, Opus)

Plan: `.claude/plans/zany-whistling-flurry.md`. Off the master-plan build order — the user
wanted higher campfire tiers to cook the badlands food drops (which shipped with no recipes),
cross-biome dishes, and a cooking-menu rework. Designing it surfaced that the whole station-upgrade
model needed fixing first, so that became the foundation.

- **Station/processor upgrades are now NO-LADDER, apply = +1, level = count (the user, locked).**
  Previously each `StationUpgradeDef.resultTier` was a hardcoded destination and the shared Upgrade
  panel locked every upgrade except `resultTier === currentTier + 1` ("Requires previous tier"). Now:
  any *discovered* upgrade for a station shows immediately (any order), and applying it bumps the
  station's level by exactly **+1** — **level = count of upgrades applied**, tracked as a per-instance
  applied-id set. So a Lvl 1 Workbench carried into the badlands takes the badlands upgrade straight
  to Lvl 2 (not Lvl 3). Recipes/dishes gate on the level *count*; material-specificity comes from a
  recipe's own ingredient discovery, so "any 2 workbench upgrades → forged-gear level" is intended.
  `resultTier` is demoted to a sort hint. **Scope = stations/processors only** — worn weapon/armor
  upgrades keep their `resultTier` ladder (the shared `UpgradeMenu` branches on a new
  `appliedUpgradeIds()` dep: non-null for a placed station → no-ladder/set path, null for weapon/armor
  → old ladder). The applied-id set is a new `ItemStack.upgrades?: string[]` + `ResourceNode.upgrades`,
  threaded through `spawnLooseDrop`/`collectNode`/placement so it **survives Destroy → pickup →
  re-Place** alongside `tier` (without it, a re-placed station could re-apply the cheapest upgrade to
  max its level for free). `applyStationUpgrade` appends the id, sets `tier = set.size`;
  `sortAndStack` preserves the set (unique per instance).
- **Campfire Lvl 3/4** (`StationUpgrades.ts`): two more (non-ladder) campfire upgrades — **Sunsteel
  Grill** (`{sunsteel_ingot:3, clay:8, stone:10}`) and **Emberforge Hearth** (`{embersteel_ingot:3,
  stone:20}`), reusing the ingot economy with distinct costs. `applyTierVisual` now tints non-textured
  stations (campfire) warmer per level (Lvl2 amber → Lvl3 → Lvl4 ember) via `CAMPFIRE_TIER_TINT`.
- **5 new dishes** (`Cooking.ts`/`Items.ts`/`BootScene.ts`), HP-regen only, gentle ramp matching the
  existing "not a 2x jump" philosophy (Lvl3 ≈ +3 HP/s, Lvl4 ≈ +3.5). Design rule (the user): each level
  has a **biome-native best** dish craftable entirely from current-biome ingredients (no backtracking
  to farm) — Seared Duskrunner Steak (Lvl3), Sunscorch Feast (Lvl4), plus a meatless Emberbloom Broth —
  and **optional mixed** dishes that only spend a plentiful leftover (boar_meat) — Sunfruit-Glazed Ribs,
  Ember-Glazed Skewer. `requiredCampfireTier` (already existed) = the level count.
- **Cooking-menu rework** (`CookingMenu.ts`): the flat list is now **collapsible per-level sections,
  descending (best on top)**, sorted within a tier by total heal, in a **scrollable** viewport (fixed
  intro + fixed footer, scrollable middle). Scrolling uses **windowed rendering** — only rows/headers
  intersecting the viewport are created (off-window rows never exist, so no phantom clicks) — plus a
  geometry mask that clips the partial edge rows (mask clips rendering only, not input; both mask and
  masked objects are `scrollFactor(0)` at fixed screen coords). Its own wheel handler scrolls only when
  the pointer is over the panel; MainScene's global wheel handler gained a guard so the hotbar doesn't
  cycle while scrolling the menu. **Cookable indicators** (the user's ask): each section header shows an
  amber `● N ready` badge (recipes you can make now, even when collapsed), and a **"Show only cookable"**
  filter checkbox. `CraftingMenu` category tabs gained a matching amber dot when a category has a
  currently-craftable recipe. All amber (`#ffe08a`), never green (reserve red/green for buff deltas).
- **Verified live** (`preview_eval`, tsc clean, no console errors): no-ladder apply=+1 + count level +
  order-independence + duplicate-guard + correct offered set; weapon/armor keep the ladder
  (`appliedUpgradeIds` null); applied-set survives destroy→pickup; campfire tint distinct per level; new
  dishes visible/grouped tier-descending/heal-sorted; cook consumes correctly + eating applies a buff;
  menu scrollable (wheel-over-panel-only, collapse re-clamps scroll, mask present, filter drops
  non-cookable), panel stays fixed with camera far from origin; crafting tab-dots render. Dashboard
  station-upgrade rows dropped the misleading "Lvl N" tag (now "+1 level" + a no-ladder note); campfire
  cooking tier tag fixed for Lvl 3/4. `RECIPES.md` cooking + station-upgrade tables updated.
  (Screenshot capture was unavailable — the preview tab stayed backgrounded — so the pixel-level mask
  clip is visually unconfirmed, but per the plan the windowed render makes input correct regardless and
  the mask/objects share fixed `scrollFactor(0)` screen coords.)

> Older entries (Dev console commands, Phase 4b enhanced gear tier, Phase 4a Smelting economy, Badlands playtest batch, Biome 2
> Phase 3 The Duneshaper, Phase 3 POI 2 Sunken Forge, Phase 3 Duskrunner Warren POI, Phase 2b Sandmaw,
> 4-item playtest fix batch, Placeholder art pass, Biome 2 playtest fix batch #2, 16-item playtest fix
> batch, Biome 2 Phase 2/1/0, Welcome overlay, and earlier) are in STATUS-archive.md.

### Biome 2 — Phase 5: Relics rework (2026-07-13, Opus)

Plan: `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 5, the umbrella's final milestone —
**this completes it**). Built on **Opus**. Three locked deliverables (`AskUserQuestion`), plus a
fourth request added mid-session (a dedicated Relics UI panel). `tsc --noEmit` clean throughout;
verified live via `preview_eval` (see below) — caught and fixed one real layout bug along the way.

- **Family loadout, not stacking (`src/systems/Relics.ts`).** New `RelicFamily` type (8: damage/
  move/defense/stamina/lifesteal/vitality/crit/xp) + a `family` tag on every `RelicDef` — a
  dual-stat relic claims one primary family (e.g. War Totem's `damagePct`+`staminaCostPct` is
  `damage`). `RelicManager.instances` changed from an array of stackable `{id,powerTier}` to
  `Partial<Record<RelicFamily, RelicInstance>>` — **at most one relic per family (8 max)**.
  `roll()` now runs a new `compareInstances()` dominance check (direction-normalized per key —
  `staminaCostPct`/`damageTakenPct` are "lower is better") whenever the produced relic's family is
  already owned: **strictly better** (≥ on every shared stat, > on ≥1) → **auto-replaces**, old
  relic refunds shards; **strictly worse/equal** → **auto-declines**, the new roll refunds shards
  instead; **ambiguous** (mixed — e.g. a differing secondary stat) → `RollResult.familyConflict.
  verdict = "choice"`, ownership left untouched until `resolveChoice(family, keepNew, newId,
  newTier)` is called. Refund = `REFUND_BASE[rarity] * powerTier` (Common 1/Uncommon 2/Rare 4/
  Mythic 8), in Gloam Shards (Tier 1) or Ember Shards (Tier ≥2) via `shardKeyForTier`. The
  aggregate effect getters (`damageMult()` etc.) are **unchanged in shape** — `sumEffect()` just
  iterates the 8 families instead of an array — so every `MainScene` call site kept working with
  zero edits.
- **Trimmed magnitudes (locked decision 8).** Every `RELIC_DEFS` effect scaled to exactly
  **×0.625** the original value, matching the locked spec verbatim (Common damage 8→5%, Mythic
  40→25%) — e.g. Stoneskin Charm −8→−5%, Tireless Charm −12→−8%, Titan Totem 40/30→25/19%.
- **Tier-2 relics + Ember Shard currency.** All four badlands elite trophies (`duskrunner_trophy`/
  `cragscale_trophy`/`hexling_trophy`/`sandmaw_trophy`) bumped `powerTier: 1 → 2` in `TROPHY_ROLL`
  (still Common rarity, same odds/pity — just ×1.5 magnitude via the existing `POWER_TIER_MULT`
  scaffold). New **Ember Shard** item (`Items.ts`/`Inventory.ts`, amber recolor of the Gloam Shard
  texture in `BootScene.ts`) — converted from Gloam Shards at a new **Ember Kiln** Relic Forge
  upgrade (`StationUpgrades.ts`, Lvl 2→3, `{embersteel_ingot:3, stone:20}`, discoverable once
  Embersteel Ingot is known) via `GLOAM_TO_EMBER_RATIO = 3`. New tier-2 refine recipe
  (`refine_common_t2`: 3 Common-T2 trophies + 2 Ember Shard → 1 `refined_trophy_uncommon_t2`,
  new item, rolls Uncommon capped at Rare, powerTier 2) alongside the existing Tier-1 rows.
- **Relic Forge menu (`RelicForgeMenu.ts`): new Convert tab + choice UI.** A third tab (Bind/
  Refine/Convert), gated `forgeTier() >= 2` like Refine's `>= 1`, with a single "Convert" button
  (commit-at-end `ProgressBar`, same pattern as Refine) that renders `GLOAM_TO_EMBER_RATIO` Gloam
  into 1 Ember per click. The result line now branches on `familyConflict`: "replaced"/"declined"
  show a second refund line; "choice" renders a **Keep New / Keep Old** two-button prompt (each
  showing the relic's effect text + the shard refund the OTHER option would pay), blocking further
  rolls/tab-switches until resolved — `resolveChoice()` mutates `lastResult` in place so the same
  render path shows the outcome. **Closing the menu mid-choice auto-declines the new roll** (so a
  spent trophy never yields literally nothing). Dead `×N` stacking badges removed from both this
  menu's relic grid and `RelicBarUI.ts` (impossible now that families cap at 1).
- **New Relics column on the Inventory panel (`InventoryMenu.ts`)** — a request added mid-session
  after the user noted playtesters kept checking the Equipment tab for relics. A 4th side-by-side
  section (2×4 = 8 fixed slots, one per family, paper-doll style like Equipment): empty slots show
  the family label, filled slots show the rarity gem + a `T#` badge + a hover tooltip (name/
  rarity/tier/effect, a small inline tipBg/tipText mirroring the existing `RelicBarUI`/
  `RelicForgeMenu` pattern). Reads a new `RelicManager.familySlots()` (all 8 in fixed order,
  filled or `null`) via a new `InventoryMenuDeps.relicFamilySlots` dep.
- **Bug caught + fixed during verification:** the Bind tab's `resultBlockH` reserved layout space
  only distinguished "no conflict" (1 line) from "choice" (buttons); it didn't account for
  "replaced"/"declined" now being **2 lines** (a refund line was added under the "Forged:" line) —
  the result text overlapped the "Your Relics" header and grid below it. Fixed by branching
  `resultBlockH` on the conflict verdict (26/58/130) instead of just `choicePending()`; re-verified
  live with exact pixel-gap assertions (`Text.y + Text.height` vs the grid header's `y`) for both
  the 2-line and choice cases post-fix.
- **Verified live** (`preview_eval`): all three roll verdicts via `RelicManager.roll()`/
  `resolveChoice()` with controlled `rng` (no `Math.random` monkeypatching — that corrupts
  Phaser's internal texture-key generation and was a red herring in an earlier pass); tier-scaling
  dominance (an identical relic at T2 beats its own T1 copy); refund amounts match `REFUND_BASE ×
  powerTier` exactly for all 4 rarities; `xpMult()` reflects a T2 Scholar's Idol (1.24×); Ember
  conversion's 3-tier gating (no forge / Lvl 2 / Lvl 3) and the 6→3 gloam / +1 ember math; the
  Relics inventory column renders with correct gem/tier-badge/empty-label states; the Relic Forge's
  Bind/Refine/Convert tabs and the Keep New/Keep Old choice UI all render and resolve correctly
  on-screen with no post-fix overlap; zero console errors after the fix. Dashboard `renderRelics()`
  updated (family column + note, Ember conversion note, tier-2 trophy table rows — all read live
  off `Relics.ts`, so magnitude/family data can't drift); `RECIPES.md` Relics section rewritten.
  Files: `Relics.ts`, `Items.ts`, `Inventory.ts`, `BootScene.ts`, `StationUpgrades.ts`,
  `RelicForgeMenu.ts`, `RelicBarUI.ts`, `InventoryMenu.ts`, `MainScene.ts`, `RECIPES.md`,
  `dashboard/main.ts`. **This completes the biome-2 umbrella plan
  (`.claude/plans/biome-2-sunscorch-badlands.md`) — all 6 phases (0–5) are shipped.**

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

### PB1 — Post-2nd-boss playtest fix batch, all 3 sessions (2026-07-14)

A 3-session triage off a 21-item playtest dump from beating the Duneshaper (badlands final
boss). **All 3 sessions shipped.** Session 1 = the fix/tuning slice, built as **4 parallel
worktree agents** (disjoint files, merged into `main` with zero conflicts). Sessions 2-3 =
enemy AI/Hexling and worldgen population, done inline. All `tsc` clean, verified live via
`preview_eval`.

- **Balance (A):** forged armor up — Sunsteel heavy 14→**20**, Duskhide light 13→**15**,
  Embersteel heavy 23→**32**, Emberhide light 16→**23**. Stone costs down ~30-40% across
  recipes + all station upgrades. Faster leveling — player curve `150·(L+1)^1.9` →
  `110·(L+1)^1.8` (~1.6×), skill XP `100·(L+1)` → `70·(L+1)` (~1.4×). New **Duskrunner
  Skewer** dish (Shishkabob + Duskrunner Meat @ Lvl-2 campfire → +2.5 HP/s 22s).
- **Crafting-menu bugs (B):** equipped base pieces now count/consume toward reforge recipes
  (`Crafting.setEquipment` + `availableFor`); long recipe names truncate (no more "Effigy of
  the Duneshaper" overlap); set-bonus lines now shown in the crafting detail (e.g. Emberblink).
- **Discovery/UI (C):** tool upgrades (Ironshod Axe) now fire the unlock toast like station
  upgrades; war-camp hint reworded ("I'll need to gear up before I storm it."); Ctrl+Click on
  the Smelter **fuel** slot now routes fuel correctly (was hardcoded to the input slot).
- **Relic economy (D + follow-up):** per-tier roll buttons (Common **T1**/**T2** split, was
  rarity-only); **refund exploit fixed**. Refund rule (locked with the user): upgrading/Keep-New
  displaces the old relic for **nothing**; discarding the just-rolled relic refunds **50% of its
  trophy's shard cost** — raw trophies free → 0, refined → 1 shard (`trophyDiscardRefund`,
  keyed off a stored pending trophy). A refund is only ever half a *paid* cost, so rerolling
  can't net shards. Verified live against the real `RelicManager` (raw→0, refined-T1→1 gloam,
  refined-T2→1 ember). Also fixed the auto-declined path naming the wrong relic as discarded.
- **Enemy wander-anchor (Session 2):** Boar/Cragscale drew each idle wander target relative to
  their *current* position (incremental drift) and never returned toward spawn — a bad run of
  targets walked them far off. They now sample wander targets from a stored **spawn point** each
  cycle (the RangedGremlin/Hexling pattern; `WANDER_RADIUS` 90/70), so a pulled-away enemy gently
  drifts home. Free `MeleeGremling`s now **default their `wanderAnchor` to spawn** (was null →
  drift); shack guards' explicit anchor is unchanged.
- **Hexling (Session 2):** neutral to physical now (dropped the flat 0.5 slash/blunt/pierce
  resist that made an armor-bypassing caster un-killable with a normal weapon; keeps its magic
  **and** fire ×1.5 weaknesses). The 3-bolt volley mixes damage types — **center bolt = fire**
  (armor-bypassing, the shot to dodge), **outer two = physical** (armor applies), with a distinct
  `hex_bolt_phys` texture. Drops **4-6** hex essence (elite **9-11**, was 1/2, then 3-5/6-8 —
  bumped once more same day once the math on base biome-2 gear's total hex-essence cost, 23,
  was actually worked out — see below). `Projectile.damageType`
  widened `DamageType`→`IncomingDamageType` so a bolt can carry fire. Verified live (resist
  multipliers, the fire/physical/texture split off a real `castBolt`, anchors on spawned enemies).
- **Hex essence economy (same-day follow-up):** playtest — building base biome-2 gear (Forge
  Anvil unlock 5 + all 3 Sunsteel weapons 10 + full Sunsteel heavy armor 8 = **23** ingots, at 1
  hex essence per smelted ingot) shouldn't require looping the entire badlands ring. Hexlings
  spawn uniformly across the whole ring (44 total, no literal quadrant split), so half the ring
  ≈ ~22 of them; bumped the drop again (4-6/9-11, was 3-5/6-8) so clearing even a modest fraction
  of that half comfortably clears the 23-essence target with real margin. Verified live off real
  spawned Hexlings (normal 4-6, elite 9-11). `tsc` clean, no console errors.
- **Populate the outer world (Session 3):** playtest — "lot of empty space in the verdant woods
  outside of center" + "shouldn't have to loop around the whole Badlands ring." Two additive
  spawn passes, both running after every POI position is set (unlike the pre-existing inner-band
  passes, which run before POIs and don't get this benefit): `spawnOuterForestContent/Enemies`
  populates forest patchwork blobs beyond `BIOME_RADIUS` (2000) with a lighter, ~half-density mix
  of trees/rocks/branches/boulders/blackberries + Boar/Snake/RangedGremlin/MeleeGremling, via a new
  `pickOuterForestPoint` sampler (mirrors `pickBadlandsPoint`'s structure — dominant-biome gate +
  all 5 POI exclusions, returns `null` on exhaustion rather than an unvalidated fallback point).
  `spawnOuterBadlandsContent/Enemies` extends the badlands band from `BADLANDS_R_MAX_INNER` (5200,
  unchanged default) out to a new `BADLANDS_R_MAX_OUTER` (8500), reusing `pickBadlandsPoint` with
  its new optional `rMax` param (every existing call site keeps the old default, unaffected).
  Deliberately NOT filled to `WORLD_RADIUS` (14000) — the deep frontier stays reserved for a future
  biome. Verified live via `preview_eval`: **100% placement success** for both new node passes (224
  outer-forest nodes, 266 outer-badlands nodes — exact requested counts, meaning real coverage is
  plentiful out there); 50 forest-species + 112 badlands-species enemies landed in their respective
  new bands; sampled outer-forest positions confirmed `dominantBiomeAt() === "forest"`; zero
  POI-exclusion violations traceable to the new code (all violations found trace to a pre-existing,
  unrelated `pickSpawnPoint` fallback bug — flagged as a separate task, not fixed here). `tsc`
  clean, no console errors even at the larger spawn count (554 enemies, 1447 nodes total).

RECIPES.md + dashboard relic prose updated. See [[survivor-rpg-relics]].

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


### PB2 — Post-Duneshaper playtest batch, 15 items (2026-07-14, Opus)

Off the user's Duneshaper-clear playtest. Locked 4 design calls via `AskUserQuestion`; the rest were
clear fixes. Organized into 5 workstreams (relic economy / notifications+HUD / Duneshaper combat /
gear+crafting / world+flora), done sequentially (all route through MainScene + shared data files, so
worktree-parallel would only conflict). Built on Opus (new mechanics: trophy economy, gear-level tier,
boss combat rework).

**Relic/trophy economy** (`Relics.ts`, boss loot, `Items.ts`, `RelicForgeMenu.ts`):
- New **`boss_refined_trophy`** ("Boss Trophy") dropped by the **Gremlin King** (+ keeps its Heart) and
  the **Duneshaper** (unreachable — that kill wins the run — kept for consistency). Uses a new per-trophy
  **`outcomeOdds` override** on `TrophyRoll` (Rare 50% / Mythic 50%, never fails) — the shared Rare
  table couldn't express it. Verified live: 4000 rolls → 49.6% Mythic / 50.4% Rare, 0 fails, first roll
  guaranteed.
- **Cinderwrought** re-tiered: drops **2-4 Ember Shard** (was 3-5 Gloam — a badlands mob dropping Gloam
  never made sense; the user) + **`refined_trophy_uncommon_t2`** (Tier 2, was tier-1). **2 Cinderwroughts
  now guard each Sunken Forge** (`forge.boss` → `forge.bosses[]`; ore cracks only when BOTH die) — 5
  forges × 2 = 10, so ember sites reliably supply the tier-2 refine currency (this replaced the trophy→shard
  salvage idea — the user's call). Gloamwarden unchanged (forest, Gloam + tier-1).
- **Two-guard balance pass** (the user follow-up, locked via `AskUserQuestion`): doubling the guards had
  silently doubled HP + loot. Per-guard **HP 340→260** (total 520, a step up from the old single 340 fight,
  not a 2× slog); **both guards drop 2-4 Ember Shard** (the supply was the point) but **only one drops the
  tier-2 refined trophy** (new `Cinderwrought` `dropTrophy` cfg flag; `armForge` passes `i === 0`), so a
  site yields 1 refined trophy, not 2. Attacks/fire damage unchanged. Verified live: HP 260, trophy-guard
  loot = ember + trophy, other = ember only.
- **Replaced relics now partial-refund** (`replaceRefund`: 1/2/3/5 shards by rarity, ×1.5 for Tier 2) on
  top of the existing declined-roll refund — the old net-farm worry is moot now that ember mobs supply
  shards directly. The `previewChoiceRefunds`/`resolveChoice` Keep-New path pays it too.
- **Ember-Shard refine recipe hidden until Ember Shard discovered** — new `hasDiscovered` dep on the forge
  menu filters `refine_common_t2` until its shard currency is known (fixes "ember shard recipes before
  discovering ember shard").

**Gear & crafting** (`ArmorUpgrades.ts`, `WeaponUpgrades.ts`, `Weapons.ts`, `Crafting.ts`, `Items.ts`):
- **+2 right-click levels for every forged piece** — base (Sunsteel/Duskhide) AND enhanced (Embersteel/
  Emberhide/Ember Brand), via compact `forgedArmorUpgrades`/`forgedWeaponUpgrades` helpers. Armor +1/level
  (+2 at Lvl 3), weapons +2/level (+4 at Lvl 3), sunk in ingots (the user: a use for the ingot stockpile).
  Tuned + verified so **Lvl-1 ember always out-stats Lvl-3 steel** (embersteel_helm base 10 > sunsteel_helm
  Lvl 3 = 8; emberhide_leggings base **bumped 7→8** > duskhide_leggings Lvl 3 = 7). Reforging a leveled
  steel piece still yields a Lvl-1 ember piece (recipe output is tier 0 — falls out naturally). Steel
  upgrades gate on Workbench Lvl 3, ember on Lvl 4.
- **Hotbar items now count toward recipe ingredients** (`Crafting.setHotbar(hotbar.container)`) — weapons/
  tools live in the hotbar, so a Sunsteel Pike there is now visible+consumable by the Embersteel Pike
  reforge (fixes "still not looking at items in hotbar when considering upgrades"). Verified: a hotbar
  Sunsteel Pike returns `availableFor === 1`.
- **Higher-tier weapons cost more stamina**: Sunsteel 20/12/15→22/15/18, Embersteel 22/13/16→27/18/22,
  Ember Brand 15→19 — each tier a clear step up.

**Duneshaper combat sharpen pass** (`Duneshaper.ts`, Q4 "sharpen + add pressure"): HP **1050→1250**,
`ATTACK_COOLDOWN 900→700ms`. The **Gloamfire Lance** now tracks the player through 60% of the wind-up
then commits **and sweeps ±20° across the strike** (was locked at telegraph start = trivially
pre-sidesteppable). **Sand Spikes** reworked from 3 spaced perpendicular circles to a **tracked 5-circle
cross** (center + 4 axis/perp arms) — distinct from the Hexling's bolt spread, covers every cardinal
escape so only a diagonal run / dash clears it.

**Notifications & HUD** (`EventLogUI.ts`, `BossHealthUI.ts`, boss entities, `HotbarUI.ts`, `MainScene.ts`):
- **Center-toast burst capped at 4 + repacked from the top** — a monotonic cursor let "Defeated X"
  bursts march down over the player; now the oldest is evicted past 4 and the stack re-anchors at the top.
  Verified: 8 toasts → 4 active, max Y 174px (well above the player).
- **Bigger boss stagger bars**: mini-boss world poise bars 22×3 → **56×6** (Cinderwrought/Gloamwarden,
  Duneshaper 64×6); the top `BossHealthUI` poise section **12→20px**.
- **POI-respawn toasts only within 900px** (`notifyPoiRespawn`) — the respawn still happens, only the toast
  is distance-gated (the user).
- **Tier-aware bench art in the hotbar** — new optional `stationTexture` dep resolves `icon_workbench_t2`
  etc. so an upgraded bench shows its tier sprite in the hotbar, matching the placed one.

**World/flora** (`MainScene.spawnBadlandsFlora` + `spawnOuterBadlandsContent`): **Emberblooms + Dustblooms
grow in patches of 3-5** around a shared center (jittered); Sunfruit (cactus) + Gloamcap (mushroom) stay
scattered solo. Verified: 59/90 emberblooms have a close neighbor.

**Answered:** food buffs cap at **3** concurrent (`BuffManager`, shared with the Bedroll rest effect).
**Flagged non-repro (#9):** "duskrunner stacks to 98" — every stacking primitive (`add`,
`topUpExistingHotbarStack`, `sortAndStack`, `moveSlot`) fills to the full 99; no off-by-one exists.

Docs: `RECIPES.md` (relic-trophy table + boss-odds row, forged armor/weapon upgrade tables, weapon
stamina) and the dashboard Enemies/Relics tabs updated. `tsc` clean; verified live via `preview_eval`
(boss-trophy odds, 2-guards-per-forge + loot, forge menu open, hotbar reforge counting, ember-upgrade
tables + stat invariants, toast cap, tier-aware hotbar texture, flora clustering); zero console errors.



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

### S1 — Quick HUD/UX fixes (2026-07-15, Sonnet)
Wave 2 of the 8-session 2026-07-15 playtest plan (`playtest-2026-07-15-session-plan.md`). Four
small independent fixes, no shared theme beyond "quick."
1. **Sprint re-press latch** (`Player.ts`) — a new `sprintLocked` field. Previously, once stamina
   emptied and vetoed sprint mid-hold, the instant stamina regenerated back up (while shift stayed
   held) sprint would silently resume — felt like free auto-resume. Now: `canSprint` going false
   while shift is down sets the lock; it only clears on a shift **release**, so the player has to
   let go and re-press to sprint again even if stamina is already full.
2. **Level-up banner / center-toast overlap** (`MainScene.showLevelUpBanner`) — the push-down
   offset for the `EventLogUI` center-toast stack was a hardcoded `cy + 80` that never measured the
   real banner. Now computed from the actual rendered `sub.y + sub.height/2` (same
   "measure real Text heights, then shift" pattern as this codebase's dynamic-row-height panels)
   + a 16px gap, so it tracks real font metrics instead of a guess.
3. **Stagger bar** (`BossHealthUI.ts`) — `POISE_BAR_H` 20→16 (the ask was a bigger *number*, a
   thicker bar overshot) plus a new centered `poiseText` ("42/120") readout drawn over the bar.
   `Enemy.BAR_OFFSET_Y` was already at the target value (16) from a prior pass — no change needed.
4. **Armor/weapon tooltip "base (adjusted)" display** (`Tooltip.ts`, `CraftingMenu.ts`) — both
   `statValue()` helpers flipped their damage/armor line from `"5 (7)"` (upgraded value buried in
   parens, read as "no effect") to `"7 (base 5)"` (upgraded value primary, base secondary) whenever
   skill/upgrade adjustment differs from the raw base.

`tsc` clean. Verified live via `javascript_tool` against a running preview: drained stamina to 0
with `stamina.spend(stamina.max)`, dispatched real `keydown`/`keyup` events for Shift+D, and
confirmed `player.sprintLocked` stays `true` (velocity pinned to walk speed, 95px/s) through a full
0→100 stamina regen while shift stays held, then clears on shift release with sprint resuming on
re-press. Injected a fake `BossBarTarget` into `bossHealthUI.update()` and confirmed the poise bar
renders at height 16 with a `"42/120"` text label. Called `showLevelUpBanner(5, 5)` directly and
confirmed the computed `eventLogUI.topOffset` (395 at the game's native 1080p canvas height) matches
`sub.y + sub.height/2 + 16` exactly, not the old flat guess. **Next in the 8-session plan:** S3
(inventory visuals + upgrade-ready indicators — **Opus**, new indicator system — switch model
first), then Wave 3 (S7 → S8, sequential, both touch `Weapons.ts`/`Recipes.ts`).

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

### S8 — Biome-2 Warbow + arrows + ember material tweak (2026-07-15, Opus)
The **final** session of the 8-session 2026-07-15 playtest plan
(`playtest-2026-07-15-session-plan.md`) — with this, that plan is fully shipped. Adds the badlands
**ranged gear tier** and enriches the ember reforge recipes. Locked/refined live with the user: **one
bow → two via reforge** (base Sunsteel + Embersteel reforge, not two independent bows); arrow yields
**50 per craft** from either metal; ember cores use **`hex_essence`, not `gloam_shard`** (gloam is
relic currency).

- **The bows (`Weapons.ts` — fully additive, compiler-forced rows in every `Record`):**
  - `sunsteel_warbow` — forged ranged, dmg **11** / cd **750ms** / stam **12** / crit **7%×1.55** /
    range **380px** / projectile **600px/s** / arc `{0,0,0}` (never sweeps).
  - `embersteel_warbow` — the reforge, dmg **15** / cd **730ms** / stam **15** / crit **8%×1.6** /
    range **400px** / projectile **640px/s**. DPS 14.7 → 20.5: a real tier above the Slingshot (2),
    still below forged melee since safe range is the trade (locked "ranged is an opener" design).
  - `RANGED_WEAPONS` entries `ammoItemKey: "arrows"`, `projectileTexture: "arrow_projectile"` (arrow
    art points +x, so no `artAngleOffset`). No `WeaponUpgrades` right-click tiers — the reforge IS the
    bow's upgrade path (consistent with the slingshot/javelin ranged precedent).
- **Zero `MainScene.ts` changes.** An Explore pass confirmed the ranged pipeline (`tryRangedAttack`,
  `spawnProjectile`, the player-projectile→enemy overlap that hardcodes `"ranged"`, the `"ammo"`
  EquipSlot merge/decrement/auto-refill, hover/aim via `maxRangePx`, prompt gating) is entirely
  data-driven and hardcodes no weapon key — a bow "just works" once in `RANGED_WEAPONS`. Bow &
  slingshot **share the single `"ammo"` slot**: loading arrows evicts any pellets back to the backpack
  (existing `equipArmorFromContainer` merge-by-key path, unchanged).
- **Arrows (`Items.ts` + `Recipes.ts`):** `arrows` ammo item (`armorSlot: "ammo"`, maxStack 99,
  not hotbarable). Two recipes, both output the same `arrows` and both `requiresDiscovered:
  ["sunsteel_warbow"]` (mirrors the pellet→slingshot gate): **Sunsteel** `1 sunsteel_ingot + 5 wood →
  50` (WB Lvl 3) and **Embersteel** `1 embersteel_ingot + 5 wood → 50` (WB Lvl 4) — same arrows, an
  alt-metal convenience (ammo carries no damage in this engine; the bow does). `warbow`/`arrows` added
  to `BADLANDS_ITEM_KEYS` so they file under the badlands inventory tab.
- **BootScene:** `icon_sunsteel_warbow` (steel stave + string + nocked steel-tip arrow),
  `icon_embersteel_warbow` (dark stave, ember-orange string/head, ironbark shaft), `icon_arrows`
  (fletched bundle), `arrow_projectile` (16×6 horizontal shaft+head).
- **Ember material tweak (the user: "ALL ember weapons AND armor should use other ingredients too, on
  theme with their sunsteel precursor").** Each T2 reforge now mirrors its precursor's secondary
  materials + upgrades wood→ironbark + adds `hex_essence`: helm `+hex1`; cuirass `+bones4 +hex2`;
  greaves `+cragscale2 +hex1`; emberhide hood/vest/leggings each get their pelt/chitin(/bones) back
  `+hex1`; warhammer `+hex2`; sword `wood2→ironbark2 +hex2`; pike `+hex2`; Ember Brand `+ironbark2`;
  Embersteel Warbow `{ sunsteel_warbow, embersteel_ingot3, ironbark3, duskrunner_pelt2, hex_essence2 }`.
  Sinks the under-used, non-relic `hex_essence` (Hexling drop) across the whole ember tier.

`tsc` clean; verified live via `preview_start` + `javascript_tool`: all 4 textures exist; every
Weapons/Recipes value matches spec; end-to-end fire (equip via hotbar → load arrows → fire a 200px
enemy) = ammo 10→9, +1 `playerProjectiles`, cooldown set, and a direct `resolveWeaponHit(...,'ranged')`
dealt 11 (HP 20→9); out-of-range (500>380), no-ammo, and wrong-ammo (pellets loaded) all no-op without
consuming ammo or spawning a projectile; all icons render at readable size; zero console errors.
`RECIPES.md` synced (recipe table + Ranged-weapons table + enhanced-tier note). Dashboard needs no
manual edit — Items/Recipes tabs read the data modules live; its weapon-stats table is melee-only by
design (slingshot/javelin were never listed there either).

**Same-session follow-up — weapon-aware ammo slot.** Playtest: after arrows ran out, pellets left over
from Slingshot use sat "loaded" in the shared `"ammo"` slot while a Warbow was equipped, and the bow
couldn't fire them — reading as the game auto-loading the wrong ammo. (Traced exhaustively: no code
path actually injects pellets — the fire-refill only tops up the *same* loaded key; the real issue was
the generic slot accepting any `armorSlot:"ammo"` item regardless of the equipped weapon.) Fix: new
`MainScene.reconcileAmmoSlot()`, called at the end of `recomputeEquipped()`, evicts any loaded ammo
whose key ≠ the equipped ranged weapon's `ammoItemKey` back to the backpack and auto-loads the correct
ammo from the backpack if carried. So a Warbow's slot only ever holds Arrows, the Slingshot's only
Pellets; switching bow↔slingshot swaps ammo seamlessly; manually loading the wrong ammo into a bow
bounces straight back; and with no matching ammo the slot goes empty (never the wrong type). No-op for
melee/unarmed + the self-consuming Javelin (`ammoItemKey` null); guarded against pre-init/no-churn.
`tsc` clean; verified live (4 scenarios: pellets→bow evicts+loads arrows; bow→slingshot swaps back;
manual wrong-load bounces; no-matching-ammo → empty; then fires arrows 5→4 + projectile). Zero console
errors.

**The 8-session 2026-07-15 playtest plan is complete. Next up:** no locked milestone — likely a broader playtest/tuning pass or a biome-3 scoping
session (master roadmap's "at least 5 total biomes").

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

### B3-P1 — Biome-3 Phase 1: Terrain-that-matters (2026-07-21, Opus)
First milestone of the biome-3 (haunted bayou) + new-systems arc. Umbrella roadmap:
`.claude/plans/biome-3-and-new-systems-roadmap.md` (5 phases: Terrain → Abilities/gems economy →
Bayou gear reforge → Bayou content → post-boss choice). Locked forks this session: terrain first;
cooldown-only, equipment-granted Q/E/R abilities; melee-core bayou; big-boss-only post-boss choice.
This phase = **blocking terrain + a generic environmental-zone hook** in biome 2, **reworked same-session
into a badlands MACRO-ZONE system** after the user's feedback (the initial version — sparse "light-dressing"
lone rocks + ~12 small bramble patches — read as "too random / hard to distinguish; the whole biome feels
like uniform scatter with no structure"). the user chose "full biome macro-zones" + "ground decal + bold props".

**Macro-zones.** `placeBadlandsZones()` drops **~10 LARGE themed sub-zones** (`badlandsZones: {type,x,y,r}[]`,
radii 300–470, min-sep 720, placed after every POI — with the WHOLE zone radius kept clear of every POI's
clearing via a `clearsPois` check, so a boss arena is never inside a slow/rock field: a same-session fix after
the user saw a Sunken Forge inside a thornfield, since `pickBadlandsPoint` only excluded the zone's *center*);
`subZoneAt(x,y)` resolves the zone under a point. **Zones are NON-circular:** each carries an angular-harmonic
wobble (`zoneEdge`, same idiom as `WorldBiomes.seedCoverage`) that varies its edge radius ±16–24% by
direction; `subZoneAt`, the prop fill, and the ground decal (`drawZoneFloor` — a wobbly Graphics blob, not a
scaled circle) all share that one outline, so areas read as organic lumps. POI-clearance uses the outermost
lobe (`r × (1 + wAmp·WOBBLE_MAX)`) so no lobe laps a boss arena. Two types:
- **boulderfield** — `fillBoulderfield()` builds several rock RIDGE-LINES (barriers with walkable gaps) +
  scattered rocks, all solid (`solids.create` static bodies → player+enemies collide, ~140/run) and recorded
  in `obstaclePositions`. A navigable cover/maze formation, not an impassable disk.
- **thornfield** — `fillThornfield()` densely fills the whole region with non-solid `bramble` scrub (~630
  props/run across 5 zones) + dense Dustbloom/Emberbloom foraging. The slow applies across the ENTIRE zone.

Each zone stamps a bold ground decal (`zone_floor_boulderfield`/`_thornfield`, big fairly-opaque radial at
depth -7) so the area reads as a distinct place from afar. **Wild content avoids zones:** a `subZoneAt` gate in
`pickBadlandsPoint` keeps wild flora/minerals/enemies out of zone cores (badlands flora/minerals/nodes were
reordered to run AFTER `placeBadlandsZones` so they see the gate — safe because `sessionRng()` reseeds per
call, so each pass is independent). **Themed enemies:** `spawnZoneEnemies()` fills boulderfields with Cragscale
bruisers, thornfields with Duskrunner swarms (avoiding rock footprints). The open ground between zones stays
organically scattered — structure AMID the randomness, reconciling with the standing organic-density preference.

**Generic env-zone hook (biome-3 miasma/swamp consumes).** `environmentEffectAt(x,y): {moveMult, blockRegen}`:
(1) **slow** — computed before `Player.update`, passed as a new `envMult` param (walk/sprint only, NOT the dash
burst); (2) **no-regen** — `currentEnvBlockRegen` gates `updateComfortRegen()` + `BuffManager.tick(delta,
health, suppressHeal)` (new param — buff counts DOWN but heals nothing). No-regen is built + tested but DORMANT
(no biome-2 miasma yet).

**Textures (the user: much more distinct).** Rock walls/spires redrawn COOL GREY (pops vs warm badlands) + bigger
(40×30 / 26×46); bramble redrawn dark tangle + red berries; 2 new zone-floor decals. **Files:** `MainScene.ts`
(zone model + `placeBadlandsZones`/`spawnBadlandsZoneContent`/`fillBoulderfield`/`fillThornfield`/
`spawnZoneEnemies`/`subZoneAt`/`environmentEffectAt`; `pickBadlandsPoint` obstacle+zone gate; create() reorder;
update-loop + regen wiring), `Player.ts` (`envMult`), `Buffs.ts` (`suppressHeal`), `BootScene.ts` (bolder
rock/bramble + 2 zone-floor decals). `tsc` clean. **Verified live** (`javascript_tool` + screenshots, loop
pumped past the backgrounded-render pause): 10 zones (5+5, radii 300–467); ~143 rock bodies + ~630 bramble
props + 10 floor decals; slow 0.6× only inside thornfields (edge-in too), 1.0 in boulderfields/open; themed
enemies correct (5 Cragscale in a sampled boulderfield / 6 Duskrunner in a thornfield); `subZoneAt` true inside
/ false outside; a player walking into a boulderfield rock stops at its edge (collision works); screenshots
confirm each zone reads as a distinct dense area (grey rocky basin / dark bramble thicket). **Next:** Phase 2
(Abilities & gear economy) — new mechanic, Opus, its own plan/session.

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

### B3-P4b — Biome-3 Phase 4b: the Duskmire Bayou creature roster (2026-07-22, Opus)

Phase 4b of the biome-3 roadmap (`.claude/plans/biome-3-and-new-systems-roadmap.md`) — the
**melee-core bayou roster**, six bespoke creatures dropped into the terrain 4a built. Scope locked
with the user up front via `AskUserQuestion`: **the specced 6** (not a trimmed 4-5, not a 7th
apex elite); **Mirehide comes from the Mirejaw ONLY** (the signature ambusher — hunting it *is*
the reforge gate, mirroring Bog Ore as the one surface metal); and **build the homing projectile
now** rather than shipping the Corpselight with a straight bolt.

**Two shared hooks first, both tiny, both built before the content that needs them:**
- **`Enemy.pendingPoison`** — the exact contract `pendingBleed` already had (read + cleared by
  `updateEnemies` on the landing frame, so it rides the same i-frame guard);
  `applyDamageToPlayer` gained a matching optional `poison` param that routes to
  `PoisonManager.apply()` — the **discrete, stacking** path, deliberately not the miasma's
  refresh-only `sustain()`.
- **`Projectile.homing`** — optional `{turnRateRadPerSec, target}` (a live ref, re-aimed each
  `preUpdate` by rotating the current velocity toward the target by at most `turnRate·dt`, speed
  preserved), plus an optional `maxLifetimeMs`. The lifetime is **required** for a homing shot:
  the default despawn measures straight-line distance *from spawn*, which a curving orb may never
  exceed — it would orbit forever. Straight shots are untouched and keep the distance rule.

**The six (each a bespoke subclass with its own state machine/constants/loot + elite variant +
per-species trophy, per the standing "own numbers, don't share one config table" rule):**
- **Mirejaw** *(130 HP)* — the signature ambusher and sole **Mirehide** source. Lurks half-sunk at
  **alpha 0.4 — visible**, unlike the Sandmaw's 0.18, so it's spottable — creeps into position,
  then commits a **locked-line lunge chomp** (85 dmg + bleed 7/s×6s). Unlike the Sandmaw it does
  NOT re-submerge after one attempt: it **surfaces and hunts** (62 chomp + bleed), re-lunging from
  mid-range, and only re-buries once it loses you. Also drops **Mirejaw Meat** — the bayou's food
  source, the Duskrunner-meat precedent. Resists pierce ×0.5 / weak slash ×1.25.
- **Blighttoad** *(70 HP)* — the **poison** carrier, the creature half of the biome's signature
  status. Its bite (52) is mostly eaten by bayou-tier plate; the **poison is the payload** —
  armor-bypassing, **stacking per bite**, and it halves every heal source while it runs, so it
  also stops you eating your way out. Semi-swarm (`packAggro` 200), clumps of 2-3, burst **hop**
  locomotion.
- **Mosswretch** *(190 HP)* — the bruiser. **Slowest common enemy in the game** (36px/s, always
  outwalkable) with the **longest common wind-up** (780ms) and a 720ms recovery, so every hit it
  lands is one you chose not to walk out of. **The roster's FIRE lesson:** fire **×1.5**, the
  biggest weakness multiplier on any common enemy, which finally makes the player's fire sources a
  deliberate answer to a specific creature. Resists blunt ×0.5.
- **Murkling** *(22 HP)* — the fast melee swarm and the **AOE-arc payoff enemy**. Dies to one
  bayou-tier hit; the threat is 4-6 at once, faster than the player's walk, with the shortest
  telegraph in the game (150ms). Wide `packAggro` (300) on the **base `state` field** (the
  Duskrunner's zero-override pattern). **Deliberately neutral to every damage type** — it's the
  baseline you measure a weapon's sweep against.
- **Fenlurker** *(85 HP)* — the muck-burrowing ambusher. Shipped alongside the Sandmaw on purpose
  because **the dodge verb is opposite**: the Sandmaw detonates a *ring* (dodge by clearing
  distance), the Fenlurker rakes a **locked line** out of the mud (dodge by stepping aside), and a
  dodged maul leaves it planted a full second with no radial safety net. Invisible **and
  untargetable** while buried (the Sandmaw's locked rule); AoE damage while buried arms a flag that
  `update()` commits next frame (takeHit has no player coords and this attack has a direction to
  lock). Resists slash ×0.5 / weak blunt ×1.25 — **the exact inverse of the Mirejaw**, so the two
  bayou ambushers want different weapons.
- **Corpselight** *(90 HP)* — the **one** ranged creature, kept genuinely uncommon (22 vs 42-139
  for the melee species) so the biome still reads melee-core. Fires the **homing gloam orb**: 110
  px/s, 1.5 rad/s, 4.2s lifetime, `magic` (bypasses flat armor). Neutral to physical on purpose
  (the Hexling's old flat physical resist read as unkillable). Also the bayou's **local Hex Essence
  source**, so forging Gloamsteel no longer means walking back to the badlands.

**Spawning + economy.** `spawnBayouEnemies()` places **358 creatures** through `pickBayouPoint`
(bayou-dominant only, POI exclusions honored), clustered per species rather than evenly spread per
the organic-density preference — and cluster jitter now **re-checks the biome per member** and
falls back to the anchor, an improvement on the badlands pack spawner, which can leak members over
a seam. The bayou's **enemy-respawn top-up is live** (4a had it explicitly gated off), weighted to
its own counts with a real Mirejaw share so the Mirehide tier stays farmable. 3 new materials
(Mirejaw Meat / Blight Gland / Gloam Dust) + 6 elite trophies at **Common / Tier 3** — a new power
tier (×2.25), **roll-only for now**: refining needs a tier-3 shard currency the bayou's own POI /
dungeon phases will source, exactly as biome-2 trophies were before Phase 5 added Ember Shards.
Mosswretch reuses existing keys (Swamp Moss + Wood) and Fenlurker drops **Bones**, giving the bayou
a bone supply that previously only came from forest Boars.

**Verified live** (`javascript_tool`; the backgrounded-preview loop had to be hand-stepped via
`game.loop.step`): 358 bayou creatures, all inside the 6400-10500 band; every stat/resist/loot/
trophy/elite-texture pair read off real instances; **Mirejaw's locked lunge dealt 85 + bleed 7/s
standing still and ZERO damage when sidestepped during the tell**; poison **stacked 6→12→18→24 dps
across repeated bites while the miasma's sustain path held flat at 3** (the two-mode contract);
Mosswretch 800ms telegraph→95 dmg, planted at velocity 0; one woken Murkling **cascaded aggro to
all 5** packmates; Fenlurker buried = untargetable/alpha 0.12/no HP bar, retaliates on AoE damage,
maul 78 + bleed 5; the homing orb **re-aimed 0°→-55° chasing a moving player at exactly its
1.5 rad/s cap** and **expired at 4224ms** (the anti-orbit safeguard), and hit for **20 through 42
flat armor vs 1 for the same shot untyped** — magic bypass + heavy-armor mitigation both correct.
`tsc` clean, zero console errors, all six render with distinct silhouettes (screenshot).
Dashboard Enemies tab (the one hand-mirrored source) + `RECIPES.md`'s trophy table updated; no
recipe changes.

**Same-session tuning pass (the user: orbs "fade away really soon", "remember how powerful the player
is going to be — think about how fast players will be", "the gators are too small").** All three were
the same root error: the roster was sized against the **badlands** roster instead of against a
bayou-ready player. Measured, not guessed — that player **sprints at 166-229 px/s** (Running skill +
move relics, ~309 on a kill-rush), **dashes at 450**, **blinks 220px**, and hits for **45-70 (130-200
on crit)**. Against that, the fastest creature in the roster was 104 px/s and the tankiest was 190 HP:
**the entire biome was outrunnable at a walk and died in two swings.**
- **Corpselight orb:** 110px/s × 4.2s was a **~460px leash** — it died almost as soon as it was fired.
  Now 170px/s × 9s ≈ **1500px of pursuit** (verified: 9024ms/1527px when outrun). The fairness bound
  is unchanged in spirit — 170 is still under a sprint, so running straight escapes outright; verified
  it *does* catch a player moving at 125px/s. Damage 26→34, cast cooldown 2400→1900ms.
- **Speeds** (peak pursuit, measured live): Murkling 104→**172** (the only creature that can hang with
  a sprint — that IS the swarm's identity: you kill it, sweep it, or blink, you don't walk away),
  Mirejaw chase 66→**138** / lunge 400→**560** over 340px, Blighttoad hop burst 150→**300** (~145 avg),
  Fenlurker burrow-stalk 40→**130**, Corpselight drift 40→**85**, Mosswretch 36→**74** (still the
  slowest by design — it's the bruiser, it's *meant* to be escapable).
- **HP** ~2.5-3× (Murkling 22→40, Blighttoad 70→150, Fenlurker 85→220, Corpselight 90→190, Mirejaw
  130→**320**, Mosswretch 190→**420**), and **damage** raised to matter through bayou plate. Measured
  net through a **full Gloamsteel set**: Mosswretch smash **63**, Mirejaw lunge **52**, Fenlurker maul
  **44** — ~4 hits to kill a 220 HP player, all three heavily telegraphed.
- **Mirejaw "stalk patience" (a real bug the tuning exposed):** its stalk is deliberately slow, so a
  player who simply kept walking could never be ambushed — it fell **537px behind and never engaged**.
  After 2.4s of fruitless stalking it now **abandons stealth and hunts**. Verified: walking away → it
  escalates and closes; sprinting away → clean escape (1500px gap). That's the intended contract.
- **Gator size:** sprite redrawn 34×22 → **48×22** and scaled 1.55 (elite 2.0) = **74×34 on screen**,
  the largest common creature in the game, with a `barScale` bump so its HP bar stays readable.

**Next: 4c — dungeons** (where the ability gems + Moonsilver actually live, ordered
after the roster because a dungeon needs creatures), then 4d (surface POIs + the Miretyrant boss +
the win-con swap).

### B3-P4c — Biome-3 Phase 4c: Sunken Crypts (the dungeon mechanic) (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4c-crypts.md`. Phase 4c of the biome-3 roadmap — the **dungeon
mechanic**, and the payoff for 4a's locked surface/dungeon split. In 4a the **most precious
materials were pulled OFF the surface**: `moonsilver` + the three ability geodes
(`gem_gloam`/`gem_ember`/`gem_blood`) were removed from the bayou scatter and their node textures
kept in-repo specifically so this phase could re-site them. Until now those four materials — and
therefore every jewelry recipe and all three Q/E/R abilities from 2a/2b — had **no in-game source
at all** (`__dev.give` only). They do now.

**Locked with the user via `AskUserQuestion` (+ two follow-up corrections):** materials come out as
**mineable nodes deep inside** (re-site the kept geode/seam nodes, not a chest hand-out); **one gem
per crypt, themed**, so *which crypt you clear decides which ability you unlock*; **6 crypts, ~5-7
rooms each** (two per theme); **a unique bespoke mini-boss per gem type** — and, on his correction,
**the materials are hard-gated on beating that encounter** and each warden must feel different
**from each other AND from every previous mini-boss**, i.e. three genuinely different state machines,
not one skeleton with new numbers.

**Interiors are a pocket of the same world, not a second Scene.** Every system the player carries
(run state, HUD, inventory, physics groups, day/night, relics) lives on `MainScene`; a second scene
would duplicate or re-parent all of it. Instead interiors are prebuilt at `create()` in
`CRYPT_REALM` — the dead corner of the world SQUARE that falls outside the world CIRCLE. Physics and
camera bounds already cover it, `drawWorldBoundary()` already paints it near-black, and every spawn
sampler already rejects it. Geometry is measured, not assumed: the rect's nearest corner is **15488
px** from world center vs `WORLD_RADIUS` 14000 (verified live across reseeds). Six interiors sit on
a 3×2 grid inside it, so no two can overlap. Prebuilt (not instanced on demand) means **a
partially-cleared crypt stays cleared for the run**, matching how all world-gen already works.

**New: `src/systems/CryptLayout.ts`** (framework-free, no Phaser) — carves rooms + L-bend corridors
on a 32px cell grid, marks the floor, then turns every non-floor cell touching floor into wall.
Walls come back as **merged horizontal runs**, which is the difference between ~1800 static bodies
across six dungeons and the **601** actually created (measured live). Also picks `entry` (arrival +
exit stairs), `vault` (furthest from entry — the payoff is always a real delve) and `side` (furthest
from both — the loot detour is a detour).

**New: `src/entities/SunkenCrypt.ts`** — the surface doorway + per-crypt state, `BadlandsDen`'s
plain-data-class split (MainScene owns generation/population). `CRYPT_THEMES` is the single source
for a theme's entrance art, map marker, geode texture, gem key, warden name and glow color, so one
decision drives four consistent tells.

**The gate.** Vault geodes + moonsilver seams spawn `shielded: true` — the exact Gloaming Vein
mechanic (`ResourceNode.shielded` + `crack()`), which is why that mechanic exists. Shielded nodes
are skipped by hover/prompt/interact entirely, so there is no walking past the fight to the loot;
the warden's kill handler cracks them into their real textures. **Deliberately NOT done:** sealing
the vault door behind the player. In a hardcore one-life run an arena lock turns "I misjudged this"
into "the run is over with no counterplay" — shielding the reward gates the loot without removing
retreat.

**Three wardens, three different machines** (`src/entities/Palewake.ts` / `Kilnborn.ts` /
`Sanguinarch.ts`). All extend `Enemy`, fully override `update()`, and route area damage through
`checkPlayerHit()` → `applyDamageToPlayer` so dash i-frames and armor just work. That is where the
similarity stops — `Gloamwarden` and `Cinderwrought` both run
`idle → telegraphing → executing → recovering (+poise → staggered)` where **the punish window is
always "chip the poise bar"**, and none of these three do that:
- **Palewake** (gloam → Blink) — *a stalker you cannot always hit.* `stalking` (near-invisible AND
  **untargetable**, the Sandmaw's rule) → `manifest` → `tether` (channels a draining beam that will
  not stop on its own) → `unravel` → `vanish`. **No poise bar.** The only opening is **breaking the
  tether by putting a wall or pillar between you** — a segment-vs-rect test against the crypt's own
  wall list, i.e. a dodge verb that only exists because this phase introduced interiors. Riding the
  channel to its natural end gives you nothing. Its vault seeds extra pillars, and it picks flanks
  with **clear** line-of-sight (a fix caught in verification: without it, it could resolve behind a
  pillar and hand out a free unravel).
- **Kilnborn** (ember → Nova) — *the room is the boss.* Driven by a **heat meter that rises as it
  acts**. Rising heat sets the vault floor alight tile by tile (32px grid, up to 62% of the room —
  the tile size was cut from 48 after a live check showed a vault holding only 12 tiles, making
  "cold ground" five chunky squares); at full heat the **backdraft sweeps exactly the burning
  floor**, so the dodge is not a direction, it's standing on cold ground. The punish window is
  `venting`, and it arrives on the **boss's** clock — you survive to it, you can't force it.
- **Sanguinarch** (blood → Bloodpact) — *you set its phase.* Its flurry stacks bleed (existing
  `pendingBleed`); every ~5s it channels a **feed that resolves against your state at the end** —
  bleeding when it lands and it drinks (heals 45) and swells into `engorged`: slow, huge slams, and
  1.7× incoming damage. Deny it and it just stays a fast, frantic, never-vulnerable frenzy. Bleeding
  is the only way to buy an opening, and it costs you. (`MainScene` pushes `playerBleeding` each
  frame, the same way `envSpeedMult` is pushed — `update()`'s signature can't express player state.)

**Scene wiring.** `activeCrypt` gates the world systems that must not run underground: the player
clamp (crypt footprint instead of the world circle), map reveal (no fog painting of the pocket;
minimap hidden via a new `MinimapUI.setHidden`, biome label shows the crypt's name, world map
refuses to open), the surface respawn tick, the nightfall surge, and the dawn cull. `NightOverlayUI`
gained an `underground` mode — **0.94 alpha of near-black vs night's 0.42** — because at night's
value you could still make out the neighbouring crypt's floor across the void. Interior braziers are
kept **per crypt** (`SunkenCrypt.braziers`) and only lit for the crypt you're in: verification found
**7 neighbouring braziers inside camera range** that would otherwise have hung glowing in the dark
beside you. Crypt dwellers are tracked in a `cryptEnemies` set and **excluded from the surface
respawn budget** (57 of them would have permanently eaten a third of `RESPAWN_MAX_LIVE`), and pinned
to their own crypt each frame (`containCryptEnemies`) — enemies keep the standing
"not blocked by terrain" rule, so doorways aren't a free escape, but a wanderer can never leak into
the void. Entrance positions are picked before any spawning with a `CRYPT_CLEAR_RADIUS` exclusion in
all three samplers (the standing "POI busy = missing exclusion zone" rule). Discovery reuses the POI
quartet with a **per-theme map marker**, so the map itself tells you which ability is buried where.

**Verified live** (`javascript_tool`, each test self-contained): 6 crypts, two per theme, 5-7 rooms,
601 wall bodies of which **zero** overlap a room center; every interior **15488+ px** from world
center (outside the 14000 radius); all 6 doorways in real bayou, min spacing 1745, **0 surface nodes
inside the exclusion** (closest 204px) and 1 cluster-jittered Mosswretch at 190px (the bayou
spawner jitters members after the exclusion check — noted, harmless, arguably a guard); enter →
lands in the entry room, exit → back at the doorway; **shoving into a wall at 400px/s moved 10px,
the same shove in open floor moved 166px**; darkness forced to 1 in-crypt while the sky read 0;
sealed geodes gave **no prompt and could not be mined**, then cracked to the **correct themed gem**
(gloam→`geode_gloam`, ember→`geode_ember`, blood→`geode_blood`) + moonsilver seams, and a cracked
geode mined out in 3 hits to a real drop; chests rolled varied loot; Palewake ticked **10 magic**
with clear LOS and **unravelled 400ms after a wall was interposed** (`isStaggered` 1.6×); Kilnborn
lit 31/50 tiles at full heat and dealt **58 fire + 260 knockback on burning ground vs nothing on
cold ground**, `venting` 1.7×; Sanguinarch **never engorged across 400 ticks while the player wasn't
bleeding** (health flat) but healed 200→280 and engorged (scale 1.85, slam 50 + 220) when they were;
all three classify as `elite` kills; a forced respawn tick + nightfall batch inside a crypt spawned
**0**; a dweller shoved 900px outside its bounds was pinned back inside. `tsc` clean, **zero console
errors**, screenshot captured of a torchlit interior.

Also fixed in passing: `promptFor()` now refuses `shielded`/`harvested` nodes directly. `updateHover`
already filtered them, but the crypt vault's entire material gate rests on that rule, so it's stated
at the prompt layer too rather than living in one loop's filter.

**SAME-SESSION FIX — dungeon collision + pathing (the user: "enemies aren't respecting collision and
aren't pathing through the hallways/rooms... spawning/moving outside of the walls").** Two real bugs
plus the design consequence of fixing the first:
1. **Dwellers walked through walls.** `Enemy.collidesWithTerrain` defaults to FALSE — the standing
   rule, because out in the world solid things are boulders (cover, not structure) and a straight-line
   chaser wedges on them. In a dungeon the wall IS the structure, so crypt dwellers now set the flag,
   which the existing collider's process callback already gates on (no new wiring).
2. **Vault nodes could sit inside the walls.** The geode/seam rings used fixed 96/132px radii, but a
   vault could be 192×160, so the outer ring landed in rock. Radii are now a fraction of the room's
   tightest half-span (plus a clamp), and `CryptLayout` picks the vault from the FAR HALF of rooms by
   **largest area** rather than distance alone (distance alone once handed the boss fight a cupboard).
   Room minimums went 6×5 → 8×7. Measured after: **0 of 36 vault nodes and 0 of 43 live dwellers off
   the floor plan.**
3. **Turning collision on immediately reproduced exactly what the default protects against**: a
   Murkling closed 545px → 276px and then pressed into a wall for 35 straight intervals. Rather than
   revive the per-frame obstacle-avoidance heuristic this codebase deleted once already, crypt
   dwellers now **navigate the structure that already exists** — `CryptLayout` gained a tiny nav
   graph (rooms + corridors as nodes, adjacency = a ≥24px overlap, BFS memoized per layout) and
   `MainScene.steerCryptEnemy` **re-aims the velocity the AI already chose** toward the next doorway.
   Three iterations were needed and each failure is worth recording:
   - **Substituting a fake doorway TARGET doesn't work.** Every enemy with reach thinks it has
     arrived and plants, swinging at air (a Mosswretch's ~100px reach froze it 710px away). Steering
     velocity after `update()` keeps the AI seeing the real player for every range/attack/give-up
     decision.
   - **Pushing the waypoint past the doorway breaks the safety property.** The overlap region is a
     rectangle inside both rects, and rectangles are convex, so a straight line to it never leaves
     the floor; a point 70px beyond it does, and enemies drove into a wall forever.
   - **Re-planning every frame oscillates.** Rooms and corridors overlap, so at a junction an enemy
     is inside three rects at once and "which rect am I in" flips frame to frame (velocity seen
     alternating ±25 while the position held still). Fixed with `rectIndexAt` picking the DEEPEST
     containing rect, a committed per-enemy waypoint (re-planned on arrival or after 1.2s), and a
     look-ahead for the degenerate case where the first seam is the spot you're already standing on.
   Verified: a Murkling pathed **503 → 424 → 325 → 264 → 157 → 20px** through two doorways onto the
   player, and left running, **every** dweller in a crypt (7 Murklings + a Fenlurker) crossed the
   dungeon and ended up within 9–36px of the player while the leashed Kilnborn stayed in its vault at
   501px. Containment now snaps anything off the floor plan to the **nearest** floor point (a net for
   burrows/leaps/knockback, not the thing keeping them in). The Palewake gained an `arena` so its
   flanks are clamped to its vault (20/20 picks on floor) — with collision on, a flank in the rock
   would leave it tethering with no line of sight, handing out a free unravel every cycle.
   **Test-harness note:** the 30s `CHASE_GIVEUP_MS` deaggro silently confounds a long pumped chase
   test — re-arm `forceAggro` each interval or you'll read "stuck" where the enemy simply gave up.

**SAME-SESSION — room-discovery lighting, blink clipping, and dropping the torch tax (the user:
"discovering a room should light up the whole room, sort of like a fog of war"; "how will the
teleport work in here — should we just not allow it?"; "not a big fan of the requires-torch
mechanic").** All three are the same decision from different angles, so they landed together:
- **A crypt is lit by DISCOVERY, not by equipment.** Setting foot in a room or corridor lights that
  whole space permanently (`SunkenCrypt.discovered`, a per-run set of layout rects), so an explored
  crypt reads as a lit floor plan with the unexplored parts still black — fog of war, not a torch
  radius. `ScreenLight` gained optional `width`/`height` so the existing soft brush can be stretched
  to a room's footprint; each discovered space erases **twice** (a wide halo that softens onto the
  walls, then a core pass at the room's own size), because the halo alone left room edges ~40% dark
  and a "lit" room that reads murky defeats the point.
- **The torch is now a bonus, not a toll.** The player carries `CRYPT_AMBIENT_LIGHT` (120px)
  underground regardless of what's equipped; a torch/lantern widens that pool (180px+) instead of
  being the price of seeing anything. The `crypt_dark` hint was reworded to teach the discovery rule
  rather than sell torches.
- **Gloamstep Blink is CLIPPED, not banned.** Forbidding it was the other option the user raised, but
  the gem that grants it is crypt loot, so a dungeon is the last place it should stop working.
  `clipBlinkToFloor` marches the blink line in 10px steps and lands on the furthest point still on
  floor — stepping rather than testing the endpoint is the whole trick, since a destination can be
  perfectly valid floor on the *far side* of a wall. Verified: all 8 directions from a room center
  land on floor, clipped to 110–160px by the room's own walls, while a surface blink still travels
  its full 220px. `clampPlayerToCrypt` also now snaps the player out of rock as a last resort, for
  any future movement that doesn't ask permission.

**Not done / next:** **4d — surface POIs + the Miretyrant boss**, which becomes the new win-con
(demoting the Duneshaper to a mid-boss and finally making its Heart, and therefore the ability
jewelry, obtainable). Crypts do not respawn once cleared, and there is no crypt-specific minimap —
both deliberate.


### B3-P4d(2) — Biome-3 Phase 4d, session 2: the Miretyrant, its lair, and the win-con swap (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4d-miretyrant.md`. The second half of Phase 4d, and the payoff
for session 1: `tyrant_sigil` and `gorge_bone` shipped inert, and this is what consumes them.
**The bayou boss is now the game's win-condition**, demoting the Duneshaper to a mid-boss exactly
as biome 2 demoted the Gremlin King.

**Locked this session (`AskUserQuestion`, all four as recommended):** adds = **bellow waves**
(periodic clearable batches — punctuation, not a crowd-control job; rejected a continuous Broodmaw
trickle and mandatory phase-locked packs); interior = **approach + arena** (rejected a bare single
chamber, which makes the descent a loading screen, and a full 5-7 room crypt, which would read as a
7th crypt); **no arena seal** (4c's lock — hardcore + no escape = no counterplay; retreat resets it);
**one fixed lair**, revealed on the map when the effigy is crafted.

**The key.** New `miretyrant_effigy` recipe (misc, tier 1 — Workbench proximity, deliberately **no**
workbench-TIER gate, since its real gate is the POI materials): `2 Tyrant Sigil + 1 Gorge Bone +
4 Mirehide` = two survived shrine rites, one cleared Drowned Lodge, and gator hide to bind it.
Crafting it fires `onMiretyrantEffigyCrafted()` — a direct mirror of `onTyrantTotemCrafted()` —
which drops the `map_gorge` landmark and a directional nudge, because a single door in a 28000px
world is not findable by exploration.

**The descent.** One **Sunken Gorge**, position picked in `create()` before any spawning with its
own `GORGE_CLEAR_RADIUS` (300) added to the single `insidePoiClearing()` session 1 consolidated —
so the new POI needed adding in exactly one place, which is what that extraction was for. Sealed it
prompts `[LMB] Break the seal` (prompted even while sealed, the tyrant-altar precedent, so the site
reads as real content before you can use it); clicking without the effigy logs why nothing happened.
Offering it swaps the maw texture, shakes the camera, and the site becomes a crypt doorway.

**Generalizing the dungeon, not copying it.** Two small changes rather than a parallel system:
`CryptLayout.generateCrypt` gained an optional **arena cell size** — that room is placed first,
becomes the layout's `vault`, and `entry` becomes the room furthest from it (rooms reordered so
index 0 is still the entry), because a 2.6x boss plus adds plus dodging room does not fit in a
random 8-12 cell room. And a new `src/systems/Dungeon.ts` **`DungeonInterior`** interface captures
exactly what MainScene's underground paths already wanted (name / x / y / layout / entryPoint /
braziers / discovered / exitStairs / enemies): `activeCrypt` became `activeDungeon: DungeonInterior`,
`SunkenCrypt` gained a `name` getter, and the player clamp, room-discovery lighting, brazier lights,
crypt-nav steering, containment net, exit-stairs hover and every "don't run surface systems down
here" gate now serve both with **no branching**. The floor/wall/prop/stairs builder was likewise
**extracted, not duplicated**, into `renderDungeonShell()` — all of it was about being underground,
none of it about being a crypt. The lair's interior lives in a new `LAIR_REALM` rect in the same
dead corner outside the world circle, below `CRYPT_REALM` and non-overlapping (measured: nearest
corner 14751px from world center vs `WORLD_RADIUS` 14000).

**The Miretyrant** (`src/entities/Miretyrant.ts`) — bespoke telegraph/poise AI on the GremlinKing /
Gloamwarden / Duneshaper lineage, a trimmed sibling and **not** a shared framework (the standing boss
lock). HP 3200, poise 450 (stagger x1.35 / 2.2s), scale 2.6, regen 16 HP/s deaggro'd, leash 620.
Where the Duneshaper is a caster that holds 220px and throws magic, this is a **bruiser** that closes
to ~96px and stays there, so every dodge is a spacing dodge: **Lunging Chomp** (locked heading, step
off the line), **Tail Sweep** (165px / ±120° — dodge by distance or dash, a sidestep never clears
it), **Muck Slam** (radial, growing telegraph), and a phase-2 **Death Roll** (a travelling multi-hit
spin you outrun across, never along — the only attack that can hit you twice). Resistances
`{ slash: 0.8, blunt: 1.2, poison: 0.25 }`: a thick swamp hide that folds to a warhammer, deliberately
**not** the Duneshaper's fire-weakness so the two finales reward different loadouts. Phases: Death
Roll at 65% HP, enrage timing + halved bellow interval at 35%, multipliers captured at state entry.
**The bellow runs on its own clock**, not in the attack pool, so it lands as punctuation between
attacks; the boss only ASKS (`consumeBellow()`) and MainScene resolves the spawn — the same contract
`checkPlayerHit()` uses, which is what gets the adds terrain collision, crypt navigation and
containment for free. Adds surface at the arena's edge (never on the player), 3 per bellow / 5 enraged,
hard-capped at 8 concurrent.

**Win-con swap.** A `Miretyrant` kill fires `endRun("won")`; the `Duneshaper` branch is gone. It
joins `classifyKill` as `"boss"`, `engagedBigBoss()` (the top-of-screen bar), `staggerMultiplierFor`,
the `checkPlayerHit` boss union, the boss prompt color, and both `isBoss` exclusions (respawn +
`__dev.killall`). The Duneshaper's **Heart** — which gates the Gemwright's Table's ability-jewelry
tier and had been unreachable since B3-P2b because killing it ended the run — is finally obtainable,
along with its Tier-2 boss trophy. `__dev.spawn("miretyrant")` added.

**Verified live** (`preview_eval`; the Browser pane is hidden in this session so the render loop was
driven with `game.loop.step` and **screenshots were not possible** — everything below is state
assertion, not a visual check):
- **Placement:** gorge at r=8241 (bayou band 6400-10500), ≥1215px from every other POI type, **0**
  wild nodes and **0** wild enemies inside its 300px clearing.
- **Interior:** 4 rooms / 6 corridors / 133 merged wall runs; arena 832×576 and the largest room;
  entry is `rooms[0]`, is not the arena, and sits 1298px from it; every room inside `LAIR_REALM`;
  8 inhabitants, and the **only** thing in the arena is the boss.
- **Key loop:** recipe discovered once the materials are known + a bench exists; crafting consumed
  exactly 2/1/4 and produced 1 effigy, set `lairRevealed`, added the `map_gorge` landmark and logged
  the directional nudge. Clicking the sealed maw with no effigy: no state change, logged "The seal
  holds." Offering it: texture → `gorge_maw_open`, prompt → "Descend into the Sunken Gorge".
  Descend put the player exactly on `entryPoint` with the label reading "The Sunken Gorge"; the exit
  stairs prompted and returned them 60px from the maw.
- **Boss:** aggro'd at range, registered on the big boss bar, cycled
  idle → telegraph → execute → recover through all three base attacks. `checkPlayerHit` geometry
  asserted case by case: chomp 60px hit / 90px miss; sweep front hit, **behind and 200px both miss**;
  slam 140px hit / 170px miss and **once per attack**; roll hits, is blocked for its 420ms interval,
  then hits again, and misses at 120px; nothing at all outside `executing`.
- **Phases:** at full HP the pool never offered the roll; at 60% it did. At 30% the boss was enraged
  and the bellow added 5 at once, stopping exactly at the cap of 8. Every add was terrain-colliding
  and in `cryptEnemies`, all 12 live lair enemies were on floor, and nothing else was in the realm.
- **Win-con:** a Duneshaper kill scored as a boss, left `runOver` false, and yielded its Heart; a
  Miretyrant kill classified `"boss"` and ended the run with outcome `"won"` and the victory screen.
- `tsc --noEmit` clean; **zero console errors**.

**A verification gotcha worth recording** (it cost a bad reading, and the session-1 addendum warned
about the same class of thing): `__dev.god()` is a **toggle**. Calling it twice re-armed death, the
planted test player died, and hardcore's `runOver` guard silently froze `update()` — so a boss that
was cycling fine read as "stuck in telegraph for 53 seconds". Any "nothing is happening" result
underground should be checked against `isDead`/`runOver` before it is believed.

**Next: Phase 5** — the post-big-boss RNG reward choice. With the win-con moved, the Gremlin King and
the Duneshaper are both non-run-ending big-boss kills, which is exactly the trigger Phase 5 wants.

### B3-P4d(1) — Biome-3 Phase 4d, session 1: the bayou's surface POIs (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-4d-pois.md`. Phase 4d is **sliced into two sessions** (the user):
this one builds the two surface POIs and the boss-key economy they feed; the next builds the
**Miretyrant** and the win-con swap. **Amendment locked this session: the Miretyrant lives in its
own boss-level DUNGEON, not on the surface** — so next session reuses 4c's `CryptLayout`/
`CRYPT_REALM` interior machinery for a bespoke arena, and the altar/totem summon becomes "unseal
the descent." Both POIs were picked by the user (Sunken Shrine + Drowned Lodge) along with the
summon model (altar + totem whose components drop here).

**The problem this solves.** Outside the six crypt doorways the bayou had no surface destinations —
just wild spawns and scattered nodes. The locked surface/dungeon split says the surface's job is to
*feel dangerous and murky while you hunt for a way in*, which needs places to go.

**Deliberately two different verbs.** Every POI in the game so far — Gremlin Shack, Warren, Sunken
Forge, Gloaming Vein, and now the crypts — resolves as "something guards a thing, kill it, take the
thing." Neither of these does.

- **The Sunken Shrine (`src/entities/SunkenShrine.ts`) — a rite the PLAYER starts.** Dormant when
  found; spending an offering (**3 Blight Gland + 2 Gloam Dust** — both Phase-4b roster drops with
  no other use, so the rite finally gives the bayou's trash mobs an economy) kindles it into a
  three-wave defense fought on the spot: a **Murkling** swarm → **Blighttoads + Murklings** → a
  **Mosswretch pair (one elite) + Blighttoads**. Each wave lands when the last is cleared *or* when
  the interval elapses, so a fast player gets pace instead of waiting. **Leash:** drifting outside
  `SHRINE_RITE_RADIUS` (420) for more than 5s (or going underground) lapses the rite — the offering
  is spent, the site is not, and everything it summoned is destroyed rather than left roaming.
  Surviving opens the bowl (a `LootContainer` through the existing `ChestMenu`) with a **guaranteed
  Tyrant Sigil**. Emptying the bowl returns it to dormant, so it is a **renewable** source, not a
  one-shot clear — no timer needed, which is why shrines are deliberately absent from
  `updatePoiRespawns`. Progress is carried by the fire alone (three textures + a glow that stokes
  per wave); no new HUD.
- **The Drowned Lodge (`src/entities/DrownedLodge.ts`) — a place whose danger is its geography.**
  A half-submerged stilt village: one boardwalk, 4-6 huts on platforms either side, pilings.
  **No script at all** — `Corpselight` haunts drift over the huts and `Mirejaw`s lurk in the water
  beneath the planks, and the planks are the only safe footing (stepping off is 4a's 0.5× deep-water
  slow with the swamp's signature ambusher already there). The payoff is **spread across per-hut
  caches** so you work the site instead of opening one chest; the **last hut is the chieftain's**,
  planked shut until every haunt is dead, holding the richest cache and a **guaranteed Gorge Bone**.
  A barred hut is skipped by hover/prompt/interact entirely — the same reveal-nothing treatment a
  shielded `ResourceNode` gets, so the bar is the only tell. Respawns on the existing S4
  `POI_RESPAWN_MS` timer once every cache is emptied.

**Boss-key materials.** `tyrant_sigil` and `gorge_bone` (new `ResourceType`s/`ItemDef`s/icons,
curio category, bayou tab) ship as **inert drops** surfaced by the discovered-material toast. No
recipe yet — deliberately, so this session doesn't leave a dead-end craftable in the menu; next
session's effigy + sealed descent consume them. Both descriptions gesture at something vast in the
deep mire without naming it (the Gremlin Totem no-spoiler precedent).

**One real bug caught in verification.** The placement assertion found 2 wood nodes inside a
Drowned Lodge (241px and 228px, inside its 280 clear radius). Cause: the POI-clearing exclusion
list was **duplicated in three samplers**, and only `pickBayouPoint` learned about the new POIs —
`pickBadlandsPoint`/`pickOuterForestPoint` didn't (bayou blobs neighbour badlands ones), and
`scatterInZone` had no POI check at all, so a big macro-zone's *edge* could scatter cypresses into
a POI. Fixed by extracting **one `MainScene.insidePoiClearing(x, y)`** consulted by all four paths,
which removes the duplication rather than adding a fourth copy — any future POI now only has to be
added in one place. Re-verified: **0 violations across 2162 nodes and 1043 enemies**, with world
content otherwise unchanged.

**Verified live** (`preview_eval`, one eval per timed sequence): 4 shrines + 4 lodges, all dominant
bayou, radii 6425-10498, min spacing 3273/2884 and cross-type 1387 (≥ `POI_MIN_SEPARATION`); the
full shrine cycle (offering consumed exactly 3/2 → wave 1 = 5 Murklings → wave 2 = 7 → wave 3 =
Mosswretch+Blighttoads → open with `tyrant_sigil`), bowl emptied → dormant → re-kindles, and the
leash lapse cleaning up all 5 summoned enemies and re-kindling after; lodge huts (5 huts, 3
Corpselights, 3 Mirejaws), chief barred → **null prompt** + barred texture → unbars on the last
haunt's death → `gorge_bone`; the full respawn (fully-looted → armed → reset re-bars, re-rolls, and
re-populates); discovery adds exactly one landmark + one `"poi"` toast per site and is idempotent;
all 16 new textures present. Screenshots day + night at both POIs (the lit shrine reads as a teal
fire in the dark; the lodge's wider light hole covers the whole village). `tsc` clean, **zero
console errors**.

**Gotcha worth remembering for future preview runs:** two probes silently produced nonsense because
the player had *died* in an earlier probe — hardcore's `runOver` guard early-returns `update()`, so
every polled system (including the rite) freezes while the scene still looks alive. Check
`isDead`/`runOver` before trusting a "nothing happened" reading, and keep timed sequences inside a
single eval.
### B3-P5 — Biome-3 Phase 5: the post-boss reward choice (boss-trophy relic pick) (2026-07-22, Opus)

Plan: `.claude/plans/biome-3-phase-5-boss-relic-choice.md`. **The last phase of the biome-3 +
new-systems arc — the umbrella is now COMPLETE.**

**The umbrella's spec changed during the locking pass.** It called for a kill-time modal (a
full-screen 3-card picker of relic / ability / stat boon / gem / special item). the user
redirected: *"it can be a relic but now im thinking when you roll the boss trophy, instead of it
outright giving you a single random relic, you get 3 random relics to pick from of the pool —
within the relic forge menu."* So the choice moved **out of a kill-time modal and into the Relic
Forge**, riding the boss trophy a big-boss kill already drops. That's strictly better here: the
reward is still gated on a big-boss kill (`boss_refined_trophy` / `boss_refined_trophy_t2` drop
from the Gremlin King / Duneshaper and nothing else), it reuses the forge's slot-machine reveal as
the drum-roll instead of building a second modal that would compete with it, and it needs no new
pause/freeze surface. It's also a **better decision than the original**: boss trophies already
guarantee a Mythic and there is exactly **one Mythic per family** (8 total), so "pick 1 of 3" reads
as **"which family gets your Mythic?"**.

**Locked:** boss trophies only, but as **data** (`TrophyRoll.choiceCount`) rather than an
`isBossTrophy` branch — any future trophy opts in, and an absent field means the original
one-relic behaviour, so every existing trophy is untouched. **Commit — pick one, no skip, no
reroll** (locked via `AskUserQuestion`). Candidates are **distinct ids**, reusing S4's existing
rule that never re-offers an owned Rare/Mythic. **Ownership is not written until the pick**: the
roll fixes the rarity + candidate set at click (so an interrupted spin still can't change the
outcome — the existing "theatre over a known result" invariant), and the family slot is only
written by `commitCandidate()`. Picking then runs the **normal family-dominance path**
(replace/decline/ambiguous) rather than force-equipping, so a hand-written pool that broke the
one-Mythic-per-family assumption still can't corrupt the loadout model.

**Implementation.** `Relics.ts`: `TrophyRoll.choiceCount` (3 on both boss trophies),
`RollResult.candidates`, the family-conflict tail of `roll()` extracted into a private
`place(id, powerTier, trophyKey, base)` shared by both paths, plus `pendingCandidates` state +
`hasPendingCandidates()` / `pendingCandidateIds()` / `commitCandidate(id)` (which **validates that
`id` was actually offered**, so a stale or forged click can't grant an arbitrary relic).
`RelicForgeMenu.ts`: a 3-row card picker in the result region — name, family, tier-scaled effect
text, and **what it would displace** (`Replaces Titan Totem` vs `Fills your empty Stamina slot`),
folded into `choicePending()` so it blocks further rolls + tab switches. `RelicRevealFx.ts`: its
`success` test required `result.id`, which a pending pick doesn't have — widened, else a
guaranteed Mythic played the **crumble fizzle**; the banner names the rarity only
("Mythic — choose your relic") since the cards do the naming. `MainScene.ts`: a `commitCandidate`
dep + `commitRelicCandidate()`, and `announceRelicResult` defers the "Relic forged" log to the
pick (there's no relic to name until then).

**Closing the forge mid-pick auto-takes the first card.** The trophy is already spent and the roll
is a guaranteed Mythic — declining it the way an ambiguous family conflict declines would silently
burn it. (The standing rule is "a spent trophy always yields something.")

**Verification** (live, `preview_eval`; `tsc` clean, zero console errors). A boss roll yields 3
distinct Mythics with **no** ownership change and `hasPendingCandidates()` true; committing grants
**exactly** the picked id; a foreign id and a double-commit both return null without touching the
loadout; 12 Common rolls never offer candidates and always carry an id on success (the normal path
is unchanged); committing a candidate that contests an owned family cleanly **replaced** a Common
Bloodroot Charm with the T2 Mythic Bloodlord's Mantle; the real card click commits the clicked card
(not the first); a second roll while a pick is pending is refused with **no** trophy consumed; and
closing mid-pick auto-commits candidate 0 and unblocks rolling. Trophy consumption is exactly 1.
The reveal was confirmed to play `★ MYTHIC! ★` rather than "Crumbled to dust…".

**One real bug caught in verification** — the same layout class that bit the Phase-5 relic rework:
the result region's reserved height was 6px short, so the relic grid's own "Your Relics" header
**overlapped the last card**. Re-measured (22px picker header + the card stack + 30 for the grid
header) and re-asserted with exact pixel gaps: now a 14px gap, panel still fully on-screen.

`RECIPES.md` + the dashboard's trophy-source notes updated (and a **stale RECIPES line** fixed
along the way: the Tyrant Trophy was still documented as "unreachable in practice", which
B3-P4d(2)'s win-con swap had already made false).

### B4-P1 — Start-of-run base character (2026-07-22, Opus)

Plan: `.claude/plans/b4-p1-start-of-run-character.md`. **The first milestone after the
biome-3 umbrella closed**, and the roadmap's own top deferred candidate
(`biome-3-and-new-systems-roadmap.md`, Phase 5 "Later"). Every run used to start identically —
a level-1 `PlayerProgression` with 0 stats, an empty backpack/`Equipment`, an empty Q/E/R bar —
so the roguelike loop varied how a run *went* but never how it *began*. Now a **run-start
class picker** offers a fixed roster of five survivors, each bundling stats, a kit, a granted
ability, and a lasting double-edged trade-off. It also closes a real dead end: the B3-P2a
ability framework was only reachable via the Sunken Crypt wardens or `__dev.give`, so most runs
never touched it.

**Locked with the user (`AskUserQuestion`):**
1. **Fixed roster, always all available** — not an RNG 3-card draw. The pick is a playstyle
   decision, not a dealt hand.
2. **One card bundles all four axes** — identity + starting stats + kit + ability + modifier.
3. **Modifiers are double-edged with NO score effect.** `Run.score()` stays kills +
   speed-scaled completion bonus, so a harder card can never become a leaderboard lever
   (verified: score is byte-identical across characters for identical run inputs).
4. **The "innate" ability is a real ability-granting SPECIAL ITEM pre-equipped in its slot**,
   not a separate innate channel — it fills exactly the same mechanical role as any other
   equipment. This meant **zero new ability plumbing**: `recomputeAbilities()` already derives
   Q/E/R from `ItemDef.grantsAbility`, so unequipping the special darkens the key (verified).

**`src/systems/Characters.ts`** (new, framework-free like `Run`/`Buffs`/`Relics`) is pure data
plus a `RunCharacter` accessor **whose getter shape mirrors `RelicManager`'s**, so every hook
site reads a character exactly the way it already reads relics. A null character returns
neutral values throughout, so the game stays playable if the picker is ever bypassed. The
roster: **Vagabond** (Blink; +10% move / −10% stamina), **Reaver** (Bloodpact; +25% damage
dealt / +25% taken), **Ashcaller** (Nova; +30% XP / −15% HP), **Warden** (Blink; +20% HP /
+20% attack stamina), **Ascetic** (Nova; −20% damage taken / elites twice as common, and no
starting kit at all).

**`src/ui/CharacterSelectUI.ts`** (new) is a five-card modal in the `WelcomeUI` style — flat
`scrollFactor(0)` objects (never a Container, per the standing input-hit-testing bug), depth
band 3620+. **Select-then-confirm**, because a mis-click would silently decide a whole hardcore
run; committing is final, and there is deliberately **no cancel path** (Esc is guarded — a run
must have a character).

**MainScene:** the picker **chains off the welcome overlay** rather than stacking on it, and —
unlike the welcome — shows on **every** run including New Run. It reuses the welcome/pause
freeze verbatim, so **deciding your build never burns speedrun time** (verified: `run.elapsedMs`
holds at 0 across stepped frames while it's open). Each **modifier adds exactly one term at an
existing choke point** — `damageBonusMult`, `applyDamageToPlayer`, the `moveMult` sum,
`awardSkillXp`, `effectiveStaminaCostMult`, `rollElite`, `syncStatBonuses` — never new math. Two
deliberate placements: the character's damage-taken scales `amount` **before** the reduction
bucket (it's a property of the run, not another stackable resistance, so a +25% card can't be
erased by the 75% reduction cap), and its HP/stamina % is a **third independent linear add** off
the 100 base, matching the 2026-07-15 additive rule so it can't compound with relic %. The run
HUD and run-end screen both name the survivor.

**Verified live** via `preview_eval` (the backgrounded-tab render loop needed the `loop.step`
trick): the welcome→picker chain and its freeze; the full grant for multiple cards (stats,
pre-equipped special, tools onto the hotbar, empty-kit case); Q/E/R lighting up **through the
item** and going dark on unequip; a granted ability actually casting; every modifier hook
measured against a neutral baseline (damage dealt 1→1.25, taken 20→25 and 20→16 **including the
magic/armor-bypass branch**, XP 10→13, stamina 1→1.2, elites 1663→3223 per 20k seeded rolls,
pools 112→97 HP and 106→96 stamina); score isolation; and `scene.restart()` leaving **zero**
carryover. Card geometry was measured rather than eyeballed — the first pass left ~150px of dead
space per card, so `CARD_H` was cut 512→400 against the real content bottom. `tsc` clean, zero
console errors. Dashboard gained a **Characters** tab importing `Characters.ts` live (drift-free);
no `RECIPES.md` change (no recipes touched).

### B4-P2 — Epic loot pool + starter-ability nerf (2026-07-22, Opus)

Plan: `.claude/plans/b4-p2-epic-loot-and-starter-abilities.md`. Two problems that
turned out to be one problem.

**The bug in the design B4-P1 shipped:** all five characters were pre-equipped with
`special_gloamstep_band` / `special_gloam_focus` / `back_bloodpact_shroud` — which are
**byte-identical to the terminal outputs of the Gemwright jewelry chain**
(`Jewelry.ts`). Earning one legitimately costs Duneshaper → Duneshaper's Heart →
Gemwright tier-1 upgrade → find a crypt → beat a bespoke warden → crack the vault geode
→ moonsilver + gem. The whole crypt→gem→jewelry progression had **no reward left at the
end of it**. **The system that was specced and never built:** the biome-3 roadmap's Phase
2b called for a shared low-chance special-item pool on every chest table; 2b shipped only
the jewelry half, and there was no `EPIC_LOOT` anywhere in `src/`.

**Locked with the user (`AskUserQuestion`, all as recommended):** lesser variants of the
same three abilities (not new starter abilities, not stripping them); the epic pool holds
new found-only abilities *and* passive uniques; the pool is **tiered by POI depth**; a
rare drop gets a distinct toast plus a container glow.

- **`AbilityDef` gained `family` + `power`** (`Abilities.ts`). The id names an
  item-granted active, the **family** names the effect `castAbility()` runs, and `power`
  scales every magnitude it reads (reach, damage, i-frames, active window) — cooldown
  stays per-def, so a weaker variant can also be a slower one. That's what lets two grades
  of one effect coexist **as pure data** with no duplicated dispatcher branch. `power`
  multiplies *alongside* (not instead of) the jewelry `abilityPowerMult()` hook.
- **Three lesser variants**, granted by all five characters (`Characters.ts` startingEquip
  swapped; `recomputeAbilities()` needed **zero** changes since it derives Q/E/R purely
  from `ItemDef.grantsAbility` — the same reason B4-P1 needed no ability plumbing):
  Lesser Gloamstep (0.60 power / 9s), Lesser Gloamburst (0.55 / 14s), Lesser Bloodpact
  (0.50 / 30s). **Start-only** — no recipe, no loot entry.
- **Bug fixed while in there:** `abilityEntries()` hardcoded `key === "r"` for the active
  glow, i.e. it assumed R == Bloodpact. Generalized to `activeUntilFor(def.family)`.
  Verified it matters: with Aegis on R the old check read `bloodpactUntil` (0) and would
  have reported the slot inactive mid-window.
- **Three found-only actives**, each reusing a proven primitive rather than inventing a
  system: **Gravebind** (castNova's loop with the shove inverted — yank to a hold ring +
  slow, no damage), **Spirit Lance** (a 420px line through the shared
  `dealAbilityDamage(…, "magic")` helper, so resists and the damage-number tint come free;
  only new geometry is a point-to-segment distance), **Drowned Aegis** (a timed window
  added into the **existing additive reduction bucket**, so it lands under the shared 0.75
  cap and can never be stacked into immunity).
- **Six passive uniques** + a genuinely new `statusResistPct` channel on `EquipPassive`
  (bleed/poison dose mitigation — nothing owned status resistance before, so it collides
  with neither the relic combat-stat layer nor heavy armor's magic/fire mitigation).
- **`src/systems/EpicLoot.ts`** (new, framework-free) owns the three tiered pools; the
  roll lives **inside `LootContainer.rollIfEmpty`** because that method's `rolled` flag is
  the real gate — whichever of the seven call sites fires first wins, so putting the roll
  beside it would have been a coin-flip. A `rollContainerLoot()` helper + `epicPoolFor()`
  keyed off the **loot table's identity** (the table *is* the POI's identity) means no
  call site carries a tier argument that can drift, and a future POI gets it by
  construction. New `"epic"` `LogKind` routes to the prominent gold center toast with no
  UI code (it just isn't `"recipe"`/`"material"` in `onNewEntry`), fired from
  `discoverMaterial()` — already the choke point every container move reconciles through.
  The container glow is a **tint swap on the glow each POI already has** (taking the
  container's own base tint as a param so existing per-POI colours are preserved), NOT a
  second glow object — so there's no extra infinite tween to leak.

**Verified live** (`preview_eval`, all measured not eyeballed): blink **132px lesser vs
220 full**, nova **17 dmg/82px vs 30 dmg/150px**, bloodpact **3.0s/17.5% vs 6.0s/35%**,
every cooldown exact (9/6/14/10/30/24/14/12/26s), Ring of Quickening still multiplies
(×0.85 → 6000→5100ms); gravebind pulls at 100/250px and not 400px with the slow applied
only to those pulled; lance hits on-axis, misses 60px off-axis and past 420px, and scales
by the target's magic multiplier (a Hexling is **weak** ×1.25 → 55→69, so the resist layer
routes correctly); Aegis 100→40 dmg and **clamps at 25 when stacked with a −50% relic**
(the cap holds); Mireborn Cloak −30% on both bleed and poison DPS. **Epic rolls: 20k per
tier → 4.04% / 6.00% / 8.13% vs spec 4/6/8%, zero double-epics, every pool key reachable,
actives T3-exclusive, re-roll idempotent** — plus **4000 rolls through the REAL in-game
shack path** (`respawnShackGuards` → `rollContainerLoot`) at 3.9%, only T1 keys, never an
active. Toast fires as kind `"epic"` while plain materials keep the quiet blue path; glow
tint swaps `#ffd873`→`#fff6d0` and hides when emptied. `tsc` clean; zero console errors;
dashboard gained a live **Epic Loot** tab (3 pools + all 9 abilities); `RECIPES.md`
updated. **Screenshots were not possible this session** — the Browser pane isn't displayed
in this environment, so the ability bar was verified by asserting its render data
(names/textures/cooldowns/active flags) rather than visually.

**Not done / next:** the epic drop has no bespoke reveal FX (the toast + glow are the
whole tell — `RelicRevealFx` is built around a roll, not a pickup); all numbers are
first-pass and want a playtest; the toast dedupes on `discovered`, so a *second* copy of
the same epic won't re-toast (accepted — they're `maxStack: 1` uniques).

### B4-P3 — Class identity: skill affinities + stat potency (2026-07-22, Opus)

Plan: `.claude/plans/b4-p3-class-identity.md`. B4-P1 shipped the run-start picker, but all
five survivors differentiated on the **same shape** — a `RunModifier` of eight global scalar
fields. Nothing about a character shaped **how you grow**, only how big your flat numbers
were, so the Reaver read as "the +25% damage one" rather than a class. This adds the missing
axis as a second, separate channel: `ClassAffinity { skillXpMult, statPotency }`.

**Locked with the user:** both channels; double-edged but **mild** (favoured ×1.4–1.6,
penalised ×0.75–0.85 — nobody is crippled at anything); and **never reduce drops**. That
last one has a concrete consequence — `chopping`/`mining` levels roll the bonus-drop chance
(`Skills.choppingBonusChance`/`miningBonusChance`), so a gathering-XP *penalty* is an
indirect drop nerf. **No character may penalise those two skills**, enforced by a
module-load guard in `Characters.ts` (a `console.warn`, so a future editor trips it in the
dev console rather than in a playtest). The Warden is the only card with gathering affinity,
and per the lock it can only ever be an upside there.

**Two channels, one hook site each** — the point of the design is that neither introduced
new math:
- **Skill affinity** → `MainScene.awardSkillXp` (already the single entry point for every XP
  source). It multiplies **outside** the additive XP bucket on purpose: the bucket is the
  "global +% XP" category, and folding a class's ×0.75 weakness in as −25 would let a couple
  of relics erase its defining downside entirely. A per-skill class scalar is its own
  category, so it composes rather than competes. **Verified**: with Intelligence at 40 the
  favoured/neutral ratio is still exactly 1.6 and the penalised/neutral still 0.75, while all
  three absolute values rose.
- **Stat potency** → lives **inside `PlayerProgression`** (`setStatPotency`/`potency`), not at
  MainScene read sites. That's the whole trick: all eight per-point getters and every stat
  readout pick it up from one place, so **zero** MainScene hooks changed. It also let
  `statTotalEffect()` be refactored to read the getters instead of re-multiplying the raw
  per-point constants — that removed a standing duplication-drift risk *and* made the Stats
  tab reflect potency for free.

**Roster** (skill affinity / penalty · stat potency / penalty): **Vagabond** Running 1.6,
Light Armor 1.4 / Blunt 0.8 · Agility 1.5 / Strength 0.85 — **Reaver** Blunt 1.6, Slash 1.4 /
Magic 0.75 · Strength 1.5 / Intelligence 0.85 — **Ashcaller** Magic 1.6, Ranged 1.4 / Heavy
Armor 0.8 · Intelligence 1.5, Wisdom 1.25 / Vitality 0.85 — **Warden** Heavy Armor 1.6,
Chopping 1.4, Mining 1.4 / Ranged 0.8 · Vitality 1.5 / Agility 0.85 — **Ascetic** Light Armor
1.6, Pierce 1.4 / Slash 0.8 · Endurance 1.5 / Wisdom 0.85. Because skills gate recipe
**discovery** (`Recipe.requiredSkills`), an affinity genuinely changes what a run can build.

**Display** (the feature is invisible otherwise): an `affinityLines(def)` helper **derives**
the card/menu/dashboard text from the maps, so it can never drift from the numbers the way
the hand-written `boon`/`bane` strings can. The picker card gained an `AFFINITIES` block; the
Character menu marks potency-affected stat rows (`x1.5 per point`) and appends the class's XP
affinity to each skill's hover; the dashboard Characters tab gained Affinity/Weakness columns.

**Two things found along the way, both fixed:**
- **The picker card no longer has a guessed height.** `CARD_H` was a hand-measured constant,
  which is exactly the kind of thing that breaks when a section is added. `renderCard` now
  returns its real content bottom and `render()` grows every rect to the tallest card, so the
  box measures itself and a future section can't clip.
- **`Skills.ts` was pulling Phaser in** (via `PLAYER_WALK_SPEED` from `entities/Player.ts`),
  which mattered the moment `Characters.ts` imported `skillDisplayName` — the balancing
  dashboard imports `Characters.ts` and is supposed to be **Phaser-free**. Extracted the
  constant to a new Phaser-free `src/systems/movement.ts`, with `Player.ts` re-exporting it so
  every existing import path still works. Bundling `Characters.ts` standalone went **6.4 MB →
  7.5 KB**. (Worth noting for accuracy: `vite.config.ts` does *not* list `dashboard.html` as a
  build input — it's dev-server-only — so this cost the dashboard page's dev load, not the
  shipped bundle.)

**Verification.** `tsc --noEmit` and `npm run build` clean; zero console errors.

*Pass 1 — Node.* The dev-server slots were initially all held by **five orphaned Vite
processes from closed chats** (nothing listening; this chat owned none to stop). Since every
piece of new logic lives in the framework-free modules, they were bundled out of `src/` with
esbuild and exercised directly — **20/20 assertions**: affinity math (1600/750/1000 off a
1000 base), composes-not-folds (ratios exactly preserved with Intelligence at 40), potency
(vitality 40→60 HP, agility crit 5%→4.25%, healing axis scaled, `statTotalEffect` **string**
reading "+60 max HP, +22.5% healing"), the drop lock (no penalised gathering entry;
bonus-drop chance identical across all five characters), the neutral no-character baseline
(all six getters byte-identical), and per-character coverage/bounds. Score isolation holds
structurally — `Run.ts` contains zero character references, so `score()` cannot see a class.

*Pass 2 — live.* the user authorised killing the orphans, freeing the slots. Measured in the
running game: the picker renders 5 cards each with an AFFINITIES block and **min slack
exactly 14px** (= `CARD_PAD_BOTTOM`, i.e. the self-sizing is driven by the tallest card, no
clipping) — `PANEL_H` was then tightened 800→690 to remove 158px of measured dead space above
the Begin Run button, leaving a 48px gap. Committing the Warden gave exactly ×1.6 Heavy Armor
/ ×1.4 Chopping / ×1.4 Mining / ×0.8 Ranged **through the real `awardSkillXp`**, and vitality
3pts → 18 HP bonus (×1.5, neutral would be 12) → 138 max HP. The Character menu shows markers
on exactly the 2 Warden stats, sitting **8px clear** of their labels and inside the panel;
all 11 skill rows hover, with the affinity line on exactly the 4 affinity skills and neutral
skills unchanged. `scene.restart()` resets to "Nameless"/potency 1/affinity 1/level 0, and
picking the Reaver afterwards swaps cleanly — blunt 1600, magic 750, and the Warden's
signature heavy_armor back to neutral 1000. The dashboard's Affinity/Weakness columns render
for all five, and that page has **`window.Phaser === undefined`**, confirming the leak fix in
the real dev server.

**No screenshots** — the Browser pane isn't displayed in this environment, so the page never
composites frames; everything above was measured from live render data instead. All numbers
are first-pass and want a playtest.

### B4-P6 — Perf regression (display-list streaming), culled-enemy drift, 5 playtest fixes (2026-07-22, Opus)

Off a the user playtest: seven complaints, of which two shared one root cause and the biggest was
structural. No plan file — a fix batch, not a milestone.

**1. The hitching (the headline).** "Very common hitching while sprinting/walking feels bad." Not
gameplay code — the **display list had reached 17,041 objects** (5,293 miasma fumes, 2,355
dungeon-wall rects, 2,233 resource nodes, 1,138 enemies, and every decorative prop in three
biomes). Phaser walks that whole list every frame to cull and render, again in `syncCameras`, and
**re-sorts all 17,041 whenever any depth changes** — which is every frame the player moves, and
never while standing still. That is exactly the reported symptom. Measured in the live game:
**22.3ms/frame with the sim PAUSED**; a full `depthSort` alone was 2.35ms; hiding 5,293 sprites
saved only 3ms (invisible children are still iterated) while *removing* distant ones from the list
dropped the frame to 4.1ms. So the fix is removal, not visibility:
**`MainScene.updateSceneStreaming()`** parks every world object that cannot possibly be on screen
out of `scene.children` and into a `streamedOut` array, re-adding it when the player comes back.
Nothing else changes — Arcade bodies live in the physics world and `Sprite.preUpdate` runs off the
scene's update list, so **collision, AI and animation are untouched**; this is purely "don't ask
the renderer about things it can't draw". Runs every 250ms with a 900px margin past the viewport
(derived from `cameras.main.worldView`, so it tracks any zoom change automatically). The
`isStreamable` predicate deliberately excludes HUD (`scrollFactor 0`), ground bakes/decals
(`depth < 0` or >900px), and **every `Graphics` object** — those draw in absolute world coordinates
from a transform parked at (0,0), so their x/y says nothing about where they appear (verified: all
216 streamable Graphics sat at 0,0). Result: **17,041 → ~1,550 in the list, 22.3ms → 9.3ms median
while sprinting**, with `update()` itself at 0.6ms and the streaming pass 0.85ms per *250ms*. A
12,000px round trip over 80 passes restored exactly the same 115 nearby objects, so nothing leaks
or vanishes; parked objects that die meanwhile are dropped via the `scene === undefined` that
`destroy()` leaves behind.

**2 & 3. Duskrunners in the forest / dens stuck on wave 1 (one bug).** "I can't kill duskrunners so
the elite wave isn't spawning so I can't break the thing", plus "stuff is wandering way too far"
and "missing spawns on some gremlin camps" — all the same defect. B4-P4's AI distance cull
`continue`s past 2000px **without stopping the enemy**, and Arcade velocity persists with no drag,
so an enemy culled mid-chase (or mid-pounce, at 330px/s) **coasted in a straight line for as long
as the player stayed away**. Warren guards and shack guards flew off their POI permanently — a den
whose guards are alive but 5,000px away can never clear wave 1, which is precisely the blocker
reported. Fixed at the cull site (zero the body on the way out), plus a backstop: base `Enemy` now
records `homeX/homeY`, and `MainScene.steerEnemyHome()` walks a **non-aggro'd, non-attacking**
enemy back at 34px/s once it strays past 800px. It's a post-`update()` steer exactly like
`steerCryptEnemy`, so **no subclass wander code changed**, and gating on `isAggro()` means it can
never bend a live chase or a committed lunge. Verified live: a culled enemy's velocity goes to
(0,0); a strayed idle one steers home; an aggro'd one at the same distance still chases at full
speed; all 30 dens hold 90 guards and all 14 shacks hold both, none more than 70px out.

**4. Light-bearing jewelry did nothing.** `lightRadiusPct` only ever *multiplied* the held-light
radius, which is 0 with an axe in hand — so the Amulet of Farsight's "pale lantern-stone" lit
nothing at all unless you were already holding a torch. New `EquipmentEffects.innateLightRadius()`
derives its own glow from the same percentage (so one number still describes the piece) against a
200px base, deliberately under a torch's 180px so a torch stays the brighter option; `collectLights`
takes the **max**, not the sum. Verified: 0 → 80px world radius with no torch held.

**5. Toasts drifting off-screen when crafting fast.** The left-hand recipe/material stack used a
monotonic upward cursor **with no cap**, so a burst of crafts (each toast holds ~7s) marched
straight off the top of the screen and left holes at the bottom as older ones faded from under it.
Rewritten to match the center stack it sits beside: keep each container, cap at 6, evict the
oldest, and `relayoutRecipeToasts()` repacks from the baseline on every add/evict/fade.

**6. Zoom + text size.** "My guy looks so tiny — did the camera zoom out?" `WORLD_ZOOM` 1.25 → 1.5
(visible world 1280x720). "Text is too small in menus" — the 1920x1080 canvas is FIT-scaled *down*
into a browser window, so a 12px font lands near 10px. Bumped every `fontSize` in `src/ui` by 2px
(74 sites) and the layout constants coupled to those metrics (`EventLogUI`/`KeybindsUI` line +
header heights and its 34→29-char truncation, `CraftingMenu` row height, `InventoryMenu` section +
relic-effect row heights). MainScene's own world-space text (damage numbers, boss name cards) was
left alone — the zoom already enlarges it. **Verified by measuring real `getBounds()`** against
each panel rect rather than by eye: crafting, inventory (74 texts, stocked), character (both tabs),
pause, tips, welcome, world map, character-select cards, and the campfire/relic-forge/gemwright
station menus all render with **zero text past any panel edge and nothing off-screen**.

`tsc` + `npm run build` clean; zero console errors. **Every number here is first-pass** — the zoom,
the 800px home leash, the 250ms/900px streaming window and the +2px type all want real play.

**Second batch (same session)** — four more items the user flagged as predating the above.

**7. The Sunken Gorge's SECOND maw was dead** ("I built an effigy and couldn't interact with the
boss dungeon opening"). Nothing to do with guards: `promptForGorge()` measured reach against
`lair.x/lair.y`, which is only ever **maw #1**, so standing at the other door gave no prompt and
the click fell straight through. The lair deliberately has two doors into one interior (B4-P4), and
they were ~9,200px apart in the test seed. `hoveredGorge` now carries `{ lair, maw }` so reach —
and the hover highlight, which had the same bug — measure against the door actually under the
cursor. Verified end to end from maw #2: prompt → break seal → descend.

**8. Enemies in the dungeons.** The `CRYPT_REALM` pocket sits in the dead corner of the world
**square**, which is inside `collideWorldBounds` even though it's outside the world **circle** the
player is clamped to — so anything that travelled far enough simply arrived there, and the
now-fixed coasting bug (#2 above) supplied the ~14,000px. Since the geometry that permits it is
permanent, this is now a **hard invariant** in `updateEnemies` rather than a consequence of
movement behaving: anything not in `cryptEnemies` found inside either underground rect
(`insideUndergroundRealm`, covering CRYPT_REALM and LAIR_REALM with a 600px margin) is snapped back
to its spawn. Verified by dropping a surface Boar into the crypt pocket — one tick and it's home.

**9. The dungeon transition.** "You can clearly see the camera moving to the other area." The
camera follows with **lerp 0.1**, so teleporting the player ~14,000px underground made it *ease*
the whole way — and the existing 260ms `flash` couldn't hide a pan that long. New
`transitionCameraTo()` does both halves: `centerOn()` kills the in-flight travel outright, then a
**420ms fade up from black on BOTH cameras** (world-only would leave the HUD floating over black)
reads as a scene change instead of a jump cut. Verified: on entry and exit the camera is already
within 1px of the player, and both fade effects run.

**10. Ironshod Pickaxe art.** The tier-art mechanism was already generic (`tieredStationTexture`
looks for `<icon>_t{n}`) — the pickaxe simply never had one drawn, so it kept its base icon while
the axe changed. Added `icon_stone_pickaxe_t1`, drawn to match the Ironshod Axe (sunsteel head,
bright bevel, gold haft bands) so the pair reads as one upgrade family. Verified the resolver
returns the tiered key for both tools and still falls back to base for an item with no tier art.

**11. No character starts with gear.** Three of the five handed out an axe (the Warden a pickaxe
too), which quietly made the class pick partly a decision about how fast you got through the
opening minutes — and it made the Ascetic's empty hands, its entire stated identity, not actually
special. Every `startingItems` is now `[]`. **`startingEquip` is untouched**: that is the
ability-granting special item, which by B4-P1's locked decision 4 *is* the class's ability rather
than gear in any ordinary sense — stripping it would delete Q/E/R from every card. Knock-on edits,
all of which follow from the roster being uniform: the Ascetic's blurb no longer says "starts with
nothing but nerve" (it leans on Hunted instead), the card's KIT section is **skipped when empty**
rather than printing "Nothing but nerve" on all five, and the picker subtitle no longer promises "a
different kit". The field itself stays — it's the obvious lever for a future unlock or difficulty
option, and `applyCharacter`'s routing already handles both cases. **Checked the opening isn't a
dead end**: bare-handed, ground branches + rocks unlock the Woodcutter's Axe immediately (along
with Torch/Wood Club/Campfire/Workbench), so every run bootstraps the same way it always did before
a starting axe existed. Verified all five spawn with an empty hotbar and backpack.

**12. Upgrade-unlock toast flood.** Weapon/armor upgrades are ladders — dozens of rungs across the
gear tiers — and learning one common material unlocks a whole column of them on the same frame.
Measured on a saturated inventory: **88 "New Upgrade Unlocked!" toasts**, which is the unruliness
the user hit. Split by what the unlock actually buys, per his call: a **station** upgrade or a
**tool** upgrade grants a capability you did not have (a new recipe tier, a node you couldn't fell)
and keeps its toast; a **gear** rung is only a bigger number on something you already own, so it is
now logged with `EventLog`'s existing `silent` flag. The entry still lands in the scrollable Log
and the rung still appears in the Upgrade menu — only the popup is gone. Same flood now yields
**14 toasts** (12 stations + the 2 Ironshod tools) and **74 silent**, with all 74 still in
`discoveredGearUpgradeIds`. Applying an upgrade still announces normally; that's one deliberate
click, never a burst.

**13. Character picker type.** The project-wide +2px font bump (#6) missed this menu almost
entirely — `CharacterSelectUI` sizes its type by passing **numbers** to its own `text()`/`block()`
helpers rather than writing `fontSize: "Npx"` literals, so the sweep found exactly one site in the
file. Worth remembering for any other UI built that way. Bumped ~25% across the card (labels 10→13,
body 12→15, ability 13→16, name 18→22, title 26→32, button 20→24) — but type alone would have made
it *worse*: bigger text in a 272px card just wraps into more lines, so the card gets taller and
narrower rather than more readable. Card width 272→330 and the panel 1500→1780 moved with it (still
a 70px gutter each side of the 1920 canvas), plus every paired line-step. Panel height then
re-measured against real bounds rather than guessed: cards run 519px, leaving the Begin Run button
55px clear. Verified all five cards at 330×519 with zero text past any card edge and nothing
off-screen.

### Smelter fix — unloadable alloy recipes, reagent/fuel split (2026-07-23, Opus)

Off a playtest report: "why can I put Bog Ore and Hex Essence into the Smelter but it doesn't
do anything?" Two problems, one visible and one behind it.

**The bug.** Fuel became per-recipe in B4-P5 (Gloamsteel takes Moonsilver, Mirebronze takes Bog
Ore), but `ProcessingStation` still assumed one shared fuel key — `fuelKey()` returned the *first*
fuelled recipe's key (`hex_essence`) and `canAcceptFuel()` compared against only that. So the fuel
slot **refused Moonsilver and Bog Ore outright**, making Gloamsteel and Mirebronze impossible to
smelt at all, with the failure showing up as a silently-zero slider and no explanation. This is the
classic shape of a bug that near-identical duplicated code produces, which is why the rewrite below
routes both secondaries through one parameter instead.

**The design problem behind it.** Fixing the lookup surfaced that "Fuel: Moonsilver" reads as nonsense —
the slot was never really fuel, it was a generic "A + B → output" ingredient slot, named for its
first case. Worse, once Hex Essence stopped being universal, the two B4-P5 alloy recipes were
smelting metal **with no heat source at all**. the user proposed a third slot; locked via
`AskUserQuestion` on the variant where **all three slots are always required**, which is *less*
complexity than an optional one (nothing to special-case in the slider/process math):

- `ProcessRecipe.reagent` — the second ingredient that ends up *in* the ingot, per-recipe.
- `ProcessRecipe.fuel` — burned off, never part of the output, **always Wood** on every recipe.
  Gives Wood a sink that outlasts the early game.

| Input | Reagent | Fuel | Output |
|---|---|---|---|
| Sunscorch Ore | 1 Hex Essence | 2 Wood | Sunsteel Ingot |
| Cinderforged Ore | 1 Hex Essence | 3 Wood | Embersteel Ingot |
| Bog Ore | 1 Moonsilver | 3 Wood | Gloamsteel Ingot |
| Sunsteel Ingot | 2 Bog Ore | 3 Wood | Mirebronze Ingot |

**Implementation.** The two secondaries behave identically apart from which recipe field and slot
they touch, so `usesSlot`/`slotKeys`/`slotKey`/`canAcceptInto`/`addInto`/`takeFrom` all take a
`side: SecondarySide` rather than existing as two copies. `maxPossibleOutput` caps by the min of
all three slots. **`process()` checks both secondaries before spending either** — consuming them
in one pass would let a fuel-short run eat the Moonsilver on the way to returning null.

**Layout** (`DryingRackMenu`, which serves both stations): row 1 is Ore + Reagent side by side —
the two that end up in the ingot — with Fuel on row 2 below, so the grouping says which is which
before you read a caption. Panel 400 → 448. Captions still come from the recipe
(`Ore`/`Metal`, `Reagent`/`Alloy`); Fuel is always "Fuel", being the one ingredient that never
changes role. Two new amber hints explain a zero slider: `Needs Moonsilver` (wrong item) and
`Needs 3 each` (right item, too few).

Also fixed in passing: destroying a placed Smelter refunds all three slots (it dropped input +
fuel, so the new reagent would have been swallowed), and drag / right-click / Ctrl-click quick-load
route a stack to whichever secondary slot accepts it.

**Verified live** (`preview_eval` against the running dev server): full Gloamsteel run with correct
remainders (2 ore / 2 Moonsilver / 6 Wood), Mirebronze's 2-per and 3-per costs, cap = min of all
three, fuel-starved run leaves input and reagent intact, both hint cases, slot type gating (Wood
can't go in reagent, Moonsilver can't go in fuel), Drying Rack unchanged (one slot, 4 Cattail → 2
Twine), and panel content measured to fit — which caught the lengthened Smelter description
wrapping to a third line and colliding with the slot captions. `tsc` clean, zero console errors.
`RECIPES.md` smelting table updated (it was doubly stale — it listed Bog Ore as taking Hex Essence
and omitted Mirebronze entirely).

### playtest-batch-2026-07-23 — continue-on-death + the triaged remaining work (Opus)

A ~45-item bayou-heavy playtest dump. Triaged with the user; **continue-on-death shipped first**
(above / Current State). Locked directions: **systematic** bayou rebalance (not targeted nerfs) —
measure enemy speed/HP/damage against the player's real envelope per
[[feedback_size_enemies_against_player]]; **remove the Fenlurker** (burrower) entirely. The rest is
Sonnet-class fixes/tuning. The full remaining list, grouped:

**Batch A — quick bugs/UI — SHIPPED (2026-07-23), except two deferred (cloak→R-slot design call;
mini-boss big HP bars → boss-feel pass). See Current State for the per-item detail.** enemy HP bars render dark-red for some enemies; campfire recipe text
cut off past the box; relic "replace"/dominance modal text overlaps (needs wrap + auto-sized boxes);
dungeon chests not glowing; a cloak going into the R (ability) slot wrongly; Smelter should return
loaded items to inventory on close (like the ask that drove the Smelter-fix entry — verify it does);
bayou miniboss (Cinderwrought / "fire guy") big HP bar missing; workstations should show the yellow
upgrade-triangle while in the hotbar; "Set Gems" tab hard to see + **weapons not appearing in Set
Gems**; poison damage bypasses the overshield (should chip it, like other damage); never grant a
**duplicate special item from a box**; rename Sunken Gorge **or** Sunken Forge (too similar);
smelting simplify to **1 Wood per ore** (the user — supersedes the 2/3/3/3 just shipped).

**Batch B — world/POI overlap:** Cinderwrought (Sunken Forge) overlaps a Warren; Duneshaper altar
spawning in the bayou next to another POI / next to the Sunken Gorge (flagged twice); badlands↔bayou
**border bleed** — POIs too close, enemies crossing biomes. (Root cause is almost always a missing
spawn-exclusion zone — [[feedback_poi_busy_not_placeholder]] — and POI-position pickers not honoring
each other's clear radii + biome coverage.)

**Batch C — bayou combat rebalance (the big one):** enemies far too fast (can't kite/dodge/run from
anything — even god-mode-only survivable); wild power disparity (some ~no HP, some 1-shot); Corpselight /
ranged haunts do insane damage AND **don't stop to shoot** (AI bug — they should plant like a Hexling);
ranged gap-close makes player ranged unplayable; elite Mosswretch nearly 1-shots; heavy armor doesn't
feel tanky + poison stacks (~6) melt you + even max Embersteel gets owned; **Miretyrant does ~nothing
(−1/−2 dmg) and perma-staggers to a sword**; Palewake dies in ~4 hits (trivial) — bosses feel weak
while trash 1-shots; Reaver takes too much damage / lesser Bloodpact too weak (consider passive
lifesteal or a buffed innate); **new weapons' stamina cost too high** (attacks-per-weapon feels flat
despite stat investment); trophies/elites feel rare in bayou; "where are the guaranteed Uncommon T3
miniboss trophies?"; "where do I get Mire Shards?" (surface the source or add one). Also: themed bayou
spawns (toads at the lilypad POI, ranged at the docks); make the Gremlin chest piece heavy armor.

**Batch D — design tweaks:** remove poison's regen-reduction, make a regen-cut an enemy-kit thing
instead; resting regen buff scales with campfire level; Palewake fight-clarity pass (reads as unclear /
not epic).

### Vagabond-run playtest dump — 4 batches, ~35 items (2026-07-23, Opus)

the user's Vagabond run ("overall things felt much better") produced a fresh ~35-item dump. Triaged
into four batches and confirmed the order with `AskUserQuestion` (he picked all four, plus "4
specials + Ammo tucked below" for the slot rework and "findable + more crypts" for scarcity).

**Batch 1 — biome-3 blockers.**
- *Ranged enemies never deaggro'd.* Root cause: `Corpselight`/`Hexling`/`RangedGremlin` all called
  `markAttackLanded(now)` at FIRE time. That resets `pursuitClockStart` AND extends
  `aggroPersistUntil` by 4000ms — and every cast cooldown is under 4000ms, so both the persistence
  window and the 30s give-up clock were refreshed forever regardless of whether a single shot
  connected. New `Enemy.markAttackAttempted()` extends persistence only; a LANDED projectile routes
  back through a new `Projectile.sourceEnemy` → `Enemy.onProjectileHitPlayer()` at the scene's
  overlap handler. Verified: a Corpselight now goes idle at exactly 30000ms of non-connecting fire,
  and `onProjectileHitPlayer` resets that so a real fight never times out.
- *"Infinite range" / "they don't stop when they shoot."* The Corpselight had **no cast-range gate
  at all** — it fired anywhere inside its 700px deaggro radius, drifting, with no telegraph, making
  it the one ranged creature in the game ignoring the souls-like windup contract. Added `CAST_RANGE`
  380 (beyond it, it closes instead of firing), a 520ms PLANTED tinted wind-up with a locked aim
  point, deaggro 700→520, orb lifetime 4200→3000 so caster reach and orb reach agree, and a
  randomised initial cast clock so a Drowned Lodge's 2-3 haunts stop arriving as one synchronised
  volley (that stacking was most of why the Lodge read as "legitimately impossible").
- *Bayou economy / "an hour and I can't craft anything".* Crypts 12→18, placed in **two** interior
  realms (the bottom-left dead corner outside the world circle was free) rather than subdividing one
  — shrinking cells would have silently reduced rooms per crypt, so "more dungeons" would have meant
  "worse dungeons". Moonsilver seams 2-3→3-5; 16 scattered surface Gloam Outcrops; Gloaming Vein
  nodes 1-2→2-4; **crypt wardens now drop 2-3 Mire Shard** (the only prior route was Relic-Forge
  Lvl3→Lvl4 conversions at 3:1 twice = 9 Gloam per Mire, behind two upgrades nothing surfaces).
- *Crypt findability — the **Gravemark Rubbing**.* First attempt revealed all 18 entrances the
  moment you entered the bayou. That did fix the problem, by deleting exploration; the user pushed
  back ("I don't want it to reveal the whole biome — surely there is something we can add that helps
  with discovery that isn't a reveal-all"), and he's right. Replaced with a clue item: a **6% drop
  from the common bayou roster** (Mirejaw/Murkling/Blighttoad/Mosswretch/Corpselight — NOT elites,
  whose slot is trophies), **consumed on contact** in `collectNode` before any other branch, which
  maps the single NEAREST unknown crypt and says which way it lies via the existing `compassDir`.
  Consume-on-pickup is what stops it becoming a reveal-all by another route: there's no stack to
  hoard and nothing to manage. The same help, paid out in increments, and earned by the thing you
  were already doing down there. `LootEntry` gained an optional `chance` (absent = always drops, as
  every entry was until now) — verified at 6.11% over 20k rolls with existing guaranteed loot
  unaffected. Second, organic half: each crypt now scatters **three thinning grave-marker
  breadcrumb bands** out to 760px (jittered, per the standing "uniform reads as programmatic"
  preference), so the ground visibly gets graver before the door is in view — the war camp's trail
  idea applied to a doorway.
- *Pre-existing generator bug, found while verifying the above:* rejection sampling in
  `CryptLayout.generateCrypt` left **13 of 18 crypts under the 5-room target and 5 at the bare 2-room
  floor** — most "dungeons" literally were an entry room and a boss, which is exactly the user's
  separate "dungeons need to be more than just the boss and the drop". Fixed with a
  shrink-under-pressure size schedule (later attempts ask for smaller rooms, so a crypt degrades into
  SMALLER rooms rather than FEWER), a filler minimum below the vault minimum, attempts 400→1500, and
  a deterministic grid sweep as a floor. Result: every crypt 5-7 rooms, smallest vault 63 cells.

**Batch 2 — 10 bug/stale-UI fixes.** Run timer stayed frozen after "Continue" (`Run.tick` only
accumulates while `state === "active"`; both continue paths cleared `runOver` but never the run
state → new `Run.resume()`). Enemy HP bars are two *sibling* GameObjects destroyed only inside
`playDeathFeedback`, so every DESPAWN path (lapsed shrine rite, dawn cull of night spawns, den
reset) stranded a floating bar forever → cleaned up in a base `Enemy.destroy()` override so every
path present and future is covered. Duplicate epics in chests: dedupe checked only PLAYER ownership,
but every world container is pre-rolled during `create()` when the player owns nothing, so two
chests happily rolled the same unique → run-scoped `epicsGranted` reservation. Miretyrant dropped
the Duneshaper's **Tier-2** trophy → new `boss_refined_trophy_t3` (`POWER_TIER_MULT[3]` already
existed; the boss ladder just never got its rung). Phantom "upgrade ready" arrow: the station branch
never excluded already-APPLIED upgrades (so a long-since-applied Tool Sharpener kept it lit) and a
pristine spare always has every upgrade pending → now filters by the instance's applied-id set and
only reminds on an instance you've already invested in. Gravebind "kinda doesn't work": it yanked
and slowed but never INTERRUPTED, so an enemy mid-wind-up finished its swing from the new spot →
`resetAttackState` + velocity zero (Arcade has no drag), slow 0.45/900ms → 0.30/2200ms. Poison's
"healing 50%" was terrain, not poison — the miasma regen multiplier 0.5→0.75 (it was double-taxing
the same fantasy: poison ticks damage AND halved the healing answering it, over a large share of the
bayou) and the status line now names the ground explicitly. Gemwright's Table hides recipes whose
output you already own. Drowned Aegis's description states its actual 60%/4s. And the **Sunken Gorge
discovery bug**: both routes keyed off `lair.x/y` — which is maw #1 — so walking up to any other
door revealed nothing, and once maw #1 was known the effigy's reveal-everything step was swallowed
by its own `if (!discoveredOnMap)` guard. Now per-maw (`maws[].discovered`) through one shared
`markMawDiscovered()`. Same class as B4-P6's second-maw fix: several doors, one door's coordinates.

**Batch 3 — equipment/inventory slot overhaul.** `EquipSlot` became three GROUPS plus ammo — gear
×3 (helmet/chest/legs), **special ×4**, **ability ×3** — replacing helmet/chest/legs + necklace/
ring1/ring2/cloak/back/special1/special2. An item now declares a *group*, not a destination;
equipping routes to `Equipment.firstFreeIn(group)` and only swaps once the group is full,
generalising what had been a ring1/ring2 special case. **Position is the hotkey** (ability1/2/3 →
Q/E/R), so any ability item fits any ability slot — a Bloodpact Shroud on Q was impossible before,
since its slot *was* the R cape slot. 9 ability items and 14 passives remapped; a load-time assert
confirmed every `ability`-slot item has `grantsAbility` and vice versa. New explicit `ARMOR_LAYOUT`
table drives BOTH `renderArmor` and `armorSlotAt` so drawing and hit-testing can't desync (verified
by round-tripping all 11 slots plus the dead caption strip and empty cells). Every slot carries a
caption so its name is readable with an item in it; tooltips add "Equips to: any Special slot";
`ItemCategory` gained `special`/`ability` so the backpack has its own **Specials** and **Abilities
(Q/E/R)** sections. Layout verified numerically (screenshots unavailable in this pane): zero text
overlaps, nothing overflowing into the Combat column.

**Batch 4 — balance.** Weapon stamina ×~0.7 with the tier ladder preserved, plus base pool 100→130:
a 16-cost Primal Spear against 100 stamina is six swings, and because the post-spend regen delay
re-arms on every swing, sustained attacking regenerates *nothing* — "5 attacks + a couple of dodges
per bar" was literal, and Endurance was a tax for showing up. Armor heavy/light gaps widened
5/9/12/10 → 12/17/26/23 by pulling light down and pushing heavy up, deliberately **not** raising the
ceiling, because the previous session had just bumped the Miretyrant so armor stopped nullifying it.
Forged-armor upgrades became per-set (~25% of the piece: Gloamsteel +4/+8, Duskhide +1/+2) instead
of a flat +1 on a 14-armor Embersteel Cuirass. Miretyrant attacks 82/72/95/68 → 110/98/124/92 (they
were tuned against 32 armor; geared play is 50-74 — measured: a Slam lands 74 net through 50).
Sanguinarch 420→620 HP, 15/50→34/72 damage (a crypt warden with less damage and barely more HP than
the common Mirejaw guarding the way in). Gloam Brand 23→29 + bigger burst, and the Gloamdrinker's
always-on, no-slot-cost lifelink 12%→8% — that, not the numbers, was what made it "bonkers busted".
Wisdom gained a second axis, **−0.5% ability cooldown per point (cap −50%)**, because buff duration
alone was invisible at 55 points and cooldown is an axis no other stat touches. XP exponent 1.8→1.7
(level 5 ~12% cheaper, level 21 ~29% — the deep-run wall was the complaint).

**A drift bug caught only by live verification:** the armor retune first edited the
`{ label: "Armor", value }` display stat, but real defense lives in `ItemDef.armorDefense` — the
in-game total didn't budge while the tooltip claimed it had. Both are now written from one table and
asserted equal across all 24 pieces. Worth remembering: **item stat lines are display text, not the
mechanic.**

Verified live throughout via `preview_eval` (18 crypts / 5-7 rooms each / 295 Moonsilver / 16
outcrops / all 18 wardens dropping Mire Shard; Corpselight plant-telegraph-fire and 30s give-up;
per-maw discovery on both routes; all-4-special and Q/E/R routing with swap-on-full; armor totals
50 vs 24; Wisdom cooldown 0.725 at 55 and capped 0.5). `tsc` + `npm run build` clean, zero console
errors, display list still ~1550. `RECIPES.md` armor tables and the dashboard's hand-mirrored
Enemies tab both updated (the mirror was doubly stale — it still had the Miretyrant at 4600 HP).

**The three deferred items then shipped too** (the user: "do the rest of the open items"):
- **Mire Snare** (AOE root) and **Bloodrush** (attack speed), both **craftable** at the Gemwright's
  Table rather than found-only epics — burying a requested ability behind an epic roll reproduces
  the "I never found one" problem the Gravemark Rubbing exists to solve. Each costs a different gem,
  so which one a run can build still depends on which crypt it cleared. Snare is deliberately NOT
  Gravebind: it moves nothing (`applySlow(0, …)` — a hard root, and `applySlow` already keeps the
  stronger slow so an overlapping Gravebind can't weaken it) and deliberately does NOT cancel a
  committed swing, so the counterplay is root-then-leave rather than root-and-facetank. Bloodrush
  needed the game's first attack-speed hook: a new `attackCooldownMult()` multiplied into
  `weaponCooldownMs` at **all three** attack sites (melee / ranged / den-smash), so any future
  attack path inherits it. Verified live: root mult 0 with 0px displacement in radius and untouched
  outside it; cooldown 1.0 → 0.6 for a 6s window.
- **Per-warden crypt interiors.** All three crypts were the same grey stone box with a different
  boss dropped in. `CryptThemeDef` gained a `shell` palette and `renderDungeonShell` an optional
  texture set (the Miretyrant's lair passes none and keeps the base stone — verified). BootScene
  grew a palette-driven `cryptShell()` generating floor/wall/pillar/rubble/brazier per theme:
  Palewake a cold violet drowned barrow, Kilnborn a scorched firing chamber, Sanguinarch a
  meat-red charnel house. The **dweller mix is themed too**, as a weighting over the same three
  species rather than a new roster — gloam leans swarms (they deny you the room to break the
  Palewake's tether), ember leans bruisers (its burning floor already shrinks the arena), blood
  leans Blighttoads (poison/bleed feed the Sanguinarch's Feed channel), so the crypts play
  differently as well as look different. Audited across all 18 crypts: correct shell on every
  floor/wall/pillar/rubble/brazier, **zero cross-theme contamination**.
  (Verifying this needed a detour — a Phaser TileSprite swaps in its own UUID fill texture, and
  under WebGL its canvas reads back blank, so neither `texture.key` nor pixel-sampling works; the
  source key survives on `displayTexture.key`.)
Also swept up while in there: the 9 existing ability items still advertised fixed keys ("Special
(Spec1 · Q)", "Grants Bloodpact (R)") — stale since the slot overhaul made ability slots
interchangeable.

### Pre-2026-07-23 snapshot carry-over (rescued from STATUS.md's Current State)

_These batch summaries lived only in the living snapshot, never as their own Recent Entries.
Preserved verbatim when the snapshot was rewritten on 2026-07-23._

Prior: **Batch C — data-driven bayou
rebalance** (2026-07-23, Opus, no plan file), guided by the Balance Audit built just before it.
Headline structural fix: **enemies now inherit the terrain move-slow the player suffers** — in deep
bayou water the player wades at 50% but enemies used to ignore it entirely (verified live: an enemy
in a 0.6 cell now has `envSpeedMult 0.6`), which was the #1 "can't run away from anything in the
bayou" cause. Applied at the single `updateEnemies` envSpeedMult choke point (bounded — only active
near-player enemies), and the player's dash stays terrain-exempt so it still escapes. Enemy tuning
(edited in the single source `enemyStats.ts` + each entity **wired** to read it, so the audit and
game can't drift): **Murkling** 172→118 speed (was faster than sprint = un-kiteable) + claw 62→38;
**Mirejaw** 138→108 + lunge 120→80 / chomp 85→52; **Mosswretch** smash 135→78 (elite 202 one-shot
killed); **Corpselight** orb 34→22 magic + homing turn-rate 1.9→1.2 (dodgeable); **Blighttoad** bite
66→44 + poison 6→4/stack (3-stack cap already existed); **Miretyrant** (win-con boss) attacks bumped
(52-58 → 82-95, so armor stops nullifying it to -1/-2) + poise 450→800 & regen 24→28 (kills the sword
perma-stagger) + HP 4600→3600; **Palewake/Kilnborn/Sanguinarch** crypt wardens 240-300→420-440 (were
4-hit trivial). **Fenlurker CUT entirely** (the user: boring burrower) — entity file deleted, removed
from all spawn tables + the dev spawn table + the module. Verified live: every changed value flows
through (Miretyrant poise 800, Murkling dmg 38, terrain slow 0.6), `tsc` + `npm run build` clean,
zero console errors. **All forest + bayou entities now read the module; badlands still mirror the
code** (wire them when next tuned — module WIRING STATUS block tracks it).
**Batch B — POI overlap FIXED (2026-07-23):** a shared `tooCloseToAnyPoi(x,y,POI_MIN_SEPARATION)`
check is now enforced in every POI picker (den / tyrant-altar / bayou), so no two different-type POIs
land within 800px (was: badlands pickers enforced only their own ~200-360 clear radii, bayou pickers
avoided only a subset — hence Cinder-Forge-on-Warren, Duneshaper-altar-next-to-Sunken-Gorge). Verified
live: min cross-type POI distance **803px** across 73 POIs, all 30 dens still placed (den guard tries
80→160). The redundant partial `clearsOtherPois` was removed. **The enemy-border-bleed half is only
partly addressed** (POIs no longer cluster at borders; `steerEnemyHome`'s 800px leash still lets an
enemy stray ~800px into a neighbouring blob — full biome containment deferred).
**Batch D quick wins + cloak-slot separation — DONE (2026-07-23):** (1) **Resting regen scales with
campfire level** — `updateComfortRegen` now sets `hpPerSec = 1 + campfireTier` (Lvl 1→1, Lvl 2→2, …)
from the nearest campfire fuelling the Bedroll. (2) **Gremlin Shirt → heavy armor** (`Items.ts`) — the
earliest heavy piece, so a biome-1 player has an on-ramp to heavy-armor magic/fire mitigation + heavy
XP; Cap/Pants stay light (deliberate mixed set). (3) **Poison no longer halves HP regen** —
`currentRegenMult` = `env.regenMult` only; the miasma/mire ZONES still cut regen (terrain hazard), but
a creature's poison dose is now just a DoT (status tooltip + "Weakened Healing" indicator updated to
match). (4) **Cloak → its own equip slot** — new `cloak` `EquipSlot` for stat back-armor (Mireborn
Cloak moved there), while `back` stays the R-ability cape slot (relabelled "Cape"); a utility cloak no
longer evicts your R ability. Paper-doll auto-flows (11 slots still 4 rows at 3 cols, no overflow);
passives aggregate over `EQUIP_SLOTS` so the cloak's `statusResistPct` still applies. All verified live
(`tsc` + `npm run build` clean, zero console errors).
**Economy questions — RESOLVED (2026-07-23):** (a) **bayou crypt wardens (Palewake/Kilnborn/
Sanguinarch) now drop a guaranteed `refined_trophy_uncommon_t3`** — completing the miniboss refined-
trophy ladder (Gloamwarden T1 / Cinderwrought T2 / crypt-warden T3); added `refined_trophy_uncommon_t3`
to the `ResourceType` union (was roll-only). (b) **Bayou elites ~2× more common** (new
`BAYOU_ELITE_CHANCE_MULT = 2`, ~8%→16%, verified live at 15.6% surface) — elites feed the relic loop
and read as "really rare". (c) **Mire Shards** already have a source — the deep but functional chain
Relic Forge Lvl 2 (Gloam Conduit → refine) → Lvl 3 Ember Kiln (Gloam→Ember) → Lvl 4 Mire Crucible
(Ember→Mire); left as-is (works), just undiscoverable — a future hint could surface it.
**Mini-boss big HP bars — DONE (2026-07-23):** the five mini-bosses (Gloamwarden / Cinderwrought /
Palewake / Kilnborn / Sanguinarch) now feed the big top-of-screen `BossHealthUI` while engaged
(the user: "fire guy's health bar is missing" — the floating world bar was too easy to lose). Done via
a scene-side `engagedMiniBoss()` **adapter** (no edits to five entity files): HP + name off base
`Enemy`, `isEngaged`→`isAggro()`, and the poise strip shows **only** for one that exposes a poise
meter — the others pass `poiseMax 0` and render HP alone (`BossHealthUI` now hides the empty strip).
Big bosses still take priority. Verified live: Kilnborn shows "The Kilnborn" 440/440 HP-only bar, no
poise strip; zero console errors.
**Themed bayou spawns — DONE (2026-07-23):** a soft zone/water preference in `pickBayouPoint`
(`preferZone`/`preferWater`, enforced for the first ¾ of attempts then relaxed so a spawn never
fails) biases each species to its macro-zone. Verified live: **Murkling 90% hammock** (reed-bed
swarms), **Blighttoad 95% miasma** (poison frogs in the poison fog — the creek "lilypad" water was
too sparse to congregate on, so they went to the abundant + thematic poison zone), **Mosswretch 78%
bonemire** + **Corpselight 47% bonemire** (husks & haunts in the drowned boneyard), Mirejaw favours
the wet miasma/water. **This clears the ENTIRE ~45-item 2026-07-23 playtest dump** — every item
across continue-on-death, Batch A (12 fixes), the Balance Audit tool + Phaser-free enemy-stat
extraction, the systematic bayou rebalance, POI-overlap, Batch D, the cloak-slot separation, the
economy fixes, mini-boss HP bars, and now themed spawns is shipped + verified. **Next: a full
playtest** — all the rebalance/spawn/economy numbers are first-pass and want real play.
Prior: **Balance Audit dashboard tab +
Phaser-free enemy-stat extraction** (2026-07-23, Opus, no plan file). Built BEFORE the bayou
rebalance (the user's call) as the objective tool to guide it. New **`src/systems/enemyStats.ts`** — a
Phaser-free single source of truth for every enemy's combat stats (HP, per-attack damage + class +
cadence, move/burst speed, poise, scale, resistances, elite mults, biome), extracted from the entity
classes. The **entities now READ from it** (forest roster — Boar/Snake/Gremlin×2/GremlinKing — fully
wired + verified behavior-preserving in-game; badlands/bayou values mirror the code today and get
wired as each is next tuned, tracked in the module's WIRING STATUS block). The dashboard's new
**Balance Audit** tab (`/dashboard.html`) imports it live and computes the four ratios the playtest
complaints map to, color-coded red/amber/green against thresholds anchored to
[[feedback_size_enemies_against_player]]: **Kite** (enemy speed ÷ player sprint), **Hits-to-die**
(player HP ÷ damage-taken-per-hit, armor/mitigation applied), **TTK** (enemy HP ÷ resist-adjusted
player DPS), **Stagger** (enemy poise ÷ player dmg/hit, ⚠ if poise-DPS outpaces regen), across three
documented player checkpoints (Start/Mid/Geared). It objectively confirms the complaints: **Murkling
kite 1.25 (outruns your 138 sprint)**, **elite Mosswretch hits-to-die 0.8 (a literal one-shot)**,
**Corpselight 30 magic bypassing armor**, and the boss "-1/-2" being physical damage eaten by armor +
the 75% reduction cap. Extraction is Phaser-free (esbuild: 9.7kb, 0 Phaser refs); `tsc` +
`npm run build` clean; dashboard verified rendering with correct ratios + zero console errors. This
already surfaced real drift in the old hand-mirror (it claimed Cinderwrought resists blunt/pierce —
code resists nothing; called Hexling magic-resistant — it's magic-WEAK). **Next: the actual bayou
rebalance (Batch C), now data-driven.**
Also this session (detail above / in `### playtest-batch-2026-07-23`): the **Balance Audit dashboard
tab + Phaser-free enemy-stat extraction** that guided Batch C, **Playtest batch A (12 quick bug/UI
fixes)**, and the **continue-on-death test-mode button**. Still open from the ~45-item dump: **Batch B**
(POI/biome-border
overlap), **Batch D leftovers** (poison→regen-halving removal; resting scales with campfire level;
themed bayou spawns; Gremlin chest → heavy armor), the **cloak→R-slot** separation (locked: give
back-armor its own equip slot), trophy/elite-rarity + **Mire-Shard source** economy questions, and
**mini-boss big HP bars** (Cinderwrought/crypt wardens — differing second-meters, folds into a
boss-feel pass).
Prior: **B4-P6 — Perf regression
(display-list streaming), culled-enemy drift, 5 playtest fixes** (2026-07-22, Opus, no plan file —
a fix batch). The headline is a **structural perf fix**: the world had grown to **17,041 display
objects**, all of which Phaser iterates every frame and re-sorts whenever any depth changes — i.e.
every frame the player moves, which is exactly why the hitching only showed up while
walking/sprinting. Measured 22.3ms/frame with the sim *paused*. `updateSceneStreaming()` now parks
anything that can't be on screen out of `scene.children` (physics/AI/animation untouched):
**17,041 → ~1,550 objects, 22.3ms → 9.3ms**. Second: B4-P4's AI distance cull never stopped the
enemy it skipped, and Arcade velocity has no drag — so a creature culled mid-chase **coasted across
the map forever**, which is why Warren dens got stuck on wave 1 (guards alive but thousands of px
away), why gremlin camps looked unguarded, and why badlands Duskrunners turned up in the starting
forest. Fixed at the cull, plus a `homeX/homeY` leash that walks strayed **idle** enemies back.
Also: light-bearing jewelry now actually sheds light (its % multiplied a torch radius that was 0),
the craft-toast stack is capped and repacked instead of climbing off-screen, `WORLD_ZOOM` 1.25 →
1.5, and every `src/ui` font is +2px with the coupled layout constants adjusted. Verified live
throughout — panel overflow checked by measuring real text bounds, not by eye. `tsc` +
`npm run build` clean, zero console errors. A **second batch** in the same session cleared four
older items: the Sunken Gorge's **second maw was unusable** (reach was measured against maw #1, so
the other door gave no prompt and ate the click — this is what blocked the user's effigy run);
surface enemies can no longer be inside a dungeon (**hard invariant** now, since CRYPT_REALM sits
in the world square but outside the world circle, so the geometry permitting it is permanent);
dungeon transitions **snap the camera and fade up from black** instead of easing 14000px across the
world in full view; and the Ironshod Pickaxe finally has its own tier art like the axe. A **third
batch** then made **no character start with any gear** (`startingItems` emptied on all five — the
ability-granting `startingEquip` is untouched, since that *is* the class's ability, not gear;
verified the bare-handed opening still unlocks the Woodcutter's Axe off ground pickups) and split
the **upgrade-unlock toasts** by what the unlock buys: stations and tools keep theirs, gear ladder
rungs are logged silently. Same saturated inventory went from **88 toasts to 14**. **Next: a
playtest** — the zoom, type size, home leash and streaming window are all first-pass numbers.
Prior: **B4-P5 — Gear branching, set
bonuses to jewelry, pickaxe gate, Gemwright UI** (2026-07-22, Opus, plan
`.claude/plans/b4-p5-gear-branch-and-jewelry.md`). **Gear now branches**: Sunsteel was a dead end
(Gloamsteel reforges from an *Embersteel* piece), so a new bayou-grade **Mirebronze/Bogweave**
route reforges straight from Sunsteel/Duskhide. Both routes terminal; armor sits deliberately
between the tiers (heavy 20-32-**36**-42, light 15-24-**26**-30) so the longer Embersteel road
stays stronger. **Gloamsteel now costs Moonsilver** — crypt-warden-gated, which is what makes the
Embersteel route the dungeon-clearing one; seams 3 to 4 to cover demand. **All four set bonuses
moved off armor onto jewelry** (same effects, same numbers), which frees armor to be pure flat
armor and is what makes branching balanceable; the rule inverted to "highest rank worn" since each
bonus is now self-contained. New **Ironshod Pickaxe** (Sunsteel + Ironbark, badlands-crafted) gates
Bog Ore — the bayou's only surface ore, so it gates the whole bayou metal economy. **Gemwright**:
ability designs show a **Q/E/R badge** (derived from the item's slot), and gem setting moved out of
the shared Upgrade panel into a **Set Gems tab** with a live effect+cost preview. Two asks needed
no work and were reported as such: heavy-armor mitigation already covered fire and poison, and
armor already had no resistances or stat bonuses. Verified live and in Node; `tsc` +
`npm run build` clean. **Next: a playtest** — especially whether ~120 Moonsilver covers Gloamsteel
*and* the four new jewelry pieces in one run. See B4-P5 below.
Prior, older milestones (full entries in STATUS-archive.md — grep by id): **B4-P4** 25-item
playtest omnibus; **B4-P3** class skill affinities + stat potency; **B4-P2** epic loot pool +
lesser starter abilities; **B4-P1** start-of-run character picker; **B3-P5** post-boss Mythic
choice; **B3-P4d(1/2)** the bayou surface POIs + the Miretyrant lair; **B3-P4c** Sunken Crypts,
the dungeon mechanic; **B3-P4b** the bayou creature roster; **B3-P4a** bayou terrain/poison;
**B3-P3** bayou reforge tier + gem augments.

**In progress / next.** The **biome-2 (Sunscorch Badlands) umbrella is COMPLETE** (all 6 phases 0–5 —
patchwork worldgen through the relic rework; the badlands is a fully populated second biome with a
4-enemy roster, POIs, the Duneshaper — now a MID-boss, see below — and the smelting/forging gear +
tier-2 relic tiers). The
current arc is the **biome-3 (haunted bayou, working name "Duskmire Bayou") + new-systems roadmap**
(`.claude/plans/biome-3-and-new-systems-roadmap.md`, 5 phases). **Shipped so far:** **Phase 1**
(terrain-that-matters + badlands macro-zones), **Phase 2a** (the activated-ability framework + Dota
QER HUD), **Phase 2b** (the jewelry-effect pipeline + the Gemwright's Table), **Phase 3** (the bayou
gear progression — gem augments + the Gloamsteel/Mirehide reforge tier), **Phase 4a** (the
bayou's terrain, environment and material sources), **Phase 4b** (the creature roster), **Phase 4c**
(the Sunken Crypts dungeon mechanic), and now **all of Phase 4d** — **PHASE 4 IS COMPLETE**. It ran
to four sessions (the Dungeon mechanic was added mid-4a): **4a terrain/env/surface-sources — DONE**;
**4b — the melee-core roster** (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker + the one
ranged Corpselight haunt) — **DONE**, which sourced **Mirehide** and re-enabled the bayou's respawn
top-up; **4c — DUNGEONS — DONE** (6 themed Sunken Crypts; the 3 ability gems + Moonsilver finally
have a source, hard-gated behind a bespoke warden per gem); **4d — surface POIs + the Miretyrant**,
itself split in two, **both DONE**: session 1 (the Sunken Shrine + Drowned Lodge + the Tyrant Sigil /
Gorge Bone key materials) and session 2 (the **Miretyrant**, its own boss-level dungeon behind the
sealed Sunken Gorge, and the **win-con swap** — the Duneshaper is now a mid-boss and its **Heart**
is obtainable, unlocking the Gemwright's ability recipes). **Phase 5 — DONE**: the post-big-boss
reward choice, delivered as a **boss-trophy 3-Mythic pick inside the Relic Forge** rather than the
umbrella's kill-time modal (the user's redirect — see B3-P5). **THE BIOME-3 + NEW-SYSTEMS UMBRELLA
IS COMPLETE (all 5 phases).** The first post-umbrella milestone, **B4-P1 (start-of-run base
character)**, has now shipped. **Both of the roadmap's deferred "Later" sub-phases are now
done** — B4-P1 was one; the other, **RNG dungeons with build-defining miniboss drops**, was
already delivered by **B3-P4c (the Sunken Crypts)** and should not be re-planned as new work
(the user flagged this 2026-07-22 — it had been mistakenly listed as open). 4c satisfies it in
full, RNG included: `pickCryptPositions()` shuffles both the six crypt POSITIONS and their
THEME assignment off `sessionRng()` every run, each of the three themes is gated by its own
bespoke warden (Palewake / Kilnborn / Sanguinarch), and the ability gems + Moonsilver are hard-
gated `shielded` behind that kill — so *which crypt you clear decides which build you get*,
and which crypt is near you varies per run. **Genuinely open and unplanned:** a **biome-3
playtest/balance pass** (the bayou arc has never been played end-to-end — crypts, POIs, the
Miretyrant, the Mythic pick), **save/load** (roadmap item 8), and real pixel art/animation
(deliberately last). The five characters' stats/kits/modifiers are all first-pass and expected
to need tuning once they're actually played.
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

### "God run" triage + session 1 — bugs, ammo removal, end-of-run summary (2026-07-23, Opus)

Plan: `.claude/plans/vagabond-god-run-triage.md` (root causes, 7 bugs, decisions D1-D10, creature
kits C1-C3, 3-session split). This entry covers the triage and **session 1 only**.

**Triage findings (measured from code, before any change).**
- **Lifesteal scales with AOE target count; incoming damage does not.** `resolveWeaponHit` runs
  once per target — primary, arc sweep, on-hit burst, crit splash — and weapon lifelink, the Leech
  relic and Bloodpact all heal inside it. Against the user's kit one swing into 5 enemies dealt
  ~170 damage across targets => ~22 HP/swing => **~40 HP/s** against a 308 HP pool. His own "maybe
  magic shouldn't crit" hypothesis was considered and **rejected**: crit is only the multiplier
  that makes each of N instances big, so nerfing it leaves the scaling intact.
- **Wisdom over-caps.** Ability cooldown caps at -50%, reached at exactly 100 points; he had 112.
  At the cap Bloodrush is 11s cooldown / 6s active = 55% uptime on +67% attack speed.
- **Intelligence is an undamped feedback loop.** Int -> skill XP -> skill level-ups are the *only*
  player-XP source -> stat points -> Int. Skills are capped (`MAX_SKILL_LEVEL` 100); **stats are
  not capped at all**, which is what he saw pass 100.
- Cross-biome: bayou commons scaled x4.1 from badlands while minibosses scaled x1.08, so
  miniboss/toughest-common is 1.0-1.5x where badlands is 2.7-6.8x (D10).

**Session 1 — shipped.**
- **D1, ammo removed entirely.** No `ammo` `EquipSlot` or group, no `EquippedItem.count`, no
  `reconcileAmmoSlot`, no arrow/pellet items or their four recipes. `RangedWeaponConfig.ammoItemKey`
  became `ammo: "none" | "self"` — every launcher and bow is `"none"`, the Javelin is `"self"`
  because it *is* the projectile. Kills two reported bugs outright: the Gloamsteel reforge that
  logged *"Loaded Arrows"* then silently evicted them, and the "stacks that won't combine" (almost
  certainly `arrows` beside `gloam_arrows` with near-identical icons).
- **D7, end-of-run summary.** New framework-free `src/systems/RunLog.ts` + a second column on
  `RunEndUI`: damage dealt **split by attack slice**, healing **split by source**, damage taken by
  species, kills, a relic-roll tally (settles "4 rares in a row?") and a milestone timeline.
  Deliberately **not** the requested event log — a craft list answers nothing; attribution is what
  no one can see from inside a run. Made player-facing per the user rather than a dev export.
  **Nothing truncates silently** (the user: "what happens when that list gets huge?"): the two
  genuinely unbounded categories are AGGREGATED rather than listed — 31 relic rolls become a
  5-row outcome tally, not "the last 3" — and every top-N block carries a `+N more` tail with the
  damage/kills it represents, with the timeline labelled "last 6 of 19". The panel is not
  scrollable or collapsible **by design**: it stays a one-screen summary, and aggregating is
  lossless at bounded height where a scroll pane would just be a longer list.
- **"New Run" from the pause menu now ends the run** (`abandonRun`) — scored, recorded and
  summarised like any other. It used to `scene.restart()` silently, producing no score at all, and
  it is the path a player takes most often.
- **D8**: chest menu dropped the backpack panel (600x400 -> 234x216); [R] Take All and
  double/Ctrl-click quick-move still do everything that actually moved items.
- **B2**: `sunsteel_warbow`, `embersteel_warbow` and all three Mirebronze weapons had **no
  upgrades registered at all** — a plain omission that dead-ended ranged and Sunsteel-branch
  builds. Auditing every weapon and armor piece afterwards found the same bug one layer over: the
  **entire Mirebronze (heavy) + Bogweave (light) armor sets** had none either. Now registered
  (+3/+7 helm and greaves, +4/+8 cuirass, +2/+3 per Bogweave piece, Mirebronze Ingot at bench Lvl
  4). Every armor piece with a defense stat now has a path; only `wood_club`/`slingshot`/`javelin`
  lack one, deliberately — tier-0 starters.
- **B6**: melee deaggro. Mirejaw `STALK_RADIUS` 460->330 and `DEAGGRO_RADIUS` 720->520 (both were
  outside the ~360px visible half-height / ~734px half-diagonal, so it aggro'd off-screen and could
  not lose you), plus a new **hard `MAX_PURSUIT_MS` ceiling on base `Enemy`** that a landed hit
  cannot reset — the melee half of the same defect the ranged casters got fixed for last session,
  since a gator chomping every 1.2s refreshed the 30s give-up clock forever.
- **B1**: inventory flicker — `refresh()` was a full teardown/rebuild per item movement, i.e. per
  magnet pickup. Now coalesced to one repaint per frame, and a refresh-driven render keeps the
  tooltip (Phaser won't re-fire `pointerover` on the rebuilt object until the pointer moves, which
  is what made it strobe).
- **B5**: the `Gem augments: N/2` line no longer advertises the Gemwright's Table pre-discovery.
- **B7**: all 10 ability descriptions now state real numbers (5 were pure flavour).

**Verified live** via the preview (`tsc` + `npm run build` clean, zero console errors):
bow fires with zero ammo items in existence and still spends stamina; all 6 weapons report 2
upgrades; no ability description lacks a digit; all 3 ammo items and 4 recipes gone; Mirejaw aggros
at <=320px and not at >=340; the pursuit ceiling fires at 45.6s while landing hits every 1.2s
(previously never) and the 30s no-hit rule is unchanged; 20 refreshes across 2 frames produce 2
renders; the gem line is hidden pre-discovery and shown after; pause "New Run" ends+scores+
summarises; and the summary panel was measured at its **saturated worst case** (95 text objects) for
zero overflow and 31px button clearance.

**Two bugs caught by verification, not by the compiler.** (1) The pursuit ceiling was only cleared
by `enterGivenUpState`, but most subclasses deaggro by DISTANCE and never call it (Mirejaw just
submerges) — a gator that lost you once would have carried a spent ceiling forever and
insta-given-up on every later fight. Now re-stamped whenever the aggro-persistence window has
lapsed, which every aggro path reaches. (2) `RunEndUI` at 600px tall fit the sparse test data and
would have overflowed a real run; at 700 the last timeline row still ran into the button strip,
and 740 broke again once the `+N more` tails were added. Sized to **844**, verified against a
saturated log (12 damage sources, 9 kill species, 31 relic rolls, 19 milestones) with 33px of
button clearance — if a block ever gains rows, re-verify saturated, not on a typical run.

`RECIPES.md` updated (ammo tables removed, warbow/Mirebronze upgrades noted). **Next: session 2,
the balance pass (D2-D6, D9, D10) — all decided, verify in one run.**

### "God run" triage session 2 — the balance pass, D2/D3/D4/D5/D9/D10 (2026-07-23, Sonnet)

Plan: `.claude/plans/vagabond-god-run-triage.md`. Session 1 (bugs, ammo removal, the
end-of-run summary) shipped earlier the same day; this closes out every remaining locked
decision from the triage except the creature-identity pass (session 3, next).

**D2 — per-swing lifesteal cap.** The actual fix for the god-run's headline finding
(`resolveWeaponHit` runs once per target an AOE swing hits, and Leech/Bloodpact/weapon
lifelink each heal inside it independently, so total healing scaled with target count while
incoming damage didn't). New `swingHealBudget`/`swingHealCapArmed`/`swingHealApplied` fields +
a `budgetedSwingHeal()` helper: reset when a swing's primary hit fires (`isBurstSource`),
armed right after that hit's own heals resolve so "the primary's contribution" is the SUM
across every active source, not any one alone. Every heal source (including Leech's
overheal->shield banking, budgeted BEFORE the shield conversion so capping only stops the HP
portion) routes through it instead of calling `health.heal()` directly. Verified live: a
6-target Gloamdrinker swing with Leech + Bloodpact + weapon lifelink all active clamped at
exactly budget=applied=15 across 3 consecutive fresh swings (no carry-over); a single-target
swing and a lone ranged shot both healed fully uncapped (nothing to clamp against).

**D3 — bow buff.** All 3 Warbows +40% damage / -25% cooldown (11/15/20 -> 15/21/28 dmg,
750/730/720 -> 560/545/540ms). Verified each tier's bow DPS now sits inside its own tier's
forged-melee band (Sunsteel 26.8 vs Warhammer 21.3/Sword-Pike 29-31; Embersteel 38.5 vs
28.75/40-41; Gloamsteel 51.9 vs 37.5/52.5-53.2) rather than trailing it. `RECIPES.md`'s bow
table gained a DPS column.

**D4 — XP rebaseline.** `Progression.ts` `XP_BASE` 110->85 (~1.29x) is the real player-level
pace fix, sized to roughly match what the Ashcaller's own `character.xpMult` (1.3) gave a
neutral class for free. **Correctness finding caught mid-implementation and fixed before
shipping:** `Skills.ts`'s `skillXpToNext` coefficient looks like an equivalent lever but is
provably a NO-OP for player-level pace — verified by simulation (a fixed raw-XP budget fed
through the real skill->player feed produces MORE skill level-ups at a lower coefficient but
the IDENTICAL player level), because a skill level's cost literally IS the player-XP it
feeds; lowering the coefficient just re-chunks the same total into smaller deposits. Lowered
it anyway (70->54, a real independent win for skill-level/recipe-unlock pace) but rewrote
both files' comments to state the correct mechanism rather than repeat the original S1-batch
comment's same (also unverified) claim. Ashcaller (`Characters.ts`) trimmed: `xpMult`
1.3->1.15, `skillXpMult` magic 1.6->1.35/ranged 1.4->1.2, `statPotency.intelligence`
1.5->1.25 — these three stack MULTIPLICATIVELY (skillXpMult applies outside the additive
bonus bucket xpMult and Intelligence both feed), so a magic-heavy Ashcaller could earn 2x+ XP
on its main skill before a single stat point. Bane and the heavy_armor penalty untouched.
Verified live via the real `awardSkillXp` path: trimmed Ashcaller now gives ~1.63x on its
favored skill vs neutral (was 2.08x+ pre-trim, before any stat investment).

**D5 — jewelry pickup-radius replaced.** `magnetRadiusPct` removed entirely from
`EquipmentEffects` (channel, sums, describePassive, the getter, its one MainScene call
site) — not left dead. Folded into the already-wired `gatherBonusPct` on the 3 affected items
(Ring of the Forager merged 15+30->30 into the dedicated gather ring; Lantern of the Long
Dark 40->20; Amulet of Farsight 20->10). `RECIPES.md` jewelry table updated.

**D9 — stat caps surfaced, not blocked.** Wisdom's -50% ability-cooldown cap (100 points,
the user had 112) now shows "(CAPPED — this axis is maxed)" on the Stats tab once reached —
self-contained in `Progression.ts` (`wisdomAbilityCdrCapped()`) since it depends only on the
stat. Same audit found Strength/Agility's crit contribution is ALSO capped
(`CRIT_MULT_CAP`/`CRIT_CHANCE_CAP`) but build-dependent (weapon + stat + relics + gear
augments combined), so those read live off the equipped weapon via a new optional
`critCapped` dep rather than a fixed point threshold. Deliberately NO universal hard
allocation ceiling — Endurance/Vitality/Intelligence and Wisdom's OTHER axis (buff duration)
are genuinely uncapped by design; blocking them would remove real value to fix a problem only
3 of 6 stat axes actually have. Verified: the boolean flips at exactly 100 Wisdom points (99
false/100 true); the marker renders/omits correctly across all 3 capped axes and is absent
when unarmed (crit has no context without a weapon).

**D10 — bayou common->miniboss gap.** Measured: miniboss HP ÷ toughest common was 1.0-1.5x
here vs 2.7-6.8x in badlands, because bayou commons had scaled x4.1 from badlands while the 3
crypt wardens only moved x1.08 (Mosswretch was literally the SAME HP as the Palewake next to
it). Fixed from both ends per the locked even split: commons -15-30% (Mosswretch 420->300,
Mirejaw 320->260, Corpselight 190->160, Blighttoad 150->130, Murkling unchanged at 40 —
swarm), wardens roughly doubled (Palewake 420->850, Kilnborn 440->1000, Sanguinarch
620->1350) with matching damage bumps (Kilnborn backdraft 58->72, Sanguinarch slam 72->88,
Palewake tether 10->14/s). Verified live via `enemyStat()` AND real spawned entities: spread
now 2.8-4.5x (target hit exactly), boss->toughest-common 12x. **Self-caught arithmetic error
in my own plan doc:** it had claimed "miniboss->boss 3.4x" and cited badlands at "5.5x" —
both were slips from earlier in the session; re-measured live as 2.67x (3600/1350) and 3.85x
(2500/650) respectively, and the plan doc corrected in place with the real numbers rather
than left standing. Also found and fixed pre-existing dashboard drift while in
`enemyStats.ts`: Palewake/Kilnborn's `src/dashboard/main.ts` HP entries were stale from an
EARLIER same-day rebalance pass that never reached the dashboard (240/300 shown, code already
at 420/440 before this session even started) — resynced all 8 touched enemies' dashboard
entries. **Known remaining drift, explicitly out of scope this session:**
Mirejaw/Blighttoad/Mosswretch/Murkling/Corpselight's dashboard ATTACK damage numbers are
stale from that same earlier pass, and the CUT Fenlurker is still listed as a live enemy in
the dashboard — flagged, not silently expanded into.

All changes verified live via `preview_eval`; `tsc` + `npm run build` clean throughout, zero
console errors/warnings across every check. `RECIPES.md` updated (bow DPS table, jewelry
table). **Next: session 3, the creature-identity pass (Opus) — Mirejaw/Mosswretch/Corpselight
kits, fully speced in the plan doc.**

### Vagabond-run playtest fix batch 2 (2026-07-24, Sonnet)

No plan file — a fix/tuning batch off the user's own end-of-run summary (Ashcaller, badlands+bayou
kit: Embersteel Warbow + badlands light armor) plus a fresh round of playtest notes. Design
decisions (nerf-ranged vs. buff-enemy-anti-kite vs. reduce-sustain vs. a light combined pass, plus
crit-splash's scope and the bow's move-slow %) were confirmed via `AskUserQuestion` before touching
anything; two ambiguous complaints ("little tree dudes don't hit me" / recipe-chain visibility) were
resolved by live investigation rather than guessed at.

**The diagnosis, confirmed by the user's own Run Summary after the fact:** 80% of all damage dealt
was Ranged (48,965 of 60,982), melee only 20% combined; 72% of all healing was the Leech relic
(3,439 of 4,747); only 6,639 total damage taken across a full run to two bosses. The two shipped
changes target those two lines directly.

**Balance (all locked decisions):**
- **Crit-splash relics → melee-only** (`MainScene.resolveWeaponHit`, gated on `source !== "Ranged"`;
  `Relics.ts` description text updated to say so). Ranged weapons carry no weapon-arc splash of
  their own (`WEAPON_ARC` is `{range:0}` for every bow) — crit-splash was the ONLY thing turning a
  single-target bow into horde-clear, and at a 60%-capped crit chance it fired on the majority of
  shots. Verified live: a forced ranged crit (`resolveWeaponHit(..., "Ranged")`) no longer splashes
  to a nearby enemy; the identical forced hit with `source: "Weapon (direct)"` still does.
- **Ranged fire-slow** — firing any ranged weapon sets `rangedFireSlowUntil` (350ms), folded as a
  separate multiplicative 0.72x term into `Player.update`'s envMult (kept OUT of
  `currentEnvMoveMult` so the terrain tooltip doesn't misattribute it) — an anti-kite governor per
  the user's "25-30%, not 40%" note. Verified live via `tryRangedAttack`.
- **Leech relic trimmed**: Reaper Totem 3%→2%, Bloodlord's Mantle 5%→4% (`Relics.ts`). `RECIPES.md`
  relic tables updated for both this and the crit-splash description change.
- **Duneshaper arena poison** — the user: "doesn't normally have poison, it was from the overlap of
  the bayou area." Root cause: `TYRANT_ALTAR_CLEAR_RADIUS` (360px) only gates where a bayou zone's
  CENTER gets picked; a miasma zone's own radius (up to 780px, more with `selfSep` merging) can still
  reach into the arena from just outside that exclusion. `baseSurfaceEnvironmentAt` now returns
  neutral unconditionally within the clear radius of any tyrant altar. Verified live: injecting a
  fake miasma zone dead-centered on a real altar reads neutral 100px from center, but still poisons
  normally 700px out (regression check — the fix isn't a global miasma kill switch).

**Bugs fixed (no design call needed):**
- **CraftingMenu flicker was a gap in the earlier B1 fix.** `InventoryMenu.refresh()` was coalesced
  to one repaint/frame; `CraftingMenu.refresh()` — shown right beside it under the same Tab panel,
  and called once per collected node via `collectNode()` → `refreshDiscovery()` → `craftingMenu
  .refresh()` — was still an uncoalesced direct `render()` every call. Given the exact same
  `refreshQueued` + `POST_UPDATE`-deferred pattern `InventoryMenu` already used. Verified live: 5
  rapid `refresh()` calls in one frame now produce exactly 1 deferred repaint instead of 5.
- **Mosswretch's spore cloud did nothing underground.** `environmentEffectAt` short-circuited to
  "only the Miretyrant's own mire pools matter" the instant `activeDungeon` was set, never reaching
  `foldSporeCloud` at all — but Mosswretch IS themed crypt/lair-approach dweller content (see
  `populateCrypt`'s "bruiser room" weight and the Miretyrant approach spawn). Fixed by routing the
  dungeon branch's base effect through `foldSporeCloud` too. Verified live: injecting a spore cloud
  and forcing `activeDungeon` truthy now correctly reads `moveMult 0.6/poisonDps 5` at the cloud's
  position, neutral elsewhere.
- **Stale weapon Stamina display.** Every weapon's `Items.ts` `stats` array is hand-authored text;
  Damage/Attack Speed/Armor were already recomputed live in `Tooltip.statValue`/`CraftingMenu
  .statValue`, but Stamina fell through to the raw authored string — drifted to "15" for the
  Embersteel Warbow after a balance pass moved the real `WEAPON_STAMINA_COST` to 11. Both
  `statValue` methods now read `weaponStaminaCost()` live, closing this class of drift for every
  weapon at once (the dashboard was never affected — it already read live). Verified live via both
  methods directly.
- **"Little tree dudes don't hit me, even standing still" — misfiled as Murkling, actually
  Mosswretch/Mossling.** Murkling was tested twice live (solo and a 6-pack) and connected correctly
  both times — no bug there; the pack test, if anything, showed it can burst a full-HP player to 0
  in under a second when several swings land on the same frame, the opposite problem. The real
  defect: `SMASH_SWING`'s `tell.rearBackSpeed` (46px/s, added for an earlier "hard to predict"
  telegraph complaint) reared the creature back for the FULL 780ms windup regardless of how close it
  started — enough drift (~36px) to carry it clean past its own 88px reach before the strike-time
  recheck, even against a player who never moved. Fixed in the shared `Enemy.tickMeleeSwing` engine:
  the rear-back now stops once retreating would cross the swing's own effective reach (with a small
  4px buffer for one-frame lag), affecting every current/future user of `tell.rearBackSpeed`, not
  just this creature. **Verified live and rigorously** (multiple false leads caught and ruled out
  along the way — a test-harness gotcha where splitting a timing-sensitive sim across separate
  `preview_eval` calls feeds Phaser's loop a clock that jumps backward and corrupts its delta
  tracking; always run one continuous script per timing test): a Mossling that missed 100% of the
  time over a 10-second window pre-fix now lands hits reliably (33 dmg each, matching spec) at
  84-90px, and the parent Mosswretch's identical code path was confirmed via the same mechanism.
- **Transitive recipe discovery.** the user: seeing Emberhide's recipe should only require Duskhide's
  RECIPE being known plus Embersteel — not an actual crafted Duskhide piece. `Crafting.ingredientsKnown`
  now also treats an ingredient as known if any already-discovered recipe produces it
  (`isKnownIngredient`, new), resolving transitively across repeated `refresh()` calls (which fire on
  essentially every state change) without needing explicit recursion. Verified live: Emberhide Vest's
  recipe unlocked in the same `refresh()` pass as Duskhide Vest's, with `duskhide_vest` never added
  to the discovered-items set at all.
- **Welcome popup reworded** (`WelcomeUI.ts`) — dropped the now-stale "this first biome is just the
  start" line (three biomes and multiple bosses now exist), replaced with a general "the game keeps
  growing between sessions" framing; removed the inline hotkey dump (Tab/K/Esc, Ctrl+Click/
  Shift+Click) in favor of pointing players at Pause → Tips (the full how-to-play reference) and the
  Keybinds panel (top-left, full control list) — per the user: "don't give them a bunch of hotkeys at
  this time." Verified live: both pages render within the existing panel height with no overflow.

`tsc` + `npm run build` clean throughout. A stray esbuild "Unexpected case" error appeared in the
Vite log during the Enemy.ts edit — traced to an 11-second window mid-edit before the closing brace
was added, self-resolved on the next save, and predates every live verification in this batch.
`RECIPES.md` updated (relic tables only — no recipe/cost changes otherwise).

### Warden-run playtest batch — the flat-armor collapse (2026-07-24, Opus)

No plan file. Off the user's Warden victory run (77:55, 633 kills, level 28, full Gloamsteel +
Gloamsteel Longsword) and a ~17-item feedback dump. Scope and the two design forks were locked
via `AskUserQuestion` before any code changed.

**THE ROOT CAUSE — one line explained most of the dump.** `applyDamageToPlayer` computes
`max(1, round(dmg × (1 − relicRed) − flatArmor))`. Flat armor is uncapped and had grown
**10.5×** across three biomes (full heavy set: 7 → 13 → 56 → **74**, 83 with augments) while the
strongest attack in the game grew **2×** (60 → 124). So essentially **every physical attack in
biomes 2 and 3 was pinned to the `max(1, …)` floor**, the win-con boss included. That single
fact accounts for: Miretyrant hitting for -1/-2/-12, Murklings doing 1, the Duneshaper's
"5-circle attack" doing 1 (it is Sand Spikes — `buildSpikesCross` = centre + 4 arms — and the
boss's ONLY physical attack, while its four magic ones bypassed armor and landed full), "bayou
enemies are so weak", the 5:1 badlands-vs-bayou danger ratio, and "I don't feel like I need the
next tier of gear". It also explains the two things the user singled out as *correct*: the
Corpselight/Mosswretch woods felt right because Corpselight orbs are `magic` and Mosswretch's
smash was one of only two physical hits big enough to clear 74 armor at all — and "Mosswretch
elites do way more damage than any of the minibosses" was literally true, since elite smash
landed 25 while Gloamwarden's 22/24 attacks and Sanguinarch's 50 both landed **1**.

**the user's call: keep flat subtraction** ("no this is confusing, should always be flat
subtraction") and **raise enemy damage to match today's armor** rather than compress armor or
switch to a DR curve. So this is a numbers pass, not a formula change.

**Wiring first — three enemies were silently ignoring the balance table.** `enemyStats.ts` said
Sanguinarch did 34/88 and Kilnborn's backdraft 72; the entities were still running **15/50** and
**58**. The HP half of that buff had landed (entities read `S.hp`), the damage half never did,
and nothing could catch it. **Every remaining un-wired entity is now wired** (all of badlands +
Palewake/Kilnborn/Sanguinarch), so the drift class is closed. Two unit traps found while wiring:
Palewake's tether table value is per-SECOND but the entity ticks every 450ms, so the hardcoded
10/tick was actually 22/s — the entity was doing *more* than the table advertised, not less;
same for Kilnborn's burning ground (7 per 620ms = 11/s). Both now convert properly.

**New sizing rule, documented at the top of `enemyStats.ts`:** size an attack by the NET number
you want it to land through its biome's armor, not by its paper value. Both prior Miretyrant
passes claimed to target "~35-55 net through 74 armor" and both failed the same way — they
picked raw numbers and never did the subtraction.

**Numbers (verified live, below).** Bayou commons 38-80 → 108-170; Mirejaw death-roll tick
18 → 105 (a per-tick 18 was under armor three times over, so the signature move landed 3 total);
crypt wardens Sanguinarch 15/50 → 118/205, Kilnborn 30/58/7 → 48/105/20, Palewake 22/s → 30/s;
**Miretyrant 110/98/124/92 → 225/210/255/200**. Badlands was deliberately left almost alone
(the user reports biome 1→2 progression feels right) — only the two clearly-broken things:
Gloamwarden 22/24 → 78/84 (its attacks were *below* a full Sunsteel set's armor, so the vein
guardian could not exceed 1 damage against any heavy build) and Duneshaper Sand Spikes 56 → 125.

**The rest of the batch:**
- **Miretyrant adds** are now **elite** and the mix flipped to favour Blighttoad (45/55). the user:
  "the ADDs are useless because my crit splash insta kills them." The ratio flip matters more than
  the elite flag — a Murkling's claw is physical and so is the first thing an endgame armor pool
  erases, while a Blighttoad's payload is poison, which bypasses armor entirely.
- **Delayed poison death-bloom** (the user's own suggestion). A killed Blighttoad's corpse swells
  for a telegraphed 1.1s fuse, then bursts into a poison cloud. Reuses the Mosswretch spore-cloud
  hazard record wholesale — no new damage code, expiry sweep or environment hook. Elite blooms
  deny *more ground* (2 offset clouds) rather than more damage, because `foldSporeCloud` is a
  boolean "inside any cloud" test that maxes dps rather than summing it, so stacking clouds on one
  point would have been a silent no-op.
- **Ranged "mini-stun" removed.** There was never a stagger mechanic — it was
  `Enemy.playHitFeedback`'s x-shake, which previously skipped only *moving* attackers on the theory
  that jittering a planted one was harmless. A planted attacker is exactly what a ranged player
  creates, so every arrow visibly knocked a casting enemy sideways. Any committed attack phase now
  suppresses it.
- **Bows reined in.** D3 raised bow damage +40% and cut cooldowns -25%; the cooldown half was right
  and is kept, the damage half had put every Warbow *above* its same-tier Sword per hit (15>14,
  21>19, 28>25) at 92-98% of its DPS from 380-420px away. Now 12/16/21 — under the Sword per hit
  and a consistent **73%** of its DPS.
- **Palewake's tether no longer drops while it's invisible** (the user). It was cleared on entering
  the stalk, so a third of every cycle was dead air in which the fight's only damage source did
  nothing *and* the boss could not be hit. Deliberately no unravel from a stalk-phase break — the
  punish window is still earned by breaking the committed channel.
- **Bayou elite/trophy density.** Both bayou POIs bypassed the elite roll entirely (Sunken Shrine
  waves 1-2 and *every* Drowned Lodge resident were hardcoded normal) and both dungeons rolled at
  the 8% badlands base rather than the bayou's 16%. Now: crypts/lair **41%**
  (`CRYPT_ELITE_CHANCE_MULT` — answers "dungeons are easy" and the trophy drought with one lever,
  since a crypt is fixed, finite and non-respawning), POIs **24%**, and the Shrine rite escalates to
  an **all-elite final wave** (the Duskrunner Warren's shape, which is what the user asked for).
- **Warden's boon swapped**, `maxHpPct: 20` → `damageTakenMult: 0.85`. the user asked whether
  1.5× vitality potency + 20% max HP was safe; it wasn't, and it was also broken in the other
  direction — `maxHpPct` is a % of the **100 base**, so "+20% max HP" was a flat +20, about 4% of
  his endgame pool. Damage reduction is a multiplier (never decays) on an axis the card's vitality
  potency doesn't already own. **NOTE:** every other `maxHpPct`/`maxStaminaPct` modifier has the
  same decay problem — the Vagabond's "-10% max Stamina" and Ashcaller's "-15% max HP" *banes*
  quietly evaporate late-game. Left alone pending the user's call.
- **Corpselight friendly fire: no bug.** Enemy projectiles only ever overlap the player; there is
  no enemy-vs-enemy damage path anywhere in the codebase. Mosslings are 16% HP and force-aggro on
  spawn, so the player's own AOE/crit-splash is what kills them.
- **Flicker fixed.** `HotbarUI`, `UpgradeMenu` and `EventLogUI` all did a synchronous full
  destroy-and-rebuild per call, and MainScene called them repeatedly per frame (Hotbar twice per
  equip, once per collected node — so N times during a magnet sweep). All three given the same
  `refreshQueued` + `POST_UPDATE` coalescing `InventoryMenu`/`CraftingMenu` already had, plus a
  redundant `hotbarUI.refresh()` removed from `afterItemMove` (verified redundant:
  `recomputeEquipped` has no early return). Measured 12 calls → 12 rebuilds, now → **1**. Also
  fixed a knock-on the coalescing exposed: the surviving repaint still killed the hover tooltip,
  and Phaser won't re-fire `pointerover` until the pointer physically moves, so a hovered slot's
  tooltip vanished for good.
- **Ability slots are now player-chosen** (the user: "I should be able to drag and drop it in").
  Every ability item declares `armorSlot: "ability1"`, and the drop gate was an *equality* check, so
  dropping on E or R always snapped back and equips always auto-filled the first free slot. The gate
  now compares slot GROUP and threads the hovered slot through as an explicit target; paper-doll →
  paper-doll is a real swap instead of a no-op, so Q/E/R can be reordered without unequipping.
  Group-generic, so the 4-slot `special` group got the same capability for free. Quick-equip
  (double/Ctrl-click) deliberately still auto-fills.

**Verification.** `tsc` + `npm run build` clean, zero console errors. Live against the running dev
server: table values reach the entities; end-to-end `applyDamageToPlayer` at a real
`totalPlayerDefense` of **74** and a 500 HP pool gives Miretyrant slam **181** (141 with a typical
-15.8% relic — ~4 hits), chomp 151/115, Mosswretch 91/65, Murkling 34/17 (was 1); light Mirehide
(36 armor) takes 219 and Embersteel (56, entering the biome) 199, so the gear tier now reads.
Death bloom: 0 clouds during the fuse, 1 after, 3 for an elite, hazard confirmed at the point
(`moveMult 0.6 / poisonDps 5`). Palewake drained **70 damage while invisible** across a full cycle
(previously 0) plus 126 while manifest. Hit-feedback: 0 tweens while attacking, 1 while idle.
Elite rates over 20k rolls: base 7.9%, bayou surface 16.1%, POI 24.4%, crypt 40.6%. Two bugs in my
own test harness were caught and fixed rather than reported as results — a wrong Equipment slot id
(`gear1` vs `helmet`) that read armor as 0, and a wrong `Palewake.update` argument order.

**Housekeeping:** a stray duplicate `## Recent Entries` heading left mid-file by an earlier prune
was removed, and the oldest entry moved to `STATUS-archive.md`.

### Survivor roster rework — distinctive, non-decaying, double-edged (2026-07-24, Opus)

No plan file; a follow-on to the same session's damage batch, prompted by the `maxHpPct` decay
finding. the user: "consider a rework of the starting survivors... I want them to feel distinctive
and double edged sworded." Three forks locked via `AskUserQuestion`.

**Three problems found:**
1. **Two of the five cards had no bane left.** `maxHpPct`/`maxStaminaPct` were a % of the **100
   base**, so they decayed as pools grew: the Vagabond's "−10% max Stamina" was −10 off a ~310
   pool (**3%**) and the Ashcaller's "−15% max HP" was −15 off ~340 (**4%**). Both were, in
   practice, free-upside cards — the same decay that made the Warden's "+20% max HP" boon
   worthless, pointing the other way.
2. **Every modifier was the same shape** — one global scalar up, one global scalar down. The
   affinities carried all the class identity; the modifier layer read as a stat line.
3. **Two cards shared `damageTakenMult` as their boon** (Warden + Ascetic), an overlap introduced
   earlier the same session.

**Locked decisions:** behavioural edges (not just numbers); `maxHpPct` becomes a **true
multiplier**; and — the user's own framing — **no double-stacking an axis**: "I dont want them to
double stack i.e. -20% max hp AND vit is hit. doesnt make sense". **No hard limits** (a modifier
never locks out content, so a bad pick can't dead-end a 70-minute run).

**ONE AXIS, ONE LEVER is now a structural rule**, not a convention. Several `RunModifier` fields
govern exactly what a stat potency governs (`maxHpMult`↔vitality, `staminaRegenMult`↔endurance,
`xpMult`↔intelligence, `buffDurationMult`↔wisdom), so a card carrying both silently applied two
multipliers to one axis. A `MODIFIER_STAT_AXIS` map plus a module-load `console.warn` guard now
enforces it, alongside the existing never-reduce-drops guard. The Ashcaller was the user's own
worked example and had **three** such clashes (vitality, intelligence *and* wisdom) — resolving
them also finishes the job D4 started, since the multiplicative xp stack is now two terms, not
three.

**Seven new `RunModifier` fields, each one line at a choke point that already existed** —
`maxHpMult` (syncStatBonuses), `killHealBonus` (the on-kill heal site), `staminaRegenMult`
(`Stamina.setRegenMult`), `buffDurationMult` (`Buffs.setDurationMult`), `maxBuffs`
(`Buffs.setMaxBuffs`, previously a hardcoded 3, now `DEFAULT_MAX_BUFFS` + a per-card override),
`attackSpeedMult` (`attackCooldownMult()`, so all three attack paths inherit it), `eliteLootMult`
(the loot spawn loop, elites only). `maxStaminaPct` was **retired rather than kept as a future
lever**, per the file's own "a new field is a deliberate decision, not a freebie" rule.
`boon`/`bane` became `boons[]`/`banes[]` since most cards now carry a scalar pair *and* a
behavioural edge; all three display sites (CharacterSelectUI, CharacterMenu, dashboard) render
them like the existing affinity lines.

**The roster:**
| Card | Boons | Banes | Identity |
|---|---|---|---|
| **Vagabond** | +15% move speed, +50% stamina regen | −25% damage dealt | Outruns anything, never runs dry, kills slowly |
| **Reaver** | +30% damage dealt, +6 HP per kill | +25% damage taken, −20% max HP | Sustains by killing — backing off is what kills you |
| **Ashcaller** | +15% skill XP, buffs last 60% longer | −25% max HP, **only ONE buff at a time** | Fragile scholar living on one long, well-chosen buff |
| **Warden** | −15% damage taken | +20% stamina cost, −13% attack speed | Slow, deliberate, unkillable; the gatherer |
| **Ascetic** | Elites drop **double loot** | Elites are **twice as common** | The greed card — the only one that changes the world, not the player |

**One pre-existing inconsistency fixed in passing:** `syncStatBonuses` assembled stamina off a
literal `100` while `Stamina.MAX_STAMINA` is **130**. It happened to cancel out (`setBonusMax`
subtracted the same 100), but it would have silently mis-scaled the moment a multiplier was
applied to that pool. Now uses the real base; verified a no-op for the existing case (130 at 0
Endurance on every card).

**Verification.** `tsc` + `npm run build` clean, zero console errors/warnings (the new axis guard
stays quiet). Live: the roster loads with **zero axis clashes** under an independent re-check of
the rule (not just trusting the guard). The load-bearing test — `maxHpMult` holds at exactly
**75% / 80% of baseline at BOTH 0 and 60 Vitality points** (255/340 and 272/340), i.e. the decay
is gone; under the old system the Ashcaller's bane went from 15% to 4.4% over that same range.
Every hook read back correctly per card (Warden `attackCooldownMult` 1.15, Ashcaller `maxBuffs`
**1** and buff duration ×1.66, Vagabond stamina regen ×1.56 and damage ×0.75, Reaver kill-heal 6,
Ascetic elite chance/loot ×2). Elite loot doubling is correctly **scoped**: baseline normal 2,
baseline elite 2, Ascetic normal 2, Ascetic **elite 4**. Character-select screenshotted — all five
cards render the longer trait blocks with no overflow (bottom-most object exactly at the 1080
screen edge).

**Promo poster re-rendered** (`promo/gloamreach-playtest-invite.html` → `.png`): its five survivor
cards carried the old modifier lines verbatim. Blurbs and boon/bane lines updated to match, then
re-rendered via the documented headless-Chrome recipe. Body height is unchanged at 1710 (2400×3420
at scale 2) because `.blurb { flex: 1 }` absorbs the extra mod lines inside each card, so all five
cards stay the same height and the `starts with …` footers stay aligned — verified by measuring
every card's height and footer position before rendering. The Reaver's kill-heal is written as
"Restore HP on every kill" rather than the literal 6, since a raw HP number is meaningless on a
poster without knowing pool sizes and would drift on every tuning pass.

**All numbers first-pass/tunable.** The Reaver is the card most likely to need it: +25% damage
taken *and* −20% max HP against the newly-lethal bayou is the sharpest edge on the roster, and
the 6 HP/kill that pays for it does nothing during a boss fight, where there is nothing to kill.


### Full-screen flicker on equip/place — the real root cause (2026-07-24, Opus)

No plan file; a one-line fix off the user's report that the flicker "continues to be a thing —
every time I equip an item or place a thing the whole screen flickers and I see a flash of another
view for a split second."

**The previous fix treated a symptom.** Coalescing the `HotbarUI`/`UpgradeMenu`/`EventLogUI`
repaints (12 rebuilds/frame → 1) cut the flicker from a continuous strobe to a single flash per
action, but the flash itself was a different bug — and the coalescing actually *created* the window
it fires in.

**Root cause: unclassified objects render on EVERY camera.** The scene runs a two-camera split
(zoomed world cam + zoom-1 HUD cam); `syncCameras()` routes each object to exactly one via its
`cameraFilter` bitmask. A brand-new object has `cameraFilter === 0`, which Phaser reads as "draw on
all cameras" — so an unclassified HUD panel is drawn a second time on the **world** camera, at 1.5×
and in the wrong place. One frame of that is a full-screen flash.

`syncCameras()` was called from `update()`. Phaser's step order is
`scene.update` → `POST_UPDATE` → `PRE_RENDER` (**input handlers run here** —
`InputManager.preRender` is bound to the game's PRE_RENDER) → `render`. So syncing from `update()`
misses *both* things that create objects in response to a click: the pointer handler itself (e.g.
the placement ghost), and the coalesced UI repaints — which defer their teardown-and-rebuild to
`POST_UPDATE`, i.e. one hook *after* the sync.

**Measured live** (`javascript_tool`, probe registered on PRE_RENDER after the scene's own, so it
sees what the renderer is about to see): settled frame `0` unclassified → click frame `0` (the
refresh only queues) → **next frame `36`** — the entire 18-slot hotbar (18 rects 46×46 @depth 2900
+ 18 texts @2901) rebuilt and drawn on both cameras → frame after `0`. Exactly one flash per equip
or placement, which is what the user sees.

**Fix:** `syncCameras()` now runs on the game's `PRE_RENDER` (registered in `create()`, off-then-on
so `scene.restart()` can't stack a listener per run) instead of in `update()`. That is the last hook
before the renderer walks the display list, so it catches the input phase and the POST_UPDATE
rebuilds alike. It also still covers the frozen-menu case the old `update()` call was placed early
for, since PRE_RENDER fires whether or not `update()` returns early.

**Verified live:** equip frames `[0,0,0,0,0]` (was `[…,36,…]`); an object created mid-input-phase
`[0,0,0]`; across a `scene.restart()` the PRE_RENDER listener count is unchanged (4 → 4, no leak);
and the split itself is still correct — 129/129 HUD objects UI-cam-only, 1344/1344 world objects
world-cam-only, the `speckleLayer` exception still on the world cam. `tsc` + `npm run build` clean,
zero console errors.

**Rule this establishes:** any per-frame pass whose output the *renderer* consumes belongs on
PRE_RENDER, not in `update()` — anything created by an input handler or a POST_UPDATE-coalesced
repaint lands after `update()` has already run.



### Vagabond-run playtest batch — bayou over-correction + damage-type retirement (2026-07-24, Opus)

No plan file — a fix/tuning batch off the user's "not even finishing this — it's unplayable" bayou
run. Root cause of most of it: the 2026-07-24 pt1 damage pass sized bayou commons against
end-of-bayou Gloamsteel (74 armor), but a player entering the bayou wears badlands gear (~16-36), so
those raws landed near full and 2-shot. the user's own diagnosis in the dump: **Sanguinarch (118/205)
feels right as a miniboss, and commons were doing 2-3× that** — the ordering was inverted. Every
decision below was locked with him via `AskUserQuestion` before any code changed (he asked to review
the exact damage numbers first, too).

- **Damage-type layer RETIRED (the user: "remove resistances and weakness from enemies in general.
  Doesn't make sense").** Deleted every `resistances` block from all 11 entity constructors
  (Cragscale/Sandmaw/Hexling/Duneshaper/Mirejaw/Blighttoad/Mosswretch/Corpselight/Kilnborn/
  Sanguinarch/Miretyrant — Cinderwrought's was already `{}`) and the mirrors in `enemyStats.ts`.
  Every weapon now does full damage to every enemy; **flat armor is the only mitigation axis in the
  game.** `Enemy.resistMultiplier()` still exists and returns 1 (no code paths broke). This is the
  Phase-1 "bring the right weapon" system being deliberately retired — flagged to the user as such.
  NOTE: this only affects damage the player DEALS; enemy attack CLASS (magic/fire/poison bypassing
  the player's flat armor) is a separate axis and is unchanged.
- **Bayou commons → ~half of Sanguinarch** (anchor 118/205, unchanged). Raws: Mirejaw chomp 135→68 /
  lunge 170→100 / death-roll-tick 105→42; Blighttoad bite 125→48 (poison 4/s untouched — armor-
  bypassing payload); Mosswretch smash 165→98 (elite ×1.5 = 147, fixes "192 from elite tree guy");
  Murkling claw 108→38 (swarm = count, not per-hit); Corpselight husk maul 118→55 (its magic orb 22
  + slams untouched — they bypass armor and were fine). Biggest normal common ≈ half of Sanguinarch;
  no 2-shots; ~5-6 hits to kill at 16 armor. Minibosses/boss unchanged (not reached this run).
- **Healing reduction removed entirely** (`POISON_REGEN_MULT` 0.75→1.0, the user: "get rid of the
  healing reduction entirely"). Miasma/mire/spore zones deal only their poison DAMAGE now; the "This
  ground weakens healing" status never fires. Constant kept as a future deliberate-debuff hook.
- **Bow ministagger removed — RANGED ONLY** (the user chose ranged-only; melee keeps the shake for
  feel). The prior 2026-07-24 fix only suppressed the `playHitFeedback` position-shake while the
  enemy `isAttacking()`, so a *chasing* enemy still got knocked by every bow hit — the "forcing me to
  fight every enemy with my bow" complaint. Fixed with a one-shot `Enemy.suppressHitShake` flag set
  by `resolveWeaponHit` when `source === "Ranged"`, consumed+reset inside `playHitFeedback`, so no
  subclass `takeHit()` override has to thread a parameter through.
- **Duskrunner payoff windows** (the user: "too fast — why can they dash instantly melee attack? no
  payoff window"). Bite windup/recover/cooldown 180/200/140 → 300/360/420; pounce windup 260→340,
  recover 300→460, cooldown 560→900. Real telegraph + punish window between commitments.
- **Cragscale roll telegraph** (the user: "anything with an invisible radius like the spinny guys …
  needs to show the radius"). New `Cragscale.telegraphGfx` draws the roll's hit-lane on the ground —
  a translucent quad along the locked roll direction (ROLL_MAX_DIST long, 2×ROLL_HIT_RADIUS wide) +
  a rounded far cap — ramping in during windup, solid during the strike, cleared on recover;
  destroyed in a new `playDeathFeedback` override. Same pattern as the Sandmaw's existing ring.
- **Kilnborn whole-dungeon lava** (the user: "should make whole dungeon lava not just his room"). New
  `Kilnborn.floorRects` (assigned `[...layout.rooms, ...layout.corridors]` in MainScene); `ensureTiles`
  builds the fire grid across all of them, deduping doorway-overlap cells. At full heat
  MAX_BURN_FRACTION of the ENTIRE crypt is alight — no cold room to retreat to. Falls back to the
  single `arena` rect if `floorRects` is ever empty.

**Verified live** (`javascript_tool`, zero console errors): damage numbers read
[68,100,42]/[48]/[98,0]/[38]/[22,55,26]/[118,205]; `resistances` absent from the table + every
`resistMultiplier('pierce'|'slash'|'fire')===1`; `suppressHitShake` consumed by `takeHit`; a Kilnborn
built 92 tiles across two floor rects (multi-rect + dedup works, no throw); a Cragscale drove through
a full roll (trigger→windup→strike, 80 frames) drawing the telegraph without error. `tsc` clean.
Dashboard Enemies tab (the hand-mirror) updated: changed damage numbers + stripped the now-false
resist/heal prose. No `RECIPES.md` change.


### Ascetic-run playtest batch — Miretyrant waves, Bog Ore clustering, Ashcaller rework, Max buttons (2026-07-24, Sonnet)

No plan file — a fix/tuning/content batch off the user's Ascetic win (77:59, 510 kills, level 25,
Kill Points 9710, Speed Multiplier x1.00 — a full clear, not a speedrun). Used Primal Spear until
Ember Brand dropped, then mixed both. Every design fork was locked via `AskUserQuestion` before any
code changed; the numbers themselves (Int 100 dump, Strength-capped crit mult, Agility crit chance)
were reviewed and judged healthy — no stat rebalance shipped, since the "too easy" complaint scoped
entirely to the Miretyrant encounter, not the character sheet.

- **Miretyrant bellow waves now escalate on a SCRIPT** (`src/entities/Miretyrant.ts` +
  `MainScene.updateMiretyrantBellow`/`miretyrantWaveComposition`). the user: "Honestly just spawn
  alligators instead of the frog dudes ... fighting strong adds the whole time ... hella frogs into
  some big scary alligators." The boss itself only hands MainScene a 1-based wave INDEX
  (`consumeBellow()`, renamed from a bare add-count — `pendingWave`/`bellowCount` replace the old
  `pendingAdds`/`MIRETYRANT_ADDS_PER_BELLOW`/`_ENRAGED` constants), and MainScene's
  `miretyrantWaveComposition(wave, enraged)` owns the script since it's the one that knows the
  entity classes: waves 1-2 are pure frog swarms (4-5 elite Murkling/Blighttoad, the existing
  45/55-favoured mix), wave 3 is the first elite-Mirejaw arrival (2 gators + 1 frog), wave 4+ keeps
  gators in the mix permanently (2 gators + 2 frogs, +1 extra frog while enraged). Base interval
  tightened `BELLOW_INTERVAL_MS` 15000→11000 and `BELLOW_ENRAGED_INTERVAL_MS` 8500→6500 for
  near-constant pressure late in the fight. Boss damage numbers and its own chase/attack behavior are
  explicitly UNCHANGED per the user's note ("damage was good, encounter was still too easy" — this is
  purely an add-pressure fix). Verified live: `miretyrantWaveComposition(1..6, false|true)` returns
  the exact scripted composition at every wave index and both enrage states.
- **Bog Ore now clusters in the bayou's dangerous zones**
  (`MainScene.spawnBayouNodes`). the user's actual ask, after a mid-session correction — he'd said
  "gloam ore" but meant **Bog Ore** (the bayou's sole surface metal, gating the whole
  Sunsteel→Mirebronze reforge flow he ran this session); gloam shards are a leftover-from-biome-2
  material that were never touched. The flat 46-node scatter is now a 24-node baseline (general
  presence) plus 10 clusters of 3-4 nodes biased into the **miasma** (poison fog) and **bonemire**
  (haunted boneyard) zones — the bayou's two actual hazard zones — via the existing
  `pickBayouPoint(..., { preferZone })` themed-spawn mechanism the enemy-pack spawner already uses,
  with the same jitter/fallback-to-anchor pattern (a cluster member that jitters off-bayou or into
  deep water snaps back to the verified anchor rather than being dropped). Net count ~24 + ~35
  clustered ≈ 59-64, up from 46.
- **Food-buff cap 3→2, Comfort/Bedroll fully exempt** (`src/systems/Buffs.ts`, `MainScene`
  `DEFAULT_MAX_BUFFS`). Locked via `AskUserQuestion`: "2 food, Comfort exempt" — a Bedroll should
  never compete with two cooked-food buffs for a slot. `BuffManager.apply()` now special-cases a new
  `COMFORT_BUFF_ID` ("comfort_rest"): it's pushed without ever being counted against the cap or
  considered for eviction, and the cap-eviction scan for a new FOOD buff explicitly skips the comfort
  entry when picking what to evict. Verified live: 2 foods + Comfort coexist (3 buffs active,
  Comfort untouched); adding a 3rd food correctly evicts the older food buff, never Comfort.
- **The Ashcaller reworked from "one buff at a time" to "buff master"** (`src/systems/
  Characters.ts`). The card's entire identity was built on `maxBuffs: 1` against a baseline of 3 —
  dropping the baseline to 2 would have collapsed a distinctive downside into plain worse-than-
  everyone-else. Locked via `AskUserQuestion` ("invert it"): `maxBuffs: 1` → `3`, so the Ashcaller
  alone runs 3 concurrent buffs while the new baseline is 2 for the rest of the roster. Boons: +15%
  skill XP, +60% buff/food duration, "Runs 3 buffs at once (everyone else: 2)"; bane stays -25% max
  HP only (a `+damage taken` second bane was considered and dropped — Reaver already owns that axis
  as its identity, and doubling it up would blur the two frail-glass-cannon cards together). Blurb
  updated to match. Verified live: `characterById('ashcaller').modifier.maxBuffs === 3`.
- **A "Max" button on every crafting-menu quantity slider** (`CraftingMenu`/`CookingMenu`/
  `DryingRackMenu`/`JewelryMenu`) — snaps the batch/amount straight to the max currently affordable,
  positioned to the right of each slider's knob within the existing panel width (no layout changes
  needed — all four panels had 60-380px of unused width past the slider). Verified live: clicking
  the CraftingMenu's Max button on a stackable recipe (Shishkabob, maxBatch 11286) snapped
  `batchAmount` from 1 straight to 11286 in one call.
- **Workbench Lvl 4→5 "upgrade ready" triangle — investigated, NOT a bug.** the user: "didn't show
  right, maybe because it was already placed? not sure." Reproduced live via a placed test Workbench
  stepped through all four upgrade tiers (`applyStationUpgrade` called directly for
  tool_sharpener/forge_anvil/emberforge_anvil): the ▲ glyph (`refreshStationUpgradeIndicators`/
  `stationHasReadyUpgrade`) correctly appeared and updated at every tier once ingredients were both
  *discovered* and *affordable*. Isolated the real cause: `gloamforge_anvil` (Lvl4→5) requires
  Gloamsteel Ingot specifically in its costs, and `upgradeIngredientsKnown` gates on the material
  having been actually **discovered** (smelted/held at least once) — the exact same "you had to
  actually smelt this" gate `emberforge_anvil` already uses for Embersteel. the user's run took the
  **Sunsteel→Mirebronze** branch this session (his own words), which never touches Gloamsteel Ingot
  at all, so the upgrade correctly stayed hidden — confirmed by forcing `discovered.delete
  ('gloamsteel_ingot')` (glyph vanishes, matching the report) then `discoverMaterial('gloamsteel_
  ingot')` (glyph reappears immediately). No code change; flagged to the user as working-as-designed
  rather than silently "fixed."
- **Numbers review (no changes shipped).** Reviewed the run's Skills/Stats screenshots (Pierce 51,
  Magic 23, Heavy Armor 49, Intelligence 100/329 points, Strength crit-mult capped at 3.0x, Agility
  20% crit chance). Judged healthy — Intelligence's uncapped skill-XP snowball is the same loop
  confirmed intentional in the earlier god-run triage (the fun-from-leveling was the explicit point),
  and the rest of the spread reads as a legitimate crit-focused pierce/magic build, not an imbalance.
  No stat/skill numbers were touched this batch.

`tsc` clean throughout. No `RECIPES.md` change (no recipe/cost changes — Bog Ore's yield/tool-tier
gate is unchanged, only its spawn distribution moved).


### Reaver-run playtest batch — stat caps, shrine budget, boss pacing, telegraphs, UI fixes (2026-07-24, Opus)

No plan file — a fix/rework batch off the user's Reaver win (69:56, 936 kills, level 31, score
19170, 62/62 relic rolls). **14 of 15 items; the 15th is a design decision surfaced in
Current State, not a fix.** Every design fork was locked via `AskUserQuestion` first, and two of the
locks reversed my initial recommendation once the real numbers were checked.

**The root finding.** Intelligence was an *unbounded* self-feeding loop: `Skills.onLevelUp` feeds
the player pool exactly the XP a skill level cost, so ALL raw skill XP eventually becomes player
XP — which makes Int a straight **player-XP multiplier** (+150.5% at the user's 118 points), paying
for more Int. Two numbers sized it: natural 3-biome play ends at **level 24 = 300 points**, and the
farm took him to **level 31 = 496**, i.e. the shrine loop produced **196 points, more than the
entire rest of the run**. Both ends are now bounded.

- **Hard 100-point cap on every stat** (`Progression.STAT_POINT_CAP`). 6 x 100 = 600, so honest
  play only ever spends ~half the budget — a real build choice, with the cap biting only the farm.
  Re-derived against the live XP curve: a 5-biome run lands near level 29 (~435 points), so this
  has headroom for future biomes. **This reversed my own "100 isn't enough for biome 4" answer**,
  which had wrongly used the post-farm level 31 as the natural endpoint.
- **Retuned per-point rates so every stat is still growing at point 99** (the user: "ideally I want
  all of these stats to have impact up to lvl 100 — otherwise feels weird"). The offender was
  Strength: its crit-damage axis caps at a combined 3.0x against 1.5-1.8x base weapons, so
  +0.04x/point burned the whole budget in ~35 points (**24** for a 1.5-potency Reaver — he put in
  100, so **76 points did nothing**). Fixed with a slower rate against the SAME ceiling, since
  "damage is already so high": nothing here raises a cap. Str 0.04->**0.015x**, Agi 0.5->**0.45%**,
  Int 1.5->**1%**, Vit healing 1.5->**1%**, End regen 2->**1.5%**. Endurance's flat stamina,
  Vitality's flat HP and both Wisdom axes keep their old rates (already meaningful to 100).
  Verified live: Strength now saturates at **exactly point 100** against a 1.5x weapon and point
  **80** against a Gloamsteel Pike — up from 19-37.
- **Dead-point allocation is now BLOCKED, not just annotated.** `MainScene.statAxisSaturated()` is
  the single enforcement point (it needs weapon/relic context, so it can't live in Progression),
  read by both `allocateStat` and the menu — so a dev/auto caller can't bypass the greyed button.
  Wisdom is deliberately exempt: its cooldown axis caps but buff duration doesn't, so those points
  still pay. Rows read `Vitality: 100 / 100` with `(MAXED)` / `(CAPPED — axis maxed)`.
- **`[ +5 ]` button beside `[ + ]`** (a 100-point stat is a lot of clicks). `allocate(stat, count)`
  returns how many landed, clamped by pool AND cap, so +5 banks whatever fits instead of
  overshooting. Also nudged the buttons to y+1 and shortened the cap notes — the long wording ran
  to within **1px** of the buttons, and text overlap is a live complaint elsewhere in this batch.
- **Sunken Shrines are capped at 3 kindlings each** (`SHRINE_MAX_KINDLINGS`), 9 x 3 = 27 rites,
  with a new `spent` phase. **A kindling is consumed when the rite STARTS, not when it's survived**
  — counting completions would have left the loop wide open (kindle, farm wave 1, walk away to
  lapse, repeat, paying only an offering the waves themselves drop). Visual tell: three
  `shrine_charge` pips at the shrine's foot, lit teal / dark once burned, plus a permanently cold
  tinted shrine when spent and a verb-less "The shrine is spent" prompt.
- **Guaranteed reward for clearing all three:** 1 `refined_trophy_uncommon_t3` in the third bowl.
  Chosen over the user's suggested Moonsilver/Bog Ore on purpose — Moonsilver gates the Gloamsteel
  ingot AND the Gemwright's Table, so surfacing it would collapse the Gloamsteel-vs-Mirebronze
  branch and break the locked "build-defining materials are dungeon loot" rule; Bog Ore is mined
  in the very zones shrines sit in. A relic-economy payout touches neither. Confirmed it's a real
  `TROPHY_ROLL` key (Uncommon @ power tier 3, x2.25).
- **Big-boss pacing guards** (Gremlin King / Duneshaper / Miretyrant only; mini-bosses stay
  burstable). Both default OFF on base `Enemy`, so every normal enemy is unchanged. (1) A **per-hit
  damage cap** of 5% of max HP (`maxHitFraction`) — the user one-shot the Miretyrant inside a single
  Bloodrush window at level 31 and saw neither phase. Floors all three at **20 connects** without
  touching player damage anywhere else; verified a Murkling still dies to one hit. (2)
  **Phase-transition invulnerability** (`phaseGates`, 900ms): King [50%], Duneshaper [70%, 50%],
  Miretyrant [65%, 35%]. Advances at most one gate per hit so no phase is ever skipped.
- Three subtleties in that boss work worth keeping: the bosses chip **poise** from the same hit, so
  they now route it through `effectiveDamage()` (a capped hit must not break poise at full value)
  and skip it entirely while phase-locked; and each boss's `update()` pushes `stateEnteredAt`
  forward every frozen frame so **the current state's timer pauses** — otherwise a telegraph would
  elapse behind the flash and the attack would land with no wind-up to dodge (verified: the
  Miretyrant resumed mid-telegraph, tint `0xffd24a`, not mid-attack).
- **Latent bug fixed on the way:** `GremlinKing` and `Miretyrant` never set `baseScale`, so it sat
  at 1 while their sprites rendered at 2.4x/2.6x. Harmless until something tweened the scale — the
  new transition does, and it shrank them permanently. Confirmed inert for combat first (neither
  reads `reachBonus()`, both have `biteDamage: 0`) before setting it.

**Area-attack indicators, roster-wide (item 8).** This deliberately REVERSES the locked "tells are
motion/tint, never world-space arcs" rule, re-locked with the user as: an AREA attack shows its
footprint, a single-target bite/claw still doesn't. The reasoning is that a wind-up POSE can tell
you a bite is coming, but nothing about a pose tells you a tail sweep reaches 120 degrees behind
the gator. New shared helpers on base `Enemy` — `drawAreaCircle` / `drawAreaWedge` / `drawAreaLane`
over one lazily-created Graphics, destroyed in BOTH `destroy()` and `playDeathFeedback()` (the
stranded-HP-bar bug class). Kept low-alpha with a thin ring at the TRUE radius, since the original
objection to arcs was that they looked goofy.

- Wired: **Mirejaw** lunge lane, **Boar** charge lane, **Duskrunner** pounce lane, **Sanguinarch**
  slam circle, **Corpselight** collapse circle. the user's "alligators" turned out to be the
  **Mirejaw**, not the Miretyrant — the boss already telegraphs its own sweep and chomp, and
  Mirejaws are what fill its bellow waves from wave 3, so a pack of locked lunge lines was
  unreadable.
- **Audited the rest rather than blanket-adding.** `Kilnborn` needs none: its backdraft only
  damages LIT GROUND and those burning tiles are already drawn, so a marker would be redundant.
  `Palewake` needs none: it has no area attack at all, only a tether drain, and its line is already
  drawn by its own gfx. Cragscale/Sandmaw/Hexling/Cinderwrought/Gloamwarden/GremlinKing/Duneshaper/
  Miretyrant already telegraphed theirs (Cragscale via `drawRollLane`, which an early grep missed).
- Lanes were included on the same reasoning as circles: a charge/pounce/lunge IS an area whose dodge
  is stepping off a line, and all three lock their angle at wind-up start, so the marker never lies.

**Mossling spawn immunity (item 9).** New `Enemy.spawnInvulnUntil` — 500ms of DAMAGE-ONLY immunity
(they still move and aggro, unlike `isPhaseLocked()`), plus a 0.35->1 fade-in so the window reads.
They burst out of a dying Mosswretch directly into the arc the player is mid-swing on, so crit + AOE
splash deleted them on frame one and the split looked like nothing happened.

`tsc` + `npm run build` clean, zero console errors, all of the above verified live via the
browser-pane eval (cap clamping, every retuned rate against divided-out potency, both UI cap
states, the full 3-kindling shrine lifecycle including the lapse rule, and all three bosses'
gates/locks/refusals), plus Mirejaw/Boar/Duskrunner drawing 34 telegraph commands during wind-up
and clearing to 0 at the strike. **Two paths are wired but NOT exercised live:** Sanguinarch's slam
(needs the engorged phase after feeding on a bleeding player) and Corpselight's collapse (needs a
sustained close approach) — both call the same helper proven on the other three. Notes for next
time: the preview loop needed the documented `loop.step` trick to advance game time, and enemy AI
does not tick until a character is actually picked (`runOver` stays true), which silently made a
first round of telegraph probes report nothing.

### Art pipeline + additive coloured lighting (Phase 1 of the 3-biome art arc) (2026-07-25, Opus)

Plan: `.claude/plans/art-textures-lighting-3-biomes.md`. First session of the real-pixel-art arc
(roadmap 8). the user registered the **PixelLab MCP** at project scope; its tools need a session
restart, so this session built the foundation everything else gets authored against. Two forks
locked via `AskUserQuestion`: **additive coloured lights** (not Lights2D + normal maps, which would
need a normal map for all 377 textures that PixelLab can't generate) and **icons first**.

**Measured the real scope** from the live `TextureManager` rather than parsing BootScene — many
keys are drawn by shared helpers, so static parsing only resolved 107 of 314 calls. **377 authored
textures**: 181 icons (177 @ 24×24, 4 status icons @ 22×22), ~134 static world props/flora/nodes/
structures/crypt tiles, ~24 creatures + player, 14 derived `*_elite` recolours, 12 map markers @
18×18, 3 FX gradients. The other **2,197** keys are runtime RenderTextures (ground bakes, minimap,
tile fills) and stay procedural. **~327 of 377 never animate**, so static art is the finished
product for them, not a stopgap — this corrected an earlier assumption that animation gated
everything.

**`src/art/overrides.ts`** — drop `art/sprites/<textureKey>.png` and it replaces the generated
texture of that name with **zero call-site changes** (Phaser keys are plain strings). Discovered via
Vite `import.meta.glob` at build time, so there is no index file to drift the way `RECIPES.md` does;
adding a PNG is the entire workflow, and deleting it restores the placeholder. `BootScene` gained
its first-ever `preload()`; overrides apply after `makeTextures()` and before MainScene starts.
It **reports size changes** (attack reach and hitboxes read sprite size — `MainScene.enemyReach`,
`Enemy.reachBonus`) and **unmatched keys** (a misspelled filename would otherwise fail completely
silently). `pixelArt: true` was already set, so loaded PNGs are crisp with no extra work.

**Additive coloured lighting.** `NightOverlayUI` was subtractive *only* — it filled the screen dark
and erased soft holes, so every light source looked identical no matter what its comment claimed. The
existing code promised "doorways glow with their gem's color" and "a bile-green hole breathing
light"; `ScreenLight` carried no colour at all, so that intent was never deliverable. Added a second
RenderTexture rendered with `BlendModes.ADD` — it **can't** fold into the darkness mask, because
drawing colour into a layer that renders normally would occlude the world instead of lighting it.
`ScreenLight.color` is **optional**: omit it and behaviour is byte-for-byte the old pure reveal,
which is what a discovered crypt ROOM wants (plainly lit, not bathed in colour). New `LIGHT_COLOR`
in MainScene assigns per-source hues across all 14 light sources.

**`ADDITIVE_STRENGTH` is 0.15, and the number matters:** additive blending *sums* overlaps and light
sources cluster hard — a Gloaming Vein is 9 crystals inside one radius. At 0.4 the cluster saturated
straight to white and lost the violet, i.e. the exact colour the pass exists to add. Also note the
brush is shared between the erase and additive passes, and **erase strength reads the brush's
alpha** — so the erase loop resets `clearTint().setAlpha(1)` explicitly. Verified the brush is left
tinted at 0.15 after render, which is what makes that reset load-bearing rather than defensive.

**Verified live** (not just typechecked): built three throwaway PNGs to exercise the override path
end-to-end — a correct-size one applied and changed real pixels (`icon_wood` → magenta), a
wrong-size one fired the resize warning, a bogus key fired the unmatched warning, and a
non-overridden key was untouched; fixtures then deleted. Lighting confirmed by screenshot at deep
night: the vein reads amethyst with crystals and ground visible through it while POI fires read warm
amber in the same frame. Day hides **both** layers (zero cost). `tsc` clean, zero console errors.

**Scope locked same-day (the user), and it deleted the hardest problem:** **armor does NOT render on
the model** — only its inventory icon and stat lines. So there is no armor layer, the
`inpaint`-separable-layer question is moot, and no metered API calls are needed to settle it. **The
weapon DOES render**, and **each of the 5 survivors gets unique art + animations**. Rig volume drops
~6× to **~300 frames**: 5 survivors × 4 dirs × ~13 frames (~260) plus weapon-in-hand at **10
ARCHETYPES** × 4 dirs (~40) — the roster is ~25 weapons but only ~10 shapes, since the
sword/pike/warhammer/warbow ladders are the same object in four metals (recolours, same principle as
the 14 `*_elite` textures). Because armor is invisible, **the weapon is now the only visible signal
of gear progression**, so the metal recolours need to read clearly distinct. Note the display
mechanism already exists — `Player.ts`'s `equippedIcon` offsets by facing every frame and has a
swing lunge tween; Phase 4 replaces its art and anchors it to a per-frame hand joint (which
`animate-with-skeleton`'s `skeleton_keypoints` hands over directly). Added **Phase 5 — ability cast
FX**: all 8 families (`blink`/`nova`/`lifelink`/`aegis`/`gravebind`/`haste`/`lance`/`snare`)
currently reuse the `light_soft` gradient as one generic glow, so they're visually
interchangeable; the new additive light layer is directly reusable there.

**Next:** Phase 2 — the 181 icons, starting with normalising the four 22×22 status icons.


### Phase 2 of the art arc — ALL 181 icons + UI resized + reference gallery (2026-07-25, Opus start / Sonnet finish)

Plan: `.claude/plans/art-textures-lighting-3-biomes.md` (Phase 2 — **now complete**). Operational
detail — the generation recipe, rate limits, hit rate, known-hard prompts — lives in
`art/README.md`, which is the file to read before starting Phase 3.

**All 181 icons shipped**, verified live in one final pass (181/181 overrides applied at 32×32,
zero console errors): raw materials, ores + ingots, the full four-metal weapon ladder (sword/pike/
warhammer/warbow across sunsteel/embersteel/gloamsteel/mirebronze), every tool tier, the full armor
progression (Gremlin set + duskhide/emberhide/bogweave/mirehide + sunsteel/embersteel/gloamsteel/
mirebronze helm/cuirass/greaves), all food/cooked dishes, all four relic rarities + every trophy +
refined-trophy tier, all jewelry (6 amulets, 7 rings, cloak, gloamdrinker, 3 ability gems), every
quest/ritual item (totems, effigies, sigils, the Gremlin King's heart), every station + all 4
Workbench tiers + the Smelter's tier, and all 4 status-effect icons.

**A second pass caught 3 icons that were generated but never landed on disk** — `mirebronze_ingot`
was downloaded onto `icon_mirebronze_helm.png` by a stale job-ID mixup (the real helm sat completed
and undownloaded the whole time), and `icon_cattail`/`icon_ring_sparkbound` were simply never
fetched despite their jobs finishing minutes earlier. All three were only found by diffing the
completed-file list against the authoritative 181-key manifest pulled from `BootScene.ts` — **don't
trust "not on disk yet" as "never generated" once a session has queued 50+ jobs**; always audit
against the full key list before calling a batch done.

**PixelLab's queue stalled hard partway through** — multiple jobs pinned at `creating 95% eta ~0s`
or cycling with a *growing* ETA for 20+ minutes at a stretch, well past the normal 60-90s, and this
happened on the paid Tier 1 plan, not just the earlier free trial. Reported upstream twice via
`agent_feedback`. Confirmed the `download` endpoint genuinely 400s at true 95% (`"still being
generated"`) — it is not silently complete, contrary to an earlier assumption. During one such
stall, built the reference gallery instead of idling (see below) — worth remembering as a pattern:
API stalls are a good moment to do the next deliverable's prep work, not just poll harder.

**Reference gallery**: a single self-contained HTML page — all 181 icons, grouped into 10
categories (materials/ores/weapons/armor/food/relics/jewelry/quest-items/stations/status), each a
magnified (2×) slot with a search box (matches name or key) and a "show not-yet-generated" toggle
that would surface gaps on a future partial run. Published as a Claude artifact and sent to the user
as a standalone file; **not part of the game repo** — it and the 3 generator scripts that built it
(`gen_gallery*.cjs`) were written to reference the live `art/sprites/` + `Items.ts` + `BootScene.ts`
data so the categorisation can't drift, then deleted once published (a one-off review tool, not a
shippable asset). Regenerate from scratch if a full visual audit is needed again — don't hunt for
the deleted scripts.

Below is the original 32-icon partial-batch writeup from earlier in the session, superseded by the
above but kept for the design decisions it documents:

**Icons are authored at 32×32, not the placeholders' 24×24.** 32 is PixelLab's minimum object
canvas and the better target anyway. That forced two code changes:

- **`Player.equippedIcon` normalises to a fixed world size** (`Player.ICON_WORLD_SIZE` = 24).
  It rendered item icons in the WORLD at native size, so 32px art would have silently scaled every
  held weapon up by a third. Verified: 24px placeholder → scale 1.0, 32px art → scale 0.75, both
  render 24×24. The swing tween had to change too — it reset to `setScale(1)`, which would have
  snapped a held weapon to full size mid-animation.
- **`applyTextureOverrides` splits icon resizes from sprite resizes.** Phase 1's warning says
  "reach/hitbox math reads sprite size", which is a false positive for UI icons — and at 181 of
  them it would bury a genuine warning on a world sprite in Phase 3. `icon_*` now reports as one
  info line.

**UI resized so the art is actually visible** (the user: "in game the icons are a bit small… let's be
proud of the arts"). The old 34px box showed 32px art at **×1.06** — the worst case for pixel art,
since nearest-neighbour keeps most rows 1:1 and doubles the occasional one, reading as distortion
rather than magnification. **Every surface is now an integer scale:** `InventoryMenu.SLOT` and
`HotbarUI.SLOT_SIZE` both 46→**70** with `ICON_BOX` **64** (**×2**, clean pixel doubling — these two
must stay equal so an item looks the same in the backpack and on the hotbar), and `CraftingMenu`'s
`LIST_ICON` **32** at **×1** (no resampling at all). The inventory grid went **6→7 cols, 15→10
rows**: the vertical budget is fixed (the panel must clear the hotbar at y=900), so bigger slots buy
fewer rows and the extra column claws the capacity back. Measured after: panel x 16..1182 / y
48..878, columns at 28-554 / 578-800 / 824-1000 / 1024-1170, clear of both the hotbar and the
crafting panel at x=1284. The ability bar needed no change — it derives from
`hotbarUI.left + width`.

**The crafting list already had icons** — at `iconSize` 18 against placeholder art they just read as
coloured smudges. Now 32px at 1:1, with icon and name both centred on the row (`ROW_H` 25→36), since
anchoring either to the row top left them visibly out of line once the icon was taller than the text.

**Locked decision — tier ladders now DIFFER on purpose.** The plan required a ladder to read as one
object in different metals. The real four-metal sword ladder came out as four distinct silhouettes,
and the user reversed the rule: *"I like the swords like that."* A higher tier reading as a visibly
different weapon is the stronger progression signal. Load-bearing — it means every icon is an
independent generation, with no `create_object_state` chaining and no shared-silhouette constraint.
It also invalidates Phase 4's inherited "metal tiers are recolours" note, flagged in the plan for
re-deciding on its own merits.

**Corrected two of my own critiques mid-session.** I called out a green matte fringe on `icon_stone`
and anti-aliasing on `icon_relic_common`; the pixel data disproved both (zero opaque green pixels —
the outline is `#202A1B`, a dark olive-black; zero semi-transparent pixels anywhere; 15-48 colour
palettes). Output is genuinely clean pixel art and **needs no post-processing step**.

**Throughput reality for the remaining ~150:** PixelLab caps at **4 concurrent jobs** (a 5th is
rejected outright), so it's ~45 rounds of 4. Progress % is unreliable — jobs pin at `95% eta ~0s` or
reset to 0% with a *growing* ETA, then finish fine; don't re-fire on a stall (reported upstream via
`agent_feedback`). Hit rate ~85%; misses are the model over-decorating, steered with
*plain/undecorated/torn*. **Single-bit axes are a known-hard prompt** — three attempts all gave a
symmetric double-head or a curved pick; `icon_stone_axe` ships as the best of three.

the user moved off the 40-generation trial to **Tier 1 (2,000/mo, $12)**, so cost is no longer a
constraint on the arc — 181 icons + Phase 3's ~134 props is ~16% of one month.

### Art arc Phase 3 — 160 world props, essentially complete (2026-07-25, Opus)

Grew from 22 to **160** across one session — every world category except the ground itself.

**Late additions:** all 12 map markers, all 11 ability icons (the 3 `_lesser` variants DERIVED from
their base with `adjust.mjs` rather than generated — exactly the reuse that tool enables), the
larger projectiles, and every crypt tile in four themes.

**Projectile facing is load-bearing.** Only the javelin carries an `artAngleOffset` (+90°, art
points UP); every other projectile's art must point RIGHT, and each needs an aspect-matched canvas
or `artScale`'s min-axis fit squashes it (a 32×32 arrow would render 6×6, not 16×6). A size guard
now lives in `Projectile`'s constructor.

**Two bugs the console surfaced, not the eye:** `poi_ring_vein` was an orphan — that key doesn't
exist, the Gloaming Vein POI has no ring markers, so the art was silently doing nothing (repurposed
to `poi_ring_gorge`, which is real and was still placeholder). And `poi_floor_gorge` had been left
at the old trimmed 170px while its siblings were regenerated at 360. **Read the `[art]` console
warnings after a batch** — an unmatched key is invisible in-game.

**A verification trap worth remembering:** measuring `artScale` via a dynamic
`await import('/src/art/overrides.ts')` reported 1 for everything, because it returns a FRESH module
instance whose `placeholderSize` map is empty. The `[art] resized` warnings are the reliable
evidence that the real module recorded a key. Forest, badlands and bayou are all fully real
art now — terrain, flora with every `_picked` state, ore nodes, POI structures and POI ring markers
— plus crypt objects in all four themes and the first three real tiles (`crypt_floor`, `crypt_wall`,
`lodge_plank`) via `create_tiles_pro`. Left: themed crypt tiles, `poi_floor_*` decals, projectiles,
map markers, ability icons.

**Variants shipped where repetition showed most:** `tree_v2`, `boulder_v2`, `rock_v2`, and 3
silhouettes each for mesa spires, rockwalls and both badlands ores. Live spread confirmed the picker
works — trees 138/110, rocks 52/44, spires 11/20/15, sunscorch ore 32/29/29.

**Placement reworked twice off playtest feedback.** Decor clumps rolled their texture *per prop*, so
every clump was an even mix of all four types at identical density — the actual "too random" tell.
Then trees/branches/rocks/boulders moved off independent sampling (a uniform Poisson process, which
reads as artificial precisely because real terrain clumps) onto weighted clumping. Measured with the
Clark-Evans index: trees R=0.51, rocks R=0.66 (1.0 = random). Finally decoration was **anchored to
existing features** rather than scattered — 22% of features get dressed, 480 → 286 props, 99% within
50px of a real feature.

**Projectile got a size guard** even though its art is deferred: a gremlin rock is 6×6 against a
32px canvas floor, and `rotationOffset` means replacement art must keep the placeholder's facing.

The original 22-prop entry follows.

**22 of ~134 world props** were the first slice (`art/sprites/world/`), all forest: `tree`,
`ironbark_tree`, `boulder`, `rock`, `branch`, `bramble`, `blackberry_bush` (+`_picked`), `cattail`,
`decor_fern`/`_flowers`/`_mushrooms`/`_log`, `drying_rack`, `gremlin_shack` (+`_chest`),
`boss_altar`, `war_totem`, `gremlin_banner`, `palisade_stake`, `gremlin_camp_prop`, `camp_brazier`,
plus the first variant `tree_v2`. Badlands, bayou and crypt tiles are untouched.

**New tooling, all in `art/tools/`:** `trim.mjs` (dependency-free PNG decode/encode over
`node:zlib`) crops a sprite to its alpha box; `fetch.sh` downloads a job by id straight into
`art/sprites/world/` and trims it; `gallery.mjs` rebuilds the published reference page from whatever
is on disk, inlining every PNG as a data URI because the artifact CSP blocks external hosts. The
gallery is now **regenerated from the repo, not hand-assembled** — Phase 2's build scripts were
discarded after publishing, which is why this one is committed.

**`src/art/variants.ts`.** the user: props look too uniform. Dropping `art/sprites/tree_v2.png` is
now the entire change needed to add a second tree — same "add a PNG, it works" contract as the
override layer. Resolved in `ResourceNode`'s constructor (one hook, ~20 spawn sites) and selected by
hashing the prop's x/y, so appearance is stable across reloads without threading an RNG through the
samplers, and neighbouring props don't alternate in a visible stripe. `pickedTexture` follows the
chosen variant when `<variant>_picked` exists. `scatterDecorClustered` routes through the same
helper. `clearVariantCache()` in `create()` per the `scene.restart()` field-init rule.

**Blackberry-bush "disappearing" bug — caused by the migration, not the mechanic.** `harvest()`
worked correctly the whole time (node stays in `nodes`, active, visible, regrows). The bush had real
33×25 art while `blackberry_bush_picked` was still a 24×20 generated placeholder, so picking swapped
art *styles* mid-world and read as vanishing. Verified live via `preview_eval`.
**Rule: a `_picked`/`_shielded` state variant ships in the same batch as its base.**

**Warbow icons.** All three drew as sticks — the model reliably omits limb curve and string from
"longbow". `trim --report` is an objective acceptance test here: content 3-7px wide is a stick, a
real D-bow measures 16-30px. Prompting the *geometry* ("shaped like the letter D, thick curved limb
on the right, thin straight taut bowstring on the left") landed all three. **Same class of
known-hard prompt as the single-bit axe** — steer with shape, not with the weapon's name.

**Decisions recorded in the plan file:** animation scope widened to ambient motion (which fixes the
generation tool per asset, since a `create_map_object` result can never be animated); world props
may be authored larger than their placeholders but creatures may not; a 1-direction object costs 25
generations vs 1, so animatable props stay on the cheap path until the animation pass.

**Open:** `decor_log` reads as choppable but isn't (re-arted as inert mossy roots; the key wants
renaming in a later code pass), more decoration variety generally, and `boulder_v2`/`rock_v2` lost
to a PixelLab queue stall that pinned jobs at `95%` for 25+ min while still holding concurrency
slots — reported upstream.
