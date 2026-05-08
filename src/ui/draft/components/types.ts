import type {
  DraftRecommendation,
  ExplanationDepth
} from "../../../features/draft/index.ts";
import type { UIDraftInput } from "../contract-adapter.ts";

export type DraftStatusTone = "busy" | "error" | "ready";

export type DraftCardSummary = {
  id: string;
  name: string;
  type?: string;
  aliases?: string[];
};

export type DraftCardGroupKey = "offered" | "picked" | "seen" | "passed" | "previous";

export type DraftCardGroupConfig = {
  key: DraftCardGroupKey;
  label: string;
  inputKey: keyof Pick<
    UIDraftInput,
    "offeredCardIds" | "pickedCardIds" | "seenCardIds" | "passedCardIds" | "previousPackCardIds"
  >;
  listId: string;
  searchId: string;
  resultsId: string;
  addButtonId: string;
  countId: string;
  emptyText: string;
  variant: "card" | "token";
};

export type DraftCardSearchState = {
  query: string;
  results: DraftCardSummary[];
  loading: boolean;
  error: string;
  selectedCardId: string | null;
};

export type DraftCoachRecommendationView = DraftRecommendation & {
  cardName?: string;
  cardNameKo?: string;
};

export type DraftRecommendationReasonDepth = ExplanationDepth;
