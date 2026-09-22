import assert from "node:assert/strict";
import test from "node:test";
import {
  PrototypeBulletModel,
  type PrototypeBulletConfig,
} from "../src/game/entities/bullet/PrototypeBulletModel.ts";

function createConfig(
  overrides: Partial<PrototypeBulletConfig> = {},
): PrototypeBulletConfig {
  return {
    maximumActive: 8,
    initialDelaySeconds: 0,
    spawnIntervalSeconds: 999,
    emitterPosition: { x: 100, y: 50 },
    targetPosition: { x: 200, y: 50 },
    targetRadius: 10,
    normalRadius: 5,
    specialRadius: 7,
    normalSpeed: 100,
    specialSpeed: 80,
    reflectedSpeed: 500,
    maximumReflectedBounces: 3,
    worldWidth: 300,
    worldHeight: 100,
    despawnPadding: 200,
    sequence: ["normal"],
    ...overrides,
  };
}

test("emitter aims an incoming normal bullet at the player", () => {
  const bullets = new PrototypeBulletModel(createConfig());
  bullets.update(0, { x: 0, y: 50 });
  const [bullet] = bullets.getSnapshots();
  assert.equal(bullet.type, "normal");
  assert.equal(bullet.motion, "incoming");
  assert.equal(bullet.velocity.x, -100);
  assert.equal(bullet.velocity.y, 0);
});

test("normal bullets cannot be selected or converted by special parry", () => {
  const bullets = new PrototypeBulletModel(createConfig());
  bullets.update(0, { x: 0, y: 50 });
  const [normal] = bullets.getSnapshots();
  assert.equal(
    bullets.findIncomingSpecialCollision({ x: 100, y: 50 }, 70),
    null,
  );
  assert.equal(bullets.reflect(normal.id, { x: 100, y: 50 }, 70), false);
});

test("boost reflection converts an incoming bullet at the player core", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      emitterPosition: { x: 100, y: 50 },
      normalSpeed: 200,
      sequence: ["normal"],
    }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [normal] = bullets.getSnapshots();
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(
    bullets.findIncomingPlayerCollision({ x: 50, y: 50 }, 10),
    normal.id,
  );
  assert.equal(bullets.reflectAnyIncoming(normal.id, { x: 50, y: 50 }, 10), true);
  const [reflected] = bullets.getSnapshots();
  assert.equal(reflected.type, "normal");
  assert.equal(reflected.motion, "reflected");
  assert.ok(reflected.velocity.x > 0);
});

test("boost reflection also converts a special bullet at the player core", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      emitterPosition: { x: 100, y: 50 },
      specialSpeed: 200,
      sequence: ["special"],
    }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [special] = bullets.getSnapshots();
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(
    bullets.findIncomingPlayerCollision({ x: 50, y: 50 }, 10),
    special.id,
  );
  assert.equal(
    bullets.reflectAnyIncoming(special.id, { x: 50, y: 50 }, 10),
    true,
  );
  assert.equal(bullets.getSnapshots()[0].motion, "reflected");
});

test("ultimate charge protection reflects normal bullets but not special bullets", () => {
  const bullets = new PrototypeBulletModel(createConfig({ sequence: [] }));
  const normalId = bullets.spawnIncoming(
    "normal",
    { x: 100, y: 40 },
    { x: 0, y: 40 },
    200,
  );
  const specialId = bullets.spawnIncoming(
    "special",
    { x: 100, y: 60 },
    { x: 0, y: 60 },
    200,
  );
  bullets.update(0.25, { x: 0, y: 50 });

  assert.equal(
    bullets.findIncomingNormalCollision({ x: 50, y: 40 }, 10),
    normalId,
  );
  assert.equal(
    bullets.reflectNormal(normalId!, { x: 50, y: 40 }, 10),
    true,
  );
  assert.equal(
    bullets.reflectNormal(specialId!, { x: 50, y: 60 }, 10),
    false,
  );
});

test("ultimate absorption clears every active bullet exactly once", () => {
  const bullets = new PrototypeBulletModel(createConfig({ sequence: [] }));
  bullets.spawnIncoming("normal", { x: 100, y: 30 }, { x: 0, y: 30 }, 100);
  bullets.spawnIncoming("special", { x: 100, y: 70 }, { x: 0, y: 70 }, 100);
  assert.deepEqual(bullets.absorbAll(), { normal: 1, special: 1, total: 2 });
  assert.equal(bullets.getSnapshots().length, 0);
  assert.deepEqual(bullets.absorbAll(), { normal: 0, special: 0, total: 0 });
});

test("ultimate absorption visibly pulls every bullet into the player before removal", () => {
  const bullets = new PrototypeBulletModel(createConfig({ sequence: [] }));
  bullets.spawnIncoming("normal", { x: 100, y: 30 }, { x: 0, y: 30 }, 100);
  bullets.spawnIncoming("special", { x: 100, y: 70 }, { x: 0, y: 70 }, 100);
  assert.deepEqual(bullets.beginAbsorption(0.8), {
    normal: 1,
    special: 1,
    total: 2,
  });
  assert.equal(bullets.getStats().absorbing, 2);
  assert.ok(
    bullets.getSnapshots().every((bullet) => bullet.motion === "absorbing"),
  );

  bullets.update(0.2, { x: 50, y: 50 });
  const midAnimation = bullets.getSnapshots();
  assert.equal(midAnimation.length, 2);
  assert.ok(midAnimation.every((bullet) => bullet.absorptionProgress > 0));
  assert.ok(midAnimation.every((bullet) => bullet.position.x !== 50));

  bullets.update(0.2, { x: 50, y: 50 });
  bullets.update(0.2, { x: 50, y: 50 });
  bullets.update(0.2, { x: 50, y: 50 });
  assert.equal(bullets.getSnapshots().length, 0);
});

test("special bullet reflects away from the parry center without homing", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      sequence: ["special"],
      emitterPosition: { x: 100, y: 50 },
      targetPosition: { x: 20, y: 80 },
      specialSpeed: 200,
    }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [special] = bullets.getSnapshots();
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(
    bullets.findIncomingSpecialCollision({ x: 50, y: 50 }, 10),
    special.id,
  );
  assert.equal(bullets.reflect(special.id, { x: 50, y: 50 }, 10), true);
  const [reflected] = bullets.getSnapshots();
  assert.equal(reflected.motion, "reflected");
  assert.ok(Math.abs(reflected.position.x - 67) < 1e-9);
  assert.ok(Math.abs(reflected.velocity.x - 500) < 1e-9);
  assert.ok(Math.abs(reflected.velocity.y) < 1e-9);
});

test("reflected special bullet mirrors from top and bottom only", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      sequence: ["special"],
      emitterPosition: { x: 150, y: 0 },
      specialSpeed: 200,
    }),
  );
  bullets.update(0, { x: 150, y: 80 });
  const [special] = bullets.getSnapshots();
  bullets.update(0.25, { x: 150, y: 80 });
  bullets.update(0.1, { x: 150, y: 80 });
  assert.equal(
    bullets.findIncomingSpecialCollision({ x: 150, y: 80 }, 10),
    special.id,
  );
  assert.equal(bullets.reflect(special.id, { x: 150, y: 80 }, 10), true);
  assert.ok(bullets.getSnapshots()[0].velocity.y < 0);

  bullets.update(0.25, { x: 150, y: 80 });
  const [bounced] = bullets.getSnapshots();
  assert.equal(bounced.wallBounces, 1);
  assert.ok(bounced.velocity.y > 0);
});

test("ballistic reflected special bullet damages a target on its path", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      sequence: ["special"],
      emitterPosition: { x: 100, y: 50 },
      targetPosition: { x: 200, y: 50 },
      specialSpeed: 200,
    }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [special] = bullets.getSnapshots();
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(bullets.reflect(special.id, { x: 50, y: 50 }, 10), true);
  bullets.update(0.25, { x: 0, y: 50 });
  assert.deepEqual(
    bullets.findReflectedColliderCollision([
      { center: { x: 200, y: 50 }, radius: 10 },
    ]),
    { bulletId: special.id, targetIndex: 0 },
  );
  assert.equal(bullets.consumeAsTargetHit(special.id), true);
  assert.equal(bullets.getStats().targetHits, 1);
});

test("reflected special bullet exits through a side without mirroring", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({
      sequence: ["special"],
      emitterPosition: { x: 100, y: 50 },
      specialSpeed: 200,
      worldWidth: 100,
      despawnPadding: 40,
    }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [special] = bullets.getSnapshots();
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(bullets.reflect(special.id, { x: 50, y: 50 }, 10), true);
  bullets.update(0.25, { x: 0, y: 50 });
  assert.equal(bullets.getSnapshots().length, 0);
});

test("swept player query catches a high-speed bullet crossing between frames", () => {
  const bullets = new PrototypeBulletModel(
    createConfig({ normalSpeed: 1000 }),
  );
  bullets.update(0, { x: 0, y: 50 });
  const [normal] = bullets.getSnapshots();
  bullets.update(0.1, { x: 0, y: 50 });
  assert.equal(
    bullets.findIncomingPlayerCollision({ x: 50, y: 50 }, 5),
    normal.id,
  );
});
