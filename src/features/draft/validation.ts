import type {
  Card,
  CardPoolProfile,
  CardPoolStatus,
  CardStatRow,
  CardStrategyProfile,
  CardTranslation,
  ConfidenceLevel,
  DraftCandidateGroup,
  DraftDataSet,
  DraftEvaluationMeta,
  DraftFixture,
  ExplanationDepth,
  ReturnLikelihood,
  SaturationBehavior,
  TrackingMode,
  PickNumber,
  StrategyRole
} from "./contract.ts";

type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  path: string;
  message: string;
};

export type ValidationResult = {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  ok: boolean;
};

const CARD_TYPES = new Set(["occupation", "minor_improvement", "major_improvement"]);
const CONFIDENCE_LEVELS = new Set<ConfidenceLevel>([
  "manual_verified",
  "official_verified",
  "bga_verified",
  "stat_inferred",
  "text_inferred",
  "community_inferred",
  "unverified"
]);
const CARD_POOL_STATUSES = new Set<CardPoolStatus>([
  "active",
  "weak_excluded",
  "strong_excluded",
  "banned",
  "inactive"
]);
const TRACKING_MODES = new Set<TrackingMode>(["full_pack", "selected_only"]);
const SATURATION_BEHAVIORS = new Set<SaturationBehavior>([
  "hard_cap",
  "soft_cap",
  "stackable",
  "resource_convertible",
  "condition_based"
]);
const SCORE_COMPONENTS = new Set([
  "statStrength",
  "brokenOrAnchor",
  "roleCoverage",
  "synergy",
  "returnUrgency",
  "draftPickBandFit",
  "passRegret",
  "pivotPotential",
  "conflictCost",
  "roleAvailabilityPressure",
  "confidence",
  "saturationPenalty",
  "riskPenalty"
]);
const RETURN_LIKELIHOODS = new Set<ReturnLikelihood>(["unlikely", "possible", "likely", "unknown"]);
const EXPLANATION_DEPTHS = new Set<ExplanationDepth>(["compact", "standard", "deep"]);
const CANDIDATE_GROUPS = new Set<DraftCandidateGroup>([
  "broken_candidate",
  "premium_candidate",
  "plan_anchor_candidate",
  "role_completion_candidate",
  "support_candidate",
  "penalty_prevention_candidate",
  "ready_bonus_points_candidate",
  "food_stability_candidate",
  "high_pass_regret_candidate",
  "risky_conditional_candidate",
  "general_value_candidate",
  "fallback_filler_candidate"
]);
const EVALUATION_CONFIDENCES = new Set<DraftEvaluationMeta["confidence"]>(["high", "medium", "low"]);
const EVALUATION_METHODS = new Set<DraftEvaluationMeta["method"]>([
  "full_profile",
  "stats_only",
  "profile_limited",
  "fallback_basic"
]);
const MISSING_DATA_TYPES = new Set<DraftEvaluationMeta["missingData"][number]>([
  "stat",
  "strategy_profile",
  "translation"
]);
const FIXTURE_EXPECTED_KEYS = new Set([
  "topCardId",
  "notTopCardIds",
  "downrankedBelow",
  "componentAtLeast",
  "componentBelow",
  "returnLikelihood",
  "hasRisk",
  "nextPickIncludes",
  "candidateGroupIncludes",
  "warningIncludes",
  "evaluationMetaIncludes",
  "trackingSignalIncludes",
  "planShiftIncludes",
  "reasonIncludes"
]);

export function validateDraftDataSet(data: DraftDataSet, fixtures: DraftFixture[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const cardIds = validateCards(data.cards, issues);
  const roleIds = validateStrategyRoles(data.strategyRoles, issues);

  validateTranslations(data.translations, cardIds, issues);
  validateStats(data.stats, cardIds, issues);
  validateStrategyProfiles(data.strategyProfiles, cardIds, roleIds, issues);
  validateCardPoolProfile(data.cardPoolProfile, cardIds, issues);
  validateFixtures(fixtures, cardIds, roleIds, issues);

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.length - errorCount;
  return {
    issues,
    errorCount,
    warningCount,
    ok: errorCount === 0
  };
}

function validateCards(cards: Card[], issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();

  cards.forEach((card, index) => {
    const path = `cards[${index}]`;
    requireString(card.id, `${path}.id`, issues);

    if (ids.has(card.id)) addIssue(issues, "error", `${path}.id`, `duplicate card id "${card.id}"`);
    ids.add(card.id);

    if (!CARD_TYPES.has(card.type)) addIssue(issues, "error", `${path}.type`, `invalid card type "${card.type}"`);
    requireArray(card.decks, `${path}.decks`, issues);
    requireArray(card.editions, `${path}.editions`, issues);
    requireArray(card.tagIds, `${path}.tagIds`, issues);
    requireArray(card.timingTagIds, `${path}.timingTagIds`, issues);
    requireArray(card.sourceRefs, `${path}.sourceRefs`, issues);
  });

  return ids;
}

function validateTranslations(translations: CardTranslation[], cardIds: Set<string>, issues: ValidationIssue[]): void {
  const aliasesByLocale = new Map<string, string>();

  translations.forEach((translation, index) => {
    const path = `translations[${index}]`;
    if (!cardIds.has(translation.cardId)) {
      addIssue(issues, "error", `${path}.cardId`, `unknown card id "${translation.cardId}"`);
    }

    requireString(translation.locale, `${path}.locale`, issues);
    requireString(translation.name, `${path}.name`, issues);
    requireArray(translation.aliases, `${path}.aliases`, issues);

    for (const alias of translation.aliases) {
      const key = `${translation.locale}:${alias.trim().toLocaleLowerCase()}`;
      const existingCardId = aliasesByLocale.get(key);
      if (existingCardId && existingCardId !== translation.cardId) {
        addIssue(
          issues,
          "warning",
          `${path}.aliases`,
          `alias "${alias}" also points to "${existingCardId}" in locale "${translation.locale}"`
        );
      }
      aliasesByLocale.set(key, translation.cardId);
    }
  });
}

function validateStats(stats: CardStatRow[], cardIds: Set<string>, issues: ValidationIssue[]): void {
  stats.forEach((stat, index) => {
    const path = `stats[${index}]`;
    if (!cardIds.has(stat.cardId)) addIssue(issues, "error", `${path}.cardId`, `unknown card id "${stat.cardId}"`);

    requireOptionalNumber(stat.rank, `${path}.rank`, issues);
    requireOptionalNumber(stat.pwr, `${path}.pwr`, issues);
    requireOptionalNumber(stat.wtdPwr, `${path}.wtdPwr`, issues);
    requireOptionalNumber(stat.adp, `${path}.adp`, issues);
    requireOptionalNumber(stat.apr, `${path}.apr`, issues);
    requireOptionalNumber(stat.deals, `${path}.deals`, issues);
    requireOptionalNumber(stat.drafted, `${path}.drafted`, issues);
    requireOptionalNumber(stat.plays, `${path}.plays`, issues);
  });
}

function validateStrategyRoles(roles: StrategyRole[], issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();

  roles.forEach((role, index) => {
    const path = `strategyRoles[${index}]`;
    requireString(role.id, `${path}.id`, issues);
    if (ids.has(role.id)) addIssue(issues, "error", `${path}.id`, `duplicate strategy role id "${role.id}"`);
    ids.add(role.id);
    if (role.saturationBehavior !== undefined && !SATURATION_BEHAVIORS.has(role.saturationBehavior)) {
      addIssue(issues, "error", `${path}.saturationBehavior`, `invalid saturation behavior "${role.saturationBehavior}"`);
    }
    if (role.sinkRoleIds !== undefined) requireArray(role.sinkRoleIds, `${path}.sinkRoleIds`, issues);
  });

  roles.forEach((role, index) => {
    if (role.sinkRoleIds !== undefined) validateRoleReferences(role.sinkRoleIds, ids, `strategyRoles[${index}].sinkRoleIds`, issues);
  });

  return ids;
}

function validateStrategyProfiles(
  profiles: CardStrategyProfile[],
  cardIds: Set<string>,
  roleIds: Set<string>,
  issues: ValidationIssue[]
): void {
  profiles.forEach((profile, index) => {
    const path = `strategyProfiles[${index}]`;

    if (!cardIds.has(profile.cardId)) {
      addIssue(issues, "error", `${path}.cardId`, `unknown card id "${profile.cardId}"`);
    }

    validateRoleReferences(profile.roles, roleIds, `${path}.roles`, issues);
    validateRoleReferences(profile.solves, roleIds, `${path}.solves`, issues);
    if (profile.supports !== undefined) validateRoleReferences(profile.supports, roleIds, `${path}.supports`, issues);
    if (profile.partialSolves !== undefined) {
      validateRoleReferences(profile.partialSolves, roleIds, `${path}.partialSolves`, issues);
    }
    validateRoleReferences(profile.increasesNeedFor, roleIds, `${path}.increasesNeedFor`, issues);
    validateCardReferences(profile.synergyWith, cardIds, `${path}.synergyWith`, issues);
    validateCardReferences(profile.conflictsWith, cardIds, `${path}.conflictsWith`, issues);
    validateSaturationTargets(profile.saturationPenaltyTo, cardIds, roleIds, `${path}.saturationPenaltyTo`, issues);

    if (!CONFIDENCE_LEVELS.has(profile.confidence)) {
      addIssue(issues, "error", `${path}.confidence`, `invalid confidence "${profile.confidence}"`);
    }
  });
}

function validateCardPoolProfile(profile: CardPoolProfile, cardIds: Set<string>, issues: ValidationIssue[]): void {
  for (const [cardId, status] of Object.entries(profile.cardStatuses)) {
    if (!cardIds.has(cardId)) {
      addIssue(issues, "error", `cardPoolProfile.cardStatuses.${cardId}`, `unknown card id "${cardId}"`);
    }
    if (!CARD_POOL_STATUSES.has(status)) {
      addIssue(issues, "error", `cardPoolProfile.cardStatuses.${cardId}`, `invalid status "${status}"`);
    }
  }
}

function validateFixtures(
  fixtures: DraftFixture[],
  cardIds: Set<string>,
  roleIds: Set<string>,
  issues: ValidationIssue[]
): void {
  fixtures.forEach((fixture, index) => {
    const path = `fixtures[${index}]`;
    const input = fixture.input;

    if (!isPickNumber(input.pickNumber)) {
      addIssue(issues, "error", `${path}.input.pickNumber`, `invalid pick number "${input.pickNumber}"`);
    }

    validateCardReferences(input.offeredCardIds, cardIds, `${path}.input.offeredCardIds`, issues);
    validateCardReferences(input.pickedCardIds ?? [], cardIds, `${path}.input.pickedCardIds`, issues);
    validateCardReferences(input.seenCardIds ?? [], cardIds, `${path}.input.seenCardIds`, issues);
    validateCardReferences(input.passedCardIds ?? [], cardIds, `${path}.input.passedCardIds`, issues);
    validateCardReferences(input.previousPackCardIds ?? [], cardIds, `${path}.input.previousPackCardIds`, issues);
    validateCardReferences(input.missingFromPreviousPack ?? [], cardIds, `${path}.input.missingFromPreviousPack`, issues);

    if (input.trackingMode !== undefined && !TRACKING_MODES.has(input.trackingMode)) {
      addIssue(issues, "error", `${path}.input.trackingMode`, `invalid tracking mode "${input.trackingMode}"`);
    }

    for (const key of Object.keys(fixture.expected ?? {})) {
      if (!FIXTURE_EXPECTED_KEYS.has(key)) {
        addIssue(issues, "error", `${path}.expected.${key}`, `unsupported fixture assertion "${key}"`);
      }
    }

    if (fixture.expected?.topCardId && !cardIds.has(fixture.expected.topCardId)) {
      addIssue(issues, "error", `${path}.expected.topCardId`, `unknown card id "${fixture.expected.topCardId}"`);
    }

    for (const cardId of fixture.expected?.notTopCardIds ?? []) {
      if (!cardIds.has(cardId)) addIssue(issues, "error", `${path}.expected.notTopCardIds`, `unknown card id "${cardId}"`);
    }

    for (const pair of fixture.expected?.downrankedBelow ?? []) {
      if (!cardIds.has(pair.cardId)) addIssue(issues, "error", `${path}.expected.downrankedBelow`, `unknown card id "${pair.cardId}"`);
      if (!cardIds.has(pair.belowCardId)) {
        addIssue(issues, "error", `${path}.expected.downrankedBelow`, `unknown card id "${pair.belowCardId}"`);
      }
    }

    for (const assertion of fixture.expected?.componentAtLeast ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.componentAtLeast.cardId`, issues);
      if (!SCORE_COMPONENTS.has(String(assertion.component))) {
        addIssue(issues, "error", `${path}.expected.componentAtLeast.component`, `unknown score component "${String(assertion.component)}"`);
      }
      requireOptionalNumber(assertion.value, `${path}.expected.componentAtLeast.value`, issues);
    }

    for (const assertion of fixture.expected?.componentBelow ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.componentBelow.cardId`, issues);
      if (!SCORE_COMPONENTS.has(String(assertion.component))) {
        addIssue(issues, "error", `${path}.expected.componentBelow.component`, `unknown score component "${String(assertion.component)}"`);
      }
      requireOptionalNumber(assertion.value, `${path}.expected.componentBelow.value`, issues);
    }

    for (const assertion of fixture.expected?.returnLikelihood ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.returnLikelihood.cardId`, issues);
      if (!RETURN_LIKELIHOODS.has(assertion.value)) {
        addIssue(issues, "error", `${path}.expected.returnLikelihood.value`, `invalid return likelihood "${assertion.value}"`);
      }
    }

    for (const assertion of fixture.expected?.hasRisk ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.hasRisk.cardId`, issues);
      requireString(assertion.risk, `${path}.expected.hasRisk.risk`, issues);
    }

    for (const assertion of fixture.expected?.nextPickIncludes ?? []) {
      validateTextIncludesAssertion(assertion, cardIds, `${path}.expected.nextPickIncludes`, issues);
    }

    for (const assertion of fixture.expected?.candidateGroupIncludes ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.candidateGroupIncludes.cardId`, issues);
      if (!CANDIDATE_GROUPS.has(assertion.value)) {
        addIssue(issues, "error", `${path}.expected.candidateGroupIncludes.value`, `invalid candidate group "${assertion.value}"`);
      }
    }

    for (const assertion of fixture.expected?.warningIncludes ?? []) {
      validateTextIncludesAssertion(assertion, cardIds, `${path}.expected.warningIncludes`, issues);
    }

    for (const assertion of fixture.expected?.evaluationMetaIncludes ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.evaluationMetaIncludes.cardId`, issues);
      if (assertion.confidence !== undefined && !EVALUATION_CONFIDENCES.has(assertion.confidence)) {
        addIssue(issues, "error", `${path}.expected.evaluationMetaIncludes.confidence`, `invalid evaluation confidence "${assertion.confidence}"`);
      }
      if (assertion.method !== undefined && !EVALUATION_METHODS.has(assertion.method)) {
        addIssue(issues, "error", `${path}.expected.evaluationMetaIncludes.method`, `invalid evaluation method "${assertion.method}"`);
      }
      if (assertion.missingDataIncludes !== undefined && !MISSING_DATA_TYPES.has(assertion.missingDataIncludes)) {
        addIssue(
          issues,
          "error",
          `${path}.expected.evaluationMetaIncludes.missingDataIncludes`,
          `invalid missing data type "${assertion.missingDataIncludes}"`
        );
      }
    }

    for (const assertion of fixture.expected?.trackingSignalIncludes ?? []) {
      if (assertion.cardId !== undefined) validateCardReference(assertion.cardId, cardIds, `${path}.expected.trackingSignalIncludes.cardId`, issues);
      if (assertion.role !== undefined && !roleIds.has(assertion.role)) {
        addIssue(issues, "error", `${path}.expected.trackingSignalIncludes.role`, `unknown strategy role id "${assertion.role}"`);
      }
      requireString(assertion.value, `${path}.expected.trackingSignalIncludes.value`, issues);
    }

    for (const assertion of fixture.expected?.planShiftIncludes ?? []) {
      validateTextIncludesAssertion(assertion, cardIds, `${path}.expected.planShiftIncludes`, issues);
    }

    for (const assertion of fixture.expected?.reasonIncludes ?? []) {
      validateCardReference(assertion.cardId, cardIds, `${path}.expected.reasonIncludes.cardId`, issues);
      if (!EXPLANATION_DEPTHS.has(assertion.depth)) {
        addIssue(issues, "error", `${path}.expected.reasonIncludes.depth`, `invalid explanation depth "${assertion.depth}"`);
      }
      requireString(assertion.value, `${path}.expected.reasonIncludes.value`, issues);
    }
  });
}

function validateRoleReferences(values: string[], roleIds: Set<string>, path: string, issues: ValidationIssue[]): void {
  requireArray(values, path, issues);
  for (const roleId of values) {
    if (!roleIds.has(roleId)) addIssue(issues, "error", path, `unknown strategy role id "${roleId}"`);
  }
}

function validateCardReferences(values: string[], cardIds: Set<string>, path: string, issues: ValidationIssue[]): void {
  requireArray(values, path, issues);
  for (const cardId of values) {
    if (!cardIds.has(cardId)) addIssue(issues, "error", path, `unknown card id "${cardId}"`);
  }
}

function validateCardReference(cardId: string, cardIds: Set<string>, path: string, issues: ValidationIssue[]): void {
  if (!cardIds.has(cardId)) addIssue(issues, "error", path, `unknown card id "${cardId}"`);
}

function validateTextIncludesAssertion(
  assertion: { cardId: string; value: string },
  cardIds: Set<string>,
  path: string,
  issues: ValidationIssue[]
): void {
  validateCardReference(assertion.cardId, cardIds, `${path}.cardId`, issues);
  requireString(assertion.value, `${path}.value`, issues);
}

function validateSaturationTargets(
  values: string[],
  cardIds: Set<string>,
  roleIds: Set<string>,
  path: string,
  issues: ValidationIssue[]
): void {
  requireArray(values, path, issues);
  for (const target of values) {
    if (!cardIds.has(target) && !roleIds.has(target)) {
      addIssue(issues, "error", path, `unknown card or role id "${target}"`);
    }
  }
}

function requireString(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (typeof value !== "string" || value.length === 0) addIssue(issues, "error", path, "expected non-empty string");
}

function requireArray(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(value)) addIssue(issues, "error", path, "expected array");
}

function requireOptionalNumber(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (value !== undefined && typeof value !== "number") addIssue(issues, "error", path, "expected number or undefined");
}

function isPickNumber(value: unknown): value is PickNumber {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}

function addIssue(issues: ValidationIssue[], severity: ValidationSeverity, path: string, message: string): void {
  issues.push({ severity, path, message });
}
