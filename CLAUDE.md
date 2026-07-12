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
- **Hotbar row 2 (stations/processors) select:** **Alt+1-9** — a second, dedicated row
  of 9 slots (below row 1) for crafting stations/processors (Workbench, Campfire, Drying
  Rack, ...). Mechanically one flat 18-slot `Hotbar` (`src/systems/Hotbar.ts`,
  `ROW1_COUNT`/`ROW2_COUNT`) — row 2 is a UI/routing convention, not a separate
  selection system; selecting a row-2 slot enters placement mode exactly like row 1.
  Auto-pickup of a loose placeable (magnet or manual click) now prefers an empty row-2
  slot first, falling back to the backpack only once row 2 is full
  (`MainScene.findHotbarSlotFor`/`hotbarRow2Assignable`) — the goal is a
  place → gather → pick-up-and-replace loop that doesn't require opening the inventory.
- **Scroll-wheel-spans-both-rows toggle:** **H** — mouse wheel cycles hotbar selection
  across both rows by default; toggling `H` restricts it to looping within whichever
  row is currently selected.
- **Run info (clock + score) minimize toggle:** **J** — collapses the top-left run HUD
  to just the clock (hiding the live score) and back.
- **Take all (open chest only):** **R** — moves everything from an open chest into the
  backpack in one go, auto-stacking onto matching backpack stacks first.
- **Quick-move alias:** **Ctrl+Left-Click** on any inventory/hotbar/chest/drying-rack
  slot is a one-press alias for that slot's double-click quick-move gesture (backpack
  ↔ hotbar, chest ↔ backpack, drying rack input ↔ backpack) — no need to double-click
  quickly if Ctrl is held.

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

5a. **Minimap + fog of war** — shipped, first piece of roadmap item 6 (World &
   discovery). Locked via `AskUserQuestion`: passive display only (no fast-travel/
   waypoints), terrain + player position only (no entity blips), fixed reveal radius
   (no skill/item scaling). `src/systems/Fog.ts` (`FogOfWar`) owns a `Uint8Array`
   reveal grid sized 1:1 to the minimap's own pixel resolution (224x168, an exact
   4:3/scale-16 match for the 3584x2688 world) — `reveal(playerX, playerY)` marks
   every unrevealed cell within a 260px world radius as revealed, called each frame
   from `MainScene.update()`; revealed cells never re-fog. `src/ui/MinimapUI.ts`
   renders a top-right corner HUD panel — a `RenderTexture` terrain layer that draws
   one pixel per newly-revealed cell (incremental, never a full redraw), sampling
   `Biome.forestWeight()`/`creekWeight()` and blending the exact same colors
   `MainScene.buildBiomeTexture()` uses for the real ground, plus a small marker dot
   repainted every frame for the player's live position. **Same-day follow-up:** per
   the user, the minimap moved from an initial bottom-left placement to top-right,
   which meant clearing that corner first — the old always-visible **"[Tab] Menu"
   icon was removed entirely** (Tab key / Escape already drove the combined
   crafting+inventory menu independently, so the icon was a redundant click
   affordance, not the only entry point; `CraftingMenuDeps.onIconClick` and
   `CraftingMenu`'s icon GameObject were deleted, not just hidden) and both the
   **stat-points badge and the `CraftingMenu` panel shifted down** to sit below the
   minimap, computed from `MinimapUI`'s exported `MARGIN`/`PANEL_H` constants
   rather than hardcoded offsets so the three stay stacked without overlap if the
   minimap's size ever changes.
5b. **Gremlin Shack (first POI)** — plan: `.claude/plans/lexical-sleeping-journal.md`
   (Milestone P1 of a two-part plan; P2 is the Boss Altar/Gremlin King below). The
   game's first world-gen-placed (not player-placed) structure: `src/entities/
   GremlinShack.ts` pairs a non-interactive backdrop image with a small lootable
   chest sprite near its doorway (the chest, not the shack, is the interactable —
   matches "a shack that contains a barrel or chest," not "the shack itself is
   clickable"). New `src/systems/LootContainer.ts` (`LootContainer`, wraps an
   `ItemContainer` with an independently-per-entry-rolled loot table — rolls once
   per "empty cycle," not every guard respawn, so an unclaimed chest doesn't top
   itself back up for free) and `src/ui/ChestMenu.ts` (modeled on
   `DryingRackMenu.ts`'s flat-GameObject structure, simplified to two side-by-side
   grids with no slider/process step — items move purely via the existing
   `moveSlot()` primitive). 5 shacks scatter through the forest zone
   (`MainScene.spawnGremlinShacks()`, reusing `pickSpreadSpawnPoint()`), each
   guarded by 1 `RangedGremlin` + 1 `MeleeGremling` anchored near the shack;
   `MeleeGremling` gained an **optional** `wanderAnchor` constructor param (mirrors
   `RangedGremlin`'s existing spawn-anchored wander) so a shack guard can't
   random-walk away — every other free-roaming Gremling is unaffected (anchor
   defaults to unset). Guards respawn as a pair (not per-guard) 6 minutes after
   both are killed, and the chest re-arms to roll fresh loot on that same
   cycle — but only if it was already fully emptied by the player first. Reuses
   the hover/prompt/interact pattern verbatim (`promptForShack()` mirrors
   `promptForRack()` — reach-gated only, no equip gating, prompt reads
   `"[LMB] Open"`); `resolveItemDrag()` gained a new chest branch, a direct
   extension of the existing drying-rack-menu if-chain (not a generalized
   "container kind" system — deliberately not built until a 3rd/4th case
   actually needs it).
5c. **Boss Altar + Gremlin King (first boss)** — plan:
   `.claude/plans/lexical-sleeping-journal.md` (Milestone P2, same plan as the
   Gremlin Shack POI above). Roadmap item 7 (Bosses) — pulled forward and
   shipped alongside World & discovery/POI work since the user asked for both
   together in the same session. The user's locked direction: fully bespoke,
   Elden-Ring-style per-boss AI (telegraphed attacks, dodge/i-frame relevant,
   poise/stagger punish windows) — explicitly NOT a shared "boss framework,"
   same "own condition/numbers, don't generalize" philosophy the per-enemy
   combat stats note already establishes. This is the **tutorial biome boss**:
   tough but built entirely around the player's EXISTING dash + 150ms i-frame
   toolkit (`MainScene.ts`'s `DASH_IFRAME_MS`) — no new player ability was
   added for it; a dedicated teleport/blink is explicitly deferred to a future,
   tougher boss.
   - **`src/entities/BossAltar.ts`** — a world-gen-placed (not player-placed)
     fixed landmark (stone ring + fire pit), found via **exploration + escalating
     environmental hints**, not a minimap marker (consistent with the minimap's
     locked "terrain + player position only, no entity blips" rule). Its
     position (`MainScene.pickAltarPosition()`) is chosen once per session,
     **before** the Gremlin Shack scatter runs, so 2 of the 5 shacks bias
     toward it (`MainScene.pickPointNearAltar()`), plus a new stepped-band
     scatter of purely-decorative "gremlin camp" props and an **additive**
     (not a multiplier on Milestone O's tuned base counts) batch of 6 extra
     `RangedGremlin` + 4 `MeleeGremling` near it
     (`MainScene.spawnAltarDensity()`) — exploring toward denser gremlin
     content is the hint trail toward the boss.
   - **Gremlin Totem** (new craftable item/recipe, tier 1, Light Armor skill
     gate) is placed into the altar's own fire to summon the boss — reuses the
     "no tool of the right kind -> show nothing" prompt-gating philosophy
     (`MainScene.promptForAltar()`: no Totem selected in the hotbar -> no
     prompt at all) and `ItemContainer.removeCount()` for consumption (the
     same primitive `Crafting.craft()` uses for ingredients — NOT the
     placement system's single-slot consumption, since a Totem is a
     stackable consumable, not a `maxStack: 1` placeable). A short ritual
     delay (2.5s) precedes the actual spawn.
   - **`src/entities/GremlinKing.ts`** — extends `Enemy` (keeps the inherited
     HP-bar/loot/death-feedback machinery) but **fully overrides `update()`**
     without calling `super.update()` (same precedent `Snake.ts` already
     established for a subclass with entirely custom AI). A from-scratch
     `idle -> telegraphing(attack) -> executing(attack) -> recovering -> idle`
     state machine, interruptible into a `staggered` state from any point once
     a parallel **poise meter** (100, chipped 1:1 with damage dealt, second
     bar drawn below the HP bar — required widening `Enemy.BAR_W/BAR_H/
     BAR_OFFSET_Y` from `private` to `protected static readonly`) hits 0 —
     staggered grants **1.5x damage** (`GremlinKing.STAGGER_DAMAGE_MULTIPLIER`,
     applied in `MainScene.tryAttackEnemy()`) for a 3s punish window, then
     resets. Three melee/AoE attacks (no projectiles): a wide **cleave** arc
     (*superseded 2026-07-11 by a **leaping smash** — see `STATUS.md`; the
     cleave read as "just a worse 360° slam" and was replaced with a gap-closer
     that leaps to a locked landing point and impacts an AoE, alongside a boss
     damage bump*),
     a **charge** whose target is locked at telegraph-start and never re-read
     (so it's genuinely sidestep-dodgeable, not homing — the closest existing
     precedent, `Snake`'s lunge, re-aims every frame and was deliberately NOT
     copied), and a **ground slam** AoE with a growing-circle telegraph
     (reusing the exact world-space `Graphics`-redrawn-per-frame idiom
     `MainScene.updateAttackRangeRing()` already established). Below 50% HP,
     an **enraged** phase shortens telegraph/recovery durations and speeds up
     movement (not more damage — the ramp is about tighter timing, not a
     numbers wall); multipliers are captured once per state-entry so crossing
     the threshold mid-telegraph can't retroactively shrink an already-playing
     animation. Area damage to the player is queried via a new
     `GremlinKing.checkPlayerHit()` (richer than `Enemy.update()`'s plain
     boolean bite contract, since the slam carries knockback) — still funnels
     through the same `MainScene.applyDamageToPlayer()` choke point every
     other damage source uses (now widened with an *optional* knockback
     param, every other call site untouched), so dash i-frames/armor "just
     work" against it with no special-casing. Guaranteed unique trophy drop:
     **Gremlin King Fang** (no recipe yet — an explicit hook for future
     content). No portal/next-biome scaffolding exists yet, so the altar is a
     one-shot-per-session summon (`BossAltar.summoned` stays `true`
     permanently after one kill) — the natural hook point for a future
     biome-transition system, not built now.
5d. **Post-boss playtest fixes batch** — plan: `.claude/plans/post-boss-playtest-batch.md`.
   A grab-bag pass off first-boss-fight feedback, no new milestone letter beyond this
   one. **Boss HUD**: a big fixed
   top-of-screen HP + poise/stagger bar (`src/ui/BossHealthUI.ts`, Elden-Ring/Valheim
   style) alongside the existing small floating world-space bars — visible only while
   the boss is engaged (`GremlinKing.isEngaged()`), hides on deaggro or death. **Boss
   hitbox fix**: flat `REACH` was tuned around the ~20-26px regular roster and left the
   Gremlin King's 2.4x-scaled sprite nearly unreachable at its own edge; attack/prompt
   reach now scales with an enemy's visual radius past a baseline
   (`MainScene.enemyReach()`), enemy-size-generic rather than a Gremlin-King-specific
   special case. **Fixed-HUD depth bug**: the hotbar, minimap, HP/stamina/XP bars, and
   hover/placement prompts all used `setDepth()` values below `WORLD_H` (2688), so a
   tree/enemy near the bottom of the map (`setDepth(y)`) could render on top of them —
   every one of those bumped into the 2800-2902 range (still below the crafting/
   inventory panels' 3000+ and Tooltip's 4500). **Minimap altar landmark**: once the
   player explores within the same radius fog-of-war uses to reveal terrain, a
   discovered Boss Altar gets a one-time landmark marker burned into the minimap's
   `RenderTexture` (`MinimapUI.revealLandmark()`) — a discovered fixed structure, not a
   live entity blip, so the minimap's locked "no entity blips" rule stays intact.
   **Workbench recipe-discovery persistence fix**: `hasWorkbenchPlaced()` used to check
   *currently* placed workbenches, so destroying one re-locked every tier-1+ recipe's
   *discovery* (visibility) — a new sticky `everPlacedWorkbench` flag (set once, never
   reset) fixes it; proximity checks (`isNearWorkbench`/`isNearWorkbenchAtTier`) are
   unaffected and still track live placement state. **Gremlin Totem description** no
   longer names what it summons (was a spoiler) — describes the totem object itself
   and points at the Boss Altar as where it's used, nothing more. **Equipment stats
   panel**: the inventory menu (Tab) now has a third "Combat" column next to Backpack/
   Equipment showing the live equipped-weapon name, damage, attack speed, and attack
   stamina cost, plus total armor — `MainScene.combatStats()` mirrors the exact math
   `Tooltip.ts`'s weapon "base (adjusted)" lines already use. **Chest Take All + Ctrl-
   click quick-move**: an open chest supports **R** to move everything into the
   backpack in one go (auto-stacking); **Ctrl+Left-Click** is now a one-press alias for
   the existing double-click quick-move gesture everywhere it exists (backpack ↔
   hotbar) and newly added to the chest menu (chest ↔ backpack) and the Drying Rack
   menu (backpack → input, mirrors the existing right-click quickLoad). **Second
   hotbar row for stations/processors**: `Hotbar` is now one flat 18-slot container
   (`ROW1_COUNT`/`ROW2_COUNT` in `src/systems/Hotbar.ts`) — row 2 (Alt+1-9) is a
   dedicated spot for placeables, and auto-pickup of a loose station now prefers an
   empty row-2 slot before falling back to the backpack
   (`MainScene.findHotbarSlotFor`/`hotbarRow2Assignable`), aimed at a
   place → gather → pick-up-and-replace loop that doesn't require the inventory. Per
   the user (locked via `AskUserQuestion`): Alt+1-9 selects row 2 directly; the scroll
   wheel spans both rows by default, togglable back to current-row-only with **H**.
5e. **Second post-boss playtest batch, Groups A, B & C** — user locked the order via
   `AskUserQuestion`: **Group A (shipped) → Group B (shipped) → Group C (shipped)**. All
   three now done.
   - **Group A — quick fixes** (plan: `.claude/plans/delightful-tinkering-book.md`). Six
     small independent fixes: Running's passive sprint-XP rate bumped 10→20/sec (levels
     faster early, curve itself untouched); **Ctrl+Click now unequips armor** (the last
     gesture missing the standing Ctrl+Click-aliases-quick-move pattern); **clicking a
     placed Workbench opens the crafting menu** (previously it had zero hover/interact —
     new `hoveredWorkbench` mirrors the Drying Rack/Shack hover pattern, sourced from
     `placedObjects` rather than a new parallel array); **scroll-wheel hotbar cycling now
     skips empty slots**; **Boss Altar spawns further from world center**
     (`ALTAR_CLEAR_RADIUS` promoted to a named constant, 900→1400 — the "min distance
     from center" mechanism already existed via `pickSpawnPoint`'s `clearRadius`, just
     tuned too small); **Boss charge attack reliably damages on contact**
     (`GremlinKing.CHARGE_HIT_RADIUS` now scales by `BOSS_SCALE`, was a flat unscaled
     34px against a 2.4x-scaled sprite — same class of fix as the earlier
     `MainScene.enemyReach()` attack/prompt-reach scaling, just not previously applied to
     the boss's own charge math).
   - **Group B — HUD & stats display** (plan:
     `.claude/plans/group-b-hud-stats-display.md`). **HP/Stamina bars now grow
     proportionally with max pool**, capped at the hotbar's own on-screen width, via a
     new `MainScene.layoutBar()` helper (the background rects were previously never
     stored, so only the fill could rescale). **XP bar relocated to sit directly under
     the hotbar** at hotbar width (`HotbarUI` gained `width`/`left`/`bottom` getters;
     `BOTTOM_MARGIN` opened clearance beneath it) instead of stacking above HP/stamina.
     New **Run Speed breakdown** (`MainScene.runSpeedBreakdown()`) feeds the inventory
     Combat column's compact "Move Speed" line — `Player.ts`'s walk-speed constant is
     now exported as `PLAYER_WALK_SPEED`. Combat column also gained **damage broken out
     by type** (e.g. `Damage: 8 Pierce`, new `Weapons.damageTypeDisplayName()`) and an
     **Attack Range** stat line. **Same-day follow-up per the user:** Run Speed's full
     breakdown moved out of a standalone Stats-tab block and into the **Running skill's
     own hover tooltip on the Skills tab** — and every skill row (not just weapon
     skills + Running) is now hoverable, each showing its **live-computed current
     impact** off the real `Skills` instance (`Skills.skillImpactDescription(skill,
     skills)`, widened from a static per-skill-type string to take the live instance),
     including an explicit "No combat/gather effect yet — recipe gate only" message for
     the 6 skills with no wired mechanical effect (chopping/mining/heavy_armor/
     light_armor/blocking) that previously had no tooltip at all. Pure UI/wiring on top
     of already-designed systems, no
     new state machine or data model.
   - **Group C — Elite Gremlins + Trophy-gated Totem** (plan:
     `.claude/plans/witty-drifting-aurora.md`). The game's first **Elite enemy variant**:
     an opt-in `elite?: boolean` on both `RangedGremlin`/`MeleeGremling`
     (`src/entities/Gremlin.ts`) that applies **+50% HP, +50% damage, +10% move speed
     (new `Enemy.speedMult`, default 1), 1.4x scale, and a distinct crimson/gold texture**
     — no AI/state-machine change, just a stat/visual/loot modifier on the existing AI
     (consistent with the standing "own condition/numbers" rule being about behavior, not
     uniform stat scaling). **Only the Gremlin Shack guards are elite** — hooked in via a
     single `elite: true` on both guard constructors in `MainScene.respawnShackGuards()`
     (the shared initial-spawn + 6-min-respawn path), so 5 shacks × 2 guards = 10 elites
     in the world; every other gremlin (`spawnEnemies()`, `spawnAltarDensity()`) stays
     normal. Since 2 of 5 shacks already bias near the Boss Altar, an altar-proximity
     elite cluster falls out naturally. The **ranged Elite Gremlin drops a new
     `gremlin_trophy`** (1 each; the melee Elite Gremling does NOT — user decision;
     *superseded by the M-RL economy rework — see 5m: ALL elites, including melee
     Gremlings and now Boar/Snake, drop exactly 1 trophy, centralized in `Enemy`*), and
     both elite variants drop 2x their normal loot. The **Gremlin Totem** recipe was reworked from
     `{ gremlin_leather: 4, gremlin_guck: 3, bones: 8, twine: 4 }` + Light-Armor-lvl-3
     gate to **`{ gremlin_trophy: 3, wood: 1, gremlin_guck: 1 }`** with no skill gate
     (stays tier 1 / Workbench-gated) — so killing elites is both the difficulty ramp
     toward the boss and the means to summon it. `enemyReach()`'s existing sprite-radius
     scaling covers the bigger elite hitbox with no special-casing (same principle as the
     Gremlin King reach fix). Built on Opus per the model-switch convention (new
     mechanic).
   See `STATUS.md` for full detail and verification on all three.
5f. **Cooking & Food Buffs** — plan: `.claude/plans/savory-simmering-hearth.md`. The
   first food/consumable loop and the game's first **status-effect (buff)** system.
   Locked design (from the user): **eating grants a timed HP-regen buff only** (no
   instant heal — the user dislikes spam-insta-heal; each food has its own
   `hpPerSec`/`durationMs`, overheal at full HP is wasted), **cooking is instant +
   station-based** (interact with a placed campfire, no cook-over-time timer), and
   **no hunger meter**. New `src/systems/Buffs.ts` (`BuffManager` — framework-free
   like Health/Stamina; `apply()` refreshes-not-stacks the same food id, different
   foods run concurrently; `tick(delta, health)` heals per active buff), a
   `src/ui/BuffBarUI.ts` icon strip above the HP bar (depletion meter + hover
   tooltip), `src/systems/Cooking.ts` (`COOK_RECIPES` — a small multi-ingredient
   table, deliberately NOT a Recipes.ts category, so a dedicated cooking station can
   grow later), and `src/ui/CookingMenu.ts` (a recipe LIST, not the Drying Rack's
   single-input slider, since dishes are multi-ingredient; opened by clicking a
   placed campfire). Foods: **Cooked Boar Meat** (boar_meat + shishkabob at any
   campfire → +2 HP/s 20s) and **Bramble-Glazed Boar Skewer** (boar_meat + 2
   blackberry + shishkabob at a Lvl 2 campfire → +3 HP/s 30s). The **Campfire is now
   upgradable to Lvl 2** ("Stone Hearth", 20 Stone) which gates the tier-1 dish —
   reuses `StationUpgrades.ts` + the generic right-click Upgrade/Destroy popup with
   zero new upgrade wiring. Eating gesture: **right-click an `edible` item**
   (new `ItemDef.edible` field) in the backpack/hotbar. Death clears active buffs.
   Built on Opus per the model-switch convention (new mechanic).
5g. **M-FX (roguelike-batch warm-up fixes)** — plan:
   `.claude/plans/roguelike-metaloop-master-plan.md` (first milestone of a larger
   umbrella plan, see below). Three small independent fixes, built on Sonnet (fixes on
   existing systems, not a new mechanic): weapon damage is now kept **fractional** all
   the way to `Enemy.takeHit()` instead of being `Math.round()`ed before applying (a
   weapon skill's +0.5%/level bonus used to have **zero real effect** whenever it
   didn't cross a whole number — only the floating damage-number popup rounds for
   display now); the Gremlin Shack chest's loot re-arm moved from guard-*death* time to
   guard-*respawn* time (closes a double-loot exploit: loot → kill guards → immediate
   re-roll before the 6-min respawn timer, previously possible); the Character menu's
   Stats tab dropped its green "Unspent points"/`[+]`/"MAX" coloring for neutral amber
   — green/red are reserved for future buff/debuff markers, not plain UI state.
5h. **M-R1 (Run + Score + Hardcore Death)** — plan:
   `.claude/plans/rustling-weaving-lovelace.md` (second milestone of the roguelike
   meta-loop umbrella, first *new mechanic* of it — built on Opus). The **run container**
   the whole meta-loop hangs off. `src/systems/Run.ts` (framework-free like
   `Health`/`Buffs`) owns a display-only `seed`, a ticked `elapsedMs`, a kill tally
   (`normal`/`elite`/`boss`), and a pure `score()`: flat kill points (`10`/`30`/`500`) +
   a `2000` **completion bonus** (win only) scaled by a **speed multiplier**
   (`clamp(10min/elapsedMs, 1, 3)`, applied to the bonus only) — so a fast final-boss kill
   (×3) beats a slow full-clear and grinding flat kills can't out-scale it (the master
   plan's core scoring constraint). **Seed is display-only for now** (locked): shown +
   recorded per run, but "New Run" just `scene.restart()`s with fresh RNG — true
   deterministic world-gen from a seed is deferred to **M-W1**. `src/systems/HighScores.ts`
   is the game's **first `localStorage` use** (key `survivor-rpg:highscores:v1`, sorted
   desc, capped 20, tolerant of a missing/corrupt store). **Hardcore death** (a `HARDCORE`
   const) — `MainScene.onPlayerDeath()` ends the run instead of respawning; the legacy
   `respawnPlayer()` path survives behind the flag as the documented future "easy-mode"
   hook (nothing toggles it yet). **Win** = a `GremlinKing` kill in `tryAttackEnemy()`'s
   kill path fires `endRun("won")` after a 1.2s beat; kills are classified via a new
   readable `Enemy.elite` field + `instanceof GremlinKing`. `endRun()` freezes the world
   (a `runOver` early-return guard in `update()`), posts the score, and shows
   `src/ui/RunEndUI.ts` (full-screen modal modeled on `CharacterMenu`, depth 3500-3502;
   **VICTORY!** green / **YOU DIED** red title — the one sanctioned red/green use per the
   reserve-red/green convention — score breakdown, top-5 high-score table with this run's
   row highlighted, and a **New Run** button). `create()` now explicitly resets
   `runOver`/`isDead` + rebuilds the `Run` since `scene.restart()` re-runs `create()`
   without re-firing field initializers. `src/ui/RunHudUI.ts` is a live top-left
   clock+score readout (fixed-HUD depth 2820), minimizable to just the clock via **J**
   (KeybindsUI's panel nudged down from `PANEL_Y` 10→44 to clear it; EventLogUI follows).
   See `STATUS.md` for full detail + verification.
   **Playtest fix batch (same-day):** the first real playthrough found "New Run" was
   actually broken — `create()`'s reset only covered `runOver`/`isDead`/`run`, so every
   other per-run field (`this.enemies`/`this.nodes`/`this.placedObjects`/etc., plus every
   system instance — `Skills`, `PlayerProgression`, `Crafting`, backpack `ItemContainer`,
   `Hotbar`, `Equipment`, `EventLog`, `Stamina`, `Health`, `BuffManager`) silently carried
   over from the prior run (same field-initializer gotcha, just incompletely applied); the
   stale destroyed-entity arrays crashed the very first post-restart `update()` tick and
   froze the game. `create()` now resets **every** per-run field, so New Run is a true
   fresh-character reset (only the localStorage high-score table survives). Also added: a
   **`[ Clear ]`** link on `RunEndUI`'s high-score header (`HighScores.clearHighScores()`,
   `MainScene.showRunEndUI()` factored out of `endRun()` to support it), and first-pass
   `GremlinKing` tuning (cleave/slam range+damage up, charge speed 340→480, cooldown
   1200→950ms) off early playtest feedback. See `.claude/plans/rustling-weaving-lovelace.md`'s
   "Playtest fix batch" addendum + `STATUS.md`.
5i. **M-DN (Day/Night cycle)** — plan: `.claude/plans/clever-sparking-gem.md` (third
   milestone of the roguelike meta-loop, built on Opus). A global day/night clock —
   `src/systems/DayNight.ts` (framework-free like `Run`/`Health`): **10 min day + 5 min
   night** (15-min cycle, run starts at dawn), ticked with `delta` so it freezes with the
   run. Locked cycle length from the user (custom answer "10min day, 5min night"). Three
   effects: (1) **night tint** — `nightIntensity01()` ramps 0→1 over a 20s dusk, holds 1
   through deep night, 1→0 at dawn; (2) **enemies slightly faster at night** (×1.15, no
   damage buff — locked) via a new public `Enemy.envSpeedMult` assigned each frame in
   `updateEnemies()` and multiplied into every aggressive-movement velocity (base chase,
   Gremlin kite/pursue/chase, Snake strike/flee — idle wander left at base speed);
   **GremlinKing is exempt with zero special-casing** since its overridden `update()` never
   reads the field; (3) **nightfall surge + dawn cleanup** — at each day→night edge
   `spawnNightBatch()` drops ~6 normal enemies into still-fogged cells in a 500–850px ring
   around the player (`pickNightSpawnPoint()`, new `Fog.isRevealed()`), tracked in
   `nightSpawns`; at the night→day edge `cleanupNightSpawns()` destroys any that never
   aggro'd and are off-screen (locked: **density returns to baseline each morning**, no creep
   over a long run — engaged/on-screen ones stay). `Enemy.isAggro()` promoted to public for
   the filter; the surge only fires while alive; both edges run from `updateDayNight()`,
   called in the alive *and* dead branches of `update()`. **Torch lighting** (added this pass
   per the user): the night visual is a light-**mask**, not a flat rect —
   `src/ui/NightOverlayUI.ts` is a full-screen `RenderTexture` filled dark blue at
   `intensity × 0.42` from which soft radial light circles are *erased* (new `light_soft`
   canvas-gradient texture in `BootScene`). A held **Torch** lights the player
   (`equippedLightRadius`, data-driven per item in `LIGHT_RADIUS_BY_ITEM` — a future
   **Lantern** just adds a row; torch 180px), and **Gremlin Shacks + the Boss Altar** are lit
   (150px). Torch is now **non-stackable** (`maxStack: 1`). Depth ~2700 sits above the world
   but below the minimap/HUD so only the world dims. `RunHudUI` shows `[Day N]`/`[Night]`;
   `MinimapUI.setNightIntensity()` dims the minimap. `create()` resets
   `dayNight`/`wasNight`/`nightSpawns`/`equippedLightRadius` per the `scene.restart()` gotcha.
   See `STATUS.md` for full verification.
5j. **Comfort item (Bedroll)** — plan: `.claude/plans/imperative-riding-island.md`. Replaces
   the master plan's original **M-SB (Sleep/Bed)** milestone — the user decided against a
   sleep/skip-to-dawn mechanic since it would let players opt out of M-DN's night-time
   pressure (faster enemies, nightfall surge) for free every night. Instead: a new
   **`comfort`** placeable ("Bedroll" — "stuffed with reeds for cushioning," tier 0, `{
   wood: 3, cattail: 5 }`) grants **live/conditional +1 HP/s regen**, weaker than the
   weakest food buff (Cooked Boar Meat is +2 HP/s) so cooking still matters. Three
   conditions checked every frame, no stillness required: player within `COMFORT_RANGE`
   (80px) of a placed Bedroll, that Bedroll within `COMFORT_CAMPFIRE_RANGE` (120px) of a
   placed Campfire (a **hard requirement** — Comfort does nothing without a lit fire
   nearby, independent of its own tier-0 craft-gating), and no live enemy (aggro'd or not)
   within `COMFORT_SAFE_RADIUS` (350px) of the player. Rather than a new heal call + new
   HUD element, this **reuses `BuffManager`/`BuffBarUI` directly**: every qualifying frame
   re-applies a short-lived (`durationMs: 400`) `comfort_rest` buff via the existing
   `apply()` refresh-by-id path, so it renders with the same icon/tooltip/depletion-meter
   look as a food buff and expires on its own the instant conditions stop holding — no new
   UI code. `BuffManager`'s concurrent-buff cap raised 2→3 (`setMaxBuffs(3)` in `create()`)
   so Comfort doesn't get evicted by two simultaneous food buffs. Destroy/recover reuses
   the fully generic placed-object Destroy path (`destroyPlacedObject`) verbatim — no new
   wiring needed since it isn't itemKey-specific. Built on Sonnet (small, self-contained
   addition on top of already-designed systems, not a new core mechanic).
5k. **M-EL2 (generalized elite spawning)** — plan/detail: the roguelike master plan's
   M-EL2 section + `STATUS.md`. Reordered ahead of M-FA per the user (M-FA's "decaying
   bonus on entering a new biome" has no real biome-discovery event to hook until M-W1
   ships; this milestone is self-contained). Built on Sonnet — extends the already-shipped
   Gremlin/Gremling elite pattern rather than introducing new architecture. **Boar and
   Snake now have elite variants** (new `src/entities/Boar.ts` — Boar previously had no
   dedicated class, just a bare `Enemy` MainScene built inline at two call sites — plus an
   `elite?: boolean` param added to `Snake`'s constructor): +50% HP/dmg, +10% move speed,
   1.3x scale, 2x loot, crimson/gold recolor, mirroring Gremlin/Gremling's precedent
   exactly. Fixed a latent bug along the way: Snake's strike/flee velocity only ever
   multiplied by `envSpeedMult` (the night speed buff), never `speedMult` — an elite
   Snake's own speed bonus would have silently done nothing without this fix. **Elites are
   now chance-based everywhere** instead of all-or-nothing-per-site: a new
   `MainScene.rollElite(rng, chanceMult)` (base 8%) rolls at every normal spawn site
   (`spawnEnemies()`, `spawnAltarDensity()`, the M-DN nightfall surge), with a **3x chance
   multiplier at night** (~24%) applied only in the nightfall surge — a third night effect
   alongside M-DN's existing speed buff and enemy-density surge. **Gremlin Shack guards
   stay hardcoded `elite: true`**, unchanged — a deliberate fixed difficulty spike, not
   folded into the rolled system. Kill-scoring needed zero changes since it already reads
   `enemy.elite` generically.

5l. **M-FA cut** — the next milestone in the locked build order was M-FA (a per-biome
   "Fresh Assault" decaying kill-bonus timer on entering a new biome), but reviewing it
   after M-EL2 shipped surfaced that its premise has no real trigger yet (only one biome
   exists) and, more importantly, is likely **redundant with what M-R1 already ships**:
   M-R1's score formula already applies the speed multiplier only to the final-boss
   completion bonus, which is already the mechanism that rewards going fast end-to-end
   (locked decision 4). Rather than build a workaround (e.g. starting the timer at run
   start instead of biome-entry), **M-FA is cut from the build order entirely** — see the
   master plan's M-FA section for the full reasoning. Revisit only if M-W1's multi-biome
   world later shows a real gap the end-of-run speed multiplier doesn't cover.

5m. **M-RL (Relics — probabilistic trophy → relic economy)** — plan:
   `.claude/plans/radiant-binding-relic.md` (the ARPG/Slay-the-Spire spine of the roguelike
   meta-loop, built on Opus). Trophies won from elites/bosses are fed to a placed **Relic
   Forge** to attempt a **probabilistic** roll into a random relic. **Prerequisite (Part
   1): every elite now drops exactly 1 trophy**, centralized in base `Enemy`
   (`ELITE_TROPHY_DROP` appended to `loot` when `cfg.elite`) — reverses the M-EL2-era
   "melee Elite Gremlings drop no trophy" rule; `Boar`/`Snake`/`RangedGremlin`/
   `MeleeGremling` pass `elite` through to `super` and the ranged Gremlin's inline trophy
   entry was deleted (no double-drop). **Two axes (locked, the user):** *rarity*
   (Common/Uncommon/Rare/Mythic) is the effect pool + roll odds and is
   **source-determined by the trophy, NOT climbable — there is no manual combine**; *power
   tier* (biome depth) is a magnitude multiplier on a relic's numbers (`POWER_TIER_MULT`,
   geometric — flat ×1.0 this milestone, scaffolding for M-W1). **Roll:** 1 trophy per
   attempt, **success chance by rarity (Common 5% / Uncommon 10% / Rare 100%)**, a **failed
   roll still consumes the trophy**, and a **per-rarity pity counter** (`PITY_THRESHOLD`,
   Common 15) guarantees a success after N misses (kills the 5% feel-bad tail). *(Roll model
   REWORKED 2026-07-11 — see 5t below: the trophy's rarity now drives an OUTCOME TABLE over
   the result rarity (Common trophy can roll UP to Uncommon/Rare, ~13.5% total success);
   power tier = trophy tier; first roll of a run is guaranteed. These success-%-by-rarity
   numbers are superseded.)*
   **Duplicate auto-stacking IS the "combining":** rolling an id (at a power tier) you own
   merges into that entry with ×N + aggregated stats (effects were always additive — each
   instance contributes `base × its power-tier mult`). `TROPHY_ROLL`:
   `gremlin_trophy → Common/tier1` (the only live path), `gremlin_king_fang → Rare/tier1`
   (dormant — boss=win). *(This supersedes an earlier same-day ship of M-RL that used a
   manual 2→1 combine ladder; the combine mechanic was removed.)* `src/systems/Relics.ts`
   (framework-free) holds `RelicInstance {id, powerTier}` + a per-rarity miss counter;
   `roll(trophyKey, rng)` returns a `RollResult` (`{success, rarity, id?, powerTier?,
   pity?}`), plus `missStreak()`, `groupedForDisplay()` (by id@powerTier), and the same
   **aggregate effect getters** (damage/move/stamina/damage-taken/kill-heal/maxHP/
   maxStamina/XP, summed over instances × power-tier mult) MainScene reads at existing hook
   points. The **Relic Forge** is a tier-1 (Workbench-gated) placeable (`10 Stone / 5 Bones
   / 1 Gremlin Trophy`), reusing the generic placement + hover-by-itemKey + Upgrade/Destroy
   machinery (`promptForForge` → `"[LMB] Use Relic Forge"`). `src/ui/RelicForgeMenu.ts`
   (roll button per trophy with a `"5% · pity in N"` readout + inline success/"crumbled"
   result line + read-only owned grid with **T#** power-tier badges; **no combine bar**) and
   `src/ui/RelicBarUI.ts` (bottom-left grouped-gem HUD strip with a T# badge) are the UIs.
   **Effect hooks (unchanged from the first ship):** weapon `damageMult`, on-kill
   `killHeal`, `damageTakenMult` (pre-armor), `staminaCostMult` (weapon+tool),
   `Player.update(...moveMult)` for `moveSpeedMult`, max HP/stamina in `syncStatBonuses`,
   and `awardSkillXp` applying `xpMult`. Gem icons are one per rarity. `rollRelic` consumes
   the trophy **unconditionally** (success or fail) and returns the result for menu
   feedback; `create()` resets `new RelicManager()`. See `STATUS.md` for full verification.

5n. **M-RL playtest follow-up — per-species elite trophies + night-number HUD fix**
   (plan addendum in `.claude/plans/radiant-binding-relic.md`; built on Sonnet — extends the
   already-designed loot + relic systems, no new mechanic). Off the user's first relic
   playtest (20-min run → 1 Common relic pre-boss, judged "okay, hoping it scales" — no
   scaling knob changed, the design already funnels more elites/biomes into more rolls).
   **Every elite now drops a UNIQUE trophy by species** (was: all elites dropped
   `gremlin_trophy`, centralized in `Enemy` per 5m): Boar → `boar_trophy`, Snake →
   `snake_trophy`, Gremlin/Gremling → `gremlin_trophy`. Data-driven, not another central
   constant — `EnemyConfig.eliteTrophy?: ResourceType` (default `gremlin_trophy`, replacing
   the old `ELITE_TROPHY_DROP` const with `DEFAULT_ELITE_TROPHY`); the base `Enemy`
   constructor appends the elite's own trophy to `loot`, `Boar`/`Snake` pass their type,
   Gremlin/Gremling ride the default. New `boar_trophy`/`snake_trophy` resources
   (`Inventory.ts`/`Items.ts`/`BootScene.ts` crimson-gold icons). **All three roll the same
   Common pool + shared per-rarity pity counter** (`TROPHY_ROLL` maps each →
   `common/tier1/5%`), so more elite variety adds attempts without fragmenting the odds —
   M-W1's deeper biomes can remap a species' trophy to a higher rarity/tier per source. The
   **Relic Forge menu's roll buttons now wrap** into rows of 2 (labelled by trophy name) so
   3+ Common trophies fit the panel, with the result line + owned grid stacking below the
   measured button block. **HUD night-number fix**: `RunHudUI` showed `[Night]` with no
   number; new `DayNight.nightNumber()` (= the day it follows) makes it `[Night N]`,
   symmetric with `[Day N]`.

5o. **M-WC (Gremlin War Camp — altar POI upgrade + hints)** — plan:
   `.claude/plans/snug-leaping-mochi.md`; built on Sonnet (content + layout on the existing
   altar/shack/camp-spawn, minimap-landmark, and M-DN night-light systems, no new mechanic).
   Promotes the lone Boss Altar into a **walled Gremlin War Camp** so it reads as a *place*,
   not a lone structure. New `MainScene.spawnWarCamp()` (called after `spawnAltarDensity()`,
   deterministic via `sessionRng`, guard-returns if no altar) lays out purely decorative,
   non-solid, Y-sorted (`setDepth(y)`) props around `altarPosition`: a **palisade ring**
   (stakes every ~14° at ~230px, skipping a ~55° **entrance-gate arc** facing world center),
   **banners**, **totems**, **braziers**, and a **breadcrumb trail** of 2 sparse outer
   `gremlin_camp_prop` bands (500–1050px) extending the existing 3 inner bands so clutter
   *increases* as the player approaches (enemy counts unchanged — locked decision 7: prefer a
   bigger world over more enemies). Four new placeholder textures in `BootScene.ts`
   (`palisade_stake`/`gremlin_banner`/`war_totem`/`camp_brazier`). **Braziers glow at night**:
   their world positions feed a new `campLightPoints` field that `collectLights()` iterates
   (reusing the M-DN light-mask verbatim — the camp reads as an inhabited glow from a distance,
   verified against the dark forest). Shacks now **cluster denser near the camp** —
   `SHACK_NEAR_ALTAR_COUNT` 2→3, leaving 2 as wild standalone POIs (the user's locked choice —
   the scattered-POI exploration content stays). **Minimap landmarks**: the discovery pass
   (`updateAltarDiscovery()`, generalized) now also reveals each **Gremlin Shack** once explored
   within `REVEAL_RADIUS` (new `GremlinShack.discoveredOnMap`, a standing backlog item), in a
   distinct **wood-brown** (`0x8a6a3a`) vs the altar's **larger red** (`0xd6483a`, radius bumped
   2.5) so the war camp is the standout marker; `MinimapUI.revealLandmark()` gained an optional
   `radius` param for this. `campLightPoints` resets to `[]` in `create()` per the
   `scene.restart()`-field-init gotcha. No `RECIPES.md` change (no new recipes).
   **Same-day playtest follow-up** (the user: "the camp just looks so busy") — the real cause
   wasn't placeholder art, it was two systems drawing over each other with no exclusion zone:
   `spawnAltarDensity()`'s pre-existing 40-prop clutter band was still scattering on top of the
   new camp, and ordinary trees/rocks/bushes/enemies could spawn right through it. Fixed with
   shared constants `WAR_CAMP_RADIUS`(230)/`WAR_CAMP_CLEAR_RADIUS`(300) that `pickSpawnPoint()`
   and `pickCreekEdgePoint()` (Cattail's own bespoke sampler) both reject spawns within, plus a
   `scatterClustered()` jitter-fallback so bush clumps can't slip a node past the wall;
   `altarPosition` now gets picked *before* any node/enemy spawning in `create()` so all of
   this can see it. `buildBiomeTexture()` stamps a distinct packed-dirt camp floor. The old
   3-band clutter scatter in `spawnAltarDensity()` is gone — `spawnWarCamp()` is the single
   source of all camp dressing now, trail rebased to start just outside the clear zone (300px).
   The 3 near-altar huts are no longer a random `pickPointNearAltar` roll — `spawnGremlinShacks()`
   fans them evenly (100° apart, ~170px out) opposite the gate via a new shared
   `campGateFacing()` helper. Verified across multiple reseeds: 0 of ~396 world nodes land
   within 300px of the altar. Next per the locked build order: **M-TE (trophy-gated gear)**,
   then **M-W1** last.

5p. **Timed action bars + slot-machine relic rolls** — plan:
   `.claude/plans/generic-meandering-puffin.md`; built on Opus (new UI-animation mechanic +
   the game's first per-station "busy" concept). A playtest feel request from the user, off
   the master-plan build order — crafting/processing/cooking/relic-rolls all completed
   *instantly*, and he wanted a short **loading bar before the result lands**, in two feels:
   a *quick* bar for craft/process/cook (not a slog), and a suspenseful **slot-machine**
   spin for relic rolls where the landing is the payoff.
   - **`src/ui/ProgressBar.ts`** (new) — a small reusable fill bar (flat scrollFactor(0)
     rects, no Container per CraftingMenu's note). Tweens a `{v}` proxy 0→1 (not the
     Rectangle) so visuals can hide/cancel without killing the tween. One instance owned
     per menu, positioned over the action button, deliberately **not** in the per-frame-
     cleared `rows`. Durations: **craft 450ms / cook 500ms / process 600ms**
     (`Sine.easeInOut`); a **single bar for a whole batch** (an 8→4 dry is one bar).
   - **Commit-at-end:** inputs consumed + output granted only when the bar fills (existing
     synchronous `craftRecipe`/`processRackAmount`/`cookAtCampfire` unchanged, just invoked
     from `onComplete`). A per-menu `busy` flag greys the button + blocks re-clicks.
     **Closing a menu mid-bar cancels** cleanly (nothing consumed until it fills, so a
     no-op) — chosen over "complete after close" for uniformity, since the station menus
     lose their `openRack`/`openCampfire` ref on close. Placeable-recipe crafts (which enter
     placement mode) keep NO bar — the item lands on placement.
   - **`src/ui/RelicRevealFx.ts`** (new) — the Relic Forge's slot-machine spin, NOT the
     generic bar. The roll RESULT is resolved by the caller *before* the spin (trophy
     consumed + `RelicManager` mutated at click), so an interrupted spin never changes the
     outcome — pure theater over a known result. A ~1400ms `Quart.easeOut` bar decelerates
     while a **reel gem** rapid-swaps rarity icons + slows, then a **rarity-scaled reveal**
     (data-driven `REVEAL_CFG`): **Common** = modest gem punch + faint glow; **Uncommon**
     adds a panel flash + light shards; **Rare/Mythic** pile on a big additive glow burst
     (reuses M-DN's `light_soft` texture, tinted per rarity), flash, radial shard burst, a
     scaled-in `★ RARITY! ★` banner, + a subtle camera shake. A full-panel scrim dims the
     grid + eats clicks during the spin; **fail** = a grey crumble fizzle.
   - **Deferred announce:** `MainScene.rollRelic(trophyKey, announce=false)` for the menu
     path — the event-log line + `afterRelicChange()` (relic-bar sync + stat bonuses) now
     fire at the **reveal landing** via a new `announceRelicResult()` + the forge menu's
     `announceRoll` dep, not at click, so the payoff is the satisfying moment.
   - No `RECIPES.md` change (no recipe/cost changes). See `STATUS.md` for full verification.

5q. **Contextual hints + pause menu (playtest-readiness pass)** — plan:
   `.claude/plans/contextual-hints-and-pause-menu.md`; built on Opus (two new systems).
   **Off the master-plan build order:** the user paused **M-TE (trophy gear)** to first polish
   the first biome enough for outside playtesters — the biggest gap being a cold-start
   problem (a fresh player has no idea what the goal is or how the mouse-only controls +
   ~10 keybinds work, and the Keybinds panel defaults collapsed). This is the first item of
   that polish pass. **`src/systems/Hints.ts`** (`HintManager`, framework-free like
   `Run`/`Buffs`) is a Valheim-Hugin-style contextual tip system — explicitly **NOT a
   mascot** (the "raven" was only the user's behavioral reference). `trigger(id)` shows a tip
   **once per run** if enabled (idempotent — safe from a per-frame hover path). Locked
   design (the user): **keep it a challenge, no hand-holding** — the 8 tips teach controls +
   nudge toward mechanics but **never** spell out the totem→altar→boss win condition. The
   "already shown" set **resets each run** (fresh instance in `create()`), while the
   **on/off preference persists** in `localStorage` (`survivor-rpg:hints-enabled:v1`); a
   disabled hint is a **true no-op that doesn't mark itself shown**, so re-enabling mid-run
   still surfaces future first-occurrences. **`src/ui/HintUI.ts`** is a corner popup card
   (right-edge, mid-height, clear of minimap/hotbar/prompt/left-column) that slides in,
   holds 5.2s, fades, click-to-dismiss; one at a time (a new hint replaces the current);
   flat scrollFactor(0) objects, depth 2860/2861 (clears WORLD_H per the fixed-HUD-depth
   rule). The 8 triggers wire into existing hook points: `awaken` (spawn), `pickup_reach`,
   `tool_locked` (clicked a chop/mine node without the right tool KIND — nudges toward tools
   but **never names which**, preserving the prompt-gating design), `open_menu` (first
   recipe unlock → Tab), `stamina_empty`, `low_hp` (≤30%), `nightfall`, `elite_trophy`
   (gremlin/boar/snake trophy picked up → Relic Forge; NOT `gremlin_king_fang`, a win-state
   drop). **`src/ui/PauseMenuUI.ts`** is a pause overlay (**Esc**), modeled on `RunEndUI` —
   chosen over a standalone settings panel because it covers three playtest needs at once:
   the pause players expect, a Resume/New Run escape hatch, and the home for the Hints
   ON/OFF toggle (settings/menu didn't exist). **Freeze:** `openPauseMenu()` sets
   `isPaused`, zeroes player velocity, `physics.world.pause()`, `time.paused = true`;
   `update()` early-returns on `isPaused` so `run.tick`/day-night never advance —
   **pausing doesn't burn the speedrun clock**. Blocked once `runOver`/`isDead` (RunEndUI
   owns the frozen world then); world pointerdown guarded with `isPaused`; **Esc** opens
   pause only when no other menu is open (else it just closes that menu). All new fields
   reset in `create()` per the `scene.restart()` field-init gotcha (with a defensive
   `physics.world.resume()` + `time.paused = false` in case New Run was clicked from the
   pause menu). The Keybinds panel gained a `"Pause / close: Esc"` line for discoverability.
   No `RECIPES.md` change. **Remaining playtest-polish backlog** (from the same cold-start
   analysis, best partly driven by playtester feedback): discovered-material toast, hover
   highlight on interactables, inventory auto-sort, the minimap nearby-view + full-map
   rework, a ranged starter weapon, passive HP regen, and a balance pass. **M-TE stays
   queued** behind this polish pass.

5r. **Balancing dashboard + 25-min playtest triage** — off the master-plan build order,
   built on Opus (a new tooling deliverable, though not a game mechanic). the user's 25-min
   playtest produced a 12-item feedback dump; triaged and locked the order/scope via
   `AskUserQuestion`, and shipped **the dashboard first** this session. **`dashboard.html`**
   (repo root) + **`src/dashboard/main.ts`** are a **second Vite entry** (added to
   `vite.config.ts`'s `build.rollupOptions.input`) — a live, searchable HTML reference at
   **`/dashboard.html`** (while `npm run dev` runs). It **imports the same source-of-truth
   data modules the game does** (`Recipes`/`Items`/`Weapons`/`WeaponUpgrades`/`ArmorUpgrades`/
   `StationUpgrades`/`Processing`/`Cooking`/`Relics` — all Phaser-free), so it **never drifts**
   the way the hand-maintained `RECIPES.md` does: any recipe/cost/stat/relic change is
   reflected on reload with zero maintenance. Framework-free plain DOM, no new npm dep, no item
   icons (BootScene-generated at runtime). 8 tabs incl. a **Balance Overview** that computes
   incoming-damage-vs-armor (flat, floored at 1) and quantifies the "1 dmg/hit in Lvl 2 armor"
   complaint. **The one drift risk:** the **Enemies tab is manually mirrored** from the Phaser
   entity subclasses (enemy stats live in constructors, not tables) — keep it in sync when
   tuning enemies, same as `RECIPES.md`. `RECIPES.md` got a pointer to it. **Locked decisions
   from the triage, queued for follow-up sessions** (full detail in `STATUS.md`): **souls-like
   combat for ALL enemies** (telegraph + dodge window on every enemy — Opus, next combat
   session), a **light "both" rebalance** (small armor nerf + small enemy-dmg buff), a **boss
   damage bump** (~2-shot in full armor) + **replace the Gremlin King cleave** with a
   genuinely-different attack, five bug fixes (chest-pickup discovery, cook-recipe gating,
   relic grid-before-notification, stuck 0-count trophy roll button, level-up flash intensity),
   and two small features (Workbench-placement hint, in-game relic compendium). Not a game
   milestone — the dashboard is a dev/balancing tool.

5s. **Souls-like common-enemy combat** — plan: `.claude/plans/hashed-enchanting-finch.md`;
   built on Opus (new mechanic). The next item in the 25-min-playtest triage after the
   dashboard: kill the "kite forever by spam-left-click + walk away" feel by giving **every**
   common enemy (Boar/Snake/Gremlin/Gremling) a telegraphed attack + dodge window +
   recovery/punish window, like `GremlinKing` already has. **Mechanic only — the
   balance-number rebalance (armor/enemy-dmg/boss) stays deferred to a separate Sonnet pass.**
   Locked with the user: per-enemy **bespoke** attacks (NOT one uniform system — harder enemies
   feel distinct, common trash stays simple/kiteable); tells are **animation/motion/tint**
   (rear-back, wind-up scale-pulse, lunge), **NOT world-space red arcs/lines** ("too goofy" —
   players learn hitboxes over time); no audio system exists so sound tells are deferred; the
   ranged Gremlin telegraphs its **melee claw only** (projectile burst untouched). Shared
   *mechanism* on base `Enemy` (`AttackPhase`, `SwingConfig`, `tickMeleeSwing()`,
   `playWindupTell()`, public `pendingAttackKnockback`) with per-subclass *numbers* — same
   pattern as the give-up helpers, NOT a shared stat table. The core change: damage is
   re-checked against the player's CURRENT position at the **strike** frame (after a `windup`
   the player can react to), not on contact during approach — that's what makes wind-up
   dodging real; the `recover` window is the punish. Per-enemy identities: **Boar** got its
   own `update()` override — a signature locked-direction **CHARGE** that overshoots + long
   recovery, plus a point-blank gore-bite; **Snake** = coil wind-up that **locks** the strike
   direction (stopped its per-frame homing) → straight lunge, existing flee = punish window;
   **Gremling** = simple `tickMeleeSwing` claw (kiteable baseline); **RangedGremlin** = kiting
   untouched, telegraphed melee claw + shove knockback. Damage path unchanged
   (`update()`→true→`applyDamageToPlayer`); dash i-frames already negate strikes via
   `invulnerableUntil`. `GremlinKing` untouched (already had this). **Known limitation:** the
   shove knockback is near-cosmetic because `Player.update()` zeroes idle velocity every frame
   — a *pre-existing* trait of the same path GremlinKing's slam uses; left for the deferred
   combat-feel pass. No `RECIPES.md` change. See `STATUS.md` for full verification. **Remaining
   playtest-polish backlog** (from the same triage): light "both" rebalance, boss dmg bump +
   GremlinKing cleave replacement, 5 bug fixes, 2 small features — then master-plan tail M-TE, M-W1.
5t. **40-min-playtest fix batch (12 items) + relic rarity/tier rework** — off the master-plan
   build order, built on Opus (the relic change is a new data model). No new milestone letter.
   the user's session ("almost died a lot, feels harder — good"). **Relic rework (`Relics.ts`,
   supersedes 5m/5n's success-%-by-rarity model):** a trophy's rarity now drives an
   **outcome table** (`TROPHY_OUTCOME_ODDS` + `rollOutcomeRarity()`) over the RESULT rarity —
   **Common** trophy → 1% Rare / 2.5% Uncommon / 10% Common (else fail, never Mythic); **Uncommon**
   → 1% Mythic / 5% Rare / rest Uncommon; **Rare** → 10% Mythic / rest Rare (odds locked by
   the user). A Common trophy can **roll UP** into an Uncommon/Rare relic (`RollResult.rarity` =
   produced rarity, drives the `RelicRevealFx` reveal = the gamba payoff). A relic's **power tier
   always == the trophy's tier**. **First roll of a run is a guaranteed success** (the "hook",
   `firstRollDone`/`isFirstRollPending()`). `TrophyRoll` dropped `successChance`;
   `RARITY_SUCCESS_CHANCE` removed; added `trophyOverallSuccessChance()`. All first-biome trophies
   stay Common/Tier 1. Verified live (20k rolls match spec + pity). Forge readout + dashboard
   Relics tab + `RECIPES.md` updated. See [[survivor-rpg-relics]]. **The other 11 (playtest
   notes):** dashboard Armor **Lvl 3** column (was Base+Lvl2 only, full-set 7/10/13); **Boar/Snake
   face their charge/coil wind-up** (new `Enemy.faceAngle()` — `applyFacing()` no-ops on the unit
   vectors those tells passed); **committed attacks aren't interruptible by hits**
   (`Enemy.playHitFeedback()` skips the position-shake only while an attack is *moving*, so a
   charging Boar plays out); **GremlinKing regens 12 HP/s + poise while fully deaggro'd** (kiting
   to rest isn't a free chip-damage bank); **smash `SMASH_RADIUS` 120→95** (a walking player only
   travels ~102px in the telegraph+leap, so 120 was undodgeable by movement — i-frames confirmed
   working via `applyDamageToPlayer`'s `invulnerableUntil` guard); **Snake Meat** resource (Snake
   drops it) + **Cooked Snake Meat** / **Blood-Glazed Snake Skewer** cook dishes; **bones economy**
   (Boar bones 1→1-2, elite 2→2-3; Bone Knife Lvl 2 cost 5→3 — chose drop-bump+cost-ease over a
   boar-respawn system, noted as a future option); **stamina hint** reworded (no longer blames
   sprinting); **workbench placement bug** (crafting a placeable left the crafting menu open → a
   following recipe click fell through and placed ANOTHER workbench; `startPlacement()` now closes
   it + a guard skips placement clicks over the crafting panel); **placed-object "Destroy" →
   "Pick up"** (it returns a recoverable item; backpack-stack "Destroy" — a real delete — kept);
   Relic Forge description dropped the stale "or combine relics". See `STATUS.md`.
5u. **Elite melee reach fix** — off the build order, a live combat bug fix (Sonnet-class,
   done on Opus alongside a brainstorm). An **elite** enemy's `setScale` also grows its
   Arcade physics **body**, so the player↔enemy collider held their centers further apart
   than the enemy's flat melee-start threshold — a scaled-up elite "ran up but never
   attacked" (worst on diagonal approaches, hence "sometimes"). Fixed with a principled
   `Enemy.reachBonus()` (`(baseScale-1) * max(width,height)/2` — the exact body-half the
   scaling added; 0 for non-elites) applied to **every** melee reach check across the roster
   (`tickMeleeSwing` strike, base/Gremling `MELEE_RANGE`, RangedGremlin enter/exit-melee,
   Boar gore+charge, Snake lunge). It's the **mirror** of `MainScene.enemyReach()`: that
   scales the *player's* reach vs big enemies, this scales the *enemy's own* reach vs its own
   scaled body — any future scaled/elite enemy gets it for free. See `STATUS.md`.

5v. **Circular bigger world + minimap nearby-view + full-map overlay (M-W1 geometry
   prep)** — off the build order, built on Opus (new world-gen geometry + two new map
   systems). The world is now a large **circle**: `MainScene` constants `WORLD_RADIUS`
   4000 (→ `WORLD_SIZE` 8000px square bounding it), `BIOME_RADIUS` 2000 (central content
   circle, ~the old 3584×2688 biome slightly larger), centered at `WORLD_CX/CY` = 4000;
   `WORLD_W`/`WORLD_H` kept as back-compat aliases = `WORLD_SIZE` (all the existing
   `WORLD_W/2`-is-center math still holds). Everything from `BIOME_RADIUS` out to
   `WORLD_RADIUS` is **empty grass for now** — headroom for future biomes (danger scales
   outward, the locked M-W1 direction). **`Biome` is origin-aware** now
   (`new Biome(originX, originY, regionW, regionH, rng)`): it generates only a centered
   `BIOME_SIZE` region, `forestWeight`/`creekWeight` return 0 outside it, and
   `buildBiomeTexture()` bakes only that region (a `BIOME_SIZE`² RenderTexture at the
   region origin — kept under the GPU texture-size limit, not a full-world 8000px bake).
   All spawn samplers (`pickSpawnPoint`/`pickCreekEdgePoint`/`pickPointNearAltar`) sample
   the region and reject points outside `BIOME_RADIUS`, so content stays central;
   `clampPlayerToWorld()` pins the player to the world circle each frame and
   `drawWorldBoundary()` draws a dark **void ring** + shoreline beyond `WORLD_RADIUS`
   (cheap concentric strokes, no huge texture). **Depth regression fix (important):**
   enlarging the world pushed world-object Y-sort depth (`= y`) up to ~8000, drawing low
   trees/enemies over the fixed HUD (2600–6000); new **`src/systems/depth.ts`
   `ysortDepth(y) = y * 0.3`** compresses the world Y range into a bounded band (max
   ~2400, below the HUD), applied at every world Y-sort site
   (Player/Enemy/ResourceNode/GremlinShack/BossAltar + war-camp props) — **any new
   Y-sorting world object must use `ysortDepth`, not raw `y`.** **Map rework, three
   pieces:** (1) **`src/systems/ExploredMap.ts`** (new, framework-light) — the shared
   explored-world model: a world-space fog color cache (0xRRGGBB per 40px cell, −1 =
   unrevealed) + discovered-POI landmark list, the **single consumer** of `FogOfWar`'s
   reveal queue (fog grid is now world-space 200²@40px, decoupled from any HUD panel).
   (2) **`MinimapUI` rewritten** — the corner panel is now a **player-centered nearby
   window** (~2240×1680 world px, repainted each frame as clipped Graphics rects), with
   landmark dots + a small "🗺 Map (M)" button. (3) **`src/ui/WorldMapUI.ts`** (new) — a
   full-screen overlay (M / Map button / ✕ / Esc): the whole explored fog cache drawn as
   clipped zoom/pan-transformed Graphics rects (dirty-flag terrain rebuild), **scroll =
   zoom, drag = pan**, discovered POIs get **icon + label** (`map_altar`/`map_shack`
   BootScene markers). **Non-modal** — the game keeps running and the player can walk
   while it's open (world clicks/hover suppressed over it; no pause). Keybinds panel
   gained a "World map: M" line. No `RECIPES.md` change. See `STATUS.md` +
   [[survivor-rpg-minimap-fog-of-war]].

5w. **Gloaming Vein (mineable rarity-ore POI + Gloamwarden mini-boss + trophy refinement)**
   — shipped (plan: `.claude/plans/amethyst-warding-vein.md`, built on Opus — new mechanic).
   A content+economy pass on the M-RL relic loop, slotting in ahead of M-TE. A rare, finite,
   purple ore POI (glows purple at night) hard-gated behind a mini-boss, whose Gloam Shards
   are spent at the **Relic Forge's new "Refine" tab** to climb trophy rarity — turning
   crumble-prone raw Common trophies into guaranteed-roll Refined trophies. **The POI**
   (`MainScene`): `veinPosition` is picked once in `create()` after the altar (kept ≥900px
   from both world center and the war camp) and before spawning, so a new `VEIN_CLEAR_RADIUS`
   exclusion in `pickSpawnPoint` keeps ordinary content out of the clearing (same pattern as
   the war camp — [[feedback_poi_busy_not_placeholder]]); `spawnGloamingVein()` drops the
   Gloamwarden guardian ringed by **5 shielded ore `ResourceNode`s** (Stone-Pickaxe `mine`,
   non-respawning, 1–2 Gloam Shard each) + 10 decorative `gloam_crystal_cluster` props. New
   `ResourceNode.shielded` + `crack(texture)`: shielded nodes are skipped by
   hover/prompt/interact (like `harvested`) and swap `gloaming_vein_shielded`→`gloaming_vein`
   on the guardian's death. **Unique area look** (like the war-camp floor): `buildBiomeTexture()`
   stamps a distinct gloam-blighted crystalline floor over the clearing (dark-violet + amethyst
   core). Vein positions feed `veinLightPoints` (purple night glow via `collectLights`) + a
   purple `map_vein` minimap landmark once discovered. **The guardian**
   (`src/entities/Gloamwarden.ts`): a bespoke mini-boss following GremlinKing's telegraph/poise
   pattern but **lighter** (per the "no shared boss framework" lock — a trimmed sibling, NOT a
   subclass) — extends `Enemy`, fully overrides `update()`. 260 HP, scale 1.7, poise 60 →
   stagger (×1.5 punish), regens 10 HP/s deaggro'd; two **bespoke** purple-telegraphed attacks
   (deliberately NOT the roster's charge/radial-slam — the user's call): a **Leaping Smash**
   (leap to a locked spot + AoE 95px, 22+kb — kept to preview the Gremlin King's own smash)
   and a **Gloam Eruption** (rooted channel → crystal spikes at the player's locked ground
   spot, 24 + small launch — a punish window; dodge = leave the marked ground), routed through
   `checkPlayerHit()` (queried in `updateEnemies` like GremlinKing) → `applyDamageToPlayer`, so
   dash i-frames/armor just work. Death cracks the vein + drops 3–4 Gloam Shard + 1 Refined
   Trophy; scored as an **elite** kill. **Refinement** (`Relics.ts` + `RelicForgeMenu.ts`):
   data-driven tier-keyed `REFINE_RECIPES` + `refinableTrophyKeys`/`ownedRefineInput`/
   `canAffordRefine`; biome-1 recipe **3 raw Common trophies (any species mix) + 2 Gloam Shards
   → 1 Refined Trophy** (rolls the Uncommon outcome table = never fails). Refined trophies are
   **roll-only** `TROPHY_ROLL` keys (never dropped, never a refine input — **single-step +
   terminal**, capping biome 1 at Refined Uncommon while the system already supports
   raw-Uncommon→Refined-Rare scaffold for deeper biomes). The forge menu gained a **Bind /
   Refine tab toggle** ("Bind" is the in-universe name for rolling — the forge binds trophies
   into relics; timed `ProgressBar`, commit-at-end); **the Refine tab is hidden
   entirely until the Relic Forge reaches Lvl 2** (no locked tab/hint) — a new **Gloam
   Conduit** station upgrade (15 Stone + 1 Gloam Shard, `StationUpgrades.ts`) unlocks it, so
   refining needs at least one mined shard. This
   **deliberately overrides M-RL's "rarity not climbable / no manual combine" lock**, but as a
   *gated* climb (rare resource + mini-boss), consistent with "nothing free." See `STATUS.md`
   + [[survivor-rpg-gloaming-vein-plan]].

5x. **Playtest-readiness Tier 1 (discovered-material toast + hover highlight + first-damage
   hint)** — off the master-plan build order; the first slice of the playtest-polish
   backlog (5q/5r), aimed at getting the build ready to hand to outside playtesters before
   audio or real pixel art/animations get touched (both stay deliberately deferred — see
   roadmap item 8 and the note below). Shipped on Sonnet (fixes/UI on existing systems, no
   new mechanic). **Discovered-material toast**: a new `LogKind: "material"` reuses the
   existing recipe-unlock slide-in toast machinery (`EventLogUI`) in a distinct blue
   accent, fired once per key from a new centralized `MainScene.discoverMaterial()` (every
   `discovered.add()` call site now routes through it) — excludes crafted/cooked/processed/
   refined outputs (a `CRAFTED_OUTPUT_KEYS` set unioned from `RECIPES`/`PROCESS_RECIPES`/
   `COOK_RECIPES`/`REFINE_RECIPES`), since those already get their own unlock toast.
   **Hover highlight**: a world-space `Graphics` outline around whatever's hovered,
   strictly gated on the exact same `prompt` string the bottom-right text already uses —
   preserves the "reveal nothing the prompt-gating design hides" rule with zero new gating
   logic. **First-damage hint**: the `low_hp` hint (renamed `took_damage`) moved off a
   per-frame "≤30% HP" poll to fire once, right when the player actually takes their first
   hit — teaches the food/rest healing loop before a real health scare, not partway into
   one. **Passive HP regen was explicitly cut** from the backlog (the user's call): Comfort
   (Bedroll, 5j) + cooked-food buffs (5f) already own HP sustain, and a passive trickle on
   top would undercut the reason to use either. Full verification in `STATUS.md`.
   Real pixel art + animations stay last, after content/balance settle further — see
   roadmap item 8.
5y. **Inventory sort/split + ranged starter weapons (Slingshot + Javelin) + minimal SFX**
   — closes out the rest of the playtest-polish backlog from 5x/5q/5r. Plan:
   `.claude/plans/twinkly-orbiting-backus.md`. **Inventory auto-sort** (a "Sort" button by
   the Backpack header, `ItemContainer.sortAndStack()`) and **Shift+Left-Click split-stack**
   (splits a stack of >1 into an empty slot in the same container, then drags the split-off
   half — works everywhere `beginItemDrag` is the entry point: backpack/hotbar/chest/drying
   rack) are both Sonnet-class fixes reusing existing drag/drop machinery, no new resolve
   logic. **Ranged weapons** are the session's new mechanic (built on Opus): **Slingshot**
   (2 dmg/650ms/6 stam, uses a new **`"ammo"`** `EquipSlot` loaded with Slingshot Pellets)
   and **Javelin** (5 dmg/900ms/16 stam, self-contained disposable hotbar stack — no ammo
   slot, throwing depletes itself). Locked via `AskUserQuestion` + a side-chat balance
   discussion: aiming reuses the existing click-a-hovered-enemy-in-reach model (not
   free-aim); ranged starts **deliberately weak** — an opener/softener, not a solo tool —
   with slow projectiles (420/300 px/s) and bounded range (260/220px) as the anti-kite
   governor alongside stamina cost; **no enemy-AI changes** this batch. `EquippedItem`
   gained a `count?: number` field so the ammo slot reuses the *existing* armor-equip
   machinery (branching on `slot === "ammo"` for merge-not-swap semantics) instead of a
   parallel system. `tryAttackEnemy` is now a thin dispatcher over `tryMeleeAttack`/
   `tryRangedAttack`, both funneling into a shared `resolveWeaponHit()` extracted from the
   old kill-resolution tail. Both weapons use `"ranged"` as their damage type, finally
   giving the long-dormant Ranged weapon skill a real XP source. `Recipe.output` gained an
   optional `count` (defaults 1) so Slingshot Pellets (5 Stone → 25) and Javelin (3 Wood +
   1 Stone → 2) can batch-output. **Minimal SFX**: `src/systems/Sfx.ts` (`SfxPlayer`) — raw
   Web Audio oscillator/gain envelopes synthesized at call time (no asset files, same
   generate-in-code ethos as `BootScene`'s textures), 6 cues (hit/pickup/craft/levelUp/
   nightfall/death) wired into existing hook points, plus a persisted on/off toggle in
   `PauseMenuUI` next to the Hints toggle. **Live-verified via `preview_eval`** (after
   clearing 5 orphaned Vite processes from closed chats that were holding the per-folder
   server cap): slingshot fire/impact/ammo-decrement, 0-ammo + out-of-range silent no-ops,
   javelin self-consume + auto-unequip at 0, melee unaffected, auto-sort, shift-split, and
   all 6 SFX cues (no console errors). Full detail in `STATUS.md`.
5z/5aa. **Two playtest fix batches** (Sonnet, fixes/tuning only — full detail in
   `STATUS.md`, not re-narrated here): SFX/flash feel tuning, top-toast overlap fix, batch
   quantity sliders for crafting/cooking, Javelin/Slingshot-Pellets gating, forge roll UI
   consolidated to one-button-per-rarity (5z); then one-shot placement, level-up flash
   removed, station-label depth fix, aggro-based (not radius-based) Comfort resting,
   output-unit craft slider, cook-menu overflow fix, craft-into-hotbar stacking, boss
   return-to-spawn on deaggro, War-Camp guards no longer respawn mid-fight, and a
   victory/death-screen input lock (5aa).
5ab. **M-SS (Stats & Skills depth pass — crit + distinct-axis effects + relic synergy)** —
   plan: `.claude/plans/crit-tempering-lodestar.md`, built on Opus (new combat mechanic +
   relic data-model change). **This SUPERSEDES the stat/skill numbers described in roadmap
   item 5 (Progression) above** — read this entry for the current values. The locked
   three-layer split: Relics = raw-% stat layer, crafted gear = uniqueness/procs (M-TE,
   later), Stats/Skills = the reliable player-steered layer on axes relics don't touch.
   **New all-weapon CRIT system**: split by AXIS — **Strength = crit multiplier**
   (+0.04×/pt, cap 3.0×), **Agility = crit chance** (+0.5%/pt, cap 60%), both retiring the
   old per-class stamina-cost knob (`weaponStaminaCostMultiplier` fully removed). Per-weapon
   **base crit** lives in `Weapons.ts` (`WEAPON_BASE_CRIT_CHANCE`/`_MULT`; slow weapons
   higher — primal_spear 8%/1.6×, fast bone_knife 4%/1.5×) — an attack-speed lever + what
   keeps each stat worth a point alone. Pipeline (multiplicative, `MainScene.applyCrit`,
   `Math.random` — combat crit isn't seeded): `weaponBase × (1+skill%) × (1+relic dmg%) ×
   staggerMult × (critRoll?critMult:1)`, rolled in `tryMeleeAttack` (at hit) and
   `tryRangedAttack` (at fire, carried by a new `Projectile.isCrit` since impact has no
   weapon context). Crit tints the damage number orange + plays `Sfx.crit()`; the inventory
   Combat column + weapon Tooltip surface it. **Stat effects (all live now)**: Endurance +3
   max stam & +2% stamina-regen/pt; Vitality +4 max HP & +1.5% healing-received/pt (food/
   Comfort/kill-heal, NOT passive regen); Intelligence +1.5% skill-XP/pt (stacks w/
   Scholar's-Idol relic); **Willpower → Wisdom** = +2% buff/food duration/pt. Secondary
   axes are centralized in `Health.setHealMult`/`Stamina.setRegenMult`/
   `BuffManager.setDurationMult`, all pushed from `syncStatBonuses` (which `allocateStat`
   now always calls). **Skill effects**: light_armor → +5ms dash i-frame/lvl over the 150ms
   base (cap +100ms); running also cuts sprint stamina drain −1%/lvl (cap −40%); chopping/
   mining → +1%/lvl (cap 60%) chance for a bonus +1 drop on a depleted tree/rock (incl.
   Gloam ore). **Per-piece armor XP** (new `Items.armorTypesWornPerPiece`, replaced the
   deduped `armorTypesWorn`) — full-light gives 3 light ticks; heavy_armor/blocking stay
   deliberately dormant (biome-2 heavy gear / a real parry mechanic) with an explicit "no
   effect yet" impact line; the 5 weapon-damage skills are unchanged (reserved as the M-TE
   proc-threshold hook). **Relics synergize now**: HP/stamina channels went **flat →
   percent** (`maxHpPct`/`maxStaminaPct` — Stout 15%, Vigor 20%/18%, Titan 40%/30%) so
   `syncStatBonuses` compounds `(100 + statBonus) × relicPctMult`; new crit relic channels
   (`critChancePct`/`critDamagePct`) + two seeds (Common **Keen Charm** +5% crit chance,
   Uncommon **Savage Idol** +0.30× crit dmg). All numbers first-pass/tunable. `RECIPES.md`
   relic table + dashboard weapons tab updated. See `STATUS.md`.

**A new umbrella plan for the long-requested roguelike run/score meta-loop** now exists:
`.claude/plans/roguelike-metaloop-master-plan.md` (drafted 2026-07-10, locked build order
confirmed by the user). It supersedes/finalizes several open questions in the **Long-term
design notes** section below (portal concept dropped in favor of one giant circular world;
hardcore one-life death instead of the tombstone-and-respawn model, for now) — see that
plan file for the full locked-decision list before touching anything in items 6 (World &
discovery) or 7 (ARPG loot). Locked build order: **M-FX (done) → M-R1 (Run/Score/
Hardcore death, done — see 5h) → M-DN (Day/Night, done — see 5i) → Comfort item (was
M-SB/Sleep-Bed, done — see 5j) → M-EL2 (generalized elite spawning, done — see 5k) →
~~M-FA~~ (cut, see 5l) → M-RL (trophy → RNG relics, done — see 5m; playtest follow-up 5n) →
M-WC (Gremlin War Camp, done — see 5o) → Gloaming Vein (rarity-ore POI + trophy refinement,
done — see 5w) → M-SS (stats/skills depth pass + crit, done — see 5ab) → **Biome 2 /
M-W1 + M-TE, IN PROGRESS — Phase 0 worldgen (5ac) + Phase 1 combat systems (5ad) done; Phase 2
enemies next (see the biome-2 umbrella plan below).**

5ac. **Biome 2 (Sunscorch Badlands) — Phase 0: Patchwork worldgen.** Plan:
   `.claude/plans/biome-2-phase-0-world-ring.md` (Phase 0 of the
   `.claude/plans/biome-2-sunscorch-badlands.md` umbrella — see below). Built on Opus
   (world-gen rework). **An initial concentric-rings version shipped and was reworked the
   same session** — the user found rings too uniform and wanted Valheim-style diversity, so
   the umbrella plan's ring model is superseded by a **patchwork**. Locked model: biome 1
   stays a solid **protected forest disc** (unchanged, safe tutorial); *beyond* it, a
   **universal base layer** (grades grass→dusty outward) with biome **blobs** painted on top
   (`src/systems/WorldBiomes.ts`), each blob's biome drawn weighted by
   `danger = radialTier(r) + noise` (moderate variance). Biome types repeat; blobs blend at
   seams with base-layer gaps between; nastier biomes get likelier outward. Two outer biomes
   exist as **terrain only, no content**: the **Sunscorch Badlands** (dusty red-brown clay +
   mesa/flats/ravine, `Badlands.ts`) and a **placeholder Dunes** (pale sand, `Dunes.ts`, added
   just so the patchwork reads with >1 biome). Both reuse one **tiled** `Biome` for feature
   detail (new `Biome` `tiled` mode). **The world grew to `WORLD_RADIUS` 14000 (28000px)** for
   ~5 biomes; `depth.ts` `WORLD_DEPTH_SCALE` shrank 0.3→**0.09**. Rendering is bounded at any
   world size: forest keeps its crisp full-res bake, the outer ground is ONE `bakeOuterOverlay`
   RenderTexture (4096², LINEAR, stretched over the world). **Gotcha found: a world-sized
   `tileSprite` OOMs** (28000²≈3GB) — grass is now forest-region-sized only. Map:
   `WorldMapUI` opens centered on the player. **Same-session refinements (the user):** biome
   ordering = **radius sets a danger CEILING** (`ceilingTier`/`pickBiome` — a blob may be any
   biome with `tier ≤ ceiling(r)`, so higher biomes are gated behind an unlock radius but lower
   ones appear anywhere; forest is now a blob biome too, spawning beyond the disc while the
   center chunk stays biome-1-only); a **current-biome minimap label** + **first-entry discovery
   toast** (new `"biome"` `LogKind`); and a `Ctrl+Shift+M` **dev reveal-whole-map** command
   (undocumented). Forest content/gameplay verified unchanged. See `STATUS.md` +
   [[survivor-rpg-biome-2-plan]].

5ad. **Biome 2 — Phase 1: Combat systems layer.** Plan:
   `.claude/plans/biome-2-phase-1-combat-systems.md` (Phase 1 of the biome-2 umbrella). Built
   on Opus (new combat mechanics). The reusable mechanics biome-2 content will declare as
   **data**, built before the content so Phase 2 enemies / Phase 4 weapons carry no logic — all
   **dormant hooks** until then, so biome-1 combat is byte-for-byte unchanged (no new
   enemies/weapons/recipes). Three features + one hook: (1) **damage-type resist/weakness** —
   `EnemyConfig.resistances?: Partial<Record<DamageType, number>>` (`<1` resist, `>1` weak,
   absent = neutral), stored on `Enemy` (`resistMultiplier(type)`), applied at the single choke
   point `MainScene.resolveWeaponHit` so it covers BOTH melee and ranged and can't drift; the
   floating damage number recolors by effectiveness (orange-red weak / dim-blue resisted, crit's
   yellow still wins). (2) **Per-weapon AOE arc** (locked decision 6) — `WEAPON_ARC` +
   `weaponArc()` in `Weapons.ts` (knife 25°/34px near-single-target, clubs medium, primal_spear
   50°/58px wide sweeper, ranged `range:0`); `tryMeleeAttack` resolves the primary then sweeps
   other live enemies within `range` and `±halfAngle` of the swing direction (player → primary),
   each taking `raw × staggerMult × falloff` with its **own per-target crit** through the same
   `resolveWeaponHit`. Extracted `staggerMultiplierFor(enemy)` (shared by primary/secondary/
   ranged). (3) **Swarm pack-aggro base** (opt-in) — public `Enemy.packAggro`/`packAggroRadius`
   (220) + `forceAggro(now)`; `MainScene.updatePackAggro` wakes idle **same-class** `packAggro`
   neighbors of any aggro'd member (O(k·n), k=0 today → free). `forceAggro` drives the base
   `state` machine; a subclass tracking aggro via its own field (Boar/Snake/Gremlin `mode`) must
   **override** it like they already override `isAggro()` (documented in-code for Phase 2's swarm
   author). (4) **Dormant magic-armor-bypass hook** — `applyDamageToPlayer` gained optional
   `dmgType?: DamageType`; `"magic"` skips the flat-armor term (relic %-reduction + floor-at-1
   still apply). No source deals magic until Phase 2's magical gremlin. Verified live via
   `preview_eval` (magic bypass, spear-cleave-vs-knife, pack wake radius/class gating). No
   `RECIPES.md`/dashboard change. See `STATUS.md` + [[survivor-rpg-biome-2-plan]].

**Not yet built — next up in rough order:**
6. **World & discovery** — much bigger generated world, biomes, map, a single giant
   circular Valheim-style map (spawn at center, danger increases outward). **The circular
   geometry (5v) AND biome 2's patchwork terrain foundation (5ac) have shipped:** the world is
   now a 28000px circle (`WORLD_RADIUS` 14000) with a protected forest disc at center and a
   **patchwork** of badlands + placeholder-dunes blobs beyond (base-layer between; danger scales
   outward). **Phase 1 (combat systems layer — damage-type resist/weak, AOE arcs, swarm
   pack-aggro) has also shipped (5ad).** **Still needed for M-W1 proper:** biome CONTENT (Phases
   2–5 of the biome-2 umbrella — enemies, boss/POIs, forging gear tier, tier-2 relics) +
   deterministic seeded world-gen. See **First biome — content notes** below for terrain-zone concept.
   (Minimap + fog of war: 5a, reworked into nearby-view + full-map overlay in 5v; Gremlin Shack
   POI: 5b.)
7. **ARPG loot** — rarity, randomized drops/recipes, replayability.
8. **Cross-cutting:** save/load (localStorage), real pixel-art tilesets.

**Bosses (was item 7)** — shipped, see 5c above (Boss Altar + Gremlin King). Future
bosses should each get their own bespoke AI (per the locked "no shared boss
framework" decision), following `GremlinKing.ts`'s telegraph/poise pattern as a
reference, not a base class to inherit from.

## Long-term design notes (idea stage, added 2026-07-07)

Directional notes on the overall game-loop shape, from the user, not yet implemented.
These inform how later roadmap items (World & discovery, Bosses, ARPG loot) should be
built, so a future session picking up any of those should read this first.

**Superseded 2026-07-10 by `.claude/plans/roguelike-metaloop-master-plan.md`** (see
roadmap item 5g above): the **portal-between-biomes** concept below is dropped in favor of
**one giant circular open world** (danger scales with radius from a safe center — the
bullet below already pointed this direction, now it's locked as the load-bearing spine,
not an alternative). The **tombstone/respawn death model** below is also superseded **for
now** — the locked default is **hardcore: one life, death ends the run and posts a score**;
tombstone-and-respawn is documented there as a *future easy-mode option*, not the current
target. Read the master plan first; treat the bullets below as historical context for
*why* those ideas existed, not the current design.

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

**Added 2026-07-10, from a post-boss-fight playtest (Gremlin King beaten at player lvl 5,
Blunt 5/Pierce 10/Light Armor 5/Running 3/Chopping 4, max-lvl Primal Spear):**

- ~~**Ranged starting weapon**~~ — **shipped (5y)**: Slingshot (uses a new Ammo equipment
  slot) + Javelin (self-contained disposable hotbar stack), both deliberately weak
  (opener/softener) per a locked side-chat balance direction.
- ~~**Food system** — cooking, eating, and what it actually does to the player~~ —
  **shipped** (roadmap 5f): eating grants a **timed HP-regen buff** (no instant heal, no
  hunger meter), cooking is instant at a placed campfire. Still open: stamina-restore
  food, non-HP buffs (damage/rested), a dedicated cooking station, more dishes.
- ~~**HP regen system**~~ — **resolved, will NOT be built.** The food-buff heal-over-time
  (5f) + Comfort/Bedroll's conditional regen (5j) already own HP sustain; the user
  explicitly cut a passive/no-effort regen on top as redundant with both (5x) — a passive
  trickle would undercut the reason to cook or place a Bedroll near a campfire.
- ~~**"Discovered" notification for new raw materials"**~~ — **shipped (5x)**: a
  `LogKind: "material"` toast, reusing the recipe-unlock toast's slide-in/stack/fade
  machinery in a distinct blue accent, fires once per raw material (excludes crafted/
  cooked/processed outputs, which already get their own unlock toast).
- ~~**Inventory auto-sort**~~ — **shipped (5y)**: a "Sort" button re-flows the backpack
  into merged, sorted stacks (`ItemContainer.sortAndStack()`).
- **Pause system** — doesn't exist yet at all.
- **Fast-boss-kill bonus** — a concept for rewarding beating a biome boss quickly from
  the start of a run (exact bonus TBD).
- **Roguelike/Ascension-style meta concepts** — e.g. a biome's boss could be 1-of-N
  possible bosses depending on the run's seed; a Slay-the-Spire-style "Ascension"
  difficulty-tiering system. Both idea-stage only.
- ~~**Minimap should NOT show the full map.**~~ **SHIPPED (roadmap 5v).** The corner
  `MinimapUI` is now a player-centered **nearby view** (scrolls with the player), and a
  separate **full-map overlay** (`src/ui/WorldMapUI.ts`, opened with M or the Map button)
  shows everything explored, **zoomable (scroll) + pannable (drag)**, with discovered-POI
  icons, and is **non-modal** (movement continues while it's open). Both read from the new
  shared `src/systems/ExploredMap.ts` model.
- **Trophy slot + elite-drop equipment concept** — beyond the Gremlin Trophy currency
  described in the Elites milestone below, the user wants an actual **equipment slot**
  for trophies (maybe repurposing one of the placeholder "misc" slots already in
  `Equipment.ts`). An equipped trophy would first need to be **processed somehow**
  ("dried/cured") — a new use for the Drying Rack pattern, or a new station — before it
  grants **passive bonuses and possibly an activated ability**. Undesigned past this
  concept; a natural extension of Elites once that milestone ships.
- **Stat-point vs. skill-level cost/benefit analysis requested** — the user wants an
  actual comparison of stamina-cost reduction (Strength/Agility, -0.5%/point) vs.
  weapon-skill damage bonus (+0.5% dmg/level) to figure out which is more valuable for a
  melee/ranged weapon build, suspecting Strength "feels weird" to invest in next to
  Vitality/Endurance. This is an **analysis task**, not a code change — worth doing as a
  quick number-crunch (using `Progression.ts`/`Skills.ts`'s real formulas) before/instead
  of any rebalance, to confirm whether it's a genuine imbalance or just an early-game
  perception (points are cheap relative to levels-to-next-skill-tier early on, so the
  comparison may shift a lot by mid/late game).

**Added 2026-07-10, second round (playtest/backlog items, idea-stage, not locked):**

- **Gremlin Shacks should also get a minimap landmark.** Today only a discovered Boss
  Altar gets a one-time landmark burned into `MinimapUI` via `revealLandmark()`
  (roadmap 5d). The 5 Gremlin Shacks (5b) don't — they should follow the exact same
  "discovered fixed structure gets a marker" treatment once the player explores within
  fog-reveal radius of one. Small, mechanically identical extension of the existing
  pattern (`MainScene.ts`'s altar-reveal check, generalized to also loop
  `gremlinShacks`) — not blocked on the bigger minimap-radius/full-map rework noted
  below.
- ~~**Hover highlight border on interactables.**~~ — **shipped (5x)**: a world-space
  `Graphics` outline redrawn each frame in `updateHover()`, gated on the identical
  `prompt` string the bottom-right text uses, so it never reveals what the prompt-gating
  design hides.
- **Generalize Elites to a % chance across all enemy types, with a higher chance at
  night.** Elites currently only exist on `RangedGremlin`/`MeleeGremling` (Group C,
  `witty-drifting-aurora.md`), and only ever spawn via the Gremlin Shack guards being
  hardcoded `elite: true` — no Boar/Snake elite variant exists, and no *chance-based*
  elite roll exists anywhere (every non-guard spawn is always normal). Requested:
  (1) Boar and Snake need their own elite variant (stat multiplier + distinct texture +
  loot bump, following the Gremlin/Gremling precedent — own numbers per enemy, per the
  standing "don't generalize per-enemy combat stats" rule), and (2) every normal spawn
  path (`spawnEnemies()`, `spawnAltarDensity()`, the M-DN nightfall surge) should roll a
  **base % chance** for any given spawn to come in elite instead of it being all-or-
  nothing per spawn *site*. (3) That chance should go up specifically for night-time
  spawns (ties into M-DN's existing "enemies slightly faster at night" + nightfall-surge
  mechanism — an elite-chance bump is a natural third night effect alongside those two).
  Exact base %, night multiplier, and whether Gremlin Shack guards stay hard-guaranteed-
  elite (rather than rolled) are open sub-decisions. See the roguelike master plan
  (`.claude/plans/roguelike-metaloop-master-plan.md`) — this slots in as a prerequisite
  content pass for M-RL (more elite variety and more trophy sources feed the relic
  system), noted there as a new milestone stub.

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
- ~~Empty Shishkabob + Boar Meat → Uncooked Boar Meat Shishkabob → place over a campfire →
  cooks over time → Cooked Boar Meat (consumable).~~ **Shipped (roadmap 5f, Cooking & Food
  Buffs)** — but the final design diverged from this note on the user's call: cooking is
  **instant + station-based** (no cook-over-time timer; interact with a placed campfire →
  a recipe-list cook menu), and the shishkabob is a straight *ingredient* consumed by the
  recipe rather than a two-step "combine then cook." **Cooked Boar Meat** (shishkabob +
  boar_meat, any campfire) and **Bramble-Glazed Boar Skewer** (+ 2 blackberries, Lvl 2
  campfire) both grant a **timed HP-regen buff** on eating (right-click; no instant heal).
  See `.claude/plans/savory-simmering-hearth.md` / `STATUS.md`. Cattail/blackberry/campfire
  tiers can add more dishes later; a dedicated cooking station and the campfire "rested"
  status remain undesigned.
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
   state as not-yet-created (`MainScene`'s `sys.settings.status` stuck at `1`/INIT,
   never reaching `5`/RUNNING) and `preview_screenshot` hang/timeout. A `preview_stop` +
   fresh `preview_start` does NOT reliably fix this (confirmed 2026-07-09 — the new tab
   can still boot backgrounded). What does work: a `preview_resize` call (even to the
   same size) forces a repaint/foreground and un-pauses the loop — try that first before
   restarting the server.
5. Check `preview_console_logs` (level `error`) for runtime errors — Phaser boot banners
   and Vite HMR reconnect messages are normal noise, not errors.

## Working conventions

- **Model-switch prompt (do this every session, don't just remember it silently):**
  before starting work on any **new core mechanic or framework** (a new system with its
  own state machine/data model — e.g. a new milestone like bosses, world-gen rework,
  save/load, a new stat/combat system), tell the user to switch to **Opus 4.8** before
  you proceed. If the work is **simple debugging/fixes/UI polish on top of an existing,
  already-designed system** (playtest-batch fixes, tuning numbers, wiring an existing
  value into a new UI line, bug fixes), tell the user to switch to **Sonnet**. Say this
  up front, before diving into implementation, not after.
- One milestone/feature per chat session — start a fresh session (this file auto-loads)
  rather than continuing a long thread, to keep context small and cheap.
- Comments should explain *why*, not *what* — keep them light, per general code style.
- No new npm dependencies without a clear reason; the placeholder-art approach means we
  don't need an asset pipeline yet.
- **Keep `RECIPES.md` in sync.** Whenever `Recipes.ts`, `ArmorUpgrades.ts`,
  `StationUpgrades.ts`, `WeaponUpgrades.ts`, or `Processing.ts` change (new recipe,
  changed costs, new upgrade tier), update the matching table in `RECIPES.md` in the
  same pass — it's a hand-maintained reference dashboard, not generated, so it drifts
  silently if skipped.
- **Plans must be committed in-repo.** After `ExitPlanMode`, copy the finalized plan file
  from wherever it was written into this repo's `.claude/plans/` and commit it alongside
  the feature. The global `~/.claude/plans/` dir isn't part of this repo and isn't
  guaranteed to be reachable from other sessions/machines — every prior milestone's plan
  file went missing this way until they were recovered and copied in here.

## STATUS.md maintenance (keep it single-pass readable)

STATUS.md must stay small enough to Read in one call (target < 40KB). Structure:

- `## Current State` — a LIVING snapshot, edited in place, never appended to. Holds:
  build summary (what the game is right now), last shipped (`<id>`, date), in
  progress / next, and known issues.
- `## Recent Entries` — append each milestone's ship/verification writeup under a
  stable `### <id> — <title>` heading (e.g. `### 5w — Snake meat + relic rework`).

Rules for every session that ships something:
1. After adding the new entry, UPDATE `## Current State` in place to match.
2. PRUNE: if STATUS.md is now over ~40KB or has more than 10 entries under Recent
   Entries, move the OLDEST entries (verbatim, `###` headings intact) into
   `STATUS-archive.md` until back under budget. Add a pointer line at the top of
   Recent Entries: `> Older entries in STATUS-archive.md.`
3. STATUS-archive.md is append-only and ONLY ever grep'd — never Read in full.

To answer "what happened with X": grep STATUS.md, then STATUS-archive.md. Never
reconstruct shipped history from memory.