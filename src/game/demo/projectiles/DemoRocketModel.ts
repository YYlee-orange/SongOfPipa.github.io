import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";
import {
  type CircleCollider,
  sweptCircleCollision,
  sweptCircleIntersectsCircle,
} from "../../systems/CollisionSystem.ts";

export interface DemoRocketConfig {
  maximumActive: number;
  radius: number;
  acceleration: number;
  maximumSpeed: number;
  homingTurnRateRadiansPerSecond: number;
  playerDamage: number;
  bossDamage: number;
  worldWidth: number;
  worldHeight: number;
  explosionSeconds: number;
}

export type DemoRocketMotion = "incoming" | "reflected" | "absorbing";
export type DemoRocketExplosionCause = "wall" | "player" | "boss";

export interface DemoRocketSnapshot {
  id: number;
  motion: DemoRocketMotion;
  previousPosition: Vec2;
  position: Vec2;
  direction: Vec2;
  speed: number;
  acceleration: number;
  maximumSpeed: number;
  homingTurnRateRadiansPerSecond: number;
  radius: number;
  playerDamage: number;
  absorptionProgress: number;
}

export interface DemoRocketExplosionSnapshot {
  id: number;
  position: Vec2;
  progress: number;
  cause: DemoRocketExplosionCause;
}

export interface DemoRocketStats {
  active: number;
  incoming: number;
  reflected: number;
  absorbing: number;
  spawnedTotal: number;
  reflectedTotal: number;
  wallExplosions: number;
}

interface DemoRocketState extends DemoRocketSnapshot {
  active: boolean;
  absorptionStart: Vec2;
  absorptionElapsed: number;
  absorptionDuration: number;
}

interface DemoRocketExplosionState {
  id: number;
  position: Vec2;
  elapsed: number;
  duration: number;
  cause: DemoRocketExplosionCause;
}

/** 第三阶段专用加速火箭；敌方状态有限追踪，反弹后保持直线且不复用墙面反射。 */
export class DemoRocketModel {
  private readonly config: DemoRocketConfig;
  private readonly rockets: DemoRocketState[] = [];
  private readonly explosions: DemoRocketExplosionState[] = [];
  private nextId = 1;
  private nextExplosionId = 1;
  private spawnedTotal = 0;
  private reflectedTotal = 0;
  private wallExplosions = 0;

  constructor(config: DemoRocketConfig) {
    this.config = config;
  }

  spawn(origin: Vec2, target: Vec2): number | null {
    if (
      this.getStats().active >= this.config.maximumActive ||
      !isFinitePoint(origin) ||
      !isFinitePoint(target)
    ) {
      return null;
    }

    const direction = normalizedDirection(origin, target, { x: -1, y: 0 });
    const reusable = this.rockets.find((rocket) => !rocket.active);
    const rocket: DemoRocketState = reusable ?? {
      id: 0,
      motion: "incoming",
      previousPosition: { ...origin },
      position: { ...origin },
      direction,
      speed: 0,
      acceleration: this.config.acceleration,
      maximumSpeed: this.config.maximumSpeed,
      homingTurnRateRadiansPerSecond:
        this.config.homingTurnRateRadiansPerSecond,
      radius: this.config.radius,
      playerDamage: this.config.playerDamage,
      absorptionProgress: 0,
      active: true,
      absorptionStart: { ...origin },
      absorptionElapsed: 0,
      absorptionDuration: 0,
    };

    rocket.id = this.nextId;
    rocket.motion = "incoming";
    rocket.previousPosition = { ...origin };
    rocket.position = { ...origin };
    rocket.direction = direction;
    rocket.speed = 0;
    rocket.acceleration = Math.max(0, this.config.acceleration);
    rocket.maximumSpeed = Math.max(0, this.config.maximumSpeed);
    rocket.homingTurnRateRadiansPerSecond = Math.max(
      0,
      this.config.homingTurnRateRadiansPerSecond,
    );
    rocket.radius = Math.max(0, this.config.radius);
    rocket.playerDamage = Math.max(1, Math.round(this.config.playerDamage));
    rocket.absorptionProgress = 0;
    rocket.active = true;
    rocket.absorptionStart = { ...origin };
    rocket.absorptionElapsed = 0;
    rocket.absorptionDuration = 0;

    if (!reusable) {
      this.rockets.push(rocket);
    }

    const id = this.nextId;
    this.nextId += 1;
    this.spawnedTotal += 1;
    return id;
  }

  update(deltaSeconds: number, playerTarget?: Vec2): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;

    for (const explosion of this.explosions) {
      explosion.elapsed += safeDelta;
    }
    for (let index = this.explosions.length - 1; index >= 0; index -= 1) {
      if (this.explosions[index].elapsed >= this.explosions[index].duration) {
        this.explosions.splice(index, 1);
      }
    }

    for (const rocket of this.rockets) {
      if (!rocket.active) {
        continue;
      }

      rocket.previousPosition = { ...rocket.position };
      if (rocket.motion === "absorbing") {
        this.advanceAbsorption(rocket, safeDelta, playerTarget);
        continue;
      }
      if (
        rocket.motion === "incoming" &&
        playerTarget &&
        isFinitePoint(playerTarget)
      ) {
        rocket.direction = rotateDirectionToward(
          rocket.direction,
          normalizedDirection(
            rocket.position,
            playerTarget,
            rocket.direction,
          ),
          rocket.homingTurnRateRadiansPerSecond * safeDelta,
        );
      }
      const nextSpeed = Math.min(
        rocket.maximumSpeed,
        rocket.speed + rocket.acceleration * safeDelta,
      );
      const travel = (rocket.speed + nextSpeed) * 0.5 * safeDelta;
      rocket.speed = nextSpeed;
      const end = {
        x: rocket.position.x + rocket.direction.x * travel,
        y: rocket.position.y + rocket.direction.y * travel,
      };

      const verticalImpact = findVerticalImpact(
        rocket.position,
        end,
        rocket.radius,
        this.config.worldHeight,
      );
      if (verticalImpact) {
        rocket.position = verticalImpact;
        this.explode(rocket, "wall");
        this.wallExplosions += 1;
        continue;
      }

      rocket.position = end;
      if (
        rocket.position.x + rocket.radius < 0 ||
        rocket.position.x - rocket.radius > this.config.worldWidth
      ) {
        rocket.active = false;
      }
    }
  }

  findIncomingPlayerCollision(center: Vec2, radius: number): number | null {
    return this.findCollision(center, radius, "incoming");
  }

  findReflectedColliderCollision(
    targets: readonly CircleCollider[],
  ): { rocketId: number; targetIndex: number } | null {
    for (const rocket of this.rockets) {
      if (!rocket.active || rocket.motion !== "reflected") {
        continue;
      }
      for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
        if (
          sweptCircleIntersectsCircle(
            rocket.previousPosition,
            rocket.position,
            rocket.radius,
            targets[targetIndex],
          )
        ) {
          return { rocketId: rocket.id, targetIndex };
        }
      }
    }
    return null;
  }

  reflect(id: number, center: Vec2, radius: number): boolean {
    const rocket = this.rockets.find(
      (candidate) =>
        candidate.active &&
        candidate.id === id &&
        candidate.motion === "incoming",
    );
    if (!rocket || !isFinitePoint(center) || !Number.isFinite(radius) || radius < 0) {
      return false;
    }

    const collision = sweptCircleCollision(
      rocket.previousPosition,
      rocket.position,
      rocket.radius,
      { center, radius },
    );
    if (!collision) {
      return false;
    }

    rocket.motion = "reflected";
    rocket.position = { ...collision.center };
    rocket.previousPosition = { ...collision.center };
    rocket.direction = normalizedDirection(
      center,
      collision.center,
      { x: -rocket.direction.x, y: -rocket.direction.y },
    );
    this.reflectedTotal += 1;
    return true;
  }

  consumeAsExplosion(id: number, cause: DemoRocketExplosionCause): boolean {
    const rocket = this.rockets.find(
      (candidate) => candidate.active && candidate.id === id,
    );
    if (!rocket) {
      return false;
    }
    this.explode(rocket, cause);
    return true;
  }

  absorbAll(): number {
    let absorbed = 0;
    for (const rocket of this.rockets) {
      if (rocket.active) {
        rocket.active = false;
        absorbed += 1;
      }
    }
    return absorbed;
  }

  beginAbsorption(durationSeconds: number): number {
    const duration = Number.isFinite(durationSeconds)
      ? Math.max(0, durationSeconds)
      : 0;
    let absorbed = 0;
    for (const rocket of this.rockets) {
      if (!rocket.active) {
        continue;
      }
      absorbed += 1;
      if (duration === 0) {
        rocket.active = false;
        continue;
      }
      rocket.motion = "absorbing";
      rocket.speed = 0;
      rocket.absorptionStart = { ...rocket.position };
      rocket.absorptionElapsed = 0;
      rocket.absorptionDuration = duration;
      rocket.absorptionProgress = 0;
    }
    return absorbed;
  }

  clearAll(): void {
    for (const rocket of this.rockets) {
      rocket.active = false;
    }
    this.explosions.length = 0;
  }

  getSnapshots(): readonly Readonly<DemoRocketSnapshot>[] {
    return this.rockets
      .filter((rocket) => rocket.active)
      .map((rocket) => ({
        id: rocket.id,
        motion: rocket.motion,
        previousPosition: { ...rocket.previousPosition },
        position: { ...rocket.position },
        direction: { ...rocket.direction },
        speed: rocket.speed,
        acceleration: rocket.acceleration,
        maximumSpeed: rocket.maximumSpeed,
        homingTurnRateRadiansPerSecond:
          rocket.homingTurnRateRadiansPerSecond,
        radius: rocket.radius,
        playerDamage: rocket.playerDamage,
        absorptionProgress: rocket.absorptionProgress,
      }));
  }

  getExplosionSnapshots(): readonly Readonly<DemoRocketExplosionSnapshot>[] {
    return this.explosions.map((explosion) => ({
      id: explosion.id,
      position: { ...explosion.position },
      progress: Math.min(1, explosion.elapsed / explosion.duration),
      cause: explosion.cause,
    }));
  }

  getStats(): Readonly<DemoRocketStats> {
    const active = this.rockets.filter((rocket) => rocket.active);
    return {
      active: active.length,
      incoming: active.filter((rocket) => rocket.motion === "incoming").length,
      reflected: active.filter((rocket) => rocket.motion === "reflected").length,
      absorbing: active.filter((rocket) => rocket.motion === "absorbing").length,
      spawnedTotal: this.spawnedTotal,
      reflectedTotal: this.reflectedTotal,
      wallExplosions: this.wallExplosions,
    };
  }

  getBossDamage(): number {
    return Math.max(1, Math.round(this.config.bossDamage));
  }

  private findCollision(
    center: Vec2,
    radius: number,
    motion: DemoRocketMotion,
  ): number | null {
    for (const rocket of this.rockets) {
      if (
        rocket.active &&
        rocket.motion === motion &&
        sweptCircleIntersectsCircle(
          rocket.previousPosition,
          rocket.position,
          rocket.radius,
          { center, radius },
        )
      ) {
        return rocket.id;
      }
    }
    return null;
  }

  private explode(
    rocket: DemoRocketState,
    cause: DemoRocketExplosionCause,
  ): void {
    rocket.active = false;
    this.explosions.push({
      id: this.nextExplosionId,
      position: { ...rocket.position },
      elapsed: 0,
      duration: Math.max(0.05, this.config.explosionSeconds),
      cause,
    });
    this.nextExplosionId += 1;
  }

  private advanceAbsorption(
    rocket: DemoRocketState,
    deltaSeconds: number,
    target?: Vec2,
  ): void {
    const duration = Math.max(0.0001, rocket.absorptionDuration);
    rocket.absorptionElapsed = Math.min(
      duration,
      rocket.absorptionElapsed + deltaSeconds,
    );
    const progress = rocket.absorptionElapsed / duration;
    const accelerated = progress * progress * progress;
    const destination = target && isFinitePoint(target) ? target : rocket.position;
    rocket.position = {
      x: rocket.absorptionStart.x + (destination.x - rocket.absorptionStart.x) * accelerated,
      y: rocket.absorptionStart.y + (destination.y - rocket.absorptionStart.y) * accelerated,
    };
    rocket.absorptionProgress = progress;
    if (progress >= 1) {
      rocket.position = { ...destination };
      rocket.active = false;
    }
  }
}

function findVerticalImpact(
  start: Vec2,
  end: Vec2,
  radius: number,
  worldHeight: number,
): Vec2 | null {
  const minimumY = radius;
  const maximumY = worldHeight - radius;
  const boundary = end.y < minimumY ? minimumY : end.y > maximumY ? maximumY : null;
  if (boundary === null || Math.abs(end.y - start.y) < 0.0000001) {
    return null;
  }
  const time = (boundary - start.y) / (end.y - start.y);
  return {
    x: start.x + (end.x - start.x) * Math.max(0, Math.min(1, time)),
    y: boundary,
  };
}

function normalizedDirection(from: Vec2, to: Vec2, fallback: Vec2): Vec2 {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);
  if (Number.isFinite(length) && length >= 0.0001) {
    return { x: deltaX / length, y: deltaY / length };
  }
  const fallbackLength = Math.hypot(fallback.x, fallback.y);
  if (Number.isFinite(fallbackLength) && fallbackLength >= 0.0001) {
    return { x: fallback.x / fallbackLength, y: fallback.y / fallbackLength };
  }
  return { x: -1, y: 0 };
}

function rotateDirectionToward(
  current: Vec2,
  target: Vec2,
  maximumTurnRadians: number,
): Vec2 {
  const currentAngle = Math.atan2(current.y, current.x);
  const targetAngle = Math.atan2(target.y, target.x);
  const difference = Math.atan2(
    Math.sin(targetAngle - currentAngle),
    Math.cos(targetAngle - currentAngle),
  );
  const safeMaximumTurn = Number.isFinite(maximumTurnRadians)
    ? Math.max(0, maximumTurnRadians)
    : 0;
  const turn = Math.max(-safeMaximumTurn, Math.min(safeMaximumTurn, difference));
  const angle = currentAngle + turn;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
