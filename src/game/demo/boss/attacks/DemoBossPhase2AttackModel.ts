import { SeededRandom } from "../../../systems/SeededRandom.ts";
import type {
  DemoBossAttackContext,
  DemoBossAttackModel,
  DemoBossAttackShot,
  DemoBossAttackSnapshot,
} from "./DemoBossAttackModel.ts";

export interface DemoBossPhase2AttackConfig {
  initialFireDelaySeconds: number;
  burstShotIntervalSeconds: number;
  burstPauseSeconds: number;
  minimumBurstShots: number;
  maximumBurstShots: number;
  bulletSpeed: number;
  specialBulletChance: number;
  randomSeed: number;
}

type BurstState = "burst" | "pause";

/** 第二阶段 AK47：随机弹数的高速连射与固定停火间歇交替。 */
export class DemoBossPhase2AttackModel implements DemoBossAttackModel {
  private readonly config: DemoBossPhase2AttackConfig;
  private readonly scheduleRandom: SeededRandom;
  private readonly shotRandom: SeededRandom;
  private state: BurstState = "burst";
  private fireRemaining: number;
  private burstSize: number;
  private shotsRemainingInBurst: number;
  private shotsFired = 0;
  private specialShotsFired = 0;
  private burstsCompleted = 0;

  constructor(config: DemoBossPhase2AttackConfig) {
    this.config = config;
    this.scheduleRandom = new SeededRandom(config.randomSeed);
    this.shotRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
    this.fireRemaining = Math.max(0, config.initialFireDelaySeconds);
    this.burstSize = this.drawBurstSize();
    this.shotsRemainingInBurst = this.burstSize;
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

    this.fireRemaining -= safeDelta;
    const shots: DemoBossAttackShot[] = [];
    const shotInterval = Math.max(0.05, this.config.burstShotIntervalSeconds);
    const pauseSeconds = Math.max(0.05, this.config.burstPauseSeconds);

    while (this.fireRemaining <= 0.0000001) {
      if (this.state === "pause") {
        this.startNextBurst();
        continue;
      }

      const type =
        this.shotRandom.next() < clamp01(this.config.specialBulletChance)
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
      this.shotsRemainingInBurst -= 1;
      if (type === "special") {
        this.specialShotsFired += 1;
      }

      if (this.shotsRemainingInBurst <= 0) {
        this.state = "pause";
        this.burstsCompleted += 1;
        this.fireRemaining += pauseSeconds;
      } else {
        this.fireRemaining += shotInterval;
      }
    }

    return shots;
  }

  getSnapshot(): Readonly<DemoBossAttackSnapshot> {
    return {
      kind: "phase2-ak47",
      attackLabel: "AK47 间歇连射",
      weaponLabel: "AK47 突击步枪",
      stateLabel: this.state === "burst" ? "连射中" : "停火间歇",
      pauseBossMovement: false,
      fireRemaining: Math.max(0, this.fireRemaining),
      shotsFired: this.shotsFired,
      specialShotsFired: this.specialShotsFired,
      burstSize: this.burstSize,
      shotsRemainingInBurst: this.shotsRemainingInBurst,
      burstsCompleted: this.burstsCompleted,
      modeAttackCount: null,
      attacksBeforeSwitchCheck: null,
      switchChecks: 0,
      weaponSwitches: 0,
      lastSwitchResult: null,
      summonsIssued: 0,
      lastSummonKind: null,
      tutorialMessage: "",
    };
  }

  private startNextBurst(): void {
    this.state = "burst";
    this.burstSize = this.drawBurstSize();
    this.shotsRemainingInBurst = this.burstSize;
  }

  private drawBurstSize(): number {
    const minimum = Math.max(1, Math.round(this.config.minimumBurstShots));
    const maximum = Math.max(minimum, Math.round(this.config.maximumBurstShots));
    return minimum + Math.floor(this.scheduleRandom.next() * (maximum - minimum + 1));
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
