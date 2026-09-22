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
  baseProjectileCount: 8,
  maximumProjectileCount: 18,
  baseDamage: 4,
  maximumDamage: 8,
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
  assert.equal(launch.projectileCount, 13);
  assert.equal(projectiles.length, 13);
  assert.ok(new Set(projectiles.map((projectile) => projectile.position.y)).size > 8);

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

test("ultimate projectile disappears on boss contact and creates an impact", () => {
  const volley = new UltimateVolleyModel({
    ...config,
    maximumHeightOffset: 0,
    emissionIntervalSeconds: 0,
    maximumSpreadRadians: 0,
    baseProjectileCount: 1,
    maximumProjectileCount: 1,
  });
  volley.launch({ x: 100, y: 100 }, 0);
  volley.update(0.25, [{ center: { x: 330, y: 100 }, radius: 20 }]);
  assert.equal(volley.getSnapshots().length, 0);
  assert.equal(volley.getImpactSnapshots().length, 1);
  assert.ok(volley.getImpactSnapshots()[0].position.x < 330);

  volley.update(0.25, []);
  volley.update(0.04, []);
  assert.equal(volley.getImpactSnapshots().length, 0);
});

test("ultimate damage and projectile count use capped diminishing growth", () => {
  const volley = new UltimateVolleyModel(config);
  const launch = volley.launch(origin, 10_000);
  assert.equal(launch.projectileCount, 18);
  assert.equal(launch.damage, 8);
});

test("ultimate volley is deterministic for the configured seed", () => {
  const first = new UltimateVolleyModel(config);
  const second = new UltimateVolleyModel(config);
  first.launch(origin, 4);
  second.launch(origin, 4);
  assert.deepEqual(first.getSnapshots(), second.getSnapshots());
});
