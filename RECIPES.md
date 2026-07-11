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
| Bedroll | Crafting | 0 | No | 3 Wood, 5 Cattail | — | Item (placeable — near a lit Campfire + no enemies nearby grants +1 HP/s "Resting") |
| Drying Rack | Crafting | 1 | Yes | 5 Wood, 4 Leather Scraps, 2 Bones | — | Item (placeable, station) |
| Relic Forge | Crafting | 1 | Yes | 10 Stone, 5 Bones, 1 Gremlin Trophy | — | Item (placeable, station — roll/combine relics) |
| Gremlin Cap | Armor | 1 | Yes | 1 Gremlin Leather, 5 Blackberries | Light Armor 0 | Item (armor, helmet) |
| Gremlin Shirt | Armor | 1 | Yes | 3 Gremlin Leather, 1 Leather Scraps, 5 Bones | Light Armor 0 | Item (armor, chest) |
| Gremlin Pants | Armor | 1 | Yes | 2 Gremlin Leather, 2 Leather Scraps, 1 Blackberry | Light Armor 0 | Item (armor, legs) |
| Gremlin Totem | Misc | 1 | Yes | 3 Gremlin Trophy, 1 Wood, 1 Gremlin Guck | — | Item (ritual — summons the Gremlin King at the Boss Altar) |

## Station Upgrades (`src/systems/StationUpgrades.ts`)

| Applies To | Result Tier | Name | Costs | Delta |
|---|---|---|---|---|
| Workbench | 1 ("Lvl 2") | Tool Sharpener | 3 Twine, 5 Wood, 2 Stone | — (unlocks gates only) |
| Campfire | 1 ("Lvl 2") | Stone Hearth | 4 Twine, 20 Stone | Unlocks Lvl 2 campfire dishes |

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

## Cooking — Campfire (`src/systems/Cooking.ts`)

Multi-ingredient dishes made by interacting with a placed Campfire
(`CookingMenu.ts`). Cooking is instant. A dish's `requiredCampfireTier` gates it
on the campfire's own upgrade tier (0 = any campfire; 1 = a "Stone Hearth"–
upgraded Lvl 2 campfire). Foods are eaten by right-clicking them in the
backpack/hotbar, applying a heal-over-time buff (`Buffs.ts`, shown in the buff
strip above the HP bar).

| Dish | Campfire Tier | Inputs | Output | Buff |
|---|---|---|---|---|
| Cooked Boar Meat | 0 (any) | 1 Shishkabob, 1 Boar Meat | Cooked Boar Meat | +2 HP/s for 20s |
| Bramble-Glazed Boar Skewer | 1 (Lvl 2) | 1 Shishkabob, 1 Boar Meat, 2 Blackberries | Bramble-Glazed Boar Skewer | +3 HP/s for 30s |

## Relics (`src/systems/Relics.ts`) — M-RL

**Probabilistic** roll at a placed **Relic Forge** (recipe above). 1 trophy per
attempt → a random relic from that trophy's rarity pool, **but only on success**;
a **failed attempt still consumes the trophy**. Success chance is set by rarity;
a **per-rarity pity counter** guarantees a success after N consecutive misses.
Rarity is **source-determined by the trophy — not climbable, no manual combine.**
A separate **power tier** (biome depth) multiplies a relic's numbers
(`POWER_TIER_MULT` ×1.0/1.5/2.25/… — flat ×1.0 this milestone). Rolling a relic
you already own (same id + power tier) **auto-stacks** (×N, aggregated effects).
Relics are run-length passives (reset on New Run), shown in the bottom-left HUD
relic bar.

| Trophy | Rarity | Power Tier | Success Chance | Pity (miss cap) |
|---|---|---|---|---|
| Gremlin Trophy | Common | 1 | 5% | 15 |
| Gremlin King Fang | Rare | 1 | 100% | — (dormant: boss = win) |

Uncommon (10%, pity 8) and Mythic pools + power tiers ≥2 are scaffolding — no
trophy source feeds them until M-W1.

| Rarity | Relics (base effect, ×power-tier mult) |
|---|---|
| Common | Warrior's Charm (+8% dmg) · Swift Charm (+8% move) · Stoneskin Charm (−8% dmg taken) · Tireless Charm (−12% stamina cost) · Bloodroot Charm (+2 HP/kill) · Stout Charm (+15 max HP) |
| Uncommon | Warrior's Idol (+16% dmg) · Swift Idol (+16% move) · Ironhide Idol (−14% dmg taken) · Vigor Idol (+25 HP, +20 stam) · Sanguine Idol (+4 HP/kill) · Scholar's Idol (+25% skill XP) |
| Rare | War Totem (+26% dmg, −12% stamina) · Phantom Totem (+22% move, −12% dmg taken) · Titan Totem (+50 HP, +35 stam) · Reaper Totem (+8 HP/kill, +14% dmg) |
| Mythic | Gremlin King's Wrath (+40% dmg, +18% move) · Undying Heart (+15 HP/kill, −22% dmg taken) · Avatar's Mantle (+30% dmg, +25% move, −20% stamina) |
