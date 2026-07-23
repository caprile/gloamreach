import Phaser from "phaser";
import { formatDuration, speedMultiplier, type Run } from "../systems/Run";
import type { ScoreEntry } from "../systems/HighScores";

export interface RunEndDeps {
  run: Run;
  level: number;
  entries: ScoreEntry[];
  rank: number; // 1-based rank of this run in the table (0 if off-table)
  characterLine?: string; // "Played as X — Modifier" (B4-P1); absent if unpicked
  onNewRun: () => void;
  onContinue: () => void; // only wired to a button on a win (keep exploring)
  onClearScores: () => void;
}

// Terminal run-end / score screen (M-R1). Full-screen scrim + centered panel,
// modeled on CharacterMenu's flat-GameObject / scrollFactor(0) pattern (no
// Containers — same input-hit-testing constraint the other menus document).
// Depths sit above every in-game menu (CharacterMenu et al. at 3000) so this
// always reads as "over," but below Tooltip (4500).
const DEPTH_SCRIM = 3500;
const DEPTH_PANEL = 3501;
const DEPTH_TEXT = 3502;
const PANEL_W = 480;
const PANEL_H = 540;
// The one place red/green are allowed (a win/lose state marker) — everywhere
// else they're reserved for buff/debuff deltas.
const WIN_COLOR = "#7ac27a";
const LOSE_COLOR = "#c25a5a";

export class RunEndUI {
  private scene: Phaser.Scene;
  private open = false;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private panelX: number;
  private panelY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
  }

  isOpen(): boolean {
    return this.open;
  }

  show(deps: RunEndDeps): void {
    if (this.open) return;
    this.open = true;

    const won = deps.run.outcome === "won";
    const cx = this.scene.scale.width / 2;

    // Full-screen scrim so the frozen world reads as finished.
    this.objects.push(
      this.scene.add
        .rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.72)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_SCRIM),
    );
    // Panel.
    this.objects.push(
      this.scene.add
        .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.97)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x555e6e)
        .setScrollFactor(0)
        .setDepth(DEPTH_PANEL),
    );

    let y = this.panelY + 22;
    this.text(cx, y, won ? "VICTORY!" : "YOU DIED", 30, won ? WIN_COLOR : LOSE_COLOR, 0.5);
    y += 44;
    this.text(cx, y, `Final Score  ${deps.run.score()}`, 20, "#ffffff", 0.5);
    y += 30;
    this.text(cx, y, `Seed ${deps.run.seed}`, 11, "#5b6472", 0.5);
    y += 18;
    // Which survivor (and which trade-off) this score belongs to — B4-P1.
    if (deps.characterLine) {
      this.text(cx, y, deps.characterLine, 12, "#8a93a3", 0.5);
      y += 20;
    }
    y += 12;

    // Breakdown block.
    const bx = this.panelX + 28;
    const line = (label: string, value: string) => {
      this.text(bx, y, label, 13, "#8a93a3");
      this.text(this.panelX + PANEL_W - 28, y, value, 13, "#c8d0dc", 1);
      y += 22;
    };
    line("Time", formatDuration(deps.run.elapsedMs));
    line("Kills", `${deps.run.kills}`);
    line("  Elite / Boss", `${deps.run.killsByCategory.elite} / ${deps.run.killsByCategory.boss}`);
    line("Player Level", `${deps.level}`);
    line("Kill Points", `${deps.run.killPoints()}`);
    if (won) {
      line("Completion Bonus", `${Math.round(deps.run.completionPoints())}`);
      line("  Speed Multiplier", `x${speedMultiplier(deps.run.elapsedMs).toFixed(2)}`);
    }
    y += 12;

    // High-score table (top 5), highlighting this run's row by rank.
    this.text(bx, y, "High Scores", 14, "#e3b25a");
    const clearBtn = this.scene.add
      .text(this.panelX + PANEL_W - 28, y, "[ Clear ]", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#7c8494",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => clearBtn.setColor("#c25a5a"))
      .on("pointerout", () => clearBtn.setColor("#7c8494"))
      .on("pointerdown", () => deps.onClearScores());
    this.objects.push(clearBtn);
    y += 22;
    const top = deps.entries.slice(0, 5);
    if (top.length === 0) {
      this.text(bx, y, "(none yet)", 12, "#5b6472");
      y += 20;
    }
    top.forEach((e, i) => {
      const isThis = deps.rank === i + 1;
      const color = isThis ? "#ffffff" : "#7c8494";
      const marker = isThis ? "> " : "  ";
      const tag = e.outcome === "won" ? "WIN" : "died";
      this.text(bx, y, `${marker}${i + 1}. ${e.score}`, 13, color);
      this.text(
        this.panelX + PANEL_W - 28,
        y,
        `${tag}  ${formatDuration(e.elapsedMs)}  ${e.seed}`,
        11,
        color,
        1,
      );
      y += 20;
    });

    // Buttons. On a win, offer "Continue" (keep exploring for end-to-end play)
    // alongside "New Run"; on a death (hardcore) only "New Run" is offered.
    const btnY = this.panelY + PANEL_H - 34;
    const mkButton = (bx: number, label: string, bg: string, onClick: () => void) =>
      this.objects.push(
        this.scene.add
          .text(bx, btnY, label, {
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#0a0a0a",
            backgroundColor: bg,
            padding: { x: 16, y: 8 },
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(DEPTH_TEXT)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", onClick),
      );

    if (won) {
      // Caveat: Continue steps past the current end-game target into unfinished
      // content — the run is already scored; death still ends it.
      this.text(
        cx,
        btnY - 24,
        "Continue = explore in-progress content past this boss (run already scored)",
        10,
        "#8a93a3",
        0.5,
      );
      mkButton(cx - 96, "[ Continue ]", "#7ac27a", () => deps.onContinue());
      mkButton(cx + 96, "[ New Run ]", "#e3b25a", () => deps.onNewRun());
    } else {
      mkButton(cx, "[ New Run ]", "#e3b25a", () => deps.onNewRun());
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    for (const o of this.objects) o.destroy();
    this.objects = [];
  }

  private text(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: "monospace", fontSize: `${size}px`, color })
      .setOrigin(originX, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.objects.push(t);
    return t;
  }
}
