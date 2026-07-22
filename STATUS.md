# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B4-P4 — 25-item playtest
omnibus** (2026-07-22, Opus, plan `.claude/plans/b4-p4-playtest-omnibus.md`). Off the user's
95-minute Ascetic run, which cleared the whole bayou and killed the final boss in
**Embersteel** gear — a tier below the set that content gates. All four buckets in one
session (explicit override of one-milestone-per-chat). **Bugs:** three "broken texture /
missing feature" reports were all references to something never built (crypt chest pointed
at a nonexistent texture key; crypt gem geodes wore the literal surface gloam-ore texture;
`refreshDiscovery` had no loop for weapon/armor upgrades at all). The perf regression was
structural — every one of **1142** enemies ran full AI each frame, now **115** via a
distance cull. Neighbouring crypts were visible because interiors always rendered; they're
now hidden unless occupied, which removed the spacing constraint and let crypts go **6 →
12**. Plus: AoE no longer hits submerged enemies, Comfort no longer blocked by a hunter
anywhere on a 28000px map, no free hit on dungeon entry, epic loot 4/6/8% → 10/16/22% with
a pity floor, homing orbs get a real miss rule, and a **Class tab** in the Character menu.
**Gaps:** the bayou had no food and no refine path — three dishes + **Mire Shard** /
**Mire Crucible** (Relic Forge Lvl 4) close both. **World:** the content-less **Dunes are
gone** (kept on disk for a future biome 4), the frontier past the badlands is now **63%
bayou**, POI counts are up across the board, and the Sunken Gorge has **two maws into one
interior**. **Combat:** magic weapons got a real identity (an on-hit detonation — their
armor-bypass did literally nothing vs enemies, which have no armor stat), set bonuses now
span tiers at the weakest worn piece, poison capped 5 → 3 stacks, the Mosswretch rears
back, every named fight gets a name card, and the Miretyrant is 4600 HP with a phase-3
arena that closes in. Verified live throughout; `tsc` + `npm run build` clean, zero console
errors. **Next: a playtest — every number is first-pass, and the density/biome-mix changes
especially want real play.** See B4-P4 below.
Prior: **B4-P3 — Class identity:
skill affinities + stat potency** (2026-07-22, Opus, plan
`.claude/plans/b4-p3-class-identity.md`). B4-P1's five survivors all differentiated on the
**same shape** — eight global scalar `RunModifier` fields — so nothing about a character
shaped **how you grow**, only how big your flat numbers were. Added a second, separate
channel: `ClassAffinity { skillXpMult, statPotency }` — per-skill XP rate and per-stat point
value. Locked with the user: both channels, double-edged but **mild** (×1.4–1.6 up,
×0.75–0.85 down), and **never reduce drops** — which means `chopping`/`mining` XP may never
be penalised (they roll the bonus-drop chance), enforced by a module-load guard. Each channel
has **exactly one hook site**: affinity multiplies in `awardSkillXp` **outside** the additive
XP bucket (so relics can't erase a class's defining weakness), and potency lives **inside
`PlayerProgression`**, so all eight per-point getters and every stat readout pick it up with
**zero** MainScene changes. Since skills gate recipe *discovery*, an affinity really changes
what a run can build. Two incidental fixes: the picker card **measures its own height** now
(the hand-tuned `CARD_H` was exactly the thing that breaks when a section is added), and
`Skills.ts` was **leaking Phaser** into the supposedly-Phaser-free dashboard — extracted
`PLAYER_WALK_SPEED` to a new `src/systems/movement.ts` (bundling `Characters.ts` standalone:
6.4 MB → 7.5 KB). **Verified twice over**: 20/20 assertions in Node against the
framework-free modules, then live in the browser end-to-end — picking the Warden gave exactly
×1.6/×1.4/×1.4/×0.8 XP through the real `awardSkillXp`, vitality 3pts → 18 HP (×1.5) → 138
max, the Character menu's markers sit 8px clear of their labels, all 11 skill rows hover with
the affinity line on exactly the 4 affinity skills, `scene.restart()` → Reaver is a clean swap
with zero carryover, and the dashboard page has `window.Phaser === undefined`. `tsc` +
`npm run build` clean, zero console errors. **Next: a playtest — every number is
first-pass.** See B4-P3 below.
Prior: **B4-P2 — Epic loot pool +
starter-ability nerf** (2026-07-22, Opus, plan
`.claude/plans/b4-p2-epic-loot-and-starter-abilities.md`). Fixed a design bug B4-P1 shipped
and built the biggest already-designed-but-unbuilt system in the game, which turned out to
be the same problem. B4-P1 pre-equipped every character with the **terminal outputs of the
Gemwright jewelry chain**, so the whole Duneshaper → crypt-warden → gem progression had no
reward left at the end of it. Now: `AbilityDef` carries a **`family` (which effect runs) +
`power` (magnitude scalar)**, so two grades of one effect coexist as pure data with no
duplicated dispatcher branch — characters grant **lesser variants** (0.5–0.6 power, longer
cooldowns) and the Gemwright recipes still produce the full ones, making a cleared crypt a
visible upgrade. Alongside it, **`src/systems/EpicLoot.ts`** finally ships the roadmap's
Phase-2b "epic loot": three pools **tiered by POI depth** (4%/6%/8%, each a superset of the
one above), rolled **inside `LootContainer.rollIfEmpty`** (its `rolled` flag is the real
gate) and selected by the loot table's own identity so no call site carries a driftable tier
arg. Adds **three found-only actives** (Gravebind / Spirit Lance / Drowned Aegis — each
reusing an existing primitive, with Aegis landing in the shared 75%-capped reduction bucket)
and **six passive uniques** incl. a new `statusResistPct` channel. Verified live and
measured throughout (blink 132 vs 220px, nova 17/82 vs 30/150, pact 3.0s/17.5% vs 6.0s/35%,
Aegis 100→40 and clamping at 25 with a relic, 20k rolls/tier matching spec, 4000 rolls
through the real shack path); `tsc` clean, zero console errors; dashboard gained an **Epic
Loot** tab. **No screenshots this session** — the Browser pane isn't displayed in this
environment, so the ability bar was verified via its render data. **Next: unplanned; all
new numbers are first-pass and want a playtest.** See B4-P2 below.
Prior: **B4-P1 — Start-of-run base
character** (2026-07-22, Opus, plan `.claude/plans/b4-p1-start-of-run-character.md`). **The
first milestone after the biome-3 umbrella closed** — the roadmap's own top deferred candidate.
A **run-start class picker** now offers a fixed roster of five survivors (Vagabond / Reaver /
Ashcaller / Warden / Ascetic), each bundling starting stats, a kit, a granted Q/E/R ability, and
a **double-edged run modifier** that stays live all run. Locked with the user: fixed roster (not
an RNG draw); one card bundles all four axes; modifiers are double-edged with **no score
effect** (score stays kills + speed bonus, verified byte-identical across characters); and the
"innate" ability is a **real special ITEM pre-equipped in its slot**, so it needed zero new
ability plumbing and unequipping it darkens the key. `src/systems/Characters.ts` is pure data
plus a `RunCharacter` accessor **shaped like `RelicManager`'s**, so each modifier adds exactly
one term at an existing choke point (`damageBonusMult` / `applyDamageToPlayer` / `moveMult` /
`awardSkillXp` / `effectiveStaminaCostMult` / `rollElite` / `syncStatBonuses`) — never new math.
The picker chains off the welcome overlay, shows on every run including New Run, and reuses the
pause freeze so **deciding your build never burns speedrun time**. Verified live end-to-end
(grants, ability-through-item, every hook measured against a neutral baseline, score isolation,
clean `scene.restart()`); `tsc` clean, zero console errors; dashboard gained a live **Characters**
tab. See B4-P1 below.
Prior: **B3-P5 — Biome-3 Phase 5: the
post-boss reward choice** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-5-boss-relic-choice.md`). **This completes the entire biome-3 +
new-systems arc (all 5 phases).** the user redirected the umbrella's kill-time modal into the
**Relic Forge**: rolling a **boss trophy** now offers **3 candidate Mythics to pick from** instead
of granting one at random. Because there's exactly one Mythic per family, the pick reads as
"which family gets your Mythic?". Boss-trophy-only but expressed as data
(`TrophyRoll.choiceCount`), so every other trophy is byte-for-byte unchanged; ownership isn't
written until the pick; picking runs the normal family-dominance path; commit-only (no skip/
reroll), and closing the forge mid-pick auto-takes the first card so a spent trophy is never lost.
Verified live end-to-end; `tsc` clean, zero console errors. Verification caught a 6px layout
overlap between the card stack and the relic grid's header (now a re-asserted 14px gap).
**Next: no phase is queued** — the arc is done. See B3-P5 below + [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4d(2) — Biome-3 Phase 4d,
session 2: the Miretyrant, its lair, and the win-con swap** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4d-miretyrant.md`). **This completes Phase 4d and moves the game's
win-condition to the bayou**, demoting the Duneshaper to a mid-boss exactly as biome 2 demoted the
Gremlin King — which finally makes the **Duneshaper's Heart** obtainable (it gates the Gemwright's
ability-jewelry tier and had been unreachable since B3-P2b, because killing it ended the run).
Session 1's inert `tyrant_sigil`/`gorge_bone` now craft the **Effigy of the Miretyrant** (2/1/4
with Mirehide, tier 1), which reveals the **Sunken Gorge** on the map and unseals its maw. Locked
via `AskUserQuestion` (all as recommended): adds = **bellow waves** on their own clock (3 per
bellow, 5 enraged, capped at 8 — punctuation, not crowd-control busywork); interior = **approach +
arena**; **no arena seal** (4c's lock — hardcore + no escape = no counterplay); **one fixed lair**.
The boss is a deliberate counterweight to the caster Duneshaper: a **bruiser** that closes to ~96px,
whose dodges are all spacing dodges (locked-heading chomp, ±120° tail sweep you escape by distance,
radial slam, and a phase-2 death roll you outrun across), resisting slash and poison but folding to
**blunt** so the two finales reward different loadouts. The dungeon layer was **generalized, not
copied**: `generateCrypt` gained an optional forced arena room, a new `DungeonInterior` interface
(`src/systems/Dungeon.ts`) lets the player clamp, room lighting, nav steering, containment and every
underground gate serve both interiors with no branching, and the shell builder was extracted into
`renderDungeonShell()`. Verified live end-to-end (placement, key loop, descent, every attack's hit
geometry, phase gates, bellow cap, both win/no-win kills); `tsc` clean, zero console errors.
**Next: Phase 5 — the post-big-boss RNG reward choice**, whose trigger (a big-boss kill that does
NOT end the run) now exists for both the Gremlin King and the Duneshaper. See B3-P4d(2) below +
[[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4d(1) — Biome-3 Phase 4d, session 1: the bayou's two surface POIs** (2026-07-22, Opus,
plan `.claude/plans/biome-3-phase-4d-pois.md`). The two POIs run on **deliberately different
verbs**, because every prior POI resolves as "kill the guards, take the loot": the **Sunken Shrine**
is a rite the
PLAYER starts (spend 3 Blight Gland + 2 Gloam Dust → three escalating waves fought on the spot →
guaranteed **Tyrant Sigil**; walking out of a 420px radius for 5s lapses it, destroying what it
summoned; emptying the bowl re-arms it, so it's renewable with **no** respawn timer), and the
**Drowned Lodge** is a place whose danger is its geography (a stilt village where the boardwalk is
the only safe footing — Corpselights above, Mirejaws in the 0.5×-slow water below; per-hut caches
plus a chieftain's hut planked shut until every haunt is dead, holding a guaranteed **Gorge Bone**;
respawns on the standard S4 timer). Both key materials ship **inert** (no recipe yet — deliberately,
so nothing dead-ends in the crafting menu until the descent exists). Verification caught a real
bug: the POI-clearing exclusion list was duplicated across three samplers so only `pickBayouPoint`
knew about the new POIs, and `scatterInZone` had no check at all — now **one
`insidePoiClearing(x,y)`** consulted by all four paths (0 violations across 2162 nodes / 1043
enemies). Verified live end-to-end; `tsc` clean, zero console errors. See B3-P4d(1) below +
[[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4c — Biome-3 Phase 4c: Sunken Crypts, the DUNGEON mechanic** (2026-07-22, Opus, plan
`.claude/plans/biome-3-phase-4c-crypts.md`). 6 crypts (two per gem theme) whose interiors are a
**pocket of the same world**, not a second Scene — prebuilt in `CRYPT_REALM`, the dead corner of the
world SQUARE outside the world CIRCLE, laid out by the framework-free `src/systems/CryptLayout.ts`
(merged wall runs, room-discovery lighting, crypt nav for dwellers that now collide with walls).
The 3 ability gems + Moonsilver live here, hard-gated `shielded` behind **three bespoke wardens with
three genuinely different state machines** (Palewake's breakable drain-tether / Kilnborn's rising
heat meter and cold-tile dodge / Sanguinarch's player-driven phase). Full entry in
STATUS-archive.md; see [[survivor-rpg-biome-3-roadmap]].
Prior: **B3-P4b — the Duskmire Bayou creature roster** (2026-07-22, Opus). Six bespoke melee-core
creatures (Mirejaw / Blighttoad / Mosswretch / Murkling / Fenlurker) + the one uncommon ranged
Corpselight, which introduced the game's first HOMING projectile. Added `Enemy.pendingPoison`, 3
materials and 6 elite trophies at Common/Tier 3. A same-session tuning pass rescaled the whole
roster — **size new enemies against the PLAYER's measured envelope, never the previous biome's
roster** (see [[feedback_size_enemies_against_player]]). Full entry below.
Prior: **B3-P4a — Duskmire Bayou terrain, environment & material sources** (2026-07-22, Opus). The
bayou as a walkable, harvestable third biome: water slows by depth (never blocks); **`poison` is a
SUBTYPE OF MAGIC** (bypasses flat armor, takes heavy-armor magic mitigation, ticks over time and
halves regen) via a new `Poison.ts` that composes `BleedManager` with stacking `apply()` vs
refresh-only `sustain()` modes; three themed macro-zones (miasma/bonemire/hammock) and 443 nodes;
plus `StatusBarUI`, a generic debuff strip. Full entry in STATUS-archive.md.
Prior: **B3-P3 — Biome-3 Phase 3: Bayou gear progression (reforge tier + gem augments)**
(2026-07-21, Opus) — gem augments (mix-and-match, consumed, max 2/instance) reusing the existing
per-instance `upgrades` field + `UpgradeMenu`, plus the Gloamsteel/Mirehide reforge tier, Workbench
Lvl 5, Gloamsteel Arrows and the lifelink Gloamdrinker. Authored dormant; **4a now sources its Bog
Ore + gems**; 4b's Mirejaw now sources Mirehide. See B3-P3 in STATUS-archive.md.
Prior, in brief (full entries in STATUS.md's Recent Entries or STATUS-archive.md — grep by id):
**B3-P2b** jewelry-effect pipeline + the Gemwright's Table (a different effect layer from relics);
**B3-P2a** the Q/E/R cooldown-only, equipment-granted ability framework + Dota-style HUD bar;
**B3-P1/P1a** terrain-that-matters — large themed macro-zones + the generic `environmentEffectAt`
env hook; **PB18** backpack armor-upgrade fix + reforge-returns-to-slot.

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
