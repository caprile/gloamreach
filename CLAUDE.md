# Survivor RPG

Top-down 2D pixel game. Long-term vision is **Valheim-like** (exploration, gathering,
crafting, leveling, bosses) with **ARPG** elements layered on top (item/recipe variety,
replayability). Built incrementally as a series of milestones — see **Roadmap** below.

Full milestone plan lives at `.claude/plans/great-i-want-to-tender-kite.md` — read it for
the complete north-star vision and milestone breakdown before starting a new feature.

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
    Player.ts            Arcade-physics sprite; WASD/arrow movement.
    ResourceNode.ts       Gatherable/interactable world object (branch, rock, tree, boulder).
  systems/
    Inventory.ts          Plain resource-count tracker (wood/stone). Seed of crafting later.
```

Keep files small and single-purpose — new systems (crafting, combat, inventory UI) should
get their own file under `src/systems/` or `src/entities/`, not bolted onto `MainScene.ts`.

## Controls (current)

- **Move:** WASD / Arrow keys
- **Sprint:** hold **Shift** while moving — faster movement, drains stamina
- **Dash:** **Spacebar** while moving — a quick movement burst, costs stamina and has
  its own cooldown. Purely a movement burst for now (no i-frames/damage-avoidance —
  there's no health/damage system yet; that comes with Combat).
- **Interact:** **Left click** on a hovered object that's in reach (see below)
- **Auto-pickup (magnet) toggle:** **V**

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

**Not yet built — next up in rough order:**
4. **Combat** — enemies, attack, health/damage, death & respawn. Equipped-item-on-sprite
   visuals are deliberately deferred to land alongside this, since it needs a real
   facing/weapon-attachment system built once and reused. Dash's i-frame potential is
   also deferred to here.
5. **Progression** — XP, levels, stats.
6. **World & discovery** — much bigger generated world, biomes, map.
7. **Bosses.**
8. **ARPG loot** — rarity, randomized drops/recipes, replayability.
9. **Cross-cutting:** save/load (localStorage), real pixel-art tilesets.

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
