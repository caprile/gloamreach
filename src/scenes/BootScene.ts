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

    // Player (20x20): body plus a lighter patch so it reads as a character.
    g.clear();
    g.fillStyle(0x3b6ea5, 1);
    g.fillRect(0, 0, 20, 20);
    g.fillStyle(0x8fc0ec, 1);
    g.fillRect(6, 4, 8, 6);
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

    // Boar — melee enemy. 26x20: brown body + a darker snout patch.
    g.clear();
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(2, 4, 22, 14);
    g.fillStyle(0x4a3018, 1);
    g.fillRect(0, 8, 6, 6); // snout
    g.generateTexture("boar", 26, 20);

    // Elite Boar (M-EL2) — same silhouette, crimson/gold recolor matching the
    // gremlin_elite palette so "elite" reads consistently across every enemy
    // type. The runtime setScale(1.3) stacks size on top, same pattern.
    g.clear();
    g.fillStyle(0x6a1f2a, 1); // crimson body
    g.fillRect(2, 4, 22, 14);
    g.fillStyle(0xf0c040, 1); // gold snout accent
    g.fillRect(0, 8, 6, 6);
    g.generateTexture("boar_elite", 26, 20);

    // Snake — hidden/ambush enemy. 20x8: long green body + darker head patch.
    // Low profile reads as "in the grass" even before the hidden-alpha fade
    // (Snake.ts) is applied.
    g.clear();
    g.fillStyle(0x3e6b2f, 1);
    g.fillRect(1, 2, 18, 4);
    g.fillStyle(0x274a1c, 1);
    g.fillRect(0, 1, 6, 6); // head
    g.generateTexture("snake", 20, 8);

    // Elite Snake (M-EL2) — same crimson/gold elite palette.
    g.clear();
    g.fillStyle(0x6a1f2a, 1);
    g.fillRect(1, 2, 18, 4);
    g.fillStyle(0xf0c040, 1);
    g.fillRect(0, 1, 6, 6);
    g.generateTexture("snake_elite", 20, 8);

    // Ranged Gremlin — stronger variant. 18x22: a squat purple-green
    // humanoid with a lighter belly patch, reads as "bigger/tougher" than the
    // melee variant below.
    g.clear();
    g.fillStyle(0x5a7a3a, 1);
    g.fillRect(2, 4, 14, 16);
    g.fillStyle(0x3f5a28, 1);
    g.fillRect(4, 0, 10, 6); // head
    g.fillStyle(0x8ab05a, 1);
    g.fillRect(5, 10, 8, 6); // belly highlight
    g.generateTexture("gremlin", 18, 22);

    // Gremling — weaker melee-only variant. Smaller (14x16), duller color, no
    // belly highlight, so it visually reads as the lesser threat.
    g.clear();
    g.fillStyle(0x4a5a3a, 1);
    g.fillRect(1, 3, 12, 12);
    g.fillStyle(0x33421f, 1);
    g.fillRect(3, 0, 8, 5); // head
    g.generateTexture("gremling_weak", 14, 16);

    // Elite Gremlin variants (Gremlin Shack guards) — same silhouettes as the
    // normal gremlin/gremling above, recolored to a menacing crimson/dark-purple
    // palette with a gold accent so they read as "elite" at a glance. The runtime
    // setScale(1.4) stacks further size on top (mirrors how gremlin_king is a
    // base texture scaled by BOSS_SCALE). Base dims match their normal counterparts.
    g.clear();
    g.fillStyle(0x6a1f3a, 1); // crimson body
    g.fillRect(2, 4, 14, 16);
    g.fillStyle(0x3f1030, 1); // dark head
    g.fillRect(4, 0, 10, 6);
    g.fillStyle(0xf0c040, 1); // gold belly accent
    g.fillRect(5, 10, 8, 6);
    g.generateTexture("gremlin_elite", 18, 22);

    g.clear();
    g.fillStyle(0x5a1830, 1); // crimson body (duller than ranged)
    g.fillRect(1, 3, 12, 12);
    g.fillStyle(0x33101f, 1); // dark head
    g.fillRect(3, 0, 8, 5);
    g.fillStyle(0xf0c040, 1); // gold accent stripe
    g.fillRect(3, 8, 8, 2);
    g.generateTexture("gremling_elite", 14, 16);

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

    // Gremlin King — boss reskin: a big Troll/Ogre-silhouette humanoid, 40x48
    // (before the runtime BOSS_SCALE multiplier stacks further size on top).
    // Same green-gremlin palette family as the rest of the roster (reads as
    // "gremlin, but massive") with heavier proportions and visible tusks to
    // read as a boss at a glance, not just a bigger regular enemy.
    g.clear();
    g.fillStyle(0x445a2e, 1);
    g.fillRect(4, 10, 32, 34); // torso
    g.fillStyle(0x2f3f1f, 1);
    g.fillRect(8, 0, 24, 14); // head
    g.fillStyle(0xe8e0cc, 1);
    g.fillRect(9, 10, 4, 6); // left tusk
    g.fillRect(27, 10, 4, 6); // right tusk
    g.fillStyle(0x6a8a3e, 1);
    g.fillRect(10, 20, 20, 14); // chest highlight
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

    // Gloamwarden — the vein's guardian mini-boss. An amethyst-mutated gremlin
    // brute: the gremlin_king silhouette (so it reads as "gremlin, but warped")
    // recolored to a dark violet with glowing purple crystal growths. 34x42,
    // smaller than the King's 40x48 base — difficulty sits between an elite and
    // the King (runtime GLOAMWARDEN_SCALE stacks size on top).
    g.clear();
    g.fillStyle(0x3a2b52, 1);
    g.fillRect(4, 9, 26, 30); // violet torso
    g.fillStyle(0x281c3a, 1);
    g.fillRect(7, 0, 20, 12); // head
    g.fillStyle(0x9a5ee8, 1);
    g.fillTriangle(2, 20, 6, 10, 8, 22); // left shoulder crystal
    g.fillTriangle(32, 20, 28, 10, 26, 22); // right shoulder crystal
    g.fillStyle(0xc79cf0, 1);
    g.fillRect(12, 16, 10, 10); // glowing chest core
    g.fillStyle(0xe8d0ff, 1);
    g.fillRect(11, 4, 3, 3); // eye
    g.fillRect(20, 4, 3, 3); // eye
    g.generateTexture("gloamwarden", 34, 42);

    this.makeItemIcons(g);

    g.destroy(); // we only needed it to bake textures
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

    // Javelin: long thin shaft with a pale bone tip, slimmer than the spear.
    g.clear();
    g.fillStyle(0x7a4a22, 1);
    g.fillRect(11, 6, 2, 16);
    g.fillStyle(0xe8e0cc, 1);
    g.fillTriangle(9, 6, 15, 6, 12, 0);
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

    g.destroy();
    this.makeLightTexture();
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
}
