# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **B4-P3 — Class identity:
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

