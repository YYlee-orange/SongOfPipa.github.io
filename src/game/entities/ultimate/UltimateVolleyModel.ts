import { SeededRandom } from "../../systems/SeededRandom.ts";
import {
  sweptCircleCollision,
  type CircleCollider,
} from "../../systems/CollisionSystem.ts";
import type { Vec2 } from "../playerRig/PlayerRigModel";

export interface UltimateVolleyConfig {
  randomSeed: number;
  muzzleOffsetX: number;
  maximumHeightOffset: number;
  emissionIntervalSeconds: number;
  projectileSpeed: number;
  projectileRadius: number;
  maximumSpreadRadians: number;
  baseProjectileCount: number;
  maximumProjectileCount: number;
  baseDamage: number;
  maximumDamage: number;
  worldWidth: number;
  worldHeight: number;
  verticalPadding: number;
  despawnPadding: number;
  impactDurationSeconds: number;
}

export interface UltimateProjectileSnapshot {
  previousPosition: Vec2;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  emissionDelayRemaining: number;
}

export interface UltimateImpactSnapshot {
  position: Vec2;
  progress: number;
}

export interface UltimateVolleyLaunch {
  absorbedCount: number;
  projectileCount: number;
  damage: number;
}

interface UltimateProjectileState extends UltimateProjectileSnapshot {
  active: boolean;
}

interface UltimateImpactState {
  position: Vec2;
  remaining: number;
  duration: number;
}

export class UltimateVolleyModel {
  private readonly config: UltimateVolleyConfig;
  private readonly random: SeededRandom;
  private readonly projectiles: UltimateProjectileState[] = [];
  private readonly impacts: UltimateImpactState[] = [];
  private lastLaunch: UltimateVolleyLaunch = {
    absorbedCount: 0,
    projectileCount: 0,
    damage: 0,
  };

  constructor(config: UltimateVolleyConfig) {
    this.config = config;
    this.random = new SeededRandom(config.randomSeed);
  }

  launch(origin: Vec2, absorbedCount: number): Readonly<UltimateVolleyLaunch> {
    const safeAbsorbed = Number.isFinite(absorbedCount)
      ? Math.max(0, Math.floor(absorbedCount))
      : 0;
    const projectileCount = Math.min(
      this.config.maximumProjectileCount,
      this.config.baseProjectileCount + safeAbsorbed,
    );
    const damage = Math.min(
      this.config.maximumDamage,
      this.config.baseDamage + Math.floor(Math.sqrt(safeAbsorbed)),
    );

    this.projectiles.length = 0;
    this.impacts.length = 0;

    for (let index = 0; index < projectileCount; index += 1) {
      const position = {
        x: origin.x + this.config.muzzleOffsetX,
        y: clamp(
          origin.y +
            this.random.range(
              -this.config.maximumHeightOffset,
              this.config.maximumHeightOffset,
            ),
          this.config.verticalPadding,
          this.config.worldHeight - this.config.verticalPadding,
        ),
      };
      const angle = this.random.range(
        -this.config.maximumSpreadRadians,
        this.config.maximumSpreadRadians,
      );
      this.projectiles.push({
        previousPosition: { ...position },
        position,
        velocity: {
          x: Math.cos(angle) * this.config.projectileSpeed,
          y: Math.sin(angle) * this.config.projectileSpeed,
        },
        radius: Math.max(0, this.config.projectileRadius),
        emissionDelayRemaining:
          index * Math.max(0, this.config.emissionIntervalSeconds),
        active: true,
      });
    }

    this.lastLaunch = { absorbedCount: safeAbsorbed, projectileCount, damage };
    return { ...this.lastLaunch };
  }

  update(
    deltaSeconds: number,
    targets: readonly CircleCollider[] = [],
  ): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;

    for (const impact of this.impacts) {
      impact.remaining = Math.max(0, impact.remaining - safeDelta);
    }

    for (const projectile of this.projectiles) {
      if (!projectile.active) {
        continue;
      }

      projectile.previousPosition = { ...projectile.position };

      let movementDelta = safeDelta;

      if (projectile.emissionDelayRemaining > 0) {
        movementDelta = Math.max(
          0,
          safeDelta - projectile.emissionDelayRemaining,
        );
        projectile.emissionDelayRemaining = Math.max(
          0,
          projectile.emissionDelayRemaining - safeDelta,
        );
      }

      if (movementDelta === 0) {
        continue;
      }

      projectile.position = {
        x: projectile.position.x + projectile.velocity.x * movementDelta,
        y: projectile.position.y + projectile.velocity.y * movementDelta,
      };

      const collision = findEarliestCollision(
        projectile.previousPosition,
        projectile.position,
        projectile.radius,
        targets,
      );

      if (collision) {
        projectile.position = { ...collision.center };
        projectile.active = false;
        const duration = Math.max(0.0001, this.config.impactDurationSeconds);
        this.impacts.push({
          position: { ...collision.center },
          remaining: duration,
          duration,
        });
        continue;
      }

      if (projectile.position.x > this.config.worldWidth + this.config.despawnPadding) {
        projectile.active = false;
      }
    }
  }

  getSnapshots(): readonly Readonly<UltimateProjectileSnapshot>[] {
    return this.projectiles
      .filter((projectile) => projectile.active)
      .map((projectile) => ({
        previousPosition: { ...projectile.previousPosition },
        position: { ...projectile.position },
        velocity: { ...projectile.velocity },
        radius: projectile.radius,
        emissionDelayRemaining: projectile.emissionDelayRemaining,
      }));
  }

  getImpactSnapshots(): readonly Readonly<UltimateImpactSnapshot>[] {
    return this.impacts
      .filter((impact) => impact.remaining > 0)
      .map((impact) => ({
        position: { ...impact.position },
        progress: 1 - impact.remaining / impact.duration,
      }));
  }

  getLastLaunch(): Readonly<UltimateVolleyLaunch> {
    return { ...this.lastLaunch };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function findEarliestCollision(
  start: Vec2,
  end: Vec2,
  radius: number,
  targets: readonly CircleCollider[],
): ReturnType<typeof sweptCircleCollision> {
  let earliest: ReturnType<typeof sweptCircleCollision> = null;

  for (const target of targets) {
    const collision = sweptCircleCollision(start, end, radius, target);

    if (collision && (!earliest || collision.time < earliest.time)) {
      earliest = collision;
    }
  }

  return earliest;
}
