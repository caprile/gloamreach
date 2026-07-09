# Survivor RPG

Top-down 2D pixel game. Long-term vision is **Valheim-like** (exploration, gathering,
crafting, leveling, bosses) with **ARPG** elements layered on top (item/recipe variety,
replayability). Built incrementally as a series of milestones — see **Roadmap** below.

Full milestone plan: `.claude/plans/great-i-want-to-tender-kite.md`. Per-milestone
implementation plans live alongside it in `.claude/plans/` too (e.g.
`polymorphic-sparking-lynx.md` for Combat's foundation pass) — read the relevant one
before starting a new feature, and check the **Roadmap**/**First biome — content notes**
sections below either way.

**Plan-mode docs must be saved in-repo, not just the global plans dir.** Earlier
sessions' plan files (`EnterPlanMode`/`ExitPlanMode`) were only ever written to
`~/.claude/plans/` (global, outside this repo) and were never committed — they went
missing across sessions/machines as a result (this line used to say the north-star plan
"no longer exists in the repo"; it was recovered from the global dir and copied in). Going
forward: after finalizing a plan, copy it into this repo's `.claude/plans/` and commit it
alongside the feature it describes, so it survives for future sessions.

## Stack

- **Phaser 3** (2D game framework — tilemaps, sprites, arcade physics, scenes, input)
- **TypeScript** (strict mode)
- **Vite** (dev server + bundler)
- No external art assets yet — all textures are generated in code (`BootScene.ts`) via
  `Graphics.generateTexture`. Real pixel-art tilesets get swapped in later.

## Running the project

```
npm run dev      # start Vite dev server (http://127.0.0.1:5173/)
npm run build    # type-check (tsc) + production build
```

**Windows note:** Node.js is installed at `C:\Program Files\nodejs` but may not be on
every shell's PATH. If `node`/`npm` aren't found, prefix commands, e.g. in PowerShell:
```
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```
A `.claude/launch.json` config named `"dev"` is set up for the Preview tooling
(`preview_start`) — prefer that over raw Bash for running/screenshotting the game.

Type-check quickly without a full build:
```
node node_modules/typescript/bin/tsc --noEmit
```

## Project structure

```
src/
  main.ts              Phaser game config; entry point. Exposes window.__game for
                        console/preview_eval debugging (harmless in dev).
  scenes/
    BootScene.ts        Generates all placeholder textures, then starts MainScene.
    MainScene.ts        World, camera, spawning, hover/interaction, HUD — the core loop.
  entities/
    Player.ts            Arcade-physics sprite; WASD/arrow movement, facing, equipped-icon visual.
    ResourceNode.ts       Gatherable/interactable world object (branch, rock, tree, boulder).
    Enemy.ts              Arcade-physics enemy base (Boar's chase/wander/melee-bite AI).
    Snake.ts               Subclasses Enemy; own hidden/striking/fleeing ambush state machine.
  systems/
    Inventory.ts          Plain resource-count tracker (wood/stone). Seed of crafting later.
    Health.ts              Player health pool (takeDamage/heal/reset) — no passive regen.
    Weapons.ts              WeaponType + damage/cooldown/stamina-cost tables, mirrors tool tables.
```

Keep files small and single-purpose — new systems (crafting, combat, inventory UI) should
get their own file under `src/systems/` or `src/entities/`, not bolted onto `MainScene.ts`.

## Controls (current)

- **Move:** WASD / Arrow keys
- **Sprint:** hold **Shift** while moving — faster movement, drains stamina
- **Dash:** **Spacebar** while moving — a quick movement burst, costs stamina and has
  its own cooldown. Still purely a movement burst — no i-frames/damage-avoidance yet.
  (Health/damage now exists as of Combat's foundation pass, so this is unblocked
  whenever wanted; just not bundled into that pass.)
- **Interact / Attack:** **Left click** on a hovered object or enemy that's in reach
  (see below) — attacking an enemy requires a weapon equipped via the hotbar, same
  flow as tools.
- **Auto-pickup (magnet) toggle:** **V**
- **Attack-range ring toggle:** **O** — hides/shows the reach-preview ring around the
  player (still equip-gated when shown; `O` only controls whether it's allowed to draw
  at all).

There is **no keyboard interact key** (no E, no Space for gathering) — interaction is
mouse-driven only. Don't reintroduce a keybind for this without being asked. Spacebar is
**dash**, not jump — there's no jump/hop mechanic in the game.

## Interaction & resource model (important — don't regress this)

- **Free pickups (no tool):** ground **branches → `wood`**, **small rocks → `stone`**.
  Always show a prompt when hovered + in reach: `[LMB] Pick up <name>`.
- **Tool-gated:** **trees** (chop) need an **axe** *kind* equipped; **boulders** (mine)
  need a **pickaxe** *kind* equipped. Tools are modeled by **kind** (`axe`/`pickaxe`) via
  `toolKind()`/`requiredKind()` in `ResourceNode.ts` — this leaves room for tool **tiers**
  later (e.g. a stone axe might show `[LMB] Chop` but fail on a hardwood tree; a better
  axe succeeds). Don't gate the prompt on a specific tool tier, only on kind.
- **Prompt rules (deliberate, user-specified — do not change without asking):**
  - No tool of the right kind equipped → **show nothing** on hover (not a hint, not a
    "needs X" message). Never reveal what tool/tier is required.
  - Right kind equipped → show only the verb: `[LMB] Chop` / `[LMB] Mine`.
  - Out of reach → show nothing.
  - The prompt is a **fixed HUD element anchored bottom-right of the screen**
    (`origin (1,1)`, `scrollFactor 0`) — NOT floating above the object in world space.
    This was an intentional change from an earlier "prompt above the object" version;
    don't revert to world-space prompts.
- **`loose` flag:** pre-placed branches and rocks are both `loose: false` — always
  manual-click, never magnet-eligible. Only loose drop **pieces** spawned when a
  tree/boulder depletes (`MainScene.spawnLooseDrop`) are `loose: true` (and
  `isDrop: true`), and those are what the magnet (toggle: `V`) pulls toward the
  player. Preserve this distinction when adding new resource types.

## Roadmap (see plan file for full detail)

**Done so far** (see `STATUS.md` for full detail on each):
1. **Crafting & tools** — craft a stone axe/pickaxe from resources and equip one, plus a
   full slot-based inventory/hotbar grid UI and a crafting menu with recipe discovery.
2. **Loose-object drops + magnet** — chopping/mining spawns loose drops instead of
   crediting inventory directly; magnet radius (toggle `V`) auto-collects loose items.
3. **Stamina, sprint, dash** — a stamina pool (HUD bar centered above the hotbar) that
   gates sprint (hold Shift) and dash (Spacebar, a movement burst — not a jump; no
   jump/hop mechanic exists). Tool-swing hits now also cost stamina.
4. **Combat (foundation + polish)** — player health/damage + death & respawn, 4-way
   facing, equipped-item-on-sprite visuals (reuses existing item icons, no new art
   pipeline), melee weapon equip via the hotbar (same flow as tools). The stone axe is
   **tool-only** (no `ItemDef.weapon`) — it was too strong as a free weapon-slot bonus on
   top of being a tool, so weapons stay a separate equip choice (Wood Club, Stone Club).
   One enemy ("Boar": simple chase AI + melee bite) with a thin always-on HP bar, and
   floating damage numbers on hit (plain numbers for now — no dmg type/resistance system,
   see below). Attack reuses the existing hover/interact/prompt-gating model rather than a
   parallel system. **Deliberately deferred** to a follow-up pass: Gremlin (ranged +
   melee) from the first-biome roster, Boar's charge/fire-fear, the Slingshot + ammo
   ranged-weapon system, dash i-frames, and cooking/food. See **First biome — content
   notes** below.
4a. **Workbench** — a placeable crafting-tier gate (Milestone G of the first-biome plan).
   Stone Pickaxe and Stone Club now require proximity to a placed Workbench; Stone Axe,
   Torch, Wood Club, and the Workbench itself remain craftable anywhere (tier 0).
4b. **Snake** (Milestone D of the first-biome plan) — first ambush enemy and the game's
   only `leather` source, unlocking Stone Pickaxe/Stone Club's discovery. `src/entities/
   Snake.ts` subclasses `Enemy` but fully overrides `update()` with its own
   hidden/striking/fleeing state machine (tight ambush radius, hit-and-retreat, re-hide
   cooldown) rather than reusing Boar's chase AI — see **First biome — content notes**
   below.
4c. **Gremlin + projectiles** (Milestone C) and **Boar tuning for the 2x world**
   (Milestone B) — shipped; see `STATUS.md` for detail.
4d. **Dash i-frames + attack-range ring** (Milestones E/F of the first-biome plan) —
   dash now grants a brief `invulnerableUntil` window (150ms, outlasting the sharper
   105ms dash burst) via the same field/guard `applyDamageToPlayer()` already used for
   respawn invuln; a subtle reach-preview ring (radius = `REACH`) now shows around the
   player whenever a tool or weapon is equipped, gated on equip state only (not target
   proximity, to avoid flicker during approach). The ring also has its own on/off toggle
   (**O**, mirrors the magnet's **V** toggle pattern) — `rangeRingEnabled` gates
   `updateAttackRangeRing()` independently of equip state, for players who find it
   distracting.
4e. **Harvestables + Drying Rack** (Milestone H — the last item in the first-biome plan,
   reworked same-day per playtest feedback — see below) — two new free-pickup harvestables
   (**Cattail**, growing IN the shallow water right at the creek's edge — `Biome.isCreekEdge`
   returns true for a *water* cell touching dry land, not the other way around; **Blackberry**
   bushes in the forest, a future food item, no eating mechanic yet) and the game's **first
   processing station**: the **Drying Rack**. `src/systems/Processing.ts`
   (`ProcessingStation` + `PROCESS_RECIPES` — `cattail→twine` 2:1, `gremlin_skin→
   gremlin_leather` 1:1) converts **instantly**, not over time — the player loads raw input,
   picks how much of it to run via a slider/typed number in `src/ui/DryingRackMenu.ts` (the
   game's **first drag-and-drop UI**: backpack shown alongside with non-input items dimmed,
   drag/quick-load into the input slot, live "→ N Twine" preview), and output auto-deposits
   into the backpack (or drops on the floor if full — no "Collect" step). The Drying Rack is
   **tier 1** (requires a nearby Workbench to craft/place, like Stone Pickaxe/Club) — originally
   8 wood + 1 leather, changed to **5 wood/4 leather/2 bones** in Milestone 4f/I once `bones`
   existed (see below); its slider also became **output-amount based** in that same milestone,
   not the input-unit slider described here. Placed objects (Workbench/Campfire/Drying Rack) now support a generic
   **right-click Upgrade/Destroy popup** (`src/ui/ContextMenu.ts`): Destroy turns any one
   back into a recoverable loose pickup, Minecraft-style (a Drying Rack's loaded input is
   refunded too); Upgrade (Workbench only so far) consumes a new `workbench_upgrade` item
   (discoverable once twine has been produced) and tags that specific placed instance —
   the mechanical payoff of an upgraded tier is intentionally undesigned past that. A new
   `gremlin_leather_armor` recipe (armor tab, workbench-gated) sinks the two processed
   outputs — **not yet wearable** (armor-equip system doesn't exist). *(Superseded in
   Milestone M: this single recipe was replaced by three slot-specific pieces — Gremlin
   Cap/Shirt/Pants — which are wearable; see below.)* Also added this
   session: a general **Drop/Destroy** system for any inventory stack — drag it out to the
   game world to drop it as a magnet-cooldown-gated pickup, or onto the `InventoryMenu`'s
   trash box to delete it outright. With Milestone H shipped, **the entire first-biome
   content plan (A–H) is done.** See `STATUS.md` for full detail on both the initial ship
   and the same-day rework.
4f. **Drying Rack polish, station-upgrade rework, Gremlin armor (first wearable armor)**
   — **Milestones L, I, J, K, and M all shipped**; N (blackberry harvest-without-destroy) and
   O (resource-density audit) are the two remaining items. Full detail in
   `.claude/plans/this-is-a-plan-cached-pixel.md` (Milestones I–O, continuing the A–H
   lettering). Playtest-driven follow-up batch: the
   Drying Rack's slider is now **output-amount based** (auto-scaled 0..max possible output,
   not input units — shipped); Cattail's description no longer spoils what it processes into
   (shipped); the Drying Rack recipe is now **5 wood/4 leather/2 bones** (bones is a new
   resource — Boar loot, both shipped); the crafting-menu tab reorg now puts
   **Workbench/Campfire/Drying Rack all in the Crafting tab** (Shishkabob moved to Misc,
   shipped); placement mode got a bug fix (a failed tier-gate check no
   longer cancels it — it stays armed so walking into Workbench range lets the next click
   succeed) plus a new way to **re-enter placement mode from an inventory/hotbar item**
   (placeables are now `hotbarable`; each placement consumes one owned stack instead of recipe
   ingredients — Milestone J, shipped). Locked interaction model: **hotbar selection drives
   placement like equipping a tool** (a selected placeable is in place mode; selecting anything
   else exits it — number key / scroll wheel / left-click all select identically), and
   **inventory gestures match every other item** — right-click a backpack placeable quick-moves
   it to the hotbar, while **left-click** on a backpack placeable enters place mode.
   *(Superseded in the Progression milestone's playtest pass: quick-move is now
   **double-left-click** for every backpack item, not right-click — right-click is reserved
   for context-menu/upgrade actions. A single left-click on a placeable still enters place
   mode, just deferred behind the double-click window — see `STATUS.md`.)* The single
   generic `workbench_upgrade` item is replaced by a **named
   per-station upgrade system** (e.g. "Tool Sharpener": 3 twine/5 wood/2 stone, applied
   directly via the right-click Upgrade popup — no intermediate craftable item), and a
   station's upgrade tier now **survives Destroy → pickup → re-Place** with a visual tell
   at each tier (this also fixes a latent bug: today an upgraded Workbench's tier is
   silently discarded on Destroy — Milestone K, shipped). **Gremlin Armor** (Milestone M,
   shipped) finally wires up the long-dormant `Equipment.ts` slot system: **Gremlin
   Cap/Shirt/Pants** (helmet/chest/legs) replace the old undifferentiated
   `gremlin_leather_armor` recipe — equip by **drag onto the paper-doll slot or right-click**
   a backpack item (swap semantics: whatever was worn there returns to the backpack, or drops
   on the floor if it's full); each piece has its own lvl-2 upgrade, triggered by
   **right-clicking the equipped paper-doll slot**, which opens the same full-page
   `UpgradeMenu.ts` panel a placed station's Upgrade button does (reusing that exact
   component — Milestone K's per-instance-tier plumbing was the reason M could reuse it
   directly rather than build a parallel system). Gremlin Pants' lvl 2 additionally requires
   a nearby Workbench that has **itself** reached tier 1 (`isNearWorkbenchAtTier()`,
   `MainScene.ts`) — a locked decision from the user, and the template for how future armor
   tiers gate on future Workbench tiers (e.g. a hypothetical lvl-3 armor piece gating on a
   not-yet-built Workbench lvl 3). **Blackberry bushes now harvest without destroying**
   (Milestone N, shipped): picking berries swaps the bush to a bare "picked" texture instead
   of removing it, and it regrows back to harvestable after a timer (3 in-game minutes,
   `BLACKBERRY_REGROW_MS`) — the game's first "stays in the world after harvest" node
   (`ResourceNode.persistent`/`pickedTexture`/`regrowMs`/`harvested`, `ResourceNode.ts`). The
   resource-density pass (Milestone O, shipped) confirmed the new armor set outstripped
   existing spawn counts and bumped **RangedGremlin 4→18** and **Snake 6→15**
   (`MainScene.spawnEnemies()`) — a deliberate departure from Milestone C's original "rarer,
   stronger" ranged-Gremlin tuning intent. **With N and O shipped, the entire I–O batch
   (`.claude/plans/this-is-a-plan-cached-pixel.md`) is done.**
5. **Progression** — shipped (plan: `.claude/plans/refactored-napping-metcalfe.md`, built
   in sub-milestones A–D, then a same-day playtest rebalance pass — see `STATUS.md` for
   both). Two *separate* systems: many small per-activity **Skills** (`Skills.ts`,
   expanded from the old dormant `axes`/`pickaxes` seed) and one overall **Player Level**
   (`Progression.ts`, new). Skills — 5 weapon-damage-type skills
   (slash/blunt/pierce/ranged/magic) + heavy/light armor + running/blocking/chopping/mining;
   XP curve `100*(level+1)` per level, soft-cap 100. **Skills only gate recipes** (via the
   widened `Recipe.requiredSkills[]`), as a **discovery-time** gate — a skill-locked recipe
   (e.g. `stone_club` before Blunt lvl 3) is fully invisible until met, same treatment as an
   undiscovered ingredient (an initial ship of this as a craft-time visible-but-greyed gate
   was reverted same-day per the user). XP sources today: weapon hit → primary damage-type
   skill; tool hit → chopping/mining; sprint → running; kill → each distinct worn armor
   type. `blocking` + the 4 non-blunt weapon skills + `heavy_armor` exist in the type system
   with no XP source wired yet (future content — ranged/magic weapons, heavy armor, a
   block/parry mechanic). **Weapon damage types** are new (`Weapons.ts` `DamageType`/
   `WEAPON_DAMAGE_TYPES`); a weapon's primary type routes its skill XP and shows on the item
   stats popup. **Weapon skill levels grant their own damage bonus** (+0.5% dmg/level,
   `Skills.ts` `weaponSkillDamageMultiplier` — this replaced an initial ship where player
   stat points affected weapon damage instead; see below). Player Level is fed by skill
   level-ups (each grants Player XP = that skill level's cost), curve
   `round(150*(level+1)^1.9)` (fast early, steep later — steepened significantly same-day
   after a playtest reached level 8-9 too easily), and grants **N points at level N**
   spendable on **Endurance/Vitality/Strength/Agility/Intelligence/Willpower** (no Luck —
   deferred). Endurance → +1 max Stamina/point; **Vitality** → +1 max HP/point (split out
   of Endurance same-day — was originally one combined stat at +2/+4); Strength/Agility →
   -0.5% stamina cost for melee/ranged respectively (no longer affect damage — that moved
   to the weapon skill above); Intelligence/Willpower are explicit **placeholders**
   (spell-cast-time / mana-cost — neither system exists yet). No HP/stamina *regen* effect
   (no regen system exists). **Running now has a mechanical effect too**: sprint speed
   itself was slowed substantially (`Player.ts`'s hardcoded multiplier removed; base
   ~1.15x, was 1.6x) and Running's level slowly claws it back (+0.5% of base speed per
   level via `Skills.runningSprintMultiplier()`, passed into `Player.update()` each frame
   by the scene — only reaching the old 1.6x around the level-100 soft cap). New
   **Character menu** (key **K**, `CharacterMenu.ts`) with Skills tab (**hover a row for
   its impact description, "if applicable"** — the 5 weapon skills and Running have one
   today) and Stats tab, defaulting to Stats whenever points are unspent; a bobbing
   "N Stat Points Available!" badge appears near the `[Tab] Menu` icon under the same
   condition. A 3rd HUD bar (player XP + "Lvl N") stacks above HP/stamina. All numeric
   constants are first-pass/tunable. In-memory only (no save/load yet). Armor/station
   **upgrades are gated on Workbench proximity whenever their base recipe is tier ≥ 1**
   (`MainScene.upgradeBlockReason()`, generalized from an initial ship that only gated
   Gremlin Pants) — layered under Pants' own stricter "Workbench must itself be tier 1"
   check. **Not yet wired:** any multi-skill recipe (the `requiredSkills[]` array supports
   it, e.g. a future "5 Slash + 5 Pierce" weapon).

**Not yet built — next up in rough order:**
6. **World & discovery** — much bigger generated world, biomes, map. See **First biome —
   content notes** below for the first biome's terrain-zone concept.
7. **Bosses.**
8. **ARPG loot** — rarity, randomized drops/recipes, replayability.
9. **Cross-cutting:** save/load (localStorage), real pixel-art tilesets.

## Long-term design notes (idea stage, added 2026-07-07)

Directional notes on the overall game-loop shape, from the user, not yet implemented.
These inform how later roadmap items (World & discovery, Bosses, ARPG loot) should be
built, so a future session picking up any of those should read this first.

- **Core meta-loop:** the game is a series of **biomes**, each gated by a **boss**. Loop
  per biome: **Enter Biome → Craft/Gather/Fight → Fight Biome Boss → Portal to Next
  Biome.** Number of biomes TBD (not locked).
- **Biome spawn point:** entering a biome drops the player in a **safe area at the map
  center** — visually distinct from the rest of the terrain (placeholder: a plain circle
  for now, real art later) and **no enemies spawn there**. This is a new concept beyond
  the current single always-random spawn point.
- **Death — Valheim-style tombstone:** dying **drops your inventory** as a recoverable
  object in the world (a "tombstone") that the player can walk back to and reclaim —
  **not** the current instant-respawn-with-stats-reset-only behavior, and not a full
  wipe. The **hotbar (equipped tools/weapons) is kept on death**, only the backpack
  inventory is dropped. Not yet designed: tombstone despawn timer (if any), whether
  other players/enemies can interact with it (n/a until multiplayer/looting-enemies
  exist), exact drop-object visual.
- **Inter-biome inventory constraint:** moving between biomes, you only bring what fits
  in your **inventory** (not unlimited stockpiling) — this is meant to keep runs tight
  and force choices about what to carry forward. Inventory **expansion** (more slots) is
  a future unlock via items/spells, not fixed forever at the current size.
- **Item upgrades:** tools/weapons/armor should support an **upgrade** concept (tiers
  beyond crafting a whole new item) — exact mechanic (upgrade materials? a forge
  action? in-place recipe?) undecided.
- **Crafting-station upgrades:** Workbench (and future stations, e.g. the planned Drying
  Rack) should similarly support **upgrade tiers**, not just "placed or not" — mirrors
  the item-upgrade concept above but for stations gating recipes.
- **HP/stamina sustain loop:** beyond the current no-passive-regen `Health.ts`, add
  **HP regeneration** and ways to actively manage HP/stamina via **food, spells, and
  potions** — cooking (Shishkabob, per the First biome notes below) is the first piece
  of this; spells/potions are new systems not yet started.
- **Camera/world scale:** the user wants the game to feel more **zoomed in** — try
  scaling the view ~**10-15% larger** (camera zoom, or a global sprite/world scale bump)
  as a quick experiment before committing to a specific number.

## First biome — content notes (idea stage, not locked)

Early design notes for the first biome's content (source: the user's own notes, added
2026-07-06). These are directional, not final — names/quantities/gating may change once
implementation starts, and several bullets below raise open questions rather than
answers. This spans **Combat** (4) and **World & discovery** (6) above, and introduces
two mechanics not yet on the roadmap at all: a **Workbench** crafting-tier gate and a
**cooking/food** system.

**Workbench (crafting-tier gate) — shipped:** a placeable `workbench` item/recipe
(tier 0, **10 wood**, mirrors the campfire's placement flow). `Recipe.tier >= 1` recipes
(currently Stone Pickaxe, Stone Club) are **invisible in the crafting menu until the
player has placed a Workbench at least once** (`MainScene.hasWorkbenchPlaced()` gates
`Crafting.refresh()`'s discovery, separately from the usual "ingredients known" check —
this is intentional: a tier-1 recipe whose ingredients happen to already be known
shouldn't suddenly appear before any bench exists). Once discovered, actually
crafting/placing one still requires being within `WORKBENCH_RANGE` (~100px,
`MainScene.isNearWorkbench`) of any placed workbench — non-silent: the crafting-menu
detail panel shows an amber "Requires a nearby Workbench" line rather than just greying
out the button, and **re-renders live** as the player walks in/out of range while the
menu is open (not just a snapshot from when it was opened). Placed objects are tagged via
`image.setData("itemKey", ...)` so both proximity checks can filter `placedObjects` by
type without a bigger array-type change. Per the notes, Slingshot (not yet built) is also
intended to require a workbench once it exists.

**Tools**
- Stone Axe — **4 wood, 4 stone**, no workbench (tuned up from an earlier 3 wood/2
  stone after playtest). **Tool-only, not a weapon** (see item 4
  above) — deliberately doesn't equip as a weapon anymore, so it's not a free
  weapon-slot bonus on top of being the tool everyone crafts first.
- Stone Pickaxe — 4 stone, 3 wood, 1 leather scrap, requires workbench (now enforced;
  recipe now matches these numbers exactly).
- Torch — 1 wood, 1 gremlin blood, no workbench. (Current placeholder: 1 wood only —
  gremlin blood doesn't exist yet since gremlins don't exist yet.)

**Weapons**
- Wood Club — 4 wood, no workbench. (Recipe matches: 4 wood.)
- Stone Club — 2 stone, 3 wood, 1 leather, requires workbench (now enforced; recipe now
  matches these numbers exactly).
- **`leather` now has a drop source**: Snake (Milestone D, shipped — see the Enemies
  section below), which is why it was **bumped ahead of B/C in practical priority** — see
  the plan file's Milestone D "Why prioritized" note. Stone Pickaxe/Stone Club are now
  discoverable once a player has defeated at least one Snake.
- Slingshot — first ranged weapon: 2 wood + 2 leather scraps, requires workbench,
  consumes a new ammo item (**Slingshot Pellets**, crafted 5 stone → 25 pellets). First
  "consumable ammo" concept in the game.

**Crafting / cooking**
- Campfire — 5 stone, 5 wood, no workbench, placeable + destroyable (destroy-for-pieces
  still deferred, see STATUS.md's "known rough edges"). Used for heat, a new **rested**
  status (undesigned), and cooking.
- Empty Shishkabob + Boar Meat → Uncooked Boar Meat Shishkabob → place over a campfire →
  cooks over time → Cooked Boar Meat (consumable). First "combine two items," first
  "cook over time," and first food/consumable mechanic — none of these systems exist yet.
- **Crafting-menu tab reorg (shipped, Milestone 4f/I):** Workbench, Campfire, and Drying Rack
  all live in the **Crafting** tab (campfire is conceptually a processor too); Shishkabob
  moved to **Misc**. See `.claude/plans/this-is-a-plan-cached-pixel.md` Milestone I.
- **Gremlin Armor (shipped, Milestone M):** three wearable pieces replacing the old
  undifferentiated `gremlin_leather_armor` recipe — **Gremlin Cap** (helmet slot, 1
  gremlin_leather + 5 blackberries; lvl 2: 1 gremlin_leather + 1 blackberry), **Gremlin
  Shirt** (chest slot, 3 gremlin_leather + 1 leather scrap + 5 bones; lvl 2: 2
  gremlin_leather + 2 bones), **Gremlin Pants** (legs slot, 2 gremlin_leather + 2 leather
  scraps + 1 blackberry; lvl 2: 1 gremlin_leather + 1 leather scrap, additionally gated on
  a nearby Workbench having reached tier 1 itself). First real use of `Equipment.ts`'s slot
  system (dormant since Milestone H) — `Equipment` now stores `{key, tier}` per slot instead
  of a bare item key, since a worn piece's upgrade level lives there. Equip via **drag onto
  the paper-doll slot** or **right-click a backpack item** *(superseded in the Progression
  milestone's playtest pass — quick-equip is now **double-left-click** on the backpack item,
  not right-click; see `STATUS.md`)* (both work, either auto-equips —
  swapping any previously worn piece back to the backpack, or dropping it on the floor if
  full). **Right-clicking an already-equipped slot** opens that piece's lvl-2 Upgrade panel
  — reuses `UpgradeMenu.ts` verbatim (the same panel a placed station's Upgrade button
  opens), with a new `ArmorUpgradeDef` table (`src/systems/ArmorUpgrades.ts`) parallel to
  `StationUpgrades.ts`'s `StationUpgradeDef`. No numeric defense/damage-reduction stat yet —
  per the standing damage-types-are-later note below, equipping is visual/trackable only so
  far.

**Enemies (first combat content)**
- Gremlin — not yet built. Medium damage; ranged rock throw + melee claw; prefers to
  keep distance, claws only when player closes in; drops 1 Gremlin Blood.
- Snake — **shipped** (`src/entities/Snake.ts`, Milestone D): hidden at low alpha in
  grass, tight ambush-radius trigger (45px, vs Boar's 140px aggro), strike → flee →
  re-hide (hit-and-retreat, not a sustained chase) with its own cooldown before it can
  ambush again. **Deaggros while chasing** if it goes 4s without landing a bite or the
  player gets past 150px (own condition/numbers, not Boar's 30s/280px) — it's a
  hit-and-run ambusher, not a sustained hunter. Getting attacked branches on whether it's
  already bitten the player this engagement: hasn't yet → reveals and fights back;
  already has → flees a few seconds then wants to strike again (rather than fully
  disengaging). Low HP, high bite dmg (11 HP, 20 bite dmg, tuned up from an initial 5
  after playtest) vs Boar's 20/25. Drops 1 `leather` — reuses the existing `leather`
  `ResourceType`/item key (display name is **"Leather Scraps"**, per the naming
  resolution below; the key itself stays `leather`), no duplicate `leather_scrap` type.
  This is currently the game's **only
  leather source**, which is why it was prioritized ahead of B/C. Its HP bar (like Boar's)
  only shows once actually aggro'd — see `Enemy.isAggro()` — not while idle/hidden.
- Boar — **shipped in simplified form** (`src/entities/Enemy.ts`): melee bite only,
  simple aggro-radius chase AI, drops **exactly 1 boar_meat and 1 `bones`** per kill
  (tuned down from an initial 1-2/1-2 after playtest) — feeds the Drying Rack's updated
  recipe and Gremlin Shirt. No charge attack, no fear-of-fire yet — those (plus the
  "high damage, high aggro range" tuning) are still open follow-up work, not forgotten.
- **Spawn-count bump shipped (Milestone 4f/O):** a resource-density audit for the new
  Gremlin Armor set found `gremlin_leather` and `leather` demand exceeded what the old
  spawn counts could ever supply (RangedGremlin's 4-per-session and Snake's 6-per-session
  were each the only source of their respective raw material). `MainScene.spawnEnemies()`
  now spawns **RangedGremlin: 18** (was 4) and **Snake: 15** (was 6) — a real departure
  from Milestone C's original "rarer, stronger" ranged-Gremlin tuning intent, called out
  deliberately rather than silently overridden.

**Biome terrain** — three sub-areas within the first biome (not separate biomes):
- Thicker tree area — small trees/branches/rocks; boar + gremlin spawns.
- Grassy open area — scattered trees/boulders; snake spawns; gremlins can wander in from
  nearby tree areas.
- Creek area — can appear inside either area above; snake + boar spawns.

**Flora**
- Small Tree — requires Stone Axe *minimum* (first "bigger node gated by tool tier"
  case, consistent with the existing kind-not-tier prompt-gating design above); drops 5
  wood.
- Small Boulder — requires Stone Pickaxe minimum; drops 5 stone.
- Rock on ground — pickup, 1 stone (matches current).
- Branch on ground — pickup, 1 wood (matches current).

**Open questions / naming to resolve before implementation:**
- ~~"leather" (current `Items.ts` key) vs "leather scrap" (notes) — same material, pick
  one name.~~ **Resolved:** display name is **"Leather Scraps"** (`Items.ts`'s `name`
  field); the `ResourceType`/item **key** stays `leather` (renaming it would've meant
  touching every drop/cost reference for a cosmetic-only change).
- New resources needed: Gremlin Blood, Boar Meat, Slingshot Pellets.
- ~~Workbench: where is it placed, does it gate by proximity or just "owned," is it a
  placeable like the campfire?~~ **Resolved/shipped:** placeable exactly like the
  campfire, gates `tier >= 1` recipes by proximity (~100px) to any placed workbench.
- Rested status (from campfire) — what buff, undesigned.
- Ranged/projectile attacks (Gremlin's rock throw, the Slingshot) — first projectile
  system in the game.
- Enemy AI states beyond idle-wander/chase/melee (ambush-from-hidden, flee-on-fire,
  keep-distance-and-ranged-kite) — Boar's basic chase AI shipped with Combat's
  foundation pass; the rest are still open.
- **Damage types (slash/pierce/blunt/etc.) + resistances/weaknesses** — explicitly
  flagged by the user as a "later" concern. Floating damage numbers exist now
  (`MainScene.spawnDamageNumber`) but are plain white regardless of weapon/target;
  that's the spot to hook in type-based coloring/varied numbers once this system is
  designed.

**Per-enemy tunable combat stats (user decision, 2026-07-06):** the shipped Boar is a
proof-of-concept for the player/enemy interaction loop, not a template to copy numbers
from. Future enemies (Gremlin, Snake, later biomes) are each expected to tune their own
aggro radius + condition, deaggro time/radius/condition, DPS, HP, speed, and attack
methods — including different *conditions* (e.g. line-of-sight or noise-based aggro,
timer-based deaggro), not just different numbers plugged into `Enemy.ts`'s current
idle/chase/bite state machine. Don't generalize its constants into one shared config
table, and don't assume its 3-state machine is final, until a second enemy actually needs
different behavioral logic.

## Verification workflow

This is a browser game — after any change that affects rendering, movement, or
interaction, verify in the live preview rather than just type-checking:

1. `node node_modules/typescript/bin/tsc --noEmit` — cheap first check.
2. Use `preview_start` (config `"dev"`), then `preview_screenshot` to confirm it boots.
3. For interaction logic, prefer **`preview_eval`** to directly call scene methods/state
   (e.g. `window.__game.scene.getScene('MainScene')`, set `player` position, call
   `updateHover()` / `tryInteract()`, read `promptText.text` / `inventory.get(...)`)
   rather than trying to simulate real mouse coordinates — it's more precise and faster
   to assert against.
4. **Known preview quirk:** if the preview tab is backgrounded, Phaser's render loop can
   pause (`requestAnimationFrame` throttling), which can make `preview_eval` report scene
   state as not-yet-created and `preview_screenshot` hang/timeout. If that happens, stop
   the server (`preview_stop`) and start fresh (`preview_start`) rather than fighting a
   stuck tab.
5. Check `preview_console_logs` (level `error`) for runtime errors — Phaser boot banners
   and Vite HMR reconnect messages are normal noise, not errors.

## Working conventions

- Default model: **Sonnet** for regular feature work; reserve Opus/Fable for genuinely
  hard problems (see the model-choice guidance the user already has).
- One milestone/feature per chat session — start a fresh session (this file auto-loads)
  rather than continuing a long thread, to keep context small and cheap.
- Comments should explain *why*, not *what* — keep them light, per general code style.
- No new npm dependencies without a clear reason; the placeholder-art approach means we
  don't need an asset pipeline yet.
- **Plans must be committed in-repo.** After `ExitPlanMode`, copy the finalized plan file
  from wherever it was written into this repo's `.claude/plans/` and commit it alongside
  the feature. The global `~/.claude/plans/` dir isn't part of this repo and isn't
  guaranteed to be reachable from other sessions/machines — every prior milestone's plan
  file went missing this way until they were recovered and copied in here.
