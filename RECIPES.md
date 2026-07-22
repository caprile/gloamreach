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
| Slingshot | Weapons | 1 | Yes | 2 Wood, 2 Leather Scraps | — | Item (weapon, ranged — uses the Ammo slot) |
| Slingshot Pellets | Weapons | 0 | No\* | 3 Stone | — | Item x25 (ammo) |
| Javelin | Weapons | 1 | Yes | 3 Wood, 1 Stone | Pierce 5 | Item x2 (weapon, ranged, disposable — self-consuming stack) |
| Sunsteel Warbow | Weapons | 1 | Yes (Lvl 3) | 2 Sunsteel Ingot, 3 Ironbark, 2 Duskrunner Pelt | Ranged 0 | Item (weapon, ranged — uses the Ammo slot, fires Arrows) |
| Arrows | Weapons | 1 | Yes (Lvl 3) | 1 Sunsteel Ingot, 5 Wood | — (needs Warbow discovered) | Item x50 (ammo) |
| Arrows (Embersteel) | Weapons | 1 | Yes (Lvl 4) | 1 Embersteel Ingot, 5 Wood | — (needs Warbow discovered) | Item x50 (ammo — same arrows, alt metal) |
| Shishkabob | Misc | 0 | No | 1 Wood | — | Item x2 |
| Campfire | Crafting | 0 | No | 5 Wood, 2 Stone | — | Item (placeable) |
| Workbench | Crafting | 0 | No | 10 Wood | — | Item (placeable) |
| Bedroll | Crafting | 0 | No | 3 Wood, 5 Cattail | — | Item (placeable — near a lit Campfire + no enemies nearby grants +1 HP/s "Resting") |
| Drying Rack | Crafting | 1 | Yes | 5 Wood, 4 Leather Scraps, 2 Bones | — | Item (placeable, station) |
| Relic Forge | Crafting | 1 | Yes | 7 Stone, 5 Bones, 1 Gremlin Trophy | — | Item (placeable, station — roll relics) |
| Gremlin Cap | Armor | 1 | Yes | 1 Gremlin Leather, 5 Blackberries | Light Armor 0 | Item (armor, helmet) |
| Gremlin Shirt | Armor | 1 | Yes | 3 Gremlin Leather, 1 Leather Scraps, 5 Bones | Light Armor 0 | Item (armor, chest) |
| Gremlin Pants | Armor | 1 | Yes | 2 Gremlin Leather, 2 Leather Scraps, 1 Blackberry | Light Armor 0 | Item (armor, legs) |
| Gremlin Totem | Misc | 1 | Yes | 3 Gremlin Trophy, 1 Wood, 1 Gremlin Guck | — | Item (ritual — summons the Gremlin King at the Boss Altar) |
| Effigy of the Duneshaper | Misc | 1 | Yes | 3 Gloam-Bone Totem, 2 Gloam Shard, 8 Bones | — | Item (ritual — summons the Duneshaper at a badlands altar; crafting it reveals the altars on the map) |
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
| Workbench | Lvl 3 | Forge Anvil | 5 Sunsteel Ingot, 5 Ironbark, 7 Stone | Unlocks base forged gear (`requiresWorkbenchTier: 2`) |
| Workbench | Lvl 4 | Emberforge Anvil | 5 Embersteel Ingot, 8 Ironbark, 10 Stone | Unlocks enhanced/T2 gear (`requiresWorkbenchTier: 3`) |
| Campfire | Lvl 2 | Stone Hearth | 4 Twine, 13 Stone | Better campfire dishes |
| Campfire | Lvl 3 | Sunsteel Grill | 3 Sunsteel Ingot, 8 Clay, 7 Stone | Better campfire dishes |
| Campfire | Lvl 4 | Emberforge Hearth | 3 Embersteel Ingot, 13 Stone | Best campfire dishes |
| Relic Forge | Lvl 2 | Gloam Conduit | 10 Stone, 1 Gloam Shard | Unlocks the Refine tab |
| Relic Forge | Lvl 3 | Ember Kiln | 3 Embersteel Ingot, 13 Stone | Unlocks Gloam → Ember conversion (Convert tab) |
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
table), and (2) **every** forged piece — base AND T2 — now gets **two right-click
armor levels** (`+1` then `+1`, = **+2 over base at Lvl 3**), sunk in ingots
(the user: a use for the ingot stockpile). Tuned so a base (Lvl 1) ember piece
always out-armors a fully-upgraded (Lvl 3) steel piece. **Heavy armor** has a real
effect: the `heavy_armor` skill gives partial **magic/fire mitigation** (−0.4%/
level, cap −30%) while wearing ≥1 heavy piece — its identity vs light armor's dash
i-frames. `heavy_armor` XP accrues per worn piece on a kill.

| Set | Type | Helm | Chest | Legs | Full-set (Lvl 1 → Lvl 3) |
|---|---|---|---|---|---|
| Sunsteel (base) | Heavy | 6 | 8 | 6 | 20 → 26 |
| Embersteel (T2) | Heavy | 10 | 12 | 10 | 32 → 38 |
| Duskhide (base) | Light | 4 | 6 | 5 | 15 → 21 |
| Emberhide (T2) | Light | 7 | 9 | 8 | 24 → 30 |

Forged-piece upgrade costs: base (Sunsteel/Duskhide) Lvl 2 = **2 Sunsteel Ingot**,
Lvl 3 = **3 Sunsteel Ingot** (needs Workbench Lvl 3). T2 (Embersteel/Emberhide)
Lvl 2 = **2 Embersteel Ingot**, Lvl 3 = **3 Embersteel Ingot** (needs Workbench
Lvl 4). Each level `+1 armor`. (Emberhide Leggings base bumped 7→8 so base still
beats a Lvl-3 Duskhide legging.)

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
Embersteel, and the Ember Brand — now gets **two right-click damage levels**
(`+2` then `+2`, = **+4 damage at Lvl 3**): Lvl 2 = 2 ingot, Lvl 3 = 3 ingot
(Sunsteel Ingot for the base weapons, Embersteel Ingot for the T2 + Ember Brand).
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

| Weapon | Dmg / Cooldown / Stamina | Projectile Speed | Range | Ammo |
|---|---|---|---|---|
| Slingshot | 2 / 650ms / 6 | 420 px/s | 260px | Slingshot Pellets, loaded into the new **Ammo** equipment slot |
| Javelin | 5 / 900ms / 16 | 300 px/s | 220px | None — the equipped hotbar stack is the ammo (1 consumed per throw) |
| Sunsteel Warbow | 11 / 750ms / 12 | 600 px/s | 380px | Arrows, loaded into the shared **Ammo** slot (evicts any pellets) |
| Embersteel Warbow | 15 / 730ms / 15 | 640 px/s | 400px | Arrows (same slot) |

One shared Ammo slot: loading Arrows swaps out Slingshot Pellets and vice versa.

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
fuel loaded into its own dedicated fuel slot** (S1 — was pulled silently from the
backpack). Reuses the Drying Rack's menu (same `ProcessingStation`, tier- and
fuel-aware). The rare recipe needs an **Ember Crucible**–upgraded **Smelter Lvl
2** (`minStationTier: 1`, gated on the Gremlin King's Heart — see Station
Upgrades).

| Ore | Fuel (per ingot) | Output | Ratio | Smelter Tier |
|---|---|---|---|---|
| Sunscorch Ore (common, scattered badlands) | 1 Hex Essence | Sunsteel Ingot | 1 : 1 | Any (Lvl 1) |
| Cinderforged Ore (rare veins + Sunken Forge POI) | 1 Hex Essence | Embersteel Ingot | 1 : 1 | Lvl 2 (Ember Crucible) |

Ratio is **1 ore + 1 hex → 1 ingot** (S1 rebalance — the old 2:1 made forging
grindy). Clay (Smelter build material), Sunscorch Ore, and rare Cinderforged
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

## Jewelry — Gemwright's Table (`src/systems/Jewelry.ts`) — B3-P2b

**Biome-3 DORMANT** (authored now; real sources — Moonsilver mining, gem drops,
the Duneshaper demotion — land in the biome-3 content phases; test via `__dev.give`).
Multi-ingredient jewelry made at a placed **Gemwright's Table** (its own
`JewelryMenu`, cloned from the Cooking pattern; instant-craft behind a short bar).
A recipe's `requiredStationTier` gates it on the table's own level: **tier 0** (base
station) = passive rings/amulets; **tier 1** (after the **Gloamheart Setting**
upgrade, gated on the Duneshaper's Heart) = the ability-granting specials.

Passive jewelry effects are the **ability-augment + utility/explorer** layer
(`ItemDef.passive`, summed by `EquipmentEffects.ts`) — deliberately NOT raw-%
combat stats (that's relics' layer). Rings fill either ring slot (wear two).

| Item | Table | Inputs | Slot | Effect |
|---|---|---|---|---|
| Ring of Quickening | Lvl 1 | 2 Moonsilver, 2 Gloam Shard | Ring | −15% ability cooldown |
| Amulet of Channeling | Lvl 1 | 3 Moonsilver, 3 Gloam Shard | Neck | +20% ability power (nova dmg/radius, blink distance) |
| Ring of the Forager | Lvl 1 | 2 Moonsilver, 2 Twine | Ring | +15% bonus-gather chance, +30% pickup radius |
| Amulet of Farsight | Lvl 1 | 3 Moonsilver, 2 Gloam Shard | Neck | +40% light radius, +20% pickup radius |
| Gloamstep Band | Lvl 2 | 2 Moonsilver, 1 Gloam Gem | Spec1 (Q) | Grants Gloamstep Blink |
| Gloam Focus | Lvl 2 | 2 Moonsilver, 1 Ember Gem | Spec2 (E) | Grants Gloam Nova |
| Bloodpact Shroud | Lvl 2 | 3 Moonsilver, 1 Blood Gem | Back (R) | Grants Bloodpact |

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
since Phase 5). Same-rarity trophies always share the Common outcome table +
pity counter, so more elite variety just means more attempts — the badlands
trophies' only difference is the **×1.5 power-tier multiplier** on whatever
relic they produce.

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
**Tyrant Trophy** (guaranteed Mythic, Tier 2 — its kill wins the run, so the trophy
is unreachable in practice; kept for consistency).

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

**Gloam → Ember conversion:** 3 Gloam Shards → 1 Ember Shard, at the Relic
Forge's Convert tab.

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
