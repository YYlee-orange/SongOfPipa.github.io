import assert from "node:assert/strict";
import test from "node:test";
import {
  DemoRocketModel,
  type DemoRocketConfig,
} from "../src/game/demo/projectiles/DemoRocketModel.ts";
import { DEMO_ROCKET_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const config: DemoRocketConfig = {
  maximumActive: 4,
  radius: 10,
  acceleration: 100,
  maximumSpeed: 200,
  homingTurnRateRadiansPerSecond: 0.8,
  playerDamage: 2,
  bossDamage: 1,
  worldWidth: 1280,
  worldHeight: 720,
  explosionSeconds: 0.3,
};

test("D3.3 rocket starts at zero, accelerates to its cap and stays straight without a target", () => {
  assert.equal(DEMO_ROCKET_CONFIG.radius, 38);
  assert.equal(DEMO_ROCKET_CONFIG.homingTurnRateRadiansPerSecond, 0.75);
  const rockets = new DemoRocketModel(config);
  rockets.spawn({ x: 1000, y: 360 }, { x: 100, y: 360 });
  assert.equal(rockets.getSnapshots()[0].speed, 0);

  rockets.update(0.25);
  let snapshot = rockets.getSnapshots()[0];
  assert.equal(snapshot.speed, 25);
  assert.deepEqual(snapshot.direction, { x: -1, y: 0 });

  for (let index = 0; index < 12; index += 1) {
    rockets.update(0.25);
  }
  snapshot = rockets.getSnapshots()[0];
  assert.equal(snapshot.speed, 200);
  assert.deepEqual(snapshot.direction, { x: -1, y: 0 });
});

test("D3.3 incoming rocket turns toward the live player with a capped angular speed", () => {
  const rockets = new DemoRocketModel(config);
  rockets.spawn({ x: 1000, y: 360 }, { x: 100, y: 360 });

  rockets.update(0.25, { x: 900, y: 100 });
  const direction = rockets.getSnapshots()[0].direction;
  const angle = Math.atan2(direction.y, direction.x);
  const turnedRadians = Math.abs(
    Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI)),
  );

  assert.ok(direction.y < 0);
  assert.ok(turnedRadians <= 0.200001);
});

test("D3.3 rocket explodes on top or bottom contact without bouncing", () => {
  const rockets = new DemoRocketModel(config);
  rockets.spawn({ x: 300, y: 15 }, { x: 300, y: -100 });
  rockets.update(0.25);
  rockets.update(0.25);

  assert.equal(rockets.getStats().active, 0);
  assert.equal(rockets.getStats().wallExplosions, 1);
  assert.equal(rockets.getExplosionSnapshots()[0].cause, "wall");
});

test("D3.3 rocket exits horizontally without a wall explosion", () => {
  const rockets = new DemoRocketModel(config);
  rockets.spawn({ x: 12, y: 360 }, { x: -100, y: 360 });
  for (let index = 0; index < 12 && rockets.getStats().active > 0; index += 1) {
    rockets.update(0.25);
  }

  assert.equal(rockets.getStats().active, 0);
  assert.equal(rockets.getStats().wallExplosions, 0);
  assert.equal(rockets.getExplosionSnapshots().length, 0);
});

test("D3.3 boosted reflection reverses a rocket ballistically without wall bounce", () => {
  const rockets = new DemoRocketModel(config);
  const id = rockets.spawn({ x: 100, y: 360 }, { x: 0, y: 360 });
  assert.notEqual(id, null);
  rockets.update(0.25);

  const reflected = rockets.reflect(id ?? 0, { x: 90, y: 360 }, 5);
  assert.equal(reflected, true);
  assert.equal(rockets.getSnapshots()[0].motion, "reflected");
  assert.ok(rockets.getSnapshots()[0].direction.x > 0);
  const reflectedDirection = { ...rockets.getSnapshots()[0].direction };

  rockets.update(0.25, { x: 90, y: 50 });
  assert.deepEqual(rockets.getSnapshots()[0].direction, reflectedDirection);

  let hit: ReturnType<DemoRocketModel["findReflectedColliderCollision"]> = null;
  for (let index = 0; index < 4 && hit === null; index += 1) {
    rockets.update(0.25);
    hit = rockets.findReflectedColliderCollision([
      { center: { x: 125, y: 360 }, radius: 8 },
    ]);
  }
  assert.equal(hit?.rocketId, id);
});

test("D3.3 ultimate absorption pulls each active rocket in as one stored projectile", () => {
  const rockets = new DemoRocketModel(config);
  rockets.spawn({ x: 1000, y: 300 }, { x: 200, y: 300 });
  rockets.spawn({ x: 1000, y: 400 }, { x: 200, y: 400 });
  assert.equal(rockets.beginAbsorption(0.5), 2);
  rockets.update(0.25, { x: 200, y: 360 });
  assert.equal(rockets.getStats().absorbing, 2);
  assert.ok(rockets.getSnapshots()[0].absorptionProgress > 0);
  rockets.update(0.25, { x: 200, y: 360 });
  assert.equal(rockets.getStats().active, 0);
});
