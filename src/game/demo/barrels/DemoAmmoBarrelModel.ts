import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";
import { SeededRandom } from "../../systems/SeededRandom.ts";
import {
  laserIntersectsCircle,
  type DemoLaserBeam,
} from "../lasers/DemoLaserGeometry.ts";

export interface DemoAmmoBarrelConfig {
  randomSeed: number;
  maximumActive: number;
  initialSpawnDelaySeconds: number;
  minimumSpawnIntervalSeconds: number;
  maximumSpawnIntervalSeconds: number;
  lifetimeSeconds: number;
  laserExposureSeconds: number;
  burstWarningSeconds: number;
  dudVisualSeconds: number;
  radius: number;
  spawnBounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  minimumPlayerDistance: number;
  minimumBossDistance: number;
  safeCornerExclusionX: number;
  safeCornerExclusionHeight: number;
  worldHeight: number;
  minimumBurstBullets: number;
  maximumBurstBullets: number;
  bulletSpawnRadius: number;
  bulletSpeed: number;
}

export type DemoAmmoBarrelState = "armed" | "burst-warning" | "dud";

export interface DemoAmmoBarrelSnapshot {
  id: number;
  position: Vec2;
  radius: number;
  state: DemoAmmoBarrelState;
  lifetimeRemaining: number;
  laserExposure: number;
  chargeProgress: number;
  stateProgress: number;
}

export interface DemoAmmoBarrelBulletEvent {
  sourceId: number;
  origin: Vec2;
  target: Vec2;
  speed: number;
}

export interface DemoAmmoBarrelUpdateEvents {
  bullets: readonly Readonly<DemoAmmoBarrelBulletEvent>[];
  spawned: readonly number[];
  burst: readonly number[];
  dud: readonly number[];
}

export interface DemoAmmoBarrelStats {
  active: number;
  armed: number;
  warning: number;
  dud: number;
  spawnedTotal: number;
  burstTotal: number;
  dudTotal: number;
  specialBulletsEmitted: number;
  spawnRemaining: number;
  spawnTimerPausedAtCap: boolean;
}

interface DemoAmmoBarrelEntity extends DemoAmmoBarrelSnapshot {
  active: boolean;
  stateElapsed: number;
  stateDuration: number;
}

export interface DemoAmmoBarrelUpdateContext {
  allowProgress: boolean;
  playerPosition: Vec2;
  bossPosition: Vec2;
  activeLaser: Readonly<DemoLaserBeam> | null;
}

/** 第五阶段可被敌方激光充能的特殊弹弹药桶。 */
export class DemoAmmoBarrelModel {
  private readonly config: DemoAmmoBarrelConfig;
  private readonly placementRandom: SeededRandom;
  private readonly scheduleRandom: SeededRandom;
  private readonly burstRandom: SeededRandom;
  private readonly entities: DemoAmmoBarrelEntity[] = [];
  private nextId = 1;
  private spawnRemaining: number;
  private spawnedTotal = 0;
  private burstTotal = 0;
  private dudTotal = 0;
  private specialBulletsEmitted = 0;

  constructor(config: DemoAmmoBarrelConfig) {
    this.config = config;
    this.placementRandom = new SeededRandom(config.randomSeed);
    this.scheduleRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
    this.burstRandom = new SeededRandom(config.randomSeed ^ 0x85ebca6b);
    this.spawnRemaining = Math.max(0, config.initialSpawnDelaySeconds);
  }

  update(
    deltaSeconds: number,
    context: Readonly<DemoAmmoBarrelUpdateContext>,
  ): Readonly<DemoAmmoBarrelUpdateEvents> {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    const bullets: DemoAmmoBarrelBulletEvent[] = [];
    const spawned: number[] = [];
    const burst: number[] = [];
    const dud: number[] = [];
    if (!context.allowProgress) {
      return { bullets, spawned, burst, dud };
    }

    for (const entity of this.entities) {
      if (!entity.active) {
        continue;
      }
      if (entity.state === "armed") {
        entity.lifetimeRemaining = Math.max(0, entity.lifetimeRemaining - safeDelta);
        if (
          context.activeLaser?.active &&
          laserIntersectsCircle(context.activeLaser, {
            center: entity.position,
            radius: entity.radius,
          })
        ) {
          const requiredExposure = Math.max(
            0.05,
            this.config.laserExposureSeconds,
          );
          if (context.activeLaser.kind === "ultimate") {
            entity.laserExposure = requiredExposure;
            entity.chargeProgress = 1;
          } else {
            entity.laserExposure += safeDelta;
            entity.chargeProgress = Math.min(
              1,
              entity.laserExposure / requiredExposure,
            );
          }
        }
        if (entity.chargeProgress >= 1) {
          this.enterTimedState(
            entity,
            "burst-warning",
            this.config.burstWarningSeconds,
          );
        } else if (entity.lifetimeRemaining <= 0) {
          this.enterTimedState(entity, "dud", this.config.dudVisualSeconds);
          this.dudTotal += 1;
          dud.push(entity.id);
        }
        continue;
      }

      entity.stateElapsed = Math.min(
        entity.stateDuration,
        entity.stateElapsed + safeDelta,
      );
      entity.stateProgress = entity.stateElapsed / entity.stateDuration;
      if (entity.stateElapsed < entity.stateDuration) {
        continue;
      }
      if (entity.state === "burst-warning") {
        const emitted = this.createBurst(entity);
        bullets.push(...emitted);
        this.burstTotal += 1;
        this.specialBulletsEmitted += emitted.length;
        burst.push(entity.id);
      }
      entity.active = false;
    }

    const maximum = Math.max(1, Math.round(this.config.maximumActive));
    if (this.getActiveCount() < maximum) {
      this.spawnRemaining -= safeDelta;
      if (this.spawnRemaining <= 0) {
        const id = this.spawn(context.playerPosition, context.bossPosition);
        if (id !== null) {
          spawned.push(id);
        }
        this.spawnRemaining += this.drawSpawnInterval();
      }
    }

    return { bullets, spawned, burst, dud };
  }

  forceSpawn(playerPosition: Vec2, bossPosition: Vec2): number | null {
    return this.spawn(playerPosition, bossPosition);
  }

  forceChargeFirst(): number | null {
    const barrel = this.entities.find(
      (entity) => entity.active && entity.state === "armed",
    );
    if (!barrel) {
      return null;
    }
    barrel.laserExposure = Math.max(0.05, this.config.laserExposureSeconds);
    barrel.chargeProgress = 1;
    this.enterTimedState(barrel, "burst-warning", this.config.burstWarningSeconds);
    return barrel.id;
  }

  forceExpireFirst(): number | null {
    const barrel = this.entities.find(
      (entity) => entity.active && entity.state === "armed",
    );
    if (!barrel) {
      return null;
    }
    barrel.lifetimeRemaining = 0;
    this.enterTimedState(barrel, "dud", this.config.dudVisualSeconds);
    this.dudTotal += 1;
    return barrel.id;
  }

  forceBurstFirst(): number | null {
    const barrel = this.entities.find(
      (entity) => entity.active && entity.state === "armed",
    );
    if (!barrel) {
      return null;
    }
    barrel.laserExposure = Math.max(0.05, this.config.laserExposureSeconds);
    barrel.chargeProgress = 1;
    this.enterTimedState(barrel, "burst-warning", 0.05);
    return barrel.id;
  }

  clearAll(): void {
    for (const entity of this.entities) {
      entity.active = false;
    }
  }

  getSnapshots(): readonly Readonly<DemoAmmoBarrelSnapshot>[] {
    return this.entities
      .filter((entity) => entity.active)
      .map((entity) => ({
        id: entity.id,
        position: { ...entity.position },
        radius: entity.radius,
        state: entity.state,
        lifetimeRemaining: entity.lifetimeRemaining,
        laserExposure: entity.laserExposure,
        chargeProgress: entity.chargeProgress,
        stateProgress: entity.stateProgress,
      }));
  }

  getStats(): Readonly<DemoAmmoBarrelStats> {
    const active = this.entities.filter((entity) => entity.active);
    const maximum = Math.max(1, Math.round(this.config.maximumActive));
    return {
      active: active.length,
      armed: active.filter((entity) => entity.state === "armed").length,
      warning: active.filter((entity) => entity.state === "burst-warning").length,
      dud: active.filter((entity) => entity.state === "dud").length,
      spawnedTotal: this.spawnedTotal,
      burstTotal: this.burstTotal,
      dudTotal: this.dudTotal,
      specialBulletsEmitted: this.specialBulletsEmitted,
      spawnRemaining: Math.max(0, this.spawnRemaining),
      spawnTimerPausedAtCap: active.length >= maximum,
    };
  }

  private spawn(playerPosition: Vec2, bossPosition: Vec2): number | null {
    if (
      !isFinitePoint(playerPosition) ||
      !isFinitePoint(bossPosition) ||
      this.getActiveCount() >= Math.max(1, Math.round(this.config.maximumActive))
    ) {
      return null;
    }
    const position = this.drawPosition(playerPosition, bossPosition);
    const reusable = this.entities.find((entity) => !entity.active);
    const entity: DemoAmmoBarrelEntity = reusable ?? {
      id: 0,
      position,
      radius: 0,
      state: "armed",
      lifetimeRemaining: 0,
      laserExposure: 0,
      chargeProgress: 0,
      stateProgress: 0,
      active: true,
      stateElapsed: 0,
      stateDuration: 1,
    };
    entity.id = this.nextId;
    entity.position = position;
    entity.radius = Math.max(1, this.config.radius);
    entity.state = "armed";
    entity.lifetimeRemaining = Math.max(0.05, this.config.lifetimeSeconds);
    entity.laserExposure = 0;
    entity.chargeProgress = 0;
    entity.stateProgress = 0;
    entity.active = true;
    entity.stateElapsed = 0;
    entity.stateDuration = 1;
    if (!reusable) {
      this.entities.push(entity);
    }
    this.nextId += 1;
    this.spawnedTotal += 1;
    return entity.id;
  }

  private drawPosition(playerPosition: Vec2, bossPosition: Vec2): Vec2 {
    let fallback = {
      x: this.config.spawnBounds.minX,
      y: this.config.spawnBounds.minY,
    };
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const candidate = {
        x: this.placementRandom.range(
          this.config.spawnBounds.minX,
          this.config.spawnBounds.maxX,
        ),
        y: this.placementRandom.range(
          this.config.spawnBounds.minY,
          this.config.spawnBounds.maxY,
        ),
      };
      const playerDistance = distance(candidate, playerPosition);
      const bossDistance = distance(candidate, bossPosition);
      const inSafeCorner =
        candidate.x >= this.config.safeCornerExclusionX &&
        (candidate.y <= this.config.safeCornerExclusionHeight ||
          candidate.y >=
            this.config.worldHeight - this.config.safeCornerExclusionHeight);
      const score = Math.min(playerDistance, bossDistance);
      if (!inSafeCorner && score > bestScore) {
        fallback = candidate;
        bestScore = score;
      }
      if (
        !inSafeCorner &&
        playerDistance >= this.config.minimumPlayerDistance &&
        bossDistance >= this.config.minimumBossDistance
      ) {
        return candidate;
      }
    }
    return fallback;
  }

  private createBurst(
    entity: DemoAmmoBarrelEntity,
  ): DemoAmmoBarrelBulletEvent[] {
    const minimum = Math.max(1, Math.round(this.config.minimumBurstBullets));
    const maximum = Math.max(minimum, Math.round(this.config.maximumBurstBullets));
    const count = minimum + Math.floor(this.burstRandom.next() * (maximum - minimum + 1));
    const startAngle = this.burstRandom.range(0, Math.PI * 2);
    const spawnRadius = Math.max(entity.radius, this.config.bulletSpawnRadius);
    const bullets: DemoAmmoBarrelBulletEvent[] = [];
    for (let index = 0; index < count; index += 1) {
      const angle = startAngle + (index / count) * Math.PI * 2;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const origin = {
        x: entity.position.x + direction.x * spawnRadius,
        y: entity.position.y + direction.y * spawnRadius,
      };
      bullets.push({
        sourceId: entity.id,
        origin,
        target: {
          x: origin.x + direction.x * 1_000,
          y: origin.y + direction.y * 1_000,
        },
        speed: Math.max(0, this.config.bulletSpeed),
      });
    }
    return bullets;
  }

  private enterTimedState(
    entity: DemoAmmoBarrelEntity,
    state: "burst-warning" | "dud",
    durationSeconds: number,
  ): void {
    entity.state = state;
    entity.stateElapsed = 0;
    entity.stateDuration = Math.max(0.05, durationSeconds);
    entity.stateProgress = 0;
  }

  private drawSpawnInterval(): number {
    return Math.max(
      0.05,
      this.scheduleRandom.range(
        this.config.minimumSpawnIntervalSeconds,
        this.config.maximumSpawnIntervalSeconds,
      ),
    );
  }

  private getActiveCount(): number {
    return this.entities.filter((entity) => entity.active).length;
  }
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
