import type { UIDraftInput } from "../contract-adapter.ts";
import type { DraftCoachRecommendationView } from "./types";

type FeedbackPanelProps = {
  input: UIDraftInput;
  recommendations: DraftCoachRecommendationView[];
  selectedCardId: string | null;
  feedbackNote: string;
  feedbackStatus: string;
  canResolvePick: boolean;
  feedbackBusy: boolean;
  cardNameById: (cardId: string) => string;
  onFeedbackNoteChange: (note: string) => void;
  onSubmitFeedback: () => void;
  onOpenResolve: () => void;
};

export function FeedbackPanel({
  input,
  recommendations,
  selectedCardId,
  feedbackNote,
  feedbackStatus,
  canResolvePick,
  feedbackBusy,
  cardNameById,
  onFeedbackNoteChange,
  onSubmitFeedback,
  onOpenResolve
}: FeedbackPanelProps) {
  const modelTopCardId = recommendations[0]?.cardId;
  const canSubmitFeedback = Boolean(modelTopCardId && selectedCardId && modelTopCardId !== selectedCardId && !feedbackBusy);

  return (
    <section className="tool-panel feedback-panel" aria-labelledby="feedbackHeading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">픽 확정</p>
          <h2 id="feedbackHeading">선택과 복기</h2>
        </div>
      </div>

      <div className="resolution-block">
        <dl className="feedback-summary">
          <div>
            <dt>모델 1순위</dt>
            <dd id="modelTopCard">{modelTopCardId ? cardDisplay(modelTopCardId, cardNameById) : "-"}</dd>
          </div>
          <div>
            <dt>내 선택</dt>
            <dd id="selectedCard">{selectedCardId ? cardDisplay(selectedCardId, cardNameById) : "-"}</dd>
          </div>
        </dl>
        <button
          className="primary-button full-width"
          id="resolvePickButton"
          type="button"
          disabled={!canResolvePick}
          onClick={onOpenResolve}
        >
          선택 카드로 픽 확정
        </button>
        <p className="feedback-hint" id="resolutionHint">
          {resolutionHint(recommendations.length, modelTopCardId, selectedCardId)}
        </p>
      </div>

      <div className="side-section" id="handSummary" aria-labelledby="handSummaryHeading">
        <div className="group-heading">
          <div className="section-title" id="handSummaryHeading">
            내 손패 진단
          </div>
          <div className="section-count" id="pickedSummaryCount">
            {input.pickedCardIds.length}장
          </div>
        </div>
        <div className="compact-stack">
          {input.pickedCardIds.length === 0 ? (
            <div className="empty-state">집은 카드 없음</div>
          ) : (
            input.pickedCardIds.map((cardId, index) => (
              <div className="summary-card" key={cardId}>
                <div className="summary-card-title">
                  {index + 1}. {cardNameById(cardId)}
                </div>
                <div className="summary-card-text">{cardId}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="side-section" id="memorySummary" aria-labelledby="memorySummaryHeading">
        <div className="group-heading">
          <div className="section-title" id="memorySummaryHeading">
            메모리 트래커
          </div>
          <div className="section-count" id="memorySummaryCount">
            {input.seenCardIds.length + input.passedCardIds.length} 기록
          </div>
        </div>
        <div className="compact-stack">
          <div className="summary-card is-dark">
            <div className="summary-card-title">본 카드</div>
            <div className="summary-card-text">{input.seenCardIds.length ? input.seenCardIds.join(", ") : "없음"}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">넘긴 카드</div>
            <div className="summary-card-text">{input.passedCardIds.length ? input.passedCardIds.join(", ") : "없음"}</div>
          </div>
        </div>
      </div>

      <form
        className="side-section"
        id="feedbackForm"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitFeedback();
        }}
      >
        <label className="field-label" htmlFor="feedbackNote">
          메모
        </label>
        <textarea
          id="feedbackNote"
          rows={3}
          placeholder="선택 이유나 화면 밖 정보를 짧게 기록"
          value={feedbackNote}
          onChange={(event) => onFeedbackNoteChange(event.target.value)}
        />

        <p className="feedback-hint" id="feedbackHint">
          {feedbackHint(modelTopCardId, selectedCardId)}
        </p>
        <button
          className="primary-button full-width"
          id="submitFeedbackButton"
          type="submit"
          disabled={!canSubmitFeedback}
        >
          차이만 기록
        </button>
        <div className="inline-status feedback-status" id="feedbackStatus" role="status" aria-live="polite">
          {feedbackStatus}
        </div>
      </form>
    </section>
  );
}

function resolutionHint(recommendationCount: number, modelTopCardId: string | undefined, selectedCardId: string | null) {
  if (recommendationCount === 0) return "추천 결과를 기다리는 중입니다.";
  if (!selectedCardId) return "추천 카드 중 하나를 선택하면 픽을 확정할 수 있습니다.";
  if (modelTopCardId === selectedCardId) return "추천 1순위와 같은 선택입니다. 확정하면 다음 픽으로 넘어갑니다.";
  return "추천과 다른 선택입니다. 확정 중 중립 피드백 이벤트로 보존합니다.";
}

function feedbackHint(modelTopCardId: string | undefined, selectedCardId: string | null) {
  if (!modelTopCardId) return "추천 결과를 기다리는 중입니다.";
  if (!selectedCardId) return "확정할 카드를 선택하세요.";
  if (modelTopCardId === selectedCardId) return "추천과 다른 카드를 선택하면 차이를 기록할 수 있습니다.";
  return "모델 추천과 다른 선택을 neutral disagreement로 기록합니다.";
}

function cardDisplay(cardId: string, cardNameById: (cardId: string) => string): string {
  return `${cardNameById(cardId)} (${cardId})`;
}
