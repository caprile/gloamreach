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

Biome by biome: forest → badlands → bayou. All static. Watch `*_picked` /
`*_shielded` state variants — they need art, but only a small delta from the base.

## Phase 4 — player rig: 5 unique survivors + weapon-in-hand

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
- Top-down tileset endpoints (`lower`/`upper`/`transition` descriptions) map neatly
  onto `Biome.forestWeight`/`creekWeight`, but adopting them means moving the ground
  from per-pixel colour blending in `buildBiomeTexture()` to discrete tile stamping.
  Not in scope; noted as a real option.
- `pixelArt: true` is already set, so loaded PNGs stay crisp with no extra work.
