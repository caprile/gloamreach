# B4-P5 — Gear branching, set bonuses → jewelry, pickaxe gate, Gemwright UI

Follow-up to B4-P4, from the user's callouts on weapons/armor/gems. Every decision below was
locked via `AskUserQuestion` before any code was written.

## Why

Three separate problems, one root cause each:

1. **Sunsteel is a dead end.** Gloamsteel reforges from an *Embersteel* piece, so a player who
   skipped the Embersteel tier has no path into bayou-grade gear at all. There is one linear
   chain (Sunsteel → Embersteel → Gloamsteel) where the user wants a route "upgraded straight
   from sunsteel".
2. **Set bonuses are the only thing making one set feel different from another**, and they're
   welded to wearing 3 matching armor pieces — which is what made a single next-tier craft feel
   like a downgrade (fixed in B4-P4, but the coupling remains).
3. **The Gemwright and the Upgrade panel are both doing several unrelated jobs.** Jewelry
   recipes don't say which of Q/E/R they fill, and gem augments live in `UpgradeMenu` next to
   station/armor/weapon upgrades — four concepts, one panel.

## Locked decisions

| # | Decision |
|---|---|
| 1 | **Branching gear**: a bayou-tier set that reforges straight from **Sunsteel/Duskhide**, parallel to Embersteel → Gloamsteel. Both routes are **terminal** — neither feeds the other. |
| 2 | **Full mirror**: 6 armor (3 heavy + 3 light) + 3 weapons, matching the Embersteel tier, so either route is complete. |
| 3 | **Materials**: new set = **Sunsteel Ingot + Bog Ore** (the two plentiful ores); **Gloamsteel = Bog Ore + Moonsilver** (warden-gated). Ember Ore stays Embersteel's own gate, so all four ores have a distinct job. |
| 4 | **The Embersteel route is rewarded with higher raw armor** — the new set lands *between* Embersteel and Gloamsteel. |
| 5 | **Armor carries raw armor only** — no resistances, no stat bonuses. (Already true; nothing to remove.) |
| 6 | **Set bonuses move to jewelry**: the four existing bonuses become **4 craftable Gemwright pieces**, tier-gated so the bayou pair needs the upgraded station. |
| 7 | **Pickaxe gate**: a new Stone Pickaxe upgrade (Sunsteel Ingot + Ironbark, badlands-era) gates **surface Bog Ore only**. Crypt moonsilver/geodes stay warden-gated — no double-locking. |
| 8 | **Moonsilver seams 3 → 4 per vault** (~90 → ~120 supply), since jewelry demand rises with 4 new pieces and Gloamsteel now eats ~18. |
| 9 | **Gem setting moves to a new Gemwright tab**, A+B like the Smelter, **with a preview of the resulting effect**. Gem rows are removed from `UpgradeMenu` entirely. |
| 10 | **Heavy-armor magic mitigation unchanged** (−0.4%/lvl, cap −30%). It already covers magic, fire *and* poison — verified, no work needed. |

## Ore supply (counted, drives decision 3)

| Ore | Nodes | ~Yield | Access |
|---|---|---|---|
| Sunscorch | 90 | ~360 | Open badlands |
| Bog Ore | 46 | ~180 | Open bayou surface — **now pickaxe-gated** |
| Ember Ore | ~58 | ~170 | Scattered veins + Sunken Forges |
| Moonsilver | 36 → **48** | ~90 → **~120** | Crypt vaults, every one behind a warden |

## Work

### 1. The new branch (`Recipes.ts`, `Items.ts`, `Processing.ts`, `BootScene.ts`)
- New smelt recipe: **Mirebronze Ingot** = Sunsteel Ingot + Bog Ore (Smelter).
- **Mirebronze** heavy set (Helm/Cuirass/Greaves) reforging from the Sunsteel pieces;
  **Bogweave** light set (Hood/Vest/Leggings) reforging from Duskhide.
- **Mirebronze Warhammer / Longsword / Pike**, reforging from their Sunsteel counterparts.
- Armor invariant: `Embersteel < Mirebronze < Gloamsteel` per decision 4.
- Gate at the same Workbench tier as Gloamsteel (it is bayou-grade gear).

### 2. Gloamsteel's cost (`Processing.ts`)
- Gloamsteel Ingot's recipe takes **Moonsilver** in place of its current secondary input.

### 3. Set bonuses → jewelry (`SetBonuses.ts`, `Jewelry.ts`, `MainScene.ts`)
- Four new Gemwright recipes, one per existing bonus, tier-gated (bayou pair at station tier 1).
- `activeSets()` stops reading worn ARMOR and reads **equipped jewelry** instead. Every
  MainScene call site (`hasSet`, `moltenDamageReduction`, `emberblinkDashMult`, the thorns
  branch, the burst) keeps working unchanged — only the source of truth moves.

### 4. Pickaxe gate (`ToolUpgrades.ts`, `MainScene.ts`)
- One `TOOL_UPGRADES` row for `stone_pickaxe` → tier 1 (Sunsteel Ingot + Ironbark), mirroring
  the existing `stone_axe_ironshod`, plus `minToolTier: 1` on the Bog Ore scatter.

### 5. Gemwright UI (`JewelryMenu.ts`, `UpgradeMenu.ts`, `MainScene.ts`)
- Every ability-granting recipe shows **which key it fills (Q / E / R)**, read from the item
  def's existing `slot`/`grantsAbility` — derived, never hand-written.
- New **Set Gems** tab: pick gear (A) + pick gem (B), showing the 2-slot cap and a **live
  preview of the effect the gem will apply**. Gem rows deleted from `UpgradeMenu`.

### 6. Moonsilver supply
- `CRYPT_VAULT_SEAM_COUNT` 3 → 4.

## Keep in sync
`RECIPES.md` (every recipe/cost above), the dashboard (recipes come from live modules, but the
Enemies tab is a manual mirror — unaffected here), and `STATUS.md` per its maintenance rules.
