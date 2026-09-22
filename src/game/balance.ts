import type { PrototypeBulletConfig } from "./entities/bullet/PrototypeBulletModel";
import type { PlayerDamageConfig } from "./entities/player/PlayerDamageModel";
import type { PlayerParryConfig } from "./entities/player/PlayerParryModel";
import type { PlayerAbilityConfig } from "./entities/player/PlayerAbilityModel";
import type { PrototypeBossConfig } from "./entities/boss/PrototypeBossModel";
import type { UltimateVolleyConfig } from "./entities/ultimate/UltimateVolleyModel";
import { DESIGN } from "./config";

export const PLAYER_DAMAGE: PlayerDamageConfig = Object.freeze({
  maximumHealth: 3,
  hitRadius: 12,
  invulnerabilitySeconds: 1,
});

export const PLAYER_PARRY: PlayerParryConfig = Object.freeze({
  radius: 70,
  activeSeconds: 0.14,
  failureRecoverySeconds: 0.18,
  feedbackSeconds: 0.6,
});

export const PLAYER_ABILITY: PlayerAbilityConfig = Object.freeze({
  maximumEnergy: 10,
  boostCost: 2,
  boostDurationSeconds: 3.5,
  feedbackSeconds: 0.6,
  ultimateChargeSeconds: 2,
  ultimateAbsorbSeconds: 0.85,
  ultimateFiringSeconds: 2.9,
  ultimateRecoverySeconds: 0.75,
});

export const PROTOTYPE_BULLETS: PrototypeBulletConfig = Object.freeze({
  maximumActive: 64,
  initialDelaySeconds: 0.6,
  spawnIntervalSeconds: 1.1,
  emitterPosition: Object.freeze({ x: 1130, y: 560 }),
  targetPosition: Object.freeze({ x: 1130, y: 560 }),
  targetRadius: 32,
  normalRadius: 14,
  specialRadius: 13,
  normalSpeed: 230,
  specialSpeed: 190,
  reflectedSpeed: 620,
  maximumReflectedBounces: 3,
  worldWidth: DESIGN.width,
  worldHeight: DESIGN.height,
  despawnPadding: 80,
  sequence: Object.freeze([] as const),
});

export const PROTOTYPE_BOSS: PrototypeBossConfig = Object.freeze({
  maximumHealth: 12,
  initialPosition: Object.freeze({ x: 1080, y: 360 }),
  movementBounds: Object.freeze({
    minX: DESIGN.width * 0.72 + 54,
    maxX: DESIGN.width * 0.92 - 54,
    minY: DESIGN.height * 0.12 + 58,
    maxY: DESIGN.height * 0.88 - 58,
  }),
  targetPauseSeconds: 0.25,
  targetArrivalDistance: 4,
  initialFireDelaySeconds: 0.8,
  specialBulletChance: 0.2,
  randomSeed: 20260922,
  muzzleOffset: Object.freeze({ x: -54, y: 0 }),
  hitFlashSeconds: 0.12,
  hitZones: Object.freeze([
    Object.freeze({ offset: Object.freeze({ x: 6, y: -38 }), radius: 22 }),
    Object.freeze({ offset: Object.freeze({ x: -3, y: 4 }), radius: 28 }),
    Object.freeze({ offset: Object.freeze({ x: -5, y: 42 }), radius: 18 }),
  ]),
  phases: Object.freeze({
    1: Object.freeze({
      movementSpeed: 45,
      fireIntervalSeconds: 1.2,
      bulletSpeed: 170,
    }),
    2: Object.freeze({
      movementSpeed: 65,
      fireIntervalSeconds: 0.7,
      bulletSpeed: 200,
    }),
    3: Object.freeze({
      movementSpeed: 120,
      fireIntervalSeconds: 0.7,
      bulletSpeed: 320,
    }),
  }),
});

export const PROTOTYPE_ULTIMATE: UltimateVolleyConfig = Object.freeze({
  randomSeed: 20260923,
  muzzleOffsetX: 48,
  maximumHeightOffset: 28,
  emissionIntervalSeconds: 0.1,
  projectileSpeed: 800,
  projectileRadius: 13,
  maximumSpreadRadians: 0.06,
  baseProjectileCount: 8,
  maximumProjectileCount: 18,
  baseDamage: 4,
  maximumDamage: 8,
  worldWidth: DESIGN.width,
  worldHeight: DESIGN.height,
  verticalPadding: 24,
  despawnPadding: 100,
  impactDurationSeconds: 0.28,
});
