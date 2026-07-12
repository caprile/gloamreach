const MAX_HEALTH = 100;

// Player health pool. Unlike Stamina, there's no passive regeneration — HP
// only changes via takeDamage/heal. A future food/rest system may add slow
// regen; not implemented here.
export class Health {
  private current = MAX_HEALTH;
  private bonusMax = 0; // additive max from Vitality points + relics (see MainScene.syncStatBonuses)
  private healMult = 1; // Vitality "healing received" amplifier (M-SS)

  // Set the healing-received multiplier (Vitality). Applies to EVERY heal()
  // call — food buffs, Comfort, relic kill-heal — so it's one central knob.
  // reset() bypasses heal(), so a full respawn refill is unaffected.
  setHealMult(m: number): void {
    this.healMult = Math.max(0, m);
  }

  get max(): number {
    return MAX_HEALTH + this.bonusMax;
  }

  // Set the additive max bonus (from Endurance stat). Raising it grants the
  // extra HP immediately (current tracks up); it is NOT reset by reset().
  setBonusMax(bonus: number): void {
    const delta = bonus - this.bonusMax;
    this.bonusMax = bonus;
    if (delta > 0) this.current += delta;
    this.current = Math.min(this.current, this.max);
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
    this.current = Math.min(this.max, this.current + amount * this.healMult);
  }

  // Called on respawn. Refills to the current (Endurance-bonused) max; the
  // bonus itself is progression-derived and persists across death.
  reset(): void {
    this.current = this.max;
  }
}
