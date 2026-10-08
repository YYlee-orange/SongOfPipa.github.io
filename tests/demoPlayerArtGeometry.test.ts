import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAnchoredArtTransform,
  calculateUprightBodyRotation,
} from "../src/game/demo/player/DemoPlayerArtGeometry.ts";

test("D6 maps arbitrary source anchors onto the live bone endpoints", () => {
  const proximal = { x: 382, y: 198 };
  const distal = { x: 846, y: 1118 };
  const root = { x: 300, y: 240 };
  const end = { x: 374, y: 294 };
  const transform = calculateAnchoredArtTransform(
    proximal,
    distal,
    root,
    end,
    92,
  );

  const localDistal = {
    x: transform.sourceLength * transform.scaleAlong,
    y: 0,
  };
  const mapped = {
    x:
      transform.x +
      localDistal.x * Math.cos(transform.rotation) -
      localDistal.y * Math.sin(transform.rotation),
    y:
      transform.y +
      localDistal.x * Math.sin(transform.rotation) +
      localDistal.y * Math.cos(transform.rotation),
  };

  assert.ok(Math.abs(mapped.x - end.x) < 0.000001);
  assert.ok(Math.abs(mapped.y - end.y) < 0.000001);
  assert.ok(Math.abs(transform.sourceRotation + Math.atan2(920, 464)) < 0.000001);
});

test("D6 stretches a limb along its length without changing its base thickness", () => {
  const common = {
    proximal: { x: 100, y: 100 },
    distal: { x: 100, y: 1100 },
    targetRoot: { x: 20, y: 30 },
  };
  const short = calculateAnchoredArtTransform(
    common.proximal,
    common.distal,
    common.targetRoot,
    { x: 120, y: 30 },
    112,
  );
  const long = calculateAnchoredArtTransform(
    common.proximal,
    common.distal,
    common.targetRoot,
    { x: 320, y: 30 },
    112,
  );

  assert.equal(short.scaleAcross, long.scaleAcross);
  assert.equal(short.scaleAcross, 0.112);
  assert.ok(long.scaleAlong > short.scaleAlong);
});

test("D6 rotates upright head and pelvis with the torso axis", () => {
  assert.equal(
    calculateUprightBodyRotation({ x: 10, y: 0 }, { x: 10, y: 20 }),
    0,
  );
  assert.ok(
    Math.abs(
      calculateUprightBodyRotation({ x: 0, y: 0 }, { x: 20, y: 20 }) +
        Math.PI / 4,
    ) < 1e-10,
  );
});
