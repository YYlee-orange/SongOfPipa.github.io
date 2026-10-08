import type { PrototypeBulletType } from "../../../entities/bullet/PrototypeBulletModel.ts";
import type { Vec2 } from "../../../entities/playerRig/PlayerRigModel.ts";
import type { DemoSummonKind } from "../../summons/DemoSummonModel.ts";

export interface DemoBossAttackContext {
  bossPosition?: Vec2;
  muzzlePosition: Vec2;
  playerPosition: Vec2;
  allowFiring: boolean;
  activeOldHandguns?: number;
}

export interface DemoBossAttackShot {
  projectileKind: "bullet" | "rocket" | "summon";
  summonKind?: DemoSummonKind;
  type: PrototypeBulletType;
  origin: Vec2;
  target: Vec2;
  speed: number;
  recoilImpulse: boolean;
}

export interface DemoBossAttackSnapshot {
  kind: string;
  attackLabel: string;
  weaponLabel: string;
  stateLabel: string;
  pauseBossMovement: boolean;
  fireRemaining: number;
  shotsFired: number;
  specialShotsFired: number;
  burstSize: number | null;
  shotsRemainingInBurst: number | null;
  burstsCompleted: number;
  modeAttackCount: number | null;
  attacksBeforeSwitchCheck: number | null;
  switchChecks: number;
  weaponSwitches: number;
  lastSwitchResult: "switched" | "stayed" | null;
  summonsIssued: number;
  lastSummonKind: DemoSummonKind | null;
  tutorialMessage: string;
  bossMovementMode?: "wander" | "paused" | "track-player-y" | "center-y";
  laserMode?: "basic" | "ultimate";
  laserState?: string;
  laserActive?: boolean;
  laserAttackId?: number;
  laserAngle?: number;
  lockedLaserY?: number | null;
  sweepStartCorner?: "top" | "bottom" | null;
  safeCorner?: "top" | "bottom" | null;
  sweepProgress?: number;
  consecutiveBasicAttacks?: number;
  basicAttacksFired?: number;
  ultimateAttacksFired?: number;
}

export interface DemoBossAttackModel {
  update(
    deltaSeconds: number,
    context: Readonly<DemoBossAttackContext>,
  ): readonly Readonly<DemoBossAttackShot>[];
  getSnapshot(): Readonly<DemoBossAttackSnapshot>;
  debugAdvancePattern?(): boolean;
  debugTriggerBasic?(): boolean;
  debugTriggerUltimate?(): boolean;
  debugToggleSweepStart?(): boolean;
  debugCycleBasicCount?(): boolean;
}
