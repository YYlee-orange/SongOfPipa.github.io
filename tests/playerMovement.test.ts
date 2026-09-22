import assert from "node:assert/strict";
import test from "node:test";
import {
  PlayerMovementModel,
  type PlayerMovementConfig,
} from "../src/game/entities/player/PlayerMovementModel.ts";

const config: PlayerMovementConfig = {
  bounds: { minX: 54, maxX: 1226, minY: 38, maxY: 682 },
  maximumSpeed: 360,
  acceleration: 3000,
  deceleration: 3600,
};

test("movement accelerates toward the configured maximum speed", () => {
  const player = new PlayerMovementModel(config, { x: 420, y: 470 });

  for (let frame = 0; frame < 30; frame += 1) {
    player.update({ x: 1, y: 0 }, 1 / 60);
  }

  const snapshot = player.getSnapshot();
  assert.ok(snapshot.position.x > 420);
  assertNear(snapshot.velocity.x, config.maximumSpeed, 0.001);
  assertNear(snapshot.velocity.y, 0, 0.001);
});

test("diagonal input is normalized and cannot move faster", () => {
  const player = new PlayerMovementModel(config, { x: 420, y: 470 });

  for (let frame = 0; frame < 30; frame += 1) {
    player.update({ x: 1, y: 1 }, 1 / 60);
  }

  const velocity = player.getSnapshot().velocity;
  assertNear(Math.hypot(velocity.x, velocity.y), config.maximumSpeed, 0.001);
});

test("movement decelerates to rest after input is released", () => {
  const player = new PlayerMovementModel(config, { x: 420, y: 470 });

  for (let frame = 0; frame < 15; frame += 1) {
    player.update({ x: -1, y: 0 }, 1 / 60);
  }

  for (let frame = 0; frame < 15; frame += 1) {
    player.update({ x: 0, y: 0 }, 1 / 60);
  }

  const snapshot = player.getSnapshot();
  assertNear(snapshot.velocity.x, 0, 0.001);
  assertNear(snapshot.velocity.y, 0, 0.001);
  assert.equal(snapshot.moving, false);
});

test("position and outward velocity are clamped at every boundary", () => {
  const directions = [
    { input: { x: -1, y: 0 }, axis: "x", edge: config.bounds.minX },
    { input: { x: 1, y: 0 }, axis: "x", edge: config.bounds.maxX },
    { input: { x: 0, y: -1 }, axis: "y", edge: config.bounds.minY },
    { input: { x: 0, y: 1 }, axis: "y", edge: config.bounds.maxY },
  ] as const;

  for (const direction of directions) {
    const player = new PlayerMovementModel(config, { x: 420, y: 470 });

    for (let frame = 0; frame < 240; frame += 1) {
      player.update(direction.input, 1 / 60);
    }

    const snapshot = player.getSnapshot();
    assertNear(snapshot.position[direction.axis], direction.edge, 0.001);
    assertNear(snapshot.velocity[direction.axis], 0, 0.001);
  }
});

function assertNear(actual: number, expected: number, tolerance: number): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}
