import assert from "node:assert/strict";
import test from "node:test";
import {
  DemoDisarmTransitionModel,
  type DemoDisarmTransitionConfig,
  type DemoDisarmTransitionContext,
} from "../src/game/demo/transitions/DemoDisarmTransitionModel.ts";
import {
  DEMO_PHASE1_DISARM_CONFIG,
  DEMO_PHASE2_DISARM_CONFIG,
  DEMO_PHASE3_ROCKET_DISARM_CONFIG,
  DEMO_PHASE3_SHOTGUN_DISARM_CONFIG,
  DEMO_PHASE4_SUMMONER_DISARM_CONFIG,
  DEMO_PHASE5_LASER_DISARM_CONFIG,
} from "../src/game/demo/transitions/demoDisarmTransitionConfig.ts";

const config: DemoDisarmTransitionConfig = {
  weaponKind: "revolver",
  weaponLabel: "左轮手枪",
  attackMode: "projectile",
  randomSeed: 41,
  throwDurationSeconds: 0.2,
  throwArcHeight: 80,
  landingBounds: { minX: 480, maxX: 620, minY: 240, maxY: 480 },
  weaponRadius: 30,
  heldWeaponOffset: { x: 72, y: -18 },
  muzzleOffset: 58,
  fireIntervalSeconds: 0.1,
  projectilesPerShot: 1,
  projectileSpreadRadians: 0,
  projectileSpeed: 1200,
  projectileAcceleration: 0,
  projectileMaximumSpeed: 1200,
  projectileRadius: 10,
  requiredHits: 3,
  discardVelocity: { x: -180, y: -220 },
  discardGravity: 900,
  discardSeconds: 0.3,
  worldWidth: 1280,
  worldHeight: 720,
  despawnPadding: 60,
};

const bossTarget = { center: { x: 1080, y: 340 }, radius: 80 };

function context(
  playerPosition = { x: 120, y: 360 },
  fireHeld = false,
): DemoDisarmTransitionContext {
  return {
    playerPosition,
    playerHalfWidth: 54,
    playerHalfHeight: 38,
    bossTarget,
    fireHeld,
  };
}

test("phase-one weapon lands in its reachable pickup bounds", () => {
  const transition = new DemoDisarmTransitionModel(config, { x: 1120, y: 330 });
  transition.update(0.25, context());
  const snapshot = transition.getSnapshot();
  assert.equal(snapshot.state, "wait-pickup");
  assert.ok(snapshot.weaponPosition.x >= config.landingBounds.minX);
  assert.ok(snapshot.weaponPosition.x <= config.landingBounds.maxX);
  assert.ok(snapshot.weaponPosition.y >= config.landingBounds.minY);
  assert.ok(snapshot.weaponPosition.y <= config.landingBounds.maxY);
  assert.equal(snapshot.prompt, "捡拾Boss武器攻击它！");
});

test("pelvis outline pickup remaps parry to fire and does not auto-progress", () => {
  const transition = new DemoDisarmTransitionModel(config, { x: 1120, y: 330 });
  transition.update(0.25, context());
  const landing = transition.getSnapshot().landingPosition;
  const pickup = transition.update(0, context(landing));
  assert.equal(pickup.pickedUp, true);
  assert.equal(transition.getSnapshot().state, "player-fire");
  assert.equal(transition.getSnapshot().inputLabel, "发射");

  for (let index = 0; index < 30; index += 1) {
    transition.update(0.05, context(landing, false));
  }
  assert.equal(transition.getSnapshot().bossHits, 0);
  assert.equal(transition.getSnapshot().state, "player-fire");
});

test("sustained accurate fire completes pressure, discard, and resolve", () => {
  const transition = new DemoDisarmTransitionModel(config, { x: 1120, y: 330 });
  transition.update(0.25, context());
  const landing = transition.getSnapshot().landingPosition;
  transition.update(0, context(landing));

  let hitEvents = 0;
  for (let index = 0; index < 100; index += 1) {
    const events = transition.update(0.05, context(landing, true));
    hitEvents += events.bossHits;
    if (transition.getSnapshot().state === "player-discard") {
      break;
    }
  }
  assert.equal(hitEvents, config.requiredHits);
  assert.equal(transition.getSnapshot().bossHits, config.requiredHits);
  assert.equal(transition.getSnapshot().pressureProgress, 1);
  assert.equal(transition.getSnapshot().state, "player-discard");

  let resolved = false;
  for (let index = 0; index < 10; index += 1) {
    resolved ||= transition.update(0.05, context(landing)).resolved;
  }
  assert.equal(resolved, true);
  assert.equal(transition.getSnapshot().state, "resolved");
  assert.equal(transition.getSnapshot().inputLabel, "反弹");
});

test("D4.2 AK47 uses the shared flow with its own rapid-fire tuning", () => {
  assert.equal(DEMO_PHASE1_DISARM_CONFIG.weaponKind, "revolver");
  assert.equal(DEMO_PHASE2_DISARM_CONFIG.weaponKind, "ak47");
  assert.equal(DEMO_PHASE2_DISARM_CONFIG.weaponLabel, "AK47");
  assert.ok(
    DEMO_PHASE2_DISARM_CONFIG.fireIntervalSeconds <
      DEMO_PHASE1_DISARM_CONFIG.fireIntervalSeconds,
  );
  const estimatedPressure =
    DEMO_PHASE2_DISARM_CONFIG.requiredHits *
    DEMO_PHASE2_DISARM_CONFIG.fireIntervalSeconds;
  assert.ok(estimatedPressure >= 4.5 && estimatedPressure <= 5.5);

  const transition = new DemoDisarmTransitionModel(
    DEMO_PHASE2_DISARM_CONFIG,
    { x: 1120, y: 330 },
  );
  for (let index = 0; index < 4; index += 1) {
    transition.update(0.25, context());
  }
  const snapshot = transition.getSnapshot();
  assert.equal(snapshot.state, "wait-pickup");
  assert.equal(snapshot.weaponLabel, "AK47");
});

test("D4.3 shotgun fires one simultaneous six-pellet spread", () => {
  const transition = new DemoDisarmTransitionModel(
    DEMO_PHASE3_SHOTGUN_DISARM_CONFIG,
    { x: 1120, y: 330 },
  );
  for (let index = 0; index < 4; index += 1) {
    transition.update(0.25, context());
  }
  const landing = transition.getSnapshot().landingPosition;
  transition.update(0, context(landing));
  const events = transition.update(0.01, context(landing, true));
  const snapshot = transition.getSnapshot();
  assert.equal(snapshot.weaponKind, "shotgun");
  assert.equal(events.shotsFired, 1);
  assert.equal(snapshot.projectiles.length, 6);
  assert.ok(new Set(snapshot.projectiles.map((shot) => shot.velocity.y)).size > 1);
});

test("D4.3 player rocket starts at zero and accelerates toward its cap", () => {
  const transition = new DemoDisarmTransitionModel(
    DEMO_PHASE3_ROCKET_DISARM_CONFIG,
    { x: 1120, y: 330 },
  );
  for (let index = 0; index < 4; index += 1) {
    transition.update(0.25, context());
  }
  const landing = transition.getSnapshot().landingPosition;
  transition.update(0, context(landing));
  transition.update(0.01, context(landing, true));
  assert.equal(transition.getSnapshot().weaponKind, "rocket-launcher");
  assert.equal(
    Math.hypot(...Object.values(transition.getSnapshot().projectiles[0].velocity)),
    0,
  );

  transition.update(0.1, context(landing, false));
  const speed = Math.hypot(
    transition.getSnapshot().projectiles[0].velocity.x,
    transition.getSnapshot().projectiles[0].velocity.y,
  );
  assert.ok(speed > 0);
  assert.ok(speed <= DEMO_PHASE3_ROCKET_DISARM_CONFIG.projectileMaximumSpeed);
});

test("D4.4 summoner creates only boss-seeking creepers and completes on explosions", () => {
  assert.equal(DEMO_PHASE4_SUMMONER_DISARM_CONFIG.fireIntervalSeconds, 0.65);
  const transition = new DemoDisarmTransitionModel(
    DEMO_PHASE4_SUMMONER_DISARM_CONFIG,
    { x: 1120, y: 330 },
  );
  for (let index = 0; index < 4; index += 1) {
    transition.update(0.25, context());
  }
  const landing = transition.getSnapshot().landingPosition;
  transition.update(0, context(landing));
  const first = transition.update(0.01, context(landing, true));
  assert.equal(first.shotsFired, 1);
  assert.equal(transition.getSnapshot().weaponKind, "summoner");
  assert.equal(transition.getSnapshot().weaponPressed, true);
  assert.equal(transition.getSnapshot().projectiles.length, 0);
  assert.equal(transition.getSnapshot().creepers.length, 1);
  assert.equal(transition.getSnapshot().creepers[0].state, "tracking");

  transition.update(0.2, context(landing, false));
  assert.equal(transition.getSnapshot().weaponPressed, false);

  let bossHits = 0;
  for (let index = 0; index < 140; index += 1) {
    const events = transition.update(0.05, context(landing, true));
    bossHits += events.bossHits;
    if (transition.getSnapshot().state === "player-discard") {
      break;
    }
  }
  assert.equal(bossHits, DEMO_PHASE4_SUMMONER_DISARM_CONFIG.requiredHits);
  assert.equal(transition.getSnapshot().pressureProgress, 1);
  assert.equal(transition.getSnapshot().state, "player-discard");
});

test("D4.5 laser must recharge after release and sustained fire completes final pressure", () => {
  const transition = new DemoDisarmTransitionModel(
    DEMO_PHASE5_LASER_DISARM_CONFIG,
    { x: 1120, y: 330 },
  );
  for (let index = 0; index < 4; index += 1) {
    transition.update(0.25, context());
  }
  const landing = transition.getSnapshot().landingPosition;
  transition.update(0, context(landing));

  transition.update(0.25, context(landing, true));
  assert.equal(transition.getSnapshot().laser?.state, "charging");
  assert.equal(transition.getSnapshot().bossHits, 0);
  transition.update(0.1, context(landing, false));
  assert.equal(transition.getSnapshot().laser?.state, "idle");
  assert.equal(transition.getSnapshot().laser?.chargeProgress, 0);

  let pressure = 0;
  let sawActiveBeam = false;
  for (let index = 0; index < 30; index += 1) {
    const events = transition.update(0.25, context(landing, true));
    pressure += events.bossHits;
    sawActiveBeam ||= transition.getSnapshot().laser?.active ?? false;
    if (transition.getSnapshot().state === "player-discard") {
      break;
    }
  }
  assert.equal(sawActiveBeam, true);
  assert.ok(Math.abs(pressure - DEMO_PHASE5_LASER_DISARM_CONFIG.requiredHits) < 0.001);
  assert.equal(transition.getSnapshot().bossHits, DEMO_PHASE5_LASER_DISARM_CONFIG.requiredHits);
  assert.equal(transition.getSnapshot().pressureProgress, 1);
  assert.equal(transition.getSnapshot().state, "player-discard");
  assert.equal(transition.getSnapshot().projectiles.length, 0);
  assert.equal(transition.getSnapshot().creepers.length, 0);
});
