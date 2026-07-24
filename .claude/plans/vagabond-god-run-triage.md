# Playtest triage — the "god run" (2026-07-23)

the user's ~100-minute Ashcaller run: magic + AOE lifesteal + crit + heavy XP investment.
Beat the Miretyrant in ~1 minute and ended with an overshield. His own summary: "every
encounter was a joke... I just mostly face tanked the Duneshaper and the biome 3 entire
enemy pool." Also: "this was the most fun run, likely due to levels."

All design choices below were **locked with the user via `AskUserQuestion`** in the triage
session. Numbers are first-pass unless stated.

---

## Root-cause findings (from code, before any changes)

### 1. Lifesteal scales with target count; incoming damage does not

`MainScene.resolveWeaponHit` runs **once per target hit** — primary, every arc-sweep
target, every on-hit-burst victim, every crit-splash victim. Weapon lifelink, the Leech
relic and Bloodpact all heal *inside* it. So one swing into a pack pays N heals.

Measured against his kit (Gloamdrinker, 31 displayed dmg, 1.8/s, 60% × 1.90 crit):
a swing into 5 enemies deals ~170 total damage across targets → at 8% weapon lifelink
+ 5% Bloodlord Leech that's **~22 HP/swing → ~40 HP/s** against a 308 HP pool.

Crit is not the culprit on its own — it is the multiplier that makes each of those N
instances big. **Do not nerf magic crit** (the user's own hypothesis, rejected in triage):
it treats the symptom and leaves the scaling intact.

### 2. Wisdom is trivially over-capped

Ability cooldown caps at −50%, reached at exactly 100 points. He had **112** — 12 points
doing nothing. At the cap, Bloodrush is 11s cooldown / 6s active = **55% uptime** on
+67% attack speed. That is most of why the Miretyrant died in a minute.

### 3. Intelligence is an undamped feedback loop

Int → skill XP → skill level-ups are the **only** source of player XP → player levels →
stat points → Int. The Ashcaller enters that loop pre-multiplied (×1.3 modifier, ×1.5
potency, ×1.6 magic affinity). Level 29 at ~100 min is the loop working as designed.

Skills **are** hard-capped (`MAX_SKILL_LEVEL` 100). **Stats are not capped at all** —
that is what he saw pass 100.

---

## Confirmed bugs

| # | Symptom | Root cause |
|---|---|---|
| B1 | Inventory flickers while picking things up | `InventoryMenu.refresh()` → full `render()` → `clearRows()` destroys and rebuilds every GameObject. Every magnet pickup fires `afterItemMove()` → `refresh()`. Fix: update counts in place, or dirty-flag to once per frame. |
| B2 | "Does Embersteel Warbow have no upgrades?" | `WEAPON_UPGRADES` registers `gloamsteel_warbow` but never `sunsteel_warbow` / `embersteel_warbow`, **and the three Mirebronze weapons are missing too**. Six weapons with no upgrade path. Pure omission. |
| B3 | "Arrows bugged after upgrading bow to Gloamsteel — can't load ammo" | `gloamsteel_warbow` requires `gloam_arrows`. `equipArmorFromContainer` logs *"Loaded Arrows"*, then `recomputeEquipped` → `reconcileAmmoSlot()` silently evicts them. Success message + empty slot, nothing naming the required arrow. **Dissolved by the ammo removal below.** |
| B4 | "Stacks that won't combine or reach 99" | Almost certainly `arrows` (4×99+56) sitting beside `gloam_arrows` (76) with near-identical placeholder icons — both are `maxStack: 99` and merge correctly in `moveSlot`/`sortAndStack`. Readability bug. **Also dissolved by ammo removal.** Verify before closing. |
| B5 | Gem augments show on weapons pre-Gemwright | `UpgradeMenu.ts` unconditionally prints the `Gem augments: N/2` readout. The *rows* are already correctly gated. One-line fix. |
| B6 | Gators aggro off-screen and never deaggro | At `WORLD_ZOOM` 1.5 the visible half-height is ~360 world px. Mirejaw `STALK_RADIUS` is **460** and it abandons stealth to hunt after 2.4s regardless of distance. `DEAGGRO_RADIUS` **720** exceeds the screen half-diagonal (~734), *and* every landed chomp calls `markAttackLanded()`, resetting the 30s give-up clock — a gator that keeps touching you can never give up. Same class as last session's ranged-caster fix; melee never got it. |
| B7 | Ability descriptions lack numbers | 5 of 10 state real numbers (Mire Snare, Bloodrush, Aegis); 5 are pure flavour (Blink, Nova, Bloodpact, Gravebind, Spirit Lance). |

**Unresolved / needs data:** "4 rares in a row" — possible but improbable per-roll (12% off
refined-uncommon). Likelier explanation: 18 crypts each guarantee a
`refined_trophy_uncommon_t3`, so he had far more rolls than it felt like. The run summary's
relic ledger settles this. Also unresolved: "lvl 2 when I started bayou" — unclear what was
at level 2.

---

## Locked decisions

### D1 — Remove ammo entirely
Bows and the slingshot fire freely. Delete the `ammo` `EquipSlot`, the arrow/pellet items
and their recipes, and `reconcileAmmoSlot()`. Kills B3 and B4 outright. Ranged is then
governed by stamina + range + attack speed only. (the user raised this twice unprompted.)

### D2 — Cap lifesteal healing per swing
Lifelink/Leech/Bloodpact still trigger on every target, but **total heal per attack is
capped** (~1.5× the primary target's contribution). Keeps AOE weapons feeling good, removes
the linear-with-crowd-size scaling. Crit and magic untouched.

### D3 — Buff bows on both axes, moderately
Keep the tier ladder. Damage ~+40%: Sunsteel 11→15, Embersteel 15→21, Gloamsteel 20→28.
Cooldowns ~−25%: 750/730/720 → ~560/545/535. Lands bow DPS near forged melee, paying for
safe range with no arc, no burst, no lifelink.

### D4 — Raise baseline XP for everyone (SHIPPED 2026-07-23)
Lift the global rate so a neutral class levels roughly like this Ashcaller run did, and trim
the Ashcaller's own stacked multipliers so it is a lean, not a runaway.

**Important correctness finding during implementation:** the two XP curves are NOT
interchangeable levers. `Progression.ts`'s `XP_BASE` (player-level cost) is the ONLY thing
that governs player-level pace. `Skills.ts`'s `skillXpToNext` coefficient looks related but
is a no-op for player levels — proven by simulation (a fixed raw-XP budget run through the
real skill->player feed produced more skill level-ups at a lower coefficient but the SAME
player level), because a skill level's cost literally IS the player-XP it feeds; lowering the
coefficient just re-chunks that total into more, smaller deposits. Shipped both anyway:
`XP_BASE` 110->85 (~1.29x, sized to match what the Ashcaller's OWN `character.xpMult` (1.3)
gave a neutral class for free) is the actual pace fix; `skillXpToNext` 70->54 is kept as a
genuine, independent win for skill-level (recipe-unlock) pace.

Ashcaller trimmed: `xpMult` 1.3->1.15, `skillXpMult` magic 1.6->1.35 / ranged 1.4->1.2,
`statPotency.intelligence` 1.5->1.25. Bane (-15% max HP) and the heavy_armor penalty
untouched — only the winning side of the double-edge. Verified live: the trimmed Ashcaller
now gives ~1.63x XP on its favored skill vs a neutral class (was 2.08x+ before any stat
investment, pre-trim).

### D5 — `magnetRadiusPct` → bonus gather yield
Fold the three jewelry items' pickup-radius passive into the existing `gatherBonusPct`
channel. Already wired, already meaningful, keeps their explorer/utility identity rather
than pushing them into the relics' raw-combat-stat lane.

### D6 — Melee deaggro: tighten radii + hard pursuit cap
Mirejaw stalk 460→330, deaggro 720→520 (both inside the screen). Plus a **hard maximum
pursuit duration on base `Enemy`** that a landed hit can extend but never fully reset — so
every melee species inherits it, not just the gator.

### D7 — End-of-run summary (replaces the "run log" idea)
**Player-facing**, Slay-the-Spire style, not a dev export — it doubles as the balance data.
Expands the existing `RunEndUI` rather than adding a parallel tool. Fires on victory, on
death (already does), **and on "New Run", which currently just restarts without ending the
run or showing anything** — the case the user will hit most often.

Contents — attribution is the point, a craft list is not:
* damage dealt **by source** (primary hit / arc sweep / on-hit burst / crit splash / abilities)
* healing received **by source** (weapon lifelink / Leech relic / Bloodpact / food / Comfort)
* damage taken by species and attack name
* kills by species
* relic roll ledger with verdicts (settles the "4 rares" question)
* a ~10-event milestone timeline (level-ups with timestamps, boss kills, relic acquisitions)

### D8 — Chest menu drops the backpack panel
the user: *"since inventory management isn't really a thing, I don't think we need to show
the inventory at all when opening a chest."* Straight preference, no ambiguity.

### D10 — Bayou common → miniboss gap (enemy scaling)

the user: *"take a look at the numbers of the biome 3 enemies relative to the minibosses and
adjust them to be more like the difference between the other biome's minibosses."*

**Measured — miniboss HP ÷ toughest common in the same biome:**

| Biome | Miniboss | Ratio |
|---|---|---|
| Badlands | Gloamwarden 260 | **2.7×** (vs Hexling 95) |
| Badlands | Cinderwrought 650 | **6.8×** |
| Bayou | Palewake 420 | **1.0×** (vs Mosswretch 420) |
| Bayou | Kilnborn 440 | **1.05×** |
| Bayou | Sanguinarch 620 | **1.5×** |

Miniboss top damage ÷ toughest common's: badlands 0.5× / 1.08×; bayou 0.13× / 0.73× /
0.90× — **every bayou warden hits softer than a Mirejaw lunge (80)**.

**Root cause — commons scaled between biomes, minibosses did not:**

| Mean HP | Forest | → Badlands | → Bayou |
|---|---|---|---|
| Commons | 18.8 | 55 (×2.9) | 224 (**×4.1**) |
| Minibosses | — | 455 | 493 (**×1.08**) |
| Boss | 600 | 2500 (×4.2) | 3600 (×1.44) |

The compression is **not confined to minibosses**: boss ÷ toughest common is 18.8× (forest),
26.3× (badlands), but only **8.6×** (bayou). Commons are the common term in both broken
ratios, which is why the fix touches them rather than only raising wardens. The wardens were
*already* raised last session (240-300 → 420-440) and it didn't land, because the thing they
are measured against — Mosswretch at 420 — is the real outlier.

**Why not raise wardens alone** (considered, rejected): matching badlands ratios against a
420-HP common puts them at 1100-2860. Sanguinarch at 2860 is 79% of the win-con boss, and
there are **18 crypts** — something fought 18 times must not be four-fifths of the finale.
Lowering the denominator is the only way to widen the gap without crowding the Miretyrant.

**Counter-argument, which has real force:** bayou common HP is high *on purpose* because
player DPS scales hard between biomes — a 95-HP common is confetti to a Gloamsteel build.
That is why the locked split below is the **even** one (commons −15-30%) rather than the
first proposal (commons −40%).

**Locked numbers:**

| | Now | → | vs toughest common |
|---|---|---|---|
| Murkling | 40 | 40 | swarm, unchanged |
| Blighttoad | 150 | 130 | |
| Corpselight | 190 | 160 | |
| Mirejaw | 320 | 260 | |
| Mosswretch | 420 | **300** | |
| Palewake | 420 | **850** | 2.8× |
| Kilnborn | 440 | **1000** | 3.3× |
| Sanguinarch | 620 | **1350** | 4.5× |

Plus warden damage bumps so they clear the commons: Kilnborn backdraft 58→72, Sanguinarch
slam 72→88, Palewake tether 10→14/s.

Resulting spread 2.8-4.5× (badlands 2.7-6.8×), miniboss→boss 3.4×, boss→toughest-common 12×.
**Miretyrant held at 3600** — it died in ~1 minute to the lifesteal loop, not because its HP
is wrong; D2 is the fix for that.

All values live in `src/systems/enemyStats.ts` (the single source of truth, also read by the
balancing dashboard). Bayou entities are already wired to read it.

**Ships in session 2**, bundled with D2/D3/D4 — enemy HP interacts directly with the
lifesteal cap, so the two must be verified in the same run, not separately.

### D9 — Cap or surface stat caps (SHIPPED 2026-07-23)
Wisdom's -50% ability-cooldown cap is reachable at 100 points and nothing said so. Shipped as
a **surfaced live indicator, not a hard allocation block** — a "(CAPPED — this axis is
maxed)" note on the Stats tab's "Now:" line, appearing exactly once the axis saturates.

Also audited every stat for the same silent-dead-point trap while in there, and found it's
NOT unique to Wisdom: Strength (crit multiplier) and Agility (crit chance) are ALSO capped
(`CRIT_MULT_CAP`/`CRIT_CHANCE_CAP` in MainScene), just build-dependent — the total combines
weapon base + the stat + relics + gear augments, so "how many points is too many" changes
with loadout. Both get the same marker, read LIVE off the currently equipped weapon via a new
`critCapped` dep (false/false when unarmed) rather than a fixed point threshold, which would
be wrong the moment gear changes.

**No universal hard ceiling on stat allocation** (the plan's other open question) — deliberately
rejected. Endurance (max stamina + regen%), Vitality (max HP + healing%), Intelligence (skill
XP%), and Wisdom's OTHER axis (buff/food duration) are all genuinely uncapped/linear-forever by
design; blocking allocation past some arbitrary point would contradict that and remove real
value from those stats. Only the 3 axes that actually saturate (Wisdom-CDR, Strength-crit-mult,
Agility-crit-chance) get the marker; nothing is blocked.

---

## Creature identity pass

the user: *"Mirejaw feels like a glorified boar"*, *"[Mosswretch] lacks attack moves"*,
*"[Corpselight] need to make that guy cooler besides just a ranged gremlin."*

### C1 — Mirejaw: the death roll + water is its territory
* **Death roll.** A landed chomp latches into a thrashing spin — repeated bleed ticks in a
  tight radius, then a long planted recovery. Being caught becomes a real punish instead of
  one damage number; the recovery is the punish back. Uses `checkPlayerHit` + `pendingBleed`.
* **Water exemption.** Last session gave enemies the terrain move-slow the player suffers.
  Exempt the gator: the player wades at 0.5× in deep water, it does not. One `envSpeedMult`
  exemption, and it instantly stops reading as a land predator.

### C2 — Mosswretch: splits on death + a second attack
* **Splits into 3 Mosslings on death**, via the exact `consumeBellow()` contract the
  Miretyrant already uses — the creature *asks*, MainScene resolves the spawn, so the adds
  inherit terrain collision and containment for free.
* **Spore burst.** It cannot catch you, so it should *stop* you: a ground-slam leaving a
  lingering moss cloud that poisons and slows (reuses `Poison.sustain()` + the env
  move-mult path). Its kit becomes: cloud off the escape route, then land the overhead
  smash you can no longer walk out of.

### C3 — Corpselight: it transforms (the user's idea)
Phase-out and blink were both **explicitly rejected as done-before** ("we've done
untargetable windows before and the teleporting, let's get more creative"). Do not build
them. Palewake's break-the-tether is also off-limits — that is the crypt warden's identity.

At range it is the wisp: fragile, floaty, homing orbs. Close to melee and it **collapses
into the drowned corpse the light was leading you to** — bigger, tankier, real melee
attacks, slow. Back off and it dissolves back.

* **HP: one shared pool, husk takes reduced damage.** Damage carries across forms, so
  chipping at range is real progress, but the same DPS goes further at range. Rewards
  committing to a strategy instead of making the husk a sponge that resets your work.
* **Husk: slow chase, then dissolves back** after a couple of seconds out of melee range.
  Disengaging works but costs ground and time.
* **The transitions hurt.** The collapse is a telegraphed drop-slam; the dissolve puffs
  gloam. Plus a transform cooldown — together these stop flickering at the range boundary
  to dodge both forms.

Nothing else in the game transforms, which is the point.

---

## Suggested session split

Roughly three sessions. Everything here is decided — no further design calls needed.

1. **Bug fixes + ammo removal + end-of-run summary** (D1, D7, D8, B1, B2, B5, B6, B7).
   Sonnet-class except the summary; do the summary first so later balance work has data.
2. **Balance pass** (D2, D3, D4, D5, D6, D9). Verify against a real run using session 1's
   summary rather than against the diff — see the standing rule that item `stats` are
   display text and real values live elsewhere (`ItemDef.armorDefense` burned us last time).
3. **Creature identity pass** (C1, C2, C3). New mechanics → Opus.
