import Phaser from "phaser";
import type { Vec2 } from "../playerRig/PlayerRigModel";

export class PrototypeEmitterView {
  private readonly hitText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, position: Vec2, targetRadius: number) {
    const graphics = scene.add.graphics().setDepth(22);
    graphics.fillStyle(0xc7793e, 1);
    graphics.fillCircle(position.x, position.y, targetRadius + 18);
    graphics.lineStyle(7, 0x4b2018, 1);
    graphics.strokeCircle(position.x, position.y, targetRadius + 18);
    graphics.fillStyle(0x3f2a22, 1);
    graphics.fillCircle(position.x, position.y, targetRadius - 6);
    graphics.lineStyle(5, 0xffd45f, 1);
    graphics.strokeCircle(position.x, position.y, targetRadius - 6);
    graphics.lineStyle(6, 0x4b2018, 1);
    graphics.lineBetween(
      position.x - targetRadius - 42,
      position.y,
      position.x - targetRadius + 4,
      position.y,
    );

    scene.add
      .text(position.x, position.y - targetRadius - 38, "静态发射器 / 受击目标", {
        color: "#4b2018",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(23);

    this.hitText = scene.add
      .text(position.x, position.y + targetRadius + 30, "反弹命中 0", {
        color: "#4b2018",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(23);
  }

  update(targetHits: number): void {
    this.hitText.setText(`反弹命中 ${targetHits}`);
  }
}
