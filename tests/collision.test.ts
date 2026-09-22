import assert from "node:assert/strict";
import test from "node:test";
import {
  circlesOverlap,
  sweptCircleCollision,
  sweptCircleIntersectsCircle,
} from "../src/game/systems/CollisionSystem.ts";

test("circle collision includes exact edge contact", () => {
  assert.equal(
    circlesOverlap(
      { center: { x: 10, y: 20 }, radius: 12 },
      { center: { x: 40, y: 20 }, radius: 18 },
    ),
    true,
  );
});

test("separated circles do not collide", () => {
  assert.equal(
    circlesOverlap(
      { center: { x: 10, y: 20 }, radius: 12 },
      { center: { x: 40.01, y: 20 }, radius: 18 },
    ),
    false,
  );
});

test("invalid or negative collider values fail closed", () => {
  assert.equal(
    circlesOverlap(
      { center: { x: Number.NaN, y: 0 }, radius: 12 },
      { center: { x: 0, y: 0 }, radius: 18 },
    ),
    false,
  );
  assert.equal(
    circlesOverlap(
      { center: { x: 0, y: 0 }, radius: -1 },
      { center: { x: 0, y: 0 }, radius: 18 },
    ),
    false,
  );
});

test("swept collision catches a fast circle crossing the target", () => {
  assert.equal(
    sweptCircleIntersectsCircle(
      { x: 100, y: 40 },
      { x: 0, y: 40 },
      5,
      { center: { x: 50, y: 40 }, radius: 6 },
    ),
    true,
  );
});

test("swept collision reports the first contact center", () => {
  const collision = sweptCircleCollision(
    { x: 100, y: 40 },
    { x: 0, y: 40 },
    5,
    { center: { x: 50, y: 40 }, radius: 6 },
  );
  assert.ok(collision);
  assert.ok(Math.abs(collision.center.x - 61) < 1e-9);
  assert.equal(collision.center.y, 40);
});

test("swept collision rejects a segment that passes outside the combined radius", () => {
  assert.equal(
    sweptCircleIntersectsCircle(
      { x: 100, y: 60.01 },
      { x: 0, y: 60.01 },
      4,
      { center: { x: 50, y: 50 }, radius: 6 },
    ),
    false,
  );
});
