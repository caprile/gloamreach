# Ranged starter weapons (Slingshot + Javelin) + minimal SFX layer

> **STATUS: SHIPPED + live-verified 2026-07-11 (roadmap 5y).** All parts done. Ranged
> fire/impact/ammo-decrement, 0-ammo + out-of-range silent no-ops, javelin self-consume +
> auto-unequip, melee-unaffected, auto-sort, shift-split, and all 6 SFX cues confirmed via
> `preview_eval` (no console errors). Two quick fixes (auto-sort, shift-split) shipped
> alongside per the "Part 0" note. Full verification writeup in `STATUS.md` (### 5y).
> The one implementation note that diverged during the build: the ammo slot became a real
> `Equipment.ts` `"ammo"` slot with `EquippedItem.count`, reusing the armor-equip
> machinery (Part A below reflects this; it superseded an initial draft using a bespoke
> 1-slot `ItemContainer`, per the user's mid-plan correction).

## Context

Playtest-polish backlog item (CLAUDE.md's long-standing "Ranged starting weapon" note,
plus this session's explicit ask): the game has no ranged player weapon yet. Two are
wanted — **Slingshot** (a launcher that consumes a new stackable ammo item, via a new
"ranged ammo" equipment slot) and **Javelin** (disposable, thrown, higher damage/stamina,
lower velocity, no separate ammo — the item itself is the ammo). Locked via
`AskUserQuestion`: ranged attacks reuse the existing **click-a-hovered-enemy-in-reach**
model (just a bigger radius), not free-aim; Javelins are **self-contained hotbar weapons**
(not routed through the ammo slot). Also queued in the same backlog: a minimal
code-generated SFX layer (hit/pickup/craft/level-up/nightfall/death), since no audio
exists anywhere in the project yet. This is a **new mechanic** — per the standing
model-switch convention, recommend the user switch to **Opus 4.8** before implementation.

Research already done this session confirmed: `src/entities/Projectile.ts` is a generic,
already-reusable Arcade sprite explicitly built in anticipation of the Slingshot
(`ProjectileConfig.sourceIsPlayer` already exists, just unused); `MainScene` already has
an `enemyGroup` physics group and `enemyProjectiles` group + overlap-vs-player wired
(`create()` ~line 648-672); `tryAttackEnemy` (~line 3280) is 100% melee/reach-based with
no ranged branch; `Equipment.ts`'s armor slots are single-item `{key,tier}` with no count
field (wrong shape for ammo — a stack); `ItemContainer`/`moveSlot` already do everything a
"stack of ammo in one slot" needs for free.

## Part A — Ammo slot (backs the Slingshot only) — **build this first, it's the riskiest**

Per locked side-chat direction: this is a genuine new **`Equipment.ts` slot** (paper-doll
grid), not a bespoke container — `EquippedItem` gains a `count` field so the existing
armor-slot machinery (`equipArmorFromContainer`/`unequipArmorSlot`/`armorSlotAt`/
`resolveArmorDrag`/right-click context menu/quick-move) can be reused almost entirely,
branching only where ammo's *merge* semantics differ from armor's *swap* semantics.

- `Equipment.ts`: `EquipSlot` gains `"ammo"`; `EquippedItem` gains `count?: number`
  (absent/undefined for armor, always set for ammo). Add `{ id: "ammo", label: "Ammo" }`
  to `EQUIP_SLOTS`.
- `InventoryMenu.ts`: `ARMOR_ROWS_MAX` becomes `Math.ceil(EQUIP_SLOTS.length / ARMOR_COLS)`
  (currently a hardcoded literal derived from "9 slots / 3 cols" — needs to be computed
  now that the count is 10) so the grid grows a row automatically; no other layout
  constants change. `renderArmor` gets one addition: a count badge (reuse the same
  `stack.count > 1` bottom-right text style `renderBackpack` already uses) when
  `slot.count` is set. `ArmorSlotView` gains `count?: number`, sourced from
  `MainScene.armorSlots()` reading `eq.count`.
- `Items.ts`: new `ItemDef.ammo?: boolean` flag (distinct from `armorSlot`, since ammo
  isn't armor) — but to reuse `equipArmorFromContainer`'s existing dispatch (which reads
  `def.armorSlot`), the cleanest is to actually set `slingshot_pellets`'s `armorSlot:
  "ammo"` directly (same field, same dispatch, `EquipSlot` already includes `"ammo"`) and
  treat `ammo: true` as just a display/gating flag if one's still needed elsewhere. `
  maxStack: 50` acts as the equipped ammo cap too (reused, not a separate constant).
- `MainScene.equipArmorFromContainer`: branch on `slot === "ammo"` for merge-not-swap
  semantics — if the equipped ammo's `key` matches the incoming stack, top up its `count`
  by `min(room, stack.count)` (room = `maxStack - existing.count`) and
  `container.removeCount(key, taken)`; if a *different* key is already equipped, return it
  to the backpack first (existing `returnArmorToBackpack`, updated to use `item.count ?? 1`
  instead of a hardcoded `1`) then load the new key. A full ammo slot silently no-ops
  (snaps back), consistent with every other silent-guard in this codebase.
- `MainScene.unequipArmorSlot`: also updated to move `eq.count ?? 1` instead of a
  hardcoded `1` when returning ammo to the backpack/floor — the one other place assuming
  qty 1.
- `MainScene.quickMoveItem`'s existing `itemDef(stack.key)?.armorSlot` branch already
  covers ammo for free once `slingshot_pellets.armorSlot === "ammo"` (no new branch
  needed — this was the main win of reusing the armor field instead of a new one).
- Ranged-fire ammo consumption (Part C) decrements `Equipment.get("ammo").count` by 1
  directly (clearing the slot back to `null` at 0), then calls `afterItemMove()` to
  refresh the paper-doll UI — mirrors how Javelin depletion clears `equippedWeapon` via
  the same call.
- `InventoryMenu`'s Combat-stats column gets one more line: `Ammo: N <name>` (or `-` when
  empty/no ranged weapon equipped).

## Part B — Weapon data (`src/systems/Weapons.ts`)

- Widen `WeaponType` union: add `"slingshot" | "javelin"`.
- Add rows to `WEAPON_DAMAGE` / `WEAPON_COOLDOWN_MS` / `WEAPON_STAMINA_COST` /
  `WEAPON_DAMAGE_TYPES` (both use `"ranged"` as primary damage type — this is what finally
  gives the long-dormant `ranged` weapon skill a real XP source and damage multiplier; no
  `Skills.ts` changes needed, `weaponSkillDamageMultiplier`/`awardSkillXp` are already
  generic over `DamageType`). **Locked balance direction (side-chat): ranged starts
  deliberately weak — an opener/softener, not a solo tool.** For calibration, melee today
  ranges `wood_club` dmg 3/cd 450ms/stam 10 up to `primal_spear` dmg 8/cd 650ms/stam 16.
  First-pass/tunable numbers, intentionally below even the weakest melee weapon:
  - Slingshot: damage **2**, cooldown 650ms, stamina 6 (cheap per-shot, but chip damage —
    build-dedication into the Ranged skill is what makes this scale into real damage over
    time, per the locked direction).
  - Javelin: damage **5** (higher than a pellet, roughly on par with a starter melee
    weapon — but burns a craftable per throw and costs more), cooldown 900ms, stamina 16.
- New `RANGED_WEAPONS: Partial<Record<WeaponType, RangedWeaponConfig>>` map (only
  slingshot/javelin present; every melee weapon absent = falsy lookup, cheap "is this
  weapon ranged" check via `isRangedWeapon(w)`):
  ```ts
  interface RangedWeaponConfig {
    projectileSpeed: number; // px/s — deliberately slow (anti-kite governor alongside
                              // stamina cost + bounded range; NO enemy-AI changes this
                              // batch — revisit only if playtest shows trivializing kiting)
    maxRangePx: number;      // replaces melee REACH for both the attack gate + hover prompt
    ammoItemKey: string | null; // "slingshot_pellets" for Slingshot; null = self-consumes
                                 // from the equipped hotbar stack (Javelin)
    projectileTexture: string;
  }
  ```
  Slingshot: speed 420 (slow pellet arc), range 260 (bounded), ammo
  `"slingshot_pellets"`. Javelin: speed 300 (slower still, per spec — heavier/thrown, not
  launched), range 220, ammo `null`.

## Part C — Firing logic (`MainScene.ts`)

1. **Refactor `tryAttackEnemy` into a dispatcher** so both call sites (`tryInteract`'s
   `hoveredEnemy` branch) stay a single entry point:
   ```ts
   private tryAttackEnemy(enemy: Enemy): void {
     if (!this.equippedWeapon) return;
     if (isRangedWeapon(this.equippedWeapon)) this.tryRangedAttack(enemy);
     else this.tryMeleeAttack(enemy);
   }
   ```
   The existing body of `tryAttackEnemy` becomes `tryMeleeAttack` verbatim, except the
   tail (from `const depleted = enemy.takeHit(dmg)` through the kill/loot/XP block) is
   extracted into a new shared `resolveWeaponHit(enemy, dmg, dmgType)` — reused by both
   melee (applies instantly) and the ranged projectile-impact callback (applies on hit).
   This avoids duplicating the kill/loot/armor-XP/stagger-punish logic.
2. **`attackRangeFor(enemy)`** replaces the raw `enemyReach(enemy)` call in both
   `promptForEnemy` and the melee/ranged reach checks: returns
   `RANGED_WEAPONS[this.equippedWeapon]?.maxRangePx ?? this.enemyReach(enemy)` when a
   weapon's equipped, so the existing hover prompt (`[LMB] Attack X`) and reach-ring
   (`updateAttackRangeRing`) both automatically reflect the bigger ranged radius with no
   separate gating path — same "own numbers, one gate" shape the melee reach-scaling fix
   already established.
3. **`tryRangedAttack(enemy)`** — mirrors `tryMeleeAttack`'s cooldown/stamina order
   (cooldown check → stamina afford check silently no-ops, same as melee's exhausted
   guard) but computes damage once at fire time (including stagger multipliers, matching
   the "captured once per state-entry" precedent from `GremlinKing`'s enrage math — no
   re-check at impact) and hands it to a spawned `Projectile` instead of applying it
   immediately:
   - Range check via `attackRangeFor(enemy)` (not melee `enemyReach`).
   - Ammo gate: if `cfg.ammoItemKey`, require `ammoSlot.count(key) >= 1`; consume 1 via
     `ammoSlot.removeCount`. If `cfg.ammoItemKey === null` (Javelin), consume 1 from the
     **currently selected hotbar slot** directly (`hotbar.container.removeCount`) — no
     ammo-slot involvement. Either way, no ammo/count → silent no-op (same "silent guard"
     convention as the stamina check, never reveals anything via the prompt).
   - After consuming, call `this.afterItemMove()` once (refreshes hotbar/ammo-slot UI
     counts + recomputes `equippedWeapon` — critical for Javelin: `afterItemMove` already
     calls `recomputeEquipped()`, which is what clears `equippedWeapon` back to null the
     instant a depleted javelin stack's slot goes empty, since nothing else does that on a
     bare `removeCount` call outside `moveSlot`).
   - Spawn a player-sourced projectile aimed at the enemy's current position (angle via
     `Phaser.Math.Angle.Between`), damage/stamina/cooldown bookkeeping otherwise identical
     to melee.
4. **`spawnProjectile` gains a source-based group choice**: a new `private
   playerProjectiles!: Phaser.Physics.Arcade.Group` (created in `create()` alongside the
   existing `enemyProjectiles`, with `physics.add.overlap(this.playerProjectiles,
   this.enemyGroup, ...)` mirroring the existing enemy-projectile-vs-player overlap at
   line ~662, including the same "don't trust Phaser's overlap arg order, check
   `instanceof Projectile`" pattern from [[feedback_phaser_group_overlap_arg_order]]).
   `spawnProjectile(cfg)` routes to `playerProjectiles` when `cfg.sourceIsPlayer`, else the
   existing `enemyProjectiles` — one shared method, no duplicate spawn path. The overlap
   callback resolves which `Enemy` was hit (the group member needs a back-reference to its
   owning `Enemy` — check how `enemyGroup` members already expose this, likely each
   `Enemy` sprite IS the group member so the overlap's non-projectile argument already
   *is* the `Enemy` instance) and calls `resolveWeaponHit(enemy, projectile.damage,
   "ranged")`, then destroys the projectile.

## Part D — Items & recipes

- `Items.ts`: `slingshot` (`weapon: "slingshot"`, `hotbarable: true`, `maxStack: 1`),
  `slingshot_pellets` (`ammo: true`, `maxStack: 50`), `javelin` (`weapon: "javelin"`,
  `hotbarable: true`, `maxStack: 20` — stackable weapons are already supported;
  `maxStackOf` only forces 1 for *tiered* items, and Javelin has no upgrade tier).
- `Recipes.ts`: follow the already-locked spec in CLAUDE.md's First-biome content notes
  exactly for the Slingshot (no new design needed there) — **Slingshot**: 2 wood + 2
  leather scraps, tier 1 (Workbench-gated). **Slingshot Pellets**: 5 stone → 25 pellets,
  tier 0. **Javelin** (new, not in the old notes — starter-tier per the user's "ranged
  starter weapons" framing): 3 wood + 1 stone → 2 Javelins per craft, tier 0 (no
  Workbench, consistent with "starter").
- `BootScene.ts`: 5 new procedurally-generated textures (slingshot icon, slingshot_pellets
  icon, javelin icon + its distinct in-flight `javelin_projectile` texture, and a small
  `pellet_projectile` texture) — same `Graphics.generateTexture` idiom as every existing
  item icon.
- `RECIPES.md`: add both new recipes to the weapons table (per the standing "keep
  RECIPES.md in sync" rule).

## Part E — Minimal SFX layer

New `src/systems/Sfx.ts`, framework-light (raw Web Audio `AudioContext` +
`OscillatorNode`/`GainNode` envelopes synthesized at call time — no asset files, same
"everything procedurally generated, swap for real assets later" ethos `BootScene`
established for textures). One `SfxPlayer` class with 6 short procedural cues: `hit()`,
`pickup()`, `craft()`, `levelUp()`, `nightfall()`, `death()`. `MainScene` owns one
instance, called from the existing hook points that already exist for each event
(`resolveWeaponHit`/`applyDamageToPlayer` → hit, `addToBackpack`/loose-pickup → pickup,
craft/process/cook completion → craft, the level-up flash's call site → levelUp, the
day→night edge in `updateDayNight` → nightfall, `onPlayerDeath` → death). A persisted
on/off toggle (`localStorage`, same pattern as Hints' `survivor-rpg:hints-enabled:v1`)
lives in `PauseMenuUI` next to the existing Hints toggle.

## Build order

Per locked side-chat direction: **Part A (Slingshot + ammo slot) first** — it's the
riskiest piece (the `EquippedItem.count` change touches shared armor-equip code paths).
**Javelin second** (simpler — reuses melee's existing hotbar-weapon-equip path, just adds
a self-consuming stack + the same `tryRangedAttack` firing logic Part A builds). **SFX
(Part E) is a separate batch**, done after both weapons land, not interleaved.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit` after each part.
2. Live in preview via `preview_eval` (per CLAUDE.md's verification workflow): spawn/equip
   a Slingshot + pellets, confirm firing at a distant (out-of-melee-reach) enemy damages it,
   ammo count decrements, and firing silently no-ops at 0 ammo; equip a Javelin stack,
   confirm throwing decrements the stack and auto-unequips at 0 (weapon icon/prompt clear);
   confirm melee weapons are completely unaffected (same reach/prompt/damage as before);
   confirm the reach-ring and hover prompt both reflect the larger ranged radius.
3. Confirm SFX cues fire at each of the 6 hook points and the Pause-menu toggle silences
   them (check `preview_console_logs` for AudioContext errors — some browsers require a
   user gesture before audio starts, confirm no crash/warning spam if so).
4. Update `RECIPES.md` and `STATUS.md` per the standing conventions once shipped.
