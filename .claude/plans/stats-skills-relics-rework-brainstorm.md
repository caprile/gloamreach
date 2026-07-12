# Stats / Skills / Relics rework — brainstorm & design direction

**Status: BRAINSTORM IN PROGRESS — not locked, not built.** Started 2026-07-11 after the
third playtest fix batch (STATUS.md `### 5aa`). Captured here so the direction survives
across sessions. Do NOT start implementing until this is turned into a locked plan with
the user.

## The problem (the user's words)

Stats (Endurance/Vitality/Strength/Agility/Intelligence/Willpower) and Skills
(slash/blunt/pierce/ranged/magic, heavy/light armor, running/blocking/chopping/mining)
"all feel pretty negligible now compared to relics." Relics (M-RL) hand out big
percentage stat boosts (e.g. +8–40% damage, +8–25% move speed, flat max-HP, kill-heal)
that dwarf what a stat point or a skill level does today.

Current per-point / per-level payoffs, for reference:
- **Stats** (`Progression.ts`): Endurance +1 max Stamina/pt, Vitality +1 max HP/pt,
  Strength/Agility −0.5% melee/ranged stamina cost/pt, Intelligence/Willpower are dead
  placeholders (spell cast time / mana — neither system exists).
- **Skills** (`Skills.ts`): weapon skills +0.5% damage/level; Running +0.5% sprint
  speed/level; the other 6 skills (armor/chopping/mining/blocking) have **no mechanical
  effect at all — they only gate recipe discovery**.
- **Relics** (`Relics.ts`): whole-percent buffs across damage/move/stamina-cost/
  damage-taken/kill-heal/maxHP/maxStamina/xp, stacking additively, scaled by power tier.

So relics own the "numbers go up" fantasy and stats/skills are a rounding error on top.

## the user's locked direction (the load-bearing decision)

> "Relics will be the core 'stats boosting' stuff, and recipes will be the 'uniqueness'
> part. For example a recipe for a special sword that has a 20% chance to do a double
> attack or something, while relics assist with stats/buffs in general stats/skills."

Reframed as three distinct layers, each with its own job:

1. **Relics = the raw-stat layer.** Keep them as the primary source of "+X% damage /
   speed / HP / etc." This is already how they work — don't fight it. Percentage stat
   growth is *supposed* to come from relics.
2. **Recipes/gear = the uniqueness layer.** Special crafted weapons/armor with
   *qualitative* effects, not just bigger numbers — procs (20% double-attack), on-hit
   effects (bleed/stun/lifesteal), conditional bonuses (+dmg vs staggered, +dmg at
   night), unique actives. This is the ARPG "build-defining item" fantasy and is
   **new** — nothing in the game does this today.
3. **Stats/Skills = ???** This is the actual open question. If relics own raw stats and
   recipes own uniqueness, what is left for the character-progression sheet to do that
   feels worth investing in? Options below — NOT yet decided.

## Open question: what do Stats & Skills become?

Candidate roles (brainstorm, unranked, not locked — need to pick with the user):

- **A. Unlockers, not multipliers.** Skills/stats gate *access* to the uniqueness layer:
  a skill threshold unlocks a special recipe or a weapon's proc, a stat threshold enables
  an item's conditional effect. Fits "recipes = uniqueness" — the sheet decides *which*
  unique things you can build, relics tune *how strong* everything is. (Skills already
  gate recipe discovery, so this extends an existing mechanic rather than inventing one.)
- **B. Meaningfully bigger, distinct-axis payoffs.** Stop competing with relics on the
  same axes. Give stats/skills effects relics *don't* touch: e.g. skills grant utility
  (chopping/mining → faster gather or extra yield — real effects for the 6 dead skills),
  crit chance, stamina *regen* rate, dodge i-frame window, block/parry (the dormant
  `blocking` skill), armor skill → flat damage reduction. Percentages could also just be
  bumped so a leveled skill is felt, but the risk is re-creating the "just another relic"
  feel.
- **C. Persistent/meta layer.** In a hardcore roguelike run, relics are per-run and reset;
  if skills/stats also reset each run they're weak by design (no time to grow). A
  meta-progression angle: skills/stats (or a subset) persist across runs as the slow
  account-level power that makes relics reachable. Big design shift — touches the
  run/hardcore model — so only if the user wants a meta layer.
- **D. Wire up the dead content first, decide scale after.** Six skills have no effect and
  two stats (Int/Willpower) are pure placeholders. Regardless of the bigger question,
  giving each a *real* effect (even small) is the concrete first step; the "negligible"
  complaint is partly just that half the sheet does literally nothing.

## Concrete sub-items surfaced (independent of the big decision)

- **Dead skills need effects:** heavy_armor, light_armor, blocking, chopping, mining have
  zero mechanical payoff. chopping/mining → gather speed or yield is the obvious cheap win.
- **Dead stats:** Intelligence/Willpower gate magic systems that don't exist. Either
  repurpose them for something real or hide them until magic exists.
- **The uniqueness layer is a NEW system.** "20% chance to double-attack" style procs
  need: a place on `ItemDef`/`Weapons.ts` for qualitative effect data, a hook in the
  attack resolution path (`resolveWeaponHit`), and probably a small effect-registry
  pattern. This is Opus-territory (new mechanic/data model) when it's built.

## Next step

Resume the brainstorm with the user to lock: (1) the role Stats/Skills take (A/B/C/D or a
mix), (2) whether the uniqueness/proc layer ships as its own milestone (likely **M-TE**,
"trophy-gated special gear," which was already next in the build order and is a natural
home for build-defining items), and (3) scope of any stat/skill number rebalance. Then
this file becomes a locked implementation plan. Relates to
[[survivor-rpg-progression-system]] and [[survivor-rpg-relics]].
