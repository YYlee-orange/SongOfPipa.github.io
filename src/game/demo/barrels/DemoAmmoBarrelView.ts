import Phaser from "phaser";
import type { DemoAmmoBarrelSnapshot } from "./DemoAmmoBarrelModel.ts";
import {
  DEMO_COMBAT_ART_SIZE,
  DEMO_COMBAT_ART_TEXTURES,
} from "../combat/demoCombatArtConfig.ts";

/** 弹药桶灰盒视图：充能、爆发预警与哑火状态具有独立轮廓。 */
export class DemoAmmoBarrelView {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(26);
  }

  render(
    barrels: readonly Readonly<DemoAmmoBarrelSnapshot>[],
    showDebug: boolean,
  ): void {
    this.graphics.clear();
    for (let index = 0; index < barrels.length; index += 1) {
      const barrel = barrels[index];
      const { x, y } = barrel.position;
      const pulse = 1 + Math.sin(barrel.stateProgress * Math.PI * 8) * 0.08;
      const radius = barrel.radius * (barrel.state === "burst-warning" ? pulse : 1);
      const sprite = this.getSprite(index);
      sprite
        .setPosition(x, y)
        .setDisplaySize(
          radius * DEMO_COMBAT_ART_SIZE.ammoBarrelDiameterPerRadius,
          radius * DEMO_COMBAT_ART_SIZE.ammoBarrelDiameterPerRadius,
        )
        .setAlpha(barrel.state === "dud" ? 0.58 : 1)
        .setTint(barrel.state === "burst-warning" ? 0xffe68c : 0xffffff)
        .setVisible(true);

      if (barrel.chargeProgress > 0 && barrel.state === "armed") {
        this.graphics.lineStyle(5, 0xffc94f, 0.95);
        this.graphics.beginPath();
        this.graphics.arc(
          x,
          y,
          radius + 9,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * barrel.chargeProgress,
          false,
        );
        this.graphics.strokePath();
      }
      if (barrel.state === "burst-warning") {
        this.graphics.lineStyle(4, 0xff5a3c, 0.88);
        this.graphics.strokeCircle(x, y, radius + 16 + barrel.stateProgress * 14);
      } else if (barrel.state === "dud") {
        this.graphics.fillStyle(0x6f6f6f, 0.45 * (1 - barrel.stateProgress));
        this.graphics.fillCircle(x - 8, y - radius - 12, 10 + barrel.stateProgress * 14);
        this.graphics.fillCircle(x + 8, y - radius - 24, 8 + barrel.stateProgress * 11);
      }

      if (showDebug) {
        this.graphics.lineStyle(2, 0x267c8a, 0.8);
        this.graphics.strokeCircle(x, y, barrel.radius);
      }
    }
    for (let index = barrels.length; index < this.sprites.length; index += 1) {
      this.sprites[index].setVisible(false);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites.length = 0;
  }

  private getSprite(index: number): Phaser.GameObjects.Image {
    const existing = this.sprites[index];
    if (existing) {
      return existing;
    }
    const sprite = this.scene.add
      .image(0, 0, DEMO_COMBAT_ART_TEXTURES.ammoBarrel.key)
      .setDepth(26)
      .setVisible(false);
    this.sprites.push(sprite);
    return sprite;
  }
}
