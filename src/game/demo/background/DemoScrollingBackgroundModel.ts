export type DemoBackgroundScrollDirection = "left" | "right";

export interface DemoScrollingBackgroundConfig {
  worldWidth: number;
  worldHeight: number;
  sourceWidth: number;
  sourceHeight: number;
  speedPixelsPerSecond: number;
  direction: DemoBackgroundScrollDirection;
}

export interface DemoScrollingBackgroundSnapshot {
  scale: number;
  tileWidth: number;
  tileHeight: number;
  phase: number;
  tilePositions: readonly number[];
}

/**
 * D5 单层循环背景的纯逻辑模型。循环周期始终使用图片等比缩放后的
 * 实际宽度，而不是画布宽度，避免宽图被强行压缩后产生跳变。
 */
export class DemoScrollingBackgroundModel {
  private readonly config: DemoScrollingBackgroundConfig;
  private readonly scale: number;
  private readonly tileWidth: number;
  private readonly tileHeight: number;
  private phase = 0;

  constructor(config: Readonly<DemoScrollingBackgroundConfig>) {
    this.config = { ...config };
    const sourceWidth = Math.max(1, finiteOr(config.sourceWidth, 1));
    const sourceHeight = Math.max(1, finiteOr(config.sourceHeight, 1));
    const worldHeight = Math.max(1, finiteOr(config.worldHeight, 1));
    this.scale = worldHeight / sourceHeight;
    this.tileWidth = sourceWidth * this.scale;
    this.tileHeight = sourceHeight * this.scale;
  }

  update(deltaSeconds: number): void {
    const delta = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    const distance = Math.max(
      0,
      finiteOr(this.config.speedPixelsPerSecond, 0),
    ) * delta;
    this.phase = positiveModulo(this.phase + distance, this.tileWidth);
  }

  getSnapshot(): Readonly<DemoScrollingBackgroundSnapshot> {
    const worldWidth = Math.max(1, finiteOr(this.config.worldWidth, 1));
    const firstX = this.config.direction === "right"
      ? this.phase - this.tileWidth
      : -this.phase;
    const tilePositions: number[] = [];
    for (
      let x = firstX;
      x < worldWidth;
      x += this.tileWidth
    ) {
      tilePositions.push(x);
    }
    return {
      scale: this.scale,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      phase: this.phase,
      tilePositions,
    };
  }
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positiveModulo(value: number, divisor: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(divisor) || divisor <= 0) {
    return 0;
  }
  return ((value % divisor) + divisor) % divisor;
}
