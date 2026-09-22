import assert from "node:assert/strict";
import test from "node:test";
import {
  PrototypeBossModel,
  type PrototypeBossConfig,
} from "../src/game/entities/boss/PrototypeBossModel.ts";

function createConfig(
  overrides: Partial<PrototypeBossConfig> = {},
): PrototypeBossConfig {
  return {
    maximumHealth: 12,
    initialPosition: { x: 250, y: 100 },
    movementBounds: { minX: 220, maxX: 280, minY: 30, maxY: 170 },
    targetPauseSeconds: 0.05,
    targetArrivalDistance: 1,
    initialFireDelaySeconds: 0.4,
    specialBulletChance: 0.2,
    randomSeed: 20260922,
    muzzleOffset: { x: -20, y: 0 },
    hitFlashSeconds: 0.12,
    hitZones: [
      { offset: { x: 0, y: -20 }, radius: 12 },
      { offset: { x: 0, y: 12 }, radius: 18 },
    ],
    phases: {
      1: { movementSpeed: 45, fireIntervalSeconds: 1.2, bulletSpeed: 170 },
      2: { movementSpeed: 65, fireIntervalSeconds: 0.7, bulletSpeed: 200 },
      3: { movementSpeed: 120, fireIntervalSeconds: 0.7, bulletSpeed: 320 },
    },
    ...overrides,
  };
}

test("boss remains inside its configured right-side movement bounds", () => {
  const config = createConfig();
  const boss = new PrototypeBossModel(config);

  for (let index = 0; index < 2_000; index += 1) {
    boss.update(0.1);
    const { position } = boss.getSnapshot();
    assert.ok(position.x >= config.movementBounds.minX);
    assert.ok(position.x <= config.movementBounds.maxX);
    assert.ok(position.y >= config.movementBounds.minY);
    assert.ok(position.y <= config.movementBounds.maxY);
  }
});

test("boss switches phase at two-thirds and one-third health", () => {
  const boss = new PrototypeBossModel(createConfig());
  assert.equal(boss.getSnapshot().phase, 1);

  for (let index = 0; index < 4; index += 1) {
    assert.equal(boss.takeDamage(), "damaged");
  }
  assert.equal(boss.getSnapshot().health, 8);
  assert.equal(boss.getSnapshot().phase, 2);

  for (let index = 0; index < 4; index += 1) {
    assert.equal(boss.takeDamage(), "damaged");
  }
  assert.equal(boss.getSnapshot().health, 4);
  assert.equal(boss.getSnapshot().phase, 3);

  for (let index = 0; index < 3; index += 1) {
    assert.equal(boss.takeDamage(), "damaged");
  }
  assert.equal(boss.takeDamage(), "defeated");
  assert.equal(boss.getSnapshot().defeated, true);
  assert.equal(boss.takeDamage(), "ignored");
});

test("the same seed reproduces movement and bullet types", () => {
  const first = new PrototypeBossModel(createConfig());
  const second = new PrototypeBossModel(createConfig());

  for (let index = 0; index < 500; index += 1) {
    assert.deepEqual(first.update(0.1), second.update(0.1));
    assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  }
});

test("special bullet frequency converges near twenty percent", () => {
  const boss = new PrototypeBossModel(
    createConfig({
      initialFireDelaySeconds: 0,
      phases: {
        1: { movementSpeed: 45, fireIntervalSeconds: 0.05, bulletSpeed: 170 },
        2: { movementSpeed: 65, fireIntervalSeconds: 0.05, bulletSpeed: 200 },
        3: { movementSpeed: 120, fireIntervalSeconds: 0.05, bulletSpeed: 320 },
      },
    }),
  );

  while (boss.getSnapshot().shotsFired < 2_000) {
    boss.update(0.25);
  }

  const snapshot = boss.getSnapshot();
  const ratio = snapshot.specialShotsFired / snapshot.shotsFired;
  assert.ok(ratio >= 0.17 && ratio <= 0.23, `special ratio was ${ratio}`);
});

test("boss exposes multiple moving body hit zones", () => {
  const boss = new PrototypeBossModel(createConfig());
  const before = boss.getHitColliders();
  assert.equal(before.length, 2);
  assert.notDeepEqual(before[0].center, before[1].center);

  boss.update(0.25);
  const after = boss.getHitColliders();
  assert.notDeepEqual(after[0].center, before[0].center);
});

test("boss movement continues while ultimate pauses only firing", () => {
  const boss = new PrototypeBossModel(
    createConfig({ initialFireDelaySeconds: 0 }),
  );
  const before = boss.getSnapshot().position;
  assert.deepEqual(boss.update(0.25, false), []);
  assert.notDeepEqual(boss.getSnapshot().position, before);
  assert.equal(boss.getSnapshot().shotsFired, 0);
  assert.equal(boss.update(0, true).length, 1);
});
