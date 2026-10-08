import assert from "node:assert/strict";
import test from "node:test";
import {
  DemoScrollingBackgroundModel,
  type DemoScrollingBackgroundConfig,
} from "../src/game/demo/background/DemoScrollingBackgroundModel.ts";
import { DEMO_BACKGROUND_CONFIG } from "../src/game/demo/background/demoBackgroundConfig.ts";

function assertCoversViewport(
  config: Readonly<DemoScrollingBackgroundConfig>,
  model: DemoScrollingBackgroundModel,
): void {
  const snapshot = model.getSnapshot();
  assert.ok(snapshot.tilePositions.length >= 1);
  assert.ok(snapshot.tilePositions[0] <= 0.0001);
  for (let index = 1; index < snapshot.tilePositions.length; index += 1) {
    const previousEnd = snapshot.tilePositions[index - 1] + snapshot.tileWidth;
    assert.ok(Math.abs(snapshot.tilePositions[index] - previousEnd) < 0.001);
  }
  const last = snapshot.tilePositions[snapshot.tilePositions.length - 1];
  assert.ok(last + snapshot.tileWidth >= config.worldWidth - 0.001);
}

test("D5 uses the source aspect ratio instead of stretching one image to canvas width", () => {
  const model = new DemoScrollingBackgroundModel(DEMO_BACKGROUND_CONFIG);
  const snapshot = model.getSnapshot();
  assert.equal(snapshot.tileHeight, 720);
  assert.ok(Math.abs(snapshot.scale - 720 / 887) < 0.000001);
  assert.ok(Math.abs(snapshot.tileWidth - 1440) < 0.000001);
  assert.ok(snapshot.tileWidth > DEMO_BACKGROUND_CONFIG.worldWidth);
  assertCoversViewport(DEMO_BACKGROUND_CONFIG, model);
});

test("D5 tile positions remain gapless through long-running leftward scrolling", () => {
  const model = new DemoScrollingBackgroundModel(DEMO_BACKGROUND_CONFIG);
  for (let index = 0; index < 10_000; index += 1) {
    model.update(1 / 60);
  }
  const snapshot = model.getSnapshot();
  assert.ok(snapshot.phase >= 0 && snapshot.phase < snapshot.tileWidth);
  assertCoversViewport(DEMO_BACKGROUND_CONFIG, model);
});

test("D5 returns to the same phase after one exact image-width cycle", () => {
  const model = new DemoScrollingBackgroundModel(DEMO_BACKGROUND_CONFIG);
  const tileWidth = model.getSnapshot().tileWidth;
  model.update(tileWidth / DEMO_BACKGROUND_CONFIG.speedPixelsPerSecond);
  assert.ok(Math.abs(model.getSnapshot().phase) < 0.000001);
});

test("D5 preserves coverage at a larger logical resolution", () => {
  const config: DemoScrollingBackgroundConfig = {
    ...DEMO_BACKGROUND_CONFIG,
    worldWidth: 1920,
    worldHeight: 1080,
  };
  const model = new DemoScrollingBackgroundModel(config);
  model.update(73.25);
  const snapshot = model.getSnapshot();
  assert.equal(snapshot.tileHeight, 1080);
  assert.equal(snapshot.tileWidth, 2160);
  assertCoversViewport(config, model);
});

test("D5 ignores invalid and negative frame deltas", () => {
  const model = new DemoScrollingBackgroundModel(DEMO_BACKGROUND_CONFIG);
  const before = model.getSnapshot().phase;
  model.update(Number.NaN);
  model.update(-1);
  assert.equal(model.getSnapshot().phase, before);
});
