import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDemoBossWeaponArtTransform,
  pointAtDistance,
  resolveDemoBossWeaponArtKind,
} from "../src/game/demo/boss/DemoBossArtGeometry.ts";
import {
  DEMO_BOSS_EMPTY_HAND_ART,
  DEMO_BOSS_WEAPON_ART,
} from "../src/game/demo/boss/demoBossArtConfig.ts";

test("Boss weapon labels select the supplied D7 art", () => {
  assert.equal(resolveDemoBossWeaponArtKind("左轮手枪"), "revolver");
  assert.equal(resolveDemoBossWeaponArtKind("AK47 突击步枪"), "ak47");
  assert.equal(resolveDemoBossWeaponArtKind("霰弹枪"), "shotgun");
  assert.equal(resolveDemoBossWeaponArtKind("火箭发射器"), "rocketLauncher");
  assert.equal(resolveDemoBossWeaponArtKind("召唤器"), "summoner");
  assert.equal(resolveDemoBossWeaponArtKind("激光枪"), "laserGun");
  assert.equal(resolveDemoBossWeaponArtKind("空手"), "empty");
});

test("weapon transform maps the source grip and muzzle to the live anchors", () => {
  const art = DEMO_BOSS_WEAPON_ART.ak47;
  const grip = { x: 1080, y: 430 };
  const muzzle = { x: 988, y: 430 };
  const transform = calculateDemoBossWeaponArtTransform(art, grip, muzzle);

  assert.equal(transform.x, grip.x);
  assert.equal(transform.y, grip.y);
  assert.ok(Math.abs(transform.originX - art.grip.x / art.sourceSize.width) < 1e-9);
  assert.ok(Math.abs(transform.originY - art.grip.y / art.sourceSize.height) < 1e-9);

  const sourceDx = art.muzzle.x - art.grip.x;
  const sourceDy = art.muzzle.y - art.grip.y;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const mappedMuzzle = {
    x: grip.x + (sourceDx * cos - sourceDy * sin) * transform.scale,
    y: grip.y + (sourceDx * sin + sourceDy * cos) * transform.scale,
  };
  assert.ok(Math.abs(mappedMuzzle.x - muzzle.x) < 1e-6);
  assert.ok(Math.abs(mappedMuzzle.y - muzzle.y) < 1e-6);
});

test("laser muzzle follows the live sweep angle", () => {
  const origin = { x: 1100, y: 360 };
  const target = pointAtDistance(origin, Math.PI * 0.75, 96);
  assert.ok(Math.abs(Math.hypot(target.x - origin.x, target.y - origin.y) - 96) < 1e-6);
  assert.ok(target.x < origin.x);
  assert.ok(target.y > origin.y);
});

test("Boss empty-hand art uses the reduced transition size", () => {
  assert.deepEqual(DEMO_BOSS_EMPTY_HAND_ART.displaySize, {
    width: 77,
    height: 77,
  });
});
