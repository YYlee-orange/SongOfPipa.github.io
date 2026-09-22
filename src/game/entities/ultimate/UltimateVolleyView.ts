import Phaser from "phaser";
import type {
  PlayerAbilityConfig,
  PlayerAbilitySnapshot,
} from "../player/PlayerAbilityModel";
import type { Vec2 } from "../playerRig/PlayerRigModel";
import type {
  UltimateImpactSnapshot,
  UltimateProjectileSnapshot,
} from "./UltimateVolleyModel";

export class UltimateVolleyView {
  private readonly projectileGraphics: Phaser.GameObjects.Graphics;
  private readonly effectGraphics: Phaser.GameObjects.Graphics;
  private readonly abilityConfig: PlayerAbilityConfig;

  constructor(scene: Phaser.Scene, abilityConfig: PlayerAbilityConfig) {
    this.projectileGraphics = scene.add.graphics().setDepth(31);
    this.effectGraphics = scene.add.graphics().setDepth(44);
    this.abilityConfig = abilityConfig;
  }

  render(
    center: Vec2,
    ability: Readonly<PlayerAbilitySnapshot>,
    projectiles: readonly Readonly<UltimateProjectileSnapshot>[],
    impacts: readonly Readonly<UltimateImpactSnapshot>[],
  ): void {
    this.projectileGraphics.clear();
    this.effectGraphics.clear();

    for (const projectile of projectiles) {
      if (projectile.emissionDelayRemaining > 0) {
        continue;
      }

      this.projectileGraphics.lineStyle(7, 0x67d9df, 0.42);
      this.projectileGraphics.lineBetween(
        projectile.previousPosition.x,
        projectile.previousPosition.y,
        projectile.position.x,
        projectile.position.y,
      );
      this.projectileGraphics.fillStyle(0xffce55, 1);
      this.projectileGraphics.fillCircle(
        projectile.position.x,
        projectile.position.y,
        projectile.radius,
      );
      this.projectileGraphics.lineStyle(4, 0x7a3f18, 1);
      this.projectileGraphics.strokeCircle(
        projectile.position.x,
        projectile.position.y,
        projectile.radius,
      );
      this.projectileGraphics.fillStyle(0xfff5c4, 1);
      this.projectileGraphics.fillCircle(
        projectile.position.x - projectile.radius * 0.25,
        projectile.position.y - projectile.radius * 0.25,
        4,
      );
    }

    for (const impact of impacts) {
      const progress = Phaser.Math.Clamp(impact.progress, 0, 1);
      const radius = Phaser.Math.Linear(10, 36, progress);
      const alpha = 1 - progress;
      this.projectileGraphics.fillStyle(0xfff5c4, alpha * 0.72);
      this.projectileGraphics.fillCircle(
        impact.position.x,
        impact.position.y,
        Math.max(2, 14 * (1 - progress)),
      );
      this.projectileGraphics.lineStyle(7 - progress * 4, 0x67d9df, alpha);
      this.projectileGraphics.strokeCircle(
        impact.position.x,
        impact.position.y,
        radius,
      );
      this.projectileGraphics.lineStyle(3, 0xffce55, alpha);
      this.projectileGraphics.lineBetween(
        impact.position.x - radius,
        impact.position.y,
        impact.position.x + radius,
        impact.position.y,
      );
      this.projectileGraphics.lineBetween(
        impact.position.x,
        impact.position.y - radius,
        impact.position.x,
        impact.position.y + radius,
      );
    }

    if (ability.ultimateState === "charging") {
      const radius = 74 + ability.ultimateChargeProgress * 32;
      this.effectGraphics.lineStyle(7, 0xffd45f, 0.8);
      this.effectGraphics.strokeCircle(center.x, center.y, radius);
    } else if (ability.ultimateState === "absorbing") {
      const duration = Math.max(0.0001, this.abilityConfig.ultimateAbsorbSeconds);
      const progress = 1 - ability.ultimateRemaining / duration;
      const radius = Phaser.Math.Linear(220, 62, Phaser.Math.Clamp(progress, 0, 1));
      this.effectGraphics.lineStyle(9, 0x62d4c7, 0.72);
      this.effectGraphics.strokeCircle(center.x, center.y, radius);
      this.effectGraphics.lineStyle(4, 0xffd45f, 0.8);
      this.effectGraphics.strokeCircle(center.x, center.y, radius * 0.72);
    } else if (ability.ultimateState === "firing") {
      const pulse = 1 + Math.sin(ability.ultimateRemaining * 70) * 0.12;
      this.effectGraphics.fillStyle(0xfff4c1, 0.16);
      this.effectGraphics.fillCircle(center.x, center.y, 96);
      this.effectGraphics.lineStyle(10, 0xffd45f, 0.74);
      this.effectGraphics.strokeCircle(center.x, center.y, 82);
      this.effectGraphics.fillStyle(0xfff0ad, 0.86);
      this.effectGraphics.fillEllipse(
        center.x + 52,
        center.y,
        34 * pulse,
        22 * pulse,
      );
      this.effectGraphics.lineStyle(4, 0x62d4c7, 0.8);
      this.effectGraphics.strokeEllipse(
        center.x + 52,
        center.y,
        44 * pulse,
        30 * pulse,
      );
    } else if (ability.ultimateState === "recovery") {
      this.effectGraphics.lineStyle(5, 0x62d4c7, 0.35);
      this.effectGraphics.strokeCircle(center.x, center.y, 72);
    }
  }
}
