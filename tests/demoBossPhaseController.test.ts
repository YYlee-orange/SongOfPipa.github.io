import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_BOSS_PHASE_IDS,
  DemoBossPhaseController,
} from "../src/game/demo/boss/DemoBossPhaseController.ts";
import { DEMO_BOSS_PHASE_CONFIGS } from "../src/game/demo/boss/demoBossPhaseConfig.ts";

test("D3.5 exposes one file-backed config and marks all five attacks active", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS);
  assert.deepEqual(
    controller.getPhaseConfigs().map((config) => config.id),
    DEMO_BOSS_PHASE_IDS,
  );
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[0].implementationStatus, "phase1-attack");
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[1].implementationStatus, "phase2-attack");
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[2].implementationStatus, "phase3-attack");
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[3].implementationStatus, "phase4-attack");
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[4].implementationStatus, "phase5-attack");
  assert.equal(DEMO_BOSS_PHASE_CONFIGS[0].movementSpeed, DEMO_BOSS_PHASE_CONFIGS[1].movementSpeed);
});

test("debug phase entry replaces state inside the same controller", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS);

  controller.enterPhase(4);
  controller.update(0.2);
  controller.setCurrentHealth(3);
  const changed = controller.getSnapshot();
  assert.equal(changed.phaseId, 4);
  assert.equal(changed.currentHealth, 3);

  controller.enterPhase(2);
  const phaseTwo = controller.getSnapshot();
  assert.equal(phaseTwo.phaseId, 2);
  assert.equal(phaseTwo.currentHealth, phaseTwo.maximumHealth);
  assert.equal(phaseTwo.lifecycle, "active");
  assert.equal(phaseTwo.phaseElapsedSeconds, 0);
  assert.equal(phaseTwo.encounterElapsedSeconds, 0.2);

  controller.enterPhase(4);
  const phaseFourAgain = controller.getSnapshot();
  assert.equal(phaseFourAgain.currentHealth, phaseFourAgain.maximumHealth);
  assert.equal(phaseFourAgain.lifecycle, "active");
  assert.equal(phaseFourAgain.randomSeed, changed.randomSeed);
});

test("reset restores only the current phase runtime", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS, 3);
  controller.update(0.25);
  controller.setCurrentHealth(1);
  controller.resetCurrentPhase();

  const snapshot = controller.getSnapshot();
  assert.equal(snapshot.phaseId, 3);
  assert.equal(snapshot.currentHealth, snapshot.maximumHealth);
  assert.equal(snapshot.lifecycle, "active");
  assert.equal(snapshot.phaseElapsedSeconds, 0);
  assert.equal(snapshot.encounterElapsedSeconds, 0.25);
  assert.equal(snapshot.resetCount, 1);
});

test("phase 3 defeat and transition continue into phase 4", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS, 3);
  controller.update(0.25);
  controller.setCurrentHealth(0);
  assert.equal(controller.getSnapshot().lifecycle, "transition-ready");

  assert.equal(controller.beginTransition(), true);
  assert.equal(controller.getSnapshot().lifecycle, "transitioning");
  assert.equal(controller.completeTransition(), 4);

  const phaseFour = controller.getSnapshot();
  assert.equal(phaseFour.phaseId, 4);
  assert.equal(phaseFour.currentHealth, phaseFour.maximumHealth);
  assert.equal(phaseFour.lifecycle, "active");
  assert.equal(phaseFour.phaseElapsedSeconds, 0);
  assert.equal(phaseFour.encounterElapsedSeconds, 0.25);
});

test("phase 5 transition completes the encounter instead of loading a scene", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS, 5);
  assert.equal(controller.forceTransitionReady(), true);
  assert.equal(controller.beginTransition(), true);
  assert.equal(controller.completeTransition(), "victory");
  assert.equal(controller.getSnapshot().lifecycle, "victory");
  assert.equal(controller.getSnapshot().nextPhaseId, null);
});

test("a transition cannot complete before its lifecycle begins", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS);
  assert.equal(controller.completeTransition(), null);
  assert.equal(controller.getSnapshot().phaseId, 1);
  assert.equal(controller.getSnapshot().lifecycle, "active");
});

test("the shared damage entry defeats only the active phase", () => {
  const controller = new DemoBossPhaseController(DEMO_BOSS_PHASE_CONFIGS);
  assert.equal(controller.takeDamage(2), "damaged");
  assert.equal(controller.getSnapshot().currentHealth, 10);
  assert.equal(controller.takeDamage(10), "phase-defeated");
  assert.equal(controller.getSnapshot().lifecycle, "transition-ready");
  assert.equal(controller.takeDamage(), "ignored");
});
