import { SeededRandom } from "../../../systems/SeededRandom.ts";
import {
  DEMO_SUMMON_KINDS,
  type DemoSummonKind,
} from "../../summons/DemoSummonModel.ts";
import type {
  DemoBossAttackContext,
  DemoBossAttackModel,
  DemoBossAttackShot,
  DemoBossAttackSnapshot,
} from "./DemoBossAttackModel.ts";

export interface DemoBossPhase4AttackConfig {
  initialSummonDelaySeconds: number;
  summonIntervalSeconds: number;
  maximumOldHandguns: number;
  randomSeed: number;
}

/** 第四阶段召唤调度：首次三选一，后续不得与上次重复。 */
export class DemoBossPhase4AttackModel implements DemoBossAttackModel {
  private readonly config: DemoBossPhase4AttackConfig;
  private readonly random: SeededRandom;
  private summonRemaining: number;
  private summonsIssued = 0;
  private lastSummonKind: DemoSummonKind | null = null;

  constructor(config: DemoBossPhase4AttackConfig) {
    this.config = config;
    this.random = new SeededRandom(config.randomSeed);
    this.summonRemaining = Math.max(0, config.initialSummonDelaySeconds);
  }

  update(
    deltaSeconds: number,
    context: Readonly<DemoBossAttackContext>,
  ): readonly Readonly<DemoBossAttackShot>[] {
    const safeDelta = Number.isFinite(deltaSeconds)
      ? Math.max(0, Math.min(deltaSeconds, 0.25))
      : 0;
    if (!context.allowFiring) {
      return [];
    }

    this.summonRemaining -= safeDelta;
    const events: DemoBossAttackShot[] = [];
    const interval = Math.max(0.05, this.config.summonIntervalSeconds);
    while (this.summonRemaining <= 0.0000001) {
      const kind = this.drawSummonKind(context.activeOldHandguns ?? 0);
      events.push({
        projectileKind: "summon",
        summonKind: kind,
        type: "normal",
        origin: { ...context.muzzlePosition },
        target: { ...context.playerPosition },
        speed: 0,
        recoilImpulse: true,
      });
      this.lastSummonKind = kind;
      this.summonsIssued += 1;
      this.summonRemaining += interval;
    }
    return events;
  }

  getSnapshot(): Readonly<DemoBossAttackSnapshot> {
    return {
      kind: "phase4-summoner",
      attackLabel: "三类召唤物",
      weaponLabel: "召唤器",
      stateLabel: "等待召唤",
      pauseBossMovement: false,
      fireRemaining: Math.max(0, this.summonRemaining),
      shotsFired: 0,
      specialShotsFired: 0,
      burstSize: null,
      shotsRemainingInBurst: null,
      burstsCompleted: 0,
      modeAttackCount: null,
      attacksBeforeSwitchCheck: null,
      switchChecks: 0,
      weaponSwitches: 0,
      lastSwitchResult: null,
      summonsIssued: this.summonsIssued,
      lastSummonKind: this.lastSummonKind,
      tutorialMessage: "",
    };
  }

  private drawSummonKind(activeOldHandguns: number): DemoSummonKind {
    const candidates = DEMO_SUMMON_KINDS.filter((kind) => {
      if (kind === this.lastSummonKind) {
        return false;
      }
      return !(
        kind === "old-handgun" &&
        activeOldHandguns >= this.config.maximumOldHandguns
      );
    });
    const fallback = DEMO_SUMMON_KINDS.filter(
      (kind) =>
        kind !== "old-handgun" ||
        activeOldHandguns < this.config.maximumOldHandguns,
    );
    const pool = candidates.length > 0 ? candidates : fallback;
    const index = Math.min(
      pool.length - 1,
      Math.floor(this.random.next() * pool.length),
    );
    return pool[Math.max(0, index)] ?? "creeper";
  }
}
