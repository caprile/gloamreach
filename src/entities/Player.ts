import Phaser from "phaser";
import { ysortDepth } from "../systems/depth";
import { PLAYER_WALK_SPEED } from "../systems/movement";
import { hasRig, rigAnimKey, type RigAnim } from "../art/playerRig";

// Re-exported so existing importers keep their `from "../entities/Player"` path;
// the constant itself now lives in a Phaser-free module (see movement.ts).
export { PLAYER_WALK_SPEED };
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
  private knockbackUntil = 0;
  private sprintLocked = false; // stamina ran out mid-sprint; needs shift release+re-press
  private facing: Facing = "down";
  // Movement keys in the order they were pressed, so the newest one drives
  // facing and releasing it falls back to whatever is still held.
  private heldOrder: Facing[] = [];
  private equippedIcon: Phaser.GameObjects.Image | null = null;
  private equippedIconTexture: string | null = null;
  private equippedIconTiltMirrored = false;
  private equippedIconScale = 1;
  private static readonly ICON_OFFSET = 16; // px from player center, in facing direction
  // The held item renders at a fixed world size regardless of its source
  // texture's resolution. Item icons are UI art first, and the real-art
  // migration authors them at 32x32 (PixelLab's minimum canvas) rather than the
  // placeholders' 24x24 — without this, swapping in real art would silently
  // scale every held weapon up by a third.
  private static readonly ICON_WORLD_SIZE = 24;

  // --- real-art rig (Phase 4) ---------------------------------------------
  // Null until a chosen survivor turns out to have art on disk; everything
  // below is inert in that case and the generated 20x20 placeholder is used
  // exactly as before.
  private rigId: string | null = null;
  private rigAnim: RigAnim = "idle";
  private attackUntil = 0;
  private restartAttack = false; // a fresh swing must replay even mid-attack
  // The physics footprint stays what the placeholder had, independent of how
  // big the art is: the rig canvas is 48x48 (a 32px figure plus animation
  // headroom) but collision feel — squeezing past a boulder — is tuned around
  // the old 20x20 body, and nothing else in the game reads the player's sprite
  // size.
  private static readonly BODY = 18;
  // Roughly where the survivor's hand sits, per facing, on the 48px rig canvas
  // (the sprite's origin is the middle of that canvas, i.e. mid-torso).
  //
  // The third value is a tilt. Item art is an upright inventory icon, so
  // without it a held weapon hangs straight up and down and reads as floating
  // beside the character rather than being carried — and, since most weapon
  // icons are near symmetric about their own long axis, mirroring alone is
  // invisible. Tilting turns the left/right pair into a real mirror.
  private static readonly HAND_OFFSET: Record<Facing, [number, number, number]> = {
    down: [9, 4, 22],
    up: [-9, 2, -22],
    left: [-11, 3, -30],
    right: [11, 3, 30],
  };

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
    this.syncRigAnimation(time);
  }

  /**
   * Swap in a survivor's real art, if any exists for `charId` (see
   * art/playerRig.ts). Called once the run's character card is confirmed.
   * A character with no rig art silently keeps the placeholder sprite, so this
   * is safe to call for every card.
   */
  setCharacter(charId: string): void {
    if (!hasRig(charId)) return;
    this.rigId = charId;
    this.rigAnim = "idle";
    this.play(rigAnimKey(charId, "idle", this.facing), true);
    // setSize recentres the body on the frame by default, which is what we
    // want: the sprite's origin stays the player's logical position, so reach,
    // hover and targeting math is untouched by the bigger canvas.
    (this.body as Phaser.Physics.Arcade.Body).setSize(Player.BODY, Player.BODY, true);
  }

  /**
   * Pick the animation that matches what the player is doing this frame.
   * Driven off body velocity rather than update()'s return value so it stays
   * correct during a dash and while the world is frozen (update() early-returns
   * in both cases, but preUpdate keeps running).
   */
  private syncRigAnimation(time: number): void {
    if (!this.rigId) return;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    const want: RigAnim =
      time < this.attackUntil ? "attack" : body && (body.velocity.x || body.velocity.y) ? "walk" : "idle";
    const key = this.resolveRigKey(want);
    if (!key) return;
    // Comparing against what's actually PLAYING (rather than the state we last
    // wanted) is what makes the fallback above safe: a survivor with no walk
    // art asks for walk every frame, resolves to idle, and still turns.
    if (this.anims.currentAnim?.key === key && !this.restartAttack) return;
    this.restartAttack = false;
    this.rigAnim = want;
    this.play(key, want !== "attack");
  }

  /**
   * The best animation this survivor actually has for `anim` in the current
   * facing, falling back to idle.
   *
   * Mid-migration a character can have idle but not yet walk or attack, and a
   * missing animation must not strand the sprite on whatever frame happened to
   * be up: that reads as the character refusing to turn until you release the
   * key, since the release is what drops it back to an animation that exists.
   */
  private resolveRigKey(anim: RigAnim): string | null {
    const chain: RigAnim[] = anim === "idle" ? ["idle"] : [anim, "idle"];
    for (const a of chain) {
      const key = rigAnimKey(this.rigId!, a, this.facing);
      if (this.scene.anims.exists(key)) return key;
    }
    return null;
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

    // Being shoved — same deal as a dash in flight: Arcade carries the velocity
    // and input is ignored until it expires. Checked AFTER the dash so a dash
    // already in the air still finishes; a dash STARTED during the window is
    // blocked, which is the point of a knockback.
    if (now < this.knockbackUntil) {
      return { moving: true, sprinting: false, dashStarted: false, facing: this.facing };
    }

    // Input disabled (e.g. typing in the inventory search box): hold still and
    // read no movement keys, so WASD routes to the text field, not the player.
    if (!inputEnabled) {
      body.setVelocity(0, 0);
      // Forget what was held: keys released while input was off never reach the
      // release branch below, so they'd linger and steer facing on re-enable.
      this.heldOrder.length = 0;
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

    // 4-way facing: the most recently PRESSED direction wins, and it persists
    // while idle.
    //
    // This used to break ties on a diagonal by always preferring vertical,
    // which meant adding a direction to one you were already holding did
    // nothing — the turn only happened when you RELEASED the first key, so the
    // character appeared to face the direction you had just let go of. Real
    // directional art made that immediately obvious.
    const held: [Facing, boolean][] = [
      ["up", up],
      ["down", down],
      ["left", left],
      ["right", right],
    ];
    for (const [dir, isDown] of held) {
      const i = this.heldOrder.indexOf(dir);
      if (isDown && i === -1) this.heldOrder.push(dir);
      else if (!isDown && i !== -1) this.heldOrder.splice(i, 1);
    }
    if (this.heldOrder.length) this.facing = this.heldOrder[this.heldOrder.length - 1];

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

  // Get shoved. Opens a window during which update() surrenders the body to
  // Arcade, exactly like a dash in flight — WITHOUT it, knockback was purely
  // cosmetic across the whole game: every source set a velocity, and update()
  // overwrote it on the very next frame (setVelocity(0,0) when idle, the input
  // vector when moving), so the impulse never survived long enough to move
  // anyone. It was a known-deferred limitation since the souls-like pass; the
  // Miretyrant's heave is an attack whose entire payload is the displacement,
  // which is what forces the fix. Every existing knockback number becomes real
  // at once, which is what those numbers always meant.
  applyKnockback(angle: number, speed: number, durationMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.knockbackUntil = this.scene.time.now + durationMs;
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
      // Ghost the frame currently on screen, not the "player" placeholder —
      // a rigged survivor must trail its own art, mid-stride.
      const ghost = this.scene.add
        .image(this.x, this.y, this.texture.key, this.frame.name)
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
  //
  // `tiltMirrored` negates the held tilt for an icon whose art was mirrored on
  // disk (see art/tools/mirror.mjs). The angle you see is the art's own lean plus
  // HAND_OFFSET's tilt, so mirroring the art flips the lean's sign and the tilt
  // starts ADDING to it — the mirrored pickaxe stood bolt upright instead of
  // sitting at its usual ~45 degrees. Negating the tilt restores the pose.
  setEquippedIcon(texture: string | null, tiltMirrored = false): void {
    this.equippedIconTexture = texture;
    this.equippedIconTiltMirrored = tiltMirrored;
    if (!texture) {
      this.equippedIcon?.setVisible(false);
      return;
    }
    if (!this.equippedIcon) {
      this.equippedIcon = this.scene.add.image(this.x, this.y, texture).setDepth(this.depth + 1);
    } else {
      this.equippedIcon.setTexture(texture);
    }
    const longest = Math.max(this.equippedIcon.width, this.equippedIcon.height) || 1;
    this.equippedIconScale = Player.ICON_WORLD_SIZE / longest;
    this.equippedIcon.setScale(this.equippedIconScale);
    this.equippedIcon.setVisible(true);
  }

  // Called every frame (even while frozen/dead) so the icon tracks
  // position/facing without requiring a full Player.update().
  syncEquippedIconPosition(): void {
    if (!this.equippedIcon || !this.equippedIconTexture) return;
    const offset = Player.ICON_OFFSET;
    let ox = 0;
    let oy = 0;
    if (this.rigId) {
      // A rigged survivor has drawn hands, so the item reads as HELD rather
      // than as a marker floating in the facing direction: it sits beside the
      // body at hand height, and goes behind the sprite when facing away.
      const [hx, hy, tilt] = Player.HAND_OFFSET[this.facing];
      ox = hx;
      oy = hy;
      this.equippedIcon.setAngle(this.equippedIconTiltMirrored ? -tilt : tilt);
      this.equippedIcon.setDepth(this.depth + (this.facing === "up" ? -1 : 1));
    } else {
      this.equippedIcon.setAngle(0);
      this.equippedIcon.setDepth(this.depth + 1);
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
    }
    // Item art is drawn pointing right (the same convention every creature
    // sprite follows), so it has to mirror when it's held on the body's left —
    // otherwise a sword faces backwards the moment you turn around. The hand
    // offset already knows which side that is, so the two can't disagree.
    this.equippedIcon.setFlipX(ox < 0);
    this.equippedIcon.setPosition(this.x + ox, this.y + oy);
  }

  // Small lunge tween on the equipped-item icon, played alongside playSwing()
  // on a successful weapon hit.
  playEquippedSwing(): void {
    if (!this.equippedIcon) return;
    this.scene.tweens.killTweensOf(this.equippedIcon);
    this.equippedIcon.setScale(this.equippedIconScale);
    this.scene.tweens.add({
      targets: this.equippedIcon,
      scale: this.equippedIconScale * 1.3,
      duration: 70,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  // Quick rotate-punch tween played on a successful chop/mine hit. Stands in
  // for a real swing animation until there's a facing direction / weapon
  // sprite system to attach one to.
  playSwing(): void {
    if (this.rigId) {
      // A real attack animation drives its own length; preUpdate drops back to
      // walk/idle when it expires. (None of the survivors have one yet — see
      // art/README.md on why both generated attacks were rejected.)
      const key = rigAnimKey(this.rigId, "attack", this.facing);
      const anim = this.scene.anims.get(key);
      if (anim) {
        this.attackUntil = this.scene.time.now + anim.duration;
        this.restartAttack = true;
        return;
      }
      // Without one, pulse rather than rotate: the placeholder's 25-degree spin
      // was fine on a 20px blob but reads as a detailed character toppling
      // over. Deliberately scale and not a positional lunge — x/y is the Arcade
      // body's own position, so tweening it would fight velocity and the world
      // clamp. The direction of the swing is carried by the equipped item's
      // lunge (playEquippedSwing), which is a plain Image and free to move.
      this.scene.tweens.killTweensOf(this);
      this.setScale(1);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.12,
        scaleY: 0.92,
        duration: 70,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: () => this.setScale(1),
      });
      return;
    }
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
