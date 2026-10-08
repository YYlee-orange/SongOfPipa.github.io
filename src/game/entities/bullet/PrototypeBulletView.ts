import Phaser from "phaser";
import {
  calculateLeftFacingArtRotation,
  DEMO_COMBAT_ART_SIZE,
  DEMO_COMBAT_ART_TEXTURES,
  resolveMovementDirection,
} from "../../demo/combat/demoCombatArtConfig.ts";
import type { PrototypeBulletSnapshot } from "./PrototypeBulletModel";

export class PrototypeBulletView {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly sprites: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(30);
  }

  render(bullets: readonly Readonly<PrototypeBulletSnapshot>[], time: number): void {
    this.graphics.clear();
    const artAvailable = this.scene.textures.exists(DEMO_COMBAT_ART_TEXTURES.enemyBullet.key);
    let spriteIndex = 0;

    for (const bullet of bullets) {
      if (artAvailable) {
        this.drawArtBullet(bullet, time, spriteIndex);
        spriteIndex += 1;
      } else if (bullet.motion === "absorbing") {
        this.drawAbsorbingFallback(bullet);
      } else if (bullet.motion === "reflected") {
        this.drawReflectedFallback(bullet);
      } else if (bullet.type === "special") {
        this.drawSpecialFallback(bullet, time);
      } else {
        this.drawNormalFallback(bullet);
      }
    }

    for (let index = spriteIndex; index < this.sprites.length; index += 1) {
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

  private drawArtBullet(
    bullet: Readonly<PrototypeBulletSnapshot>,
    time: number,
    spriteIndex: number,
  ): void {
    if (bullet.motion === "reflected") {
      this.graphics.lineStyle(7, 0x67d9df, 0.36);
      this.graphics.lineBetween(
        bullet.previousPosition.x,
        bullet.previousPosition.y,
        bullet.position.x,
        bullet.position.y,
      );
    } else if (bullet.motion === "absorbing") {
      const glowColor = bullet.type === "special" ? 0xffe46a : 0x67d9df;
      this.graphics.lineStyle(7, glowColor, 0.34 + bullet.absorptionProgress * 0.3);
      this.graphics.lineBetween(
        bullet.previousPosition.x,
        bullet.previousPosition.y,
        bullet.position.x,
        bullet.position.y,
      );
    }

    if (bullet.type === "special") {
      const pulse = 1 + Math.sin(time / 85 + bullet.id) * 0.035;
      this.graphics.lineStyle(4, 0xffdf55, 0.38);
      this.graphics.strokeCircle(
        bullet.position.x,
        bullet.position.y,
        bullet.radius * 1.16 * pulse,
      );
    }

    const texture = bullet.motion === "reflected"
      ? DEMO_COMBAT_ART_TEXTURES.playerBullet.key
      : bullet.type === "special"
        ? DEMO_COMBAT_ART_TEXTURES.enemySpecialBullet.key
        : DEMO_COMBAT_ART_TEXTURES.enemyBullet.key;
    const sprite = this.getSprite(spriteIndex, texture);
    const absorptionScale = bullet.motion === "absorbing"
      ? Math.max(0.18, 1 - bullet.absorptionProgress * 0.82)
      : 1;
    const direction = resolveMovementDirection(
      bullet.position,
      bullet.previousPosition,
      bullet.velocity,
    );
    sprite
      .setTexture(texture)
      .setPosition(bullet.position.x, bullet.position.y)
      .setDisplaySize(
        bullet.radius * DEMO_COMBAT_ART_SIZE.bulletLengthPerRadius * absorptionScale,
        bullet.radius * DEMO_COMBAT_ART_SIZE.bulletHeightPerRadius * absorptionScale,
      )
      .setRotation(calculateLeftFacingArtRotation(direction))
      .setAlpha(bullet.motion === "absorbing" ? 1 - bullet.absorptionProgress * 0.25 : 1)
      .setVisible(true);
  }

  private getSprite(index: number, texture: string): Phaser.GameObjects.Image {
    const existing = this.sprites[index];
    if (existing) {
      return existing;
    }
    const sprite = this.scene.add.image(0, 0, texture).setDepth(31).setVisible(false);
    this.sprites.push(sprite);
    return sprite;
  }

  private drawNormalFallback(bullet: Readonly<PrototypeBulletSnapshot>): void {
    this.graphics.fillStyle(0x7651a8, 1);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, bullet.radius);
    this.graphics.lineStyle(4, 0x35264f, 1);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, bullet.radius);
  }

  private drawSpecialFallback(
    bullet: Readonly<PrototypeBulletSnapshot>,
    time: number,
  ): void {
    const pulse = 1 + Math.sin(time / 85 + bullet.id) * 0.04;
    this.graphics.lineStyle(3, 0xfff0ad, 0.85);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, bullet.radius * 1.12 * pulse);
    this.graphics.fillStyle(0xef4776, 1);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, bullet.radius);
  }

  private drawReflectedFallback(bullet: Readonly<PrototypeBulletSnapshot>): void {
    this.graphics.lineStyle(7, 0x67d9df, 0.42);
    this.graphics.lineBetween(
      bullet.previousPosition.x,
      bullet.previousPosition.y,
      bullet.position.x,
      bullet.position.y,
    );
    this.graphics.fillStyle(0xffce55, 1);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, bullet.radius);
  }

  private drawAbsorbingFallback(bullet: Readonly<PrototypeBulletSnapshot>): void {
    const progress = Phaser.Math.Clamp(bullet.absorptionProgress, 0, 1);
    const radius = Math.max(2, bullet.radius * (1 - progress * 0.82));
    const color = bullet.type === "special" ? 0xef4776 : 0x7651a8;
    const glowColor = bullet.type === "special" ? 0xfff0ad : 0x67d9df;
    this.graphics.fillStyle(color, 1 - progress * 0.25);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, radius);
    this.graphics.lineStyle(3, glowColor, 0.9);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, radius * 1.35);
  }
}
