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
    headOffset: { x: 8, y: -24 },
    headVisibleRadius: 40,
    headHitRadius: 31,
    headWander: {
      radius: { x: 10, y: 8 },
      frequency: { x: 0.24, y: 0.31 },
    },
    weaponOffset: { x: -4, y: 28 },
    minimumHeadWeaponVerticalSeparation: 64,
    weaponMuzzleOffset: { x: -60, y: 0 },
    weaponWander: {
      radius: { x: 7, y: 6 },
      frequency: { x: 0.33, y: 0.27 },
    },
    weaponRecoil: {
      impulse: 80,
      maximumVelocity: 180,
      maximumOffset: 18,
      spring: 78,
      damping: 13,
    },
    hitFlashSeconds: 0.12,
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

test("only the independently wandering head exposes a hit collider", () => {
  const config = createConfig();
  const boss = new PrototypeBossModel(config);
  const beforeSnapshot = boss.getSnapshot();
  const before = boss.getHitColliders();
  const hitRatio = config.headHitRadius / config.headVisibleRadius;

  assert.equal(before.length, 1);
  assert.deepEqual(before[0].center, beforeSnapshot.headPosition);
  assert.equal(before[0].radius, config.headHitRadius);
  assert.ok(hitRatio >= 0.75 && hitRatio <= 0.8);

  boss.update(0.25, false);
  const afterSnapshot = boss.getSnapshot();
  const after = boss.getHitColliders();
  assert.deepEqual(after[0].center, afterSnapshot.headPosition);
  assert.notDeepEqual(afterSnapshot.headWanderOffset, beforeSnapshot.headWanderOffset);
  assert.notDeepEqual(
    afterSnapshot.weaponWanderOffset,
    beforeSnapshot.weaponWanderOffset,
  );
  assert.notDeepEqual(
    afterSnapshot.headWanderOffset,
    afterSnapshot.weaponWanderOffset,
  );
  assert.ok(
    afterSnapshot.weaponPosition.y - afterSnapshot.headPosition.y >=
      config.minimumHeadWeaponVerticalSeparation,
  );
  assert.ok(
    Math.abs(afterSnapshot.headWanderOffset.x) <= config.headWander.radius.x,
  );
  assert.ok(
    Math.abs(afterSnapshot.headWanderOffset.y) <= config.headWander.radius.y,
  );
});

test("head and weapon keep their configured clearance throughout wandering", () => {
  const config = createConfig();
  const boss = new PrototypeBossModel(config);

  for (let index = 0; index < 2_000; index += 1) {
    boss.update(1 / 120, false);
    const snapshot = boss.getSnapshot();
    assert.ok(
      snapshot.weaponPosition.y - snapshot.headPosition.y + 1e-9 >=
        config.minimumHeadWeaponVerticalSeparation,
    );
  }
});

test("shots originate at the independently moving muzzle", () => {
  const boss = new PrototypeBossModel(
    createConfig({ initialFireDelaySeconds: 0 }),
  );
  const expectedMuzzle = boss.getSnapshot().muzzlePosition;
  const shots = boss.update(0);

  assert.equal(shots.length, 1);
  assert.deepEqual(shots[0].origin, expectedMuzzle);
});

test("repeated shots add capped recoil and the spring returns the weapon", () => {
  const config = createConfig({
    initialFireDelaySeconds: 0,
    phases: {
      1: { movementSpeed: 45, fireIntervalSeconds: 0.05, bulletSpeed: 170 },
      2: { movementSpeed: 65, fireIntervalSeconds: 0.05, bulletSpeed: 200 },
      3: { movementSpeed: 120, fireIntervalSeconds: 0.05, bulletSpeed: 320 },
    },
  });
  const boss = new PrototypeBossModel(config);

  assert.equal(boss.update(0.25).length, 6);
  assert.equal(
    boss.getSnapshot().weaponRecoilVelocity,
    config.weaponRecoil.maximumVelocity,
  );

  boss.update(1 / 60, false);
  const recoiling = boss.getSnapshot();
  assert.ok(recoiling.weaponRecoilOffset > 0);
  assert.ok(recoiling.weaponRecoilOffset <= config.weaponRecoil.maximumOffset);

  for (let index = 0; index < 600; index += 1) {
    boss.update(1 / 120, false);
  }

  const settled = boss.getSnapshot();
  assert.equal(settled.weaponRecoilOffset, 0);
  assert.equal(settled.weaponRecoilVelocity, 0);
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
