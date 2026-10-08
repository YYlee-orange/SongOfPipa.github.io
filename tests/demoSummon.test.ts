import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_SUMMON_CONFIG } from "../src/game/demo/boss/demoBossPhaseConfig.ts";
import {
  DemoSummonModel,
  type DemoSummonConfig,
} from "../src/game/demo/summons/DemoSummonModel.ts";

const quickConfig: DemoSummonConfig = {
  ...DEMO_SUMMON_CONFIG,
  throwDurationSeconds: 0.1,
  rotatingMachineGun: {
    ...DEMO_SUMMON_CONFIG.rotatingMachineGun,
    lifetimeSeconds: 0.5,
    fireIntervalSeconds: 0.1,
    initialFireDelaySeconds: 0,
  },
  oldHandgun: {
    ...DEMO_SUMMON_CONFIG.oldHandgun,
    fireIntervalSeconds: 0.2,
    initialFireDelaySeconds: 0,
  },
  creeper: {
    ...DEMO_SUMMON_CONFIG.creeper,
    throwDistance: 100,
    trackingSpeed: 200,
    triggerDistance: 40,
    castSeconds: 0.2,
  },
};

test("D3.4 rotating machine gun deploys, rotates, fires and self-destructs", () => {
  const summons = new DemoSummonModel(quickConfig);
  summons.spawn("rotating-machine-gun", { x: 1000, y: 360 }, { x: 200, y: 360 });
  assert.equal(summons.getSnapshots()[0].lifecycle, "thrown");
  assert.deepEqual(summons.update(0.05, { x: 200, y: 360 }, true).bullets, []);
  summons.update(0.05, { x: 200, y: 360 }, true);
  const deployed = summons.getSnapshots()[0];
  assert.equal(deployed.lifecycle, "deployed");

  const first = summons.update(0.1, { x: 200, y: 360 }, true);
  assert.ok(first.bullets.length >= 1);
  assert.equal(first.bullets[0].sourceKind, "rotating-machine-gun");
  assert.notEqual(summons.getSnapshots()[0].angle, deployed.angle);

  summons.update(0.25, { x: 200, y: 360 }, true);
  summons.update(0.25, { x: 200, y: 360 }, true);
  assert.equal(summons.getStats().rotatingMachineGuns, 0);
});

test("D3.4 machine gun bullets independently converge near twenty percent special", () => {
  const summons = new DemoSummonModel({
    ...quickConfig,
    rotatingMachineGun: {
      ...quickConfig.rotatingMachineGun,
      lifetimeSeconds: 24,
      fireIntervalSeconds: 0.05,
    },
  });
  summons.spawn("rotating-machine-gun", { x: 1000, y: 360 }, { x: 200, y: 360 });
  summons.update(0.1, { x: 200, y: 360 }, true);
  let total = 0;
  let special = 0;
  for (let index = 0; index < 96; index += 1) {
    const events = summons.update(0.25, { x: 200, y: 360 }, true);
    total += events.bullets.length;
    special += events.bullets.filter((bullet) => bullet.type === "special").length;
  }
  const ratio = special / total;
  assert.ok(total >= 450);
  assert.ok(ratio >= 0.17 && ratio <= 0.23, `special ratio was ${ratio}`);
});

test("D3.4 old handgun persists, respects the cap and can be destroyed", () => {
  const summons = new DemoSummonModel({ ...quickConfig, maximumOldHandguns: 2 });
  const first = summons.spawn("old-handgun", { x: 1000, y: 300 }, { x: 200, y: 300 });
  const second = summons.spawn("old-handgun", { x: 1000, y: 420 }, { x: 200, y: 420 });
  assert.notEqual(first, null);
  assert.notEqual(second, null);
  assert.equal(
    summons.spawn("old-handgun", { x: 1000, y: 500 }, { x: 200, y: 500 }),
    null,
  );
  summons.update(0.1, { x: 200, y: 360 }, true);
  const events = summons.update(0.25, { x: 250, y: 360 }, true);
  assert.ok(events.bullets.length >= 2);
  assert.equal(events.bullets.every((bullet) => bullet.sourceKind === "old-handgun"), true);
  const collider = summons.getHandgunColliders()[0];
  assert.ok(collider);
  assert.equal(
    summons.findPlayerOutlineHandgunCollision(
      collider.center,
      54,
      38,
    ),
    collider.entityId,
  );
  assert.equal(summons.destroyHandgun(collider.entityId), true);
  assert.equal(summons.getStats().oldHandguns, 1);
  assert.equal(summons.getStats().destroyedHandguns, 1);
});

test("D3.4 creeper tracks, locks its center, casts and emits one two-damage explosion", () => {
  const summons = new DemoSummonModel(quickConfig);
  const player = { x: 500, y: 360 };
  summons.spawn("creeper", { x: 800, y: 360 }, player);
  summons.update(0.1, player, true);
  assert.equal(summons.getSnapshots()[0].lifecycle, "tracking");

  let events = summons.update(0.25, player, true);
  assert.deepEqual(events.explosions, []);
  assert.equal(summons.getSnapshots()[0].lifecycle, "tracking");
  for (let index = 0; index < 8 && summons.getSnapshots()[0].lifecycle === "tracking"; index += 1) {
    summons.update(0.25, player, true);
  }
  assert.equal(summons.getSnapshots()[0].lifecycle, "casting");
  const locked = { ...summons.getSnapshots()[0].position };
  events = summons.update(0.1, { x: 100, y: 100 }, true);
  assert.deepEqual(events.explosions, []);
  assert.deepEqual(summons.getSnapshots()[0].position, locked);
  events = summons.update(0.1, { x: 100, y: 100 }, true);
  assert.equal(events.explosions.length, 1);
  assert.equal(events.explosions[0].damage, 2);
  assert.deepEqual(events.explosions[0].position, locked);
  assert.equal(summons.getStats().creepers, 0);
  assert.equal(summons.getStats().creeperExplosions, 1);
});

test("D3.4 creeper explosions destroy old handguns and rotating machine guns", () => {
  const summons = new DemoSummonModel(quickConfig);
  summons.spawn("old-handgun", { x: 500, y: 360 }, { x: 200, y: 360 });
  summons.spawn("rotating-machine-gun", { x: 500, y: 360 }, { x: 200, y: 360 });
  summons.update(0.1, { x: 200, y: 360 }, false);
  const weapons = summons.getSnapshots().filter((entity) => entity.kind !== "creeper");
  const center = weapons[0].position;
  assert.equal(summons.destroyWeaponsInExplosion(center, 2_000), 2);
  assert.equal(summons.getStats().oldHandguns, 0);
  assert.equal(summons.getStats().rotatingMachineGuns, 0);
  assert.equal(summons.getStats().destroyedHandguns, 1);
  assert.equal(summons.getStats().destroyedMachineGuns, 1);
});

test("D3.4 clear removes every summon and pending explosion visual", () => {
  const summons = new DemoSummonModel(quickConfig);
  summons.spawn("rotating-machine-gun", { x: 1000, y: 250 }, { x: 200, y: 250 });
  summons.spawn("old-handgun", { x: 1000, y: 360 }, { x: 200, y: 360 });
  summons.spawn("creeper", { x: 1000, y: 470 }, { x: 200, y: 470 });
  assert.equal(summons.getStats().active, 3);
  summons.clearAll();
  assert.equal(summons.getStats().active, 0);
  assert.deepEqual(summons.getExplosionSnapshots(), []);
});
