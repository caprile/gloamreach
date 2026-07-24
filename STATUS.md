# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Vagabond-run playtest dump — 4
batches, ~35 items** (2026-07-23, Opus, no plan file). the user's Vagabond run produced a fresh
~35-item dump; triaged into four batches and shipped all four in order.
**Batch 1 — biome-3 blockers.** Two root causes, both structural. (a) Ranged casters could never
deaggro: `Corpselight`/`Hexling`/`RangedGremlin` called `markAttackLanded()` at FIRE time, and since
a cast cooldown is shorter than `AGGRO_PERSIST_MS` the persistence window and the 30s give-up clock
were both refreshed forever whether or not a shot connected. Split into `markAttackAttempted()`
(keeps you remembered, does NOT reset the give-up clock) + a new `Projectile.sourceEnemy` that
routes a LANDED hit back via `onProjectileHitPlayer()`. The Corpselight additionally had no
cast-range gate at all (it fired anywhere inside its 700px deaggro radius) and no telegraph — now
`CAST_RANGE` 380, deaggro 520, orb lifetime 4200→3000, and it PLANTS for a 520ms tinted wind-up
before releasing (it was the one ranged creature ignoring the souls-like windup contract), with a
randomised initial cast clock so a Drowned Lodge's 2-3 haunts stop firing as one volley. Verified:
it now gives up at exactly 30000ms of non-connecting fire, and a landed orb resets that.
(b) Bayou economy: crypts went 12→18 (a second interior realm in the free bottom-left dead corner,
so cell size — and therefore room count — didn't shrink), Moonsilver seams 2-3→3-5, 16 scattered
surface Gloam Outcrops added, and **crypt wardens now drop Mire Shards directly** (the only route
was a 9-gloam-per-shard two-upgrade conversion ladder nothing surfaces). Crypt FINDABILITY is the
new **Gravemark Rubbing**: a 6%-chance drop from the common bayou roster, **consumed the instant
it's picked up**, which maps the single NEAREST unknown crypt with a compass line. (An earlier pass
in this session revealed all 18 on first bayou entry; the user rejected it — "I don't want it to
reveal the whole biome" — so the same help is now paid out in earned increments.) Alongside it,
each crypt scatters three thinning **grave-marker breadcrumb bands** out to 760px, so the swamp
visibly gets graver before the doorway is in view. Also fixed a **pre-existing
crypt generator bug** found while verifying: rejection sampling left 13 of 18 crypts under the 5-room
target and 5 at the bare 2-room minimum — i.e. most "dungeons" really were just an entry and a boss.
A shrink-under-pressure size schedule + a deterministic sweep fallback now puts every crypt at 5-7
rooms with a properly-sized vault.
**Batch 2 — 10 bug/stale-UI fixes**, including: the run timer stayed frozen after "Continue"
(`Run.tick` only accumulates while `state === "active"`, which nothing reset → new `Run.resume()`);
enemy HP bars are two SIBLING GameObjects destroyed only in `playDeathFeedback`, so every DESPAWN
path (lapsed shrine rite, dawn cull, den reset) stranded one forever → cleaned up in a base
`Enemy.destroy()` override that covers every path; duplicate epics in chests (dedupe only checked
PLAYER ownership, but every container is pre-rolled during `create()` when the player owns nothing —
now a run-scoped reserved set); the Miretyrant dropped the Duneshaper's **Tier-2** trophy (new
`boss_refined_trophy_t3`); the phantom "upgrade ready" arrow (never excluded already-APPLIED station
upgrades, and a pristine spare always has all of them pending); Gravebind never interrupted a
committed attack so a yanked enemy finished its swing anyway (now `resetAttackState` + velocity zero,
slow 0.45/900ms → 0.30/2200ms); and the Sunken Gorge discovery bug — **both** discovery routes keyed
off `lair.x/y`, which is maw #1, so walking up to any other door revealed nothing AND the effigy's
reveal-everything step was swallowed by its own guard (same class as B4-P6's second-maw fix; now
per-maw through one shared helper).
**Batch 3 — equipment/inventory slot overhaul.** `EquipSlot` is now three GROUPS plus ammo
(gear ×3 / **special ×4** / **ability ×3**) instead of helmet/chest/legs + necklace/ring1/ring2/
cloak/back/special1/special2. An item declares a group, not a destination, and equipping routes to
the first free slot in it — generalised from what was a ring1/ring2 special case. Position IS the
hotkey, so **any ability item goes in any Q/E/R slot** (a Bloodpact Shroud on Q was impossible
before). Explicit paper-doll layout table drives BOTH drawing and hit-testing; every slot now
carries a caption so its name survives having an item in it; tooltips state "Equips to: any Special
slot"; and the backpack gained separate **Specials** and **Abilities (Q/E/R)** sections.
**Batch 4 — balance.** Weapon stamina ~0.7× across the board with the tier ladder intact + base
pool 100→130 (a 16-cost spear against 100 stamina is SIX swings, and the post-spend regen delay
re-arms every swing so sustained attacking regenerates nothing — "5 attacks per bar" was literal);
armor heavy/light gaps widened 5/9/12/10 → 12/17/26/23 **without raising the ceiling**, since last
session had just bumped the Miretyrant specifically so armor stopped nullifying it; forged-armor
upgrade bonuses are now per-set (~25% of the piece) instead of a flat +1 on a 14-armor cuirass;
Miretyrant attacks re-bumped (they were tuned against 32 armor, but geared play is 50-74);
Sanguinarch 420→620 HP and 15/50→34/72 damage (a mini-boss weaker than the common Mirejaw guarding
its own door); Gloam Brand 23→29 dmg + bigger burst while the Gloamdrinker's always-on lifelink
12%→8%; Wisdom gained a second, felt axis — **−0.5% ability cooldown/point (cap −50%)**, since
buff duration alone was invisible at 55 points; and the XP EXPONENT 1.8→1.7 (barely moves level 5,
takes ~29% off level 21, which is where pace was flagging).
**A display/real drift bug was caught only by live verification:** the armor retune first edited the
`{ label: "Armor" }` tooltip text, but real defense lives in `ItemDef.armorDefense` — the in-game
total didn't move. Both fields are now written from one table and asserted equal.
Verified live throughout via `preview_eval`; `tsc` + `npm run build` clean; zero console errors;
display list still ~1550 with 18 crypts. `RECIPES.md` armor tables and the dashboard's hand-mirrored
Enemies tab both updated. **Next: a playtest** — every number here is first-pass.
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

## Recent Entries

> Older entries in STATUS-archive.md.

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
