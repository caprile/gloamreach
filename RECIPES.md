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
| Effigy of the Duneshaper | Misc | 1 | Yes | 3 Gloam-Bone Totem, 2 Gloam Shard, 8 Bones | — | Item (ritual — summons the Duneshaper at a badlands altar; crafting it reveals the altars on the map) |

\* Slingshot Pellets is tier 0 (no Workbench needed) but has an extra discovery
gate beyond tier/ingredients: it stays hidden until the player has crafted a
Slingshot at least once (`Recipe.requiresDiscovered`), so it doesn't advertise
ammo before there's a launcher to load it into.

## Station Upgrades (`src/systems/StationUpgrades.ts`)

| Applies To | Result Tier | Name | Costs | Delta |
|---|---|---|---|---|
| Workbench | 1 ("Lvl 2") | Tool Sharpener | 3 Twine, 5 Wood, 2 Stone | — (unlocks gates only) |
| Campfire | 1 ("Lvl 2") | Stone Hearth | 4 Twine, 20 Stone | Unlocks Lvl 2 campfire dishes |
| Relic Forge | 1 ("Lvl 2") | Gloam Conduit | 15 Stone, 1 Gloam Shard | Unlocks the Refine tab |

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
| Cooked Snake Meat | 0 (any) | 1 Shishkabob, 1 Snake Meat | Cooked Snake Meat | +2 HP/s for 22s |
| Blood-Glazed Snake Skewer | 1 (Lvl 2) | 1 Shishkabob, 1 Snake Meat, 1 Gremlin Blood | Blood-Glazed Snake Skewer | +3 HP/s for 35s |

## Relics (`src/systems/Relics.ts`) — M-RL

**Probabilistic** roll at a placed **Relic Forge** (recipe above). 1 trophy per
attempt → a random relic; a **failed attempt still consumes the trophy**. A
trophy's own **rarity drives an outcome table** over the RESULT rarity (a Common
trophy can roll up to Uncommon/Rare — never Mythic — and can also fail; higher
trophies guarantee at least their own rarity with a chance to roll up). Rarity is
**source-determined by the trophy — not climbable, no manual combine.** The run's
**first roll is a guaranteed success** (the hook); beyond that a per-rarity pity
counter guarantees a base-rarity success after N misses. A separate **power tier**
(biome depth) multiplies a relic's numbers (`POWER_TIER_MULT` ×1.0/1.5/2.25/… —
flat ×1.0 this milestone) and **always equals the trophy's tier**. Rolling a relic
you already own (same id + power tier) **auto-stacks** (×N, aggregated effects).
Relics are run-length passives (reset on New Run), shown in the bottom-left HUD
relic bar.

Each elite drops a **unique trophy by species** (Boar → Boar Trophy, Snake →
Snake Trophy, Gremlin/Gremling → Gremlin Trophy). All three are **Common / Tier 1**
and share the Common outcome table + pity counter, so more elite variety just
means more attempts.

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
| Gremlin King Fang | Gremlin King | Rare | 1 (dormant: boss = win) |
| Refined Trophy | Refinement (Gloaming Vein) | Uncommon | 1 (roll-only — never dropped/refined; **capped at Rare, no Mythic**) |
| Radiant Trophy | Refinement (scaffold) | Rare | 1 (roll-only — deeper biomes) |

Uncommon/Rare-*raw*-trophy sources + power tiers ≥2 are scaffolding — no raw
trophy source feeds them until M-W1 (a Common trophy CAN roll up into Uncommon/
Rare relics now). Refined trophies (roll-only) are produced by the Refine tab below.

### Trophy refinement — Gloaming Vein (Refine tab)

The **Relic Forge's Refine tab** (unlocked only once the forge is upgraded to
**Lvl 2** via the Gloam Conduit — see Station Upgrades) spends **Gloam Shards**
(mined from the Gloaming Vein POI, gated behind the **Gloamwarden** mini-boss) to
climb a raw trophy one rarity up into a **refined trophy** that never crumbles. **Single-step
+ terminal**: raw → one up only; refined trophies are never a refine input
(species-agnostic — any mix of same-rarity raw trophies counts). A recipe requires
`trophy tier == shard tier` (both Tier 1 now); deeper biomes (M-W1) add higher-tier
ore + rows.

| Refine | Input trophies | Gloam Shards | Output | Notes |
|---|---|---|---|---|
| Common → Refined | 3 Common (any species) | 2 | 1 Refined Trophy (rolls Uncommon) | biome 1 |
| Uncommon → Radiant | 3 Uncommon (any species) | 3 | 1 Radiant Trophy (rolls Rare) | scaffold — no raw Uncommon source in biome 1 |

**Gloaming Vein POI:** ~5 shielded ore nodes (Stone-Pickaxe-gated, non-respawning,
1–2 Gloam Shard each) ringed around the **Gloamwarden** guardian; the nodes stay
un-mineable until it dies. Guardian guaranteed drop: 3–4 Gloam Shard + 1 Refined
Trophy.

| Rarity | Relics (base effect, ×power-tier mult) |
|---|---|
| Common | Warrior's Charm (+8% dmg) · Swift Charm (+8% move) · Stoneskin Charm (−8% dmg taken) · Tireless Charm (−12% stamina cost) · Bloodroot Charm (+2 HP/kill) · Stout Charm (+15% max HP) · Keen Charm (+5% crit chance) |
| Uncommon | Warrior's Idol (+16% dmg) · Swift Idol (+16% move) · Ironhide Idol (−14% dmg taken) · Vigor Idol (+20% HP, +18% stam) · Sanguine Idol (+4 HP/kill) · Scholar's Idol (+25% skill XP) · Savage Idol (+0.30× crit dmg) |
| Rare | War Totem (+26% dmg, −12% stamina) · Phantom Totem (+22% move, −12% dmg taken) · Titan Totem (+40% HP, +30% stam) · Reaper Totem (+8 HP/kill, +14% dmg) |
| Mythic | Gremlin King's Wrath (+40% dmg, +18% move) · Undying Heart (+15 HP/kill, −22% dmg taken) · Avatar's Mantle (+30% dmg, +25% move, −20% stamina) |
