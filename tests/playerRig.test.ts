import assert from "node:assert/strict";
import test from "node:test";
import {
  PlayerRigModel,
  type PlayerRigConfig,
  type PlayerRigPose,
  type TwoBoneChain,
  type Vec2,
} from "../src/game/entities/playerRig/PlayerRigModel.ts";

const config: PlayerRigConfig = {
  initialPelvis: { x: 420, y: 470 },
  pelvisSize: { width: 108, height: 76 },
  headCenterOffset: { x: -95, y: -215 },
  headWanderRadius: { x: 32, y: 24 },
  headWanderFrequency: { x: 0.72, y: 0.97 },
  headBounds: { minX: 200, maxX: 520, minY: 170, maxY: 350 },
  headFollowRate: 7,
  torsoMaximumLength: 1500,
  torsoReferenceLength: 235,
  torsoTopWidth: 94,
  torsoBottomWidth: 66,
  torsoNeckInset: 42,
  torsoPelvisInset: 30,
  upperArmLength: 92,
  lowerArmLength: 86,
  upperLegLength: 105,
  lowerLegLength: 112,
  leftFootOffset: { side: -62, down: 188 },
  rightFootOffset: { side: 66, down: 192 },
  legKneeBend: 55,
};

test("automatic head movement remains bounded and finite", () => {
  const rig = new PlayerRigModel(config);

  for (let frame = 0; frame < 60 * 30; frame += 1) {
    rig.update(1 / 60);
    assertPoseFinite(rig.getPose());
    assertHeadWithinLimits(rig.getPose());
  }
});

test("trapezoid torso stays aligned while arms preserve their segment lengths", () => {
  const rig = new PlayerRigModel(config);

  for (let frame = 0; frame < 180; frame += 1) {
    rig.update(1 / 60);
  }

  const pose = rig.getPose();
  const torsoAxis = subtract(pose.torso.topCenter, pose.torso.bottomCenter);
  const bodyAxis = subtract(pose.head, pose.pelvis);
  assertNear(cross(torsoAxis, bodyAxis), 0, 0.001);
  assert.ok(dot(torsoAxis, bodyAxis) > 0);
  assert.ok(pose.torso.length > 0);
  assert.ok(
    distance(pose.torso.topLeft, pose.torso.topRight) >
      distance(pose.torso.bottomLeft, pose.torso.bottomRight),
  );

  assertChainLengths(pose.leftArm, config.upperArmLength, config.lowerArmLength);
  assertChainLengths(pose.rightArm, config.upperArmLength, config.lowerArmLength);
});

test("trapezoid torso scales and rotates with the head", () => {
  const rig = new PlayerRigModel(config);
  rig.setManualHeadTarget({ x: 200, y: 170 });

  for (let frame = 0; frame < 180; frame += 1) {
    rig.update(1 / 60);
  }

  const extended = rig.getPose().torso;
  rig.setManualHeadTarget({ x: 520, y: 350 });

  for (let frame = 0; frame < 180; frame += 1) {
    rig.update(1 / 60);
  }

  const compressed = rig.getPose().torso;
  assert.ok(Math.abs(extended.angle - compressed.angle) > 0.2);
  assert.ok(extended.length > compressed.length + 30);
  assert.ok(extended.widthScale > compressed.widthScale);
});

test("extreme manual targets stay constrained without invalid values", () => {
  const rig = new PlayerRigModel(config);
  const targets: Vec2[] = [
    { x: -10_000, y: -10_000 },
    { x: 10_000, y: -10_000 },
    { x: -10_000, y: 10_000 },
    { x: 10_000, y: 10_000 },
    { x: 420, y: 470 },
  ];

  for (const target of targets) {
    rig.setManualHeadTarget(target);

    for (let frame = 0; frame < 180; frame += 1) {
      rig.update(1 / 60);
    }

    assertPoseFinite(rig.getPose());
    assertHeadWithinLimits(rig.getPose());
    assert.ok(rig.getMetrics().stretchRatio < 1);
  }
});

test("fixed feet stay planted while pelvis movement stretches both legs", () => {
  const rig = new PlayerRigModel(config);
  const anchors = rig.getFootAnchors();
  const stretchSamples: number[] = [];
  const pelvisTargets: Vec2[] = [
    { x: 54, y: 38 },
    { x: 1226, y: 38 },
    { x: 1226, y: 682 },
    { x: 54, y: 682 },
  ];

  for (const target of pelvisTargets) {
    rig.setPelvisAnchor(target);
    rig.update(1 / 60);
    const pose = rig.getPose();
    const metrics = rig.getMetrics();
    assertVecNear(pose.leftLeg.end, anchors.left, 0.001);
    assertVecNear(pose.rightLeg.end, anchors.right, 0.001);
    assertNear(metrics.leftFootDrift, 0, 0.001);
    assertNear(metrics.rightFootDrift, 0, 0.001);
    stretchSamples.push(metrics.leftLegStretch, metrics.rightLegStretch);
    assertPoseFinite(pose);
  }

  assert.ok(Math.max(...stretchSamples) - Math.min(...stretchSamples) > 0.25);
});

test("pelvis anchor moves independently from head and foot anchors", () => {
  const rig = new PlayerRigModel(config);
  const initialHead = { ...rig.getPose().head };
  const initialFeet = rig.getFootAnchors();
  const nextAnchor = { x: 450, y: 470 };
  rig.setPelvisAnchor(nextAnchor);
  rig.update(0);

  assertVecNear(rig.getPose().pelvis, nextAnchor, 0.001);
  assertVecNear(rig.getPose().head, initialHead, 0.001);
  assertVecNear(rig.getPose().leftLeg.end, initialFeet.left, 0.001);
  assertVecNear(rig.getPose().rightLeg.end, initialFeet.right, 0.001);
  assertHeadWithinLimits(rig.getPose());
  assertPoseFinite(rig.getPose());
});

function assertHeadWithinLimits(pose: Readonly<PlayerRigPose>): void {
  const maximumDistance = config.torsoMaximumLength;

  assert.ok(pose.head.x >= config.headBounds.minX - 0.1);
  assert.ok(pose.head.x <= config.headBounds.maxX + 0.1);
  assert.ok(pose.head.y >= config.headBounds.minY - 0.1);
  assert.ok(pose.head.y <= config.headBounds.maxY + 0.1);
  assert.ok(distance(pose.pelvis, pose.head) < maximumDistance);
}

function assertPoseFinite(pose: Readonly<PlayerRigPose>): void {
  const points = [
    pose.pelvis,
    pose.head,
    pose.torso.topLeft,
    pose.torso.topRight,
    pose.torso.bottomRight,
    pose.torso.bottomLeft,
    pose.torso.topCenter,
    pose.torso.bottomCenter,
    ...chainPoints(pose.leftArm),
    ...chainPoints(pose.rightArm),
    ...chainPoints(pose.leftLeg),
    ...chainPoints(pose.rightLeg),
  ];

  assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
}

function assertChainLengths(
  chain: TwoBoneChain,
  firstLength: number,
  secondLength: number,
): void {
  assertNear(distance(chain.root, chain.joint), firstLength, 0.001);
  assertNear(distance(chain.joint, chain.end), secondLength, 0.001);
}

function chainPoints(chain: TwoBoneChain): Vec2[] {
  return [chain.root, chain.joint, chain.end];
}

function assertVecNear(actual: Vec2, expected: Vec2, tolerance: number): void {
  assertNear(actual.x, expected.x, tolerance);
  assertNear(actual.y, expected.y, tolerance);
}

function assertNear(actual: number, expected: number, tolerance: number): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}
