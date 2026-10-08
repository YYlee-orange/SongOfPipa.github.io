import type { CircleCollider } from "../../systems/CollisionSystem.ts";
import { SeededRandom } from "../../systems/SeededRandom.ts";
import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";

export interface DemoBossActorWanderConfig {
  radius: Vec2;
  frequency: Vec2;
}

export interface DemoBossActorRecoilConfig {
  impulse: number;
  maximumVelocity: number;
  maximumOffset: number;
  spring: number;
  damping: number;
}

export interface DemoBossActorConfig {
  initialPosition: Vec2;
  movementBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  targetPauseSeconds: number;
  targetArrivalDistance: number;
  headOffset: Vec2;
  headVisibleRadius: number;
  headHitRadius: number;
  headWander: DemoBossActorWanderConfig;
  weaponOffset: Vec2;
  minimumHeadWeaponVerticalSeparation: number;
  weaponMuzzleOffset: Vec2;
  weaponWander: DemoBossActorWanderConfig;
  weaponRecoil: DemoBossActorRecoilConfig;
  hitFlashSeconds: number;
}

export interface DemoBossActorPhaseSetup {
  movementSpeed: number;
  randomSeed: number;
}

export interface DemoBossActorSnapshot {
  position: Vec2;
  targetPosition: Vec2;
  velocity: Vec2;
  headPosition: Vec2;
  weaponPosition: Vec2;
  muzzlePosition: Vec2;
  headWanderOffset: Vec2;
  weaponWanderOffset: Vec2;
  headVisibleRadius: number;
  headHitRadius: number;
  movementSpeed: number;
  weaponRecoilOffset: number;
  weaponRecoilVelocity: number;
  weaponRecoilMaximumOffset: number;
  weaponRecoilMaximumVelocity: number;
  hitFlashRemaining: number;
  randomSeed: number;
}

interface DemoBossActorPose {
  headPosition: Vec2;
  weaponPosition: Vec2;
  muzzlePosition: Vec2;
  headWanderOffset: Vec2;
  weaponWanderOffset: Vec2;
}

const TAU = Math.PI * 2;
const RECOIL_STEP_SECONDS = 1 / 120;

/**
 * D3 各阶段共用的 Boss 身体层。它只负责根锚点移动、双部件姿态、
 * 头部碰撞体与反馈；攻击调度和阶段生命由各自模块管理。
 */
export class DemoBossActorModel {
  private readonly config: DemoBossActorConfig;
  private readonly setup: DemoBossActorPhaseSetup;
  private readonly movementRandom: SeededRandom;
  private readonly headWanderPhase: Vec2;
  private readonly weaponWanderPhase: Vec2;
  private position: Vec2;
  private targetPosition: Vec2;
  private velocity: Vec2 = { x: 0, y: 0 };
  private pauseRemaining = 0;
  private wanderTime = 0;
  private weaponRecoilOffset = 0;
  private weaponRecoilVelocity = 0;
  private hitFlashRemaining = 0;

  constructor(
    config: DemoBossActorConfig,
    setup: DemoBossActorPhaseSetup,
  ) {
    this.config = config;
    this.setup = setup;
    this.position = this.clampToBounds(config.initialPosition);
    this.movementRandom = new SeededRandom(setup.randomSeed);

    const presentationRandom = new SeededRandom(
      setup.randomSeed ^ 0x51ed270b,
    );
    this.headWanderPhase = {
      x: presentationRandom.range(0, TAU),
      y: presentationRandom.range(0, TAU),
    };
    this.weaponWanderPhase = {
      x: presentationRandom.range(0, TAU),
      y: presentationRandom.range(0, TAU),
    };
    this.targetPosition = this.pickMovementTarget();
  }

  update(deltaSeconds: number, allowMovement = true): void {
    const safeDelta = this.advancePresentation(deltaSeconds);

    if (allowMovement) {
      this.updateMovement(safeDelta);
    } else {
      this.velocity = { x: 0, y: 0 };
    }
  }

  /** 第五阶段专用：根锚点固定横坐标，仅以阶段移速追踪目标高度。 */
  updateVerticalTracking(deltaSeconds: number, targetY: number): void {
    const safeDelta = this.advancePresentation(deltaSeconds);
    const target = this.clampToBounds({
      x: this.config.initialPosition.x,
      y: targetY,
    });
    this.targetPosition = target;
    const deltaX = target.x - this.position.x;
    const deltaY = target.y - this.position.y;
    const distance = Math.hypot(deltaX, deltaY);
    const speed = Math.max(0, this.setup.movementSpeed);
    const step = speed * safeDelta;
    if (distance <= Math.max(this.config.targetArrivalDistance, step)) {
      this.position = target;
      this.velocity = { x: 0, y: 0 };
      return;
    }
    if (distance <= 0 || speed <= 0) {
      this.velocity = { x: 0, y: 0 };
      return;
    }
    const scale = speed / distance;
    this.velocity = { x: deltaX * scale, y: deltaY * scale };
    this.position = this.clampToBounds({
      x: this.position.x + this.velocity.x * safeDelta,
      y: this.position.y + this.velocity.y * safeDelta,
    });
  }

  triggerWeaponRecoil(): void {
    const recoil = this.config.weaponRecoil;
    this.weaponRecoilVelocity = Math.min(
      Math.max(0, recoil.maximumVelocity),
      this.weaponRecoilVelocity + Math.max(0, recoil.impulse),
    );
  }

  triggerHitFeedback(): void {
    this.hitFlashRemaining = Math.max(0, this.config.hitFlashSeconds);
  }

  getHitColliders(): readonly CircleCollider[] {
    return [
      {
        center: this.getPose().headPosition,
        radius: this.config.headHitRadius,
      },
    ];
  }

  getSnapshot(): Readonly<DemoBossActorSnapshot> {
    const pose = this.getPose();
    return {
      position: { ...this.position },
      targetPosition: { ...this.targetPosition },
      velocity: { ...this.velocity },
      headPosition: pose.headPosition,
      weaponPosition: pose.weaponPosition,
      muzzlePosition: pose.muzzlePosition,
      headWanderOffset: pose.headWanderOffset,
      weaponWanderOffset: pose.weaponWanderOffset,
      headVisibleRadius: this.config.headVisibleRadius,
      headHitRadius: this.config.headHitRadius,
      movementSpeed: Math.max(0, this.setup.movementSpeed),
      weaponRecoilOffset: this.weaponRecoilOffset,
      weaponRecoilVelocity: this.weaponRecoilVelocity,
      weaponRecoilMaximumOffset: Math.max(
        0,
        this.config.weaponRecoil.maximumOffset,
      ),
      weaponRecoilMaximumVelocity: Math.max(
        0,
        this.config.weaponRecoil.maximumVelocity,
      ),
      hitFlashRemaining: this.hitFlashRemaining,
      randomSeed: this.setup.randomSeed,
    };
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
    const movementSpeed = Math.max(0, this.setup.movementSpeed);
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

    if (distance <= 0 || movementSpeed <= 0) {
      this.velocity = { x: 0, y: 0 };
      return;
    }

    const scale = movementSpeed / distance;
    this.velocity = { x: deltaX * scale, y: deltaY * scale };
    this.position = this.clampToBounds({
      x: this.position.x + this.velocity.x * deltaSeconds,
      y: this.position.y + this.velocity.y * deltaSeconds,
    });
  }

  private advancePresentation(deltaSeconds: number): number {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    this.wanderTime += safeDelta;
    this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - safeDelta);
    this.updateWeaponRecoil(safeDelta);
    return safeDelta;
  }

  private getPose(): DemoBossActorPose {
    const headWanderOffset = this.getWanderOffset(
      this.config.headWander,
      this.headWanderPhase,
    );
    const weaponWanderOffset = this.getWanderOffset(
      this.config.weaponWander,
      this.weaponWanderPhase,
    );
    const headPosition = {
      x: this.position.x + this.config.headOffset.x + headWanderOffset.x,
      y: this.position.y + this.config.headOffset.y + headWanderOffset.y,
    };
    const unconstrainedWeaponPosition = {
      x:
        this.position.x +
        this.config.weaponOffset.x +
        weaponWanderOffset.x +
        this.weaponRecoilOffset,
      y: this.position.y + this.config.weaponOffset.y + weaponWanderOffset.y,
    };
    const weaponPosition = {
      x: unconstrainedWeaponPosition.x,
      y: Math.max(
        unconstrainedWeaponPosition.y,
        headPosition.y +
          Math.max(0, this.config.minimumHeadWeaponVerticalSeparation),
      ),
    };

    return {
      headPosition,
      weaponPosition,
      muzzlePosition: {
        x: weaponPosition.x + this.config.weaponMuzzleOffset.x,
        y: weaponPosition.y + this.config.weaponMuzzleOffset.y,
      },
      headWanderOffset,
      weaponWanderOffset,
    };
  }

  private getWanderOffset(
    config: DemoBossActorWanderConfig,
    phase: Vec2,
  ): Vec2 {
    return {
      x:
        Math.sin(this.wanderTime * TAU * config.frequency.x + phase.x) *
        Math.max(0, config.radius.x),
      y:
        Math.sin(this.wanderTime * TAU * config.frequency.y + phase.y) *
        Math.max(0, config.radius.y),
    };
  }

  private updateWeaponRecoil(deltaSeconds: number): void {
    const recoil = this.config.weaponRecoil;
    let remaining = deltaSeconds;

    while (remaining > 0) {
      const step = Math.min(RECOIL_STEP_SECONDS, remaining);
      const acceleration =
        -Math.max(0, recoil.spring) * this.weaponRecoilOffset -
        Math.max(0, recoil.damping) * this.weaponRecoilVelocity;
      this.weaponRecoilVelocity += acceleration * step;
      this.weaponRecoilOffset += this.weaponRecoilVelocity * step;

      if (this.weaponRecoilOffset < 0) {
        this.weaponRecoilOffset = 0;
        this.weaponRecoilVelocity = Math.max(0, this.weaponRecoilVelocity);
      }

      if (this.weaponRecoilOffset > recoil.maximumOffset) {
        this.weaponRecoilOffset = Math.max(0, recoil.maximumOffset);
        this.weaponRecoilVelocity = Math.min(0, this.weaponRecoilVelocity);
      }
      remaining -= step;
    }

    if (
      Math.abs(this.weaponRecoilOffset) < 0.001 &&
      Math.abs(this.weaponRecoilVelocity) < 0.01
    ) {
      this.weaponRecoilOffset = 0;
      this.weaponRecoilVelocity = 0;
    }
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
