// Base movement constants, kept in a Phaser-FREE module on purpose.
//
// PLAYER_WALK_SPEED used to live in entities/Player.ts, which imports Phaser.
// Skills.ts reads it (Running's impact tooltip quotes a real sprint speed), so
// importing it from there made Skills — and anything importing Skills — pull
// the whole engine in. That's fine inside the game, but the balancing dashboard
// (src/dashboard) deliberately imports the same source-of-truth data modules
// and must stay Phaser-free. Player.ts re-exports this so every existing
// `import { PLAYER_WALK_SPEED } from "../entities/Player"` keeps working.
export const PLAYER_WALK_SPEED = 95; // pixels per second
