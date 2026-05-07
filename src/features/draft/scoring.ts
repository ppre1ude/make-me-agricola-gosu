import type {
  CardStatRow,
  CardStrategyProfile,
  ConfidenceLevel,
  DraftDataIndex,
  DraftDataSet,
  DraftPickPhase,
  DraftRecommendation,
  DraftScoringInput,
  ExplanationDepth,
  ReturnLikelihood,
  ScoreComponents
} from "./contract.ts";

const PHASE_WEIGHTS: Record<DraftPickPhase, ScoreComponents> = {
  early_anchor: {
    statStrength: 2.2,
    brokenOrAnchor: 3.0,
    roleCoverage: 1.0,
    synergy: 0.7,
    returnUrgency: 1.3,
    phaseFit: 0.8,
    confidence: 0.4,
    saturationPenalty: 1.1,
    riskPenalty: 0.8
  },
  middle_direction: {
    statStrength: 1.5,
    brokenOrAnchor: 1.6,
    roleCoverage: 2.0,
    synergy: 1.5,
    returnUrgency: 0.9,
    phaseFit: 1.0,
    confidence: 0.4,
    saturationPenalty: 2.0,
    riskPenalty: 1.1
  },
  late_completion: {
    statStrength: 1.0,
    brokenOrAnchor: 0.8,
    roleCoverage: 2.2,
    synergy: 1.2,
    returnUrgency: 0.5,
    phaseFit: 1.4,
    confidence: 0.4,
    saturationPenalty: 2.4,
    riskPenalty: 1.5
  }
};

const CONFIDENCE_SCORE: Record<ConfidenceLevel, number> = {
  manual_verified: 10,
  official_verified: 10,
  bga_verified: 9,
  stat_inferred: 7,
  text_inferred: 6,
  community_inferred: 5,
  unverified: 2
};

type HandContext = {
  pickedCardIds: Set<string>;
  pickedProfiles: CardStrategyProfile[];
  solvedRoles: Set<string>;
  neededRoles: Map<string, number>;
  saturationTargets: Set<string>;
};

export function buildDraftDataIndex(data: DraftDataSet): DraftDataIndex {
  return {
    cardsById: indexById(data.cards),
    profilesByCardId: indexByString(data.strategyProfiles, "cardId"),
    statsByCardId: indexByString(data.stats, "cardId"),
    translationsByCardId: indexByString(data.translations, "cardId"),
    rolesById: indexById(data.strategyRoles)
  };
}

export function rankDraftOptions(session: DraftScoringInput, dataIndex: DraftDataIndex): DraftRecommendation[] {
  const phase = getPickPhase(session.pickNumber);
  const handContext = buildHandContext(session.pickedCardIds, dataIndex);

  return session.offeredCardIds
    .map((cardId) => scoreCard(cardId, session, dataIndex, handContext, phase))
    .sort((a, b) => b.score - a.score)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1
    }));
}

export function getPickPhase(pickNumber: number): DraftPickPhase {
  if (pickNumber <= 2) return "early_anchor";
  if (pickNumber <= 4) return "middle_direction";
  return "late_completion";
}

function scoreCard(
  cardId: string,
  session: DraftScoringInput,
  dataIndex: DraftDataIndex,
  handContext: HandContext,
  phase: DraftPickPhase
): DraftRecommendation {
  const profile = dataIndex.profilesByCardId.get(cardId);
  const stat = dataIndex.statsByCardId.get(cardId);
  const weights = PHASE_WEIGHTS[phase];
  const components: ScoreComponents = {
    statStrength: computeStatStrength(stat),
    brokenOrAnchor: computeBrokenOrAnchor(profile),
    roleCoverage: computeRoleCoverage(profile, handContext),
    synergy: computeSynergy(cardId, profile, handContext),
    returnUrgency: computeReturnUrgency(stat, session.pickNumber),
    phaseFit: computePhaseFit(profile, phase),
    confidence: computeConfidence(profile, stat),
    saturationPenalty: computeSaturationPenalty(cardId, profile, handContext),
    riskPenalty: computeRiskPenalty(profile, stat, handContext)
  };

  const score =
    components.statStrength * weights.statStrength +
    components.brokenOrAnchor * weights.brokenOrAnchor +
    components.roleCoverage * weights.roleCoverage +
    components.synergy * weights.synergy +
    components.returnUrgency * weights.returnUrgency +
    components.phaseFit * weights.phaseFit +
    components.confidence * weights.confidence -
    components.saturationPenalty * weights.saturationPenalty -
    components.riskPenalty * weights.riskPenalty;

  return {
    cardId,
    rank: 0,
    score: round(score),
    phase,
    components: roundComponents(components),
    returnLikelihood: estimateReturnLikelihood(stat, session.pickNumber),
    reasons: buildReasons(cardId, profile, stat, components, handContext, dataIndex),
    risks: buildRisks(profile, components),
    nextPickDirection: buildNextPickDirection(profile, handContext)
  };
}

function buildHandContext(pickedCardIds: string[], dataIndex: DraftDataIndex): HandContext {
  const pickedProfiles = pickedCardIds
    .map((cardId) => dataIndex.profilesByCardId.get(cardId))
    .filter((profile): profile is CardStrategyProfile => profile !== undefined);
  const solvedRoles = new Set<string>();
  const neededRoles = new Map<string, number>();
  const saturationTargets = new Set<string>();

  for (const profile of pickedProfiles) {
    for (const role of profile.solves) solvedRoles.add(role);
    for (const target of profile.saturationPenaltyTo) saturationTargets.add(target);
  }

  for (const profile of pickedProfiles) {
    for (const role of profile.increasesNeedFor) {
      if (!solvedRoles.has(role)) {
        neededRoles.set(role, (neededRoles.get(role) ?? 0) + 1);
      }
    }
  }

  return {
    pickedCardIds: new Set(pickedCardIds),
    pickedProfiles,
    solvedRoles,
    neededRoles,
    saturationTargets
  };
}

function computeStatStrength(stat: CardStatRow | undefined): number {
  if (!stat) return 3;

  const wtdPwr = normalize(stat.wtdPwr, 0, 8);
  const pwr = normalize(stat.pwr, -2, 6);
  const adpStrength = 10 - normalize(stat.adp, 1, 7);
  return clamp(wtdPwr * 0.55 + pwr * 0.25 + adpStrength * 0.2, 0, 10);
}

function computeBrokenOrAnchor(profile: CardStrategyProfile | undefined): number {
  if (!profile) return 0;
  if (profile.isBroken) return 10;
  if (profile.isPlanAnchor) return 8;
  if (profile.roles.includes("plan_anchor")) return 7;
  return 0;
}

function computeRoleCoverage(profile: CardStrategyProfile | undefined, handContext: HandContext): number {
  if (!profile) return 0;
  let score = 0;

  for (const role of profile.solves) {
    if (handContext.solvedRoles.has(role)) continue;
    score += handContext.neededRoles.has(role) ? 4 : 2;
  }

  for (const role of profile.roles) {
    if (handContext.solvedRoles.has(role)) continue;
    score += handContext.neededRoles.has(role) ? 1.5 : 0.75;
  }

  return clamp(score, 0, 10);
}

function computeSynergy(cardId: string, profile: CardStrategyProfile | undefined, handContext: HandContext): number {
  if (!profile) return 0;
  let score = 0;

  for (const pickedCardId of handContext.pickedCardIds) {
    if (profile.synergyWith.includes(pickedCardId)) score += 3;
  }

  for (const pickedProfile of handContext.pickedProfiles) {
    if (pickedProfile.synergyWith.includes(cardId)) score += 2;
  }

  for (const role of profile.roles) {
    if (handContext.neededRoles.has(role)) score += 2;
  }

  for (const role of profile.solves) {
    if (handContext.neededRoles.has(role)) score += 2;
  }

  return clamp(score, 0, 10);
}

function computeReturnUrgency(stat: CardStatRow | undefined, pickNumber: number): number {
  const likelihood = estimateReturnLikelihood(stat, pickNumber);
  if (likelihood === "unlikely") return 10;
  if (likelihood === "possible") return 6;
  if (likelihood === "likely") return 2;
  return 4;
}

function estimateReturnLikelihood(stat: CardStatRow | undefined, pickNumber: number): ReturnLikelihood {
  if (typeof stat?.adp !== "number") return "unknown";

  const pickPressure = Math.max(0, 4 - pickNumber) * 0.25;
  const adjustedAdp = stat.adp - pickPressure;

  if (adjustedAdp <= 2.2) return "unlikely";
  if (adjustedAdp <= 4.2) return "possible";
  return "likely";
}

function computePhaseFit(profile: CardStrategyProfile | undefined, phase: DraftPickPhase): number {
  const timingWindow = profile?.timingWindow ?? "anytime";
  if (timingWindow === "anytime") return 8;

  if (phase === "early_anchor") {
    if (timingWindow === "early") return 10;
    if (timingWindow === "mid") return 6;
    return 2;
  }

  if (phase === "middle_direction") {
    if (timingWindow === "mid") return 10;
    if (timingWindow === "early") return 8;
    return 6;
  }

  if (timingWindow === "late") return 10;
  if (timingWindow === "mid") return 8;
  return 5;
}

function computeConfidence(profile: CardStrategyProfile | undefined, stat: CardStatRow | undefined): number {
  const profileConfidence = profile ? CONFIDENCE_SCORE[profile.confidence] : 2;
  if (!stat) return profileConfidence * 0.7;

  const sampleScore = (stat.deals ?? 0) >= 500 && (stat.plays ?? 0) >= 100 ? 10 : 6;
  return clamp(profileConfidence * 0.7 + sampleScore * 0.3, 0, 10);
}

function computeSaturationPenalty(
  cardId: string,
  profile: CardStrategyProfile | undefined,
  handContext: HandContext
): number {
  if (!profile) return 0;
  let penalty = 0;

  if (handContext.saturationTargets.has(cardId)) penalty += 5;

  for (const role of [...profile.roles, ...profile.solves]) {
    if (handContext.solvedRoles.has(role)) penalty += 3;
    if (handContext.saturationTargets.has(role)) penalty += 3;
  }

  if (profile.isBroken) penalty *= 0.5;
  return clamp(penalty, 0, 10);
}

function computeRiskPenalty(
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  handContext: HandContext
): number {
  if (!profile) return 2;

  let penalty = profile.riskTags.length * 1.5;

  if (profile.riskTags.includes("low_early_impact")) penalty += 1;
  if (profile.riskTags.includes("redundant_if_field_access_solved") && handContext.solvedRoles.has("field_engine")) {
    penalty += 2;
  }

  if (stat?.drafted && stat.plays && stat.plays / stat.drafted < 0.55) {
    penalty += 2;
  }

  return clamp(penalty, 0, 10);
}

function buildReasons(
  cardId: string,
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  components: ScoreComponents,
  handContext: HandContext,
  dataIndex: DraftDataIndex
): Record<ExplanationDepth, string[]> {
  const name = getCardName(cardId, dataIndex);
  const compact: string[] = [];
  const standard: string[] = [];
  const deep: string[] = [];

  if (profile?.isBroken || profile?.isPlanAnchor) {
    compact.push(`${name}: 초반 플랜 앵커로 우선도가 높습니다.`);
    standard.push("초반에는 강한 플랜 앵커가 이후 픽 방향을 정해주므로 높은 점수를 받습니다.");
  }

  const solvedNow = (profile?.solves ?? []).filter((role) => !handContext.solvedRoles.has(role));
  if (solvedNow.length > 0) {
    standard.push(`아직 해결되지 않은 역할을 채웁니다: ${solvedNow.join(", ")}.`);
  }

  const neededNow = (profile?.solves ?? []).filter((role) => handContext.neededRoles.has(role));
  if (neededNow.length > 0) {
    standard.push(`현재 손패가 추가로 요구하는 역할과 맞습니다: ${neededNow.join(", ")}.`);
  }

  if (components.saturationPenalty >= 5) {
    standard.push("이미 해결한 역할과 겹쳐 포화도 감점이 적용됩니다.");
  }

  if (components.returnUrgency >= 8) {
    standard.push("ADP 기준으로 다시 돌아올 가능성이 낮아 지금 집을 압력이 있습니다.");
  }

  deep.push(`score components: ${JSON.stringify(roundComponents(components))}`);
  if (stat) {
    deep.push(`stats: WtdPWR ${stat.wtdPwr}, PWR ${stat.pwr}, ADP ${stat.adp}, APR ${stat.apr}.`);
  }
  if ((profile?.nextPickGuidance?.["ko-KR"] ?? []).length > 0) {
    deep.push(`다음 픽 방향: ${profile?.nextPickGuidance?.["ko-KR"]?.join(", ")}.`);
  }

  return {
    compact: compact.length > 0 ? compact : [`${name}: 현재 손패 기준으로 평가했습니다.`],
    standard: standard.length > 0 ? standard : ["통계, 역할 보완, 리스크를 함께 반영했습니다."],
    deep
  };
}

function buildRisks(profile: CardStrategyProfile | undefined, components: ScoreComponents): string[] {
  const risks = [...(profile?.riskTags ?? [])];
  if (components.saturationPenalty >= 5) risks.push("role_saturation");
  if (components.riskPenalty >= 5) risks.push("high_risk_penalty");
  return [...new Set(risks)];
}

function buildNextPickDirection(profile: CardStrategyProfile | undefined, handContext: HandContext): string[] {
  const direct = profile?.nextPickGuidance?.["ko-KR"] ?? [];
  const needs = [...handContext.neededRoles.keys()];
  return [...new Set([...direct, ...needs])];
}

function getCardName(cardId: string, dataIndex: DraftDataIndex): string {
  return dataIndex.translationsByCardId.get(cardId)?.name ?? cardId;
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return indexByString(items, "id");
}

function indexByString<T extends object>(items: T[], key: keyof T): Map<string, T> {
  const entries = items.map((item): [string, T] => [String(item[key]), item]);
  return new Map(entries);
}

function normalize(value: number | undefined, min: number, max: number): number {
  if (typeof value !== "number") return 0;
  return clamp(((value - min) / (max - min)) * 10, 0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundComponents(components: ScoreComponents): ScoreComponents {
  return {
    statStrength: round(components.statStrength),
    brokenOrAnchor: round(components.brokenOrAnchor),
    roleCoverage: round(components.roleCoverage),
    synergy: round(components.synergy),
    returnUrgency: round(components.returnUrgency),
    phaseFit: round(components.phaseFit),
    confidence: round(components.confidence),
    saturationPenalty: round(components.saturationPenalty),
    riskPenalty: round(components.riskPenalty)
  };
}
