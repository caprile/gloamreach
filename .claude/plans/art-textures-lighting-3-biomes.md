# Art, textures & lighting for the first 3 biomes

Started 2026-07-25. Replaces the "real pixel-art tilesets" line item in roadmap 8
with an actual phased plan. Tooling: **PixelLab MCP** (registered at project scope
in `.claude.json`; API key needs rotating — it was pasted in plaintext).

## Locked decisions

1. **Lighting = additive coloured lights**, not Phaser Lights2D + normal maps.
   Lights2D would need a normal map for all 377 textures, which PixelLab does not
   generate. Revisit only if additive proves insufficient once real sprites land.
2. **Icons first** (181 of 377 assets). Biggest uniform batch, lowest risk, no rig
   or animation, and it proves the whole pipeline on assets where a bad result
   costs nothing.
3. **Per-asset, reversible migration.** Placeholder generation stays the fallback
   forever; the game is playable at every point. No big-bang cutover.
4. **Animation is a separate, later milestone.** ~327 of 377 assets never animate,
   so static art is the *finished* product for them — not a stopgap.

## Asset scope (measured from the live TextureManager, not by parsing BootScene)

| Category | Count | Animation |
|---|---:|---|
| Icons (177 @ 24×24, 4 @ 22×22) | 181 | never |
| World props / flora / nodes / structures / crypt tiles | ~134 | never |
| Creatures + player | ~24 | needs frames |
| Elite variants | 14 | derived recolour |
| Map markers (18×18) | 12 | never |
| FX gradients | 3 | keep procedural |

The other ~2,197 texture keys are runtime RenderTextures (ground bakes, minimap,
tile fills). Those stay procedural and are not art assets.

## Phase 1 — pipeline + lighting — DONE (2026-07-25)

- **`src/art/overrides.ts`** — drop `art/sprites/<textureKey>.png` and it replaces
  the generated texture of that name with **zero call-site changes**. Discovered
  via Vite `import.meta.glob` at build time, so there's no index to drift.
  `BootScene` gained a `preload()`; overrides apply after `makeTextures()` and
  before MainScene starts. Reports size changes (reach/hitbox math reads sprite
  size) and unmatched keys (misspelled filenames), which would otherwise fail
  silently.
- **Additive coloured lighting** — `NightOverlayUI` gained a second RenderTexture
  rendered with `BlendModes.ADD`. This can't fold into the darkness mask: drawing
  colour into it would occlude the world, since that layer renders normally.
  `ScreenLight.color` is optional — omit it and behaviour is byte-for-byte the old
  pure reveal, which is what discovered crypt *rooms* want.
- `LIGHT_COLOR` in MainScene assigns per-source hues, finally delivering what the
  existing comments already claimed (violet vein, molten forge, bile-green gorge).
- `ADDITIVE_STRENGTH` is **0.15** because additive blending *sums* overlaps and
  light sources cluster (a vein is 9 crystals in one radius). At 0.4 a cluster
  saturated to white and lost its hue entirely.

## Phase 2 — icons (181) — NEXT

1. Normalise the four 22×22 status icons to 24×24 (or match 22×22 in BootScene).
2. Generate in the batches listed in `art/README.md` (raw materials, ores/ingots,
   weapons, armor, food, relics/trophies, jewelry/abilities, stations, status).
3. ~~Keep tier ladders visually consistent — the sword/pike/warhammer/warbow
   ladder across four metals must read as the same object at different tiers.~~
   **REVERSED by the user 2026-07-25, after seeing the real four-metal sword
   ladder.** Generating each tier independently produces four genuinely
   different silhouettes (sunsteel ornate pommel, embersteel wide flared guard,
   gloamsteel thin bare blade, mirebronze small square guard) — and he prefers
   that: *"I like the swords like that — the current sword-ladder looking
   different looks good."* A higher tier reading as a visibly different weapon,
   not a recolour, is the stronger progression signal.

   This is load-bearing for how the phase is built: it means **every icon is an
   independent generation**, with no need for `create_object_state` variant
   chaining off a base object, and no shared-silhouette constraint to police.
   It also relaxes the Phase 4 note that metal tiers are "the same object in
   four metals" — that reasoning was inherited from this now-reversed rule, so
   re-decide it on its own merits when Phase 4 starts (a *held weapon* has
   different constraints from an inventory icon: it must anchor to a hand joint).

## Phase 3 — world props, flora, structures, crypt tiles (~134)

Biome by biome: forest → badlands → bayou. Watch `*_picked` / `*_shielded` state
variants — they need art, but only a small delta from the base.

### Animation scope widened (the user, 2026-07-25)

> "anything that moves or could move should have animations even if ambient
> (i.e. walking, each attack type, campfire fire moving, lights moving etc)"

This **reverses locked decision 4's "~327 of 377 never animate"**. Ambient motion —
firelight, swaying reeds, pulsing crystals, flapping banners — is now in scope, so
"static art is the finished product" only holds for genuinely inert geometry
(rock, bone, plank, wall, fallen log).

**This decides a tool at generation time, not later.** `animate_object` only accepts
objects from `create_1_direction_object` / `create_8_direction_object`; a
`create_map_object` result **cannot be animated** and auto-deletes after 8 hours
(confirmed via `agent_help`). So:

| Asset will ever move? | Generate with |
|---|---|
| No — rock, log, bone, plank, wall, rubble | `create_map_object` (cheap, w/h control) |
| Yes — flame, crystal, reed, banner, fume, water | `create_1_direction_object` (persists, animatable) |

Getting this wrong is not fatal but costs a full regeneration, so classify before
firing a batch. Animation frames themselves stay a later pass — the point now is
only to generate *animatable* source objects for the things that need them.

**Trees are the open call.** Canopy sway is the most visible ambient motion in the
forest, but trees are also the highest-count prop in the world, and 5aq established
that the display list — not game logic — is the frame-rate ceiling. Animating
thousands of them is a perf decision, not an art one. Trees ship static for now;
revisit against a real frame budget.

Animation candidates already identified: `camp_brazier`, `crypt_brazier`,
`icon_campfire` (doubles as the placed texture), `sunken_forge`, `sunken_shrine_lit`,
`shrine_charge`, `gloaming_vein`, `gloam_crystal_cluster`, `geode_*`,
`moonsilver_node`, `gloamcap`, `cattail`, `bayou_reeds`, `water_lily`, `swamp_moss`,
`emberbloom`, `dustbloom`, `miasma_fume`, `gremlin_banner`.

### Sizing — world props may grow; creatures may not

Nothing gameplay-relevant reads a *prop's* sprite size: node, structure and POI
interaction all measure centre-to-centre against a flat `REACH`. Only enemies
(`MainScene.enemyReach`, `Enemy.reachBonus`) and dens (`denReach`) scale with sprite
radius. So props are free to be authored above their 14-30px placeholders, which is
necessary anyway — PixelLab's canvas floor is 32px per side.

`art/tools/trim.mjs` (dependency-free PNG decode/encode via `node:zlib`) crops the
alpha bounding box. Generation pads a wide-and-short prop with transparent rows, and
a sprite's origin is its centre — so untrimmed padding shifts the prop off its own
anchor and makes the hover outline trace the canvas instead of the art.

## Phase 4 — player rig: 5 unique survivors + weapon-in-hand

**Shipped 2026-07-25 (idle + walk).** All five survivors have real art and
4-direction idle/walk animations, loaded through `src/art/playerRig.ts`. See
`art/README.md` for the layout and the generation recipe. What changed against
the plan below:

- **Ability theming (the user, mid-session): each survivor wears its starting
  ability's colour.** Violet gloam for the Gloamstep band (Vagabond wrist,
  Warden gauntlet) and the cracked Gloam focus (Ashcaller orb, Ascetic palms),
  blood-red for the Reaver's Bloodpact shroud. The accent is what reads at 48px
  — the trinket itself is 2-3 pixels.
- **No attack animation.** Both routes were generated and rejected: the `v3`
  custom swing gave five near-identical frames then invented a white blade, and
  the `cross-punch` template re-poses the character into profile with a
  different palette, so it visibly transforms mid-swing. The body now plays a
  squash-and-stretch pulse instead of the placeholder's 25-degree rotate (which
  read as a detailed character toppling over), and the equipped item's existing
  lunge carries the direction. Revisit if a template that preserves the
  rotation pose turns up.
- **Weapon-in-hand sprites are NOT built.** Per-archetype weapon art needs a
  per-frame hand joint to anchor to, and this MCP exposes no
  `animate-with-skeleton`/keypoint output — so the plan's anchor mechanism
  doesn't exist. `Player.equippedIcon` instead sits at a per-facing hand offset
  and draws behind the body when facing away, which is the same read for none
  of the cost.
- **`size: 32` → a 48x48 canvas** (PixelLab pads ~40% for animation headroom),
  against a 20x20 placeholder. Nothing reads the player's sprite size, and the
  physics body is pinned at 18px, so this is purely how big the survivor looks.

**Creatures shipped after it (same day), and animated.** All 14 common creatures
plus all 8 bosses have real art; 20 of 22 are animated (idle/walk/attack) via
`src/art/creatureRig.ts`. The `*_elite` derivation trap is resolved — elites are
recoloured from their base's real pixels at load time (`src/art/eliteVariants.ts`),
including animation strips, so they never need authoring.

**This partly reverses locked decision 4 ("animation is a separate, later
milestone").** the user asked for movement + attack animations on everything, and
the cost turned out to be ~4 generations per creature rather than the ~27 the
object route implied — cheap enough not to defer. See `art/README.md` for the
route comparison and the per-animation direction rule.

Remaining in the arc: ground texturing + biome blending (deliberately last), the
~19 ambient props that need regenerating as objects to animate, art for the
ATTACKS themselves (currently `Graphics` telegraphs, not sprites), and a
stouter/gobliny gremlin — the humanoid rig reads too human and custom
proportions came out worse, so it needs a different approach.

**No longer blocked.** Locked by the user 2026-07-25:

- **Armor does NOT render on the model.** This deletes the layered paper-doll
  problem outright — there is no armor layer, so the `inpaint`-separable-layer
  question is moot and needs no API calls to settle. Armor stays visible only as
  its inventory icon (Phase 2) and its stat lines.
- **The weapon DOES render**, properly scaled and anchored.
- **Each survivor gets unique art and animations** — 5 distinct bodies, not one
  base with palette swaps.

### Volume

| | |
|---|---:|
| 5 survivors × 4 directions × ~13 frames (idle/walk/attack) | ~260 |
| Weapon-in-hand: 10 archetypes × 4 directions | ~40 |
| **Total** | **~300** |

Down roughly 6× from the ~1,800 the layered-armor design implied, with zero
combinatorics.

**Weapons collapse to archetypes, not items.** The roster is ~25 weapons but only
~10 shapes: knife, club, spear, sword, pike, warhammer, warbow, brand, javelin,
slingshot. The sword/pike/warhammer/warbow ladders are *the same object in four
metals*, so metal tiers are recolours — the same "derived variants are free"
principle as the 14 `*_elite` textures. Because armor is invisible, **the weapon is
the only visible signal of gear progression**, so make the metal recolours read
clearly distinct rather than subtle.

**The display mechanism already exists.** `Player.ts` has `equippedIcon` — an Image
offset 16px in the facing direction, tracking facing every frame, with a lunge tween
on swing (`playSwing`). Phase 4 replaces its *art* and anchors it to a per-frame hand
joint; it does not need a new system.

`animate-with-skeleton` takes `skeleton_keypoints`, which makes frame consistency
structural rather than lucky — **and its hand joint IS that anchor**. It also accepts
a forced palette, covering the shared-palette requirement across five bodies.

Sprites are far below every API limit (biggest creature is 68×38; cap is 256×256),
so at 64×64 there's room for 16 frames per animation.

The five identities are already distinct enough to drive distinct silhouettes:
Vagabond (generalist), Reaver (glass-cannon aggressor), Ashcaller (buff-master
caster), Warden (defensive gatherer), Ascetic (bare-handed).

## Phase 5 — ability cast FX (8 families)

Requested alongside Phase 4: visible player effects when an ability fires.

`ABILITY_DEFS` has **8 families** — `blink`, `nova`, `lifelink`, `aegis`,
`gravebind`, `haste`, `lance`, `snare` — dispatched through
`MainScene.castAbility`. Today they reuse the `light_soft` gradient as a generic
glow (e.g. `castNova` adds a `light_soft` image at the cast point), so every
ability reads as roughly the same soft flash regardless of what it does.

This is a separate phase from character art: it's animated FX frames plus code at
existing cast sites, not a rig. Worth deciding per family whether the tell is a
sprite animation, a shader-free additive flash (the new additive light layer is
directly reusable here), or both.

## Notes / follow-ups

- Per-gem crypt doorway colour needs the theme threaded into `cryptLightPoints`
  (currently `{x,y}[]`); it uses a generic gloam violet for now.
- **Ground texturing + biome blending is its own phase, deliberately LAST** (the user,
  2026-07-25: *"something else I want to figure out at some point after all of the
  models and things are done is the background texturing and blending / biome backs"*).
  Props first, ground after — the ground is the one asset every other asset composites
  over, so its palette should be chosen against finished art rather than placeholders.
  It is also the only part of the migration that is **not** per-asset reversible: the
  override layer swaps a texture key, but the ground is *generated*, not a sprite.
  `buildBiomeTexture()` blends per-pixel colour from `Biome.forestWeight`/`creekWeight`
  and `badlandsGroundColorAt`, and `bakeOuterOverlay` stretches one 4096² RenderTexture
  over the whole 28000px world. Two viable routes when it starts:
  - **Tiles** — `create_topdown_tileset`'s `lower`/`upper`/`transition` endpoints map
    cleanly onto the existing weight functions, but adopting them means replacing
    per-pixel blending with discrete tile stamping (a real rewrite of the bake, and
    `feedback_phaser_world_sized_tilesprite_oom` bounds how big any of it can be).
  - **Texture overlay** — keep the current colour blend as the base and multiply a
    tiling detail texture over it, which preserves every existing biome boundary and
    the war-camp/POI floor decals for far less risk.
  Blending between biomes is the harder half: `WorldBiomes.seedCoverage` already gives
  organic blob edges, so the seam work is about making two ground *textures* meet, not
  about the shapes.
- `pixelArt: true` is already set, so loaded PNGs stay crisp with no extra work.
