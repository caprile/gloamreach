# Status

## Current State

_Living snapshot — edit in place, never append. Last shipped: **Gloaming Vein
(mineable rarity-ore POI + Gloamwarden mini-boss + trophy refinement)**, **2026-07-11**._

**The game.** Top-down 2D pixel survival-ARPG (Phaser 3 + TypeScript + Vite; all
textures are placeholders generated in `BootScene`). One forest biome sitting in the
center of a large **circular** world (8000px, `WORLD_RADIUS` 4000; the biome fills a
central `BIOME_RADIUS` 2000 circle, the rest empty grass reserved for future biomes —
danger scales outward, the locked M-W1 direction). Day/night cycle and a hardcore
run/score meta-loop (seed is display-only for now). Shipped systems: gather/craft with
tool-KIND gating + a Workbench tier gate;
souls-like telegraphed combat on **every** enemy (Boar charge, Snake coil-lunge,
Gremlin/Gremling claws) plus the first boss (Gremlin King — poise/stagger + leaping
smash / charge / ground slam, enrage <50% HP); stamina/sprint/dash with dash i-frames;
Skills + Player Level progression; placeable stations (Campfire, Drying Rack, Relic
Forge, Bedroll); cooking → timed HP-regen food buffs; wearable 3-tier Gremlin armor +
weapon/station upgrades; elites (chance-based rolls + forced-elite shack guards)
dropping per-species trophies; a probabilistic trophy→Relic economy with a gated
**trophy-refinement** loop (the Gloaming Vein ore POI + Gloamwarden mini-boss →
Gloam Shards → the Relic Forge's Refine tab); a **nearby-view
minimap + full-screen zoomable/pannable world map** (M / Map button) with fog of war and
discovered-POI icons; the Gremlin War Camp + Gloaming Vein POIs; contextual hints + a
pause menu; and a drift-free balancing dashboard at `/dashboard.html` (second Vite entry,
imports live data modules).

**Meta-loop** (`.claude/plans/roguelike-metaloop-master-plan.md`): M-FX / M-R1 /
M-DN / Comfort(M-SB) / M-EL2 / M-RL / M-WC all shipped; M-FA cut. Hardcore one-life
death ends a run and posts a `localStorage` high score; killing the Gremlin King =
win. The world is now circular + much larger (M-W1 geometry prep, above); deterministic
seeded world-gen and actual multi-biome content are still deferred to M-W1 proper.

**In progress / next.** **Gloaming Vein shipped this session** (see below). Next in the
locked build order: **M-TE** (trophy-gated special gear), then **M-W1** (multi-biome
content in the now-circular world) last. A separate playtest-polish backlog also remains:
discovered-material toast, hover highlight on interactables, inventory auto-sort, a ranged
starter weapon, and passive HP regen.

**Known issues / open.**
- Boss may be slightly overtuned after the 5s damage bump (the user's "TBD" — left as-is
  since the harder feel was wanted). 5t cut the smash AoE 120→95 so it's movement-dodgeable;
  dash i-frames confirmed working against it.
- Enemy shove-knockback is near-cosmetic — `Player.update()` zeroes idle velocity each
  frame; deferred to a combat-feel pass.
- No save/load beyond the high-score table; all run state is in-memory only.
- The dashboard **Enemies tab is the one hand-mirrored data source** — keep it in sync
  when tuning enemy stats (everything else on the dashboard is imported live).
- **World Y-sort depth is now compressed** (`systems/depth.ts` `ysortDepth` = `y * 0.3`)
  so world objects stay below the fixed HUD even though the world is 8000px tall. Any NEW
  world object that Y-sorts by position must use `ysortDepth(y)`, not raw `y`, or it can
  draw over the HUD. Fixed-HUD depths (2600–6000) are unchanged and still clear it.

## Recent Entries

> Older entries in STATUS-archive.md.

### Just finished: Gloaming Vein (rarity-ore POI + mini-boss + trophy refinement)

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
