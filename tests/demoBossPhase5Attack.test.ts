import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossPhase5AttackModel } from "../src/game/demo/boss/attacks/DemoBossPhase5AttackModel.ts";
import { DEMO_BOSS_PHASE5_ATTACK_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const context = {
  bossPosition: { x: 1080, y: 360 },
  muzzlePosition: { x: 980, y: 360 },
  playerPosition: { x: 260, y: 360 },
  allowFiring: true,
};

function advanceUntil(
  attack: DemoBossPhase5AttackModel,
  predicate: (state: ReturnType<DemoBossPhase5AttackModel["getSnapshot"]>) => boolean,
): ReturnType<DemoBossPhase5AttackModel["getSnapshot"]> {
  for (let index = 0; index < 100; index += 1) {
    const snapshot = attack.getSnapshot();
    if (predicate(snapshot)) {
      return snapshot;
    }
    attack.update(0.25, context);
  }
  throw new Error("phase 5 attack did not reach expected state");
}

test("D3.5 basic laser tracks, locks the player height and freezes through charge", () => {
  assert.equal(DEMO_BOSS_PHASE5_ATTACK_CONFIG.basicRecoverySeconds, 0.55);
  assert.equal(DEMO_BOSS_PHASE5_ATTACK_CONFIG.ultimateRecoverySeconds, 0.85);
  const attack = new DemoBossPhase5AttackModel(DEMO_BOSS_PHASE5_ATTACK_CONFIG);
  assert.equal(attack.getSnapshot().laserState, "basic-tracking");

  attack.update(0.1, context);
  let snapshot = attack.getSnapshot();
  assert.equal(snapshot.laserState, "basic-charge");
  assert.equal(snapshot.lockedLaserY, 360);
  assert.equal(snapshot.pauseBossMovement, true);

  const remaining = snapshot.fireRemaining;
  attack.update(0.25, { ...context, allowFiring: false });
  assert.equal(attack.getSnapshot().fireRemaining, remaining);

  snapshot = advanceUntil(attack, (candidate) => candidate.laserActive === true);
  assert.equal(snapshot.laserMode, "basic");
  assert.equal(snapshot.laserState, "basic-active");
});

test("D3.5 forces an ultimate after three completed basics and resets the counter", () => {
  const attack = new DemoBossPhase5AttackModel({
    ...DEMO_BOSS_PHASE5_ATTACK_CONFIG,
    ultimateChance: 0,
  });

  for (let completed = 0; completed < 3; completed += 1) {
    attack.debugTriggerBasic();
    advanceUntil(
      attack,
      (candidate) => candidate.laserState === "recovery" &&
        candidate.consecutiveBasicAttacks === completed + 1,
    );
  }
  advanceUntil(
    attack,
    (candidate) => candidate.laserMode === "ultimate" &&
      candidate.laserState === "ultimate-positioning",
  );
  const active = advanceUntil(
    attack,
    (candidate) => candidate.laserState === "ultimate-active",
  );
  assert.equal(active.consecutiveBasicAttacks, 0);
  assert.equal(active.ultimateAttacksFired, 1);
});

test("D3.5 debug controls can force the ultimate and swap its start corner", () => {
  const attack = new DemoBossPhase5AttackModel(DEMO_BOSS_PHASE5_ATTACK_CONFIG);
  assert.equal(attack.debugTriggerUltimate(), true);
  const firstCorner = attack.getSnapshot().sweepStartCorner;
  assert.equal(attack.debugToggleSweepStart(), true);
  assert.notEqual(attack.getSnapshot().sweepStartCorner, firstCorner);
  assert.equal(attack.debugCycleBasicCount(), true);
  assert.equal(attack.getSnapshot().consecutiveBasicAttacks, 1);
});
