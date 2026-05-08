import type {
  DraftFeedbackPossibleCause,
  DraftScoringInput
} from "../../features/draft/index.ts";
import type {
  DraftFeedbackPostBody,
  DraftFeedbackPostResponse,
  DraftRecommendPostResponse,
  DraftSampleGetResponse
} from "../../app/draft-coach-api.ts";
import {
  buildRecommendPostBody,
  buildScoringInput,
  createDefaultDraftInput,
  normalizeDraftInput,
  type UIDraftInput
} from "./contract-adapter.ts";
import { DraftPickResolution, type DraftPickResolutionResult } from "./pick-resolution.ts";
import { DraftStateStore } from "./draft-state-store.ts";
import type { DraftCardSummary, DraftCoachRecommendationView } from "./components/types.ts";

export type DraftCoachPayload = {
  input: UIDraftInput;
  recommendations: DraftCoachRecommendationView[];
};

export type DraftFeedbackPayloadInput = {
  input: UIDraftInput;
  recommendationCardIds?: string[];
  recommendations?: DraftCoachRecommendationView[];
  modelTopCardId: string;
  userSelectedCardId: string;
  possibleCauses?: DraftFeedbackPossibleCause[];
  note?: string;
};

export type DraftCardSearchOptions = {
  query: string;
  type: DraftScoringInput["draftCardType"];
  limit?: number;
};

export type DraftCoachUiAdapter = {
  loadStoredDraftInput(): Promise<UIDraftInput | null>;
  saveDraftInput(input: UIDraftInput): Promise<void>;
  loadSample(): Promise<DraftCoachPayload>;
  requestRecommendations(input: UIDraftInput): Promise<DraftCoachPayload>;
  submitFeedback(input: DraftFeedbackPayloadInput): Promise<DraftFeedbackPostResponse>;
  resolvePick(
    input: UIDraftInput,
    selectedCardId: string,
    options?: { modelTopCardId?: string }
  ): Promise<DraftPickResolutionResult>;
  canResolvePick(input: UIDraftInput, selectedCardId: string): boolean;
  pushUndoSnapshot(input: UIDraftInput): Promise<void>;
  popUndoSnapshot(): Promise<UIDraftInput | null>;
  peekUndoSnapshot(): Promise<UIDraftInput | null>;
  searchCards(options: DraftCardSearchOptions): Promise<DraftCardSummary[]>;
};

export const DRAFT_COACH_ENDPOINTS = {
  sample: "/api/draft/sample",
  cards: "/api/cards",
  recommend: "/api/draft/recommend",
  feedback: "/api/draft/feedback"
} as const;

export const defaultDraftCoachAdapter: DraftCoachUiAdapter = Object.freeze({
  async loadStoredDraftInput() {
    return DraftStateStore.load();
  },

  async saveDraftInput(input) {
    const result = DraftStateStore.save(input);
    if (!result.ok) throw new Error(result.errors.join(" "));
  },

  async loadSample() {
    const payload = await fetchJson<DraftSampleGetResponse>(DRAFT_COACH_ENDPOINTS.sample);
    return {
      input: normalizeDraftInput(payload.input, { sample: payload }),
      recommendations: payload.recommendations
    };
  },

  async requestRecommendations(input) {
    const payload = await fetchJson<DraftRecommendPostResponse>(DRAFT_COACH_ENDPOINTS.recommend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRecommendPostBody(input))
    });

    return {
      input: normalizeDraftInput(
        input.skillLevel === undefined ? payload.input : { ...payload.input, skillLevel: input.skillLevel }
      ),
      recommendations: payload.recommendations
    };
  },

  async submitFeedback(input) {
    return fetchJson<DraftFeedbackPostResponse>(DRAFT_COACH_ENDPOINTS.feedback, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildFeedbackPayload(input))
    });
  },

  async resolvePick(input, selectedCardId, options = {}) {
    return DraftPickResolution.resolvePick(input, selectedCardId, options);
  },

  canResolvePick(input, selectedCardId) {
    return DraftPickResolution.canResolvePick(input, selectedCardId);
  },

  async pushUndoSnapshot(input) {
    const result = DraftStateStore.pushUndo(input);
    if (!result.ok) throw new Error(result.errors.join(" "));
  },

  async popUndoSnapshot() {
    return DraftStateStore.popUndo();
  },

  async peekUndoSnapshot() {
    return DraftStateStore.peekUndo();
  },

  async searchCards({ query, type, limit = 8 }) {
    const url = new URL(DRAFT_COACH_ENDPOINTS.cards, getOrigin());
    url.searchParams.set("q", query);
    url.searchParams.set("type", type);
    url.searchParams.set("limit", String(limit));

    const payload = await fetchJson<{ cards?: DraftCardSummary[] }>(url.toString());
    return Array.isArray(payload.cards) ? payload.cards : [];
  }
});

export function buildFeedbackPayload(input: DraftFeedbackPayloadInput): DraftFeedbackPostBody {
  const note = input.note?.trim();
  const recommendationCardIds =
    input.recommendationCardIds ??
    input.recommendations?.map((recommendation) => recommendation.cardId) ??
    [];
  const payload: DraftFeedbackPostBody = {
    id: createUiEventId(),
    eventType: "model_user_disagreement",
    occurredAt: new Date().toISOString(),
    input: buildScoringInput(input.input),
    recommendationCardIds,
    modelTopCardId: input.modelTopCardId,
    userSelectedCardId: input.userSelectedCardId,
    reviewState: "unreviewed",
    possibleCauses: input.possibleCauses ?? ["pilot_user_preference"]
  };

  if (note) payload.note = note;
  return payload;
}

export function createEmptyDraftCoachPayload(): DraftCoachPayload {
  return {
    input: createDefaultDraftInput(),
    recommendations: []
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await responseErrorMessage(response));
  return (await response.json()) as T;
}

async function responseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  } catch {
    // Fall through to the HTTP status text.
  }

  return response.statusText || `HTTP ${response.status}`;
}

function createUiEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ui-${crypto.randomUUID()}`;
  }

  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getOrigin(): string {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}
