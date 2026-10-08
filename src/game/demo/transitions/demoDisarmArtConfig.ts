import type { DemoDisarmWeaponKind } from "./DemoDisarmTransitionModel.ts";

export interface DemoDisarmArtAsset {
  key: string;
  url: string;
}

export interface DemoDisarmWeaponArtConfig extends DemoDisarmArtAsset {
  displaySize: Readonly<{ width: number; height: number }>;
  origin: Readonly<{ x: number; y: number }>;
  sourceForwardAngle: number;
}

const BOSS_ART_ROOT = "assets/boss";

export const DEMO_DISARM_ART_TEXTURES = Object.freeze({
  revolver: asset("demo-transition-revolver", `${BOSS_ART_ROOT}/transition-revolver.png`),
  ak47: asset("demo-transition-ak47", `${BOSS_ART_ROOT}/transition-ak47.png`),
  shotgun: asset("demo-transition-shotgun", `${BOSS_ART_ROOT}/transition-shotgun.png`),
  rocketLauncher: asset(
    "demo-transition-rocket-launcher",
    `${BOSS_ART_ROOT}/transition-rocket-launcher.png`,
  ),
  laserGun: asset(
    "demo-transition-laser-gun",
    `${BOSS_ART_ROOT}/transition-laser-gun.png`,
  ),
  summonerIdle: asset(
    "demo-transition-summoner-idle",
    `${BOSS_ART_ROOT}/transition-summoner-idle.png`,
  ),
  summonerPressed: asset(
    "demo-transition-summoner-pressed",
    `${BOSS_ART_ROOT}/transition-summoner-pressed.png`,
  ),
});

export const DEMO_DISARM_ART_ASSETS: readonly DemoDisarmArtAsset[] = Object.freeze(
  Object.values(DEMO_DISARM_ART_TEXTURES),
);

const DEFAULT_ORIGIN = Object.freeze({ x: 0.5, y: 0.5 });
const LEFT_FACING = Math.PI;

export const DEMO_DISARM_WEAPON_ART: Readonly<
  Record<DemoDisarmWeaponKind, Readonly<DemoDisarmWeaponArtConfig>>
> = Object.freeze({
  revolver: weapon(DEMO_DISARM_ART_TEXTURES.revolver, 126, 126),
  ak47: weapon(DEMO_DISARM_ART_TEXTURES.ak47, 184, 92),
  shotgun: weapon(DEMO_DISARM_ART_TEXTURES.shotgun, 198, 66),
  "rocket-launcher": weapon(DEMO_DISARM_ART_TEXTURES.rocketLauncher, 194, 97),
  summoner: weapon(DEMO_DISARM_ART_TEXTURES.summonerIdle, 104, 78),
  "laser-gun": weapon(DEMO_DISARM_ART_TEXTURES.laserGun, 190, 107),
});

export function resolveDemoDisarmWeaponArt(
  kind: DemoDisarmWeaponKind,
  pressed: boolean,
): Readonly<DemoDisarmWeaponArtConfig> {
  if (kind !== "summoner" || !pressed) {
    return DEMO_DISARM_WEAPON_ART[kind];
  }
  return Object.freeze({
    ...DEMO_DISARM_WEAPON_ART.summoner,
    ...DEMO_DISARM_ART_TEXTURES.summonerPressed,
  });
}

/** The supplied pure-weapon images face left; align that axis to the model angle. */
export function calculateDemoDisarmWeaponArtRotation(
  weaponAngle: number,
  sourceForwardAngle = LEFT_FACING,
  mirroredHorizontally = false,
): number {
  const safeAngle = Number.isFinite(weaponAngle) ? weaponAngle : LEFT_FACING;
  return mirroredHorizontally ? safeAngle : safeAngle - sourceForwardAngle;
}

function asset(key: string, url: string): Readonly<DemoDisarmArtAsset> {
  return Object.freeze({ key, url });
}

function weapon(
  art: Readonly<DemoDisarmArtAsset>,
  width: number,
  height: number,
): Readonly<DemoDisarmWeaponArtConfig> {
  return Object.freeze({
    ...art,
    displaySize: Object.freeze({ width, height }),
    origin: DEFAULT_ORIGIN,
    sourceForwardAngle: LEFT_FACING,
  });
}
