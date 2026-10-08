import assert from "node:assert/strict";
import test from "node:test";
import {
  UltimateVolleyModel,
  type UltimateVolleyConfig,
} from "../src/game/entities/ultimate/UltimateVolleyModel.ts";

const config: UltimateVolleyConfig = {
  randomSeed: 20260923,
  muzzleOffsetX: 48,
  maximumHeightOffset: 28,
  emissionIntervalSeconds: 0.1,
  projectileSpeed: 800,
  projectileRadius: 13,
  maximumSpreadRadians: 0.06,
  damagePerProjectile: 1,
  worldWidth: 1280,
  worldHeight: 720,
  verticalPadding: 24,
  despawnPadding: 100,
  impactDurationSeconds: 0.28,
};

const origin = { x: 420, y: 470 };

test("ultimate volley starts near the player with relative height offsets", () => {
  const volley = new UltimateVolleyModel(config);
  const launch = volley.launch(origin, 5);
  const projectiles = volley.getSnapshots();
  assert.equal(launch.projectileCount, 5);
  assert.equal(projectiles.length, 5);
  assert.ok(new Set(projectiles.map((projectile) => projectile.position.y)).size > 3);

  for (const projectile of projectiles) {
    assert.equal(projectile.position.x, origin.x + config.muzzleOffsetX);
    assert.equal(projectile.radius, config.projectileRadius);
    assert.ok(projectile.position.y >= origin.y - config.maximumHeightOffset);
    assert.ok(projectile.position.y <= origin.y + config.maximumHeightOffset);
    assert.ok(projectile.velocity.x > 0);
    assert.ok(Math.abs(projectile.velocity.y / projectile.velocity.x) < 0.07);
  }
});

test("ultimate projectiles are emitted as a rapid sequence", () => {
  const volley = new UltimateVolleyModel(config);
  volley.launch(origin, 5);
  assert.equal(
    volley.getSnapshots().filter((projectile) => projectile.emissionDelayRemaining === 0).length,
    1,
  );
  volley.update(0.11);
  assert.ok(
    volley.getSnapshots().filter((projectile) => projectile.emissionDelayRemaining === 0).length >= 2,
  );
});

test("each ultimate projectile reports its own damage on boss contact", () => {
  const volley = new UltimateVolleyModel({
    ...config,
    maximumHeightOffset: 0,
    emissionIntervalSeconds: 0,
    maximumSpreadRadians: 0,
  });
  volley.launch({ x: 100, y: 100 }, 2);
  const hits = volley.update(0.25, [
    { center: { x: 330, y: 100 }, radius: 20 },
  ]);
  assert.equal(volley.getSnapshots().length, 0);
  assert.equal(hits.length, 2);
  assert.deepEqual(
    hits.map((hit) => hit.damage),
    [1, 1],
  );
  assert.deepEqual(
    hits.map((hit) => hit.targetIndex),
    [0, 0],
  );
  assert.equal(volley.getImpactSnapshots().length, 2);
  assert.ok(volley.getImpactSnapshots()[0].position.x < 330);

  volley.update(0.25, []);
  volley.update(0.04, []);
  assert.equal(volley.getImpactSnapshots().length, 0);
});

test("ultimate emits exactly one projectile for every absorbed bullet", () => {
  const volley = new UltimateVolleyModel(config);
  const launch = volley.launch(origin, 57);
  assert.equal(launch.absorbedCount, 57);
  assert.equal(launch.projectileCount, 57);
  assert.equal(volley.getSnapshots().length, 57);
});

test("absorbing no bullets emits no projectiles and causes no damage", () => {
  const volley = new UltimateVolleyModel(config);
  const launch = volley.launch(origin, 0);
  const hits = volley.update(0.25, [
    { center: { x: 700, y: origin.y }, radius: 200 },
  ]);
  assert.equal(launch.projectileCount, 0);
  assert.equal(volley.getSnapshots().length, 0);
  assert.deepEqual(hits, []);
});

test("ultimate volley is deterministic for the configured seed", () => {
  const first = new UltimateVolleyModel(config);
  const second = new UltimateVolleyModel(config);
  first.launch(origin, 4);
  second.launch(origin, 4);
  assert.deepEqual(first.getSnapshots(), second.getSnapshots());
});

test("transition clear removes ultimate projectiles and impact feedback", () => {
  const volley = new UltimateVolleyModel({
    ...config,
    maximumHeightOffset: 0,
    emissionIntervalSeconds: 0,
    maximumSpreadRadians: 0,
  });
  volley.launch({ x: 100, y: 100 }, 2);
  volley.update(0.25, [{ center: { x: 330, y: 100 }, radius: 20 }]);
  assert.equal(volley.getImpactSnapshots().length, 2);
  volley.launch(origin, 3);
  volley.clearAll();
  assert.equal(volley.getSnapshots().length, 0);
  assert.equal(volley.getImpactSnapshots().length, 0);
});
