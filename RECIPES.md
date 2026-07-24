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
| Woodcutter's Axe | Tools | 0 | No | 4 Wood, 3 Stone | Chopping 0 | Tool |
| Stone Pickaxe | Tools | 1 | Yes | 3 Wood, 3 Stone, 1 Leather Scraps | Mining 0 | Tool |
| Torch | Tools | 0 | No | 1 Wood | — | Item |
| Wood Club | Weapons | 0 | No | 4 Wood | — | Item (weapon, blunt) |
| Stone Club | Weapons | 1 | Yes | 3 Wood, 2 Stone, 1 Leather Scraps | Blunt 3 | Item (weapon, blunt) |
| Bone Knife | Weapons | 1 | Yes | 1 Leather Scraps, 4 Bones | — | Item (weapon, slash) |
| Primal Spear | Weapons | 1 | Yes | 4 Wood, 2 Stone, 1 Leather Scraps | — | Item (weapon, pierce) |
| Slingshot | Weapons | 1 | Yes | 2 Wood, 2 Leather Scraps | — | Item (weapon, ranged — no ammo) |
| Javelin | Weapons | 1 | Yes | 3 Wood, 1 Stone | Pierce 5 | Item x2 (weapon, ranged, disposable — self-consuming stack) |
| Sunsteel Warbow | Weapons | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 3 Ironbark, 2 Duskrunner Pelt | Ranged 0 | Item (weapon, ranged — no ammo) |
| Shishkabob | Misc | 0 | No | 1 Wood | — | Item x2 |
| Campfire | Crafting | 0 | No | 5 Wood, 2 Stone | — | Item (placeable) |
| Workbench | Crafting | 0 | No | 10 Wood | — | Item (placeable) |
| Bedroll | Crafting | 0 | No | 3 Wood, 5 Cattail | — | Item (placeable — near a lit Campfire + no enemies nearby grants +1 HP/s "Resting") |
| Drying Rack | Crafting | 1 | Yes | 5 Wood, 4 Leather Scraps, 2 Bones | — | Item (placeable, station) |
| Relic Forge | Crafting | 1 | Yes | 7 Stone, 5 Bones, 1 Gremlin Trophy | — | Item (placeable, station — roll relics) |
| Gremlin Cap | Armor | 1 | Yes | 1 Gremlin Leather, 5 Blackberries | Light Armor 0 | Item (armor, helmet) |
| Gremlin Shirt | Armor | 1 | Yes | 3 Gremlin Leather, 1 Leather Scraps, 5 Bones | Light Armor 0 | Item (armor, chest, **heavy** — the earliest heavy piece; Cap/Pants stay light) |
| Gremlin Pants | Armor | 1 | Yes | 2 Gremlin Leather, 2 Leather Scraps, 1 Blackberry | Light Armor 0 | Item (armor, legs) |
| Gremlin Totem | Misc | 1 | Yes | 3 Gremlin Trophy, 1 Wood, 1 Gremlin Guck | — | Item (ritual — summons the Gremlin King at the Boss Altar) |
| Effigy of the Duneshaper | Misc | 1 | Yes | 3 Gloam-Bone Totem, 2 Gloam Shard, 8 Bones | — | Item (ritual — summons the Duneshaper at a badlands altar; crafting it reveals the altars on the map) |
| Effigy of the Miretyrant | Misc | 1 | Yes | 2 Tyrant Sigil, 1 Gorge Bone, 4 Mirehide | — | Item (ritual — unseals the Sunken Gorge, the bayou final boss's lair; crafting it reveals the Gorge on the map) |
| Smelter | Crafting | 1 | Yes | 10 Clay, 10 Stone | — | Item (placeable, station — smelts ore into ingots) |
| Gemwright's Table | Crafting | 1 | Yes | 4 Moonsilver, 10 Stone | — | Item (placeable, station — crafts jewelry; **biome-3 dormant**, needs Moonsilver) |
| Sunsteel Helm | Armor | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 2 Cragscale Plate | Heavy Armor 0 | Item (armor, helmet, **heavy**) |
| Sunsteel Cuirass | Armor | 1 | Yes (Lvl 3) | 4 Sunsteel Ingot, 4 Cragscale Plate, 5 Bones | Heavy Armor 0 | Item (armor, chest, **heavy**) |
| Sunsteel Greaves | Armor | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 2 Cragscale Plate, 2 Sandmaw Chitin | Heavy Armor 0 | Item (armor, legs, **heavy**) |
| Duskhide Hood | Armor | 1 | Yes (Lvl 3) | 4 Duskrunner Pelt, 1 Sandmaw Chitin | Light Armor 0 | Item (armor, helmet, light — no metal) |
| Duskhide Vest | Armor | 1 | Yes (Lvl 3) | 6 Duskrunner Pelt, 3 Bones, 2 Sandmaw Chitin | Light Armor 0 | Item (armor, chest, light — no metal) |
| Duskhide Leggings | Armor | 1 | Yes (Lvl 3) | 4 Duskrunner Pelt, 2 Sandmaw Chitin | Light Armor 0 | Item (armor, legs, light — no metal) |
| Sunsteel Warhammer | Weapons | 1 | Yes (Lvl 3) | 4 Sunsteel Ingot, 2 Cragscale Plate, 4 Wood | Blunt 3 | Item (weapon, blunt — wide AOE sweep) |
| Sunsteel Longsword | Weapons | 1 | Yes (Lvl 3) | 3 Sunsteel Ingot, 2 Wood | Slash 3 | Item (weapon, slash) |
| Sunsteel Pike | Weapons | 1 | Yes (Lvl 3) | 3 Sunsteel Ingot, 3 Wood | Pierce 3 | Item (weapon, pierce) |
| Embersteel Helm | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Helm, 2 Embersteel Ingot, 2 Cragscale Plate, 1 Hex Essence | Heavy Armor 0 | Item (armor, helmet, **heavy** — reforge) |
| Embersteel Cuirass | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Cuirass, 4 Embersteel Ingot, 3 Cragscale Plate, 4 Bones, 2 Hex Essence | Heavy Armor 0 | Item (armor, chest, **heavy** — reforge) |
| Embersteel Greaves | Armor | 1 | Yes (Lvl 4) | 1 Sunsteel Greaves, 2 Embersteel Ingot, 2 Sandmaw Chitin, 2 Cragscale Plate, 1 Hex Essence | Heavy Armor 0 | Item (armor, legs, **heavy** — reforge) |
| Emberhide Hood | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Hood, 1 Embersteel Ingot, 2 Duskrunner Pelt, 1 Sandmaw Chitin, 1 Hex Essence | Light Armor 0 | Item (armor, helmet, light — reforge) |
| Emberhide Vest | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Vest, 2 Embersteel Ingot, 3 Duskrunner Pelt, 2 Sandmaw Chitin, 3 Bones, 1 Hex Essence | Light Armor 0 | Item (armor, chest, light — reforge) |
| Emberhide Leggings | Armor | 1 | Yes (Lvl 4) | 1 Duskhide Leggings, 1 Embersteel Ingot, 1 Sandmaw Chitin, 2 Duskrunner Pelt, 1 Hex Essence | Light Armor 0 | Item (armor, legs, light — reforge) |
| Embersteel Warhammer | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Warhammer, 3 Embersteel Ingot, 4 Ironbark, 2 Cragscale Plate, 2 Hex Essence | Blunt 3 | Item (weapon, blunt — reforge) |
| Embersteel Longsword | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Longsword, 2 Embersteel Ingot, 2 Ironbark, 2 Sandmaw Chitin, 2 Hex Essence | Slash 3 | Item (weapon, slash — reforge) |
| Embersteel Pike | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Pike, 2 Embersteel Ingot, 3 Ironbark, 2 Cragscale Plate, 2 Hex Essence | Pierce 3 | Item (weapon, pierce — reforge) |
| Embersteel Warbow | Weapons | 1 | Yes (Lvl 4) | 1 Sunsteel Warbow, 3 Embersteel Ingot, 3 Ironbark, 2 Duskrunner Pelt, 2 Hex Essence | Ranged 0 | Item (weapon, ranged — reforge) |
| Ember Brand | Weapons | 1 | Yes (Lvl 4) | 3 Embersteel Ingot, 4 Hex Essence, 2 Ironbark | Magic 0 | Item (weapon, **magic** — first magic weapon) |
| Gloamsteel Helm | Armor | 1 | Yes (Lvl 5) | 1 Embersteel Helm, 2 Gloamsteel Ingot, 2 Mirehide, 1 Gloam Gem | Heavy Armor 0 | Item (armor, helmet, **heavy** — reforge) |
| Gloamsteel Cuirass | Armor | 1 | Yes (Lvl 5) | 1 Embersteel Cuirass, 4 Gloamsteel Ingot, 3 Mirehide, 3 Cragscale Plate, 1 Gloam Gem | Heavy Armor 0 | Item (armor, chest, **heavy** — reforge) |
| Gloamsteel Greaves | Armor | 1 | Yes (Lvl 5) | 1 Embersteel Greaves, 2 Gloamsteel Ingot, 3 Mirehide, 1 Gloam Gem | Heavy Armor 0 | Item (armor, legs, **heavy** — reforge) |
| Mirehide Hood | Armor | 1 | Yes (Lvl 5) | 1 Emberhide Hood, 3 Mirehide, 1 Gloamsteel Ingot, 1 Blood Gem | Light Armor 0 | Item (armor, helmet, light — reforge) |
| Mirehide Vest | Armor | 1 | Yes (Lvl 5) | 1 Emberhide Vest, 5 Mirehide, 2 Gloamsteel Ingot, 3 Duskrunner Pelt, 1 Blood Gem | Light Armor 0 | Item (armor, chest, light — reforge) |
| Mirehide Leggings | Armor | 1 | Yes (Lvl 5) | 1 Emberhide Leggings, 3 Mirehide, 1 Gloamsteel Ingot, 1 Blood Gem | Light Armor 0 | Item (armor, legs, light — reforge) |
| Gloamsteel Warhammer | Weapons | 1 | Yes (Lvl 5) | 1 Embersteel Warhammer, 3 Gloamsteel Ingot, 4 Ironbark, 1 Ember Gem | Blunt 0 | Item (weapon, blunt — reforge) |
| Gloamsteel Longsword | Weapons | 1 | Yes (Lvl 5) | 1 Embersteel Longsword, 2 Gloamsteel Ingot, 2 Mirehide, 1 Ember Gem | Slash 0 | Item (weapon, slash — reforge) |
| Gloamsteel Pike | Weapons | 1 | Yes (Lvl 5) | 1 Embersteel Pike, 2 Gloamsteel Ingot, 3 Ironbark, 1 Ember Gem | Pierce 0 | Item (weapon, pierce — reforge) |
| Gloamsteel Warbow | Weapons | 1 | Yes (Lvl 5) | 1 Embersteel Warbow, 3 Gloamsteel Ingot, 3 Mirehide, 1 Ember Gem | Ranged 0 | Item (weapon, ranged — reforge) |
| Gloam Brand | Weapons | 1 | Yes (Lvl 5) | 1 Ember Brand, 3 Gloamsteel Ingot, 4 Hex Essence, 2 Gloam Gem | Magic 0 | Item (weapon, **magic** — reforge) |
| Gloamdrinker | Weapons | 1 | Yes (Lvl 5) | 3 Gloamsteel Ingot, 2 Blood Gem, 3 Hex Essence, 2 Moonsilver | Magic 0 | Item (weapon, **magic** — bespoke, **not** a reforge) |

The **bayou (Gloamsteel/Mirehide) tier is now FULLY sourced.** **Bog Ore** is
surface-mineable in the bayou (Phase 4a) and **Mirehide** drops from the
**Mirejaw** — and ONLY the Mirejaw (Phase 4b, locked: hunting the gator IS the
reforge gate). As of **Phase 4c** the last two dormant materials have a source:
the **3 ability gems + Moonsilver** are **Sunken Crypt** loot, per the locked
surface/dungeon split (surface = bulk gathering under threat, dungeon =
build-defining materials). Each crypt is themed to ONE gem and holds it as
**shielded geodes in its vault**, un-mineable until that crypt's bespoke warden
(Palewake / Kilnborn / Sanguinarch) is killed; **Moonsilver** comes from vault
seams behind the same gate, plus the crypt's side-room chest. Every one of the 11
reforges consumes its Ember-tier counterpart (roadmap locked decision 6: no fresh
base sets in biome 3).

The base forged gear (Sunsteel/Duskhide) is **"Yes (Lvl 3)"** — tier 1 (any
Workbench) **plus** `requiresWorkbenchTier: 2` (a Forge-Anvil-upgraded **Workbench
Lvl 3**, see Station Upgrades). Its ingredients come from the Smelter (Sunsteel
Ingot) + normal badlands enemies (Cragscale Plate / Duskrunner Pelt / Sandmaw
Chitin).

The **enhanced/T2 tier** (Embersteel/Emberhide + the Ember Brand) is **"Yes (Lvl
4)"** — `requiresWorkbenchTier: 3` (an Emberforge-Anvil **Workbench Lvl 4**). Each
enhanced piece **reforges its base piece** (the base item is consumed as an
ingredient — it must be **unequipped / in the backpack**) plus Embersteel Ingot
(rare-ore Smelter output). As of S8 each enhanced recipe also carries its
**precursor's secondary materials** (Cragscale Plate / Duskrunner Pelt / Sandmaw
Chitin / Bones), upgrades any plain `Wood` haft to **Ironbark**, and adds a bit
of **Hex Essence** as the ember-temper agent — so ember gear reads as its
Sunsteel/Duskhide base plus the ember upgrade, not just "base + ingot." The Ember Brand is the first **magic** weapon,
rare-ore-exclusive; its `magic` hits swing hard through the damage-type resist
layer (super-effective vs most badlands beasts, resisted by Hexlings/the
Duneshaper).


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
| Workbench | Lvl 3 | Forge Anvil | 5 Sunsteel Ingot, 5 Ironbark, 7 Stone | Unlocks base forged gear (`requiresWorkbenchTier: 2`) |
| Workbench | Lvl 4 | Emberforge Anvil | 5 Embersteel Ingot, 8 Ironbark, 10 Stone | Unlocks enhanced/T2 gear (`requiresWorkbenchTier: 3`) |
| Workbench | Lvl 5 | Gloamforge Anvil | 5 Gloamsteel Ingot, 6 Mirehide, 3 Moonsilver | Unlocks the bayou reforge tier (`requiresWorkbenchTier: 4`) — **biome-3 dormant** |
| Campfire | Lvl 2 | Stone Hearth | 4 Twine, 13 Stone | Better campfire dishes |
| Campfire | Lvl 3 | Sunsteel Grill | 3 Sunsteel Ingot, 8 Clay, 7 Stone | Better campfire dishes |
| Campfire | Lvl 4 | Emberforge Hearth | 3 Embersteel Ingot, 13 Stone | Best campfire dishes |
| Relic Forge | Lvl 2 | Gloam Conduit | 10 Stone, 1 Gloam Shard | Unlocks the Refine tab |
| Relic Forge | Lvl 3 | Ember Kiln | 3 Embersteel Ingot, 13 Stone | Unlocks Gloam → Ember conversion (Convert tab) |
| Relic Forge | Lvl 4 | Mire Crucible | 3 Gloamsteel Ingot, 16 Stone | Unlocks Ember → Mire conversion + tier-3 refining |
| Stone Pickaxe | Lvl 2 | Ironshod Pickaxe | 2 Sunsteel Ingot, 4 Ironbark | **Mines Bog Ore** (badlands-crafted gate on the bayou's metal economy) |
| Smelter | Lvl 2 | Ember Crucible | 1 Gremlin King's Heart, 7 Stone | Smelt rare Cinderforged Ore → Embersteel Ingot |
| Gemwright's Table | Lvl 2 | Gloamheart Setting | 1 Duneshaper's Heart, 3 Moonsilver | Unlocks ability-jewelry (Q/E/R specials) — **biome-3 dormant** (the Duneshaper's Heart is only reachable once biome 3 demotes the Duneshaper from win-boss) |

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

Two progression axes: (1) the base sets **reforge** into the T2 sets via
standalone recipes (the enhanced set consumes the base piece — see the crafting
table), and (2) **every** forged piece — base AND T2 — gets **two right-click
armor levels**, sunk in ingots (the user: a use for the ingot stockpile).
**Heavy armor** has a real effect: the `heavy_armor` skill gives partial
**magic/fire mitigation** (−0.4%/level, cap −30%) while wearing ≥1 heavy piece —
its identity vs light armor's dash i-frames. `heavy_armor` XP accrues per worn
piece on a kill.

**Retuned 2026-07-23** (the user: "the armor differences between the armor types
is just weird… enemies are doing like 50-100 damage and I'm seeing like 1-3 armor
point difference between sets"). Heavy went up and light came down so the CHOICE
is legible, while the per-tier total stayed close to where it was — deliberately
NOT inflating the ceiling, because the previous session had just bumped the
Miretyrant's damage specifically so armor stopped nullifying it. Heavy/light gaps
are now 12 / 17 / 26 / 23 by tier instead of 5 / 9 / 12 / 10.

| Set | Type | Helm | Chest | Legs | Full-set (Lvl 1 → Lvl 3) |
|---|---|---|---|---|---|
| Sunsteel (base) | Heavy | 8 | 8 | 8 | 24 → 36 |
| Embersteel (T2) | Heavy | 12 | 14 | 12 | 38 → 56 |
| Duskhide (base) | Light | 4 | 4 | 4 | 12 → 18 |
| Emberhide (T2) | Light | 7 | 7 | 7 | 21 → 30 |
| Gloamsteel (bayou) | Heavy | 16 | 18 | 16 | 50 → 74 |
| Mirehide (bayou) | Light | 8 | 8 | 8 | 24 → 36 |

Forged-piece upgrade costs: base (Sunsteel/Duskhide) Lvl 2 = **2 Sunsteel Ingot**,
Lvl 3 = **3 Sunsteel Ingot** (needs Workbench Lvl 3). T2 (Embersteel/Emberhide)
Lvl 2 = **2 Embersteel Ingot**, Lvl 3 = **3 Embersteel Ingot** (needs Workbench
Lvl 4). Bayou (Gloamsteel/Mirehide) uses Gloamsteel Ingot at Workbench Lvl 5.

The per-level bonus is **per set** (~25% of the piece), not a flat +1 — a flat +1
on a 14-armor Embersteel Cuirass was a rounding error for 2-3 rare ingots
(the user: "+1 armor for upgrade for embersteel feels really bad"):

| Set | Lvl 2 | Lvl 3 (cumulative over base) |
|---|---|---|
| Sunsteel | +2 | +4 |
| Duskhide | +1 | +2 |
| Embersteel | +3 | +6 |
| Emberhide | +2 | +3 |
| Gloamsteel | +4 | +8 |
| Mirehide | +2 | +4 |

Note a fully-upgraded lower-tier piece can now match or slightly exceed a *bare*
next-tier base — that's intended laddering (the next tier's ceiling is always
higher), and replaces the old "base ember always beats a Lvl-3 steel" rule.

## Weapon Upgrades (`src/systems/WeaponUpgrades.ts`)

Base damage/cooldown/stamina live in `src/systems/Weapons.ts`. "Lvl 1" is the
base crafted weapon (tier 0); each upgrade below is applied via right-click on
the weapon (backpack or hotbar).

| Weapon | Base Dmg / Cooldown / Stamina | Damage Type | Lvl 2 (tier 1) | Lvl 3 (tier 2) |
|---|---|---|---|---|
| Stone Club | 5 / 550ms / 14 | Blunt | +2 Dmg — 3 Wood, 3 Stone | +2 Dmg — 5 Wood, 5 Stone, 3 Bones |
| Bone Knife | 4 / 350ms / 8 | Slash | +1 Dmg — 3 Bones | +2 Dmg — 8 Bones, 2 Gremlin Guck |
| Primal Spear | 8 / 650ms / 16 | Pierce | +2 Dmg — 3 Wood, 2 Stone, 3 Bones | +3 Dmg — 5 Wood, 4 Stone, 3 Gremlin Guck |

Max damage at Lvl 3: Stone Club 9, Bone Knife 7, Primal Spear 13 (before the
weapon-skill damage multiplier, `Skills.weaponSkillDamageMultiplier`). The base
forged (Sunsteel) weapons all clear this 13, so freshly-forged gear always
out-hits a fully-upgraded starter weapon.

### Forged weapons (biome 2 Phase 4) — one per melee damage type

The enhanced (T2) weapons **reforge** the base weapon (full standalone recipes,
see the crafting table). On top of that, **every** forged weapon — Sunsteel,
Embersteel, Mirebronze, Gloamsteel, both brands and all three Warbows — gets
**two right-click damage levels**
(`+2` then `+2`, = **+4 damage at Lvl 3**): Lvl 2 = 2 ingot, Lvl 3 = 3 ingot
(Sunsteel Ingot for the base weapons, Embersteel Ingot for the T2 + Ember Brand,
Mirebronze/Gloamsteel Ingot for their own tiers). The **Sunsteel/Embersteel
Warbows, all three Mirebronze weapons, and the whole Mirebronze + Bogweave armor
sets were missing their upgrades entirely** until 2026-07-23 — one registration
omission repeated across the Sunsteel branch and the bows, so a ranged or
Sunsteel-branch build's gear dead-ended at base while every other forged set had
two levels. Mirebronze armor is +3/+7 (helm, greaves), +4/+8 (cuirass); Bogweave
is +2/+3 per piece; both cost Mirebronze Ingots at Workbench Lvl 4, matching
their own craft recipes. Only `wood_club`, `slingshot` and `javelin` now have no
upgrade path, which is deliberate — they are tier-0 starters meant to be
superseded.
Tuned so a base (Lvl 1) ember weapon out-damages a fully-upgraded (Lvl 3) steel
one. Stamina costs were also bumped so each tier is a clear step up (the user):
starter < Sunsteel < Ember. AOE arc widths in `Weapons.ts` `WEAPON_ARC`.

| Weapon | Dmg / Cooldown / Stamina | Damage Type | Arc (½angle / range / falloff) |
|---|---|---|---|
| Sunsteel Warhammer | 17 / 800ms / 22 | Blunt | 55° / 62 / 0.75 (widest sweeper) |
| Sunsteel Longsword | 14 / 480ms / 15 | Slash | 30° / 40 / 0.55 |
| Sunsteel Pike | 15 / 620ms / 18 | Pierce | 40° / 56 / 0.65 |
| Embersteel Warhammer | 23 / 800ms / 27 | Blunt | 58° / 66 / 0.78 |
| Embersteel Longsword | 19 / 470ms / 18 | Slash | 32° / 42 / 0.58 |
| Embersteel Pike | 20 / 610ms / 22 | Pierce | 42° / 58 / 0.68 |
| Ember Brand | 17 / 520ms / 19 | **Magic** | 45° / 52 / 0.6 (fire washes over foes) |
| Gloamsteel Warhammer | 30 / 800ms / 31 | Blunt | 44° / 54 / 0.58 |
| Gloamsteel Longsword | 25 / 470ms / 21 | Slash | 64° / 74 / 0.8 |
| Gloamsteel Pike | 32 / 610ms / 25 | Pierce | 24° / 38 / 0.44 |
| Gloamdrinker | 19 / 560ms / 20 | **Magic** | 34° / 46 / 0.5 — **12% lifelink on every hit** |
| Gloam Brand | 23 / 520ms / 22 | **Magic** | 46° / 54 / 0.62 |

The **Ember Brand** is the first magic weapon (rare-ore-exclusive). Its raw 17 is
mid-pack (DPS ≈ the Embersteel Pike on a neutral target), but `magic` type routes
through enemy resistances — **neutral** vs most badlands beasts, **resisted**
(~×0.4–0.5) by the gloam-casters (Hexlings / the Duneshaper). A sidegrade with an
upside, not flatly best — and it finally gives the `magic` weapon skill a real XP
source. (No current badlands enemy is *weak* to magic, so it never crits the
resist layer super-effective — a hook for a future magic-vulnerable enemy.)

## Tool Upgrades (`src/systems/ToolUpgrades.ts`)

Tools upgrade in place exactly like weapons — right-click the tool (backpack or
hotbar) → Upgrade panel. The upgrade bumps the tool stack's `tier`, which gates
felling higher-hardness nodes (a node's `ResourceNode.minToolTier` vs the
equipped tool's `tier`). The world prompt still shows `[LMB] Chop` with any
correct-**kind** tool (never reveals the tier) — a too-weak axe just bounces off.

| Tool | Toward | Name | Costs | Delta |
|---|---|---|---|---|
| Woodcutter's Axe | Lvl 2 (tier 1) | Ironshod Woodcutter's Axe | 2 Sunsteel Ingot, 6 Stone | Fells Ironbark trees |

Discoverable once **Sunsteel Ingot** is known (i.e. the badlands' basic ore has
been smelted), so the axe upgrade is the bridge from smelting into the Ironbark
supply. Ironbark then feeds the **Forge Anvil** / **Emberforge Anvil** Workbench
upgrades and the **Embersteel Warhammer / Pike** reforges (see those tables) —
making the axe upgrade a genuine prerequisite for the forged tier, not optional.

## Ranged weapons (`src/systems/Weapons.ts` `RANGED_WEAPONS`)

The starter launchers (Slingshot/Javelin) are deliberately weak — an opener/
softener, not a solo tool — with no right-click tier path. The **Warbows** (S8)
are the forged badlands ranged tier: a real step up in reach and damage, still
below forged melee since range is the trade. No right-click tier path on the bows
either — the Sunsteel → Embersteel **reforge** is their upgrade. All feed the
`ranged` weapon skill via the same `weaponSkillDamageMultiplier` every melee
weapon uses, so leveling it turns chip damage into real damage over a run.

| Weapon | Dmg / Cooldown / Stamina | Projectile Speed | Range | Firing cost |
|---|---|---|---|---|
| Slingshot | 2 / 650ms / 6 | 420 px/s | 260px | None |
| Javelin | 5 / 900ms / 16 | 300 px/s | 220px | Self — the equipped hotbar stack IS the projectile (1 per throw) |
| Sunsteel Warbow | 11 / 750ms / 12 | 600 px/s | 380px | None |
| Embersteel Warbow | 15 / 730ms / 15 | 640 px/s | 400px | None |
| Gloamsteel Warbow | 20 / 720ms / 12 | 680 px/s | 420px | None |

**Consumable ammo was removed entirely** (2026-07-23). There is no Ammo equipment
slot and no arrow/pellet items: a bow just fires. Ammo never governed anything —
stamina, bounded range and attack speed are the real anti-kite levers — while
costing an equipment slot, three craftable items, and a class of bug where
reforging a bow silently unloaded arrows it could no longer draw. The Javelin is
unaffected: it *is* the projectile, not a launcher.

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

`Input + Reagent + Fuel = Ingot` — **three slots, all required on every recipe**,
each loaded explicitly (S1 — they were pulled silently from the backpack before).
Reuses the Drying Rack's menu (same `ProcessingStation`, tier-aware; the Rack uses
neither secondary slot). The rare recipes need an **Ember Crucible**–upgraded
**Smelter Lvl 2** (`minStationTier: 1`, gated on the Gremlin King's Heart — see
Station Upgrades).

**Reagent vs. fuel:** the reagent ends up *in* the ingot (Hex Essence infused into
Sunsteel, Moonsilver alloyed into Gloamsteel) and is per-recipe; **fuel is always
Wood**, is burned off, and is never part of the output. These used to be one field
named `fuel`, which is how Moonsilver ended up labelled "Fuel" and how the two
B4-P5 alloy recipes ended up smelting with no heat source at all.

| Input | Reagent (per ingot) | Fuel (per ingot) | Output | Smelter Tier |
|---|---|---|---|---|
| Sunscorch Ore (common, scattered badlands) | 1 Hex Essence | 1 Wood | Sunsteel Ingot | Any (Lvl 1) |
| Cinderforged Ore (rare veins + Cinder Forge POI) | 1 Hex Essence | 1 Wood | Embersteel Ingot | Lvl 2 (Ember Crucible) |
| Bog Ore (bayou — **surface-mineable since Phase 4a**) | 1 **Moonsilver** (crypt vaults only) | 1 Wood | Gloamsteel Ingot | Lvl 2 (Ember Crucible) |
| Sunsteel Ingot | 2 **Bog Ore** | 1 Wood | Mirebronze Ingot | Lvl 2 (Ember Crucible) |

Ore ratio is **1 : 1** (S1 rebalance — the old 2:1 made forging grindy). Clay (Smelter build material), Sunscorch Ore, and rare Cinderforged
veins are mineable `mine` nodes scattered in the badlands (Stone Pickaxe,
non-respawning). Node yields (S1): Clay 44×2–3, Sunscorch 60×3–5, Cinderforged
14×2–4 scattered + the Sunken Forge POI deposits at 4–7 each.

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
| Duskrunner Skewer | Lvl 2 | 1 Shishkabob, 1 Duskrunner Meat | Duskrunner Skewer | +2.5 HP/s for 22s |
| Seared Duskrunner Steak | Lvl 3 | 1 Shishkabob, 1 Duskrunner Meat, 1 Dustbloom | Seared Duskrunner Steak | +3 HP/s for 26s |
| Sunfruit-Glazed Ribs | Lvl 3 | 1 Shishkabob, 2 Sunfruit, 1 Boar Meat | Sunfruit-Glazed Ribs | +3 HP/s for 26s |
| Emberbloom Broth | Lvl 3 | 2 Emberbloom, 1 Sunfruit, 1 Gloamcap | Emberbloom Broth | +2.5 HP/s for 34s |
| Sunscorch Feast | Lvl 4 | 1 Shishkabob, 2 Duskrunner Meat, 1 Gloamcap, 1 Sunfruit | Sunscorch Feast | +3.5 HP/s for 30s |
| Ember-Glazed Skewer | Lvl 4 | 1 Shishkabob, 1 Duskrunner Meat, 1 Emberbloom, 1 Boar Meat | Ember-Glazed Skewer | +3.5 HP/s for 28s |
| Seared Mirejaw Tail | Lvl 3 | 1 Shishkabob, 1 Mirejaw Meat | Seared Mirejaw Tail | +3 HP/s for 26s |
| Mossbound Mirejaw | Lvl 4 | 1 Shishkabob, 1 Mirejaw Meat, 2 Swamp Moss | Mossbound Mirejaw | +3.5 HP/s for 34s |
| Lily-Gilded Feast | Lvl 4 | 1 Shishkabob, 2 Mirejaw Meat, 2 Water Lily, 1 Swamp Moss | Lily-Gilded Feast | +4 HP/s for 36s |

The three bayou dishes close a real gap: `mirejaw_meat` shipped in Phase 4b marked
"cooking recipes land later" and that never happened, so the deepest biome had no
food at all (playtest: "is there any food in bayou?"). They also give `swamp_moss`
and `water_lily` — harvestables that had existed with no recipe — their first use.

## Jewelry — Gemwright's Table (`src/systems/Jewelry.ts`) — B3-P2b

**Still biome-3 DORMANT** — its inputs (Moonsilver + the 3 ability gems) were pulled
off the bayou surface and are now **dungeon-only loot** (Phase 4c), and the Duneshaper
demotion that makes its Heart reachable lands in Phase 4d; test via `__dev.give`.
Multi-ingredient jewelry made at a placed **Gemwright's Table** (its own
`JewelryMenu`, cloned from the Cooking pattern; instant-craft behind a short bar).
A recipe's `requiredStationTier` gates it on the table's own level: **tier 0** (base
station) = passive rings/amulets; **tier 1** (after the **Gloamheart Setting**
upgrade, gated on the Duneshaper's Heart) = the ability-granting specials.

Passive jewelry effects are the **ability-augment + utility/explorer** layer
(`ItemDef.passive`, summed by `EquipmentEffects.ts`) — deliberately NOT raw-%
combat stats (that's relics' layer).

**Slots (2026-07-23):** passive jewelry goes in any of the **4 interchangeable
Special slots**, and ability items in any of the **3 interchangeable Ability
slots** — position is the hotkey (slot 1 = Q, 2 = E, 3 = R), so which key an
ability sits on is your arrangement, not a property of the item.

| Item | Table | Inputs | Slot | Effect |
|---|---|---|---|---|
| Ring of Quickening | Lvl 1 | 2 Moonsilver, 2 Gloam Shard | Ring | −15% ability cooldown |
| Amulet of Channeling | Lvl 1 | 3 Moonsilver, 3 Gloam Shard | Neck | +20% ability power (nova dmg/radius, blink distance) |
| Ring of the Forager | Lvl 1 | 2 Moonsilver, 2 Twine | Ring | +15% bonus-gather chance, +30% pickup radius |
| Amulet of Farsight | Lvl 1 | 3 Moonsilver, 2 Gloam Shard | Neck | +40% light radius, +20% pickup radius |
| Gloamstep Band | Lvl 2 | 2 Moonsilver, 1 Gloam Gem | Ability | Grants Gloamstep Blink |
| Gloam Focus | Lvl 2 | 2 Moonsilver, 1 Ember Gem | Ability | Grants Gloam Nova |
| Bloodpact Shroud | Lvl 2 | 3 Moonsilver, 1 Blood Gem | Ability | Grants Bloodpact |
| Snarebound Idol | Lvl 2 | 3 Moonsilver, 1 Gloam Gem, 2 Mirehide | Ability | Grants **Mire Snare** — roots everything within 240px for 2.6s |
| Quickening Fang | Lvl 2 | 3 Moonsilver, 1 Blood Gem, 2 Mirejaw Meat | Ability | Grants **Bloodrush** — −40% weapon cooldown for 6s |

The last two are the AOE-root and attack-speed abilities the user asked for. They're
**craftable rather than found-only epics** on purpose: burying a requested ability
behind an epic-drop roll reproduces the "I never found one" problem. Each costs a
different gem, so which one a run can build still depends on which crypt it cleared.

The **Gloamdrinker** is the bayou's bespoke magic weapon — the only one that is NOT a
reforge of an earlier piece, and the only weapon in the game with **lifelink**
(`Weapons.ts` `WEAPON_LIFELINK_PCT`): every hit, including each target its arc sweeps,
heals **8% of the damage dealt** (12% → 8%, 2026-07-23 — it beat the wide-arc
Gloam Brand at the Brand's own job because sustain outweighed everything). It's always on, costs no relic family slot, and stacks
with the Leech relic + the Bloodpact ability — paid for with a raw damage number below the
Gloam Brand's and a deliberately tighter arc.

## Gem Augments (`src/systems/GearAugments.ts`) — B3-P3

Per-**instance** gem augments applied through a gear item's right-click Upgrade
panel. **No ladder** (any order), **consumed** one-shot, **max 2 per item**, and
independent of that item's Lvl 2/3 tier upgrades — a piece can carry both.
Applied ids live on the same per-instance field a placed station's upgrades use
(`ItemStack.upgrades` / `EquippedItem.upgrades`), so they survive equip →
backpack → equip. Fit the **Ember and Gloamsteel/Mirehide tiers only**, and all
require a nearby **Workbench Lvl 4** (Emberforge Anvil).

| Augment | Fits | Effect | Costs |
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

Armor-augment magic/fire mitigation sums with the `heavy_armor` skill's own
mitigation and is capped at 75% total.

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

**Family loadout, not stacking.** Every relic belongs to one of 8
**families** (`damage`/`move`/`defense`/`stamina`/`lifesteal`/`vitality`/`crit`/`xp`)
and a player holds **at most one relic per family** (8 relics max). Rolling into a
family already owned resolves by **rarity, then power tier** (2026-07-15 redesign —
each family has exactly one curated relic per rarity, so a higher rarity is always
a strict upgrade):
- **Higher rarity** (or same rarity + higher tier) → **auto-replaces**; the
  displaced relic is discarded.
- **Lower rarity** (or the exact same relic + tier) → the new roll is
  **auto-declined** (nothing changes).
- The old "ambiguous → Keep New / Keep Old choice" path stays in the code for
  safety but effectively never fires now (single-stat families can't tie
  cross-stat).

**Shard refund = 50% of a discarded roll's trophy cost** (playtest exploit fix).
The old design refunded Gloam/Ember Shards on *any* displacement scaled by the
displaced relic's rarity × tier — but the trophy that produced the new relic
drops free from elites, so rolling into an owned family and displacing the old
relic was a **net shard source** (roll → auto-replace → free shards, farmable).
The rule now:
- **Upgrade / Keep New** (the new relic wins the slot, old relic displaced) →
  **no refund**. Getting the better relic is the reward.
- **Auto-declined / Keep Old** (the just-rolled relic is discarded) → refund
  **50% (floored) of the shards that trophy cost to make**. Raw trophies drop
  free → refund **0**; only **refined** trophies (2 shards to make) pay back
  **1** shard of their tier's currency (Gloam T1 / Ember T2).

Because a refund is only ever half of a *paid* cost, rerolling can never net
shards, but a wasted refined-trophy roll returns some value.

**Single-family + unique procs (2026-07-15 redesign).** Every relic touches only
its own family's axis (no more cross-family duals). **Common/Uncommon** are a
small flat stat; the number **PLATEAUS at Uncommon** — **Rare & Mythic reuse
Uncommon's stat** and add a bespoke **conditional proc** (Mythic = a spicier
version), so a relic is never a *growing* damage/HP multiplier (the anti-scaling
goal — a Mythic damage relic is still only +7% raw damage). Procs are conditional
bursts (every Nth hit, on kill, on crit, on cooldown), one per family — see the
table below. **All buff categories are additive-within-category** now (skill% +
relic% + streak% ADD, not compound; damage-reduction sources add with a 75% cap;
max HP/stamina are linear stat-flat + relic-%-of-base) so nothing scales
exponentially.

Each elite drops a **unique trophy by species** (Boar → Boar Trophy, Snake →
Snake Trophy, Gremlin/Gremling → Gremlin Trophy — all **Common / Tier 1**;
Duskrunner/Cragscale/Hexling/Sandmaw → their own Common trophy, all **Tier 2**
since Phase 5; the six bayou elites → their own Common trophy, all **Tier 3**).
Same-rarity trophies always share the Common outcome table +
pity counter, so more elite variety just means more attempts — the badlands
trophies' only difference is the **×1.5 power-tier multiplier** on whatever
relic they produce, and the bayou's is **×2.25**. Bayou trophies are **roll-only
for now**: refining needs a tier-3 shard currency, which the bayou's own POI /
dungeon phases will source.

**Outcome odds by trophy rarity** (Common band softened + pity cut in S4,
2026-07-15):

| Trophy rarity | → Common | → Uncommon | → Rare | → Mythic | Fail | Pity (miss cap) |
|---|---|---|---|---|---|---|
| Common | 20% | 2.5% | 1% | — | 76.5% | 8 |
| Uncommon | — | rest (87%) | 12% | 1% | 0% | 8 |
| Rare | — | — | rest (90%) | 10% | 0% | — |
| **Boss** (bespoke `outcomeOdds`) | — | — | — | 100% | 0% | — |

**S4 (2026-07-15) relic economy rework:**
- The full **8×4 relic matrix** is filled — every family
  (damage/move/defense/stamina/lifesteal/vitality/crit/xp) now has a
  Common/Uncommon/Rare/Mythic (32 relics; damage keeps two mythics).
- **Main-boss trophies guarantee a Mythic** of the boss's tier (bespoke
  `outcomeOdds` = 100% Mythic). The **Boss Trophy** (Gremlin King) → Mythic
  Tier 1; the **Tyrant Trophy** (Duneshaper) → Mythic Tier 2 (×1.5). Mini-bosses
  keep their refined-trophy drops.
- **B3-P5 — a boss trophy offers a CHOICE of 3 Mythics** (`TrophyRoll.choiceCount`)
  instead of granting one at random. There is exactly one Mythic per family, so
  the pick is "which family gets it?". Commit only — no skip, no reroll; closing
  the forge mid-pick auto-takes the first card so a spent trophy is never lost.
  Every other trophy is unaffected (`choiceCount` absent = one relic, as before).
- A **Rare/Mythic roll never repeats an id you already own** (the pool pick
  filters owned ids for those rarities), so lucky high rolls are always fresh.
- **Common crumble softened** (own-rarity band 10%→20%, success 13.5%→23.5%,
  pity 12→8), and the **refined-trophy Mythic cap is lifted** — a mini-boss
  refined (Uncommon) trophy can now gamba into a Mythic (1%), not just main bosses.

| Trophy | Source | Rarity | Power Tier |
|---|---|---|---|
| Gremlin Trophy | Elite Gremlin/Gremling | Common | 1 |
| Boar Trophy | Elite Boar | Common | 1 |
| Snake Trophy | Elite Snake | Common | 1 |
| Duskrunner Trophy | Elite Duskrunner (badlands) | Common | **2** |
| Cragscale Trophy | Elite Cragscale (badlands) | Common | **2** |
| Hexling Trophy | Elite Hexling (badlands) | Common | **2** |
| Sandmaw Trophy | Elite Sandmaw (badlands) | Common | **2** |
| Mirejaw Trophy | Elite Mirejaw (bayou) | Common | **3** |
| Blighttoad Trophy | Elite Blighttoad (bayou) | Common | **3** |
| Mosswretch Trophy | Elite Mosswretch (bayou) | Common | **3** |
| Murkling Trophy | Elite Murkling (bayou) | Common | **3** |
| Fenlurker Trophy | Elite Fenlurker (bayou) | Common | **3** |
| Corpselight Trophy | Elite Corpselight (bayou) | Common | **3** |
| **Boss Trophy** | Gremlin King (boss) | Mythic (bespoke — guaranteed) | 1 |
| **Tyrant Trophy** | The Duneshaper (final boss) | Mythic (bespoke — guaranteed) | **2** |
| ~~Gremlin King Fang~~ | — | — | Retired — the King now drops the **Gremlin King's Heart** (Phase-4 smelting gate) + the new **Boss Trophy** |
| Refined Trophy | Refinement (Gloaming Vein, Gloam) | Uncommon | 1 (roll-only — never dropped/refined; **can roll up to Mythic** since S4) |
| Ember-Refined Trophy | Refinement (badlands, Ember) | Uncommon | **2** (roll-only; **can roll up to Mythic** since S4) |
| Radiant Trophy | Refinement (scaffold) | Rare | 1 (roll-only — deeper biomes) |

**Mini-boss / boss guaranteed drops** (relic economy): **Gloamwarden** (forest) →
3–4 Gloam Shard + 1 Refined Trophy (Tier 1). **Cinderwrought** (badlands, **2 per
Sunken Forge**, 260 HP each) → **each** guard drops 2–4 **Ember Shard**, and **one
of the two** also drops 1 Ember-Refined Trophy (Tier 2) — the native Ember Shard
source, so ember sites supply the tier-2 refine currency without hauling Gloam
from the forest (both drop shards for supply; only one drops the trophy so a
two-guard site doesn't flood refined trophies). **Gremlin King** → Gremlin King's Heart + 1
**Boss Trophy** (guaranteed Mythic, Tier 1). **Duneshaper** → 5–8 Ember Shard + 1
**Tyrant Trophy** (guaranteed Mythic, Tier 2 — spendable since B3-P4d(2) made the
**Miretyrant** the win-con and demoted the Duneshaper to a mid-boss).

**Replaced-relic refund** (Phase-5 family loadout): rolling a strictly-better
relic that displaces an owned one now refunds a **small** shard amount for the old
relic (1/2/3/5 by rarity × 1.5 for Tier 2), on top of the existing declined-roll
refund (the user).

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
| Common (T3) → Mire-Refined | 3 Common Tier-3 bayou (any species) | 2 **Mire Shard** | 1 Mire-Refined Trophy (rolls Uncommon) | bayou — the tier-3 row the bayou shipped without |

**Shard conversion** (Relic Forge Convert tab, one row per unlocked step —
`SHARD_CONVERSIONS`):

| Conversion | Ratio | Unlocked by |
|---|---|---|
| Gloam → Ember | 3 Gloam Shard → 1 Ember Shard | Relic Forge Lvl 3 (Ember Kiln) |
| Ember → Mire | 3 Ember Shard → 1 Mire Shard | Relic Forge Lvl 4 (**Mire Crucible**) |

**Gloaming Vein POI:** ~5 shielded ore nodes (Stone-Pickaxe-gated, non-respawning,
1–2 Gloam Shard each) ringed around the **Gloamwarden** guardian; the nodes stay
un-mineable until it dies. Guardian guaranteed drop: 3–4 Gloam Shard + 1 Refined
Trophy.

Effect numbers below are shown at **Power Tier 1** (biome 1); badlands (Tier 2)
sources multiply every number by ×1.5.

Common/Uncommon = flat stat; Rare/Mythic = **Uncommon's stat (plateau) + a proc**.

| Family | Common | Uncommon | Rare (stat + proc) | Mythic (stat + bigger proc) |
|---|---|---|---|---|
| **Damage** | Warrior's Charm +4% | Warrior's Idol +7% | Onslaught Totem +7% · every 5th hit +100% dmg | Berserker's Mantle +7% · every 4th hit +100% |
| **Move** | Swift Charm +4% | Swift Idol +7% | Fleetfoot Totem +7% · on kill +25% move 2.5s | Windwalker's Mantle +7% · +35% move 3.5s + refunds dash |
| **Defense** | Stoneskin Charm −4% taken | Ironhide Idol −7% | Aegis Totem −7% · negate next hit /8s | Bulwark Mantle −7% · negate /6s + cap any hit at 30% max HP |
| **Stamina** | Tireless Charm −6% cost | Tireless Idol −10% | Second Wind Totem −10% · on kill restore 25% max stam | Perpetual Mantle −10% · restore 40% + 2s free attacks |
| **Lifesteal** | Bloodroot Charm +1 HP/kill | Sanguine Idol +2 HP/kill | Reaper Totem +2 · leech 3% of dmg dealt | Bloodlord's Mantle +2 · leech 5% + overheal → shield (≤15% max HP) |
| **Vitality** | Stout Charm +8% max HP | Vigor Idol +12% | Titan Totem +12% · heal 25% max HP below 25% HP (60s cd) | Colossus Mantle +12% · survive one fatal hit/run → 40% HP |
| **Crit** | Keen Charm +3% chance | Savage Idol +5% chance | Deadeye Totem +5% · crits splash 35% within 70px | Assassin's Mantle +5% · splash 50% within 90px + 30% slow 1.5s |
| **XP** | Scholar's Charm +8% | Scholar's Idol +14% | Sage Totem +14% · streak +8%/kill up to +50% (4s) | Enlightened Mantle +14% · +10%/kill up to +90% (5s) |

A dual-stat relic (e.g. War Totem) claims one **primary** family; its secondary
stat only matters when comparing against a same-family contender.

---

## Epic loot (B4-P2) — found only, craftable nowhere

The shared special-item pool the biome-3 roadmap specced and never shipped. **One
roll per container per empty-cycle** (never two at once), **tiered by POI depth**
so a shallow chest can't produce a deep item. Each tier is a **superset** of the
one above it. Source of truth: `src/systems/EpicLoot.ts` (and the dashboard's
**Epic Loot** tab, which reads it live).

| Pool | Chance | Containers | Adds |
|---|---|---|---|
| **Tier 1** | 4% | Gremlin Shack | Sparkbound Band, Lantern of the Long Dark |
| **Tier 2** | 6% | Duskrunner Warren · Sunken Shrine bowl · Lodge hut | Gloamwrought Signet, Ring of the Deep Vein, Mireborn Cloak |
| **Tier 3** | 8% | Sunken Crypt chest · Lodge chieftain's hut | Choirbone Amulet + **all three found-only actives** |

| Item | Slot | Effect |
|---|---|---|
| Sparkbound Band | Ring | +18% ability power, −12% ability cooldown |
| Lantern of the Long Dark | Neck | +60% light radius, +40% pickup radius |
| Gloamwrought Signet | Ring | −25% ability cooldown |
| Ring of the Deep Vein | Ring | +20% bonus-gather chance |
| Choirbone Amulet | Neck | +35% ability power |
| Mireborn Cloak | Back | −30% bleed/poison taken *(new `statusResistPct` channel)* |
| Gravebind Coil | Spec1 · Q | Grants **Gravebind** — yank enemies within 260px to 90px + 45% slow, no damage. 14s |
| Lance of the Pale Choir | Spec2 · E | Grants **Spirit Lance** — 420px line, 55 magic dmg to everything within 34px of it. 12s |
| Shroud of the Drowned King | Back · R | Grants **Drowned Aegis** — 4s of −60% damage taken (into the shared 75%-capped bucket). 26s |

### Abilities — lesser vs full

Run-start characters now grant **lesser** variants; the Gemwright's Table
recipes are unchanged and still produce the full-power items, so clearing a
crypt is a visible upgrade to an ability you already have. `power` scales every
magnitude (reach, damage, i-frames, active window); cooldown is set per-def.

| Ability | Power | Cooldown | Reach / effect | Source |
|---|---|---|---|---|
| Lesser Gloamstep | 0.60 | 9.0s | 132px blink, 150ms i-frames | Run-start character |
| Gloamstep Blink | 1.00 | 6.0s | 220px blink, 250ms i-frames | Gemwright (Moonsilver 2 + Gloam Gem 1) |
| Lesser Gloamburst | 0.55 | 14.0s | 82px radius, 17 dmg | Run-start character |
| Gloam Nova | 1.00 | 10.0s | 150px radius, 30 dmg | Gemwright (Moonsilver 2 + Ember Gem 1) |
| Lesser Bloodpact | 0.50 | 30.0s | 3.0s window, 17.5% lifelink | Run-start character |
| Bloodpact | 1.00 | 24.0s | 6.0s window, 35% lifelink | Gemwright (Moonsilver 3 + Blood Gem 1) |


## B4-P5 — the Mirebronze branch, and set bonuses as jewelry

**Gear now branches.** Sunsteel used to be a dead end: Gloamsteel reforges from an *Embersteel*
piece, so skipping the Embersteel tier stranded you. A second bayou-grade route now reforges
straight from Sunsteel/Duskhide. Both routes are terminal — neither feeds the other.

```
Sunsteel ──┬── Embersteel ── Gloamsteel   (needs Moonsilver: crypt-gated, the earned route)
           └── Mirebronze                 (needs Sunsteel + Bog Ore: the accessible route)
```

**Armor totals** (raw armor only — no resistances or stat lines on any armor):

| Lineage | Sunsteel/Duskhide | Embersteel/Emberhide | **Mirebronze/Bogweave** | Gloamsteel/Mirehide |
|---|---|---|---|---|
| Heavy | 20 | 32 | **36** | 42 |
| Light | 15 | 24 | **26** | 30 |

Mirebronze sits deliberately *between* Embersteel and Gloamsteel: a complete endgame set, with
the longer Embersteel road still the stronger one.

| Recipe | Costs (all Workbench Lvl 5) |
|---|---|
| Mirebronze Helm | 1 Sunsteel Helm, 2 Mirebronze Ingot, 2 Mirehide |
| Mirebronze Cuirass | 1 Sunsteel Cuirass, 4 Mirebronze Ingot, 3 Mirehide |
| Mirebronze Greaves | 1 Sunsteel Greaves, 2 Mirebronze Ingot, 3 Mirehide |
| Bogweave Hood | 1 Duskhide Hood, 1 Mirebronze Ingot, 3 Swamp Moss |
| Bogweave Vest | 1 Duskhide Vest, 2 Mirebronze Ingot, 4 Swamp Moss, 2 Mirehide |
| Bogweave Leggings | 1 Duskhide Leggings, 1 Mirebronze Ingot, 3 Swamp Moss |
| Mirebronze Warhammer | 1 Sunsteel Warhammer, 3 Mirebronze Ingot, 4 Bog Ore — 26 blunt |
| Mirebronze Longsword | 1 Sunsteel Longsword, 3 Mirebronze Ingot, 3 Bog Ore — 22 slash |
| Mirebronze Pike | 1 Sunsteel Pike, 3 Mirebronze Ingot, 3 Bog Ore — 28 pierce |

**Smelting** (Smelter, input + fuel):

| Output | Input | Fuel | Note |
|---|---|---|---|
| Sunsteel Ingot | Sunscorch Ore | Hex Essence | |
| Embersteel Ingot | Cinderforged Ore | Hex Essence | |
| **Gloamsteel Ingot** | Bog Ore | **Moonsilver** | changed — Moonsilver is crypt-only, which is what rewards the Embersteel route |
| **Mirebronze Ingot** | Sunsteel Ingot | 2 Bog Ore | new |

**Set bonuses are no longer worn on armor.** All four are now single pieces of jewelry crafted
at the Gemwright's Table — the effects and their numbers are unchanged, only what grants them
moved. This is what frees armor to be pure flat armor (and therefore branchable).

| Item | Grants | Station | Costs |
|---|---|---|---|
| Amulet of the Molten Bulwark | Molten Bulwark | Lvl 1 | 3 Moonsilver, 2 Embersteel Ingot, 3 Cragscale Plate |
| Ring of Emberblink | Emberblink | Lvl 1 | 2 Moonsilver, 2 Embersteel Ingot, 2 Cinderforged Ore |
| Amulet of the Gloam Bulwark | Gloam Bulwark | Lvl 2 | 4 Moonsilver, 3 Gloamsteel Ingot, 3 Mirehide |
| Ring of Mireblink | Mireblink | Lvl 2 | 3 Moonsilver, 2 Gloamsteel Ingot, 3 Gloam Shard |

Wearing several of a lineage grants the **highest** rank worn (each item is self-contained, so
"a partial set" no longer exists). Moonsilver seams per crypt vault went **3 → 4** to cover the
added demand.

**Gem setting moved** out of the shared right-click Upgrade panel into a **Set Gems** tab on the
Gemwright's Table: pick gear, pick gem, and a footer previews the exact effect and cost before
you commit. The Upgrade panel is now only about upgrade ladders.
