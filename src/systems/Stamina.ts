// A future food system will scale this down as food depletes (e.g. at 0
// food, a much smaller max so a full sprint burns out in ~3s just like a
// full pool does today) — not implemented yet, but keep MAX_STAMINA easy to
// turn into a dynamic value fed by food level later.
// 100 -> 130. A flat baseline lift so ordinary swinging and dodging fits inside
// the starting pool, making Endurance a build choice rather than the price of
// participating (the user: "I shouldn't have to put a million points into stam
// just to have basic combat"). Paired with the ~0.7x weapon-cost rescale in
// Weapons.ts; together a starting Primal Spear goes from 6 swings a bar to ~11.
const MAX_STAMINA = 130;
const REGEN_PER_SEC = 20; // full refill from empty in ~5s
const REGEN_DELAY_MS = 800; // pause after any spend before regen resumes

// Player stamina pool: drains on sprint/dash/tool-swing, regenerates after a
// short delay once nothing has spent from it recently. Kept framework-free
// (no Phaser import), like Hotbar/Inventory — MainScene calls tick() with a
// delta each frame and reads value()/max for the HUD bar.
export class Stamina {
  private current = MAX_STAMINA;
  private elapsed = 0; // running clock fed only by tick(delta)
  private regenAt = 0; // elapsed-time value regen may resume at
  private bonusMax = 0; // additive max from Endurance points (Progression.ts)
  private regenMult = 1; // Endurance stamina-regen-rate amplifier (M-SS)

  // Set the regen-rate multiplier (Endurance). Speeds refill only; the
  // post-spend delay window is unchanged.
  setRegenMult(m: number): void {
    this.regenMult = Math.max(0, m);
  }

  get max(): number {
    return MAX_STAMINA + this.bonusMax;
  }

  value(): number {
    return this.current;
  }

  // Set the additive max bonus (from Endurance stat). Doesn't refill — the
  // extra headroom fills via normal regen.
  setBonusMax(bonus: number): void {
    this.bonusMax = bonus;
  }

  canAfford(amount: number): boolean {
    return this.current >= amount;
  }

  // Instantly add stamina (clamped to max) — the Second Wind relic's on-kill
  // restore. Does NOT touch the regen-delay window.
  restore(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  // Spends `amount` if affordable and re-arms the regen delay. Returns false
  // (no-op) if insufficient — callers should already guard with canAfford
  // before doing anything externally visible, but spend() is defensive too.
  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.current -= amount;
    this.regenAt = this.elapsed + REGEN_DELAY_MS;
    return true;
  }

  // Called every frame from MainScene.update() with Phaser's delta (ms).
  tick(delta: number): void {
    this.elapsed += delta;
    if (this.elapsed < this.regenAt) return; // still in the post-spend delay window
    if (this.current >= this.max) return;
    this.current = Math.min(this.max, this.current + REGEN_PER_SEC * this.regenMult * (delta / 1000));
  }
}
