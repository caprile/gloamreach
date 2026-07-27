# Bayou debuff system — enemy-applied player debuffs + counterplay

Deferred out of the Ashcaller batch (`STATUS.md`: *"dispel / disarm / silence / root as
enemy-applied player debuffs. **No player-side debuff state exists at all**"*). This is that
session.

## What exists today (the starting point)

- **DoTs only**: `Bleed.ts` / `Poison.ts` — damage over time, nothing that stops the player
  *doing* something.
- **Terrain conditionals**: `environmentEffectAt` → `moveMult` / `regenMult`, surfaced as the
  `slow` / `noregen` rows in `MainScene.statusEffects()`.
- **`StatusBarUI.ts` is already generic** — "adding a future debuff = one more row in
  `statusEffects()`". This plan is the first real user of that.
- **One resistance hook already exists**: `EquipmentEffects.statusResistPct` (Mireborn Cloak),
  which thins the incoming *dose* of bleed/poison.

## Locked decisions (the user, via AskUserQuestion + follow-ups)

1. **Roster = Root / Disarm / Silence / Enfeeble.** Hard lockouts are in, but short, and with
   **diminishing returns** so a swarm can never chain-lock. **Sap (stamina drain) was cut** —
   "i'm not sure I like sap".
2. **Counterplay is BOTH** an active dispel and a passive resistance channel — *plus* per-item
   **immunity flags** ("Cannot be Enfeebled") on specific items/specials/relics/class features.
3. **Resistance lives in three places**: the existing equipment passive (widened), a **relic
   family**, and a **skill** — specifically **Magic, repurposed off weapon damage**
   ("maybe magic skill does something with this instead of magic damage?").
4. **The dispel clears control + DoTs, never terrain.**
5. **Clear status displays + on-player FX** while debuffed (added mid-session).
6. **The debuff status icons must be bigger** — today's 26px band reads as too small.

## The design

### Core — `src/systems/PlayerDebuffs.ts` (new, framework-free)

Same shape as `Health`/`Stamina`/`Bleed`/`Poison`: owns no GameObjects, ticked with `delta`.

- **One slot per kind**, refresh-don't-stack (keep the longer remaining, the stronger
  magnitude). Four simultaneous Murklings must not mean four roots.
- **Diminishing returns per kind**: successive applications inside a 12s window land at
  100% → 50% → 25% → **immune**. This is the load-bearing anti-chain-lock rule; without it a
  swarm's collective uptime is 100% regardless of how short any single application is.
- **Resistance multiplies DURATION at apply time**, and the same aggregate keeps multiplying
  the DoT *dose* it already did. One number, two applications.
- **Immunity set** pushed in from equipment/relic/character — `apply()` becomes a no-op.
- `dispel()` clears every kind and returns what it cleared.

**Why terrain is structurally undispellable**: terrain effects never enter this manager (they
are computed per-frame from `environmentEffectAt`), and a miasma re-arms poison via
`sustain()` on the very next frame. Decision 4 needs no flag to enforce — it falls out of
where the state lives.

### Hook points — one per debuff, all at existing choke points

| Debuff | Effect | Hook |
|---|---|---|
| **Root** | can't move, can't dash; **can still attack** | `Player.update`'s `inputEnabled` + `canDash` args |
| **Disarm** | can't attack (melee or ranged); gathering still works | `tryAttackEnemy` early-return |
| **Silence** | can't cast Q/E/R | `tryCastAbility` early-return |
| **Enfeeble** | deal less damage | `damageBonusMult()` — the shared additive bucket |

Root deliberately leaves attacking alone and Disarm deliberately leaves movement alone, so the
two read as different problems rather than degrees of the same one. Every blocked action
spawns feedback text — these are currently *silent*-fail paths, and a silent no-response reads
as a bug.

### Who applies what — one clear teacher per debuff

`Enemy.pendingDebuff`, mirroring the existing `pendingBleed` / `pendingPoison` channel
(consumed + cleared in `updateEnemies`, passed into `applyDamageToPlayer`), so debuffs inherit
the i-frame guard: **a dashed-through attack applies no debuff.**

- **Mirejaw** → **Root** on the *death roll* latch (it already plants you thematically).
- **Mosswretch** → **Enfeeble** on the *smash* (the spore cloud stays slow+poison — a cloud is
  terrain-ish, and decision 4 keeps terrain undispellable).
- **Corpselight** → **Silence** on the *collapse slam* (a haunt smothering your gloam).
- **Miretyrant** → **Disarm** on *Gorge Heave*. Losing your weapon belongs on the one fight
  with huge telegraphs, not on a swarm.
- Blighttoad (owns poison) and Murkling (swarm chip) get nothing.

Each rides a *specific telegraphed attack*, so every debuff is dodgeable at the source.

### Counterplay

**Active — "Fenwash" (`cleanse` ability family).** Craftable at the Gemwright's Table, the same
precedent as Mire Snare / Bloodrush (decision: a *requested* ability is craftable, never
epic-drop gated). Clears all four debuffs **and** bleed/poison doses; terrain re-applies
instantly by design. Grants a short immunity window afterwards so it can't be re-applied on the
same frame it clears.

**Passive — a single combined `MainScene.statusResistMult()` choke point** summing three
sources additively (floored at 0.25, mirroring the existing clamp):

1. `EquipmentEffects.statusResistPct` — widened to cut debuff *duration* as well as DoT dose.
2. **Magic skill** — `-0.5%/level`, cap `-40%`. `weaponSkillDamageMultiplier` now returns 1 for
   magic. **This is also a Gloam/Ember Brand nerf**, which lines up with the standing "brand +
   crit insta kills stuff with 0 downside" complaint.
3. **A 9th relic family, `warding`** — channel `statusResistPct`, with a `wardbreak` unique on
   the Rare/Mythic (auto-cleanse on a cooldown). `RELIC_FAMILIES` is already the single source
   of truth for the loadout, the Inventory relic column and the refund math; the only
   hardcoded `8` is `InventoryMenu`'s `RELIC_GRID_ROWS`, which becomes derived.

**Immunity flags** — `EquipPassive.debuffImmunity?: DebuffKind[]` and
`RunModifier.debuffImmunity?: DebuffKind[]`, so a specific item or class can read "Cannot be
Enfeebled".

### Display + FX (decisions 5 and 6)

- **`StatusBarUI` icons 26px → 40px**, bigger timer text. The status art is 32px, so it was
  also overflowing a 26px box.
- **Per-debuff FX attached to the player**: a ground shackle-ring while rooted, a struck-out
  rune overhead while silenced, a broken-blade glyph while disarmed, sickly wisps while
  enfeebled. Drawn only while active.
- **A one-shot callout** when a lockout lands ("ROOTED" / "DISARMED" / "SILENCED"), because
  losing control needs an immediate cause.
- **The Q/E/R bar greys out and reads SILENCED**; the attack-range ring turns red while
  disarmed.

## Verification

`tsc --noEmit`, then live via `preview_eval`: apply each debuff and assert the hook actually
blocks (movement delta, attack no-op, cast no-op, damage reduction), the DR ladder
(100/50/25/immune), resistance stacking across all three sources, immunity flags, the dispel
clearing control+DoT but *not* a miasma, and that a dashed-through attack applies nothing.

## Out of scope

- No new bayou enemy or attack — debuffs ride existing telegraphed attacks.
- No debuffs on badlands/forest rosters; this is the bayou's identity.
