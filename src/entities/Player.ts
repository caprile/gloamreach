import Phaser from "phaser";

const SPEED = 95; // pixels per second
const SPRINT_MULTIPLIER = 1.6; // sprint speed = SPEED * this
const DASH_SPEED = 450; // px/s during a dash burst — sharp snap, not a glide
const DASH_DURATION_MS = 105; // how long the burst overrides normal movement
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
  private facing: Facing = "down";
  private equippedIcon: Phaser.GameObjects.Image | null = null;
  private equippedIconTexture: string | null = null;
  private static readonly ICON_OFFSET = 16; // px from player center, in facing direction

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(y); // Y-sorted against enemies/trees, kept live in preUpdate

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
    this.setDepth(this.y);
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
      return { moving: true, sprinting: false, dashStarted: false, facing: this.facing };
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
      body.setVelocity((vx / len) * DASH_SPEED, (vy / len) * DASH_SPEED);
      this.lastDashAt = now;
      this.dashingUntil = now + DASH_DURATION_MS;
      return { moving: true, sprinting: false, dashStarted: true, facing: this.facing };
    }

    const sprinting = moving && canSprint && this.shiftKey.isDown;
    if (!moving) {
      body.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy);
      const speed = sprinting ? SPEED * SPRINT_MULTIPLIER : SPEED;
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
    }
    return { moving, sprinting, dashStarted: false, facing: this.facing };
  }

  getFacing(): Facing {
    return this.facing;
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
