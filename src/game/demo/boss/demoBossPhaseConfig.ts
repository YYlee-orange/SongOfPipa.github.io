import type { DemoBossPhaseConfig } from "./DemoBossPhaseController";
import type { DemoBossActorConfig } from "./DemoBossActorModel";
import type { DemoBossPhase1AttackConfig } from "./attacks/DemoBossPhase1AttackModel";
import type { DemoBossPhase2AttackConfig } from "./attacks/DemoBossPhase2AttackModel";
import type { DemoBossPhase3AttackConfig } from "./attacks/DemoBossPhase3AttackModel";
import type { DemoBossPhase4AttackConfig } from "./attacks/DemoBossPhase4AttackModel";
import type { DemoBossPhase5AttackConfig } from "./attacks/DemoBossPhase5AttackModel";
import type { DemoRocketConfig } from "../projectiles/DemoRocketModel";
import type { DemoSummonConfig } from "../summons/DemoSummonModel";
import type { DemoLaserGeometryConfig } from "../lasers/DemoLaserGeometry";
import type { DemoAmmoBarrelConfig } from "../barrels/DemoAmmoBarrelModel";

const PLACEHOLDER_MAXIMUM_HEALTH = 12;
const SHARED_PARAMETER_SOURCE = "D3.0-shared-actor-defaults";
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export const DEMO_BOSS_ACTOR_CONFIG: Readonly<DemoBossActorConfig> =
  Object.freeze({
    initialPosition: Object.freeze({ x: 1080, y: 360 }),
    movementBounds: Object.freeze({
      minX: DESIGN_WIDTH * 0.72 + 54,
      maxX: DESIGN_WIDTH * 0.92 - 54,
      minY: DESIGN_HEIGHT * 0.12 + 58,
      maxY: DESIGN_HEIGHT * 0.88 - 58,
    }),
    targetPauseSeconds: 0.25,
    targetArrivalDistance: 4,
    headOffset: Object.freeze({ x: 8, y: -34 }),
    headVisibleRadius: 58,
    headHitRadius: 46,
    headWander: Object.freeze({
      radius: Object.freeze({ x: 12, y: 9 }),
      frequency: Object.freeze({ x: 0.24, y: 0.31 }),
    }),
    weaponOffset: Object.freeze({ x: -8, y: 68 }),
    minimumHeadWeaponVerticalSeparation: 88,
    weaponMuzzleOffset: Object.freeze({ x: -92, y: 0 }),
    weaponWander: Object.freeze({
      radius: Object.freeze({ x: 9, y: 7 }),
      frequency: Object.freeze({ x: 0.33, y: 0.27 }),
    }),
    weaponRecoil: Object.freeze({
      impulse: 156,
      maximumVelocity: 370,
      maximumOffset: 36,
      spring: 78,
      damping: 13,
    }),
    hitFlashSeconds: 0.12,
  });

export const DEMO_BOSS_PHASE1_ATTACK_CONFIG: Readonly<DemoBossPhase1AttackConfig> =
  Object.freeze({
    initialFireDelaySeconds: 0.8,
    fireIntervalSeconds: 1.2,
    bulletSpeed: 170,
    specialBulletChance: 0.2,
    randomSeed: 2026093101,
    tutorialHints: Object.freeze([
      Object.freeze({
        startSeconds: 0,
        endSeconds: 3.5,
        message: "移动屁股，避开迎面而来的普通弹",
      }),
      Object.freeze({
        startSeconds: 3.5,
        endSeconds: 7,
        message: "粉红色菱形是特殊弹，可主动反弹",
      }),
      Object.freeze({
        startSeconds: 7,
        endSeconds: 11.5,
        message: "特殊弹接近时按 Z／J，成功反弹可获得能量",
      }),
    ]),
  });

export const DEMO_BOSS_PHASE2_ATTACK_CONFIG: Readonly<DemoBossPhase2AttackConfig> =
  Object.freeze({
    initialFireDelaySeconds: 0.8,
    burstShotIntervalSeconds: 0.25,
    burstPauseSeconds: 1.6,
    minimumBurstShots: 5,
    maximumBurstShots: 10,
    bulletSpeed: 240,
    specialBulletChance: 0.2,
    randomSeed: 2026093202,
  });

export const DEMO_BOSS_PHASE3_ATTACK_CONFIG: Readonly<DemoBossPhase3AttackConfig> =
  Object.freeze({
    initialFireDelaySeconds: 0.8,
    shotgunIntervalSeconds: 2.6,
    shotgunMinimumPellets: 6,
    shotgunMaximumPellets: 9,
    shotgunSpreadRadians: 0.64,
    shotgunBulletSpeed: 165,
    rocketModeDelaySeconds: 2.4,
    rocketChargeSeconds: 0.5,
    specialBulletChance: 0.2,
    switchChance: 0.5,
    randomSeed: 2026093303,
  });

export const DEMO_ROCKET_CONFIG: Readonly<DemoRocketConfig> = Object.freeze({
  maximumActive: 6,
  radius: 38,
  acceleration: 260,
  maximumSpeed: 420,
  homingTurnRateRadiansPerSecond: 0.75,
  playerDamage: 2,
  bossDamage: 1,
  worldWidth: DESIGN_WIDTH,
  worldHeight: DESIGN_HEIGHT,
  explosionSeconds: 0.3,
});

export const DEMO_BOSS_PHASE4_ATTACK_CONFIG: Readonly<DemoBossPhase4AttackConfig> =
  Object.freeze({
    initialSummonDelaySeconds: 1,
    summonIntervalSeconds: 4.2,
    maximumOldHandguns: 15,
    randomSeed: 2026093404,
  });

export const DEMO_SUMMON_CONFIG: Readonly<DemoSummonConfig> = Object.freeze({
  randomSeed: 2026093414,
  maximumOldHandguns: 15,
  deploymentBounds: Object.freeze({
    minX: 260,
    maxX: 860,
    minY: 100,
    maxY: 620,
  }),
  deploymentMinimumDistance: 220,
  deploymentMaximumDistance: 520,
  deploymentVerticalRange: 250,
  throwDurationSeconds: 0.65,
  throwArcHeight: 72,
  rotatingMachineGun: Object.freeze({
    radius: 30,
    lifetimeSeconds: 6,
    rotationRadiansPerSecond: 2.2,
    fireIntervalSeconds: 0.22,
    initialFireDelaySeconds: 0.3,
    bulletSpeed: 190,
    specialBulletChance: 0.2,
  }),
  oldHandgun: Object.freeze({
    radius: 24,
    fireIntervalSeconds: 1.2,
    initialFireDelaySeconds: 0.5,
    bulletSpeed: 170,
    specialBulletChance: 0.2,
  }),
  creeper: Object.freeze({
    radius: 32,
    throwDistance: 230,
    trackingSpeed: 230,
    triggerDistance: 100,
    castSeconds: 0.9,
    explosionRadius: 120,
    explosionVisualSeconds: 0.35,
    playerDamage: 2,
  }),
});

export const DEMO_BOSS_PHASE5_ATTACK_CONFIG: Readonly<DemoBossPhase5AttackConfig> =
  Object.freeze({
    ultimateChance: 0.2,
    guaranteedUltimateAfterBasics: 3,
    trackingMaximumSeconds: 2.4,
    verticalLockTolerance: 18,
    centerY: DESIGN_HEIGHT / 2,
    basicChargeSeconds: 0.9,
    basicActiveSeconds: 1.15,
    ultimatePositioningMaximumSeconds: 1.8,
    ultimateChargeSeconds: 1.6,
    ultimateActiveSeconds: 2.8,
    basicRecoverySeconds: 0.55,
    ultimateRecoverySeconds: 0.85,
    basicMinimumY: DESIGN_HEIGHT / 8,
    basicMaximumY: DESIGN_HEIGHT * 7 / 8,
    upperSweepStartAngle: -2.45,
    upperSweepEndAngle: -3.83,
    lowerSweepStartAngle: 2.45,
    lowerSweepEndAngle: 3.83,
    randomSeed: 2026093505,
  });

export const DEMO_LASER_GEOMETRY_CONFIG: Readonly<DemoLaserGeometryConfig> =
  Object.freeze({
    beamLength: 1_520,
    basicBeamHeight: DESIGN_HEIGHT / 4,
    ultimateBeamWidth: DESIGN_HEIGHT / 4,
    muzzleDistance: 96,
  });

export const DEMO_AMMO_BARREL_CONFIG: Readonly<DemoAmmoBarrelConfig> =
  Object.freeze({
    randomSeed: 2026093515,
    maximumActive: 3,
    initialSpawnDelaySeconds: 1.5,
    minimumSpawnIntervalSeconds: 3,
    maximumSpawnIntervalSeconds: 5,
    lifetimeSeconds: 20,
    laserExposureSeconds: 0.6,
    burstWarningSeconds: 0.32,
    dudVisualSeconds: 0.55,
    radius: 32,
    spawnBounds: Object.freeze({
      minX: 250,
      maxX: 830,
      minY: 105,
      maxY: 615,
    }),
    minimumPlayerDistance: 140,
    minimumBossDistance: 210,
    safeCornerExclusionX: 760,
    safeCornerExclusionHeight: 165,
    worldHeight: DESIGN_HEIGHT,
    minimumBurstBullets: 13,
    maximumBurstBullets: 17,
    bulletSpawnRadius: 54,
    bulletSpeed: 185,
  });

export const DEMO_BOSS_PHASE_CONFIGS: readonly DemoBossPhaseConfig[] =
  Object.freeze([
    createPhaseConfig(
      1,
      "左轮教程",
      "初始教程",
      "左轮手枪",
      45,
      "D3.1-phase1-revolver",
      "phase1-attack",
    ),
    createPhaseConfig(
      2,
      "AK47 进阶",
      "技巧进阶",
      "AK47 突击步枪",
      45,
      "D3.2-phase2-ak47",
      "phase2-attack",
    ),
    createPhaseConfig(
      3,
      "重火力",
      "双武器重火力",
      "霰弹枪／火箭发射器",
      90,
      "D3.3-phase3-heavy-weapons",
      "phase3-attack",
    ),
    createPhaseConfig(
      4,
      "召唤",
      "场上召唤物",
      "召唤器",
      65,
      "D3.4-phase4-summons",
      "phase4-attack",
    ),
    createPhaseConfig(
      5,
      "激光终局",
      "激光终局",
      "激光枪",
      90,
      "D3.5-phase5-laser-barrels",
      "phase5-attack",
    ),
  ]);

function createPhaseConfig(
  id: DemoBossPhaseConfig["id"],
  label: string,
  role: string,
  weapon: string,
  movementSpeed: number,
  parameterSource = SHARED_PARAMETER_SOURCE,
  implementationStatus: DemoBossPhaseConfig["implementationStatus"] = "shared-actor",
): DemoBossPhaseConfig {
  return Object.freeze({
    id,
    label,
    role,
    weapon,
    maximumHealth: PLACEHOLDER_MAXIMUM_HEALTH,
    movementSpeed,
    randomSeed: 2026092800 + id,
    parameterSource,
    implementationStatus,
  });
}
