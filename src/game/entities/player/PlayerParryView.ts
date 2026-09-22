import Phaser from "phaser";
import type { Vec2 } from "../playerRig/PlayerRigModel";
import type { PlayerParrySnapshot } from "./PlayerParryModel";

export class PlayerParryView {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(45);
  }

  render(center: Vec2, snapshot: Readonly<PlayerParrySnapshot>, time: number): void {
    this.graphics.clear();

    if (snapshot.state === "active") {
      const pulse = 1 + Math.sin(time / 45) * 0.04;
      this.graphics.fillStyle(0xffd45f, 0.12);
      this.graphics.fillCircle(center.x, center.y, snapshot.radius * pulse);
      this.graphics.lineStyle(6, 0xffd45f, 0.95);
      this.graphics.strokeCircle(center.x, center.y, snapshot.radius * pulse);
      this.graphics.lineStyle(2, 0xfff4c1, 0.95);
      this.graphics.strokeCircle(center.x, center.y, snapshot.radius * 0.78);
      return;
    }

    if (snapshot.feedback === "success") {
      const progress = Phaser.Math.Clamp(snapshot.feedbackProgress, 0, 1);
      const easedProgress = Phaser.Math.Easing.Cubic.Out(progress);
      const radius = Phaser.Math.Linear(
        snapshot.radius,
        snapshot.radius * 1.55,
        easedProgress,
      );
      const alpha = 0.9 * (1 - progress) ** 1.35;
      const lineWidth = Phaser.Math.Linear(8, 2, easedProgress);
      this.graphics.lineStyle(lineWidth, 0x62d4c7, alpha);
      this.graphics.strokeCircle(center.x, center.y, radius);
      return;
    }

    if (snapshot.feedback === "miss") {
      this.graphics.lineStyle(4, 0xb64b3d, 0.42);
      this.graphics.strokeCircle(center.x, center.y, snapshot.radius);
      return;
    }

    if (snapshot.state === "recovery") {
      this.graphics.lineStyle(3, 0xb64b3d, 0.32);
      this.graphics.strokeCircle(center.x, center.y, snapshot.radius);
      return;
    }

    this.graphics.lineStyle(2, 0x8b5d42, 0.16);
    this.graphics.strokeCircle(center.x, center.y, snapshot.radius);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
