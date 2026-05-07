import type {
  Card,
  CardPoolProfile,
  CardPoolStatus,
  CardStatRow,
  CardStrategyProfile,
  CardTranslation,
  ConfidenceLevel,
  DraftDataSet,
  DraftFixture,
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

export function validateDraftDataSet(data: DraftDataSet, fixtures: DraftFixture[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const cardIds = validateCards(data.cards, issues);
  const roleIds = validateStrategyRoles(data.strategyRoles, issues);

  validateTranslations(data.translations, cardIds, issues);
  validateStats(data.stats, cardIds, issues);
  validateStrategyProfiles(data.strategyProfiles, cardIds, roleIds, issues);
  validateCardPoolProfile(data.cardPoolProfile, cardIds, issues);
  validateFixtures(fixtures, cardIds, issues);

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

function validateFixtures(fixtures: DraftFixture[], cardIds: Set<string>, issues: ValidationIssue[]): void {
  fixtures.forEach((fixture, index) => {
    const path = `fixtures[${index}]`;
    const session = fixture.session;

    if (!isPickNumber(session.pickNumber)) {
      addIssue(issues, "error", `${path}.session.pickNumber`, `invalid pick number "${session.pickNumber}"`);
    }

    validateCardReferences(session.offeredCardIds, cardIds, `${path}.session.offeredCardIds`, issues);
    validateCardReferences(session.pickedCardIds ?? [], cardIds, `${path}.session.pickedCardIds`, issues);
    validateCardReferences(session.seenCardIds ?? [], cardIds, `${path}.session.seenCardIds`, issues);
    validateCardReferences(session.passedCardIds ?? [], cardIds, `${path}.session.passedCardIds`, issues);

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
