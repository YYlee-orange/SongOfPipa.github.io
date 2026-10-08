import Phaser from "phaser";
import type { DemoBossAttackSnapshot } from "../boss/attacks/DemoBossAttackModel.ts";
import type { DemoBossActorSnapshot } from "../boss/DemoBossActorModel.ts";
import type { DemoLaserBeam } from "./DemoLaserGeometry.ts";
import { DEMO_COMBAT_ART_TEXTURES } from "../combat/demoCombatArtConfig.ts";

/** 第五阶段激光灰盒显示；正式安全三角只在调试模式绘制。 */
export class DemoLaserView {
  private readonly scene: Phaser.Scene;
  private readonly beamSprite: Phaser.GameObjects.Image;
  private readonly beamGraphics: Phaser.GameObjects.Graphics;
  private readonly debugGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.beamSprite = scene.add
      .image(0, 0, DEMO_COMBAT_ART_TEXTURES.laserBeam.key)
      .setOrigin(0, 0.5)
      .setDepth(12)
      .setVisible(false);
    this.beamGraphics = scene.add.graphics().setDepth(12);
    this.debugGraphics = scene.add.graphics().setDepth(44);
  }

  render(
    beam: Readonly<DemoLaserBeam> | null,
    attack: Readonly<DemoBossAttackSnapshot> | null,
    actor: Readonly<DemoBossActorSnapshot>,
    showDebug: boolean,
  ): void {
    this.beamGraphics.clear();
    this.debugGraphics.clear();
    this.beamSprite.setVisible(false);
    if (!beam || !attack || attack.kind !== "phase5-laser") {
      return;
    }

    if (beam.telegraph) {
      const length = Math.hypot(beam.end.x - beam.origin.x, beam.end.y - beam.origin.y);
      const chargePulse = 0.82 + Math.sin(this.scene.time.now / 90) * 0.08;
      this.beamSprite
        .setPosition(beam.origin.x, beam.origin.y)
        .setRotation(beam.angle)
        .setDisplaySize(length * chargePulse, Math.max(5, beam.width * 0.1))
        .setAlpha(0.42)
        .setVisible(true);
      this.beamGraphics.fillStyle(0xffe9a8, 0.9);
      this.beamGraphics.fillCircle(beam.origin.x, beam.origin.y, 13);
    }

    if (beam.active) {
      const length = Math.hypot(beam.end.x - beam.origin.x, beam.end.y - beam.origin.y);
      const firingPulse = 0.94 + Math.sin(this.scene.time.now / 55) * 0.06;
      this.beamSprite
        .setPosition(beam.origin.x, beam.origin.y)
        .setRotation(beam.angle)
        .setDisplaySize(length, beam.width * firingPulse)
        .setAlpha(0.94)
        .setVisible(true);
    }

    if (!showDebug || attack.laserMode !== "ultimate") {
      return;
    }
    const length = 1_500;
    const upper = -2.45;
    const lower = 2.45;
    this.debugGraphics.lineStyle(2, 0x2c8d95, 0.72);
    this.debugGraphics.lineBetween(
      actor.weaponPosition.x,
      actor.weaponPosition.y,
      actor.weaponPosition.x + Math.cos(upper) * length,
      actor.weaponPosition.y + Math.sin(upper) * length,
    );
    this.debugGraphics.lineBetween(
      actor.weaponPosition.x,
      actor.weaponPosition.y,
      actor.weaponPosition.x + Math.cos(lower) * length,
      actor.weaponPosition.y + Math.sin(lower) * length,
    );
    const safeTop = attack.safeCorner === "top";
    this.debugGraphics.fillStyle(safeTop ? 0x65b96f : 0xc65345, 0.13);
    this.debugGraphics.fillTriangle(
      actor.weaponPosition.x,
      actor.weaponPosition.y,
      actor.weaponPosition.x,
      0,
      760,
      0,
    );
    this.debugGraphics.fillStyle(!safeTop ? 0x65b96f : 0xc65345, 0.13);
    this.debugGraphics.fillTriangle(
      actor.weaponPosition.x,
      actor.weaponPosition.y,
      actor.weaponPosition.x,
      720,
      760,
      720,
    );
  }

  destroy(): void {
    this.beamSprite.destroy();
    this.beamGraphics.destroy();
    this.debugGraphics.destroy();
  }
}
