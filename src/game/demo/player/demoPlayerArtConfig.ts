export interface DemoPlayerArtAsset {
  key: string;
  url: string;
}

export interface DemoPlayerSegmentArtConfig extends DemoPlayerArtAsset {
  sourceSize: Readonly<{ width: number; height: number }>;
  proximal: Readonly<{ x: number; y: number }>;
  distal: Readonly<{ x: number; y: number }>;
  referenceLength: number;
  depth: number;
  alpha: number;
}

const PLAYER_ART_ROOT = "assets/player-a";

export const DEMO_PLAYER_ART_TEXTURES = Object.freeze({
  head: Object.freeze({
    key: "demo-player-head-neutral",
    url: `${PLAYER_ART_ROOT}/player-head-neutral.png`,
  }),
  torso: Object.freeze({
    key: "demo-player-torso",
    url: `${PLAYER_ART_ROOT}/player-torso.png`,
  }),
  pelvis: Object.freeze({
    key: "demo-player-pelvis-outer",
    url: `${PLAYER_ART_ROOT}/player-pelvis-outer.png`,
  }),
  armUpperLeft: Object.freeze({
    key: "demo-player-arm-upper-left",
    url: `${PLAYER_ART_ROOT}/player-arm-upper-left.png`,
  }),
  armLowerLeft: Object.freeze({
    key: "demo-player-arm-lower-left",
    url: `${PLAYER_ART_ROOT}/player-arm-lower-left.png`,
  }),
  armUpperRight: Object.freeze({
    key: "demo-player-arm-upper-right",
    url: `${PLAYER_ART_ROOT}/player-arm-upper-right.png`,
  }),
  armLowerRight: Object.freeze({
    key: "demo-player-arm-lower-right",
    url: `${PLAYER_ART_ROOT}/player-arm-lower-right.png`,
  }),
  legUpperLeft: Object.freeze({
    key: "demo-player-leg-upper-left",
    url: `${PLAYER_ART_ROOT}/player-leg-upper-left.png`,
  }),
  legLowerLeft: Object.freeze({
    key: "demo-player-leg-lower-left",
    url: `${PLAYER_ART_ROOT}/player-leg-lower-left.png`,
  }),
  legUpperRight: Object.freeze({
    key: "demo-player-leg-upper-right",
    url: `${PLAYER_ART_ROOT}/player-leg-upper-right.png`,
  }),
  legLowerRight: Object.freeze({
    key: "demo-player-leg-lower-right",
    url: `${PLAYER_ART_ROOT}/player-leg-lower-right.png`,
  }),
});

export const DEMO_PLAYER_ART_ASSETS: readonly DemoPlayerArtAsset[] =
  Object.freeze(Object.values(DEMO_PLAYER_ART_TEXTURES));

export const DEMO_PLAYER_SEGMENT_ART = Object.freeze({
  armUpperLeft: segment(
    DEMO_PLAYER_ART_TEXTURES.armUpperRight,
    1254,
    1254,
    { x: 874, y: 198 },
    { x: 472, y: 1121 },
    112,
    18,
    1,
  ),
  armLowerLeft: segment(
    DEMO_PLAYER_ART_TEXTURES.armLowerLeft,
    1254,
    1254,
    { x: 795, y: 148 },
    { x: 610, y: 1035 },
    104,
    18.2,
    1,
  ),
  armUpperRight: segment(
    DEMO_PLAYER_ART_TEXTURES.armUpperLeft,
    1254,
    1254,
    { x: 382, y: 198 },
    { x: 846, y: 1118 },
    112,
    19,
    1,
  ),
  armLowerRight: segment(
    DEMO_PLAYER_ART_TEXTURES.armLowerRight,
    1254,
    1254,
    { x: 424, y: 160 },
    { x: 644, y: 1030 },
    104,
    19.2,
    1,
  ),
  legUpperLeft: segment(
    DEMO_PLAYER_ART_TEXTURES.legUpperLeft,
    1024,
    1536,
    { x: 317, y: 179 },
    { x: 686, y: 1390 },
    132,
    17,
    1,
  ),
  legLowerLeft: segment(
    DEMO_PLAYER_ART_TEXTURES.legLowerLeft,
    1254,
    1254,
    { x: 627, y: 91 },
    { x: 694, y: 1120 },
    140,
    17.2,
    1,
  ),
  legUpperRight: segment(
    DEMO_PLAYER_ART_TEXTURES.legUpperRight,
    1024,
    1536,
    { x: 708, y: 179 },
    { x: 338, y: 1390 },
    132,
    21,
    1,
  ),
  legLowerRight: segment(
    DEMO_PLAYER_ART_TEXTURES.legLowerRight,
    1254,
    1254,
    { x: 627, y: 91 },
    { x: 559, y: 1120 },
    140,
    21.2,
    1,
  ),
});

export const DEMO_PLAYER_TORSO_ART = Object.freeze({
  ...DEMO_PLAYER_ART_TEXTURES.torso,
  sourceSize: Object.freeze({ width: 1086, height: 1448 }),
  proximal: Object.freeze({ x: 543, y: 206 }),
  distal: Object.freeze({ x: 543, y: 1232 }),
  sourceThickness: 1010,
  displayWidth: 140,
  shoulderDrop: 54,
  depth: 20,
  alpha: 1,
});

export const DEMO_PLAYER_HEAD_ART = Object.freeze({
  ...DEMO_PLAYER_ART_TEXTURES.head,
  displaySize: Object.freeze({ width: 94, height: 94 }),
  origin: Object.freeze({ x: 0.5, y: 0.51 }),
  torsoInset: 8,
  depth: 22,
  alpha: 1,
});

export const DEMO_PLAYER_PELVIS_ART = Object.freeze({
  ...DEMO_PLAYER_ART_TEXTURES.pelvis,
  displaySize: Object.freeze({ width: 150, height: 100 }),
  origin: Object.freeze({ x: 0.5, y: 0.5 }),
  depth: 25,
  alpha: 1,
});

function segment(
  asset: Readonly<DemoPlayerArtAsset>,
  width: number,
  height: number,
  proximal: Readonly<{ x: number; y: number }>,
  distal: Readonly<{ x: number; y: number }>,
  referenceLength: number,
  depth: number,
  alpha: number,
): Readonly<DemoPlayerSegmentArtConfig> {
  return Object.freeze({
    ...asset,
    sourceSize: Object.freeze({ width, height }),
    proximal: Object.freeze({ ...proximal }),
    distal: Object.freeze({ ...distal }),
    referenceLength,
    depth,
    alpha,
  });
}
