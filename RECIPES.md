# Recipes & Upgrades Dashboard

> **Live HTML dashboard:** run `npm run dev` and open
> [`/dashboard.html`](dashboard.html) for an interactive, always-current version
> of everything below — plus weapon DPS, armor-vs-damage math, relic odds, and a
> Balance Overview tab. It imports the real data modules (`src/dashboard/main.ts`),
> so it never drifts. This markdown file remains a quick static reference.
>
> **Maintenance note:** this file is a hand-maintained snapshot, not generated.
> Update it whenever `src/systems/Recipes.ts`, `ArmorUpgrades.ts`,
> `StationUpgrades.ts`, `WeaponUpgrades.ts`, or `Processing.ts` change. See
> `CLAUDE.md`'s "Working conventions" section. (The dashboard's Enemies tab is the
> one manually-mirrored piece — enemy stats live in Phaser entity subclasses, not
> data tables — so keep that in sync too when tuning enemies.)

"Tier" below means `Recipe.tier` — tier 0 is craftable anywhere, tier 1+
requires standing near a placed Workbench (`MainScene.isNearWorkbench`).

## Recipes (`src/systems/Recipes.ts`)

| Name | Category | Tier | Workbench? | Costs | Required Skills | Output |
|---|---|---|---|---|---|---|
| Woodcutter's Axe | Tools | 0 | No | 4 Wood, 4 Stone | Chopping 0 | Tool |
| Stone Pickaxe | Tools | 1 | Yes | 3 Wood, 4 Stone, 1 Leather Scraps | Mining 0 | Tool |
| Torch | Tools | 0 | No | 1 Wood | — | Item |
| Wood Club | Weapons | 0 | No | 4 Wood | — | Item (weapon, blunt) |
| Stone Club | Weapons | 1 | Yes | 3 Wood, 2 Stone, 1 Leather Scraps | Blunt 3 | Item (weapon, blunt) |
| Bone Knife | Weapons | 1 | Yes | 1 Leather Scraps, 4 Bones | — | Item (weapon, slash) |
| Primal Spear | Weapons | 1 | Yes | 4 Wood, 2 Stone, 1 Leather Scraps | — | Item (weapon, pierce) |
| Slingshot | Weapons | 1 | Yes | 2 Wood, 2 Leather Scraps | — | Item (weapon, ranged — uses the Ammo slot) |
| Slingshot Pellets | Weapons | 0 | No\* | 5 Stone | — | Item x25 (ammo) |
| Javelin | Weapons | 1 | Yes | 3 Wood, 1 Stone | Pierce 5 | Item x2 (weapon, ranged, disposable — self-consuming stack) |
| Shishkabob | Misc | 0 | No | 1 Wood | — | Item x2 |
| Campfire | Crafting | 0 | No | 5 Wood, 5 Stone | — | Item (placeable) |
| Workbench | Crafting | 0 | No | 10 Wood | — | Item (placeable) |
| Bedroll | Crafting | 0 | No | 3 Wood, 5 Cattail | — | Item (placeable — near a lit Campfire + no enemies nearby grants +1 HP/s "Resting") |
| Drying Rack | Crafting | 1 | Yes | 5 Wood, 4 Leather Scraps, 2 Bones | — | Item (placeable, station) |
| Relic Forge | Crafting | 1 | Yes | 10 Stone, 5 Bones, 1 Gremlin Trophy | — | Item (placeable, station — roll relics) |
| Gremlin Cap | Armor | 1 | Yes | 1 Gremlin Leather, 5 Blackberries | Light Armor 0 | Item (armor, helmet) |
| Gremlin Shirt | Armor | 1 | Yes | 3 Gremlin Leather, 1 Leather Scraps, 5 Bones | Light Armor 0 | Item (armor, chest) |
| Gremlin Pants | Armor | 1 | Yes | 2 Gremlin Leather, 2 Leather Scraps, 1 Blackberry | Light Armor 0 | Item (armor, legs) |
| Gremlin Totem | Misc | 1 | Yes | 3 Gremlin Trophy, 1 Wood, 1 Gremlin Guck | — | Item (ritual — summons the Gremlin King at the Boss Altar) |
| Effigy of the Duneshaper | Misc | 1 | Yes | 3 Gloam-Bone Fetish, 2 Gloam Shard, 8 Bones | — | Item (ritual — summons the Duneshaper at a badlands altar; crafting it reveals the altars on the map) |
| Smelter | Crafting | 1 | Yes | 10 Clay, 15 Stone | — | Item (placeable, station — smelts ore into ingots) |
| Sunsteel Helm | Armor | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 2 Cragscale Plate | Heavy Armor 0 | Item (armor, helmet, **heavy**) |
| Sunsteel Cuirass | Armor | 1 | Yes (Lvl 3) | 4 Sunsteel Ingot, 4 Cragscale Plate, 5 Bones | Heavy Armor 0 | Item (armor, chest, **heavy**) |
| Sunsteel Greaves | Armor | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 2 Cragscale Plate, 2 Sandmaw Chitin | Heavy Armor 0 | Item (armor, legs, **heavy**) |
| Duskhide Hood | Armor | 1 | Yes (Lvl 3) | 3 Duskrunner Pelt, 1 Sunsteel Ingot | Light Armor 0 | Item (armor, helmet, light) |
| Duskhide Vest | Armor | 1 | Yes (Lvl 3) | 5 Duskrunner Pelt, 2 Sunsteel Ingot, 3 Bones | Light Armor 0 | Item (armor, chest, light) |
| Duskhide Leggings | Armor | 1 | Yes (Lvl 3) | 3 Duskrunner Pelt, 1 Sunsteel Ingot, 1 Sandmaw Chitin | Light Armor 0 | Item (armor, legs, light) |
| Sunsteel Warhammer | Weapons | 1 | Yes (Lvl 3) | 4 Sunsteel Ingot, 2 Cragscale Plate, 4 Wood | Blunt 3 | Item (weapon, blunt — wide AOE sweep) |
| Sunsteel Longsword | Weapons | 1 | Yes (Lvl 3) | 3 Sunsteel Ingot, 2 Wood | Slash 3 | Item (weapon, slash) |
| Sunsteel Pike | Weapons | 1 | Yes (Lvl 3) | 3 Sunsteel Ingot, 3 Wood | Pierce 3 | Item (weapon, pierce) |
| Embersteel Helm | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Helm, 2 Embersteel Ingot, 2 Cragscale Plate | Heavy Armor 0 | Item (armor, helmet, **heavy** — reforge) |
| Embersteel Cuirass | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Cuirass, 4 Embersteel Ingot, 3 Cragscale Plate | Heavy Armor 0 | Item (armor, chest, **heavy** — reforge) |
| Embersteel Greaves | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Greaves, 2 Embersteel Ingot, 2 Sandmaw Chitin | Heavy Armor 0 | Item (armor, legs, **heavy** — reforge) |
| Emberhide Hood | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Hood, 1 Embersteel Ingot, 2 Duskrunner Pelt | Light Armor 0 | Item (armor, helmet, light — reforge) |
| Emberhide Vest | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Vest, 2 Embersteel Ingot, 3 Duskrunner Pelt | Light Armor 0 | Item (armor, chest, light — reforge) |
| Emberhide Leggings | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Leggings, 1 Embersteel Ingot, 1 Sandmaw Chitin | Light Armor 0 | Item (armor, legs, light — reforge) |
| Embersteel Warhammer | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Warhammer, 3 Embersteel Ingot, 2 Cragscale Plate | Blunt 3 | Item (weapon, blunt — reforge) |
| Embersteel Longsword | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Longsword, 2 Embersteel Ingot, 2 Wood | Slash 3 | Item (weapon, slash — reforge) |
| Embersteel Pike | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Pike, 2 Embersteel Ingot, 2 Wood | Pierce 3 | Item (weapon, pierce — reforge) |
| Ember Brand | Weapons | 1 | Yes (Lvl 4) | 3 Embersteel Ingot, 4 Hex Essence | Magic 0 | Item (weapon, **magic** — first magic weapon) |

The base forged gear (Sunsteel/Duskhide) is **"Yes (Lvl 3)"** — tier 1 (any
Workbench) **plus** `requiresWorkbenchTier: 2` (a Forge-Anvil-upgraded **Workbench
Lvl 3**, see Station Upgrades). Its ingredients come from the Smelter (Sunsteel
Ingot) + normal badlands enemies (Cragscale Plate / Duskrunner Pelt / Sandmaw
Chitin).

The **enhanced/T2 tier** (Embersteel/Emberhide + the Ember Brand) is **"Yes (Lvl
4)"** — `requiresWorkbenchTier: 3` (an Emberforge-Anvil **Workbench Lvl 4**). Each
enhanced piece **reforges its base piece** (the base item is consumed as an
ingredient — it must be **unequipped / in the backpack**) plus Embersteel Ingot
(rare-ore Smelter output). The Ember Brand is the first **magic** weapon,
rare-ore-exclusive; its `magic` hits swing hard through the damage-type resist
layer (super-effective vs most badlands beasts, resisted by Hexlings/the
Duneshaper).

\* Slingshot Pellets is tier 0 (no Workbench needed) but has an extra discovery
gate beyond tier/ingredients: it stays hidden until the player has crafted a
Slingshot at least once (`Recipe.requiresDiscovered`), so it doesn't advertise
ammo before there's a launcher to load it into.

## Station Upgrades (`src/systems/StationUpgrades.ts`)

**No ladder (stations/processors only):** any *discovered* upgrade for a station shows in
its Upgrade panel immediately, in any order — applying one just bumps the station's level
by **+1** (level = count of upgrades applied). Recipes/dishes gate on that level *count*;
material-specificity comes from a recipe's own ingredient discovery (you had to discover
Sunsteel/Embersteel to have the recipe), not from which upgrade was applied. So "any 2
workbench upgrades → forged-gear level" is intended. Worn weapon/armor upgrades keep their
strict ladder. The "toward" column below is a rough guide to the cost tier, **not** a
fixed destination level.

| Applies To | Toward | Name | Costs | Delta |
|---|---|---|---|---|
| Workbench | Lvl 2 | Tool Sharpener | 3 Twine, 5 Wood, 2 Stone | — (unlocks gates only) |
| Workbench | Lvl 3 | Forge Anvil | 5 Sunsteel Ingot, 10 Stone | Unlocks base forged gear (`requiresWorkbenchTier: 2`) |
| Workbench | Lvl 4 | Emberforge Anvil | 5 Embersteel Ingot, 15 Stone | Unlocks enhanced/T2 gear (`requiresWorkbenchTier: 3`) |
| Campfire | Lvl 2 | Stone Hearth | 4 Twine, 20 Stone | Better campfire dishes |
| Campfire | Lvl 3 | Sunsteel Grill | 3 Sunsteel Ingot, 8 Clay, 10 Stone | Better campfire dishes |
| Campfire | Lvl 4 | Emberforge Hearth | 3 Embersteel Ingot, 20 Stone | Best campfire dishes |
| Relic Forge | Lvl 2 | Gloam Conduit | 15 Stone, 1 Gloam Shard | Unlocks the Refine tab |
| Relic Forge | Lvl 3 | Ember Kiln | 3 Embersteel Ingot, 20 Stone | Unlocks Gloam → Ember conversion (Convert tab) |
| Smelter | Lvl 2 | Ember Crucible | 1 Gremlin King's Heart, 10 Stone | Smelt rare Cinderforged Ore → Embersteel Ingot |

Bench visuals change per tier (Workbench Lvl 2/3/4, Smelter Lvl 2 each get a
distinct placeholder sprite). The Emberforge Anvil and Ember Kiln are only
**discoverable** once an Embersteel Ingot has been smelted (their cost key must
be discovered).

## Armor Upgrades (`src/systems/ArmorUpgrades.ts`)

Base defense values live on the item itself (`ItemDef.armorDefense`); each
upgrade's `defenseBonus` is the **cumulative** bonus over base at that tier
(total armor at tier N = base + that tier's `defenseBonus`). Every tier now
adds a flat **+1 armor** — a deliberate flattening of the old single-tier
9→16 leap. All upgrades require a nearby Workbench that has itself reached
Tier 1 (the Tool Sharpener upgrade above).

| Item | Base Armor (Lvl 1) | Upgrade | Result Tier | Costs | Extra Gate | Armor After |
|---|---|---|---|---|---|---|
| Gremlin Cap | 2 | Gremlin Cap Lvl 2 | 1 | 1 Gremlin Leather, 1 Blackberry | Workbench Lvl 2 | 3 |
| Gremlin Cap | 2 | Gremlin Cap Lvl 3 | 2 | 2 Gremlin Leather, 2 Blackberries | Workbench Lvl 2 | 4 |
| Gremlin Shirt | 3 | Gremlin Shirt Lvl 2 | 1 | 2 Gremlin Leather, 2 Bones | Workbench Lvl 2 | 4 |
| Gremlin Shirt | 3 | Gremlin Shirt Lvl 3 | 2 | 3 Gremlin Leather, 3 Bones | Workbench Lvl 2 | 5 |
| Gremlin Pants | 2 | Gremlin Pants Lvl 2 | 1 | 1 Gremlin Leather, 1 Leather Scraps | Workbench Lvl 2 | 3 |
| Gremlin Pants | 2 | Gremlin Pants Lvl 3 | 2 | 2 Gremlin Leather, 2 Leather Scraps | Workbench Lvl 2 | 4 |

Full-set totals: **Lvl 1 = 7 armor**, **Lvl 2 = 10 armor**, **Lvl 3 = 13
armor**. Applied as a flat deduction from incoming physical damage, floored at
1 (`MainScene.applyDamageToPlayer`).

### Forged armor sets (biome 2 Phase 4) — base defense (`ItemDef.armorDefense`)

No right-click ArmorUpgrades — the base sets are enhanced via **standalone T2
reforge recipes** (the enhanced set consumes the base piece — see the crafting
table). **Heavy armor** has a real effect: the `heavy_armor` skill gives partial
**magic/fire mitigation** (−0.4%/level, cap −30%) while wearing ≥1 heavy piece
(`Skills.heavyArmorMagicMitigation`) — its identity vs light armor's dash
i-frames. `heavy_armor` XP accrues per worn piece on a kill.

| Set | Type | Helm | Chest | Legs | Full-set armor |
|---|---|---|---|---|---|
| Sunsteel (base) | Heavy | 4 | 6 | 4 | 14 |
| Embersteel (T2) | Heavy | 7 | 9 | 7 | 23 |
| Duskhide (base) | Light | 3 | 4 | 3 | 10 |
| Emberhide (T2) | Light | 5 | 6 | 5 | 16 |

## Weapon Upgrades (`src/systems/WeaponUpgrades.ts`)

Base damage/cooldown/stamina live in `src/systems/Weapons.ts`. "Lvl 1" is the
base crafted weapon (tier 0); each upgrade below is applied via right-click on
the weapon (backpack or hotbar).

| Weapon | Base Dmg / Cooldown / Stamina | Damage Type | Lvl 2 (tier 1) | Lvl 3 (tier 2) |
|---|---|---|---|---|
| Stone Club | 5 / 550ms / 14 | Blunt | +2 Dmg — 3 Wood, 3 Stone | +2 Dmg — 5 Wood, 5 Stone, 3 Bones |
| Bone Knife | 4 / 350ms / 8 | Slash | +1 Dmg — 3 Bones | +2 Dmg — 8 Bones, 2 Gremlin Guck |
| Primal Spear | 8 / 650ms / 16 | Pierce | +2 Dmg — 3 Wood, 2 Stone, 3 Bones | +3 Dmg — 5 Wood, 4 Stone, 3 Gremlin Guck |

Max damage at Lvl 3: Stone Club 9, Bone Knife 7, Primal Spear 12 (before the
weapon-skill damage multiplier, `Skills.weaponSkillDamageMultiplier`).

### Forged weapons (biome 2 Phase 4) — one per melee damage type

The enhanced (T2) weapons are full standalone recipes that **reforge** the base
weapon (see the crafting table), not right-click upgrades. AOE arc widths in
`Weapons.ts` `WEAPON_ARC`.

| Weapon | Dmg / Cooldown / Stamina | Damage Type | Arc (½angle / range / falloff) |
|---|---|---|---|
| Sunsteel Warhammer | 14 / 800ms / 20 | Blunt | 55° / 62 / 0.75 (widest sweeper) |
| Sunsteel Longsword | 10 / 480ms / 12 | Slash | 30° / 40 / 0.55 |
| Sunsteel Pike | 12 / 620ms / 15 | Pierce | 40° / 56 / 0.65 |
| Embersteel Warhammer | 20 / 800ms / 22 | Blunt | 58° / 66 / 0.78 |
| Embersteel Longsword | 15 / 470ms / 13 | Slash | 32° / 42 / 0.58 |
| Embersteel Pike | 17 / 610ms / 16 | Pierce | 42° / 58 / 0.68 |
| Ember Brand | 14 / 520ms / 15 | **Magic** | 45° / 52 / 0.6 (fire washes over foes) |

The **Ember Brand** is the first magic weapon (rare-ore-exclusive). Its raw 14 is
mid-pack (DPS ≈ the Embersteel Pike on a neutral target), but `magic` type routes
through enemy resistances — **neutral** vs most badlands beasts, **resisted**
(~×0.4–0.5) by the gloam-casters (Hexlings / the Duneshaper). A sidegrade with an
upside, not flatly best — and it finally gives the `magic` weapon skill a real XP
source. (No current badlands enemy is *weak* to magic, so it never crits the
resist layer super-effective — a hook for a future magic-vulnerable enemy.)

## Ranged weapons (`src/systems/Weapons.ts` `RANGED_WEAPONS`)

Deliberately weak to start — an opener/softener, not a solo tool. No weapon-tier
upgrade path yet (not in `WeaponUpgrades.ts`). Both feed the `ranged` weapon
skill (dormant until this pass) via the same `weaponSkillDamageMultiplier`
every melee weapon uses, so leveling it is what turns chip damage into real
damage over a run.

| Weapon | Dmg / Cooldown / Stamina | Projectile Speed | Range | Ammo |
|---|---|---|---|---|
| Slingshot | 2 / 650ms / 6 | 420 px/s | 260px | Slingshot Pellets, loaded into the new **Ammo** equipment slot |
| Javelin | 5 / 900ms / 16 | 300 px/s | 220px | None — the equipped hotbar stack is the ammo (1 consumed per throw) |

Aiming reuses the existing click-a-hovered-enemy-in-reach model (not free-aim),
just with `maxRangePx` above replacing melee's reach.

## Processing — Drying Rack (`src/systems/Processing.ts`)

| Input | Output | Ratio |
|---|---|---|
| Cattail | Twine | 2 : 1 |
| Gremlin Skin | Gremlin Leather | 1 : 1 |
| Gremlin Blood | Gremlin Guck | 2 : 1 |

Conversion is instant, not over time — the player loads raw input and picks
how much to run via a slider (output-amount based, see `DryingRackMenu.ts`).

## Smelting — Smelter (`src/systems/Processing.ts` `SMELT_RECIPES`) — biome 2 Phase 4

`A + B = Ingot`: ore (loaded into the Smelter's input slot) **plus Hex Essence
fuel** consumed from the backpack. Reuses the Drying Rack's menu (same
`ProcessingStation`, tier- and fuel-aware). The rare recipe needs an **Ember
Crucible**–upgraded **Smelter Lvl 2** (`minStationTier: 1`, gated on the Gremlin
King's Heart — see Station Upgrades).

| Ore | Fuel (per ingot) | Output | Ratio | Smelter Tier |
|---|---|---|---|---|
| Sunscorch Ore (common, scattered badlands) | 1 Hex Essence | Sunsteel Ingot | 2 : 1 | Any (Lvl 1) |
| Cinderforged Ore (rare veins + Sunken Forge POI) | 2 Hex Essence | Embersteel Ingot | 2 : 1 | Lvl 2 (Ember Crucible) |

Clay (Smelter build material), Sunscorch Ore, and rare Cinderforged veins are
mineable `mine` nodes scattered in the badlands (Stone Pickaxe, non-respawning).

## Cooking — Campfire (`src/systems/Cooking.ts`)

Multi-ingredient dishes made by interacting with a placed Campfire
(`CookingMenu.ts`). Cooking is instant. A dish's `requiredCampfireTier` gates it
on the campfire's own level (= count of upgrades applied: 0 = any campfire;
1 = Lvl 2; 2 = Lvl 3; 3 = Lvl 4 — see Station Upgrades). The menu groups dishes
into collapsible per-level sections (best on top) and scrolls. Foods are eaten by
right-clicking them in the backpack/hotbar, applying a heal-over-time buff
(`Buffs.ts`, shown in the buff strip above the HP bar). Design rule: each level has
a biome-native "best" dish (no backtracking to farm) plus optional mixed dishes
that spend a plentiful earlier-biome leftover (boar_meat).

| Dish | Campfire | Inputs | Output | Buff |
|---|---|---|---|---|
| Cooked Boar Meat | any | 1 Shishkabob, 1 Boar Meat | Cooked Boar Meat | +2 HP/s for 20s |
| Cooked Snake Meat | any | 1 Shishkabob, 1 Snake Meat | Cooked Snake Meat | +2 HP/s for 22s |
| Bramble-Glazed Boar Skewer | Lvl 2 | 1 Shishkabob, 1 Boar Meat, 2 Blackberries | Bramble-Glazed Boar Skewer | +2.5 HP/s for 20s |
| Blood-Glazed Snake Skewer | Lvl 2 | 1 Shishkabob, 1 Snake Meat, 1 Gremlin Blood | Blood-Glazed Snake Skewer | +2.5 HP/s for 22s |
| Seared Duskrunner Steak | Lvl 3 | 1 Shishkabob, 1 Duskrunner Meat, 1 Dustbloom | Seared Duskrunner Steak | +3 HP/s for 26s |
| Sunfruit-Glazed Ribs | Lvl 3 | 1 Shishkabob, 2 Sunfruit, 1 Boar Meat | Sunfruit-Glazed Ribs | +3 HP/s for 26s |
| Emberbloom Broth | Lvl 3 | 2 Emberbloom, 1 Sunfruit, 1 Gloamcap | Emberbloom Broth | +2.5 HP/s for 34s |
| Sunscorch Feast | Lvl 4 | 1 Shishkabob, 2 Duskrunner Meat, 1 Gloamcap, 1 Sunfruit | Sunscorch Feast | +3.5 HP/s for 30s |
| Ember-Glazed Skewer | Lvl 4 | 1 Shishkabob, 1 Duskrunner Meat, 1 Emberbloom, 1 Boar Meat | Ember-Glazed Skewer | +3.5 HP/s for 28s |

## Relics (`src/systems/Relics.ts`) — M-RL, reworked in Phase 5

**Probabilistic** roll at a placed **Relic Forge** (recipe above). 1 trophy per
attempt → a random relic; a **failed attempt still consumes the trophy**. A
trophy's own **rarity drives an outcome table** over the RESULT rarity (a Common
trophy can roll up to Uncommon/Rare — never Mythic — and can also fail; higher
trophies guarantee at least their own rarity with a chance to roll up). Rarity is
**source-determined by the trophy — not climbable, no manual combine.** The run's
**first roll is a guaranteed success** (the hook); beyond that a per-rarity pity
counter guarantees a base-rarity success after N misses. A separate **power tier**
(biome depth) multiplies a relic's numbers (`POWER_TIER_MULT` ×1.0/1.5/2.25/…) and
**always equals the trophy's tier**. Relics are run-length passives (reset on New
Run), shown in the bottom-left HUD relic bar **and** on a dedicated **Relics
column** in the Inventory panel (Tab) — 8 fixed slots, one per family, so owned
relics don't require opening the Relic Forge or squinting at the HUD strip.

**Phase 5 — family loadout, not stacking.** Every relic belongs to one of 8
**families** (`damage`/`move`/`defense`/`stamina`/`lifesteal`/`vitality`/`crit`/`xp`)
and a player holds **at most one relic per family** (8 relics max). Rolling into a
family already owned compares the two relics (direction-normalized — "lower is
better" stats like stamina cost compare correctly) and resolves automatically
where possible:
- **New relic strictly better** (≥ the old on every shared stat, better on at
  least one) → **auto-replaces**; the displaced relic refunds Gloam/Ember Shards
  (scaled by its own rarity × power tier: Common 1 / Uncommon 2 / Rare 4 / Mythic 8,
  × tier).
- **Old relic strictly better or equal** → the new roll is **auto-declined**; IT
  refunds the shards instead (a "wasted" roll still pays a dividend).
- **Neither dominates** (e.g. a differing secondary stat — one relic wins on
  damage, the other on stamina cost) → **ambiguous**: the Relic Forge menu shows
  a **Keep New / Keep Old** prompt and blocks further rolls until you choose;
  the discarded one still refunds shards.

**Magnitudes were trimmed** this pass (locked decision 8) — every relic's effect
numbers are scaled to ~0.625× their original values (e.g. Common damage
+8%→+5%, Mythic +40%→+25%) so a Tier-1 relic is a modest edge with real headroom
above it (Tier-2 badlands relics, future biomes).

Each elite drops a **unique trophy by species** (Boar → Boar Trophy, Snake →
Snake Trophy, Gremlin/Gremling → Gremlin Trophy — all **Common / Tier 1**;
Duskrunner/Cragscale/Hexling/Sandmaw → their own Common trophy, all **Tier 2**
since Phase 5). Same-rarity trophies always share the Common outcome table +
pity counter, so more elite variety just means more attempts — the badlands
trophies' only difference is the **×1.5 power-tier multiplier** on whatever
relic they produce.

**Outcome odds by trophy rarity** (locked 2026-07-11):

| Trophy rarity | → Common | → Uncommon | → Rare | → Mythic | Fail | Pity (miss cap) |
|---|---|---|---|---|---|---|
| Common | 10% | 2.5% | 1% | — | 86.5% | 12 |
| Uncommon | — | rest (94%) | 5% | 1% | 0% | 8 |
| Rare | — | — | rest (90%) | 10% | 0% | — |

| Trophy | Source | Rarity | Power Tier |
|---|---|---|---|
| Gremlin Trophy | Elite Gremlin/Gremling | Common | 1 |
| Boar Trophy | Elite Boar | Common | 1 |
| Snake Trophy | Elite Snake | Common | 1 |
| Duskrunner Trophy | Elite Duskrunner (badlands) | Common | **2** |
| Cragscale Trophy | Elite Cragscale (badlands) | Common | **2** |
| Hexling Trophy | Elite Hexling (badlands) | Common | **2** |
| Sandmaw Trophy | Elite Sandmaw (badlands) | Common | **2** |
| ~~Gremlin King Fang~~ | — | — | Retired — the King now drops the **Gremlin King's Heart** (a Phase-4 smelting material that upgrades a Smelter to melt rare ore), NOT a relic trophy |
| Refined Trophy | Refinement (Gloaming Vein, Gloam) | Uncommon | 1 (roll-only — never dropped/refined; **capped at Rare, no Mythic**) |
| Ember-Refined Trophy | Refinement (badlands, Ember) | Uncommon | **2** (roll-only; **capped at Rare**) |
| Radiant Trophy | Refinement (scaffold) | Rare | 1 (roll-only — deeper biomes) |

### Trophy refinement — Gloaming Vein / Ember Kiln (Refine tab)

The **Relic Forge's Refine tab** (unlocked once the forge is upgraded to
**Lvl 2** via the Gloam Conduit — see Station Upgrades) spends shards to climb a
raw trophy one rarity up into a **refined trophy** that never crumbles.
**Single-step + terminal**: raw → one up only; refined trophies are never a
refine input (species-agnostic — any mix of same-rarity, same-tier raw
trophies counts). A recipe requires `trophy tier == shard tier`.

Biome 1 (Tier 1) refines with **Gloam Shards** (mined at the Gloaming Vein POI).
Badlands (Tier 2) trophies refine with **Ember Shards** instead — the **Relic
Forge's Convert tab** (unlocked at **Lvl 3**, the **Ember Kiln** upgrade — see
Station Upgrades) renders Gloam Shards down into Ember at a fixed ratio, one
conversion per click, so banking Gloam Shards across the biome-1→2 transition is
a real payoff.

| Refine | Input trophies | Shards | Output | Notes |
|---|---|---|---|---|
| Common → Refined | 3 Common Tier-1 (any species) | 2 Gloam Shard | 1 Refined Trophy (rolls Uncommon) | biome 1 |
| Uncommon → Radiant | 3 Uncommon Tier-1 (any species) | 3 Gloam Shard | 1 Radiant Trophy (rolls Rare) | scaffold — no raw Uncommon source in biome 1 |
| Common (T2) → Ember-Refined | 3 Common Tier-2 badlands (any species) | 2 Ember Shard | 1 Ember-Refined Trophy (rolls Uncommon) | badlands, Phase 5 |

**Gloam → Ember conversion:** 3 Gloam Shards → 1 Ember Shard, at the Relic
Forge's Convert tab.

**Gloaming Vein POI:** ~5 shielded ore nodes (Stone-Pickaxe-gated, non-respawning,
1–2 Gloam Shard each) ringed around the **Gloamwarden** guardian; the nodes stay
un-mineable until it dies. Guardian guaranteed drop: 3–4 Gloam Shard + 1 Refined
Trophy.

Effect numbers below are shown at **Power Tier 1** (biome 1); badlands (Tier 2)
sources multiply every number by ×1.5.

| Rarity | Relics (base effect, ×power-tier mult) | Family |
|---|---|---|
| Common | Warrior's Charm (+5% dmg) · Swift Charm (+5% move) · Stoneskin Charm (−5% dmg taken) · Tireless Charm (−8% stamina cost) · Bloodroot Charm (+1 HP/kill) · Stout Charm (+9% max HP) · Keen Charm (+3% crit chance) | damage · move · defense · stamina · lifesteal · vitality · crit |
| Uncommon | Warrior's Idol (+10% dmg) · Swift Idol (+10% move) · Ironhide Idol (−9% dmg taken) · Vigor Idol (+13% HP, +11% stam) · Sanguine Idol (+3 HP/kill) · Scholar's Idol (+16% skill XP) · Savage Idol (+0.19× crit dmg) | damage · move · defense · vitality · lifesteal · xp · crit |
| Rare | War Totem (+16% dmg, −8% stamina) · Phantom Totem (+14% move, −8% dmg taken) · Titan Totem (+25% HP, +19% stam) · Reaper Totem (+5 HP/kill, +9% dmg) | damage · move · vitality · lifesteal |
| Mythic | Gremlin King's Wrath (+25% dmg, +11% move) · Undying Heart (+9 HP/kill, −14% dmg taken) · Avatar's Mantle (+19% dmg, +16% move, −13% stamina) | damage · defense · damage |

A dual-stat relic (e.g. War Totem) claims one **primary** family; its secondary
stat only matters when comparing against a same-family contender.
