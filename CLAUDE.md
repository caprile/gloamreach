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

**Read `STATUS.md`'s `## Current State` section at the start of every session, before
doing anything else.** This file (CLAUDE.md) auto-loads, but `STATUS.md` does not — and
`STATUS.md` is where the actual "what just shipped / what's in progress / what's next"
lives, not here. This file's **Roadmap** section only tracks milestone-level features and
deliberately omits small playtest-fix batches (e.g. the 2026-07-15 8-session playtest plan,
`.claude/plans/playtest-2026-07-15-session-plan.md` — S1-S8, **all shipped**) — those are
tracked in `STATUS.md` only. Skipping this read is why a past session felt "unaware" of
recent work despite STATUS.md itself being current.

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
M-W1 + M-TE, DONE (all 6 phases shipped, see 5am below)** — Phase 0 worldgen (5ac) + Phase 1
combat systems (5ad) + Phase 2 core enemies & flora (5ae) + Phase 2b 4th native creature — the
Sandmaw burrowing ambusher (5af) done. **Phase 3** (the user chose "two POIs first"): POI 1 — the Duskrunner
Warren (two-wave destructible den → lootable cache) — done (5ag); POI 2 — the Sunken Forge
(the Cinderwrought fire/forge mini-boss) — done (5ah); the **badlands final boss — the
Duneshaper** (new win-con, demotes the Gremlin King) — done (5ai); then a **19-item badlands
playtest batch** (5aj) — done. **Phase 3 complete.** **Phase 4 (smelting/forging gear tier),
sliced into two sessions, both done:** Session 1 — Phase 4a (5ak) — the Smelter + Clay/ore mining +
the **Gremlin King's Heart** (the deferred critical-drop rework — it gates smelting rare ore) +
Workbench Lvl 3 + base forged gear (Sunsteel heavy set / Duskhide light set / blunt-slash-pierce
weapons); Session 2 — Phase 4b (5al) — Workbench Lvl 4 + 9 T2 enhanced reforge recipes + the first
magic weapon (Ember Brand). **Phase 5 (5am) — done:** the relic economy rework — family loadout
(one relic per family, dominance-based auto-replace/decline/choice), trimmed biome-1 magnitudes,
tier-2 badlands relics, and Gloam→Ember Shard conversion (Relic Forge Lvl 3, Ember Kiln). **This
completes the entire biome-2 umbrella plan (all 6 phases, 0–5).** See the biome-2 umbrella plan
below.**

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

5ae. **Biome 2 — Phase 2: Badlands enemies & wildlife (core 3 + flora).** Plan:
   `.claude/plans/biome-2-phase-2-enemies.md` (Phase 2 of the biome-2 umbrella). Built on Opus
   (new content/AI). The first *content* in the badlands — three bespoke enemies that each light
   up a Phase 1 dormant hook, spawned out in the badlands patchwork (never the forest disc) via a
   new `MainScene.pickBadlandsPoint` (polar-annulus sweep + real `coverageAt(..,"badlands")`,
   honoring the War-Camp/Vein exclusions). Scope locked with the user via `AskUserQuestion`: **the
   core 3 enemies + arid flora** (the 4th native creature deferred to **Phase 2b**); difficulty
   **noticeably tougher** than the forest roster; Cragscale resist = **resist slash, neutral
   blunt, weak pierce**. Each enemy follows the per-enemy precedent (own subclass/state machine/
   constants/loot, elite variant, `rollElite` spawning). **Duskrunner** (`Duskrunner.ts`) — fast
   (92) low-HP (20) canid swarm, short 220ms bite; deliberately drives the **base `state` field**
   so the inherited `forceAggro()`/`isAggro()` work with **zero override** (the reference
   `packAggro` user, radius 260) — spawns in **packs of 3-4** so `updatePackAggro` converges them;
   the AOE-arc payoff enemy (neutral resists). **Cragscale** (`Cragscale.ts`) — slow (40) tanky
   (HP 60) armored bruiser, one heavy 520ms basher (+180 knockback); **teaches the damage-type
   layer** via `resistances: { slash: 0.5, blunt: 1.0, pierce: 1.6 }` (data-only — the resist math
   + damage-number tint already live in `resolveWeaponHit`). **Hexling** (`Hexling.ts`) — compact
   **stand-and-cast magic kiter** (own subclass, NOT extending RangedGremlin; private `mode` +
   `isAggro()` override), casts a `hex_bolt` with **`damageType: "magic"`** which **bypasses the
   player's flat armor** — the dormant Phase 1 `applyDamageToPlayer` hook goes live. `Projectile`
   gained an optional `damageType`; the enemy-projectile→player overlap forwards it (physical
   Gremlin rocks leave it undefined = unchanged). Resists `{ magic: 0.4, slash/blunt/pierce: 1.4 }`.
   Each has an elite variant + a **per-species trophy** (`duskrunner_trophy`/`cragscale_trophy`/
   `hexling_trophy`, Common/tier1 in `TROPHY_ROLL` for now — Phase 5 retiers to tier-2 + Ember
   refinement). **Flora:** **Emberbloom** (desert herb) + **Sunfruit** (cactus fruit), persistent
   free-pickups reusing the Blackberry `persistent`/`pickedTexture`/`regrowMs` path — **no recipes
   wired** (future alchemy/food ingredients, surfaced only via the discovered-material toast). 8
   new `ResourceType`s + `Items.ts` defs + ~17 `BootScene` textures. **Same-session feedback pass
   (the user playtested):** (1) **density** — badlands was ~22× sparser than forest (0 enemies found
   in an area); `pickBadlandsPoint` now concentrates in the accessible inner band (r 2500-5200,
   inner-weighted) + counts bumped to ~124 (Duskrunner 16 packs / Cragscale 34 / Hexling 34);
   (2) **terrain** — `badlandsGroundColorAt` rewritten with multi-scale value-noise mottling (new
   `colorUtil.valueNoise2D`) across a dustier warm-earth palette (was a flat clay fill reading as
   solid pink); (3) **borders** — `WorldBiomes.seedCoverage` now uses a 3-harmonic wobble + bigger
   lobes for organic blob edges (was a single sine); (4) **distinctive kits** — Duskrunner **pounce**
   (leap gap-closer), Cragscale **rolling charge** (catches kiters, spins), Hexling **blink**
   (teleport-evade when cornered). Verified live: 124 badlands enemies + 72 flora at r∈[2501, 5228],
   none in the forest disc; Cragscale slash 10→5 / pierce 10→16; Hexling bolt `damageType:"magic"` +
   blink teleport; pack-aggro woke packmates; 47 distinct terrain tones per patch. **Dashboard
   Enemies tab updated** (manual mirror); no `RECIPES.md` change. **Known limitation:** the
   enemy-respawn top-up spawns forest species near the player regardless of biome (the badlands
   roster doesn't replenish) — a Phase 2b/M-W1 follow-up. See `STATUS.md` +
   [[survivor-rpg-biome-2-plan]].

5af. **Biome 2 — Phase 2b: Sandmaw (the 4th native badlands creature).** Plan:
   `.claude/plans/biome-2-phase-2b-sandmaw.md` (Phase 2b of the biome-2 umbrella). Built on
   **Opus** (new enemy AI/state machine). The "+1 native creature" deferred out of Phase 2's
   core-3 scope. Creature identity locked with the user via `AskUserQuestion`: **a burrowing
   ambusher** (over an aerial diver or a stealth flanker). The **Sandmaw**
   (`src/entities/Sandmaw.ts`) is a gloam-touched burrowing ambush predator — the badlands
   roster's 4th and most distinct threat vector (the trio was swarm-pounce Duskrunner / armored
   roll-tank Cragscale / stationary flame-mage Hexling; the Sandmaw adds **"watch the ground /
   don't stand still near a lurker"**). Own bespoke state machine, fully overrides `update()` (no
   super — Snake/Hexling precedent): `submerged → surfacing → erupting → exposed → burrowing →
   submerged`. **submerged** = near-invisible (alpha 0.18), slow-stalks (30px/s) toward a player
   within `STALK_RADIUS` 240px but outside the 62px ambush ring to reposition; **surfacing** =
   pops to full alpha + `playWindupTell` + a growing dust-ring telegraph previewing the exact
   burst radius (`SURFACE_WINDUP_MS` 560ms dodge window); **erupting** = a radial sand-burst
   (`BURST_RADIUS` 95px, 38 physical + 220 knockback, one hit/eruption) dealt via `checkPlayerHit`
   (queried by the scene like the bosses/Hexling flame — NOT a melee bite; `biteDamage:0`; Sandmaw
   added to that `instanceof` union); **exposed** = fully surfaced + planted 1100ms punish window;
   **burrowing** = dives under (350ms) + a 2600ms re-ambush cooldown. Movement-dodgeable (a
   walking player just clears the burst in the wind-up; dash i-frames negate it — same principle
   as 5t's smash fix). **Resist profile (locked)** `{ pierce: 0.6, blunt: 1.4 }` — the **inverse
   of Cragscale** (resist-slash/weak-pierce), so clubs/warhammer shine on Sandmaws where the
   Primal Spear shines on Cragscales; the damage-type layer now rewards carrying more than one
   weapon into the badlands. **Reveal-and-retaliate:** attacked while submerged → surfaces + erupts
   (Snake/Hexling `takeHit` precedent); `isAggro()` hidden while submerged (HP bar shows only once
   surfaced). **Spawn:** 24 scattered **lone** ambushers (no pack — a lurker is a solo trap) via
   `pickBadlandsPoint` in `spawnBadlandsEnemies()`, elite via `rollElite`. **Loot:**
   `sandmaw_chitin` ×1 (×2 elite; a light-but-tough plating shard, no recipe yet); elite +
   `sandmaw_trophy` (Common/tier1 in `TROPHY_ROLL`, like the other badlands trophies — Phase 5
   retiers to tier-2 + Ember). New `drawSandmaw` (normal + crimson/gold elite, 26×18 plated
   burrower facing right) + chitin/trophy icons in `BootScene.ts`. Dashboard Enemies tab updated
   (manual mirror); no `RECIPES.md` change (no recipes). Verified live via `preview_eval` (full
   state cycle, erupt hit/dodge, resists, retaliate-while-submerged, sprites). Next: Phase 3. See
   `STATUS.md` + [[survivor-rpg-biome-2-plan]].

5ag. **Biome 2 — Phase 3 POI 1: the Duskrunner Warren.** Plan:
   `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 3, umbrella). Built on **Opus** (new POI
   mechanic). the user scoped Phase 3 to **"two POIs first"** (badlands boss + Gremlin King rework
   deferred) then specced POI 1: deliberately **NOT** a Gremlin-Shack clone but a **two-wave
   destructible den**. `src/entities/BadlandsDen.ts` (plain data class; MainScene owns wave/smash
   scheduling) is a burrow mound whose lifecycle is a `DenPhase` machine:
   **wave1** (3 Duskrunners guard, den inert) → **wave2** (clearing wave 1 spawns 3 **elite**
   Duskrunners, via `onDenGuardKilled`→`spawnDenWave`) → **attackable** (both waves dead → smash
   the exposed den with a **melee** weapon; it has HP `DEN_HEALTH` 42, `tryAttackDen` mirrors
   `tryMeleeAttack`'s guards + a size-scaled `denReach`; ranged doesn't apply to a structure) →
   **looted** (the killing hit swaps the mound to `duskrunner_den_wrecked`, spawns a `warren_cache`
   + glow, rolls loot). **Loot is gated behind destruction** (both waves die first, automatically)
   and the Warren **does NOT respawn** — you destroy it. **10 dens** (the user: dens are **fairly
   common**, ~one per sizable badlands chunk — not a rare landmark) spread ≥950px apart via
   `pickBadlandsPoint`, picked before the wild packs so a new `DEN_CLEAR_RADIUS` (200) exclusion
   keeps ordinary spawns out of a den's clearing (the "POI busy = missing exclusion zone" lesson).
   Cache loot (`DUSKRUNNER_WARREN_LOOT_TABLE`) reuses `LootContainer`/`ChestMenu` (`openChestMenu`
   generalized from `(shack)` to `(loot, table)`); richer than a shack (pelts + meat/bones +
   chances at chitin/gloam_shard + a `duskrunner_trophy`). **Duskrunners are now a badlands food
   source** — every one (den + wild) drops raw `duskrunner_meat` (new `ResourceType`/`ItemDef`/
   icon), cook/eat specifics **deferred** (a "future ingredient" like sunfruit/emberbloom, so the
   food exists without over-designing it). Discovering a Warren fires a prominent **discovery popup
   toast** (new `"poi"` `LogKind`, warm-orange center toast like a biome-discovery) + a `map_den`
   minimap/world landmark; faint gloam-ember night glow (`denLightPoints`). Hover/prompt/interact
   reuse the existing chain (new
   `hoveredDen`/`promptForDen`/`tryInteract` branch; interactable only while attackable/looted so
   the mound doesn't block enemy hovers during the fight). Dashboard Enemies tab Duskrunner loot
   row updated; no `RECIPES.md` change. Verified live via `preview_eval` (spawn/spread, full
   wave→smash→loot cycle, prompt gating, meat drop, landmark, sprites). See `STATUS.md` +
   [[survivor-rpg-biome-2-plan]].
5ah. **Biome 2 — Phase 3 POI 2: the Sunken Forge (Cinderwrought mini-boss).** Plan:
   `.claude/plans/biome-2-phase-3-pois.md` (Phase 3, umbrella). Built on **Opus** (new mini-boss
   mechanic). The second of Phase 3's two POIs. Locked with the user via `AskUserQuestion`: **loot =
   Uncommon relic trophy + Gloam Shards** (mirror the Gloamwarden); **attacks = Cinder Cone + Forge
   Hammer**; **names = The Sunken Forge / Cinderwrought**. `src/entities/Cinderwrought.ts` is a
   bespoke fire/forge mini-boss modeled on `Gloamwarden.ts`'s telegraph/poise/stagger skeleton (a
   **trimmed sibling, NOT a shared framework** — the "no boss framework" lock): extends `Enemy`,
   fully overrides `update()` (`idle→telegraphing→executing→recovering→staggered`). HP 300
   (badlands-tough, above the forest Gloamwarden's 260), scale 1.8, poise 70 (stagger → ×1.5 for
   2.5s), regens 12 HP/s deaggro'd; `resistances: { blunt: 0.8, pierce: 1.25 }` (a molten-slag crust
   — the Phase-1 damage-type nudge, inverse of a Sandmaw). Two **new-feeling** attacks distinct from
   the roster's charge/slam/smash/eruption: the **Cinder Cone** (the game's only cone — a fire fan
   ±32°/210px whose direction is **locked at telegraph start**, so sidestep the 820ms wind-up; 30
   dmg/140 kb) and the **Forge Hammer** (a heavy wide-but-short front-arc smash ±70°/155px,
   re-locked at execute; back out to dodge; 44 dmg/240 kb). Both resolve via `checkPlayerHit()`
   (wedge geometry) → the shared `applyDamageToPlayer` choke point, so dash i-frames/armor "just
   work." Guaranteed loot: **1 `refined_trophy_uncommon` + 3-5 `gloam_shard`** (mirrors the
   Gloamwarden). **MainScene:** `forgePosition` picked once in `create()` (≥1000px from camp /
   ≥900px from vein, before spawning) with a new `FORGE_CLEAR_RADIUS` (220) exclusion in
   `pickBadlandsPoint`; `spawnSunkenForge()` drops the `sunken_forge` structure + Cinderwrought + 9
   `slag_chunk` props; ember night glow (`forgeLightPoints`); `map_forge` landmark + `"poi"`
   discovery toast; wired into the `checkPlayerHit` boss union, `staggerMultiplierFor`,
   `classifyKill` (**elite**), the boss prompt-color union, and the respawn `isBoss` exclusion.
   **No smelting wiring** (Phase 4 doesn't exist — smithy theme ships as loot + fight only) and **no
   post-kill interactable** (loot is the guaranteed drop, unlike the vein's mineable nodes). No
   `RECIPES.md` change. Verified live via `preview_eval` + screenshot (spawn/position, full
   telegraph→execute→recover cycle for both attacks, cone/hammer wedge geometry hit/miss, resists,
   stagger, kills a full-HP player, discovery landmark + toast, sprites). Dashboard Enemies tab
   updated. **Next: the badlands final boss (new win-con) + the Gremlin King critical-drop rework.**
   See `STATUS.md` + [[survivor-rpg-biome-2-plan]].

5ai. **Biome 2 — Phase 3: The Duneshaper (badlands final boss + win-con swap).** Plan:
   `.claude/plans/biome-2-phase-3-badlands-boss.md` (Phase 3, umbrella). Built on **Opus** (new boss
   mechanic). The **badlands final boss** and the game's **new win-condition**, demoting the Gremlin
   King to a mid-boss. Locked with the user via `AskUserQuestion` + a follow-up: scope = boss +
   win-swap now (King's critical-drop rework deferred to Phase 4, which gates it); identity = **the
   Duneshaper** (a gloam-warped apex sorcerer); difficulty = **phase-gated attack escalation**;
   summon = its own altar but the totem is **gathered from a POI** (the Warrens); **plus** multiple
   altars + a clue system. **`src/entities/Duneshaper.ts`** — bespoke telegraph/poise AI (GremlinKing/
   Gloamwarden precedent, NOT a shared framework); extends `Enemy`, fully overrides `update()`. HP
   **900**, poise 120 (stagger ×1.5/3s), scale 2.3, regens 14 HP/s deaggro'd; `resistances: { magic:
   0.5, slash/blunt/pierce: 1.3 }` (soft caster hide). A **caster** — holds ~220px and casts.
   **Damage-type mix:** Sand Spikes are PHYSICAL pierce (flat armor applies); Volley/Nova/Lance/
   Barrage are `magic` (bypass flat armor, Phase-1 hook). **Phase-gated ESCALATION** (`availableAttacks`
   grows as HP drops): 3 at full HP — **Gloam Volley** (3 magic `gloam_bolt` projectiles), **Sand
   Spikes** (3 physical circles), **Blink Nova** (teleport + radial magic burst); **+Gloamfire Lance**
   (locked-direction magic beam) at **70%**; **+Sunscorch Barrage** (7-circle magic carpet) **and
   enrage timing** at **50%**. Area attacks via `checkPlayerHit()` → `applyDamageToPlayer` (dash
   i-frames/armor just work); the volley self-resolves as projectiles. Loot: **2
   `refined_trophy_uncommon` + 5-8 `gloam_shard`** (Phase 5 re-tiers the badlands trophy set).
   **Summon:** new `warren_fetish` ("Gloam-Bone Fetish", `ResourceType`) added to the Warren cache
   loot (guaranteed 1); new `tyrant_totem` ("Effigy of the Duneshaper") — tier-1 recipe `{
   warren_fetish: 3, gloam_shard: 2, bones: 8 }`, a consumable like `gremlin_totem`. `BossAltar.kind`
   (`"gremlin"|"tyrant"`); `spawnTyrantAltars` adds **3** badlands `"tyrant"` altars (own
   `tyrant_altar` texture) via `pickTyrantAltarPositions` (≥2600px apart), pushed into `bossAltars`
   (hover/night-light/discovery reuse); `TYRANT_ALTAR_CLEAR_RADIUS` (170) keeps content off them.
   `attemptSummonBoss` branches on kind → `attemptSummonDuneshaper` (consumes the effigy, global
   `tyrantSummoned` guard). **Clue system (the user — huge world, a single altar could be across the
   map):** all tyrant altars glow at night + auto-discover as violet `map_tyrant_altar` landmarks +
   **crafting the effigy reveals ALL altars on the map** (`onTyrantTotemCrafted`, hooked in
   `craftRecipe`) with a `compassDir` directional nudge to the nearest. **Win-con swap:** a
   `Duneshaper` kill fires `endRun("won")`; the `GremlinKing` win trigger removed (still "boss" score
   + drops its fang — Phase-4 rework). Wired into `classifyKill`, the `checkPlayerHit` boss union,
   `staggerMultiplierFor`, the boss prompt-color union, and the respawn `isBoss` exclusion.
   **BossHealthUI generalized** to a `BossBarTarget` interface (`GremlinKing` gained a `poiseMax`
   getter); scene passes `engagedBigBoss()` (whichever big boss is engaged; mini-bosses stay off the
   big HUD). `BootScene`: `duneshaper` (44×54), `tyrant_altar`, `gloam_bolt`, `icon_warren_fetish`,
   `icon_tyrant_totem`, `map_tyrant_altar`. Verified live (`preview_eval`): 3 spread altars + 6
   textures load; summon consumes the effigy + prompt gating; boss stats/resists/loot; phase pool
   3→4→5; state-machine cycle; all 5 attacks' `checkPlayerHit` (physical-vs-magic + knockback +
   one-hit-per-instance + miss); volley = 3 magic bolts; **Duneshaper kill → `endRun("won")` (VICTORY
   screen rendered), Gremlin King kill → no win**; effigy craft reveals all altars + directional
   nudge; boss renders. `tsc` clean; dashboard Enemies tab + `RECIPES.md` updated. See `STATUS.md`
   + [[survivor-rpg-biome-2-plan]].

5aj. **Biome 2 — 19-item badlands playtest batch.** Built on **Opus** (a fire damage type + a forge
   refactor are new-ish mechanics, plus broad tuning). Off the user's badlands playtest. Highlights (full
   list + verification in `STATUS.md`): fixed the center-toast **overlap** (Defeated-X vs level-up — a
   freed front slot was reused under a live toast; now a monotonic cursor); added a **`fire` damage type**
   (`IncomingDamageType`, kept out of `DamageType`/`SkillType`) that **bypasses flat armor** like magic +
   a player-facing **floating damage number tinted by type** so incoming type is clear; **Cinderwrought**
   now deals fire (cone 30→46, hammer 44→58) and on death **cracks open mineable Cinderforged Ore**
   (`ember_ore`, a smelting/metal material — Phase-4 hook); **5 Sunken Forges** now (was 1, refactored to
   `forges[]`); badlands damage bumped (Duskrunner 34→42, Cragscale 40→48, Hexling 22/34→26/40, Sandmaw
   38→46); **Duskrunner** very hard to deaggro (leash 280→620) + faster attack cooldowns + **den guards
   anchored** (no idle wander); **Cragscale** roll radius 40→58; **Sandmaw un-targetable while submerged**
   (new `Enemy.isTargetable()`); more density (Sandmaws 24→46, dens 10→16, packs/cragscales/hexlings up) +
   **2 new badlands harvestables** (Gloamcap, Dustbloom) + ~200 more flora; every POI now gets a **distinct
   floor decal + ring of marker props** (`decoratePoi`); the **Duneshaper altars** are a big gloam arena
   guarded by **elite Hexlings**, **one per quadrant** (4, was 3); **POI map-detection radius** widened
   (~260→760px) so POIs appear on the map sooner + the dev reveal-map now drops **all** POI landmarks;
   "Gloam-Bone Fetish" → "**Gloam-Bone Totem**"; and **decorative immersion props** scattered across BOTH
   biomes (ferns/flowers/mushrooms/logs in the forest; skulls/dead bushes/mesa boulders/bones in the
   badlands). `tsc` clean; verified live via `preview_eval` + a demo screenshot; dashboard Enemies tab +
   `RECIPES.md` updated. **Next: the Gremlin King critical-drop rework** (Phase 4 gear gate). See
   `STATUS.md` + [[survivor-rpg-biome-2-plan]].

5ak. **Biome 2 — Phase 4a: Smelting economy + Gremlin King gate + base forged gear.** Plan:
   `.claude/plans/biome-2-phase-4-forging.md` (Phase 4 of the biome-2 umbrella, **sliced into two
   sessions per the user — this is Session 1**). Built on **Opus** (new mechanic: smelting station +
   a new gear tier + new gating). The forged gear tier, into which the long-deferred **Gremlin King
   critical-drop rework** (locked decision 10) finally lands. **Progression:** mine **Clay** (new
   scattered badlands `mine` node) → build the **Smelter** (`{clay:10, stone:15}`, tier-1 placeable);
   smelt **ore + Hex Essence = ingot** ("A+B", fuel pulled from the backpack); common **Sunscorch
   Ore** (new scattered node) → **Sunsteel Ingot**; upgrade the **Workbench to Lvl 3** (`forge_anvil`
   StationUpgrade, costs Sunsteel Ingots) → unlocks the base forged recipes; kill the **Gremlin King
   → Gremlin King's Heart** (replaces the retired `gremlin_king_fang` drop) → apply the **Ember
   Crucible** Smelter upgrade → smelt the **rare Cinderforged Ore** (`ember_ore`, scattered veins +
   the Sunken Forge POI) → **Embersteel Ingot** (the T2 metal Session 2 will consume). **The Smelter
   REUSES the Drying Rack's menu + `ProcessingStation`** (both are processing stations): `Processing.ts`
   gained `SMELT_RECIPES` + `ProcessRecipe.fuel`/`minStationTier` + a `recipes`-list/`setTier()`-
   parameterized `ProcessingStation`; `DryingRackMenu` gained optional function deps
   (`title`/`descKey`/`actionLabel`/`busyLabel`) + a **fuel readout/gate**, so ONE menu instance serves
   both (switched by `MainScene.openStationKind`). New **`Recipe.requiresWorkbenchTier`** field
   (enforced in `craftRecipe`/placement + a live "Requires Workbench Lvl 3" line in `CraftingMenu` via
   a new `isNearWorkbenchAtTier` dep); all 9 forged recipes gate on tier 2. **Base gear:** a **Sunsteel
   heavy set** (Helm/Cuirass/Greaves 4/6/4 = 14 armor, `armorType: heavy_armor`) + a **Duskhide light
   set** (Hood/Vest/Leggings 3/4/3 = 10) + **three weapons** covering blunt (**Sunsteel Warhammer**,
   wide AOE arc)/slash (**Longsword**)/pierce (**Pike**) — all ingredients drop from **normal** badlands
   enemies (Cragscale Plate / Duskrunner Pelt / Sandmaw Chitin) + Sunsteel Ingots. The **`heavy_armor`
   skill is now wired** (XP accrues per worn piece via the existing kill path) and given a real
   identity: **partial magic/fire mitigation** (`Skills.heavyArmorMagicMitigation`, −0.4%/lvl cap
   −30%, applied in `applyDamageToPlayer`'s bypass branch while wearing ≥1 heavy piece — the
   counterpart to light armor's dash i-frames). **Bench visuals change per tier** (`applyTierVisual`
   now swaps Workbench/Smelter textures, not just tint). Verified live via `preview_eval` (smelt
   ratio 2:1 + per-recipe fuel + rare-ore tier-gate; end-to-end fuel deduction + fuel-short no-op;
   King→Heart; Ember Crucible/Forge Anvil upgrades; heavy mitigation 40-vs-50 magic; bench texture
   swap on a real placed object; Smelter menu title/verb); `tsc` clean. **Deferred to Session 2:**
   Workbench Lvl 4 (Emberforge Anvil), the T2 **enhanced** reforge recipes (`base piece + Embersteel
   Ingot → new item`, both sets + weapons, consuming the base piece), and the **first magic weapon**
   (a rare-ore-exclusive melee fire brand). Also deferred: a forged tool tier, a forged ranged weapon.
   See `STATUS.md` + [[survivor-rpg-biome-2-plan]].

5al. **Biome 2 — Phase 4b: enhanced (T2) gear tier + first magic weapon.** Plan:
   `.claude/plans/biome-2-phase-4-forging.md` (**Session 2**, completing Phase 4). Built on **Opus**
   (new gear tier + first magic weapon). **No new MainScene logic** — everything routes through
   generic machinery Session 1 and earlier phases already built. Adds the **Workbench Lvl 4**
   upgrade (**Emberforge Anvil**, `{embersteel_ingot:5, stone:15}`, only discoverable once an
   Embersteel Ingot has been smelted) which unlocks a new `requiresWorkbenchTier:3` recipe gate.
   **9 enhanced recipes** each **reforge their base forged piece** (the base item is consumed as an
   ingredient — must be unequipped/in the backpack) + Embersteel Ingot: an **Embersteel heavy set**
   (7/9/7 = 23 armor) + an **Emberhide light set** (5/6/5 = 16) + three enhanced weapons (Embersteel
   Warhammer 20 blunt / Longsword 15 slash / Pike 17 pierce). Armor keeps the base sets'
   `heavy_armor`/`light_armor` gate + `armorType`, so heavy XP + magic/fire mitigation carry over
   free — no right-click ArmorUpgrades (the reforge IS the progression). **First MAGIC weapon — the
   Ember Brand** (`{embersteel_ingot:3, hex_essence:4}`, rare-ore-exclusive, `magic` type, 14 dmg /
   520ms): DPS ≈ the Embersteel Pike on a neutral target, but resisted (~×0.4–0.5) by the
   gloam-casters (Hexlings, the Duneshaper) — a sidegrade that finally gives the `magic` weapon
   skill a real XP source (no badlands enemy is *weak* to magic yet — a hook for a future
   magic-vulnerable foe). `Recipe.costs` widened `Partial<Record<ResourceType,…>>` →
   `Partial<Record<string,…>>` so a crafted base piece works as an ingredient. Verified live via
   `preview_eval` (all 10 recipes/items, Emberforge chain t1→t2→t3, tier-4 gate blocks/allows,
   enhanced craft consumes base piece, bench t3 texture swap, badlands magic resists); `tsc` clean.
   **Phase 4 complete.** See `STATUS.md` + [[survivor-rpg-biome-2-plan]].

5am. **Biome 2 — Phase 5: Relics rework (family loadout + tier-2 relics + Ember Shard).** Plan:
   `.claude/plans/biome-2-sunscorch-badlands.md` (Phase 5, the umbrella's final milestone — **this
   completes it**). Built on **Opus**. Three parts locked via `AskUserQuestion`, plus a fourth
   request added mid-session. **(1) Family loadout, not stacking:** every relic now has a `family`
   (damage/move/defense/stamina/lifesteal/vitality/crit/xp, 8 total) and a player holds **at most
   one relic per family**. Rolling into an owned family runs a direction-normalized dominance
   comparison: the new relic **auto-replaces** if strictly better on every shared stat (the
   displaced relic refunds Gloam/Ember Shards, scaled by its own rarity × power tier), **auto-
   declines** if the old one dominates (the new roll refunds instead), or — if neither dominates
   (e.g. a differing secondary stat) — the Relic Forge shows a **Keep New / Keep Old** prompt and
   blocks further rolls until resolved (closing the menu mid-choice defaults to declining the new
   one). `RelicManager.instances` moved from a stackable array to `Partial<Record<RelicFamily,
   RelicInstance>>`; the aggregate effect getters are unchanged in shape, so every `MainScene` call
   site kept working with zero edits. **(2) Trimmed magnitudes:** every relic's effect numbers
   scaled to exactly **×0.625** the original (Common damage 8→5%, Mythic 40→25%, matching the
   locked spec verbatim). **(3) Tier-2 relics + Ember Shard:** all four badlands elite trophies
   bumped `powerTier: 1 → 2` (still Common rarity/odds, just ×1.5 magnitude); new **Ember Shard**
   currency, converted from Gloam Shards at a new **Ember Kiln** Relic Forge upgrade (Lvl 2→3,
   `{embersteel_ingot:3, stone:20}`, 3 Gloam → 1 Ember via `GLOAM_TO_EMBER_RATIO`), feeding a new
   tier-2 refine recipe. **New Relics column on the Inventory panel** (the user: playtesters kept
   checking the Equipment tab for relics) — 8 fixed paper-doll-style slots, one per family, filled
   or empty with hover tooltips. `RelicForgeMenu` gained a third **Convert** tab (gated Lvl 3) and
   the Keep New/Keep Old choice UI. **Bug caught + fixed during verification:** the result-line
   layout only reserved extra height for the "choice" verdict, not the now-2-line "replaced"/
   "declined" verdict, causing text to overlap the relic grid below it — fixed + re-verified with
   exact pixel-gap assertions. Verified live via `preview_eval` (all three roll verdicts with
   controlled `rng`, tier-scaling dominance, refund math for all 4 rarities, Ember conversion +
   its 3-tier gating, both new UI panels rendered and measured for overlap); `tsc` clean; zero
   console errors post-fix. **This completes the biome-2 umbrella plan — all 6 phases (0–5) are
   shipped.** See `STATUS.md` + [[survivor-rpg-relics]].

5an. **Biome 3 (Duskmire Bayou) + new-systems arc — Phases 1, 2a, 2b, 3, 4a, 4b shipped.** Plan:
   `.claude/plans/biome-3-and-new-systems-roadmap.md` (approved 2026-07-21, 5 phases). This entry
   is a **summary only** — every phase has its own full writeup in `STATUS.md`/`STATUS-archive.md`,
   which stays the source of truth for detail (this section deliberately tracks milestone level).
   - **Phase 1 (B3-P1)** — *terrain that matters*: ~10 large themed **macro-zones** per biome
     (`badlandsZones`/`subZoneAt`) — boulderfields (genuinely **solid** rock, the first use of the
     `solids` group) and thornfields (0.6× slow + rich foraging) — each with a bold organic ground
     decal and themed enemies; wild content avoids zone cores. Added the generic
     `environmentEffectAt(x,y) → {moveMult, regenMult}` env hook. **This is the template for
     structuring any biome.**
   - **Phase 2a (B3-P2a)** — the **activated-ability framework**: cooldown-only, **equipment-granted**
     actives (originally `special1→Q`, `special2→E`, `back→R`; **superseded in 5ar** — the three
     ability slots are now interchangeable and position alone is the hotkey) with a Dota-style QER HUD bar
     (`src/systems/Abilities.ts` + `src/ui/AbilityBarUI.ts`). Three starters: Gloamstep Blink,
     Gloam Nova, Bloodpact (a timed **lifelink**, not a heal-over-time). Effect logic lives in
     MainScene's `castAbility` dispatcher; `AbilityDef` is pure data.
   - **Phase 2b (B3-P2b)** — `src/systems/EquipmentEffects.ts`, the first mechanical effect path for
     equipped **non-armor** items, deliberately a **different layer from relics** (relics own raw-%
     combat stats; jewelry is ability-augment + utility/explorer). New **Gemwright's Table** station
     whose tier-1 recipes are gated behind a **Duneshaper's Heart** drop.
   - **Phase 3 (B3-P3)** — **gem augments** (mix-and-match, consumed, max 2 per instance, reusing the
     per-instance `upgrades` field + `UpgradeMenu`) + the **Gloamsteel/Mirehide reforge tier** and
     Workbench Lvl 5. See [[survivor-rpg-gear-augments]].
   - **Phase 4a (B3-P4a)** — the bayou's **terrain, environment and material sources**. Locked:
     water **slows by depth, never blocks**; **`poison` is a SUBTYPE OF MAGIC** (new
     `IncomingDamageType` — bypasses flat armor, takes heavy-armor magic mitigation, and adds its own
     identity: ticks over time + **halves HP regen**, not a full block). New `src/systems/Poison.ts`
     **composes** `BleedManager` with two modes — `apply()` (discrete **stacking** dose) and
     `sustain()` (continuous environmental source, **refresh-don't-stack**). Three themed macro-zones
     (miasma/bonemire/hammock), 443 nodes, and `src/ui/StatusBarUI.ts` (a generic debuff strip —
     bleed had shipped with no HUD tell since the badlands).
   - **Phase 4b (B3-P4b)** — the **creature roster**: six bespoke melee-core creatures (**Mirejaw**
     the signature ambusher + sole Mirehide source, **Blighttoad** the poison carrier, **Mosswretch**
     the bruiser + the roster's fire lesson, **Murkling** the swarm/AOE-arc payoff, **Fenlurker** the
     burrower whose dodge verb is the *opposite* of the Sandmaw's) plus one deliberately uncommon
     ranged haunt (**Corpselight**), which introduced the game's first **homing projectile**
     (`Projectile.homing` + a **required** `maxLifetimeMs` — the default despawn measures distance
     *from spawn*, which a curving orb never trips). Also `Enemy.pendingPoison`, 3 materials, and 6
     elite trophies at **Common / Tier 3** (roll-only until a tier-3 shard currency exists).
     **A same-session tuning pass** then rescaled the whole roster after the user flagged it as too
     easy — see [[feedback_size_enemies_against_player]]: size new enemies against the **player's
     measured envelope** (sprint 166-229px/s, dash 450, 220px blink, 45-70 per hit), never against
     the previous biome's roster.
   - **Phase 4 is sliced into four sessions — 4a, 4b, 4c and 4d are ALL done, so Phase 4 is
     complete.** Only **Phase 5** (post-big-boss RNG reward choice) remains in this arc.
   - **Phase 4c (B3-P4c) — Sunken Crypts, the DUNGEON mechanic** (plan:
     `.claude/plans/biome-3-phase-4c-crypts.md`): where the 3 ability gems + Moonsilver actually
     live, now that they've been pulled OFF the surface (locked surface/dungeon split — surface =
     bulk gathering under threat, **dungeon = build-defining materials**). **6 crypts, two per gem
     theme** — which crypt you clear decides which ability you unlock. **Interiors are a pocket of
     the same world, not a second Phaser Scene** (every system lives on MainScene): prebuilt at
     `create()` in `CRYPT_REALM`, the dead corner of the world SQUARE that falls outside the world
     CIRCLE, laid out by a new framework-free `src/systems/CryptLayout.ts` (rooms + L-corridors on a
     32px grid, walls returned as **merged runs** so six dungeons cost ~600 static bodies, not
     ~1800). An `activeCrypt` field gates everything that must not run underground (player clamp,
     map reveal/minimap, surface respawns, nightfall surge, dawn cull), and `NightOverlayUI` gained
     an **underground mode (0.94 alpha)** so a crypt is pitch black past your torch. **Materials are
     hard-gated on the encounter**: vault geodes + moonsilver seams spawn `shielded` (the Gloaming
     Vein mechanic — no prompt, un-mineable) and crack open only on the warden's death; an arena
     lock was deliberately NOT added (hardcore + no escape = no counterplay). **Three bespoke
     wardens with three genuinely DIFFERENT state machines** — locked by the user, since Gloamwarden
     and Cinderwrought both run the same telegraph/poise skeleton where the punish is always "chip
     the bar": **Palewake** (untargetable while stalking; the only opening is **breaking its
     drain-tether with a wall/pillar** — a dodge verb interiors made possible), **Kilnborn** (a
     **heat meter that rises as it acts**, igniting its own vault floor; the backdraft sweeps the
     burning ground, so the dodge is **cold tiles**, and the punish window comes on the boss's
     clock), **Sanguinarch** (**the player sets its phase** — its feed only lands while you're
     bleeding, trading it a heal for your `engorged` punish window).
     **Two same-session playtest passes locked the rest of the dungeon's rules:**
     (1) **Crypt dwellers collide with walls** — the one place the engine-wide
     `Enemy.collidesWithTerrain = false` default is wrong (out in the world, solid things are
     boulders = cover; a dungeon wall is structure). That immediately reproduced the wedging the
     default protects against, so `CryptLayout` gained a small **nav graph over its own rooms and
     corridors** and `MainScene.steerCryptEnemy` **re-aims the velocity the AI already chose** toward
     the next doorway — steering, never target substitution (a fake nearby target makes anything with
     reach plant and swing at air), waypoints kept inside the rect overlap (convex ⇒ the straight
     line never crosses rock), and one committed waypoint per enemy (re-planning each frame
     oscillates at junctions). **Any future enemy placed in a crypt gets this for free; anything that
     moves by teleport does not.** (2) **A crypt is lit by DISCOVERY, not equipment** — stepping into
     a room lights that whole space permanently (fog-of-war), the player carries an ambient light
     underground so **a torch is a bonus, never the price of seeing**, and **Gloamstep Blink is
     CLIPPED to floor rather than banned** (`clipBlinkToFloor` marches the blink line and lands on
     the last valid point — testing only the endpoint would let it jump through a wall). See
     `STATUS.md`.
   - **Phase 4d (B3-P4d) — surface POIs + the Miretyrant, itself split across two sessions**
     (plan: `.claude/plans/biome-3-phase-4d-pois.md`). **Session 1 is DONE:** the bayou's two
     surface POIs, built on **deliberately different verbs** because every prior POI (shack,
     warren, forge, vein, crypt) resolves as "kill the guards, take the loot". The **Sunken
     Shrine** is a rite the PLAYER starts — spend an offering (3 Blight Gland + 2 Gloam Dust,
     finally giving the 4b trash-mob drops an economy) to kindle three escalating waves fought on
     the spot; leaving a 420px radius for 5s lapses it and destroys what it summoned; surviving
     opens a bowl with a guaranteed **Tyrant Sigil**, and emptying the bowl re-arms it, so it is
     **renewable with no respawn timer**. The **Drowned Lodge** is a place whose danger is its
     geography — a stilt village where the boardwalk is the only safe footing (Corpselights above,
     Mirejaws in the 0.5×-slow water below), payoff spread across per-hut caches, with a
     chieftain's hut planked shut (no prompt at all, the shielded-node treatment) until every
     haunt is dead, holding a guaranteed **Gorge Bone**. Both key materials ship **inert** — no
     recipe until the descent exists, so nothing dead-ends in the crafting menu. Also extracted
     **`MainScene.insidePoiClearing(x,y)`**: the POI-exclusion list had been duplicated in three
     samplers (only one knew about the new POIs) and `scatterInZone` had no check at all, which
     put stray trees inside a Lodge — **any future POI now only needs adding in one place.**
     **Session 2 (B3-P4d(2)) — DONE, and it completes Phase 4:** the **Miretyrant**, which per a
     locked amendment lives in its **own boss-level DUNGEON, not on the surface**. Locked via
     `AskUserQuestion`: adds = **bellow waves** on their own clock (the boss only ASKS via
     `consumeBellow()` and MainScene resolves the spawn — the same contract `checkPlayerHit()`
     uses, so adds inherit terrain collision / crypt nav / containment for free); interior =
     **approach + arena**; **no arena seal** (4c's lock — hardcore + no escape = no counterplay);
     **one fixed lair**, map-revealed the moment the **Effigy of the Miretyrant** (2 Tyrant Sigil +
     1 Gorge Bone + 4 Mirehide) is crafted, which also unseals its maw. The boss is the deliberate
     counterweight to the caster Duneshaper — a **bruiser** that closes and stays close, so every
     dodge is a spacing dodge (locked-heading chomp, ±120° tail sweep escaped by DISTANCE, radial
     slam, phase-2 death roll you outrun across) — and it resists slash/poison but folds to
     **blunt**, so the two finales reward different loadouts. The dungeon layer was **generalized,
     not copied**: `generateCrypt` gained an optional forced **arena room** (a boss arena can't be a
     random 8-12 cell room), and a new `DungeonInterior` interface (`src/systems/Dungeon.ts`) plus
     an extracted `renderDungeonShell()` let the player clamp, room-discovery lighting, brazier
     lights, crypt-nav steering, containment and every underground gate serve both interiors with
     **no branching** (`activeCrypt` → `activeDungeon`). **The win-con is now the Miretyrant**,
     demoting the Duneshaper to a mid-boss and finally making its **Heart** obtainable (it gates the
     Gemwright's ability-jewelry tier and had been unreachable since B3-P2b because that kill ended
     the run). **Phase 5 (B3-P5) — DONE, completing the arc:** the post-big-boss reward choice, which
     the user **redirected out of the umbrella's kill-time modal and into the Relic Forge** —
     rolling a **boss trophy** now offers **3 candidate Mythics to pick from** instead of granting
     one at random. Since there's exactly one Mythic per family, the pick reads as "which family
     gets your Mythic?". Boss-trophy-only but expressed as **data** (`TrophyRoll.choiceCount`), so
     every other trophy is unchanged; **ownership isn't written until the pick** (the roll fixes
     rarity + candidates at click, preserving the "theatre over a known result" invariant), and
     picking then runs the **normal family-dominance path** rather than force-equipping.
     Commit-only (no skip, no reroll); closing the forge mid-pick auto-takes the first card, since
     a spent boss trophy must never yield nothing. **The whole biome-3 + new-systems umbrella is
     now COMPLETE (all 5 phases); no next arc is planned.**
     See [[survivor-rpg-biome-3-roadmap]].

5ao. **B4-P1 — Start-of-run base character** (plan:
   `.claude/plans/b4-p1-start-of-run-character.md`, built on Opus). The first milestone after
   the biome-3 umbrella closed, and the roadmap's own top deferred candidate. A **run-start
   class picker** (`src/ui/CharacterSelectUI.ts`) offers a **fixed roster of five survivors**
   — Vagabond / Reaver / Ashcaller / Warden / Ascetic — each bundling starting stats, a kit, a
   granted Q/E/R ability, and a **double-edged run modifier** live for the whole run. Locked
   with the user: fixed roster (not an RNG 3-card draw); one card bundles all four axes;
   modifiers are double-edged with **NO score effect** (`Run.score()` stays kills +
   speed-scaled completion bonus, so a harder card can't become a leaderboard lever); and the
   "innate" ability is a **real ability-granting SPECIAL ITEM pre-equipped in its slot**, so it
   fills the same mechanical role as any other equipment — which meant **zero new ability
   plumbing** (`recomputeAbilities()` already derives Q/E/R from `ItemDef.grantsAbility`) and
   also makes B3-P2a's ability framework reachable from turn one instead of only via crypt
   gems. `src/systems/Characters.ts` is framework-free pure data plus a `RunCharacter` accessor
   **deliberately shaped like `RelicManager`'s getters**, so each modifier **adds exactly one
   term at an existing choke point** (`damageBonusMult` / `applyDamageToPlayer` / the `moveMult`
   sum / `awardSkillXp` / `effectiveStaminaCostMult` / `rollElite` / `syncStatBonuses`) and
   never introduces new math — a new modifier field means a new hook, which is a deliberate
   decision rather than a freebie. Two placements to preserve: the damage-taken modifier scales
   `amount` **before** the reduction bucket (a property of the run, not another stackable
   resistance, so it can't be erased by the 75% cap), and its HP/stamina % is an **independent
   linear add** off the 100 base per the additive rule, never compounded with relic %. The
   picker **chains off the welcome overlay** (never stacks on it), shows on **every** run
   including New Run, has **no cancel path** (a run must have a character), and reuses the pause
   freeze so **deciding your build never burns speedrun time**. The dashboard gained a live
   **Characters** tab. All five characters' numbers are first-pass — expect tuning once played.
   See `STATUS.md` + [[survivor-rpg-start-of-run-character]].

5ap. **B4-P3 — Class identity: skill affinities + stat potency** (plan:
   `.claude/plans/b4-p3-class-identity.md`, built on Opus). B4-P1's five survivors all
   differentiated on the **same shape** — eight global scalar `RunModifier` fields — so
   nothing about a character shaped **how you grow**, only how big your flat numbers were.
   Adds a second, separate channel, `ClassAffinity { skillXpMult, statPotency }`: a per-skill
   XP rate and a per-stat multiplier on the value of each allocated point. Locked with
   the user: **both** channels; double-edged but **mild** (favoured ×1.4–1.6, penalised
   ×0.75–0.85 — nobody is crippled at anything); and **never reduce drops**, which has a
   concrete consequence — `chopping`/`mining` levels roll the bonus-drop chance
   (`Skills.choppingBonusChance`/`miningBonusChance`), so a gathering-XP *penalty* is an
   indirect drop nerf and **no character may penalise those two skills** (enforced by a
   module-load `console.warn` guard in `Characters.ts`, so a future editor trips it in the dev
   console rather than in a playtest; the Warden is the only card with gathering affinity and
   per the lock it can only ever be an upside there). **Each channel has exactly ONE hook
   site**, per `Characters.ts`'s own "a new field means a new hook, which is a deliberate
   decision" rule: skill affinity multiplies in `MainScene.awardSkillXp` **outside** the
   additive XP bucket (deliberate — the bucket is the "global +% XP" category, and folding a
   class's ×0.75 weakness in as −25 would let a couple of relics erase its defining downside
   entirely), and stat potency lives **inside `PlayerProgression`** (`setStatPotency`/
   `potency`) rather than at MainScene read sites, so all eight per-point getters *and* every
   stat readout pick it up from one place with **zero** MainScene hooks changed. That also let
   `statTotalEffect()` be refactored to read the getters instead of re-multiplying the raw
   per-point constants, removing a standing duplication-drift risk. Because skills gate recipe
   **discovery** (`Recipe.requiredSkills`), an affinity genuinely changes what a run can
   build, not just how fast numbers climb. Display text is **derived** from the maps
   (`affinityLines(def)`) so card/menu/dashboard copy can never drift from the numbers, unlike
   the hand-written `boon`/`bane` strings. **Two incidental fixes:** the picker card now
   **measures its own height** (`renderCard` returns its content bottom; `render()` grows every
   rect to the tallest — the hand-tuned `CARD_H` constant was exactly the thing that breaks
   when a section is added), and **`Skills.ts` was leaking Phaser** into the supposedly
   Phaser-free balancing dashboard once `Characters.ts` imported `skillDisplayName` —
   `PLAYER_WALK_SPEED` moved to a new Phaser-free `src/systems/movement.ts` with `Player.ts`
   re-exporting it, so every existing import path still works (bundling `Characters.ts`
   standalone went 6.4 MB → 7.5 KB). Note `vite.config.ts` does **not** list `dashboard.html`
   as a build input — it is dev-server-only, so that leak cost the dashboard's dev page load,
   not the shipped bundle. All numbers first-pass/tunable. See `STATUS.md`.

5at. **Perf pass — static zone decals were 5ms of the frame** (2026-07-25, Opus, no plan file).
   Off the user's "a little hitchy while running around at 100 run skill". Profiling (not guessing)
   took the frame from **12.7 -> 5.0ms median / 15.1 -> 6.8ms p95** while sprinting at the
   Running-100 ceiling, render **5.9 -> 2.4ms**, frames over 20ms to zero. **The cause:
   `MainScene.drawZoneFloor` drew each macro-zone's ground decal as a live `Graphics`** — 11
   stacked translucent blobs x ~39 outline segments = ~1,390 commands each, x 72 zones (10
   badlands + 62 bayou) = **103,082 fill commands re-tessellated and re-uploaded EVERY FRAME**,
   on screen or not, for artwork drawn once at world-gen that never changes. Now baked to a
   texture per zone and drawn as an `Image` (103,082 -> 2,849 commands). **Standing lesson: a
   static `Graphics` is a per-frame cost, not a one-off** — bake anything drawn once and never
   changed. **And bake LARGE shapes at reduced resolution**: at 1:1 these 72 decals would have
   been ~400MB of texture, so they bake at a quarter and scale up with LINEAR filtering (invisible
   on a soft translucent stain; 31.4MB). Three wrong guesses on the way, each worth not repeating:
   it was NOT fill rate/overdraw (hiding each stacked full-screen ground layer changed nothing),
   NOT the un-culled per-enemy `telegraphGfx` (hiding all 259 plus 54 off-screen lodge tilesprites
   saved 0.16ms), and NOT the `STREAM_MARGIN` (900 -> 100 removed ~480 objects for 0.4ms). Only a
   random-half bisection localised it. Also: `GroundDetailUI.ROWS_PER_FRAME` 8 -> 5, whose floor is
   that the chunk rebuild must OUTRUN the player or `update()` falls back to a full synchronous
   rebuild.

5aq. **B4-P6 — Display-list streaming (perf), culled-enemy drift, playtest fixes** (no plan
   file — a fix batch; built on Opus). Two structural findings worth carrying forward.
   **(1) The render list, not the game logic, is the frame-rate ceiling.** The world had
   reached **17,041 display objects**; Phaser iterates the whole list every frame (cull,
   render, and again in `syncCameras`) and **re-sorts all of it whenever any depth changes**
   — which, because every world object Y-sorts via `ysortDepth`, means every frame the player
   moves and never while standing still. That is why the hitching was specifically a
   *walking/sprinting* symptom. Measured 22.3ms/frame **with the sim paused**; hiding objects
   barely helps (invisible children are still iterated), *removing* them is what matters. New
   **`MainScene.updateSceneStreaming()`** parks any world object that can't be on screen out
   of `scene.children` into a `streamedOut` array and re-adds it on approach — every 250ms,
   with a 900px margin past `cameras.main.worldView` (so it tracks zoom automatically).
   Physics bodies live in the physics world and `Sprite.preUpdate` runs off the scene's update
   list, so **collision/AI/animation are untouched**. 17,041 → ~1,550 in the list; 22.3 → 9.3ms
   while sprinting. `isStreamable` excludes HUD (`scrollFactor 0`), ground bakes/decals
   (`depth < 0` or >900px) and **every `Graphics` object** — Graphics draw in absolute world
   coords from a transform parked at (0,0), so their x/y is meaningless for culling. **Any
   future bulk-prop system should assume this exists rather than adding a second cull.**
   **(2) A distance-culled enemy must be stopped, not just skipped.** B4-P4's AI cull
   `continue`d past 2000px without zeroing the body, and Arcade velocity persists with no drag
   — so anything culled mid-chase (or mid-pounce at 330px/s) **coasted in a straight line
   indefinitely**. That single defect produced three separate playtest reports: Warren dens
   permanently stuck on wave 1 (guards alive but thousands of px away, so the elite wave can
   never trigger), gremlin camps looking unguarded, and badlands Duskrunners appearing in the
   starting forest. Fixed at the cull site, plus a coarse backstop — base `Enemy` now records
   `homeX/homeY` and `MainScene.steerEnemyHome()` walks a **non-aggro'd, non-attacking** enemy
   back past an 800px leash, a post-`update()` steer exactly like `steerCryptEnemy` so **no
   subclass wander code changed**. Also: light-bearing jewelry now sheds its own light
   (`EquipmentEffects.innateLightRadius()` — `lightRadiusPct` alone multiplied a held-torch
   radius that is 0 with an axe in hand, so the Amulet of Farsight did literally nothing); the
   left-hand craft/material toast stack is capped at 6 and repacked from its baseline on every
   add/evict/fade (it was a monotonic upward cursor with no cap, so a crafting burst climbed
   off-screen); `WORLD_ZOOM` 1.25 → **1.5**; and every `src/ui` font is **+2px** (74 sites)
   with the layout constants coupled to those metrics adjusted alongside — note MainScene's
   world-space text is deliberately untouched, since the camera zoom already enlarges it.
   **A second batch in the same session** cleared four older items. **(a) A POI with more than one
   entrance must measure reach against the HOVERED one** — the Sunken Gorge has two maws into one
   interior, but `promptForGorge` measured `lair.x/lair.y` (always maw #1), so the second door gave
   no prompt and silently ate the click; `hoveredGorge` now carries `{ lair, maw }`. This is the
   trap for any future multi-entrance POI. **(b) "Nothing surface may be underground" is now a hard
   invariant** in `updateEnemies` (`insideUndergroundRealm`, covering `CRYPT_REALM` + `LAIR_REALM`),
   not a consequence of movement behaving: those pockets sit in the dead corner of the world
   SQUARE, so they're inside `collideWorldBounds` even though they're outside the world CIRCLE the
   player is clamped to — anything travelling far enough just arrives there. **(c) Teleports must
   snap the camera**: it follows with lerp 0.1, so a ~14000px descent made it EASE across the whole
   world in plain view, which no `flash` is long enough to hide; new `transitionCameraTo()` calls
   `centerOn()` then fades up from black on BOTH cameras (world-only leaves the HUD over black).
   **(d)** Tier art is already generic (`tieredStationTexture` looks for `<icon>_t{n}`) — the
   Ironshod Pickaxe just needed `icon_stone_pickaxe_t1` drawn; **adding tiered art for any item is
   only ever a BootScene texture, never wiring.**
   **A third batch** changed two design rules. **(e) No character starts with gear** (the user):
   every `CharacterDef.startingItems` is now `[]` — three of the five used to hand out an axe, which
   made the class pick partly a decision about how fast the opening minutes went, and made the
   Ascetic's empty hands (its whole stated identity) not special. **`startingEquip` is deliberately
   untouched** — that is the ability-granting special item, which per B4-P1's locked decision 4 *is*
   the class's ability rather than gear, so stripping it would delete Q/E/R from every card. The
   field stays (not deleted) as the lever for a future unlock/difficulty option. Knock-ons: the
   Ascetic's blurb, the card's KIT section (skipped when empty) and the picker subtitle all had to
   stop referring to kits. Confirmed the bare-handed opening isn't a dead end — ground branches +
   rocks unlock the Woodcutter's Axe immediately. **(f) Upgrade-unlock toasts are split by what the
   unlock BUYS**: a station or tool upgrade grants a capability you didn't have (a recipe tier, a
   node you couldn't fell) and keeps its toast; a weapon/armor **ladder rung** is only a bigger
   number on something you already own, so it now uses `EventLog`'s `silent` flag — still in the
   scrollable Log, still in the Upgrade menu, just no popup. Ladders have dozens of rungs and one
   common material can unlock a whole column on the same frame: a saturated inventory went from
   **88 toasts to 14**. Apply the same test to any future unlock announcement.
   All numbers first-pass/tunable. See `STATUS.md`.

5ar. **Vagabond-run playtest dump — 4 batches, ~35 items** (2026-07-23, Opus, no plan file — a
   fix/rework batch). Triaged the user's dump into four batches, confirmed the order via
   `AskUserQuestion`, shipped all four plus three follow-ups. Full detail in `STATUS.md`; the
   load-bearing changes and the rules they establish:
   - **A ranged enemy that calls `markAttackLanded()` at FIRE time can never deaggro.** That reset
     the pursuit clock AND extended aggro-persistence, and every cast cooldown is under
     `AGGRO_PERSIST_MS` (4s), so both refreshed forever whether or not a shot connected — the
     "nothing in the bayou deaggros" report. Base `Enemy` now separates
     **`markAttackAttempted()`** (extends persistence only) from `markAttackLanded()`, and a landed
     shot routes back via **`Projectile.sourceEnemy` → `onProjectileHitPlayer()`**. **Any future
     ranged enemy must use `markAttackAttempted` at fire time and pass `sourceEnemy`.**
   - **Every ranged attacker needs a cast-RANGE gate, not just a deaggro radius.** The Corpselight
     had none (it fired anywhere inside 700px) and no telegraph — the one ranged creature ignoring
     the souls-like windup contract. Now 380px, a 520ms *planted* wind-up with locked aim, and a
     randomised initial cast clock so a multi-caster POI stops firing as one volley.
   - **`EquipSlot` is now three GROUPS plus ammo** — gear ×3 / **special ×4** / **ability ×3** —
     replacing helmet/chest/legs + necklace/ring1/ring2/cloak/back/special1/special2. An item
     declares a *group*, not a destination; equipping routes to `Equipment.firstFreeIn(group)` and
     only swaps when the group is full. **Position is the hotkey** (ability1/2/3 → Q/E/R), so any
     ability item fits any ability slot. `InventoryMenu`'s `ARMOR_LAYOUT` table drives BOTH drawing
     and hit-testing — **keep them derived from that one table.** `ItemCategory` gained
     `special`/`ability` so the backpack sections answer "where does this go?".
   - **A blanket map reveal is not a discovery mechanic.** A first pass revealed all 18 crypts on
     bayou entry; the user rejected it ("I don't want it to reveal the whole biome"). Replaced with
     the **Gravemark Rubbing** — a 6% drop from the common bayou roster, **consumed on contact** in
     `collectNode` (never enters the backpack, so it can't be hoarded into a de-facto reveal-all),
     mapping the single nearest unknown crypt. Plus grave-marker breadcrumb bands out to 760px, so
     the ground reads as graver before the door is in view. `LootEntry` gained an optional
     `chance` (absent = always drops).
   - **Item stat lines are DISPLAY TEXT, not the mechanic.** The armor retune first edited
     `{ label: "Armor", value }` and the in-game total never moved — real defense is
     `ItemDef.armorDefense`. Both are now written from one table. Caught only by measuring live
     state; **verify balance changes against real in-game values, never against the edit.**
   - Crypts 12→18 across **two** interior realms (the bottom-left dead corner was free) —
     subdividing one realm would have shrunk cells and silently cut rooms per crypt. Fixed a
     pre-existing `generateCrypt` bug on the way: rejection sampling left 13 of 18 crypts under the
     5-room target and 5 at the bare 2-room floor, so most "dungeons" were an entry and a boss.
   - **`Enemy.destroy()` now cleans up its own HP bars.** They're two *sibling* GameObjects that
     were only destroyed in `playDeathFeedback`, so every DESPAWN path (lapsed shrine rite, dawn
     cull, den reset) stranded one forever.
   - Two new **craftable** abilities (Gemwright's Table): **Mire Snare** (AOE root — `applySlow(0)`,
     moves nothing and deliberately does NOT cancel a committed swing, so it's root-then-leave) and
     **Bloodrush** (attack speed), which added the game's first attack-speed hook —
     `MainScene.attackCooldownMult()` multiplied into `weaponCooldownMs` at **all three** attack
     sites, so a future attack path inherits it. Requested abilities are craftable, not epic-drop
     gated — an epic roll reproduces the "I never found one" problem.
   - **Per-warden crypt interiors**: `CryptThemeDef.shell` + an optional palette on
     `renderDungeonShell` (the Miretyrant's lair passes none and keeps base stone), with BootScene's
     palette-driven `cryptShell()`. The dweller mix is themed as a *weighting* over the same three
     species, not a new roster. Gotcha for anyone verifying tiled art: a Phaser **TileSprite** swaps
     in its own UUID fill texture and reads back blank under WebGL — the source key survives on
     **`displayTexture.key`**.
   - Balance (all first-pass): weapon stamina ×0.7 + base pool 100→130; armor heavy/light gaps
     widened **without** raising the ceiling (raising it would undo the Miretyrant damage fix);
     forged-armor upgrades per-set (~25% of the piece) instead of a flat +1; Miretyrant re-bumped;
     Sanguinarch 420→620 HP; Gloamdrinker lifelink 12%→8%; Wisdom gained **−0.5% ability
     cooldown/point**; XP exponent 1.8→1.7.

5as. **Reaver-run playtest batch — stat caps, shrine budget, boss pacing, area telegraphs**
   (2026-07-24, Opus, no plan file — a 15-item fix/rework batch off the user's Reaver win: 69:56,
   936 kills, level 31). Every design fork was locked via `AskUserQuestion` first, and two locks
   reversed my own initial recommendation once the real numbers were checked. Full detail in
   `STATUS.md`; the load-bearing rules this establishes:
   - **The scaling runaway had one root cause: Intelligence is a straight player-XP multiplier.**
     `Skills.onLevelUp` feeds the player pool exactly the XP each skill level cost, so ALL raw
     skill XP eventually becomes player XP — meaning Int paid for more Int, unbounded. Two numbers
     sized it: natural 3-biome play ends at **level 24 = 300 points**, and the shrine farm took
     the user to level 31 = 496, i.e. **196 points, more than the entire rest of the run**.
   - **`STAT_POINT_CAP` = 100, a hard cap on every stat** (6 × 100 = 600, so honest play only ever
     spends ~half the budget — the cap bites the farm, not progression; verified headroom through
     5 biomes). Paired with a retune under a new rule: **every stat must still be GROWING at point
     99.** Strength was the offender — its crit-damage axis caps at a combined 3.0× and base weapon
     mults run 1.5-1.8×, so +0.04x/point burned the whole budget in ~35 points (**24** for a
     1.5-potency Reaver). Fixed with a slower rate against the **same ceiling**, never a bigger one
     (the user: "damage is already so high"): Str .04→**.015x**, Agi .5→**.45%**, Int 1.5→**1%**,
     Vit healing 1.5→**1%**, End regen 2→**1.5%**. Flat HP/stamina and both Wisdom axes unchanged.
   - **Dead-point allocation is BLOCKED at the model, not just greyed in the menu**
     (`MainScene.statAxisSaturated` is the single enforcement point, since Str/Agi ceilings depend
     on weapon base + relics; Wisdom is exempt because its second axis is uncapped).
   - **Sunken Shrines are capped at 3 kindlings each**, and a kindling is spent when the rite
     STARTS, not when it's survived — counting completions would leave the loop wide open (kindle,
     farm wave 1, walk away to lapse, repeat, paying only an offering the waves themselves drop).
     Clearing all three pays a guaranteed Tier-3 Refined Trophy: a **relic-economy** reward on
     purpose, so bounding the farm can't cut a gear source, and specifically NOT the Moonsilver
     the user suggested (it gates the Gloamsteel ingot AND the Gemwright's Table, so surfacing it
     would collapse the Gloamsteel-vs-Mirebronze branch choice).
   - **Big-boss pacing guards on base `Enemy`, default OFF** so no normal enemy changes:
     `maxHitFraction` (5% of max HP per hit — floors the 3 main bosses at ~20 connects without
     touching player damage anywhere else) and `phaseGates` (900ms scripted invulnerable
     transition, at most one gate per hit so no phase is skippable). Three subtleties: bosses chip
     **poise** from the same hit and must route it through `effectiveDamage()`; poise is skipped
     entirely while phase-locked; and each boss pushes `stateEnteredAt` forward every frozen frame
     so **the current state's timer pauses** — otherwise a telegraph elapses behind the flash and
     the attack lands with no wind-up to dodge.
   - **Area-attack indicators, roster-wide — this REVERSES the locked "tells are motion/tint,
     never world-space arcs" rule.** Re-locked as: an AREA attack shows its footprint, a
     single-target bite/claw still doesn't (a pose can tell you a bite is coming; nothing about a
     pose tells you a sweep reaches 120° behind the gator). Shared
     `Enemy.drawAreaCircle/drawAreaWedge/drawAreaLane` over one lazily-created Graphics, destroyed
     in BOTH `destroy()` and `playDeathFeedback()`. Wired to Mirejaw (lunge lane — the user's
     "alligators" were the Mirejaw, not the Miretyrant, which already telegraphed its own sweep),
     Boar charge, Duskrunner pounce, Sanguinarch slam, Corpselight collapse. **Audited rather than
     blanket-added:** Kilnborn needs none (its backdraft only burns lit ground, already drawn) and
     Palewake needs none (a tether line, not an area).
   - **`heldCount()` / `consumeHeld()` — upgrades now count HOTBAR materials.** the user reported
     the Workbench Lvl 4→5 glyph missing twice; I wrongly closed it as a content dead-end before he
     corrected me. `canAffordUpgrade` counted the backpack only, and ingots live on the hotbar, so
     the check (and the ▲ glyph it drives) read zero. `Crafting.ts` already carried a hotbar
     reference added off the user's *earlier* report of the same thing — the fix landed in crafting
     and never reached the upgrade path. **Standing lesson: fix a "materials aren't counted" bug at
     EVERY cost site, not just the reported one.**
   - Also: `ItemContainer.compactStacks` at the end of `removeCount` (stack fragmentation came from
     CONSUMPTION, not addition — `add()` tops up every partial, but `removeCount` drains
     front-to-back and leaves the head partial; merge-only and position-preserving, and
     deliberately NOT hooked to `moveSlot` because a Shift+click split would be undone instantly);
     a measured-height fix for the cooking footer's wrapped cost line overlapping `Qty:` (the same
     bug existed in `JewelryMenu`); a batched **Convert All** on the forge (one toast per batch, not
     per shard); Mossling 500ms **damage-only** spawn immunity; and ability items can be dragged
     onto the **Q/E/R HUD bar** (`AbilityBarUI.slotAt`, gated by slot group — position is the
     hotkey, so the R pip equips `ability3`).
   - **Verification gotcha worth keeping:** enemy AI does not tick until a character is actually
     picked (`runOver` stays true), which silently made a first round of telegraph probes report
     nothing at all.

**Not yet built — next up in rough order:**
6. **World & discovery** — much bigger generated world, biomes, map, a single giant
   circular Valheim-style map (spawn at center, danger increases outward). **The circular
   geometry (5v) AND biome 2's patchwork terrain foundation (5ac) have shipped:** the world is
   now a 28000px circle (`WORLD_RADIUS` 14000) with a protected forest disc at center and a
   **patchwork** of badlands + placeholder-dunes blobs beyond (base-layer between; danger scales
   outward). **Phase 1 (combat systems layer — damage-type resist/weak, AOE arcs, swarm
   pack-aggro) has also shipped (5ad), and biome 2's full content pass (Phases 2–5: enemies,
   boss/POIs, forging gear tier, tier-2 relics) is now COMPLETE too (5ae–5am)** — badlands is a
   fully populated second biome. **Still needed for M-W1 proper:** deterministic seeded world-gen,
   and a 3rd+ biome (the master plan calls for "at least 5 total biomes" — biome 2 is the template
   now). See **First biome — content notes** below for terrain-zone concept. (Minimap + fog of war:
   5a, reworked into nearby-view + full-map overlay in 5v; Gremlin Shack POI: 5b.)
7. **ARPG loot** — rarity, randomized drops/recipes, replayability. **Substantially shipped via the
   relic system** (probabilistic rarity-tiered passives, M-RL 5m + Phase 5 5am's family-loadout
   rework) — randomized recipe variants/item-affixes are still open.
8. **Cross-cutting:** save/load (localStorage), real pixel-art tilesets. **The art arc is
   underway** — plan: `.claude/plans/art-textures-lighting-3-biomes.md`, tooling is the **PixelLab
   MCP** (project scope; its tools need a session restart to appear; the API key was pasted in
   plaintext and should be rotated). **Phase 1 shipped** (2026-07-25): `src/art/overrides.ts` means
   dropping `art/sprites/<textureKey>.png` replaces that generated placeholder with **zero
   call-site changes** (per-asset and reversible — generation stays the fallback forever, so the
   game is playable at every point in the migration), and `NightOverlayUI` gained a second
   **additive** RenderTexture so lights cast real colour instead of only erasing darkness.
   **Phase 2 shipped** (2026-07-25, same day): all **181 icons** are real pixel art, authored at
   **32×32** (not the placeholders' 24×24 — PixelLab's minimum canvas, and the size the UI is now
   built around: inventory/hotbar slots grew 46→70px so art renders at a clean integer ×2, the
   crafting list draws icons at 1:1). `Player.equippedIcon` normalises to a fixed 24px world size so
   icon resolution can't resize held weapons. **The four-metal weapon ladder deliberately reads as
   four different weapons, not recolours of one** — the user's call after seeing the real result;
   this reverses Phase 4's original "tiers are the same object in different metals" assumption,
   which needs re-deciding when Phase 4 starts. A searchable reference gallery of all 181 (grouped
   by category, light/dark theme) was published as an artifact and sent to the user; it isn't part
   of this repo. Full detail + operational lessons (PixelLab's queue can stall 20+ minutes even on
   a paid plan, ~85% prompt hit rate, known-hard prompts) in `art/README.md` and `STATUS.md`.
   Measured scope: **377 authored textures total**. **Sprite dimensions
   are load-bearing on world sprites** — reach/hitbox math reads them, so an override that changes
   size is warned about, not silently accepted (icons are UI-only and exempted from that warning).
   **Phase 3 shipped** (2026-07-25, same day): **160 world props** — forest, badlands and bayou
   terrain/flora/ore/POI structures, every `_picked` state, all crypt tiles and objects across four
   themes, 12 map markers, 11 ability icons, projectiles. **341 real assets total.** Alongside the
   art, four things worth knowing before touching this again:
   - **`src/art/variants.ts`** — dropping `art/sprites/tree_v2.png` now varies every node of that
     kind with **no code change**, resolved in `ResourceNode`'s constructor (one hook, ~20 spawn
     sites) and chosen by hashing the prop's position so the world looks the same each load.
   - **Sizing is a rule, not a list**: real art keeps its natural size; **ground clutter**
     (placeholder ≤ the 20px player) returns to its placeholder footprint; **crops**
     (`action === "pickup"`) are their own placeholder ×1.15 capped 30px; **POI ring markers**
     ×1.3. Each keys off data the game already has, so new assets inherit the right rule.
   - **`art/tools/`** is committed and is the workflow: `fetch.sh`/`fetch-raw.sh` (download +
     trim, or download + alpha-check for decals/tiles), `trim.mjs`, `adjust.mjs` (darken /
     desaturate / `--feather` radial alpha), `check-alpha.mjs`, and `gallery.mjs`, which
     **regenerates the published reference gallery from the repo** so it can never drift.
   - **Two traps, both in `art/README.md`:** "derived variants are free" holds only at BUILD time
     (BootScene *generates* `crypt_wall_gloam` from a palette, so overriding `crypt_wall` never
     reaches it — **the same trap awaits the 14 `*_elite` creatures in Phase 4**), and **tiles are
     not props** (tiled textures must be seamless/full-bleed — `create_tiles_pro`, never trimmed).
   **Animation scope was widened by the user** — "anything that moves or could move should have
   animations even if ambient" — which **reverses the original "~327 of 377 never animate"**. It
   decides a tool at generation time: a `create_map_object` result can never be animated, so the
   ~19 identified ambient movers (flames, crystals, reeds, banners) get regenerated as objects
   during the animation pass. **Ground texturing + biome blending — SHIPPED**
   (2026-07-25), the last and only non-reversible phase (the ground is generated, not a sprite,
   so the override layer can't reach it). The colour bake is untouched and still owns every biome
   boundary and POI floor stamp; real 32px tiles are stamped semi-transparently over it by
   **`src/ui/GroundDetailUI.ts`**, a 2304px chunk kept around the player — constant cost at any
   world size, which is the whole reason for the design (a world-sized texture OOMs, and the outer
   colour overlay is ~7 world px per texel, so a moving chunk is the only way to get 1:1 pixel art
   onto the ground). `src/systems/ground.ts` owns the 10-material vocabulary and
   `WorldBiomes.worldGroundMaterialAt` mirrors the colour compositor's priority order, so texture
   and colour can never disagree about where a creek or a mesa is. Four rules worth carrying
   forward: **boundaries are softened by a per-cell two-probe dither** (a jittered primary plus a
   far-flung secondary laid on at half strength — one mechanism covers blob seams, creek banks and
   mesa edges alike, with no per-boundary code); the art is **authored at 32px but stamped on a
   16px grid** via quadrant frames, so material edges curve without halving the ground's pixel
   resolution against every other sprite; **a tile that looks perfect often does not tile** —
   `art/tools/check-seam.mjs` catches it (about a third of every batch, invisibly) and
   `art/tools/seamless.mjs` repairs a wrap rather than re-rolling for one; and **a POI floor baked
   into the colour layer must ALSO be a material**, or this layer paints grass straight back over
   it (`MainScene.groundMaterialAt` — the War Camp regressed exactly this way). The old
   `ground_speckle` grain layer is gone; it existed only because the outer world had no detail.
   **Phase 4 (player rig) + the creature roster shipped** (2026-07-25, same day). Five survivors
   with 4-direction idle + walk, themed on their starting ability (`src/art/playerRig.ts`); all 14
   common creatures and all 8 bosses with real art, **19 of 22 animated** idle/walk/attack
   (`src/art/creatureRig.ts`). The `*_elite` trap above is **resolved**: elites are recoloured from
   their base's real pixels at load time (`src/art/eliteVariants.ts`) — including animation strips —
   so they never need authoring, and a hand-authored `<name>_elite.png` still wins.
   **Rules worth carrying forward:** creature art is generated via `create_character`, NOT
   `create_1_direction_object` (1 generation vs 25, no review step, and quadrupeds have a real
   attack template); **direction is per-ANIMATION** — idle faces front (a profile hides the ears/
   face/held item that identify a humanoid), movement and attacks face side-on (a front-facing walk
   moonwalks); and a creature's **body + reach stay pinned to its placeholder footprint**
   (`placeholderDims`), so real art can be bigger without silently rebalancing combat.
   **Deliberately not animated:** Snake, Sandmaw and Corpselight (none fits a humanoid or quadruped
   skeleton; the first two are ambushers whose read is stillness, the third is a legless wisp that
   already hovers via `bobPhase` in code). **No player attack animation** — both routes
   were rejected; the body pulses and the held item lunges. **No weapon-in-hand sprites** — the
   plan's anchor needed a per-frame hand joint the API doesn't expose.
   **A second creature pass followed the same day** off the user's playtest, art-layer only (no code
   changed): the **Mirejaw was regenerated as a real alligator** (the old one read as a dog — a
   quadruped skeleton controls the POSE, only the description carries the ANATOMY, so it has to
   name snout/low body/tail/no-fur explicitly) with a **lunging chomp** (`jump-attack`) instead of a
   paw-swipe; the **Corpselight moved off the character path entirely** to a static
   `create_map_object` ghost, because a humanoid skeleton always has legs and no prompt was ever
   going to produce a legless floating haunt from it; and **every creature's attack template now
   matches the attack it actually performs** (Gremlin `throw-object`, Palewake `pull-heavy-object`,
   Kilnborn `hurricane-kick`, Gremlin King `two-footed-jump`, …) — the original recipe's blanket
   "humanoids use `cross-punch`" is what made the roster feel repetitive. Full mapping table +
   both lessons in `art/README.md`.
   **The attack-FX phase has STARTED**, and its first outcome is a rule rather than
   art: an **attack INDICATOR and the ATTACK ITSELF must never be mistakable for one another**
   (the user — the Cinderwrought's cone telegraph and its cone impact were the same wedge in
   the same orange, one brighter). Colour can't carry the distinction, since an attack is drawn
   in its element's own hue, so the split is STRUCTURAL and lives in `src/systems/depth.ts`:
   **`TELEGRAPH_DEPTH`** (flat on the ground, UNDER every entity, outline-led, translucent,
   never a textured sprite) vs **`ATTACK_FX_DEPTH`** (a real art sprite ABOVE the entities,
   opaque, short-lived) — "under your feet = it hasn't happened yet; over your head = it's
   happening." Applied roster-wide in one pass (`Enemy.drawArea*` plus the six bespoke boss
   graphics). Two habits to keep when adding an impact sprite: scale it with `scaleToLongest`
   against the radius `checkPlayerHit` actually uses, so what you see is what hits; and destroy
   it on the DESPAWN path as well as death, or a culled enemy strands it forever. Also:
   **projectile art draws at 1.8x its placeholder footprint while the collision body stays
   pinned** (`Projectile.PROJECTILE_ART_SCALE`) — 6px was invisible against real ground; note
   Arcade's `setSize` takes UNSCALED units. And **`_picked` flora states must depict what
   harvesting did**: a part taken off a plant leaves the plant, a whole plant taken leaves
   ground disturbance (picking a mushroom cluster used to grow one bigger mushroom).
   **Next, in the user's stated order:** finish **AOE/attack FX art** (Cinderwrought's cinder cone, Gloamwarden's ground
   spikes, telegraph footprints — all procedural `Graphics` today) → **on-theme inventory/crafting
   menu art** (`create_ui_asset`) → a **unique in-game cursor** (`input.setDefaultCursor`).

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
   to assert against. **But `updateHover()` is POINTER-driven, not player-position-driven**
   — moving the player alone leaves the prompt empty. You must also place the fake pointer
   over the target, and the naive `(worldX - cam.scrollX) * zoom` inverse is WRONG because
   the canvas is FIT-scaled. Solve the transform numerically instead:
   ```js
   const p0 = cam.getWorldPoint(0, 0), p1 = cam.getWorldPoint(100, 100);
   s.input.activePointer.x = (target.x - p0.x) / ((p1.x - p0.x) / 100);
   s.input.activePointer.y = (target.y - p0.y) / ((p1.y - p0.y) / 100);
   ```
   Two more gather-testing gotchas: chopping/mining spawn **loose drops** and never credit
   the backpack directly (assert on `nodes.filter(n => n.isDrop)`, not `backpack.count`),
   and `lastToolHitAt` caps one swing per frame — reset it each iteration to deplete a node
   inside a single synchronous eval.
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