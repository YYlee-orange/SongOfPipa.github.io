import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";
import type { CircleCollider } from "../../systems/CollisionSystem.ts";
import { sweptCircleCollision } from "../../systems/CollisionSystem.ts";
import { SeededRandom } from "../../systems/SeededRandom.ts";

export type DemoDisarmTransitionState =
  | "boss-throw"
  | "wait-pickup"
  | "player-fire"
  | "player-discard"
  | "resolved";

export type DemoDisarmWeaponKind =
  | "revolver"
  | "ak47"
  | "shotgun"
  | "rocket-launcher"
  | "summoner"
  | "laser-gun";

export type DemoDisarmAttackMode = "projectile" | "creeper" | "laser";

export interface DemoDisarmCreeperConfig {
  maximumActive: number;
  radius: number;
  trackingSpeed: number;
  triggerDistance: number;
  castSeconds: number;
  explosionSeconds: number;
  explosionRadius: number;
}

export interface DemoDisarmLaserConfig {
  chargeSeconds: number;
  pressurePerSecond: number;
  beamHalfWidth: number;
}

export interface DemoDisarmTransitionConfig {
  weaponKind: DemoDisarmWeaponKind;
  weaponLabel: string;
  attackMode: DemoDisarmAttackMode;
  randomSeed: number;
  throwDurationSeconds: number;
  throwArcHeight: number;
  landingBounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  weaponRadius: number;
  heldWeaponOffset: Vec2;
  muzzleOffset: number;
  fireIntervalSeconds: number;
  projectilesPerShot: number;
  projectileSpreadRadians: number;
  projectileSpeed: number;
  projectileAcceleration: number;
  projectileMaximumSpeed: number;
  projectileRadius: number;
  requiredHits: number;
  discardVelocity: Vec2;
  discardGravity: number;
  discardSeconds: number;
  worldWidth: number;
  worldHeight: number;
  despawnPadding: number;
  creeper?: Readonly<DemoDisarmCreeperConfig>;
  laser?: Readonly<DemoDisarmLaserConfig>;
}

export interface DemoTransitionProjectileSnapshot {
  id: number;
  previousPosition: Vec2;
  position: Vec2;
  velocity: Vec2;
  radius: number;
}

export type DemoTransitionCreeperState =
  | "tracking"
  | "casting"
  | "exploding";

export interface DemoTransitionCreeperSnapshot {
  id: number;
  position: Vec2;
  radius: number;
  state: DemoTransitionCreeperState;
  stateProgress: number;
  explosionRadius: number;
}

export type DemoTransitionLaserState = "idle" | "charging" | "firing";

export interface DemoTransitionLaserSnapshot {
  state: DemoTransitionLaserState;
  chargeProgress: number;
  active: boolean;
  start: Vec2;
  end: Vec2;
  halfWidth: number;
}

export interface DemoDisarmTransitionSnapshot {
  state: DemoDisarmTransitionState;
  weaponKind: DemoDisarmWeaponKind;
  weaponLabel: string;
  prompt: string;
  inputLabel: "反弹" | "发射";
  weaponPosition: Vec2;
  weaponAngle: number;
  throwOrigin: Vec2;
  landingPosition: Vec2;
  throwProgress: number;
  pickupAvailable: boolean;
  pickupRadius: number;
  playerHoldingWeapon: boolean;
  fireRemaining: number;
  weaponPressed: boolean;
  shotsFired: number;
  bossHits: number;
  requiredHits: number;
  pressureProgress: number;
  estimatedPressureSecondsRemaining: number;
  discardProgress: number;
  projectiles: readonly Readonly<DemoTransitionProjectileSnapshot>[];
  creepers: readonly Readonly<DemoTransitionCreeperSnapshot>[];
  laser: Readonly<DemoTransitionLaserSnapshot> | null;
}

export interface DemoDisarmTransitionContext {
  playerPosition: Vec2;
  playerHalfWidth: number;
  playerHalfHeight: number;
  bossTarget: Readonly<CircleCollider>;
  fireHeld: boolean;
}

export interface DemoDisarmTransitionEvents {
  pickedUp: boolean;
  shotsFired: number;
  bossHits: number;
  pressureCompleted: boolean;
  resolved: boolean;
}

interface TransitionProjectile extends DemoTransitionProjectileSnapshot {
  active: boolean;
  acceleration: number;
  maximumSpeed: number;
  direction: Vec2;
}

interface TransitionCreeper {
  id: number;
  position: Vec2;
  radius: number;
  state: DemoTransitionCreeperState;
  stateRemaining: number;
  stateDuration: number;
  active: boolean;
}

/**
 * D4 公共夺械流程：武器节奏与外形由阶段配置决定。
 * 阶段控制器仍只管理生命与阶段身份，本模型独立管理可玩演出。
 */
export class DemoDisarmTransitionModel {
  private readonly config: DemoDisarmTransitionConfig;
  private readonly throwOrigin: Vec2;
  private readonly landingPosition: Vec2;
  private readonly projectiles: TransitionProjectile[] = [];
  private readonly creepers: TransitionCreeper[] = [];
  private state: DemoDisarmTransitionState = "boss-throw";
  private weaponPosition: Vec2;
  private weaponAngle = Math.PI;
  private stateElapsed = 0;
  private fireRemaining = 0;
  private weaponActionPulseRemaining = 0;
  private shotsFired = 0;
  private bossHits = 0;
  private nextProjectileId = 1;
  private nextCreeperId = 1;
  private discardVelocity: Vec2 = { x: 0, y: 0 };
  private laserState: DemoTransitionLaserState = "idle";
  private laserChargeRemaining = 0;
  private laserTarget: Vec2 = { x: 0, y: 0 };

  constructor(
    config: Readonly<DemoDisarmTransitionConfig>,
    throwOrigin: Vec2,
  ) {
    this.config = config;
    this.throwOrigin = { ...throwOrigin };
    this.weaponPosition = { ...throwOrigin };
    const random = new SeededRandom(config.randomSeed);
    this.landingPosition = {
      x: random.range(config.landingBounds.minX, config.landingBounds.maxX),
      y: random.range(config.landingBounds.minY, config.landingBounds.maxY),
    };
  }

  update(
    deltaSeconds: number,
    context: Readonly<DemoDisarmTransitionContext>,
  ): Readonly<DemoDisarmTransitionEvents> {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    const events: DemoDisarmTransitionEvents = {
      pickedUp: false,
      shotsFired: 0,
      bossHits: 0,
      pressureCompleted: false,
      resolved: false,
    };
    this.weaponActionPulseRemaining = Math.max(
      0,
      this.weaponActionPulseRemaining - delta,
    );

    if (this.state === "boss-throw") {
      this.stateElapsed = Math.min(
        Math.max(0.05, this.config.throwDurationSeconds),
        this.stateElapsed + delta,
      );
      const progress = this.getThrowProgress();
      const arc = Math.sin(progress * Math.PI) * Math.max(0, this.config.throwArcHeight);
      this.weaponPosition = {
        x: lerp(this.throwOrigin.x, this.landingPosition.x, progress),
        y: lerp(this.throwOrigin.y, this.landingPosition.y, progress) - arc,
      };
      this.weaponAngle = Math.PI + progress * Math.PI * 2.5;
      if (progress >= 1) {
        this.state = "wait-pickup";
        this.stateElapsed = 0;
        this.weaponPosition = { ...this.landingPosition };
        this.weaponAngle = Math.PI;
      }
      return events;
    }

    if (this.state === "wait-pickup") {
      this.ensureReachableWeapon();
      if (
        roundedBoxIntersectsCircle(
          context.playerPosition,
          context.playerHalfWidth,
          context.playerHalfHeight,
          this.weaponPosition,
          this.config.weaponRadius,
        )
      ) {
        this.state = "player-fire";
        this.stateElapsed = 0;
        this.fireRemaining = 0;
        events.pickedUp = true;
      }
      return events;
    }

    if (this.state === "player-fire") {
      this.weaponPosition = this.getHeldWeaponPosition(context.playerPosition);
      this.weaponAngle = angleToward(this.weaponPosition, context.bossTarget.center);
      this.updateProjectiles(delta, context.bossTarget, events);
      this.updateCreepers(delta, context.bossTarget, events);
      if (this.config.attackMode === "laser") {
        this.updateLaser(delta, context.fireHeld, context.bossTarget, events);
        return events;
      }
      if (context.fireHeld && this.state === "player-fire") {
        this.fireRemaining -= delta;
        const interval = Math.max(0.05, this.config.fireIntervalSeconds);
        while (this.fireRemaining <= 0 && this.state === "player-fire") {
          let attackProduced = true;
          if (this.config.attackMode === "creeper") {
            attackProduced = this.spawnCreeper();
          } else {
            this.spawnVolley(context.bossTarget.center);
          }
          if (attackProduced) {
            this.shotsFired += 1;
            events.shotsFired += 1;
            this.weaponActionPulseRemaining = 0.16;
          }
          this.fireRemaining += interval;
        }
      }
      return events;
    }

    if (this.state === "player-discard") {
      this.stateElapsed += delta;
      this.discardVelocity = {
        x: this.discardVelocity.x,
        y: this.discardVelocity.y + Math.max(0, this.config.discardGravity) * delta,
      };
      this.weaponPosition = {
        x: this.weaponPosition.x + this.discardVelocity.x * delta,
        y: this.weaponPosition.y + this.discardVelocity.y * delta,
      };
      this.weaponAngle += delta * 7;
      if (
        this.stateElapsed >= Math.max(0.1, this.config.discardSeconds) ||
        this.isOutsideWorld(this.weaponPosition)
      ) {
        this.state = "resolved";
        events.resolved = true;
      }
      return events;
    }

    return events;
  }

  getSnapshot(): Readonly<DemoDisarmTransitionSnapshot> {
    const requiredHits = Math.max(0.001, this.config.requiredHits);
    const pressureProgress = Math.min(1, this.bossHits / requiredHits);
    return {
      state: this.state,
      weaponKind: this.config.weaponKind,
      weaponLabel: this.config.weaponLabel,
      prompt: formatPrompt(this.state, this.config.weaponLabel),
      inputLabel: this.state === "player-fire" ? "发射" : "反弹",
      weaponPosition: { ...this.weaponPosition },
      weaponAngle: this.weaponAngle,
      throwOrigin: { ...this.throwOrigin },
      landingPosition: { ...this.landingPosition },
      throwProgress: this.getThrowProgress(),
      pickupAvailable: this.state === "wait-pickup",
      pickupRadius: Math.max(0, this.config.weaponRadius),
      playerHoldingWeapon: this.state === "player-fire",
      fireRemaining: Math.max(0, this.fireRemaining),
      weaponPressed:
        this.config.weaponKind === "summoner" &&
        this.weaponActionPulseRemaining > 0,
      shotsFired: this.shotsFired,
      bossHits: this.bossHits,
      requiredHits,
      pressureProgress,
      estimatedPressureSecondsRemaining: this.getEstimatedPressureSeconds(
        requiredHits,
      ),
      discardProgress: this.state === "player-discard"
        ? Math.min(1, this.stateElapsed / Math.max(0.1, this.config.discardSeconds))
        : this.state === "resolved"
          ? 1
          : 0,
      projectiles: this.projectiles
        .filter((projectile) => projectile.active)
        .map((projectile) => ({
          id: projectile.id,
          previousPosition: { ...projectile.previousPosition },
          position: { ...projectile.position },
          velocity: { ...projectile.velocity },
          radius: projectile.radius,
        })),
      creepers: this.creepers
        .filter((creeper) => creeper.active)
        .map((creeper) => ({
          id: creeper.id,
          position: { ...creeper.position },
          radius: creeper.radius,
          state: creeper.state,
          stateProgress: creeper.stateDuration <= 0
            ? 1
            : Math.max(
                0,
                Math.min(1, 1 - creeper.stateRemaining / creeper.stateDuration),
              ),
          explosionRadius: Math.max(
            0,
            this.config.creeper?.explosionRadius ?? 0,
          ),
        })),
      laser: this.getLaserSnapshot(),
    };
  }

  private updateLaser(
    delta: number,
    fireHeld: boolean,
    bossTarget: Readonly<CircleCollider>,
    events: DemoDisarmTransitionEvents,
  ): void {
    const config = this.config.laser;
    if (!config || this.config.attackMode !== "laser") {
      return;
    }
    if (!fireHeld) {
      this.laserState = "idle";
      this.laserChargeRemaining = 0;
      return;
    }

    let activeDelta = delta;
    if (this.laserState === "idle") {
      this.laserState = "charging";
      this.laserChargeRemaining = Math.max(0.05, config.chargeSeconds);
      this.laserTarget = { ...bossTarget.center };
    }
    this.weaponAngle = angleToward(this.weaponPosition, this.laserTarget);

    if (this.laserState === "charging") {
      const consumed = Math.min(activeDelta, this.laserChargeRemaining);
      this.laserChargeRemaining = Math.max(
        0,
        this.laserChargeRemaining - consumed,
      );
      activeDelta -= consumed;
      if (this.laserChargeRemaining > 0) {
        return;
      }
      this.laserState = "firing";
      this.shotsFired += 1;
      events.shotsFired += 1;
    }

    if (this.laserState !== "firing" || activeDelta <= 0) {
      return;
    }
    const requiredPressure = Math.max(0.001, this.config.requiredHits);
    const pressure = Math.min(
      requiredPressure - this.bossHits,
      activeDelta * Math.max(0.001, config.pressurePerSecond),
    );
    if (pressure <= 0) {
      return;
    }
    this.bossHits += pressure;
    events.bossHits += pressure;
    if (this.bossHits >= requiredPressure - 0.0001) {
      this.bossHits = requiredPressure;
      this.beginDiscard();
      events.pressureCompleted = true;
    }
  }

  private getLaserSnapshot(): Readonly<DemoTransitionLaserSnapshot> | null {
    const config = this.config.laser;
    if (!config || this.config.attackMode !== "laser") {
      return null;
    }
    const direction = normalizedDirection(this.weaponPosition, this.laserTarget);
    const muzzleDistance = Math.max(1, this.config.muzzleOffset);
    const start = {
      x: this.weaponPosition.x + direction.x * muzzleDistance,
      y: this.weaponPosition.y + direction.y * muzzleDistance,
    };
    const distanceToRightEdge = Math.max(
      0,
      (this.config.worldWidth + Math.max(0, this.config.despawnPadding) - start.x) /
        Math.max(0.05, direction.x),
    );
    const end = {
      x: start.x + direction.x * distanceToRightEdge,
      y: start.y + direction.y * distanceToRightEdge,
    };
    const chargeSeconds = Math.max(0.05, config.chargeSeconds);
    return {
      state: this.laserState,
      chargeProgress: this.laserState === "idle"
        ? 0
        : this.laserState === "firing"
          ? 1
          : Math.max(0, Math.min(1, 1 - this.laserChargeRemaining / chargeSeconds)),
      active: this.laserState === "firing" && this.state === "player-fire",
      start,
      end,
      halfWidth: Math.max(1, config.beamHalfWidth),
    };
  }

  private getEstimatedPressureSeconds(requiredHits: number): number {
    if (this.config.attackMode === "laser" && this.config.laser) {
      const charge = this.laserState === "charging"
        ? this.laserChargeRemaining
        : this.laserState === "firing"
          ? 0
          : Math.max(0.05, this.config.laser.chargeSeconds);
      return charge +
        Math.max(0, requiredHits - this.bossHits) /
          Math.max(0.001, this.config.laser.pressurePerSecond);
    }
    return Math.max(0, requiredHits - this.bossHits) *
      Math.max(0.05, this.config.fireIntervalSeconds);
  }

  private updateProjectiles(
    delta: number,
    bossTarget: Readonly<CircleCollider>,
    events: DemoDisarmTransitionEvents,
  ): void {
    for (const projectile of this.projectiles) {
      if (!projectile.active) {
        continue;
      }
      projectile.previousPosition = { ...projectile.position };
      const currentSpeed = Math.hypot(
        projectile.velocity.x,
        projectile.velocity.y,
      );
      if (projectile.acceleration > 0 && currentSpeed < projectile.maximumSpeed) {
        const speed = Math.min(
          projectile.maximumSpeed,
          currentSpeed + projectile.acceleration * delta,
        );
        projectile.velocity = {
          x: projectile.direction.x * speed,
          y: projectile.direction.y * speed,
        };
      }
      projectile.position = {
        x: projectile.position.x + projectile.velocity.x * delta,
        y: projectile.position.y + projectile.velocity.y * delta,
      };
      if (
        sweptCircleCollision(
          projectile.previousPosition,
          projectile.position,
          projectile.radius,
          bossTarget,
        )
      ) {
        projectile.active = false;
        this.bossHits += 1;
        events.bossHits += 1;
        if (this.bossHits >= Math.max(1, Math.round(this.config.requiredHits))) {
          this.beginDiscard();
          events.pressureCompleted = true;
          return;
        }
      } else if (this.isOutsideWorld(projectile.position)) {
        projectile.active = false;
      }
    }
  }

  private spawnVolley(target: Vec2): void {
    const direction = normalizedDirection(this.weaponPosition, target);
    const baseAngle = Math.atan2(direction.y, direction.x);
    const projectileCount = Math.max(
      1,
      Math.round(this.config.projectilesPerShot),
    );
    const spread = Math.max(0, this.config.projectileSpreadRadians);

    for (let index = 0; index < projectileCount; index += 1) {
      const progress = projectileCount === 1 ? 0.5 : index / (projectileCount - 1);
      const angle = baseAngle + (progress - 0.5) * spread;
      this.spawnProjectile(angle);
    }
  }

  private updateCreepers(
    delta: number,
    bossTarget: Readonly<CircleCollider>,
    events: DemoDisarmTransitionEvents,
  ): void {
    const config = this.config.creeper;
    if (!config || this.config.attackMode !== "creeper") {
      return;
    }
    for (const creeper of this.creepers) {
      if (!creeper.active) {
        continue;
      }
      if (creeper.state === "tracking") {
        const direction = normalizedDirection(
          creeper.position,
          bossTarget.center,
        );
        const distance = Math.hypot(
          bossTarget.center.x - creeper.position.x,
          bossTarget.center.y - creeper.position.y,
        );
        const travel = Math.min(
          Math.max(0, config.trackingSpeed) * delta,
          Math.max(0, distance - Math.max(0, config.triggerDistance)),
        );
        creeper.position = {
          x: creeper.position.x + direction.x * travel,
          y: creeper.position.y + direction.y * travel,
        };
        if (distance - travel <= Math.max(0, config.triggerDistance)) {
          creeper.state = "casting";
          creeper.stateDuration = Math.max(0.05, config.castSeconds);
          creeper.stateRemaining = creeper.stateDuration;
        }
        continue;
      }

      creeper.stateRemaining = Math.max(0, creeper.stateRemaining - delta);
      if (creeper.state === "casting" && creeper.stateRemaining === 0) {
        creeper.state = "exploding";
        creeper.stateDuration = Math.max(0.05, config.explosionSeconds);
        creeper.stateRemaining = creeper.stateDuration;
        this.bossHits += 1;
        events.bossHits += 1;
        if (this.bossHits >= Math.max(1, Math.round(this.config.requiredHits))) {
          this.beginDiscard();
          events.pressureCompleted = true;
          return;
        }
      } else if (creeper.state === "exploding" && creeper.stateRemaining === 0) {
        creeper.active = false;
      }
    }
  }

  private spawnCreeper(): boolean {
    const config = this.config.creeper;
    if (!config) {
      return false;
    }
    const activeCount = this.creepers.filter((creeper) => creeper.active).length;
    if (activeCount >= Math.max(1, Math.round(config.maximumActive))) {
      return false;
    }
    const reusable = this.creepers.find((creeper) => !creeper.active);
    const creeper: TransitionCreeper = reusable ?? {
      id: 0,
      position: { ...this.weaponPosition },
      radius: 1,
      state: "tracking",
      stateRemaining: 0,
      stateDuration: 1,
      active: true,
    };
    creeper.id = this.nextCreeperId;
    creeper.position = { ...this.weaponPosition };
    creeper.radius = Math.max(1, config.radius);
    creeper.state = "tracking";
    creeper.stateRemaining = 0;
    creeper.stateDuration = 1;
    creeper.active = true;
    if (!reusable) {
      this.creepers.push(creeper);
    }
    this.nextCreeperId += 1;
    return true;
  }

  private spawnProjectile(angle: number): void {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const speed = Math.max(0, this.config.projectileSpeed);
    const muzzle = {
      x: this.weaponPosition.x + direction.x * Math.max(1, this.config.muzzleOffset),
      y: this.weaponPosition.y + direction.y * Math.max(1, this.config.muzzleOffset),
    };
    const reusable = this.projectiles.find((projectile) => !projectile.active);
    const projectile: TransitionProjectile = reusable ?? {
      id: 0,
      previousPosition: muzzle,
      position: muzzle,
      velocity: { x: 0, y: 0 },
      radius: 1,
      active: true,
      acceleration: 0,
      maximumSpeed: 0,
      direction,
    };
    projectile.id = this.nextProjectileId;
    projectile.previousPosition = { ...muzzle };
    projectile.position = { ...muzzle };
    projectile.velocity = {
      x: direction.x * speed,
      y: direction.y * speed,
    };
    projectile.radius = Math.max(1, this.config.projectileRadius);
    projectile.acceleration = Math.max(0, this.config.projectileAcceleration);
    projectile.maximumSpeed = Math.max(
      speed,
      this.config.projectileMaximumSpeed,
    );
    projectile.direction = direction;
    projectile.active = true;
    if (!reusable) {
      this.projectiles.push(projectile);
    }
    this.nextProjectileId += 1;
  }

  private beginDiscard(): void {
    this.state = "player-discard";
    this.stateElapsed = 0;
    this.fireRemaining = 0;
    this.weaponActionPulseRemaining = 0;
    this.discardVelocity = { ...this.config.discardVelocity };
    for (const projectile of this.projectiles) {
      projectile.active = false;
    }
    for (const creeper of this.creepers) {
      creeper.active = false;
    }
    this.laserState = "idle";
    this.laserChargeRemaining = 0;
  }

  private getHeldWeaponPosition(playerPosition: Vec2): Vec2 {
    return {
      x: playerPosition.x + this.config.heldWeaponOffset.x,
      y: playerPosition.y + this.config.heldWeaponOffset.y,
    };
  }

  private getThrowProgress(): number {
    if (this.state !== "boss-throw") {
      return 1;
    }
    return Math.min(
      1,
      this.stateElapsed / Math.max(0.05, this.config.throwDurationSeconds),
    );
  }

  private ensureReachableWeapon(): void {
    if (!this.isOutsideWorld(this.weaponPosition)) {
      return;
    }
    this.weaponPosition = { ...this.landingPosition };
    this.weaponAngle = Math.PI;
  }

  private isOutsideWorld(position: Vec2): boolean {
    const padding = Math.max(0, this.config.despawnPadding);
    return (
      position.x < -padding ||
      position.x > this.config.worldWidth + padding ||
      position.y < -padding ||
      position.y > this.config.worldHeight + padding
    );
  }
}

function formatPrompt(
  state: DemoDisarmTransitionState,
  weaponLabel: string,
): string {
  if (state === "boss-throw" || state === "wait-pickup") {
    return "捡拾Boss武器攻击它！";
  }
  if (state === "player-fire") {
    return `按住 Z／J 发射${weaponLabel}，持续压制 Boss！`;
  }
  if (state === "player-discard") {
    return weaponLabel === "激光枪"
      ? "最终压制完成！"
      : "压制完成！Boss 正在更换武器";
  }
  return "";
}

function roundedBoxIntersectsCircle(
  boxCenter: Vec2,
  halfWidth: number,
  halfHeight: number,
  circleCenter: Vec2,
  circleRadius: number,
): boolean {
  const dx = Math.max(0, Math.abs(circleCenter.x - boxCenter.x) - Math.max(0, halfWidth));
  const dy = Math.max(0, Math.abs(circleCenter.y - boxCenter.y) - Math.max(0, halfHeight));
  const radius = Math.max(0, circleRadius);
  return dx * dx + dy * dy <= radius * radius;
}

function normalizedDirection(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > 0.0001
    ? { x: dx / length, y: dy / length }
    : { x: 1, y: 0 };
}

function angleToward(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}
