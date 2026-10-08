import { SeededRandom } from "../../../systems/SeededRandom.ts";
import type {
  DemoBossAttackContext,
  DemoBossAttackModel,
  DemoBossAttackShot,
  DemoBossAttackSnapshot,
} from "./DemoBossAttackModel.ts";

export interface DemoBossTutorialHint {
  startSeconds: number;
  endSeconds: number;
  message: string;
}

export interface DemoBossPhase1AttackConfig {
  initialFireDelaySeconds: number;
  fireIntervalSeconds: number;
  bulletSpeed: number;
  specialBulletChance: number;
  randomSeed: number;
  tutorialHints: readonly Readonly<DemoBossTutorialHint>[];
}

/** 第一阶段左轮：低频逐发，每一发在生成瞬间重新取得玩家位置。 */
export class DemoBossPhase1AttackModel implements DemoBossAttackModel {
  private readonly config: DemoBossPhase1AttackConfig;
  private readonly random: SeededRandom;
  private fireRemaining: number;
  private elapsedSeconds = 0;
  private shotsFired = 0;
  private specialShotsFired = 0;

  constructor(config: DemoBossPhase1AttackConfig) {
    this.config = config;
    this.random = new SeededRandom(config.randomSeed);
    this.fireRemaining = Math.max(0, config.initialFireDelaySeconds);
  }

  update(
    deltaSeconds: number,
    context: Readonly<DemoBossAttackContext>,
  ): readonly Readonly<DemoBossAttackShot>[] {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    this.elapsedSeconds += safeDelta;

    if (!context.allowFiring) {
      return [];
    }

    this.fireRemaining -= safeDelta;
    const shots: DemoBossAttackShot[] = [];
    const interval = Math.max(0.05, this.config.fireIntervalSeconds);

    while (this.fireRemaining <= 0.0000001) {
      const type =
        this.random.next() < clamp01(this.config.specialBulletChance)
          ? "special"
          : "normal";
      shots.push({
        projectileKind: "bullet",
        type,
        origin: { ...context.muzzlePosition },
        target: { ...context.playerPosition },
        speed: Math.max(0, this.config.bulletSpeed),
        recoilImpulse: true,
      });
      this.shotsFired += 1;
      if (type === "special") {
        this.specialShotsFired += 1;
      }
      this.fireRemaining += interval;
    }

    return shots;
  }

  getSnapshot(): Readonly<DemoBossAttackSnapshot> {
    const hint = this.config.tutorialHints.find(
      (candidate) =>
        this.elapsedSeconds >= candidate.startSeconds &&
        this.elapsedSeconds < candidate.endSeconds,
    );

    return {
      kind: "phase1-revolver",
      attackLabel: "左轮逐发",
      weaponLabel: "左轮手枪",
      stateLabel: "逐发射击",
      pauseBossMovement: false,
      fireRemaining: Math.max(0, this.fireRemaining),
      shotsFired: this.shotsFired,
      specialShotsFired: this.specialShotsFired,
      burstSize: null,
      shotsRemainingInBurst: null,
      burstsCompleted: 0,
      modeAttackCount: null,
      attacksBeforeSwitchCheck: null,
      switchChecks: 0,
      weaponSwitches: 0,
      lastSwitchResult: null,
      summonsIssued: 0,
      lastSummonKind: null,
      tutorialMessage: hint?.message ?? "",
    };
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
