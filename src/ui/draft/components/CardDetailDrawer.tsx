"use client";

import { useEffect } from "react";
import type { CardDetailStrategyRole } from "../../../app/card-detail-api.ts";
import type { DraftCardDetail } from "../draftCoachAdapter.ts";
import { DRAFT_CARD_TYPE_LABELS } from "./labels";

type CardDetailDrawerProps = {
  isOpen: boolean;
  cardId: string | null;
  detail: DraftCardDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
};

export function CardDetailDrawer({
  isOpen,
  cardId,
  detail,
  loading,
  error,
  onClose
}: CardDetailDrawerProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="card-detail-backdrop"
      id="cardDetailDrawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cardDetailTitle"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside className="card-detail-drawer" aria-busy={loading}>
        <div className="card-detail-header">
          <div>
            <p className="eyebrow">카드 상세</p>
            <h2 className="card-detail-name" id="cardDetailTitle">
              {detailName(detail, cardId)}
            </h2>
            <p className="card-detail-english-name">{englishName(detail, cardId)}</p>
          </div>
          <button
            className="secondary-button"
            id="closeCardDetailButton"
            type="button"
            aria-label="카드 상세 닫기"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="card-detail-body">
          {loading ? (
            <div className="empty-state">카드 상세를 불러오는 중</div>
          ) : error ? (
            <div className="empty-state is-error">{error}</div>
          ) : detail ? (
            <CardDetailContent detail={detail} />
          ) : (
            <div className="empty-state">카드가 선택되지 않았습니다.</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function CardDetailContent({ detail }: { detail: DraftCardDetail }) {
  const { card, translation, stat, strategyProfile, strategyRoles, cardPoolStatus } = detail;
  const explanation = profileExplanation(strategyProfile);

  return (
    <>
      <section className="card-detail-section" aria-label="카드 기본 정보">
        <div className="card-detail-grid">
          <DetailField className="card-detail-type" label="타입" value={cardTypeLabel(card.type)} />
          <DetailField className="card-detail-deck" label="덱" value={joinValues(card.decks)} />
          <DetailField className="card-detail-arena-status" label="Arena" value={arenaLabel(strategyProfile, cardPoolStatus)} />
          <DetailField className="card-detail-tier" label="티어" value={stat?.tier ?? "없음"} />
          <DetailField className="card-detail-rank" label="Rank" value={formatMetric(stat?.rank)} />
        </div>
      </section>

      <section className="card-detail-section" aria-label="카드 본문">
        <h3>Card Body</h3>
        <p className="card-detail-text">{translation?.shortText ?? "텍스트 큐레이션 준비 중"}</p>
        <dl className="card-detail-grid">
          <DetailField className="card-detail-effect" label="효과" value={translation?.effectText ?? translation?.shortText ?? "없음"} />
          <DetailField className="card-detail-cost" label="비용" value={card.costRaw ?? "없음"} />
          <DetailField className="card-detail-condition" label="조건" value={card.prerequisiteRaw ?? "없음"} />
          <DetailField className="card-detail-victory-points" label="승점" value={formatMetric(card.victoryPoints)} />
          <DetailField className="card-detail-player-count" label="플레이어 수" value={playerCountLabel(card.playerCount)} />
        </dl>
        {translation?.rulesNotes?.length ? (
          <ul className="card-detail-note-list">
            {translation.rulesNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card-detail-section card-detail-stats" id="cardDetailStats" aria-label="통계">
        <h3>Stats</h3>
        <dl className="card-detail-stat-grid">
          <DetailField className="card-detail-pwr" label="PWR" value={formatMetric(stat?.pwr)} />
          <DetailField className="card-detail-wtd-pwr" label="WtdPWR" value={formatMetric(stat?.wtdPwr)} />
          <DetailField className="card-detail-adp" label="ADP" value={formatMetric(stat?.adp)} />
          <DetailField className="card-detail-apr" label="APR" value={formatMetric(stat?.apr)} />
          <DetailField className="card-detail-deals" label="Deals" value={formatMetric(stat?.deals)} />
          <DetailField className="card-detail-drafted" label="Drafted" value={formatMetric(stat?.drafted)} />
          <DetailField className="card-detail-plays" label="Plays" value={formatMetric(stat?.plays)} />
          <DetailField className="card-detail-w-hand" label="W-Hand" value="데이터 준비 중" />
          <DetailField className="card-detail-w-play" label="W-Play" value="데이터 준비 중" />
          <DetailField className="card-detail-elo-play" label="Elo/Play" value="데이터 준비 중" />
        </dl>
      </section>

      <section
        className="card-detail-section card-detail-strategy-profile"
        id="cardDetailStrategyProfile"
        aria-label="전략 프로필"
      >
        <h3>Strategy Profile</h3>
        <div className="card-detail-chip-list card-detail-roles">
          {strategyRoles.length === 0 ? (
            <span className="chip is-muted">전략 역할 없음</span>
          ) : (
            strategyRoles.map((role) => <span className="chip" key={role.id}>{roleLabel(role)}</span>)
          )}
        </div>
        <dl className="card-detail-grid">
          <DetailField className="card-detail-broken" label="Broken" value={strategyProfile?.isBroken ? "예" : "아니오"} />
          <DetailField className="card-detail-plan-anchor" label="Plan Anchor" value={strategyProfile?.isPlanAnchor ? "예" : "아니오"} />
          <DetailField className="card-detail-sequence" label="운영 시퀀스" value={timingLabel(strategyProfile?.timingWindow)} />
          <DetailField className="card-detail-confidence" label="신뢰도" value={strategyProfile?.confidence ?? "없음"} />
        </dl>
        {explanation ? <p className="card-detail-text">{explanation}</p> : null}
        <TagRow className="card-detail-solves" label="해결" values={strategyProfile?.solves} />
        <TagRow className="card-detail-needs" label="추가 요구" values={strategyProfile?.increasesNeedFor} />
        <TagRow className="card-detail-saturation" label="중복 감점" values={strategyProfile?.saturationPenaltyTo} />
        <TagRow className="card-detail-synergy" label="시너지" values={strategyProfile?.synergyWith} />
        <TagRow className="card-detail-conflicts" label="충돌" values={strategyProfile?.conflictsWith} />
        <TagRow className="card-detail-risks" label="리스크" values={strategyProfile?.riskTags} />
        <TagRow className="card-detail-next-pick" label="다음 픽" values={strategyProfile?.nextPickGuidance?.["ko-KR"]} />
      </section>

      <section className="card-detail-section" aria-label="해석">
        <h3>Interpretation</h3>
        <ul className="card-detail-note-list">
          {detail.interpretation.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {detail.sourceAttributions.length > 0 ? (
        <section className="card-detail-section card-detail-sources" aria-label="Sources">
          <h3>Sources</h3>
          <ul className="card-detail-note-list">
            {detail.sourceAttributions.map((source) => (
              <li key={source.sourceRef}>
                {source.sourceUrl ? (
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                    {sourceAttributionText(source)}
                  </a>
                ) : (
                  sourceAttributionText(source)
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function DetailField({
  className,
  label,
  value
}: {
  className: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className={`card-detail-field ${className}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TagRow({
  className,
  label,
  values
}: {
  className: string;
  label: string;
  values: string[] | undefined;
}) {
  return (
    <div className={`card-detail-tag-row ${className}`}>
      <div className="card-detail-tag-label">{label}</div>
      <div className="card-detail-chip-list">
        {values && values.length > 0 ? (
          values.map((value) => <span className="footer-pill" key={value}>{value}</span>)
        ) : (
          <span className="footer-pill is-muted">없음</span>
        )}
      </div>
    </div>
  );
}

function detailName(detail: DraftCardDetail | null, cardId: string | null): string {
  return detail?.translation?.name ?? detail?.card.id ?? cardId ?? "카드 상세";
}

function englishName(detail: DraftCardDetail | null, cardId: string | null): string {
  return (
    detail?.translation?.aliases[0] ??
    detail?.translation?.officialName ??
    detail?.translation?.bgaName ??
    detail?.card.id ??
    cardId ??
    ""
  );
}

function cardTypeLabel(type: DraftCardDetail["card"]["type"]): string {
  if (type === "occupation" || type === "minor_improvement") return DRAFT_CARD_TYPE_LABELS[type];
  if (type === "major_improvement") return "주요설비";
  return type;
}

function arenaLabel(
  profile: DraftCardDetail["strategyProfile"],
  cardPoolStatus: DraftCardDetail["cardPoolStatus"]
): string {
  if (profile?.arenaActive === true) return "활성";
  if (profile?.arenaActive === false) return "비활성";
  return cardPoolStatus ?? "미확인";
}

function formatMetric(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "없음";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function playerCountLabel(playerCount: number[] | undefined): string {
  if (playerCount === undefined || playerCount.length === 0) return "제한 없음";
  return playerCount.map((count) => `${count}인`).join(", ");
}

function joinValues(values: string[]): string {
  return values.length === 0 ? "없음" : values.join(", ");
}

function roleLabel(role: CardDetailStrategyRole): string {
  return role.labels["ko-KR"] ?? role.labels.en ?? role.id;
}

function timingLabel(value: NonNullable<DraftCardDetail["strategyProfile"]>["timingWindow"] | undefined): string {
  if (value === "early") return "초반";
  if (value === "mid") return "중반";
  if (value === "late") return "후반";
  if (value === "anytime") return "상시";
  return "없음";
}

function profileExplanation(profile: DraftCardDetail["strategyProfile"]): string {
  return (
    profile?.explanation?.standard?.["ko-KR"] ??
    profile?.explanation?.compact?.["ko-KR"] ??
    profile?.explanation?.deep?.["ko-KR"] ??
    ""
  );
}

function sourceAttributionText(source: DraftCardDetail["sourceAttributions"][number]): string {
  return source.attributionTextKo ?? source.label;
}
