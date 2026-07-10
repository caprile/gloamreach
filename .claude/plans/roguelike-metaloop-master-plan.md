# Master Plan: Roguelike Run / Score Meta-Loop + Supporting Systems

Status: **design locked at the spine level, sub-decisions open per milestone.** Drafted
2026-07-10 with the user. **M-FX (below) is shipped; M-R1 is next, planned for its own
session** (per the project's "one milestone per chat session" convention — see
`STATUS.md` for M-FX's ship details). This is the umbrella plan for a batch of requested
systems; each milestone below should get its own detailed plan file when it's picked up
(per the "plans committed in-repo" convention), but this doc is the shared vision +
ordering + locked decisions they all hang off.

## The vision (the gameplay loop we're building toward)

**New seed → RNG run → level stats → get better gear → get relics → kill bosses → win by
killing the final boss, as fast as possible → high score.**

Payoffs the loop must reward:
- **Going deeper** (harder biomes further from center = more points/power).
- **Going fast** (speed multipliers on kills + a big weight on time-to-final-boss).

Everything requested this session is a spoke on that hub:
- **Circular open world** = the spatial backbone (danger by radius).
- **Run + Score + Hardcore death** = the run container and the point of it all.
- **Day/Night + Sleep + Bed** = the survival-time layer.
- **Biome-discovery timer** = the "go fast" payoff, made mechanical.
- **Gremlin War Camp + altar hints** = the "harder area = bigger payoff," made spatial.
- **Trophies → Relics + trophy gear** = the run-length power / replayability (ARPG/StS spine).

## Locked decisions (from the user, this session)

1. **Full run-based roguelike.** A seed defines a run. Only meta (high-score table)
   persists between runs. Everything else resets on a new seed.
2. **No portals — one giant circular open world.** Spawn at a safe center; biomes get
   progressively harder outward from center (radius = difficulty). This replaces the
   earlier "biome → boss → portal → next biome" chain from the long-term notes. Per-biome
   tracking still exists, but **the end-of-run score is what matters.**
3. **Hardcore death only, for now.** One life. Death immediately ends the run and posts
   the score. **No respawn, no tombstone** in hardcore (nothing to recover — it's
   terminal). Easy-mode variants (limited lives / respawn-at-bed) are a **documented
   future option**, not built now. This means the Bed's "respawn point" role is dormant
   under hardcore (see M-SB).
4. **Win = kill the final (outermost) boss.** Killing it ends the run with a completion
   bonus. Score is weighted so a **fast final-boss kill can beat a slow full-clear** — we
   want even speedrunners tempted to **skip optional mid-bosses** to reach and kill the
   final boss quickly.
5. **Trophies fork two ways:** (a) consumed to roll **RNG relics** (you don't pick the
   relic; the trophy's tier dictates the rarity pool), and (b) used in **recipes for
   special craftable items equippable in any existing slot.** No dedicated trophy
   equipment slot — that earlier idea is abandoned.
6. **Night has no enemy damage buff.** Night enemies move **slightly faster** and spawn
   **more densely in unexplored / newly-entered areas and on respawn.** Not a flat
   night-wide stat bump.
7. **Start-biome density already feels high** — prefer making the **biome bigger** over
   adding more enemies per area. Density tuning should ride on the bigger-world work, not
   a global count bump.

## Open sub-decisions (resolve when the relevant milestone starts)

- Exact **score formula weights** (M-R1) — first-pass proposal below, expect tuning.
- **Relic effect pool + rarity tiers + how many you can hold** (M-RL) — proposal below.
- **Day length / night length** and how aggressive the night tint is (M-DN).
- **Sleep's non-time effect** — a "Rested" buff? just skip-to-dawn? (M-SB).
- Whether **new-run reseed** is a menu/keypress/death-screen button (M-R1).
- Concrete **circular biome layout** (how many rings, which biome types, where the final
  boss sits) — only biome 1 (forest/gremlin) exists today; outer rings are stubs (M-W1).
- ~~Base elite spawn % + night multiplier + whether shack guards stay forced-elite~~ —
  **resolved, M-EL2 shipped 2026-07-10** (8% base, 3x at night, shack guards stay forced).

---

## Milestones

Ordered by dependency, with a recommended build order at the end. Each is sized S/M/L and
tagged with the model-switch convention (Opus for new mechanics, Sonnet for
fixes/UI-on-existing-systems).

### M-FX — Cleanup fixes (S, Sonnet) — **SHIPPED** 2026-07-10

Three small, unrelated fixes surfaced while drafting this plan. Full verification detail
in `STATUS.md`'s M-FX entry.

1. **Fractional weapon damage — done.** `tryAttackEnemy()` used to
   `Math.round(baseDmg * skillMult)` before applying damage, discarding a weapon skill's
   +0.5%/level bonus whenever it didn't cross a whole number (real effect: zero). Resolved
   by keeping the float all the way to `enemy.health` (a plain `number`, no type change
   needed) and rounding only at the floating damage-number popup. Verified live: Blunt lvl
   4 (×1.02) on a Stone Club dealt exactly 5.1 real damage while still displaying "5".
2. **Chest re-arm timing + stale comment — done.** `LootContainer.rearmIfEmpty()` was
   called at guard-*death* time (comment claimed "on respawn"), allowing a loot → kill
   guards → immediate re-roll double-dip before any respawn timer. Moved the call into
   `respawnShackGuards()` itself; comment corrected. Verified live: `rolled` stays `true`
   right after both guards die, only flips `false` when `respawnShackGuards()` runs.
3. **Stat-panel recolor — done, on BOTH panels.** the user's actual complaint was the
   **Inventory (Tab) menu's Combat column** (next to Equipment) — its `Damage` line was
   red (`#c25a5a`), `Armor` green (`#7ac27a`), `Attack Speed`/`Attack Stamina` their own
   cyan/gold, a decorative rainbow with no actual meaning. All five lines are now one
   neutral grey (`#8a93a3`, matching the already-bland Attack Range/Move Speed lines).
   The **Character menu's Stats tab** (green "Unspent points"/`[+]`/Skills-tab "MAX") was
   fixed too, first, before the correction — recolored to neutral amber (`#e3b25a`).
   Both changes stand; **red/green are now reserved exclusively for buff/debuff markers**
   added later, across both panels.

### M-W1 — Circular open world foundation (L, Opus) — the spatial backbone

Restructure world-gen from the current rectangular map into **concentric biome rings**
around a safe center, with **danger scaling by radius**.
- Safe center: no enemies, visually distinct (placeholder circle now), the run start.
- Radius → difficulty: enemy level/count/type and resource tier scale with distance from
  center. Biome *type* by radius band (and maybe angle sector for variety).
- Only **biome 1 (forest/gremlin)** exists today — build the ring/radius→difficulty
  scaffolding with biome 1 filling the inner ring(s) and **stubs for outer rings**, so
  adding biomes later is data, not a rewrite.
- **Bigger biome 1** (per locked decision 7) — more area at roughly current density, not
  more enemies per area. Recalibrate spawn counts to the new area.
- Feeds: M-R1 (depth = radius for scoring), M-FA (biome-discovery events), M-DN
  (unexplored-area density).

### M-R1 — Run + Score + Hardcore death (L, Opus) — the run container — **SHIPPED** 2026-07-10

The heart of the meta-loop. A **Run** object owns: seed, elapsed time, per-biome stats,
running score, and run state (active / ended).
- **Seed** drives world-gen RNG (M-W1), loot, relic rolls (M-RL). Same seed = same run.
- **Hardcore death** → freeze the world, compute final score, show a **run-end / score
  screen**, offer **New Run (reseed)**.
- **Win** = kill the final/outermost boss → completion bonus → same score screen, flagged
  as a victory.
- **Score persistence:** minimal `localStorage` high-score table (first use of save/load —
  meta only, not full game-state save).
- **Score formula (first-pass, tune later):**
  `score = finalBossBonus(depthOfFinalBoss) × runSpeedMultiplier + Σ perBiome(depthTier ×
  freshAssaultTimedKillPoints) + midBossBonuses + relicMilestones`.
  Constraint that makes skipping viable: the **final-boss completion × speed** term must
  be able to **exceed the sum of full-clear points**, and per-biome/mid-boss points must
  **diminish** so grinding them can't out-score a fast rush. Mid-bosses give power/relics
  (a real reason to fight them) but are optional for score.
- Note: with one biome today, the Gremlin King is effectively *both* the first and (for
  now) the final boss — the system must work with 1 biome and scale as rings are added.

### M-DN — Day/Night cycle (M, Opus) — new global state system — **SHIPPED** 2026-07-10

A global day/night clock. Detailed plan: `.claude/plans/clever-sparking-gem.md`; full
verification in `STATUS.md`'s M-DN entry.
- **Cycle: 10 min day + 5 min night** (locked by the user), run starts at dawn. Blue-dusk
  screen darkness + minimap dimming, smooth 20s dusk/dawn fade.
- **Night teeth (as locked):** enemies **slightly faster** (×1.15, no damage buff); a
  **nightfall surge** of ~6 normal enemies spawns in still-unexplored cells around the
  player, **bounded by a dawn cleanup** (un-engaged, off-screen night-spawns are removed at
  daybreak) so density never creeps up over a long run. "Denser on respawn" was out of scope
  (no ambient respawn system exists).
- **Torch lighting (added this pass):** the night is a light-mask — a held Torch (future
  Lantern) lights the player, and Gremlin Shacks / the Boss Altar are lit. Torch is now
  non-stackable.
- Drives Sleep (M-SB, next) and interacts with the Fresh Assault timer (M-FA) and score (a
  run's in-game time is what the speed payoff measures).

### M-SB — SUPERSEDED by the Comfort item (S, Sonnet) — **SHIPPED** 2026-07-10

Originally a placeable `cot`/`bed` with a sleep/fast-forward-to-dawn mechanic. The user
decided against making night skippable at all — M-DN's night teeth (faster enemies,
nightfall surge) are one of the run's few real sources of time pressure, and a free
skip-to-dawn would let players opt out of it every night. Rebuilt instead as a **Comfort
item** ("Bedroll"): a tier-0 placeable that grants live/conditional +1 HP/s regen when
near a lit Campfire and away from enemies — no clock interaction at all. Full detail:
`.claude/plans/imperative-riding-island.md`, `CLAUDE.md` roadmap entry 5j.

### M-FA — Biome-discovery "Fresh Assault" timer (M, Opus) — the go-fast payoff

First entry into a new biome starts a **decaying multiplier** on kill XP **and** run score.
- Full bonus for the first N in-game minutes after discovery, decaying to 1×.
- HUD readout (a timer/multiplier badge) so the player feels the window.
- Depends on: M-W1 (biome-discovery events), M-R1 (score), reads the M-DN clock for
  in-game time. This is the mechanical form of "beat stuff quickly once you discover a new
  biome."

### M-WC — Gremlin War Camp (altar POI upgrade + hints) (M, Opus/Sonnet)

Promote the lone Boss Altar to a **larger POI** — a walled gremlin war camp.
- Palisade / banner / totem props; the existing 5 shacks + elite guards clustered here;
  the altar at the center.
- **Escalating hints** toward it: in-world density ramp (already partial), breadcrumb
  props, and a **discovered-landmark minimap ping** (reuse `MinimapUI.revealLandmark()`,
  same as the altar landmark already does) once explored near. Note: the 5 individual
  Gremlin Shacks scattered through the forest should get this same landmark treatment
  too, independent of the War Camp — see `CLAUDE.md`'s 2026-07-10 second-round backlog
  note; small enough to do ahead of this milestone rather than waiting for it.
- Builds directly on the existing altar/shack/elite systems (5c/5b) — mostly content +
  layout, one hinting pass.

### M-EL2 — Generalized elite spawning (M, Sonnet) — **SHIPPED** 2026-07-10

Built directly after Comfort/before M-FA — the user picked this order via
`AskUserQuestion` when this milestone was reviewed, since M-FA's premise (a decaying
bonus on entering a *new* biome) has no real biome-discovery event to hook until M-W1
ships, while this one is fully self-contained. Full detail in `STATUS.md`'s M-EL2 entry.

- **Boar and Snake elite variants — done.** New `src/entities/Boar.ts` (Boar previously
  had no dedicated class — MainScene built a bare `Enemy` inline at two call sites) and an
  `elite?: boolean` param added to `Snake`'s existing constructor. Both follow the
  Gremlin/Gremling precedent exactly: +50% HP/dmg, +10% move speed, 1.3x scale, 2x loot,
  crimson/gold recolor (`boar_elite`/`snake_elite`). Fixed a latent bug found along the
  way: Snake's strike/flee velocity only ever multiplied by `envSpeedMult` (the night
  buff), never `speedMult` — an elite Snake's own speed bonus would have been silently
  inert without this fix.
- **Chance-based elite rolls — done.** `MainScene.rollElite(rng, chanceMult)`, base
  `ELITE_SPAWN_CHANCE = 0.08` (8%), called at every normal spawn site: `spawnEnemies()`,
  `spawnAltarDensity()`'s extra gremlin-family spawns, and the M-DN nightfall surge.
- **Higher elite chance at night — done.** `NIGHT_ELITE_CHANCE_MULT = 3` (→ ~24%),
  applied only in `spawnNightBatch()`. Verified via a 30x/180-spawn sample: observed
  23.9% against the expected 24%.
- **Resolved sub-decision:** Gremlin Shack guards stay hard-guaranteed-elite, unchanged —
  not folded into the rolled system, per the "deliberate fixed difficulty spike" reasoning
  above.
- Kill-scoring needed zero changes — the existing classifier already reads `enemy.elite`
  generically, so Boar/Snake elite kills automatically score as `"elite"`.

### M-RL — Relics (trophies → RNG run-length passives) (L, Opus) — the ARPG spine

- **Relic forge** action: consume trophies → roll **one random relic** from a pool
  **weighted by the trophy's tier** (Gremlin Trophy = common pool; Gremlin King Fang =
  rare pool). Player does **not** pick the relic.
- Relics are **permanent, run-length, StS-style passives** (examples to design: kill-heal,
  +move speed, start-each-biome-with-X, +Fresh-Assault-window, cheaper stamina, etc.).
- **Held in a relic bar** (proposal: unlimited, StS-style; hover for effect). **Reset on
  new seed** (they belong to the run, not the character).
- Data model: a `Relic` def table + a `RelicManager` (framework-free, like Buffs/Skills)
  that applies passive effects; a relic bar UI (mirror `BuffBarUI` pattern). Rarity tiers
  + effect pool are the main open sub-decision.

### M-TE — Trophy-crafted special equipment (M, Opus/Sonnet)

- New **recipes gated on trophies** producing special items equippable in the **existing**
  slots (weapon/armor) — no new trophy slot. e.g. a Gremlin-King-Fang weapon or a
  trophy-infused armor piece with a standout stat.
- Reuses the existing recipe/equip/upgrade systems; content-heavy, low new-architecture.
  Independent of M-RL (both just consume trophies).

---

## Build order — LOCKED (Option A, confirmed by the user 2026-07-10)

Get the roguelike loop *playable and fun* on the current single biome ASAP (project's
incremental ethos), then expand the world under it:
1. **M-FX** (quick warm-up, Sonnet) — **shipped**.
2. **M-R1** on the current map, with Gremlin King as the temporary "final boss" (Opus) —
   **shipped** 2026-07-10 (detailed plan: `.claude/plans/rustling-weaving-lovelace.md`;
   see `STATUS.md`). Seed is display-only for now (deterministic world-gen deferred to
   M-W1); score = flat kill points + completion-bonus × speed multiplier; hardcore
   permadeath ends the run; first `localStorage` high-score table.
3. **M-DN** (day/night — **shipped** 2026-07-10, see 5i/STATUS.md) → **Comfort item**
   (was M-SB/Sleep-Bed — **shipped** 2026-07-10, see 5j/STATUS.md) — the survival-time
   layer, minus the sleep mechanic (dropped, see M-SB entry above).
4. **M-EL2** (generalized elite spawning — **shipped** 2026-07-10, reordered ahead of
   M-FA per the user — see M-EL2 entry above for why).
5. **M-FA** (speed payoff) — note: its single-biome-scope question is still open, see
   the M-FA section above.
6. **M-RL** (relics — the replayability hook).
7. **M-WC** + **M-TE** (content depth).
8. **M-W1** (circular multi-biome world) — expand the world beneath a proven loop.

## Convention reminders for whoever picks these up

- Almost every milestone here is a **new core mechanic → prompt the user to be on Opus 4.8**
  before implementing (M-FX is the exception → Sonnet).
- Each milestone gets its **own detailed plan file** in `.claude/plans/`, committed with
  the feature. This doc is the umbrella, not the per-milestone spec.
- Keep `RECIPES.md`, `STATUS.md`, and `CLAUDE.md`'s roadmap in sync as each ships.
