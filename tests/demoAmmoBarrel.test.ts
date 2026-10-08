import assert from "node:assert/strict";
import test from "node:test";
import { DemoAmmoBarrelModel } from "../src/game/demo/barrels/DemoAmmoBarrelModel.ts";
import { DEMO_AMMO_BARREL_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

const player = { x: 120, y: 360 };
const boss = { x: 1080, y: 360 };

test("D3.5 keeps at most three barrels and pauses the spawn timer at cap", () => {
  assert.equal(DEMO_AMMO_BARREL_CONFIG.lifetimeSeconds, 20);
  assert.equal(DEMO_AMMO_BARREL_CONFIG.minimumBurstBullets, 13);
  assert.equal(DEMO_AMMO_BARREL_CONFIG.maximumBurstBullets, 17);
  assert.equal(DEMO_AMMO_BARREL_CONFIG.minimumSpawnIntervalSeconds, 3);
  assert.equal(DEMO_AMMO_BARREL_CONFIG.maximumSpawnIntervalSeconds, 5);
  const barrels = new DemoAmmoBarrelModel({
    ...DEMO_AMMO_BARREL_CONFIG,
    initialSpawnDelaySeconds: 0,
  });
  assert.notEqual(barrels.forceSpawn(player, boss), null);
  assert.notEqual(barrels.forceSpawn(player, boss), null);
  assert.notEqual(barrels.forceSpawn(player, boss), null);
  assert.equal(barrels.forceSpawn(player, boss), null);
  const before = barrels.getStats().spawnRemaining;
  barrels.update(0.25, {
    allowProgress: true,
    playerPosition: player,
    bossPosition: boss,
    activeLaser: null,
  });
  assert.equal(barrels.getStats().active, 3);
  assert.equal(barrels.getStats().spawnTimerPausedAtCap, true);
  assert.equal(barrels.getStats().spawnRemaining, before);
});

test("D3.5 basic laser exposure detonates a barrel into 13-17 radial special bullets", () => {
  const barrels = new DemoAmmoBarrelModel({
    ...DEMO_AMMO_BARREL_CONFIG,
    initialSpawnDelaySeconds: 999,
    laserExposureSeconds: 0.5,
    burstWarningSeconds: 0.25,
  });
  barrels.forceSpawn(player, boss);
  const barrel = barrels.getSnapshots()[0];
  const beam = {
    attackId: 1,
    kind: "basic" as const,
    origin: { x: 1200, y: barrel.position.y },
    end: { x: 0, y: barrel.position.y },
    width: 180,
    angle: Math.PI,
    active: true,
    telegraph: false,
  };
  const context = {
    allowProgress: true,
    playerPosition: player,
    bossPosition: boss,
    activeLaser: beam,
  };
  barrels.update(0.25, context);
  barrels.update(0.25, context);
  assert.equal(barrels.getSnapshots()[0].state, "burst-warning");
  const events = barrels.update(0.25, context);
  assert.ok(events.bullets.length >= 13 && events.bullets.length <= 17);
  assert.equal(events.burst.length, 1);
  assert.equal(barrels.getStats().active, 0);

  const center = barrel.position;
  for (const bullet of events.bullets) {
    assert.ok(
      Math.hypot(bullet.origin.x - center.x, bullet.origin.y - center.y) >= 53.999,
    );
  }
});

test("D3.5 uncharged barrel becomes a dud without emitting bullets", () => {
  const barrels = new DemoAmmoBarrelModel({
    ...DEMO_AMMO_BARREL_CONFIG,
    initialSpawnDelaySeconds: 999,
    lifetimeSeconds: 0.25,
    dudVisualSeconds: 0.25,
  });
  barrels.forceSpawn(player, boss);
  const context = {
    allowProgress: true,
    playerPosition: player,
    bossPosition: boss,
    activeLaser: null,
  };
  const dudEvent = barrels.update(0.25, context);
  assert.equal(dudEvent.dud.length, 1);
  assert.equal(barrels.getSnapshots()[0].state, "dud");
  const removed = barrels.update(0.25, context);
  assert.equal(removed.bullets.length, 0);
  assert.equal(barrels.getStats().active, 0);
});

test("D3.5 debug burst control keeps the warning frame before emitting", () => {
  const barrels = new DemoAmmoBarrelModel({
    ...DEMO_AMMO_BARREL_CONFIG,
    initialSpawnDelaySeconds: 999,
  });
  barrels.forceSpawn(player, boss);
  assert.notEqual(barrels.forceBurstFirst(), null);
  assert.equal(barrels.getSnapshots()[0].state, "burst-warning");
  const events = barrels.update(0.25, {
    allowProgress: true,
    playerPosition: player,
    bossPosition: boss,
    activeLaser: null,
  });
  assert.ok(events.bullets.length >= 13 && events.bullets.length <= 17);
});

test("D3.5 ultimate laser immediately primes a barrel regardless of exposure threshold", () => {
  const barrels = new DemoAmmoBarrelModel({
    ...DEMO_AMMO_BARREL_CONFIG,
    initialSpawnDelaySeconds: 999,
    laserExposureSeconds: 99,
  });
  barrels.forceSpawn(player, boss);
  const barrel = barrels.getSnapshots()[0];
  barrels.update(0.01, {
    allowProgress: true,
    playerPosition: player,
    bossPosition: boss,
    activeLaser: {
      attackId: 2,
      kind: "ultimate",
      origin: { x: 1200, y: barrel.position.y },
      end: { x: 0, y: barrel.position.y },
      width: 180,
      angle: Math.PI,
      active: true,
      telegraph: false,
    },
  });
  const primed = barrels.getSnapshots()[0];
  assert.equal(primed.state, "burst-warning");
  assert.equal(primed.chargeProgress, 1);
});
