import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDemoDisarmWeaponArtRotation,
  DEMO_DISARM_ART_ASSETS,
  DEMO_DISARM_WEAPON_ART,
  resolveDemoDisarmWeaponArt,
} from "../src/game/demo/transitions/demoDisarmArtConfig.ts";

test("all six disarm weapon kinds resolve to supplied pure-weapon art", () => {
  assert.equal(DEMO_DISARM_ART_ASSETS.length, 7);
  assert.equal(DEMO_DISARM_WEAPON_ART.revolver.key, "demo-transition-revolver");
  assert.equal(DEMO_DISARM_WEAPON_ART.ak47.key, "demo-transition-ak47");
  assert.equal(DEMO_DISARM_WEAPON_ART.shotgun.key, "demo-transition-shotgun");
  assert.equal(
    DEMO_DISARM_WEAPON_ART["rocket-launcher"].key,
    "demo-transition-rocket-launcher",
  );
  assert.equal(DEMO_DISARM_WEAPON_ART.summoner.key, "demo-transition-summoner-idle");
  assert.equal(DEMO_DISARM_WEAPON_ART["laser-gun"].key, "demo-transition-laser-gun");
});

test("player summoner switches between the supplied idle and pressed art", () => {
  assert.equal(resolveDemoDisarmWeaponArt("summoner", false).key, "demo-transition-summoner-idle");
  assert.equal(resolveDemoDisarmWeaponArt("summoner", true).key, "demo-transition-summoner-pressed");
  assert.equal(resolveDemoDisarmWeaponArt("ak47", true).key, "demo-transition-ak47");
});

test("left-facing source art rotates onto the live model weapon angle", () => {
  assert.ok(Math.abs(calculateDemoDisarmWeaponArtRotation(Math.PI)) < 1e-9);
  assert.ok(Math.abs(calculateDemoDisarmWeaponArtRotation(0) + Math.PI) < 1e-9);
  assert.ok(
    Math.abs(calculateDemoDisarmWeaponArtRotation(Math.PI * 1.5) - Math.PI * 0.5) <
      1e-9,
  );
});

test("player-held art uses horizontal mirroring without turning upside down", () => {
  assert.ok(
    Math.abs(calculateDemoDisarmWeaponArtRotation(0, Math.PI, true)) < 1e-9,
  );
  assert.ok(
    Math.abs(
      calculateDemoDisarmWeaponArtRotation(Math.PI * 0.1, Math.PI, true) -
        Math.PI * 0.1,
    ) < 1e-9,
  );
});
