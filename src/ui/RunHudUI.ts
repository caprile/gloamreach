import Phaser from "phaser";
import { formatDuration, type Run } from "../systems/Run";

// Live run readout (M-R1) — a compact clock + running score, anchored top-left.
// Depth sits in the fixed-HUD band (must clear WORLD_H so world sprites near
// the map's bottom edge don't render over it). Minimizable to just the clock
// via a keybind, per the user's request.
const DEPTH = 2820;
const X = 12;
const Y = 12;

export class RunHudUI {
  private text: Phaser.GameObjects.Text;
  private minimized = false;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add
      .text(X, Y, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH);
  }

  update(run: Run): void {
    const clock = formatDuration(run.elapsedMs);
    this.text.setText(
      this.minimized ? `T ${clock}` : `T ${clock}    Score ${run.score()}`,
    );
  }

  toggleMinimized(): void {
    this.minimized = !this.minimized;
  }
}
