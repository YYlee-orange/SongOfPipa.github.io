import Phaser from "phaser";
import { DESIGN } from "../../config";
import type {
  PrototypeBossConfig,
  PrototypeBossSnapshot,
} from "./PrototypeBossModel";

export class PrototypeBossView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly hudGraphics: Phaser.GameObjects.Graphics;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly config: PrototypeBossConfig;

  constructor(scene: Phaser.Scene, config: PrototypeBossConfig) {
    this.config = config;
    this.graphics = scene.add.graphics().setDepth(22);
    this.hudGraphics = scene.add.graphics().setDepth(880);
    this.statusText = scene.add
      .text(DESIGN.width - 32, 28, "", {
        color: "#4b2018",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "19px",
        fontStyle: "bold",
        align: "right",
      })
      .setOrigin(1, 0)
      .setDepth(881);
  }

  render(snapshot: Readonly<PrototypeBossSnapshot>): void {
    this.graphics.clear();
    this.hudGraphics.clear();

    const head = snapshot.headPosition;
    const weapon = snapshot.weaponPosition;
    const muzzle = snapshot.muzzlePosition;
    const alpha = snapshot.defeated ? 0.35 : 1;
    const flashing = snapshot.hitFlashRemaining > 0;
    const headColor = flashing ? 0xfff4d6 : 0xf6c67a;
    const phaseColor =
      snapshot.phase === 1
        ? 0xe9a45f
        : snapshot.phase === 2
          ? 0xe4774f
          : 0xc94a48;

    this.drawWeapon(weapon, muzzle, phaseColor, alpha);
    this.drawHead(head, headColor, alpha);

    const healthRatio = snapshot.health / Math.max(1, snapshot.maximumHealth);
    const barWidth = 286;
    const barX = DESIGN.width - barWidth - 30;
    const barY = 88;
    this.hudGraphics.fillStyle(0x4b2018, 0.28);
    this.hudGraphics.fillRoundedRect(barX, barY, barWidth, 18, 9);
    this.hudGraphics.fillStyle(phaseColor, 1);
    this.hudGraphics.fillRoundedRect(
      barX,
      barY,
      barWidth * Phaser.Math.Clamp(healthRatio, 0, 1),
      18,
      9,
    );
    this.hudGraphics.lineStyle(3, 0x4b2018, 0.9);
    this.hudGraphics.strokeRoundedRect(barX, barY, barWidth, 18, 9);

    this.statusText.setText(
      snapshot.defeated
        ? `测试 Boss 已击破\n${snapshot.health} / ${snapshot.maximumHealth} · Enter 重试`
        : `测试 Boss · 阶段 ${snapshot.phase}\n${snapshot.health} / ${snapshot.maximumHealth}`,
    );
  }

  destroy(): void {
    this.graphics.destroy();
    this.hudGraphics.destroy();
    this.statusText.destroy();
  }

  private drawHead(
    position: { x: number; y: number },
    color: number,
    alpha: number,
  ): void {
    const radius = this.config.headVisibleRadius;
    const x = position.x;
    const y = position.y;

    this.graphics.fillStyle(color, alpha);
    this.graphics.lineStyle(7, 0x4b2018, alpha);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.strokeCircle(x, y, radius);

    this.graphics.fillStyle(0x4b2018, alpha);
    this.graphics.fillCircle(x - radius * 0.26, y - radius * 0.12, 6);
    this.graphics.fillCircle(x + radius * 0.18, y - radius * 0.12, 6);
    this.graphics.lineStyle(5, 0x4b2018, alpha);
    this.graphics.beginPath();
    this.graphics.arc(
      x - radius * 0.02,
      y + radius * 0.08,
      radius * 0.34,
      0.15,
      Math.PI - 0.15,
      false,
    );
    this.graphics.strokePath();

    this.graphics.fillStyle(0xe4774f, alpha * 0.9);
    this.graphics.fillEllipse(
      x - radius * 0.55,
      y + radius * 0.04,
      radius * 0.24,
      radius * 0.16,
    );
    this.graphics.fillEllipse(
      x + radius * 0.52,
      y + radius * 0.04,
      radius * 0.24,
      radius * 0.16,
    );
  }

  private drawWeapon(
    position: { x: number; y: number },
    muzzle: { x: number; y: number },
    phaseColor: number,
    alpha: number,
  ): void {
    const barrelWidth = Math.max(34, position.x - muzzle.x);
    const barrelY = muzzle.y - 12;

    this.graphics.fillStyle(0xf1b667, alpha);
    this.graphics.lineStyle(5, 0x4b2018, alpha);
    this.graphics.fillEllipse(position.x + 13, position.y + 15, 58, 42);
    this.graphics.strokeEllipse(position.x + 13, position.y + 15, 58, 42);

    this.graphics.fillStyle(0x3f2a22, alpha);
    this.graphics.fillRoundedRect(muzzle.x, barrelY, barrelWidth, 24, 7);
    this.graphics.lineStyle(4, 0x4b2018, alpha);
    this.graphics.strokeRoundedRect(muzzle.x, barrelY, barrelWidth, 24, 7);

    this.graphics.fillStyle(phaseColor, alpha);
    this.graphics.fillRoundedRect(position.x - 21, position.y - 16, 54, 32, 8);
    this.graphics.lineStyle(4, 0x4b2018, alpha);
    this.graphics.strokeRoundedRect(position.x - 21, position.y - 16, 54, 32, 8);

    this.graphics.fillStyle(0x4b2018, alpha);
    this.graphics.fillCircle(muzzle.x, muzzle.y, 8);
    this.graphics.lineStyle(8, 0x4b2018, alpha);
    this.graphics.lineBetween(
      position.x + 12,
      position.y + 12,
      position.x + 19,
      position.y + 38,
    );
  }
}
