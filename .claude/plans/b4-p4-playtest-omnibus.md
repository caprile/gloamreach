# B4-P4 — 25-item playtest omnibus (bugs + gaps + world density + combat feel)

Source: The user's 95-min Ascetic run (lvl 18, ~60 in Endurance/Vitality/Agility, cleared the
full bayou and killed the Miretyrant in **Embersteel** gear — one tier below the bayou set).

That last fact is the thesis of this batch: **the endgame tier was never necessary**, the map
is too large for the materials in it, and the deepest content (magic weapons, minibosses, the
final boss) has no identity. Everything below serves that, plus a pile of genuine defects.

Locked with the user via `AskUserQuestion`:
1. **All four buckets in one session** (normally one milestone per chat — explicit override).
2. **Dunes deleted**, bayou takes the frontier; a future biome will reclaim it later.
3. **Magic = on-hit AOE detonation.**
4. **Set bonuses span tiers** (weakest-piece strength).
5. **Bosses get new mechanics + presentation**, not just numbers.
6. **Densify hard, keep `WORLD_RADIUS` 14000.**

---

## Bucket A — Bugs (12)

| # | Symptom | Root cause (confirmed unless marked *investigate*) | Fix |
|---|---|---|---|
| A1 | Class info unviewable after picking | `CharacterMenu` has Skills/Stats tabs; nothing renders `RunCharacter`'s def | Add a **Character** section/tab showing name, boon/bane, affinity lines (reuse `affinityLines(def)` so it can't drift) |
| A2 | Murklings in the badlands | *investigate* — `makeRespawnEnemy` does branch on `dominantBiomeAt`, so this is either a blob-edge read or a POI/den path that hardcodes bayou species | Trace the actual spawn path; gate on the same biome read |
| A3 | Emberblink nova damages submerged enemies | `emberblinkBurst()` filters `enemy.active` but **not `isTargetable()`** (unlike `resolveWeaponHit`/ability damage, which do) | Add the `isTargetable()` guard; audit `dealSetBonusDamage` callers for the same hole |
| A4 | Dungeon chest = black box, green outline | Phaser's missing-texture placeholder — the crypt side-room chest references a key `BootScene` never generates | Generate a proper crypt-cache texture |
| A5 | Gloam gem ≈ gloam-shard node | `geode_gloam` (purple crystal, dark shell) vs `gloaming_vein` (purple ore) are near-identical reads | Re-art the geodes: distinct silhouette + palette separation |
| A6 | Can see the crypt next door | Six interiors share one grid in `CRYPT_REALM` (3400×2400 for 6); a neighbour sits inside camera range. Brazier lighting already special-cases this — the *geometry* doesn't | Widen the grid pitch past the camera's half-extent so a neighbour can never be on screen |
| A7 | Enemies insta-attack on dungeon entry | *investigate* — dwellers spawn already-aggro'd with attack cooldowns at zero | Seed a short post-descent grace on the enemy's next-attack clock |
| A8 | Resting buff dead in badlands | `isAnyEnemyAggro()` blocks Comfort, and Duskrunners have a **620px leash** and barely deaggro — so something is essentially always hunting you | Scope the check to a generous radius around the player rather than the whole world |
| A9 | Corpselight orb homes forever | `ORB_LIFETIME_MS` **9000** at 170px/s with a 1.9 rad/s turn = a ~1.5km curving chase | Cut lifetime, and add a **miss rule**: once the orb passes its closest approach, it stops homing (flies straight) and expires shortly after |
| A10 | Never saw a weapon-upgrade unlock | `refreshDiscovery()` loops `STATION_UPGRADES` and `TOOL_UPGRADES` — **`WEAPON_UPGRADES` and armor upgrades are simply absent** | Add both loops, same one-shot `discoveredUpgradeIds` pattern |
| A11 | Zero epic loot all run | 4%/6%/8% per container; a realistic run opens few enough chests that zero is the *likely* outcome | Raise rates and add a **pity counter** (guaranteed epic after N dud containers), mirroring the relic pity precedent |
| A12 | Overall performance feels worse | *investigate* | Profile the per-frame hot path; the light collector, poison/status ticks and the enemy sweep are the suspects |

## Bucket B — Content gaps (2)

- **B1 — Bayou food chain.** `COOK_RECIPES` stops at badlands; no bayou creature drops meat, so
  the whole biome has zero food. Add a meat drop to the bayou roster's melee core + Lvl 4/5
  campfire dishes using bayou natives (the existing `requiredCampfireTier` gate carries it).
- **B2 — Bayou relic refining.** All six bayou trophies are `common / powerTier: 3`, and
  `REFINE_RECIPES` stops at the tier-2 Ember Shard row — the code comment already owes a tier-3
  currency. Add the shard, its refine row, and a Relic Forge Lvl 4 conversion, mirroring
  Gloam→Ember exactly.

## Bucket C — World & density

- **C1 — Delete Dunes.** Remove from `BIOMES` + `CEILING_POINTS` in `WorldBiomes.ts`; bayou's
  unlock radius moves inward so everything past the badlands is bayou. Keep `Dunes.ts` on disk
  (unreferenced) — a future biome reclaims tier 4.
- **C2 — Density.** Multiply dungeons and POIs hard, targeting **a full material set inside any
  quadrant**: crypts well past 6, plus dens/shrines/lodges/forges/veins scaled to match.
- **C3 — Two boss locations.** A second Miretyrant lair, so the finale isn't a cross-map trek.

## Bucket D — Combat feel

- **D1 — Magic = AOE.** New per-weapon `WEAPON_ON_HIT_BURST` data row: a magic hit detonates a
  nova at the target (reusing `emberblinkBurst`'s damage-sweep + flash idiom). Data-driven so a
  future magic weapon is a row, not a branch. Also correct the **stale comment** in `Weapons.ts`
  claiming Hexlings resist magic — they're at ×1.25 (**weak**) now.
- **D2 — Set families span tiers.** `SetBonuses.ts` matches on a set *family* (light/heavy lineage)
  across tiers, granting the bonus at the **weakest worn piece's** strength. Upgrading one piece
  can never be a downgrade.
- **D3 — Miretyrant.** New phase mechanics + arena hazards + presentation beat. It died to
  one-tier-old gear at 3200 HP.
- **D4 — Minibosses get character.** Each gets a signature gimmick and an intro treatment, not
  just a health bar.
- **D5 — Mosswretch tell.** Its wind-up isn't readable; lengthen/clarify per the standing
  "tells are motion + tint, never world-space red arcs" lock.
- **D6 — Poison stacking.** Discrete `apply()` doses genuinely stack with no cap — a few
  Blighttoad bites compound into absurd damage. Cap the stack count.

---

## Order of work

A (clears noise) → B (small, self-contained) → C (world shape) → D (the design work).
`tsc --noEmit` after each bucket; live `preview_eval` verification at the end of each of C and D.

Keep in sync: `RECIPES.md` (B1/B2/D2), the dashboard's manually-mirrored **Enemies** tab
(D3/D4/D5/D6 and any bayou loot change), and `STATUS.md` per its maintenance rules.
