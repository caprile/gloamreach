# Playtest feedback 2026-07-15 — organized session plan

Source: the user's playtest feedback dump (15 items), triaged + grounded against the code
2026-07-15. This doc groups the feedback into **8 sessions** by file-footprint (so parallel
work doesn't collide) and model (Opus for new mechanics, Sonnet for fixes/tuning, per the
model-switch convention). All design forks were locked via `AskUserQuestion` — the locked
answers are recorded per session. File:line refs are from the investigation pass; verify
before editing (the code moves).

## Locked decisions (from AskUserQuestion, 2026-07-15)
- **Blunt weapon debuff (S7):** movement **slow / cripple** (drives existing `Enemy.speedMult`).
- **Boss guaranteed-mythic relic (S4):** **main bosses only** — Gremlin King → Mythic T1,
  Duneshaper → Mythic **T2**. Mini-bosses (Gloamwarden/Cinderwrought) keep current drops.
- **Stamina relics / matrix (S4):** fill the **full 8×4 matrix** — every family gets a
  Common/Uncommon/Rare/Mythic (~14 new relics; also closes Common-xp + Uncommon-stamina holes).
- **Common-trophy crumble (S4):** **soften it AND lift the refined-Uncommon Mythic cap** (so
  mini-boss refined trophies can reach Mythic, not just main bosses).
- **Tips rework (S2):** replace with a **static "How to Play" / core-controls reference**
  (no spoilers, no win-condition). Keep the existing specific one-off popups (warren/camp tips).

---

## Parallelization waves
Constraint: most sessions touch the huge `MainScene.ts`; **S5 is the only one that never does**
(cleanest true-parallel). Recommended order:

- **Wave 1 (parallel-safe, minimal cross-overlap):** S4 · S5 · S6 · S2
- **Wave 2:** S1 · S3 (HUD/inventory + MainScene — run after Wave 1 or in worktrees)
- **Wave 3 (sequential, design-gated):** S7 → S8 (both edit `Weapons.ts`/`Recipes.ts`; the bow
  should fit S7's finalized identities)

Each Opus session is its own chat (switch model first). Sonnet sessions likewise.

---

## S1 — Quick HUD/UX fixes  ·  Sonnet
Small, independent fixes.
1. **Stamina re-press latch** — when stamina fully empties, require a shift **release + re-press**
   before sprint resumes (today it auto-resumes the instant stamina regens while shift is held).
   Add a latch in `Player.update()` (owns `shiftKey`); condition becomes
   `sprinting = moving && canSprint && shiftDown && !sprintLocked`. Set lock when `canSprint`
   goes false with shift held; clear on shift release. `Stamina.ts` unchanged. (`Player.ts:143`,
   scene gate `MainScene.ts:1432-1446`.)
2. **Level-up toast overlap** — the level-up banner (`MainScene.showLevelUpBanner`, ~`:8471`,
   `cy = height*0.3`) just nudges center toasts down via `eventLogUI.setTopOffset(cy+80)` for
   2150ms — an 80px guess, never measures the banner. Make it a real stack: measure the banner
   height (or route the banner through the center-toast layout so "Defeated X"/skill toasts pack
   below it cleanly). Center toasts repack from top in `EventLogUI.relayoutCenterToasts` (`:302`);
   banner participates in neither stack today.
3. **Stagger bar size** — `BossHealthUI.POISE_BAR_H` was bumped 12→20 as a whole-bar fix; the real
   ask was a bigger **number**, not bar. Find a middle ground (~14-16) and/or add a numeric poise
   label. Also **raise the enemy HP bar** further above the sprite: `Enemy.BAR_OFFSET_Y = 16`
   (`Enemy.ts:210`) is the only lever. (`BossHealthUI.ts:22-27`.)
4. **Armor "base (actual)" display** — `Tooltip.statValue()` armor branch (`Tooltip.ts:109-113`)
   renders `` `${base} (${adjusted})` `` so a 5→7 upgrade reads "5 (7)" and looks like no effect.
   Show the **upgraded value primary** (e.g. `7` bold, or `7 (base 5)`), or drop the base entirely
   for equipped/upgraded pieces. Same pattern is used for weapon Damage at `:102-107` — apply
   consistently.

## S2 — Onboarding / Tutorial  ·  Sonnet
Locked: Tips → **static How-to-Play reference** (core controls + how-to-play, NO spoilers/win-con),
keep specific one-off popups.
- **Rework `TipsUI.ts`** (`PANEL_W 560 × PANEL_H 460`, body is one un-scrollable joined Text at
  `:79-85` that overflows). Replace the dynamic discovered-hints dump with a curated static block:
  movement/sprint/**dash (Spacebar)**, mouse-only interact/attack, **right-click to upgrade**,
  **eat multiple foods at once**, hotbar rows, menu keys, the goal *in generic terms only*.
- **Add tutorial hints** (`Hints.ts` + triggers in MainScene) for the three confusions:
  **Spacebar dodge**, **right-click to upgrade**, **you can eat multiple foods concurrently**
  (fire on first food eaten / first buff). Keep the "once per run, pref persists" model.
- Keybind discoverability: ensure `KeybindsUI.ts` covers dash + right-click-upgrade lines.

## S3 — Inventory visuals + upgrade-ready indicators  ·  Opus (new indicator system)
1. **Bigger icons/boxes** — icons render at **native texture size** (`setDisplaySize` never
   called): backpack `InventoryMenu.ts:926-930`, equipment `:692-696`, relics `:585`, hotbar
   `HotbarUI.ts:176-180`. Either add `.setDisplaySize(...)` to fill the box, or grow `SLOT` (46) /
   cut `BACKPACK_COLS` (6→~5) — the user prefers **fewer columns / more rows** if spacing gets loose.
2. **"Upgrade ready" indicator** — a small **fading arrow** on an inventory/hotbar item when the
   player **can afford** an upgrade for it (not just when one is discovered). Reuse
   `MainScene.canAffordUpgrade(upg)` (`:7461`) + `upgradeBlockReason` (`:7489`) gating, and
   `armorUpgradesForItem`/`weaponUpgradesForItem`/`upgradesForItem` to find applicable upgrades.
   Recompute in `refreshDiscovery` (`:6763-6765`). Same treatment for **benches/placeables**
   (station upgrades) — a glyph on the placed object / its hotbar item when affordable.
3. **Discovery notifications** — KEEP the workbench/station-upgrade discovery toast
   (`refreshDiscovery` `:6743-6748`, `"recipe"` kind). SUPPRESS **equipment (armor) upgrade**
   discovery toasts — those clutter; the affordable-arrow is the signal instead.

## S4 — Relic economy rework  ·  Opus (roll-model + big content)
All in `src/systems/Relics.ts` + main-boss loot tables. **Keep `RECIPES.md` + dashboard Relics tab
in sync.**
- **Full 8×4 matrix** — add ~14 relics so every family (damage/move/defense/stamina/lifesteal/
  vitality/crit/xp) has Common/Uncommon/Rare/Mythic. Current gaps: move→M, defense→R, **stamina→
  U+R+M**, lifesteal→M, vitality→M, crit→R+M, **xp→C+R+M**. Follow the existing per-rarity
  magnitude curve (`RELIC_DEFS`, `:229-258`); decide whether to keep the duplicate damage Mythic.
- **Main bosses → guaranteed Mythic of their tier.** `boss_refined_trophy` is **shared** by Gremlin
  King + Duneshaper (`:306-313`), so DON'T edit in place. Add a new key
  `boss_refined_trophy_t2 { rarity:"mythic"/tier2, outcomeOdds:[{mythic,1.0}] }` for Duneshaper
  (`Duneshaper.ts:184`), and set the Gremlin King's drop to a guaranteed-Mythic **T1** key
  (`GremlinKing.ts:155-158`).
- **Never re-roll an owned Rare/Mythic id** — filter the pool pick (`:634-636`) by an owned-id set
  (`new Set(Object.values(this.instances).map(i=>i.id))`) when `resultRarity` is rare/mythic.
  **Guard the empty-pool case** (Rare pool small; with 8 families it's safer now). Also covers
  "a lucky Rare-from-Uncommon is always one you don't own."
- **Soften Common crumble + lift refined cap** — bump Common outcome band 10%→~20%
  (`TROPHY_OUTCOME_ODDS.common`, `:120-124`; success 13.5%→~23.5%), consider pity 12→8
  (`:159`). **Remove `maxRarity:"rare"`** from `refined_trophy_uncommon` + `refined_trophy_uncommon_t2`
  (`:319,324`) so mini-boss refined trophies can reach Mythic. (Numbers are proposals — confirm
  with the user.)
- **Stamina family answer for the record:** 50-rolls-no-stamina was expected variance (only 1
  stamina relic existed, Common-only, ~1.4%/roll). The matrix fill resolves it.

## S5 — Relic forge SFX per rarity  ·  Sonnet  ·  **fully parallel (no MainScene)**
`Sfx.ts` + `RelicRevealFx.ts` only. Add per-rarity forge/reveal cues: Common modest, Uncommon a
bit more, **Rare = a big deal**, **Mythic = MASSIVE** (layered/longer synth envelope). Hook at the
reveal **landing** (`RelicRevealFx` already resolves result-before-spin; the announce fires at
landing). Web-Audio synth, same generate-in-code ethos as existing cues.

## S6 — Cinderwrought ("ember guys") rebalance  ·  Sonnet
`src/entities/Cinderwrought.ts`. Locked play-pattern goal: stagger one while you 1v1 the other; it's
too tough with two perma-attacking overlapping.
- **Slower attacks:** raise `ATTACK_COOLDOWN_MS` 650→~1000+ (`:69`); optionally lengthen telegraphs
  (`CONE_TELEGRAPH_MS`, `HAMMER_TELEGRAPH_MS`).
- **Easier stagger:** lower `WROUGHT_MAX_POISE` 70→~45 (`:32`) and/or raise `POISE_REGEN_DELAY_MS`.
- **Weak to blunt:** `resistances.blunt` 0.8→~1.3 (`:126`) — currently RESISTS blunt (backwards).
- **One fire + one physical:** both attacks return `dmgType:"fire"` now (`:395,399`). Keep the
  **Cinder Cone = fire**, make **Forge Hammer physical** (drop its `dmgType` so armor applies).
- **Less player damage:** lower `CONE_DAMAGE` 46 and `HAMMER_DAMAGE` 58 (`:52,66`).
- **Overlap:** 5 forges × 2 guards, fully independent (no shared attack-turn gate). If tuning alone
  doesn't fix the "both attacking at once" feel, add a per-forge attack-turn token in
  `MainScene.updateEnemies` so paired guards can't both execute simultaneously (net-new; try tuning
  first). Update dashboard Enemies tab (manual mirror).

## S7 — Weapon identity redesign  ·  Opus (new mechanic)
Locked: **Spear = lowest arc + highest single-target + best crit; Sword/Knife = biggest arc + best
AOE; Blunt = lower-medium arc + movement-slow/cripple debuff.** All arc/damage/crit tables in
`Weapons.ts`; the debuff is net-new (no enemy status system exists — only player-only `Bleed.ts`).
- **Rebalance `Weapons.ts` tables** (`WEAPON_ARC :224-239`, `_DAMAGE :65-87`, `_BASE_CRIT_* :147-176`):
  today spears are the WIDEST arcs and hammers the widest sweepers — largely inverted from target.
  Shrink spear arcs (toward knife-like), grow sword/knife arcs past pike/hammer, bump spear
  single-target damage + crit, shrink hammer arcs.
- **Blunt movement-slow debuff** — add per-enemy debuff state (`slowUntil` + slow factor on
  `Enemy`, driving the existing `speedMult` path) and a tick in the enemy update loop; apply it at
  the single hit choke point `MainScene.resolveWeaponHit` (`:5918-5939`, already receives
  `enemy`+`dmgType`) when the weapon type is blunt. Surface a subtle visual tell (tint/particle).
- Give **each type a clear identity line** in the Tooltip/dashboard.

## S8 — Biome-2 bow + arrows + ember material tweak  ·  Opus (content)  ·  after S7
- **Longbow/shortbow + craftable arrows.** Reuse wholesale: `Projectile` + `spawnProjectile`,
  `tryRangedAttack` (cooldown/stamina/ammo/crit pipeline, `MainScene.ts:5834-5912`), click-hovered
  aiming, the **"ammo" EquipSlot** with auto-refill/merge-by-key, `armorSlot:"ammo"` item flag, and
  `requiresDiscovered` gating (mirror `slingshot_pellets`). New: `WeaponType` entries added to
  **every** table in `Weapons.ts` + a `RANGED_WEAPONS` entry (`ammoItemKey:"arrows"`); `arrows`
  item def; arrow projectile + item textures in `BootScene`; bow + arrows recipes in `Recipes.ts`.
  Arrows craftable from **base metal (Sunsteel) or new metal (Embersteel)** + basic-tier wood, gated
  like their tier counterparts. Note: single ammo slot — bow & slingshot share it (swap ammo).
- **Ember gear materials** — add "+1 under-used core + new wood" to the T2 reforge recipes
  (`Recipes.ts:390-508`). Best under-used cores: **`hex_essence`**, **`gloam_shard`**. New wood =
  **`ironbark`** (already in warhammer/pike; missing from sword/brand + all emberhide armor — those
  are the most off-theme). Keep `RECIPES.md` + dashboard in sync.

---

## Direct answers logged
- **"50 rolls no stamina relic — coincidence?"** Yes, expected variance (1 stamina relic, Common-only,
  ~1.4%/roll). Fixed by S4's matrix fill.
- **"Ember guys" = the Cinderwrought** (Sunken Forge mini-boss; 5 forges × 2 guards). S6.
