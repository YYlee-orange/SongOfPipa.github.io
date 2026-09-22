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

    const { x, y } = snapshot.position;
    const flashing = snapshot.hitFlashRemaining > 0;
    const bodyColor = flashing ? 0xfff4d6 : 0xd56a48;
    const phaseColor =
      snapshot.phase === 1
        ? 0xe9a45f
        : snapshot.phase === 2
          ? 0xe4774f
          : 0xc94a48;

    this.graphics.fillStyle(bodyColor, snapshot.defeated ? 0.35 : 1);
    this.graphics.lineStyle(6, 0x4b2018, snapshot.defeated ? 0.35 : 1);
    this.graphics.fillEllipse(x, y + 4, 82, 108);
    this.graphics.strokeEllipse(x, y + 4, 82, 108);

    this.graphics.fillStyle(0xf6c67a, snapshot.defeated ? 0.3 : 1);
    this.graphics.lineStyle(5, 0x4b2018, snapshot.defeated ? 0.35 : 1);
    this.graphics.fillCircle(x + 6, y - 38, 27);
    this.graphics.strokeCircle(x + 6, y - 38, 27);

    this.graphics.fillStyle(0x4b2018, snapshot.defeated ? 0.3 : 1);
    this.graphics.fillCircle(x - 1, y - 43, 4);
    this.graphics.fillCircle(x + 14, y - 43, 4);
    this.graphics.lineStyle(4, 0x4b2018, snapshot.defeated ? 0.3 : 1);
    this.graphics.lineBetween(x - 1, y - 28, x + 15, y - 28);

    this.graphics.fillStyle(phaseColor, snapshot.defeated ? 0.25 : 0.9);
    this.graphics.fillCircle(x - 3, y + 4, 24);
    this.graphics.lineStyle(4, 0x4b2018, snapshot.defeated ? 0.3 : 1);
    this.graphics.strokeCircle(x - 3, y + 4, 24);

    this.graphics.fillStyle(0xf1b667, snapshot.defeated ? 0.25 : 1);
    this.graphics.fillEllipse(x - 5, y + 42, 50, 34);
    this.graphics.strokeEllipse(x - 5, y + 42, 50, 34);

    const muzzleX = x + this.config.muzzleOffset.x;
    const muzzleY = y + this.config.muzzleOffset.y;
    this.graphics.lineStyle(10, 0x4b2018, snapshot.defeated ? 0.3 : 1);
    this.graphics.lineBetween(x - 22, y, muzzleX, muzzleY);
    this.graphics.fillStyle(0x3f2a22, snapshot.defeated ? 0.3 : 1);
    this.graphics.fillCircle(muzzleX, muzzleY, 10);

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
}
