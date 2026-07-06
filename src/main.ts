import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MainScene } from "./scenes/MainScene";

// The single entry point: configure and launch the Phaser game.
// Scenes run in the order listed until one starts another.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL if available, else Canvas
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#12141a",
  pixelArt: true, // crisp scaling for pixel textures
  physics: {
    default: "arcade",
    arcade: {
      debug: false, // flip to true to see physics bodies
    },
  },
  scene: [BootScene, MainScene],
};

const game = new Phaser.Game(config);

// Dev aid: expose the running game on window so we can inspect state from the
// browser console while building. (Harmless to leave during development.)
(window as unknown as { __game: Phaser.Game }).__game = game;
