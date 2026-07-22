# Biome 3 — Phase 3: Bayou gear progression (reforge tier + gem augments)

Phase 3 of `.claude/plans/biome-3-and-new-systems-roadmap.md`. Built on Opus (the augment
system is a new per-instance mechanic; the reforge tier is data on existing machinery).

## Locked decisions (the user, via AskUserQuestion)

1. **Gem augments are mix-and-match and CONSUMED** — not removable sockets, not a linear
   ladder. Each augment is a named one-shot upgrade applied to a specific gear *instance*
   in any order (the no-ladder model `StationUpgrades` already established), capped at
   **2 per item** so the pick is a real choice rather than a checklist.
2. **Biome 3 also adds ONE reforge tier** — a new item consuming its Ember-tier
   counterpart, gated behind a new Workbench level. Honors roadmap locked decision 6
   ("no fresh base sets in biome 3" — reforge-forward is explicitly fine).

## What shipped

### A. Gem augments — `src/systems/GearAugments.ts` (new)

`GearAugmentDef` mirrors `StationUpgradeDef`'s shape (so the existing `UpgradeMenu` serves
it) plus an `augment: true` discriminator and an `AugmentEffect` payload. **Storage reuses
the existing per-instance fields** — `ItemStack.upgrades` for gear in a container,
`EquippedItem.upgrades` (new field) for a worn piece — so there is **no new per-instance
data model**, and an augment never touches the item's `tier`: tiers (Lvl 2/3 right-click
upgrades) and augments compose on the same piece.

Deliberately its own effect layer: relics own raw-% combat stats, jewelry (2b) owns
ability-augment + explorer utility, so augments stay **gear-flavored** — the numbers that
live on the weapon/armor itself.

| Augment | Fits | Effect | Cost |
|---|---|---|---|
| Gloam Edge | Weapons | +3 Damage | 1 Gloam Gem, 1 Gloamsteel Ingot |
| Serrated Fang | Weapons | +6% Crit Chance | 1 Blood Gem, 2 Sandmaw Chitin |
| Cruel Weight | Weapons | +0.30x Crit Damage | 1 Ember Gem, 2 Cragscale Plate |
| Widened Sweep | Weapons | +30% Arc Reach | 2 Moonsilver, 1 Gloam Gem |
| Swift Grip | Weapons | -12% Stamina Cost | 2 Moonsilver, 4 Twine |
| Warded Plating | Armor | +2 Armor | 2 Gloamsteel Ingot |
| Stoneheart Core | Armor | +3 Armor | 3 Gloamsteel Ingot, 3 Cragscale Plate |
| Gloamweave Lining | Armor | -10% Magic/Fire Damage | 1 Gloam Gem, 1 Moonsilver |
| Fleetfoot Stitching | Armor | +4% Move Speed | 2 Mirehide, 1 Blood Gem |

Augmentable items = the **Ember tier and the new Gloam tier only** (starter/stone gear is
deliberately excluded — gems are a late-game sink). All augments gate on a **Workbench
Lvl 4** (Emberforge Anvil, `requiresWorkbenchTier: 3`) — the same bench the Ember tier is
forged at, so gear and the gems that augment it arrive in the same era.

**Hooks** (each at the single existing chokepoint, so nothing can drift):
- flat damage → `MainScene.equippedWeaponBaseDamage()` (new helper replacing three copies
  of the `weaponDamage + weaponTierDamageBonus` expression)
- crit chance / crit mult → `critChanceTotal` / `critMultTotal`
- arc reach → `tryMeleeAttack`'s arc (range only — not the angle)
- stamina → `effectiveStaminaCostMult`
- flat armor → `ArmorUpgrades.totalPlayerDefense` (so every existing caller picks it up)
- magic/fire mitigation → `applyDamageToPlayer`'s bypass branch, summed with the
  heavy-armor skill mitigation and capped at 75%
- move speed → the `moveMult` bucket handed to `Player.update`

**UI:** the existing `UpgradeMenu` gained an `appliedAugmentIds` dep. Augment rows always
run the no-ladder model even when the same panel is showing a tier ladder above them, plus
a `Gem augments: N/2` header line and a "Gem slots full" block reason at the cap. The item
Tooltip lists a specific instance's applied gems.

### B. The bayou reforge tier (dormant — sourced in Phase 4)

New materials: **Bog Ore** (mined in the bayou) → **Gloamsteel Ingot** (Smelter, +Hex
Essence fuel, needs the tier-1 Ember Crucible Smelter), and **Mirehide** (bayou creature
hide). New Workbench **Lvl 5** upgrade: **Gloamforge Anvil** (5 Gloamsteel Ingot, 6
Mirehide, 3 Moonsilver) — discovery-gated by its own cost keys, exactly like every prior
forging tier.

11 reforge recipes (`requiresWorkbenchTier: 4`), each consuming its Ember counterpart:
**Gloamsteel** heavy set (13/16/13 = 42 armor), **Mirehide** light set (9/12/9 = 30), and
**Gloamsteel Warhammer / Longsword / Pike / Warbow + Gloam Brand** (30/25/32/20/23 dmg),
holding every S7 identity invariant. Both new sets get the existing two right-click
Lvl 2/3 tiers (sunk in Gloamsteel) and their own **set bonuses** — Gloam Bulwark and
Mireblink, deliberately the *same two mechanics* as the Ember sets turned up (22% DR /
15 thorns; 1.9x dash / 120px, 26 dmg landing nova). MainScene picks the stronger of the
two rather than stacking them.

New **Bayou** inventory tab (`ItemBiome`), covering both the 2b jewelry economy and this
tier.

## Verification (live, `javascript_tool`)

`tsc --noEmit` clean, zero console errors. All 15 new textures generate. Augment apply
blocked without a Lvl-5 bench ("Requires nearby Workbench Lvl 4"), applies with one, exact
costs deducted, third augment refused at the cap. Equipped weapon 30→33 dmg, crit
6%→12%; Swift Grip stamina mult 0.88; Widened Sweep proven functionally (a secondary
enemy at 62px is OUT of the warhammer's 54px sweep and IN at +30%). Armor 42 → 47 with
two augments; magic hit 60 → 48 with two Linings; physical 60 - 30 armor = 30. Move bucket
1 → 1.08 at `Player.update`; dash 1.9 from the Mirehide set. All 11 recipes gate at bench
tier 4 (craft refused without, succeeds with, base piece consumed); Bog Ore smelts only at
Smelter tier 1. Equip → unequip round-trip preserves both `tier` and `upgrades`.

## Follow-up pass (same session, off the user's feedback)

1. **Crafting menu was too short** — its 440px height was fixed, authored when the Armor/
   Weapons tabs held a handful of recipes; the forged + bayou tiers pushed those lists
   straight out the bottom edge. The panel now **sizes itself** to the space between its
   top margin and the bottom HUD (`PANEL_H_MIN` floor + `BOTTOM_CLEARANCE`), and the recipe
   list is a **windowed, scrollable viewport** — only in-view rows are created, with its own
   wheel handler and ▲/▼ hints, the same pattern `CookingMenu` uses. At 1080p the panel is
   670 tall and the full 24-row Armor tab fits with no scrolling at all.
2. **Gem-slot visibility** (both fixes from the earlier assessment): the item **Tooltip**
   now shows `Gem augments: N/2` for *any* augmentable piece — filled or empty, so an empty
   one no longer reads identically to gear that can't take gems — followed by the applied
   ones; and every **slot icon** (backpack, hotbar, and the paper-doll) draws a row of small
   **diamond pips** at its bottom-left, violet for used and hollow for free.
3. **This biome's arrows** — **Gloamsteel Arrows** (1 Gloamsteel Ingot + 5 Wood → 60).
   Unlike the Sunsteel/Embersteel pair (both make the same plain `arrows`), these are their
   own ammo item and the **Gloamsteel Warbow fires only them**, so the bayou bow has a real
   ammo tier rather than riding the badlands stock.
4. **A bespoke bayou magic weapon — the Gloamdrinker** (3 Gloamsteel Ingot, 2 Blood Gem,
   3 Hex Essence, 2 Moonsilver). Deliberately **not** a reforge of anything, and the only
   weapon with **lifelink**: a new data-driven `WEAPON_LIFELINK_PCT` table heals **12% of
   damage dealt** on every hit (including each arc-swept target) at the same
   `resolveWeaponHit` choke point the Bloodpact ability uses. Always on, costs no relic
   family slot, stacks with Leech/Bloodpact — paid for with 19 damage (below the Gloam
   Brand's 23) and a tighter arc so a wide drain sweep can't trivialize crowds.

Verified live: crafting panel 670 tall with 0 overflowing rows and the detail column
bottoming out at 722 vs a panel bottom of 890 (scroll path exercised by shrinking the panel
— clamps and windows correctly); pips 2-per-item with the right filled count and none on
non-augmentable gear; tooltip reads `0/2`, `2/2` + names, and nothing for a Stone Club;
Gloamdrinker deals 19 and heals 2 (12%) while the Gloam Brand deals 23 and heals 0;
Gloamsteel Warbow refuses to fire with no ammo AND with plain arrows, fires and decrements
10→9 with Gloamsteel Arrows. Zero console errors.

## Deliberately NOT built

- **No bayou content sources.** Bog Ore, Mirehide and the gems have no world source yet —
  they land in Phase 4 with the bayou itself. Test via `__dev.give` (this is the same
  "authored dormant" pattern Phase 2b used).
- **Removable/socketed gems** (explicitly rejected in favor of consumed augments).
- **A third set-bonus mechanic** — the bayou sets reforge the Ember identities rather than
  introducing new ones.
