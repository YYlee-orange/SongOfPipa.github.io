import Phaser from "phaser";
import {
  PLAYER_DAMAGE,
  PLAYER_ABILITY,
  PLAYER_PARRY,
  PROTOTYPE_BOSS,
  PROTOTYPE_BULLETS,
  PROTOTYPE_ULTIMATE,
} from "../balance";
import {
  COLORS,
  DESIGN,
  INPUT_KEYS,
  PLAYER_MOVEMENT,
  PLAYER_RIG,
} from "../config";
import { PrototypeBulletModel } from "../entities/bullet/PrototypeBulletModel";
import { PrototypeBulletView } from "../entities/bullet/PrototypeBulletView";
import { PrototypeBossModel } from "../entities/boss/PrototypeBossModel";
import { PrototypeBossView } from "../entities/boss/PrototypeBossView";
import { PlayerDamageModel } from "../entities/player/PlayerDamageModel";
import {
  PlayerAbilityModel,
  type PlayerAbilityUpdateEvents,
} from "../entities/player/PlayerAbilityModel";
import {
  PlayerMovementModel,
  type PlayerMovementInput,
} from "../entities/player/PlayerMovementModel";
import { PlayerParryModel } from "../entities/player/PlayerParryModel";
import { PlayerParryView } from "../entities/player/PlayerParryView";
import { PlayerRigModel } from "../entities/playerRig/PlayerRigModel";
import {
  PlayerRigView,
  type PlayerRigPresentation,
} from "../entities/playerRig/PlayerRigView";
import { UltimateVolleyModel } from "../entities/ultimate/UltimateVolleyModel";
import { UltimateVolleyView } from "../entities/ultimate/UltimateVolleyView";
import { PlayerStatusHud } from "../ui/PlayerStatusHud";

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

export class PrototypeScene extends Phaser.Scene {
  private playerDamage?: PlayerDamageModel;
  private playerAbility?: PlayerAbilityModel;
  private playerMovement?: PlayerMovementModel;
  private movementKeys?: MovementKeys;
  private playerParry?: PlayerParryModel;
  private playerParryView?: PlayerParryView;
  private bullets?: PrototypeBulletModel;
  private bulletView?: PrototypeBulletView;
  private boss?: PrototypeBossModel;
  private bossView?: PrototypeBossView;
  private ultimateVolley?: UltimateVolleyModel;
  private ultimateVolleyView?: UltimateVolleyView;
  private rig?: PlayerRigModel;
  private rigView?: PlayerRigView;
  private statusHud?: PlayerStatusHud;
  private parryRequested = false;
  private skillHeld = false;
  private skillPressRequested = false;
  private skillReleaseRequested = false;
  private absorbedForUltimate = 0;
  private pendingUltimateDamage = 0;
  private readonly onRestartKey = (): void => {
    if (
      this.playerDamage?.getSnapshot().defeated ||
      this.boss?.getSnapshot().defeated
    ) {
      this.scene.restart();
    }
  };
  private readonly onParryKey = (): void => {
    this.parryRequested = true;
  };
  private readonly onSkillKeyDown = (): void => {
    if (!this.skillHeld) {
      this.skillHeld = true;
      this.skillPressRequested = true;
    }
  };
  private readonly onSkillKeyUp = (): void => {
    if (this.skillHeld) {
      this.skillHeld = false;
      this.skillReleaseRequested = true;
    }
  };

  constructor() {
    super("PrototypeScene");
  }

  create(): void {
    this.drawStagePlaceholder();

    this.playerMovement = new PlayerMovementModel(
      PLAYER_MOVEMENT,
      PLAYER_RIG.initialPelvis,
    );
    this.playerDamage = new PlayerDamageModel(PLAYER_DAMAGE);
    this.playerAbility = new PlayerAbilityModel(PLAYER_ABILITY);
    this.playerParry = new PlayerParryModel(PLAYER_PARRY);
    this.bullets = new PrototypeBulletModel(PROTOTYPE_BULLETS);
    this.boss = new PrototypeBossModel(PROTOTYPE_BOSS);
    this.ultimateVolley = new UltimateVolleyModel(PROTOTYPE_ULTIMATE);
    this.rig = new PlayerRigModel(PLAYER_RIG);
    this.rigView = new PlayerRigView(this, this.rig);
    this.bossView = new PrototypeBossView(this, PROTOTYPE_BOSS);
    this.bulletView = new PrototypeBulletView(this);
    this.ultimateVolleyView = new UltimateVolleyView(this, PLAYER_ABILITY);
    this.playerParryView = new PlayerParryView(this);
    this.statusHud = new PlayerStatusHud(this);
    this.movementKeys = this.createMovementKeys();
    this.parryRequested = false;
    this.skillHeld = false;
    this.skillPressRequested = false;
    this.skillReleaseRequested = false;
    this.absorbedForUltimate = 0;
    this.pendingUltimateDamage = 0;
    for (const key of INPUT_KEYS.parry) {
      this.input.keyboard?.on(`keydown-${key}`, this.onParryKey);
    }
    for (const key of INPUT_KEYS.skill) {
      this.input.keyboard?.on(`keydown-${key}`, this.onSkillKeyDown);
      this.input.keyboard?.on(`keyup-${key}`, this.onSkillKeyUp);
    }
    this.input.keyboard?.on("keydown-ENTER", this.onRestartKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ENTER", this.onRestartKey);
      for (const key of INPUT_KEYS.parry) {
        this.input.keyboard?.off(`keydown-${key}`, this.onParryKey);
      }
      for (const key of INPUT_KEYS.skill) {
        this.input.keyboard?.off(`keydown-${key}`, this.onSkillKeyDown);
        this.input.keyboard?.off(`keyup-${key}`, this.onSkillKeyUp);
      }
    });

    this.add
      .text(
        28,
        DESIGN.height - 26,
        "WASD / 方向键移动 · Z / J 反弹特殊弹 · X / K 短按强化、满能量长按大招 · Enter 重开",
        {
          color: "#6f4933",
          fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
          fontSize: "18px",
        },
      )
      .setOrigin(0, 1);

    const damage = this.playerDamage.getSnapshot();
    const parry = this.playerParry.getSnapshot();
    const ability = this.playerAbility.getSnapshot();
    const playerPosition = this.playerMovement.getPosition();
    this.rigView.render(this.getRigPresentation(damage, ability));
    this.playerParryView.render(playerPosition, parry, 0);
    this.bulletView.render(this.bullets.getSnapshots(), 0);
    this.ultimateVolleyView.render(
      playerPosition,
      ability,
      this.ultimateVolley.getSnapshots(),
      this.ultimateVolley.getImpactSnapshots(),
    );
    this.bossView.render(this.boss.getSnapshot());
    this.statusHud.update(damage, parry, ability, false);
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.playerDamage?.update(deltaSeconds);
    const defeated = this.playerDamage?.getSnapshot().defeated ?? false;
    const bossDefeated = this.boss?.getSnapshot().defeated ?? false;
    const battleActive = !defeated && !bossDefeated;

    if (battleActive) {
      this.playerParry?.update(deltaSeconds);

      if (this.consumeParryRequest()) {
        this.playerParry?.tryStart();
      }

      if (this.consumeSkillPressRequest()) {
        this.playerAbility?.beginSkillPress();
      }

      const abilityEvents = this.playerAbility?.update(
        deltaSeconds,
        this.skillHeld || this.skillReleaseRequested,
      );

      if (this.consumeSkillReleaseRequest()) {
        this.playerAbility?.releaseSkillPress();
      }

      if (abilityEvents) {
        this.handleAbilityEvents(abilityEvents);
      }

      this.playerMovement?.update(this.readMovementInput(), deltaSeconds);
    } else if (!defeated) {
      const abilityEvents = this.playerAbility?.update(deltaSeconds, false);

      if (abilityEvents) {
        this.handleAbilityEvents(abilityEvents);
      }
    }

    if (this.rig && this.playerMovement) {
      this.rig.setPelvisAnchor(this.playerMovement.getPosition());
      this.rig.update(deltaSeconds);
    }

    if (!defeated && this.playerMovement && this.boss && this.bullets) {
      const playerPosition = this.playerMovement.getPosition();
      const ability = this.playerAbility?.getSnapshot();
      const shots = this.boss.update(
        deltaSeconds,
        !(ability?.bossFirePaused ?? false),
      );

      if (battleActive) {
        for (const shot of shots) {
          this.bullets.spawnIncoming(
            shot.type,
            shot.origin,
            playerPosition,
            shot.speed,
          );
        }

        this.bullets.update(deltaSeconds, playerPosition);
        this.handleBulletInteractions();
      }
    }

    this.ultimateVolley?.update(
      deltaSeconds,
      this.boss?.getSnapshot().defeated
        ? []
        : (this.boss?.getHitColliders() ?? []),
    );

    const damage = this.playerDamage?.getSnapshot();
    const parry = this.playerParry?.getSnapshot();
    const ability = this.playerAbility?.getSnapshot();
    const playerPosition = this.playerMovement?.getPosition();

    if (damage && parry && ability && playerPosition) {
      this.rigView?.render(this.getRigPresentation(damage, ability));
      this.playerParryView?.render(playerPosition, parry, time);
      this.bulletView?.render(this.bullets?.getSnapshots() ?? [], time);
      this.ultimateVolleyView?.render(
        playerPosition,
        ability,
        this.ultimateVolley?.getSnapshots() ?? [],
        this.ultimateVolley?.getImpactSnapshots() ?? [],
      );
      if (this.boss) {
        this.bossView?.render(this.boss.getSnapshot());
      }
      this.statusHud?.update(
        damage,
        parry,
        ability,
        this.boss?.getSnapshot().defeated ?? false,
      );
    }

  }

  private drawStagePlaceholder(): void {
    this.add.rectangle(
      DESIGN.width / 2,
      DESIGN.height / 2,
      DESIGN.width,
      DESIGN.height,
      COLORS.stage,
    );

    const guides = this.add.graphics();
    guides.lineStyle(2, COLORS.stageLine, 0.3);

    for (let x = 0; x <= DESIGN.width; x += 80) {
      guides.lineBetween(x, 0, x, DESIGN.height);
    }

    for (let y = 0; y <= DESIGN.height; y += 80) {
      guides.lineBetween(0, y, DESIGN.width, y);
    }

    guides.lineStyle(4, COLORS.accent, 0.8);
    guides.strokeRect(2, 2, DESIGN.width - 4, DESIGN.height - 4);

    guides.lineStyle(7, 0x62d4c7, 0.72);
    guides.lineBetween(0, 4, DESIGN.width, 4);
    guides.lineBetween(0, DESIGN.height - 4, DESIGN.width, DESIGN.height - 4);

    this.add.text(28, 24, "《琵琶曲》原型初期试玩版", {
      color: "#3b2a20",
      fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
      fontSize: "28px",
      fontStyle: "bold",
    });
  }

  private handleBulletInteractions(): void {
    if (
      !this.playerDamage ||
      !this.playerAbility ||
      !this.playerMovement ||
      !this.playerParry ||
      !this.bullets ||
      !this.boss
    ) {
      return;
    }

    const playerPosition = this.playerMovement.getPosition();
    const parry = this.playerParry.getSnapshot();

    if (parry.state === "active") {
      const specialId = this.bullets.findIncomingSpecialCollision(
        playerPosition,
        parry.radius,
      );

      if (
        specialId !== null &&
        this.bullets.reflect(specialId, playerPosition, parry.radius)
      ) {
        this.playerParry.trySucceed();
        this.playerAbility.gainEnergy(1);
      }
    }

    const damageSnapshot = this.playerDamage.getSnapshot();

    const ability = this.playerAbility.getSnapshot();

    if (ability.boosted) {
      let incomingId = this.bullets.findIncomingPlayerCollision(
        playerPosition,
        damageSnapshot.hitRadius,
      );

      while (incomingId !== null) {
        const reflected = this.bullets.reflectAnyIncoming(
          incomingId,
          playerPosition,
          damageSnapshot.hitRadius,
        );

        if (!reflected) {
          break;
        }

        incomingId = this.bullets.findIncomingPlayerCollision(
          playerPosition,
          damageSnapshot.hitRadius,
        );
      }
    } else if (ability.chargeProtectionActive) {
      let normalId = this.bullets.findIncomingNormalCollision(
        playerPosition,
        damageSnapshot.hitRadius,
      );

      while (normalId !== null) {
        const reflected = this.bullets.reflectNormal(
          normalId,
          playerPosition,
          damageSnapshot.hitRadius,
        );

        if (!reflected) {
          break;
        }

        normalId = this.bullets.findIncomingNormalCollision(
          playerPosition,
          damageSnapshot.hitRadius,
        );
      }
    }

    let targetHit = this.bullets.findReflectedColliderCollision(
      this.boss.getHitColliders(),
    );

    while (targetHit !== null) {
      this.bullets.consumeAsTargetHit(targetHit.bulletId);
      const result = this.boss.takeDamage();

      if (result === "defeated") {
        return;
      }

      targetHit = this.bullets.findReflectedColliderCollision(
        this.boss.getHitColliders(),
      );
    }

    if (ability.ultimateInvulnerable) {
      return;
    }

    let playerHit = this.bullets.findIncomingPlayerCollision(
      playerPosition,
      damageSnapshot.hitRadius,
    );

    while (playerHit !== null) {
      const result = this.playerDamage.tryTakeDamage();
      this.bullets.consume(playerHit);

      if (result !== "ignored") {
        this.playerParry.interruptForDamage();
        this.playerAbility.cancelForDamage();
      }

      if (result === "defeated") {
        break;
      }

      playerHit = this.bullets.findIncomingPlayerCollision(
        playerPosition,
        this.playerDamage.getSnapshot().hitRadius,
      );
    }
  }

  private getRigPresentation(
    damage: Readonly<ReturnType<PlayerDamageModel["getSnapshot"]>>,
    ability: Readonly<ReturnType<PlayerAbilityModel["getSnapshot"]>>,
  ): PlayerRigPresentation {
    return {
      hitRadius: damage.hitRadius,
      invulnerable: damage.invulnerable,
      defeated: damage.defeated,
      boosted: ability.boosted,
    };
  }

  private createMovementKeys(): MovementKeys | undefined {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return undefined;
    }

    return {
      up: INPUT_KEYS.moveUp.map((key) => keyboard.addKey(key)),
      down: INPUT_KEYS.moveDown.map((key) => keyboard.addKey(key)),
      left: INPUT_KEYS.moveLeft.map((key) => keyboard.addKey(key)),
      right: INPUT_KEYS.moveRight.map((key) => keyboard.addKey(key)),
    };
  }

  private readMovementInput(): PlayerMovementInput {
    if (!this.movementKeys) {
      return { x: 0, y: 0 };
    }

    return {
      x:
        Number(this.anyMovementKeyActive(this.movementKeys.right)) -
        Number(this.anyMovementKeyActive(this.movementKeys.left)),
      y:
        Number(this.anyMovementKeyActive(this.movementKeys.down)) -
        Number(this.anyMovementKeyActive(this.movementKeys.up)),
    };
  }

  private anyMovementKeyActive(keys: Phaser.Input.Keyboard.Key[]): boolean {
    let active = false;

    for (const key of keys) {
      const justPressed = Phaser.Input.Keyboard.JustDown(key);
      active = active || key.isDown || justPressed;
    }

    return active;
  }

  private consumeParryRequest(): boolean {
    const requested = this.parryRequested;
    this.parryRequested = false;
    return requested;
  }

  private handleAbilityEvents(events: Readonly<PlayerAbilityUpdateEvents>): void {
    if (events.ultimateStarted && this.bullets) {
      this.absorbedForUltimate = this.bullets.beginAbsorption(
        PLAYER_ABILITY.ultimateAbsorbSeconds,
      ).total;
      this.pendingUltimateDamage = 0;
    }

    if (
      events.volleyRequested &&
      this.ultimateVolley &&
      this.playerMovement
    ) {
      this.bullets?.absorbAll();
      const launch = this.ultimateVolley.launch(
        this.playerMovement.getPosition(),
        this.absorbedForUltimate,
      );
      this.pendingUltimateDamage = launch.damage;
    }

    if (events.damageRequested && this.pendingUltimateDamage > 0) {
      this.boss?.takeDamage(this.pendingUltimateDamage);
      this.pendingUltimateDamage = 0;
    }
  }

  private consumeSkillPressRequest(): boolean {
    const requested = this.skillPressRequested;
    this.skillPressRequested = false;
    return requested;
  }

  private consumeSkillReleaseRequest(): boolean {
    const requested = this.skillReleaseRequested;
    this.skillReleaseRequested = false;
    return requested;
  }
}
