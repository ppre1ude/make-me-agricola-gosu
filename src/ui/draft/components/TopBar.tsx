import type { UIDraftInput } from "../contract-adapter.ts";
import { DRAFT_CARD_TYPE_LABELS, DRAFT_FORMAT_LABELS } from "./labels";
import type { DraftStatusTone } from "./types";

type TopBarProps = {
  input: UIDraftInput;
  statusText: string;
  statusTone: DraftStatusTone;
  canUndo: boolean;
  onUndo: () => void;
};

export function TopBar({ input, statusText, statusTone, canUndo, onUndo }: TopBarProps) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">BGA Arena</p>
        <h1>드래프트 메모리 코치</h1>
      </div>
      <div className="top-context" aria-label="현재 드래프트 맥락">
        <span>{DRAFT_CARD_TYPE_LABELS[input.draftCardType]}</span>
        <span>Pick {input.pickNumber} / 7</span>
        <span>{DRAFT_FORMAT_LABELS[input.draftFormat]}</span>
      </div>
      <div className="top-actions">
        <button
          className="secondary-button compact-button"
          id="undoPickButton"
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
        >
          Undo
        </button>
        <div className={`status-pill is-${statusTone}`} id="appStatus" role="status" aria-live="polite">
          {statusText}
        </div>
      </div>
    </header>
  );
}
