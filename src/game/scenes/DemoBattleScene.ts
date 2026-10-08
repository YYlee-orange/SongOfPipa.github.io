import Phaser from "phaser";
import {
  PLAYER_ABILITY,
  PLAYER_DAMAGE,
  PLAYER_PARRY,
  PROTOTYPE_BULLETS,
  PROTOTYPE_ULTIMATE,
} from "../balance";
import { APP_INFO, DESIGN, INPUT_KEYS, PLAYER_MOVEMENT, PLAYER_RIG } from "../config";
import { DemoScrollingBackgroundModel } from "../demo/background/DemoScrollingBackgroundModel";
import { DemoScrollingBackgroundView } from "../demo/background/DemoScrollingBackgroundView";
import {
  DEMO_BACKGROUND_CONFIG,
  DEMO_BACKGROUND_PRESENTATION,
} from "../demo/background/demoBackgroundConfig";
import { DemoBossActorModel } from "../demo/boss/DemoBossActorModel";
import { DemoBossActorView } from "../demo/boss/DemoBossActorView";
import type { DemoBossAttackModel } from "../demo/boss/attacks/DemoBossAttackModel";
import { createDemoBossAttackModel } from "../demo/boss/attacks/createDemoBossAttackModel";
import {
  DEMO_BOSS_PHASE_IDS,
  DemoBossPhaseController,
  isDemoBossPhaseId,
  type DemoBossPhaseId,
  type DemoBossPhaseLifecycle,
  type DemoBossPhaseSnapshot,
} from "../demo/boss/DemoBossPhaseController";
import {
  DEMO_AMMO_BARREL_CONFIG,
  DEMO_BOSS_ACTOR_CONFIG,
  DEMO_BOSS_PHASE_CONFIGS,
  DEMO_LASER_GEOMETRY_CONFIG,
  DEMO_ROCKET_CONFIG,
  DEMO_SUMMON_CONFIG,
} from "../demo/boss/demoBossPhaseConfig";
import { DemoAmmoBarrelModel } from "../demo/barrels/DemoAmmoBarrelModel";
import { DemoAmmoBarrelView } from "../demo/barrels/DemoAmmoBarrelView";
import {
  createDemoLaserBeam,
  laserIntersectsCircle,
  type DemoLaserBeam,
} from "../demo/lasers/DemoLaserGeometry";
import { DemoLaserView } from "../demo/lasers/DemoLaserView";
import { DemoRocketModel } from "../demo/projectiles/DemoRocketModel";
import { DemoRocketView } from "../demo/projectiles/DemoRocketView";
import { DemoPlayerRigArtView } from "../demo/player/DemoPlayerRigArtView.ts";
import {
  DemoDisarmTransitionModel,
  type DemoDisarmTransitionConfig,
  type DemoDisarmTransitionState,
} from "../demo/transitions/DemoDisarmTransitionModel";
import {
  DEMO_PHASE1_DISARM_CONFIG,
  DEMO_PHASE2_DISARM_CONFIG,
  DEMO_PHASE3_ROCKET_DISARM_CONFIG,
  DEMO_PHASE3_SHOTGUN_DISARM_CONFIG,
  DEMO_PHASE4_SUMMONER_DISARM_CONFIG,
  DEMO_PHASE5_LASER_DISARM_CONFIG,
} from "../demo/transitions/demoDisarmTransitionConfig";
import { DemoDisarmTransitionView } from "../demo/transitions/DemoDisarmTransitionView";
import {
  DemoSummonModel,
  type DemoSummonExplosionEvent,
  type DemoSummonKind,
} from "../demo/summons/DemoSummonModel";
import { DemoSummonView } from "../demo/summons/DemoSummonView";
import {
  replaceWithDemoPhaseRoute,
  replaceWithPrototypeRoute,
} from "../demo/DemoRoute";
import { PrototypeBulletModel } from "../entities/bullet/PrototypeBulletModel";
import { PrototypeBulletView } from "../entities/bullet/PrototypeBulletView";
import {
  PlayerAbilityModel,
  type PlayerAbilityUpdateEvents,
} from "../entities/player/PlayerAbilityModel";
import { PlayerDamageModel } from "../entities/player/PlayerDamageModel";
import {
  PlayerMovementModel,
  type PlayerMovementInput,
} from "../entities/player/PlayerMovementModel";
import { PlayerParryModel } from "../entities/player/PlayerParryModel";
import { PlayerParryView } from "../entities/player/PlayerParryView";
import { PlayerRigModel } from "../entities/playerRig/PlayerRigModel";
import type { PlayerRigPresentation } from "../entities/playerRig/PlayerRigView";
import { UltimateVolleyModel } from "../entities/ultimate/UltimateVolleyModel";
import { UltimateVolleyView } from "../entities/ultimate/UltimateVolleyView";
import { PlayerStatusHud } from "../ui/PlayerStatusHud";

interface DemoBattleSceneData {
  phaseId?: unknown;
  debugEnabled?: unknown;
}

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

interface DebugKeys {
  phases: Readonly<Record<DemoBossPhaseId, Phaser.Input.Keyboard.Key>>;
  reset: Phaser.Input.Keyboard.Key;
  advanceLifecycle: Phaser.Input.Keyboard.Key;
  recoil: Phaser.Input.Keyboard.Key;
  hit: Phaser.Input.Keyboard.Key;
  cycleAttack: Phaser.Input.Keyboard.Key;
  summonMachineGun: Phaser.Input.Keyboard.Key;
  summonHandgun: Phaser.Input.Keyboard.Key;
  summonCreeper: Phaser.Input.Keyboard.Key;
  clearSummons: Phaser.Input.Keyboard.Key;
  laserBasic: Phaser.Input.Keyboard.Key;
  laserUltimate: Phaser.Input.Keyboard.Key;
  laserCorner: Phaser.Input.Keyboard.Key;
  laserBasicCount: Phaser.Input.Keyboard.Key;
  barrelSpawn: Phaser.Input.Keyboard.Key;
  barrelCharge: Phaser.Input.Keyboard.Key;
  barrelBurst: Phaser.Input.Keyboard.Key;
  barrelExpire: Phaser.Input.Keyboard.Key;
  prototype: Phaser.Input.Keyboard.Key;
}

const LIFECYCLE_LABELS: Readonly<Record<DemoBossPhaseLifecycle, string>> =
  Object.freeze({
    active: "阶段战斗中",
    "transition-ready": "生命归零／等待转场",
    transitioning: "转阶段中",
    victory: "五阶段终结／胜利",
  });

/**
 * Demo 的唯一战斗场景。五个 Boss 阶段只改变场景内状态，绝不通过
 * Phaser Scene 切换实现。调试模式也只是本场景上的轻量覆盖层。
 */
export class DemoBattleScene extends Phaser.Scene {
  private initialPhase: DemoBossPhaseId = 1;
  private debugEnabled = false;
  private controller?: DemoBossPhaseController;
  private backgroundModel?: DemoScrollingBackgroundModel;
  private backgroundView?: DemoScrollingBackgroundView;
  private movement?: PlayerMovementModel;
  private movementKeys?: MovementKeys;
  private debugKeys?: DebugKeys;
  private rig?: PlayerRigModel;
  private rigView?: DemoPlayerRigArtView;
  private bossActor?: DemoBossActorModel;
  private bossView?: DemoBossActorView;
  private phaseAttack?: DemoBossAttackModel | null;
  private playerDamage?: PlayerDamageModel;
  private playerAbility?: PlayerAbilityModel;
  private playerParry?: PlayerParryModel;
  private playerParryView?: PlayerParryView;
  private bullets?: PrototypeBulletModel;
  private bulletView?: PrototypeBulletView;
  private rockets?: DemoRocketModel;
  private rocketView?: DemoRocketView;
  private summons?: DemoSummonModel;
  private summonView?: DemoSummonView;
  private ammoBarrels?: DemoAmmoBarrelModel;
  private ammoBarrelView?: DemoAmmoBarrelView;
  private laserView?: DemoLaserView;
  private ultimateVolley?: UltimateVolleyModel;
  private ultimateVolleyView?: UltimateVolleyView;
  private disarmTransition?: DemoDisarmTransitionModel;
  private disarmTransitionView?: DemoDisarmTransitionView;
  private playerStatusHud?: PlayerStatusHud;
  private statusText?: Phaser.GameObjects.Text;
  private actorDebugText?: Phaser.GameObjects.Text;
  private tutorialText?: Phaser.GameObjects.Text;
  private phaseButtons = new Map<DemoBossPhaseId, Phaser.GameObjects.Text>();
  private parryRequested = false;
  private readonly parryHeldKeys = new Set<string>();
  private skillHeld = false;
  private skillPressRequested = false;
  private skillReleaseRequested = false;
  private absorbedForUltimate = 0;
  private lastLaserDamageAttackId: number | null = null;
  private readonly onRestartKey = (): void => {
    const victory = this.controller?.getSnapshot().lifecycle === "victory";
    if (this.playerDamage?.getSnapshot().defeated || victory) {
      this.scene.restart({
        phaseId: this.initialPhase,
        debugEnabled: this.debugEnabled,
      });
    }
  };
  private readonly onParryKeyDown = (event: KeyboardEvent): void => {
    this.parryHeldKeys.add(event.code);
    this.parryRequested = true;
  };
  private readonly onParryKeyUp = (event: KeyboardEvent): void => {
    this.parryHeldKeys.delete(event.code);
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
    super("DemoBattleScene");
  }

  init(data: DemoBattleSceneData): void {
    this.initialPhase = isDemoBossPhaseId(data.phaseId) ? data.phaseId : 1;
    this.debugEnabled = data.debugEnabled === true;
  }

  create(): void {
    this.controller = new DemoBossPhaseController(
      DEMO_BOSS_PHASE_CONFIGS,
      this.initialPhase,
    );
    this.resetCombatModels();
    this.movement = new PlayerMovementModel(
      PLAYER_MOVEMENT,
      PLAYER_RIG.initialPelvis,
    );
    this.rig = new PlayerRigModel(PLAYER_RIG);
    this.rigView = new DemoPlayerRigArtView(this, this.rig);
    this.movementKeys = this.createMovementKeys();
    this.createScrollingBackground();
    this.createBossActor();
    this.createPhaseAttack();
    this.bossView = new DemoBossActorView(this);
    this.bulletView = new PrototypeBulletView(this);
    this.rocketView = new DemoRocketView(this);
    this.summonView = new DemoSummonView(this);
    this.ammoBarrelView = new DemoAmmoBarrelView(this);
    this.laserView = new DemoLaserView(this);
    this.ultimateVolleyView = new UltimateVolleyView(this, PLAYER_ABILITY);
    this.disarmTransitionView = new DemoDisarmTransitionView(this);
    this.playerParryView = new PlayerParryView(this);
    this.playerStatusHud = new PlayerStatusHud(this, 88);
    this.registerCombatInput();

    this.add.text(26, 22, "《琵琶曲》Demo · 1.0.0 RC1", {
      color: "#3b2a20",
      fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
      fontSize: "27px",
      fontStyle: "bold",
    }).setDepth(900);

    this.add.text(
      26,
      58,
      this.debugEnabled
        ? "D8 集成回归 · 同场景五阶段调试覆盖层"
        : "五阶段 Boss 战 · 四次转阶段与最终夺械",
      {
        color: "#765039",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "16px",
      },
    ).setDepth(900);

    if (this.debugEnabled) {
      this.debugKeys = this.createDebugKeys();
      this.createDebugOverlay();
    }

    this.statusText = this.add.text(DESIGN.width / 2, 112, "", {
      color: "#4b2018",
      fontFamily: 'Consolas, "Microsoft YaHei", monospace',
      fontSize: "14px",
      align: "center",
      lineSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(900);

    if (this.debugEnabled) {
      this.actorDebugText = this.add.text(720, 592, "", {
        color: "#4b2018",
        fontFamily: 'Consolas, "Microsoft YaHei", monospace',
        fontSize: "12px",
        lineSpacing: 2,
      }).setDepth(900);
    }

    this.tutorialText = this.add
      .text(DESIGN.width / 2, 78, "", {
        backgroundColor: "rgba(255, 244, 214, 0.88)",
        color: "#7a2f25",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "19px",
        fontStyle: "bold",
        padding: { left: 14, right: 14, top: 7, bottom: 7 },
      })
      .setOrigin(0.5, 0)
      .setDepth(905)
      .setVisible(false);

    this.add.text(
      26,
      DESIGN.height - 24,
      this.debugEnabled
        ? "WASD / 方向键移动 · Z/J 反弹 · X/K 技能 · 1～5 直达 · B/U/Y/Q 激光 · N/V/I/O 弹药桶 · L 清场 · Esc 原型"
        : "WASD / 方向键移动 · Z / J 反弹 · X / K 技能 · Enter 重开",
      {
        color: "#6f4933",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "17px",
      },
    ).setOrigin(0, 1).setDepth(900);

    this.syncPageContext();
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    this.backgroundModel?.update(deltaSeconds);
    const backgroundSnapshot = this.backgroundModel?.getSnapshot();
    if (backgroundSnapshot) {
      this.backgroundView?.render(backgroundSnapshot);
    }
    this.handleDebugKeys();
    this.controller?.update(deltaSeconds);
    this.playerDamage?.update(deltaSeconds);
    this.beginImplementedDisarmTransition();

    const phaseBeforeCombat = this.controller?.getSnapshot();
    const playerDefeated = this.playerDamage?.getSnapshot().defeated ?? false;
    const battleActive =
      phaseBeforeCombat?.lifecycle === "active" && !playerDefeated;

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
    } else {
      this.parryRequested = false;
      this.skillPressRequested = false;
      this.skillReleaseRequested = false;
      const abilityEvents = this.playerAbility?.update(deltaSeconds, false);
      if (abilityEvents) {
        this.handleAbilityEvents(abilityEvents);
      }
    }

    if (!playerDefeated) {
      this.movement?.update(this.readMovementInput(), deltaSeconds);
    }

    const attackBeforeActorUpdate = this.phaseAttack?.getSnapshot();
    const playerBeforeActorUpdate = this.movement?.getPosition();
    const actorCanMove =
      phaseBeforeCombat?.lifecycle === "active" && !playerDefeated;
    if (
      actorCanMove &&
      playerBeforeActorUpdate &&
      attackBeforeActorUpdate?.bossMovementMode === "track-player-y"
    ) {
      this.bossActor?.updateVerticalTracking(
        deltaSeconds,
        playerBeforeActorUpdate.y,
      );
    } else if (
      actorCanMove &&
      attackBeforeActorUpdate?.bossMovementMode === "center-y"
    ) {
      this.bossActor?.updateVerticalTracking(deltaSeconds, DESIGN.height / 2);
    } else {
      this.bossActor?.update(
        deltaSeconds,
        actorCanMove && !(attackBeforeActorUpdate?.pauseBossMovement ?? false),
      );
    }

    if (this.rig && this.movement) {
      this.rig.setPelvisAnchor(this.movement.getPosition());
      this.rig.update(deltaSeconds);
    }

    const playerPosition = this.movement?.getPosition();
    const actorForAttack = this.bossActor?.getSnapshot();
    const abilityForAttack = this.playerAbility?.getSnapshot();

    if (playerPosition && actorForAttack && this.disarmTransition) {
      const transitionEvents = this.disarmTransition.update(deltaSeconds, {
        playerPosition,
        playerHalfWidth: PLAYER_RIG.pelvisSize.width / 2,
        playerHalfHeight: PLAYER_RIG.pelvisSize.height / 2,
        bossTarget: {
          center: actorForAttack.headPosition,
          radius: actorForAttack.headHitRadius,
        },
        fireHeld: this.parryHeldKeys.size > 0,
      });
      if (transitionEvents.bossHits > 0) {
        this.bossActor?.triggerHitFeedback();
      }
      if (transitionEvents.resolved) {
        this.completeImplementedDisarmTransition();
      }
    }

    if (
      battleActive &&
      playerPosition &&
      actorForAttack &&
      this.phaseAttack
    ) {
      const shots = this.phaseAttack.update(deltaSeconds, {
        bossPosition: actorForAttack.position,
        muzzlePosition: actorForAttack.muzzlePosition,
        playerPosition,
        allowFiring: !(abilityForAttack?.bossFirePaused ?? false),
        activeOldHandguns: this.summons?.getStats().oldHandguns ?? 0,
      });

      for (const shot of shots) {
        const spawned = shot.projectileKind === "rocket"
          ? this.rockets?.spawn(shot.origin, shot.target)
          : shot.projectileKind === "summon" && shot.summonKind
            ? this.summons?.spawn(shot.summonKind, shot.origin, shot.target)
            : this.bullets?.spawnIncoming(
              shot.type,
              shot.origin,
              shot.target,
              shot.speed,
            );
        if (
          spawned !== null &&
          spawned !== undefined &&
          shot.recoilImpulse
        ) {
          this.bossActor?.triggerWeaponRecoil();
        }
      }
    }

    const attackAfterUpdate = this.phaseAttack?.getSnapshot() ?? null;
    const actorAfterAttack = this.bossActor?.getSnapshot();
    const laserBeam = actorAfterAttack && attackAfterUpdate
      ? createDemoLaserBeam(
        DEMO_LASER_GEOMETRY_CONFIG,
        attackAfterUpdate,
        actorAfterAttack,
      )
      : null;
    const effectiveLaserBeam =
      battleActive &&
      !(this.playerAbility?.getSnapshot().bossFirePaused ?? false)
        ? laserBeam
        : null;

    if (battleActive && playerPosition && effectiveLaserBeam?.active) {
      this.handleLaserInteraction(effectiveLaserBeam);
    }

    if (playerPosition && actorAfterAttack) {
      const barrelEvents = this.ammoBarrels?.update(deltaSeconds, {
        allowProgress:
          battleActive &&
          phaseBeforeCombat?.phaseId === 5 &&
          !(this.playerAbility?.getSnapshot().bossFirePaused ?? false),
        playerPosition,
        bossPosition: actorAfterAttack.position,
        activeLaser: effectiveLaserBeam?.active ? effectiveLaserBeam : null,
      });
      for (const bullet of barrelEvents?.bullets ?? []) {
        this.bullets?.spawnIncoming(
          "special",
          bullet.origin,
          bullet.target,
          bullet.speed,
        );
      }
    }

    if (!playerDefeated && playerPosition) {
      const summonEvents = this.summons?.update(
        deltaSeconds,
        playerPosition,
        battleActive && !(abilityForAttack?.bossFirePaused ?? false),
      );
      for (const bullet of summonEvents?.bullets ?? []) {
        this.bullets?.spawnIncoming(
          bullet.type,
          bullet.origin,
          bullet.target,
          bullet.speed,
        );
      }
      this.bullets?.update(deltaSeconds, playerPosition);
      this.rockets?.update(deltaSeconds, playerPosition);
      if (battleActive) {
        this.handleSummonInteractions(summonEvents?.explosions ?? []);
        this.handleBulletInteractions();
      }
    }

    const phaseBeforeUltimateHits = this.controller?.getSnapshot();
    const bossUltimateTargets = phaseBeforeUltimateHits?.lifecycle === "active"
      ? (this.bossActor?.getHitColliders() ?? [])
      : [];
    const handgunUltimateTargets = phaseBeforeUltimateHits?.lifecycle === "active"
      ? (this.summons?.getHandgunColliders() ?? [])
      : [];
    const ultimateHits = this.ultimateVolley?.update(
      deltaSeconds,
      [
        ...bossUltimateTargets,
        ...handgunUltimateTargets,
      ],
    ) ?? [];

    for (const hit of ultimateHits) {
      if (hit.targetIndex < bossUltimateTargets.length) {
        this.applyBossDamage(hit.damage);
      } else {
        const handgun = handgunUltimateTargets[
          hit.targetIndex - bossUltimateTargets.length
        ];
        if (handgun) {
          this.summons?.destroyHandgun(handgun.entityId);
        }
      }
    }

    const snapshot = this.controller?.getSnapshot();
    const actorSnapshot = this.bossActor?.getSnapshot();
    const damage = this.playerDamage?.getSnapshot();
    const parry = this.playerParry?.getSnapshot();
    const ability = this.playerAbility?.getSnapshot();

    if (
      snapshot &&
      actorSnapshot &&
      damage &&
      parry &&
      ability &&
      playerPosition
    ) {
      this.rigView?.render(this.getRigPresentation(damage, ability));
      this.playerParryView?.render(playerPosition, parry, time);
      this.bulletView?.render(this.bullets?.getSnapshots() ?? [], time);
      this.rocketView?.render(
        this.rockets?.getSnapshots() ?? [],
        this.rockets?.getExplosionSnapshots() ?? [],
        this.debugEnabled,
      );
      this.summonView?.render(
        this.summons?.getSnapshots() ?? [],
        this.summons?.getExplosionSnapshots() ?? [],
        this.debugEnabled,
      );
      this.laserView?.render(
        effectiveLaserBeam,
        attackAfterUpdate,
        actorSnapshot,
        this.debugEnabled,
      );
      this.ammoBarrelView?.render(
        this.ammoBarrels?.getSnapshots() ?? [],
        this.debugEnabled,
      );
      this.ultimateVolleyView?.render(
        playerPosition,
        ability,
        this.ultimateVolley?.getSnapshots() ?? [],
        this.ultimateVolley?.getImpactSnapshots() ?? [],
      );
      const transitionSnapshot = this.disarmTransition?.getSnapshot() ?? null;
      this.disarmTransitionView?.render(
        transitionSnapshot,
        this.debugEnabled,
      );
      this.renderStatus(snapshot, actorSnapshot);
      const attackPresentation = this.phaseAttack?.getSnapshot();
      this.bossView?.render(
        actorSnapshot,
        snapshot,
        this.debugEnabled,
        transitionSnapshot || snapshot.lifecycle === "victory"
          ? "空手"
          : attackPresentation?.weaponLabel,
        transitionSnapshot
          ? "夺械转场"
          : snapshot.lifecycle === "victory"
            ? "终结"
            : attackPresentation?.stateLabel,
        attackPresentation?.laserAngle,
        transitionSnapshot?.pressureProgress ?? null,
      );
      this.renderPhaseButtons(snapshot.phaseId);
      this.playerStatusHud?.update(
        damage,
        parry,
        ability,
        snapshot.lifecycle === "victory",
      );

      const tutorialMessage =
        transitionSnapshot
          ? transitionSnapshot.prompt
          : snapshot.lifecycle === "active"
          ? (this.phaseAttack?.getSnapshot().tutorialMessage ?? "")
          : "";
      this.tutorialText
        ?.setText(tutorialMessage)
        .setVisible(tutorialMessage.length > 0);
    }
  }

  private createDebugOverlay(): void {
    this.add.text(592, 22, "直达", {
      color: "#5b3725",
      fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
      fontSize: "16px",
      fontStyle: "bold",
    }).setDepth(901);

    for (const phaseId of DEMO_BOSS_PHASE_IDS) {
      const button = this.createButton(
        640 + (phaseId - 1) * 50,
        18,
        `${phaseId}`,
        () => this.enterPhaseDirectly(phaseId),
      );
      this.phaseButtons.set(phaseId, button);
    }

    this.createButton(900, 18, "复位 R", () => this.resetCurrentPhase());
    this.createButton(996, 18, "推进 T", () => this.advanceLifecycle());
    this.createButton(1092, 18, "返回原型", () => this.openPrototype());
    this.createButton(780, 56, "后坐 F", () => {
      this.bossActor?.triggerWeaponRecoil();
    });
    this.createButton(884, 56, "Boss受伤", () => {
      this.defeatBossForTransition();
    });
    this.createButton(988, 56, "模式 G", () => {
      this.phaseAttack?.debugAdvancePattern?.();
    });
    this.createButton(820, 94, "机枪 M", () => {
      this.debugSpawnSummon("rotating-machine-gun");
    });
    this.createButton(928, 94, "手枪 P", () => {
      this.debugSpawnSummon("old-handgun");
    });
    this.createButton(1036, 94, "苦力怕 C", () => {
      this.debugSpawnSummon("creeper");
    });
    this.createButton(1164, 94, "清场 L", () => {
      this.clearBattleProjectiles();
    });
    this.createButton(820, 132, "普攻 B", () => {
      this.phaseAttack?.debugTriggerBasic?.();
    });
    this.createButton(928, 132, "大招 U", () => {
      this.phaseAttack?.debugTriggerUltimate?.();
    });
    this.createButton(1036, 132, "起点 Y", () => {
      this.phaseAttack?.debugToggleSweepStart?.();
    });
    this.createButton(1150, 132, "计数 Q", () => {
      this.phaseAttack?.debugCycleBasicCount?.();
    });
    this.createButton(820, 170, "生成桶 N", () => this.debugSpawnBarrel());
    this.createButton(944, 170, "充满桶 V", () => {
      this.ammoBarrels?.forceChargeFirst();
    });
    this.createButton(1068, 170, "哑火桶 O", () => {
      this.ammoBarrels?.forceExpireFirst();
    });
    this.createButton(1188, 170, "引爆 I", () => {
      this.ammoBarrels?.forceBurstFirst();
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onPress: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        backgroundColor: "#fff0cf",
        color: "#4b2018",
        fontFamily: '"Trebuchet MS", "Microsoft YaHei", sans-serif',
        fontSize: "15px",
        padding: { left: 10, right: 10, top: 7, bottom: 7 },
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(901);
    button.on("pointerdown", onPress);
    button.on("pointerover", () => button.setColor("#b53d2e"));
    button.on("pointerout", () => button.setColor("#4b2018"));
    return button;
  }

  private enterPhaseDirectly(phaseId: DemoBossPhaseId): void {
    this.initialPhase = phaseId;
    this.controller?.enterPhase(phaseId);
    this.createBossActor();
    this.createPhaseAttack();
    this.resetCombatModels();
    this.resetPlayerPosition();
    replaceWithDemoPhaseRoute(phaseId);
    this.syncPageContext();
  }

  private resetCurrentPhase(): void {
    this.controller?.resetCurrentPhase();
    this.createBossActor();
    this.createPhaseAttack();
    this.resetCombatModels();
    this.resetPlayerPosition();
  }

  /** 每次只推进正式状态机的一步；不进入另一套测试流程。 */
  private advanceLifecycle(): void {
    const snapshot = this.controller?.getSnapshot();
    if (!snapshot || !this.controller) {
      return;
    }

    if (snapshot.lifecycle === "active") {
      this.controller.forceTransitionReady();
      this.clearBattleProjectiles();
      return;
    }

    if (snapshot.lifecycle === "transition-ready") {
      if (this.hasImplementedDisarm(snapshot.phaseId)) {
        this.beginImplementedDisarmTransition();
        return;
      }
      this.controller.beginTransition();
      return;
    }

    if (snapshot.lifecycle === "transitioning") {
      if (this.hasImplementedDisarm(snapshot.phaseId)) {
        this.beginImplementedDisarmTransition();
        return;
      }
      const result = this.controller.completeTransition();
      if (typeof result === "number") {
        this.createBossActor();
        this.createPhaseAttack();
        if (this.debugEnabled) {
          replaceWithDemoPhaseRoute(result);
        }
      }
      this.syncPageContext();
      return;
    }

    this.controller.enterPhase(1);
    this.createBossActor();
    this.createPhaseAttack();
    this.resetCombatModels();
    this.resetPlayerPosition();
    replaceWithDemoPhaseRoute(1);
    this.syncPageContext();
  }

  /**
   * D4.1～D4.2 已接入的公共夺械入口。方法可重复调用，且能接管
   * 调试键已经提前把控制器推入 transitioning 的边界情况。
   */
  private beginImplementedDisarmTransition(): boolean {
    if (this.disarmTransition || !this.controller || !this.bossActor) {
      return false;
    }
    let phase = this.controller.getSnapshot();
    if (
      !this.hasImplementedDisarm(phase.phaseId) ||
      (phase.lifecycle !== "transition-ready" &&
        phase.lifecycle !== "transitioning")
    ) {
      return false;
    }
    if (
      phase.lifecycle === "transition-ready" &&
      !this.controller.beginTransition()
    ) {
      return false;
    }
    phase = this.controller.getSnapshot();
    if (phase.lifecycle !== "transitioning") {
      return false;
    }

    this.clearBattleProjectiles();
    this.playerAbility?.cancelAllForTransition();
    this.playerParry?.cancelForTransition();
    this.parryRequested = false;
    this.skillPressRequested = false;
    this.skillReleaseRequested = false;
    const transitionConfig = this.getDisarmConfig(phase.phaseId);
    if (!transitionConfig) {
      return false;
    }
    this.disarmTransition = new DemoDisarmTransitionModel(
      transitionConfig,
      this.bossActor.getSnapshot().weaponPosition,
    );
    this.syncPageContext();
    return true;
  }

  private completeImplementedDisarmTransition(): void {
    if (!this.disarmTransition || !this.controller) {
      return;
    }
    const expectedNextPhase = this.controller.getSnapshot().nextPhaseId;
    const result = this.controller.completeTransition();
    if (expectedNextPhase === null && result === "victory") {
      this.disarmTransition = undefined;
      this.phaseAttack = null;
      this.parryRequested = false;
      this.syncPageContext();
      return;
    }
    if (typeof result !== "number" || result !== expectedNextPhase) {
      return;
    }
    this.disarmTransition = undefined;
    this.parryRequested = false;
    this.createBossActor();
    this.createPhaseAttack();
    if (this.debugEnabled) {
      replaceWithDemoPhaseRoute(result);
    }
    this.syncPageContext();
  }

  private hasImplementedDisarm(phaseId: DemoBossPhaseId): boolean {
    return phaseId >= 1 && phaseId <= 5;
  }

  private getDisarmConfig(
    phaseId: DemoBossPhaseId,
  ): Readonly<DemoDisarmTransitionConfig> | null {
    if (phaseId === 1) {
      return DEMO_PHASE1_DISARM_CONFIG;
    }
    if (phaseId === 2) {
      return DEMO_PHASE2_DISARM_CONFIG;
    }
    if (phaseId === 3) {
      const weaponLabel = this.phaseAttack?.getSnapshot().weaponLabel ?? "";
      return weaponLabel.includes("火箭")
        ? DEMO_PHASE3_ROCKET_DISARM_CONFIG
        : DEMO_PHASE3_SHOTGUN_DISARM_CONFIG;
    }
    if (phaseId === 4) {
      return DEMO_PHASE4_SUMMONER_DISARM_CONFIG;
    }
    if (phaseId === 5) {
      return DEMO_PHASE5_LASER_DISARM_CONFIG;
    }
    return null;
  }

  private damageBoss(): void {
    this.applyBossDamage(1);
  }

  /** 调试覆盖层的一键转场入口；键盘 H 仍保留单点伤害检查。 */
  private defeatBossForTransition(): void {
    const snapshot = this.controller?.getSnapshot();
    if (snapshot?.lifecycle === "active") {
      this.applyBossDamage(snapshot.currentHealth);
    }
  }

  private debugSpawnSummon(kind: DemoSummonKind): void {
    if (this.controller?.getSnapshot().phaseId !== 4) {
      return;
    }
    const actor = this.bossActor?.getSnapshot();
    const playerPosition = this.movement?.getPosition();
    if (!actor || !playerPosition) {
      return;
    }
    const id = this.summons?.spawn(kind, actor.muzzlePosition, playerPosition);
    if (id !== null && id !== undefined) {
      this.bossActor?.triggerWeaponRecoil();
    }
  }

  private debugSpawnBarrel(): void {
    if (this.controller?.getSnapshot().phaseId !== 5) {
      return;
    }
    const actor = this.bossActor?.getSnapshot();
    const playerPosition = this.movement?.getPosition();
    if (actor && playerPosition) {
      this.ammoBarrels?.forceSpawn(playerPosition, actor.position);
    }
  }

  private createBossActor(): void {
    const phase = this.controller?.getSnapshot();
    if (!phase) {
      return;
    }

    this.bossActor = new DemoBossActorModel(DEMO_BOSS_ACTOR_CONFIG, {
      movementSpeed: phase.movementSpeed,
      randomSeed: phase.randomSeed,
    });
  }

  private createPhaseAttack(): void {
    const phaseId = this.controller?.getSnapshot().phaseId;
    this.phaseAttack = phaseId
      ? createDemoBossAttackModel(phaseId)
      : null;
  }

  private resetCombatModels(): void {
    this.playerDamage = new PlayerDamageModel(PLAYER_DAMAGE);
    this.playerAbility = new PlayerAbilityModel(PLAYER_ABILITY);
    this.playerParry = new PlayerParryModel(PLAYER_PARRY);
    this.bullets = new PrototypeBulletModel(PROTOTYPE_BULLETS);
    this.rockets = new DemoRocketModel(DEMO_ROCKET_CONFIG);
    this.summons = new DemoSummonModel(DEMO_SUMMON_CONFIG);
    this.ammoBarrels = new DemoAmmoBarrelModel(DEMO_AMMO_BARREL_CONFIG);
    this.ultimateVolley = new UltimateVolleyModel(PROTOTYPE_ULTIMATE);
    this.parryRequested = false;
    this.skillHeld = false;
    this.skillPressRequested = false;
    this.skillReleaseRequested = false;
    this.absorbedForUltimate = 0;
    this.lastLaserDamageAttackId = null;
    this.disarmTransition = undefined;
    this.parryHeldKeys.clear();
  }

  private clearBattleProjectiles(): void {
    this.bullets?.absorbAll();
    this.rockets?.clearAll();
    this.summons?.clearAll();
    this.ammoBarrels?.clearAll();
    this.ultimateVolley?.clearAll();
  }

  private openPrototype(): void {
    replaceWithPrototypeRoute();
    document.title = "琵琶曲 · 原型";
    this.scene.start("PrototypeScene");
  }

  private syncPageContext(): void {
    const snapshot = this.controller?.getSnapshot();
    const phaseId = snapshot?.phaseId ?? this.initialPhase;
    const suffix = this.debugEnabled ? "调试" : "战斗";
    document.title = `琵琶曲 · Demo 阶段 ${phaseId} ${suffix}`;
    document
      .querySelector<HTMLElement>("#app")
      ?.setAttribute(
        "aria-label",
        `《琵琶曲》Demo 单场景 Boss 战，当前阶段 ${phaseId}${suffix}`,
      );
  }

  private renderPhaseButtons(activePhaseId: DemoBossPhaseId): void {
    for (const [phaseId, button] of this.phaseButtons) {
      button.setBackgroundColor(
        phaseId === activePhaseId ? "#f2b45f" : "#fff0cf",
      );
    }
  }

  private renderStatus(
    snapshot: Readonly<DemoBossPhaseSnapshot>,
    actor: Readonly<ReturnType<DemoBossActorModel["getSnapshot"]>>,
  ): void {
    const nextLabel = snapshot.nextPhaseId === null
      ? "最终胜利"
      : `阶段 ${snapshot.nextPhaseId}`;
    const attack = this.phaseAttack?.getSnapshot();
    const transition = this.disarmTransition?.getSnapshot();

    if (!this.debugEnabled) {
      this.statusText?.setText([
        `阶段 ${snapshot.phaseId} · ${snapshot.label}`,
        LIFECYCLE_LABELS[snapshot.lifecycle],
        transition
          ? `夺械：${formatTransitionState(transition.state, transition.weaponLabel)} · 压制 ${formatTransitionPressure(transition.weaponKind, transition.bossHits, transition.requiredHits)}`
          : "",
      ].filter(Boolean));
      return;
    }

    const lines = [
      `阶段 ${snapshot.phaseId} · ${snapshot.label}`,
      `RC ${APP_INFO.version} · FPS ${this.game.loop.actualFps.toFixed(1)} · 显示 ${Math.round(this.scale.displaySize.width)}×${Math.round(this.scale.displaySize.height)}`,
      snapshot.role,
      `武器：${snapshot.weapon}`,
      `生命：${snapshot.currentHealth} / ${snapshot.maximumHealth}`,
      `状态：${LIFECYCLE_LABELS[snapshot.lifecycle]}`,
      `下一状态目标：${nextLabel}`,
      `阶段 / 全程：${snapshot.phaseElapsedSeconds.toFixed(1)} / ${snapshot.encounterElapsedSeconds.toFixed(1)} s`,
      `移速：${snapshot.movementSpeed.toFixed(0)}`,
      `种子：${snapshot.randomSeed}`,
      `参数：${snapshot.parameterSource}`,
      attack
        ? `攻击：${attack.attackLabel} · ${attack.stateLabel} · 下一事件 ${attack.fireRemaining.toFixed(2)} s`
        : "攻击：本阶段尚未实装",
    ];

    if (transition) {
      lines.push(
        `夺械：${formatTransitionState(transition.state, transition.weaponLabel)} · 输入 ${transition.inputLabel}`,
        `压制：${formatTransitionPressure(transition.weaponKind, transition.bossHits, transition.requiredHits)} · ${(transition.pressureProgress * 100).toFixed(0)}% · 预计剩余 ${transition.estimatedPressureSecondsRemaining.toFixed(1)} s`,
        `武器：${formatVec(transition.weaponPosition)} · 落点 ${formatVec(transition.landingPosition)}`,
      );
    }

    if (attack) {
      if (attack.kind === "phase4-summoner") {
        lines.push(
          `召唤：${attack.summonsIssued} 次 · 上次 ${formatSummonKind(attack.lastSummonKind)}`,
        );
      } else {
        lines.push(
          `射击：${attack.shotsFired} 发 · 特殊 ${attack.specialShotsFired} 发`,
        );
      }
      if (
        attack.burstSize !== null &&
        attack.shotsRemainingInBurst !== null
      ) {
        lines.push(
          `当前连射：${attack.burstSize} 发 · 剩余 ${attack.shotsRemainingInBurst} · 已完成 ${attack.burstsCompleted} 轮`,
        );
      }
      if (
        attack.modeAttackCount !== null &&
        attack.attacksBeforeSwitchCheck !== null
      ) {
        const switchLabel = attack.lastSwitchResult === null
          ? "尚未判定"
          : attack.lastSwitchResult === "switched"
            ? "上次：已切换"
            : "上次：保持";
        lines.push(
          `当前武器：${attack.weaponLabel} · 本模式攻击 ${attack.modeAttackCount} · 距判定 ${attack.attacksBeforeSwitchCheck}`,
          `切换判定：${attack.switchChecks} 次 · 已切换 ${attack.weaponSwitches} 次 · ${switchLabel}`,
        );
      }
      if (attack.kind === "phase5-laser") {
        lines.push(
          `激光：${attack.laserMode === "ultimate" ? "全图扫射" : "横向普攻"} · 招式#${attack.laserAttackId ?? 0} · ${attack.laserActive ? "生效" : "未生效"}`,
          `连续普攻：${attack.consecutiveBasicAttacks ?? 0}/3 · 普攻 ${attack.basicAttacksFired ?? 0} · 大招 ${attack.ultimateAttacksFired ?? 0}`,
          `锁定高度：${attack.lockedLaserY?.toFixed(0) ?? "—"} · 扫射起点/安全角：${formatCorner(attack.sweepStartCorner)} / ${formatCorner(attack.safeCorner)} · 进度 ${((attack.sweepProgress ?? 0) * 100).toFixed(0)}%`,
        );
      }
    }

    this.statusText?.setText(lines);

    const rocketStats = this.rockets?.getStats();
    const summonStats = this.summons?.getStats();
    const barrelStats = this.ammoBarrels?.getStats();
    const firstRocket = this.rockets?.getSnapshots()[0];
    const firstSummon = this.summons?.getSnapshots()[0];
    const firstBarrel = this.ammoBarrels?.getSnapshots()[0];
    const actorLines = [
      `根：${formatVec(actor.position)}  目标：${formatVec(actor.targetPosition)}`,
      `头／武器：${formatVec(actor.headPosition)} / ${formatVec(actor.weaponPosition)}`,
      `枪口：${formatVec(actor.muzzlePosition)}  受击半径：${actor.headHitRadius}`,
      `游离：头 ${formatVec(actor.headWanderOffset)}  武器 ${formatVec(actor.weaponWanderOffset)}`,
      `后坐：${actor.weaponRecoilOffset.toFixed(1)} / ${actor.weaponRecoilMaximumOffset.toFixed(1)}`,
    ];
    if (rocketStats) {
      actorLines.push(
        `火箭：在场 ${rocketStats.active} · 发射 ${rocketStats.spawnedTotal} · 反弹 ${rocketStats.reflectedTotal} · 撞墙 ${rocketStats.wallExplosions}`,
      );
    }
    if (firstRocket) {
      actorLines.push(
        `火箭#${firstRocket.id}：${firstRocket.motion} · 速度 ${firstRocket.speed.toFixed(0)}/${firstRocket.maximumSpeed.toFixed(0)} · 加速度 ${firstRocket.acceleration.toFixed(0)} · 转向 ${firstRocket.homingTurnRateRadiansPerSecond.toFixed(2)} rad/s · 伤害 ${firstRocket.playerDamage}`,
      );
    }
    if (summonStats) {
      actorLines.push(
        `召唤物：在场 ${summonStats.active} · 投掷 ${summonStats.thrown} · 机枪 ${summonStats.rotatingMachineGuns} · 手枪 ${summonStats.oldHandguns}/15 · 苦力怕 ${summonStats.creepers}`,
        `召唤输出：机枪弹 ${summonStats.machineGunBullets} · 手枪弹 ${summonStats.handgunBullets} · 手枪销毁 ${summonStats.destroyedHandguns} · 机枪销毁 ${summonStats.destroyedMachineGuns} · 爆炸 ${summonStats.creeperExplosions}`,
      );
    }
    if (firstSummon) {
      actorLines.push(
        `实体#${firstSummon.id}：${formatSummonKind(firstSummon.kind)} · ${firstSummon.lifecycle} · 位置 ${formatVec(firstSummon.position)} · 剩余 ${firstSummon.remainingSeconds?.toFixed(1) ?? "∞"} s`,
      );
    }
    if (barrelStats) {
      actorLines.push(
        `弹药桶：在场 ${barrelStats.active}/3 · 待爆 ${barrelStats.armed} · 预警 ${barrelStats.warning} · 哑火 ${barrelStats.dud} · 下次 ${barrelStats.spawnTimerPausedAtCap ? "已暂停" : `${barrelStats.spawnRemaining.toFixed(1)} s`}`,
        `弹药桶累计：生成 ${barrelStats.spawnedTotal} · 引爆 ${barrelStats.burstTotal} · 自毁 ${barrelStats.dudTotal} · 特殊弹 ${barrelStats.specialBulletsEmitted}`,
      );
    }
    if (firstBarrel) {
      actorLines.push(
        `桶#${firstBarrel.id}：${firstBarrel.state} · 位置 ${formatVec(firstBarrel.position)} · 剩余 ${firstBarrel.lifetimeRemaining.toFixed(1)} s · 充能 ${(firstBarrel.chargeProgress * 100).toFixed(0)}%`,
      );
    }
    this.actorDebugText?.setText(actorLines);
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

  private createDebugKeys(): DebugKeys | undefined {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return undefined;
    }

    return {
      phases: {
        1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
        2: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
        3: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
        4: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
        5: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      },
      reset: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      advanceLifecycle: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      recoil: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      hit: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H),
      cycleAttack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
      summonMachineGun: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M),
      summonHandgun: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      summonCreeper: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      clearSummons: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      laserBasic: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      laserUltimate: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U),
      laserCorner: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y),
      laserBasicCount: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      barrelSpawn: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N),
      barrelCharge: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V),
      barrelBurst: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      barrelExpire: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O),
      prototype: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };
  }

  private handleDebugKeys(): void {
    if (!this.debugKeys) {
      return;
    }

    for (const phaseId of DEMO_BOSS_PHASE_IDS) {
      if (Phaser.Input.Keyboard.JustDown(this.debugKeys.phases[phaseId])) {
        this.enterPhaseDirectly(phaseId);
        return;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.reset)) {
      this.resetCurrentPhase();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.advanceLifecycle)) {
      this.advanceLifecycle();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.recoil)) {
      this.bossActor?.triggerWeaponRecoil();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.hit)) {
      this.damageBoss();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.cycleAttack)) {
      this.phaseAttack?.debugAdvancePattern?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.summonMachineGun)) {
      this.debugSpawnSummon("rotating-machine-gun");
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.summonHandgun)) {
      this.debugSpawnSummon("old-handgun");
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.summonCreeper)) {
      this.debugSpawnSummon("creeper");
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.clearSummons)) {
      this.clearBattleProjectiles();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.laserBasic)) {
      this.phaseAttack?.debugTriggerBasic?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.laserUltimate)) {
      this.phaseAttack?.debugTriggerUltimate?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.laserCorner)) {
      this.phaseAttack?.debugToggleSweepStart?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.laserBasicCount)) {
      this.phaseAttack?.debugCycleBasicCount?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.barrelSpawn)) {
      this.debugSpawnBarrel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.barrelCharge)) {
      this.ammoBarrels?.forceChargeFirst();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.barrelBurst)) {
      this.ammoBarrels?.forceBurstFirst();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.barrelExpire)) {
      this.ammoBarrels?.forceExpireFirst();
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKeys.prototype)) {
      this.openPrototype();
    }
  }

  private registerCombatInput(): void {
    for (const key of INPUT_KEYS.parry) {
      this.input.keyboard?.on(`keydown-${key}`, this.onParryKeyDown);
      this.input.keyboard?.on(`keyup-${key}`, this.onParryKeyUp);
    }
    for (const key of INPUT_KEYS.skill) {
      this.input.keyboard?.on(`keydown-${key}`, this.onSkillKeyDown);
      this.input.keyboard?.on(`keyup-${key}`, this.onSkillKeyUp);
    }
    this.input.keyboard?.on("keydown-ENTER", this.onRestartKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-ENTER", this.onRestartKey);
      for (const key of INPUT_KEYS.parry) {
        this.input.keyboard?.off(`keydown-${key}`, this.onParryKeyDown);
        this.input.keyboard?.off(`keyup-${key}`, this.onParryKeyUp);
      }
      for (const key of INPUT_KEYS.skill) {
        this.input.keyboard?.off(`keydown-${key}`, this.onSkillKeyDown);
        this.input.keyboard?.off(`keyup-${key}`, this.onSkillKeyUp);
      }
    });
  }

  private handleLaserInteraction(beam: Readonly<DemoLaserBeam>): void {
    if (
      beam.attackId === this.lastLaserDamageAttackId ||
      !this.movement ||
      !this.playerDamage ||
      !this.playerAbility ||
      !this.playerParry
    ) {
      return;
    }
    const ability = this.playerAbility.getSnapshot();
    if (ability.ultimateInvulnerable) {
      return;
    }
    const damage = this.playerDamage.getSnapshot();
    if (
      !laserIntersectsCircle(beam, {
        center: this.movement.getPosition(),
        radius: damage.hitRadius,
      })
    ) {
      return;
    }
    const result = this.playerDamage.tryTakeDamage(1);
    if (result === "ignored") {
      return;
    }
    this.lastLaserDamageAttackId = beam.attackId;
    this.playerParry.interruptForDamage();
    this.playerAbility.cancelForDamage();
  }

  private handleSummonInteractions(
    explosions: readonly Readonly<DemoSummonExplosionEvent>[],
  ): void {
    if (
      !this.summons ||
      !this.movement ||
      !this.playerDamage ||
      !this.playerAbility ||
      !this.playerParry
    ) {
      return;
    }

    const playerPosition = this.movement.getPosition();
    let handgunId = this.summons.findPlayerOutlineHandgunCollision(
      playerPosition,
      PLAYER_RIG.pelvisSize.width / 2,
      PLAYER_RIG.pelvisSize.height / 2,
    );
    while (handgunId !== null) {
      if (!this.summons.destroyHandgun(handgunId)) {
        break;
      }
      handgunId = this.summons.findPlayerOutlineHandgunCollision(
        playerPosition,
        PLAYER_RIG.pelvisSize.width / 2,
        PLAYER_RIG.pelvisSize.height / 2,
      );
    }

    for (const explosion of explosions) {
      this.summons.destroyWeaponsInExplosion(
        explosion.position,
        explosion.radius,
      );
    }

    const ability = this.playerAbility.getSnapshot();
    if (ability.boosted || ability.ultimateInvulnerable) {
      return;
    }
    for (const explosion of explosions) {
      const damage = this.playerDamage.getSnapshot();
      const distance = Math.hypot(
        playerPosition.x - explosion.position.x,
        playerPosition.y - explosion.position.y,
      );
      if (distance > explosion.radius + damage.hitRadius) {
        continue;
      }
      const result = this.playerDamage.tryTakeDamage(explosion.damage);
      if (result !== "ignored") {
        this.playerParry.interruptForDamage();
        this.playerAbility.cancelForDamage();
      }
      if (result === "defeated") {
        break;
      }
    }
  }

  private handleBulletInteractions(): void {
    if (
      !this.playerDamage ||
      !this.playerAbility ||
      !this.movement ||
      !this.playerParry ||
      !this.bullets ||
      !this.rockets ||
      !this.bossActor ||
      !this.controller
    ) {
      return;
    }

    const playerPosition = this.movement.getPosition();
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
        if (
          !this.bullets.reflectAnyIncoming(
            incomingId,
            playerPosition,
            damageSnapshot.hitRadius,
          )
        ) {
          break;
        }
        incomingId = this.bullets.findIncomingPlayerCollision(
          playerPosition,
          damageSnapshot.hitRadius,
        );
      }
      let rocketId = this.rockets.findIncomingPlayerCollision(
        playerPosition,
        damageSnapshot.hitRadius,
      );
      while (rocketId !== null) {
        if (!this.rockets.reflect(rocketId, playerPosition, damageSnapshot.hitRadius)) {
          break;
        }
        rocketId = this.rockets.findIncomingPlayerCollision(
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
        if (
          !this.bullets.reflectNormal(
            normalId,
            playerPosition,
            damageSnapshot.hitRadius,
          )
        ) {
          break;
        }
        normalId = this.bullets.findIncomingNormalCollision(
          playerPosition,
          damageSnapshot.hitRadius,
        );
      }
    }

    let bossTargets = this.bossActor.getHitColliders();
    let handgunTargets = this.summons?.getHandgunColliders() ?? [];
    let targetHit = this.bullets.findReflectedColliderCollision([
      ...bossTargets,
      ...handgunTargets,
    ]);
    while (targetHit !== null) {
      this.bullets.consumeAsTargetHit(targetHit.bulletId);
      if (targetHit.targetIndex < bossTargets.length) {
        const result = this.applyBossDamage(1);
        if (result === "phase-defeated") {
          return;
        }
      } else {
        const handgun = handgunTargets[targetHit.targetIndex - bossTargets.length];
        if (handgun) {
          this.summons?.destroyHandgun(handgun.entityId);
        }
      }
      bossTargets = this.bossActor.getHitColliders();
      handgunTargets = this.summons?.getHandgunColliders() ?? [];
      targetHit = this.bullets.findReflectedColliderCollision([
        ...bossTargets,
        ...handgunTargets,
      ]);
    }

    let rocketTargetHit = this.rockets.findReflectedColliderCollision(
      this.bossActor.getHitColliders(),
    );
    while (rocketTargetHit !== null) {
      this.rockets.consumeAsExplosion(rocketTargetHit.rocketId, "boss");
      const result = this.applyBossDamage(this.rockets.getBossDamage());
      if (result === "phase-defeated") {
        return;
      }
      rocketTargetHit = this.rockets.findReflectedColliderCollision(
        this.bossActor.getHitColliders(),
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

    if (this.playerDamage.getSnapshot().defeated) {
      return;
    }

    let rocketPlayerHit = this.rockets.findIncomingPlayerCollision(
      playerPosition,
      this.playerDamage.getSnapshot().hitRadius,
    );
    while (rocketPlayerHit !== null) {
      const rocket = this.rockets
        .getSnapshots()
        .find((candidate) => candidate.id === rocketPlayerHit);
      const result = this.playerDamage.tryTakeDamage(rocket?.playerDamage ?? 2);
      this.rockets.consumeAsExplosion(rocketPlayerHit, "player");
      if (result !== "ignored") {
        this.playerParry.interruptForDamage();
        this.playerAbility.cancelForDamage();
      }
      if (result === "defeated") {
        break;
      }
      rocketPlayerHit = this.rockets.findIncomingPlayerCollision(
        playerPosition,
        this.playerDamage.getSnapshot().hitRadius,
      );
    }
  }

  private applyBossDamage(
    amount: number,
  ): ReturnType<DemoBossPhaseController["takeDamage"]> {
    const result = this.controller?.takeDamage(amount) ?? "ignored";
    if (result !== "ignored") {
      this.bossActor?.triggerHitFeedback();
    }
    if (result === "phase-defeated") {
      this.clearBattleProjectiles();
      this.beginImplementedDisarmTransition();
    }
    return result;
  }

  private handleAbilityEvents(events: Readonly<PlayerAbilityUpdateEvents>): void {
    if (events.ultimateStarted && this.bullets) {
      this.absorbedForUltimate = this.bullets.beginAbsorption(
        PLAYER_ABILITY.ultimateAbsorbSeconds,
      ).total +
        (this.rockets?.beginAbsorption(
          PLAYER_ABILITY.ultimateAbsorbSeconds,
        ) ?? 0);
    }

    if (
      events.volleyRequested &&
      this.ultimateVolley &&
      this.movement
    ) {
      this.bullets?.absorbAll();
      this.ultimateVolley.launch(
        this.movement.getPosition(),
        this.absorbedForUltimate,
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

  private consumeParryRequest(): boolean {
    const requested = this.parryRequested;
    this.parryRequested = false;
    return requested;
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

  private resetPlayerPosition(): void {
    this.movement = new PlayerMovementModel(
      PLAYER_MOVEMENT,
      PLAYER_RIG.initialPelvis,
    );
  }

  private readMovementInput(): PlayerMovementInput {
    if (!this.movementKeys) {
      return { x: 0, y: 0 };
    }

    return {
      x:
        Number(this.anyKeyActive(this.movementKeys.right)) -
        Number(this.anyKeyActive(this.movementKeys.left)),
      y:
        Number(this.anyKeyActive(this.movementKeys.down)) -
        Number(this.anyKeyActive(this.movementKeys.up)),
    };
  }

  private anyKeyActive(keys: Phaser.Input.Keyboard.Key[]): boolean {
    return keys.some((key) => key.isDown);
  }

  private createScrollingBackground(): void {
    this.backgroundModel = new DemoScrollingBackgroundModel(
      DEMO_BACKGROUND_CONFIG,
    );
    this.backgroundView = new DemoScrollingBackgroundView(
      this,
      DEMO_BACKGROUND_PRESENTATION,
    );
    this.backgroundView.render(this.backgroundModel.getSnapshot());
  }
}

function formatVec(vector: Readonly<{ x: number; y: number }>): string {
  return `${vector.x.toFixed(0)},${vector.y.toFixed(0)}`;
}

function formatSummonKind(kind: DemoSummonKind | null): string {
  if (kind === "rotating-machine-gun") {
    return "旋转机枪";
  }
  if (kind === "old-handgun") {
    return "破旧小手枪";
  }
  if (kind === "creeper") {
    return "苦力怕";
  }
  return "无";
}

function formatCorner(corner: "top" | "bottom" | null | undefined): string {
  if (corner === "top") {
    return "上";
  }
  if (corner === "bottom") {
    return "下";
  }
  return "—";
}

function formatTransitionState(
  state: DemoDisarmTransitionState,
  weaponLabel: string,
): string {
  if (state === "boss-throw") {
    return `Boss 抛出${weaponLabel}`;
  }
  if (state === "wait-pickup") {
    return "等待玩家拾取";
  }
  if (state === "player-fire") {
    return "玩家持械压制";
  }
  if (state === "player-discard") {
    return "玩家丢弃武器";
  }
  return "完成";
}

function formatTransitionPressure(
  weaponKind: string,
  pressure: number,
  requiredPressure: number,
): string {
  return weaponKind === "laser-gun"
    ? `${pressure.toFixed(1)}/${requiredPressure.toFixed(1)} 秒`
    : `${pressure}/${requiredPressure}`;
}
