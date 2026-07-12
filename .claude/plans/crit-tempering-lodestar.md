# M-SS — Stats & Skills depth pass (crit + distinct-axis effects + relic synergy)

**Status: LOCKED, ready to build.** Design decided with the user 2026-07-11 across a
multi-round brainstorm (see the superseded `stats-skills-relics-rework-brainstorm.md`).
This is the implementation plan. **Build on Opus** — crit is a new combat mechanic and the
relic changes are a data-model change. Lands before **M-TE** (M-TE's proc gear will later
read the weapon-skill threshold hook this milestone leaves untouched-but-reserved).

## Why

Stats + Skills feel negligible next to Relics: half the character sheet has zero
mechanical effect, and the half that works (+0.5% dmg/lvl, +1 HP/pt) is a rounding error
beside a stacked relic. The fix is the locked **three-layer split**: Relics = the raw-%
stat layer (kept), crafted gear = the uniqueness/proc layer (M-TE, later), and
**Stats/Skills = the reliable, player-steered layer on axes relics don't touch** — plus
making relics *synergize with* stats (multiply the base stats build) instead of dwarfing
them.

## Grounding numbers (from code, so the tuning is real)

- Base HP 100, base Stamina 100 (stamina regens; HP has no passive regen — stays cut).
- Stat points: reaching player level N grants `2+3+…+N` cumulative. **Boss-time ≈ player
  level 7–10 → ~27–54 points** across 6 stats. Per-point values below are tuned so a
  focused ~15–25-pt buy is strong and a single point is still felt.
- Weapon skill ≈ 15+ at boss → +7.5% dmg. Modest passive, unchanged this milestone.
- Best melee: primal_spear 8 dmg / 650ms. Reachable relics = **Common pool only** this
  milestone (gremlin/boar/snake trophies), and dupes stack — the source of the complaint.

---

## Final design — effect tables (first-pass numbers, all tunable)

### Stats (`Progression.ts`)

Crit is now split by **axis, not weapon class**: Strength = crit *multiplier*, Agility =
crit *chance*, both applying to **all** weapons (melee + ranged). They multiply together
(`DPS gain = chance × (mult−1)`), so a crit build wants both — and per-weapon base crit
(below) keeps each worth a point on its own.

| Stat | Effect per point | Notes |
|---|---|---|
| **Endurance** | +3 max Stamina **and** +2% stamina regen rate | regen is an axis relics don't touch |
| **Vitality** | +4 max HP **and** +1.5% healing received | healing-received amplifies food/Comfort/kill-heal; NOT passive regen |
| **Strength** | +0.04× crit multiplier (soft cap total mult **3.0×**) | replaces the retired stamina-cost knob |
| **Agility** | +0.5% crit chance (soft cap total chance **60%**) | replaces the retired stamina-cost knob |
| **Intelligence** | +XP gain % (proposal +1.5%/pt) | stacks additively with the Scholar's-Idol relic xpPct |
| **Wisdom** (renamed from Willpower) | +buff/food duration % (proposal +2%/pt) | auto-covers future buff procs / equipment |

- **Retire** `weaponStaminaCostMultiplier` (Strength/Agility no longer reduce stamina
  cost). Endurance's +max stamina is the stamina answer now. Grep every call site.
- **Rename `willpower` → `wisdom`** across `StatType`, `STAT_TYPES`, `STAT_NAMES`,
  `STAT_DESCRIPTIONS`, CharacterMenu, the dashboard, and any consumer. Keep `intelligence`.
- New getters on `PlayerProgression`: `critChanceBonus()` (Agility), `critMultBonus()`
  (Strength), `healingReceivedMult()` (Vitality), `staminaRegenMult()` (Endurance),
  `xpMult()` (Intelligence), `buffDurationMult()` (Wisdom).

### Skills (`Skills.ts`)

| Skill | Effect | Status |
|---|---|---|
| slash / blunt / pierce / ranged / magic | **unchanged** (+0.5%/lvl damage) | reserved as the M-TE proc threshold hook (not wired here) |
| **light_armor** | +dash i-frame window: +5ms/level over the 150ms base, **cap +100ms** (→ 250ms max) | live now (light gear exists) — Monster Hunter "Evade Window" model |
| **running** | keep sprint speed + **reduce sprint stamina drain** −1%/level, cap −40% | second real effect for a one-note skill |
| **chopping** | +bonus-drop chance on trees: chance for +1, +1%/level (cap ~60%) | the satisfying +1, per the user |
| **mining** | +bonus-drop chance on rocks/ore incl. **Gloam Shards**: +1%/level (cap ~60%) | " |
| **heavy_armor** | **DEFERRED to biome 2** (magic/elemental resist + physical stability) | no heavy gear + no magic damage exists yet — honestly dormant like `magic` |
| **blocking** | **DEFERRED** (no effect) | needs a real block/parry mechanic first — don't fake it |

- **Per-piece armor XP (change from today's per-type flat award).** Today the kill loop
  awards +30 to each *distinct* worn armor type once. Change to **per worn piece**: iterate
  equipped slots, award +30 for each piece's `armorType`. So 2 light + 1 heavy → 2 light
  ticks + 1 heavy tick; full light (3) → 3 light ticks. Enables the mix-and-match reward
  curve the user wants, and lets heavy_armor accrue naturally once biome-2 heavy gear ships.
- New getters: `dashIframeBonusMs()`, `sprintStaminaDrainMult()`, `choppingBonusChance()`,
  `miningBonusChance()`. Update `skillImpactDescription` for each; heavy_armor/blocking
  keep a "not active yet" line.

### Weapons (`Weapons.ts`) — per-weapon base crit (the base-crit home)

Add `WEAPON_BASE_CRIT_CHANCE` and `WEAPON_BASE_CRIT_MULT` maps + getters. This is where
the "base crit" lives (grounded per-weapon, not an arbitrary global player constant) AND
the attack-speed lever: slow/heavy weapons get higher base crit (burst where overkill is
least wasted), fast weapons lower.

| Weapon | base crit chance | base crit mult |
|---|---|---|
| bone_knife (fast, 350ms) | 4% | 1.5× |
| wood_club | 5% | 1.5× |
| stone_club | 5% | 1.5× |
| slingshot / javelin (ranged) | 5% | 1.5× |
| primal_spear (slow, 650ms) | 8% | 1.6× |

### The damage pipeline (locked order — all multiplicative)

```
final = weaponBase
      × (1 + weaponSkill%)                 // +0.5%/lvl
      × (1 + Σ relic damagePct/100)        // relics
      × staggerMult                        // 1.5× if enemy staggered (existing)
      × (critRoll ? critMult : 1)          // NEW

critChance = weaponBaseCritChance + Agility.critChanceBonus + relic.critChanceBonus   (cap 0.60)
critMult   = weaponBaseCritMult   + Strength.critMultBonus  + relic.critDamageBonus   (cap 3.0)
```
Implemented in `MainScene.resolveWeaponHit` (shared by melee + ranged, so both crit).
Roll once at hit resolution; on a crit, tint the floating damage number (yellow/orange)
and optionally play a distinct Sfx cue. Keep damage fractional to `takeHit` (existing
rule); round only for the popup.

### Relics (`Relics.ts`) — make relics synergize, not compete

1. **Flat HP/stamina relic channels → percent.** Add `maxHpPct` / `maxStaminaPct` to
   `RelicEffect`; convert the flat ones so they *multiply the stat-built base*:
   - Stout Charm `maxHp:15` → `maxHpPct:15`
   - Vigor Idol `maxHp:25,maxStamina:20` → `maxHpPct:20, maxStaminaPct:18`
   - Titan Totem `maxHp:50,maxStamina:35` → `maxHpPct:40, maxStaminaPct:30`
   - (Undying Heart has no maxHp — untouched.)
   New getters `maxHpPctMult()` / `maxStaminaPctMult()`. **MainScene.syncStatBonuses**
   recomputes so stats and relics compound:
   ```
   baseMaxHp   = 100 + Vitality×4;   finalMaxHp   = baseMaxHp   × maxHpPctMult()
   baseMaxStam = 100 + Endurance×3;  finalMaxStam = baseMaxStam × maxStaminaPctMult()
   Health.setBonusMax(finalMaxHp − 100); Stamina.setBonusMax(finalMaxStam − 100)
   ```
   (Damage relics are already `%` and already compound with weapon skill + crit — no
   change; kill-heal / xp / move / stamina-cost / damage-taken channels unchanged.)
2. **Add crit channels + ~2 crit relics.** New `critChancePct` / `critDamagePct`
   (`critDamagePct` interpreted as an *additive* to crit mult, e.g. `30` = +0.30×). Seed:
   - Common **"Keen Charm"** — `critChancePct: 5`
   - Uncommon **"Savage Idol"** — `critDamagePct: 30`
   New getters `critChanceBonus()` (÷100) / `critDamageBonus()` (÷100). Keeps the "relics
   enhance whatever axis you invest in" promise consistent, and pre-seeds the on-crit-proc
   space M-TE will use.
3. Update `scaledEffectText` for the new channels; the dashboard imports live so its
   Relics tab reflects automatically (but confirm the Balance Overview / any hardcoded
   copies).

## Wiring hook points (`MainScene.ts` + systems)

- `resolveWeaponHit` — crit roll + apply (see pipeline); crit-tinted damage number.
- `syncStatBonuses` — new compounded max-HP/stamina formula (stat base × relic %).
- Kill loop (`~MainScene.ts:3542`) — per-piece armor XP.
- Dash i-frame set — add `skills.dashIframeBonusMs()` to `DASH_IFRAME_MS`.
- Sprint stamina drain — multiply by `skills.sprintStaminaDrainMult()`.
- `collectNode` — roll `chopping/miningBonusChance()` for +1 drop (route by node action
  kind: chop→chopping, mine→mining, incl. shielded-vein ore once cracked).
- Heal calls — multiply healed amount by `progression.healingReceivedMult()` (Health.heal
  gains a multiplier, or callers scale). Applies to food buffs, Comfort, relic kill-heal.
- Stamina regen — multiply `REGEN_PER_SEC` by `progression.staminaRegenMult()`.
- Buff apply — scale `durationMs` by `progression.buffDurationMult()` in `BuffManager.apply`
  (or at the call site) so Wisdom lengthens food/Comfort buffs.
- XP award (`awardSkillXp`) — already multiplies relic `xpMult`; also multiply
  `progression.xpMult()` (Intelligence). Confirm no double-count with player-XP feed.

## UI / docs

- **CharacterMenu** — new stat descriptions (crit chance/mult, healing, regen, XP%, buff
  duration), Willpower→Wisdom label, live `skillImpactDescription` for the newly-wired
  skills.
- **Tooltip / inventory Combat column** — add Crit Chance + Crit Damage lines (from
  weapon base + stats + relics) and the weapon's base crit; the existing
  `combatStats()`/`Tooltip` math is where to hook it.
- **Damage numbers** — crit color; **Sfx** — optional crit cue.
- **Dashboard** — add crit to the Balance Overview (effective-DPS w/ crit); relic tab is
  live-imported (verify no stale copy). `RECIPES.md` — no recipe/cost change, so likely
  untouched (double-check the relic table there isn't hand-mirrored).

## Explicitly deferred / out of scope

- **heavy_armor effect + heavy gear** → **biome 2** (needs heavy items + a magic-damage
  system for the resist half). Per-piece XP plumbing ships now so it "just works" later.
- **blocking** → until a real block/parry mechanic exists.
- **magic** weapon skill / Intelligence-Wisdom magic roles → until a magic system exists.
- **M-TE proc/uniqueness gear** → its own milestone; this one only leaves the weapon-skill
  threshold hook untouched for it to read.
- **Weapon base damage** → unchanged this pass; crit is a multiplier on top and a natural,
  player-driven way to close the "boss slightly overtuned" gap. Re-check the boss in
  playtest; per-weapon base crit is the lever if a weapon feels off.

## Verification plan

`tsc --noEmit`, then live `preview_eval`: force `rng` to confirm crit roll/chance/mult and
the pipeline order; verify `syncStatBonuses` compounds stat base × relic % (e.g. 20
Vitality → base 180, +15% Stout → 207 max HP); per-piece armor XP (2 light + 1 heavy →
2:1 split); dash i-frame window extends with light_armor; chopping/mining +1 drops fire at
the rolled rate (incl. Gloam ore); Wisdom lengthens a food buff; Endurance speeds stamina
regen; retired stamina-cost knob is gone with no dangling references. Console error-free.

Relates to [[survivor-rpg-progression-system]], [[survivor-rpg-relics]],
[[survivor-rpg-stats-skills-relics-direction]].
