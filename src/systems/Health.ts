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
