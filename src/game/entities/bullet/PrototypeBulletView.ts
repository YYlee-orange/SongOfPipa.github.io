import Phaser from "phaser";
import type { PrototypeBulletSnapshot } from "./PrototypeBulletModel";

export class PrototypeBulletView {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(30);
  }

  render(bullets: readonly Readonly<PrototypeBulletSnapshot>[], time: number): void {
    this.graphics.clear();

    for (const bullet of bullets) {
      if (bullet.motion === "absorbing") {
        this.drawAbsorbing(bullet);
      } else if (bullet.motion === "reflected") {
        this.drawReflected(bullet);
      } else if (bullet.type === "special") {
        this.drawSpecial(bullet, time);
      } else {
        this.drawNormal(bullet);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private drawNormal(bullet: Readonly<PrototypeBulletSnapshot>): void {
    this.graphics.fillStyle(0x7651a8, 1);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, bullet.radius);
    this.graphics.lineStyle(4, 0x35264f, 1);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, bullet.radius);
    this.graphics.fillStyle(0xffdda1, 0.95);
    this.graphics.fillCircle(
      bullet.position.x - bullet.radius * 0.28,
      bullet.position.y - bullet.radius * 0.3,
      Math.max(3, bullet.radius * 0.2),
    );
  }

  private drawSpecial(
    bullet: Readonly<PrototypeBulletSnapshot>,
    time: number,
  ): void {
    const pulse = 1 + Math.sin(time / 85 + bullet.id) * 0.04;
    const outerRadius = bullet.radius * (1.12 + (pulse - 1));
    this.graphics.lineStyle(3, 0xfff0ad, 0.85);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, outerRadius);
    this.graphics.fillStyle(0xef4776, 1);
    this.graphics.lineStyle(4, 0x6b1835, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(bullet.position.x, bullet.position.y - bullet.radius * pulse);
    this.graphics.lineTo(bullet.position.x + bullet.radius * pulse, bullet.position.y);
    this.graphics.lineTo(bullet.position.x, bullet.position.y + bullet.radius * pulse);
    this.graphics.lineTo(bullet.position.x - bullet.radius * pulse, bullet.position.y);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
    this.graphics.fillStyle(0xfff0ad, 1);
    this.graphics.fillCircle(
      bullet.position.x - bullet.radius * 0.2,
      bullet.position.y - bullet.radius * 0.25,
      3,
    );
  }

  private drawReflected(bullet: Readonly<PrototypeBulletSnapshot>): void {
    this.graphics.lineStyle(7, 0x67d9df, 0.42);
    this.graphics.lineBetween(
      bullet.previousPosition.x,
      bullet.previousPosition.y,
      bullet.position.x,
      bullet.position.y,
    );
    this.graphics.fillStyle(0xffce55, 1);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, bullet.radius);
    this.graphics.lineStyle(4, 0x7a3f18, 1);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, bullet.radius);
    this.graphics.fillStyle(0xfff5c4, 1);
    this.graphics.fillCircle(
      bullet.position.x - bullet.radius * 0.25,
      bullet.position.y - bullet.radius * 0.25,
      4,
    );
  }

  private drawAbsorbing(bullet: Readonly<PrototypeBulletSnapshot>): void {
    const progress = Phaser.Math.Clamp(bullet.absorptionProgress, 0, 1);
    const radius = Math.max(2, bullet.radius * (1 - progress * 0.82));
    const color = bullet.type === "special" ? 0xef4776 : 0x7651a8;
    const glowColor = bullet.type === "special" ? 0xfff0ad : 0x67d9df;

    this.graphics.lineStyle(8 - progress * 5, glowColor, 0.25 + progress * 0.5);
    this.graphics.lineBetween(
      bullet.previousPosition.x,
      bullet.previousPosition.y,
      bullet.position.x,
      bullet.position.y,
    );
    this.graphics.fillStyle(color, 1 - progress * 0.25);
    this.graphics.fillCircle(bullet.position.x, bullet.position.y, radius);
    this.graphics.lineStyle(3, glowColor, 0.9);
    this.graphics.strokeCircle(bullet.position.x, bullet.position.y, radius * 1.35);
  }
}
