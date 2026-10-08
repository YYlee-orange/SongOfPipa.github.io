import { SeededRandom } from "../../../systems/SeededRandom.ts";
import type { Vec2 } from "../../../entities/playerRig/PlayerRigModel.ts";
import type {
  DemoBossAttackContext,
  DemoBossAttackModel,
  DemoBossAttackShot,
  DemoBossAttackSnapshot,
} from "./DemoBossAttackModel.ts";

export interface DemoBossPhase3AttackConfig {
  initialFireDelaySeconds: number;
  shotgunIntervalSeconds: number;
  shotgunMinimumPellets: number;
  shotgunMaximumPellets: number;
  shotgunSpreadRadians: number;
  shotgunBulletSpeed: number;
  rocketModeDelaySeconds: number;
  rocketChargeSeconds: number;
  specialBulletChance: number;
  switchChance: number;
  randomSeed: number;
}

type HeavyWeaponMode = "shotgun" | "rocket";
type HeavyAttackState = "waiting" | "rocket-charge";

/** 第三阶段：霰弹枪两次／火箭一次后，独立进行 50% 武器切换判定。 */
export class DemoBossPhase3AttackModel implements DemoBossAttackModel {
  private readonly config: DemoBossPhase3AttackConfig;
  private readonly scheduleRandom: SeededRandom;
  private readonly shotRandom: SeededRandom;
  private readonly switchRandom: SeededRandom;
  private mode: HeavyWeaponMode = "shotgun";
  private state: HeavyAttackState = "waiting";
  private fireRemaining: number;
  private modeAttackCount = 0;
  private shotsFired = 0;
  private specialShotsFired = 0;
  private switchChecks = 0;
  private weaponSwitches = 0;
  private lastSwitchResult: "switched" | "stayed" | null = null;

  constructor(config: DemoBossPhase3AttackConfig) {
    this.config = config;
    this.scheduleRandom = new SeededRandom(config.randomSeed);
    this.shotRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
    this.switchRandom = new SeededRandom(config.randomSeed ^ 0x85ebca6b);
    this.fireRemaining = Math.max(0, config.initialFireDelaySeconds);
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

    while (this.fireRemaining <= 0.0000001) {
      if (this.mode === "shotgun") {
        shots.push(...this.fireShotgun(context));
        this.modeAttackCount += 1;
        if (this.modeAttackCount >= 2) {
          this.checkWeaponSwitch();
        }
        this.fireRemaining += this.mode === "shotgun"
          ? Math.max(0.05, this.config.shotgunIntervalSeconds)
          : Math.max(0.05, this.config.rocketModeDelaySeconds);
        continue;
      }

      if (this.state === "waiting") {
        this.state = "rocket-charge";
        this.fireRemaining += Math.max(0.05, this.config.rocketChargeSeconds);
        continue;
      }

      shots.push({
        projectileKind: "rocket",
        type: "normal",
        origin: { ...context.muzzlePosition },
        target: { ...context.playerPosition },
        speed: 0,
        recoilImpulse: true,
      });
      this.shotsFired += 1;
      this.modeAttackCount += 1;
      this.state = "waiting";
      this.checkWeaponSwitch();
      this.fireRemaining += this.mode === "rocket"
        ? Math.max(0.05, this.config.rocketModeDelaySeconds)
        : Math.max(0.05, this.config.shotgunIntervalSeconds);
    }

    return shots;
  }

  getSnapshot(): Readonly<DemoBossAttackSnapshot> {
    const shotgun = this.mode === "shotgun";
    const threshold = shotgun ? 2 : 1;
    return {
      kind: "phase3-heavy",
      attackLabel: "重火力双武器",
      weaponLabel: shotgun ? "霰弹枪" : "火箭发射器",
      stateLabel: shotgun
        ? "霰弹待发"
        : this.state === "rocket-charge"
          ? "火箭蓄力"
          : "火箭装填",
      pauseBossMovement: !shotgun && this.state === "rocket-charge",
      fireRemaining: Math.max(0, this.fireRemaining),
      shotsFired: this.shotsFired,
      specialShotsFired: this.specialShotsFired,
      burstSize: null,
      shotsRemainingInBurst: null,
      burstsCompleted: 0,
      modeAttackCount: this.modeAttackCount,
      attacksBeforeSwitchCheck: Math.max(0, threshold - this.modeAttackCount),
      switchChecks: this.switchChecks,
      weaponSwitches: this.weaponSwitches,
      lastSwitchResult: this.lastSwitchResult,
      summonsIssued: 0,
      lastSummonKind: null,
      tutorialMessage: "",
    };
  }

  debugAdvancePattern(): boolean {
    this.mode = this.mode === "shotgun" ? "rocket" : "shotgun";
    this.state = this.mode === "rocket" ? "rocket-charge" : "waiting";
    this.modeAttackCount = 0;
    this.fireRemaining = this.mode === "rocket"
      ? Math.max(0.05, this.config.rocketChargeSeconds)
      : 0;
    this.lastSwitchResult = "switched";
    return true;
  }

  private fireShotgun(
    context: Readonly<DemoBossAttackContext>,
  ): DemoBossAttackShot[] {
    const pelletCount = this.drawShotgunPelletCount();
    const baseAngle = Math.atan2(
      context.playerPosition.y - context.muzzlePosition.y,
      context.playerPosition.x - context.muzzlePosition.x,
    );
    const spread = Math.max(0, this.config.shotgunSpreadRadians);
    const shots: DemoBossAttackShot[] = [];

    for (let index = 0; index < pelletCount; index += 1) {
      const normalized = pelletCount <= 1 ? 0.5 : index / (pelletCount - 1);
      const angle = baseAngle + (normalized - 0.5) * spread;
      const type =
        this.shotRandom.next() < clamp01(this.config.specialBulletChance)
          ? "special"
          : "normal";
      shots.push({
        projectileKind: "bullet",
        type,
        origin: { ...context.muzzlePosition },
        target: pointAlongAngle(context.muzzlePosition, angle),
        speed: Math.max(0, this.config.shotgunBulletSpeed),
        recoilImpulse: index === 0,
      });
      this.shotsFired += 1;
      if (type === "special") {
        this.specialShotsFired += 1;
      }
    }

    return shots;
  }

  private checkWeaponSwitch(): void {
    this.switchChecks += 1;
    this.modeAttackCount = 0;
    if (this.switchRandom.next() < clamp01(this.config.switchChance)) {
      this.mode = this.mode === "shotgun" ? "rocket" : "shotgun";
      this.state = "waiting";
      this.weaponSwitches += 1;
      this.lastSwitchResult = "switched";
    } else {
      this.lastSwitchResult = "stayed";
    }
  }

  private drawShotgunPelletCount(): number {
    const minimum = Math.max(1, Math.round(this.config.shotgunMinimumPellets));
    const maximum = Math.max(minimum, Math.round(this.config.shotgunMaximumPellets));
    return minimum + Math.floor(this.scheduleRandom.next() * (maximum - minimum + 1));
  }
}

function pointAlongAngle(origin: Vec2, angle: number): Vec2 {
  return {
    x: origin.x + Math.cos(angle) * 1_000,
    y: origin.y + Math.sin(angle) * 1_000,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
