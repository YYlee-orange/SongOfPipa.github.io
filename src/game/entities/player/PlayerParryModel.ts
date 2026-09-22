export interface PlayerParryConfig {
  radius: number;
  activeSeconds: number;
  failureRecoverySeconds: number;
  feedbackSeconds: number;
}

export type PlayerParryState = "ready" | "active" | "recovery";
export type PlayerParryFeedback = "none" | "success" | "miss";

export interface PlayerParrySnapshot {
  state: PlayerParryState;
  feedback: PlayerParryFeedback;
  radius: number;
  activeRemaining: number;
  recoveryRemaining: number;
  feedbackRemaining: number;
  feedbackProgress: number;
}

export class PlayerParryModel {
  private readonly config: PlayerParryConfig;
  private state: PlayerParryState = "ready";
  private feedback: PlayerParryFeedback = "none";
  private activeRemaining = 0;
  private recoveryRemaining = 0;
  private feedbackRemaining = 0;

  constructor(config: PlayerParryConfig) {
    this.config = config;
  }

  update(deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 1))
      : 0;

    this.feedbackRemaining = Math.max(0, this.feedbackRemaining - safeDelta);

    if (this.feedbackRemaining === 0) {
      this.feedback = "none";
    }

    if (this.state === "active") {
      this.activeRemaining = Math.max(0, this.activeRemaining - safeDelta);

      if (this.activeRemaining === 0) {
        this.beginRecovery("miss");
      }
    } else if (this.state === "recovery") {
      this.recoveryRemaining = Math.max(0, this.recoveryRemaining - safeDelta);

      if (this.recoveryRemaining === 0) {
        this.state = "ready";
      }
    }
  }

  tryStart(): boolean {
    if (this.state !== "ready") {
      return false;
    }

    this.state = "active";
    this.activeRemaining = this.config.activeSeconds;
    this.recoveryRemaining = 0;
    this.feedback = "none";
    this.feedbackRemaining = 0;
    return true;
  }

  trySucceed(): boolean {
    if (this.state !== "active") {
      return false;
    }

    this.state = "ready";
    this.activeRemaining = 0;
    this.recoveryRemaining = 0;
    this.feedback = "success";
    this.feedbackRemaining = this.config.feedbackSeconds;
    return true;
  }

  interruptForDamage(): void {
    if (this.state === "active") {
      this.beginRecovery("miss");
    }
  }

  getSnapshot(): Readonly<PlayerParrySnapshot> {
    const feedbackProgress =
      this.feedback === "none" || this.config.feedbackSeconds <= 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              1 - this.feedbackRemaining / this.config.feedbackSeconds,
            ),
          );

    return {
      state: this.state,
      feedback: this.feedback,
      radius: this.config.radius,
      activeRemaining: this.activeRemaining,
      recoveryRemaining: this.recoveryRemaining,
      feedbackRemaining: this.feedbackRemaining,
      feedbackProgress,
    };
  }

  private beginRecovery(feedback: PlayerParryFeedback): void {
    this.state = "recovery";
    this.activeRemaining = 0;
    this.recoveryRemaining = this.config.failureRecoverySeconds;
    this.feedback = feedback;
    this.feedbackRemaining = this.config.feedbackSeconds;
  }
}
