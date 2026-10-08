export interface DemoBossArtAsset {
  key: string;
  url: string;
}

export interface DemoBossWeaponArtConfig extends DemoBossArtAsset {
  sourceSize: Readonly<{ width: number; height: number }>;
  grip: Readonly<{ x: number; y: number }>;
  muzzle: Readonly<{ x: number; y: number }>;
  targetMuzzleDistance: number;
}

const BOSS_ART_ROOT = "assets/boss";

export const DEMO_BOSS_ART_TEXTURES = Object.freeze({
  head: asset("demo-boss-head", `${BOSS_ART_ROOT}/boss-head.png`),
  revolver: asset("demo-boss-revolver", `${BOSS_ART_ROOT}/boss-revolver.png`),
  ak47: asset("demo-boss-ak47", `${BOSS_ART_ROOT}/boss-ak47.png`),
  shotgun: asset("demo-boss-shotgun", `${BOSS_ART_ROOT}/boss-shotgun.png`),
  rocketLauncher: asset(
    "demo-boss-rocket-launcher",
    `${BOSS_ART_ROOT}/boss-rocket-launcher.png`,
  ),
  laserGun: asset(
    "demo-boss-laser-gun",
    `${BOSS_ART_ROOT}/boss-laser-gun.png`,
  ),
  summonerIdle: asset(
    "demo-boss-summoner-idle",
    `${BOSS_ART_ROOT}/boss-summoner-idle.png`,
  ),
  summonerPressed: asset(
    "demo-boss-summoner-pressed",
    `${BOSS_ART_ROOT}/boss-summoner-pressed.png`,
  ),
  emptyHand: asset(
    "demo-boss-empty-hand",
    `${BOSS_ART_ROOT}/boss-empty-hand.png`,
  ),
});

export const DEMO_BOSS_ART_ASSETS: readonly DemoBossArtAsset[] = Object.freeze(
  Object.values(DEMO_BOSS_ART_TEXTURES),
);

export const DEMO_BOSS_HEAD_ART = Object.freeze({
  ...DEMO_BOSS_ART_TEXTURES.head,
  displaySize: Object.freeze({ width: 166, height: 162 }),
  // The supplied square image contains transparent space below the neck.
  // This origin keeps the visible face centered on the gameplay head anchor.
  origin: Object.freeze({ x: 0.5, y: 0.41 }),
  depth: 24,
});

export const DEMO_BOSS_EMPTY_HAND_ART = Object.freeze({
  ...DEMO_BOSS_ART_TEXTURES.emptyHand,
  // The fist occupies the central-right portion of its square transparent canvas.
  origin: Object.freeze({ x: 0.56, y: 0.5 }),
  displaySize: Object.freeze({ width: 77, height: 77 }),
});

export const DEMO_BOSS_WEAPON_ART = Object.freeze({
  revolver: weapon(
    DEMO_BOSS_ART_TEXTURES.revolver,
    1254,
    1254,
    { x: 752, y: 673 },
    { x: 116, y: 426 },
    92,
  ),
  ak47: weapon(
    DEMO_BOSS_ART_TEXTURES.ak47,
    1254,
    1254,
    { x: 889, y: 683 },
    { x: 27, y: 421 },
    92,
  ),
  shotgun: weapon(
    DEMO_BOSS_ART_TEXTURES.shotgun,
    1774,
    887,
    { x: 1054, y: 507 },
    { x: 31, y: 259 },
    92,
  ),
  rocketLauncher: weapon(
    DEMO_BOSS_ART_TEXTURES.rocketLauncher,
    1774,
    887,
    { x: 1050, y: 553 },
    { x: 39, y: 338 },
    96,
  ),
  laserGun: weapon(
    DEMO_BOSS_ART_TEXTURES.laserGun,
    1774,
    887,
    { x: 1149, y: 535 },
    { x: 57, y: 332 },
    96,
  ),
});

export const DEMO_BOSS_SUMMONER_ART = Object.freeze({
  idle: Object.freeze({
    ...DEMO_BOSS_ART_TEXTURES.summonerIdle,
    sourceSize: Object.freeze({ width: 1374, height: 1145 }),
    origin: Object.freeze({ x: 0.67, y: 0.59 }),
    displaySize: Object.freeze({ width: 150, height: 125 }),
  }),
  pressed: Object.freeze({
    ...DEMO_BOSS_ART_TEXTURES.summonerPressed,
    sourceSize: Object.freeze({ width: 1536, height: 1024 }),
    origin: Object.freeze({ x: 0.67, y: 0.58 }),
    displaySize: Object.freeze({ width: 154, height: 103 }),
  }),
});

function asset(key: string, url: string): Readonly<DemoBossArtAsset> {
  return Object.freeze({ key, url });
}

function weapon(
  art: Readonly<DemoBossArtAsset>,
  width: number,
  height: number,
  grip: Readonly<{ x: number; y: number }>,
  muzzle: Readonly<{ x: number; y: number }>,
  targetMuzzleDistance: number,
): Readonly<DemoBossWeaponArtConfig> {
  return Object.freeze({
    ...art,
    sourceSize: Object.freeze({ width, height }),
    grip: Object.freeze({ ...grip }),
    muzzle: Object.freeze({ ...muzzle }),
    targetMuzzleDistance,
  });
}
