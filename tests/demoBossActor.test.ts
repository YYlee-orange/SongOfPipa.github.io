import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossActorModel } from "../src/game/demo/boss/DemoBossActorModel.ts";
import {
  DEMO_BOSS_ACTOR_CONFIG,
  DEMO_BOSS_PHASE_CONFIGS,
} from "../src/game/demo/boss/demoBossPhaseConfig.ts";

function createActor(phaseIndex = 0): DemoBossActorModel {
  const phase = DEMO_BOSS_PHASE_CONFIGS[phaseIndex];
  return new DemoBossActorModel(DEMO_BOSS_ACTOR_CONFIG, {
    movementSpeed: phase.movementSpeed,
    randomSeed: phase.randomSeed,
  });
}

test("D3.0 actor movement is deterministic and stays in the right-side bounds", () => {
  const first = createActor(2);
  const second = createActor(2);
  const bounds = DEMO_BOSS_ACTOR_CONFIG.movementBounds;

  for (let index = 0; index < 1_000; index += 1) {
    first.update(0.1);
    second.update(0.1);
    assert.deepEqual(first.getSnapshot(), second.getSnapshot());
    const position = first.getSnapshot().position;
    assert.ok(position.x >= bounds.minX && position.x <= bounds.maxX);
    assert.ok(position.y >= bounds.minY && position.y <= bounds.maxY);
  }
});

test("D3.0 exposes only the wandering head as a hit target", () => {
  const actor = createActor();
  const before = actor.getSnapshot();
  const colliders = actor.getHitColliders();
  const ratio = before.headHitRadius / before.headVisibleRadius;

  assert.equal(colliders.length, 1);
  assert.deepEqual(colliders[0].center, before.headPosition);
  assert.equal(colliders[0].radius, before.headHitRadius);
  assert.ok(ratio >= 0.75 && ratio <= 0.8);

  actor.update(0.25, false);
  const after = actor.getSnapshot();
  assert.notDeepEqual(after.headWanderOffset, before.headWanderOffset);
  assert.notDeepEqual(after.weaponWanderOffset, before.weaponWanderOffset);
  assert.deepEqual(actor.getHitColliders()[0].center, after.headPosition);
});

test("D3.0 keeps the head and weapon separated while both wander", () => {
  const actor = createActor(3);

  for (let index = 0; index < 2_000; index += 1) {
    actor.update(1 / 120, false);
    const snapshot = actor.getSnapshot();
    assert.ok(
      snapshot.weaponPosition.y - snapshot.headPosition.y + 1e-9 >=
        DEMO_BOSS_ACTOR_CONFIG.minimumHeadWeaponVerticalSeparation,
    );
  }
});

test("D3.0 recoil stacks to its cap and springs back to rest", () => {
  const actor = createActor(1);

  for (let index = 0; index < 10; index += 1) {
    actor.triggerWeaponRecoil();
  }
  assert.equal(
    actor.getSnapshot().weaponRecoilVelocity,
    DEMO_BOSS_ACTOR_CONFIG.weaponRecoil.maximumVelocity,
  );

  actor.update(1 / 60, false);
  assert.ok(actor.getSnapshot().weaponRecoilOffset > 0);
  assert.ok(
    actor.getSnapshot().weaponRecoilOffset <=
      DEMO_BOSS_ACTOR_CONFIG.weaponRecoil.maximumOffset,
  );

  for (let index = 0; index < 600; index += 1) {
    actor.update(1 / 120, false);
  }
  assert.equal(actor.getSnapshot().weaponRecoilOffset, 0);
  assert.equal(actor.getSnapshot().weaponRecoilVelocity, 0);
});

test("D3.0 hit feedback expires without affecting movement state", () => {
  const actor = createActor();
  actor.triggerHitFeedback();
  assert.ok(actor.getSnapshot().hitFlashRemaining > 0);
  actor.update(DEMO_BOSS_ACTOR_CONFIG.hitFlashSeconds, false);
  assert.equal(actor.getSnapshot().hitFlashRemaining, 0);
});
