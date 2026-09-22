import assert from "node:assert/strict";
import test from "node:test";
import {
  PlayerAbilityModel,
  type PlayerAbilityConfig,
} from "../src/game/entities/player/PlayerAbilityModel.ts";

const config: PlayerAbilityConfig = {
  maximumEnergy: 10,
  boostCost: 2,
  boostDurationSeconds: 3.5,
  feedbackSeconds: 0.6,
  ultimateChargeSeconds: 2,
  ultimateAbsorbSeconds: 0.85,
  ultimateFiringSeconds: 2.9,
  ultimateRecoverySeconds: 0.75,
};

test("energy gain is clamped to the configured maximum", () => {
  const ability = new PlayerAbilityModel(config);
  assert.equal(ability.gainEnergy(1), 1);
  assert.equal(ability.gainEnergy(20), 9);
  assert.equal(ability.getSnapshot().energy, 10);
});

test("boost cannot activate without two energy", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(1);
  assert.equal(ability.tryActivateBoost(), "insufficient");
  assert.equal(ability.getSnapshot().energy, 1);
  assert.equal(ability.getSnapshot().boosted, false);
});

test("boost spends energy and expires after its duration", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(3);
  assert.equal(ability.tryActivateBoost(), "activated");
  assert.equal(ability.getSnapshot().energy, 1);
  assert.equal(ability.getSnapshot().boosted, true);
  ability.update(1);
  ability.update(1);
  ability.update(1);
  ability.update(0.49);
  assert.equal(ability.getSnapshot().boosted, true);
  ability.update(0.02);
  assert.equal(ability.getSnapshot().boosted, false);
});

test("repeated input does not spend or refresh an active boost", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(4);
  ability.tryActivateBoost();
  ability.update(0.5);
  const remaining = ability.getSnapshot().boostRemaining;
  assert.equal(ability.tryActivateBoost(), "already-active");
  assert.equal(ability.getSnapshot().energy, 2);
  assert.equal(ability.getSnapshot().boostRemaining, remaining);
});

test("accepted damage can cancel boost immediately", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(2);
  ability.tryActivateBoost();
  ability.cancelBoost();
  assert.equal(ability.getSnapshot().boosted, false);
});

test("a short full-energy press still activates the two-point boost", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(10);
  ability.beginSkillPress();
  ability.update(0.2, true);
  assert.equal(ability.getSnapshot().ultimateState, "charging");
  ability.releaseSkillPress();
  assert.equal(ability.getSnapshot().ultimateState, "idle");
  assert.equal(ability.getSnapshot().boosted, true);
  assert.equal(ability.getSnapshot().energy, 8);
});

test("holding at full energy starts the ultimate and requests one volley", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(10);
  ability.beginSkillPress();
  const halfway = ability.update(1, true);
  assert.equal(halfway.ultimateStarted, false);
  assert.equal(ability.getSnapshot().ultimateState, "charging");
  const start = ability.update(1.01, true);
  assert.equal(start.ultimateStarted, true);
  assert.equal(start.volleyRequested, false);
  assert.equal(start.damageRequested, false);
  assert.equal(ability.getSnapshot().energy, 0);
  assert.equal(ability.getSnapshot().ultimateState, "absorbing");
  assert.equal(ability.getSnapshot().ultimateInvulnerable, true);
  assert.equal(ability.getSnapshot().bossFirePaused, true);

  const volley = ability.update(0.86, false);
  assert.equal(volley.volleyRequested, true);
  assert.equal(ability.getSnapshot().ultimateState, "firing");
  ability.update(1);
  ability.update(1);
  const impact = ability.update(0.91);
  assert.equal(impact.volleyRequested, false);
  assert.equal(impact.damageRequested, true);
  assert.equal(ability.getSnapshot().ultimateState, "recovery");
  ability.update(0.76);
  assert.equal(ability.getSnapshot().ultimateState, "idle");
  assert.equal(ability.getSnapshot().ultimateInvulnerable, false);
});

test("damage cancels full-energy charging before energy is consumed", () => {
  const ability = new PlayerAbilityModel(config);
  ability.gainEnergy(10);
  ability.beginSkillPress();
  ability.update(0.3, true);
  assert.equal(ability.getSnapshot().chargeProtectionActive, true);
  ability.cancelForDamage();
  assert.equal(ability.getSnapshot().ultimateState, "idle");
  assert.equal(ability.getSnapshot().energy, 10);
});
