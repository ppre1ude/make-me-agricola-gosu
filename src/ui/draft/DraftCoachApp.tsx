"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DraftFeedbackPossibleCause } from "../../features/draft/index.ts";
import { createDefaultDraftInput, type UIDraftInput } from "./contract-adapter.ts";
import {
  defaultDraftCoachAdapter,
  type DraftCardDetail,
  type DraftCoachUiAdapter
} from "./draftCoachAdapter.ts";
import { CardDetailDrawer } from "./components/CardDetailDrawer";
import { DraftStatePanel } from "./components/DraftStatePanel";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { PickConfirmModal } from "./components/PickConfirmModal";
import { RecommendationList } from "./components/RecommendationList";
import { TopBar } from "./components/TopBar";
import type {
  DraftCardGroupConfig,
  DraftCardSearchState,
  DraftCardSummary,
  DraftCoachRecommendationView,
  DraftStatusTone
} from "./components/types";

type DraftCoachAppProps = {
  adapter?: DraftCoachUiAdapter;
};

type DraftRequestState = {
  appStatus: string;
  appStatusTone: DraftStatusTone;
  recommendationStatus: string;
  feedbackStatus: string;
  requestBusy: boolean;
  feedbackBusy: boolean;
  resolveBusy: boolean;
};

const DEFAULT_INPUT = createDefaultDraftInput();

const CARD_GROUPS: DraftCardGroupConfig[] = [
  {
    key: "offered",
    label: "보이는 카드",
    inputKey: "offeredCardIds",
    listId: "offeredCards",
    searchId: "offeredCardSearch",
    resultsId: "offeredCardResults",
    addButtonId: "addOfferedCardButton",
    countId: "offeredCardsCount",
    emptyText: "보이는 카드 없음",
    variant: "card"
  },
  {
    key: "picked",
    label: "집은 카드",
    inputKey: "pickedCardIds",
    listId: "pickedCards",
    searchId: "pickedCardSearch",
    resultsId: "pickedCardResults",
    addButtonId: "addPickedCardButton",
    countId: "pickedCardsCount",
    emptyText: "없음",
    variant: "token"
  },
  {
    key: "seen",
    label: "본 카드",
    inputKey: "seenCardIds",
    listId: "seenCards",
    searchId: "seenCardSearch",
    resultsId: "seenCardResults",
    addButtonId: "addSeenCardButton",
    countId: "seenCardsCount",
    emptyText: "없음",
    variant: "token"
  },
  {
    key: "passed",
    label: "넘긴 카드",
    inputKey: "passedCardIds",
    listId: "passedCards",
    searchId: "passedCardSearch",
    resultsId: "passedCardResults",
    addButtonId: "addPassedCardButton",
    countId: "passedCardsCount",
    emptyText: "없음",
    variant: "token"
  }
];

const CARD_GROUP_KEYS = ["offered", "picked", "seen", "passed"] as const;

export function DraftCoachApp({ adapter }: DraftCoachAppProps) {
  const activeAdapter = adapter ?? defaultDraftCoachAdapter;
  const [input, setInput] = useState<UIDraftInput>(DEFAULT_INPUT);
  const [recommendations, setRecommendations] = useState<DraftCoachRecommendationView[]>([]);
  const [cardSearchByGroup, setCardSearchByGroup] = useState(createCardSearchByGroup);
  const [cardNameCatalog, setCardNameCatalog] = useState<Record<string, string>>({});
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [cardDetail, setCardDetail] = useState<DraftCardDetail | null>(null);
  const [cardDetailLoading, setCardDetailLoading] = useState(false);
  const [cardDetailError, setCardDetailError] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [requestState, setRequestState] = useState<DraftRequestState>({
    appStatus: "초기화",
    appStatusTone: "busy",
    recommendationStatus: "저장된 입력을 확인하는 중",
    feedbackStatus: "",
    requestBusy: true,
    feedbackBusy: false,
    resolveBusy: false
  });
  const searchRequestIdsRef = useRef<Record<DraftCardGroupConfig["key"], number>>(createSearchRequestIds());
  const searchDebounceIdsRef = useRef<Record<DraftCardGroupConfig["key"], ReturnType<typeof setTimeout> | null>>(
    createSearchDebounceIds()
  );
  const cardDetailRequestIdRef = useRef(0);

  const cardNames = useMemo(
    () => buildCardNameMap(cardNameCatalog, recommendations),
    [cardNameCatalog, recommendations]
  );
  const modelTopCardId = recommendations[0]?.cardId;
  const selectedCardLabel = selectedCardId ? cardDisplay(selectedCardId, cardNames) : "";
  const canResolvePick = Boolean(selectedCardId && activeAdapter.canResolvePick(input, selectedCardId));

  useEffect(() => {
    let cancelled = false;

    async function startApp() {
      setBusyRequest("초기화", "저장된 입력을 확인하는 중");
      try {
        const restoredInput = await activeAdapter.loadStoredDraftInput();
        if (cancelled) return;

        if (restoredInput) {
          setInput(restoredInput);
          setRecommendations([]);
          setSelectedCardId(null);
          setRequestState((current) => ({
            ...current,
            appStatus: "준비됨",
            appStatusTone: "ready",
            recommendationStatus: "저장된 입력을 불러왔습니다.",
            requestBusy: false
          }));
          await refreshUndoAvailability();
          if (restoredInput.offeredCardIds.length > 0) {
            await requestRecommendations(restoredInput);
          }
          return;
        }

        await loadSample();
      } catch (error) {
        if (cancelled) return;
        setRequestState((current) => ({
          ...current,
          appStatus: "오류",
          appStatusTone: "error",
          recommendationStatus: errorMessage(error, "초기 입력을 불러오지 못했습니다."),
          requestBusy: false
        }));
      }
    }

    void startApp();
    return () => {
      cancelled = true;
    };
  }, [activeAdapter]);

  useEffect(() => () => clearAllSearchTimers(), []);

  async function loadSample() {
    setBusyRequest("샘플 로딩", "샘플을 불러오는 중");
    try {
      const payload = await activeAdapter.loadSample();
      rememberRecommendationNames(payload.recommendations);
      setInput(payload.input);
      setRecommendations(payload.recommendations);
      setSelectedCardId(payload.recommendations[0]?.cardId ?? null);
      await activeAdapter.saveDraftInput(payload.input);
      await refreshUndoAvailability();
      setRequestState((current) => ({
        ...current,
        appStatus: "준비됨",
        appStatusTone: "ready",
        recommendationStatus: `${payload.recommendations.length}개 카드 평가`,
        requestBusy: false,
        feedbackStatus: ""
      }));
    } catch (error) {
      setInput(DEFAULT_INPUT);
      setRecommendations([]);
      setSelectedCardId(null);
      setRequestState((current) => ({
        ...current,
        appStatus: "오류",
        appStatusTone: "error",
        recommendationStatus: errorMessage(error, "샘플을 불러오지 못했습니다."),
        requestBusy: false
      }));
    }
  }

  async function requestRecommendations(nextInput = input) {
    if (nextInput.offeredCardIds.length === 0) {
      setRequestState((current) => ({
        ...current,
        recommendationStatus: "보이는 카드를 먼저 추가하세요."
      }));
      return;
    }

    setBusyRequest("추천 계산", "추천을 요청하는 중");
    try {
      const payload = await activeAdapter.requestRecommendations(nextInput);
      rememberRecommendationNames(payload.recommendations);
      setInput(payload.input);
      setRecommendations(payload.recommendations);
      setSelectedCardId(payload.recommendations[0]?.cardId ?? null);
      await activeAdapter.saveDraftInput(payload.input);
      setRequestState((current) => ({
        ...current,
        appStatus: "준비됨",
        appStatusTone: "ready",
        recommendationStatus: `${payload.recommendations.length}개 카드 평가`,
        requestBusy: false,
        feedbackStatus: ""
      }));
    } catch (error) {
      setRecommendations([]);
      setSelectedCardId(null);
      setRequestState((current) => ({
        ...current,
        appStatus: "오류",
        appStatusTone: "error",
        recommendationStatus: errorMessage(error, "추천을 가져오지 못했습니다."),
        requestBusy: false
      }));
    }
  }

  async function updateInput(nextInput: UIDraftInput) {
    const draftCardTypeChanged = nextInput.draftCardType !== input.draftCardType;
    setInput(nextInput);
    setRecommendations([]);
    setSelectedCardId(null);
    if (draftCardTypeChanged) resetAllCardSearches();
    await activeAdapter.saveDraftInput(nextInput);
    setRequestState((current) => ({
      ...current,
      appStatus: "저장됨",
      appStatusTone: "ready",
      recommendationStatus: "입력이 바뀌었습니다. 추천 갱신을 누르세요.",
      feedbackStatus: "",
      requestBusy: false
    }));
  }

  function addCard(groupKey: DraftCardGroupConfig["key"], cardId: string) {
    const group = CARD_GROUPS.find((candidate) => candidate.key === groupKey);
    if (!group) return;
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) return;

    const currentCardIds = input[group.inputKey];
    if (currentCardIds.includes(normalizedCardId)) return;

    resetCardSearch(groupKey);
    void updateInput({
      ...input,
      [group.inputKey]: [...currentCardIds, normalizedCardId]
    });
  }

  function removeCard(groupKey: DraftCardGroupConfig["key"], cardId: string) {
    const group = CARD_GROUPS.find((candidate) => candidate.key === groupKey);
    if (!group) return;

    void updateInput({
      ...input,
      [group.inputKey]: input[group.inputKey].filter((currentCardId) => currentCardId !== cardId)
    });
  }

  function updateCardSearch(groupKey: DraftCardGroupConfig["key"], query: string) {
    const requestId = searchRequestIdsRef.current[groupKey] + 1;
    searchRequestIdsRef.current[groupKey] = requestId;
    clearSearchTimer(groupKey);

    const trimmedQuery = query.trim();
    setCardSearchByGroup((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        query,
        selectedCardId: null,
        error: "",
        loading: Boolean(trimmedQuery),
        results: trimmedQuery ? current[groupKey].results : []
      }
    }));

    if (!trimmedQuery) return;

    searchDebounceIdsRef.current[groupKey] = setTimeout(() => {
      void runCardSearch(groupKey, trimmedQuery, requestId);
    }, 180);
  }

  async function runCardSearch(
    groupKey: DraftCardGroupConfig["key"],
    query: string,
    requestId: number
  ) {
    try {
      const results = await activeAdapter.searchCards({
        query,
        type: input.draftCardType,
        limit: 8
      });
      if (searchRequestIdsRef.current[groupKey] !== requestId) return;

      rememberCardSummaries(results);
      setCardSearchByGroup((current) => ({
        ...current,
        [groupKey]: {
          ...current[groupKey],
          results,
          loading: false,
          error: "",
          selectedCardId: results[0]?.id ?? null
        }
      }));
    } catch (error) {
      if (searchRequestIdsRef.current[groupKey] !== requestId) return;
      setCardSearchByGroup((current) => ({
        ...current,
        [groupKey]: {
          ...current[groupKey],
          results: [],
          loading: false,
          selectedCardId: null,
          error: errorMessage(error, "카드를 검색하지 못했습니다.")
        }
      }));
    }
  }

  function selectSearchResult(groupKey: DraftCardGroupConfig["key"], cardId: string) {
    setCardSearchByGroup((current) => ({
      ...current,
      [groupKey]: {
        ...current[groupKey],
        selectedCardId: cardId
      }
    }));
  }

  async function openCardDetail(cardId: string) {
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) return;

    const requestId = cardDetailRequestIdRef.current + 1;
    cardDetailRequestIdRef.current = requestId;
    setDetailCardId(normalizedCardId);
    setCardDetail(null);
    setCardDetailError("");
    setCardDetailLoading(true);

    try {
      const detail = await activeAdapter.getCardDetail(normalizedCardId);
      if (cardDetailRequestIdRef.current !== requestId) return;
      rememberCardDetail(detail);
      setCardDetail(detail);
      setCardDetailError("");
    } catch (error) {
      if (cardDetailRequestIdRef.current !== requestId) return;
      setCardDetail(null);
      setCardDetailError(errorMessage(error, "카드 상세를 불러오지 못했습니다."));
    } finally {
      if (cardDetailRequestIdRef.current === requestId) setCardDetailLoading(false);
    }
  }

  function closeCardDetail() {
    cardDetailRequestIdRef.current += 1;
    setDetailCardId(null);
    setCardDetail(null);
    setCardDetailError("");
    setCardDetailLoading(false);
  }

  async function submitFeedback() {
    if (!modelTopCardId || !selectedCardId || modelTopCardId === selectedCardId) return;

    setRequestState((current) => ({ ...current, feedbackBusy: true, feedbackStatus: "피드백 전송 중" }));
    try {
      const feedbackPayload = {
        input,
        recommendationCardIds: recommendations.map((recommendation) => recommendation.cardId),
        modelTopCardId,
        userSelectedCardId: selectedCardId,
        possibleCauses: ["pilot_user_preference"] satisfies DraftFeedbackPossibleCause[]
      };
      const note = feedbackNote.trim();
      await activeAdapter.submitFeedback(note ? { ...feedbackPayload, note } : feedbackPayload);
      setFeedbackNote("");
      setRequestState((current) => ({ ...current, feedbackBusy: false, feedbackStatus: "기록 완료" }));
    } catch (error) {
      setRequestState((current) => ({
        ...current,
        feedbackBusy: false,
        feedbackStatus: errorMessage(error, "피드백을 기록하지 못했습니다.")
      }));
    }
  }

  async function confirmPick() {
    if (!selectedCardId || requestState.resolveBusy) return;

    setRequestState((current) => ({ ...current, resolveBusy: true }));

    const beforeRecommendations = recommendations.slice();
    const beforePickNumber = input.pickNumber;
    const resolveOptions = modelTopCardId === undefined ? {} : { modelTopCardId };
    let result;

    try {
      result = await activeAdapter.resolvePick(input, selectedCardId, resolveOptions);
      await activeAdapter.pushUndoSnapshot(result.before);
      setInput(result.after);
      setRecommendations([]);
      setSelectedCardId(null);
      setConfirmOpen(false);
      await activeAdapter.saveDraftInput(result.after);
    } catch (error) {
      setRequestState((current) => ({
        ...current,
        feedbackStatus: errorMessage(error, "픽을 확정할 수 없습니다."),
        resolveBusy: false
      }));
      return;
    }

    let feedbackStatus = result.feedbackNeeded
      ? "추천과 다른 선택을 중립 피드백으로 기록했습니다."
      : "추천과 같은 선택으로 확정했습니다.";

    try {
      if (result.feedbackNeeded && modelTopCardId) {
        const feedbackPayload = {
          input: result.before,
          recommendationCardIds: beforeRecommendations.map((recommendation) => recommendation.cardId),
          modelTopCardId,
          userSelectedCardId: selectedCardId,
          possibleCauses: ["pilot_user_preference"] satisfies DraftFeedbackPossibleCause[]
        };
        const note = resolutionNote.trim();
        await activeAdapter.submitFeedback(note ? { ...feedbackPayload, note } : feedbackPayload);
      }
    } catch (error) {
      feedbackStatus = errorMessage(error, "픽은 확정됐지만 피드백 기록은 실패했습니다.");
    }

    setResolutionNote("");
    setFeedbackNote("");
    await refreshUndoAvailability();
    setRequestState((current) => ({
      ...current,
      appStatus: "픽 확정됨",
      appStatusTone: "ready",
      recommendationStatus: `Pick ${beforePickNumber} 확정. 다음 팩을 입력하세요.`,
      feedbackStatus,
      resolveBusy: false
    }));
  }

  async function undoLastPick() {
    const snapshot = await activeAdapter.popUndoSnapshot();
    if (!snapshot) {
      await refreshUndoAvailability();
      setRequestState((current) => ({ ...current, appStatus: "Undo 없음", appStatusTone: "ready" }));
      return;
    }

    setInput(snapshot);
    setRecommendations([]);
    setSelectedCardId(null);
    await activeAdapter.saveDraftInput(snapshot);
    await refreshUndoAvailability();
    setRequestState((current) => ({
      ...current,
      appStatus: "되돌림",
      appStatusTone: "ready",
      recommendationStatus: "직전 픽 확정 전 상태로 되돌렸습니다.",
      feedbackStatus: "Undo는 로컬 입력만 되돌리며 피드백 기록은 수정하지 않습니다."
    }));
  }

  async function refreshUndoAvailability() {
    setCanUndo(Boolean(await activeAdapter.peekUndoSnapshot()));
  }

  function resetCardSearch(groupKey: DraftCardGroupConfig["key"]) {
    searchRequestIdsRef.current[groupKey] += 1;
    clearSearchTimer(groupKey);
    setCardSearchByGroup((current) => ({
      ...current,
      [groupKey]: createCardSearchState()
    }));
  }

  function resetAllCardSearches() {
    CARD_GROUP_KEYS.forEach((groupKey) => {
      searchRequestIdsRef.current[groupKey] += 1;
      clearSearchTimer(groupKey);
    });
    setCardSearchByGroup(createCardSearchByGroup());
  }

  function clearSearchTimer(groupKey: DraftCardGroupConfig["key"]) {
    const debounceId = searchDebounceIdsRef.current[groupKey];
    if (debounceId) clearTimeout(debounceId);
    searchDebounceIdsRef.current[groupKey] = null;
  }

  function clearAllSearchTimers() {
    CARD_GROUP_KEYS.forEach(clearSearchTimer);
  }

  function rememberCardSummaries(cards: readonly DraftCardSummary[]) {
    if (cards.length === 0) return;

    setCardNameCatalog((current) => {
      const next = { ...current };
      cards.forEach((card) => {
        next[card.id] = card.name;
      });
      return next;
    });
  }

  function rememberRecommendationNames(nextRecommendations: readonly DraftCoachRecommendationView[]) {
    if (nextRecommendations.length === 0) return;

    setCardNameCatalog((current) => {
      const next = { ...current };
      nextRecommendations.forEach((recommendation) => {
        next[recommendation.cardId] =
          recommendation.cardNameKo ?? recommendation.cardName ?? recommendation.cardId;
      });
      return next;
    });
  }

  function rememberCardDetail(detail: DraftCardDetail) {
    const name = detail.translation?.name ?? detail.card.id;
    setCardNameCatalog((current) => ({
      ...current,
      [detail.card.id]: name
    }));
  }

  function setBusyRequest(appStatus: string, recommendationStatus: string) {
    setRequestState((current) => ({
      ...current,
      appStatus,
      appStatusTone: "busy",
      recommendationStatus,
      requestBusy: true,
      feedbackStatus: ""
    }));
  }

  return (
    <div className="app-shell" data-surface="DraftMemoryCoach">
      <TopBar
        input={input}
        statusText={requestState.appStatus}
        statusTone={requestState.appStatusTone}
        canUndo={canUndo}
        onUndo={() => void undoLastPick()}
      />
      <main className="coach-layout">
        <DraftStatePanel
          input={input}
          cardGroups={CARD_GROUPS}
          cardSearchByGroup={cardSearchByGroup}
          cardNameById={(cardId) => cardDisplayName(cardId, cardNames)}
          canRecommend={input.offeredCardIds.length > 0}
          requestBusy={requestState.requestBusy}
          onLoadSample={() => void loadSample()}
          onRecommend={() => void requestRecommendations()}
          onInputChange={(nextInput) => void updateInput(nextInput)}
          onAddCard={addCard}
          onRemoveCard={removeCard}
          onCardSearchChange={updateCardSearch}
          onSelectSearchResult={selectSearchResult}
          onOpenCardDetail={(cardId) => void openCardDetail(cardId)}
        />
        <RecommendationList
          recommendations={recommendations}
          selectedCardId={selectedCardId}
          explanationDepth={input.explanationDepth}
          statusText={requestState.recommendationStatus}
          onSelectCard={setSelectedCardId}
          onOpenCardDetail={(cardId) => void openCardDetail(cardId)}
        />
        <FeedbackPanel
          input={input}
          recommendations={recommendations}
          selectedCardId={selectedCardId}
          feedbackNote={feedbackNote}
          feedbackStatus={requestState.feedbackStatus}
          canResolvePick={canResolvePick}
          feedbackBusy={requestState.feedbackBusy}
          cardNameById={(cardId) => cardDisplayName(cardId, cardNames)}
          onFeedbackNoteChange={setFeedbackNote}
          onSubmitFeedback={() => void submitFeedback()}
          onOpenResolve={() => {
            setResolutionNote(feedbackNote.trim());
            setConfirmOpen(true);
          }}
        />
      </main>
      <PickConfirmModal
        isOpen={confirmOpen}
        selectedCardLabel={selectedCardLabel}
        matchesModelTop={Boolean(modelTopCardId && selectedCardId === modelTopCardId)}
        resolutionNote={resolutionNote}
        resolveBusy={requestState.resolveBusy}
        onResolutionNoteChange={setResolutionNote}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void confirmPick()}
      />
      <CardDetailDrawer
        isOpen={detailCardId !== null}
        cardId={detailCardId}
        detail={cardDetail}
        loading={cardDetailLoading}
        error={cardDetailError}
        onClose={closeCardDetail}
      />
    </div>
  );
}

function buildCardNameMap(
  cardNameCatalog: Record<string, string>,
  recommendations: DraftCoachRecommendationView[]
): Map<string, string> {
  const cardNames = new Map(Object.entries(cardNameCatalog));
  for (const recommendation of recommendations) {
    cardNames.set(
      recommendation.cardId,
      recommendation.cardNameKo ?? recommendation.cardName ?? recommendation.cardId
    );
  }
  return cardNames;
}

function createCardSearchByGroup(): Record<DraftCardGroupConfig["key"], DraftCardSearchState> {
  return {
    offered: createCardSearchState(),
    picked: createCardSearchState(),
    seen: createCardSearchState(),
    passed: createCardSearchState()
  };
}

function createCardSearchState(): DraftCardSearchState {
  return {
    query: "",
    results: [],
    loading: false,
    error: "",
    selectedCardId: null
  };
}

function createSearchRequestIds(): Record<DraftCardGroupConfig["key"], number> {
  return {
    offered: 0,
    picked: 0,
    seen: 0,
    passed: 0
  };
}

function createSearchDebounceIds(): Record<DraftCardGroupConfig["key"], ReturnType<typeof setTimeout> | null> {
  return {
    offered: null,
    picked: null,
    seen: null,
    passed: null
  };
}

function cardDisplayName(cardId: string, cardNames: Map<string, string>): string {
  return cardNames.get(cardId) ?? cardId;
}

function cardDisplay(cardId: string, cardNames: Map<string, string>): string {
  return `${cardDisplayName(cardId, cardNames)} (${cardId})`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
