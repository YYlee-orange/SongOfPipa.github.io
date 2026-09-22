import type { PlayerRigConfig } from "./entities/playerRig/PlayerRigModel";
import type { PlayerMovementConfig } from "./entities/player/PlayerMovementModel";

export const APP_INFO = Object.freeze({
  title: "琵琶曲",
  version: "0.9.0-playtest",
  phase: "原型初期试玩版",
});

export const DESIGN = Object.freeze({
  width: 1280,
  height: 720,
});

export const COLORS = Object.freeze({
  page: 0x24170f,
  stage: 0xe8c996,
  stageLine: 0x9a6845,
  ink: 0x2f2118,
  accent: 0xc95b3f,
  paper: "#fff4d6",
  debugBackground: "rgba(36, 23, 15, 0.88)",
});

export const DEBUG = Object.freeze({
  toggleKey: "F3",
  queryParameter: "debug",
  defaultVisible: import.meta.env.DEV,
  refreshIntervalMs: 250,
});

export const PLAYER_RIG: PlayerRigConfig = Object.freeze({
  initialPelvis: { x: 420, y: 470 },
  pelvisSize: { width: 108, height: 76 },
  headCenterOffset: { x: -95, y: -215 },
  headWanderRadius: { x: 32, y: 24 },
  headWanderFrequency: { x: 0.72, y: 0.97 },
  headBounds: {
    minX: 200,
    maxX: 520,
    minY: 170,
    maxY: 350,
  },
  headFollowRate: 7,
  torsoMaximumLength: 1500,
  torsoReferenceLength: 235,
  torsoTopWidth: 94,
  torsoBottomWidth: 66,
  torsoNeckInset: 42,
  torsoPelvisInset: 30,
  upperArmLength: 92,
  lowerArmLength: 86,
  upperLegLength: 105,
  lowerLegLength: 112,
  leftFootOffset: { side: -62, down: 188 },
  rightFootOffset: { side: 66, down: 192 },
  legKneeBend: 55,
});

export const PLAYER_MOVEMENT: PlayerMovementConfig = Object.freeze({
  bounds: Object.freeze({
    minX: PLAYER_RIG.pelvisSize.width / 2,
    maxX: DESIGN.width - PLAYER_RIG.pelvisSize.width / 2,
    minY: PLAYER_RIG.pelvisSize.height / 2,
    maxY: DESIGN.height - PLAYER_RIG.pelvisSize.height / 2,
  }),
  maximumSpeed: 360,
  acceleration: 3000,
  deceleration: 3600,
});

export const INPUT_KEYS = Object.freeze({
  moveUp: Object.freeze(["W", "UP"]),
  moveDown: Object.freeze(["S", "DOWN"]),
  moveLeft: Object.freeze(["A", "LEFT"]),
  moveRight: Object.freeze(["D", "RIGHT"]),
  parry: Object.freeze(["Z", "J"]),
  skill: Object.freeze(["X", "K"]),
});

export function readInitialDebugVisibility(search = window.location.search): boolean {
  const requested = new URLSearchParams(search).get(DEBUG.queryParameter);

  if (requested === "1" || requested === "true") {
    return true;
  }

  if (requested === "0" || requested === "false") {
    return false;
  }

  return DEBUG.defaultVisible;
}
