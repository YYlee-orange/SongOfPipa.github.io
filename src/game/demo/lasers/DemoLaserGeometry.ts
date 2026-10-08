import type { DemoBossAttackSnapshot } from "../boss/attacks/DemoBossAttackModel.ts";
import type { DemoBossActorSnapshot } from "../boss/DemoBossActorModel.ts";
import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";
import type { CircleCollider } from "../../systems/CollisionSystem.ts";

export interface DemoLaserGeometryConfig {
  beamLength: number;
  basicBeamHeight: number;
  ultimateBeamWidth: number;
  muzzleDistance: number;
}

export interface DemoLaserBeam {
  attackId: number;
  kind: "basic" | "ultimate";
  origin: Vec2;
  end: Vec2;
  width: number;
  angle: number;
  active: boolean;
  telegraph: boolean;
}

export function createDemoLaserBeam(
  config: Readonly<DemoLaserGeometryConfig>,
  attack: Readonly<DemoBossAttackSnapshot>,
  actor: Readonly<DemoBossActorSnapshot>,
): Readonly<DemoLaserBeam> | null {
  if (attack.kind !== "phase5-laser" || !attack.laserMode) {
    return null;
  }
  const angle = Number.isFinite(attack.laserAngle) ? attack.laserAngle! : Math.PI;
  const distance = Math.max(1, config.muzzleDistance);
  const origin = {
    x: actor.weaponPosition.x + Math.cos(angle) * distance,
    y: attack.laserMode === "basic" && attack.lockedLaserY !== null
      ? attack.lockedLaserY ?? actor.weaponPosition.y
      : actor.weaponPosition.y + Math.sin(angle) * distance,
  };
  const length = Math.max(1, config.beamLength);
  return {
    attackId: attack.laserAttackId ?? 0,
    kind: attack.laserMode,
    origin,
    end: {
      x: origin.x + Math.cos(angle) * length,
      y: origin.y + Math.sin(angle) * length,
    },
    width: attack.laserMode === "basic"
      ? Math.max(1, config.basicBeamHeight)
      : Math.max(1, config.ultimateBeamWidth),
    angle,
    active: attack.laserActive === true,
    telegraph:
      attack.laserState === "basic-charge" ||
      attack.laserState === "ultimate-charge",
  };
}

export function laserIntersectsCircle(
  beam: Readonly<DemoLaserBeam>,
  collider: Readonly<CircleCollider>,
): boolean {
  if (
    !isFinitePoint(beam.origin) ||
    !isFinitePoint(beam.end) ||
    !isFinitePoint(collider.center) ||
    !Number.isFinite(beam.width) ||
    !Number.isFinite(collider.radius) ||
    beam.width < 0 ||
    collider.radius < 0
  ) {
    return false;
  }
  const segmentX = beam.end.x - beam.origin.x;
  const segmentY = beam.end.y - beam.origin.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= 0.000001) {
    return false;
  }
  const relativeX = collider.center.x - beam.origin.x;
  const relativeY = collider.center.y - beam.origin.y;
  const projection = Math.max(
    0,
    Math.min(1, (relativeX * segmentX + relativeY * segmentY) / lengthSquared),
  );
  const nearestX = beam.origin.x + segmentX * projection;
  const nearestY = beam.origin.y + segmentY * projection;
  const dx = collider.center.x - nearestX;
  const dy = collider.center.y - nearestY;
  const combinedRadius = beam.width / 2 + collider.radius;
  return dx * dx + dy * dy <= combinedRadius * combinedRadius;
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
