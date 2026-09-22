import assert from "node:assert/strict";
import test from "node:test";
import {
  PlayerParryModel,
  type PlayerParryConfig,
} from "../src/game/entities/player/PlayerParryModel.ts";

const config: PlayerParryConfig = {
  radius: 70,
  activeSeconds: 0.14,
  failureRecoverySeconds: 0.18,
  feedbackSeconds: 0.16,
};

test("parry input opens the configured local active window", () => {
  const parry = new PlayerParryModel(config);
  assert.equal(parry.tryStart(), true);
  const snapshot = parry.getSnapshot();
  assert.equal(snapshot.state, "active");
  assert.equal(snapshot.radius, 70);
  assert.equal(snapshot.activeRemaining, 0.14);
});

test("an empty parry window enters failure recovery", () => {
  const parry = new PlayerParryModel(config);
  parry.tryStart();
  parry.update(0.15);
  assert.equal(parry.getSnapshot().state, "recovery");
  assert.equal(parry.getSnapshot().feedback, "miss");
  assert.equal(parry.tryStart(), false);
  parry.update(0.19);
  assert.equal(parry.getSnapshot().state, "ready");
});

test("successful parry immediately returns to ready", () => {
  const parry = new PlayerParryModel(config);
  parry.tryStart();
  assert.equal(parry.trySucceed(), true);
  assert.equal(parry.getSnapshot().state, "ready");
  assert.equal(parry.getSnapshot().feedback, "success");
  assert.equal(parry.getSnapshot().feedbackProgress, 0);
  parry.update(config.feedbackSeconds / 2);
  assert.ok(Math.abs(parry.getSnapshot().feedbackProgress - 0.5) < 1e-9);
  assert.equal(parry.tryStart(), true);
});

test("damage interrupts an active parry into recovery", () => {
  const parry = new PlayerParryModel(config);
  parry.tryStart();
  parry.interruptForDamage();
  assert.equal(parry.getSnapshot().state, "recovery");
  assert.equal(parry.getSnapshot().feedback, "miss");
});
