import Phaser from "phaser";
import { ysortDepth } from "../systems/depth";

export const PLAYER_WALK_SPEED = 95; // pixels per second
const DASH_SPEED = 450; // px/s during a dash burst — sharp snap, not a glide
// Exported so MainScene can time the Emberblink set-bonus landing burst to the
// exact frame the dash ends (fire erupts where the dash puts the player down).
export const DASH_DURATION_MS = 105; // how long the burst overrides normal movement
const DASH_COOLDOWN_MS = 600; // minimum time between dashes, independent of stamina

export type Facing = "up" | "down" | "left" | "right";

// Per-frame report so MainScene can apply stamina costs without duplicating
// Player's input-reading logic.
export interface PlayerFrameResult {
  moving: boolean;
  sprinting: boolean; // moving && canSprint && shift held
  dashStarted: boolean; // true only on the frame a dash begins (for stamina spend)
  facing: Facing; // current facing; persists while idle
}

// The player character. It owns its own input and movement so MainScene stays
// focused on the world. Movement supports both WASD and the arrow keys, and is
// normalized so diagonal movement isn't faster than straight lines.
export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private shiftKey: Phaser.Input.Keyboard.Key;
  private spaceKey: Phaser.Input.Keyboard.Key;
  private lastDashAt = -Infinity;
  private dashingUntil = 0;
  private sprintLocked = false; // stamina ran out mid-sprint; needs shift release+re-press
  private facing: Facing = "down";
  private equippedIcon: Phaser.GameObjects.Image | null = null;
  private equippedIconTexture: string | null = null;
  private static readonly ICON_OFFSET = 16; // px from player center, in facing direction

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(ysortDepth(y)); // Y-sorted against enemies/trees, kept live in preUpdate

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  // Keeps the player Y-sorted against enemies/trees every frame, independent
  // of MainScene's update() cadence (e.g. still runs while frozen on death).
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(ysortDepth(this.y));
  }

  // Called every frame by MainScene. `canSprint`/`canDash` are the scene's
  // stamina veto (false when the pool can't cover the cost) — Player still
  // reads the raw keys, but the scene has final say over whether sprint/dash
  // actually takes effect this frame. `sprintMultiplier` is computed by the
  // scene from the Running skill level (Skills.ts) — Player has no skill
  // knowledge of its own, it just applies whatever multiplier it's handed.
  // `moveMult` is an external walk/sprint speed multiplier (relic bonuses,
  // M-RL) — 1 when nothing modifies it. Applied to normal movement only, not
  // the fixed dash burst. `dashDistMult` scales ONLY the dash burst speed (=
  // distance over the fixed window) — 1 normally, >1 with the Emberblink set
  // bonus (Emberhide light set); kept separate from moveMult so a relic move
  // buff never quietly lengthens the dash.
  // `envMult` is an environmental terrain multiplier applied to NORMAL walk/sprint
  // speed only (not the fixed dash burst) — 1 on open ground, <1 in a slowing zone
  // (badlands bramble patch now; swamp water later). Kept separate from moveMult so
  // a dash always escapes rough ground at full speed regardless of the terrain slow.
  update(
    delta: number,
    canSprint: boolean,
    canDash: boolean,
    sprintMultiplier: number,
    moveMult = 1,
    dashDistMult = 1,
    inputEnabled = true,
    envMult = 1,
  ): PlayerFrameResult {
    const now = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Mid-dash: let Arcade physics carry the velocity set when the dash
    // started; ignore normal input until it expires (an in-flight dash always
    // finishes, even if input was just disabled — e.g. focusing a text field).
    if (now < this.dashingUntil) {
      return { moving: true, sprinting: false, dashStarted: false, facing: this.facing };
    }

    // Input disabled (e.g. typing in the inventory search box): hold still and
    // read no movement keys, so WASD routes to the text field, not the player.
    if (!inputEnabled) {
      body.setVelocity(0, 0);
      return { moving: false, sprinting: false, dashStarted: false, facing: this.facing };
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;
    const moving = vx !== 0 || vy !== 0;

    // 4-way facing from the last-held movement direction; persists while
    // idle. Vertical wins ties on diagonal input (arbitrary but deterministic).
    if (moving) {
      if (vy !== 0 && (vx === 0 || Math.abs(vy) >= Math.abs(vx))) {
        this.facing = vy < 0 ? "up" : "down";
      } else if (vx !== 0) {
        this.facing = vx < 0 ? "left" : "right";
      }
    }

    const wantsDash =
      moving &&
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      now - this.lastDashAt >= DASH_COOLDOWN_MS;

    if (wantsDash && canDash) {
      const len = Math.hypot(vx, vy);
      const dashSpeed = DASH_SPEED * dashDistMult;
      body.setVelocity((vx / len) * dashSpeed, (vy / len) * dashSpeed);
      this.lastDashAt = now;
      this.dashingUntil = now + DASH_DURATION_MS;
      return { moving: true, sprinting: false, dashStarted: true, facing: this.facing };
    }

    // Re-press latch: once stamina vetoes sprint mid-hold, don't silently
    // resume the instant it regens back up — require a shift release first
    // (the user: auto-resume-while-still-held felt like sprint "just worked
    // again" with no player action).
    if (!this.shiftKey.isDown) {
      this.sprintLocked = false;
    } else if (!canSprint) {
      this.sprintLocked = true;
    }
    const sprinting = moving && canSprint && this.shiftKey.isDown && !this.sprintLocked;
    if (!moving) {
      body.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy);
      // Additive move bucket (2026-07-15): the always-on move bonus (relic move%
      // + Fleetfoot burst%, folded into moveMult by the scene) and the
      // sprint-only running bonus ADD into one speed multiplier instead of
      // compounding — WALK × (1 + move% [+ sprint%]). moveMult/sprintMultiplier
      // arrive as (1 + %) multipliers; subtract 1 to get their % contribution.
      const speedMult = 1 + (moveMult - 1) + (sprinting ? sprintMultiplier - 1 : 0);
      const speed = PLAYER_WALK_SPEED * speedMult * envMult;
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
    }
    return { moving, sprinting, dashStarted: false, facing: this.facing };
  }

  // Zero the dash cooldown so the next move can immediately dash — the Fleetfoot
  // (Mythic) relic's on-kill dash refund.
  resetDashCooldown(): void {
    this.lastDashAt = 0;
  }

  getFacing(): Facing {
    return this.facing;
  }

  // Visual "whoosh" for a dash — a few translucent afterimages of the player
  // sprite that linger at the spots it just passed through and fade out, so the
  // dash burst reads as a deliberate movement tech, not just a speed blip.
  // Staggered captures over the dash's ~105ms window trace the path.
  playDashFx(): void {
    const spawnGhost = () => {
      const ghost = this.scene.add
        .image(this.x, this.y, "player")
        .setScale(this.scaleX, this.scaleY)
        .setAlpha(0.5)
        .setTint(0x9fd8ff)
        .setDepth(this.depth - 1);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        scale: this.scaleX * 0.8,
        duration: 260,
        ease: "Quad.easeOut",
        onComplete: () => ghost.destroy(),
      });
    };
    spawnGhost();
    this.scene.time.delayedCall(35, spawnGhost);
    this.scene.time.delayedCall(70, spawnGhost);
  }

  // Called by MainScene whenever the equipped tool/weapon changes (hotbar
  // select/cycle/drag/craft). Pass null to hide (nothing equipped).
  setEquippedIcon(texture: string | null): void {
    this.equippedIconTexture = texture;
    if (!texture) {
      this.equippedIcon?.setVisible(false);
      return;
    }
    if (!this.equippedIcon) {
      this.equippedIcon = this.scene.add.image(this.x, this.y, texture).setDepth(this.depth + 1);
    } else {
      this.equippedIcon.setTexture(texture);
    }
    this.equippedIcon.setVisible(true);
  }

  // Called every frame (even while frozen/dead) so the icon tracks
  // position/facing without requiring a full Player.update().
  syncEquippedIconPosition(): void {
    if (!this.equippedIcon || !this.equippedIconTexture) return;
    this.equippedIcon.setDepth(this.depth + 1);
    const offset = Player.ICON_OFFSET;
    let ox = 0;
    let oy = 0;
    switch (this.facing) {
      case "up":
        oy = -offset;
        break;
      case "down":
        oy = offset;
        break;
      case "left":
        ox = -offset;
        break;
      case "right":
        ox = offset;
        break;
    }
    this.equippedIcon.setPosition(this.x + ox, this.y + oy);
  }

  // Small lunge tween on the equipped-item icon, played alongside playSwing()
  // on a successful weapon hit.
  playEquippedSwing(): void {
    if (!this.equippedIcon) return;
    this.scene.tweens.killTweensOf(this.equippedIcon);
    this.equippedIcon.setScale(1);
    this.scene.tweens.add({
      targets: this.equippedIcon,
      scale: 1.3,
      duration: 70,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  // Quick rotate-punch tween played on a successful chop/mine hit. Stands in
  // for a real swing animation until there's a facing direction / weapon
  // sprite system to attach one to.
  playSwing(): void {
    this.scene.tweens.killTweensOf(this);
    this.setAngle(0);
    this.scene.tweens.add({
      targets: this,
      angle: 25,
      duration: 70,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.setAngle(0);
      },
    });
  }
}
