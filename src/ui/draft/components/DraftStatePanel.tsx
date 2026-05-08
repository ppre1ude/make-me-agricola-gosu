import type {
  DraftCardType,
  DraftFormat,
  ExplanationDepth,
  TrackingMode
} from "../../../features/draft/index.ts";
import {
  buildDraftPreviousPackComparison,
  shouldComparePreviousPack,
  type DraftSkillLevel,
  type UIDraftInput
} from "../contract-adapter.ts";
import {
  DRAFT_CARD_TYPE_LABELS,
  DRAFT_FORMAT_LABELS,
  EXPLANATION_DEPTH_LABELS,
  SKILL_LEVEL_LABELS,
  TRACKING_MODE_LABELS
} from "./labels";
import type { DraftCardGroupConfig, DraftCardSearchState } from "./types";

type DraftStatePanelProps = {
  input: UIDraftInput;
  cardGroups: DraftCardGroupConfig[];
  cardSearchByGroup: Record<DraftCardGroupConfig["key"], DraftCardSearchState>;
  cardNameById: (cardId: string) => string;
  canRecommend: boolean;
  requestBusy: boolean;
  onLoadSample: () => void;
  onRecommend: () => void;
  onInputChange: (nextInput: UIDraftInput) => void;
  onAddCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onCardSearchChange: (groupKey: DraftCardGroupConfig["key"], query: string) => void;
  onSelectSearchResult: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onOpenCardDetail: (cardId: string) => void;
  onCopyOfferedToPreviousPack: () => void;
};

export function DraftStatePanel({
  input,
  cardGroups,
  cardSearchByGroup,
  cardNameById,
  canRecommend,
  requestBusy,
  onLoadSample,
  onRecommend,
  onInputChange,
  onAddCard,
  onRemoveCard,
  onCardSearchChange,
  onSelectSearchResult,
  onOpenCardDetail,
  onCopyOfferedToPreviousPack
}: DraftStatePanelProps) {
  const offeredGroup = cardGroups.find((config) => config.key === "offered");
  const previousGroup = cardGroups.find((config) => config.key === "previous");
  const compactGroups = cardGroups.filter((config) => config.key === "picked" || config.key === "seen" || config.key === "passed");
  const previousPackComparison = buildDraftPreviousPackComparison(input);
  const shouldShowPreviousPackComparison = shouldComparePreviousPack(input);

  return (
    <section className="tool-panel draft-panel" aria-labelledby="draftHeading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">현재 팩</p>
          <h2 id="draftHeading">드래프트 상태</h2>
        </div>
        <div className="button-row">
          <button
            className="secondary-button"
            id="loadSampleButton"
            type="button"
            disabled={requestBusy}
            onClick={onLoadSample}
          >
            샘플
          </button>
          <button
            className="primary-button"
            id="recommendButton"
            type="button"
            disabled={!canRecommend || requestBusy}
            onClick={onRecommend}
          >
            추천 갱신
          </button>
        </div>
      </div>

      <form
        className="draft-editor"
        id="draftEditor"
        aria-label="드래프트 상태 편집"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="editor-grid">
          <label className="editor-field">
            <span>픽 번호</span>
            <input
              id="pickNumberInput"
              type="number"
              min="1"
              max="7"
              step="1"
              inputMode="numeric"
              value={input.pickNumber}
              onChange={(event) => onInputChange({ ...input, pickNumber: toPickNumber(event.target.value) })}
            />
          </label>
          <label className="editor-field">
            <span>카드 종류</span>
            <select
              id="draftCardTypeSelect"
              value={input.draftCardType}
              onChange={(event) => onInputChange({ ...input, draftCardType: event.target.value as DraftCardType })}
            >
              {typedEntries(DRAFT_CARD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>드래프트</span>
            <select
              id="draftFormatSelect"
              value={input.draftFormat}
              onChange={(event) => onInputChange({ ...input, draftFormat: event.target.value as DraftFormat })}
            >
              {typedEntries(DRAFT_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>추적 방식</span>
            <select
              id="trackingModeSelect"
              value={input.trackingMode}
              onChange={(event) => onInputChange({ ...input, trackingMode: event.target.value as TrackingMode })}
            >
              {typedEntries(TRACKING_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>설명 깊이</span>
            <select
              id="explanationDepthSelect"
              value={input.explanationDepth}
              onChange={(event) => onInputChange({ ...input, explanationDepth: event.target.value as ExplanationDepth })}
            >
              {typedEntries(EXPLANATION_DEPTH_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>숙련도</span>
            <select
              id="skillLevelSelect"
              value={input.skillLevel ?? "advanced"}
              onChange={(event) => onInputChange({ ...input, skillLevel: event.target.value as DraftSkillLevel })}
            >
              {typedEntries(SKILL_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <dl className="meta-grid" aria-label="드래프트 요약">
        <MetaItem label="보이는 카드" value={`${input.offeredCardIds.length}장`} />
        <MetaItem label="집은 카드" value={`${input.pickedCardIds.length}장`} />
        <MetaItem label="본 카드" value={`${input.seenCardIds.length}장`} />
        <MetaItem label="넘긴 카드" value={`${input.passedCardIds.length}장`} />
      </dl>

      <div className="section-block card-editor-block full-visible-pack" id="fullVisiblePackPanel">
        <div className="current-visible-pack" id="currentVisiblePackList">
          <div className="section-title">현재 visible pack</div>
        </div>
        <CardGroupEditor
          config={offeredGroup}
          cardIds={input.offeredCardIds}
          searchState={cardSearchByGroup.offered}
          cardNameById={cardNameById}
          onAddCard={onAddCard}
          onRemoveCard={onRemoveCard}
          onCardSearchChange={onCardSearchChange}
          onSelectSearchResult={onSelectSearchResult}
          onOpenCardDetail={onOpenCardDetail}
        />
      </div>

      {shouldShowPreviousPackComparison ? (
        <div
          className="section-block card-editor-block previous-pack-comparison"
          id="previousPackComparisonPanel"
          data-comparison-enabled={previousPackComparison.enabled}
        >
          <div className="group-heading">
            <div>
              <div className="section-title">이전 팩 비교</div>
              <p className="muted-line">돌아온 팩에서 보이지 않는 카드를 약한 추적 신호로 기록합니다.</p>
            </div>
            <button
              className="secondary-button compact-button"
              id="copyOfferedToPreviousPackButton"
              type="button"
              disabled={input.offeredCardIds.length === 0}
              onClick={onCopyOfferedToPreviousPack}
            >
              현재 팩 복사
            </button>
          </div>
          <div className="previous-pack-card-search">
            <CardGroupEditor
              config={previousGroup}
              cardIds={previousPackComparison.previousPackCardIds}
              searchState={cardSearchByGroup.previous}
              cardNameById={cardNameById}
              onAddCard={onAddCard}
              onRemoveCard={onRemoveCard}
              onCardSearchChange={onCardSearchChange}
              onSelectSearchResult={onSelectSearchResult}
              onOpenCardDetail={onOpenCardDetail}
            />
          </div>
          <MissingFromPreviousPackList
            cardIds={previousPackComparison.missingFromPreviousPack}
            cardNameById={cardNameById}
            onOpenCardDetail={onOpenCardDetail}
          />
        </div>
      ) : input.pickNumber >= 5 ? (
        <div className="section-block tracking-warning" id="quickTrackingWarning">
          <div className="section-title">빠른 입력 모드</div>
          <p className="muted-line">
            선택 카드 모드에서는 돌아온 팩의 사라진 카드 요약과 role pressure 신호가 낮아집니다.
          </p>
        </div>
      ) : null}

      <div className="section-block compact-stack">
        {compactGroups.map((config) => (
          <div className="card-editor-block" key={config.key}>
            <CardGroupEditor
              config={config}
              cardIds={input[config.inputKey] ?? []}
              searchState={cardSearchByGroup[config.key]}
              cardNameById={cardNameById}
              onAddCard={onAddCard}
              onRemoveCard={onRemoveCard}
              onCardSearchChange={onCardSearchChange}
              onSelectSearchResult={onSelectSearchResult}
              onOpenCardDetail={onOpenCardDetail}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function MissingFromPreviousPackList({
  cardIds,
  cardNameById,
  onOpenCardDetail
}: {
  cardIds: string[];
  cardNameById: (cardId: string) => string;
  onOpenCardDetail: (cardId: string) => void;
}) {
  return (
    <div className="missing-from-previous-pack" id="missingFromPreviousPackList">
      <div className="group-heading">
        <div>
          <div className="section-title">돌아오지 않은 카드</div>
          <p className="muted-line">상대가 집었다고 단정하지 않고 이전 팩 대비 사라진 카드로만 기록합니다.</p>
        </div>
        <div className="section-count">{cardIds.length}장</div>
      </div>
      {cardIds.length === 0 ? (
        <div className="empty-state">이전 팩 대비 사라진 카드 없음</div>
      ) : (
        <div className="token-list">
          {cardIds.map((cardId) => (
            <span className="token" title={cardId} key={cardId}>
              <button
                className="card-detail-open-button token-detail-button"
                type="button"
                aria-label={`${cardNameById(cardId)} 상세 보기`}
                onClick={() => onOpenCardDetail(cardId)}
              >
                <span className="token-name">{cardNameById(cardId)}</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CardGroupEditor({
  config,
  cardIds,
  searchState,
  cardNameById,
  onAddCard,
  onRemoveCard,
  onCardSearchChange,
  onSelectSearchResult,
  onOpenCardDetail
}: {
  config: DraftCardGroupConfig | undefined;
  cardIds: string[];
  searchState: DraftCardSearchState | undefined;
  cardNameById: (cardId: string) => string;
  onAddCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onCardSearchChange: (groupKey: DraftCardGroupConfig["key"], query: string) => void;
  onSelectSearchResult: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onOpenCardDetail: (cardId: string) => void;
}) {
  if (!config) return null;
  const groupConfig = config;

  const cardSearch = searchState ?? EMPTY_CARD_SEARCH_STATE;
  const trimmedQuery = cardSearch.query.trim();
  const selectedCard = selectedSearchCard(cardSearch);
  const canAdd = Boolean(selectedCard || trimmedQuery) && !cardSearch.loading;

  function addCurrentSearchValue() {
    const cardId = selectedCard?.id ?? trimmedQuery;
    if (!cardId) return;

    onAddCard(groupConfig.key, cardId);
    onCardSearchChange(groupConfig.key, "");
  }

  function moveSelection(direction: 1 | -1) {
    if (cardSearch.results.length === 0) return;

    const currentIndex = Math.max(
      0,
      cardSearch.results.findIndex((card) => card.id === selectedCard?.id)
    );
    const nextIndex = (currentIndex + direction + cardSearch.results.length) % cardSearch.results.length;
    const nextCard = cardSearch.results[nextIndex];
    if (nextCard) onSelectSearchResult(groupConfig.key, nextCard.id);
  }

  return (
    <>
      <div className="group-heading">
        <div className="section-title">{groupConfig.label}</div>
        <div className="section-count" id={groupConfig.countId}>
          {cardIds.length}장
        </div>
      </div>
      <div className="card-search">
        <label className="sr-only" htmlFor={groupConfig.searchId}>
          {groupConfig.label} 검색
        </label>
        <input
          id={groupConfig.searchId}
          className="card-search-input"
          type="search"
          autoComplete="off"
          placeholder="카드 이름 또는 ID"
          value={cardSearch.query}
          onChange={(event) => onCardSearchChange(groupConfig.key, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveSelection(1);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              moveSelection(-1);
              return;
            }
            if (event.key !== "Enter" || !canAdd) return;
            event.preventDefault();
            addCurrentSearchValue();
          }}
        />
        <button
          className="secondary-button add-card-button"
          id={groupConfig.addButtonId}
          type="button"
          disabled={!canAdd}
          onClick={addCurrentSearchValue}
        >
          추가
        </button>
        <div
          className="search-results"
          id={groupConfig.resultsId}
          role="listbox"
          aria-label={`${groupConfig.label} 검색 결과`}
        >
          <CardSearchResults
            config={groupConfig}
            searchState={cardSearch}
            onAddCard={(cardId) => {
              onAddCard(groupConfig.key, cardId);
              onCardSearchChange(groupConfig.key, "");
            }}
            onSelectCard={(cardId) => onSelectSearchResult(groupConfig.key, cardId)}
          />
        </div>
      </div>
      <CardIdList
        variant={groupConfig.variant}
        groupKey={groupConfig.key}
        cardIds={cardIds}
        emptyText={groupConfig.emptyText}
        listId={groupConfig.listId}
        cardNameById={cardNameById}
        onRemoveCard={onRemoveCard}
        onOpenCardDetail={onOpenCardDetail}
      />
    </>
  );
}

function CardSearchResults({
  config,
  searchState,
  onAddCard,
  onSelectCard
}: {
  config: DraftCardGroupConfig;
  searchState: DraftCardSearchState;
  onAddCard: (cardId: string) => void;
  onSelectCard: (cardId: string) => void;
}) {
  if (searchState.loading) {
    return <div className="search-message">검색 중</div>;
  }

  if (searchState.error) {
    return <div className="search-message is-error">{searchState.error}</div>;
  }

  if (!searchState.query.trim()) {
    return <div className="search-message">카드 이름 또는 ID 검색</div>;
  }

  if (searchState.results.length === 0) {
    return <div className="search-message">검색 결과 없음</div>;
  }

  return (
    <>
      {searchState.results.slice(0, 8).map((card, index) => {
        const isSelected = searchState.selectedCardId === card.id || (!searchState.selectedCardId && index === 0);
        return (
          <button
            className={`search-result-button${isSelected ? " is-active" : ""}`}
            type="button"
            role="option"
            aria-selected={isSelected}
            key={card.id}
            onFocus={() => onSelectCard(card.id)}
            onMouseEnter={() => onSelectCard(card.id)}
            onClick={() => onAddCard(card.id)}
          >
            <span className="search-result-name">{card.name}</span>
            <span className="search-result-meta">
              {card.type && card.type in DRAFT_CARD_TYPE_LABELS
                ? DRAFT_CARD_TYPE_LABELS[card.type as keyof typeof DRAFT_CARD_TYPE_LABELS]
                : card.type ?? "카드"}{" "}
              · {card.id}
            </span>
          </button>
        );
      })}
    </>
  );
}

function CardIdList({
  variant,
  groupKey,
  cardIds,
  emptyText,
  listId,
  cardNameById,
  onRemoveCard,
  onOpenCardDetail
}: {
  variant: "card" | "token";
  groupKey: DraftCardGroupConfig["key"];
  cardIds: string[];
  emptyText: string;
  listId: string;
  cardNameById: (cardId: string) => string;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onOpenCardDetail: (cardId: string) => void;
}) {
  if (cardIds.length === 0) {
    return (
      <div className="empty-state" id={listId}>
        {emptyText}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="card-list" id={listId}>
        {cardIds.map((cardId, index) => (
          <div className="mini-card" key={cardId}>
            <div className="mini-card-index">{index + 1}</div>
            <button
              className="card-detail-open-button mini-card-detail-button"
              type="button"
              aria-label={`${cardNameById(cardId)} 상세 보기`}
              onClick={() => onOpenCardDetail(cardId)}
            >
              <div className="mini-card-name">{cardNameById(cardId)}</div>
              <div className="mini-card-id">{cardId}</div>
            </button>
            <button
              className="remove-card-button"
              type="button"
              aria-label={`${cardNameById(cardId)} 제거`}
              onClick={() => onRemoveCard(groupKey, cardId)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="token-list" id={listId}>
      {cardIds.map((cardId) => (
        <span className="token" title={cardId} key={cardId}>
          <button
            className="card-detail-open-button token-detail-button"
            type="button"
            aria-label={`${cardNameById(cardId)} 상세 보기`}
            onClick={() => onOpenCardDetail(cardId)}
          >
            <span className="token-name">{cardNameById(cardId)}</span>
          </button>
          <button
            className="remove-card-button"
            type="button"
            aria-label={`${cardNameById(cardId)} 제거`}
            onClick={() => onRemoveCard(groupKey, cardId)}
          >
            x
          </button>
        </span>
      ))}
    </div>
  );
}

function toPickNumber(value: string): UIDraftInput["pickNumber"] {
  const pickNumber = Math.round(Number(value));
  return Math.min(7, Math.max(1, Number.isFinite(pickNumber) ? pickNumber : 1)) as UIDraftInput["pickNumber"];
}

function typedEntries<T extends Record<string, string>>(record: T): Array<[Extract<keyof T, string>, string]> {
  return Object.entries(record) as Array<[Extract<keyof T, string>, string]>;
}

function selectedSearchCard(searchState: DraftCardSearchState) {
  return (
    searchState.results.find((card) => card.id === searchState.selectedCardId) ?? searchState.results[0] ?? null
  );
}

const EMPTY_CARD_SEARCH_STATE: DraftCardSearchState = {
  query: "",
  results: [],
  loading: false,
  error: "",
  selectedCardId: null
};
