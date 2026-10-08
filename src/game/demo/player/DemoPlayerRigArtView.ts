import Phaser from "phaser";
import type { PlayerRigPresentation } from "../../entities/playerRig/PlayerRigView.ts";
import type {
  PlayerRigModel,
  TorsoShape,
  TwoBoneChain,
  Vec2,
} from "../../entities/playerRig/PlayerRigModel.ts";
import {
  calculateAnchoredArtTransform,
  calculateUprightBodyRotation,
} from "./DemoPlayerArtGeometry.ts";
import {
  DEMO_PLAYER_HEAD_ART,
  DEMO_PLAYER_PELVIS_ART,
  DEMO_PLAYER_SEGMENT_ART,
  DEMO_PLAYER_TORSO_ART,
  type DemoPlayerSegmentArtConfig,
} from "./demoPlayerArtConfig.ts";

const CORE_COLORS = Object.freeze({
  outline: 0x2c1611,
  hitCore: 0xd83d32,
  hitCoreFlash: 0xff7465,
  defeated: 0x79645d,
  boost: 0x49c8d2,
});

const DEFAULT_PRESENTATION: PlayerRigPresentation = Object.freeze({
  hitRadius: 12,
  invulnerable: false,
  defeated: false,
  boosted: false,
});

/** D6 player art view. It consumes the accepted rig pose without changing gameplay. */
export class DemoPlayerRigArtView {
  private readonly scene: Phaser.Scene;
  private readonly model: PlayerRigModel;
  private readonly segments: Readonly<{
    armUpperLeft: AnchoredArtSegment;
    armLowerLeft: AnchoredArtSegment;
    armUpperRight: AnchoredArtSegment;
    armLowerRight: AnchoredArtSegment;
    legUpperLeft: AnchoredArtSegment;
    legLowerLeft: AnchoredArtSegment;
    legUpperRight: AnchoredArtSegment;
    legLowerRight: AnchoredArtSegment;
    torso: AnchoredArtSegment;
  }>;
  private readonly head: Phaser.GameObjects.Image;
  private readonly pelvis: Phaser.GameObjects.Image;
  private readonly pelvisEffect: Phaser.GameObjects.Graphics;
  private readonly hitCore: Phaser.GameObjects.Graphics;
  private readonly bodyImages: readonly Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, model: PlayerRigModel) {
    this.scene = scene;
    this.model = model;
    this.segments = Object.freeze({
      armUpperLeft: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.armUpperLeft),
      armLowerLeft: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.armLowerLeft),
      armUpperRight: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.armUpperRight),
      armLowerRight: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.armLowerRight),
      legUpperLeft: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.legUpperLeft),
      legLowerLeft: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.legLowerLeft),
      legUpperRight: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.legUpperRight),
      legLowerRight: new AnchoredArtSegment(scene, DEMO_PLAYER_SEGMENT_ART.legLowerRight),
      torso: new AnchoredArtSegment(scene, {
        ...DEMO_PLAYER_TORSO_ART,
        referenceLength: 1,
      }),
    });
    this.head = scene.add
      .image(0, 0, DEMO_PLAYER_HEAD_ART.key)
      .setOrigin(DEMO_PLAYER_HEAD_ART.origin.x, DEMO_PLAYER_HEAD_ART.origin.y)
      .setDisplaySize(
        DEMO_PLAYER_HEAD_ART.displaySize.width,
        DEMO_PLAYER_HEAD_ART.displaySize.height,
      )
      .setAlpha(DEMO_PLAYER_HEAD_ART.alpha)
      .setDepth(DEMO_PLAYER_HEAD_ART.depth);
    this.pelvis = scene.add
      .image(0, 0, DEMO_PLAYER_PELVIS_ART.key)
      .setOrigin(DEMO_PLAYER_PELVIS_ART.origin.x, DEMO_PLAYER_PELVIS_ART.origin.y)
      .setDisplaySize(
        DEMO_PLAYER_PELVIS_ART.displaySize.width,
        DEMO_PLAYER_PELVIS_ART.displaySize.height,
      )
      .setAlpha(DEMO_PLAYER_PELVIS_ART.alpha)
      .setDepth(DEMO_PLAYER_PELVIS_ART.depth);
    this.pelvisEffect = scene.add.graphics().setDepth(26);
    this.hitCore = scene.add.graphics().setDepth(40);
    this.bodyImages = Object.freeze([
      ...Object.values(this.segments).map((segment) => segment.image),
      this.head,
    ]);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  render(presentation: PlayerRigPresentation = DEFAULT_PRESENTATION): void {
    const pose = this.model.getPose();
    const shoulderOffset = calculateAxisOffset(
      pose.torso.topCenter,
      pose.torso.bottomCenter,
      DEMO_PLAYER_TORSO_ART.shoulderDrop,
    );
    this.renderChain(
      pose.leftArm,
      this.segments.armUpperLeft,
      this.segments.armLowerLeft,
      shoulderOffset,
    );
    this.renderChain(
      pose.rightArm,
      this.segments.armUpperRight,
      this.segments.armLowerRight,
      shoulderOffset,
    );
    this.renderChain(pose.leftLeg, this.segments.legUpperLeft, this.segments.legLowerLeft);
    this.renderChain(pose.rightLeg, this.segments.legUpperRight, this.segments.legLowerRight);
    const bodyRotation = this.renderTorso(pose.torso);
    const headOffset = calculateAxisOffset(
      pose.torso.topCenter,
      pose.torso.bottomCenter,
      DEMO_PLAYER_HEAD_ART.torsoInset,
    );
    this.head
      .setPosition(pose.head.x + headOffset.x, pose.head.y + headOffset.y)
      .setRotation(bodyRotation);
    this.pelvis.setPosition(pose.pelvis.x, pose.pelvis.y).setRotation(bodyRotation);
    this.renderPelvisFeedback(pose.pelvis, presentation);
    this.renderDefeatedTint(presentation.defeated);
  }

  destroy(): void {
    for (const segment of Object.values(this.segments)) {
      segment.destroy();
    }
    this.head.destroy();
    this.pelvis.destroy();
    this.pelvisEffect.destroy();
    this.hitCore.destroy();
  }

  private renderChain(
    chain: Readonly<TwoBoneChain>,
    upper: AnchoredArtSegment,
    lower: AnchoredArtSegment,
    offset: Readonly<Vec2> = ZERO_OFFSET,
  ): void {
    upper.render(addOffset(chain.root, offset), addOffset(chain.joint, offset));
    lower.render(addOffset(chain.joint, offset), addOffset(chain.end, offset));
  }

  private renderTorso(torso: Readonly<TorsoShape>): number {
    this.segments.torso.render(
      torso.topCenter,
      torso.bottomCenter,
      DEMO_PLAYER_TORSO_ART.displayWidth /
        DEMO_PLAYER_TORSO_ART.sourceThickness,
    );
    return calculateUprightBodyRotation(torso.topCenter, torso.bottomCenter);
  }

  private renderPelvisFeedback(
    pelvis: Readonly<Vec2>,
    presentation: Readonly<PlayerRigPresentation>,
  ): void {
    const flashVisible =
      presentation.invulnerable && Math.floor(this.scene.time.now / 90) % 2 === 0;
    const flashAlpha = flashVisible ? 0.32 : 1;
    const coreColor = presentation.defeated
      ? CORE_COLORS.defeated
      : flashVisible
        ? CORE_COLORS.hitCoreFlash
        : CORE_COLORS.hitCore;

    this.pelvis.setAlpha(flashAlpha);
    this.pelvisEffect.clear().setAlpha(flashAlpha);
    this.hitCore.clear().setAlpha(flashAlpha);
    if (presentation.boosted && !presentation.defeated) {
      const pulse = 1 + Math.sin(this.scene.time.now / 75) * 0.06;
      this.pelvisEffect.lineStyle(7, CORE_COLORS.boost, 0.82);
      this.pelvisEffect.strokeEllipse(
        pelvis.x,
        pelvis.y,
        (150 + 20) * pulse,
        (100 + 20) * pulse,
      );
    }
    this.hitCore.fillStyle(coreColor, 1);
    this.hitCore.fillCircle(pelvis.x, pelvis.y, presentation.hitRadius);
    this.hitCore.lineStyle(3, CORE_COLORS.outline, 1);
    this.hitCore.strokeCircle(pelvis.x, pelvis.y, presentation.hitRadius);
  }

  private renderDefeatedTint(defeated: boolean): void {
    for (const image of this.bodyImages) {
      if (defeated) {
        image.setTint(0x8b7770);
      } else {
        image.clearTint();
      }
    }
    if (defeated) {
      this.pelvis.setTint(0x77625d);
    } else {
      this.pelvis.clearTint();
    }
  }
}

const ZERO_OFFSET: Readonly<Vec2> = Object.freeze({ x: 0, y: 0 });

function calculateAxisOffset(
  top: Readonly<Vec2>,
  bottom: Readonly<Vec2>,
  distance: number,
): Vec2 {
  const dx = bottom.x - top.x;
  const dy = bottom.y - top.y;
  const length = Math.max(0.0001, Math.hypot(dx, dy));
  return { x: (dx / length) * distance, y: (dy / length) * distance };
}

function addOffset(point: Readonly<Vec2>, offset: Readonly<Vec2>): Vec2 {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

class AnchoredArtSegment {
  readonly image: Phaser.GameObjects.Image;
  private readonly container: Phaser.GameObjects.Container;
  private readonly config: Readonly<DemoPlayerSegmentArtConfig>;

  constructor(scene: Phaser.Scene, config: Readonly<DemoPlayerSegmentArtConfig>) {
    this.config = config;
    const sourceAngle = Math.atan2(
      config.distal.y - config.proximal.y,
      config.distal.x - config.proximal.x,
    );
    this.image = scene.add
      .image(0, 0, config.key)
      .setOrigin(
        config.proximal.x / config.sourceSize.width,
        config.proximal.y / config.sourceSize.height,
      )
      .setRotation(-sourceAngle)
      .setAlpha(config.alpha);
    this.container = scene.add.container(0, 0, [this.image]).setDepth(config.depth);
  }

  render(
    root: Readonly<Vec2>,
    end: Readonly<Vec2>,
    scaleAcrossOverride?: number,
  ): void {
    const transform = calculateAnchoredArtTransform(
      this.config.proximal,
      this.config.distal,
      root,
      end,
      this.config.referenceLength,
    );
    this.container
      .setPosition(transform.x, transform.y)
      .setRotation(transform.rotation)
      .setScale(
        transform.scaleAlong,
        scaleAcrossOverride ?? transform.scaleAcross,
      );
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
