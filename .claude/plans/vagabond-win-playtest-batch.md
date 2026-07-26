# Vagabond-win playtest batch (2026-07-26)

Off the user's 77:26 Vagabond victory (476 kills, 133 elite, 3 boss, level 25, score 10890).
~35 items triaged into 4 batches, all approved. Design forks locked via `AskUserQuestion`
before any code changed, per his explicit "review all design choices with me first".

## Numbers review (done first, as asked)

**Run:** 47842 damage dealt (84% weapon direct / 9% ranged / 7% arc sweep), 8698 taken,
3688 healed, 0 deaths. Armor 36 = a full Lvl-3 Mirehide set exactly, so **no gem augments
are set** — corroborating the ore-scarcity complaint.

**Skills — 4 of 11 were doing anything for this build:**

| Skill | Lvl | Live effect |
|---|---|---|
| Light Armor | 57 | **capped at level 20** (+100ms i-frames). 37 levels inert |
| Pierce | 40 | dead — equipped weapon is the magic Gloam Brand |
| Running | 28 | x1.89 sprint, -28% drain — live |
| Magic | 26 | **+13% damage** — the only live weapon skill |
| Mining / Chopping | 21 / 16 | bonus-drop chance — live |
| Ranged / Heavy / Blunt | 16 / 12 / 7 | dead (wrong weapon; wearing light armor) |
| Slash / Blocking | 0 | Blocking has no mechanic at all |

Two structural causes: weapon skills are per-damage-type so swapping weapons throws away the
investment (40 Pierce -> ~7% damage lost on the switch), and `light_armor` has exactly one
effect with a cap it reaches at level 20.

**Stats — two ceilings, 25 points held:** Vitality 100 MAXED. Crit chance 59% against the hard
60% cap — Vagabond's x1.5 Agility potency means 0.675%/point, so it saturates at **~52 points,
not 100**, violating the standing "every stat must still be growing at point 99" rule. Crit
damage 2.43x of 3.0 (x0.85 potency, ~45 points of headroom). Strength and Wisdom are the only
real sinks left.

**Score's speed multiplier is a dead mechanic:** `clamp(10min/elapsed, 1, 3)` can only exceed 1
under 10 minutes. All five high scores (69:56 -> 98:17) sit at x1.00, so score is ~80% kill
points — the opposite of M-R1's locked "reward going fast" intent.

## Locked decisions

1. **Weapon skills unchanged** (the user: not the problem). Only `light_armor` gets help.
2. **Light Armor's second axis = dash DISTANCE**, alongside the existing i-frame window.
3. **Agility: slow the rate, keep the 60% cap.** Never raise a ceiling — damage is already
   high. Same rule as the 5as retune.
4. **The headline skills ask is VISIBILITY, not power**: the user's real complaint is "not
   knowing whether I have points left, i.e. whether a relic pushed me into a soft cap."
   The Stats tab must show each axis's total vs its cap, points remaining, and the source
   breakdown (weapon base / stat / relic / class potency).
5. **Score: rescale the reference time**, don't rework the formula.
6. **Miretyrant: more HP + a 3rd phase.** Longer because there is more fight, not spongier.
7. **Blighttoad is the 2nd bayou food source** (frog legs; "prepared right it's safe").
8. **Active Effects replaces the Combat column** in the Inventory panel — one list covering
   move speed, damage, crit, damage reduction, plus jewelry/Rare/Mythic procs.

## Batch 1 — bugs + UI

1. Crafting menu list overflows the panel bottom and overlaps the tabs when scrolled up.
2. Long recipe names cut off (the effigies).
3. Hint popup covers the Craft button.
4. Chest title hardcoded `"Gremlin Shack Chest"` (`ChestMenu.ts:146`) — the Warren cache
   reuses the same menu. Needs a per-container title.
5. Mirehide Leggings art not showing. **`icon_mirehide_leggings.png` exists in `art/sprites/`**,
   so this is a wiring/load issue, not missing art.
6. Stone pickaxe renders upside-down in hand.
7. Some specials show no numbers on hover.
8. Refine tab needs "Refine All".
9. "Ability Jewelry" is a confusing group name (it contains rings and amulets).
10. **Stat headroom display** (locked decision 4) — the highest-value item in this batch.

## Batch 2 — combat readability

1. **Area footprints vanish the instant the attack launches.** Boar/Duskrunner/Mirejaw already
   lock the lane (angle fixed at wind-up, velocity zeroed) so nothing follows the creature —
   the complaint is that there's no path left to read mid-leap. Keep the footprint drawn
   through the strike phase.
2. **Cragscale has no area indicator at all** — missed in the 5as roster-wide pass. Its rolling
   charge is untelegraphed.
3. Audit the rest of the roster for melee-range AOE indicators (the user likes Sanguinarch's).
4. **Hold left-click** to attack / chop / mine (today every action is a single `pointerdown`).
5. Flailing-arms attack animations don't read, Mosswretch worst — art pass.

## Batch 3 — balance + economy

1. **Duskhide Lvl 1 = 12 armor vs Gremlin Lvl 3 = 13** — a real progression inversion, and
   both are `light_armor` so there is no compensating axis.
2. Agility crit-chance rate slowdown (locked decision 3).
3. Light Armor dash distance (locked decision 2).
4. Score speed-multiplier reference time (locked decision 5).
5. Ore scarcity. `gloam_shard` has only two sinks (Tyrant Totem, Gloam Conduit); the actual
   bottleneck is likely **`bog_ore`** — 24 nodes/world, and it feeds Gloamsteel ingots
   alongside the plentiful crypt moonsilver. Confirm which he meant before tuning.
6. Mirejaw meat drop up; Blighttoad added as the 2nd food source (locked decision 7).
7. Campfire Lvl 5 gating bayou food; remove `lilygilded_feast` (the 2-gator-meat dish).
8. Elite Mosswretch should spawn elite Mosslings.

## Batch 4 — Miretyrant + Active Effects

1. Bellow adds must **auto-aggro** on spawn (they currently need proximity, and sometimes
   never aggro at all).
2. More HP + a 3rd phase (locked decision 6).
3. A **room-wide, very fast horizontal sweep** — telegraphed but demanding a real dodge, in
   the spirit of the ember mini-bosses, fought while adds are up.
4. Audit every Miretyrant attack so each requires a dodge, leaving at most one outrunnable.
5. Active Effects column (locked decision 8).

## Deferred to the art queue (not in these batches)

Inventory/crafting in-theme art refresh (already the next art phase), Cinderwrought's attack
animation, elite Hexling/Sandmaw both reading red, stone pickaxe icon reading as a hammer,
Embersteel Pike looking weaker than Sunsteel, Ember Brand as a staff rather than a sword,
per-bow projectile art, and the Duneshaper's missing attack VFX (already queued).

**Explicitly kept as-is for now:** the Mirejaw's gap-close reading like the other dashers —
the user wants a more creative approach but said keep it for now.
