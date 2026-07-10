import Phaser from "phaser";
import { Enemy } from "./Enemy";

// Boar previously had no dedicated class — MainScene constructed a bare
// `Enemy` directly at both spawn sites with the same inline stat/loot
// literal. Pulled into its own file (mirrors Gremlin.ts's precedent) so the
// elite variant (M-EL2) has one place to compute stats instead of
// duplicating an `elite ? x*1.5 : x` ternary at every call site. Boar's
// chase/wander/bite behavior is entirely Enemy's base state machine — this
// class adds no new update() logic, just config + elite scaling.

const MAX_HEALTH = 20;
const BITE_DAMAGE = 25;

export class Boar extends Enemy {
  constructor(scene: Phaser.Scene, cfg: { x: number; y: number; elite?: boolean }) {
    const elite = cfg.elite ?? false;
    super(scene, {
      x: cfg.x,
      y: cfg.y,
      texture: elite ? "boar_elite" : "boar",
      displayName: elite ? "Elite Boar" : "Boar",
      loot: elite
        ? [
            { resource: "boar_meat", min: 2, max: 2 },
            { resource: "bones", min: 2, max: 2 },
          ]
        : [
            { resource: "boar_meat", min: 1, max: 1 },
            { resource: "bones", min: 1, max: 1 },
          ],
      maxHealth: elite ? Math.round(MAX_HEALTH * 1.5) : MAX_HEALTH,
      biteDamage: elite ? Math.round(BITE_DAMAGE * 1.5) : BITE_DAMAGE,
    });
    if (elite) {
      this.elite = true;
      this.speedMult = 1.1;
      this.setScale(1.3);
    }
  }
}
