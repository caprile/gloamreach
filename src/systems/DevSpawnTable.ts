import type Phaser from "phaser";
import type { Enemy } from "../entities/Enemy";
import { Boar } from "../entities/Boar";
import { Snake } from "../entities/Snake";
import { RangedGremlin, MeleeGremling } from "../entities/Gremlin";
import { Duskrunner } from "../entities/Duskrunner";
import { Cragscale } from "../entities/Cragscale";
import { Hexling } from "../entities/Hexling";
import { Sandmaw } from "../entities/Sandmaw";
import { GremlinKing } from "../entities/GremlinKing";
import { Gloamwarden } from "../entities/Gloamwarden";
import { Cinderwrought } from "../entities/Cinderwrought";
import { Duneshaper } from "../entities/Duneshaper";

// DEV-only spawn table for the `spawn <name>` console command. Kept in its
// own file (rather than inline in MainScene) so the name list is easy to
// scan/extend without wading through scene internals. Bosses ignore the
// `elite` flag — they have no elite variant.
type SpawnFactory = (scene: Phaser.Scene, x: number, y: number, elite: boolean) => Enemy;

export const DEV_ENEMY_SPAWN_TABLE: Record<string, SpawnFactory> = {
  boar: (scene, x, y, elite) => new Boar(scene, { x, y, elite }),
  snake: (scene, x, y, elite) => new Snake(scene, { x, y, elite }),
  gremlin: (scene, x, y, elite) => new RangedGremlin(scene, { x, y, elite }),
  ranged_gremlin: (scene, x, y, elite) => new RangedGremlin(scene, { x, y, elite }),
  gremling: (scene, x, y, elite) => new MeleeGremling(scene, { x, y, elite }),
  melee_gremling: (scene, x, y, elite) => new MeleeGremling(scene, { x, y, elite }),
  duskrunner: (scene, x, y, elite) => new Duskrunner(scene, { x, y, elite }),
  cragscale: (scene, x, y, elite) => new Cragscale(scene, { x, y, elite }),
  hexling: (scene, x, y, elite) => new Hexling(scene, { x, y, elite }),
  sandmaw: (scene, x, y, elite) => new Sandmaw(scene, { x, y, elite }),
  gremlin_king: (scene, x, y) => new GremlinKing(scene, { x, y }),
  gloamwarden: (scene, x, y) => new Gloamwarden(scene, { x, y }),
  cinderwrought: (scene, x, y) => new Cinderwrought(scene, { x, y }),
  duneshaper: (scene, x, y) => new Duneshaper(scene, { x, y }),
};
