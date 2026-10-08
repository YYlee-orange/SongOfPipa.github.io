import assert from "node:assert/strict";
import test from "node:test";
import { readDemoStartupTarget } from "../src/game/demo/DemoRoute.ts";

test("the release root opens the complete Demo", () => {
  assert.deepEqual(readDemoStartupTarget(""), {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: false,
  });
});

test("the accepted prototype remains available through an explicit route", () => {
  assert.deepEqual(readDemoStartupTarget("?prototype=1"), {
    scene: "PrototypeScene",
  });
});

test("the formal Demo route opens the single battle scene", () => {
  assert.deepEqual(readDemoStartupTarget("?demo=1"), {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: false,
  });
});

test("the debug route adds an overlay to the same battle scene", () => {
  const expected = {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: true,
  };
  assert.deepEqual(readDemoStartupTarget("?demoDebug=1"), expected);
  assert.deepEqual(readDemoStartupTarget("?demoEditor=true"), expected);
});

test("phase routes select an initial state instead of another scene", () => {
  for (let phaseId = 1; phaseId <= 5; phaseId += 1) {
    assert.deepEqual(readDemoStartupTarget(`?demoPhase=${phaseId}`), {
      scene: "DemoBattleScene",
      phaseId,
      debugEnabled: true,
    });
  }
});

test("an invalid phase never enters an invalid battle state", () => {
  assert.deepEqual(readDemoStartupTarget("?demoPhase=6"), {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: false,
  });
  assert.deepEqual(readDemoStartupTarget("?demoPhase=bad&demoDebug=1"), {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: true,
  });
});
