import Phaser from "phaser";
import type { Vec2 } from "../playerRig/PlayerRigModel";
import { circlesOverlap } from "../../systems/CollisionSystem";

export interface StaticTestBulletConfig {
  positions: readonly Vec2[];
  radius: number;
  respawnSeconds: number;
}

interface StaticTestBulletState {
  position: Vec2;
  active: boolean;
  respawnRemaining: number;
}

export class StaticTestBulletField {
  private readonly config: StaticTestBulletConfig;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly bullets: StaticTestBulletState[];

  constructor(scene: Phaser.Scene, config: StaticTestBulletConfig) {
    this.config = config;
    this.graphics = scene.add.graphics().setDepth(30);
    this.bullets = config.positions.map((position) => ({
      position: { ...position },
      active: true,
      respawnRemaining: 0,
    }));
    this.render();
  }

  update(deltaSeconds: number): void {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 1))
      : 0;
    let changed = false;

    for (const bullet of this.bullets) {
      if (bullet.active) {
        continue;
      }

      bullet.respawnRemaining = Math.max(0, bullet.respawnRemaining - safeDelta);

      if (bullet.respawnRemaining === 0) {
        bullet.active = true;
        changed = true;
      }
    }

    if (changed) {
      this.render();
    }
  }

  findCollision(center: Vec2, radius: number): number | null {
    for (let index = 0; index < this.bullets.length; index += 1) {
      const bullet = this.bullets[index];

      if (
        bullet.active &&
        circlesOverlap(
          { center, radius },
          { center: bullet.position, radius: this.config.radius },
        )
      ) {
        return index;
      }
    }

    return null;
  }

  consume(index: number): void {
    const bullet = this.bullets[index];

    if (!bullet?.active) {
      return;
    }

    bullet.active = false;
    bullet.respawnRemaining = this.config.respawnSeconds;
    this.render();
  }

  getActiveCount(): number {
    return this.bullets.filter((bullet) => bullet.active).length;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private render(): void {
    this.graphics.clear();

    for (const bullet of this.bullets) {
      if (!bullet.active) {
        continue;
      }

      this.graphics.fillStyle(0x7651a8, 1);
      this.graphics.fillCircle(
        bullet.position.x,
        bullet.position.y,
        this.config.radius,
      );
      this.graphics.lineStyle(5, 0x35264f, 1);
      this.graphics.strokeCircle(
        bullet.position.x,
        bullet.position.y,
        this.config.radius,
      );
      this.graphics.fillStyle(0xffdda1, 0.95);
      this.graphics.fillCircle(
        bullet.position.x - this.config.radius * 0.25,
        bullet.position.y - this.config.radius * 0.25,
        Math.max(3, this.config.radius * 0.22),
      );
    }
  }
}
