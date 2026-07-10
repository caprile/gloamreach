# Recipes & Upgrades Dashboard

> **Maintenance note:** this file is a hand-maintained snapshot, not generated.
> Update it whenever `src/systems/Recipes.ts`, `ArmorUpgrades.ts`,
> `StationUpgrades.ts`, `WeaponUpgrades.ts`, or `Processing.ts` change. See
> `CLAUDE.md`'s "Working conventions" section.

"Tier" below means `Recipe.tier` — tier 0 is craftable anywhere, tier 1+
requires standing near a placed Workbench (`MainScene.isNearWorkbench`).

## Recipes (`src/systems/Recipes.ts`)

| Name | Category | Tier | Workbench? | Costs | Required Skills | Output |
|---|---|---|---|---|---|---|
| Stone Axe | Tools | 0 | No | 4 Wood, 4 Stone | Chopping 0 | Tool |
| Stone Pickaxe | Tools | 1 | Yes | 3 Wood, 4 Stone, 1 Leather Scraps | Mining 0 | Tool |
| Torch | Tools | 0 | No | 1 Wood | — | Item |
| Wood Club | Weapons | 0 | No | 4 Wood | — | Item (weapon, blunt) |
| Stone Club | Weapons | 1 | Yes | 3 Wood, 2 Stone, 1 Leather Scraps | Blunt 3 | Item (weapon, blunt) |
| Bone Knife | Weapons | 1 | Yes | 1 Leather Scraps, 4 Bones | — | Item (weapon, slash) |
| Primal Spear | Weapons | 1 | Yes | 4 Wood, 2 Stone, 1 Leather Scraps | — | Item (weapon, pierce) |
| Shishkabob | Misc | 0 | No | 1 Wood | — | Item |
| Campfire | Crafting | 0 | No | 5 Wood, 5 Stone | — | Item (placeable) |
| Workbench | Crafting | 0 | No | 10 Wood | — | Item (placeable) |
| Drying Rack | Crafting | 1 | Yes | 5 Wood, 4 Leather Scraps, 2 Bones | — | Item (placeable, station) |
| Gremlin Cap | Armor | 1 | Yes | 1 Gremlin Leather, 5 Blackberries | Light Armor 0 | Item (armor, helmet) |
| Gremlin Shirt | Armor | 1 | Yes | 3 Gremlin Leather, 1 Leather Scraps, 5 Bones | Light Armor 0 | Item (armor, chest) |
| Gremlin Pants | Armor | 1 | Yes | 2 Gremlin Leather, 2 Leather Scraps, 1 Blackberry | Light Armor 0 | Item (armor, legs) |
| Gremlin Totem | Misc | 1 | Yes | 3 Gremlin Trophy, 1 Wood, 1 Gremlin Guck | — | Item (ritual — summons the Gremlin King at the Boss Altar) |

## Station Upgrades (`src/systems/StationUpgrades.ts`)

| Applies To | Result Tier | Name | Costs | Delta |
|---|---|---|---|---|
| Workbench | 1 ("Lvl 2") | Tool Sharpener | 3 Twine, 5 Wood, 2 Stone | — (unlocks gates only) |

## Armor Upgrades (`src/systems/ArmorUpgrades.ts`)

Base defense values live on the item itself (`ItemDef.armorDefense`); each
upgrade adds `defenseBonus` on top. All three lvl2 upgrades require a nearby
Workbench that has itself reached Tier 1 (the Tool Sharpener upgrade above).

| Item | Base Armor (Lvl 1) | Upgrade | Result Tier | Costs | Extra Gate | Armor After |
|---|---|---|---|---|---|---|
| Gremlin Cap | 2 | Gremlin Cap Lvl 2 | 1 | 1 Gremlin Leather, 1 Blackberry | Workbench Lvl 2 | 4 |
| Gremlin Shirt | 4 | Gremlin Shirt Lvl 2 | 1 | 2 Gremlin Leather, 2 Bones | Workbench Lvl 2 | 7 |
| Gremlin Pants | 3 | Gremlin Pants Lvl 2 | 1 | 1 Gremlin Leather, 1 Leather Scraps | Workbench Lvl 2 | 5 |

Full tier-0 set (all three, unupgraded): **9 armor**. Full tier-1 set (all
three upgraded): **16 armor**. Applied as a flat deduction from incoming
physical damage, floored at 1 (`MainScene.applyDamageToPlayer`).

## Weapon Upgrades (`src/systems/WeaponUpgrades.ts`)

Base damage/cooldown/stamina live in `src/systems/Weapons.ts`. "Lvl 1" is the
base crafted weapon (tier 0); each upgrade below is applied via right-click on
the weapon (backpack or hotbar).

| Weapon | Base Dmg / Cooldown / Stamina | Damage Type | Lvl 2 (tier 1) | Lvl 3 (tier 2) |
|---|---|---|---|---|
| Stone Club | 5 / 550ms / 14 | Blunt | +2 Dmg — 3 Wood, 3 Stone | +2 Dmg — 5 Wood, 5 Stone, 3 Bones |
| Bone Knife | 4 / 350ms / 8 | Slash | +1 Dmg — 5 Bones | +2 Dmg — 8 Bones, 2 Gremlin Guck |
| Primal Spear | 8 / 650ms / 16 | Pierce | +2 Dmg — 3 Wood, 2 Stone, 3 Bones | +3 Dmg — 5 Wood, 4 Stone, 3 Gremlin Guck |

Max damage at Lvl 3: Stone Club 9, Bone Knife 7, Primal Spear 12 (before the
weapon-skill damage multiplier, `Skills.weaponSkillDamageMultiplier`).

## Processing — Drying Rack (`src/systems/Processing.ts`)

| Input | Output | Ratio |
|---|---|---|
| Cattail | Twine | 2 : 1 |
| Gremlin Skin | Gremlin Leather | 1 : 1 |
| Gremlin Blood | Gremlin Guck | 2 : 1 |

Conversion is instant, not over time — the player loads raw input and picks
how much to run via a slider (output-amount based, see `DryingRackMenu.ts`).
