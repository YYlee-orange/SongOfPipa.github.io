import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossPhase2AttackModel } from "../src/game/demo/boss/attacks/DemoBossPhase2AttackModel.ts";
import { DEMO_BOSS_PHASE2_ATTACK_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const baseContext = {
  muzzlePosition: { x: 1000, y: 300 },
  playerPosition: { x: 300, y: 400 },
  allowFiring: true,
};

test("D3.2 AK47 chooses five to ten shots for every burst", () => {
  const attack = new DemoBossPhase2AttackModel({
    ...DEMO_BOSS_PHASE2_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    burstShotIntervalSeconds: 0.05,
    burstPauseSeconds: 0.05,
  });

  const observedSizes = new Set<number>();
  let observedBursts = 0;
  while (attack.getSnapshot().burstsCompleted < 60) {
    attack.update(0.05, baseContext);
    const after = attack.getSnapshot();
    if (after.burstsCompleted > observedBursts) {
      observedSizes.add(after.burstSize ?? 0);
      observedBursts = after.burstsCompleted;
    }
  }

  assert.ok([...observedSizes].every((size) => size >= 5 && size <= 10));
  assert.ok(observedSizes.size > 1);
});

test("D3.2 every burst shot reacquires the live muzzle and player target", () => {
  const attack = new DemoBossPhase2AttackModel({
    ...DEMO_BOSS_PHASE2_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    burstShotIntervalSeconds: 0.1,
  });

  const [first] = attack.update(0, baseContext);
  assert.deepEqual(first.origin, baseContext.muzzlePosition);
  assert.deepEqual(first.target, baseContext.playerPosition);

  const movedContext = {
    ...baseContext,
    muzzlePosition: { x: 980, y: 340 },
    playerPosition: { x: 240, y: 180 },
  };
  const [second] = attack.update(0.1, movedContext);
  assert.deepEqual(second.origin, movedContext.muzzlePosition);
  assert.deepEqual(second.target, movedContext.playerPosition);
  assert.equal(second.speed, DEMO_BOSS_PHASE2_ATTACK_CONFIG.bulletSpeed);
});

test("D3.2 AK47 exposes a real ceasefire interval between bursts", () => {
  const attack = new DemoBossPhase2AttackModel({
    ...DEMO_BOSS_PHASE2_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    burstShotIntervalSeconds: 0.05,
    burstPauseSeconds: 1,
    minimumBurstShots: 5,
    maximumBurstShots: 5,
  });

  let emitted = 0;
  while (attack.getSnapshot().stateLabel === "连射中") {
    emitted += attack.update(0.05, baseContext).length;
  }
  assert.equal(emitted, 5);
  assert.equal(attack.getSnapshot().burstsCompleted, 1);

  for (let index = 0; index < 19; index += 1) {
    assert.deepEqual(attack.update(0.05, baseContext), []);
  }
  assert.equal(attack.getSnapshot().stateLabel, "停火间歇");
  assert.equal(attack.update(0.05, baseContext).length, 1);
  assert.equal(attack.getSnapshot().stateLabel, "连射中");
});

test("D3.2 fire pause does not consume burst or ceasefire timing", () => {
  const attack = new DemoBossPhase2AttackModel(DEMO_BOSS_PHASE2_ATTACK_CONFIG);
  const before = attack.getSnapshot();
  const paused = { ...baseContext, allowFiring: false };

  for (let index = 0; index < 8; index += 1) {
    assert.deepEqual(attack.update(0.25, paused), []);
  }

  assert.deepEqual(attack.getSnapshot(), before);
});

test("D3.2 every AK47 shot independently converges near twenty percent special", () => {
  const attack = new DemoBossPhase2AttackModel({
    ...DEMO_BOSS_PHASE2_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    burstShotIntervalSeconds: 0.05,
    burstPauseSeconds: 0.05,
  });

  while (attack.getSnapshot().shotsFired < 2_000) {
    attack.update(0.25, baseContext);
  }

  const snapshot = attack.getSnapshot();
  const ratio = snapshot.specialShotsFired / snapshot.shotsFired;
  assert.ok(ratio >= 0.17 && ratio <= 0.23, `special ratio was ${ratio}`);
});
