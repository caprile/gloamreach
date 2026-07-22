# Biome-3 Phase 5 — Post-boss reward choice (boss-trophy relic pick)

Phase 5 of `.claude/plans/biome-3-and-new-systems-roadmap.md` — the last phase of the arc.

## What changed vs. the umbrella plan

The umbrella specced a **post-boss modal**: kill a big boss → a full-screen 3-card picker
opens immediately (relic / ability / stat boon / gem / special item).

the user redirected during the locking pass (2026-07-22):

> "it can be a relic but now im thinking when you roll the boss trophy, instead of it
> outright giving you a single random relic, you get 3 random relics to pick from of the
> pool if that makes sense — within the relic forge menu"

So the choice moves **out of a kill-time modal and into the Relic Forge**, riding the
boss-trophy that a big-boss kill already drops. This is strictly better for this codebase:

- The *reward* is still gated on a big-boss kill (`boss_refined_trophy` /
  `boss_refined_trophy_t2` are dropped by the Gremlin King / Duneshaper and by nothing
  else), so the roguelike beat the phase wanted is preserved.
- It reuses the forge's spin/reveal payoff instead of building a second modal that would
  compete with it — the slot-machine reveal *becomes* the drum-roll before the cards.
- No new pause/freeze surface, no risk of a modal interrupting the death feedback.
- The pick is a **real** decision rather than a flavour one: boss trophies already
  guarantee a **Mythic**, and there is exactly one Mythic per family (8 total), so
  "pick 1 of 3" reads as **"which family gets your Mythic?"**

## Locked decisions

1. **Boss trophies only** — but expressed as data (`TrophyRoll.choiceCount`), not an
   `if (isBossTrophy)`. Any future trophy opts in by setting the field. Absent/1 = today's
   single-relic behaviour, so every existing trophy is byte-for-byte unchanged.
2. **Commit — pick one, no skip** (locked via `AskUserQuestion`). Three cards, one choice.
3. **The candidates are distinct ids.** With one Mythic per family that also makes the
   families distinct. Reuses the existing S4 rule that never offers an owned Rare/Mythic id.
4. **Ownership is not mutated until the player picks.** The roll resolves the *rarity* and
   the *candidate set* at click (so an interrupted spin can't change them), but the family
   slot is only written by `commitCandidate()`. This keeps the existing "resolve at click,
   theatre over a known result" invariant.
5. **Picking runs the normal family-dominance path** (replace / decline / ambiguous
   choice) rather than force-equipping. A Mythic beats any non-Mythic in its family on
   rarity order, and owned Mythics are excluded from the pool, so in practice this always
   resolves as a clean auto-replace — but a hand-written pool that broke that assumption
   still can't corrupt the loadout model.
6. **Closing the menu mid-pick auto-commits the first candidate.** The trophy is already
   spent; the existing close-behaviour rule is "a spent trophy always yields something",
   and declining outright would silently burn a guaranteed Mythic.

## Implementation

**`src/systems/Relics.ts`**
- `TrophyRoll.choiceCount?: number` — candidates offered on a successful roll (default 1).
  Set to `3` on `boss_refined_trophy` + `boss_refined_trophy_t2`.
- `RollResult.candidates?: string[]` — present instead of `id` while a pick is pending.
- Extract the family-conflict tail of `roll()` into a private `place(id, powerTier,
  trophyKey, base)` so the single-relic path and the commit path share one implementation.
- `pendingCandidates` state + `hasPendingCandidates()` / `pendingCandidateIds()` /
  `commitCandidate(id)`.

**`src/ui/RelicForgeMenu.ts`**
- After the reveal lands on a candidates result, render a 3-row card picker in the result
  region (name + rarity, effect text, and what it would displace / which empty family slot
  it fills). Blocks rolling + tab-switching until picked (fold into `choicePending()`).
- `close()` auto-commits the first candidate.

**`src/scenes/MainScene.ts`**
- New `commitCandidate` dep → `relics.commitCandidate(id)` then the *existing*
  announce/refund/`afterRelicChange()` tail (shared with the normal roll path).
- `announceRelicResult` logs "the forge offers a choice" for a not-yet-committed result
  instead of "Relic forged" (there's no id yet).

**`src/ui/RelicRevealFx.ts`**
- `success` currently requires `result.id`; widen to `id || candidates?.length` so a
  candidates result plays the Mythic fanfare instead of the crumble fizzle.

## Verification

`tsc --noEmit`, then live via `preview_eval`: a boss-trophy roll yields 3 distinct Mythic
candidates with no ownership change; picking one equips exactly that relic and displaces
the right family slot; a normal (Common) trophy roll is unchanged; closing mid-pick still
yields a relic; `preview_console_logs` clean.
