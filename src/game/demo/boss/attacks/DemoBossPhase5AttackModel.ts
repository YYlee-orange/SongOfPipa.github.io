import { SeededRandom } from "../../../systems/SeededRandom.ts";
import type {
  DemoBossAttackContext,
  DemoBossAttackModel,
  DemoBossAttackShot,
  DemoBossAttackSnapshot,
} from "./DemoBossAttackModel.ts";

export interface DemoBossPhase5AttackConfig {
  ultimateChance: number;
  guaranteedUltimateAfterBasics: number;
  trackingMaximumSeconds: number;
  verticalLockTolerance: number;
  centerY: number;
  basicChargeSeconds: number;
  basicActiveSeconds: number;
  ultimatePositioningMaximumSeconds: number;
  ultimateChargeSeconds: number;
  ultimateActiveSeconds: number;
  basicRecoverySeconds: number;
  ultimateRecoverySeconds: number;
  basicMinimumY: number;
  basicMaximumY: number;
  upperSweepStartAngle: number;
  upperSweepEndAngle: number;
  lowerSweepStartAngle: number;
  lowerSweepEndAngle: number;
  randomSeed: number;
}

export type DemoBossPhase5LaserState =
  | "basic-tracking"
  | "basic-charge"
  | "basic-active"
  | "ultimate-positioning"
  | "ultimate-charge"
  | "ultimate-active"
  | "recovery";

type LaserMode = "basic" | "ultimate";
type SweepCorner = "top" | "bottom";

/** 第五阶段只负责激光招式选择与时序；碰撞和显示由独立激光模块处理。 */
export class DemoBossPhase5AttackModel implements DemoBossAttackModel {
  private readonly config: DemoBossPhase5AttackConfig;
  private readonly decisionRandom: SeededRandom;
  private readonly cornerRandom: SeededRandom;
  private state: DemoBossPhase5LaserState = "basic-tracking";
  private mode: LaserMode = "basic";
  private stateRemaining = 0;
  private stateDuration = 0;
  private lockedLaserY: number | null = null;
  private sweepStartCorner: SweepCorner | null = null;
  private laserAttackId = 0;
  private consecutiveBasicAttacks = 0;
  private basicAttacksFired = 0;
  private ultimateAttacksFired = 0;

  constructor(config: DemoBossPhase5AttackConfig) {
    this.config = config;
    this.decisionRandom = new SeededRandom(config.randomSeed);
    this.cornerRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
    this.beginNextAttack();
  }

  update(
    deltaSeconds: number,
    context: Readonly<DemoBossAttackContext>,
  ): readonly Readonly<DemoBossAttackShot>[] {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    if (!context.allowFiring) {
      return [];
    }

    const bossY = context.bossPosition?.y ?? context.muzzlePosition.y;
    if (this.state === "basic-tracking") {
      this.stateRemaining = Math.max(0, this.stateRemaining - safeDelta);
      if (
        Math.abs(bossY - context.playerPosition.y) <=
          Math.max(0, this.config.verticalLockTolerance) ||
        this.stateRemaining <= 0
      ) {
        this.lockedLaserY = clamp(
          context.playerPosition.y,
          this.config.basicMinimumY,
          this.config.basicMaximumY,
        );
        this.enterState("basic-charge", this.config.basicChargeSeconds);
      }
      return [];
    }

    if (this.state === "ultimate-positioning") {
      this.stateRemaining = Math.max(0, this.stateRemaining - safeDelta);
      if (
        Math.abs(bossY - this.config.centerY) <=
          Math.max(0, this.config.verticalLockTolerance) ||
        this.stateRemaining <= 0
      ) {
        this.enterState("ultimate-charge", this.config.ultimateChargeSeconds);
      }
      return [];
    }

    this.stateRemaining = Math.max(0, this.stateRemaining - safeDelta);
    if (this.stateRemaining > 0) {
      return [];
    }

    if (this.state === "basic-charge") {
      this.basicAttacksFired += 1;
      this.enterState("basic-active", this.config.basicActiveSeconds);
    } else if (this.state === "basic-active") {
      this.consecutiveBasicAttacks += 1;
      this.enterState("recovery", this.config.basicRecoverySeconds);
    } else if (this.state === "ultimate-charge") {
      this.ultimateAttacksFired += 1;
      this.consecutiveBasicAttacks = 0;
      this.enterState("ultimate-active", this.config.ultimateActiveSeconds);
    } else if (this.state === "ultimate-active") {
      this.enterState("recovery", this.config.ultimateRecoverySeconds);
    } else {
      this.beginNextAttack();
    }

    return [];
  }

  getSnapshot(): Readonly<DemoBossAttackSnapshot> {
    const sweepProgress = this.state === "ultimate-active"
      ? 1 - this.stateRemaining / Math.max(0.05, this.stateDuration)
      : 0;
    const startCorner = this.sweepStartCorner;
    const safeCorner = startCorner === "top"
      ? "bottom"
      : startCorner === "bottom"
        ? "top"
        : null;
    return {
      kind: "phase5-laser",
      attackLabel: "激光与弹药桶",
      weaponLabel: "激光枪",
      stateLabel: formatState(this.state),
      pauseBossMovement: !(
        this.state === "basic-tracking" ||
        this.state === "ultimate-positioning"
      ),
      fireRemaining: Math.max(0, this.stateRemaining),
      shotsFired: this.basicAttacksFired + this.ultimateAttacksFired,
      specialShotsFired: 0,
      burstSize: null,
      shotsRemainingInBurst: null,
      burstsCompleted: 0,
      modeAttackCount: this.consecutiveBasicAttacks,
      attacksBeforeSwitchCheck: Math.max(
        0,
        this.config.guaranteedUltimateAfterBasics - this.consecutiveBasicAttacks,
      ),
      switchChecks: 0,
      weaponSwitches: 0,
      lastSwitchResult: null,
      summonsIssued: 0,
      lastSummonKind: null,
      tutorialMessage: "",
      bossMovementMode: this.state === "basic-tracking"
        ? "track-player-y"
        : this.state === "ultimate-positioning"
          ? "center-y"
          : "paused",
      laserMode: this.mode,
      laserState: this.state,
      laserActive:
        this.state === "basic-active" || this.state === "ultimate-active",
      laserAttackId: this.laserAttackId,
      laserAngle: this.getLaserAngle(sweepProgress),
      lockedLaserY: this.lockedLaserY,
      sweepStartCorner: startCorner,
      safeCorner,
      sweepProgress,
      consecutiveBasicAttacks: this.consecutiveBasicAttacks,
      basicAttacksFired: this.basicAttacksFired,
      ultimateAttacksFired: this.ultimateAttacksFired,
    };
  }

  debugAdvancePattern(): boolean {
    return this.mode === "basic"
      ? this.debugTriggerUltimate()
      : this.debugTriggerBasic();
  }

  debugTriggerBasic(): boolean {
    this.beginNextAttack("basic");
    return true;
  }

  debugTriggerUltimate(): boolean {
    this.beginNextAttack("ultimate");
    return true;
  }

  debugToggleSweepStart(): boolean {
    if (this.mode !== "ultimate") {
      this.beginNextAttack("ultimate");
    }
    this.sweepStartCorner = this.sweepStartCorner === "top" ? "bottom" : "top";
    return true;
  }

  debugCycleBasicCount(): boolean {
    const maximum = Math.max(
      1,
      Math.round(this.config.guaranteedUltimateAfterBasics),
    );
    this.consecutiveBasicAttacks = (this.consecutiveBasicAttacks + 1) %
      (maximum + 1);
    return true;
  }

  private beginNextAttack(forcedMode?: LaserMode): void {
    const guaranteed =
      this.consecutiveBasicAttacks >=
      Math.max(1, Math.round(this.config.guaranteedUltimateAfterBasics));
    const shouldUseUltimate = forcedMode === "ultimate" || (
      forcedMode !== "basic" &&
      (guaranteed || this.decisionRandom.next() < clamp01(this.config.ultimateChance))
    );
    this.mode = shouldUseUltimate ? "ultimate" : "basic";
    this.laserAttackId += 1;
    this.lockedLaserY = null;

    if (this.mode === "ultimate") {
      this.sweepStartCorner = this.cornerRandom.next() < 0.5 ? "top" : "bottom";
      this.enterState(
        "ultimate-positioning",
        this.config.ultimatePositioningMaximumSeconds,
      );
    } else {
      this.sweepStartCorner = null;
      this.enterState("basic-tracking", this.config.trackingMaximumSeconds);
    }
  }

  private enterState(
    state: DemoBossPhase5LaserState,
    durationSeconds: number,
  ): void {
    this.state = state;
    this.stateDuration = Math.max(0.05, durationSeconds);
    this.stateRemaining = this.stateDuration;
  }

  private getLaserAngle(progress: number): number {
    if (this.mode === "basic") {
      return Math.PI;
    }
    if (this.sweepStartCorner === "bottom") {
      return lerp(
        this.config.lowerSweepStartAngle,
        this.config.lowerSweepEndAngle,
        clamp01(progress),
      );
    }
    return lerp(
      this.config.upperSweepStartAngle,
      this.config.upperSweepEndAngle,
      clamp01(progress),
    );
  }
}

function formatState(state: DemoBossPhase5LaserState): string {
  switch (state) {
    case "basic-tracking":
      return "普攻追踪高度";
    case "basic-charge":
      return "横向激光蓄力";
    case "basic-active":
      return "横向激光发射";
    case "ultimate-positioning":
      return "大招回中";
    case "ultimate-charge":
      return "全图扫射前摇";
    case "ultimate-active":
      return "全图激光扫射";
    default:
      return "激光冷却";
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  const lower = Math.min(minimum, maximum);
  const upper = Math.max(minimum, maximum);
  return Math.max(lower, Math.min(upper, value));
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
