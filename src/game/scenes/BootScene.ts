import Phaser from "phaser";
import { readDemoStartupTarget } from "../demo/DemoRoute";
import {
  DEMO_BACKGROUND_ASSET_URL,
  DEMO_BACKGROUND_TEXTURE_KEY,
} from "../demo/background/demoBackgroundConfig";
import { DEMO_PLAYER_ART_ASSETS } from "../demo/player/demoPlayerArtConfig.ts";
import { DEMO_BOSS_ART_ASSETS } from "../demo/boss/demoBossArtConfig.ts";
import { DEMO_DISARM_ART_ASSETS } from "../demo/transitions/demoDisarmArtConfig.ts";
import { DEMO_COMBAT_ART_ASSETS } from "../demo/combat/demoCombatArtConfig.ts";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    const target = readDemoStartupTarget(window.location.search);
    if (target.scene === "DemoBattleScene") {
      this.load.image(DEMO_BACKGROUND_TEXTURE_KEY, DEMO_BACKGROUND_ASSET_URL);
      for (const asset of DEMO_PLAYER_ART_ASSETS) {
        this.load.image(asset.key, asset.url);
      }
      for (const asset of DEMO_BOSS_ART_ASSETS) {
        this.load.image(asset.key, asset.url);
      }
      for (const asset of DEMO_DISARM_ART_ASSETS) {
        this.load.image(asset.key, asset.url);
      }
      for (const asset of DEMO_COMBAT_ART_ASSETS) {
        this.load.image(asset.key, asset.url);
      }
    }
  }

  create(): void {
    const target = readDemoStartupTarget(window.location.search);
    const pageTitle = target.scene === "PrototypeScene"
      ? "琵琶曲 · 原型"
      : `琵琶曲 · Demo 阶段 ${target.phaseId} ${
        target.debugEnabled ? "调试" : "战斗"
      }`;
    const pageLabel = target.scene === "PrototypeScene"
      ? "《琵琶曲》游戏原型"
      : `《琵琶曲》Demo 单场景 Boss 战，当前阶段 ${target.phaseId}`;
    document.title = pageTitle;
    document
      .querySelector<HTMLElement>("#app")
      ?.setAttribute("aria-label", pageLabel);

    if (target.scene === "DemoBattleScene") {
      this.scene.start(target.scene, {
        phaseId: target.phaseId,
        debugEnabled: target.debugEnabled,
      });
      return;
    }

    this.scene.start(target.scene);
  }
}
