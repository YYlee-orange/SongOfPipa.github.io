export const DEMO_BOSS_PHASE_IDS = [1, 2, 3, 4, 5] as const;

export type DemoBossPhaseId = (typeof DEMO_BOSS_PHASE_IDS)[number];
export type DemoBossPhaseLifecycle =
  | "active"
  | "transition-ready"
  | "transitioning"
  | "victory";

export type DemoBossTransitionResult = DemoBossPhaseId | "victory" | null;
export type DemoBossDamageResult = "damaged" | "phase-defeated" | "ignored";
export type DemoBossImplementationStatus =
  | "shared-actor"
  | "phase1-attack"
  | "phase2-attack"
  | "phase3-attack"
  | "phase4-attack"
  | "phase5-attack";

export function isDemoBossPhaseId(value: unknown): value is DemoBossPhaseId {
  return (
    typeof value === "number" &&
    DEMO_BOSS_PHASE_IDS.includes(value as DemoBossPhaseId)
  );
}

export interface DemoBossPhaseConfig {
  id: DemoBossPhaseId;
  label: string;
  role: string;
  weapon: string;
  maximumHealth: number;
  movementSpeed: number;
  randomSeed: number;
  parameterSource: string;
  implementationStatus: DemoBossImplementationStatus;
}

export interface DemoBossPhaseSnapshot {
  phaseId: DemoBossPhaseId;
  nextPhaseId: DemoBossPhaseId | null;
  label: string;
  role: string;
  weapon: string;
  lifecycle: DemoBossPhaseLifecycle;
  currentHealth: number;
  maximumHealth: number;
  movementSpeed: number;
  phaseElapsedSeconds: number;
  encounterElapsedSeconds: number;
  entrySequence: number;
  resetCount: number;
  randomSeed: number;
  parameterSource: string;
  implementationStatus: DemoBossImplementationStatus;
}

/**
 * Demo Boss 的单场景流程状态机。
 *
 * 这里只管理阶段身份、生命和转场生命周期；攻击机制和夺械演出由后续
 * 模块接入。所有正式数值均来自配置文件，运行时不提供数值编辑能力。
 */
export class DemoBossPhaseController {
  private readonly configs = new Map<DemoBossPhaseId, DemoBossPhaseConfig>();
  private activeConfig: DemoBossPhaseConfig;
  private lifecycle: DemoBossPhaseLifecycle = "active";
  private currentHealth = 1;
  private phaseElapsedSeconds = 0;
  private encounterElapsedSeconds = 0;
  private entrySequence = 0;
  private resetCount = 0;

  constructor(
    configs: readonly DemoBossPhaseConfig[],
    initialPhase: DemoBossPhaseId = 1,
  ) {
    for (const config of configs) {
      if (this.configs.has(config.id)) {
        throw new Error(`Duplicate Demo Boss phase config: ${config.id}`);
      }

      this.configs.set(config.id, config);
    }

    for (const phaseId of DEMO_BOSS_PHASE_IDS) {
      if (!this.configs.has(phaseId)) {
        throw new Error(`Missing Demo Boss phase config: ${phaseId}`);
      }
    }

    this.activeConfig = this.requireConfig(initialPhase);
    this.activatePhase(initialPhase);
  }

  /** 调试直达或战斗初始化使用；不会创建新场景。 */
  enterPhase(phaseId: DemoBossPhaseId): void {
    this.activatePhase(phaseId);
  }

  /** 仅重置当前阶段，保留整场战斗累计时间。 */
  resetCurrentPhase(): void {
    this.resetCount += 1;
    this.resetPhaseRuntime();
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds)) {
      return;
    }

    const safeDelta = Math.max(0, Math.min(deltaSeconds, 0.25));
    this.encounterElapsedSeconds += safeDelta;

    if (this.lifecycle !== "victory") {
      this.phaseElapsedSeconds += safeDelta;
    }
  }

  setCurrentHealth(value: number): void {
    if (
      !Number.isFinite(value) ||
      this.lifecycle === "transitioning" ||
      this.lifecycle === "victory"
    ) {
      return;
    }

    this.currentHealth = clamp(
      Math.round(value),
      0,
      this.activeConfig.maximumHealth,
    );

    if (this.currentHealth <= 0) {
      this.lifecycle = "transition-ready";
    } else if (this.lifecycle === "transition-ready") {
      this.lifecycle = "active";
    }
  }

  /** D3 各类玩家方攻击统一接入的阶段伤害入口。 */
  takeDamage(amount = 1): DemoBossDamageResult {
    if (
      this.lifecycle !== "active" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return "ignored";
    }

    this.setCurrentHealth(this.currentHealth - amount);
    return this.currentHealth <= 0
      ? "phase-defeated"
      : "damaged";
  }

  /** 调试用：模拟本阶段生命归零。 */
  forceTransitionReady(): boolean {
    if (this.lifecycle !== "active") {
      return false;
    }

    this.currentHealth = 0;
    this.lifecycle = "transition-ready";
    return true;
  }

  /** 后续 D4 演出开始时调用。 */
  beginTransition(): boolean {
    if (this.lifecycle !== "transition-ready") {
      return false;
    }

    this.lifecycle = "transitioning";
    return true;
  }

  /**
   * 后续 D4 夺械压制完成时调用。阶段 1～4 顺序装载下一阶段，阶段 5
   * 完成后进入整场胜利状态。
   */
  completeTransition(): DemoBossTransitionResult {
    if (this.lifecycle !== "transitioning") {
      return null;
    }

    const nextPhaseId = getNextPhaseId(this.activeConfig.id);

    if (nextPhaseId === null) {
      this.lifecycle = "victory";
      return "victory";
    }

    this.activatePhase(nextPhaseId);
    return nextPhaseId;
  }

  getPhaseConfigs(): readonly Readonly<DemoBossPhaseConfig>[] {
    return DEMO_BOSS_PHASE_IDS.map((phaseId) => this.requireConfig(phaseId));
  }

  getSnapshot(): Readonly<DemoBossPhaseSnapshot> {
    return {
      phaseId: this.activeConfig.id,
      nextPhaseId: getNextPhaseId(this.activeConfig.id),
      label: this.activeConfig.label,
      role: this.activeConfig.role,
      weapon: this.activeConfig.weapon,
      lifecycle: this.lifecycle,
      currentHealth: this.currentHealth,
      maximumHealth: this.activeConfig.maximumHealth,
      movementSpeed: this.activeConfig.movementSpeed,
      phaseElapsedSeconds: this.phaseElapsedSeconds,
      encounterElapsedSeconds: this.encounterElapsedSeconds,
      entrySequence: this.entrySequence,
      resetCount: this.resetCount,
      randomSeed: this.activeConfig.randomSeed,
      parameterSource: this.activeConfig.parameterSource,
      implementationStatus: this.activeConfig.implementationStatus,
    };
  }

  private activatePhase(phaseId: DemoBossPhaseId): void {
    this.activeConfig = this.requireConfig(phaseId);
    this.entrySequence += 1;
    this.resetCount = 0;
    this.resetPhaseRuntime();
  }

  private resetPhaseRuntime(): void {
    this.currentHealth = this.activeConfig.maximumHealth;
    this.lifecycle = "active";
    this.phaseElapsedSeconds = 0;
  }

  private requireConfig(phaseId: DemoBossPhaseId): DemoBossPhaseConfig {
    const config = this.configs.get(phaseId);

    if (!config) {
      throw new Error(`Unknown Demo Boss phase: ${phaseId}`);
    }

    return config;
  }
}

function getNextPhaseId(phaseId: DemoBossPhaseId): DemoBossPhaseId | null {
  const currentIndex = DEMO_BOSS_PHASE_IDS.indexOf(phaseId);
  return DEMO_BOSS_PHASE_IDS[currentIndex + 1] ?? null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
