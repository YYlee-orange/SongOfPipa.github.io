import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossPhase3AttackModel } from "../src/game/demo/boss/attacks/DemoBossPhase3AttackModel.ts";
import { DEMO_BOSS_PHASE3_ATTACK_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const context = {
  muzzlePosition: { x: 1000, y: 300 },
  playerPosition: { x: 260, y: 420 },
  allowFiring: true,
};

test("D3.3 starts with one simultaneous six-to-nine pellet shotgun blast", () => {
  assert.equal(DEMO_BOSS_PHASE3_ATTACK_CONFIG.shotgunMinimumPellets, 6);
  assert.equal(DEMO_BOSS_PHASE3_ATTACK_CONFIG.shotgunMaximumPellets, 9);
  assert.equal(DEMO_BOSS_PHASE3_ATTACK_CONFIG.shotgunIntervalSeconds, 2.6);
  const attack = new DemoBossPhase3AttackModel({
    ...DEMO_BOSS_PHASE3_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
  });
  const shots = attack.update(0, context);

  assert.ok(shots.length >= 6 && shots.length <= 9);
  assert.equal(shots.every((shot) => shot.projectileKind === "bullet"), true);
  assert.equal(shots.every((shot) => shot.speed === DEMO_BOSS_PHASE3_ATTACK_CONFIG.shotgunBulletSpeed), true);
  assert.equal(shots.every((shot) => shot.origin.x === context.muzzlePosition.x), true);
  assert.equal(shots.filter((shot) => shot.recoilImpulse).length, 1);

  const baseAngle = Math.atan2(
    context.playerPosition.y - context.muzzlePosition.y,
    context.playerPosition.x - context.muzzlePosition.x,
  );
  const offsets = shots.map((shot) =>
    normalizedAngle(
      Math.atan2(
        shot.target.y - shot.origin.y,
        shot.target.x - shot.origin.x,
      ) - baseAngle,
    ),
  );
  assert.ok(Math.abs(Math.min(...offsets) + Math.max(...offsets)) < 0.000001);
});

test("D3.3 checks switching after two shotgun blasts and one rocket", () => {
  const attack = new DemoBossPhase3AttackModel({
    ...DEMO_BOSS_PHASE3_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    shotgunIntervalSeconds: 0.1,
    rocketModeDelaySeconds: 0.1,
    rocketChargeSeconds: 0.5,
    switchChance: 1,
  });

  assert.ok(attack.update(0, context).length >= 6);
  assert.ok(attack.update(0.1, context).length >= 6);
  let snapshot = attack.getSnapshot();
  assert.equal(snapshot.weaponLabel, "火箭发射器");
  assert.equal(snapshot.switchChecks, 1);
  assert.equal(snapshot.modeAttackCount, 0);

  assert.deepEqual(attack.update(0.1, context), []);
  snapshot = attack.getSnapshot();
  assert.equal(snapshot.stateLabel, "火箭蓄力");
  assert.equal(snapshot.pauseBossMovement, true);

  attack.update(0.25, context);
  const rocketShots = [
    ...attack.update(0.24, context),
    ...attack.update(0.01, context),
  ];
  assert.equal(rocketShots.length, 1);
  assert.equal(rocketShots[0].projectileKind, "rocket");
  snapshot = attack.getSnapshot();
  assert.equal(snapshot.weaponLabel, "霰弹枪");
  assert.equal(snapshot.switchChecks, 2);
  assert.equal(snapshot.modeAttackCount, 0);
});

test("D3.3 failed switch checks reset the current weapon attack counter", () => {
  const attack = new DemoBossPhase3AttackModel({
    ...DEMO_BOSS_PHASE3_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    shotgunIntervalSeconds: 0.05,
    switchChance: 0,
  });

  attack.update(0, context);
  attack.update(0.05, context);
  const snapshot = attack.getSnapshot();
  assert.equal(snapshot.weaponLabel, "霰弹枪");
  assert.equal(snapshot.modeAttackCount, 0);
  assert.equal(snapshot.lastSwitchResult, "stayed");
  assert.equal(snapshot.switchChecks, 1);
});

test("D3.3 shotgun pellets independently converge near twenty percent special", () => {
  const attack = new DemoBossPhase3AttackModel({
    ...DEMO_BOSS_PHASE3_ATTACK_CONFIG,
    initialFireDelaySeconds: 0,
    shotgunIntervalSeconds: 0.05,
    switchChance: 0,
  });
  while (attack.getSnapshot().shotsFired < 2_000) {
    attack.update(0.25, context);
  }
  const snapshot = attack.getSnapshot();
  const ratio = snapshot.specialShotsFired / snapshot.shotsFired;
  assert.ok(ratio >= 0.17 && ratio <= 0.23, `special ratio was ${ratio}`);
});

test("D3.3 debug pattern advance exposes the rocket charge directly", () => {
  const attack = new DemoBossPhase3AttackModel(DEMO_BOSS_PHASE3_ATTACK_CONFIG);
  assert.equal(attack.debugAdvancePattern(), true);
  const snapshot = attack.getSnapshot();
  assert.equal(snapshot.weaponLabel, "火箭发射器");
  assert.equal(snapshot.stateLabel, "火箭蓄力");
  assert.equal(snapshot.pauseBossMovement, true);
});

function normalizedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
