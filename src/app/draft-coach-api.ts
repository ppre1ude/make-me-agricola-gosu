import {
  rankDraftOptions,
  type DraftFeedbackEvent,
  type DraftFeedbackEventType,
  type DraftFeedbackPossibleCause,
  type DraftFeedbackReviewState,
  type DraftFixtureInput,
  type DraftRecommendation,
  type DraftScoringInput
} from "../features/draft/index.ts";
import {
  normalizeDraftCoachInput,
  type DraftCoachDataContext,
  type DraftCoachInputDefaults
} from "./draft-coach-data.ts";

export {
  DRAFT_COACH_DATA_PATHS,
  DRAFT_COACH_DEFAULTS,
  loadDraftCoachData,
  normalizeDraftCoachInput,
  type DraftCoachDataContext,
  type DraftCoachDataLoadOptions,
  type DraftCoachDataPaths,
  type DraftCoachInputDefaults,
  type DraftCoachNormalizeOptions,
  type DraftCoachSourcePermission,
  type DraftCoachSourceRef,
  type DraftCoachSourceRegistry
} from "./draft-coach-data.ts";

export const DRAFT_COACH_KOREAN_LOCALE = "ko-KR";

export type DraftCoachRecommendation = DraftRecommendation & {
  cardName: string;
  cardNameKo?: string;
};

export type DraftSampleGetRequest = {
  method: "GET";
  path: "/api/draft/sample";
};

export type DraftSampleGetResponse = {
  sampleRequest: DraftRecommendPostBody;
  input: DraftScoringInput;
  recommendations: DraftCoachRecommendation[];
};

export type DraftRecommendPostBody = DraftFixtureInput;

export type DraftRecommendPostRequest = {
  method: "POST";
  path: "/api/draft/recommend";
  body: DraftRecommendPostBody;
};

export type DraftRecommendPostResponse = {
  input: DraftScoringInput;
  recommendations: DraftCoachRecommendation[];
};

export type DraftFeedbackPostBody = {
  id?: string;
  eventType?: DraftFeedbackEventType;
  occurredAt?: string;
  input: DraftFixtureInput;
  recommendationCardIds: string[];
  modelTopCardId: string;
  userSelectedCardId: string;
  reviewState?: DraftFeedbackReviewState;
  possibleCauses?: DraftFeedbackPossibleCause[];
  note?: string;
};

export type DraftFeedbackPostRequest = {
  method: "POST";
  path: "/api/draft/feedback";
  body: DraftFeedbackPostBody;
};

export type DraftFeedbackPostResponse = {
  accepted: true;
  event: DraftFeedbackEvent;
  forwardedToPersistence: boolean;
};

export type DraftFeedbackSink = (event: DraftFeedbackEvent) => void | Promise<void>;

export type DraftFeedbackSubmissionOptions = {
  feedbackSink?: DraftFeedbackSink;
  now?: () => Date;
  createId?: (body: DraftFeedbackPostBody, occurredAt: string) => string;
};

export type DraftCoachRecommendOptions = {
  defaults?: DraftCoachInputDefaults;
};

export const DRAFT_COACH_SAMPLE_INPUT: DraftFixtureInput = {
  pickNumber: 1,
  pickedCardIds: [],
  seenCardIds: [],
  passedCardIds: [],
  offeredCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"]
};

export function getDraftSample(context: DraftCoachDataContext): DraftSampleGetResponse {
  const sampleRequest = cloneDraftFixtureInput(DRAFT_COACH_SAMPLE_INPUT);
  const response = getDraftRecommendations(sampleRequest, context);

  return {
    sampleRequest,
    input: response.input,
    recommendations: response.recommendations
  };
}

export function getDraftRecommendations(
  body: DraftRecommendPostBody,
  context: DraftCoachDataContext,
  options: DraftCoachRecommendOptions = {}
): DraftRecommendPostResponse {
  const normalizeOptions =
    options.defaults === undefined
      ? { data: context.data }
      : { data: context.data, defaults: options.defaults };
  const input = normalizeDraftCoachInput(body, normalizeOptions);
  const recommendations = rankDraftOptions(input, context.dataIndex).map((recommendation) =>
    enrichDraftRecommendation(recommendation, context)
  );

  return {
    input,
    recommendations
  };
}

export async function submitDraftFeedback(
  body: DraftFeedbackPostBody,
  options: DraftFeedbackSubmissionOptions = {}
): Promise<DraftFeedbackPostResponse> {
  const occurredAt = body.occurredAt ?? (options.now?.() ?? new Date()).toISOString();
  const event: DraftFeedbackEvent = {
    id: body.id ?? options.createId?.(body, occurredAt) ?? `draft-feedback-${occurredAt}`,
    eventType: body.eventType ?? "model_user_disagreement",
    occurredAt,
    input: cloneDraftFixtureInput(body.input),
    recommendationCardIds: [...body.recommendationCardIds],
    modelTopCardId: body.modelTopCardId,
    userSelectedCardId: body.userSelectedCardId,
    reviewState: body.reviewState ?? "unreviewed"
  };

  if (body.possibleCauses !== undefined) {
    event.possibleCauses = [...body.possibleCauses];
  }

  if (body.note !== undefined) {
    event.note = body.note;
  }

  await options.feedbackSink?.(event);

  return {
    accepted: true,
    event,
    forwardedToPersistence: options.feedbackSink !== undefined
  };
}

function enrichDraftRecommendation(
  recommendation: DraftRecommendation,
  context: DraftCoachDataContext
): DraftCoachRecommendation {
  const cardNameKo = getKoreanCardName(recommendation.cardId, context);
  const enriched = {
    ...recommendation,
    cardName: cardNameKo ?? recommendation.cardId
  };

  if (cardNameKo === undefined) return enriched;
  return {
    ...enriched,
    cardNameKo
  };
}

function getKoreanCardName(cardId: string, context: DraftCoachDataContext): string | undefined {
  const translation =
    context.data.translations.find(
      (candidate) => candidate.cardId === cardId && candidate.locale === DRAFT_COACH_KOREAN_LOCALE
    ) ?? context.dataIndex.translationsByCardId.get(cardId);

  return translation?.locale === DRAFT_COACH_KOREAN_LOCALE ? translation.name : undefined;
}

function cloneDraftFixtureInput(input: DraftFixtureInput): DraftFixtureInput {
  const clone: DraftFixtureInput = {
    pickNumber: input.pickNumber,
    offeredCardIds: [...input.offeredCardIds]
  };

  if (input.playerCount !== undefined) clone.playerCount = input.playerCount;
  if (input.draftCardType !== undefined) clone.draftCardType = input.draftCardType;
  if (input.pickedCardIds !== undefined) clone.pickedCardIds = [...input.pickedCardIds];
  if (input.seenCardIds !== undefined) clone.seenCardIds = [...input.seenCardIds];
  if (input.passedCardIds !== undefined) clone.passedCardIds = [...input.passedCardIds];
  if (input.previousPackCardIds !== undefined) clone.previousPackCardIds = [...input.previousPackCardIds];
  if (input.missingFromPreviousPack !== undefined) {
    clone.missingFromPreviousPack = [...input.missingFromPreviousPack];
  }
  if (input.draftFormat !== undefined) clone.draftFormat = input.draftFormat;
  if (input.trackingMode !== undefined) clone.trackingMode = input.trackingMode;
  if (input.cardPoolProfileId !== undefined) clone.cardPoolProfileId = input.cardPoolProfileId;
  if (input.explanationDepth !== undefined) clone.explanationDepth = input.explanationDepth;

  return clone;
}
