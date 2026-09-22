import Phaser from "phaser";
import type {
  PlayerRigModel,
  TorsoShape,
  TwoBoneChain,
  Vec2,
} from "./PlayerRigModel";

const RIG_COLORS = Object.freeze({
  bone: 0x766d66,
  joint: 0x9d9188,
  torso: 0xc9ae9a,
  head: 0xf1e1c9,
  pelvis: 0xf2c58f,
  pelvisOutline: 0x4b2018,
  pelvisHighlight: 0xffe2b0,
  hitCore: 0xd83d32,
  hitCoreFlash: 0xff7465,
  boost: 0x49c8d2,
});

const PERFORMANCE_ALPHA = Object.freeze({
  bone: 0.44,
  joint: 0.5,
  torso: 0.42,
  head: 0.55,
  face: 0.52,
});

export interface PlayerRigPresentation {
  hitRadius: number;
  invulnerable: boolean;
  defeated: boolean;
  boosted: boolean;
}

const DEFAULT_PRESENTATION: PlayerRigPresentation = Object.freeze({
  hitRadius: 12,
  invulnerable: false,
  defeated: false,
  boosted: false,
});

export class PlayerRigView {
  private readonly scene: Phaser.Scene;
  private readonly model: PlayerRigModel;
  private readonly bodyGraphics: Phaser.GameObjects.Graphics;
  private readonly pelvisGraphics: Phaser.GameObjects.Graphics;
  private readonly hitCoreGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, model: PlayerRigModel) {
    this.scene = scene;
    this.model = model;
    this.bodyGraphics = scene.add.graphics().setDepth(20);
    this.pelvisGraphics = scene.add.graphics().setDepth(25);
    this.hitCoreGraphics = scene.add.graphics().setDepth(40);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  render(presentation: PlayerRigPresentation = DEFAULT_PRESENTATION): void {
    const pose = this.model.getPose();

    this.bodyGraphics.clear();
    this.pelvisGraphics.clear();
    this.hitCoreGraphics.clear();
    this.drawChain(pose.leftLeg, 14);
    this.drawChain(pose.rightLeg, 14);
    this.drawTorso(pose.torso);
    this.drawChain(pose.leftArm, 12);
    this.drawChain(pose.rightArm, 12);

    this.drawHead(pose.head);
    this.drawPelvis(pose.pelvis, presentation);
  }

  destroy(): void {
    this.bodyGraphics.destroy();
    this.pelvisGraphics.destroy();
    this.hitCoreGraphics.destroy();
  }

  private drawHead(head: Vec2): void {
    this.bodyGraphics.fillStyle(RIG_COLORS.head, PERFORMANCE_ALPHA.head);
    this.bodyGraphics.fillEllipse(head.x, head.y, 70, 88);
    this.bodyGraphics.lineStyle(4, RIG_COLORS.bone, PERFORMANCE_ALPHA.bone);
    this.bodyGraphics.strokeEllipse(head.x, head.y, 70, 88);
    this.bodyGraphics.fillStyle(RIG_COLORS.bone, PERFORMANCE_ALPHA.face);
    this.bodyGraphics.fillCircle(head.x - 12, head.y - 8, 4);
    this.bodyGraphics.fillCircle(head.x + 12, head.y - 8, 4);
  }

  private drawPelvis(
    pelvis: Vec2,
    presentation: Readonly<PlayerRigPresentation>,
  ): void {
    const size = this.model.getPelvisSize();
    const flashVisible =
      presentation.invulnerable && Math.floor(this.scene.time.now / 90) % 2 === 0;
    const pelvisFillColor = presentation.defeated
      ? 0x866e65
      : RIG_COLORS.pelvis;
    const hitCoreColor = presentation.defeated
      ? 0x79645d
      : flashVisible
        ? RIG_COLORS.hitCoreFlash
        : RIG_COLORS.hitCore;
    const flashAlpha = flashVisible ? 0.32 : 1;
    this.pelvisGraphics.setAlpha(flashAlpha);
    this.hitCoreGraphics.setAlpha(flashAlpha);
    if (presentation.boosted && !presentation.defeated) {
      const pulse = 1 + Math.sin(this.scene.time.now / 75) * 0.06;
      this.pelvisGraphics.lineStyle(7, RIG_COLORS.boost, 0.82);
      this.pelvisGraphics.strokeEllipse(
        pelvis.x,
        pelvis.y,
        (size.width + 28) * pulse,
        (size.height + 28) * pulse,
      );
    }
    this.pelvisGraphics.fillStyle(RIG_COLORS.pelvisHighlight, 0.42);
    this.pelvisGraphics.fillEllipse(
      pelvis.x,
      pelvis.y,
      size.width + 14,
      size.height + 14,
    );
    this.pelvisGraphics.fillStyle(pelvisFillColor, 1);
    this.pelvisGraphics.fillEllipse(pelvis.x, pelvis.y, size.width, size.height);
    this.pelvisGraphics.lineStyle(7, RIG_COLORS.pelvisOutline, 1);
    this.pelvisGraphics.strokeEllipse(pelvis.x, pelvis.y, size.width, size.height);
    this.pelvisGraphics.lineStyle(2, RIG_COLORS.pelvisHighlight, 0.9);
    this.pelvisGraphics.strokeEllipse(
      pelvis.x - 5,
      pelvis.y - 4,
      size.width - 18,
      size.height - 16,
    );
    this.hitCoreGraphics.fillStyle(hitCoreColor, 1);
    this.hitCoreGraphics.fillCircle(
      pelvis.x,
      pelvis.y,
      presentation.hitRadius,
    );
    this.hitCoreGraphics.lineStyle(3, RIG_COLORS.pelvisOutline, 1);
    this.hitCoreGraphics.strokeCircle(
      pelvis.x,
      pelvis.y,
      presentation.hitRadius,
    );
  }

  private drawTorso(torso: Readonly<TorsoShape>): void {
    this.bodyGraphics.fillStyle(RIG_COLORS.torso, PERFORMANCE_ALPHA.torso);
    this.bodyGraphics.lineStyle(5, RIG_COLORS.bone, PERFORMANCE_ALPHA.bone);
    this.bodyGraphics.beginPath();
    this.bodyGraphics.moveTo(torso.topLeft.x, torso.topLeft.y);
    this.bodyGraphics.lineTo(torso.topRight.x, torso.topRight.y);
    this.bodyGraphics.lineTo(torso.bottomRight.x, torso.bottomRight.y);
    this.bodyGraphics.lineTo(torso.bottomLeft.x, torso.bottomLeft.y);
    this.bodyGraphics.closePath();
    this.bodyGraphics.fillPath();
    this.bodyGraphics.strokePath();
  }

  private drawChain(chain: TwoBoneChain, width: number): void {
    this.bodyGraphics.lineStyle(width, RIG_COLORS.bone, PERFORMANCE_ALPHA.bone);
    this.bodyGraphics.lineBetween(chain.root.x, chain.root.y, chain.joint.x, chain.joint.y);
    this.bodyGraphics.lineBetween(chain.joint.x, chain.joint.y, chain.end.x, chain.end.y);
    this.bodyGraphics.fillStyle(RIG_COLORS.joint, PERFORMANCE_ALPHA.joint);
    this.bodyGraphics.fillCircle(chain.root.x, chain.root.y, 6);
    this.bodyGraphics.fillCircle(chain.joint.x, chain.joint.y, 7);
    this.bodyGraphics.fillCircle(chain.end.x, chain.end.y, 8);
  }
}
