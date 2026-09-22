export interface PlayerDamageConfig {
  maximumHealth: number;
  hitRadius: number;
  invulnerabilitySeconds: number;
}

export interface PlayerDamageSnapshot {
  health: number;
  maximumHealth: number;
  hitRadius: number;
  invulnerabilityRemaining: number;
  invulnerable: boolean;
  defeated: boolean;
}

export type DamageResult = "damaged" | "defeated" | "ignored";

export class PlayerDamageModel {
  private readonly config: PlayerDamageConfig;
  private health: number;
  private invulnerabilityRemaining = 0;
  private defeated = false;

  constructor(config: PlayerDamageConfig) {
    this.config = config;
    this.health = config.maximumHealth;
  }

  update(deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 1))
      : 0;
    this.invulnerabilityRemaining = Math.max(
      0,
      this.invulnerabilityRemaining - safeDelta,
    );
  }

  tryTakeDamage(): DamageResult {
    if (this.defeated || this.invulnerabilityRemaining > 0) {
      return "ignored";
    }

    this.health = Math.max(0, this.health - 1);

    if (this.health === 0) {
      this.defeated = true;
      this.invulnerabilityRemaining = 0;
      return "defeated";
    }

    this.invulnerabilityRemaining = this.config.invulnerabilitySeconds;
    return "damaged";
  }

  reset(): void {
    this.health = this.config.maximumHealth;
    this.invulnerabilityRemaining = 0;
    this.defeated = false;
  }

  getSnapshot(): Readonly<PlayerDamageSnapshot> {
    return {
      health: this.health,
      maximumHealth: this.config.maximumHealth,
      hitRadius: this.config.hitRadius,
      invulnerabilityRemaining: this.invulnerabilityRemaining,
      invulnerable: this.invulnerabilityRemaining > 0,
      defeated: this.defeated,
    };
  }
}
