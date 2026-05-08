"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftFeedbackPossibleCause } from "../../features/draft/index.ts";
import { createDefaultDraftInput, type UIDraftInput } from "./contract-adapter.ts";
import {
  defaultDraftCoachAdapter,
  type DraftCoachUiAdapter
} from "./draftCoachAdapter.ts";
import { DraftStatePanel } from "./components/DraftStatePanel";
import { FeedbackPanel } from "./components/FeedbackPanel";
import { PickConfirmModal } from "./components/PickConfirmModal";
import { RecommendationList } from "./components/RecommendationList";
import { TopBar } from "./components/TopBar";
import type {
  DraftCardGroupConfig,
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

export function DraftCoachApp({ adapter }: DraftCoachAppProps) {
  const activeAdapter = adapter ?? defaultDraftCoachAdapter;
  const [input, setInput] = useState<UIDraftInput>(DEFAULT_INPUT);
  const [recommendations, setRecommendations] = useState<DraftCoachRecommendationView[]>([]);
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

  const cardNames = useMemo(() => buildCardNameMap(recommendations), [recommendations]);
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

  async function loadSample() {
    setBusyRequest("샘플 로딩", "샘플을 불러오는 중");
    try {
      const payload = await activeAdapter.loadSample();
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
    setInput(nextInput);
    setRecommendations([]);
    setSelectedCardId(null);
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
          cardNameById={(cardId) => cardDisplayName(cardId, cardNames)}
          canRecommend={input.offeredCardIds.length > 0}
          requestBusy={requestState.requestBusy}
          onLoadSample={() => void loadSample()}
          onRecommend={() => void requestRecommendations()}
          onInputChange={(nextInput) => void updateInput(nextInput)}
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
        <RecommendationList
          recommendations={recommendations}
          selectedCardId={selectedCardId}
          explanationDepth={input.explanationDepth}
          statusText={requestState.recommendationStatus}
          onSelectCard={setSelectedCardId}
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
    </div>
  );
}

function buildCardNameMap(recommendations: DraftCoachRecommendationView[]): Map<string, string> {
  const cardNames = new Map<string, string>();
  for (const recommendation of recommendations) {
    cardNames.set(
      recommendation.cardId,
      recommendation.cardNameKo ?? recommendation.cardName ?? recommendation.cardId
    );
  }
  return cardNames;
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
