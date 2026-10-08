import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoLaserBeam,
  laserIntersectsCircle,
} from "../src/game/demo/lasers/DemoLaserGeometry.ts";
import { DEMO_LASER_GEOMETRY_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const actor = {
  position: { x: 1080, y: 360 },
  targetPosition: { x: 1080, y: 360 },
  headPosition: { x: 1088, y: 326 },
  weaponPosition: { x: 1072, y: 428 },
  muzzlePosition: { x: 980, y: 428 },
  headWanderOffset: { x: 0, y: 0 },
  weaponWanderOffset: { x: 0, y: 0 },
  weaponRecoilOffset: 0,
  weaponRecoilMaximumOffset: 36,
  headVisibleRadius: 58,
  headHitRadius: 46,
  hitFlashRemaining: 0,
};

const attack = {
  kind: "phase5-laser",
  attackLabel: "激光",
  weaponLabel: "激光枪",
  stateLabel: "发射",
  pauseBossMovement: true,
  fireRemaining: 1,
  shotsFired: 1,
  specialShotsFired: 0,
  burstSize: null,
  shotsRemainingInBurst: null,
  burstsCompleted: 0,
  modeAttackCount: 0,
  attacksBeforeSwitchCheck: 3,
  switchChecks: 0,
  weaponSwitches: 0,
  lastSwitchResult: null,
  summonsIssued: 0,
  lastSummonKind: null,
  tutorialMessage: "",
  laserMode: "basic" as const,
  laserState: "basic-active",
  laserActive: true,
  laserAttackId: 7,
  laserAngle: Math.PI,
  lockedLaserY: 300,
};

test("D3.5 basic laser uses the locked height and one-quarter-screen width", () => {
  const beam = createDemoLaserBeam(DEMO_LASER_GEOMETRY_CONFIG, attack, actor);
  assert.notEqual(beam, null);
  assert.equal(beam?.origin.y, 300);
  assert.equal(beam?.width, 180);
  assert.equal(beam?.attackId, 7);
  assert.equal(
    laserIntersectsCircle(beam!, { center: { x: 400, y: 385 }, radius: 8 }),
    true,
  );
  assert.equal(
    laserIntersectsCircle(beam!, { center: { x: 400, y: 410 }, radius: 8 }),
    false,
  );
});

test("D3.5 inactive telegraph keeps collision geometry but is not active", () => {
  const beam = createDemoLaserBeam(
    DEMO_LASER_GEOMETRY_CONFIG,
    { ...attack, laserState: "basic-charge", laserActive: false },
    actor,
  );
  assert.equal(beam?.telegraph, true);
  assert.equal(beam?.active, false);
});

test("D3.5 ultimate beam is as wide as the basic beam", () => {
  const beam = createDemoLaserBeam(
    DEMO_LASER_GEOMETRY_CONFIG,
    {
      ...attack,
      laserMode: "ultimate",
      laserState: "ultimate-active",
      lockedLaserY: null,
    },
    actor,
  );
  assert.equal(beam?.width, DEMO_LASER_GEOMETRY_CONFIG.basicBeamHeight);
  assert.equal(
    DEMO_LASER_GEOMETRY_CONFIG.ultimateBeamWidth,
    DEMO_LASER_GEOMETRY_CONFIG.basicBeamHeight,
  );
});
