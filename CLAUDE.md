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
     resets. Three melee/AoE attacks (no projectiles): a wide **cleave** arc,
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
   Common 15) guarantees a success after N misses (kills the 5% feel-bad tail).
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

**A new umbrella plan for the long-requested roguelike run/score meta-loop** now exists:
`.claude/plans/roguelike-metaloop-master-plan.md` (drafted 2026-07-10, locked build order
confirmed by the user). It supersedes/finalizes several open questions in the **Long-term
design notes** section below (portal concept dropped in favor of one giant circular world;
hardcore one-life death instead of the tombstone-and-respawn model, for now) — see that
plan file for the full locked-decision list before touching anything in items 6 (World &
discovery) or 7 (ARPG loot). Locked build order: **M-FX (done) → M-R1 (Run/Score/
Hardcore death, done — see 5h) → M-DN (Day/Night, done — see 5i) → Comfort item (was
M-SB/Sleep-Bed, done — see 5j) → M-EL2 (generalized elite spawning, done — see 5k) →
~~M-FA~~ (cut, see 5l) → M-RL (trophy → RNG relics, done — see 5m) → **M-WC (Gremlin War
Camp) + M-TE (trophy-gated gear), next** → M-W1 (circular multi-biome world, last).**

**Not yet built — next up in rough order:**
6. **World & discovery** — much bigger generated world, biomes, map, eventually a
   single giant circular Valheim-style map (spawn at center, danger increases
   outward — locked direction from the user, not yet built). See **First biome —
   content notes** below for the first biome's terrain-zone concept. (Minimap + fog
   of war, formerly noted here as undecided/not-started, has shipped — see 5a
   above; the Gremlin Shack POI has shipped — see 5b above.)
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

- **Ranged starting weapon** — maybe Javelins (thrown, no ammo?) and/or the
  already-planned Slingshot, as an earlier/easier ranged option than whatever's next.
- ~~**Food system** — cooking, eating, and what it actually does to the player~~ —
  **shipped** (roadmap 5f): eating grants a **timed HP-regen buff** (no instant heal, no
  hunger meter), cooking is instant at a placed campfire. Still open: stamina-restore
  food, non-HP buffs (damage/rested), a dedicated cooking station, more dishes.
- **HP regen system** — the food-buff heal-over-time (5f) is the first piece; a *passive*
  regen (rest/over-time without eating) still isn't designed.
- **"Discovered" notification for new raw materials** — picking up a resource type for
  the first time should announce it, similar in spirit to the existing recipe-unlock
  toast (`EventLogUI`'s recipe toast) but for raw materials, not recipes.
- **Inventory auto-sort** — a keypress while the inventory is open that sorts/auto-stacks
  shared materials together.
- **Pause system** — doesn't exist yet at all.
- **Fast-boss-kill bonus** — a concept for rewarding beating a biome boss quickly from
  the start of a run (exact bonus TBD).
- **Roguelike/Ascension-style meta concepts** — e.g. a biome's boss could be 1-of-N
  possible bosses depending on the run's seed; a Slay-the-Spire-style "Ascension"
  difficulty-tiering system. Both idea-stage only.
- **Minimap should NOT show the full map.** Current `MinimapUI` (shipped, see roadmap
  5a) reveals the *entire* explored world shrunk down — the user now wants the corner
  minimap to only show a **small nearby section** (viewport-relative, scrolls with the
  player), plus a separate **full-map overlay** (a larger centered screen panel, opened
  on demand) that shows everything explored so far. Opening the full map should **not**
  block movement — the player can keep walking around while it's open. This is a
  meaningful rework of `MinimapUI`/`FogOfWar`'s current "one panel shows everything"
  model, not a tweak.
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
- **Hover highlight border on interactables.** Nothing currently gives a hovered
  tree/rock/enemy/chest/station a visual outline — the only hover feedback today is the
  bottom-right text prompt (and cursor, where applicable). Add a highlight (outline/glow)
  on whatever `MainScene.updateHover()` currently resolves as hovered (node/enemy/rack/
  shack/altar/workbench/campfire/etc.), gated the same way the prompt already is (reach +
  equip rules) so it doesn't reveal anything the prompt-gating design intentionally
  hides. Pure UI polish on top of the existing hover system, no new state.
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
