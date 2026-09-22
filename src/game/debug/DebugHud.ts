import Phaser from "phaser";
import { APP_INFO, COLORS, DEBUG, DESIGN, readInitialDebugVisibility } from "../config";

export class DebugHud {
  private readonly scene: Phaser.Scene;
  private readonly extraLines: () => string[];
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly onToggleKey: () => void;
  private visible = false;
  private nextRefreshAt = 0;

  constructor(scene: Phaser.Scene, extraLines: () => string[] = () => []) {
    this.scene = scene;
    this.extraLines = extraLines;
    this.panel = scene.add
      .rectangle(DESIGN.width - 16, 16, 520, 560, COLORS.page, 0.9)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000);
    this.text = scene.add
      .text(DESIGN.width - 518, 28, "", {
        color: COLORS.paper,
        fontFamily: 'Consolas, "Cascadia Mono", monospace',
        fontSize: "17px",
        lineSpacing: 5,
      })
      .setScrollFactor(0)
      .setDepth(1001);

    this.visible = readInitialDebugVisibility();
    this.onToggleKey = () => this.setVisible(!this.visible);
    scene.input.keyboard?.on(`keydown-${DEBUG.toggleKey}`, this.onToggleKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.setVisible(this.visible);
  }

  update(time: number): void {
    if (!this.visible || time < this.nextRefreshAt) {
      return;
    }

    this.nextRefreshAt = time + DEBUG.refreshIntervalMs;
    this.refresh();
  }

  destroy(): void {
    this.scene.input.keyboard?.off(`keydown-${DEBUG.toggleKey}`, this.onToggleKey);
    this.panel.destroy();
    this.text.destroy();
  }

  private setVisible(visible: boolean): void {
    this.visible = visible;
    this.panel.setVisible(visible);
    this.text.setVisible(visible);

    if (visible) {
      this.nextRefreshAt = 0;
      this.refresh();
    }
  }

  private refresh(): void {
    const display = this.scene.scale.displaySize;
    const actualFps = Number.isFinite(this.scene.game.loop.actualFps)
      ? this.scene.game.loop.actualFps.toFixed(1)
      : "--";

    this.text.setText([
      `${APP_INFO.title} ${APP_INFO.version}`,
      `Phaser ${Phaser.VERSION}`,
      `FPS ${actualFps}`,
      `Scene ${this.scene.sys.settings.key}`,
      `Phase ${APP_INFO.phase}`,
      `Logical ${DESIGN.width} × ${DESIGN.height}`,
      `Display ${Math.round(display.width)} × ${Math.round(display.height)}`,
      ...this.extraLines(),
    ]);
  }
}
