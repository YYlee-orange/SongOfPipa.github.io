import Phaser from "phaser";
import {
  calculateLeftFacingArtRotation,
  DEMO_COMBAT_ART_SIZE,
  DEMO_COMBAT_ART_TEXTURES,
  resolveMovementDirection,
} from "../combat/demoCombatArtConfig.ts";
import type {
  DemoRocketExplosionSnapshot,
  DemoRocketSnapshot,
} from "./DemoRocketModel.ts";

export class DemoRocketView {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(31);
  }

  render(
    rockets: readonly Readonly<DemoRocketSnapshot>[],
    explosions: readonly Readonly<DemoRocketExplosionSnapshot>[],
    showDebugGeometry: boolean,
  ): void {
    this.graphics.clear();
    for (let index = 0; index < rockets.length; index += 1) {
      this.drawRocket(rockets[index], index, showDebugGeometry);
    }
    for (let index = rockets.length; index < this.sprites.length; index += 1) {
      this.sprites[index].setVisible(false);
    }
    for (const explosion of explosions) {
      this.drawExplosion(explosion);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites.length = 0;
  }

  private drawRocket(
    rocket: Readonly<DemoRocketSnapshot>,
    index: number,
    showDebugGeometry: boolean,
  ): void {
    const texture = rocket.motion === "reflected"
      ? DEMO_COMBAT_ART_TEXTURES.playerRocket.key
      : DEMO_COMBAT_ART_TEXTURES.enemyRocket.key;
    const sprite = this.getSprite(index, texture);
    const absorptionScale = rocket.motion === "absorbing"
      ? Math.max(0.18, 1 - rocket.absorptionProgress * 0.82)
      : 1;
    const direction = resolveMovementDirection(
      rocket.position,
      rocket.previousPosition,
      rocket.direction,
    );

    this.graphics.lineStyle(
      rocket.motion === "absorbing" ? 12 : 8,
      rocket.motion === "incoming" ? 0xff9b45 : 0x67d9df,
      0.26,
    );
    this.graphics.lineBetween(
      rocket.previousPosition.x,
      rocket.previousPosition.y,
      rocket.position.x,
      rocket.position.y,
    );

    sprite
      .setTexture(texture)
      .setPosition(rocket.position.x, rocket.position.y)
      .setDisplaySize(
        rocket.radius * DEMO_COMBAT_ART_SIZE.rocketLengthPerRadius * absorptionScale,
        rocket.radius * DEMO_COMBAT_ART_SIZE.rocketHeightPerRadius * absorptionScale,
      )
      .setRotation(calculateLeftFacingArtRotation(direction))
      .setAlpha(rocket.motion === "absorbing" ? 1 - rocket.absorptionProgress * 0.25 : 1)
      .setVisible(true);

    if (showDebugGeometry) {
      this.graphics.lineStyle(2, 0x2f8e93, 0.85);
      this.graphics.strokeCircle(rocket.position.x, rocket.position.y, rocket.radius);
      this.graphics.lineBetween(
        rocket.position.x,
        rocket.position.y,
        rocket.position.x + direction.x * 72,
        rocket.position.y + direction.y * 72,
      );
    }
  }

  private getSprite(index: number, texture: string): Phaser.GameObjects.Image {
    const existing = this.sprites[index];
    if (existing) {
      return existing;
    }
    const sprite = this.scene.add.image(0, 0, texture).setDepth(32).setVisible(false);
    this.sprites.push(sprite);
    return sprite;
  }

  private drawExplosion(explosion: Readonly<DemoRocketExplosionSnapshot>): void {
    const progress = Phaser.Math.Clamp(explosion.progress, 0, 1);
    const radius = 18 + progress * 48;
    const alpha = 1 - progress;
    this.graphics.fillStyle(0xffc447, alpha * 0.45);
    this.graphics.fillCircle(explosion.position.x, explosion.position.y, radius);
    this.graphics.lineStyle(8 - progress * 5, 0xef5b3f, alpha);
    this.graphics.strokeCircle(explosion.position.x, explosion.position.y, radius * 0.78);
  }
}
