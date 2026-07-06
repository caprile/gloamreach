import Phaser from "phaser";

const SPEED = 95; // pixels per second
const SPRINT_MULTIPLIER = 1.6; // sprint speed = SPEED * this
const DASH_SPEED = 340; // px/s during a dash burst
const DASH_DURATION_MS = 160; // how long the burst overrides normal movement
const DASH_COOLDOWN_MS = 600; // minimum time between dashes, independent of stamina

// Per-frame report so MainScene can apply stamina costs without duplicating
// Player's input-reading logic.
export interface PlayerFrameResult {
  moving: boolean;
  sprinting: boolean; // moving && canSprint && shift held
  dashStarted: boolean; // true only on the frame a dash begins (for stamina spend)
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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(10); // draw above ground clutter so the player stays visible

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

  // Called every frame by MainScene. `canSprint`/`canDash` are the scene's
  // stamina veto (false when the pool can't cover the cost) — Player still
  // reads the raw keys, but the scene has final say over whether sprint/dash
  // actually takes effect this frame.
  update(delta: number, canSprint: boolean, canDash: boolean): PlayerFrameResult {
    const now = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Mid-dash: let Arcade physics carry the velocity set when the dash
    // started; ignore normal input until it expires.
    if (now < this.dashingUntil) {
      return { moving: true, sprinting: false, dashStarted: false };
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

    // Dash requires a held movement direction — there's no facing/last-
    // direction memory yet (a real facing system is deliberately deferred to
    // land alongside Combat, per the roadmap).
    const wantsDash =
      moving &&
      Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
      now - this.lastDashAt >= DASH_COOLDOWN_MS;

    if (wantsDash && canDash) {
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * DASH_SPEED, (vy / len) * DASH_SPEED);
      this.lastDashAt = now;
      this.dashingUntil = now + DASH_DURATION_MS;
      return { moving: true, sprinting: false, dashStarted: true };
    }

    const sprinting = moving && canSprint && this.shiftKey.isDown;
    if (!moving) {
      body.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy);
      const speed = sprinting ? SPEED * SPRINT_MULTIPLIER : SPEED;
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
    }
    return { moving, sprinting, dashStarted: false };
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
