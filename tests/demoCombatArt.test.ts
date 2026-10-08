import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateLeftFacingArtRotation,
  DEMO_COMBAT_ART_ASSETS,
  resolveMovementDirection,
} from "../src/game/demo/combat/demoCombatArtConfig.ts";

test("D7 registers every supplied combat and special-item sprite", () => {
  assert.equal(DEMO_COMBAT_ART_ASSETS.length, 11);
  assert.equal(new Set(DEMO_COMBAT_ART_ASSETS.map((asset) => asset.key)).size, 11);
});

test("left-facing source art aligns its nose to every movement direction", () => {
  for (const direction of [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ]) {
    const rotation = calculateLeftFacingArtRotation(direction);
    const transformedSourceForward = {
      x: -Math.cos(rotation),
      y: -Math.sin(rotation),
    };
    assert.ok(Math.abs(transformedSourceForward.x - direction.x) < 0.000001);
    assert.ok(Math.abs(transformedSourceForward.y - direction.y) < 0.000001);
  }
});

test("render orientation follows actual displacement before stale velocity", () => {
  assert.deepEqual(
    resolveMovementDirection(
      { x: 12, y: 7 },
      { x: 10, y: 8 },
      { x: -300, y: 0 },
    ),
    { x: 2, y: -1 },
  );
  assert.deepEqual(
    resolveMovementDirection(
      { x: 12, y: 7 },
      { x: 12, y: 7 },
      { x: -300, y: 20 },
    ),
    { x: -300, y: 20 },
  );
});
