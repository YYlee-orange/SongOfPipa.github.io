import Phaser from "phaser";
import type { DemoBossActorSnapshot } from "./DemoBossActorModel";
import type { DemoBossPhaseSnapshot } from "./DemoBossPhaseController";
import {
  calculateDemoBossWeaponArtTransform,
  pointAtDistance,
  resolveDemoBossWeaponArtKind,
} from "./DemoBossArtGeometry.ts";
import {
  DEMO_BOSS_EMPTY_HAND_ART,
  DEMO_BOSS_HEAD_ART,
  DEMO_BOSS_SUMMONER_ART,
  DEMO_BOSS_WEAPON_ART,
  type DemoBossWeaponArtConfig,
} from "./demoBossArtConfig.ts";

const BOSS_HEALTH_BAR = Object.freeze({
  x: 390,
  y: 650,
  width: 500,
  height: 24,
  fillColor: 0xa76060,
  trackColor: 0x553b38,
  outlineColor: 0x49312f,
});

/** D7 Boss art view. Gameplay colliders remain owned by DemoBossActorModel. */
export class DemoBossActorView {
  private readonly head: Phaser.GameObjects.Image;
  private readonly weapon: Phaser.GameObjects.Image;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.weapon = scene.add
      .image(0, 0, DEMO_BOSS_WEAPON_ART.revolver.key)
      .setDepth(22);
    this.head = scene.add
      .image(0, 0, DEMO_BOSS_HEAD_ART.key)
      .setOrigin(DEMO_BOSS_HEAD_ART.origin.x, DEMO_BOSS_HEAD_ART.origin.y)
      .setDisplaySize(
        DEMO_BOSS_HEAD_ART.displaySize.width,
        DEMO_BOSS_HEAD_ART.displaySize.height,
      )
      .setDepth(DEMO_BOSS_HEAD_ART.depth);
    this.graphics = scene.add.graphics().setDepth(25);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  render(
    actor: Readonly<DemoBossActorSnapshot>,
    phase: Readonly<DemoBossPhaseSnapshot>,
    showDebugGeometry: boolean,
    weaponLabel = phase.weapon,
    attackStateLabel = "",
    weaponAngle = Math.PI,
    transitionPressureProgress: number | null = null,
  ): void {
    this.graphics.clear();
    const alpha = phase.lifecycle === "victory" ? 0.32 : 1;

    const muzzle = this.renderWeapon(actor, alpha, weaponLabel, weaponAngle);
    this.renderHead(actor, alpha);
    this.drawWeaponTelegraph(muzzle, weaponLabel, attackStateLabel, alpha);
    this.drawHealthBar(phase, transitionPressureProgress, alpha);

    if (showDebugGeometry) {
      this.drawDebugGeometry(actor);
    }
  }

  destroy(): void {
    this.head.destroy();
    this.weapon.destroy();
    this.graphics.destroy();
  }

  private renderHead(actor: Readonly<DemoBossActorSnapshot>, alpha: number): void {
    this.head
      .setPosition(actor.headPosition.x, actor.headPosition.y)
      .setAlpha(alpha)
      .setVisible(true);

    if (actor.hitFlashRemaining > 0) {
      this.head.setTint(0xfff1d0);
    } else {
      this.head.clearTint();
    }
  }

  private renderWeapon(
    actor: Readonly<DemoBossActorSnapshot>,
    alpha: number,
    weaponLabel: string,
    weaponAngle: number,
  ): Readonly<{ x: number; y: number }> {
    const kind = resolveDemoBossWeaponArtKind(weaponLabel);
    if (kind === "empty") {
      this.weapon
        .setTexture(DEMO_BOSS_EMPTY_HAND_ART.key)
        .setOrigin(
          DEMO_BOSS_EMPTY_HAND_ART.origin.x,
          DEMO_BOSS_EMPTY_HAND_ART.origin.y,
        )
        .setDisplaySize(
          DEMO_BOSS_EMPTY_HAND_ART.displaySize.width,
          DEMO_BOSS_EMPTY_HAND_ART.displaySize.height,
        )
        .setPosition(actor.weaponPosition.x, actor.weaponPosition.y)
        .setRotation(0)
        .setAlpha(alpha)
        .setVisible(true);
      return actor.muzzlePosition;
    }

    if (kind === "summoner") {
      const pressed =
        actor.weaponRecoilOffset > 1.2 || actor.weaponRecoilVelocity > 36;
      const art = pressed
        ? DEMO_BOSS_SUMMONER_ART.pressed
        : DEMO_BOSS_SUMMONER_ART.idle;
      this.weapon
        .setTexture(art.key)
        .setOrigin(art.origin.x, art.origin.y)
        .setDisplaySize(art.displaySize.width, art.displaySize.height)
        .setPosition(actor.weaponPosition.x, actor.weaponPosition.y)
        .setRotation(0)
        .setAlpha(alpha)
        .setVisible(true);
      return actor.muzzlePosition;
    }

    const art = DEMO_BOSS_WEAPON_ART[kind];
    const targetMuzzle = kind === "laserGun"
      ? pointAtDistance(actor.weaponPosition, weaponAngle, art.targetMuzzleDistance)
      : actor.muzzlePosition;
    this.applyWeaponTransform(art, actor.weaponPosition, targetMuzzle, alpha);
    return targetMuzzle;
  }

  private applyWeaponTransform(
    art: Readonly<DemoBossWeaponArtConfig>,
    grip: Readonly<{ x: number; y: number }>,
    muzzle: Readonly<{ x: number; y: number }>,
    alpha: number,
  ): void {
    const transform = calculateDemoBossWeaponArtTransform(art, grip, muzzle);
    this.weapon
      .setTexture(art.key)
      .setOrigin(transform.originX, transform.originY)
      .setPosition(transform.x, transform.y)
      .setRotation(transform.rotation)
      .setScale(transform.scale)
      .setAlpha(alpha)
      .setVisible(true);
  }

  private drawWeaponTelegraph(
    muzzle: Readonly<{ x: number; y: number }>,
    weaponLabel: string,
    attackStateLabel: string,
    alpha: number,
  ): void {
    if (
      weaponLabel.includes("激光") &&
      (attackStateLabel.includes("蓄力") || attackStateLabel.includes("前摇"))
    ) {
      this.graphics.lineStyle(4, 0xffb13b, 0.9 * alpha);
      this.graphics.strokeCircle(muzzle.x, muzzle.y, 31);
      return;
    }
    if (weaponLabel.includes("火箭") && attackStateLabel.includes("蓄力")) {
      this.graphics.lineStyle(5, 0xffb13b, 0.95 * alpha);
      this.graphics.strokeCircle(muzzle.x, muzzle.y, 24);
      this.graphics.lineStyle(3, 0xffe2a0, 0.8 * alpha);
      this.graphics.strokeCircle(muzzle.x, muzzle.y, 36);
    }
  }

  private drawHealthBar(
    phase: Readonly<DemoBossPhaseSnapshot>,
    transitionPressureProgress: number | null,
    alpha: number,
  ): void {
    const ratio = transitionPressureProgress === null
      ? phase.currentHealth / Math.max(1, phase.maximumHealth)
      : transitionPressureProgress;
    const { x, y, width, height } = BOSS_HEALTH_BAR;
    const radius = height / 2;
    this.graphics.fillStyle(BOSS_HEALTH_BAR.trackColor, 0.34 * alpha);
    this.graphics.fillRoundedRect(x, y, width, height, radius);
    this.graphics.fillStyle(BOSS_HEALTH_BAR.fillColor, 0.96 * alpha);
    this.graphics.fillRoundedRect(
      x,
      y,
      width * Phaser.Math.Clamp(ratio, 0, 1),
      height,
      radius,
    );
    this.graphics.lineStyle(3, BOSS_HEALTH_BAR.outlineColor, 0.9 * alpha);
    this.graphics.strokeRoundedRect(x, y, width, height, radius);
  }

  private drawDebugGeometry(actor: Readonly<DemoBossActorSnapshot>): void {
    this.graphics.lineStyle(2, 0x277b83, 0.75);
    this.graphics.lineBetween(
      actor.position.x - 14,
      actor.position.y,
      actor.position.x + 14,
      actor.position.y,
    );
    this.graphics.lineBetween(
      actor.position.x,
      actor.position.y - 14,
      actor.position.x,
      actor.position.y + 14,
    );
    this.graphics.strokeCircle(actor.position.x, actor.position.y, 18);
    this.graphics.lineBetween(
      actor.position.x,
      actor.position.y,
      actor.headPosition.x,
      actor.headPosition.y,
    );
    this.graphics.lineBetween(
      actor.position.x,
      actor.position.y,
      actor.weaponPosition.x,
      actor.weaponPosition.y,
    );

    this.graphics.lineStyle(3, 0xd33f36, 0.9);
    this.graphics.strokeCircle(
      actor.headPosition.x,
      actor.headPosition.y,
      actor.headHitRadius,
    );
    this.graphics.lineStyle(2, 0x2785b8, 0.9);
    this.graphics.strokeCircle(
      actor.muzzlePosition.x,
      actor.muzzlePosition.y,
      12,
    );
  }
}
