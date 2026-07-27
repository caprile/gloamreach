import Phaser from "phaser";
import {
  WEAPON_SKILLS,
  ARMOR_SKILLS,
  GENERAL_SKILLS,
  MAX_SKILL_LEVEL,
  skillDisplayName,
  skillXpToNext,
  skillImpactDescription,
  type Skills,
  type SkillType,
} from "../systems/Skills";
import {
  STAT_POINT_CAP,
  STAT_TYPES,
  statDisplayName,
  statDescription,
  statTotalEffect,
  xpToNextPlayerLevel,
  type PlayerProgression,
  type StatType,
} from "../systems/Progression";
import { affinityLines, type RunCharacter } from "../systems/Characters";
import { bindFrame } from "./frames";

export interface CharacterMenuDeps {
  skills: Skills;
  progression: PlayerProgression;
  allocate: (stat: StatType, count?: number) => void;
  // A GETTER, not a reference: applyCharacter replaces MainScene's RunCharacter
  // instance, so holding the object here would go stale after the picker.
  character: () => RunCharacter;
  // D9: whether Strength/Agility's crit contribution is already at the total
  // (weapon + relics + gear-augment) cap. Unlike Wisdom's ability-cooldown cap
  // (self-contained in Progression.ts — see wisdomAbilityCdrCapped), crit
  // caps depend on the whole build, so this reads live off the equipped
  // weapon rather than being a fixed point threshold. Optional so a caller
  // that doesn't care (there is only one — MainScene) isn't forced to wire it.
  // True when `stat`'s only axis is already saturated against the live build, so
  // further points are dead. Owned by the scene (needs weapon/relic context).
  axisSaturated?: (stat: StatType) => boolean;
  // How much room is left on `stat`'s capped axis, and what's using it up.
  // axisSaturated is a cliff — it only fires once the axis is already dead. This
  // is the approach to that cliff, so a player can see a relic eating their crit
  // budget before they spend into it. Null for stats with no build-dependent cap.
  axisHeadroom?: (stat: StatType) => { summary: string; sources: string } | null;
}


const PANEL_W = 460;
const PANEL_H = 520;
const DEPTH_BG = 3000;
const DEPTH_ITEM = 3001;
const DEPTH_TEXT = 3002;

const SKILL_GROUPS: { label: string; skills: SkillType[] }[] = [
  { label: "Weapon", skills: WEAPON_SKILLS },
  { label: "Armor", skills: ARMOR_SKILLS },
  { label: "General", skills: GENERAL_SKILLS },
];

// Full-page "Character" popup (key K), styled like UpgradeMenu/CraftingMenu.
// Two tabs: Skills (all skill types grouped, each with a level + XP bar) and
// Stats (player level/XP, unspent points, and a "+" per stat). Flat
// scrollFactor(0) objects only — no Containers (the same input-hit-testing
// constraint the other menus document).
export class CharacterMenu {
  private scene: Phaser.Scene;
  private deps: CharacterMenuDeps;
  private bg: Phaser.GameObjects.Rectangle;
  private open = false;
  private tab: "class" | "skills" | "stats" = "skills";
  private rows: Phaser.GameObjects.GameObject[] = [];

  private panelX: number;
  private panelY: number;
  // Persistent (not rebuilt every render, unlike `rows`) — a small hover
  // tooltip for a skill row's mechanical impact, "if applicable" per the user.
  private tooltip: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, deps: CharacterMenuDeps) {
    this.scene = scene;
    this.deps = deps;
    this.panelX = scene.scale.width / 2 - PANEL_W / 2;
    this.panelY = scene.scale.height / 2 - PANEL_H / 2;
    this.bg = scene.add
      .rectangle(this.panelX, this.panelY, PANEL_W, PANEL_H, 0x0a0a0a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x555e6e)
      .setScrollFactor(0)
      .setDepth(DEPTH_BG)
      .setVisible(false);
    bindFrame(this.bg, "panel");
    this.tooltip = scene.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe08a",
        backgroundColor: "#000000cc",
        padding: { x: 6, y: 4 },
        wordWrap: { width: 300 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT + 10)
      .setVisible(false);
  }

  toggle(): void {
    this.open ? this.close() : this.openMenu();
  }

  openMenu(): void {
    this.open = true;
    // Nudge the player toward spending points they're sitting on — default
    // to the Stats tab whenever they have any unspent, recomputed fresh on
    // every open (not remembered across opens) so it always reflects
    // whether points are currently available.
    this.tab = this.deps.progression.unspentPoints > 0 ? "stats" : "skills";
    this.bg.setVisible(true);
    this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.bg.setVisible(false);
    this.tooltip.setVisible(false);
    this.clearRows();
  }

  isOpen(): boolean {
    return this.open;
  }

  refresh(): void {
    if (this.open) this.render();
  }

  containsPoint(screenX: number, screenY: number): boolean {
    if (!this.open) return false;
    return (
      screenX >= this.panelX &&
      screenX <= this.panelX + PANEL_W &&
      screenY >= this.panelY &&
      screenY <= this.panelY + PANEL_H
    );
  }

  private clearRows(): void {
    for (const r of this.rows) r.destroy();
    this.rows = [];
  }

  private render(): void {
    this.clearRows();
    this.tooltip.setVisible(false);
    const x0 = this.panelX + 16;
    let y = this.panelY + 14;

    this.text(x0, y, "Character", 16, "#ffffff");
    const closeText = this.text(this.panelX + PANEL_W - 16, y, "[ESC] Close", 11, "#5b6472", 1, 0);
    closeText.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.close());
    y += 30;

    // Tabs
    let tx = x0;
    for (const t of ["class", "skills", "stats"] as const) {
      const active = this.tab === t;
      const label = t === "class" ? "Class" : t === "skills" ? "Skills" : "Stats";
      const tab = this.scene.add
        .text(tx, y, label, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: active ? "#ffffff" : "#8a93a3",
          backgroundColor: active ? "#2a3a55" : undefined,
          padding: { x: 6, y: 3 },
        })
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.tab = t;
          this.render();
        });
      this.rows.push(tab);
      tx += tab.width + 8;
    }
    y += 34;

    if (this.tab === "class") this.renderClassTab(x0, y);
    else if (this.tab === "skills") this.renderSkillsTab(x0, y);
    else this.renderStatsTab(x0, y);
  }

  // Everything the run-start picker told you, still readable after you picked.
  // The card is gone the moment the run begins, so a player 90 minutes in had
  // no way back to their own class's rules (the user playtest: "I picked a
  // starting class but I can't find the info on my class after I pick it").
  // Text is DERIVED (affinityLines) for the same reason the picker card derives
  // it — two hand-written copies of the same numbers drift.
  private renderClassTab(x0: number, startY: number): void {
    let y = startY;
    const def = this.deps.character().def;
    if (!def) {
      this.text(x0, y, "No class selected for this run.", 12, "#8a93a3");
      return;
    }

    this.text(x0, y, def.name, 15, "#ffffff");
    y += 22;
    // Every line below is DATA (a blurb, a modifier line, a derived affinity
    // line) rather than layout-authored copy, so each wraps to the panel and
    // advances by its own MEASURED height — a fixed step would re-create the
    // overlap one wrapped line lower down instead of at the blurb.
    y += this.text(x0, y, def.blurb, 11, "#8a93a3", 0, 0, this.wrapTo(x0)).height + 10;

    this.text(x0, y, `Trait — ${def.modifier.name}`, 12, "#e3b25a");
    y += 20;
    for (const line of [...def.modifier.boons, ...def.modifier.banes]) {
      y += this.text(x0 + 8, y, line, 12, "#c8d0dc", 0, 0, this.wrapTo(x0 + 8)).height + 4;
    }
    y += 10;

    const { boons, banes } = affinityLines(def);
    if (boons.length > 0 || banes.length > 0) {
      this.text(x0, y, "Affinities", 12, "#e3b25a");
      y += 20;
      for (const line of [...boons, ...banes]) {
        y += this.text(x0 + 8, y, line, 12, "#c8d0dc", 0, 0, this.wrapTo(x0 + 8)).height + 4;
      }
    }
  }

  private renderSkillsTab(x0: number, startY: number): void {
    let y = startY;
    for (const group of SKILL_GROUPS) {
      this.text(x0, y, group.label, 12, "#e3b25a");
      y += 20;
      for (const skill of group.skills) {
        this.renderSkillRow(skill, x0 + 8, y);
        y += 24;
      }
      y += 6;
    }
  }

  private renderSkillRow(skill: SkillType, x: number, y: number): void {
    this.text(x, y, skillDisplayName(skill), 12, "#c8d0dc");

    const barX = x + 130;
    const barW = 150;
    const barH = 10;
    const barY = y + 3;
    const maxed = this.deps.skills.get(skill) >= MAX_SKILL_LEVEL;
    const need = skillXpToNext(this.deps.skills.get(skill));
    const frac = maxed ? 1 : need > 0 ? this.deps.skills.getXp(skill) / need : 0;
    this.rows.push(
      this.scene.add
        .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM),
    );
    this.rows.push(
      this.scene.add
        .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0x8a5cd0, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setScale(Phaser.Math.Clamp(frac, 0, 1), 1),
    );

    const lvlLabel = maxed ? "MAX" : `Lvl ${this.deps.skills.get(skill)}`;
    // Neutral amber (not green) — green/red are reserved for buff/debuff
    // deltas (e.g. "boosted by an item"), not plain milestone status.
    this.text(barX + barW + 10, y, lvlLabel, 12, maxed ? "#e3b25a" : "#9aa4b5");

    // Hover impact tooltip — every skill row is hoverable now, showing its
    // live-computed current impact (including an explicit "no effect yet"
    // message for skills that only gate recipes today) so leveling always
    // shows what it's actually doing, not just a generic per-level rate.
    // skillImpactDescription stays character-free (Skills.ts is a framework-free
    // system file and shouldn't learn about run characters) — the class's XP
    // affinity is appended here instead.
    let impact = skillImpactDescription(skill, this.deps.skills);
    const xpMult = this.deps.character().skillXpMult(skill);
    if (xpMult !== 1) {
      const pct = Math.round(Math.abs(xpMult - 1) * 100);
      impact += `\n${this.deps.character().name()}: ${xpMult > 1 ? "+" : "-"}${pct}% XP gained in this skill`;
    }
    const hit = this.scene.add
      .rectangle(x, y - 2, barX + barW + 60 - x, 20, 0x000000, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT)
      .setInteractive({ useHandCursor: false })
      .on("pointerover", () => {
        this.tooltip.setText(impact).setPosition(x, y + 16).setVisible(true);
      })
      .on("pointerout", () => this.tooltip.setVisible(false));
    this.rows.push(hit);
  }

  private renderStatsTab(x0: number, startY: number): void {
    let y = startY;
    const p = this.deps.progression;

    this.text(x0, y, `Player Level ${p.level}`, 15, "#ffffff");
    y += 24;

    // Player XP bar (wider than the skill bars) with numeric progress.
    const need = xpToNextPlayerLevel(p.level);
    const barW = PANEL_W - 32;
    const barH = 14;
    this.rows.push(
      this.scene.add
        .rectangle(x0, y, barW, barH, 0x1a1f2a, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x3a4250)
        .setScrollFactor(0)
        .setDepth(DEPTH_ITEM),
    );
    this.rows.push(
      this.scene.add
        .rectangle(x0 + 1, y + 1, barW - 2, barH - 2, 0x8a5cd0, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setScale(Phaser.Math.Clamp(need > 0 ? p.xp / need : 0, 0, 1), 1),
    );
    this.text(x0 + barW / 2, y + barH / 2, `${Math.floor(p.xp)} / ${need} XP`, 10, "#ffffff", 0.5, 0.5);
    y += 26;

    // Neutral amber (not green) as the call-to-action color — green/red are
    // reserved for buff/debuff deltas, not "you have something to do" state.
    this.text(x0, y, `Unspent points: ${p.unspentPoints}`, 13, p.unspentPoints > 0 ? "#e3b25a" : "#9aa4b5");
    y += 28;

    for (const stat of STAT_TYPES) {
      this.renderStatRow(stat, x0, y);
      y += 52;
    }
  }

  private renderStatRow(stat: StatType, x0: number, y: number): void {
    const p = this.deps.progression;

    // Two independent reasons a point would be wasted here, both of which BLOCK
    // allocation rather than just annotating it (the user's Ascetic run poured 76
    // points into an already-saturated Strength and the sheet only said so after
    // the fact):
    //   • the universal STAT_POINT_CAP, and
    //   • a SINGLE-AXIS stat whose only effect is already saturated against the
    //     live build (Strength/Agility crit — see MainScene.statAxisSaturated,
    //     which is also what actually enforces it at the allocate site, so this
    //     is presentation of one rule rather than a second copy of it).
    const axisDead = this.deps.axisSaturated?.(stat) ?? false;
    const atCap = p.atPointCap(stat);
    const canSpend = p.unspentPoints > 0 && !atCap && !axisDead;

    // A class's stat potency changes what each point is WORTH, so mark the row
    // — the "Now:" line below already reflects it (statTotalEffect reads the
    // getters), but without this the player can't tell why the numbers differ.
    const potency = p.potency(stat);
    const label = this.text(
      x0,
      y,
      `${statDisplayName(stat)}: ${p.statValue(stat)} / ${STAT_POINT_CAP}`,
      13,
      "#ffffff",
    );
    if (potency !== 1) {
      const mark = `x${potency.toFixed(2).replace(/\.?0+$/, "")} per point`;
      this.text(x0 + label.width + 8, y + 1, mark, 11, "#8a6ec0");
    }
    this.text(x0, y + 17, statDescription(stat), 10, "#5b6472");
    // Current cumulative effect of the points already spent (playtest ask) —
    // amber to set it apart from the grey per-point rate above it.
    // D9: append a plain-language "CAPPED" note once further points on this
    // AXIS stop doing anything — Wisdom's ability-cooldown line is the one
    // that prompted this (100 points reaches it, nothing said so), but the
    // same silent-dead-point trap applies to Strength/Agility's crit
    // contribution once it's saturated against the current build.
    // Note the ordering: MAXED (the point cap) outranks a saturated axis, since
    // it's the stricter statement — a stat at 100/100 can't take points whether
    // or not its axis still had room.
    // Kept short on purpose: this line sits directly under the allocation
    // buttons, and the long-form wording ran to within 1px of them. The row
    // label already reads "Vitality: 100 / 100", so "(MAXED)" loses nothing.
    const note = atCap
      ? "  (MAXED)"
      : axisDead
        ? "  (CAPPED — axis maxed)"
        : stat === "wisdom" && p.wisdomAbilityCdrCapped()
          ? "  (cooldown maxed)"
          : "";
    const nowLine = this.text(x0, y + 31, `Now: ${statTotalEffect(stat, p)}${note}`, 11, "#e3b25a");

    // Approach-to-the-cap readout, appended to the same line rather than given
    // its own — the stat rows are on a fixed 52px pitch with three lines already,
    // and a fourth would need the whole panel to grow. Only Strength/Agility
    // return anything (see MainScene.statAxisHeadroom); suppressed once the row
    // already says MAXED/CAPPED, which is the stronger statement.
    const headroom = !atCap && !axisDead ? (this.deps.axisHeadroom?.(stat) ?? null) : null;
    if (headroom) {
      const tail = this.text(x0 + nowLine.width + 8, y + 31, headroom.summary, 11, "#9aa4b5");
      // The per-source breakdown answers "is a RELIC eating my crit budget?",
      // which is the question that prompted all of this. On hover, via the same
      // invisible hit-rect + shared tooltip the Skills tab rows use.
      const hit = this.scene.add
        .rectangle(tail.x, tail.y - 2, tail.width, tail.height + 4, 0x000000, 0)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: false })
        .on("pointerover", () => {
          this.tooltip.setText(headroom.sources).setPosition(x0, y + 46).setVisible(true);
        })
        .on("pointerout", () => this.tooltip.setVisible(false));
      this.rows.push(hit);
    }

    // Allocation buttons, right-aligned: [ + ] and a batch [ +5 ] (a 100-point
    // stat is a lot of individual clicks). Both grey out and no-op together, and
    // +5 clamps against the pool AND the cap inside allocate(), so it can never
    // overshoot — it just banks whatever fits.
    let bx = this.panelX + PANEL_W - 16;
    for (const step of [5, 1]) {
      const enabled = canSpend && p.pointsUntilCap(stat) > 0;
      const btn = this.scene.add
        // y+1 rather than y+4: the button box is 26px tall and the "Now:" line
        // sits at y+31, so this keeps a real gap instead of a 1px one.
        .text(bx, y + 1, step === 1 ? "[ + ]" : `[ +${step} ]`, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: enabled ? "#0a0a0a" : "#4a4a4a",
          backgroundColor: enabled ? "#e3b25a" : "#2a2a2a",
          padding: { x: 8, y: 4 },
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH_TEXT)
        .setInteractive({ useHandCursor: enabled })
        .on("pointerdown", () => {
          if (enabled) this.deps.allocate(stat, step);
        });
      this.rows.push(btn);
      bx -= btn.width + 6;
    }
  }

  private text(
    x: number,
    y: number,
    str: string,
    size: number,
    color: string,
    originX = 0,
    originY = 0,
    // Wrap width in px. Off by default (every other caller writes short,
    // hand-sized lines), but any line that comes from DATA rather than the
    // layout — a class blurb, a derived affinity line — has no width budget the
    // layout can rely on and must pass one (the user: "class description
    // overlaps class box"). Callers use `wrapTo()` for the panel's own margin.
    wrapWidth?: number,
  ): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: `${size + 1}px`,
        color,
        ...(wrapWidth ? { wordWrap: { width: wrapWidth } } : {}),
      })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH_TEXT);
    this.rows.push(t);
    return t;
  }

  // Space left from an x position to the panel's right margin.
  private wrapTo(x: number): number {
    return this.panelX + PANEL_W - 16 - x;
  }
}
