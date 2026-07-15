# Relic redesign — single-family purity + Rare/Mythic unique effects

## Context

the user doesn't like that relics mix effects across families (a "damage" relic also
granting move speed / stamina, etc.). The directive: **every relic affects only its own
family's axis.** Separately, he's reversed his earlier "only recipes give unique effects"
stance — he now wants **Rare + Mythic relics to carry bespoke unique mechanics** (procs/
triggers), and likes the randomness of the relic roll.

Locked via `AskUserQuestion` (2026-07-15):
- **Rare/Mythic get unique within-family effects** (StS/Hades-style bespoke mechanics, not
  just bigger numbers).
- **Curated, fixed relics** — randomness comes from *which* relic you roll, NOT from
  Diablo-style rolled stat ranges. Keep the S4 **no-repeat on Rare/Mythic** rule.
- **Conservative %s, spicy uniques** — the user's balance worry: weapons (tiers) × skill
  levels × relic % × crit all MULTIPLY, so every growing % source pushes damage toward
  exponential. So relics must NOT be a growing damage multiplier.

### Anti-scaling structure (the core of this pass)

To stop relics from compounding the curve:
- **The raw stat % PLATEAUS after Uncommon.** Common = small, Uncommon = a modest bump,
  **Rare & Mythic reuse Uncommon's stat number** and add the unique proc (Mythic = a spicier
  proc). A Mythic damage relic is still only ~+7% raw damage (same as Uncommon) *plus* a
  conditional proc — never a big flat multiplier stacking on weapon/skill/crit.
- **Dominance is ordered by RARITY, not by the number.** `compareInstances` (`Relics.ts`) is
  only ever called same-family (roll() looks up `instances[family]`), and each family has
  exactly one relic per rarity, so higher rarity = strict curated upgrade. Ordering by
  (rarity index, then power tier) means the % doesn't need to grow to keep auto-replace/
  decline clean — that's what frees the numbers to stay flat. Same rarity + higher tier
  (badlands t2 vs forest t1 of the same relic) → higher tier wins; the "ambiguous/choice"
  verdict now effectively never fires (kept for safety).
- Procs are **conditional** (every Nth hit, on-kill, on-crit, on-cooldown) — periodic spikes,
  not permanent multipliers — so they're far easier to balance than a flat damage %.

### Additive-within-category convention (ALL buffs — the user)

The rule: **within any one category, independent always-on % sources ADD into a single
bucket, applied once to the base — no compounding.** This prevents exponential HP / damage /
damage-reduction / move-speed as more % sources are added later. It's ~a-few-% change today
(few sources exist), so it's mostly future-proofing, EXCEPT the max-HP/stamina change which
intentionally supersedes an M-SS compounding design (see below). Situational/conditional
bursts (crit, stagger, and the new procs like Onslaught) stay their own multipliers at their
trigger — that's the correct place for multiplicative.

Per-category audit + change:
- **Damage** (`tryMeleeAttack:5770`, same in `tryRangedAttack`, `tryAttackDen:4159`): today
  `baseDmg × (1+skill%) × (1+relic%)`. → `baseDmg × damageBonusMult(dmgType)` where the helper
  returns `1 + (skillMult−1) + (relicMult−1)`. Crit/stagger still multiply after. Update the
  display math too (`combatStats`/Tooltip, ~`:7757`).
- **Damage reduction** (`applyDamageToPlayer:6350`): today `amount × damageTakenMult ×
  (1−moltenDr)`. → `amount × (1 − clamp(relicReduction% + moltenDr%, 0, 0.75))` — one additive
  reduction bucket with a hard floor so total % reduction can never reach 100%. Flat armor
  still SUBTRACTS after (a different mechanism, not a % — stays as-is).
- **Move speed** (`Player.update`, `MainScene:1442`): today sprint-mult (running skill) ×
  relic `moveSpeedMult` (× the new Fleetfoot burst). → one additive bucket:
  `WALK × (1 + relicMove% + (sprinting ? runningSprint% : 0) + fleetfootBurst%)`.
- **XP** (`awardSkillXp:6045`): today `base × relics.xpMult() × progression.xpMult()`
  (relic × Intelligence). → `base × (1 + relicXp% + intXp% + prodigyStreak%)`.
- **Max HP / max stamina** (`syncStatBonuses:6785-6790`): today relic `maxHpPct` MULTIPLIES
  the vitality-inflated base (`(100 + vitFlat) × (1+relicHpPct)`) — a deliberate M-SS
  "relics synergize with stats" compounding. → make linear/additive:
  `finalMax = 100 + statFlatBonus + 100 × relicHpPct%` so the stat (flat) and relic (% of the
  100 base) are independent linear adds. **This supersedes the M-SS compounding intent** — a
  minor nerf to HP/stamina relics on high-stat builds, and exactly the anti-exponential
  behavior the user wants. Same for stamina.
- **Already additive / single-source (NO change):** crit chance & crit mult
  (`applyCrit:6056` — `weaponBase + agility + relic`, then capped — already additive);
  stamina cost (`staminaCostMult` — one summed `staminaCostPct` bucket).

Net today: damage/reduction/move/XP barely move (regression check); max HP/stamina drop
slightly on high-stat builds (intended). No category compounds.

This supersedes the S4 relic numbers (shipped hours earlier): the cross-family dual/triple
stats on every Rare/Mythic get replaced. Common/Uncommon stay simple single-stat (they were
already almost pure). The full 8×4 matrix + guaranteed-boss-Mythic + softened-crumble work
from S4 all stay.

Every relic still keeps a *single* family-stat number **plus** (on Rare/Mythic) the unique
effect — but the stat plateaus after Uncommon (see Anti-scaling above), and dominance is
ordered by rarity, not the number. So e.g. a damage Mythic = `+7% damage` (same as Uncommon)
**and** "every 4th hit deals +120%".

## Architecture

All effect data stays in `src/systems/Relics.ts`; MainScene reads it at the existing hook
points the exploration mapped.

1. **`RelicDef.unique?: RelicUnique`** — new optional field. `RelicUnique = { kind:
   UniqueKind; params: Record<string, number> }`. `UniqueKind` is a string-union of the 8
   mechanic ids (`onslaught` / `killrush` / `guardian` / `secondwind` / `leech` / `undying`
   / `critsplash` / `xpstreak`). Only Rare/Mythic set it.
2. **`RelicManager.unique(kind): { params; powerTier } | null`** — returns the owned relic's
   unique params for that kind (at most one, since ≤1 relic/family and kind↔family), plus its
   power tier. MainScene queries specific kinds at each hook. Magnitude params (percent/flat
   values) get `× powerTierMult(powerTier)` at the use site; discrete params (Nth-hit
   interval, cooldown seconds, revive count) stay fixed.
3. **Display** — extend `relicEffectText`/`scaledEffectText` (`Relics.ts`) to append a
   one-line human description of the unique effect (from kind+params), so the relic bar,
   forge grid, and inventory Relics column show it. Add a `uniqueText(def, tier)` helper.
4. **`compareInstances` reworked to order by rarity, then power tier** (was: by numeric
   effect). It's only ever called same-family, and each family has one relic per rarity, so
   higher rarity = "better" (auto-replace), lower = "worse_or_equal" (decline); equal rarity →
   higher tier wins, exact tie → decline. This is what lets the stat numbers plateau without
   breaking auto-replace. The "ambiguous/choice" branch stays in the code for safety but
   effectively never fires now.
5. **No change to** the roll model, the no-reroll filter, refunds, pity, or `RelicEffect`
   numeric channels — the unique effects are a *parallel* read path, not new `sumEffect`
   channels.

## Relic table (conservative %s, plateau after Uncommon, procs carry Rare/Mythic)

Numbers are Power-Tier-1, first-pass/tunable. **The stat number plateaus at Uncommon's value
for Rare & Mythic** — rarity buys the proc, not a bigger %. "Stat" flows the existing numeric
channel; "Unique" is the new proc. Common/Uncommon are already single-stat except the
vitality Uncommon (`Vigor Idol`), whose cross-family `maxStaminaPct` gets stripped.

| Family | Common | Uncommon | Rare = (U stat) + unique | Mythic = (U stat) + bigger unique |
|---|---|---|---|---|
| **Damage** | +4% dmg | +7% dmg | +7% · **Onslaught**: every 5th hit +100% dmg | +7% · **Onslaught**: every 4th hit +120% |
| **Move** | +4% move | +7% move | +7% · **Fleetfoot**: on kill +25% move 2.5s | +7% · **Fleetfoot**: +35% move 3.5s + refunds dash |
| **Defense** | −4% taken | −7% taken | −7% · **Guardian**: negate next hit every 8s | −7% · **Guardian**: every 6s + caps any hit at 30% max HP |
| **Stamina** | −6% cost | −10% cost | −10% · **Second Wind**: on kill restore 25% max stam | −10% · **Second Wind**: restore 40% + 2s free attacks |
| **Lifesteal** | +1 HP/kill | +2 HP/kill | +2 HP/kill · **Leech**: heal 3% of dmg dealt | +2 HP/kill · **Leech**: heal 5% + overheal → shield (≤15% max HP) |
| **Vitality** | +8% max HP | +12% max HP | +12% · **Undying**: heal 25% max HP when dropping below 25% (60s cd) | +12% · **Undying**: survive one fatal hit/run, heal to 40% |
| **Crit** | +3% chance | +5% chance | +5% · **Executioner**: crits splash 35% within 70px | +5% · **Executioner**: splash 50% within 90px + 30% slow 1.5s |
| **XP** | +8% skill XP | +14% skill XP | +14% · **Prodigy**: chained kills ramp +8%/kill up to +50% (4s window) | +14% · **Prodigy**: +10%/kill up to +90% (5s window) |

Pool-refill rule applied: Second Wind restores a **% of max stamina** (scales with the pool);
lifesteal-per-kill stays a small **flat** number (deliberately fades as HP grows — an anti-
scaling choice). Both crit stat lines use crit *chance* now (dropping the Uncommon's
crit-dmg-only stat) so the family's numeric plateau is one consistent channel.

Naming: keep the Charm(C)/Idol(U)/Totem(R)/Mantle(M) ladder; rename Rare/Mythic to fit their
mechanic (Onslaught Totem / Berserker's Mantle, Aegis Totem / Bulwark Mantle, …). Keep
`relic_avatars_mantle` id (damage mythic) to minimize churn.

## Hook sites (all confirmed by exploration) + net-new

Per mechanic — hook, then whether it reuses existing code or needs new state:

- **Onslaught** (damage): increment a `onslaughtHits` counter once per attack in
  `tryMeleeAttack`/`tryRangedAttack` (`MainScene.ts:5738`/`5834`), multiply `raw` on the
  interval before `applyCrit`. *Net-new:* one counter field.
- **Fleetfoot** (move): in `resolveKill` (`:6000`) set `killSpeedBurstUntil`/`Pct`; multiply
  into the 5th arg of `player.update` (`:1442`). Mythic dash-refund calls a small
  `Player.resetDashCooldown()`. *Net-new:* burst timestamp field + tiny Player method.
- **Guardian** (defense): in `applyDamageToPlayer` (`:6325`), if ready negate the hit + start
  cooldown; Mythic clamps `relicAdjusted` to `capPct% × health.max` after `:6350`. *Net-new:*
  `guardianReadyAt` field.
- **Second Wind** (stamina): in `resolveKill` call new `Stamina.restore(n)`; Mythic sets
  `freeAttackUntil`. Replace the 4 `relics.staminaCostMult()` weapon/tool call sites
  (`:4147/:5657/:5752/:5845`) with an `effectiveStaminaCostMult()` helper that returns 0
  during the free window. *Net-new:* `Stamina.restore()`, `freeAttackUntil` field, the helper.
- **Leech** (lifesteal): in `resolveWeaponHit` (`:5918`, has `finalDmg`) heal a % of damage
  dealt; overheal banks a `playerShield` consumed in `applyDamageToPlayer` before
  `health.takeDamage`. *Net-new:* `playerShield` number (+ a thin shield segment on the HP
  bar) — the one meaningfully new bit.
- **Undying** (vitality): in `applyDamageToPlayer`, Rare = post-damage low-HP heal on
  cooldown; Mythic = intercept `died` before `onPlayerDeath` (cover BOTH the main death path
  `:6384` and the bleed-DoT death path `:1478`), heal to 40%, mark used. *Net-new:*
  `undyingReadyAt`, `reviveUsed` fields.
- **Executioner** (crit): in `resolveWeaponHit`, if `isCrit` + active, splash a % of
  `finalDmg` to enemies within radius via a direct `enemy.takeHit` helper (clone the radial
  `emberblinkBurst` at `:5963`, NOT recursive `resolveWeaponHit`); Mythic also sets an enemy
  `slowUntil`. *Net-new:* `Enemy.slowUntil`/slow factor (drives existing `speedMult` path,
  `Enemy.ts:163`), a splash helper.
- **Prodigy** (xp): in `resolveKill` update a kill-streak counter/timer; fold a
  `xpStreakMult()` into `awardSkillXp` (`:6045`). *Net-new:* streak counter + `lastKillAt`.

**All new per-run fields** (`onslaughtHits`, `killSpeedBurstUntil/Pct`, `guardianReadyAt`,
`freeAttackUntil`, `playerShield`, `undyingReadyAt`, `reviveUsed`, enemy-agnostic streak
counter + `lastKillAt`) MUST be reset in the `create()` reset block (`MainScene.ts:829-945`)
— the `scene.restart()` field-init gotcha (`[[feedback_scene_restart_full_reset]]`).

## Files

- `src/systems/Relics.ts` — `RelicUnique`/`UniqueKind` types, `RelicDef.unique`, rewrite the
  Rare/Mythic entries to the plateau'd stat + proc (+ strip Vigor Idol's stamina stat),
  `RelicManager.unique()`, `uniqueText()` + extend `relicEffectText`, and **rework
  `compareInstances` to order by rarity→tier**. (Roll model / no-reroll / refunds unchanged.)
- `src/scenes/MainScene.ts` — the additive-convention edits (`damageBonusMult` helper +
  damage sites/display, additive damage-reduction bucket in `applyDamageToPlayer`, additive XP
  in `awardSkillXp`, linear max-HP/stamina in `syncStatBonuses`); the 8 relic-proc hook edits
  + `effectiveStaminaCostMult()` + `playerShield` bar draw + create() resets.
- `src/entities/Player.ts` — additive move-speed bucket in `update()` (fold sprint + relic +
  burst into one additive term) + `resetDashCooldown()`.
- `src/entities/Enemy.ts` — `slowUntil` + factor into the speed calc.
- `src/systems/Stamina.ts` — `restore(n)`.
- `src/systems/Health.ts` — (optional) shield lives on the scene, not Health, to keep Health
  pure; revisit only if cleaner there.
- `RECIPES.md` relic table + `src/dashboard/main.ts` Relics tab — reflect the new
  stat+unique layout (dashboard reads `RELIC_DEFS` live; add unique-text rendering).
- Copy this plan into the repo `.claude/plans/` and commit (per the in-repo-plans convention).

## Scope note

This is 8 bespoke mechanics (mostly Rare+Mythic sharing a kind with scaled params). It's a
large single change but each mechanic is small and reuses a single existing hook. If it's too
much for one pass, a natural split is **damage/move/stamina/xp first** (pure-reuse, no new
systems) then **defense/lifesteal/vitality/crit** (which add shield / enemy-slow / revive).
Default plan: do all 8, verify each live via `preview_eval`.

## Verification

1. `node node_modules/typescript/bin/tsc --noEmit`.
2. `preview_start` → reload → drive `window.__game.scene.getScene('MainScene')`:
   - Force-own a specific Rare/Mythic per family (set `relics.instances[family]`), then
     exercise each hook: fire attacks (Onslaught counter → bonus on the Nth), kill an enemy
     (`resolveKill` → Fleetfoot burst / Second Wind stamina / Prodigy streak), hit the player
     via `applyDamageToPlayer` (Guardian negate + cooldown, Undying low-HP heal / revive,
     shield absorb), land a crit (`isCrit` splash + slow).
   - Assert numbers: damage number on the Nth hit, `stamina.current` jump on kill, player HP
     after a negated hit, `playerShield` after overheal-leech, enemy `speedMult`/slow after a
     crit, revive fires once then not again.
3. **Additive-convention regression** (per category): damage matches
   `base × (1 + skill% + relic%) × stagger × crit`; damage-reduction matches the additive
   bucket + floor (never ≥100%); move speed matches `WALK × (1 + move% [+ sprint%] + burst%)`;
   XP matches `base × (1 + relicXp% + intXp% + streak%)`; max HP/stamina matches
   `100 + statFlat + 100 × relicPct%`. Confirm damage/reduction/move/XP barely move vs before
   and crit/stagger still multiply.
4. Confirm `create()` reset: run twice (simulate New Run) — no carried-over shield/streak/
   revive-used.
5. `tsc` clean, no console errors; dashboard Relics tab renders the unique lines.
