# Real pixel art — drop-in override layer

Placeholder art is generated in code (`src/scenes/BootScene.ts`, 377 textures).
Real art replaces it **one asset at a time** with zero code changes.

## Workflow

Drop a PNG in `art/sprites/` named after the Phaser texture key:

```
art/sprites/icon_wood.png     ->  replaces the generated `icon_wood`
```

That's the whole workflow. `src/art/overrides.ts` discovers the folder via Vite's
`import.meta.glob` at build time, so there is no index to register and nothing to
keep in sync. Subdirectories are ignored when deriving the key, so organise the
tree by biome/category however is convenient.

Delete the PNG and the generated placeholder is back. The game is fully playable
at every point during the migration — there is no half-migrated state.

## Rules

**1. Match the placeholder's dimensions.** Sprite size is load-bearing, not
cosmetic: attack reach and hitboxes read it (`MainScene.enemyReach`,
`Enemy.reachBonus`), as do POI floor decals. A mismatch is logged as a console
warning rather than silently accepted — if you change a size deliberately,
re-verify combat feel.

**2. Keep transparency — and VERIFY it, don't assume it.** Everything composites
over baked ground; no opaque background rectangles.

"transparent background" in the prompt is a request, not a guarantee. A batch of
ground decals came back with a **fully opaque canvas** and drew a white square
behind every POI. It was invisible to every normal check: an image viewer
composites over white anyway, so the art looked perfect. `trim.mjs` had been an
*accidental* opacity check — a transparent margin is exactly what it crops — and
decals deliberately skip trimming, which is how the signal was lost.

So `art/tools/check-alpha.mjs` makes it explicit, and `fetch-raw.sh` runs it on
every download. Four solid corners is expected for a **tile** and a bug for
anything else. Fix it with `adjust.mjs --feather 0.5` (a deterministic radial
alpha falloff) rather than re-rolling and hoping — and a soft edge is what a
ground decal wants regardless, since a hard-edged blob reads as a sticker.

**3. Don't pre-scale.** `pixelArt: true` and the camera's `WORLD_ZOOM` (1.5)
handle magnification. Author at native size.

**4. Derived variants are free — don't draw them.** The 14 `*_elite` creature
variants are recoloured from their base's own pixels at load time
(`src/art/eliteVariants.ts`), so giving a creature real art gives its elite real
art too. You don't need to author an `*_elite` PNG — but if you *want* to (the
recolour is "the same creature, but red", not a design), dropping one in wins:
derivation skips any elite key that was itself overridden.

**4a. BUT: "derived" means derived at BUILD time, not runtime.** `BootScene`'s
`cryptShell("gloam", …)` *generates* `crypt_wall_gloam` from a palette — it does
not recolour `crypt_wall` when the game runs. `applyTextureOverrides` runs after
`makeTextures()`, so **overriding a base does NOT reach its themed variants**:
override `crypt_wall` and the three themed crypts keep their placeholder walls
while the Miretyrant lair (which passes no palette) gets real art. Author all
four, or derive after overrides.

The elites hit exactly this trap and were fixed the second way — the palette
recolour now runs *after* overrides, on whatever the base actually is. It
normalises each sprite's own luminance range and lifts it with a gamma before
ramping into the crimson/gold stops: straight luma bunches a creature into one
band (a brown boar sits near 0.4 everywhere), which put the body mass in shadow
and left nothing bright enough to reach the gold.

**4b. Tiles are not props.** `crypt_wall` / `crypt_floor` / `lodge_plank` /
`grass` are **tiled** 32×32 textures that must be seamless. `create_map_object`
produces a centred object on transparency and will visibly seam. Use
`create_tiles_pro` for those. Crypt *objects* (pillar, rubble, brazier, stairs,
chest, entrance) are ordinary props.

`create_tiles_pro` notes (proven on `lodge_plank` / `crypt_floor` / `crypt_wall`):

- Number the subjects in one description to get several materials from one job:
  `"1). cracked grey stone floor slabs 2). dark mossy stone brick wall"`.
- **Two or three subjects, not six.** A six-subject prompt (violet/ember/blood ×
  floor+wall) came back with the violet and ember themes dominating all 16 tiles
  and **no blood tiles at all** — the later subjects were simply dropped. Batch
  by theme and re-fire; it's one job either way.
- It returns **16 candidate tiles regardless**, so one job covers a material with
  plenty of choice. Cost is 20-40 generations, so batch subjects rather than
  firing one job per tile.
- **The download is a ZIP, not a PNG** — `.../mcp/tiles-pro/<id>/download`
  streams a zip of `<description>_<n>.png`. Unpack it and pick.
- Output is full-bleed 32×32 with no transparency, which is what a `tileSprite`
  needs — do **not** run `trim.mjs` on a tile, it would crop the bleed.
- `outline_mode: "segmentation"` avoids the per-tile outline that makes a tiled
  surface read as a grid of separate stamps.
- `*_picked` harvested-flora states and `*_shielded` node states are *state*
  variants — these do need art, but only a small delta from the base.

**5. Creatures face RIGHT.** Facing is `flipX` at runtime; facing is visual only
(attacks use distance math). See the enemy-art convention notes.

**5a. Creature art may be bigger than the placeholder — the FOOTPRINT is
pinned.** The common roster is 14-32px against a 32px canvas floor, so real art
arrives larger. Two things are deliberately measured against the *old* size
instead of the sprite: `Enemy`'s physics body (pinned in its constructor from
`placeholderDims`) and `MainScene.enemyReach`. Reading the live sprite for
either would hand the player extra reach against every common enemy at once,
purely as a side effect of the art pass, while enemies' own melee ranges are
flat constants that don't grow back. Both read the same `placeholderDims`, so
they can't drift. Net effect: creatures look bigger than they hit — which is
ordinary for action games, and keeps the tuned numbers meaningful.

Recipe (same as world props):

```
create_map_object  view "side", outline "single color outline",
                   medium shading / medium detail, canvas >= 32
description: "<creature>, side profile facing right, pixel art game creature
              sprite, dark neutral outline, transparent background"
```

Fetch with `art/tools/fetch.sh <id> <textureKey>` into `art/sprites/world/`.
Unlike character creates, map objects DO run 4+ concurrently.

## Animated player art (`art/rig/`)

An animation is many frames under one logical name, which a flat
`art/sprites/<key>.png` swap can't express — so the five survivors live in their
own tree with their own loader (`src/art/playerRig.ts`):

```
art/rig/<characterId>/<anim>_<direction>_f<frameCount>.png
art/rig/vagabond/walk_south_f6.png     <- 6 frames, horizontal strip
```

`<characterId>` is the game's own `CharacterDef.id` (`Characters.ts`), since
that's what `MainScene.applyCharacter` hands to `Player.setCharacter`. Anims are
`idle` / `walk` / `attack`; directions are the PixelLab cardinals. The frame
count is in the filename and the frame width is derived after load, so a strip
carries its own metadata — no manifest, same reason `overrides.ts` globs a
directory. A character with no folder keeps its placeholder sprite, so this
stays per-character and reversible like the static layer.

`art/tools/fetch-rig.sh <pixellab-character-id> <character-id>` does the whole
download: the character ZIP holds `rotations/` and
`animations/<name>/<dir>/frame_NNN.png`, and each direction is stitched into a
strip by `sheet.mjs`. A character with no `idle` animation yet gets a 1-frame
idle from its rotation image, so a rig is playable the moment the character
itself finishes.

**Generation recipe (proven on all five):**

```
create_character  mode "standard", n_directions 4, size 32, view "low top-down",
                  outline "single color black outline", medium shading/detail
animate_character template "breathing-idle" -> idle (4f)
                  template "walking-6-frames" -> walk (6f)
                  template "cross-punch" -> attack
```

- **Standard mode beats v3 here.** v3 costs 2 generations, returns a 60px canvas
  and 8 directions the game's 4-way facing can't use, and read as a squat blob
  from the north. Standard is 1 generation, 48px, cleaner silhouette.
- **`size: 32` yields a 48x48 canvas** — PixelLab pads ~40% for animation
  headroom. That's the sprite size; the physics body stays 18px (`Player.BODY`).
- **A v3 CUSTOM attack animation was tried and rejected.** "swinging a held
  weapon in a fast downward arc" gave five near-identical frames and then
  invented a white blade out of nowhere. Skeleton templates move reliably;
  the weapon itself is drawn separately by `Player.equippedIcon` anyway, so the
  body only has to read as striking.
- **There are 8 job slots, and a character create needs the queue EMPTY.**
  Animations report the cap honestly (`need 4 job slots but only 0 available
  (8/8 used)`); a create instead fails *instantly* with "Generation failed due
  to heavy load" whenever anything else is running — even with 2 slots free. It
  isn't billed and it isn't queued, so it just looks like an outage. Create all
  five characters first, one at a time against an idle queue, then batch the
  animations (2 templates x 4 directions fills the queue exactly).
- **Ability theming is deliberate**: each survivor wears its starting ability's
  colour — violet gloam for Gloamstep/Gloamburst, blood-red for the Bloodpact
  shroud — because that accent is what actually reads at 48px, not the trinket.

## Regenerating the manifest

Keys and true dimensions come from the live `TextureManager`, not from parsing
BootScene (many keys are drawn by shared helpers). With `npm run dev` running,
in the browser console:

```js
Object.fromEntries(window.__game.textures.getTextureKeys()
  .filter(k => !/^[0-9a-f]{8}-/.test(k) && !k.startsWith('__'))
  .map(k => { const s = window.__game.textures.get(k).getSourceImage();
              return [k, s.width + 'x' + s.height]; }))
```

Runtime RenderTextures (ground bakes, minimap, tile fills) are filtered out by
the UUID test — those stay procedural and are not art assets.

## Scope

| Category | Count | Animation |
|---|---:|---|
| Icons | 181 | never |
| World props / flora / nodes / structures / crypt tiles | ~134 | never |
| Creatures + player | ~24 | needs frames |
| Elite variants | 14 | derived |
| Map markers | 12 | never |
| FX gradients | 3 | keep procedural |

**~327 of 377 assets never animate**, so static art is not a stopgap for them —
it's the finished product. Only the ~24 creature sprites need an animation rig.

## Current slice: icons (181)

**Authored at 32×32, not 24×24** — PixelLab's minimum object canvas, and the
size the UI is now built around.

Icons are UI art: nothing reads their size for reach or hitboxes, and the one
world-space consumer (`Player.equippedIcon`) normalises to a fixed 24px world
size via `Player.ICON_WORLD_SIZE`, so source resolution can't change how big a
held weapon looks. `applyTextureOverrides` reports `icon_*` resizes as a single
info line rather than one hitbox warning each.

**Every UI surface renders icons at an INTEGER scale — keep it that way.**
Non-integer nearest-neighbour scaling keeps most pixel rows 1:1 and doubles the
occasional one, which reads as distortion rather than magnification; the old
34px box showed 32px art at ×1.06, which was the worst case of exactly that.

| Surface | Box | Scale |
|---|---:|---|
| `InventoryMenu` `ICON_BOX` (`SLOT` 70) | 64 | ×2 |
| `HotbarUI` `ICON_BOX` (`SLOT_SIZE` 70) | 64 | ×2 |
| `CraftingMenu` `LIST_ICON` (`ROW_H` 36) | 32 | ×1 |

`InventoryMenu.SLOT` and `HotbarUI.SLOT_SIZE` **must stay equal** — an item has
to look identical in the backpack and on the hotbar. The inventory grid went
6→7 columns and 15→10 rows alongside the slot bump: the vertical budget is
fixed (the panel must clear the hotbar at y=900), so bigger slots buy fewer
rows, and the extra column claws back the lost capacity.

Four status icons are 22×22 (`icon_status_bleed`, `_noregen`, `_poison`,
`_slow`) — same reasoning applies, author at 32×32.

### PixelLab generation recipe (proven on the first 19)

`create_map_object` — 1 generation each, ~60-90s on a paid tier.

```
width/height 32, view "side", outline "single color outline",
shading "medium shading", detail "medium detail"
description: "<subject with a colour anchor>, pixel art RPG inventory icon,
              single centered object, dark neutral outline, transparent background"
```

The shared suffix is what holds the set together; `dark neutral outline` was
added after the first four came back with per-icon outline hues.

**Operational notes, all learned the hard way:**

- **Max 4 concurrent jobs.** A 5th returns `rate limit exceeded`. This is the
  real throughput ceiling: 181 icons ≈ 45 rounds of 4.
- **Progress % is unreliable.** Jobs sit at `95% eta ~0s` for minutes, or reset
  to 0% with a *growing* ETA, then complete fine. Don't treat a stall as a
  failure and don't re-fire — poll `list_objects`, which shows a completed job
  by dropping its progress column. (Reported upstream via `agent_feedback`.)
- **Download needs no auth**: `https://api.pixellab.ai/mcp/map-objects/<id>/download`
  straight to `art/sprites/<textureKey>.png`.
- **Objects auto-delete after 8 hours** — download in the same session.
- **~85% hit rate.** Budget roughly 1 reroll in 7. Misses are usually the model
  over-decorating: "folded tan leather hide scrap" produced an ornate
  gold-trimmed book cover; "plain untreated ... irregular torn edges,
  undecorated rawhide" fixed it. Steer with *plain/undecorated/torn*.
- **Known-hard prompt: single-bit AXES.** Three attempts all produced either a
  symmetric double-headed hammer or a curved pick — "axe" plus a side view
  reliably drifts that way, and even "asymmetric / one blade on the left only /
  no second head" didn't land it. `icon_stone_axe` ships as the best of three.
  Expect the same fight on the rest of the axe ladder; if it matters, hand-edit
  the PNG rather than spending five generations on it.
- Output is genuinely clean pixel art — hard alpha (zero semi-transparent
  pixels, so no matte halo over the baked ground) and tight palettes (15-48
  colours at 32×32). No post-processing step is needed.

### Tier ladders — silhouettes deliberately DIFFER

The original plan required a tier ladder to read as the same object in different
metals. **the user reversed that** after seeing the real four-metal sword ladder:
independent generation gave four distinct silhouettes and he prefers it — a
higher tier reading as a visibly different weapon is the stronger progression
signal. So every icon is an independent generation; there is no
`create_object_state` variant chaining and no shared-silhouette constraint.

Natural generation batches:

- **Raw materials** — wood, stone, leather, bones, twine, clay, ironbark, mirehide,
  gremlin_skin/leather/guck/blood, cragscale_plate, duskrunner_pelt, sandmaw_chitin,
  blight_gland, gloam_dust, hex_essence, moonsilver
- **Ores & ingots** — sunscorch_ore, ember_ore, bog_ore, sunsteel/embersteel/
  gloamsteel/mirebronze_ingot, gloam_shard, ember_shard, mire_shard
- **Weapons** — stone_axe(+t1), stone_pickaxe(+t1), wood_club, stone_club,
  bone_knife, primal_spear, slingshot, javelin, arrows, gloam_arrows, ember_brand,
  gloam_brand, and the sword/pike/warhammer/warbow ladder across four metals
- **Armor** — gremlin cap/shirt/pants, plus hood/vest/leggings and
  helm/cuirass/greaves across duskhide, emberhide, bogweave, mirehide, sunsteel,
  embersteel, gloamsteel, mirebronze
- **Food** — boar_meat, snake_meat, duskrunner_meat, mirejaw_meat, blackberry,
  cattail, sunfruit, emberbloom, dustbloom, gloamcap, swamp_moss, water_lily,
  shishkabob and the cooked dishes
- **Relics & trophies** — relic_common/uncommon/rare/mythic, the per-species
  trophies, refined + boss refined trophies
- **Jewelry & abilities** — amulets, rings, cloak, the gem set
- **Stations** — workbench(+t1..t4), campfire, drying_rack, smelter(+t1),
  relic_forge, jewelry_station, comfort
- **Status** — bleed, poison, slow, noregen
