import {
  isDemoBossPhaseId,
  type DemoBossPhaseId,
} from "./boss/DemoBossPhaseController.ts";

export const DEMO_QUERY_PARAMETER = "demo";
export const DEMO_DEBUG_QUERY_PARAMETER = "demoDebug";
export const DEMO_PHASE_QUERY_PARAMETER = "demoPhase";
export const LEGACY_DEMO_EDITOR_QUERY_PARAMETER = "demoEditor";
export const PROTOTYPE_QUERY_PARAMETER = "prototype";

export type DemoStartupTarget =
  | { scene: "PrototypeScene" }
  | {
      scene: "DemoBattleScene";
      phaseId: DemoBossPhaseId;
      debugEnabled: boolean;
    };

/**
 * Demo 始终进入同一个战斗场景。URL 只选择初始状态及是否显示调试覆盖层，
 * 不再映射到五个独立场景。
 */
export function readDemoStartupTarget(search: string): DemoStartupTarget {
  const parameters = new URLSearchParams(search);
  if (isEnabled(parameters.get(PROTOTYPE_QUERY_PARAMETER))) {
    return { scene: "PrototypeScene" };
  }
  const phaseValue = parameters.get(DEMO_PHASE_QUERY_PARAMETER);
  const parsedPhase = phaseValue === null ? Number.NaN : Number(phaseValue);

  if (isDemoBossPhaseId(parsedPhase)) {
    return {
      scene: "DemoBattleScene",
      phaseId: parsedPhase,
      debugEnabled: true,
    };
  }

  if (
    isEnabled(parameters.get(DEMO_DEBUG_QUERY_PARAMETER)) ||
    isEnabled(parameters.get(LEGACY_DEMO_EDITOR_QUERY_PARAMETER))
  ) {
    return {
      scene: "DemoBattleScene",
      phaseId: 1,
      debugEnabled: true,
    };
  }

  return {
    scene: "DemoBattleScene",
    phaseId: 1,
    debugEnabled: false,
  };
}

export function replaceWithDemoBattleRoute(): void {
  replaceSearch(`?${DEMO_QUERY_PARAMETER}=1`);
}

export function replaceWithDemoDebugRoute(): void {
  replaceSearch(`?${DEMO_DEBUG_QUERY_PARAMETER}=1`);
}

export function replaceWithDemoPhaseRoute(phaseId: DemoBossPhaseId): void {
  replaceSearch(`?${DEMO_PHASE_QUERY_PARAMETER}=${phaseId}`);
}

export function replaceWithPrototypeRoute(): void {
  replaceSearch(`?${PROTOTYPE_QUERY_PARAMETER}=1`);
}

function isEnabled(value: string | null): boolean {
  return value === "1" || value === "true";
}

function replaceSearch(search: string): void {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${search}${window.location.hash}`,
  );
}
