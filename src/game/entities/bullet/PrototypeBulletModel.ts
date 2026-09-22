import type { Vec2 } from "../playerRig/PlayerRigModel";
import {
  type CircleCollider,
  sweptCircleCollision,
  sweptCircleIntersectsCircle,
} from "../../systems/CollisionSystem.ts";

export type PrototypeBulletType = "normal" | "special";
export type PrototypeBulletMotion = "incoming" | "reflected" | "absorbing";

export interface PrototypeBulletConfig {
  maximumActive: number;
  initialDelaySeconds: number;
  spawnIntervalSeconds: number;
  emitterPosition: Vec2;
  targetPosition: Vec2;
  targetRadius: number;
  normalRadius: number;
  specialRadius: number;
  normalSpeed: number;
  specialSpeed: number;
  reflectedSpeed: number;
  maximumReflectedBounces: number;
  worldWidth: number;
  worldHeight: number;
  despawnPadding: number;
  sequence: readonly PrototypeBulletType[];
}

export interface PrototypeBulletSnapshot {
  id: number;
  type: PrototypeBulletType;
  motion: PrototypeBulletMotion;
  previousPosition: Vec2;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  wallBounces: number;
  absorptionProgress: number;
}

export interface PrototypeBulletStats {
  active: number;
  incomingNormal: number;
  incomingSpecial: number;
  reflected: number;
  absorbing: number;
  emittedTotal: number;
  emittedSpecialTotal: number;
  reflectedTotal: number;
  targetHits: number;
}

export interface AbsorbedBulletCounts {
  normal: number;
  special: number;
  total: number;
}

interface PrototypeBulletState extends PrototypeBulletSnapshot {
  active: boolean;
  escapedHorizontally: boolean;
  movementSegments: MovementSegment[];
  absorptionStart: Vec2;
  absorptionElapsed: number;
  absorptionDuration: number;
  absorptionArc: number;
}

interface MovementSegment {
  start: Vec2;
  end: Vec2;
}

export class PrototypeBulletModel {
  private readonly config: PrototypeBulletConfig;
  private readonly bullets: PrototypeBulletState[] = [];
  private spawnRemaining: number;
  private sequenceIndex = 0;
  private nextId = 1;
  private emittedTotal = 0;
  private emittedSpecialTotal = 0;
  private reflectedTotal = 0;
  private targetHits = 0;

  constructor(config: PrototypeBulletConfig) {
    this.config = config;
    this.spawnRemaining = config.initialDelaySeconds;
  }

  update(deltaSeconds: number, playerPosition: Vec2): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      bullet.previousPosition = { ...bullet.position };
      bullet.movementSegments = [];

      if (bullet.motion === "absorbing") {
        this.advanceAbsorbingBullet(bullet, safeDelta, playerPosition);
      } else if (bullet.motion === "reflected") {
        this.advanceReflectedBullet(bullet, safeDelta);
      } else {
        const end = {
          x: bullet.position.x + bullet.velocity.x * safeDelta,
          y: bullet.position.y + bullet.velocity.y * safeDelta,
        };
        bullet.movementSegments.push({ start: { ...bullet.position }, end });
        bullet.position = end;
      }

      if (
        bullet.active &&
        bullet.motion !== "absorbing" &&
        this.isOutsideWorld(bullet.position)
      ) {
        bullet.active = false;
      }
    }

    if (this.config.sequence.length > 0) {
      this.spawnRemaining -= safeDelta;
      const interval = Math.max(0.05, this.config.spawnIntervalSeconds);

      while (this.spawnRemaining <= 0) {
        this.spawn(playerPosition);
        this.spawnRemaining += interval;
      }
    }
  }

  findIncomingSpecialCollision(center: Vec2, radius: number): number | null {
    return this.findCollision(center, radius, (bullet) =>
      bullet.motion === "incoming" && bullet.type === "special",
    );
  }

  findIncomingNormalCollision(center: Vec2, radius: number): number | null {
    return this.findCollision(center, radius, (bullet) =>
      bullet.motion === "incoming" && bullet.type === "normal",
    );
  }

  findIncomingPlayerCollision(center: Vec2, radius: number): number | null {
    return this.findCollision(
      center,
      radius,
      (bullet) => bullet.motion === "incoming",
    );
  }

  findReflectedTargetCollision(): number | null {
    return this.findCollision(
      this.config.targetPosition,
      this.config.targetRadius,
      (bullet) => bullet.motion === "reflected",
    );
  }

  findReflectedColliderCollision(
    targets: readonly CircleCollider[],
  ): { bulletId: number; targetIndex: number } | null {
    for (const bullet of this.bullets) {
      if (!bullet.active || bullet.motion !== "reflected") {
        continue;
      }

      for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
        const target = targets[targetIndex];

        if (
          bullet.movementSegments.some((segment) =>
            sweptCircleIntersectsCircle(
              segment.start,
              segment.end,
              bullet.radius,
              target,
            ),
          )
        ) {
          return { bulletId: bullet.id, targetIndex };
        }
      }
    }

    return null;
  }

  spawnIncoming(
    type: PrototypeBulletType,
    origin: Vec2,
    target: Vec2,
    speed: number,
  ): number | null {
    if (
      this.getStats().active >= this.config.maximumActive ||
      !isFinitePoint(origin) ||
      !isFinitePoint(target) ||
      !Number.isFinite(speed) ||
      speed < 0
    ) {
      return null;
    }

    const radius = type === "special" ? this.config.specialRadius : this.config.normalRadius;
    const reusable = this.bullets.find((bullet) => !bullet.active);
    const state: PrototypeBulletState = reusable ?? {
      id: 0,
      type,
      motion: "incoming",
      previousPosition: { ...origin },
      position: { ...origin },
      velocity: { x: 0, y: 0 },
      radius,
      wallBounces: 0,
      absorptionProgress: 0,
      active: true,
      escapedHorizontally: false,
      movementSegments: [],
      absorptionStart: { ...origin },
      absorptionElapsed: 0,
      absorptionDuration: 0,
      absorptionArc: 0,
    };

    state.id = this.nextId;
    state.type = type;
    state.motion = "incoming";
    state.previousPosition = { ...origin };
    state.position = { ...origin };
    state.velocity = velocityToward(origin, target, speed);
    state.radius = radius;
    state.wallBounces = 0;
    state.absorptionProgress = 0;
    state.active = true;
    state.escapedHorizontally = false;
    state.movementSegments = [{ start: { ...origin }, end: { ...origin } }];
    state.absorptionStart = { ...origin };
    state.absorptionElapsed = 0;
    state.absorptionDuration = 0;
    state.absorptionArc = 0;

    if (!reusable) {
      this.bullets.push(state);
    }

    const id = this.nextId;
    this.nextId += 1;
    this.emittedTotal += 1;

    if (type === "special") {
      this.emittedSpecialTotal += 1;
    }

    return id;
  }

  beginAbsorption(durationSeconds: number): Readonly<AbsorbedBulletCounts> {
    const duration = Number.isFinite(durationSeconds)
      ? Math.max(0, durationSeconds)
      : 0;
    let normal = 0;
    let special = 0;

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      if (bullet.type === "special") {
        special += 1;
      } else {
        normal += 1;
      }

      if (duration === 0) {
        bullet.active = false;
        continue;
      }

      bullet.motion = "absorbing";
      bullet.previousPosition = { ...bullet.position };
      bullet.velocity = { x: 0, y: 0 };
      bullet.movementSegments = [];
      bullet.absorptionStart = { ...bullet.position };
      bullet.absorptionElapsed = 0;
      bullet.absorptionDuration = duration;
      bullet.absorptionProgress = 0;
      bullet.absorptionArc = (bullet.id % 2 === 0 ? 1 : -1) * (44 + (bullet.id % 5) * 9);
    }

    return { normal, special, total: normal + special };
  }

  absorbAll(): Readonly<AbsorbedBulletCounts> {
    let normal = 0;
    let special = 0;

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      if (bullet.type === "special") {
        special += 1;
      } else {
        normal += 1;
      }

      bullet.active = false;
    }

    return { normal, special, total: normal + special };
  }

  reflect(id: number, parryCenter: Vec2, parryRadius: number): boolean {
    return this.reflectIncomingOfType(
      id,
      "special",
      parryCenter,
      parryRadius,
    );
  }

  reflectAnyIncoming(id: number, center: Vec2, radius: number): boolean {
    const bullet = this.bullets.find(
      (candidate) =>
        candidate.active && candidate.id === id && candidate.motion === "incoming",
    );

    if (!bullet) {
      return false;
    }

    return this.reflectIncomingOfType(id, bullet.type, center, radius);
  }

  reflectNormal(id: number, center: Vec2, radius: number): boolean {
    return this.reflectIncomingOfType(id, "normal", center, radius);
  }

  private reflectIncomingOfType(
    id: number,
    allowedType: PrototypeBulletType,
    parryCenter: Vec2,
    parryRadius: number,
  ): boolean {
    const bullet = this.bullets.find((candidate) => candidate.active && candidate.id === id);

    if (
      !bullet ||
      bullet.type !== allowedType ||
      bullet.motion !== "incoming" ||
      !Number.isFinite(parryCenter.x) ||
      !Number.isFinite(parryCenter.y) ||
      !Number.isFinite(parryRadius) ||
      parryRadius < 0
    ) {
      return false;
    }

    const collision = sweptCircleCollision(
      bullet.previousPosition,
      bullet.position,
      bullet.radius,
      { center: parryCenter, radius: parryRadius },
    );

    if (!collision) {
      return false;
    }

    const outwardDirection = normalizedDirection(
      parryCenter,
      collision.center,
      { x: -bullet.velocity.x, y: -bullet.velocity.y },
    );

    bullet.motion = "reflected";
    bullet.position = { ...collision.center };
    bullet.previousPosition = { ...collision.center };
    bullet.movementSegments = [
      { start: { ...collision.center }, end: { ...collision.center } },
    ];
    bullet.velocity = {
      x: outwardDirection.x * this.config.reflectedSpeed,
      y: outwardDirection.y * this.config.reflectedSpeed,
    };
    bullet.wallBounces = 0;
    bullet.escapedHorizontally = false;
    this.reflectedTotal += 1;
    return true;
  }

  consume(id: number): boolean {
    const bullet = this.bullets.find((candidate) => candidate.active && candidate.id === id);

    if (!bullet) {
      return false;
    }

    bullet.active = false;
    return true;
  }

  consumeAsTargetHit(id: number): boolean {
    if (!this.consume(id)) {
      return false;
    }

    this.targetHits += 1;
    return true;
  }

  getSnapshots(): readonly Readonly<PrototypeBulletSnapshot>[] {
    return this.bullets
      .filter((bullet) => bullet.active)
      .map((bullet) => ({
        id: bullet.id,
        type: bullet.type,
        motion: bullet.motion,
        previousPosition: { ...bullet.previousPosition },
        position: { ...bullet.position },
        velocity: { ...bullet.velocity },
        radius: bullet.radius,
        wallBounces: bullet.wallBounces,
        absorptionProgress: bullet.absorptionProgress,
      }));
  }

  getStats(): Readonly<PrototypeBulletStats> {
    let incomingNormal = 0;
    let incomingSpecial = 0;
    let reflected = 0;
    let absorbing = 0;

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      if (bullet.motion === "absorbing") {
        absorbing += 1;
      } else if (bullet.motion === "reflected") {
        reflected += 1;
      } else if (bullet.type === "special") {
        incomingSpecial += 1;
      } else {
        incomingNormal += 1;
      }
    }

    return {
      active: incomingNormal + incomingSpecial + reflected + absorbing,
      incomingNormal,
      incomingSpecial,
      reflected,
      absorbing,
      emittedTotal: this.emittedTotal,
      emittedSpecialTotal: this.emittedSpecialTotal,
      reflectedTotal: this.reflectedTotal,
      targetHits: this.targetHits,
    };
  }

  private spawn(playerPosition: Vec2): void {
    if (
      this.getStats().active >= this.config.maximumActive ||
      this.config.sequence.length === 0
    ) {
      return;
    }

    const type = this.config.sequence[this.sequenceIndex % this.config.sequence.length];
    this.sequenceIndex += 1;
    const speed = type === "special" ? this.config.specialSpeed : this.config.normalSpeed;
    this.spawnIncoming(
      type,
      this.config.emitterPosition,
      playerPosition,
      speed,
    );
  }

  private findCollision(
    center: Vec2,
    radius: number,
    predicate: (bullet: PrototypeBulletState) => boolean,
  ): number | null {
    for (const bullet of this.bullets) {
      if (
        bullet.active &&
        predicate(bullet) &&
        bullet.movementSegments.some((segment) =>
          sweptCircleIntersectsCircle(
            segment.start,
            segment.end,
            bullet.radius,
            { center, radius },
          ),
        )
      ) {
        return bullet.id;
      }
    }

    return null;
  }

  private advanceReflectedBullet(
    bullet: PrototypeBulletState,
    deltaSeconds: number,
  ): void {
    let remaining = deltaSeconds;
    let position = { ...bullet.position };
    const epsilon = 0.0000001;

    while (remaining > epsilon && bullet.active) {
      if (bullet.escapedHorizontally) {
        const end = {
          x: position.x + bullet.velocity.x * remaining,
          y: position.y + bullet.velocity.y * remaining,
        };
        bullet.movementSegments.push({ start: { ...position }, end });
        position = end;
        break;
      }

      const verticalEvent = timeToVerticalBoundary(
        position,
        bullet.velocity,
        bullet.radius,
        this.config.worldHeight,
      );
      const horizontalExit = timeToHorizontalBoundary(
        position,
        bullet.velocity,
        this.config.worldWidth,
      );
      const eventTime = Math.min(verticalEvent, horizontalExit);

      if (!Number.isFinite(eventTime) || eventTime > remaining) {
        const end = {
          x: position.x + bullet.velocity.x * remaining,
          y: position.y + bullet.velocity.y * remaining,
        };
        bullet.movementSegments.push({ start: { ...position }, end });
        position = end;
        break;
      }

      const eventPosition = {
        x: position.x + bullet.velocity.x * eventTime,
        y: position.y + bullet.velocity.y * eventTime,
      };
      bullet.movementSegments.push({
        start: { ...position },
        end: { ...eventPosition },
      });
      position = eventPosition;
      remaining -= eventTime;

      if (horizontalExit <= verticalEvent + epsilon) {
        bullet.escapedHorizontally = true;
        continue;
      }

      if (bullet.wallBounces >= this.config.maximumReflectedBounces) {
        bullet.active = false;
        break;
      }

      bullet.wallBounces += 1;
      bullet.velocity = { x: bullet.velocity.x, y: -bullet.velocity.y };
    }

    bullet.position = position;
  }

  private advanceAbsorbingBullet(
    bullet: PrototypeBulletState,
    deltaSeconds: number,
    target: Vec2,
  ): void {
    const duration = Math.max(0.0001, bullet.absorptionDuration);
    bullet.absorptionElapsed = Math.min(
      duration,
      bullet.absorptionElapsed + deltaSeconds,
    );
    const progress = Math.min(1, bullet.absorptionElapsed / duration);
    const accelerated = progress * progress * progress;
    const deltaX = target.x - bullet.absorptionStart.x;
    const deltaY = target.y - bullet.absorptionStart.y;
    const distance = Math.hypot(deltaX, deltaY);
    const perpendicular =
      distance > 0.0001
        ? { x: -deltaY / distance, y: deltaX / distance }
        : { x: 0, y: 0 };
    const arcOffset = Math.sin(progress * Math.PI) * bullet.absorptionArc;
    const end = {
      x:
        bullet.absorptionStart.x +
        deltaX * accelerated +
        perpendicular.x * arcOffset,
      y:
        bullet.absorptionStart.y +
        deltaY * accelerated +
        perpendicular.y * arcOffset,
    };

    bullet.movementSegments.push({ start: { ...bullet.position }, end });
    bullet.position = end;
    bullet.absorptionProgress = progress;

    if (progress >= 1) {
      bullet.position = { ...target };
      bullet.active = false;
    }
  }

  private isOutsideWorld(position: Vec2): boolean {
    const padding = this.config.despawnPadding;
    return (
      position.x < -padding ||
      position.x > this.config.worldWidth + padding ||
      position.y < -padding ||
      position.y > this.config.worldHeight + padding
    );
  }
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function timeToVerticalBoundary(
  position: Vec2,
  velocity: Vec2,
  radius: number,
  worldHeight: number,
): number {
  if (velocity.y < -0.0000001) {
    return Math.max(0, (radius - position.y) / velocity.y);
  }

  if (velocity.y > 0.0000001) {
    return Math.max(0, (worldHeight - radius - position.y) / velocity.y);
  }

  return Number.POSITIVE_INFINITY;
}

function timeToHorizontalBoundary(
  position: Vec2,
  velocity: Vec2,
  worldWidth: number,
): number {
  if (velocity.x < -0.0000001) {
    return Math.max(0, -position.x / velocity.x);
  }

  if (velocity.x > 0.0000001) {
    return Math.max(0, (worldWidth - position.x) / velocity.x);
  }

  return Number.POSITIVE_INFINITY;
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
    return {
      x: fallback.x / fallbackLength,
      y: fallback.y / fallbackLength,
    };
  }

  return { x: 1, y: 0 };
}

function velocityToward(from: Vec2, to: Vec2, speed: number): Vec2 {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY);

  if (!Number.isFinite(length) || length < 0.0001 || !Number.isFinite(speed)) {
    return { x: -Math.max(0, speed), y: 0 };
  }

  const scale = Math.max(0, speed) / length;
  return { x: deltaX * scale, y: deltaY * scale };
}
