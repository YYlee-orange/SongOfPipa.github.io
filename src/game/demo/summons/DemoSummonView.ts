import Phaser from "phaser";
import type {
  DemoSummonExplosionSnapshot,
  DemoSummonSnapshot,
} from "./DemoSummonModel.ts";
import {
  calculateLeftFacingArtRotation,
  DEMO_COMBAT_ART_SIZE,
  DEMO_COMBAT_ART_TEXTURES,
} from "../combat/demoCombatArtConfig.ts";

/** D3.4 召唤物灰盒视图；正式资源在 D7 替换。 */
export class DemoSummonView {
  private readonly scene: Phaser.Scene;
  private readonly entityGraphics: Phaser.GameObjects.Graphics;
  private readonly effectGraphics: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.entityGraphics = scene.add.graphics().setDepth(28);
    this.effectGraphics = scene.add.graphics().setDepth(43);
  }

  render(
    summons: readonly Readonly<DemoSummonSnapshot>[],
    explosions: readonly Readonly<DemoSummonExplosionSnapshot>[],
    showDebugGeometry: boolean,
  ): void {
    this.entityGraphics.clear();
    this.effectGraphics.clear();

    for (let index = 0; index < summons.length; index += 1) {
      const summon = summons[index];
      if (summon.kind === "rotating-machine-gun") {
        this.drawMachineGun(summon, index);
      } else if (summon.kind === "old-handgun") {
        this.drawOldHandgun(summon, index);
      } else {
        this.drawCreeper(summon, index);
      }
      if (showDebugGeometry) {
        this.drawDebugGeometry(summon);
      }
    }
    for (let index = summons.length; index < this.sprites.length; index += 1) {
      this.sprites[index].setVisible(false);
    }

    for (const explosion of explosions) {
      const progress = Phaser.Math.Clamp(explosion.progress, 0, 1);
      const alpha = 1 - progress;
      const radius = explosion.radius * (0.45 + progress * 0.55);
      this.effectGraphics.fillStyle(0xffb13b, alpha * 0.35);
      this.effectGraphics.fillCircle(explosion.position.x, explosion.position.y, radius);
      this.effectGraphics.lineStyle(9 - progress * 5, 0xe84d36, alpha);
      this.effectGraphics.strokeCircle(explosion.position.x, explosion.position.y, radius);
    }
  }

  destroy(): void {
    this.entityGraphics.destroy();
    this.effectGraphics.destroy();
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites.length = 0;
  }

  private drawMachineGun(
    summon: Readonly<DemoSummonSnapshot>,
    index: number,
  ): void {
    const alpha = summon.lifecycle === "thrown" ? 0.72 : 1;
    const direction = { x: Math.cos(summon.angle), y: Math.sin(summon.angle) };
    const size = summon.radius * DEMO_COMBAT_ART_SIZE.rotatingMachineGunDiameterPerRadius;
    this.getSprite(index, DEMO_COMBAT_ART_TEXTURES.rotatingMachineGun.key)
      .setPosition(summon.position.x, summon.position.y)
      .setDisplaySize(size, size)
      .setRotation(calculateLeftFacingArtRotation(direction))
      .setAlpha(alpha)
      .setTint(0xffffff)
      .setVisible(true);
  }

  private drawOldHandgun(
    summon: Readonly<DemoSummonSnapshot>,
    index: number,
  ): void {
    const alpha = summon.lifecycle === "thrown" ? 0.72 : 1;
    const direction = { x: Math.cos(summon.angle), y: Math.sin(summon.angle) };
    const size = summon.radius * DEMO_COMBAT_ART_SIZE.oldHandgunDiameterPerRadius;
    this.getSprite(index, DEMO_COMBAT_ART_TEXTURES.oldHandgun.key)
      .setPosition(summon.position.x, summon.position.y)
      .setDisplaySize(size, size)
      .setRotation(calculateLeftFacingArtRotation(direction))
      .setAlpha(alpha)
      .setTint(0xffffff)
      .setVisible(true);
  }

  private drawCreeper(
    summon: Readonly<DemoSummonSnapshot>,
    index: number,
  ): void {
    const alpha = summon.lifecycle === "thrown" ? 0.72 : 1;
    const size = summon.radius * DEMO_COMBAT_ART_SIZE.creeperDiameterPerRadius;
    const pulse = summon.lifecycle === "casting"
      ? 1 + Math.sin(summon.castProgress * Math.PI * 8) * 0.08
      : 1;
    this.getSprite(index, DEMO_COMBAT_ART_TEXTURES.enemyCreeper.key)
      .setPosition(summon.position.x, summon.position.y)
      .setDisplaySize(size * pulse, size * pulse)
      .setRotation(summon.lifecycle === "thrown" ? summon.angle : 0)
      .setAlpha(alpha)
      .setTint(summon.lifecycle === "casting" ? 0xffe389 : 0xffffff)
      .setVisible(true);

    if (summon.lifecycle === "casting") {
      this.effectGraphics.fillStyle(0xe84d36, 0.08 + summon.castProgress * 0.12);
      this.effectGraphics.fillCircle(
        summon.position.x,
        summon.position.y,
        summon.explosionRadius,
      );
      this.effectGraphics.lineStyle(5, 0xe84d36, 0.55 + summon.castProgress * 0.4);
      this.effectGraphics.strokeCircle(
        summon.position.x,
        summon.position.y,
        summon.explosionRadius,
      );
    }
  }

  private getSprite(index: number, texture: string): Phaser.GameObjects.Image {
    const existing = this.sprites[index];
    if (existing) {
      return existing.setTexture(texture);
    }
    const sprite = this.scene.add.image(0, 0, texture).setDepth(29).setVisible(false);
    this.sprites.push(sprite);
    return sprite;
  }

  private drawDebugGeometry(summon: Readonly<DemoSummonSnapshot>): void {
    this.entityGraphics.lineStyle(2, 0x2785b8, 0.75);
    this.entityGraphics.strokeCircle(
      summon.position.x,
      summon.position.y,
      summon.radius,
    );
    if (summon.lifecycle === "thrown") {
      this.entityGraphics.lineBetween(
        summon.position.x,
        summon.position.y,
        summon.deploymentTarget.x,
        summon.deploymentTarget.y,
      );
      this.entityGraphics.strokeCircle(
        summon.deploymentTarget.x,
        summon.deploymentTarget.y,
        8,
      );
    }
  }
}
