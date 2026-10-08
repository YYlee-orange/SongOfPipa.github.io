import type { PrototypeBulletType } from "../../entities/bullet/PrototypeBulletModel.ts";
import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";
import type { CircleCollider } from "../../systems/CollisionSystem.ts";
import { SeededRandom } from "../../systems/SeededRandom.ts";

export const DEMO_SUMMON_KINDS = [
  "rotating-machine-gun",
  "old-handgun",
  "creeper",
] as const;

export type DemoSummonKind = (typeof DEMO_SUMMON_KINDS)[number];
export type DemoSummonLifecycle =
  | "thrown"
  | "deployed"
  | "tracking"
  | "casting";

export interface DemoSummonConfig {
  randomSeed: number;
  maximumOldHandguns: number;
  deploymentBounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  deploymentMinimumDistance: number;
  deploymentMaximumDistance: number;
  deploymentVerticalRange: number;
  throwDurationSeconds: number;
  throwArcHeight: number;
  rotatingMachineGun: Readonly<{
    radius: number;
    lifetimeSeconds: number;
    rotationRadiansPerSecond: number;
    fireIntervalSeconds: number;
    initialFireDelaySeconds: number;
    bulletSpeed: number;
    specialBulletChance: number;
  }>;
  oldHandgun: Readonly<{
    radius: number;
    fireIntervalSeconds: number;
    initialFireDelaySeconds: number;
    bulletSpeed: number;
    specialBulletChance: number;
  }>;
  creeper: Readonly<{
    radius: number;
    throwDistance: number;
    trackingSpeed: number;
    triggerDistance: number;
    castSeconds: number;
    explosionRadius: number;
    explosionVisualSeconds: number;
    playerDamage: number;
  }>;
}

export interface DemoSummonBulletEvent {
  sourceId: number;
  sourceKind: "rotating-machine-gun" | "old-handgun";
  type: PrototypeBulletType;
  origin: Vec2;
  target: Vec2;
  speed: number;
}

export interface DemoSummonExplosionEvent {
  sourceId: number;
  position: Vec2;
  radius: number;
  damage: number;
}

export interface DemoSummonUpdateEvents {
  bullets: readonly Readonly<DemoSummonBulletEvent>[];
  explosions: readonly Readonly<DemoSummonExplosionEvent>[];
}

export interface DemoSummonSnapshot {
  id: number;
  kind: DemoSummonKind;
  lifecycle: DemoSummonLifecycle;
  previousPosition: Vec2;
  position: Vec2;
  deploymentTarget: Vec2;
  angle: number;
  radius: number;
  remainingSeconds: number | null;
  castProgress: number;
  explosionRadius: number;
}

export interface DemoSummonExplosionSnapshot {
  position: Vec2;
  radius: number;
  progress: number;
}

export interface DemoHandgunCollider extends CircleCollider {
  entityId: number;
}

export interface DemoSummonStats {
  active: number;
  thrown: number;
  rotatingMachineGuns: number;
  oldHandguns: number;
  creepers: number;
  spawnedTotal: number;
  machineGunBullets: number;
  handgunBullets: number;
  destroyedHandguns: number;
  destroyedMachineGuns: number;
  creeperExplosions: number;
}

interface DemoSummonState extends DemoSummonSnapshot {
  active: boolean;
  throwStart: Vec2;
  elapsed: number;
  fireRemaining: number;
  remainingSeconds: number | null;
}

interface DemoSummonExplosionState {
  position: Vec2;
  radius: number;
  elapsed: number;
  duration: number;
}

/** 第四阶段三类特殊实体的独立生命周期与攻击输出。 */
export class DemoSummonModel {
  private readonly config: DemoSummonConfig;
  private readonly placementRandom: SeededRandom;
  private readonly bulletRandom: SeededRandom;
  private readonly entities: DemoSummonState[] = [];
  private readonly explosionVisuals: DemoSummonExplosionState[] = [];
  private nextId = 1;
  private spawnedTotal = 0;
  private machineGunBullets = 0;
  private handgunBullets = 0;
  private destroyedHandguns = 0;
  private destroyedMachineGuns = 0;
  private creeperExplosions = 0;

  constructor(config: DemoSummonConfig) {
    this.config = config;
    this.placementRandom = new SeededRandom(config.randomSeed);
    this.bulletRandom = new SeededRandom(config.randomSeed ^ 0x9e3779b9);
  }

  spawn(kind: DemoSummonKind, origin: Vec2, playerPosition: Vec2): number | null {
    if (!isFinitePoint(origin) || !isFinitePoint(playerPosition)) {
      return null;
    }
    if (
      kind === "old-handgun" &&
      this.getStats().oldHandguns >= this.config.maximumOldHandguns
    ) {
      return null;
    }

    const deploymentTarget = kind === "creeper"
      ? pointToward(
          origin,
          playerPosition,
          Math.max(0, this.config.creeper.throwDistance),
        )
      : this.drawDeploymentTarget(origin);
    const reusable = this.entities.find((entity) => !entity.active);
    const radius = this.getRadius(kind);
    const entity: DemoSummonState = reusable ?? {
      id: 0,
      kind,
      lifecycle: "thrown",
      previousPosition: { ...origin },
      position: { ...origin },
      deploymentTarget,
      angle: Math.PI,
      radius,
      remainingSeconds: null,
      castProgress: 0,
      explosionRadius: 0,
      active: true,
      throwStart: { ...origin },
      elapsed: 0,
      fireRemaining: 0,
    };

    entity.id = this.nextId;
    entity.kind = kind;
    entity.lifecycle = "thrown";
    entity.previousPosition = { ...origin };
    entity.position = { ...origin };
    entity.deploymentTarget = deploymentTarget;
    entity.angle = Math.PI;
    entity.radius = radius;
    entity.remainingSeconds = null;
    entity.castProgress = 0;
    entity.explosionRadius = kind === "creeper"
      ? Math.max(0, this.config.creeper.explosionRadius)
      : 0;
    entity.active = true;
    entity.throwStart = { ...origin };
    entity.elapsed = 0;
    entity.fireRemaining = 0;

    if (!reusable) {
      this.entities.push(entity);
    }
    const id = this.nextId;
    this.nextId += 1;
    this.spawnedTotal += 1;
    return id;
  }

  update(
    deltaSeconds: number,
    playerPosition: Vec2,
    allowActions: boolean,
  ): Readonly<DemoSummonUpdateEvents> {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    const bullets: DemoSummonBulletEvent[] = [];
    const explosions: DemoSummonExplosionEvent[] = [];

    this.updateExplosionVisuals(safeDelta);
    for (const entity of this.entities) {
      if (!entity.active) {
        continue;
      }
      entity.previousPosition = { ...entity.position };

      if (entity.lifecycle === "thrown") {
        this.advanceThrow(entity, safeDelta);
        continue;
      }
      if (!allowActions) {
        continue;
      }
      if (entity.kind === "rotating-machine-gun") {
        this.advanceMachineGun(entity, safeDelta, bullets);
      } else if (entity.kind === "old-handgun") {
        this.advanceOldHandgun(entity, safeDelta, playerPosition, bullets);
      } else {
        const explosion = this.advanceCreeper(entity, safeDelta, playerPosition);
        if (explosion) {
          explosions.push(explosion);
        }
      }
    }

    return { bullets, explosions };
  }

  getHandgunColliders(): readonly Readonly<DemoHandgunCollider>[] {
    return this.entities
      .filter(
        (entity) =>
          entity.active &&
          entity.kind === "old-handgun" &&
          entity.lifecycle === "deployed",
      )
      .map((entity) => ({
        entityId: entity.id,
        center: { ...entity.position },
        radius: entity.radius,
      }));
  }

  findPlayerOutlineHandgunCollision(
    center: Vec2,
    halfWidth: number,
    halfHeight: number,
  ): number | null {
    for (const collider of this.getHandgunColliders()) {
      const radiusX = Math.max(0.0001, halfWidth + collider.radius);
      const radiusY = Math.max(0.0001, halfHeight + collider.radius);
      const dx = (collider.center.x - center.x) / radiusX;
      const dy = (collider.center.y - center.y) / radiusY;
      if (dx * dx + dy * dy <= 1) {
        return collider.entityId;
      }
    }
    return null;
  }

  destroyHandgun(id: number): boolean {
    const entity = this.entities.find(
      (candidate) =>
        candidate.active &&
        candidate.id === id &&
        candidate.kind === "old-handgun" &&
        candidate.lifecycle === "deployed",
    );
    if (!entity) {
      return false;
    }
    entity.active = false;
    this.destroyedHandguns += 1;
    return true;
  }

  /** 苦力怕爆炸会摧毁范围内的两类召唤枪械。 */
  destroyWeaponsInExplosion(center: Vec2, radius: number): number {
    if (!isFinitePoint(center) || !Number.isFinite(radius)) {
      return 0;
    }
    const safeRadius = Math.max(0, radius);
    let destroyed = 0;
    for (const entity of this.entities) {
      if (
        !entity.active ||
        (entity.kind !== "old-handgun" &&
          entity.kind !== "rotating-machine-gun")
      ) {
        continue;
      }
      const distance = Math.hypot(
        entity.position.x - center.x,
        entity.position.y - center.y,
      );
      if (distance > safeRadius + entity.radius) {
        continue;
      }
      entity.active = false;
      if (entity.kind === "old-handgun") {
        this.destroyedHandguns += 1;
      } else {
        this.destroyedMachineGuns += 1;
      }
      destroyed += 1;
    }
    return destroyed;
  }

  clearAll(): void {
    for (const entity of this.entities) {
      entity.active = false;
    }
    this.explosionVisuals.length = 0;
  }

  getSnapshots(): readonly Readonly<DemoSummonSnapshot>[] {
    return this.entities
      .filter((entity) => entity.active)
      .map((entity) => ({
        id: entity.id,
        kind: entity.kind,
        lifecycle: entity.lifecycle,
        previousPosition: { ...entity.previousPosition },
        position: { ...entity.position },
        deploymentTarget: { ...entity.deploymentTarget },
        angle: entity.angle,
        radius: entity.radius,
        remainingSeconds: entity.remainingSeconds,
        castProgress: entity.castProgress,
        explosionRadius: entity.explosionRadius,
      }));
  }

  getExplosionSnapshots(): readonly Readonly<DemoSummonExplosionSnapshot>[] {
    return this.explosionVisuals.map((explosion) => ({
      position: { ...explosion.position },
      radius: explosion.radius,
      progress: Math.min(1, explosion.elapsed / explosion.duration),
    }));
  }

  getStats(): Readonly<DemoSummonStats> {
    const active = this.entities.filter((entity) => entity.active);
    return {
      active: active.length,
      thrown: active.filter((entity) => entity.lifecycle === "thrown").length,
      rotatingMachineGuns: active.filter(
        (entity) => entity.kind === "rotating-machine-gun",
      ).length,
      oldHandguns: active.filter((entity) => entity.kind === "old-handgun").length,
      creepers: active.filter((entity) => entity.kind === "creeper").length,
      spawnedTotal: this.spawnedTotal,
      machineGunBullets: this.machineGunBullets,
      handgunBullets: this.handgunBullets,
      destroyedHandguns: this.destroyedHandguns,
      destroyedMachineGuns: this.destroyedMachineGuns,
      creeperExplosions: this.creeperExplosions,
    };
  }

  private advanceThrow(entity: DemoSummonState, deltaSeconds: number): void {
    const duration = Math.max(0.05, this.config.throwDurationSeconds);
    entity.elapsed = Math.min(duration, entity.elapsed + deltaSeconds);
    const progress = entity.elapsed / duration;
    const arc = -Math.sin(progress * Math.PI) * this.config.throwArcHeight;
    entity.position = {
      x: lerp(entity.throwStart.x, entity.deploymentTarget.x, progress),
      y: lerp(entity.throwStart.y, entity.deploymentTarget.y, progress) + arc,
    };
    entity.angle += deltaSeconds * 7;
    if (progress < 1) {
      return;
    }

    entity.position = { ...entity.deploymentTarget };
    entity.elapsed = 0;
    if (entity.kind === "creeper") {
      entity.lifecycle = "tracking";
      entity.remainingSeconds = null;
      return;
    }
    entity.lifecycle = "deployed";
    if (entity.kind === "rotating-machine-gun") {
      entity.remainingSeconds = Math.max(
        0,
        this.config.rotatingMachineGun.lifetimeSeconds,
      );
      entity.fireRemaining = Math.max(
        0,
        this.config.rotatingMachineGun.initialFireDelaySeconds,
      );
    } else {
      entity.remainingSeconds = null;
      entity.fireRemaining = Math.max(
        0,
        this.config.oldHandgun.initialFireDelaySeconds,
      );
    }
  }

  private advanceMachineGun(
    entity: DemoSummonState,
    deltaSeconds: number,
    bullets: DemoSummonBulletEvent[],
  ): void {
    entity.angle += this.config.rotatingMachineGun.rotationRadiansPerSecond * deltaSeconds;
    entity.remainingSeconds = Math.max(
      0,
      (entity.remainingSeconds ?? 0) - deltaSeconds,
    );
    if (entity.remainingSeconds <= 0) {
      entity.active = false;
      return;
    }

    entity.fireRemaining -= deltaSeconds;
    const interval = Math.max(0.05, this.config.rotatingMachineGun.fireIntervalSeconds);
    while (entity.fireRemaining <= 0.0000001) {
      const direction = { x: Math.cos(entity.angle), y: Math.sin(entity.angle) };
      const origin = {
        x: entity.position.x + direction.x * (entity.radius + 12),
        y: entity.position.y + direction.y * (entity.radius + 12),
      };
      bullets.push({
        sourceId: entity.id,
        sourceKind: "rotating-machine-gun",
        type: this.drawBulletType(this.config.rotatingMachineGun.specialBulletChance),
        origin,
        target: {
          x: origin.x + direction.x * 1_000,
          y: origin.y + direction.y * 1_000,
        },
        speed: Math.max(0, this.config.rotatingMachineGun.bulletSpeed),
      });
      this.machineGunBullets += 1;
      entity.fireRemaining += interval;
    }
  }

  private advanceOldHandgun(
    entity: DemoSummonState,
    deltaSeconds: number,
    playerPosition: Vec2,
    bullets: DemoSummonBulletEvent[],
  ): void {
    entity.angle = Math.atan2(
      playerPosition.y - entity.position.y,
      playerPosition.x - entity.position.x,
    );
    entity.fireRemaining -= deltaSeconds;
    const interval = Math.max(0.05, this.config.oldHandgun.fireIntervalSeconds);
    while (entity.fireRemaining <= 0.0000001) {
      bullets.push({
        sourceId: entity.id,
        sourceKind: "old-handgun",
        type: this.drawBulletType(this.config.oldHandgun.specialBulletChance),
        origin: { ...entity.position },
        target: { ...playerPosition },
        speed: Math.max(0, this.config.oldHandgun.bulletSpeed),
      });
      this.handgunBullets += 1;
      entity.fireRemaining += interval;
    }
  }

  private advanceCreeper(
    entity: DemoSummonState,
    deltaSeconds: number,
    playerPosition: Vec2,
  ): DemoSummonExplosionEvent | null {
    if (entity.lifecycle === "tracking") {
      const distance = Math.hypot(
        playerPosition.x - entity.position.x,
        playerPosition.y - entity.position.y,
      );
      if (distance <= this.config.creeper.triggerDistance) {
        this.beginCreeperCast(entity);
        return null;
      }
      entity.position = moveToward(
        entity.position,
        playerPosition,
        Math.max(0, this.config.creeper.trackingSpeed) * deltaSeconds,
      );
      entity.angle = Math.atan2(
        playerPosition.y - entity.position.y,
        playerPosition.x - entity.position.x,
      );
      const remainingDistance = Math.hypot(
        playerPosition.x - entity.position.x,
        playerPosition.y - entity.position.y,
      );
      if (remainingDistance <= this.config.creeper.triggerDistance) {
        this.beginCreeperCast(entity);
      }
      return null;
    }

    const duration = Math.max(0.05, this.config.creeper.castSeconds);
    entity.elapsed = Math.min(duration, entity.elapsed + deltaSeconds);
    entity.castProgress = entity.elapsed / duration;
    entity.remainingSeconds = Math.max(0, duration - entity.elapsed);
    if (entity.elapsed < duration) {
      return null;
    }

    entity.active = false;
    this.creeperExplosions += 1;
    const event: DemoSummonExplosionEvent = {
      sourceId: entity.id,
      position: { ...entity.position },
      radius: Math.max(0, this.config.creeper.explosionRadius),
      damage: Math.max(1, Math.round(this.config.creeper.playerDamage)),
    };
    this.explosionVisuals.push({
      position: { ...event.position },
      radius: event.radius,
      elapsed: 0,
      duration: Math.max(0.05, this.config.creeper.explosionVisualSeconds),
    });
    return event;
  }

  private beginCreeperCast(entity: DemoSummonState): void {
    entity.lifecycle = "casting";
    entity.elapsed = 0;
    entity.castProgress = 0;
    entity.remainingSeconds = Math.max(0.05, this.config.creeper.castSeconds);
  }

  private updateExplosionVisuals(deltaSeconds: number): void {
    for (const explosion of this.explosionVisuals) {
      explosion.elapsed += deltaSeconds;
    }
    for (let index = this.explosionVisuals.length - 1; index >= 0; index -= 1) {
      if (this.explosionVisuals[index].elapsed >= this.explosionVisuals[index].duration) {
        this.explosionVisuals.splice(index, 1);
      }
    }
  }

  private drawDeploymentTarget(origin: Vec2): Vec2 {
    return {
      x: clamp(
        origin.x - this.placementRandom.range(
          this.config.deploymentMinimumDistance,
          this.config.deploymentMaximumDistance,
        ),
        this.config.deploymentBounds.minX,
        this.config.deploymentBounds.maxX,
      ),
      y: clamp(
        origin.y + this.placementRandom.range(
          -this.config.deploymentVerticalRange,
          this.config.deploymentVerticalRange,
        ),
        this.config.deploymentBounds.minY,
        this.config.deploymentBounds.maxY,
      ),
    };
  }

  private drawBulletType(chance: number): PrototypeBulletType {
    return this.bulletRandom.next() < clamp01(chance) ? "special" : "normal";
  }

  private getRadius(kind: DemoSummonKind): number {
    if (kind === "rotating-machine-gun") {
      return Math.max(0, this.config.rotatingMachineGun.radius);
    }
    if (kind === "old-handgun") {
      return Math.max(0, this.config.oldHandgun.radius);
    }
    return Math.max(0, this.config.creeper.radius);
  }
}

function pointToward(origin: Vec2, target: Vec2, distance: number): Vec2 {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    return { ...origin };
  }
  const scale = Math.min(distance, length) / length;
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function moveToward(origin: Vec2, target: Vec2, distance: number): Vec2 {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length <= distance || length < 0.0001) {
    return { ...target };
  }
  return {
    x: origin.x + (dx / length) * distance,
    y: origin.y + (dy / length) * distance,
  };
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
