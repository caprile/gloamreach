import Phaser from "phaser";
import type { ResourceType } from "../systems/Inventory";
import type { IncomingDamageType } from "../systems/Weapons";
import { placeholderDims } from "../art/overrides";
import { ysortDepth } from "../systems/depth";

export type EnemyState = "idle" | "chasing";

// Souls-like attack phases shared by every telegraphed melee attack (see the
// per-attack skeleton in the plan): a wind-up the player can react to, a brief
// strike window where the hit is checked against the player's CURRENT position
// (so leaving reach during the wind-up dodges it), and a recovery window where
// the enemy is planted and vulnerable — the punish window. This is a shared
// MECHANISM; each enemy tunes its own durations/reach/damage (per the standing
// "don't fold per-enemy combat stats into one config table" rule).
export type AttackPhase = "none" | "windup" | "strike" | "recover";

// Config for the base in-place telegraphed swing (Enemy.tickMeleeSwing). Each
// caller passes its own numbers; nothing here is a shared constant.
export interface SwingConfig {
  reach: number; // px — strike hit-check distance (player must still be within this at strike time)
  windupMs: number; // telegraph/dodge window before the hit lands
  strikeMs: number; // brief active window after the hit resolves
  recoverMs: number; // planted/vulnerable punish window after the strike
  cooldownMs: number; // gap after recovery before another swing can start
  knockback?: number; // optional px/s shove applied to the player on connect
  // Optional per-enemy telegraph styling. The default tell (a 1.18x scale punch
  // in amber) is deliberately subtle — right for ordinary trash, but it reads
  // the same on a chip-damage nip as on a heavy that will take a third of your
  // health, and it says nothing about REACH. A heavy attacker should look heavy.
  tell?: {
    punchScale?: number; // scale multiplier at full wind-up (default 1.18)
    color?: number; // wind-up tint (default amber)
    // px/s the enemy drifts AWAY from the player while winding up. A visible
    // rear-back both reads as "something big is coming" and previews the lunge,
    // which is how the player learns the reach without a world-space arc (the
    // standing "tells are motion + tint, never red arcs" lock).
    rearBackSpeed?: number;
  };
}

// Base "default melee enemy" swing timings — used by Enemy.update() (the
// canonical telegraphed-swing reference) and mirrored by the weak Gremling.
const BASE_SWING: SwingConfig = {
  reach: 28, // matches the old MELEE_RANGE
  windupMs: 400,
  strikeMs: 90,
  recoverMs: 450,
  cooldownMs: 250,
};

const AGGRO_RADIUS = 105; // px — player enters this range, Boar starts chasing (Milestone B: tuned down from 140, "too aggressive" playtest flag)
const DEAGGRO_RADIUS = 190; // wider gap than AGGRO_RADIUS to avoid boundary flicker (kept ~2x aggro, same ratio as before)
const CHASE_SPEED = 60; // px/s — slower than player base (95), so it's escapable
const WANDER_SPEED = 20; // px/s idle wander
const MELEE_RANGE = 28; // px — how close the default melee enemy must be to start a swing

// Default "give up eventually" behavior for any non-boss enemy (user
// decision, see STATUS.md/memory): if 30s of continuous pursuit passes
// without landing a single attack — obstacles, a kiting player, whatever the
// cause — back off instead of pursuing forever. The give-up is intentionally
// distinct from the ordinary distance-based deaggro above (target simply
// left aggro range, which re-triggers instantly on return): this one also
// grants a short window where normal proximity won't re-trigger aggro,
// unless the player gets right up close or actually attacks it. These live
// on the base class (not Boar-specific constants) since the mechanism itself
// is meant to be a shared default future enemies opt into, even though each
// enemy still tunes its own aggro/deaggro *radius* per the standing
// "don't share one config table" decision.
const CHASE_GIVEUP_MS = 30000;
const POST_GIVEUP_IMMUNITY_MS = 5000;
const CLOSE_REAGGRO_RADIUS = 50; // px — overrides the immunity window even before it expires

// Aggro persistence (playtest: ranged attacks — Slingshot/Javelin, or simply
// backing off after landing a hit — put the player outside a melee enemy's
// own DEAGGRO_RADIUS, so the raw per-frame distance check flipped it back to
// idle almost immediately after being hit; aggro read as "for a second" not
// "for a fight"). This decouples deaggro from a pure instantaneous distance
// check: any aggro trigger (proximity or taking a hit) keeps the target
// "remembered" for AGGRO_PERSIST_MS even while outside the deaggro radius, so
// an enemy has real time to close the distance instead of losing the player
// the instant a ranged hit puts them beyond melee range. A shared MECHANISM
// on the base class (like canAggro/CHASE_GIVEUP above) — each subclass still
// owns its own deaggro *radius*, this only gates how quickly that radius
// check is allowed to fire.
const AGGRO_PERSIST_MS = 4000;

// How long a big boss is invulnerable while a phase transition plays. Long
// enough to read as a deliberate beat, short enough not to feel like a wasted
// turn — and it pauses the boss's own state machine, so it isn't free damage
// time for the player either.
const PHASE_TRANSITION_MS = 900;

// Absolute ceiling on one continuous pursuit, measured from when it began and
// NEVER reset — only cleared when the enemy actually disengages.
//
// CHASE_GIVEUP_MS above is reset by every landed hit, which is correct on its
// own terms (a fight that's connecting shouldn't time out mid-swing) but means
// anything that keeps touching you can never give up: a Mirejaw chomping every
// 1.2s refreshed a 30s clock forever. That's the melee half of the same defect
// the ranged casters had (see markAttackAttempted) — they got fixed, melee
// didn't. So landing hits still extends pursuit via the 30s clock, but nothing
// can push past this ceiling; eventually the thing has to break off and you get
// to leave. Shared on the base class so every melee species inherits it rather
// than each one growing its own leash.
const MAX_PURSUIT_MS = 45000;

// One independently-rolled drop entry. Most enemies (Boar, Snake) have a
// single entry; the ranged Gremlin variant drops two (skin + blood) — see
// EnemyConfig.loot below, which is why this is an array rather than a single
// resource/min/max triple.
export interface LootEntry {
  resource: ResourceType;
  min: number;
  max: number;
  // Drop probability 0..1. Absent = always drops, which every entry was until
  // the Gravemark Rubbing needed to be an occasional find rather than a
  // guaranteed one from a common creature.
  chance?: number;
}

// Every elite drops exactly one trophy (M-RL prerequisite — reverses the
// M-EL2-era "Elite Gremlings drop no trophy" special case). Centralized here so
// the rule holds for every elite type, present and future, without each
// subclass restating it in its own loot literal.
// The trophy TYPE is per-species (Boar -> boar_trophy, Snake -> snake_trophy,
// Gremlin/Gremling -> gremlin_trophy), so each elite drops a unique trophy.
// Subclasses set EnemyConfig.eliteTrophy; it defaults to gremlin_trophy.
const DEFAULT_ELITE_TROPHY: ResourceType = "gremlin_trophy";

export interface EnemyConfig {
  x: number;
  y: number;
  texture: string;
  displayName: string;
  loot: LootEntry[];
  maxHealth: number;
  biteDamage: number;
  // Elite variant (default false). When true, one trophy drop is appended to
  // `loot` (see the constructor) and Run.ts scores the kill as "elite".
  // Subclasses pass this through from their own cfg.
  elite?: boolean;
  // Which trophy an elite drops (unique per species). Ignored when not elite;
  // defaults to gremlin_trophy. Boar/Snake override it with their own type.
  eliteTrophy?: ResourceType;
  // Per-damage-type incoming multiplier (Biome 2 Phase 1). <1 = resistant,
  // >1 = weak; any type absent = 1 (neutral). Lets badlands enemies teach the
  // damage-type layer (e.g. a rock reptile resists blunt, is weak to pierce)
  // purely as data — the resist math lives in MainScene.resolveWeaponHit. Empty
  // for every biome-1 enemy, so their combat is unchanged. Keyed by
  // IncomingDamageType (the weapon types PLUS "fire") so an enemy can also resist
  // or be weak to the player's fire damage (set-bonus thorns/Emberblink nova) —
  // applied in MainScene.dealSetBonusDamage.
  resistances?: Partial<Record<IncomingDamageType, number>>;
  // Visual facing mode. DEFAULT (true, as of the 2026-07 art pass) = non-rotating:
  // the sprite mirrors left/right via flipX with only a slight up/down tilt, never
  // rotating past horizontal (applyUprightFacing). Every creature texture is drawn
  // facing RIGHT so this reads correctly. This is PURELY VISUAL — it never affects
  // attack direction/hit-checks, which use x/y distance math, so an enemy can
  // still hit you while its sprite faces a slightly different way. Set false only
  // for a sprite that genuinely wants to rotate to point along travel (nothing
  // does today) — that path keeps the old nose-first full-360° rotation.
  upright?: boolean;
  // Multiplies the overhead HP-bar size (and a subclass's poise bar, which reads
  // barW/barOffsetY). Default 1. Mini-bosses pass ~2.4 so their bars are readable
  // over a large sprite. Purely cosmetic.
  barScale?: number;
}

// A simple melee enemy (currently only "Boar"). Ranged attacks, ambush AI,
// charge, and fear-of-fire are all deliberately out of scope for this pass —
// see CLAUDE.md's "First biome — content notes" for the fuller roster.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly displayName: string;
  private readonly loot: LootEntry[];
  private readonly biteDamageValue: number;
  readonly maxHealth: number;
  health: number;
  depleted = false;
  // Elite variant flag (default false). Set from EnemyConfig.elite in the
  // constructor; read for run-score kill classification (see Run.ts) and to
  // append the shared trophy drop.
  elite = false;

  // --- Big-boss pacing guards (2026-07-24). Both default OFF, so every normal
  // enemy behaves exactly as before and only the three main bosses opt in. ---
  //
  // Per-hit damage ceiling, as a FRACTION of maxHealth. An overlevelled crit +
  // AOE build deleted the Miretyrant inside a single attack-speed ability window
  // (the user at level 31: "I killed the myrtyrant in 1 burst of my attack speed
  // ability ... that was not fun. I want to feel strong but not insta delete
  // bosses"). Capping per HIT guarantees a floor on how many connects a boss
  // takes without touching player damage anywhere else in the world — it is an
  // invisible governor that only a build far past the curve ever notices.
  // 0 = uncapped.
  maxHitFraction = 0;

  // HP fractions, DESCENDING, at which this enemy locks into a brief scripted
  // invulnerable transition. Guarantees each phase is actually seen instead of
  // being blown through: a burst can no longer cross two thresholds unwitnessed.
  phaseGates: readonly number[] = [];
  private phaseGatesPassed = 0;
  private phaseInvulnUntil = 0;

  // Brief post-spawn damage immunity (absolute ms; 0 = none). Mosslings burst
  // out of a dying Mosswretch directly into the arc the player is already
  // swinging, so a crit + AOE sweep deleted them on their first frame and the
  // split read as "nothing happened" (the user, 2026-07-24). Unlike
  // isPhaseLocked() this ONLY refuses damage — they still move and aggro, so the
  // swarm still closes on you; it just gets to exist first.
  spawnInvulnUntil = 0;

  // Per-damage-type incoming multiplier (Biome 2 Phase 1). Read by
  // MainScene.resolveWeaponHit via resistMultiplier(); empty for biome-1 enemies.
  private readonly resistances: Partial<Record<IncomingDamageType, number>>;
  // Set true for a single takeHit() by MainScene.resolveWeaponHit when the hit
  // came from a RANGED weapon, so the position-shake in playHitFeedback is
  // suppressed (the user: "bow stagger is still there — every hit ministaggers").
  // Melee keeps the shake for feel. Read+reset inside playHitFeedback, so it's a
  // one-shot flag no subclass takeHit() override has to thread through.
  suppressHitShake = false;
  // --- swarm pack-aggro (Biome 2 Phase 1, opt-in) ---
  // When true, this enemy both propagates aggro to and receives aggro from
  // nearby same-type pack members (MainScene.updatePackAggro drives it). Off by
  // default so only Phase 2's swarm creature opts in — every existing enemy is
  // unaffected. packAggroRadius is how close a woken ally must be to also wake.
  packAggro = false;
  packAggroRadius = 220;
  state: EnemyState = "idle";
  private wanderTarget: { x: number; y: number } | null = null;
  private nextWanderAt = 0;
  // Give-up/immunity state (see CHASE_GIVEUP_MS etc. above) — protected so a
  // future subclass overriding update() entirely can still reuse the same
  // clock/helpers below rather than reimplementing the mechanism.
  protected pursuitClockStart = 0;
  // -1 = not currently pursuing. See MAX_PURSUIT_MS.
  protected pursuitHardStart = -1;
  protected aggroImmuneUntil = 0;
  // Movement-speed multiplier (default 1). Elite variants set this >1 and
  // multiply their chase/pursue/kite speeds by it in update(). Base value keeps
  // every ordinary enemy identical.
  protected speedMult = 1;
  // Environmental movement multiplier, set each frame by MainScene (1 by day,
  // NIGHT_ENEMY_SPEED_MULT at night — M-DN). Public so the scene can assign it
  // without threading it through update()'s signature. Multiplied alongside
  // speedMult into aggressive-movement velocities (chase/pursue/kite/strike);
  // idle wander is deliberately left at base speed. GremlinKing's overridden
  // update() ignores it, so the boss stays exempt from the night speed buff.
  envSpeedMult = 1;

  // Whether this enemy is physically blocked by solid terrain (the `solids`
  // group — boulderfield rocks, future walls/structures). Default FALSE: every
  // current enemy rolls freely through rocks (the player still collides), which
  // is what the user wants for boulderfields — the rocks are cover/a maze for the
  // player, not an enemy trap (the Cragscale's rolling charge got wedged on
  // them). A future enemy that SHOULD be blocked by terrain sets this true; the
  // scene's enemy↔solids collider gates separation on it per-instance. NOTE:
  // turning this on for an enemy also needs an AI response to being stuck (see
  // the deleted zigzag-avoidance history in feedback_enemy_obstacle_avoidance /
  // feedback_boar_zigzag_movement) — a plain straight-line chaser will wedge.
  collidesWithTerrain = false;

  // Whether this creature is exempt from the environmental move-slow the player
  // suffers (deep bayou water, thornfield bramble — see
  // MainScene.environmentEffectAt). Default FALSE: an earlier pass deliberately
  // made enemies inherit the same terrain slow, because in the swamp the player
  // wades at 50% while enemies ignored it entirely and nothing could be outrun.
  //
  // A creature that is genuinely AT HOME in the terrain sets this true (C1: the
  // Mirejaw). That inverts the relationship on purpose — in open ground you can
  // outpace it, but the moment you're both in the water it is faster than you
  // are, which is what makes the water ITS territory rather than just scenery.
  // Kept as a flag on the base class rather than a Mirejaw special-case so a
  // future aquatic creature gets the same treatment for free.
  ignoresTerrainSlow = false;

  // Where this enemy was spawned. Every subclass's idle wander is an incremental
  // random walk, and a chase can end anywhere the player led it, so over a long
  // run creatures migrate a long way from where they belong (the user: badlands
  // Duskrunners turning up in the starting forest). MainScene.steerEnemyHome()
  // uses this to walk a non-aggro'd enemy back when it strays too far — a
  // post-update steer, exactly like steerCryptEnemy, so no subclass wander code
  // changes. Subclasses with their OWN tighter anchor (den/shack guards) keep it;
  // this is the coarse backstop for everything else.
  readonly homeX: number;
  readonly homeY: number;

  // Temporary slow (Executioner crit relic). A timestamp + factor (0.7 = 30%
  // slower); the scene folds slowMult() into envSpeedMult each frame so it
  // rides the same aggressive-movement path with no per-subclass wiring.
  private slowUntil = 0;
  private slowFactor = 1;
  applySlow(factor: number, ms: number, now: number): void {
    const cur = now < this.slowUntil ? this.slowFactor : 1;
    this.slowFactor = Math.min(cur, factor); // keep the stronger slow
    this.slowUntil = now + ms;
  }
  slowMult(now: number): number {
    if (now >= this.slowUntil) {
      this.slowFactor = 1;
      return 1;
    }
    return this.slowFactor;
  }

  // --- souls-like attack telegraph state (see AttackPhase above) ---
  // protected so subclasses driving their own attack (Boar charge, Snake
  // lunge, Gremlin claw) can read/advance the same phase clock and reuse the
  // wind-up tell rather than each re-inventing it.
  protected attackPhase: AttackPhase = "none";
  protected attackStartedAt = 0;
  protected lastAttackEndAt = -Infinity;
  // Knockback (px/s) to apply to the player when the current attack connects,
  // read by MainScene.updateEnemies() on the frame the bite lands (0 = none).
  // Set by tickMeleeSwing (from SwingConfig.knockback) or directly by a
  // subclass's own attack (e.g. Boar's charge gore).
  pendingAttackKnockback = 0;
  // Bleed (damage-over-time) to apply to the player when the current attack
  // connects, read by MainScene.updateEnemies() the frame the hit lands, then
  // cleared. null = no bleed (every attack except Cragscale's rolling charge).
  // Rides the same i-frame guard as the hit's direct damage, so a dashed-through
  // roll applies neither.
  pendingBleed: { dmgPerSec: number; durationMs: number } | null = null;
  // Poison (biome 3) to apply when the current attack connects — same contract
  // as pendingBleed (read + cleared by MainScene.updateEnemies on the landing
  // frame, so it rides the same i-frame guard). null = no poison. A creature
  // dose is DISCRETE and stacks (PoisonManager.apply), unlike the miasma's
  // sustained environmental slot. The Blighttoad is the first user.
  pendingPoison: { dmgPerSec: number; durationMs: number } | null = null;
  // The unscaled/base display scale to restore after a wind-up scale-pulse.
  // Elites bump this to their own scale so the pulse throbs around the right
  // size (see each subclass's elite branch).
  protected baseScale = 1;
  // Handle to the current wind-up pulse tween so it can be stopped/reset
  // cleanly without killTweensOf() clobbering the HP-bar hit-feedback shake.
  private windupTween?: Phaser.Tweens.Tween;
  // True for a humanoid sprite (see EnemyConfig.upright) — applyFacing mirrors
  // via flipX instead of rotating.
  private upright = false;

  // Thin world-space HP bar (no number, just a bar) — separate GameObjects
  // rather than a Container, gone glued to position every frame via
  // preUpdate, matching ResourceNode's count-label tracking convention.
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  // protected (not private) so a subclass can position a second bar (e.g.
  // GremlinKing's poise bar) consistently against these same constants.
  protected static readonly BAR_W = 22;
  protected static readonly BAR_H = 3;
  protected static readonly BAR_OFFSET_Y = 16; // px above the sprite's center
  // Per-instance bar size (2026-07-15): mini-bosses pass cfg.barScale so their
  // HP + poise bars are big/overhead and readable over a 1.7–1.8× sprite instead
  // of the tiny shared 22×3. Default 1 = every regular enemy is unchanged. A
  // subclass drawing a second bar (poise) reads these instead of the statics.
  protected readonly barW: number;
  protected readonly barH: number;
  protected readonly barOffsetY: number;

  constructor(scene: Phaser.Scene, cfg: EnemyConfig) {
    super(scene, cfg.x, cfg.y, cfg.texture);
    this.displayName = cfg.displayName;
    this.elite = cfg.elite ?? false;
    // Elites always drop one trophy (unique per species) on top of their own
    // loot table.
    this.loot = this.elite
      ? [...cfg.loot, { resource: cfg.eliteTrophy ?? DEFAULT_ELITE_TROPHY, min: 1, max: 1 }]
      : cfg.loot;
    this.maxHealth = cfg.maxHealth;
    this.health = cfg.maxHealth;
    this.biteDamageValue = cfg.biteDamage;
    this.resistances = cfg.resistances ?? {};
    this.homeX = cfg.x;
    this.homeY = cfg.y;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Real art is authored bigger than the placeholder it replaces (PixelLab's
    // canvas floor is 32px against a 14-32px roster), and an Arcade body
    // defaults to the frame size. Left alone, every creature's collider would
    // silently grow — which holds the player further from its centre and
    // changes how a tuned melee threshold feels. Pin the body to the footprint
    // the combat numbers were tuned against, exactly as Player does on its own
    // 48px rig canvas. Purely visual growth from here on.
    const was = placeholderDims(cfg.texture);
    if (was) (this.body as Phaser.Physics.Arcade.Body).setSize(was.w, was.h, true);
    this.setCollideWorldBounds(true); // matches Player — without this, chase/flee/kite AI can walk enemies off the map
    this.setDepth(ysortDepth(cfg.y)); // Y-sorted against the player/trees, see preUpdate
    // Non-rotating by default (2026-07 art pass): randomize only the left/right
    // MIRROR so a field of idle creatures isn't all facing the same way, without
    // ever rotating the sprite off-vertical. The rare opt-out (upright:false)
    // instead randomizes a full spawn rotation — nothing uses it today.
    this.upright = cfg.upright ?? true;
    if (this.upright) {
      this.setFlipX(Phaser.Math.Between(0, 1) === 1);
    } else {
      this.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }

    const scale = cfg.barScale ?? 1;
    this.barW = Enemy.BAR_W * scale;
    this.barH = scale > 1 ? Math.round(Enemy.BAR_H * scale) : Enemy.BAR_H;
    this.barOffsetY = Enemy.BAR_OFFSET_Y * scale;
    const barX = cfg.x - this.barW / 2;
    const barY = cfg.y - this.barOffsetY;
    this.healthBarBg = scene.add
      .rectangle(barX, barY, this.barW, this.barH, 0x1a1f2a, 0.85)
      .setOrigin(0, 0.5);
    this.healthBarFill = scene.add
      .rectangle(barX, barY, this.barW, this.barH, 0xd02020, 1)
      .setOrigin(0, 0.5);
  }

  // Keeps the HP bar glued to the sprite (and its fill in sync with current
  // health) every frame, independent of MainScene's own update() cadence —
  // same reasoning as ResourceNode's count-label preUpdate override. Also
  // keeps the enemy's own depth Y-sorted against the player and trees/
  // boulders (which are now walk-through-able but still visually occlude
  // whatever is "behind" them, see MainScene.updateTreeOcclusion).
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.setDepth(ysortDepth(this.y));
    const barX = this.x - this.barW / 2;
    const barY = this.y - this.barOffsetY;
    const aggro = this.isAggro();
    this.healthBarBg.setPosition(barX, barY).setDepth(this.depth + 1).setVisible(aggro);
    // Fill sits a depth above the bg (not equal) so it always draws OVER the dark
    // backing — equal depth falls back to display-list order, which B4-P6's
    // stream-out/re-add can invert, painting the dark bg over the fill ("dark red").
    this.healthBarFill.setPosition(barX, barY).setDepth(this.depth + 2).setVisible(aggro);
    this.healthBarFill.setScale(Math.max(0, this.health / this.maxHealth), 1);
  }

  // Whether the HP bar should be shown right now — only while actively
  // aggro'd on the player, not at rest. Base default matches Boar's own
  // state field; Snake overrides this since it tracks aggro via its own
  // hidden/striking/fleeing mode instead of the shared `state` field. Public
  // so MainScene's M-DN dawn-cleanup can spare a night-spawn that engaged.
  isAggro(): boolean {
    return this.state === "chasing";
  }

  // Whether the player can target/hit this enemy right now (hover-to-attack +
  // weapon-arc sweep). Default: any live enemy. The Sandmaw overrides this to
  // false while submerged, so a lurking ambusher can't be clicked/swept before
  // it surfaces (the user: "sand guy shouldn't be attackable while invisible").
  isTargetable(): boolean {
    return !this.depleted;
  }

  get biteDamage(): number {
    return this.biteDamageValue;
  }

  // Incoming-damage multiplier for a given damage type (Biome 2 Phase 1). 1 =
  // neutral (the default for any type not listed in this enemy's resistances).
  // Accepts "fire" too (IncomingDamageType) so set-bonus fire damage can be
  // resisted/amplified (S2 decision 3).
  resistMultiplier(type: IncomingDamageType): number {
    return this.resistances[type] ?? 1;
  }

  // Wake this enemy into a chase without dealing it damage — a pack member
  // reacting to a nearby ally engaging (swarm pack-aggro, Biome 2 Phase 1).
  // No-op if depleted or already chasing; clears the post-giveup immunity so a
  // woken ally actually commits rather than shrugging it off. Drives the base
  // `state` machine; a subclass that tracks aggro via its OWN field (Boar/Snake/
  // Gremlin use a private `mode`) MUST override this to flip that field — the
  // exact same reason they override isAggro(). Phase 2's swarm creature (the
  // first real packAggro user) will either use the base machine or override
  // both, so this base version stays correct for the common case.
  forceAggro(now: number): void {
    if (this.depleted || this.state === "chasing") return;
    this.state = "chasing";
    this.startPursuit(now);
    this.aggroImmuneUntil = 0;
  }

  // Resource(s) dropped on death — data-driven per EnemyConfig so MainScene's
  // attack handler doesn't need per-species branching (Boar -> boar_meat,
  // Snake -> leather, ranged Gremlin -> skin + blood, etc.). Each entry is
  // rolled independently.
  rollLoot(): { resource: ResourceType; amount: number }[] {
    return this.loot
      .filter((entry) => entry.chance === undefined || Math.random() < entry.chance)
      .map((entry) => ({
        resource: entry.resource,
        amount: Phaser.Math.Between(entry.min, entry.max),
      }));
  }

  // --- give-up / re-aggro-immunity helpers (see constants above) ---

  // Call when starting a fresh pursuit (idle -> chasing).
  protected startPursuit(now: number): void {
    this.pursuitClockStart = now;
    this.extendAggroPersist(now);
  }

  // Call whenever this enemy successfully lands an attack — resets the
  // give-up clock so a fight that's actually landing hits never times out.
  protected markAttackLanded(now: number): void {
    this.pursuitClockStart = now;
    this.extendAggroPersist(now);
  }

  // Call when an attack is merely ATTEMPTED (a shot fired, which may well miss)
  // as opposed to landed. Keeps the target remembered — an enemy mid-fight
  // shouldn't lose you between shots — but deliberately does NOT reset the
  // give-up clock.
  //
  // Ranged casters used to call markAttackLanded() at FIRE time, which made them
  // literally incapable of ever giving up: a cast cooldown shorter than
  // AGGRO_PERSIST_MS meant the persistence window was refreshed forever and the
  // 30s pursuit clock was reset forever, whether or not a single orb connected.
  // That is the "ranged dudes never deaggro" playtest report. A landed projectile
  // now routes back through onProjectileHitPlayer() below, so the give-up rule
  // means what it says: 30s of pursuit without CONNECTING backs off.
  protected markAttackAttempted(now: number): void {
    this.extendAggroPersist(now);
  }

  // A projectile this enemy fired actually hit the player — the ranged
  // counterpart of a melee swing connecting (see markAttackAttempted above).
  // Public because the hit is resolved by the scene's overlap handler, not here.
  onProjectileHitPlayer(now: number): void {
    this.markAttackLanded(now);
  }

  private aggroPersistUntil = -Infinity;

  // Refresh the aggro-persistence window (see AGGRO_PERSIST_MS above) — called
  // on every aggro trigger: starting pursuit, landing a hit, and taking a hit.
  protected extendAggroPersist(now: number): void {
    // Stamp the hard-ceiling clock at the start of an ENGAGEMENT. Done here
    // rather than in startPursuit() because several subclasses drive their own
    // private mode field and never call startPursuit — but every aggro path
    // (pursuit start, landed hit, taking a hit) reaches this method, so the
    // ceiling can't be silently skipped.
    //
    // "A new engagement" = the persistence window had already lapsed, i.e. this
    // enemy had genuinely lost you rather than being mid-fight. Keying off that
    // instead of only enterGivenUpState() matters because most subclasses
    // deaggro by DISTANCE and never call it (Mirejaw just submerges) — without
    // this, a gator that lost you once would carry a spent ceiling forever and
    // insta-give-up on every later fight. Caught in verification.
    const newEngagement = this.pursuitHardStart < 0 || now >= this.aggroPersistUntil;
    this.aggroPersistUntil = now + AGGRO_PERSIST_MS;
    if (newEngagement) this.pursuitHardStart = now;
  }

  // True while still within the persistence window — a subclass's distance-
  // based deaggro check should be gated on this being false, not fire purely
  // off `dist > deaggroRadius`.
  protected withinAggroPersist(now: number): boolean {
    return now < this.aggroPersistUntil;
  }

  // True once continuous pursuit has run long enough without landing a hit
  // that the default "back off for a while" behavior should kick in.
  protected hasGivenUpPursuit(now: number): boolean {
    if (now - this.pursuitClockStart >= CHASE_GIVEUP_MS) return true;
    // The hard ceiling: unlike the clock above, landing a hit does not reset it.
    return this.pursuitHardStart >= 0 && now - this.pursuitHardStart >= MAX_PURSUIT_MS;
  }

  // Whether normal aggro-radius proximity should be allowed to (re-)trigger
  // a chase right now. False during the post-giveup immunity window, unless
  // the player is close enough to override it (see CLOSE_REAGGRO_RADIUS).
  protected canAggro(dist: number, now: number): boolean {
    return now >= this.aggroImmuneUntil || dist <= CLOSE_REAGGRO_RADIUS;
  }

  // Enter the post-giveup window: ignores ordinary-range re-aggro for
  // POST_GIVEUP_IMMUNITY_MS. Close proximity or being attacked (see
  // takeHit()) both override it early.
  protected enterGivenUpState(now: number): void {
    this.aggroImmuneUntil = now + POST_GIVEUP_IMMUNITY_MS;
    // Disengaging is the only thing that clears the hard ceiling, so the next
    // engagement gets a fresh full-length pursuit.
    this.pursuitHardStart = -1;
  }

  // Called every frame from MainScene.updateEnemies(). Returns true if a
  // bite lands this frame — caller applies damage to Health so Enemy doesn't
  // need to know about Player/Health directly.
  update(delta: number, playerX: number, playerY: number, now: number): boolean {
    if (this.depleted) return false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    if (this.state === "idle" && dist <= AGGRO_RADIUS && this.canAggro(dist, now)) {
      this.state = "chasing";
      this.startPursuit(now);
    } else if (this.state === "chasing" && !this.isAttacking()) {
      // Ordinary "target left" case — no re-aggro immunity, resumes instantly
      // if the player comes back within range. Never deaggro mid-swing: a
      // committed telegraphed attack always plays out (dodge = leave its reach).
      if (dist > DEAGGRO_RADIUS && !this.withinAggroPersist(now)) {
        this.state = "idle";
      } else if (this.hasGivenUpPursuit(now)) {
        // 30s of trying without landing a single hit — back off instead of
        // pursuing forever (default non-boss behavior, see constants above).
        this.state = "idle";
        this.enterGivenUpState(now);
      }
    }

    if (this.state === "chasing") {
      // Telegraphed melee: once in reach (or already mid-swing), drive the
      // wind-up → strike → recover cycle instead of biting on contact. The
      // strike re-checks the player's position, so backpedaling/dashing out
      // during the wind-up dodges it, and the recovery is a punish window.
      if (this.isAttacking() || dist <= MELEE_RANGE + this.reachBonus()) {
        const hit = this.tickMeleeSwing(body, playerX, playerY, now, BASE_SWING);
        if (hit) {
          this.markAttackLanded(now);
          return true; // strike connects
        }
        return false; // committed to the swing, or in range on cooldown → hold
      }
      // Trees/boulders no longer block movement, so there's nothing left to
      // get stuck on — chase straight at the player every frame (the old
      // ground-truth stuck-detection/escape-heading heuristic that used to
      // live here is gone, see STATUS.md history).
      const directAngle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      const chaseSpeed = CHASE_SPEED * this.speedMult * this.envSpeedMult;
      const vx = Math.cos(directAngle) * chaseSpeed;
      const vy = Math.sin(directAngle) * chaseSpeed;
      body.setVelocity(vx, vy);
      this.applyFacing(vx, vy);
      return false;
    }

    // Idle wander: pick a small nearby target periodically, drift toward it.
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
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        body.setVelocity(vx, vy);
        this.applyFacing(vx, vy);
      }
    }
    return false;
  }

  // Facing update from a travel vector. Default (upright) sprites take the
  // flipX path (applyUprightFacing) — no rotation. The legacy full-360° branch
  // below (only reachable when upright===false, which nothing uses today) rotates
  // a nose-first-left sprite to point along travel (angle offset by PI). Skips
  // the update while nearly stopped so it keeps its last facing (e.g. mid-bite)
  // instead of snapping to an arbitrary angle from a near-zero velocity.
  protected applyFacing(vx: number, vy: number): void {
    if (Math.abs(vx) < 3 && Math.abs(vy) < 3) return;
    if (this.upright) {
      this.applyUprightFacing(vx, vy);
      return;
    }
    this.setRotation(Math.atan2(vy, vx) + Math.PI);
  }

  // Upright/humanoid facing (Hexling): the sprite is drawn standing, front-on —
  // rotating it to point along travel (like the nose-first Boar) would flip it
  // upside-down whenever it moves up/down. Instead mirror left/right via flipX
  // and only lean a few degrees toward up/down, never near horizontal.
  private static readonly UPRIGHT_MAX_TILT = 0.22; // ~12.6°, well short of 90°
  private applyUprightFacing(vx: number, vy: number): void {
    if (Math.abs(vx) > 3) this.setFlipX(vx < 0);
    const tilt = Phaser.Math.Clamp(vy / 260, -Enemy.UPRIGHT_MAX_TILT, Enemy.UPRIGHT_MAX_TILT);
    this.setRotation(tilt);
  }

  // Face an explicit direction (radians), bypassing applyFacing's
  // near-stopped guard — for telegraphs where the enemy is planted but must
  // point where it's about to strike (Boar charge wind-up, Snake coil). Passing
  // a unit vector to applyFacing silently no-ops (magnitude < 3), which is why
  // those tells previously didn't rotate the sprite. Same nose-first PI offset.
  protected faceAngle(angle: number): void {
    if (this.upright) {
      this.applyUprightFacing(Math.cos(angle), Math.sin(angle));
      return;
    }
    this.setRotation(angle + Math.PI);
  }

  // Same shape/feel as ResourceNode.takeHit: apply damage + feedback, return
  // true once depleted so the caller awards loot and destroys.
  takeHit(damage: number): boolean {
    // A phase transition is a scripted beat, not a damage window.
    if (this.isPhaseLocked()) return false;
    if (this.scene.time.now < this.spawnInvulnUntil) return false;
    this.health = Math.max(0, this.health - this.effectiveDamage(damage));
    this.playHitFeedback();
    // Being attacked always overrides the post-giveup immunity window — an
    // enemy that just backed off doesn't stand there tanking hits without
    // fighting back.
    this.aggroImmuneUntil = 0;
    this.extendAggroPersist(this.scene.time.now);
    if (this.state === "idle") {
      this.state = "chasing";
      this.startPursuit(this.scene.time.now);
    }
    if (this.health <= 0) return true;
    this.checkPhaseGate();
    return false;
  }

  // --- Area-attack telegraphs (2026-07-24) ---
  //
  // the user: "attack area needs to show for the alligators". This deliberately
  // REVERSES the original locked "tells are motion/tint, never world-space
  // arcs" rule, re-locked with him to: an AREA attack (sweep, cone, radial
  // slam, pounce lane) shows its footprint; a single-target bite or claw still
  // does not. The reasoning is that a wind-up POSE can tell you a bite is
  // coming, but nothing about a pose tells you a tail sweep reaches 120 degrees
  // behind the gator. The bosses already worked exactly this way (GremlinKing's
  // slam, Gloamwarden's smash, the Miretyrant's own sweep), so this extends an
  // established language to the rest of the roster instead of inventing one.
  //
  // Kept low-alpha and thin-ringed on purpose — the original objection to arcs
  // was that they looked goofy, and a loud red wedge would earn that.
  private areaTelegraphGfx?: Phaser.GameObjects.Graphics;

  // Created on first use, so an enemy that never telegraphs adds nothing to the
  // display list (B4-P6: list length is the frame-rate ceiling).
  private areaTelegraph(): Phaser.GameObjects.Graphics {
    if (!this.areaTelegraphGfx) this.areaTelegraphGfx = this.scene.add.graphics();
    this.areaTelegraphGfx.clear();
    this.areaTelegraphGfx.setDepth(this.depth + 0.5);
    return this.areaTelegraphGfx;
  }

  // A filled disc that grows toward the true radius as `frac` (0..1) runs, under
  // a fixed ring at the REAL radius — so the ring tells you where the edge is
  // from frame one and the fill tells you how long you have.
  protected drawAreaCircle(x: number, y: number, radius: number, frac: number, color: number): void {
    const g = this.areaTelegraph();
    g.fillStyle(color, 0.09 + 0.2 * frac);
    g.fillCircle(x, y, radius * (0.5 + 0.5 * frac));
    g.lineStyle(2, color, 0.55);
    g.strokeCircle(x, y, radius);
  }

  // Same semantics for a wedge centred on `angle`, spanning +/- halfAngle. Used
  // for sweeps/cones, where the whole point is that the safe side isn't obvious.
  protected drawAreaWedge(
    x: number,
    y: number,
    radius: number,
    angle: number,
    halfAngle: number,
    frac: number,
    color: number,
  ): void {
    const g = this.areaTelegraph();
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(x, y)];
    const steps = 14;
    const grown = radius * (0.5 + 0.5 * frac);
    for (let i = 0; i <= steps; i++) {
      const a = angle - halfAngle + (i / steps) * halfAngle * 2;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * grown, y + Math.sin(a) * grown));
    }
    g.fillStyle(color, 0.08 + 0.2 * frac);
    g.fillPoints(pts, true);
    // Outer edge at the TRUE radius, so the reach is readable immediately.
    g.lineStyle(2, color, 0.5);
    g.beginPath();
    g.arc(x, y, radius, angle - halfAngle, angle + halfAngle, false);
    g.strokePath();
  }

  // A lane/corridor the attacker will travel through (pounces, charges) — the
  // dodge is stepping off the line, so the line is what gets drawn.
  protected drawAreaLane(
    toX: number,
    toY: number,
    halfWidth: number,
    frac: number,
    color: number,
  ): void {
    const g = this.areaTelegraph();
    const a = Math.atan2(toY - this.y, toX - this.x);
    const px = -Math.sin(a) * halfWidth;
    const py = Math.cos(a) * halfWidth;
    g.fillStyle(color, 0.09 + 0.2 * frac);
    g.fillPoints(
      [
        new Phaser.Geom.Point(this.x + px, this.y + py),
        new Phaser.Geom.Point(toX + px, toY + py),
        new Phaser.Geom.Point(toX - px, toY - py),
        new Phaser.Geom.Point(this.x - px, this.y - py),
      ],
      true,
    );
    g.lineStyle(2, color, 0.5);
    g.strokeCircle(toX, toY, halfWidth);
  }

  protected clearAreaTelegraph(): void {
    this.areaTelegraphGfx?.clear();
  }

  // The damage a hit ACTUALLY applies, after this enemy's per-hit ceiling.
  //
  // A subclass that chips a SECOND meter from the same hit (the bosses' poise)
  // must route its raw damage through this too — otherwise a capped hit would
  // still break poise at full value and one burst would hand over the stagger
  // punish window it was supposed to have to earn.
  protected effectiveDamage(raw: number): number {
    return this.maxHitFraction > 0 ? Math.min(raw, this.maxHealth * this.maxHitFraction) : raw;
  }

  // True while a scripted phase transition is playing: no HP damage, no poise
  // chip, and (the bosses check this at the top of update) no acting either.
  isPhaseLocked(): boolean {
    return this.scene.time.now < this.phaseInvulnUntil;
  }

  // Advances at most ONE gate per hit on purpose: if a single hit somehow lands
  // past two thresholds, the second transition still plays on the next hit
  // rather than being silently swallowed, so no phase is ever skipped.
  private checkPhaseGate(): void {
    if (this.phaseGatesPassed >= this.phaseGates.length) return;
    if (this.health > this.maxHealth * this.phaseGates[this.phaseGatesPassed]) return;
    this.phaseGatesPassed += 1;
    this.phaseInvulnUntil = this.scene.time.now + PHASE_TRANSITION_MS;
    this.playPhaseTransitionTell();
  }

  // The transition's read: a hard white flash that decays back to the HP tint,
  // plus a swell. Deliberately loud — it has to be obvious that hits are being
  // refused right now, or the invulnerability reads as damage not registering.
  private playPhaseTransitionTell(): void {
    this.scene.tweens.killTweensOf(this);
    this.setTint(0xffffff);
    const baseScale = this.baseScale;
    this.scene.tweens.add({
      targets: this,
      scale: baseScale * 1.22,
      duration: PHASE_TRANSITION_MS * 0.35,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.depleted) return;
        this.setScale(baseScale);
        this.applyHpTint();
      },
    });
  }

  // Never disrupt a committed attack — the x-shake below writes this.x directly
  // and snaps it back on complete, which reads as an interrupt whether or not it
  // technically is one (souls-like: you can't stunlock a committed attack).
  //
  // 2026-07-24: this used to skip the shake only while the attacker was MOVING,
  // on the theory that jittering a planted one was harmless. It wasn't. A
  // planted attacker is exactly the case a ranged player creates — you stand off
  // and plink a caster all the way through its wind-up, so every shot visibly
  // knocked it sideways and the user read the bow as carrying a mini-stun ("the
  // stagger thing with bows needs to go away"). Any committed attack phase now
  // suppresses it; the HP tint is still the hit confirmation, and a genuine
  // stagger remains a real, separate, poise-driven mechanic on the bosses.
  private playHitFeedback(): void {
    // Ranged hits never shake (bow-only, the user) — one-shot flag set by
    // resolveWeaponHit, consumed here. Melee still shakes for feel.
    const noShake = this.suppressHitShake;
    this.suppressHitShake = false;
    if (this.isAttacking() || noShake) {
      this.applyHpTint();
      return;
    }
    this.scene.tweens.killTweensOf(this);
    const baseX = this.x;
    this.scene.tweens.add({
      targets: this,
      x: baseX + 4,
      duration: 60,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.x = baseX;
      },
    });
    this.applyHpTint();
  }

  // The health-based body tint (white → dark red as HP drops). Extracted from
  // playHitFeedback so the wind-up tell can flash a warning color and then
  // restore the correct HP tint afterward.
  protected applyHpTint(): void {
    const frac = this.health / this.maxHealth;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 255, 255),
      new Phaser.Display.Color(140, 20, 20),
      100,
      Math.round((1 - frac) * 100),
    );
    this.setTint(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
  }

  // --- souls-like telegraph helpers (shared mechanism, per-enemy numbers) ---

  // True while committed to any attack phase — callers should stop moving the
  // enemy (it's planted) while this holds, so the wind-up/recovery reads as a
  // real commitment the player can punish.
  isAttacking(): boolean {
    return this.attackPhase !== "none";
  }

  protected attackElapsed(now: number): number {
    return now - this.attackStartedAt;
  }

  // Wind-up "tell" for a telegraphed attack — a scale "load up" plus a warning
  // tint held through the wind-up (deliberately NOT a world-space red arc, per
  // the locked direction: players learn hitboxes from the animation, not an
  // explicit danger zone). Finite tween (no repeat:-1 leak), snapped back to
  // baseScale by endWindupTell at the strike.
  protected playWindupTell(windupMs: number, color = 0xffd24a, punchScale = 1.18): void {
    this.windupTween?.stop();
    this.setScale(this.baseScale);
    const punch = this.baseScale * punchScale;
    this.windupTween = this.scene.tweens.add({
      targets: this,
      scaleX: punch,
      scaleY: punch,
      duration: windupMs,
      ease: "Quad.easeIn",
    });
    this.setTint(color);
  }

  // Release the wind-up: snap scale back and restore the HP-based tint. Called
  // at the strike moment (the snap-back reads as the swing releasing).
  protected endWindupTell(): void {
    this.windupTween?.stop();
    this.windupTween = undefined;
    this.setScale(this.baseScale);
    this.applyHpTint();
  }

  // Extra melee reach to offset the collider separation added by a larger
  // (elite) body. The player↔enemy physics collider keeps their centers apart
  // by roughly the sum of their body half-widths, so a sprite scaled up past 1
  // can never get its center as close to the player's as a normal-sized one —
  // a flat reach/strike threshold tuned for scale 1 then becomes unreachable
  // (elite Gremling: 19.8px settle vs a 20px reach = whiffs the swing start on
  // most approach angles). This returns exactly the half-width the scaling
  // added, so an elite keeps the same effective reach-past-its-edge as a normal
  // enemy. Uses baseScale (the resting size), not the live wind-up-pulsed scale,
  // and is 0 for any unscaled enemy — mirrors MainScene.enemyReach()'s
  // size-scaling, but for the enemy's OWN attack rather than the player's.
  /**
   * The gameplay scale (elite bump, boss scaling) with any art-driven size
   * change excluded — i.e. how much bigger this enemy is *meant* to be, not how
   * much bigger its texture happens to be. Callers that measure an enemy
   * against its tuned footprint multiply by this.
   */
  artFootprintScale(): number {
    return this.baseScale;
  }

  protected reachBonus(): number {
    return Math.max(0, (this.baseScale - 1) * (Math.max(this.width, this.height) / 2));
  }

  // Drives a full in-place telegraphed swing (wind-up → strike → recover →
  // cooldown) for a simple melee enemy. Holds the enemy planted the whole
  // time. Returns true on the single frame the strike connects — i.e. the
  // player is still within cfg.reach at strike time, which is what makes
  // dodging out during the wind-up actually work. The caller applies the
  // damage (via Enemy.update()'s existing boolean contract).
  //
  // Call this every frame while the enemy wants to melee: the caller starts a
  // swing by calling it once the player is in reach, and MUST keep calling it
  // while isAttacking() even if the player leaves reach (that's the dodge).
  protected tickMeleeSwing(
    body: Phaser.Physics.Arcade.Body,
    playerX: number,
    playerY: number,
    now: number,
    cfg: SwingConfig,
  ): boolean {
    body.setVelocity(0, 0); // planted for the whole interaction
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);

    switch (this.attackPhase) {
      case "windup": {
        // A heavy attacker rears back as it loads the swing (see SwingConfig.tell)
        // — but never further than its own reach. Without this cap, a swing that
        // STARTS near the edge of reach can retreat far enough over the whole
        // windup to carry itself out of its own strike range, whiffing a player
        // who never moved at all (playtest: "mosswretch/little tree dudes don't
        // hit me even standing still" — SMASH_SWING's rearBackSpeed 46 over a
        // 780ms windup drifts ~36px, more than enough to clear its 88px reach).
        // The rear-back is meant to be a readable TELL, not a second dodge
        // window on top of the strike-time recheck below.
        const effReach = cfg.reach + this.reachBonus();
        // A few px of buffer absorbs the one-frame lag between "dist just
        // crossed effReach" and the next tick actually seeing it — without it,
        // the last rear-back step of any given frame rate can still overshoot
        // the line by a hair and whiff a strike that should have connected.
        const REAR_BACK_BUFFER = 4;
        if (cfg.tell?.rearBackSpeed && dist > 1 && dist < effReach - REAR_BACK_BUFFER) {
          const ang = Phaser.Math.Angle.Between(playerX, playerY, this.x, this.y);
          body.setVelocity(Math.cos(ang) * cfg.tell.rearBackSpeed, Math.sin(ang) * cfg.tell.rearBackSpeed);
        }
        if (this.attackElapsed(now) >= cfg.windupMs) {
          this.attackPhase = "strike";
          this.attackStartedAt = now;
          this.endWindupTell();
          const hit = dist <= effReach; // hit-check against CURRENT position
          this.pendingAttackKnockback = hit ? cfg.knockback ?? 0 : 0;
          return hit;
        }
        return false;
      }
      case "strike":
        if (this.attackElapsed(now) >= cfg.strikeMs) {
          this.attackPhase = "recover";
          this.attackStartedAt = now;
        }
        return false;
      case "recover":
        if (this.attackElapsed(now) >= cfg.recoverMs) {
          this.attackPhase = "none";
          this.lastAttackEndAt = now;
        }
        return false;
      default:
        // Not attacking: start a fresh swing if off cooldown. Facing is locked
        // here (not re-tracked through the wind-up), so a player who steps
        // around during the tell can dodge.
        if (now - this.lastAttackEndAt >= cfg.cooldownMs) {
          this.attackPhase = "windup";
          this.attackStartedAt = now;
          this.applyFacing(playerX - this.x, playerY - this.y);
          this.playWindupTell(cfg.windupMs, cfg.tell?.color, cfg.tell?.punchScale);
        }
        return false;
    }
  }

  // Abandon any in-flight swing and restart the attack cooldown from `now`.
  //
  // Used when the player ARRIVES somewhere already occupied — descending into a
  // dungeon puts them a few pixels from dwellers that may have been left
  // mid-wind-up (or long off cooldown) from a previous visit, so the first
  // thing that happens is an unavoidable hit with no tell (the user playtest:
  // "enemies insta attacking me when I enter dungeon"). Resetting the phase
  // guarantees the next attack starts from the top, telegraph and all — which
  // is the whole contract the souls-like combat pass is built on.
  resetAttackState(now: number): void {
    this.attackPhase = "none";
    this.attackStartedAt = now;
    this.lastAttackEndAt = now;
    this.pendingAttackKnockback = 0;
    this.endWindupTell();
  }

  // The HP bar is two sibling GameObjects, NOT children of this sprite, so
  // Phaser's own destroy() leaves them behind. Every death goes through
  // playDeathFeedback (which destroys them), but a DESPAWN doesn't: a lapsed
  // Sunken Shrine rite, the dawn cull of night spawns and a den reset all call
  // destroy() on a live enemy, and each one used to strand a floating health bar
  // in the world forever (the user: "after the shrine lapses the HP bars of the
  // enemies are still there"). Cleaning up here covers every path, present and
  // future, instead of patching each despawn site.
  //
  // A subclass with an extra meter (poise) overrides this and calls super.
  destroy(fromScene?: boolean): void {
    this.windupTween?.stop();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    // Sibling GameObject, same as the bars — a despawn path that forgot these
    // is exactly how stranded HP bars got left all over the swamp.
    this.areaTelegraphGfx?.destroy();
    super.destroy(fromScene);
  }

  // Death feedback (fade), then the caller destroys/removes from tracking
  // and spawns loot. Kept out of takeHit so MainScene can read x/y for the
  // loot drop before anything moves/destructs.
  playDeathFeedback(onComplete: () => void): void {
    this.depleted = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.scene.tweens.killTweensOf(this);
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    // A corpse must not keep painting a threat marker during its fade-out.
    this.areaTelegraphGfx?.destroy();
    this.areaTelegraphGfx = undefined;
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
