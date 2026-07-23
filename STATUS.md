# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B4-P6 — Perf regression
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
Prior: **B4-P4 — 25-item playtest
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
