import Phaser from "phaser";
import { COLORS, DESIGN } from "./config";
import { BootScene } from "./scenes/BootScene";
import { PrototypeScene } from "./scenes/PrototypeScene";

export function createGame(parent: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: DESIGN.width,
    height: DESIGN.height,
    backgroundColor: COLORS.page,
    scene: [BootScene, PrototypeScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: DESIGN.width,
      height: DESIGN.height,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: true,
    },
    audio: {
      disableWebAudio: false,
    },
  };

  return new Phaser.Game(config);
}
