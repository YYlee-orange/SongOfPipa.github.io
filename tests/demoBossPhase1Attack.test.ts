import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossPhase1AttackModel } from "../src/game/demo/boss/attacks/DemoBossPhase1AttackModel.ts";
import { DEMO_BOSS_PHASE1_ATTACK_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const baseContext = {
  muzzlePosition: { x: 1000, y: 300 },
  playerPosition: { x: 300, y: 400 },
  allowFiring: true,
};

test("D3.1 revolver fires slowly from the live muzzle at the live player position", () => {
  const attack = new DemoBossPhase1AttackModel(
    DEMO_BOSS_PHASE1_ATTACK_CONFIG,
  );

  assert.deepEqual(attack.update(0.2, baseContext), []);
  assert.deepEqual(attack.update(0.2, baseContext), []);
  assert.deepEqual(attack.update(0.2, baseContext), []);
  const [first] = attack.update(0.2, baseContext);
  assert.deepEqual(first.origin, baseContext.muzzlePosition);
  assert.deepEqual(first.target, baseContext.playerPosition);
  assert.equal(first.speed, DEMO_BOSS_PHASE1_ATTACK_CONFIG.bulletSpeed);

  for (let index = 0; index < 5; index += 1) {
    assert.deepEqual(attack.update(0.2, baseContext), []);
  }
  const movedContext = {
    ...baseContext,
    muzzlePosition: { x: 1010, y: 320 },
    playerPosition: { x: 220, y: 180 },
  };
  const [second] = attack.update(0.2, movedContext);
  assert.deepEqual(second.origin, movedContext.muzzlePosition);
  assert.deepEqual(second.target, movedContext.playerPosition);
});

test("D3.1 firing pauses without consuming the revolver cooldown", () => {
  const attack = new DemoBossPhase1AttackModel(
    DEMO_BOSS_PHASE1_ATTACK_CONFIG,
  );
  const paused = { ...baseContext, allowFiring: false };

  for (let index = 0; index < 8; index += 1) {
    assert.deepEqual(attack.update(0.25, paused), []);
  }
  assert.equal(
    attack.getSnapshot().fireRemaining,
    DEMO_BOSS_PHASE1_ATTACK_CONFIG.initialFireDelaySeconds,
  );

  for (let index = 0; index < 4; index += 1) {
    attack.update(0.2, baseContext);
  }
  assert.equal(attack.getSnapshot().shotsFired, 1);
});

test("D3.1 every revolver shot independently converges near twenty percent special", () => {
  const attack = new DemoBossPhase1AttackModel({
    ...DEMO_BOSS_PHASE1_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    fireIntervalSeconds: 0.05,
    tutorialHints: [],
  });

  while (attack.getSnapshot().shotsFired < 2_000) {
    attack.update(0.25, baseContext);
  }

  const snapshot = attack.getSnapshot();
  const ratio = snapshot.specialShotsFired / snapshot.shotsFired;
  assert.ok(ratio >= 0.17 && ratio <= 0.23, `special ratio was ${ratio}`);
});

test("D3.1 tutorial hints advance without pausing shots", () => {
  const attack = new DemoBossPhase1AttackModel(
    DEMO_BOSS_PHASE1_ATTACK_CONFIG,
  );
  assert.match(attack.getSnapshot().tutorialMessage, /移动屁股/);

  let emitted = 0;
  for (let index = 0; index < 20; index += 1) {
    emitted += attack.update(0.25, baseContext).length;
  }
  assert.ok(emitted > 0);
  assert.match(attack.getSnapshot().tutorialMessage, /特殊弹/);
});
