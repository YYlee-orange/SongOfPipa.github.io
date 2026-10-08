import type { DemoBossPhaseId } from "../DemoBossPhaseController.ts";
import {
  DEMO_BOSS_PHASE1_ATTACK_CONFIG,
  DEMO_BOSS_PHASE2_ATTACK_CONFIG,
  DEMO_BOSS_PHASE3_ATTACK_CONFIG,
  DEMO_BOSS_PHASE4_ATTACK_CONFIG,
  DEMO_BOSS_PHASE5_ATTACK_CONFIG,
} from "../demoBossPhaseConfig.ts";
import type { DemoBossAttackModel } from "./DemoBossAttackModel.ts";
import { DemoBossPhase1AttackModel } from "./DemoBossPhase1AttackModel.ts";
import { DemoBossPhase2AttackModel } from "./DemoBossPhase2AttackModel.ts";
import { DemoBossPhase3AttackModel } from "./DemoBossPhase3AttackModel.ts";
import { DemoBossPhase4AttackModel } from "./DemoBossPhase4AttackModel.ts";
import { DemoBossPhase5AttackModel } from "./DemoBossPhase5AttackModel.ts";

/** 阶段差异只在此工厂装配，战斗场景只依赖统一攻击接口。 */
export function createDemoBossAttackModel(
  phaseId: DemoBossPhaseId,
): DemoBossAttackModel | null {
  if (phaseId === 1) {
    return new DemoBossPhase1AttackModel(DEMO_BOSS_PHASE1_ATTACK_CONFIG);
  }
  if (phaseId === 2) {
    return new DemoBossPhase2AttackModel(DEMO_BOSS_PHASE2_ATTACK_CONFIG);
  }
  if (phaseId === 3) {
    return new DemoBossPhase3AttackModel(DEMO_BOSS_PHASE3_ATTACK_CONFIG);
  }
  if (phaseId === 4) {
    return new DemoBossPhase4AttackModel(DEMO_BOSS_PHASE4_ATTACK_CONFIG);
  }
  if (phaseId === 5) {
    return new DemoBossPhase5AttackModel(DEMO_BOSS_PHASE5_ATTACK_CONFIG);
  }

  return null;
}
