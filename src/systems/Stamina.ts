// A future food system will scale this down as food depletes (e.g. at 0
// food, a much smaller max so a full sprint burns out in ~3s just like a
// full pool does today) — not implemented yet, but keep MAX_STAMINA easy to
// turn into a dynamic value fed by food level later.
const MAX_STAMINA = 100;
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
    this.current = Math.min(this.max, this.current + REGEN_PER_SEC * (delta / 1000));
  }
}
