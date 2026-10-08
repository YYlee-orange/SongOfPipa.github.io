import type { DemoScrollingBackgroundConfig } from "./DemoScrollingBackgroundModel.ts";
import type { DemoScrollingBackgroundPresentation } from "./DemoScrollingBackgroundView.ts";

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

export const DEMO_BACKGROUND_TEXTURE_KEY = "demo-room-background";
export const DEMO_BACKGROUND_ASSET_URL =
  "assets/backgrounds/demo-room-background.png";

/** 替换图保持 1774×887；以 720 高逻辑画布等比显示为 1440 px 宽。 */
export const DEMO_BACKGROUND_CONFIG: Readonly<DemoScrollingBackgroundConfig> =
  Object.freeze({
    worldWidth: DESIGN_WIDTH,
    worldHeight: DESIGN_HEIGHT,
    sourceWidth: 1774,
    sourceHeight: 887,
    speedPixelsPerSecond: 100,
    direction: "left",
  });

export const DEMO_BACKGROUND_PRESENTATION: Readonly<DemoScrollingBackgroundPresentation> =
  Object.freeze({
    textureKey: DEMO_BACKGROUND_TEXTURE_KEY,
    seamOverlapPixels: 1,
    dimColor: 0x24170f,
    dimAlpha: 0.18,
    worldWidth: DESIGN_WIDTH,
    worldHeight: DESIGN_HEIGHT,
  });
