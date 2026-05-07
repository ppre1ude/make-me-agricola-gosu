import type {
  CardStatRow,
  CardStrategyProfile,
  ConfidenceLevel,
  DraftCandidateGroup,
  DraftDataIndex,
  DraftDataSet,
  DraftEvaluationMeta,
  DraftPickBand,
  DraftRecommendation,
  DraftScoringInput,
  DraftTrackingSignal,
  DraftWarning,
  ExplanationDepth,
  ReturnLikelihood,
  ScoreComponents
} from "./contract.ts";

const DRAFT_PICK_BAND_WEIGHTS: Record<DraftPickBand, ScoreComponents> = {
  early_anchor: {
    statStrength: 2.2,
    brokenOrAnchor: 3.0,
    roleCoverage: 1.0,
    synergy: 0.7,
    returnUrgency: 1.3,
    draftPickBandFit: 0.8,
    passRegret: 1.7,
    pivotPotential: 1.1,
    conflictCost: 0.8,
    roleAvailabilityPressure: 0.4,
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
    draftPickBandFit: 1.0,
    passRegret: 1.4,
    pivotPotential: 0.9,
    conflictCost: 1.3,
    roleAvailabilityPressure: 0.7,
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
    draftPickBandFit: 1.4,
    passRegret: 0.7,
    pivotPotential: 0.3,
    conflictCost: 1.1,
    roleAvailabilityPressure: 0.9,
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
  missingRolePressure: Map<string, number>;
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

export function rankDraftOptions(input: DraftScoringInput, dataIndex: DraftDataIndex): DraftRecommendation[] {
  const draftPickBand = getDraftPickBand(input.pickNumber);
  const handContext = buildHandContext(input, dataIndex);

  return input.offeredCardIds
    .map((cardId) => scoreCard(cardId, input, dataIndex, handContext, draftPickBand))
    .sort((a, b) => b.score - a.score)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
      candidateGroups:
        index === 0 && recommendation.candidateGroups.length === 0
          ? [recommendation.evaluationMeta.method === "fallback_basic" ? "fallback_filler_candidate" : "general_value_candidate"]
          : recommendation.candidateGroups
    }));
}

export function getDraftPickBand(pickNumber: number): DraftPickBand {
  if (pickNumber <= 2) return "early_anchor";
  if (pickNumber <= 4) return "middle_direction";
  return "late_completion";
}

function scoreCard(
  cardId: string,
  input: DraftScoringInput,
  dataIndex: DraftDataIndex,
  handContext: HandContext,
  draftPickBand: DraftPickBand
): DraftRecommendation {
  const profile = dataIndex.profilesByCardId.get(cardId);
  const stat = dataIndex.statsByCardId.get(cardId);
  const weights = DRAFT_PICK_BAND_WEIGHTS[draftPickBand];
  const components: ScoreComponents = {
    statStrength: computeStatStrength(stat),
    brokenOrAnchor: computeBrokenOrAnchor(profile),
    roleCoverage: computeRoleCoverage(profile, handContext),
    synergy: computeSynergy(cardId, profile, handContext),
    returnUrgency: computeReturnUrgency(stat, input.pickNumber),
    draftPickBandFit: computeDraftPickBandFit(profile, draftPickBand),
    passRegret: computePassRegret(profile, stat, input.pickNumber),
    pivotPotential: computePivotPotential(profile, stat, handContext),
    conflictCost: computeConflictCost(cardId, profile, handContext),
    roleAvailabilityPressure: computeRoleAvailabilityPressure(profile, handContext),
    confidence: computeConfidence(profile, stat),
    saturationPenalty: computeSaturationPenalty(cardId, profile, handContext),
    riskPenalty: computeRiskPenalty(profile, stat, handContext)
  };
  const evaluationMeta = buildEvaluationMeta(profile, stat, dataIndex, cardId);
  const trackingSignals = buildTrackingSignals(profile, handContext);

  const score =
    components.statStrength * weights.statStrength +
    components.brokenOrAnchor * weights.brokenOrAnchor +
    components.roleCoverage * weights.roleCoverage +
    components.synergy * weights.synergy +
    components.returnUrgency * weights.returnUrgency +
    components.draftPickBandFit * weights.draftPickBandFit +
    components.passRegret * weights.passRegret +
    components.pivotPotential * weights.pivotPotential +
    components.roleAvailabilityPressure * weights.roleAvailabilityPressure +
    components.confidence * weights.confidence -
    components.saturationPenalty * weights.saturationPenalty -
    components.riskPenalty * weights.riskPenalty -
    components.conflictCost * weights.conflictCost;

  return {
    cardId,
    rank: 0,
    score: round(score),
    draftPickBand,
    candidateGroups: buildCandidateGroups(profile, stat, components),
    components: roundComponents(components),
    returnLikelihood: estimateReturnLikelihood(stat, input.pickNumber),
    evaluationMeta,
    reasons: buildReasons(cardId, profile, stat, components, handContext, dataIndex),
    risks: buildRisks(profile, components),
    warnings: buildWarnings(evaluationMeta),
    nextPickDirection: buildNextPickDirection(profile, handContext),
    trackingSignals,
    planShiftHints: buildPlanShiftHints(cardId, profile, components, input.pickNumber)
  };
}

function buildHandContext(input: DraftScoringInput, dataIndex: DraftDataIndex): HandContext {
  const pickedProfiles = input.pickedCardIds
    .map((cardId) => dataIndex.profilesByCardId.get(cardId))
    .filter((profile): profile is CardStrategyProfile => profile !== undefined);
  const solvedRoles = new Set<string>();
  const neededRoles = new Map<string, number>();
  const saturationTargets = new Set<string>();
  const missingRolePressure = new Map<string, number>();

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

  if (input.trackingMode === "full_pack") {
    for (const cardId of input.missingFromPreviousPack ?? []) {
      const profile = dataIndex.profilesByCardId.get(cardId);
      for (const role of profile?.roles ?? []) {
        missingRolePressure.set(role, (missingRolePressure.get(role) ?? 0) + 1);
      }
      for (const role of profile?.solves ?? []) {
        missingRolePressure.set(role, (missingRolePressure.get(role) ?? 0) + 1);
      }
    }
  }

  return {
    pickedCardIds: new Set(input.pickedCardIds),
    pickedProfiles,
    solvedRoles,
    neededRoles,
    saturationTargets,
    missingRolePressure
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

function computeDraftPickBandFit(profile: CardStrategyProfile | undefined, draftPickBand: DraftPickBand): number {
  const timingWindow = profile?.timingWindow ?? "anytime";
  if (timingWindow === "anytime") return 8;

  if (draftPickBand === "early_anchor") {
    if (timingWindow === "early") return 10;
    if (timingWindow === "mid") return 6;
    return 2;
  }

  if (draftPickBand === "middle_direction") {
    if (timingWindow === "mid") return 10;
    if (timingWindow === "early") return 8;
    return 6;
  }

  if (timingWindow === "late") return 10;
  if (timingWindow === "mid") return 8;
  return 5;
}

function computePassRegret(
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  pickNumber: number
): number {
  const broadStrength = computeStatStrength(stat);
  const scarcity = computeReturnUrgency(stat, pickNumber);
  const anchor = computeBrokenOrAnchor(profile);
  return clamp(broadStrength * 0.45 + scarcity * 0.35 + anchor * 0.2, 0, 10);
}

function computePivotPotential(
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  handContext: HandContext
): number {
  if (!profile) return 0;

  const anchor = computeBrokenOrAnchor(profile);
  const broadStrength = computeStatStrength(stat);
  const conflict = computeConflictCost(profile.cardId, profile, handContext);
  return clamp(anchor * 0.55 + broadStrength * 0.35 - conflict * 0.25, 0, 10);
}

function computeConflictCost(
  cardId: string,
  profile: CardStrategyProfile | undefined,
  handContext: HandContext
): number {
  if (!profile) return 0;
  let cost = 0;

  for (const pickedCardId of handContext.pickedCardIds) {
    if (profile.conflictsWith.includes(pickedCardId)) cost += 4;
  }

  for (const pickedProfile of handContext.pickedProfiles) {
    if (pickedProfile.conflictsWith.includes(cardId)) cost += 3;
  }

  return clamp(cost, 0, 10);
}

function computeRoleAvailabilityPressure(
  profile: CardStrategyProfile | undefined,
  handContext: HandContext
): number {
  if (!profile) return 0;
  let pressure = 0;

  for (const role of [...profile.roles, ...profile.solves]) {
    pressure += handContext.missingRolePressure.get(role) ?? 0;
  }

  return clamp(pressure * 2, 0, 10);
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

function buildCandidateGroups(
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  components: ScoreComponents
): DraftCandidateGroup[] {
  const groups: DraftCandidateGroup[] = [];

  if (profile?.isBroken) groups.push("broken_candidate");
  if (components.statStrength >= 7) groups.push("premium_candidate");
  if (profile?.isPlanAnchor || profile?.roles.includes("plan_anchor")) groups.push("plan_anchor_candidate");
  if (components.roleCoverage >= 4) groups.push("role_completion_candidate");
  if (components.synergy >= 4) groups.push("support_candidate");
  if ((profile?.solves ?? []).some((role) => role.includes("food") || role === "bake_bread_access")) {
    groups.push("food_stability_candidate");
  }
  if ((profile?.roles ?? []).includes("late_bonus_points")) groups.push("ready_bonus_points_candidate");
  if (components.passRegret >= 7) groups.push("high_pass_regret_candidate");
  if ((profile?.riskTags ?? []).length > 0 || components.riskPenalty >= 5) groups.push("risky_conditional_candidate");
  if (groups.length === 0 && stat) groups.push("general_value_candidate");

  return [...new Set(groups)];
}

function buildEvaluationMeta(
  profile: CardStrategyProfile | undefined,
  stat: CardStatRow | undefined,
  dataIndex: DraftDataIndex,
  cardId: string
): DraftEvaluationMeta {
  const missingData: DraftEvaluationMeta["missingData"] = [];
  if (!stat) missingData.push("stat");
  if (!profile) missingData.push("strategy_profile");
  if (!dataIndex.translationsByCardId.has(cardId)) missingData.push("translation");

  if (profile && stat) {
    return {
      confidence: CONFIDENCE_SCORE[profile.confidence] >= 7 ? "high" : "medium",
      method: "full_profile",
      missingData
    };
  }

  if (profile) {
    return {
      confidence: "medium",
      method: "profile_limited",
      missingData
    };
  }

  if (stat) {
    return {
      confidence: "low",
      method: "stats_only",
      missingData
    };
  }

  return {
    confidence: "low",
    method: "fallback_basic",
    missingData
  };
}

function buildWarnings(evaluationMeta: DraftEvaluationMeta): DraftWarning[] {
  return evaluationMeta.missingData.map((missing) => ({
    code: `missing_${missing}`,
    message: `Evaluation is missing ${missing.replace("_", " ")} data.`
  }));
}

function buildTrackingSignals(
  profile: CardStrategyProfile | undefined,
  handContext: HandContext
): DraftTrackingSignal[] {
  if (!profile) return [];

  const signals: DraftTrackingSignal[] = [];
  const roles = new Set([...profile.roles, ...profile.solves]);

  for (const role of roles) {
    const pressure = handContext.missingRolePressure.get(role) ?? 0;
    if (pressure === 0) continue;
    signals.push({
      code: "availability_pressure",
      roleId: role,
      strength: pressure >= 2 ? "medium" : "weak",
      message: `${role} options have disappeared from a previously seen pack.`
    });
  }

  return signals;
}

function buildPlanShiftHints(
  cardId: string,
  profile: CardStrategyProfile | undefined,
  components: ScoreComponents,
  pickNumber: number
): DraftRecommendation["planShiftHints"] {
  const shouldShow =
    pickNumber >= 2 &&
    pickNumber <= 4 &&
    components.conflictCost < 5 &&
    (profile?.isBroken || profile?.isPlanAnchor || components.passRegret >= 8);

  if (!shouldShow) return [];

  return [
    {
      code: "new_center_plan_candidate",
      cardId,
      message: "This card can become a new center plan without heavily fighting the current hand."
    }
  ];
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
    draftPickBandFit: round(components.draftPickBandFit),
    passRegret: round(components.passRegret),
    pivotPotential: round(components.pivotPotential),
    conflictCost: round(components.conflictCost),
    roleAvailabilityPressure: round(components.roleAvailabilityPressure),
    confidence: round(components.confidence),
    saturationPenalty: round(components.saturationPenalty),
    riskPenalty: round(components.riskPenalty)
  };
}
