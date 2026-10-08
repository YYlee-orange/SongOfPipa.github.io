import Phaser from "phaser";
import type { DemoDisarmTransitionSnapshot } from "./DemoDisarmTransitionModel.ts";
import {
  calculateDemoDisarmWeaponArtRotation,
  resolveDemoDisarmWeaponArt,
} from "./demoDisarmArtConfig.ts";
import {
  calculateLeftFacingArtRotation,
  DEMO_COMBAT_ART_SIZE,
  DEMO_COMBAT_ART_TEXTURES,
  resolveMovementDirection,
} from "../combat/demoCombatArtConfig.ts";

/** D7 夺械视图：纯武器精灵、玩家方攻击和独立压制进度。 */
export class DemoDisarmTransitionView {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly weapon: Phaser.GameObjects.Image;
  private readonly laserBeam: Phaser.GameObjects.Image;
  private readonly projectileSprites: Phaser.GameObjects.Image[] = [];
  private readonly creeperSprites: Phaser.GameObjects.Image[] = [];
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.weapon = scene.add.image(0, 0, "demo-transition-revolver").setDepth(34);
    this.laserBeam = scene.add
      .image(0, 0, DEMO_COMBAT_ART_TEXTURES.laserBeam.key)
      .setOrigin(0, 0.5)
      .setDepth(33)
      .setVisible(false);
    this.graphics = scene.add.graphics().setDepth(35);
    this.label = scene.add
      .text(640, 610, "", {
        backgroundColor: "rgba(255, 244, 214, 0.9)",
        color: "#7a2f25",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "17px",
        fontStyle: "bold",
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
      .setOrigin(0.5, 0)
      .setDepth(904)
      .setVisible(false);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  render(
    snapshot: Readonly<DemoDisarmTransitionSnapshot> | null,
    showDebug: boolean,
  ): void {
    this.graphics.clear();
    this.laserBeam.setVisible(false);
    if (!snapshot || snapshot.state === "resolved") {
      this.weapon.setVisible(false);
      this.label.setVisible(false);
      this.hideSprites(this.projectileSprites, 0);
      this.hideSprites(this.creeperSprites, 0);
      return;
    }

    if (snapshot.laser?.active) {
      const { start, end, halfWidth } = snapshot.laser;
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const pulse = 0.94 + Math.sin(Date.now() / 55) * 0.06;
      this.laserBeam
        .setPosition(start.x, start.y)
        .setRotation(Math.atan2(end.y - start.y, end.x - start.x))
        .setDisplaySize(length, halfWidth * 2 * pulse)
        .setAlpha(0.94)
        .setVisible(true);
    } else if (snapshot.laser?.state === "charging") {
      const radius = 12 + snapshot.laser.chargeProgress * 26;
      this.graphics.fillStyle(0x8fe1ed, 0.3 + snapshot.laser.chargeProgress * 0.45);
      this.graphics.fillCircle(snapshot.laser.start.x, snapshot.laser.start.y, radius);
      this.graphics.lineStyle(5, 0xffd477, 0.9);
      this.graphics.strokeCircle(snapshot.laser.start.x, snapshot.laser.start.y, radius);
    }

    for (let index = 0; index < snapshot.projectiles.length; index += 1) {
      this.drawProjectile(
        snapshot.projectiles[index],
        index,
        snapshot.weaponKind === "rocket-launcher",
      );
    }
    this.hideSprites(this.projectileSprites, snapshot.projectiles.length);

    let visibleCreepers = 0;
    for (const creeper of snapshot.creepers) {
      if (creeper.state === "exploding") {
        const radius = creeper.explosionRadius * (0.35 + creeper.stateProgress * 0.65);
        this.graphics.fillStyle(0xf4b64f, 0.22 * (1 - creeper.stateProgress));
        this.graphics.fillCircle(creeper.position.x, creeper.position.y, radius);
        this.graphics.lineStyle(5, 0xd95a42, 0.9 * (1 - creeper.stateProgress));
        this.graphics.strokeCircle(creeper.position.x, creeper.position.y, radius);
        continue;
      }
      if (creeper.state === "casting") {
        this.graphics.lineStyle(5, 0xf4b64f, 0.85);
        this.graphics.strokeCircle(
          creeper.position.x,
          creeper.position.y,
          creeper.radius + 10 + creeper.stateProgress * 12,
        );
      }
      const size = creeper.radius * DEMO_COMBAT_ART_SIZE.creeperDiameterPerRadius;
      const sprite = this.getSprite(
        this.creeperSprites,
        visibleCreepers,
        DEMO_COMBAT_ART_TEXTURES.playerCreeper.key,
        36,
      );
      sprite
        .setPosition(creeper.position.x, creeper.position.y)
        .setDisplaySize(size, size)
        .setTint(creeper.state === "casting" ? 0xffe389 : 0xffffff)
        .setVisible(true);
      visibleCreepers += 1;
    }
    this.hideSprites(this.creeperSprites, visibleCreepers);

    this.drawWeapon(
      snapshot.weaponKind,
      snapshot.weaponPosition.x,
      snapshot.weaponPosition.y,
      snapshot.weaponAngle,
      snapshot.pickupAvailable,
      snapshot.weaponPressed,
      snapshot.playerHoldingWeapon || snapshot.state === "player-discard",
    );

    if (snapshot.state === "player-fire" || snapshot.state === "player-discard") {
      this.label
        .setText(
          snapshot.weaponKind === "laser-gun"
            ? `最终压制 ${snapshot.bossHits.toFixed(1)}/${snapshot.requiredHits.toFixed(1)} 秒 · 当前按键：${snapshot.inputLabel}`
            : `转场压制 ${snapshot.bossHits}/${snapshot.requiredHits} · 当前按键：${snapshot.inputLabel}`,
        )
        .setVisible(true);
    } else {
      this.label.setVisible(false);
    }

    if (showDebug) {
      this.graphics.lineStyle(2, 0x267c8a, 0.75);
      this.graphics.strokeCircle(
        snapshot.weaponPosition.x,
        snapshot.weaponPosition.y,
        snapshot.pickupRadius,
      );
      this.graphics.lineStyle(2, 0x87538f, 0.5);
      this.graphics.lineBetween(
        snapshot.throwOrigin.x,
        snapshot.throwOrigin.y,
        snapshot.landingPosition.x,
        snapshot.landingPosition.y,
      );
      this.graphics.strokeCircle(
        snapshot.landingPosition.x,
        snapshot.landingPosition.y,
        9,
      );
    }
  }

  private drawWeapon(
    weaponKind: DemoDisarmTransitionSnapshot["weaponKind"],
    x: number,
    y: number,
    angle: number,
    highlightPickup: boolean,
    pressed: boolean,
    mirroredHorizontally: boolean,
  ): void {
    const art = resolveDemoDisarmWeaponArt(weaponKind, pressed);
    this.weapon
      .setTexture(art.key)
      .setOrigin(art.origin.x, art.origin.y)
      .setDisplaySize(art.displaySize.width, art.displaySize.height)
      .setPosition(x, y)
      .setRotation(
        calculateDemoDisarmWeaponArtRotation(
          angle,
          art.sourceForwardAngle,
          mirroredHorizontally,
        ),
      )
      .setFlipX(mirroredHorizontally)
      .setFlipY(false)
      .setVisible(true);
    if (highlightPickup) {
      this.graphics.lineStyle(5, 0xffd34e, 0.9);
      this.graphics.strokeCircle(x, y, 50 + Math.sin(Date.now() / 120) * 4);
    }
  }

  destroy(): void {
    this.weapon.destroy();
    this.laserBeam.destroy();
    for (const sprite of this.projectileSprites) {
      sprite.destroy();
    }
    for (const sprite of this.creeperSprites) {
      sprite.destroy();
    }
    this.graphics.destroy();
    this.label.destroy();
  }

  private drawProjectile(
    projectile: DemoDisarmTransitionSnapshot["projectiles"][number],
    index: number,
    rocket: boolean,
  ): void {
    const direction = resolveMovementDirection(
      projectile.position,
      projectile.previousPosition,
      projectile.velocity,
    );
    this.graphics.lineStyle(rocket ? 9 : 4, 0xf4b64f, 0.42);
    this.graphics.lineBetween(
      projectile.previousPosition.x,
      projectile.previousPosition.y,
      projectile.position.x,
      projectile.position.y,
    );
    const texture = rocket
      ? DEMO_COMBAT_ART_TEXTURES.playerRocket.key
      : DEMO_COMBAT_ART_TEXTURES.playerBullet.key;
    const sprite = this.getSprite(this.projectileSprites, index, texture, 36);
    sprite
      .setPosition(projectile.position.x, projectile.position.y)
      .setDisplaySize(
        projectile.radius * (rocket
          ? DEMO_COMBAT_ART_SIZE.rocketLengthPerRadius
          : DEMO_COMBAT_ART_SIZE.bulletLengthPerRadius),
        projectile.radius * (rocket
          ? DEMO_COMBAT_ART_SIZE.rocketHeightPerRadius
          : DEMO_COMBAT_ART_SIZE.bulletHeightPerRadius),
      )
      .setRotation(calculateLeftFacingArtRotation(direction))
      .setTint(0xffffff)
      .setVisible(true);
  }

  private getSprite(
    sprites: Phaser.GameObjects.Image[],
    index: number,
    texture: string,
    depth: number,
  ): Phaser.GameObjects.Image {
    const existing = sprites[index];
    if (existing) {
      return existing.setTexture(texture);
    }
    const sprite = this.weapon.scene.add
      .image(0, 0, texture)
      .setDepth(depth)
      .setVisible(false);
    sprites.push(sprite);
    return sprite;
  }

  private hideSprites(sprites: readonly Phaser.GameObjects.Image[], start: number): void {
    for (let index = start; index < sprites.length; index += 1) {
      sprites[index].setVisible(false);
    }
  }

}
