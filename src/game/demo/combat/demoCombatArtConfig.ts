import type { Vec2 } from "../../entities/playerRig/PlayerRigModel.ts";

export interface DemoCombatArtAsset {
  key: string;
  url: string;
}

const COMBAT_ART_ROOT = "assets/combat";
const LEFT_FACING_SOURCE_ANGLE = Math.PI;

export const DEMO_COMBAT_ART_TEXTURES = Object.freeze({
  ammoBarrel: asset("demo-ammo-barrel", `${COMBAT_ART_ROOT}/ammo-barrel.png`),
  enemyRocket: asset("demo-enemy-rocket", `${COMBAT_ART_ROOT}/enemy-rocket.png`),
  enemyBullet: asset("demo-enemy-bullet", `${COMBAT_ART_ROOT}/enemy-bullet.png`),
  enemySpecialBullet: asset(
    "demo-enemy-special-bullet",
    `${COMBAT_ART_ROOT}/enemy-special-bullet.png`,
  ),
  laserBeam: asset("demo-laser-beam", `${COMBAT_ART_ROOT}/laser-beam.png`),
  enemyCreeper: asset("demo-enemy-creeper", `${COMBAT_ART_ROOT}/enemy-creeper.png`),
  playerCreeper: asset("demo-player-creeper", `${COMBAT_ART_ROOT}/player-creeper.png`),
  oldHandgun: asset("demo-old-handgun", `${COMBAT_ART_ROOT}/old-handgun.png`),
  playerRocket: asset("demo-player-rocket", `${COMBAT_ART_ROOT}/player-rocket.png`),
  playerBullet: asset("demo-player-bullet", `${COMBAT_ART_ROOT}/player-bullet.png`),
  rotatingMachineGun: asset(
    "demo-rotating-machine-gun",
    `${COMBAT_ART_ROOT}/rotating-machine-gun.png`,
  ),
});

export const DEMO_COMBAT_ART_ASSETS: readonly DemoCombatArtAsset[] = Object.freeze(
  Object.values(DEMO_COMBAT_ART_TEXTURES),
);

export const DEMO_COMBAT_ART_SIZE = Object.freeze({
  bulletLengthPerRadius: 2.7,
  bulletHeightPerRadius: 1.35,
  rocketLengthPerRadius: 4.3,
  rocketHeightPerRadius: 2.05,
  ammoBarrelDiameterPerRadius: 2.25,
  rotatingMachineGunDiameterPerRadius: 2.65,
  oldHandgunDiameterPerRadius: 2.45,
  creeperDiameterPerRadius: 2.05,
});

/** 所有弹药与枪械源图均朝左；将源图前向轴对齐实际移动或瞄准方向。 */
export function calculateLeftFacingArtRotation(direction: Readonly<Vec2>): number {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length < 0.0001) {
    return 0;
  }
  return Math.atan2(direction.y, direction.x) - LEFT_FACING_SOURCE_ANGLE;
}

export function resolveMovementDirection(
  position: Readonly<Vec2>,
  previousPosition: Readonly<Vec2>,
  fallback: Readonly<Vec2>,
): Vec2 {
  const movement = {
    x: position.x - previousPosition.x,
    y: position.y - previousPosition.y,
  };
  if (Math.hypot(movement.x, movement.y) >= 0.0001) {
    return movement;
  }
  return { x: fallback.x, y: fallback.y };
}

function asset(key: string, url: string): Readonly<DemoCombatArtAsset> {
  return Object.freeze({ key, url });
}
