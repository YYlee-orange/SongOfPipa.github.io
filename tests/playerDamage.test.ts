import assert from "node:assert/strict";
import test from "node:test";
import {
  PlayerDamageModel,
  type PlayerDamageConfig,
} from "../src/game/entities/player/PlayerDamageModel.ts";

const config: PlayerDamageConfig = {
  maximumHealth: 3,
  hitRadius: 12,
  invulnerabilitySeconds: 1,
};

test("player starts healthy and vulnerable", () => {
  const player = new PlayerDamageModel(config);
  const snapshot = player.getSnapshot();
  assert.equal(snapshot.health, 3);
  assert.equal(snapshot.hitRadius, 12);
  assert.equal(snapshot.invulnerable, false);
  assert.equal(snapshot.defeated, false);
});

test("accepted damage starts invulnerability and blocks repeated hits", () => {
  const player = new PlayerDamageModel(config);
  assert.equal(player.tryTakeDamage(), "damaged");
  assert.equal(player.tryTakeDamage(), "ignored");
  assert.equal(player.getSnapshot().health, 2);
  assert.equal(player.getSnapshot().invulnerable, true);
});

test("damage is accepted again after invulnerability expires", () => {
  const player = new PlayerDamageModel(config);
  player.tryTakeDamage();
  player.update(0.75);
  assert.equal(player.tryTakeDamage(), "ignored");
  player.update(0.26);
  assert.equal(player.tryTakeDamage(), "damaged");
  assert.equal(player.getSnapshot().health, 1);
});

test("third accepted hit defeats the player and reset restores all state", () => {
  const player = new PlayerDamageModel(config);
  assert.equal(player.tryTakeDamage(), "damaged");
  player.update(1);
  assert.equal(player.tryTakeDamage(), "damaged");
  player.update(1);
  assert.equal(player.tryTakeDamage(), "defeated");
  assert.equal(player.tryTakeDamage(), "ignored");
  assert.equal(player.getSnapshot().defeated, true);

  player.reset();
  const snapshot = player.getSnapshot();
  assert.equal(snapshot.health, 3);
  assert.equal(snapshot.invulnerable, false);
  assert.equal(snapshot.defeated, false);
});
