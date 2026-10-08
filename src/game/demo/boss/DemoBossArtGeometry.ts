import type { DemoBossWeaponArtConfig } from "./demoBossArtConfig.ts";

export interface BossArtPoint {
  x: number;
  y: number;
}

export interface DemoBossWeaponArtTransform {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  originX: number;
  originY: number;
  muzzle: BossArtPoint;
}

export type DemoBossWeaponArtKind =
  | "revolver"
  | "ak47"
  | "shotgun"
  | "rocketLauncher"
  | "summoner"
  | "laserGun"
  | "empty";

export function resolveDemoBossWeaponArtKind(
  weaponLabel: string,
): DemoBossWeaponArtKind {
  if (weaponLabel.includes("空手")) return "empty";
  if (weaponLabel.includes("激光")) return "laserGun";
  if (weaponLabel.includes("召唤")) return "summoner";
  if (weaponLabel.includes("火箭")) return "rocketLauncher";
  if (weaponLabel.includes("霰弹")) return "shotgun";
  if (weaponLabel.toUpperCase().includes("AK47")) return "ak47";
  return "revolver";
}

/** Uniformly maps the PNG's grip-to-muzzle axis onto the live Boss pose. */
export function calculateDemoBossWeaponArtTransform(
  config: Readonly<DemoBossWeaponArtConfig>,
  targetGrip: Readonly<BossArtPoint>,
  targetMuzzle: Readonly<BossArtPoint>,
): Readonly<DemoBossWeaponArtTransform> {
  const sourceDx = config.muzzle.x - config.grip.x;
  const sourceDy = config.muzzle.y - config.grip.y;
  const targetDx = targetMuzzle.x - targetGrip.x;
  const targetDy = targetMuzzle.y - targetGrip.y;
  const sourceLength = Math.max(0.0001, Math.hypot(sourceDx, sourceDy));
  const targetLength = Math.max(0.0001, Math.hypot(targetDx, targetDy));

  return Object.freeze({
    x: targetGrip.x,
    y: targetGrip.y,
    rotation:
      Math.atan2(targetDy, targetDx) - Math.atan2(sourceDy, sourceDx),
    scale: targetLength / sourceLength,
    originX: config.grip.x / config.sourceSize.width,
    originY: config.grip.y / config.sourceSize.height,
    muzzle: Object.freeze({ ...targetMuzzle }),
  });
}

export function pointAtDistance(
  origin: Readonly<BossArtPoint>,
  angle: number,
  distance: number,
): Readonly<BossArtPoint> {
  const safeAngle = Number.isFinite(angle) ? angle : Math.PI;
  const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  return Object.freeze({
    x: origin.x + Math.cos(safeAngle) * safeDistance,
    y: origin.y + Math.sin(safeAngle) * safeDistance,
  });
}
