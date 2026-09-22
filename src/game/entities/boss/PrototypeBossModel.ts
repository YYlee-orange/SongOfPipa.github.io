import type { CircleCollider } from "../../systems/CollisionSystem.ts";
import { SeededRandom } from "../../systems/SeededRandom.ts";
import type { PrototypeBulletType } from "../bullet/PrototypeBulletModel.ts";
import type { Vec2 } from "../playerRig/PlayerRigModel";

export type PrototypeBossPhase = 1 | 2 | 3;
export type PrototypeBossDamageResult = "damaged" | "defeated" | "ignored";

export interface PrototypeBossPhaseConfig {
  movementSpeed: number;
  fireIntervalSeconds: number;
  bulletSpeed: number;
}

export interface PrototypeBossHitZoneConfig {
  offset: Vec2;
  radius: number;
}

export interface PrototypeBossConfig {
  maximumHealth: number;
  initialPosition: Vec2;
  movementBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  targetPauseSeconds: number;
  targetArrivalDistance: number;
  initialFireDelaySeconds: number;
  specialBulletChance: number;
  randomSeed: number;
  muzzleOffset: Vec2;
  hitFlashSeconds: number;
  hitZones: readonly PrototypeBossHitZoneConfig[];
  phases: Readonly<Record<PrototypeBossPhase, PrototypeBossPhaseConfig>>;
}

export interface PrototypeBossShot {
  type: PrototypeBulletType;
  origin: Vec2;
  speed: number;
  phase: PrototypeBossPhase;
}

export interface PrototypeBossSnapshot {
  position: Vec2;
  targetPosition: Vec2;
  velocity: Vec2;
  health: number;
  maximumHealth: number;
  phase: PrototypeBossPhase;
  defeated: boolean;
  randomSeed: number;
  shotsFired: number;
  specialShotsFired: number;
  fireRemaining: number;
  hitFlashRemaining: number;
}

export class PrototypeBossModel {
  private readonly config: PrototypeBossConfig;
  private readonly movementRandom: SeededRandom;
  private readonly shotRandom: SeededRandom;
  private position: Vec2;
  private targetPosition: Vec2;
  private velocity: Vec2 = { x: 0, y: 0 };
  private health: number;
  private pauseRemaining = 0;
  private fireRemaining: number;
  private hitFlashRemaining = 0;
  private shotsFired = 0;
  private specialShotsFired = 0;

  constructor(config: PrototypeBossConfig) {
    this.config = config;
    this.position = this.clampToBounds(config.initialPosition);
    this.health = Math.max(1, Math.floor(config.maximumHealth));
    this.fireRemaining = Math.max(0, config.initialFireDelaySeconds);
    this.movementRandom = new SeededRandom(config.randomSeed);
    this.shotRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
    this.targetPosition = this.pickMovementTarget();
  }

  update(deltaSeconds: number, allowFiring = true): readonly PrototypeBossShot[] {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - safeDelta);

    if (this.health <= 0) {
      this.velocity = { x: 0, y: 0 };
      return [];
    }

    this.updateMovement(safeDelta);

    if (!allowFiring) {
      return [];
    }

    this.fireRemaining -= safeDelta;
    const shots: PrototypeBossShot[] = [];

    while (this.fireRemaining <= 0) {
      const phase = this.getPhase();
      const phaseConfig = this.config.phases[phase];
      const type =
        this.shotRandom.next() < this.config.specialBulletChance
          ? "special"
          : "normal";
      shots.push({
        type,
        origin: {
          x: this.position.x + this.config.muzzleOffset.x,
          y: this.position.y + this.config.muzzleOffset.y,
        },
        speed: phaseConfig.bulletSpeed,
        phase,
      });
      this.shotsFired += 1;

      if (type === "special") {
        this.specialShotsFired += 1;
      }

      this.fireRemaining += Math.max(0.05, phaseConfig.fireIntervalSeconds);
    }

    return shots;
  }

  takeDamage(amount = 1): PrototypeBossDamageResult {
    if (this.health <= 0 || !Number.isFinite(amount) || amount <= 0) {
      return "ignored";
    }

    const previousPhase = this.getPhase();
    this.health = Math.max(0, this.health - amount);
    this.hitFlashRemaining = Math.max(0, this.config.hitFlashSeconds);

    if (this.health <= 0) {
      this.velocity = { x: 0, y: 0 };
      return "defeated";
    }

    const phase = this.getPhase();

    if (phase !== previousPhase) {
      this.fireRemaining = Math.min(
        this.fireRemaining,
        this.config.phases[phase].fireIntervalSeconds,
      );
    }

    return "damaged";
  }

  getHitColliders(): readonly CircleCollider[] {
    return this.config.hitZones.map((zone) => ({
      center: {
        x: this.position.x + zone.offset.x,
        y: this.position.y + zone.offset.y,
      },
      radius: zone.radius,
    }));
  }

  getSnapshot(): Readonly<PrototypeBossSnapshot> {
    return {
      position: { ...this.position },
      targetPosition: { ...this.targetPosition },
      velocity: { ...this.velocity },
      health: this.health,
      maximumHealth: this.config.maximumHealth,
      phase: this.getPhase(),
      defeated: this.health <= 0,
      randomSeed: this.config.randomSeed,
      shotsFired: this.shotsFired,
      specialShotsFired: this.specialShotsFired,
      fireRemaining: Math.max(0, this.fireRemaining),
      hitFlashRemaining: this.hitFlashRemaining,
    };
  }

  private getPhase(): PrototypeBossPhase {
    const ratio = this.health / Math.max(1, this.config.maximumHealth);

    if (ratio > 2 / 3) {
      return 1;
    }

    if (ratio > 1 / 3) {
      return 2;
    }

    return 3;
  }

  private updateMovement(deltaSeconds: number): void {
    if (this.pauseRemaining > 0) {
      this.pauseRemaining = Math.max(0, this.pauseRemaining - deltaSeconds);
      this.velocity = { x: 0, y: 0 };

      if (this.pauseRemaining === 0) {
        this.targetPosition = this.pickMovementTarget();
      }

      return;
    }

    const deltaX = this.targetPosition.x - this.position.x;
    const deltaY = this.targetPosition.y - this.position.y;
    const distance = Math.hypot(deltaX, deltaY);
    const movementSpeed = this.config.phases[this.getPhase()].movementSpeed;
    const step = movementSpeed * deltaSeconds;

    if (distance <= Math.max(this.config.targetArrivalDistance, step)) {
      this.position = { ...this.targetPosition };
      this.velocity = { x: 0, y: 0 };
      this.pauseRemaining = Math.max(0, this.config.targetPauseSeconds);

      if (this.pauseRemaining === 0) {
        this.targetPosition = this.pickMovementTarget();
      }

      return;
    }

    const scale = movementSpeed / distance;
    this.velocity = { x: deltaX * scale, y: deltaY * scale };
    this.position = this.clampToBounds({
      x: this.position.x + this.velocity.x * deltaSeconds,
      y: this.position.y + this.velocity.y * deltaSeconds,
    });
  }

  private pickMovementTarget(): Vec2 {
    const bounds = this.config.movementBounds;
    return {
      x: this.movementRandom.range(bounds.minX, bounds.maxX),
      y: this.movementRandom.range(bounds.minY, bounds.maxY),
    };
  }

  private clampToBounds(position: Vec2): Vec2 {
    const bounds = this.config.movementBounds;
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y)),
    };
  }
}
