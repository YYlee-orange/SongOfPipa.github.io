import assert from "node:assert/strict";
import test from "node:test";
import { DemoBossPhase4AttackModel } from "../src/game/demo/boss/attacks/DemoBossPhase4AttackModel.ts";
import { DEMO_BOSS_PHASE4_ATTACK_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";
import type { DemoSummonKind } from "../src/game/demo/summons/DemoSummonModel.ts";

const context = {
  muzzlePosition: { x: 980, y: 400 },
  playerPosition: { x: 300, y: 420 },
  allowFiring: true,
  activeOldHandguns: 0,
};

test("D3.4 summon selection is balanced and never repeats consecutively", () => {
  const attack = new DemoBossPhase4AttackModel({
    ...DEMO_BOSS_PHASE4_ATTACK_CONFIG,
    initialSummonDelaySeconds: 0,
    summonIntervalSeconds: 0.05,
  });
  const kinds: DemoSummonKind[] = [];
  while (kinds.length < 600) {
    for (const event of attack.update(0.25, context)) {
      assert.equal(event.projectileKind, "summon");
      assert.notEqual(event.summonKind, undefined);
      kinds.push(event.summonKind ?? "creeper");
    }
  }

  for (let index = 1; index < kinds.length; index += 1) {
    assert.notEqual(kinds[index], kinds[index - 1]);
  }
  for (const kind of ["rotating-machine-gun", "old-handgun", "creeper"] as const) {
    const ratio = kinds.filter((candidate) => candidate === kind).length / kinds.length;
    assert.ok(ratio >= 0.28 && ratio <= 0.38, `${kind} ratio was ${ratio}`);
  }
});

test("D3.4 removes old handguns from the pool at the configured cap", () => {
  const attack = new DemoBossPhase4AttackModel({
    ...DEMO_BOSS_PHASE4_ATTACK_CONFIG,
    initialSummonDelaySeconds: 0,
    summonIntervalSeconds: 0.05,
  });
  const cappedContext = {
    ...context,
    activeOldHandguns: DEMO_BOSS_PHASE4_ATTACK_CONFIG.maximumOldHandguns,
  };
  const kinds: DemoSummonKind[] = [];
  while (kinds.length < 80) {
    kinds.push(
      ...attack
        .update(0.25, cappedContext)
        .map((event) => event.summonKind ?? "old-handgun"),
    );
  }
  assert.equal(kinds.includes("old-handgun"), false);
  for (let index = 1; index < kinds.length; index += 1) {
    assert.notEqual(kinds[index], kinds[index - 1]);
  }
});

test("D3.4 summon timer freezes while boss firing is paused", () => {
  const attack = new DemoBossPhase4AttackModel({
    ...DEMO_BOSS_PHASE4_ATTACK_CONFIG,
    initialSummonDelaySeconds: 1,
  });
  attack.update(0.25, { ...context, allowFiring: false });
  assert.equal(attack.getSnapshot().fireRemaining, 1);
  assert.deepEqual(attack.update(0.75, context), []);
  assert.equal(attack.getSnapshot().fireRemaining, 0.75);
});
