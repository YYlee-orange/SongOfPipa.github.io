import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DEMO_BACKGROUND_ASSET_URL } from "../src/game/demo/background/demoBackgroundConfig.ts";
import { DEMO_BOSS_ART_ASSETS } from "../src/game/demo/boss/demoBossArtConfig.ts";
import { DEMO_BOSS_PHASE_CONFIGS } from "../src/game/demo/boss/demoBossPhaseConfig.ts";
import { DEMO_COMBAT_ART_ASSETS } from "../src/game/demo/combat/demoCombatArtConfig.ts";
import { DEMO_PLAYER_ART_ASSETS } from "../src/game/demo/player/demoPlayerArtConfig.ts";
import { readDemoStartupTarget } from "../src/game/demo/DemoRoute.ts";
import { DEMO_DISARM_ART_ASSETS } from "../src/game/demo/transitions/demoDisarmArtConfig.ts";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

test("D8 release root starts the complete Demo without debug UI", () => {
  assert.deepEqual(readDemoStartupTarget(""), {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: false,
  });
});

test("D8 release config contains all five implemented Boss phases", () => {
  assert.deepEqual(
    DEMO_BOSS_PHASE_CONFIGS.map((phase) => phase.id),
    [1, 2, 3, 4, 5],
  );
  assert.equal(
    DEMO_BOSS_PHASE_CONFIGS.every(
      (phase) => phase.implementationStatus !== "shared-actor",
    ),
    true,
  );
});

test("D8 every registered Demo art asset exists and is non-empty", async () => {
  const assets = [
    { key: "demo-room-background", url: DEMO_BACKGROUND_ASSET_URL },
    ...DEMO_PLAYER_ART_ASSETS,
    ...DEMO_BOSS_ART_ASSETS,
    ...DEMO_DISARM_ART_ASSETS,
    ...DEMO_COMBAT_ART_ASSETS,
  ];
  assert.equal(new Set(assets.map((asset) => asset.key)).size, assets.length);

  for (const asset of assets) {
    const filePath = fileURLToPath(
      new URL(`public/${asset.url}`, `file:///${workspaceRoot.replaceAll("\\", "/")}/`),
    );
    const metadata = await stat(filePath);
    assert.ok(metadata.isFile(), `${asset.url} is not a file`);
    assert.ok(metadata.size > 0, `${asset.url} is empty`);
  }
});
