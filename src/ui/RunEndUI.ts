import Phaser from "phaser";
import { formatDuration, speedMultiplier, type Run } from "../systems/Run";
import type { ScoreEntry } from "../systems/HighScores";
import type { Bucket, RunLog } from "../systems/RunLog";

export interface RunEndDeps {
  run: Run;
  // Per-run attribution (D7). Rendered as a second column: what dealt your
  // damage, what kept you alive, what hurt you, and a milestone timeline.
  runLog: RunLog;
  level: number;
  entries: ScoreEntry[];
  rank: number; // 1-based rank of this run in the table (0 if off-table)
  characterLine?: string; // "Played as X — Modifier" (B4-P1); absent if unpicked
  onNewRun: () => void;
  onContinue: () => void; // only wired to a button on a win (keep exploring)
  onClearScores: () => void;
  // Escape hatch on the death screen: respawn where you fell at full HP/stamina
  // and keep playing (test-mode). Currently wired in production too (see
  // MainScene); leave optional so it can be gated off again later.
  onDevContinue?: () => void;
}

// Terminal run-end / score screen (M-R1). Full-screen scrim + centered panel,
// modeled on CharacterMenu's flat-GameObject / scrollFactor(0) pattern (no
// Containers — same input-hit-testing constraint the other menus document).
// Depths sit above every in-game menu (CharacterMenu et al. at 3000) so this
// always reads as "over," but below Tooltip (4500).
const DEPTH_SCRIM = 3500;
const DEPTH_PANEL = 3501;
const DEPTH_TEXT = 3502;
// Two columns since D7: score/high-scores on the left, the run summary on the
// right. The summary is the point of the screen for balancing, so it gets equal
// billing rather than being buried under the table.
const COL_W = 480;
const SUMMARY_W = 420;
const PANEL_W = COL_W + SUMMARY_W;
// Sized against the summary column's WORST case, not a typical one: every
// block at its row limit plus the timeline runs ~640px, and a sparse test run
// hides that (caught in verification — the first pass at 600 fit the test data
// and would have overflowed a real run).
const PANEL_H = 844;
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
    // Left column's centre — NOT the panel's, now that a summary column sits
    // to the right of it.
    const cx = this.panelX + COL_W / 2;

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
      this.text(this.panelX + COL_W - 28, y, value, 13, "#c8d0dc", 1);
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
      .text(this.panelX + COL_W - 28, y, "[ Clear ]", {
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
        this.panelX + COL_W - 28,
        y,
        `${tag}  ${formatDuration(e.elapsedMs)}  ${e.seed}`,
        11,
        color,
        1,
      );
      y += 20;
    });

    this.renderSummary(deps);

    // Buttons. On a win, offer "Continue" (keep exploring for end-to-end play)
    // alongside "New Run"; on a death (hardcore) only "New Run" is offered.
    const btnY = this.panelY + PANEL_H - 34;
    const pcx = this.panelX + PANEL_W / 2;
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
        pcx,
        btnY - 24,
        "Continue = explore in-progress content past this boss (run already scored)",
        10,
        "#8a93a3",
        0.5,
      );
      mkButton(pcx - 96, "[ Continue ]", "#7ac27a", () => deps.onContinue());
      mkButton(pcx + 96, "[ New Run ]", "#e3b25a", () => deps.onNewRun());
    } else if (deps.onDevContinue) {
      // Death screen in a DEV build: offer a test-mode continue that respawns
      // you where you fell (full HP/stamina, nearby enemies sent home) so the
      // run's later content can be reached without a clean playthrough.
      this.text(
        pcx,
        btnY - 24,
        "Continue = test mode: respawn here at full HP, deaggro nearby enemies",
        10,
        "#8a93a3",
        0.5,
      );
      mkButton(pcx - 108, "[ Continue (test) ]", "#7ac27a", () => deps.onDevContinue!());
      mkButton(pcx + 96, "[ New Run ]", "#e3b25a", () => deps.onNewRun());
    } else {
      mkButton(pcx, "[ New Run ]", "#e3b25a", () => deps.onNewRun());
    }
  }

  // The run summary column (D7). Attribution, not an event list: which slice of
  // an attack dealt the damage, which of the concurrent lifesteal sources
  // actually carried the run, what hurt you, and when the run's turning points
  // landed. Sized to the buckets RunLog aggregates — see its header for why
  // these four and not a craft log.
  private renderSummary(deps: RunEndDeps): void {
    const log = deps.runLog;
    const x = this.panelX + COL_W + 8;
    const right = this.panelX + PANEL_W - 24;
    let y = this.panelY + 22;

    this.text(x, y, "Run Summary", 16, "#e3b25a");
    y += 26;

    // A titled block of "label ......... value (pct%)" rows, with an explicit
    // tail line for whatever the row limit is hiding. An empty bucket still
    // prints its heading with a dash, so "nothing healed you all run" is visible
    // information rather than a missing section.
    const block = (title: string, rows: Bucket[], total: string, hidden?: { count: number; value: number }) => {
      this.text(x, y, title, 13, "#c8d0dc");
      this.text(right, y, total, 12, "#8a93a3", 1);
      y += 19;
      if (rows.length === 0) {
        this.text(x + 10, y, "—", 12, "#5b6472");
        y += 17;
      }
      for (const r of rows) {
        this.text(x + 10, y, r.label, 12, "#8a93a3");
        this.text(right, y, `${r.value}  (${Math.round(r.pct)}%)`, 12, "#7c8494", 1);
        y += 17;
      }
      // Never truncate silently: a top-5 across three biomes' worth of species
      // drops a long tail, and a summary that hides that is worse than no
      // summary because it reads as complete.
      if (hidden && hidden.count > 0) {
        this.text(x + 10, y, `+${hidden.count} more`, 12, "#5b6472");
        this.text(right, y, `${hidden.value}`, 12, "#5b6472", 1);
        y += 17;
      }
      y += 8;
    };

    block("Damage Dealt", log.topDamageDealt(5), `${log.totalDealt()}`, log.hiddenDamageDealt(5));
    block("Healing Received", log.topHealing(4), `${log.totalHealed()}`, log.hiddenHealing(4));
    block("Damage Taken", log.topDamageTaken(5), `${log.totalTaken()}`, log.hiddenDamageTaken(5));
    block("Kills", log.topKills(4), `${deps.run.kills}`, log.hiddenKills(4));

    // Relic rolls are TALLIED, not listed. A long run makes 30+ of them, so any
    // "last N" view hides most of the evidence — the whole reason the ledger
    // exists is to answer questions like "four Rares in a row, is that even
    // possible?", which needs the totals, not the tail.
    const relics = log.relicSummary();
    block(
      "Relic Rolls",
      log.relicTally(),
      relics.attempts ? `${relics.successes}/${relics.attempts}` : "0",
    );

    // Boss kills only (the user, after miniboss/relic/biome all turned out to be
    // noise: "the only milestones I care about are the boss ones") — a handful
    // of entries at most, so no scroll/truncation concern here; the cap below
    // is just a defensive bound, not an expected case.
    const marksTotal = log.milestones.length;
    this.text(x, y, "Boss Kills", 13, "#c8d0dc");
    // Capped at 6 (not a bigger defensive number) because that's what the
    // panel height below is actually verified against.
    if (marksTotal > 6) this.text(right, y, `last 6 of ${marksTotal}`, 12, "#5b6472", 1);
    y += 19;
    const marks = log.milestones.slice(-6);
    if (marks.length === 0) {
      this.text(x + 10, y, "—", 12, "#5b6472");
      y += 17;
    }
    for (const m of marks) {
      this.text(x + 10, y, formatDuration(m.atMs), 12, "#5b6472");
      this.text(x + 66, y, m.text, 12, "#8a93a3");
      y += 17;
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
