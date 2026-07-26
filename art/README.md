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
anything else. This is not rare — 3 of the 8 attack-FX generations came back
opaque too, and the viewer made every one of them look fine.

There are two repairs, and which one is right depends on the SHAPE:

- **`adjust.mjs --feather 0.5`** fades alpha with *radius*. Right for a round
  ground stain (a soft edge is what a decal wants anyway — a hard-edged blob
  reads as a sticker), wrong for anything that isn't a disc.
- **`dekey.mjs [--tol N]`** removes a flat background by *colour*, flood-filling
  inward from the corners. Right for a crescent, a beam, a wedge — art whose own
  body sits out at large radius and would be eaten by a feather.

Two things `dekey` learned the hard way. It floods from the edges rather than
matching globally, because a global key dissolved a crescent's dark stone bands
(they happened to sit within tolerance of the grey fill). And **tolerance is
per-image**: measure the actual palette before guessing. A grey background at
rgb(72,72,72) sat only ~22 away from the art's own darkest band, so `--tol 40`
leaked straight through it and `--tol 14` was correct.

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
- **A tile that looks perfect may not actually tile — always run
  `art/tools/check-seam.mjs`.** Roughly a THIRD of every batch comes back with a
  mismatched wrap edge, and it is invisible in a viewer showing one copy: the
  first ground grass tile scored **x10.8** and drew a hard horizontal line every
  32px across the whole forest. The tool compares each wrap edge to the tile's
  own interior steps, so it reports a ratio (x1 = seamless, >= x2 = a visible
  grid) rather than an absolute that would depend on how busy the texture is.
- **Repair a marginal wrap with `art/tools/seamless.mjs` instead of re-rolling.**
  It halves the edge difference and fades that correction inward, so only the
  low-frequency drift that IS the seam is removed and the texture's own detail is
  untouched. Repaired tiles score x0.00. Without it the bayou would have shipped
  its third-choice mud — exactly one muck candidate in 32 wrapped cleanly, and
  re-rolling for wrap quality loses the tile you actually wanted.

### Ground tiles (the `ground_*` materials)

The world ground is its own system — see `src/systems/ground.ts` and
`src/ui/GroundDetailUI.ts`. Three things to know before adding to it:

- **Materials, not places.** A tile belongs to a *material* (`grass`,
  `forest_floor`, `creek`, `clay`, `sand`, `rock`, `muck`, `swamp_water`, `peat`,
  `silt`), and `GROUND_VARIANTS` says how many variants each has. Add a variant
  by dropping `art/sprites/ground/ground_<material>_<n>.png` and bumping that
  count; BootScene generates a flat placeholder for every key, so a missing file
  degrades rather than breaks.
- **Tiles are drawn semi-transparently over a colour field**, at the per-material
  opacity in `GROUND_ALPHA`. That is why one clay tile serves the whole badlands
  palette. It also means a tile that is too bright or too saturated washes the
  biome's identity out — `adjust.mjs --mul` is the fix, and the forest water
  needed 0.82.
- **Authored at 32px, stamped at 16px.** The layer carves each tile into quadrant
  frames and stamps those on a finer grid so material boundaries can curve. Art
  must therefore be exactly 32x32; a different size still carves up (the quadrant
  size is read from the real texture) but the quadrants stop lining up with the
  32px block, so same-material neighbours no longer reassemble the source tile.
- **Prompt for the SURFACE, not the scene.** "Shallow creek water over pebbles"
  came back as bare grey gravel with no water in it. Naming the water's own
  features — ripples, caustics, highlights, flowing — is what produced water.
- `*_picked` harvested-flora states and `*_shielded` node states are *state*
  variants — these do need art, but only a small delta from the base.

### Attack FX: the indicator and the attack must not look alike (the user, 2026-07-25)

A player who reads a warning as a hit, or a hit as a warning, dodges the wrong
thing. Colour can't carry that distinction on its own — an attack is drawn in its
element's hue, so a same-hue warning beside it reads as more of the same. Before
this, the Cinderwrought's cone telegraph and its cone impact were literally the
same wedge in the same orange, one brighter.

So the split is STRUCTURAL, roster-wide, and lives in `src/systems/depth.ts`:

- **`TELEGRAPH_DEPTH`** — the indicator draws flat on the ground UNDER every
  entity, outline-led and translucent, never a textured sprite. It is a boundary
  marker, and it is what `Enemy.drawAreaCircle/Wedge/Lane` produce.
- **`ATTACK_FX_DEPTH`** — the attack itself is a real art sprite ABOVE the
  entities, opaque and short-lived.

"Under your feet = it hasn't happened yet; over your head = it's happening"
is learnable in one fight and holds for every enemy and boss.

Both spawners live in `src/art/attackFx.ts` and cover the whole roster, because
every area attack in the game is one of two shapes:

- **`burstFx`** — a radial impact centred on a point (slam, nova, eruption,
  flame circle). Sized so the art's edge IS the damage radius. It takes an
  `overshoot` for art whose rim is wispy spray, but that defaults to **1:1 on
  purpose**: a burst drawn wider than it hits teaches the wrong radius, and the
  player pays for that on the next dodge.
- **`coneFx`** — a directional fan reaching along a locked heading (cone,
  hammer arc, beam, tail sweep). Art is authored **apex-left, pointing +x**; the
  origin is pinned there and `rotation` aims it. Width and height are set
  independently, since a wedge's footprint is range x chord and no single
  generated canvas aspect matches every attack.

Both are **fire-and-forget**: the sprite is not parented to the enemy and its own
tween destroys it, so an enemy that dies or is culled mid-attack cannot strand
it. That is the failure the older held-sprite versions in `Gloamwarden` and
`GremlinKing` need explicit teardown for — prefer these unless the effect must
track something that keeps moving (the Duneshaper's lance sweeps while it fires,
so it is the one exception).

Two sprites deliberately have more than one consumer: `fx_flame_burst` plays for
the Hexling's flame strike and the Duneshaper's sunscorch barrage, and
`fx_sand_spikes` for the Sandmaw's eruption and the Duneshaper's sand spikes.
Two attacks that look like the same event *should* share art; what stays
per-attack is the footprint, and that comes from the caller's own radius.
`fx_mire_splash` goes further and is **tinted crimson** for the Sanguinarch's
blood slam — one impact shape, two very different rooms.

Prompting note: `create_map_object` refuses to draw a **top-down cone of fire**,
and has now failed five distinct ways — "spraying fan from a narrow point" adds a
**torch handle**; "triangular sheet" returns a triangle **tiled with identical
droplets**; the word **"fan"** returns a literal folding hand fan; "spreading
wide from a point" returns a **sunrise poster** with rays; and "dragon's fire
breath" returns a **flaming dragon head on a stick**. Composing the cone offline
from the (good) top-down flame burst also fails — the burst's spiky ring is too
distinctive to tile, so it reads as a cluster of little suns.

So `fx_fire_cone` is the one FX key with **no real art**, and its BootScene
fallback is what ships: a scalloped wedge whose leading edge is cut into flame
tongues. Everything is wired through the normal key, so dropping a
`fx_fire_cone.png` in later needs no code change. Radial top-down fire is fine —
`fx_flame_burst` came out well first try; it is specifically the *directional*
cone the generator won't do.

### `_picked` states: depict what harvesting actually did (the user, 2026-07-25)

There are two kinds of harvest and they must not look alike:

- **You took a part off the plant** (berries, fruit, a bloom): the plant STAYS,
  minus what you took, and may look a little shrivelled. `blackberry_bush`,
  `sunfruit_cactus`, `water_lily` (flower off the pad), `emberbloom` and
  `dustbloom` are all this kind.
- **You took the whole plant** (a mushroom, a mat of moss): nothing is left
  growing. Since these nodes are `persistent` and regrow, the picked state is a
  small **ground disturbance** — soil, snapped stems, a bare patch — not a plant.
  `gloamcap` and `swamp_moss` are this kind.

The failure this rule exists to prevent: `gloamcap_picked` shipped as a single
LARGER purple mushroom, so picking a cluster of mushrooms grew one. Ask what the
player's hands just did before writing the prompt.

Negative prompts do not work here. "a shrub with no flower on it" came back with
a flower; describing only what should be present ("leaves and bare cut stalks")
is what produces the missing-part state.

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

## Animated creatures (`art/creatures/`)

Same strip idea as the player rig, with one simplification: creatures are drawn
facing right and mirrored with `flipX`, so there are no per-direction strips —
one strip per animation is the whole creature.

```
art/creatures/<textureKey>_<anim>_f<frameCount>.png
art/creatures/boar_walk_f6.png
```

`<textureKey>` is the creature's own texture key and can contain underscores
(`gremling_weak`, `gremlin_king`), so the filename is parsed from the RIGHT.
`Enemy` drives it from `preUpdate` off body velocity and the attack state, so
every subclass gets animation without touching its own AI — including the ones
that fully override `update()`. A creature with no strips keeps its static
sprite.

`art/tools/fetch-creature.sh <pixellab-character-id> <textureKey> [move-dir] [idle-dir]`

**Route: `create_character`, NOT objects.** `create_1_direction_object` was
piloted and rejected — 25 generations each, a 64-candidate review step per
creature, and a loose style match even when given the approved art as a style
reference. A character is **1 generation**, needs no review, and quadrupeds have
a real `attack-right` template. Only one direction is generated, so a fully
animated creature costs ~4 generations.

**Direction is per-ANIMATION, not per-creature:**

| | |
|---|---|
| move / attack | `east` — a creature should face where it's going; a front-facing walk cycle moonwalks |
| idle (humanoids) | `south` — a profile hides the ears, face and held item that identify a humanoid. It came out as a generic green man |
| idle (quadrupeds) | `east` — a front-on boar is a blob |

**Template animation sets differ per skeleton — read them per creature** from
`get_character`'s `available_animations`. `bear`/`lion` have real attacks;
`dog` has none (`bark` stands in for a lunge); `cat` has none (`jump` for a
toad's lunge, `angry` for a snarl). Humanoids walk with `walking-6-frames` and
idle with `breathing-idle` / `fight-stance-idle-8-frames`.

**One attack template for every humanoid reads as repetitive.** The first pass
gave every humanoid `cross-punch` (casters `fireball`), which the user called
out immediately: twelve different-looking creatures all threw the same punch.
Attacks are now assigned per creature to match the attack it actually performs
in game, which costs nothing extra — a template animation is **1 generation per
direction**, and only one direction is generated.

| Creature | Template | The attack it's playing |
|---|---|---|
| Gremlin (ranged) | `throw-object` | the rock throw — a real wind-up and release |
| Gremling | `lead-jab` | fast, small claw (3 frames — suits it) |
| Gremlin King | `two-footed-jump` | leaping smash / ground slam |
| Murkling | `cross-punch` | kept — the generic swarm baseline |
| Hexling, Duneshaper | `fireball` | casters |
| Cinderwrought | `pushing` | heaves the cinder cone forward |
| Gloamwarden | `flying-kick` | leaping smash |
| Mosswretch | `surprise-uppercut` | big rising two-arm smash |
| Palewake | `pull-heavy-object` | drags the drain tether in |
| Kilnborn | `hurricane-kick` | a spin — the radial backdraft |
| Mirejaw, Sanguinarch | `jump-attack` | lunging chomp / pounce (quadruped) |
| Boar, Cragscale, Miretyrant | `attack` | quadruped strike / chomp |

**A quadruped skeleton plus a thin description reads as a dog.** The first
Mirejaw was "a gloam-gator" on a quadruped rig and came out a green retriever.
The skeleton controls the pose; only the *description* carries anatomy, so it
has to name the parts that distinguish the animal — for the gator, "huge long
flat toothy snout, body pressed low and flat to the ground on short splayed
legs, very long thick tapering tail, no fur". Same 1 generation, and the second
attempt was unmistakably an alligator.

**Not every creature belongs on the character path.** The humanoid skeleton
always has legs, so the Corpselight — a legless floating swamp-haunt — came out
as a person in a hooded coat. It ships as a **static `create_map_object`**
instead, like the snake and sandmaw: the entity already bobs in code
(`Corpselight.bobPhase` rides rotation), so it reads as hovering with no strips
at all, and a walk cycle on a thing with no legs was always the wrong ask. Ask
"does this creature have the skeleton?" *before* spending a character create.

**Two things that bit, both now handled by the script:** PixelLab appends a
group-id suffix to the folder when a character has two animations of the same
name (`attack-902741fb`), and a re-fetch at a different frame count would leave
two strips claiming one animation, so stale ones are deleted first.

**The static sprite is NOT trimmed** for an animated creature — it's the frame
shown before the first animation starts, and the animation frames are the
character's full canvas. Trimming only the still makes the creature visibly jump
size the moment it moves.

**Elites are free.** `creatureRig` recolours each strip through the same ramp as
the static elites, so an animated creature's elite comes along automatically.

**Shapes that fit no skeleton stay static** (snake, sandmaw, corpselight). That
is a finished state, not a gap: the first two are ambushers whose read is
stillness, and the third is a legless wisp that hovers rather than walks.

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

## Menu chrome (`ui_panel`, `ui_slot`)

The menus are the one surface where a texture swap alone was not enough. Every
panel and slot in `src/ui` is a flat `add.rectangle` that owns its fill, its
alpha, its hit area and — for slots — a **stroke that encodes state** (selected,
filled, rarity). Replacing those rectangles would have meant rewriting the
pointer maths in thirty files.

So `src/ui/frames.ts` adds chrome *beside* them instead. Three rules make it
work, and all three are forced by something concrete:

- **The art is a border with a HOLLOW centre.** A nine-slice stretches its
  centre, and hammered metal stretched across a 700x850 panel looks like a
  rendering bug. Only the border, which is sliced rather than stretched, is art;
  the rectangle's own fill shows through the middle.
- **The frame is drawn OUTSIDE the rectangle** (`BLEED`). The layouts were
  written against a 1px stroke: the inventory's text starts 12px in, and a
  70px slot holds a 64px icon. A border thick enough to read as metal would sit
  on top of both. Growing outward keeps every content box where it already was.
  The bleed is capped at the gap between neighbours (6px between slots) so
  frames meet rather than overlap.
- **State moves from the stroke to a TINT.** Art plus a flat stroke is a double
  border, so `frameRect` clears the stroke and `accent` carries the signal —
  amber for the selected hotbar slot, rarity colour on a relic socket, green on
  a buff.

`bindFrame` is for a panel's long-lived background: the frame follows its
rectangle's position, size and visibility every frame, because the station menus
re-anchor and resize theirs on every open, and a frame left floating over the
world after its menu closed is about as visible as a bug gets. `frameInto` is
for everything rebuilt per render, and pushes into the menu's own cleanup array.

`INSETS` must match the art's real border, and for the panel that means its
**corner plate** (28px), not its edge bar (14px) — a plate reaching past the
slice line gets stretched.

### Generating it

`create_ui_asset` is the tool, and it does not draw a bare frame — asking for
one returns a **whole title-screen mockup**, castle and all. That's fine: the
border is the deliverable and the interior is discarded.

```
create_ui_asset  elements ["panel"], 512x512, no_background
  -> trim.mjs -> hollow.mjs --inset 31 --corner 60 --fade 2 -> scale.mjs --to 185
```

- **`hollow.mjs`** cuts the centre out. `--corner` keeps the thicker riveted
  plates a uniform cut would slice through, and its value is also what the
  nine-slice inset must be.
- **`scale.mjs`** exists because the border's thickness is a hard requirement,
  not a preference — it has to fit inside a 12px content margin. It box-averages
  on the way down: nearest-neighbour drops the one-pixel rivets that are exactly
  what makes a frame read as metal.
- **`split.mjs`** separates a multi-element kit sheet (`elements: ["icon_button",
  "button", "tab"]`) into its pieces by flood fill. One job for a matched set is
  both cheaper and safer than three jobs whose styles can drift — the slot
  socket that shipped came out of the same job as the button and tab.

**A generated slot is far more decorated than a slot should be.** The first
48x48 socket came back with bright violet corner gems; one of those is
attractive, seventy of them tiled across a backpack grid is a mess. The kit's
plain riveted socket, scaled down, was the right answer. Judge a slot asset by
imagining the whole grid, not the single sprite.

## Scope

| Category | Count | Animation |
|---|---:|---|
| Icons | 181 | never |
| World props / flora / nodes / structures / crypt tiles | ~134 | never |
| Creatures + player | ~24 | DONE — see the two rig sections |
| Elite variants | 14 | derived (recoloured from the base, incl. strips) |
| Map markers | 12 | never |
| FX gradients | 3 | keep procedural |

Most assets never animate, so static art is not a stopgap for them — it's the
finished product. The exceptions are the player (`art/rig/`) and the creatures
(`art/creatures/`), both done, plus the ~19 ambient props (flames, crystals,
reeds, banners) that still need regenerating as objects to be animatable.

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
