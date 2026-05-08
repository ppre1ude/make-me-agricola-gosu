import type {
  DraftCandidateGroup,
  DraftCardType,
  DraftEvaluationMeta,
  DraftFixtureInput,
  DraftFormat,
  DraftPickBand,
  DraftScoringInput,
  ExplanationDepth,
  PickNumber,
  ReturnLikelihood,
  TrackingMode
} from "../../features/draft/contract.ts";
import type { DraftRecommendPostBody, DraftSampleGetResponse } from "../../app/draft-coach-api.ts";

export type DraftSkillLevel = "beginner" | "intermediate" | "advanced";

export type UIDraftInput = DraftScoringInput & {
  skillLevel?: DraftSkillLevel;
};

export type UIDraftInputPatch = Partial<
  Omit<UIDraftInput, "offeredCardIds" | "pickedCardIds" | "seenCardIds" | "passedCardIds">
> & {
  offeredCardIds?: readonly unknown[];
  pickedCardIds?: readonly unknown[];
  seenCardIds?: readonly unknown[];
  passedCardIds?: readonly unknown[];
};

export type UIDraftNormalizeOptions = {
  cardPoolProfileId?: string;
  sample?: Pick<DraftSampleGetResponse, "input"> & {
    cardPoolProfile?: { id?: string };
  };
};

export type DraftPreviousPackComparison = {
  enabled: boolean;
  previousPackCardIds: string[];
  currentVisiblePackCardIds: string[];
  missingFromPreviousPack: string[];
};

export type DraftLabelNamespace = keyof typeof DRAFT_UI_LABELS;
export type DraftCardGroupName = "offered" | "picked" | "seen" | "passed" | "previous";

export type DraftCardGroupConfig = {
  inputKey: keyof Pick<
    UIDraftInput,
    "offeredCardIds" | "pickedCardIds" | "seenCardIds" | "passedCardIds" | "previousPackCardIds"
  >;
  label: string;
  listId: string;
  searchId: string;
  resultsId: string;
  addButtonId: string;
  countId: string;
  emptyText: string;
  variant: "card" | "token";
};

const DEFAULT_CARD_POOL_PROFILE_ID = "bga-arena-prototype";
const DEFAULT_SKILL_LEVEL: DraftSkillLevel = "advanced";

export const DEFAULT_UI_DRAFT_INPUT: UIDraftInput = {
  playerCount: 4,
  draftCardType: "occupation",
  pickNumber: 1,
  offeredCardIds: [],
  pickedCardIds: [],
  seenCardIds: [],
  passedCardIds: [],
  draftFormat: "10-to-7",
  trackingMode: "full_pack",
  cardPoolProfileId: DEFAULT_CARD_POOL_PROFILE_ID,
  explanationDepth: "standard",
  skillLevel: DEFAULT_SKILL_LEVEL
};

export const DRAFT_UI_LABELS = {
  draftFormat: {
    "10-to-7": "10장 중 7장",
    "9-to-7": "9장 중 7장",
    "8-to-7": "8장 중 7장"
  },
  draftCardType: {
    occupation: "직업",
    minor_improvement: "보조설비"
  },
  trackingMode: {
    selected_only: "선택 카드",
    full_pack: "전체 팩"
  },
  explanationDepth: {
    compact: "간단",
    standard: "표준",
    deep: "상세"
  },
  skillLevel: {
    beginner: "입문",
    intermediate: "중급",
    advanced: "고급"
  },
  draftPickBand: {
    early_anchor: "초반 앵커",
    middle_direction: "중반 방향",
    late_completion: "후반 완성"
  },
  returnLikelihood: {
    unlikely: "돌아오기 어려움",
    possible: "돌아올 수 있음",
    likely: "돌아올 가능성 높음",
    unknown: "모름"
  },
  confidence: {
    high: "신뢰도 높음",
    medium: "신뢰도 중간",
    low: "신뢰도 낮음"
  },
  method: {
    full_profile: "전략 프로필",
    stats_only: "통계 중심",
    profile_limited: "제한 프로필",
    fallback_basic: "기본 평가"
  },
  candidateGroup: {
    broken_candidate: "브로큰 후보",
    premium_candidate: "강카드 후보",
    plan_anchor_candidate: "플랜 앵커",
    role_completion_candidate: "역할 완성",
    support_candidate: "보조 역할",
    penalty_prevention_candidate: "감점 방지",
    ready_bonus_points_candidate: "즉시 점수",
    food_stability_candidate: "음식 안정",
    high_pass_regret_candidate: "넘기기 아까움",
    risky_conditional_candidate: "조건부 리스크",
    general_value_candidate: "범용 가치",
    fallback_filler_candidate: "대체 후보"
  },
  missingData: {
    stat: "통계 누락",
    strategy_profile: "전략 프로필 누락",
    translation: "번역 누락"
  }
} satisfies {
  draftFormat: Record<DraftFormat, string>;
  draftCardType: Record<DraftCardType, string>;
  trackingMode: Record<TrackingMode, string>;
  explanationDepth: Record<ExplanationDepth, string>;
  skillLevel: Record<DraftSkillLevel, string>;
  draftPickBand: Record<DraftPickBand, string>;
  returnLikelihood: Record<ReturnLikelihood, string>;
  confidence: Record<DraftEvaluationMeta["confidence"], string>;
  method: Record<DraftEvaluationMeta["method"], string>;
  candidateGroup: Record<DraftCandidateGroup, string>;
  missingData: Record<DraftEvaluationMeta["missingData"][number], string>;
};

export const DRAFT_CARD_GROUPS = {
  offered: {
    inputKey: "offeredCardIds",
    label: "보이는 카드",
    listId: "offeredCards",
    searchId: "offeredCardSearch",
    resultsId: "offeredCardResults",
    addButtonId: "addOfferedCardButton",
    countId: "offeredCardsCount",
    emptyText: "보이는 카드 없음",
    variant: "card"
  },
  picked: {
    inputKey: "pickedCardIds",
    label: "집은 카드",
    listId: "pickedCards",
    searchId: "pickedCardSearch",
    resultsId: "pickedCardResults",
    addButtonId: "addPickedCardButton",
    countId: "pickedCardsCount",
    emptyText: "없음",
    variant: "token"
  },
  seen: {
    inputKey: "seenCardIds",
    label: "본 카드",
    listId: "seenCards",
    searchId: "seenCardSearch",
    resultsId: "seenCardResults",
    addButtonId: "addSeenCardButton",
    countId: "seenCardsCount",
    emptyText: "없음",
    variant: "token"
  },
  passed: {
    inputKey: "passedCardIds",
    label: "넘긴 카드",
    listId: "passedCards",
    searchId: "passedCardSearch",
    resultsId: "passedCardResults",
    addButtonId: "addPassedCardButton",
    countId: "passedCardsCount",
    emptyText: "없음",
    variant: "token"
  },
  previous: {
    inputKey: "previousPackCardIds",
    label: "이전에 본 팩",
    listId: "previousPackCardList",
    searchId: "previousPackCardSearch",
    resultsId: "previousPackCardResults",
    addButtonId: "addPreviousPackCardButton",
    countId: "previousPackCardsCount",
    emptyText: "이전에 본 팩 없음",
    variant: "token"
  }
} satisfies Record<DraftCardGroupName, DraftCardGroupConfig>;

const ALLOWED_DRAFT_CARD_TYPES = new Set<DraftCardType>(["occupation", "minor_improvement"]);
const ALLOWED_DRAFT_FORMATS = new Set<DraftFormat>(["10-to-7", "9-to-7", "8-to-7"]);
const ALLOWED_TRACKING_MODES = new Set<TrackingMode>(["selected_only", "full_pack"]);
const ALLOWED_EXPLANATION_DEPTHS = new Set<ExplanationDepth>(["compact", "standard", "deep"]);
const ALLOWED_SKILL_LEVELS = new Set<DraftSkillLevel>(["beginner", "intermediate", "advanced"]);

export function createDefaultDraftInput(overrides: UIDraftInputPatch = {}): UIDraftInput {
  return normalizeDraftInput({ ...DEFAULT_UI_DRAFT_INPUT, ...overrides });
}

export function normalizeDraftInput(
  input: UIDraftInputPatch = {},
  options: UIDraftNormalizeOptions = {}
): UIDraftInput {
  const offeredCardIds = stringArray(input.offeredCardIds);
  const previousPackCardIds = stringArray(input.previousPackCardIds);
  const draftCardType = isAllowed(input.draftCardType, ALLOWED_DRAFT_CARD_TYPES)
    ? input.draftCardType
    : inferDraftCardType(offeredCardIds);
  const normalized: UIDraftInput = {
    playerCount: numberOr(input.playerCount, DEFAULT_UI_DRAFT_INPUT.playerCount),
    draftCardType,
    pickNumber: clampPickNumber(input.pickNumber),
    offeredCardIds,
    pickedCardIds: stringArray(input.pickedCardIds),
    seenCardIds: stringArray(input.seenCardIds),
    passedCardIds: stringArray(input.passedCardIds),
    draftFormat: isAllowed(input.draftFormat, ALLOWED_DRAFT_FORMATS)
      ? input.draftFormat
      : DEFAULT_UI_DRAFT_INPUT.draftFormat,
    trackingMode: isAllowed(input.trackingMode, ALLOWED_TRACKING_MODES)
      ? input.trackingMode
      : DEFAULT_UI_DRAFT_INPUT.trackingMode,
    cardPoolProfileId: stringOr(
      input.cardPoolProfileId,
      options.cardPoolProfileId ??
        options.sample?.cardPoolProfile?.id ??
        options.sample?.input.cardPoolProfileId ??
        DEFAULT_CARD_POOL_PROFILE_ID
    ),
    explanationDepth: isAllowed(input.explanationDepth, ALLOWED_EXPLANATION_DEPTHS)
      ? input.explanationDepth
      : DEFAULT_UI_DRAFT_INPUT.explanationDepth,
    skillLevel: isAllowed(input.skillLevel, ALLOWED_SKILL_LEVELS) ? input.skillLevel : DEFAULT_SKILL_LEVEL
  };

  if (shouldComparePreviousPack(normalized) && previousPackCardIds.length > 0) {
    normalized.previousPackCardIds = previousPackCardIds;
    const missingFromPreviousPack = computeMissingFromPreviousPack(previousPackCardIds, offeredCardIds);
    if (missingFromPreviousPack.length > 0) normalized.missingFromPreviousPack = missingFromPreviousPack;
  }

  return normalized;
}

export function buildScoringInput(input: UIDraftInputPatch = DEFAULT_UI_DRAFT_INPUT): DraftScoringInput {
  const normalized = normalizeDraftInput(input);
  return {
    playerCount: normalized.playerCount,
    draftCardType: normalized.draftCardType,
    pickNumber: normalized.pickNumber,
    offeredCardIds: [...normalized.offeredCardIds],
    pickedCardIds: [...normalized.pickedCardIds],
    seenCardIds: [...normalized.seenCardIds],
    passedCardIds: [...normalized.passedCardIds],
    ...(normalized.previousPackCardIds === undefined ? {} : { previousPackCardIds: [...normalized.previousPackCardIds] }),
    ...(normalized.missingFromPreviousPack === undefined
      ? {}
      : { missingFromPreviousPack: [...normalized.missingFromPreviousPack] }),
    draftFormat: normalized.draftFormat,
    trackingMode: normalized.trackingMode,
    cardPoolProfileId: normalized.cardPoolProfileId,
    explanationDepth: normalized.explanationDepth
  };
}

export function buildRecommendPostBody(input: UIDraftInputPatch = DEFAULT_UI_DRAFT_INPUT): DraftRecommendPostBody {
  return buildScoringInput(input) satisfies DraftFixtureInput;
}

export function cloneDraftInput(input: UIDraftInput): UIDraftInput {
  return {
    playerCount: input.playerCount,
    draftCardType: input.draftCardType,
    pickNumber: input.pickNumber,
    offeredCardIds: [...input.offeredCardIds],
    pickedCardIds: [...input.pickedCardIds],
    seenCardIds: [...input.seenCardIds],
    passedCardIds: [...input.passedCardIds],
    ...(input.previousPackCardIds === undefined ? {} : { previousPackCardIds: [...input.previousPackCardIds] }),
    ...(input.missingFromPreviousPack === undefined ? {} : { missingFromPreviousPack: [...input.missingFromPreviousPack] }),
    draftFormat: input.draftFormat,
    trackingMode: input.trackingMode,
    cardPoolProfileId: input.cardPoolProfileId,
    explanationDepth: input.explanationDepth,
    ...(input.skillLevel === undefined ? {} : { skillLevel: input.skillLevel })
  };
}

export function labelFor(namespace: DraftLabelNamespace, value: string | undefined): string {
  if (!value) return "";
  const labels = DRAFT_UI_LABELS[namespace] as Record<string, string>;
  return labels[value] ?? value;
}

export function canRequestRecommendations(input: UIDraftInput | undefined): boolean {
  return Boolean(input && input.offeredCardIds.length > 0);
}

export function buildDraftPreviousPackComparison(input: UIDraftInput): DraftPreviousPackComparison {
  const previousPackCardIds = input.previousPackCardIds ?? [];
  return {
    enabled: shouldComparePreviousPack(input),
    previousPackCardIds,
    currentVisiblePackCardIds: input.offeredCardIds,
    missingFromPreviousPack: input.missingFromPreviousPack ?? []
  };
}

export function shouldComparePreviousPack(
  input: Pick<UIDraftInput, "pickNumber" | "trackingMode">
): boolean {
  return input.trackingMode === "full_pack" && input.pickNumber >= 5;
}

export function computeMissingFromPreviousPack(
  previousPackCardIds: readonly string[],
  offeredCardIds: readonly string[]
): string[] {
  const offeredCardIdSet = new Set(offeredCardIds);
  const missingCardIds: string[] = [];

  previousPackCardIds.forEach((cardId) => {
    if (offeredCardIdSet.has(cardId) || missingCardIds.includes(cardId)) return;
    missingCardIds.push(cardId);
  });

  return missingCardIds;
}

export function formatScore(value: number): string | number {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value * 10) / 10;
}

export function cardDisplay(cardId: string, name = cardId): string {
  return `${name} (${cardId})`;
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function numberOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clampPickNumber(value: unknown): PickNumber {
  const number = Math.round(numberOr(value, DEFAULT_UI_DRAFT_INPUT.pickNumber));
  return Math.min(7, Math.max(1, number)) as PickNumber;
}

export function inferDraftCardType(cardIds: readonly string[]): DraftCardType {
  const minorCount = cardIds.filter((cardId) => cardId.startsWith("minor-")).length;
  return minorCount > cardIds.length / 2 ? "minor_improvement" : "occupation";
}

function isAllowed<T extends string>(value: unknown, allowed: ReadonlySet<T>): value is T {
  return typeof value === "string" && allowed.has(value as T);
}
