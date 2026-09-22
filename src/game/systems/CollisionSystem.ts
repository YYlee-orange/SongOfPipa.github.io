import type { Vec2 } from "../entities/playerRig/PlayerRigModel";

export interface CircleCollider {
  center: Vec2;
  radius: number;
}

export interface SweptCircleCollision {
  time: number;
  center: Vec2;
}

export function circlesOverlap(a: CircleCollider, b: CircleCollider): boolean {
  if (
    !Number.isFinite(a.center.x) ||
    !Number.isFinite(a.center.y) ||
    !Number.isFinite(a.radius) ||
    !Number.isFinite(b.center.x) ||
    !Number.isFinite(b.center.y) ||
    !Number.isFinite(b.radius) ||
    a.radius < 0 ||
    b.radius < 0
  ) {
    return false;
  }

  const combinedRadius = a.radius + b.radius;
  const deltaX = a.center.x - b.center.x;
  const deltaY = a.center.y - b.center.y;
  return deltaX * deltaX + deltaY * deltaY <= combinedRadius * combinedRadius;
}

export function sweptCircleIntersectsCircle(
  start: Vec2,
  end: Vec2,
  movingRadius: number,
  target: CircleCollider,
): boolean {
  return sweptCircleCollision(start, end, movingRadius, target) !== null;
}

export function sweptCircleCollision(
  start: Vec2,
  end: Vec2,
  movingRadius: number,
  target: CircleCollider,
): SweptCircleCollision | null {
  if (
    !isFinitePoint(start) ||
    !isFinitePoint(end) ||
    !isFinitePoint(target.center) ||
    !Number.isFinite(movingRadius) ||
    !Number.isFinite(target.radius) ||
    movingRadius < 0 ||
    target.radius < 0
  ) {
    return null;
  }

  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  const combinedRadius = movingRadius + target.radius;
  const offsetX = start.x - target.center.x;
  const offsetY = start.y - target.center.y;
  const startDistanceSquared = offsetX * offsetX + offsetY * offsetY;

  if (startDistanceSquared <= combinedRadius * combinedRadius) {
    return { time: 0, center: { ...start } };
  }

  if (segmentLengthSquared <= 0.00000001) {
    return null;
  }

  const b = 2 * (offsetX * segmentX + offsetY * segmentY);
  const c = startDistanceSquared - combinedRadius * combinedRadius;
  const discriminant = b * b - 4 * segmentLengthSquared * c;

  if (discriminant < 0) {
    return null;
  }

  const time = (-b - Math.sqrt(discriminant)) / (2 * segmentLengthSquared);

  if (time < 0 || time > 1) {
    return null;
  }

  return {
    time,
    center: {
      x: start.x + segmentX * time,
      y: start.y + segmentY * time,
    },
  };
}

function isFinitePoint(point: Vec2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}
