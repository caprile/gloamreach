import Phaser from "phaser";

// The BootScene runs first. Its only job right now is to generate simple
// placeholder textures in code (so we need zero image files to start), then
// hand off to MainScene. Later we'll swap these for real pixel-art tilesets by
// loading images here instead.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.makeTextures();
    this.scene.start("MainScene");
  }

  private makeTextures(): void {
    const g = this.add.graphics();

    // Grass tile (32x32) with a few lighter specks so the ground isn't flat.
    g.clear();
    g.fillStyle(0x4a7a3a, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x568a44, 1);
    g.fillRect(6, 8, 3, 3);
    g.fillRect(20, 18, 3, 3);
    g.fillRect(24, 5, 2, 2);
    g.generateTexture("grass", 32, 32);

    // Generic ground SPECKLE tile (32x32, mostly transparent) — a few low-alpha
    // dark + light pixels that read as fine grain over ANY ground color. The
    // forest gets its texture from the opaque `grass` tile above; the outer world
    // (badlands/dunes/base) is a single smooth stretched overlay with no detail,
    // so this is tiled crisply (NEAREST) over the whole world via a camera-locked
    // TileSprite in MainScene to give it the same speckled look. Neutral b/w
    // specks so one tile works on dusty clay, sand, and grass alike.
    g.clear();
    const darkSpecks: Array<[number, number, number]> = [
      [3, 5, 2],
      [17, 3, 2],
      [26, 12, 2],
      [9, 20, 3],
      [21, 25, 2],
      [13, 29, 2],
    ];
    for (const [x, y, s] of darkSpecks) {
      g.fillStyle(0x000000, 0.16);
      g.fillRect(x, y, s, s);
    }
    const lightSpecks: Array<[number, number, number]> = [
      [7, 9, 2],
      [24, 6, 2],
      [15, 16, 2],
      [29, 22, 2],
      [4, 27, 2],
    ];
    for (const [x, y, s] of lightSpecks) {
      g.fillStyle(0xffffff, 0.13);
      g.fillRect(x, y, s, s);
    }
    g.generateTexture("ground_speckle", 32, 32);

    // Player (20x20) — a front-facing little adventurer in a blue tunic. The
    // sprite orientation is static (facing is tracked only to offset the equipped
    // item icon), so a symmetric front view reads best. Detailed to the Hexling bar.
    g.clear();
    // legs + boots
    g.fillStyle(0x2c3f5a, 1);
    g.fillRect(6, 14, 3, 4);
    g.fillRect(11, 14, 3, 4);
    g.fillStyle(0x161f2b, 1);
    g.fillRect(5, 17, 4, 3);
    g.fillRect(11, 17, 4, 3);
    // arms
    g.fillStyle(0x2f5a86, 1);
    g.fillRect(3, 9, 2, 6);
    g.fillRect(15, 9, 2, 6);
    // hands
    g.fillStyle(0xd9a066, 1);
    g.fillRect(3, 14, 2, 2);
    g.fillRect(15, 14, 2, 2);
    // tunic
    g.fillStyle(0x3b6ea5, 1);
    g.fillRect(5, 9, 10, 5);
    g.fillStyle(0x2f5a86, 1);
    g.fillRect(5, 12, 10, 2); // shaded underside
    g.fillStyle(0x6fa8dc, 1);
    g.fillRect(9, 9, 2, 3); // center highlight
    // belt + buckle
    g.fillStyle(0x3a2718, 1);
    g.fillRect(5, 13, 10, 1);
    g.fillStyle(0xcaa24a, 1);
    g.fillRect(9, 13, 2, 1);
    // head
    g.fillStyle(0xd9a066, 1);
    g.fillRect(6, 3, 8, 6);
    g.fillStyle(0xc0894f, 1);
    g.fillRect(6, 8, 8, 1); // jaw shadow
    // hair
    g.fillStyle(0x5a3a1c, 1);
    g.fillRect(6, 2, 8, 2);
    g.fillRect(6, 3, 1, 2);
    g.fillRect(13, 3, 1, 2);
    // eyes
    g.fillStyle(0x21303f, 1);
    g.fillRect(8, 5, 1, 2);
    g.fillRect(11, 5, 1, 2);
    g.generateTexture("player", 20, 20);

    // Branch — free WOOD pickup (18x8), a little brown stick.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(0, 2, 18, 4);
    g.fillStyle(0x8f5a2c, 1);
    g.fillRect(2, 3, 14, 2);
    g.generateTexture("branch", 18, 8);

    // Small rock — free STONE pickup (14x10), a gray pebble.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(1, 3, 12, 6);
    g.fillRect(3, 1, 8, 8);
    g.fillStyle(0xa6a6a6, 1);
    g.fillRect(4, 3, 4, 3);
    g.generateTexture("rock", 14, 10);

    // Tree — tool-gated (needs a stone axe). 30x40: trunk + leafy canopy.
    g.clear();
    g.fillStyle(0x5a3a1c, 1);
    g.fillRect(12, 26, 6, 14); // trunk
    g.fillStyle(0x2f6d34, 1);
    g.fillRect(3, 2, 24, 26); // canopy
    g.fillStyle(0x3c8443, 1);
    g.fillRect(7, 6, 8, 8); // highlight
    g.generateTexture("tree", 30, 40);

    // Boulder — tool-gated (needs a stone pickaxe). 30x24 gray mass.
    g.clear();
    g.fillStyle(0x6f6f6f, 1);
    g.fillRect(2, 8, 26, 14);
    g.fillRect(6, 3, 18, 18);
    g.fillStyle(0x878787, 1);
    g.fillRect(8, 7, 8, 6);
    g.generateTexture("boulder", 30, 24);

    // Boar (26x20) — a bristly hog drawn facing RIGHT (head/snout at +x), so the
    // non-rotating flipX facing (Enemy.applyUprightFacing) mirrors it correctly.
    // Bulky body, back bristles, an upward tusk, a beady eye. Elite = crimson/gold
    // recolor of the identical silhouette.
    const drawBoar = (
      key: string,
      body: number,
      belly: number,
      bristle: number,
      snout: number,
      tusk: number,
      eye: number,
    ) => {
      g.clear();
      // legs
      g.fillStyle(0x3a2412, 1);
      g.fillRect(5, 15, 3, 5);
      g.fillRect(10, 16, 3, 4);
      g.fillRect(15, 16, 3, 4);
      g.fillRect(19, 15, 3, 5);
      // tail + body mass + hump
      g.fillStyle(body, 1);
      g.fillRect(2, 8, 2, 4);
      g.fillRect(4, 6, 18, 10);
      g.fillRect(6, 4, 13, 2);
      g.fillRect(18, 6, 6, 9); // head at right
      // belly shadow
      g.fillStyle(belly, 1);
      g.fillRect(4, 13, 18, 3);
      // back highlight + bristle spikes
      g.fillStyle(bristle, 1);
      g.fillRect(6, 4, 13, 1);
      g.fillTriangle(8, 4, 10, 4, 9, 1);
      g.fillTriangle(11, 4, 13, 4, 12, 1);
      g.fillTriangle(14, 4, 16, 4, 15, 1);
      // snout + nostrils
      g.fillStyle(snout, 1);
      g.fillRect(23, 9, 3, 5);
      g.fillStyle(eye, 1);
      g.fillRect(24, 10, 1, 1);
      g.fillRect(24, 12, 1, 1);
      // tusk
      g.fillStyle(tusk, 1);
      g.fillTriangle(21, 14, 23, 14, 22, 10);
      // eye + glint
      g.fillStyle(eye, 1);
      g.fillRect(20, 8, 2, 2);
      g.fillStyle(0xffffff, 0.75);
      g.fillRect(20, 8, 1, 1);
      g.generateTexture(key, 26, 20);
    };
    drawBoar("boar", 0x6b4a2a, 0x4a3018, 0x8a6238, 0x3a2412, 0xece4d0, 0x1a1008);
    drawBoar("boar_elite", 0x6a1f2a, 0x3f1020, 0xf0c040, 0x2a0c14, 0xf7e8b0, 0xf0c040);

    // Snake (20x8) — a low serpent drawn facing RIGHT (head at +x). Scale-pattern
    // flecks, a belly underline, a yellow eye and a flicking forked tongue lift it
    // off the flat bar it used to be. Still low-profile so it reads as "in the
    // grass" under Snake.ts's hidden-alpha fade. Elite = crimson/gold.
    const drawSnake = (
      key: string,
      body: number,
      belly: number,
      scale: number,
      head: number,
      eye: number,
    ) => {
      g.clear();
      // body + slight arch
      g.fillStyle(body, 1);
      g.fillRect(1, 3, 15, 3);
      g.fillRect(3, 2, 11, 1);
      // belly underline
      g.fillStyle(belly, 1);
      g.fillRect(1, 5, 15, 1);
      // scale-pattern flecks
      g.fillStyle(scale, 1);
      g.fillRect(3, 3, 2, 1);
      g.fillRect(7, 3, 2, 1);
      g.fillRect(11, 3, 2, 1);
      // head at right
      g.fillStyle(head, 1);
      g.fillRect(14, 2, 5, 4);
      // eye + pupil
      g.fillStyle(eye, 1);
      g.fillRect(16, 3, 2, 1);
      g.fillStyle(0x1a1008, 1);
      g.fillRect(17, 3, 1, 1);
      // forked tongue
      g.fillStyle(0xd83a3a, 1);
      g.fillRect(19, 3, 1, 1);
      g.generateTexture(key, 20, 8);
    };
    drawSnake("snake", 0x3e6b2f, 0x274a1c, 0x5f8f3e, 0x315a26, 0xe8c83a);
    drawSnake("snake_elite", 0x6a1f2a, 0x3f1020, 0xf0c040, 0x4a1018, 0xf7e8b0);

    // Gremlin (18x22) — the ranged goblin. A front-facing hunched imp: big pointed
    // ears, glowing eyes, snaggle teeth, a pot-belly, clawed hands and a loincloth.
    // Symmetric/front-on so the non-rotating flipX facing just mirrors it. Elite =
    // crimson/gold recolor of the identical silhouette.
    const drawGremlin = (
      key: string,
      skin: number,
      dark: number,
      belly: number,
      earIn: number,
      eye: number,
      loin: number,
    ) => {
      g.clear();
      // legs + feet
      g.fillStyle(dark, 1);
      g.fillRect(4, 17, 3, 5);
      g.fillRect(11, 17, 3, 5);
      g.fillRect(3, 20, 4, 2);
      g.fillRect(11, 20, 4, 2);
      // arms + clawed hands
      g.fillStyle(skin, 1);
      g.fillRect(1, 10, 2, 6);
      g.fillRect(15, 10, 2, 6);
      g.fillStyle(dark, 1);
      g.fillRect(0, 15, 3, 2);
      g.fillRect(15, 15, 3, 2);
      // torso + belly
      g.fillStyle(skin, 1);
      g.fillRect(4, 9, 10, 9);
      g.fillStyle(belly, 1);
      g.fillRect(6, 11, 6, 5);
      // loincloth
      g.fillStyle(loin, 1);
      g.fillRect(4, 16, 10, 2);
      // head
      g.fillStyle(skin, 1);
      g.fillRect(4, 1, 10, 8);
      // ears
      g.fillTriangle(4, 2, 4, 7, 0, 3);
      g.fillTriangle(14, 2, 14, 7, 18, 3);
      g.fillStyle(earIn, 1);
      g.fillTriangle(4, 3, 4, 6, 1, 3);
      g.fillTriangle(14, 3, 14, 6, 17, 3);
      // brow shadow
      g.fillStyle(dark, 1);
      g.fillRect(4, 1, 10, 2);
      // eyes + pupils
      g.fillStyle(eye, 1);
      g.fillRect(6, 4, 2, 2);
      g.fillRect(10, 4, 2, 2);
      g.fillStyle(0x1a1008, 1);
      g.fillRect(7, 5, 1, 1);
      g.fillRect(11, 5, 1, 1);
      // mouth + snaggle teeth
      g.fillStyle(0x24160c, 1);
      g.fillRect(6, 7, 6, 1);
      g.fillStyle(0xece4d0, 1);
      g.fillRect(7, 7, 1, 1);
      g.fillRect(10, 7, 1, 1);
      g.generateTexture(key, 18, 22);
    };
    drawGremlin("gremlin", 0x5a7a3a, 0x3f5a28, 0x8ab05a, 0x486a2e, 0xf0d020, 0x6b4a26);
    drawGremlin("gremlin_elite", 0x6a1f3a, 0x3f1030, 0xb0405a, 0x8a2f4a, 0xf0c040, 0x2a0c14);

    // Gremling (14x16) — the weaker melee goblin. The same imp language, smaller
    // and simpler (no loincloth, tighter body) so it reads as the lesser threat.
    const drawGremling = (
      key: string,
      skin: number,
      dark: number,
      belly: number,
      eye: number,
    ) => {
      g.clear();
      // legs
      g.fillStyle(dark, 1);
      g.fillRect(3, 12, 3, 4);
      g.fillRect(8, 12, 3, 4);
      // arms + claws
      g.fillStyle(skin, 1);
      g.fillRect(0, 8, 2, 4);
      g.fillRect(12, 8, 2, 4);
      g.fillStyle(dark, 1);
      g.fillRect(0, 11, 2, 2);
      g.fillRect(12, 11, 2, 2);
      // torso + belly
      g.fillStyle(skin, 1);
      g.fillRect(3, 7, 8, 6);
      g.fillStyle(belly, 1);
      g.fillRect(5, 9, 4, 3);
      // head
      g.fillStyle(skin, 1);
      g.fillRect(3, 1, 8, 6);
      // ears
      g.fillTriangle(3, 2, 3, 5, 0, 2);
      g.fillTriangle(11, 2, 11, 5, 14, 2);
      // brow
      g.fillStyle(dark, 1);
      g.fillRect(3, 1, 8, 2);
      // eyes
      g.fillStyle(eye, 1);
      g.fillRect(4, 3, 2, 2);
      g.fillRect(8, 3, 2, 2);
      // teeth
      g.fillStyle(0xece4d0, 1);
      g.fillRect(5, 6, 1, 1);
      g.fillRect(8, 6, 1, 1);
      g.generateTexture(key, 14, 16);
    };
    drawGremling("gremling_weak", 0x4a5a3a, 0x33421f, 0x6a8a4a, 0xf0d020);
    drawGremling("gremling_elite", 0x5a1830, 0x33101f, 0x9a3048, 0xf0c040);

    // Gremlin's thrown rock — tiny gray projectile.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture("gremlin_rock", 6, 6);

    // Cattail — creek-edge harvestable. 14x28: slim green reed + a brown
    // seed-head near the top, reads as a waterside plant.
    g.clear();
    g.fillStyle(0x4f8a3a, 1);
    g.fillRect(6, 4, 3, 24); // stalk
    g.fillStyle(0x3c6d2c, 1);
    g.fillRect(3, 12, 3, 12); // leaf blade
    g.fillStyle(0x6b3f1f, 1);
    g.fillRect(5, 4, 5, 9); // seed head
    g.generateTexture("cattail", 14, 28);

    // Blackberry bush — forest harvestable. 24x20: leafy green mound dotted
    // with dark purple berries.
    g.clear();
    g.fillStyle(0x2f5d2c, 1);
    g.fillRect(2, 6, 20, 14);
    g.fillRect(5, 3, 14, 6);
    g.fillStyle(0x3a1a4a, 1);
    g.fillRect(6, 10, 3, 3);
    g.fillRect(13, 8, 3, 3);
    g.fillRect(16, 13, 3, 3);
    g.fillRect(9, 14, 3, 3);
    g.generateTexture("blackberry_bush", 24, 20);

    // Picked blackberry bush (Milestone N) — same leafy mound, no berries, so
    // a harvested bush still reads as a bush rather than vanishing.
    g.clear();
    g.fillStyle(0x2f5d2c, 1);
    g.fillRect(2, 6, 20, 14);
    g.fillRect(5, 3, 14, 6);
    g.generateTexture("blackberry_bush_picked", 24, 20);

    // Drying Rack — processing station. 30x34: two upright posts with three
    // horizontal cross-rails, a simple wooden drying frame.
    g.clear();
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(3, 2, 4, 32); // left post
    g.fillRect(23, 2, 4, 32); // right post
    g.fillStyle(0x855f31, 1);
    g.fillRect(3, 6, 24, 3); // top rail
    g.fillRect(3, 16, 24, 3); // mid rail
    g.fillRect(3, 26, 24, 3); // bottom rail
    g.generateTexture("drying_rack", 30, 34);

    // Gremlin Shack — a crude lean-to POI structure, 48x40: dark plank walls,
    // a lighter doorway gap, and a scrap-wood roof overhang. Biggest world
    // object yet (prior largest was tree at 30x40) so it reads as a
    // structure, not a prop. Non-interactive backdrop — see gremlin_shack_chest.
    g.clear();
    g.fillStyle(0x4a3a24, 1);
    g.fillRect(2, 14, 44, 24); // wall
    g.fillStyle(0x3a2c1a, 1);
    g.fillRect(18, 20, 12, 18); // doorway gap (darker interior)
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(0, 4, 48, 12); // roof overhang
    g.fillStyle(0x855f31, 1);
    g.fillRect(0, 4, 48, 3); // roof highlight ridge
    g.generateTexture("gremlin_shack", 48, 40);

    // Gremlin Shack's lootable chest — a small wooden barrel, 16x14. Sits
    // near the shack's doorway; this (not the shack backdrop) is the
    // interactable.
    g.clear();
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(1, 2, 14, 11);
    g.fillStyle(0x4a3018, 1);
    g.fillRect(1, 5, 14, 2); // band
    g.fillRect(1, 9, 14, 2); // band
    g.generateTexture("gremlin_shack_chest", 16, 14);

    // Boss Altar — a stone ring with a central fire-pit brazier, 64x56. Not
    // player-placeable; world-gen-placed like the shack. Visually distinct
    // from every other structure so it reads as a landmark from a distance.
    g.clear();
    g.fillStyle(0x5a5a5a, 1);
    g.fillRect(4, 30, 56, 20); // stone base ring
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(20, 24, 24, 20); // pit recess
    g.fillStyle(0xe8862c, 1);
    g.fillTriangle(26, 24, 38, 24, 32, 4); // flame
    g.fillStyle(0xf0c040, 1);
    g.fillTriangle(28, 24, 36, 24, 32, 10); // flame highlight
    g.generateTexture("boss_altar", 64, 56);

    // Duneshaper's Altar (badlands final boss) — a weathered sandstone ring with
    // a gloam-violet flame, distinct from the gremlin altar's orange fire so it
    // reads as its own landmark out in the dunes. 64x56.
    g.clear();
    g.fillStyle(0x9a7a4a, 1);
    g.fillRect(4, 30, 56, 20); // sandstone base ring
    g.fillStyle(0x6a5230, 1);
    g.fillRect(20, 24, 24, 20); // pit recess
    g.fillStyle(0x8a4ad0, 1);
    g.fillTriangle(26, 24, 38, 24, 32, 4); // gloamfire
    g.fillStyle(0xc79cf0, 1);
    g.fillTriangle(28, 24, 36, 24, 32, 10); // flame highlight
    g.fillStyle(0x2a1a3a, 1);
    g.fillRect(10, 44, 4, 6); // carved runestones flanking the ring
    g.fillRect(50, 44, 4, 6);
    g.generateTexture("tyrant_altar", 64, 56);

    // Gremlin camp clutter — small decorative prop scattered near the altar
    // as an escalating environmental hint (purely visual, no physics/
    // interaction). 16x16: a crude bone/rock cairn.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(4, 8, 8, 6);
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(2, 10, 3, 3);
    g.fillRect(11, 9, 3, 3);
    g.generateTexture("gremlin_camp_prop", 16, 16);

    // Gremlin War Camp props (M-WC) — all non-interactive decoration around the
    // Boss Altar, promoting it from a lone structure into a walled camp.
    // Palisade stake, 12x26: a pointed wooden picket. Tiled into a ring = wall.
    g.clear();
    g.fillStyle(0x4a3620, 1);
    g.fillRect(3, 6, 6, 20); // shaft
    g.fillStyle(0x63492b, 1);
    g.fillRect(3, 6, 2, 20); // lit edge
    g.fillTriangle(3, 6, 9, 6, 6, 0); // sharpened point
    g.generateTexture("palisade_stake", 12, 26);

    // Gremlin war banner, 16x30: a pole flying a crimson/green war-cloth in the
    // elite palette so the camp reads as elite-held territory.
    g.clear();
    g.fillStyle(0x3a2c1a, 1);
    g.fillRect(2, 0, 2, 30); // pole
    g.fillStyle(0x9c2f2f, 1);
    g.fillRect(4, 2, 11, 14); // crimson cloth
    g.fillStyle(0xd8b23a, 1);
    g.fillRect(4, 8, 11, 2); // gold band
    g.fillStyle(0x2f3f1f, 1);
    g.fillTriangle(4, 16, 15, 16, 9, 21); // green tattered hem
    g.generateTexture("gremlin_banner", 16, 30);

    // Camp totem, 18x38: a stacked bone/skull pole — a camp centerpiece prop.
    g.clear();
    g.fillStyle(0x4a3620, 1);
    g.fillRect(7, 4, 4, 34); // post
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(3, 4, 12, 8); // top skull
    g.fillRect(4, 16, 10, 7); // mid skull
    g.fillStyle(0x2f2318, 1);
    g.fillRect(5, 7, 2, 2); // eye
    g.fillRect(11, 7, 2, 2); // eye
    g.fillRect(6, 18, 2, 2);
    g.fillRect(10, 18, 2, 2);
    g.generateTexture("war_totem", 18, 38);

    // Camp brazier, 14x22: a post with a lit flame bowl — doubles as the night
    // light source (its world position feeds collectLights()). Flame matches the
    // Boss Altar's orange (0xe8862c) so the camp reads as one lit place.
    g.clear();
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(5, 10, 4, 12); // post
    g.fillStyle(0x5a5a5a, 1);
    g.fillRect(2, 8, 10, 4); // bowl
    g.fillStyle(0xe8862c, 1);
    g.fillTriangle(4, 8, 10, 8, 7, 0); // flame
    g.fillStyle(0xf0c040, 1);
    g.fillTriangle(5, 8, 9, 8, 7, 3); // flame highlight
    g.generateTexture("camp_brazier", 14, 22);

    // Gremlin King (40x48 before BOSS_SCALE) — a hulking ogre-gremlin: a broad
    // muscled torso, huge fists, a bone crown, glowing eyes and upward tusks, so
    // it reads as a boss at a glance, not just a big regular gremlin. Same
    // green-gremlin palette family as the roster ("gremlin, but massive").
    g.clear();
    // legs + feet claws
    g.fillStyle(0x354a22, 1);
    g.fillRect(8, 38, 9, 10);
    g.fillRect(23, 38, 9, 10);
    g.fillStyle(0x22140a, 1);
    g.fillRect(6, 46, 11, 2);
    g.fillRect(23, 46, 11, 2);
    // arms
    g.fillStyle(0x4f6a34, 1);
    g.fillRect(0, 16, 8, 20);
    g.fillRect(32, 16, 8, 20);
    // fists + knuckle claws
    g.fillStyle(0x354a22, 1);
    g.fillRect(0, 32, 9, 7);
    g.fillRect(31, 32, 9, 7);
    g.fillStyle(0x22140a, 1);
    g.fillRect(0, 32, 9, 1);
    g.fillRect(31, 32, 9, 1);
    // torso
    g.fillStyle(0x4f6a34, 1);
    g.fillRect(6, 16, 28, 24);
    g.fillStyle(0x6f8f42, 1);
    g.fillRect(7, 16, 26, 2); // shoulder highlight
    g.fillStyle(0x86a854, 1);
    g.fillRect(11, 22, 18, 13); // chest/belly
    // loincloth
    g.fillStyle(0x5a3a1c, 1);
    g.fillRect(9, 36, 22, 5);
    g.fillStyle(0x3a2510, 1);
    g.fillRect(9, 36, 22, 1);
    // head + brow ridge
    g.fillStyle(0x4f6a34, 1);
    g.fillRect(9, 3, 22, 15);
    g.fillStyle(0x354a22, 1);
    g.fillRect(9, 3, 22, 5);
    // bone crown
    g.fillStyle(0xd8cbb0, 1);
    g.fillTriangle(11, 4, 16, 4, 13, 0);
    g.fillTriangle(18, 4, 23, 4, 20, 0);
    g.fillTriangle(25, 4, 30, 4, 27, 0);
    // eyes (glowing) + pupils
    g.fillStyle(0xf0d020, 1);
    g.fillRect(13, 8, 4, 3);
    g.fillRect(23, 8, 4, 3);
    g.fillStyle(0x1a1008, 1);
    g.fillRect(14, 9, 2, 2);
    g.fillRect(24, 9, 2, 2);
    // snarl + tusks
    g.fillStyle(0x1e2a12, 1);
    g.fillRect(13, 14, 14, 3);
    g.fillStyle(0xece4d0, 1);
    g.fillTriangle(13, 17, 16, 17, 14, 11); // left tusk (up)
    g.fillTriangle(24, 17, 27, 17, 26, 11); // right tusk (up)
    g.fillRect(16, 14, 2, 2);
    g.fillRect(22, 14, 2, 2);
    g.generateTexture("gremlin_king", 40, 48);

    // Gloaming Vein (mineable rarity-ore POI). Two states: SHIELDED (inert,
    // un-mineable until the guardian dies — a dull husk with a faint crystal
    // core sealed under a grey shell) and CRACKED (open/mineable — bright
    // amethyst spires jutting up). 28x30 crystalline rock jutting from a base.
    g.clear();
    g.fillStyle(0x4a4652, 1);
    g.fillRect(3, 18, 22, 10); // grey stone husk base
    g.fillStyle(0x5a5566, 1);
    g.fillRect(6, 6, 16, 16); // sealed shell
    g.fillStyle(0x6a5a86, 1);
    g.fillTriangle(14, 8, 9, 20, 19, 20); // dim crystal core showing through
    g.generateTexture("gloaming_vein_shielded", 28, 30);

    g.clear();
    g.fillStyle(0x3a3444, 1);
    g.fillRect(3, 20, 22, 8); // rocky base
    g.fillStyle(0x7a3ec8, 1);
    g.fillTriangle(9, 24, 4, 24, 7, 4); // left spire
    g.fillTriangle(20, 24, 25, 24, 22, 7); // right spire
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(15, 26, 9, 26, 13, 0); // tall center spire
    g.fillStyle(0xc79cf0, 1);
    g.fillTriangle(13, 12, 11, 20, 14, 20); // center highlight
    g.generateTexture("gloaming_vein", 28, 30);

    // Gloam crystal cluster — decorative amethyst formation scattered around
    // the vein clearing (non-interactive dressing, like the war-camp props).
    // 16x22: a small jagged crystal outcrop.
    g.clear();
    g.fillStyle(0x3a2b52, 1);
    g.fillRect(3, 16, 10, 6); // dark base
    g.fillStyle(0x7a3ec8, 1);
    g.fillTriangle(4, 18, 1, 18, 3, 6); // left shard
    g.fillTriangle(12, 18, 15, 18, 13, 8); // right shard
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(9, 20, 4, 20, 7, 0); // center shard
    g.fillStyle(0xc79cf0, 1);
    g.fillRect(6, 8, 2, 10); // bright vein
    g.generateTexture("gloam_crystal_cluster", 16, 22);

    // Gloamwarden (34x42 before GLOAMWARDEN_SCALE) — the vein's guardian mini-boss,
    // an amethyst-mutated gremlin brute: a dark-violet body with jagged crystal
    // growths on the shoulders/head, crystalline fists, a glowing chest core and
    // eyes. Reads as "gremlin, but warped." Difficulty sits between an elite and
    // the King.
    g.clear();
    // legs
    g.fillStyle(0x281c3a, 1);
    g.fillRect(7, 34, 8, 8);
    g.fillRect(19, 34, 8, 8);
    // arms
    g.fillStyle(0x3a2b52, 1);
    g.fillRect(0, 14, 7, 18);
    g.fillRect(27, 14, 7, 18);
    // crystal fists
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(0, 31, 7, 31, 3, 37);
    g.fillTriangle(27, 31, 34, 31, 31, 37);
    // torso + head
    g.fillStyle(0x3a2b52, 1);
    g.fillRect(5, 13, 24, 23);
    g.fillRect(9, 1, 16, 13);
    // brow shadow
    g.fillStyle(0x281c3a, 1);
    g.fillRect(9, 1, 16, 4);
    // shoulder crystals + head crystal crown
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(1, 19, 6, 9, 8, 21);
    g.fillTriangle(33, 19, 28, 9, 26, 21);
    g.fillStyle(0xc79cf0, 1);
    g.fillTriangle(11, 3, 15, 3, 13, 0);
    g.fillTriangle(19, 3, 23, 3, 21, 0);
    // glowing chest core
    g.fillStyle(0xc79cf0, 1);
    g.fillRect(12, 17, 10, 10);
    g.fillStyle(0xe8d0ff, 1);
    g.fillRect(14, 19, 6, 6);
    // eyes
    g.fillStyle(0xe8d0ff, 1);
    g.fillRect(11, 6, 4, 3);
    g.fillRect(19, 6, 4, 3);
    g.fillStyle(0x3a1a5a, 1);
    g.fillRect(12, 7, 2, 2);
    g.fillRect(20, 7, 2, 2);
    g.generateTexture("gloamwarden", 34, 42);

    // Cinderwrought (34x42 before CINDERWROUGHT_SCALE) — the Sunken Forge's
    // guardian mini-boss (biome 2 Phase 3 POI 2): a molten-slag brute, a charred
    // black-iron body seamed with glowing lava cracks, ember eyes, and a heavy
    // forge-hammer fist. Warm fire palette, contrasting the Gloamwarden's violet.
    g.clear();
    // legs
    g.fillStyle(0x201410, 1);
    g.fillRect(7, 34, 8, 8);
    g.fillRect(19, 34, 8, 8);
    // arms
    g.fillStyle(0x2e1c16, 1);
    g.fillRect(0, 14, 7, 18);
    g.fillRect(27, 14, 7, 18);
    // forge-hammer fists (glowing slag)
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(0, 30, 8, 8);
    g.fillRect(26, 30, 8, 8);
    // torso + head (charred iron)
    g.fillStyle(0x2e1c16, 1);
    g.fillRect(5, 13, 24, 23);
    g.fillRect(9, 1, 16, 13);
    // brow shadow
    g.fillStyle(0x1a0f0a, 1);
    g.fillRect(9, 1, 16, 4);
    // molten cracks seaming the crust
    g.fillStyle(0xff5a1a, 1);
    g.fillRect(11, 15, 2, 18);
    g.fillRect(17, 14, 2, 20);
    g.fillRect(22, 17, 2, 14);
    g.fillRect(6, 20, 3, 2);
    g.fillRect(25, 24, 3, 2);
    // glowing forge core in the chest
    g.fillStyle(0xff8a3a, 1);
    g.fillRect(12, 18, 10, 10);
    g.fillStyle(0xffe08a, 1);
    g.fillRect(14, 20, 6, 6);
    // ember eyes
    g.fillStyle(0xffd060, 1);
    g.fillRect(11, 6, 4, 3);
    g.fillRect(19, 6, 4, 3);
    g.fillStyle(0xff5a1a, 1);
    g.fillRect(12, 7, 2, 2);
    g.fillRect(20, 7, 2, 2);
    g.generateTexture("cinderwrought", 34, 42);

    // The Duneshaper (44x54) — the badlands FINAL BOSS: a tall gloam-warped
    // sorcerer in a tattered violet robe over sand-scoured wrappings, wielding a
    // crooked staff crowned with a gloam-crystal, glowing eyes. Drawn upright
    // facing RIGHT (staff arm at +x), non-rotating (upright:true). Purple-gloam +
    // desert palette so it's unmistakably the badlands' apex, not a big Hexling.
    g.clear();
    // robe body (flared)
    g.fillStyle(0x3a2456, 1);
    g.fillTriangle(8, 52, 36, 52, 22, 18);
    g.fillRect(13, 20, 18, 30);
    // robe shading + gloam trim
    g.fillStyle(0x27183a, 1);
    g.fillRect(13, 20, 5, 30);
    g.fillStyle(0x7a3ec8, 1);
    g.fillRect(20, 24, 4, 26); // central gloam seam
    g.fillRect(10, 46, 24, 3); // hem band
    // sand-wrapped cowl + shoulders
    g.fillStyle(0x8a6a3e, 1);
    g.fillRect(12, 12, 20, 10);
    // head (shadowed hood)
    g.fillStyle(0x1c1230, 1);
    g.fillRect(16, 2, 12, 14);
    g.fillStyle(0x2a1a44, 1);
    g.fillRect(15, 6, 14, 4); // hood brim
    // glowing eyes
    g.fillStyle(0xd0a0ff, 1);
    g.fillRect(18, 8, 3, 2);
    g.fillRect(24, 8, 3, 2);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(19, 8, 1, 1);
    g.fillRect(25, 8, 1, 1);
    // staff (right/+x side) + gloam crystal crown
    g.fillStyle(0x5a3c22, 1);
    g.fillRect(35, 6, 3, 44);
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(33, 8, 40, 8, 36, -2);
    g.fillStyle(0xe0c0ff, 1);
    g.fillCircle(36, 5, 3);
    // trailing sand/ember motes at the hem
    g.fillStyle(0xe0a860, 0.9);
    g.fillRect(6, 50, 3, 3);
    g.fillRect(34, 50, 3, 3);
    g.generateTexture("duneshaper", 44, 54);

    // Sunken Forge (48x38) — the POI's ruined smithy centerpiece: a cracked
    // stone forge base with a molten crucible glowing at its heart and a broken
    // anvil beside it. Non-interactive world dressing (the Cinderwrought is the
    // interactable threat, not the structure).
    g.clear();
    g.fillStyle(0x3a3038, 1);
    g.fillRect(4, 20, 30, 18); // forge stone base
    g.fillStyle(0x4a3f48, 1);
    g.fillRect(6, 16, 26, 8); // upper stonework
    g.fillStyle(0x1c1418, 1);
    g.fillRect(10, 18, 18, 12); // hearth mouth (dark)
    g.fillStyle(0xff6a1a, 0.9);
    g.fillEllipse(19, 26, 14, 8); // molten crucible glow
    g.fillStyle(0xffd060, 1);
    g.fillEllipse(19, 26, 7, 4); // white-hot core
    g.fillStyle(0x2a2228, 1);
    g.fillRect(36, 26, 10, 6); // anvil body
    g.fillRect(38, 22, 8, 5); // anvil face
    g.fillStyle(0x1c161a, 1);
    g.fillRect(44, 27, 3, 5); // anvil horn shadow
    g.fillStyle(0xff8a3a, 1);
    g.fillRect(15, 6, 2, 10); // ember plume rising from the hearth
    g.fillStyle(0xffb060, 0.8);
    g.fillRect(21, 4, 2, 12);
    g.generateTexture("sunken_forge", 48, 38);

    // Slag chunk (16x14) — decorative cooled-lava rubble scattered around the
    // forge clearing (like the vein's crystal clusters), a few with ember veins.
    g.clear();
    g.fillStyle(0x241a18, 1);
    g.fillRect(2, 6, 12, 8); // charred rock
    g.fillRect(4, 3, 8, 5);
    g.fillStyle(0x3a2a24, 1);
    g.fillRect(4, 5, 6, 4); // lighter face
    g.fillStyle(0xff6a1a, 1);
    g.fillRect(6, 8, 4, 2); // ember vein
    g.fillRect(3, 10, 2, 2);
    g.generateTexture("slag_chunk", 16, 14);

    // Phase 1 (terrain-that-matters) — badlands macro-zone props. Deliberately
    // COOL GREY stone so it pops hard against the warm red-brown badlands ground
    // (the user: the old warm-brown rock was "hard to distinguish").
    // Rock wall (40x30): a chunky grey stone block the player/enemies collide with.
    g.clear();
    g.fillStyle(0x24272c, 1);
    g.fillRect(2, 9, 36, 21); // base shadow mass
    g.fillStyle(0x484d55, 1);
    g.fillRect(2, 4, 34, 22); // main face
    g.fillStyle(0x6d747f, 1);
    g.fillRect(4, 4, 15, 10); // lit upper-left block
    g.fillRect(22, 9, 12, 9); // lit right block
    g.fillStyle(0x878f9b, 1);
    g.fillRect(5, 5, 7, 5); // highlight
    g.fillStyle(0x191b1f, 1);
    g.fillRect(18, 6, 3, 22); // crack seam
    g.fillRect(6, 20, 26, 3); // ledge shadow
    g.generateTexture("badlands_rockwall", 40, 30);

    // Mesa spire (26x46): a tall grey layered rock stack — vertical cover.
    g.clear();
    g.fillStyle(0x24272c, 1);
    g.fillRect(4, 7, 18, 39); // body shadow
    g.fillStyle(0x484d55, 1);
    g.fillRect(5, 4, 15, 40); // main face
    g.fillStyle(0x6d747f, 1);
    g.fillRect(6, 6, 9, 8); // top lit band
    g.fillStyle(0x878f9b, 1);
    g.fillRect(7, 7, 5, 4); // highlight
    g.fillStyle(0x33373d, 1);
    g.fillRect(5, 18, 15, 3); // strata line
    g.fillRect(5, 31, 15, 3); // strata line
    g.fillStyle(0x191b1f, 1);
    g.fillRect(13, 4, 3, 40); // vertical shadow seam
    g.generateTexture("badlands_mesa_spire", 26, 46);

    // Bramble (24x18): dense thorny scrub — a NON-solid tile that slows the player.
    // Dark tangled thicket with red berries + pale thorns so a thornfield reads as
    // a distinct dark patch against the pale ground (the user: much bolder + dense).
    g.clear();
    g.fillStyle(0x1f2915, 1);
    g.fillRect(2, 8, 20, 10); // dark mound base
    g.fillStyle(0x33461f, 1);
    g.fillRect(4, 5, 16, 9); // tangle
    g.fillStyle(0x46612a, 1);
    g.fillRect(6, 6, 5, 4);
    g.fillRect(13, 7, 5, 4);
    g.fillStyle(0x8a1f2e, 1); // red berries
    g.fillRect(8, 10, 2, 2);
    g.fillRect(14, 9, 2, 2);
    g.fillRect(11, 13, 2, 2);
    g.fillStyle(0xc7c39a, 1); // pale thorn spikes
    g.fillRect(3, 2, 1, 5);
    g.fillRect(10, 1, 1, 6);
    g.fillRect(17, 2, 1, 5);
    g.fillRect(21, 5, 1, 4);
    g.generateTexture("bramble", 24, 18);

    // (Macro-zone ground decals are drawn per-zone at runtime as wobbly Graphics
    // blobs in MainScene.drawZoneFloor — they follow each zone's organic outline, so
    // there's no pre-baked circular texture for them.)

    // --- POI floor decals (soft radial circles) + ring markers ---
    // A distinct floor + a ring of props around every POI so each reads as a
    // deliberate, bounded place from a distance (the user). Floors are stretched
    // via setDisplaySize, so a modest 160px soft-radial texture is plenty.
    const poiFloor = (key: string, base: number, core?: number) => {
      g.clear();
      const S = 160;
      const c = S / 2;
      const rings = 12;
      for (let i = rings; i >= 1; i--) {
        g.fillStyle(base, 0.05);
        g.fillCircle(c, c, c * (i / rings));
      }
      if (core !== undefined) {
        for (let i = 5; i >= 1; i--) {
          g.fillStyle(core, 0.06);
          g.fillCircle(c, c, c * 0.42 * (i / 5));
        }
      }
      g.generateTexture(key, S, S);
    };
    poiFloor("poi_floor_forge", 0x2a1c16, 0x5a2410); // scorched earth, ember core
    poiFloor("poi_floor_den", 0x5a4326); // packed sandy dirt
    poiFloor("poi_floor_tyrant", 0x241a34, 0x4a2f6e); // gloam-blighted violet, amethyst core
    poiFloor("poi_floor_vein", 0x241a34, 0x4a2f6e); // matches the vein's baked-floor palette

    // Forge ring marker (14x22) — a stubby ember-veined slag pillar.
    g.clear();
    g.fillStyle(0x241a18, 1);
    g.fillRect(3, 6, 8, 16);
    g.fillStyle(0x3a2a24, 1);
    g.fillRect(4, 4, 6, 5);
    g.fillStyle(0xff6a1a, 1);
    g.fillRect(5, 12, 4, 2);
    g.fillRect(6, 16, 3, 2);
    g.generateTexture("poi_ring_forge", 14, 24);

    // Den ring marker (14x20) — a bone-and-dirt cairn stake.
    g.clear();
    g.fillStyle(0x5a4326, 1);
    g.fillRect(4, 10, 6, 10);
    g.fillStyle(0xd8cba0, 1); // pale bone shard jammed on top
    g.fillRect(5, 3, 4, 9);
    g.fillRect(3, 5, 8, 3);
    g.generateTexture("poi_ring_den", 14, 22);

    // Tyrant-altar ring marker (14x28) — a jagged gloam standing stone.
    g.clear();
    g.fillStyle(0x2a2030, 1);
    g.fillTriangle(2, 28, 12, 28, 7, 2);
    g.fillStyle(0x3a2a4a, 1);
    g.fillTriangle(4, 28, 8, 28, 7, 6);
    g.fillStyle(0x9a5ee8, 0.9); // gloam-violet vein
    g.fillRect(6, 10, 2, 12);
    g.generateTexture("poi_ring_tyrant", 14, 30);

    // Ember-ore node (26x28) — shielded (dark, capped) then cracked-open
    // (glowing metal veins exposed), mirroring the Gloaming Vein pair.
    g.clear();
    g.fillStyle(0x2c2420, 1);
    g.fillRect(3, 10, 20, 18); // dark rock body
    g.fillRect(6, 6, 14, 8);
    g.fillStyle(0x453a32, 1);
    g.fillRect(5, 12, 10, 6); // stone facets
    g.fillStyle(0x1a1512, 1);
    g.fillRect(9, 3, 8, 6); // capped/shielded shell
    g.generateTexture("ember_ore_shielded", 26, 30);
    g.clear();
    g.fillStyle(0x2c2420, 1);
    g.fillRect(3, 10, 20, 18);
    g.fillRect(6, 6, 14, 8);
    g.fillStyle(0x5a3a2a, 1);
    g.fillRect(5, 12, 12, 8);
    g.fillStyle(0xff7a2a, 1); // exposed molten-metal veins
    g.fillRect(7, 14, 3, 6);
    g.fillRect(12, 12, 3, 8);
    g.fillRect(16, 15, 2, 5);
    g.fillStyle(0xffd070, 1);
    g.fillRect(8, 16, 1, 3);
    g.fillRect(13, 14, 1, 4);
    g.generateTexture("ember_ore_node", 26, 30);

    // Clay deposit (biome 2 Phase 4) — a low mound of red-brown clay.
    g.clear();
    g.fillStyle(0x8a4f2e, 1);
    g.fillEllipse(13, 20, 22, 12);
    g.fillStyle(0xa4623a, 1);
    g.fillEllipse(13, 16, 18, 12);
    g.fillStyle(0xbd7a4c, 1);
    g.fillEllipse(10, 13, 8, 5);
    g.fillStyle(0x6f3d22, 1);
    g.fillRect(15, 15, 3, 4); // cracked seam
    g.generateTexture("clay_deposit", 26, 28);

    // Sunscorch Ore node (biome 2 Phase 4) — grey rock studded with warm ore flecks.
    g.clear();
    g.fillStyle(0x5a534a, 1);
    g.fillRect(3, 10, 20, 16);
    g.fillRect(6, 6, 14, 8);
    g.fillStyle(0x726960, 1);
    g.fillRect(6, 12, 11, 7);
    g.fillStyle(0xe0982c, 1); // ore flecks
    g.fillRect(8, 13, 3, 3);
    g.fillRect(14, 11, 3, 3);
    g.fillRect(12, 18, 2, 2);
    g.fillStyle(0xffc860, 1);
    g.fillRect(9, 14, 1, 1);
    g.fillRect(15, 12, 1, 1);
    g.generateTexture("sunscorch_ore_node", 26, 30);

    // --- Badlands gatherable nodes (every biome needs wood + stone) ---
    // Dead tree — chop for WOOD (any axe). 30x40: bare grey-brown trunk with a
    // few dry limbs, no green canopy (sun-killed).
    g.clear();
    g.fillStyle(0x6b4a30, 1);
    g.fillRect(13, 16, 5, 24); // trunk
    g.fillStyle(0x7c5a3c, 1);
    g.fillRect(6, 20, 8, 3); // left limb
    g.fillRect(17, 12, 8, 3); // right limb
    g.fillRect(11, 8, 3, 10); // upper trunk
    g.fillStyle(0x8a7a44, 1);
    g.fillRect(4, 18, 4, 2); // dry twig ends
    g.fillRect(23, 10, 4, 2);
    g.generateTexture("badlands_deadtree", 30, 40);

    // Ironbark tree — chop for IRONBARK (needs an upgraded/Ironshod axe). 32x46,
    // visibly bigger/tougher: near-black rust trunk with grey iron-bark streaks
    // and a sparse dark canopy tinged rust-red.
    g.clear();
    g.fillStyle(0x3a2418, 1);
    g.fillRect(13, 22, 7, 24); // thick dark trunk
    g.fillStyle(0x6a6258, 1);
    g.fillRect(14, 24, 2, 20); // iron-bark streak
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(6, 20, 9, 4); // gnarled left limb
    g.fillRect(18, 16, 9, 4); // right limb
    g.fillStyle(0x3f4a28, 1);
    g.fillRect(4, 4, 24, 18); // dark canopy
    g.fillStyle(0x5a3a24, 1);
    g.fillRect(8, 7, 7, 6); // rust-red foliage clump
    g.fillRect(18, 9, 6, 5);
    g.generateTexture("ironbark_tree", 32, 46);

    // Badlands boulder — mine for STONE (needs a pickaxe). 30x26 layered red mesa rock.
    g.clear();
    g.fillStyle(0x5f3826, 1);
    g.fillRect(2, 12, 26, 14);
    g.fillRect(6, 6, 18, 18);
    g.fillStyle(0x7a4a2e, 1);
    g.fillRect(4, 14, 22, 5); // strata band
    g.fillStyle(0x8a5a38, 1);
    g.fillRect(8, 8, 12, 5);
    g.fillStyle(0xa4623a, 1);
    g.fillRect(10, 9, 5, 3); // highlight
    g.generateTexture("badlands_boulder", 30, 26);

    // Badlands dry branch — free WOOD pickup (18x8), a pale sun-bleached stick.
    g.clear();
    g.fillStyle(0x9a7a4a, 1);
    g.fillRect(0, 2, 18, 4);
    g.fillStyle(0xb69c66, 1);
    g.fillRect(2, 3, 14, 2);
    g.generateTexture("badlands_branch", 18, 8);

    // Badlands scrap rock — free STONE pickup (14x10), a rusty red pebble.
    g.clear();
    g.fillStyle(0x7a4a2e, 1);
    g.fillRect(1, 3, 12, 6);
    g.fillRect(3, 1, 8, 8);
    g.fillStyle(0x9a5a38, 1);
    g.fillRect(4, 3, 4, 3);
    g.generateTexture("badlands_scraprock", 14, 10);

    this.makeDecorProps(g);
    this.makeItemIcons(g);

    g.destroy(); // we only needed it to bake textures
  }

  // Purely-decorative, non-interactive scatter props for both biomes (the user:
  // "for both biomes add a bunch of decorative textures so it is more
  // immersive"). Scattered by MainScene.scatterDecor; Y-sorted like any world
  // object. Placeholder art, like everything else — real tilesets swap in later.
  private makeDecorProps(g: Phaser.GameObjects.Graphics): void {
    // --- Forest decor ---
    // Fern cluster (18x16) — a low spray of green fronds.
    g.clear();
    g.fillStyle(0x2f5a2a, 1);
    for (let i = 0; i < 5; i++) {
      const fx = 3 + i * 3;
      g.fillTriangle(fx, 15, fx + 3, 15, fx + 1, 2 + (i % 2) * 3);
    }
    g.fillStyle(0x3f7a3a, 1);
    for (let i = 0; i < 4; i++) {
      const fx = 5 + i * 3;
      g.fillTriangle(fx, 15, fx + 2, 15, fx + 1, 5);
    }
    g.generateTexture("decor_fern", 18, 16);

    // Wildflowers (16x14) — a tuft of grass with colored blossoms.
    g.clear();
    g.fillStyle(0x3f7a3a, 1);
    g.fillRect(3, 8, 2, 6);
    g.fillRect(7, 6, 2, 8);
    g.fillRect(11, 8, 2, 6);
    g.fillStyle(0xe8d24a, 1);
    g.fillCircle(4, 7, 2.2);
    g.fillStyle(0xe86a9a, 1);
    g.fillCircle(8, 5, 2.4);
    g.fillStyle(0x6aa8e8, 1);
    g.fillCircle(12, 7, 2.2);
    g.generateTexture("decor_flowers", 16, 14);

    // Mushroom cluster (16x14) — red-capped toadstools.
    g.clear();
    g.fillStyle(0xe8e0d0, 1);
    g.fillRect(4, 8, 2, 5);
    g.fillRect(9, 7, 3, 6);
    g.fillStyle(0xc0402a, 1);
    g.fillEllipse(5, 7, 6, 4);
    g.fillEllipse(10, 6, 8, 5);
    g.fillStyle(0xf0e0d0, 1);
    g.fillCircle(4, 6, 1);
    g.fillCircle(11, 5, 1.2);
    g.generateTexture("decor_mushrooms", 16, 14);

    // Mossy log (28x14) — a fallen log, drawn as a plain cylinder with a cut
    // end cap at EACH end (symmetric rings, no single off-center dark blob) so
    // it reads unambiguously as timber, not a creature with an eye (playtest:
    // the old asymmetric dark circle at one end read as a face).
    g.clear();
    g.fillStyle(0x5a3f28, 1);
    g.fillRect(3, 6, 22, 8);
    g.fillStyle(0x6a4a30, 1);
    g.fillRect(3, 6, 22, 2); // highlight along the top edge
    g.fillStyle(0x3f6a34, 1);
    g.fillRect(9, 5, 6, 3); // single centered moss patch
    // End-cap rings — same treatment on both ends, tree-ring concentric ellipses.
    g.fillStyle(0x4a3020, 1);
    g.fillEllipse(3, 10, 5, 8);
    g.fillEllipse(25, 10, 5, 8);
    g.fillStyle(0x6a4a30, 1);
    g.fillEllipse(3, 10, 3, 5.5);
    g.fillEllipse(25, 10, 3, 5.5);
    g.generateTexture("decor_log", 28, 16);

    // --- Badlands decor ---
    // Bleached skull (16x14) — a sun-bleached animal skull.
    g.clear();
    g.fillStyle(0xd8cba8, 1);
    g.fillEllipse(8, 8, 12, 9);
    g.fillRect(6, 11, 4, 3); // snout
    g.fillStyle(0x2a2018, 1);
    g.fillCircle(5, 7, 1.6); // eye sockets
    g.fillCircle(11, 7, 1.6);
    g.fillStyle(0xb0a180, 1);
    g.fillTriangle(1, 3, 4, 7, 1, 8); // horns
    g.fillTriangle(15, 3, 12, 7, 15, 8);
    g.generateTexture("decor_skull", 16, 14);

    // Dead bush (18x18) — a dry tangled shrub.
    g.clear();
    g.fillStyle(0x6a5236, 1);
    for (let i = 0; i < 7; i++) {
      const bx = 3 + i * 2;
      g.fillTriangle(9, 17, bx, 4 + (i % 3) * 3, bx + 2, 17);
    }
    g.fillStyle(0x836540, 1);
    g.fillRect(8, 12, 2, 5);
    g.generateTexture("decor_deadbush", 18, 18);

    // Red mesa boulder (22x18) — a layered red-rock boulder.
    g.clear();
    g.fillStyle(0x8a4a34, 1);
    g.fillRect(2, 8, 18, 10);
    g.fillEllipse(11, 8, 18, 8);
    g.fillStyle(0x9c5a40, 1);
    g.fillRect(4, 6, 14, 3);
    g.fillStyle(0x6a3626, 1);
    g.fillRect(2, 13, 18, 2); // strata line
    g.generateTexture("decor_mesarock", 22, 18);

    // Bone pile (18x12) — sun-bleached ribs/bones on the ground.
    g.clear();
    g.fillStyle(0xd8cba8, 1);
    g.fillRect(2, 6, 12, 2);
    g.fillRect(4, 9, 11, 2);
    g.fillRect(6, 3, 9, 2);
    g.fillStyle(0xb0a180, 1);
    g.fillCircle(2, 7, 1.6);
    g.fillCircle(14, 4, 1.6);
    g.fillCircle(15, 10, 1.6);
    g.generateTexture("decor_bones", 18, 12);
  }

  // Small 24x24 inventory/hotbar icons for craftable outputs. Distinct enough
  // to tell apart at a glance; real pixel art swaps in later.
  private makeItemIcons(g: Phaser.GameObjects.Graphics): void {
    const ICON = 24;

    // Wood: a few stacked brown planks.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(3, 6, 18, 4);
    g.fillRect(3, 12, 18, 4);
    g.fillStyle(0x8f5a2c, 1);
    g.fillRect(5, 7, 14, 1);
    g.fillRect(5, 13, 14, 1);
    g.generateTexture("icon_wood", ICON, ICON);

    // Stone: a gray pebble cluster.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(4, 10, 16, 8);
    g.fillRect(7, 6, 10, 10);
    g.fillStyle(0xa6a6a6, 1);
    g.fillRect(9, 8, 5, 4);
    g.generateTexture("icon_stone", ICON, ICON);

    // Leather: a tan hide square.
    g.clear();
    g.fillStyle(0x9c6b3f, 1);
    g.fillRect(4, 5, 16, 14);
    g.fillStyle(0xb98a5a, 1);
    g.fillRect(7, 8, 10, 8);
    g.generateTexture("icon_leather", ICON, ICON);

    // Stone Axe: brown handle, gray head top-right.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(10, 6, 4, 16); // handle
    g.fillStyle(0x9a9a9a, 1);
    g.fillRect(12, 4, 9, 7); // head
    g.generateTexture("icon_stone_axe", ICON, ICON);

    // Ironshod Woodcutter's Axe (stone_axe tier 1): the upgraded look — a bigger
    // sunsteel head with a bright bevel edge, and gold ingot bands on the haft,
    // so an upgraded axe reads distinctly in the hotbar/on the player (the user:
    // "axe upgrade needs to change art"). Base texture key + "_t1" per the
    // tieredToolTexture convention.
    g.clear();
    g.fillStyle(0x6a3f1d, 1);
    g.fillRect(10, 5, 4, 17); // darker haft
    g.fillStyle(0xd8a838, 1); // gold ingot bands
    g.fillRect(9, 9, 6, 2);
    g.fillRect(9, 15, 6, 2);
    g.fillStyle(0x8f8f96, 1); // steel head body
    g.fillRect(11, 3, 11, 9);
    g.fillStyle(0xe6e2d0, 1); // bright bevel edge
    g.fillRect(19, 3, 3, 9);
    g.generateTexture("icon_stone_axe_t1", ICON, ICON);

    // Stone Pickaxe: brown handle, gray double-pointed head.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(11, 6, 3, 16);
    g.fillStyle(0x9a9a9a, 1);
    g.fillRect(4, 5, 17, 3); // crossbar
    g.fillTriangle(2, 6, 6, 6, 4, 9);
    g.fillTriangle(19, 6, 23, 6, 21, 9);
    g.generateTexture("icon_stone_pickaxe", ICON, ICON);

    // Torch: brown handle, orange flame.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(10, 10, 4, 12);
    g.fillStyle(0xe08a2c, 1);
    g.fillTriangle(7, 10, 17, 10, 12, 2);
    g.fillStyle(0xf0c040, 1);
    g.fillTriangle(9, 10, 15, 10, 12, 5);
    g.generateTexture("icon_torch", ICON, ICON);

    // Wood Club: solid brown bat.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(9, 12, 6, 10); // grip
    g.fillStyle(0x8f5a2c, 1);
    g.fillRect(7, 2, 10, 12); // bulb
    g.generateTexture("icon_wood_club", ICON, ICON);

    // Stone Club: brown grip, big gray stone head.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(10, 12, 4, 10);
    g.fillStyle(0x8f8f8f, 1);
    g.fillRect(5, 2, 14, 12);
    g.fillStyle(0xa6a6a6, 1);
    g.fillRect(7, 4, 5, 4);
    g.generateTexture("icon_stone_club", ICON, ICON);

    // Bone Knife: pale bone blade, small dark grip.
    g.clear();
    g.fillStyle(0x5a4632, 1);
    g.fillRect(9, 14, 5, 7); // grip
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(11, 14, 15, 14, 20, 3);
    g.generateTexture("icon_bone_knife", ICON, ICON);

    // Primal Spear: long wood shaft, pale bone tip.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(10, 8, 3, 14);
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(8, 8, 14, 8, 11, 1);
    g.generateTexture("icon_primal_spear", ICON, ICON);

    // Slingshot: Y-shaped wood fork with a taut band.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(10, 12, 4, 10); // handle
    g.fillRect(6, 4, 3, 10); // left fork
    g.fillRect(15, 4, 3, 10); // right fork
    g.fillStyle(0xc9c2a8, 1);
    g.fillRect(8, 8, 8, 2); // band
    g.generateTexture("icon_slingshot", ICON, ICON);

    // Javelin: drawn DIAGONALLY (bottom-left -> top-right) so it reads clearly
    // apart from the vertical Primal Spear icon at a glance — a thrown weapon,
    // not a thrusting one.
    g.clear();
    g.lineStyle(2, 0x7a4a22, 1);
    g.beginPath();
    g.moveTo(4, 20);
    g.lineTo(18, 6);
    g.strokePath();
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(15, 3, 22, 4, 18, 10); // bone tip at the top-right point
    g.generateTexture("icon_javelin", ICON, ICON);

    // Slingshot Pellets: a small pile of round gray stones.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillCircle(8, 15, 4);
    g.fillCircle(15, 15, 4);
    g.fillCircle(11, 9, 4);
    g.generateTexture("icon_slingshot_pellets", ICON, ICON);

    // In-flight pellet projectile — tiny gray dot.
    g.clear();
    g.fillStyle(0x8a8a8a, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture("pellet_projectile", 6, 6);

    // In-flight javelin projectile — a short brown-and-bone streak (rotation
    // applied per-shot via setRotation, same as every other Projectile).
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(3, 4, 2, 12);
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(1, 4, 7, 4, 4, 0);
    g.generateTexture("javelin_projectile", 8, 16);

    // Arrows (ammo item) — a small bundle of steel-tipped, fletched arrows.
    g.clear();
    for (const ax of [7, 12, 17]) {
      g.fillStyle(0x6b4a26, 1);
      g.fillRect(ax, 6, 1, 14); // shaft
      g.fillStyle(0xc0c6ce, 1);
      g.fillTriangle(ax - 1, 6, ax + 2, 6, ax + 0.5, 2); // steel head
      g.fillStyle(0xcfc8b0, 1);
      g.fillRect(ax - 1, 18, 3, 2); // fletching
    }
    g.generateTexture("icon_arrows", ICON, ICON);

    // In-flight arrow projectile — drawn pointing +x (rotation applied per-shot,
    // so no artAngleOffset needed, unlike the upward-drawn javelin).
    g.clear();
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(0, 2, 12, 2); // shaft
    g.fillStyle(0xc0c6ce, 1);
    g.fillTriangle(12, 0, 12, 6, 16, 3); // steel head, pointing right
    g.generateTexture("arrow_projectile", 16, 6);

    // Shishkabob: just a bare wooden skewer with a sharpened tip — no food
    // chunks. Playtest feedback: the old red+green-chunk version already
    // looked "full of stuff" before anything was cooked on it; chunks belong
    // on the COOKED dishes below, not the raw skewer itself.
    g.clear();
    g.fillStyle(0xa9793f, 1);
    g.fillRect(2, 12, 15, 3); // shaft
    g.fillTriangle(17, 12, 17, 15, 22, 13.5); // sharpened tip
    g.generateTexture("icon_shishkabob", ICON, ICON);

    // Cooked Boar Meat: a skewer with browned, roasted meat chunks (darker,
    // charred tones vs. the raw boar_meat / uncooked shishkabob reds).
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x6e3b1f, 1);
    g.fillRect(6, 7, 6, 6);
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0x8a4e2a, 1);
    g.fillRect(7, 8, 3, 3);
    g.fillRect(14, 8, 2, 3);
    g.generateTexture("icon_cooked_boar_meat", ICON, ICON);

    // Bramble-Glazed Boar Skewer: roasted meat skewer with a purple berry glaze.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x6e3b1f, 1);
    g.fillRect(6, 7, 6, 6);
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0x5a2f6a, 1); // blackberry-jam glaze
    g.fillRect(6, 6, 12, 2);
    g.fillStyle(0x7a3f8a, 1);
    g.fillRect(8, 9, 2, 2);
    g.fillRect(14, 10, 2, 2);
    g.generateTexture("icon_bramble_boar_skewer", ICON, ICON);

    // Cooked Snake Meat: a skewer with roasted, pale-pink coiled meat.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x9a5a4a, 1);
    g.fillRect(6, 7, 6, 6);
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0xc07f6a, 1);
    g.fillRect(7, 8, 3, 3);
    g.fillRect(14, 8, 2, 3);
    g.generateTexture("icon_cooked_snake_meat", ICON, ICON);

    // Blood-Glazed Snake Skewer: roasted snake with a dark-red gremlin-blood glaze.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x9a5a4a, 1);
    g.fillRect(6, 7, 6, 6);
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0x6e141c, 1); // gremlin-blood glaze
    g.fillRect(6, 6, 12, 2);
    g.fillStyle(0x9a2230, 1);
    g.fillRect(8, 9, 2, 2);
    g.fillRect(14, 10, 2, 2);
    g.generateTexture("icon_blood_snake_skewer", ICON, ICON);

    // Duskrunner Skewer: plain fire-roasted badlands meat on a skewer (no glaze).
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x7a3a24, 1); // dusky roasted meat
    g.fillRect(6, 7, 6, 6);
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0x9a5236, 1); // seared highlights
    g.fillRect(7, 8, 3, 3);
    g.fillRect(14, 8, 2, 3);
    g.generateTexture("icon_duskrunner_skewer", ICON, ICON);

    // --- Lvl 3/4 campfire dishes (badlands) ---

    // Seared Duskrunner Steak: a thick browned steak with a pale dustbloom crust.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 12, 18, 2); // skewer
    g.fillStyle(0x5a2f1a, 1);
    g.fillRect(5, 6, 14, 8); // steak
    g.fillStyle(0x7a4326, 1);
    g.fillRect(7, 8, 9, 4);
    g.fillStyle(0xd8cfa8, 1); // dustbloom crust flecks
    g.fillRect(6, 6, 2, 2);
    g.fillRect(14, 7, 2, 2);
    g.fillRect(10, 12, 2, 2);
    g.generateTexture("icon_seared_duskrunner_steak", ICON, ICON);

    // Emberbloom Broth: a dark bowl of glowing amber broth (no skewer — a soup).
    g.clear();
    g.fillStyle(0x3a2a20, 1);
    g.fillRect(4, 12, 16, 7); // bowl
    g.fillRect(6, 19, 12, 2);
    g.fillStyle(0xe08a2c, 1); // ember broth
    g.fillRect(6, 10, 12, 4);
    g.fillStyle(0xf0c040, 1); // glow highlight
    g.fillRect(8, 10, 4, 2);
    g.fillRect(13, 11, 2, 2);
    g.generateTexture("icon_emberbloom_broth", ICON, ICON);

    // Sunfruit-Glazed Ribs: roasted rib rack with a bright orange sunfruit glaze.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 12, 18, 2); // skewer
    g.fillStyle(0x6e3b1f, 1);
    g.fillRect(5, 7, 14, 6); // rib meat
    g.fillStyle(0xf0902c, 1); // sunfruit glaze
    g.fillRect(5, 6, 14, 2);
    g.fillStyle(0xffc25a, 1);
    g.fillRect(7, 9, 2, 2);
    g.fillRect(13, 10, 2, 2);
    g.generateTexture("icon_sunfruit_glazed_ribs", ICON, ICON);

    // Sunscorch Feast: a loaded platter — seared meat, violet gloamcap, sunfruit.
    g.clear();
    g.fillStyle(0x8a7a52, 1);
    g.fillRect(3, 15, 18, 4); // platter
    g.fillStyle(0x5a2f1a, 1); // meat
    g.fillRect(4, 8, 8, 7);
    g.fillStyle(0x7a4326, 1);
    g.fillRect(6, 10, 4, 3);
    g.fillStyle(0x6a4a8a, 1); // gloamcap
    g.fillRect(13, 7, 6, 5);
    g.fillStyle(0x9a7ac0, 1);
    g.fillRect(14, 8, 2, 2);
    g.fillStyle(0xf0902c, 1); // sunfruit wedge
    g.fillRect(14, 12, 5, 3);
    g.generateTexture("icon_sunscorch_feast", ICON, ICON);

    // Ember-Glazed Skewer: two-tone (badlands + forest) meat with an ember glaze.
    g.clear();
    g.fillStyle(0xc0a060, 1);
    g.fillRect(3, 11, 18, 2); // skewer
    g.fillStyle(0x5a2f1a, 1); // badlands meat chunk
    g.fillRect(6, 7, 6, 6);
    g.fillStyle(0x8a4e2a, 1); // forest meat chunk
    g.fillRect(13, 7, 5, 6);
    g.fillStyle(0xe0662c, 1); // ember glaze
    g.fillRect(6, 6, 12, 2);
    g.fillStyle(0xffa050, 1);
    g.fillRect(8, 9, 2, 2);
    g.fillRect(14, 10, 2, 2);
    g.generateTexture("icon_emberglazed_skewer", ICON, ICON);

    // Campfire: stacked logs + flame.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(4, 16, 16, 4);
    g.fillRect(6, 19, 12, 3);
    g.fillStyle(0xe08a2c, 1);
    g.fillTriangle(7, 16, 17, 16, 12, 4);
    g.fillStyle(0xf0c040, 1);
    g.fillTriangle(9, 16, 15, 16, 12, 8);
    g.generateTexture("icon_campfire", ICON, ICON);

    // Boar Meat: a raw-meat chunk (reuses the shishkabob's red tones).
    g.clear();
    g.fillStyle(0xb0452c, 1);
    g.fillRect(5, 6, 14, 12);
    g.fillStyle(0xd06a4a, 1);
    g.fillRect(7, 8, 8, 6);
    g.generateTexture("icon_boar_meat", ICON, ICON);

    // Snake Meat: a raw pale-pink fillet with a faint green tinge (vs boar's red).
    g.clear();
    g.fillStyle(0x9a6a5a, 1);
    g.fillRect(5, 7, 14, 10);
    g.fillStyle(0xc48f7a, 1);
    g.fillRect(7, 9, 8, 5);
    g.fillStyle(0x5a7a3e, 1);
    g.fillRect(5, 7, 14, 2); // greenish skin edge
    g.generateTexture("icon_snake_meat", ICON, ICON);

    // Duskrunner Meat: a lean, dusty raw cut — darker/ruddier than boar, with a
    // sandy-brown edge to read as "badlands game meat."
    g.clear();
    g.fillStyle(0x8a3a2a, 1);
    g.fillRect(5, 7, 14, 10);
    g.fillStyle(0xba5a3a, 1);
    g.fillRect(7, 9, 8, 5);
    g.fillStyle(0x8a6a44, 1);
    g.fillRect(5, 7, 14, 2); // sandy skin edge
    g.generateTexture("icon_duskrunner_meat", ICON, ICON);

    // Bones: two crossed off-white bone shapes.
    g.clear();
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(3, 10, 18, 4);
    g.fillCircle(4, 10, 2.5);
    g.fillCircle(4, 14, 2.5);
    g.fillCircle(20, 10, 2.5);
    g.fillCircle(20, 14, 2.5);
    g.generateTexture("icon_bones", ICON, ICON);

    // Gremlin Blood: a small dark-red droplet.
    g.clear();
    g.fillStyle(0x8a1f2a, 1);
    g.fillTriangle(12, 3, 6, 15, 18, 15);
    g.fillRect(6, 12, 12, 8);
    g.fillStyle(0xb04050, 1);
    g.fillRect(9, 14, 5, 4);
    g.generateTexture("icon_gremlin_blood", ICON, ICON);

    // Gremlin Guck: a thick, dark rendered-down blob (dried gremlin blood).
    g.clear();
    g.fillStyle(0x4a1018, 1);
    g.fillCircle(12, 13, 9);
    g.fillStyle(0x6e1a24, 1);
    g.fillCircle(9, 10, 4);
    g.generateTexture("icon_gremlin_guck", ICON, ICON);

    // Gremlin Skin: a mottled greenish hide square.
    g.clear();
    g.fillStyle(0x4a5a2e, 1);
    g.fillRect(4, 5, 16, 14);
    g.fillStyle(0x6a8a3e, 1);
    g.fillRect(7, 8, 10, 8);
    g.generateTexture("icon_gremlin_skin", ICON, ICON);

    // Workbench: a brown tabletop with four legs.
    g.clear();
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(2, 6, 20, 4);
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(3, 10, 3, 10);
    g.fillRect(18, 10, 3, 10);
    g.generateTexture("icon_workbench", ICON, ICON);

    // Bedroll: a rolled blue-grey cushion with a tan reed-stuffing stripe.
    g.clear();
    g.fillStyle(0x3d5a78, 1);
    g.fillRoundedRect(2, 8, 20, 10, 3);
    g.fillStyle(0xc9a05a, 1);
    g.fillRect(3, 11, 18, 3);
    g.fillStyle(0x2b415a, 1);
    g.fillCircle(4, 13, 3);
    g.generateTexture("icon_comfort", ICON, ICON);

    // Cattail: a slim reed with a brown seed head.
    g.clear();
    g.fillStyle(0x4f8a3a, 1);
    g.fillRect(11, 4, 3, 18);
    g.fillStyle(0x3c6d2c, 1);
    g.fillRect(7, 10, 3, 10);
    g.fillStyle(0x6b3f1f, 1);
    g.fillRect(10, 4, 5, 8);
    g.generateTexture("icon_cattail", ICON, ICON);

    // Blackberries: a cluster of dark purple berries.
    g.clear();
    g.fillStyle(0x3a1a4a, 1);
    g.fillRect(6, 8, 6, 6);
    g.fillRect(12, 10, 6, 6);
    g.fillRect(9, 13, 6, 6);
    g.fillStyle(0x5a2f6a, 1);
    g.fillRect(7, 9, 2, 2);
    g.fillRect(13, 11, 2, 2);
    g.generateTexture("icon_blackberry", ICON, ICON);

    // Twine: a coil of tan cord.
    g.clear();
    g.fillStyle(0xc9a86a, 1);
    g.fillRect(4, 8, 16, 8);
    g.fillStyle(0x9c7d44, 1);
    g.fillRect(6, 10, 3, 4);
    g.fillRect(11, 10, 3, 4);
    g.fillRect(16, 10, 2, 4);
    g.generateTexture("icon_twine", ICON, ICON);

    // Gremlin Leather: a cured greenish-tan hide (darker/refined vs. raw skin).
    g.clear();
    g.fillStyle(0x6a6a3a, 1);
    g.fillRect(4, 5, 16, 14);
    g.fillStyle(0x8a8a52, 1);
    g.fillRect(7, 8, 10, 8);
    g.generateTexture("icon_gremlin_leather", ICON, ICON);

    // Drying Rack: a small wooden frame (matches the world sprite).
    g.clear();
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(4, 3, 3, 18);
    g.fillRect(17, 3, 3, 18);
    g.fillStyle(0x855f31, 1);
    g.fillRect(4, 6, 16, 2);
    g.fillRect(4, 12, 16, 2);
    g.fillRect(4, 18, 16, 2);
    g.generateTexture("icon_drying_rack", ICON, ICON);

    // Gremlin Cap: a rounded hood in cured-leather tones.
    g.clear();
    g.fillStyle(0x6a6a3a, 1);
    g.fillRect(5, 8, 14, 10);
    g.fillCircle(12, 8, 7);
    g.fillStyle(0x8a8a52, 1);
    g.fillRect(4, 15, 16, 3); // brim
    g.generateTexture("icon_gremlin_cap", ICON, ICON);

    // Gremlin Shirt: a chest-piece silhouette in cured-leather tones.
    g.clear();
    g.fillStyle(0x6a6a3a, 1);
    g.fillRect(5, 5, 14, 15);
    g.fillStyle(0x53532c, 1);
    g.fillRect(2, 5, 4, 7); // left shoulder
    g.fillRect(18, 5, 4, 7); // right shoulder
    g.fillStyle(0x8a8a52, 1);
    g.fillRect(10, 8, 4, 9); // center seam
    g.generateTexture("icon_gremlin_shirt", ICON, ICON);

    // Gremlin Pants: two leg wraps in cured-leather tones.
    g.clear();
    g.fillStyle(0x53532c, 1);
    g.fillRect(6, 4, 12, 5); // waistband
    g.fillStyle(0x6a6a3a, 1);
    g.fillRect(6, 9, 5, 11); // left leg
    g.fillRect(13, 9, 5, 11); // right leg
    g.generateTexture("icon_gremlin_pants", ICON, ICON);

    // Gremlin Totem: a small carved bone totem with a dark binding wrap and a
    // red inlay.
    g.clear();
    g.fillStyle(0xc9bfa0, 1);
    g.fillRect(9, 3, 6, 18);
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(7, 9, 10, 3);
    g.fillStyle(0x8a1f2a, 1);
    g.fillCircle(12, 6, 3);
    g.generateTexture("icon_gremlin_totem", ICON, ICON);

    // Gloam-Bone Fetish: a bound knot of bone with a gloam-violet inlay + hide
    // wrap — the Duneshaper summon ingredient, looted from Duskrunner warrens.
    g.clear();
    g.fillStyle(0xd8cdb0, 1);
    g.fillRect(8, 4, 3, 16); // bone shaft
    g.fillRect(6, 3, 7, 3); // bone knob
    g.fillStyle(0x6a4a2a, 1);
    g.fillRect(6, 10, 12, 3); // hide binding
    g.fillStyle(0x9a5ee8, 1);
    g.fillCircle(15, 15, 3); // gloam inlay
    g.fillStyle(0xe0c0ff, 1);
    g.fillCircle(15, 15, 1.4);
    g.generateTexture("icon_warren_fetish", ICON, ICON);

    // Effigy of the Duneshaper: a crooked robed effigy topped with a gloam
    // crystal — the crafted badlands-boss summon totem.
    g.clear();
    g.fillStyle(0x3a2456, 1);
    g.fillTriangle(6, 21, 18, 21, 12, 8); // robe cone
    g.fillStyle(0x7a3ec8, 1);
    g.fillRect(11, 10, 2, 11); // gloam seam
    g.fillStyle(0x8a6a3e, 1);
    g.fillRect(8, 9, 8, 3); // wrap
    g.fillStyle(0x9a5ee8, 1);
    g.fillCircle(12, 5, 3); // crystal crown
    g.fillStyle(0xe0c0ff, 1);
    g.fillCircle(12, 5, 1.4);
    g.generateTexture("icon_tyrant_totem", ICON, ICON);

    // Gremlin King Fang: a large pale fang/tusk trophy.
    g.clear();
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(8, 22, 16, 22, 12, 3);
    g.fillStyle(0xcfc4a0, 1);
    g.fillTriangle(10, 20, 14, 20, 12, 8);
    g.generateTexture("icon_gremlin_king_fang", ICON, ICON);

    // Gremlin Trophy: an Elite Gremlin drop — a severed clawed hand on a cord,
    // crimson/gold to echo the elite palette.
    g.clear();
    g.fillStyle(0x6a1f3a, 1);
    g.fillRect(8, 8, 8, 9); // palm
    g.fillStyle(0x8a2f4a, 1);
    g.fillRect(8, 4, 2, 5); // claws
    g.fillRect(11, 3, 2, 6);
    g.fillRect(14, 4, 2, 5);
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2); // gold cord/binding
    g.generateTexture("icon_gremlin_trophy", ICON, ICON);

    // Boar Trophy: an Elite Boar drop — a pair of crossed tusks on a gold cord,
    // crimson/gold to echo the elite palette (matches the other trophies).
    g.clear();
    g.fillStyle(0x6a1f3a, 1);
    g.fillRect(9, 9, 6, 7); // snout/base
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(9, 15, 5, 4, 8, 4); // left tusk
    g.fillTriangle(15, 15, 19, 4, 16, 4); // right tusk
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2); // gold cord/binding
    g.generateTexture("icon_boar_trophy", ICON, ICON);

    // Snake Trophy: an Elite Snake drop — a coiled fanged head on a gold cord,
    // crimson/gold to echo the elite palette.
    g.clear();
    g.fillStyle(0x6a1f3a, 1);
    g.fillCircle(12, 9, 5); // head
    g.fillStyle(0x8a2f4a, 1);
    g.fillRect(8, 12, 8, 4); // coil
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(10, 12, 1, 3); // left fang
    g.fillRect(13, 12, 1, 3); // right fang
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2); // gold cord/binding
    g.generateTexture("icon_snake_trophy", ICON, ICON);

    // Gloam Shard: a jagged purple crystal shard with a lighter facet.
    g.clear();
    g.fillStyle(0x7a3ec8, 1);
    g.fillTriangle(12, 2, 5, 20, 19, 20); // shard body
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(12, 6, 8, 18, 12, 18); // inner facet
    g.fillStyle(0xc79cf0, 1);
    g.fillRect(11, 8, 2, 8); // bright vein
    g.generateTexture("icon_gloam_shard", ICON, ICON);

    // Refined trophies: a trophy claw/base wreathed in gloam crystal, tinted by
    // the rarity it rolls (Uncommon = green ring, Rare = blue ring) so its
    // "refined" status + result rarity read at a glance.
    const refinedTrophy = (key: string, ring: number) => {
      g.clear();
      g.fillStyle(0x3a2b52, 1);
      g.fillCircle(12, 12, 10); // violet gloam socket
      g.fillStyle(ring, 1);
      g.fillCircle(12, 12, 8);
      g.fillStyle(0x7a3ec8, 1);
      g.fillTriangle(12, 3, 6, 15, 18, 15); // gloam crystal
      g.fillStyle(0xe8d0ff, 1);
      g.fillRect(11, 6, 2, 8); // crystal highlight
      g.generateTexture(key, ICON, ICON);
    };
    refinedTrophy("icon_refined_trophy_uncommon", 0x5ad06a);
    refinedTrophy("icon_refined_trophy_rare", 0x4a9fe8);
    // Boss Refined Trophy — a gold ring marks its boss-tier pedigree
    // (guaranteed Mythic), distinct from the vein-refined trophies. The Tyrant
    // Trophy (Duneshaper, Tier 2) gets a hotter ember-orange ring.
    refinedTrophy("icon_boss_refined_trophy", 0xe8a83c);
    refinedTrophy("icon_boss_refined_trophy_t2", 0xff6a2a);

    // Ember Shard (Phase 5): a Gloam Shard rendered down at the Relic Forge's
    // Ember Kiln — same jagged-shard silhouette, recolored amber instead of
    // violet so the two currencies read as kin, not unrelated items.
    g.clear();
    g.fillStyle(0xc8641e, 1);
    g.fillTriangle(12, 2, 5, 20, 19, 20); // shard body
    g.fillStyle(0xe8923c, 1);
    g.fillTriangle(12, 6, 8, 18, 12, 18); // inner facet
    g.fillStyle(0xffce8a, 1);
    g.fillRect(11, 8, 2, 8); // bright vein
    g.generateTexture("icon_ember_shard", ICON, ICON);

    // Ember-Refined Trophy (Phase 5): same refinedTrophy silhouette, socketed
    // in ember instead of gloam (amber core vs violet).
    g.clear();
    g.fillStyle(0x522d18, 1);
    g.fillCircle(12, 12, 10); // ember socket
    g.fillStyle(0x5ad06a, 1); // Uncommon ring (the only rarity this produces)
    g.fillCircle(12, 12, 8);
    g.fillStyle(0xc8641e, 1);
    g.fillTriangle(12, 3, 6, 15, 18, 15); // ember crystal
    g.fillStyle(0xffce8a, 1);
    g.fillRect(11, 6, 2, 8); // crystal highlight
    g.generateTexture("icon_refined_trophy_uncommon_t2", ICON, ICON);

    // Relic gems — one per rarity (Relics.ts). A cut-gem diamond tinted by the
    // rarity color with a lighter facet highlight; reused for every relic of
    // that rarity, so rarity reads at a glance and the relic's identity comes
    // from the tooltip. Colors mirror Relics.ts RARITY_COLOR.
    const relicGem = (key: string, base: number, light: number) => {
      g.clear();
      g.fillStyle(0x1a1a20, 1);
      g.fillCircle(12, 12, 10); // dark socket backing
      g.fillStyle(base, 1);
      g.fillTriangle(12, 3, 4, 11, 20, 11); // upper facets
      g.fillTriangle(4, 11, 20, 11, 12, 21); // lower point
      g.fillStyle(light, 1);
      g.fillTriangle(12, 5, 8, 11, 12, 11); // highlight facet
      g.generateTexture(key, ICON, ICON);
    };
    relicGem("icon_relic_common", 0x9aa4b2, 0xc8d0da);
    relicGem("icon_relic_uncommon", 0x5ad06a, 0x9cf0a8);
    relicGem("icon_relic_rare", 0x4a9fe8, 0x9cccf6);
    relicGem("icon_relic_mythic", 0xe8a83c, 0xf6d68e);

    // Relic Forge icon (also the placed-station sprite — placed stations render
    // from their item icon, like the Workbench/Campfire/Drying Rack). A dark
    // stone plinth with a glowing violet relic gem cradled on top.
    g.clear();
    g.fillStyle(0x3a3340, 1);
    g.fillRect(3, 13, 18, 8); // plinth base
    g.fillStyle(0x2b2530, 1);
    g.fillRect(5, 18, 14, 3); // shadowed foot
    g.fillStyle(0x4a4152, 1);
    g.fillRect(7, 9, 10, 5); // cradle
    g.fillStyle(0xc264d8, 1);
    g.fillTriangle(12, 1, 7, 10, 17, 10); // gem
    g.fillStyle(0xe6a8f0, 1);
    g.fillTriangle(12, 3, 9, 9, 12, 9); // gem highlight
    g.generateTexture("icon_relic_forge", ICON, ICON);

    // World-map POI markers (WorldMapUI): a dark-ringed colored badge so a
    // discovered landmark reads at a glance on the full map. Small (18x18) so
    // it doesn't swamp the shrunk map. One per POI type.
    const mapMarker = (key: string, ring: number, fill: number) => {
      g.clear();
      g.fillStyle(0x11141a, 1);
      g.fillCircle(9, 9, 9); // dark border
      g.fillStyle(ring, 1);
      g.fillCircle(9, 9, 8);
      g.fillStyle(fill, 1);
      g.fillCircle(9, 9, 5);
      g.generateTexture(key, 18, 18);
    };
    mapMarker("map_altar", 0xf0c040, 0xd6483a); // Gremlin War Camp — the standout red/gold marker
    mapMarker("map_shack", 0xd8c090, 0x8a6a3a); // Gremlin Shack — wood-brown
    mapMarker("map_vein", 0xc79cf0, 0x7a3ec8); // Gloaming Vein — purple amethyst
    mapMarker("map_den", 0xe0a060, 0xc06a34); // Duskrunner Warren — dusty orange-brown
    mapMarker("map_forge", 0xffb050, 0xd6481a); // Sunken Forge — fiery orange-red
    mapMarker("map_tyrant_altar", 0xc79cf0, 0x7a2ec8); // Duneshaper's Altar — gloam violet (the badlands boss landmark)

    // ===== Badlands (biome 2 Phase 2) content =====

    // Duskrunner (24x14) — a lean gloam-touched jackal drawn facing RIGHT (muzzle
    // at +x, matching the roster's non-rotating flipX facing). A bushy tail, four
    // legs, a pointed ear and an ember eye so it reads as "corrupted," not a plain
    // coyote. Elite = crimson/gold.
    const drawDuskrunner = (
      key: string,
      body: number,
      head: number,
      belly: number,
      back: number,
      eye: number,
      eyeGlint: number,
    ) => {
      g.clear();
      // legs
      g.fillStyle(0x4a3d34, 1);
      g.fillRect(5, 9, 2, 5);
      g.fillRect(8, 10, 2, 4);
      g.fillRect(14, 10, 2, 4);
      g.fillRect(17, 9, 2, 5);
      // tail + body
      g.fillStyle(body, 1);
      g.fillTriangle(0, 4, 5, 4, 4, 10);
      g.fillRect(4, 4, 15, 6);
      // back highlight
      g.fillStyle(back, 1);
      g.fillRect(5, 4, 13, 1);
      // belly shadow
      g.fillStyle(belly, 1);
      g.fillRect(4, 8, 15, 2);
      // head + snout (right) + ear
      g.fillStyle(head, 1);
      g.fillRect(17, 3, 6, 6);
      g.fillRect(22, 6, 2, 2);
      g.fillTriangle(18, 4, 20, 4, 18, 0);
      // muzzle line
      g.fillStyle(0x241826, 1);
      g.fillRect(21, 7, 3, 1);
      // ember eye + glint
      g.fillStyle(eye, 1);
      g.fillRect(19, 4, 2, 2);
      g.fillStyle(eyeGlint, 1);
      g.fillRect(19, 4, 1, 1);
      g.generateTexture(key, 24, 14);
    };
    drawDuskrunner("duskrunner", 0x8a7a6a, 0x5a4a5a, 0x5f5044, 0xa89684, 0xff8a3a, 0xffd24a);
    drawDuskrunner("duskrunner_elite", 0x6a1f2a, 0x3f1020, 0x3f1020, 0xf0c040, 0xf0c040, 0xffe8a0);

    // Duskrunner Warren (44x36) — a burrow mound of packed red-dust earth with a
    // dark maw, bleg-bones jutting from the spoil, and a faint ember glow in the
    // throat (gloam-touched). The badlands' first structural POI. Non-interactive
    // backdrop while guarded; the smash target once its waves fall.
    g.clear();
    g.fillStyle(0x6e4a30, 1);
    g.fillEllipse(22, 24, 44, 22); // mound base
    g.fillStyle(0x855a38, 1);
    g.fillEllipse(22, 20, 36, 16); // sunlit upper mound
    g.fillStyle(0x9a6a44, 1);
    g.fillEllipse(20, 16, 22, 9); // crest highlight
    g.fillStyle(0x1e1410, 1);
    g.fillEllipse(22, 25, 18, 12); // dark den maw
    g.fillStyle(0x3a1f14, 1);
    g.fillEllipse(22, 23, 12, 7); // maw inner rim
    g.fillStyle(0xff7a2a, 0.6);
    g.fillEllipse(22, 27, 6, 3); // ember glow in the throat
    // scattered bones in the spoil
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(6, 28, 6, 2);
    g.fillRect(34, 30, 6, 2);
    g.fillRect(9, 31, 2, 3);
    g.generateTexture("duskrunner_den", 44, 36);

    // Wrecked Warren (44x30) — the same mound caved in: the maw collapsed to a
    // shallow scar, ember gone, more bone rubble strewn about.
    g.clear();
    g.fillStyle(0x5e3f2a, 1);
    g.fillEllipse(22, 22, 44, 16); // caved, flatter mound
    g.fillStyle(0x744e32, 1);
    g.fillEllipse(20, 20, 30, 10);
    g.fillStyle(0x2a1c14, 1);
    g.fillEllipse(22, 22, 20, 6); // collapsed scar
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(7, 24, 7, 2);
    g.fillRect(30, 25, 7, 2);
    g.fillRect(16, 26, 3, 2);
    g.fillRect(26, 20, 2, 4);
    g.generateTexture("duskrunner_den_wrecked", 44, 30);

    // Warren Cache (24x18) — the fallen's spoils heaped in the wrecked den's
    // mouth: stacked pelts, a bone or two, and a glint. The interactable loot
    // pile the collapsed Warren yields.
    g.clear();
    g.fillStyle(0x7a5038, 1);
    g.fillEllipse(12, 13, 24, 10); // pelt heap base
    g.fillStyle(0x8f6142, 1);
    g.fillEllipse(11, 10, 18, 8);
    g.fillStyle(0x5f3f2c, 1);
    g.fillRect(4, 9, 7, 2); // rolled pelt edges
    g.fillRect(14, 11, 7, 2);
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(15, 4, 6, 2); // bone across the top
    g.fillRect(18, 3, 2, 4);
    g.fillStyle(0xffe08a, 1);
    g.fillRect(7, 7, 2, 2); // a glint of spoils
    g.generateTexture("warren_cache", 24, 18);

    // Cragscale (28x18) — an armored rock reptile drawn facing RIGHT. A ridged,
    // spiked stone-plated back (the "slash bounces" tell), stubby legs, a thick
    // tail and a low head with a beady eye. Elite = crimson body / gold plates.
    const drawCragscale = (
      key: string,
      hide: number,
      belly: number,
      plate: number,
      plateLight: number,
      head: number,
      eye: number,
    ) => {
      g.clear();
      // legs
      g.fillStyle(0x3a281e, 1);
      g.fillRect(4, 13, 3, 5);
      g.fillRect(9, 14, 3, 4);
      g.fillRect(16, 14, 3, 4);
      g.fillRect(21, 13, 3, 5);
      // tail + body
      g.fillStyle(hide, 1);
      g.fillTriangle(0, 8, 4, 6, 4, 12);
      g.fillRect(3, 6, 22, 9);
      // belly
      g.fillStyle(belly, 1);
      g.fillRect(3, 12, 22, 3);
      // head (right) + mouth
      g.fillStyle(head, 1);
      g.fillRect(23, 7, 5, 7);
      g.fillStyle(0x1a1008, 1);
      g.fillRect(24, 12, 4, 1);
      // eye
      g.fillStyle(eye, 1);
      g.fillRect(25, 8, 2, 2);
      g.fillStyle(0x1a1008, 1);
      g.fillRect(26, 8, 1, 1);
      // back plates
      g.fillStyle(plate, 1);
      g.fillRect(5, 3, 5, 4);
      g.fillRect(11, 2, 6, 5);
      g.fillRect(18, 3, 5, 4);
      // plate highlights
      g.fillStyle(plateLight, 1);
      g.fillRect(5, 3, 5, 1);
      g.fillRect(11, 2, 6, 1);
      g.fillRect(18, 3, 5, 1);
      // plate ridge separators
      g.fillStyle(0x4a4038, 1);
      g.fillRect(10, 3, 1, 4);
      g.fillRect(17, 3, 1, 4);
      // plate spikes
      g.fillStyle(plate, 1);
      g.fillTriangle(7, 3, 9, 3, 8, 0);
      g.fillTriangle(13, 2, 15, 2, 14, 0);
      g.fillTriangle(19, 3, 21, 3, 20, 0);
      g.generateTexture(key, 28, 18);
    };
    // Cool slate-stone hide (was warm brown 0x7a5040) so it reads as a rocky
    // reptile, not a second boar — Boar is warm-brown, Cragscale is grey-stone.
    drawCragscale("cragscale", 0x69726c, 0x474e49, 0x9fa7a2, 0xc4ccc6, 0x545c56, 0xe0b43a);
    drawCragscale("cragscale_elite", 0x6a1f2a, 0x3f1020, 0xf0c040, 0xffe8a0, 0x3f1020, 0xffe08a);

    // Hexling — the badlands MAGE. A deliberately DISTINCT silhouette from the
    // squat gremlins (the user: "mages look too similar to the gremlins"): a
    // taller 20x30 hooded/robed caster with a pointed hood, a glowing eye slit, a
    // chest rune, and a staff topped with a glowing orb held to one side. Reads as
    // "arcane threat," not "recolored gremlin."
    const drawHexling = (
      key: string,
      robe: number,
      hood: number,
      hem: number,
      glow: number,
    ) => {
      g.clear();
      // Robe — a trapezoid widening to the hem (stacked rects), the caster body.
      g.fillStyle(robe, 1);
      g.fillRect(6, 10, 8, 4); // shoulders
      g.fillRect(5, 14, 10, 4);
      g.fillRect(4, 18, 12, 4);
      g.fillRect(3, 22, 14, 4);
      g.fillRect(2, 26, 16, 3); // hem base
      g.fillStyle(hem, 1);
      g.fillRect(2, 28, 16, 2); // hem highlight
      // Pointed hood + head.
      g.fillStyle(hood, 1);
      g.fillRect(6, 6, 8, 5); // head
      g.fillRect(7, 3, 6, 3);
      g.fillRect(9, 0, 2, 3); // hood tip
      // Glowing eye slit + a chest rune.
      g.fillStyle(glow, 1);
      g.fillRect(8, 7, 3, 2); // eye
      g.fillStyle(glow, 0.9);
      g.fillRect(8, 16, 3, 3); // chest rune
      // Staff on the right: wooden shaft + a glowing orb at its top.
      g.fillStyle(0x6b4a2a, 1);
      g.fillRect(17, 8, 2, 21);
      g.fillStyle(glow, 1);
      g.fillCircle(18, 6, 3);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(18, 6, 1.4); // bright orb core
      g.generateTexture(key, 20, 30);
    };
    drawHexling("hexling", 0x4a2d6e, 0x33204d, 0x5f3d88, 0xc86ef0); // violet caster, magenta magic
    drawHexling("hexling_elite", 0x6a1f3a, 0x3f1030, 0x8a2a4a, 0xf0c040); // crimson/gold elite

    // Sandmaw (26x18) — the badlands BURROWING AMBUSHER (Phase 2b), drawn facing
    // RIGHT. A broad, low, plated carapace (the part that breaches the sand) with
    // a segmented shell, a gaping fanged MAW + hooked mandibles at the front, twin
    // amber eyes, and a dark gloam-shadowed underside. Reads as "a maw erupting
    // from the ground," distinct from the upright/quadruped roster. Elite =
    // crimson shell / gold plates.
    const drawSandmaw = (
      key: string,
      shell: number,
      shellDark: number,
      plate: number,
      maw: number,
      mandible: number,
      eye: number,
    ) => {
      g.clear();
      // legs / gloam-shadowed underside
      g.fillStyle(0x2a1e2e, 1);
      g.fillRect(5, 13, 2, 4);
      g.fillRect(10, 14, 2, 3);
      g.fillRect(15, 13, 2, 4);
      // belly shadow
      g.fillStyle(shellDark, 1);
      g.fillRect(2, 12, 19, 3);
      // carapace body + rounded rear (left)
      g.fillStyle(shell, 1);
      g.fillRect(2, 4, 19, 9);
      g.fillTriangle(0, 8, 3, 4, 3, 12);
      // segmented back plates
      g.fillStyle(plate, 1);
      g.fillRect(4, 3, 5, 3);
      g.fillRect(10, 2, 5, 4);
      g.fillRect(16, 3, 4, 3);
      // plate ridge separators
      g.fillStyle(shellDark, 1);
      g.fillRect(9, 3, 1, 3);
      g.fillRect(15, 3, 1, 3);
      // maw (right) — dark opening + hooked mandibles jutting out
      g.fillStyle(maw, 1);
      g.fillRect(20, 6, 6, 6);
      g.fillStyle(mandible, 1);
      g.fillTriangle(20, 6, 26, 3, 24, 8); // upper mandible
      g.fillTriangle(20, 12, 26, 15, 24, 10); // lower mandible
      // inner teeth
      g.fillStyle(0xf0e0c0, 1);
      g.fillRect(22, 8, 1, 2);
      g.fillRect(24, 8, 1, 2);
      // twin amber eyes + glint
      g.fillStyle(eye, 1);
      g.fillRect(17, 6, 2, 2);
      g.fillRect(17, 10, 2, 2);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(17, 6, 1, 1);
      g.generateTexture(key, 26, 18);
    };
    drawSandmaw("sandmaw", 0x9a8258, 0x6a583a, 0xb59a6a, 0x241826, 0xcfc0a0, 0xffa93a);
    drawSandmaw("sandmaw_elite", 0x6a1f2a, 0x3f1020, 0xf0c040, 0x3f1020, 0xffe8a0, 0xffe08a);

    // Hexling's fire bolt — an elongated blast, not a rock (the user: "like
    // Falcon's laser from Smash Bros but fire"). Drawn pointing +x (matches
    // Projectile's default travel-angle orientation): a tapering ember-orange
    // streak with a hot yellow-white core and a soft outer glow.
    g.clear();
    g.fillStyle(0xff5a1e, 0.5);
    g.fillEllipse(9, 4, 18, 6); // outer glow, elongated along the travel axis
    g.fillStyle(0xff7a1e, 1);
    g.fillTriangle(0, 2, 0, 6, 13, 4); // tapered tail -> body
    g.fillEllipse(11, 4, 7, 4.4);
    g.fillStyle(0xffd23a, 1);
    g.fillEllipse(13, 4, 4.4, 2.6); // hot core
    g.fillStyle(0xfff4c0, 1);
    g.fillEllipse(15, 4, 2.2, 1.4); // white-hot tip
    g.generateTexture("hex_bolt", 18, 8);

    // Hexling's PHYSICAL side-bolts — the two outer bolts of the volley (the
    // center one is the fire `hex_bolt` above). Same streak shape, a cool
    // steel-violet palette instead of ember-orange so the player can read which
    // shot is the armor-piercing fire one and which are the armor-reducible pair.
    g.clear();
    g.fillStyle(0x6a5aa0, 0.5);
    g.fillEllipse(9, 4, 18, 6);
    g.fillStyle(0x8a7ac0, 1);
    g.fillTriangle(0, 2, 0, 6, 13, 4);
    g.fillEllipse(11, 4, 7, 4.4);
    g.fillStyle(0xc0c8e0, 1);
    g.fillEllipse(13, 4, 4.4, 2.6);
    g.fillStyle(0xeef0ff, 1);
    g.fillEllipse(15, 4, 2.2, 1.4);
    g.generateTexture("hex_bolt_phys", 18, 8);

    // Gloam Bolt — the Duneshaper's magic bolt. Bigger + brighter than a hex
    // bolt (violet orb, ember-white core, faint tail) so the boss's volley reads
    // as its own, weightier projectile.
    g.clear();
    g.fillStyle(0x5a2ea8, 0.9);
    g.fillCircle(5, 5, 5);
    g.fillStyle(0x9a5ee8, 1);
    g.fillCircle(5, 5, 3.5);
    g.fillStyle(0xffe0ff, 1);
    g.fillCircle(5, 5, 1.6);
    g.generateTexture("gloam_bolt", 10, 10);

    // Emberbloom — desert herb. 14x18: slim green stalk + a small ember-orange
    // bloom. Picked = bare stalk (mirrors the blackberry picked-bush pattern).
    g.clear();
    g.fillStyle(0x5a7a4a, 1);
    g.fillRect(6, 6, 2, 12); // stalk
    g.fillStyle(0x4a6a3a, 1);
    g.fillRect(3, 10, 3, 2); // leaf
    g.fillRect(8, 8, 3, 2);
    g.fillStyle(0xff8a3a, 1);
    g.fillCircle(7, 4, 4); // ember bloom
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(7, 4, 2);
    g.generateTexture("emberbloom", 14, 18);

    g.clear(); // picked Emberbloom — stalk only
    g.fillStyle(0x5a7a4a, 1);
    g.fillRect(6, 6, 2, 12);
    g.fillStyle(0x4a6a3a, 1);
    g.fillRect(3, 10, 3, 2);
    g.fillRect(8, 8, 3, 2);
    g.generateTexture("emberbloom_picked", 14, 18);

    // Sunfruit cactus — 16x24: a green columnar cactus with a red fruit near the
    // top. Picked = cactus with no fruit.
    g.clear();
    g.fillStyle(0x3f7a4a, 1);
    g.fillRect(5, 4, 6, 20); // trunk
    g.fillRect(1, 10, 4, 8); // left arm
    g.fillRect(11, 8, 4, 8); // right arm
    g.fillStyle(0xd83a3a, 1);
    g.fillCircle(8, 6, 3); // fruit
    g.generateTexture("sunfruit_cactus", 16, 24);

    g.clear(); // picked cactus — no fruit
    g.fillStyle(0x3f7a4a, 1);
    g.fillRect(5, 4, 6, 20);
    g.fillRect(1, 10, 4, 8);
    g.fillRect(11, 8, 4, 8);
    g.generateTexture("sunfruit_cactus_picked", 16, 24);

    // Gloamcap — a gloam-touched desert mushroom cluster (violet caps on pale
    // stalks). Picked = just the stalks. More pickable badlands vegetation.
    g.clear();
    g.fillStyle(0xcbb48a, 1);
    g.fillRect(4, 12, 2, 8); // stalks
    g.fillRect(9, 10, 2, 10);
    g.fillStyle(0x6a3ea8, 1);
    g.fillEllipse(5, 11, 8, 5); // caps
    g.fillEllipse(10, 9, 9, 6);
    g.fillStyle(0x9a5ee8, 1);
    g.fillEllipse(10, 8, 4, 2); // highlight
    g.generateTexture("gloamcap", 16, 22);
    g.clear();
    g.fillStyle(0xcbb48a, 1);
    g.fillRect(4, 12, 2, 8);
    g.fillRect(9, 10, 2, 10);
    g.generateTexture("gloamcap_picked", 16, 22);

    // Dustbloom — a low cluster of pale windblown desert flowers. Picked = a bare
    // dry tuft.
    g.clear();
    g.fillStyle(0x6a6a4a, 1);
    g.fillRect(6, 12, 2, 8); // stem
    g.fillRect(9, 13, 2, 7);
    g.fillStyle(0x8a8a5a, 1);
    g.fillRect(3, 15, 4, 2); // dry grass fans
    g.fillRect(11, 14, 4, 2);
    g.fillStyle(0xe0d2a0, 1); // pale blooms
    g.fillCircle(7, 9, 3);
    g.fillCircle(10, 11, 2.5);
    g.fillStyle(0xfff0c0, 1);
    g.fillCircle(7, 9, 1.2);
    g.generateTexture("dustbloom", 16, 22);
    g.clear();
    g.fillStyle(0x6a6a4a, 1);
    g.fillRect(6, 14, 2, 6);
    g.fillRect(9, 15, 2, 5);
    g.fillStyle(0x8a8a5a, 1);
    g.fillRect(3, 17, 4, 2);
    g.fillRect(11, 16, 4, 2);
    g.generateTexture("dustbloom_picked", 16, 22);

    // --- badlands resource icons (ICON=24) ---
    g.clear(); // Duskrunner Pelt — a stretched tan/purple hide
    g.fillStyle(0x8a7a6a, 1);
    g.fillRect(5, 4, 14, 16);
    g.fillStyle(0x5a4a5a, 1);
    g.fillRect(8, 7, 8, 10);
    g.fillStyle(0x6a5a4a, 1);
    g.fillRect(3, 3, 3, 3); // corner peg
    g.fillRect(18, 18, 3, 3);
    g.generateTexture("icon_duskrunner_pelt", ICON, ICON);

    g.clear(); // Cragscale Plate — a grey-red scale slab with a crack
    g.fillStyle(0x7a5040, 1);
    g.fillRect(4, 5, 16, 14);
    g.fillStyle(0x8a8078, 1);
    g.fillRect(6, 7, 12, 10);
    g.fillStyle(0x4a3228, 1);
    g.fillRect(11, 6, 2, 12); // crack
    g.generateTexture("icon_cragscale_plate", ICON, ICON);

    g.clear(); // Hex Essence — a violet vial of gloam-fire
    g.fillStyle(0x4a4152, 1);
    g.fillRect(9, 3, 6, 3); // stopper
    g.fillStyle(0x2b2530, 1);
    g.fillRect(7, 6, 10, 15); // glass
    g.fillStyle(0x7a3ec8, 1);
    g.fillRect(8, 11, 8, 9); // essence
    g.fillStyle(0xe0b0ff, 1);
    g.fillRect(10, 13, 2, 5); // glow
    g.generateTexture("icon_hex_essence", ICON, ICON);

    g.clear(); // Sandmaw Chitin — an angular sandy plate shard with a ridge highlight
    g.fillStyle(0x6a583a, 1);
    g.fillTriangle(4, 19, 12, 3, 20, 19);
    g.fillStyle(0x9a8258, 1);
    g.fillTriangle(6, 18, 12, 7, 18, 18);
    g.fillStyle(0xb59a6a, 1);
    g.fillRect(11, 9, 2, 7); // ridge highlight
    g.generateTexture("icon_sandmaw_chitin", ICON, ICON);

    g.clear(); // Cinderforged Ore — a chunk of dark ore with molten metal veins
    g.fillStyle(0x3a2c22, 1);
    g.fillRect(4, 8, 16, 12);
    g.fillRect(7, 5, 10, 5);
    g.fillStyle(0x5a4030, 1);
    g.fillRect(6, 10, 8, 6);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(8, 11, 3, 7);
    g.fillRect(14, 10, 3, 8);
    g.fillStyle(0xffd070, 1);
    g.fillRect(9, 13, 1, 3);
    g.fillRect(15, 12, 1, 4);
    g.generateTexture("icon_ember_ore", ICON, ICON);

    g.clear(); // Emberbloom icon — a herb sprig with an ember bloom
    g.fillStyle(0x5a7a4a, 1);
    g.fillRect(11, 10, 2, 11);
    g.fillStyle(0x4a6a3a, 1);
    g.fillRect(6, 14, 5, 2);
    g.fillRect(13, 12, 5, 2);
    g.fillStyle(0xff8a3a, 1);
    g.fillCircle(12, 7, 5);
    g.fillStyle(0xffd24a, 1);
    g.fillCircle(12, 7, 2);
    g.generateTexture("icon_emberbloom", ICON, ICON);

    g.clear(); // Gloamcap — violet mushroom
    g.fillStyle(0xcbb48a, 1);
    g.fillRect(11, 12, 3, 9); // stalk
    g.fillStyle(0x6a3ea8, 1);
    g.fillEllipse(12, 10, 14, 8); // cap
    g.fillStyle(0x9a5ee8, 1);
    g.fillEllipse(12, 8, 7, 3);
    g.fillStyle(0xe0b0ff, 1);
    g.fillCircle(9, 9, 1.2);
    g.fillCircle(15, 10, 1.2);
    g.generateTexture("icon_gloamcap", ICON, ICON);

    g.clear(); // Dustbloom — pale desert flower
    g.fillStyle(0x6a6a4a, 1);
    g.fillRect(11, 12, 2, 9); // stem
    g.fillStyle(0xe0d2a0, 1);
    g.fillCircle(12, 8, 5); // petals
    g.fillCircle(7, 10, 3);
    g.fillCircle(17, 10, 3);
    g.fillStyle(0xfff0c0, 1);
    g.fillCircle(12, 8, 2);
    g.fillStyle(0xc0a860, 1);
    g.fillCircle(12, 8, 1);
    g.generateTexture("icon_dustbloom", ICON, ICON);

    g.clear(); // Sunfruit icon — a red fruit with a green nub
    g.fillStyle(0xd83a3a, 1);
    g.fillCircle(12, 13, 8);
    g.fillStyle(0xf06a5a, 1);
    g.fillCircle(9, 10, 3); // highlight
    g.fillStyle(0x3f7a4a, 1);
    g.fillRect(10, 3, 4, 4); // stem nub
    g.generateTexture("icon_sunfruit", ICON, ICON);

    // === biome 2 Phase 4 — smelting economy + forged gear ===

    g.clear(); // Clay — a red-brown lump
    g.fillStyle(0xa4623a, 1);
    g.fillEllipse(12, 14, 16, 12);
    g.fillStyle(0xbd7a4c, 1);
    g.fillEllipse(10, 11, 8, 6);
    g.fillStyle(0x7a4326, 1);
    g.fillRect(14, 13, 3, 4);
    g.generateTexture("icon_clay", ICON, ICON);

    g.clear(); // Sunscorch Ore — grey rock with warm ore flecks
    g.fillStyle(0x5a534a, 1);
    g.fillRect(4, 8, 16, 12);
    g.fillRect(7, 5, 10, 5);
    g.fillStyle(0x726960, 1);
    g.fillRect(6, 10, 9, 6);
    g.fillStyle(0xe0982c, 1);
    g.fillRect(8, 11, 3, 3);
    g.fillRect(14, 9, 3, 3);
    g.fillStyle(0xffc860, 1);
    g.fillRect(9, 12, 1, 1);
    g.generateTexture("icon_sunscorch_ore", ICON, ICON);

    g.clear(); // Ironbark — stacked dark hardwood planks with rust-red grain
    g.fillStyle(0x4a3220, 1);
    g.fillRect(3, 6, 18, 4);
    g.fillRect(3, 12, 18, 4);
    g.fillStyle(0x5f4028, 1);
    g.fillRect(5, 7, 14, 1);
    g.fillRect(5, 13, 14, 1);
    g.fillStyle(0x7a3a24, 1);
    g.fillRect(6, 8, 5, 1); // rust grain streak
    g.fillRect(12, 14, 6, 1);
    g.generateTexture("icon_ironbark", ICON, ICON);

    g.clear(); // Sunsteel Ingot — a warm gold bar
    g.fillStyle(0xcaa24a, 1);
    g.fillRect(3, 12, 18, 7);
    g.fillStyle(0xe6c56a, 1);
    g.fillRect(5, 9, 14, 4);
    g.fillStyle(0xfff0b0, 1);
    g.fillRect(6, 10, 6, 1);
    g.fillStyle(0x9a7a2e, 1);
    g.fillRect(3, 18, 18, 1);
    g.generateTexture("icon_sunsteel_ingot", ICON, ICON);

    g.clear(); // Embersteel Ingot — a dark bar with ember veins
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(3, 12, 18, 7);
    g.fillStyle(0x554450, 1);
    g.fillRect(5, 9, 14, 4);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(6, 10, 4, 1);
    g.fillRect(12, 15, 5, 1);
    g.fillStyle(0xffd070, 1);
    g.fillRect(7, 10, 1, 1);
    g.generateTexture("icon_embersteel_ingot", ICON, ICON);

    g.clear(); // Gremlin King's Heart — a dark-red heart wreathed in gloamfire
    g.fillStyle(0x8a1f2a, 1);
    g.fillCircle(9, 10, 4);
    g.fillCircle(15, 10, 4);
    g.fillTriangle(5, 12, 19, 12, 12, 20);
    g.fillStyle(0xc23a44, 1);
    g.fillCircle(9, 9, 1.5);
    g.fillStyle(0x9a5ee8, 1); // gloamfire wisps
    g.fillRect(11, 3, 2, 3);
    g.fillRect(6, 6, 1, 2);
    g.fillRect(17, 6, 1, 2);
    g.generateTexture("icon_gremlin_king_heart", ICON, ICON);

    // Smelter (world sprite + icon) — a stone kiln with a glowing mouth.
    g.clear();
    g.fillStyle(0x5a5048, 1);
    g.fillRect(4, 6, 16, 15);
    g.fillStyle(0x6e635a, 1);
    g.fillRect(4, 6, 16, 3); // rim
    g.fillStyle(0x2a2420, 1);
    g.fillRect(8, 12, 8, 8); // mouth
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(9, 15, 6, 5); // fire glow
    g.fillStyle(0xffd070, 1);
    g.fillRect(11, 17, 2, 3);
    g.generateTexture("icon_smelter", ICON, ICON);

    // Smelter Lvl 2 (Ember Crucible) — same kiln, violet-hot core + a heart-set rim.
    g.clear();
    g.fillStyle(0x554a52, 1);
    g.fillRect(4, 6, 16, 15);
    g.fillStyle(0x6e5a68, 1);
    g.fillRect(4, 6, 16, 3);
    g.fillStyle(0x2a2028, 1);
    g.fillRect(8, 12, 8, 8);
    g.fillStyle(0xb266ff, 1); // violet gloamfire core
    g.fillRect(9, 14, 6, 6);
    g.fillStyle(0xe0b0ff, 1);
    g.fillRect(11, 16, 2, 3);
    g.fillStyle(0xff5a4a, 1);
    g.fillCircle(12, 8, 2); // the King's heart set in the rim
    g.generateTexture("icon_smelter_t1", ICON, ICON);

    // Workbench Lvl 2 (Tool Sharpener) — the table with a whetstone block.
    g.clear();
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(2, 6, 20, 4);
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(3, 10, 3, 10);
    g.fillRect(18, 10, 3, 10);
    g.fillStyle(0x9aa0a8, 1);
    g.fillRect(9, 2, 8, 4); // whetstone
    g.generateTexture("icon_workbench_t1", ICON, ICON);

    // Workbench Lvl 3 (Forge Anvil) — the table with an anvil on top.
    g.clear();
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(2, 8, 20, 4);
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(3, 12, 3, 8);
    g.fillRect(18, 12, 3, 8);
    g.fillStyle(0x44484e, 1); // anvil
    g.fillRect(7, 3, 10, 3);
    g.fillRect(10, 6, 4, 2);
    g.fillRect(8, 6, 8, 1);
    g.fillStyle(0x2c2f34, 1);
    g.fillRect(7, 3, 3, 1);
    g.generateTexture("icon_workbench_t2", ICON, ICON);

    // --- forged weapons ---
    g.clear(); // Sunsteel Warhammer — big steel head on a haft
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(11, 4, 2, 18); // haft
    g.fillStyle(0x8a9098, 1);
    g.fillRect(5, 4, 14, 6); // head
    g.fillStyle(0xb0b6be, 1);
    g.fillRect(5, 5, 4, 4);
    g.fillStyle(0x5a5f66, 1);
    g.fillRect(15, 4, 4, 6);
    g.generateTexture("icon_sunsteel_warhammer", ICON, ICON);

    g.clear(); // Sunsteel Longsword — a bright blade
    g.fillStyle(0xc0c6ce, 1);
    g.fillRect(11, 3, 3, 14); // blade
    g.fillStyle(0xe6ecf2, 1);
    g.fillRect(12, 4, 1, 12);
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(8, 17, 9, 2); // guard
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(11, 19, 3, 4); // grip
    g.generateTexture("icon_sunsteel_sword", ICON, ICON);

    g.clear(); // Sunsteel Pike — a long spear with a steel tip
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(11, 8, 2, 15); // shaft
    g.fillStyle(0xc0c6ce, 1);
    g.fillTriangle(12, 2, 8, 10, 16, 10); // tip
    g.fillStyle(0xe6ecf2, 1);
    g.fillTriangle(12, 4, 10, 9, 12, 9);
    g.generateTexture("icon_sunsteel_pike", ICON, ICON);

    g.clear(); // Sunsteel Warbow — a steel bow with a nocked arrow
    g.lineStyle(2, 0x8a9098, 1);
    g.beginPath();
    g.arc(3, 12, 10, -Math.PI / 3, Math.PI / 3, false); // stave bulging right
    g.strokePath();
    g.lineStyle(1, 0xe6ecf2, 1);
    g.beginPath();
    g.moveTo(8, 3);
    g.lineTo(8, 21); // string
    g.strokePath();
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(8, 11, 12, 2); // arrow shaft
    g.fillStyle(0xc0c6ce, 1);
    g.fillTriangle(20, 9, 20, 15, 23, 12); // steel head
    g.generateTexture("icon_sunsteel_warbow", ICON, ICON);

    // --- forged HEAVY armor (Sunsteel — steel-grey) ---
    g.clear(); // Sunsteel Helm
    g.fillStyle(0x8a9098, 1);
    g.fillRect(5, 8, 14, 10);
    g.fillCircle(12, 8, 7);
    g.fillStyle(0x2a2e34, 1);
    g.fillRect(7, 11, 10, 3); // visor slit
    g.fillStyle(0xb0b6be, 1);
    g.fillRect(4, 15, 16, 3);
    g.generateTexture("icon_sunsteel_helm", ICON, ICON);

    g.clear(); // Sunsteel Cuirass
    g.fillStyle(0x8a9098, 1);
    g.fillRect(5, 5, 14, 15);
    g.fillStyle(0x6b7178, 1);
    g.fillRect(2, 5, 4, 7);
    g.fillRect(18, 5, 4, 7);
    g.fillStyle(0xb0b6be, 1);
    g.fillRect(11, 6, 2, 12); // sternum ridge
    g.generateTexture("icon_sunsteel_cuirass", ICON, ICON);

    g.clear(); // Sunsteel Greaves
    g.fillStyle(0x8a9098, 1);
    g.fillRect(6, 4, 5, 16);
    g.fillRect(13, 4, 5, 16);
    g.fillStyle(0xb0b6be, 1);
    g.fillRect(7, 5, 2, 12);
    g.fillRect(14, 5, 2, 12);
    g.generateTexture("icon_sunsteel_greaves", ICON, ICON);

    // --- forged LIGHT armor (Duskhide — tan/brown leather with steel bands) ---
    g.clear(); // Duskhide Hood
    g.fillStyle(0x7a5a3a, 1);
    g.fillRect(5, 8, 14, 10);
    g.fillCircle(12, 8, 7);
    g.fillStyle(0x9a7a52, 1);
    g.fillRect(4, 15, 16, 3);
    g.fillStyle(0x8a9098, 1);
    g.fillRect(6, 10, 12, 1); // steel band
    g.generateTexture("icon_duskhide_hood", ICON, ICON);

    g.clear(); // Duskhide Vest
    g.fillStyle(0x7a5a3a, 1);
    g.fillRect(5, 5, 14, 15);
    g.fillStyle(0x5c4328, 1);
    g.fillRect(2, 5, 4, 7);
    g.fillRect(18, 5, 4, 7);
    g.fillStyle(0x8a9098, 1);
    g.fillRect(6, 9, 12, 1); // buckle strap
    g.fillRect(6, 14, 12, 1);
    g.generateTexture("icon_duskhide_vest", ICON, ICON);

    g.clear(); // Duskhide Leggings
    g.fillStyle(0x7a5a3a, 1);
    g.fillRect(6, 4, 5, 16);
    g.fillRect(13, 4, 5, 16);
    g.fillStyle(0x9a7a52, 1);
    g.fillRect(7, 5, 3, 3);
    g.fillRect(14, 5, 3, 3);
    g.fillStyle(0x8a9098, 1);
    g.fillRect(6, 12, 5, 1); // chitin plate band
    g.fillRect(13, 12, 5, 1);
    g.generateTexture("icon_duskhide_leggings", ICON, ICON);

    // === enhanced/T2 tier (biome 2 Phase 4 Session 2) — Embersteel gear ===
    // Reforged: the base silhouettes recast in dark ember-veined steel (matches
    // the Embersteel Ingot palette — near-black steel with molten ember cracks).

    // Workbench Lvl 4 (Emberforge Anvil) — the table with an ember-fed anvil.
    g.clear();
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(2, 8, 20, 4);
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(3, 12, 3, 8);
    g.fillRect(18, 12, 3, 8);
    g.fillStyle(0x3a2e34, 1); // dark anvil
    g.fillRect(7, 3, 10, 3);
    g.fillRect(10, 6, 4, 2);
    g.fillRect(8, 6, 8, 1);
    g.fillStyle(0xff7a2a, 1); // ember glow under the anvil
    g.fillRect(8, 12, 8, 1);
    g.fillStyle(0xffd070, 1);
    g.fillRect(10, 4, 2, 1);
    g.generateTexture("icon_workbench_t3", ICON, ICON);

    // --- enhanced weapons ---
    g.clear(); // Embersteel Warhammer — dark head with ember cracks
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(11, 4, 2, 18); // haft
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(5, 4, 14, 6); // head
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(6, 6, 4, 1); // ember crack
    g.fillRect(14, 5, 4, 1);
    g.fillStyle(0xffd070, 1);
    g.fillRect(7, 6, 1, 1);
    g.generateTexture("icon_embersteel_warhammer", ICON, ICON);

    g.clear(); // Embersteel Longsword — dark blade, glowing edge
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(11, 3, 3, 14); // blade
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(13, 4, 1, 12); // ember edge
    g.fillStyle(0x8a5a2e, 1);
    g.fillRect(8, 17, 9, 2); // guard
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(11, 19, 3, 4); // grip
    g.generateTexture("icon_embersteel_sword", ICON, ICON);

    g.clear(); // Embersteel Pike — dark tip with an ember core
    g.fillStyle(0x6b4a26, 1);
    g.fillRect(11, 8, 2, 15); // shaft
    g.fillStyle(0x3a2e34, 1);
    g.fillTriangle(12, 2, 8, 10, 16, 10); // tip
    g.fillStyle(0xff7a2a, 1);
    g.fillTriangle(12, 4, 10, 9, 14, 9); // ember core
    g.generateTexture("icon_embersteel_pike", ICON, ICON);

    g.clear(); // Embersteel Warbow — dark stave, ember string + ember arrowhead
    g.lineStyle(2, 0x3a2e34, 1);
    g.beginPath();
    g.arc(3, 12, 10, -Math.PI / 3, Math.PI / 3, false);
    g.strokePath();
    g.lineStyle(1, 0xff7a2a, 1);
    g.beginPath();
    g.moveTo(8, 3);
    g.lineTo(8, 21); // ember-glowing string
    g.strokePath();
    g.fillStyle(0x5a3a1c, 1);
    g.fillRect(8, 11, 12, 2); // ironbark shaft
    g.fillStyle(0xff7a2a, 1);
    g.fillTriangle(20, 9, 20, 15, 23, 12); // ember head
    g.generateTexture("icon_embersteel_warbow", ICON, ICON);

    // --- the first MAGIC weapon: Ember Brand (a searing fire-brand rod) ---
    g.clear();
    g.fillStyle(0x5c3a1c, 1);
    g.fillRect(11, 12, 2, 11); // handle
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(9, 9, 6, 4); // steel head
    g.fillStyle(0xff7a2a, 1); // ember flame
    g.fillTriangle(12, 1, 8, 9, 16, 9);
    g.fillStyle(0xffd070, 1);
    g.fillTriangle(12, 4, 10, 9, 14, 9);
    g.fillStyle(0xb266ff, 1); // gloamfire wisp
    g.fillRect(11, 3, 1, 2);
    g.generateTexture("icon_ember_brand", ICON, ICON);

    // --- enhanced HEAVY armor: Embersteel set (dark steel + ember cracks) ---
    g.clear(); // Embersteel Helm
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(5, 8, 14, 10);
    g.fillCircle(12, 8, 7);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(7, 11, 10, 3); // ember visor slit
    g.fillStyle(0x554450, 1);
    g.fillRect(4, 15, 16, 3);
    g.generateTexture("icon_embersteel_helm", ICON, ICON);

    g.clear(); // Embersteel Cuirass
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(5, 5, 14, 15);
    g.fillStyle(0x554450, 1);
    g.fillRect(2, 5, 4, 7);
    g.fillRect(18, 5, 4, 7);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(11, 6, 2, 12); // ember sternum ridge
    g.generateTexture("icon_embersteel_cuirass", ICON, ICON);

    g.clear(); // Embersteel Greaves
    g.fillStyle(0x3a2e34, 1);
    g.fillRect(6, 4, 5, 16);
    g.fillRect(13, 4, 5, 16);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(7, 5, 2, 12);
    g.fillRect(14, 5, 2, 12);
    g.generateTexture("icon_embersteel_greaves", ICON, ICON);

    // --- enhanced LIGHT armor: Emberhide set (dark hide + ember-steel bands) ---
    g.clear(); // Emberhide Hood
    g.fillStyle(0x4a3324, 1);
    g.fillRect(5, 8, 14, 10);
    g.fillCircle(12, 8, 7);
    g.fillStyle(0x5c4328, 1);
    g.fillRect(4, 15, 16, 3);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(6, 10, 12, 1); // ember-steel band
    g.generateTexture("icon_emberhide_hood", ICON, ICON);

    g.clear(); // Emberhide Vest
    g.fillStyle(0x4a3324, 1);
    g.fillRect(5, 5, 14, 15);
    g.fillStyle(0x3a2820, 1);
    g.fillRect(2, 5, 4, 7);
    g.fillRect(18, 5, 4, 7);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(6, 9, 12, 1); // ember straps
    g.fillRect(6, 14, 12, 1);
    g.generateTexture("icon_emberhide_vest", ICON, ICON);

    g.clear(); // Emberhide Leggings
    g.fillStyle(0x4a3324, 1);
    g.fillRect(6, 4, 5, 16);
    g.fillRect(13, 4, 5, 16);
    g.fillStyle(0x5c4328, 1);
    g.fillRect(7, 5, 3, 3);
    g.fillRect(14, 5, 3, 3);
    g.fillStyle(0xff7a2a, 1);
    g.fillRect(6, 12, 5, 1); // ember plate band
    g.fillRect(13, 12, 5, 1);
    g.generateTexture("icon_emberhide_leggings", ICON, ICON);

    // --- ability icons (B3-P2a) — gloam-violet glyphs; each doubles as the
    // granting "special" item's icon AND the Q/E/R ability-bar icon. ---
    g.clear(); // Gloamstep Blink — a violet dash-streak arrow with a faint echo
    g.fillStyle(0x5a2ea8, 0.5);
    g.fillRect(3, 14, 8, 3); // after-image trail
    g.fillStyle(0xb98cff, 1);
    g.fillRect(6, 11, 10, 3); // streak
    g.fillTriangle(15, 7, 15, 18, 22, 12); // arrowhead
    g.generateTexture("ability_blink", ICON, ICON);

    g.clear(); // Gloam Nova — a radial burst (ring + bright core + spikes)
    g.fillStyle(0x6a2fd0, 1);
    g.fillCircle(12, 12, 6);
    g.fillStyle(0xb98cff, 1);
    g.fillCircle(12, 12, 3);
    g.fillStyle(0x9a5cff, 1);
    g.fillRect(11, 1, 2, 5); // up spike
    g.fillRect(11, 18, 2, 5); // down
    g.fillRect(1, 11, 5, 2); // left
    g.fillRect(18, 11, 5, 2); // right
    g.generateTexture("ability_nova", ICON, ICON);

    g.clear(); // Bloodpact — a crimson lifelink droplet with a gloam sheen
    g.fillStyle(0xc0303a, 1);
    g.fillCircle(12, 15, 6);
    g.fillTriangle(6, 13, 18, 13, 12, 2); // pointed top
    g.fillStyle(0x9a5cff, 1);
    g.fillRect(9, 12, 2, 5); // violet gloam streak
    g.fillStyle(0xf0a0a8, 1);
    g.fillCircle(10, 13, 2); // glint
    g.generateTexture("ability_bloodpact", ICON, ICON);

    // Badlands elite trophies — crimson/gold to echo the elite palette (matches
    // the boar/snake/gremlin trophies), each with a species tell.
    g.clear(); // Duskrunner Trophy — a fanged canid skull on a gold cord
    g.fillStyle(0x6a1f3a, 1);
    g.fillCircle(12, 9, 5);
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(10, 12, 1, 4); // fang
    g.fillRect(13, 12, 1, 4);
    g.fillStyle(0xff8a3a, 1);
    g.fillRect(9, 7, 2, 2); // ember eye
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2); // gold cord
    g.generateTexture("icon_duskrunner_trophy", ICON, ICON);

    g.clear(); // Cragscale Trophy — a cracked crest-plate on a gold cord
    g.fillStyle(0x6a1f3a, 1);
    g.fillRect(7, 5, 10, 11);
    g.fillStyle(0x8a2f4a, 1);
    g.fillRect(9, 4, 2, 12); // crack line
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2);
    g.generateTexture("icon_cragscale_trophy", ICON, ICON);

    g.clear(); // Hexling Trophy — a smoldering hex-node on a gold cord
    g.fillStyle(0x6a1f3a, 1);
    g.fillTriangle(12, 3, 6, 15, 18, 15);
    g.fillStyle(0xc86ef0, 1);
    g.fillCircle(12, 11, 3); // gloam core
    g.fillStyle(0xff8a3a, 1);
    g.fillCircle(12, 11, 1);
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2);
    g.generateTexture("icon_hexling_trophy", ICON, ICON);

    g.clear(); // Sandmaw Trophy — a hooked bone mandible on a gold cord
    g.fillStyle(0x6a1f3a, 1);
    g.fillTriangle(6, 4, 17, 7, 9, 16);
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(6, 4, 11, 5, 8, 10); // bone hook tip
    g.fillStyle(0xffa93a, 1);
    g.fillRect(12, 9, 2, 2); // amber fleck
    g.fillStyle(0xf0c040, 1);
    g.fillRect(7, 16, 10, 2); // gold cord
    g.generateTexture("icon_sandmaw_trophy", ICON, ICON);

    g.destroy();
    this.makeLightTexture();
    this.makeForestFeatherTexture();
  }

  // Soft radial light gradient (white, opaque center -> transparent edge), used
  // by NightOverlayUI as the "erase brush" that carves smooth light holes in
  // the night darkness (M-DN). A true radial gradient needs the 2D canvas API —
  // Graphics can't do smooth radial alpha — so this one texture is canvas-drawn
  // rather than Graphics.generateTexture'd like the rest.
  private makeLightTexture(): void {
    const size = 256;
    const canvas = this.textures.createCanvas("light_soft", size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }

  // Soft-edged disc used as a BITMAP MASK for the crisp forest region (the grass
  // tilesprite + forest bake). Those layers are SQUARE (BIOME_SIZE), so their
  // edges met the blurry outer overlay as hard vertical/horizontal lines
  // (the user: "huge straight vertical and horizontal lines that don't blend").
  // Masking them with this disc fades the crisp core into the continuous outer
  // overlay as a soft circle instead. Opaque across the play area, ramping to 0
  // only in the outer ~22% so the whole forest stays crisp; the fade completes
  // by the mask's edge, which is scaled to sit inside the square.
  private makeForestFeatherTexture(): void {
    const size = 512;
    const canvas = this.textures.createCanvas("forest_feather", size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.78, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  }
}
