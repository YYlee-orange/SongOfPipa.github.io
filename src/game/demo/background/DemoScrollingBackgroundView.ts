import Phaser from "phaser";
import type { DemoScrollingBackgroundSnapshot } from "./DemoScrollingBackgroundModel.ts";

export interface DemoScrollingBackgroundPresentation {
  textureKey: string;
  seamOverlapPixels: number;
  dimColor: number;
  dimAlpha: number;
  worldWidth: number;
  worldHeight: number;
}

/** D5 单层背景视图；只消费模型给出的真实图片宽度和循环位置。 */
export class DemoScrollingBackgroundView {
  private readonly scene: Phaser.Scene;
  private readonly presentation: DemoScrollingBackgroundPresentation;
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly dimmer: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    presentation: Readonly<DemoScrollingBackgroundPresentation>,
  ) {
    this.scene = scene;
    this.presentation = { ...presentation };
    this.dimmer = scene.add
      .rectangle(
        presentation.worldWidth / 2,
        presentation.worldHeight / 2,
        presentation.worldWidth,
        presentation.worldHeight,
        presentation.dimColor,
        presentation.dimAlpha,
      )
      .setDepth(-90)
      .setScrollFactor(0);
  }

  render(snapshot: Readonly<DemoScrollingBackgroundSnapshot>): void {
    this.ensureImageCount(snapshot.tilePositions.length);
    const overlap = Math.max(0, this.presentation.seamOverlapPixels);
    for (let index = 0; index < this.images.length; index += 1) {
      const image = this.images[index];
      const x = snapshot.tilePositions[index];
      if (x === undefined) {
        image.setVisible(false);
        continue;
      }
      image
        .setVisible(true)
        .setPosition(x, 0)
        .setDisplaySize(snapshot.tileWidth + overlap, snapshot.tileHeight);
    }
  }

  destroy(): void {
    for (const image of this.images) {
      image.destroy();
    }
    this.images.length = 0;
    this.dimmer.destroy();
  }

  private ensureImageCount(required: number): void {
    while (this.images.length < required) {
      this.images.push(
        this.scene.add
          .image(0, 0, this.presentation.textureKey)
          .setOrigin(0, 0)
          .setDepth(-100)
          .setScrollFactor(0),
      );
    }
  }
}
