export interface PlayerAbilityConfig {
  maximumEnergy: number;
  boostCost: number;
  boostDurationSeconds: number;
  feedbackSeconds: number;
  ultimateChargeSeconds: number;
  ultimateAbsorbSeconds: number;
  ultimateFiringSeconds: number;
  ultimateRecoverySeconds: number;
}

export type BoostActivationResult =
  | "activated"
  | "insufficient"
  | "already-active";

export type UltimateState =
  | "idle"
  | "charging"
  | "absorbing"
  | "firing"
  | "recovery";

export type AbilityFeedback =
  | BoostActivationResult
  | "charging"
  | "ultimate"
  | "none";

export interface PlayerAbilityUpdateEvents {
  ultimateStarted: boolean;
  volleyRequested: boolean;
  damageRequested: boolean;
}

export interface PlayerAbilitySnapshot {
  energy: number;
  maximumEnergy: number;
  boostCost: number;
  boosted: boolean;
  boostRemaining: number;
  feedback: AbilityFeedback;
  feedbackRemaining: number;
  ultimateState: UltimateState;
  ultimateChargeProgress: number;
  ultimateRemaining: number;
  chargeProtectionActive: boolean;
  ultimateInvulnerable: boolean;
  bossFirePaused: boolean;
}

export class PlayerAbilityModel {
  private readonly config: PlayerAbilityConfig;
  private energy = 0;
  private boostRemaining = 0;
  private feedback: AbilityFeedback = "none";
  private feedbackRemaining = 0;
  private ultimateState: UltimateState = "idle";
  private ultimateChargeRemaining = 0;
  private ultimateRemaining = 0;

  constructor(config: PlayerAbilityConfig) {
    this.config = config;
  }

  update(
    deltaSeconds: number,
    skillHeld = false,
  ): Readonly<PlayerAbilityUpdateEvents> {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 1))
      : 0;
    const events: PlayerAbilityUpdateEvents = {
      ultimateStarted: false,
      volleyRequested: false,
      damageRequested: false,
    };

    this.boostRemaining = Math.max(0, this.boostRemaining - safeDelta);
    this.feedbackRemaining = Math.max(0, this.feedbackRemaining - safeDelta);

    if (this.feedbackRemaining === 0) {
      this.feedback = "none";
    }

    if (this.ultimateState === "charging") {
      if (skillHeld) {
        this.ultimateChargeRemaining = Math.max(
          0,
          this.ultimateChargeRemaining - safeDelta,
        );
      }

      if (skillHeld && this.ultimateChargeRemaining === 0) {
        this.energy = 0;
        this.boostRemaining = 0;
        this.ultimateState = "absorbing";
        this.ultimateRemaining = Math.max(0, this.config.ultimateAbsorbSeconds);
        this.feedback = "ultimate";
        this.feedbackRemaining = Math.max(0, this.config.feedbackSeconds);
        events.ultimateStarted = true;
      }
    } else if (this.ultimateState === "absorbing") {
      this.ultimateRemaining = Math.max(0, this.ultimateRemaining - safeDelta);

      if (this.ultimateRemaining === 0) {
        this.ultimateState = "firing";
        this.ultimateRemaining = Math.max(0, this.config.ultimateFiringSeconds);
        events.volleyRequested = true;
      }
    } else if (this.ultimateState === "firing") {
      this.ultimateRemaining = Math.max(0, this.ultimateRemaining - safeDelta);

      if (this.ultimateRemaining === 0) {
        this.ultimateState = "recovery";
        this.ultimateRemaining = Math.max(0, this.config.ultimateRecoverySeconds);
        events.damageRequested = true;
      }
    } else if (this.ultimateState === "recovery") {
      this.ultimateRemaining = Math.max(0, this.ultimateRemaining - safeDelta);

      if (this.ultimateRemaining === 0) {
        this.ultimateState = "idle";
      }
    }

    return events;
  }

  gainEnergy(amount = 1): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    const previous = this.energy;
    this.energy = Math.min(
      Math.max(0, this.config.maximumEnergy),
      this.energy + amount,
    );
    return this.energy - previous;
  }

  beginSkillPress(): void {
    if (this.ultimateState !== "idle" || this.boostRemaining > 0) {
      this.setFeedback("already-active");
      return;
    }

    if (this.energy >= this.config.maximumEnergy) {
      this.ultimateState = "charging";
      this.ultimateChargeRemaining = Math.max(
        0,
        this.config.ultimateChargeSeconds,
      );
      this.feedback = "charging";
      this.feedbackRemaining = Math.max(
        this.config.feedbackSeconds,
        this.config.ultimateChargeSeconds,
      );
      return;
    }

    this.tryActivateBoost();
  }

  releaseSkillPress(): void {
    if (this.ultimateState !== "charging") {
      return;
    }

    this.ultimateState = "idle";
    this.ultimateChargeRemaining = 0;
    this.tryActivateBoost();
  }

  tryActivateBoost(): BoostActivationResult {
    if (this.boostRemaining > 0 || this.ultimateState !== "idle") {
      return this.setFeedback("already-active");
    }

    const cost = Math.max(0, this.config.boostCost);

    if (this.energy < cost) {
      return this.setFeedback("insufficient");
    }

    this.energy -= cost;
    this.boostRemaining = Math.max(0, this.config.boostDurationSeconds);
    return this.setFeedback("activated");
  }

  cancelForDamage(): void {
    this.boostRemaining = 0;

    if (this.ultimateState === "charging") {
      this.ultimateState = "idle";
      this.ultimateChargeRemaining = 0;
    }
  }

  cancelBoost(): void {
    this.cancelForDamage();
  }

  getSnapshot(): Readonly<PlayerAbilitySnapshot> {
    const chargeDuration = Math.max(0.0001, this.config.ultimateChargeSeconds);
    const ultimateActive =
      this.ultimateState === "absorbing" ||
      this.ultimateState === "firing" ||
      this.ultimateState === "recovery";

    return {
      energy: this.energy,
      maximumEnergy: this.config.maximumEnergy,
      boostCost: this.config.boostCost,
      boosted: this.boostRemaining > 0,
      boostRemaining: this.boostRemaining,
      feedback: this.feedback,
      feedbackRemaining: this.feedbackRemaining,
      ultimateState: this.ultimateState,
      ultimateChargeProgress:
        this.ultimateState === "charging"
          ? Math.max(
              0,
              Math.min(
                1,
                1 - this.ultimateChargeRemaining / chargeDuration,
              ),
            )
          : 0,
      ultimateRemaining: this.ultimateRemaining,
      chargeProtectionActive: this.ultimateState === "charging",
      ultimateInvulnerable: ultimateActive,
      bossFirePaused: ultimateActive,
    };
  }

  private setFeedback<T extends BoostActivationResult>(result: T): T {
    this.feedback = result;
    this.feedbackRemaining = Math.max(0, this.config.feedbackSeconds);
    return result;
  }
}
