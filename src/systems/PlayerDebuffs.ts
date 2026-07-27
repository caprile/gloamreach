// Player DEBUFFS — the bayou's signature status layer, and the first thing in
// the game that stops the player *doing* something rather than merely damaging
// or slowing them. Framework-free like Health/Stamina/Bleed/Poison: owns no
// GameObjects, ticked with delta so it freezes with a paused run.
//
// Deliberately SEPARATE from Bleed/Poison rather than folded in. Those are
// damage-over-time with a dps + duration; these are boolean capability locks
// (or, for enfeeble, a magnitude) whose whole design problem is UPTIME, not
// stacking damage. The two need different rules, and the diminishing-returns
// ladder below is the rule that only makes sense here.
//
// WHY TERRAIN IS NOT IN HERE (locked, the user: the dispel clears "control +
// DoTs, but not terrain"): a miasma's slow/no-regen is recomputed every frame
// from environmentEffectAt and never enters this manager, so a cleanse
// structurally cannot touch it — and standing in the fog re-arms poison on the
// very next frame. That decision needs no "undispellable" flag; it falls out of
// where the state lives.

export type DebuffKind = "root" | "disarm" | "silence" | "enfeeble";

export const DEBUFF_KINDS: DebuffKind[] = ["root", "disarm", "silence", "enfeeble"];

// CANONICAL BASE DURATIONS — reference only, deliberately NOT read by the
// enemies (per the standing "don't fold per-enemy combat stats into one shared
// config table" rule, each attack owns its own constant). This exists so a
// future author adding a debuff source knows what "standard" means and any
// deviation is a visible decision rather than a drift.
//
// Raised into a 5-10s band 2026-07-26 (the user: "I think the debuffs aren't
// long enough... every debuff should be 5-10 to start"), sized against the
// resistance actually available: at Magic 20 + an Uncommon warding relic at
// Tier 2 the total cut is only 25%, so these stay near their base values for
// most of a run — the 75% floor is a very-late-game ceiling, not the norm.
//
// The band is ordered by how much each one takes away, not uniformly: ROOT sits
// at the bottom because it is the only debuff that stops you AVOIDING damage
// (the other three leave you dodging), and ENFEEBLE sits at the top because it
// never takes control away at all — it just makes the fight longer, so it has to
// outlast a swing cycle to be felt.
export const DEBUFF_BASE_MS: Record<DebuffKind, number> = {
  root: 5000,
  disarm: 6000,
  silence: 6000,
  enfeeble: 10000,
};

export interface DebuffDef {
  kind: DebuffKind;
  name: string;
  // Shown on the blocked action, in caps — losing control needs an immediate
  // cause, and every hook this gates was previously a SILENT fail path.
  callout: string;
  icon: string; // BootScene-baked status icon
  fx: string; // BootScene-baked world FX texture attached to the player
  color: number; // accent for the status HUD + the FX tint
  // Mechanical line for the status tooltip. Takes the live magnitude so
  // enfeeble can quote its real number rather than a nominal one.
  detail: (magnitude: number) => string;
}

export const DEBUFF_DEFS: Record<DebuffKind, DebuffDef> = {
  root: {
    kind: "root",
    name: "Rooted",
    callout: "ROOTED!",
    icon: "icon_status_root",
    fx: "fx_debuff_root",
    color: 0x7a9b3a,
    detail: () => "Cannot move or dash — you can still fight",
  },
  disarm: {
    kind: "disarm",
    name: "Disarmed",
    callout: "DISARMED!",
    icon: "icon_status_disarm",
    fx: "fx_debuff_disarm",
    color: 0xc06a2a,
    detail: () => "Cannot attack — you can still move and gather",
  },
  silence: {
    kind: "silence",
    name: "Silenced",
    callout: "SILENCED!",
    icon: "icon_status_silence",
    fx: "fx_debuff_silence",
    color: 0x8a5cc4,
    detail: () => "Cannot cast abilities (Q/E/R)",
  },
  enfeeble: {
    kind: "enfeeble",
    name: "Enfeebled",
    callout: "ENFEEBLED!",
    icon: "icon_status_enfeeble",
    fx: "fx_debuff_enfeeble",
    color: 0x5f8f6a,
    detail: (m) => `Deal ${Math.round(m * 100)}% less damage`,
  },
};

// --- Diminishing returns ---
//
// THE load-bearing anti-chain-lock rule. Without it, per-application duration is
// irrelevant: four Murklings landing a 1.5s root on their own cadences produce
// ~100% root uptime no matter how short any single one is, and the player simply
// stops playing. Successive applications of the SAME kind inside the window land
// at 100% -> 50% -> 25% -> fully immune, then the ladder resets once the window
// lapses clean. Classic MMO/MOBA shape, chosen because it is the one players
// already read correctly.
//
// Per-KIND, not global: being rooted should not make you harder to silence.
const DR_FACTORS = [1, 0.5, 0.25, 0];
// Measured from the last application (not from expiry) so a long debuff doesn't
// pay for its own duration twice.
//
// 12s -> 18s when the base durations were raised to the 5-10s band
// (2026-07-26). The window has to meaningfully OUTLAST the longest debuff or the
// ladder only ever bites during overlapping applications: at 12s a 10s enfeeble
// left just 2s of memory after expiry, so re-applying 3s later paid full price
// again. 18s leaves 8s of real memory on the longest one and 13s on a root.
const DR_WINDOW_MS = 18000;
// Below this an application isn't worth the HUD churn — it reads as a flicker.
const MIN_EFFECTIVE_MS = 120;

interface DebuffState {
  kind: DebuffKind;
  remainingMs: number;
  durationMs: number; // the effective duration, for the HUD depletion meter
  magnitude: number; // enfeeble: fraction of damage lost (0.3 = -30%)
}

interface DrState {
  stacks: number;
  windowMs: number;
}

export interface ActiveDebuff {
  kind: DebuffKind;
  def: DebuffDef;
  remainingMs: number;
  durationMs: number;
  magnitude: number;
}

export class PlayerDebuffs {
  private states = new Map<DebuffKind, DebuffState>();
  private dr = new Map<DebuffKind, DrState>();
  private immunities = new Set<DebuffKind>();
  private resistMult = 1;
  // A post-cleanse grace window. Without it, the frame after a dispel can
  // re-apply the exact debuff that was just cleared (the enemy that applied it
  // is still standing on you), which reads as the button doing nothing.
  private immuneUntilMs = 0;
  // Kinds that landed this frame — MainScene drains this to fire the callout +
  // FX exactly once per application rather than polling for "is new".
  private justApplied: DebuffKind[] = [];

  // --- configuration, pushed in from MainScene on every equipment/relic change ---

  // Scales the DURATION of every incoming debuff. Same aggregate MainScene uses
  // to thin a bleed/poison dose, so one number describes "status resistance"
  // everywhere it appears.
  setResistMult(mult: number): void {
    this.resistMult = Math.max(0, mult);
  }

  setImmunities(kinds: Iterable<DebuffKind>): void {
    this.immunities = new Set(kinds);
    // An immunity acquired while already suffering that debuff should clear it
    // — otherwise equipping the counter-item does nothing until it lapses.
    for (const k of this.immunities) this.states.delete(k);
  }

  isImmune(kind: DebuffKind): boolean {
    return this.immunities.has(kind);
  }

  // --- application ---

  // Returns true if the debuff actually landed (false = immune, DR-blocked, or
  // resisted below the floor), so the caller can skip its FX.
  apply(kind: DebuffKind, durationMs: number, magnitude = 0, nowMs = 0): boolean {
    if (this.immunities.has(kind)) return false;
    if (nowMs > 0 && nowMs < this.immuneUntilMs) return false;

    const dr = this.dr.get(kind) ?? { stacks: 0, windowMs: 0 };
    const factor = DR_FACTORS[Math.min(dr.stacks, DR_FACTORS.length - 1)];
    // Refresh the window even on a fully-diminished application: sitting in a
    // swarm keeps you immune rather than letting the ladder reset mid-fight.
    dr.stacks = Math.min(dr.stacks + 1, DR_FACTORS.length - 1);
    dr.windowMs = DR_WINDOW_MS;
    this.dr.set(kind, dr);
    if (factor <= 0) return false;

    const effective = durationMs * factor * this.resistMult;
    if (effective < MIN_EFFECTIVE_MS) return false;

    const existing = this.states.get(kind);
    if (existing) {
      // Refresh-don't-stack: keep whichever is worse on each axis. Four
      // simultaneous attackers must not mean four roots.
      existing.remainingMs = Math.max(existing.remainingMs, effective);
      existing.durationMs = Math.max(existing.durationMs, effective);
      existing.magnitude = Math.max(existing.magnitude, magnitude);
    } else {
      this.states.set(kind, { kind, remainingMs: effective, durationMs: effective, magnitude });
      this.justApplied.push(kind);
    }
    return true;
  }

  tick(delta: number): void {
    for (const [kind, s] of this.states) {
      s.remainingMs -= delta;
      if (s.remainingMs <= 0) this.states.delete(kind);
    }
    for (const [kind, d] of this.dr) {
      d.windowMs -= delta;
      if (d.windowMs <= 0) this.dr.delete(kind);
    }
  }

  // --- queries (the hook points read these) ---

  has(kind: DebuffKind): boolean {
    return this.states.has(kind);
  }

  any(): boolean {
    return this.states.size > 0;
  }

  remainingMs(kind: DebuffKind): number {
    return this.states.get(kind)?.remainingMs ?? 0;
  }

  // Damage multiplier from enfeeble (1 = unaffected). Floored so no magnitude
  // can zero the player's damage outright.
  damageMult(): number {
    const s = this.states.get("enfeeble");
    return s ? Math.max(0.2, 1 - s.magnitude) : 1;
  }

  active(): ActiveDebuff[] {
    // Stable DEBUFF_KINDS order, so the HUD row never reshuffles as effects
    // come and go (StatusBarUI rebuilds whenever the id SET changes).
    const out: ActiveDebuff[] = [];
    for (const kind of DEBUFF_KINDS) {
      const s = this.states.get(kind);
      if (!s) continue;
      out.push({
        kind,
        def: DEBUFF_DEFS[kind],
        remainingMs: s.remainingMs,
        durationMs: s.durationMs,
        magnitude: s.magnitude,
      });
    }
    return out;
  }

  // Drain the "landed this frame" queue — one callout/FX burst per application.
  drainJustApplied(): DebuffKind[] {
    if (this.justApplied.length === 0) return [];
    const out = this.justApplied;
    this.justApplied = [];
    return out;
  }

  // --- the dispel ---

  // Clears every active debuff and returns what was cleared (empty = nothing to
  // do, which the caller uses to avoid burning a cooldown on a clean player).
  // `graceMs` blocks re-application briefly so the enemy standing on you can't
  // undo the cleanse on the very next frame.
  dispel(nowMs = 0, graceMs = 0): DebuffKind[] {
    const cleared = [...this.states.keys()];
    this.states.clear();
    // The DR ladder is deliberately NOT reset — otherwise a cleanse would also
    // refund your protection against being re-locked, which is backwards.
    if (graceMs > 0) this.immuneUntilMs = nowMs + graceMs;
    return cleared;
  }

  clear(): void {
    this.states.clear();
    this.dr.clear();
    this.justApplied = [];
    this.immuneUntilMs = 0;
  }
}
