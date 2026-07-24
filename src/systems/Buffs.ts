import type { Health } from "./Health";

// The game's first status-effect (buff) system. Today every buff is a
// heal-over-time from eating cooked food (no instant heal — per the food-system
// design the player shouldn't be able to spam an insta-heal), but the shape
// (id/name/icon + a per-tick effect + duration) is deliberately generic so
// future buffs (stamina regen, a campfire "rested" bonus, damage boosts) can
// slot in without a rewrite.
//
// Framework-free like Health/Stamina — no Phaser dependency, owns no
// GameObjects. MainScene.update() ticks it each frame; BuffBarUI renders
// active() for the HUD strip above the HP bar.
export interface BuffSpec {
  id: string; // stable per-food id — re-applying the same id refreshes duration
  name: string;
  icon: string; // texture key (reuses the food's own icon) for the buff HUD
  hpPerSec: number;
  durationMs: number;
}

export interface ActiveBuff extends BuffSpec {
  remainingMs: number;
}

// Comfort/Bedroll's buff id (MainScene). It sits OUTSIDE the food-buff cap
// (the user: cap food at 2, Comfort exempt) — a Bedroll should never compete
// with two cooked-food buffs for a slot, since it re-applies itself every
// qualifying frame at a tiny remainingMs and would otherwise be the first
// thing evicted the instant a second food buff landed.
const COMFORT_BUFF_ID = "comfort_rest";

export class BuffManager {
  private buffs: ActiveBuff[] = [];
  // Max concurrent FOOD buffs. A locked design cap (currently 2) that future
  // items/buffs may raise — hence a settable field, not a hardcoded constant.
  // Comfort/Bedroll (see COMFORT_BUFF_ID) is exempt and never counted here.
  private maxBuffs = 2;
  // Wisdom's buff/food-duration amplifier (M-SS). Scales the durationMs of
  // every applied buff (and its refresh), so Wisdom lengthens food + Comfort.
  private durationMult = 1;

  setMaxBuffs(n: number): void {
    this.maxBuffs = Math.max(1, n);
  }

  setDurationMult(m: number): void {
    this.durationMult = Math.max(0.1, m);
  }

  // Apply (or refresh) a buff. Re-eating the same food resets its timer to full
  // rather than stacking a second copy; different foods (different ids) run
  // concurrently and their hpPerSec add up. If already at the concurrent cap,
  // a new (distinct) buff evicts whichever active buff has the least time left,
  // so eating always does something rather than silently wasting the food.
  apply(spec: BuffSpec): void {
    const durationMs = spec.durationMs * this.durationMult;
    const existing = this.buffs.find((b) => b.id === spec.id);
    if (existing) {
      Object.assign(existing, spec, { durationMs, remainingMs: durationMs });
      return;
    }
    // Comfort never competes for a cap slot and is never evicted below.
    if (spec.id === COMFORT_BUFF_ID) {
      this.buffs.push({ ...spec, durationMs, remainingMs: durationMs });
      return;
    }
    const foodCount = this.buffs.reduce((n, b) => n + (b.id === COMFORT_BUFF_ID ? 0 : 1), 0);
    if (foodCount >= this.maxBuffs) {
      let minIdx = -1;
      for (let i = 0; i < this.buffs.length; i++) {
        if (this.buffs[i].id === COMFORT_BUFF_ID) continue;
        if (minIdx === -1 || this.buffs[i].remainingMs < this.buffs[minIdx].remainingMs) minIdx = i;
      }
      if (minIdx !== -1) this.buffs.splice(minIdx, 1);
    }
    this.buffs.push({ ...spec, durationMs, remainingMs: durationMs });
  }

  // Advance every buff by `delta` ms, healing via each active buff's hpPerSec
  // and dropping expired ones. Returns whether any healing happened (so the
  // scene refreshes the HP bar) and whether the active SET changed (so the buff
  // HUD rebuilds its icon row instead of only updating countdown text). Healing
  // is clamped to the window a buff actually had left this frame so an expiring
  // buff can't over-heal on its final tick.
  //
  // `suppressHeal` (Phase 1 — HP-regen-prevention zones, e.g. biome-3 miasma):
  // when true, buffs still count DOWN (standing in the zone wastes the buff) but
  // deal no healing — the "no regen" semantics without pausing the timer.
  // `regenMult` scales healing from buffs: 1 = normal, 0 = fully suppressed,
  // and anything between is a partial penalty (poison sits at 0.5 — the user:
  // poison should make regen "significantly worse", not switch it off). Buffs
  // always tick DOWN at full rate regardless, so a debuff can never be waited
  // out by parking under a food buff.
  tick(delta: number, health: Health, regenMult = 1): { healed: boolean; changed: boolean } {
    if (this.buffs.length === 0) return { healed: false, changed: false };
    let healed = false;
    for (const b of this.buffs) {
      const dt = Math.min(b.remainingMs, delta);
      if (regenMult > 0 && b.hpPerSec > 0 && dt > 0) {
        health.heal(b.hpPerSec * regenMult * (dt / 1000));
        healed = true;
      }
      b.remainingMs -= delta;
    }
    const before = this.buffs.length;
    this.buffs = this.buffs.filter((b) => b.remainingMs > 0);
    return { healed, changed: this.buffs.length !== before };
  }

  active(): ActiveBuff[] {
    return this.buffs;
  }

  clear(): void {
    this.buffs = [];
  }
}
