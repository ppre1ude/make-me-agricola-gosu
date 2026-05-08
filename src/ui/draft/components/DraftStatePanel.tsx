import { useState } from "react";
import type {
  DraftCardType,
  DraftFormat,
  ExplanationDepth,
  TrackingMode
} from "../../../features/draft/index.ts";
import type { DraftSkillLevel, UIDraftInput } from "../contract-adapter.ts";
import {
  DRAFT_CARD_TYPE_LABELS,
  DRAFT_FORMAT_LABELS,
  EXPLANATION_DEPTH_LABELS,
  SKILL_LEVEL_LABELS,
  TRACKING_MODE_LABELS
} from "./labels";
import type { DraftCardGroupConfig } from "./types";

type DraftStatePanelProps = {
  input: UIDraftInput;
  cardGroups: DraftCardGroupConfig[];
  cardNameById: (cardId: string) => string;
  canRecommend: boolean;
  requestBusy: boolean;
  onLoadSample: () => void;
  onRecommend: () => void;
  onInputChange: (nextInput: UIDraftInput) => void;
  onAddCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
};

export function DraftStatePanel({
  input,
  cardGroups,
  cardNameById,
  canRecommend,
  requestBusy,
  onLoadSample,
  onRecommend,
  onInputChange,
  onAddCard,
  onRemoveCard
}: DraftStatePanelProps) {
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

      <div className="section-block card-editor-block">
        <CardGroupEditor
          config={cardGroups[0]}
          cardIds={input.offeredCardIds}
          cardNameById={cardNameById}
          onAddCard={onAddCard}
          onRemoveCard={onRemoveCard}
        />
      </div>

      <div className="section-block compact-stack">
        {cardGroups.slice(1).map((config) => (
          <div className="card-editor-block" key={config.key}>
            <CardGroupEditor
              config={config}
              cardIds={input[config.inputKey]}
              cardNameById={cardNameById}
              onAddCard={onAddCard}
              onRemoveCard={onRemoveCard}
            />
          </div>
        ))}
      </div>
    </section>
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
  cardNameById,
  onAddCard,
  onRemoveCard
}: {
  config: DraftCardGroupConfig | undefined;
  cardIds: string[];
  cardNameById: (cardId: string) => string;
  onAddCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
}) {
  const [draftCardId, setDraftCardId] = useDraftCardInput();
  if (!config) return null;

  const trimmedCardId = draftCardId.trim();
  const canAdd = trimmedCardId.length > 0;

  return (
    <>
      <div className="group-heading">
        <div className="section-title">{config.label}</div>
        <div className="section-count" id={config.countId}>
          {cardIds.length}장
        </div>
      </div>
      <div className="card-search">
        <label className="sr-only" htmlFor={config.searchId}>
          {config.label} 검색
        </label>
        <input
          id={config.searchId}
          className="card-search-input"
          type="search"
          autoComplete="off"
          placeholder="카드 이름 또는 ID"
          value={draftCardId}
          onChange={(event) => setDraftCardId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !canAdd) return;
            event.preventDefault();
            onAddCard(config.key, trimmedCardId);
            setDraftCardId("");
          }}
        />
        <button
          className="secondary-button add-card-button"
          id={config.addButtonId}
          type="button"
          disabled={!canAdd}
          onClick={() => {
            onAddCard(config.key, trimmedCardId);
            setDraftCardId("");
          }}
        >
          추가
        </button>
        <div
          className="search-results"
          id={config.resultsId}
          role="listbox"
          aria-label={`${config.label} 검색 결과`}
        >
          <div className="search-message">어댑터 카드 검색 연결 전에는 카드 ID를 직접 입력합니다.</div>
        </div>
      </div>
      <CardIdList
        variant={config.variant}
        groupKey={config.key}
        cardIds={cardIds}
        emptyText={config.emptyText}
        listId={config.listId}
        cardNameById={cardNameById}
        onRemoveCard={onRemoveCard}
      />
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
  onRemoveCard
}: {
  variant: "card" | "token";
  groupKey: DraftCardGroupConfig["key"];
  cardIds: string[];
  emptyText: string;
  listId: string;
  cardNameById: (cardId: string) => string;
  onRemoveCard: (groupKey: DraftCardGroupConfig["key"], cardId: string) => void;
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
            <div>
              <div className="mini-card-name">{cardNameById(cardId)}</div>
              <div className="mini-card-id">{cardId}</div>
            </div>
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
          <span className="token-name">{cardNameById(cardId)}</span>
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

function useDraftCardInput(): [string, (value: string) => void] {
  return useState("");
}
