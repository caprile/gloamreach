import Phaser from "phaser";

const SPEED = 95; // pixels per second

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
  }

  // Called every frame by MainScene.
  update(): void {
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

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (vx === 0 && vy === 0) {
      body.setVelocity(0, 0);
    } else {
      const len = Math.hypot(vx, vy);
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    }
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
