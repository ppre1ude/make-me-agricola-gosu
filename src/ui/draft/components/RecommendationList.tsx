import type { DraftWarning, ExplanationDepth } from "../../../features/draft/index.ts";
import {
  CANDIDATE_GROUP_LABELS,
  CONFIDENCE_LABELS,
  DRAFT_PICK_BAND_LABELS,
  EVALUATION_METHOD_LABELS,
  MISSING_DATA_LABELS,
  RETURN_LIKELIHOOD_LABELS
} from "./labels";
import type { DraftCoachRecommendationView } from "./types";

type RecommendationListProps = {
  recommendations: DraftCoachRecommendationView[];
  selectedCardId: string | null;
  explanationDepth: ExplanationDepth;
  statusText: string;
  onSelectCard: (cardId: string) => void;
};

export function RecommendationList({
  recommendations,
  selectedCardId,
  explanationDepth,
  statusText,
  onSelectCard
}: RecommendationListProps) {
  return (
    <section className="tool-panel recommendations-panel" aria-labelledby="recommendationsHeading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">추천 결과</p>
          <h2 id="recommendationsHeading">추천 순위</h2>
        </div>
        <div className="inline-status" id="recommendationStatus" role="status" aria-live="polite">
          {statusText}
        </div>
      </div>

      <div className="recommendation-list" id="recommendations">
        {recommendations.length === 0 ? (
          <div className="empty-state">추천 결과가 없습니다.</div>
        ) : (
          recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.cardId}
              recommendation={recommendation}
              isTop={index === 0}
              isSelected={selectedCardId === recommendation.cardId}
              explanationDepth={explanationDepth}
              onSelectCard={onSelectCard}
            />
          ))
        )}
      </div>
    </section>
  );
}

function RecommendationCard({
  recommendation,
  isTop,
  isSelected,
  explanationDepth,
  onSelectCard
}: {
  recommendation: DraftCoachRecommendationView;
  isTop: boolean;
  isSelected: boolean;
  explanationDepth: ExplanationDepth;
  onSelectCard: (cardId: string) => void;
}) {
  const cardName = recommendation.cardNameKo ?? recommendation.cardName ?? recommendation.cardId;
  const reasons = selectReasons(recommendation, explanationDepth);
  const cardClassName = ["recommendation-card", isTop ? "is-top" : "", isSelected ? "is-selected" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={cardClassName} data-card-id={recommendation.cardId}>
      <input
        className="recommendation-radio"
        type="radio"
        name="selectedCardId"
        value={recommendation.cardId}
        checked={isSelected}
        onChange={() => onSelectCard(recommendation.cardId)}
      />
      <div className="recommendation-header">
        <div className="rank-badge">#{recommendation.rank}</div>
        <div className="card-title">
          <h3>{cardName}</h3>
          <p className="card-id">{recommendation.cardId}</p>
        </div>
        <div className="score-box">
          <div className="score-value">{formatScore(recommendation.score)}</div>
          <div className="score-label">점수</div>
        </div>
      </div>

      <div className="chip-list">
        {recommendation.candidateGroups.length === 0 ? (
          <span className="chip is-muted">후보군 없음</span>
        ) : (
          recommendation.candidateGroups.map((group) => (
            <span className="chip" title={group} key={group}>
              {CANDIDATE_GROUP_LABELS[group]}
            </span>
          ))
        )}
      </div>

      <div>
        {reasons.length === 0 ? (
          <p className="muted-line">근거 없음</p>
        ) : (
          <ul className="reason-list">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        <RiskAndWarningLists risks={recommendation.risks} warnings={recommendation.warnings} />
        <DirectionList
          nextPickDirection={recommendation.nextPickDirection}
          planShiftHints={recommendation.planShiftHints.map((hint) => hint.message)}
        />
      </div>

      <div className="recommendation-footer">
        <span className="footer-pill">{DRAFT_PICK_BAND_LABELS[recommendation.draftPickBand]}</span>
        <span className="footer-pill">{RETURN_LIKELIHOOD_LABELS[recommendation.returnLikelihood]}</span>
        <span className="footer-pill">{CONFIDENCE_LABELS[recommendation.evaluationMeta.confidence]}</span>
        <span className="footer-pill">{EVALUATION_METHOD_LABELS[recommendation.evaluationMeta.method]}</span>
        {recommendation.evaluationMeta.missingData.map((missingData) => (
          <span className="footer-pill" key={missingData}>
            {MISSING_DATA_LABELS[missingData]}
          </span>
        ))}
      </div>
    </label>
  );
}

function RiskAndWarningLists({ risks, warnings }: { risks: string[]; warnings: DraftWarning[] }) {
  return (
    <>
      {risks.length > 0 && (
        <ul className="alert-list is-risk">
          {risks.map((risk) => (
            <li key={risk}>리스크: {risk}</li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="alert-list is-warning">
          {warnings.map((warning) => (
            <li key={`${warning.code}:${warning.message}`}>경고: {warning.message || warning.code}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function DirectionList({
  nextPickDirection,
  planShiftHints
}: {
  nextPickDirection: string[];
  planShiftHints: string[];
}) {
  if (nextPickDirection.length === 0 && planShiftHints.length === 0) return null;

  return (
    <ul className="direction-list">
      {nextPickDirection.map((direction) => (
        <li key={`next:${direction}`}>다음 픽: {direction}</li>
      ))}
      {planShiftHints.map((hint) => (
        <li key={`shift:${hint}`}>전환: {hint}</li>
      ))}
    </ul>
  );
}

function selectReasons(recommendation: DraftCoachRecommendationView, depth: ExplanationDepth): string[] {
  return (
    recommendation.reasons[depth] ??
    recommendation.reasons.standard ??
    recommendation.reasons.compact ??
    recommendation.reasons.deep ??
    []
  );
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.round(value * 10) / 10);
}
