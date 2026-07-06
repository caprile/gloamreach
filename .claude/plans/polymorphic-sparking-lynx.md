# Combat Foundation (Roadmap item 4, scoped down) — Implementation Plan

## Context

Roadmap item 4 ("Combat") is next up after Stamina/sprint/dash. It's a big
milestone — enemies, attack, health/damage, death & respawn, plus two things
explicitly deferred to land alongside it (equipped-item-on-sprite visuals,
since there's no facing/weapon-attachment system yet; dash i-frames, since
there's no health system for them to interact with yet).

The user's first-biome notes (folded into `CLAUDE.md`'s "First biome —
content notes" section) describe a much bigger combat roster — 3 enemies
with distinct AI (Gremlin ranged+melee, Snake ambush, Boar charge+fire-fear),
a Slingshot+ammo ranged-weapon system, and Workbench crafting-tier gating.
That's too much for one pass. The user was asked to scope this down and
picked **"Foundation + one enemy"**: build the core combat systems for real
(health, facing, equipped-weapon visuals, melee weapon equip, death/respawn)
against a single simplified enemy, and leave Gremlin/Snake/ranged/ambush/
charge/fire-fear/Workbench as clearly-flagged follow-up milestones.

Goal of this pass: close the full kill/be-killed/respawn loop with real
systems (not throwaway prototypes) that the later biome content can extend,
matching the codebase's established "tables + getters" and "hover/interact"
patterns rather than inventing parallel ones.

**Explicitly out of scope:** Gremlin ranged attack, Snake ambush AI,
Slingshot/ammo, Workbench gating, Boar charge attack, fire-fear behavior,
cooking/food, XP/skills for combat. These are follow-ups, not omissions.

All facts below were confirmed by reading the actual current source (not
inferred): `Player.ts`, `ResourceNode.ts`, `MainScene.ts`, `Items.ts`,
`Recipes.ts`, `Stamina.ts`, `Inventory.ts`, `EventLog.ts`, `EventLogUI.ts`,
`HotbarUI.ts`.

---

## 0. Key confirmed facts that shape the design

- `ItemDef` (`src/systems/Items.ts`) has `tool?: ToolType` but no weapon
  field yet. `wood_club`/`stone_club` already exist as item stubs with
  display-only `stats` ("Type: Weapon", "Damage: 3"/"5") — no mechanic
  reads them today.
- `Recipes.ts`: `wood_club`/`stone_club` output `{kind:"item", itemId,
  itemName}`, not `{kind:"tool"}` — that's why they don't auto-equip today.
- `MainScene.recomputeEquipped()` (lines 276–282) is the *single* place that
  derives "equipped" from the selected hotbar stack:
  `this.equippedTool = (stack && itemDef(stack.key)?.tool) || null`. Called
  from `selectHotbarSlot`, `cycleHotbar`, `afterItemMove`, and after
  crafting. Weapon equip must hook into this exact function.
- Icon textures (`icon_wood_club`, `icon_stone_club`, `icon_stone_axe`, etc.)
  are real generated Phaser textures baked in `BootScene`, 24×24 — safe to
  reuse directly as the equipped-item sprite's texture (no new art needed).
- Player texture is `"player"`, a plain generated rect — no directional
  frames/animations. `playSwing()` rotates the whole sprite 0→25→0 over 70ms
  as a placeholder swing; it stays as-is. The new equipped-item child sprite
  gets its own small independent swing/lunge tween.
- `ResourceNode` extends `Phaser.GameObjects.Sprite` (NOT physics-enabled).
  `Enemy` must extend `Phaser.Physics.Arcade.Sprite` instead — different
  base class, needs `scene.physics.add.existing(this)`. Don't subclass
  `ResourceNode`; mirror its `takeHit`/`playHitFeedback` *shape* instead.
- `MainScene.update(_time, delta)` order (lines 196–218): `player.update()`
  → apply stamina spend for sprint/dash → `stamina.tick(delta)` →
  `refreshStaminaBar()` → (`updatePlacementGhost()` OR `updateHover()`, only
  one of these, gated on `placementMode`/`anyMenuOpen()`) →
  `updateMagnet(delta)` (always, even mid-menu/placement). New
  `updateEnemies(delta)` and the death/respawn freeze slot into this method.
- `REACH = 64px` is the existing interact-reach constant — reused for the
  player's melee attack range (per user's steer), while the Boar's own bite
  range is intentionally *shorter* (see open decisions) — an asymmetry
  that's fine: player weapon reach vs. bare teeth.
- `spawnNodes()` (lines 361–405) is the exact pattern `spawnEnemies()`
  mirrors: seeded `Phaser.Math.RandomDataGenerator`, scatter within
  `(60, WORLD_W-60)`/`(60, WORLD_H-60)`, skip a clear zone around world
  center `(640, 480)`.
- `ResourceType` (`src/systems/Inventory.ts`) is a 3-member union (`"wood" |
  "stone" | "leather"`) with a comment noting `"leather"` was added ahead of
  having a drop source — same trivial-extension precedent applies to
  `"boar_meat"`.
- `EventLog`/`EventLogUI`: `LogKind = "recipe" | "levelup" | "info"`.
  `KIND_COLORS: Record<LogKind, {...}>` in `EventLogUI.ts` — adding a kind
  without updating this map is a compile error (safety net, confirmed).
  Only `"recipe"` gets a special slide-in toast; everything else uses the
  generic centered fade-toast automatically.
- `HotbarUI.top` getter exposes `originY` — the anchor the stamina bar
  already stacks off. HP bar stacks one slot further up using the same math.
- Arcade physics is global, `pixelArt:true`, canvas 800×600, world
  1280×960. Player already has a physics body + `setCollideWorldBounds` +
  depth 10. A `"solids"` static group (trees/boulders) already colliders
  with the player.

---

## 1. New file: `src/systems/Health.ts`

Phaser-free, shaped like `Stamina.ts` but **not** copied verbatim — no
passive regen (that's a later food/rest system), needs `takeDamage`/`heal`/
`reset`/`isDead` instead of `spend`/`canAfford`/`tick`.

```ts
const MAX_HEALTH = 100;

// Player health pool. Unlike Stamina, there's no passive regeneration — HP
// only changes via takeDamage/heal. A future food/rest system may add slow
// regen; not implemented here.
export class Health {
  private current = MAX_HEALTH;

  get max(): number {
    return MAX_HEALTH;
  }

  value(): number {
    return this.current;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  // Returns true if this hit brought health to 0 just now (death trigger).
  takeDamage(amount: number): boolean {
    if (this.isDead) return false;
    const wasAlive = this.current > 0;
    this.current = Math.max(0, this.current - amount);
    return wasAlive && this.current <= 0;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  // Called on respawn.
  reset(): void {
    this.current = MAX_HEALTH;
  }
}
```

The enemy does **not** use this class — it keeps a simple `health`/
`maxHealth` number pair matching `ResourceNode`'s existing pattern (see
section 3), since its death handling (loot drop, no respawn) is closer to a
resource node than to the player.

---

## 2. Modify `src/entities/Player.ts` — facing direction

```ts
export type Facing = "up" | "down" | "left" | "right";
```

Widen `PlayerFrameResult`:
```ts
export interface PlayerFrameResult {
  moving: boolean;
  sprinting: boolean;
  dashStarted: boolean;
  facing: Facing; // current facing; persists while idle
}
```

Add `private facing: Facing = "down";` (default facing on spawn).

In `update()`, after `moving` is computed (line 77), before the dash check:
4-way only, vertical wins ties on diagonal input (deterministic, simple):

```ts
if (moving) {
  if (vy !== 0 && (vx === 0 || Math.abs(vy) >= Math.abs(vx))) {
    this.facing = vy < 0 ? "up" : "down";
  } else if (vx !== 0) {
    this.facing = vx < 0 ? "left" : "right";
  }
}
// else: facing persists unchanged while idle
```

Add `facing: this.facing` to all three existing return statements (the
mid-dash early return, the dash-started return, and the final return).

Add a getter for consumers outside the per-frame result (the equipped-icon
sync runs every frame regardless of whether `update()` ran, e.g. during the
death-freeze window):
```ts
getFacing(): Facing {
  return this.facing;
}
```

`playSwing()` is untouched.

---

## 3. New file: `src/entities/Enemy.ts`

Arcade-physics sprite. Mirrors `ResourceNode`'s `takeHit`/`playHitFeedback`
shape, adapted for a moving entity with its own simple AI state.

```ts
import Phaser from "phaser";

export type EnemyState = "idle" | "chasing";

const AGGRO_RADIUS = 140; // px — player enters this range, Boar starts chasing
const DEAGGRO_RADIUS = 200; // px — larger than aggro; avoids boundary flicker
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the Boar must be to bite
const BITE_DAMAGE = 8;
const BITE_COOLDOWN_MS = 1000;
const MAX_HEALTH = 20;

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly displayName: string;
  readonly maxHealth = MAX_HEALTH;
  health = MAX_HEALTH;
  depleted = false;
  state: EnemyState = "idle";
  private lastBiteAt = -Infinity;
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;

  constructor(scene: Phaser.Scene, cfg: EnemyConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.displayName = cfg.displayName;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(9); // just under the player (10)
  }

  get biteDamage(): number {
    return BITE_DAMAGE;
  }

  // Called every frame from MainScene.updateEnemies(). Returns true if a
  // bite lands this frame — caller applies damage to Health so Enemy
  // doesn't need to know about Player/Health directly.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS) this.state = "chasing";
    else if (this.state === "chasing" && dist > DEAGGRO_RADIUS) this.state = "idle";

    if (this.state === "chasing") {
      if (dist <= MELEE_RANGE) {
        body.setVelocity(0, 0);
        if (now - this.lastBiteAt >= BITE_COOLDOWN_MS) {
          this.lastBiteAt = now;
          return true; // bite lands
        }
        return false;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      body.setVelocity(Math.cos(angle) * CHASE_SPEED, Math.sin(angle) * CHASE_SPEED);
      return false;
    }

    // idle wander: pick a small nearby target periodically, drift toward it
    if (now >= this.nextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const d2 = Phaser.Math.Between(20, 50);
      this.wanderTarget = { x: this.x + Math.cos(angle) * d2, y: this.y + Math.sin(angle) * d2 };
      this.nextWanderAt = now + Phaser.Math.Between(2000, 4000);
    }
    if (this.wanderTarget) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
      if (d < 4) {
        body.setVelocity(0, 0);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y);
        body.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
      }
    }
    return false;
  }

  // Same shape/feel as ResourceNode.takeHit: apply damage + feedback, return
  // true once depleted so the caller awards loot and destroys.
  takeHit(damage: number): boolean {
    this.health = Math.max(0, this.health - damage);
    this.playHitFeedback();
    return this.health <= 0;
  }

  private playHitFeedback(): void {
    this.scene.tweens.killTweensOf(this);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => { this.x = baseX; },
    });
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(140, 20, 20),
      100,
      Math.round((1 - frac) * 100),
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // Death feedback (fade), then the caller destroys/removes from tracking
  // and spawns loot. Kept out of takeHit so MainScene can read x/y for the
  // loot drop before anything moves/destructs.
  playDeathFeedback(onComplete: () => void): void {
    this.depleted = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }
}
```

Deliberate simplifications: no charge attack, no fire-fear, no ranged
attack. `DEAGGRO_RADIUS > AGGRO_RADIUS` gives hysteresis so the enemy
doesn't flicker state at the boundary — a small addition beyond the literal
ask but trivial and avoids a visibly janky enemy.

---

## 4. Modify `src/systems/Items.ts`

Add to `ItemDef`:
```ts
weapon?: WeaponType; // set for weapon items — selecting it in the hotbar equips it
```
Import `WeaponType` from the new `./Weapons` (weapons are a hotbar-equip +
damage/cooldown-table concept, closer in shape to `Stamina`/`Skills` than to
an entity — `Weapons.ts` is the right home, not `Items.ts` itself).

Update `wood_club`/`stone_club` to add `weapon: "wood_club"` /
`weapon: "stone_club"` respectively (keep existing display `stats` — the
3/5 damage strings already match the `WEAPON_DAMAGE` table in section 5).

Add a new `boar_meat` item (loot drop resource):
```ts
boar_meat: {
  key: "boar_meat",
  name: "Boar Meat",
  description: "Raw meat from a boar. Can be cooked.",
  texture: "icon_boar_meat",
  maxStack: 99,
  hotbarable: false,
},
```

---

## 5. New file: `src/systems/Weapons.ts`

Mirrors `ResourceNode.ts`'s tool-table pattern exactly.

```ts
export type WeaponType = "wood_club" | "stone_club";

const WEAPON_DAMAGE: Record<WeaponType, number> = {
  wood_club: 3,
  stone_club: 5,
};
export function weaponDamage(weapon: WeaponType): number {
  return WEAPON_DAMAGE[weapon];
}

const WEAPON_COOLDOWN_MS: Record<WeaponType, number> = {
  wood_club: 450,
  stone_club: 550,
};
export function weaponCooldownMs(weapon: WeaponType): number {
  return WEAPON_COOLDOWN_MS[weapon];
}

const WEAPON_STAMINA_COST: Record<WeaponType, number> = {
  wood_club: 10,
  stone_club: 14,
};
export function weaponStaminaCost(weapon: WeaponType): number {
  return WEAPON_STAMINA_COST[weapon];
}
```

Damage matches the existing item-tooltip numbers (3/5); heavier weapon is
intentionally a bit slower/costlier than the lighter one (open decision,
see section 15).

---

## 6. Modify `src/systems/Inventory.ts`

```ts
export type ResourceType = "wood" | "stone" | "leather" | "boar_meat";
```
Update the file's existing comment to note `boar_meat` now has a drop
source (defeated Boars).

---

## 7. `src/entities/ResourceNode.ts` — no changes needed

It only imports `ResourceType` as a type, so the widened union flows
through for free.

---

## 8. Modify `src/scenes/BootScene.ts`

Add a `"boar"` world texture (brown blob + darker snout patch, distinct
from the player's blue rect) and an `"icon_boar_meat"` 24×24 icon (reuse the
shishkabob's red tone for a raw-meat look) — same generated-texture
approach as everything else, no new art pipeline, no directional frames.

---

## 9. Equipped-item-on-sprite visual — further modify `src/entities/Player.ts`

Owned by `Player` (facing state already lives there; offset math is
per-facing, not per-scene-state — mirrors how `playSwing()` already lives
on `Player` rather than in `MainScene`).

```ts
private equippedIcon: Phaser.GameObjects.Image | null = null;
private equippedIconTexture: string | null = null;
private static readonly ICON_OFFSET = 16; // px from player center, in facing direction

// Called by MainScene whenever the equipped tool/weapon changes (hotbar
// select/cycle/drag/craft). Pass null to hide (nothing equipped).
setEquippedIcon(texture: string | null): void {
  this.equippedIconTexture = texture;
  if (!texture) {
    this.equippedIcon?.setVisible(false);
    return;
  }
  if (!this.equippedIcon) {
    this.equippedIcon = this.scene.add.image(this.x, this.y, texture).setDepth(11);
  } else {
    this.equippedIcon.setTexture(texture);
  }
  this.equippedIcon.setVisible(true);
}

// Called every frame (even while frozen/dead) so the icon tracks position/
// facing without requiring a full Player.update().
syncEquippedIconPosition(): void {
  if (!this.equippedIcon || !this.equippedIconTexture) return;
  const offset = Player.ICON_OFFSET;
  let ox = 0, oy = 0;
  switch (this.facing) {
    case "up": oy = -offset; break;
    case "down": oy = offset; break;
    case "left": ox = -offset; break;
    case "right": ox = offset; break;
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
```

`MainScene.recomputeEquipped()` calls `player.setEquippedIcon(...)` with
whichever of tool/weapon is equipped (only one can occupy the selected slot
at a time, so there's no real conflict). `MainScene.update()` calls
`player.syncEquippedIconPosition()` every frame, unconditionally — including
during the death-freeze window, so the icon doesn't lag behind a
teleported-but-frozen player.

This resolves the long-deferred "equipped-item-on-sprite visual" with zero
new art pipeline.

---

## 10. Modify `src/scenes/MainScene.ts` — equip derivation

```ts
private equippedWeapon: WeaponType | null = null;
```
Import `WeaponType`, `weaponDamage`, `weaponCooldownMs`, `weaponStaminaCost`
from `../systems/Weapons`.

Rewrite `recomputeEquipped()`:
```ts
private recomputeEquipped(): void {
  const stack = this.hotbar.get(this.hotbar.selected());
  const def = stack ? itemDef(stack.key) : undefined;
  this.equippedTool = def?.tool ?? null;
  this.equippedWeapon = def?.weapon ?? null;
  const iconTexture = def && (def.tool || def.weapon) ? def.texture : null;
  this.player.setEquippedIcon(iconTexture);
  this.hotbarUI.refresh();
  this.refreshHud();
}
```
Single source of truth for both equip states — no parallel logic path.

---

## 11. Modify `src/scenes/MainScene.ts` — enemy tracking, hover, interact

```ts
private enemies: Enemy[] = [];
private hoveredEnemy: Enemy | null = null;
private lastWeaponHitAt = 0; // mirrors lastToolHitAt, separate clock
```
Import `Enemy` from `../entities/Enemy`.

`updateHover()` must check enemies alongside nodes without breaking the
existing node-hover prompt rules — track whichever target (node or enemy)
is closest overall, so only one prompt ever shows:

```ts
private updateHover(): void {
  const pointer = this.input.activePointer;
  const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

  let hoveredNode: ResourceNode | null = null;
  let hoveredEnemy: Enemy | null = null;
  let best = Infinity;

  for (const node of this.nodes) {
    if (node.depleted) continue;
    const radius = Math.max(node.displayWidth, node.displayHeight) / 2 + 6;
    const d = Phaser.Math.Distance.Between(world.x, world.y, node.x, node.y);
    if (d <= radius && d < best) {
      hoveredNode = node;
      hoveredEnemy = null;
      best = d;
    }
  }
  for (const enemy of this.enemies) {
    if (enemy.depleted) continue;
    const radius = Math.max(enemy.displayWidth, enemy.displayHeight) / 2 + 6;
    const d = Phaser.Math.Distance.Between(world.x, world.y, enemy.x, enemy.y);
    if (d <= radius && d < best) {
      hoveredEnemy = enemy;
      hoveredNode = null;
      best = d;
    }
  }

  this.hoveredNode = hoveredNode;
  this.hoveredEnemy = hoveredEnemy;

  const prompt = hoveredNode
    ? this.promptFor(hoveredNode)
    : hoveredEnemy
      ? this.promptForEnemy(hoveredEnemy)
      : null;
  if (prompt) {
    this.promptText.setText(prompt).setVisible(true);
    this.input.setDefaultCursor("pointer");
  } else {
    this.promptText.setVisible(false);
    this.input.setDefaultCursor("default");
  }
}

// Mirrors promptFor()'s gating rules: out of reach -> nothing; no weapon
// equipped -> nothing (never reveal what's required, same convention as
// tool-kind gating); else show the attack verb.
private promptForEnemy(enemy: Enemy): string | null {
  const inReach =
    Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= REACH;
  if (!inReach) return null;
  if (!this.equippedWeapon) return null;
  return `[LMB] Attack ${enemy.displayName}`;
}
```

`tryInteract()` gets an enemy branch first (mirrors hover's "whichever is
closer" precedence):
```ts
private tryInteract(): void {
  if (this.hoveredEnemy) {
    this.tryAttackEnemy(this.hoveredEnemy);
    return;
  }
  const node = this.hoveredNode;
  // ...existing node logic, unchanged...
}

private tryAttackEnemy(enemy: Enemy): void {
  if (enemy.depleted || !this.equippedWeapon) return;
  const inReach =
    Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= REACH;
  if (!inReach) return;

  const cooldownMs = weaponCooldownMs(this.equippedWeapon);
  if (this.time.now - this.lastWeaponHitAt < cooldownMs) return;

  const staminaCost = weaponStaminaCost(this.equippedWeapon);
  if (!this.stamina.canAfford(staminaCost)) return; // silent, same as tool guard

  this.lastWeaponHitAt = this.time.now;
  this.stamina.spend(staminaCost);
  this.player.playSwing();
  this.player.playEquippedSwing();

  const depleted = enemy.takeHit(weaponDamage(this.equippedWeapon));
  if (!depleted) return;

  const dropX = enemy.x, dropY = enemy.y;
  enemy.playDeathFeedback(() => {
    this.spawnLooseDrop("boar_meat", Phaser.Math.Between(1, 2), dropX, dropY);
  });
  this.enemies = this.enemies.filter((e) => e !== enemy);
  this.eventLog.add("combat", `Defeated ${enemy.displayName}`);
  this.hoveredEnemy = null;
  this.promptText.setVisible(false);
}
```
`spawnLooseDrop(resource: ResourceType, amount: number, x: number, y: number)`
— confirmed signature, matches directly.

---

## 12. Modify `src/scenes/MainScene.ts` — enemy spawning

```ts
private enemyGroup!: Phaser.Physics.Arcade.Group;
```
```ts
private spawnEnemies(): void {
  const rng = new Phaser.Math.RandomDataGenerator(["boar-country"]);
  const COUNT = 6;
  for (let i = 0; i < COUNT; i++) {
    const x = rng.between(60, WORLD_W - 60);
    const y = rng.between(60, WORLD_H - 60);
    if (Phaser.Math.Distance.Between(x, y, WORLD_W / 2, WORLD_H / 2) < 150) continue;
    const enemy = new Enemy(this, { x, y, texture: "boar", displayName: "Boar" });
    this.enemies.push(enemy);
    this.enemyGroup.add(enemy);
  }
}
```
Call from `create()` right after the existing `spawnNodes()`/solids-collider
setup:
```ts
this.spawnNodes(solids);
this.physics.add.collider(this.player, solids);
this.enemyGroup = this.physics.add.group();
this.spawnEnemies();
this.physics.add.collider(this.enemyGroup, solids);
this.physics.add.collider(this.player, this.enemyGroup); // physical separation only
```
The player↔enemy collider is purely physical (bodies don't overlap/pass
through each other) — the actual bite trigger stays manual distance math
against `MELEE_RANGE`, matching the existing `REACH` convention rather than
a Phaser overlap callback.

---

## 13. Modify `src/scenes/MainScene.ts` — enemy tick, Health, death/respawn

```ts
private health = new Health();
private healthBarFill!: Phaser.GameObjects.Rectangle;
private healthBarText!: Phaser.GameObjects.Text;
private isDead = false;
private invulnerableUntil = 0;
private readonly RESPAWN_DELAY_MS = 2000;
private readonly POST_RESPAWN_INVULN_MS = 1500;
```
Import `Health` from `../systems/Health`.

Rewrite `update()`:
```ts
update(_time: number, delta: number): void {
  if (this.isDead) {
    // Frozen: no Player.update() (no input/movement), but keep ambient
    // systems running so the world doesn't visually freeze too.
    this.stamina.tick(delta);
    this.refreshStaminaBar();
    this.player.syncEquippedIconPosition();
    this.updateEnemies(delta);
    this.updateMagnet(delta);
    return;
  }

  const sprintCost = SPRINT_DRAIN_PER_SEC * (delta / 1000);
  const canSprint = this.stamina.canAfford(sprintCost);
  const canDash = this.stamina.canAfford(DASH_STAMINA_COST);
  const frame = this.player.update(delta, canSprint, canDash);

  if (frame.sprinting) this.stamina.spend(sprintCost);
  if (frame.dashStarted) this.stamina.spend(DASH_STAMINA_COST);
  this.stamina.tick(delta);
  this.refreshStaminaBar();
  this.player.syncEquippedIconPosition();

  if (this.placementMode) this.updatePlacementGhost();
  else if (!this.anyMenuOpen()) this.updateHover();
  this.updateMagnet(delta);
  this.updateEnemies(delta);
}

private updateEnemies(delta: number): void {
  const now = this.time.now;
  for (const enemy of this.enemies) {
    const bit = enemy.update(delta, this.player.x, this.player.y, now);
    if (bit) this.applyDamageToPlayer(enemy.biteDamage);
  }
}

private applyDamageToPlayer(amount: number): void {
  if (this.isDead) return;
  if (this.time.now < this.invulnerableUntil) return;
  const died = this.health.takeDamage(amount);
  this.refreshHealthBar();
  if (died) this.onPlayerDeath();
}

private onPlayerDeath(): void {
  this.isDead = true;
  this.player.setVelocity(0, 0);
  this.eventLog.add("combat", "You died...");
  this.time.delayedCall(this.RESPAWN_DELAY_MS, () => this.respawnPlayer());
}

private respawnPlayer(): void {
  this.player.setPosition(WORLD_W / 2, WORLD_H / 2);
  this.health.reset();
  this.refreshHealthBar();
  this.invulnerableUntil = this.time.now + this.POST_RESPAWN_INVULN_MS;
  this.isDead = false;
  this.eventLog.add("combat", "Respawned");
}
```

`src/systems/EventLog.ts`: widen `LogKind`:
```ts
export type LogKind = "recipe" | "levelup" | "info" | "combat";
```
`src/ui/EventLogUI.ts`: add to `KIND_COLORS` (compiler-enforced):
```ts
combat: { text: "#ff8a8a", border: 0xff8a8a, fill: 0x3a1414 },
```
Reuses the existing generic `showToast()` path automatically (only
`"recipe"` is special-cased).

---

## 14. HP bar — modify `src/scenes/MainScene.ts`

New `createHealthBar()`, called from `create()` right after
`createStaminaBar()`. Same shape as the stamina bar, stacked one slot above
it via `hotbarUI.top`:

```ts
private createHealthBar(): void {
  const barW = 76;
  const barH = 20;
  const gap = 8;
  const barX = this.scale.width / 2 - barW / 2;
  const staminaBarY = this.hotbarUI.top - gap - barH;
  const barY = staminaBarY - gap - barH; // HP stacks directly above stamina
  this.add
    .rectangle(barX, barY, barW, barH, 0x1a1f2a, 0.95)
    .setOrigin(0, 0).setStrokeStyle(1, 0x3a4250).setScrollFactor(0).setDepth(2000);
  this.healthBarFill = this.add
    .rectangle(barX + 1, barY + 1, barW - 2, barH - 2, 0xb02020, 1)
    .setOrigin(0, 0).setScrollFactor(0).setDepth(2001);
  this.healthBarText = this.add
    .text(barX + barW / 2, barY + barH / 2, "", { fontFamily: "monospace", fontSize: "12px", color: "#ffffff" })
    .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(2002);
  this.refreshHealthBar();
}

private refreshHealthBar(): void {
  const frac = this.health.value() / this.health.max;
  this.healthBarFill.setScale(Math.max(0, frac), 1);
  this.healthBarText.setText(`${Math.round(this.health.value())}`);
}
```
Deliberately duplicates the stamina bar's construction rather than
factoring out a shared helper — matches this codebase's existing style
(stamina bar wasn't factored out of anything either), keeps the diff small.

No new keybind needed — attack reuses `[LMB]`, already documented as
"Interact: Left click".

---

## 15. Sequencing (keep the tree compiling at each step)

1. `src/systems/Health.ts` (new, standalone).
2. `src/systems/Weapons.ts` (new, standalone).
3. `src/systems/Inventory.ts` — widen `ResourceType`.
4. `src/systems/Items.ts` — `weapon` field, wire `wood_club`/`stone_club`,
   add `boar_meat`.
5. `src/scenes/BootScene.ts` — `boar` texture + `icon_boar_meat`.
6. `src/systems/EventLog.ts` — widen `LogKind`.
7. `src/ui/EventLogUI.ts` — add `combat` to `KIND_COLORS`.
8. `src/entities/Player.ts` — facing tracking + equipped-icon methods.
9. `src/entities/Enemy.ts` (new).
10. `src/scenes/MainScene.ts` — integration, in this internal order: fields/
    imports → `recomputeEquipped()` rewrite → `spawnEnemies()` + collider
    wiring → `createHealthBar()` → `updateHover()`/`promptForEnemy()`/
    `tryInteract()`/`tryAttackEnemy()` → `updateEnemies()`/
    `applyDamageToPlayer()`/`onPlayerDeath()`/`respawnPlayer()` →
    `update()` rewrite tying it together.

---

## 16. Verification plan

Per this project's established convention: `preview_eval` against
`window.__game.scene.getScene("MainScene")` for direct state manipulation,
not simulated mouse coordinates.

- **Facing**: simulate held keys via `scene.player["wasd"].right.isDown =
  true` + `scene.player.update(16, true, true)`, confirm `getFacing()`
  updates per direction and persists when keys are released.
- **Equipped visual**: add `stone_club` to hotbar, select its slot, confirm
  `scene.player["equippedIcon"]` becomes visible with the right texture and
  position offset by facing (screenshot to confirm visually); deselect and
  confirm it hides.
- **Weapon equip**: confirm `scene.equippedWeapon`/`scene.equippedTool` are
  mutually exclusive depending on which hotbar slot is selected.
- **Enemy AI**: manually set `enemy.x/y` far vs. near the player, call
  `enemy.update(...)` directly, confirm `state` transitions idle↔chasing and
  velocity points toward the player when chasing.
- **Melee attack + death + loot**: force `scene.hoveredEnemy`, position in
  reach, call `scene.tryAttackEnemy(enemy)` repeatedly until depleted;
  confirm it's removed from `scene.enemies`, a `boar_meat` `ResourceNode`
  appears near the death position, and an event-log "Defeated Boar" entry
  exists. Also confirm weapon-cooldown and stamina-afford gating silently
  block extra hits (poke `scene.stamina["current"] = 0` directly, per this
  project's established private-state-poke convention for tests).
- **Player damage/death/respawn**: `scene.applyDamageToPlayer(200)` to
  one-shot kill; confirm `isDead`, the "You died..." toast, and that
  `scene.player.update` has no effect while frozen (position/velocity
  unchanged even with a movement key held). Either wait out
  `RESPAWN_DELAY_MS` with a real `setTimeout` inside one self-contained
  `preview_eval` call, or call `scene.respawnPlayer()` directly; confirm
  position resets to world center, health refills, and a follow-up
  `applyDamageToPlayer` immediately after is a no-op until
  `invulnerableUntil` elapses. Confirm enemies keep animating during the
  death-freeze window (AI doesn't pause just because the player is dead).
- **HP bar layout**: `preview_screenshot` to confirm it stacks directly
  above the stamina bar with no gap/overlap; `preview_inspect` to confirm
  the Y-offset between the two fills is exactly `barH + gap` (28px).
- **Regression**: run the existing chop/mine flow once to confirm the
  `updateHover()`/`tryInteract()` rewrite didn't break node interaction —
  prompts still gate correctly, and hovering a node vs. an enemy always
  shows exactly one prompt (whichever is closer), never both.
- Finish with `node node_modules/typescript/bin/tsc --noEmit` and a check of
  `preview_console_logs`/`preview_logs` for runtime errors.

---

## 17. Open judgment calls (reasonable defaults, not blocking)

- Player max HP: 100 (matches Stamina's pool size for consistency).
- Boar max HP: 20 (~3–4 stone-club hits or ~7 wood-club hits).
- Boar bite damage: 8; bite cooldown: 1000ms.
- Aggro radius 140px / deaggro 200px (hysteresis gap prevents boundary
  flicker).
- Melee/bite range: 28px — tighter than the player's 64px `REACH`, a
  deliberate asymmetry (weapon reach vs. bare teeth).
- Weapon stats: wood_club 3dmg/450ms/10stam, stone_club 5dmg/550ms/14stam —
  matches existing tooltip numbers, heavier weapon intentionally slower/
  costlier.
- 6 Boars scattered map-wide, same density feel as the existing 8
  boulders/10 trees. No enemy-vs-enemy collider — minor overlap is fine.
- Respawn delay 2000ms (long enough to read the toast); post-respawn
  invulnerability 1500ms.
- Loot: 1–2 `boar_meat` per kill via the existing loose-drop/magnet
  pipeline, unchanged.
- New `"combat"` `LogKind` (red-ish) rather than overloading `"info"`,
  since the `Record<LogKind, {...}>` pattern makes adding a kind cheap and
  compiler-enforced.
- No enemy respawn/repopulation — permadeath per instance for this pass.
- Bite-range check is manual distance math (matching `REACH`'s existing
  convention), not a Phaser overlap callback; the player↔enemy collider
  that does exist is purely for physical separation.

---

## 18. As-built: polish pass (same day, right after the foundation shipped)

Three small enhancements requested after trying the shipped foundation out
in the preview. All implemented and verified — see `STATUS.md`'s "Combat
polish pass" entry for the full verification log.

- **Axe doubles as a weapon.** `stone_axe`'s `ItemDef` now sets both
  `tool: "stone_axe"` and `weapon: "stone_axe"`. `WeaponType`
  (`src/systems/Weapons.ts`) gained a `"stone_axe"` member with its own
  combat numbers (6 dmg / 500ms / 12 stamina — distinct from its 1-dmg
  chopping value, tuned against a very different health pool). Needed zero
  `MainScene` changes since `recomputeEquipped()` already derives
  `equippedTool`/`equippedWeapon` independently from the same selected
  hotbar stack. Pickaxe wasn't given the same treatment (not asked for) —
  same one-line change (`weapon: "stone_pickaxe"` + a `WEAPON_*` table
  entry) would do it.
- **Enemy HP bars.** `Enemy.ts` owns a thin (22x3px) two-`Rectangle` bar
  (dark track + red fill, no number), always visible (not gated on
  "damaged"), kept glued above the sprite via a `preUpdate()` override —
  mirrors `ResourceNode`'s count-label tracking trick. Destroyed alongside
  the enemy in `playDeathFeedback()`.
- **Floating damage numbers.** `MainScene.spawnDamageNumber(x, y, amount)`
  — plain white/black-outline text, rises 24px and fades over 700ms, then
  self-destructs. Called from `tryAttackEnemy()` right after
  `enemy.takeHit(dmg)`. Deliberately plain — damage types/resistances are
  explicitly a "later" concern (see section 19); the hook to color/vary
  this text by type lives here when that system exists.

**Balance observation, not acted on:** 6 Boars in a 1280x960 world with a
140px aggro radius and only a 150px spawn-clear zone means a fresh spawn
can start taking bites within a few real seconds of idling. Flagged in
`STATUS.md`, not fixed — the user's own framing (section 19 below) is that
per-enemy tuning is expected to happen naturally as more enemies are added,
not that this specific Boar's numbers need fixing in isolation right now.

---

## 19. Future direction (user decision, 2026-07-06): per-enemy tunable combat stats

After trying the foundation + polish pass, the user's framing: **this Boar
is a proof-of-concept for the player/enemy interaction loop, not a template
whose exact numbers should be copied verbatim onto future enemies.** As
Gremlin/Snake and later biomes' enemies get built, each one is expected to
tune its own:

- **Aggro radius** and **aggro condition** (the Boar's is a flat radius
  check; a future enemy might aggro on line-of-sight, on the player making
  noise/using a torch, etc. — not necessarily "distance only").
- **Deaggro time/radius/condition** (the Boar deaggros purely by radius
  hysteresis; a future enemy might deaggro after a fixed time out of
  contact instead, or never deaggro once provoked, etc.).
- **DPS** (damage-per-hit × attack cadence, not just a flat bite-damage
  number).
- **HP.**
- **Speed** (both chase speed and wander speed).
- **Attack methods** (melee-only vs. ranged vs. multi-attack vs.
  conditional like Boar's planned-but-deferred charge/fire-fear).

Implication for future enemy work: don't generalize `Enemy.ts`'s current
constants (`AGGRO_RADIUS`, `DEAGGRO_RADIUS`, `CHASE_SPEED`, `MELEE_RANGE`,
`BITE_DAMAGE`, `BITE_COOLDOWN_MS`, `MAX_HEALTH`) into a single shared
config table too early — the intent is real per-enemy variance in both
*values* and *behavioral logic* (different aggro/deaggro conditions,
different attack shapes), not just different numbers plugged into the same
state machine. When Gremlin/Snake get built, expect `Enemy.ts` to need
either per-enemy subclasses/behavior configs, or a more expressive
state-machine hook than the current hardcoded idle/chase/bite three states
— revisit the architecture at that point rather than presupposing it now.
