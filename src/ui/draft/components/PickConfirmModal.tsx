type PickConfirmModalProps = {
  isOpen: boolean;
  selectedCardLabel: string;
  matchesModelTop: boolean;
  resolutionNote: string;
  resolveBusy: boolean;
  onResolutionNoteChange: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PickConfirmModal({
  isOpen,
  selectedCardLabel,
  matchesModelTop,
  resolutionNote,
  resolveBusy,
  onResolutionNoteChange,
  onCancel,
  onConfirm
}: PickConfirmModalProps) {
  return (
    <div
      className="modal-backdrop"
      id="pickConfirmModal"
      hidden={!isOpen}
      onClick={(event) => event.currentTarget === event.target && onCancel()}
    >
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="pickConfirmHeading">
        <div className="confirm-header">
          <div>
            <p className="eyebrow">Pick Resolution</p>
            <h2 id="pickConfirmHeading">픽 확정</h2>
          </div>
          <button
            className="secondary-button icon-button"
            id="cancelPickButton"
            type="button"
            aria-label="픽 확정 닫기"
            onClick={onCancel}
          >
            x
          </button>
        </div>
        <div className="confirm-body">
          <dl className="feedback-summary">
            <div>
              <dt>확정할 카드</dt>
              <dd id="confirmSelectedCard">{selectedCardLabel || "-"}</dd>
            </div>
            <div>
              <dt>추천 일치</dt>
              <dd id="confirmMatchStatus">{matchesModelTop ? "AI RANK 1과 일치" : "AI RANK 1과 다름"}</dd>
            </div>
          </dl>
          <label className="field-label" htmlFor="resolutionNote">
            선택 이유
          </label>
          <textarea
            id="resolutionNote"
            rows={3}
            placeholder="선택 사항. 추천과 다른 선택이면 neutral disagreement에 함께 기록합니다."
            value={resolutionNote}
            onChange={(event) => onResolutionNoteChange(event.target.value)}
          />
          <p className="feedback-hint" id="confirmPickHint">
            확정하면 현재 팩의 나머지 카드는 본 카드/넘긴 카드로 기록됩니다.
          </p>
        </div>
        <div className="confirm-actions">
          <button
            className="secondary-button"
            id="backToDraftButton"
            type="button"
            disabled={resolveBusy}
            onClick={onCancel}
          >
            취소 및 변경
          </button>
          <button
            className="primary-button"
            id="confirmPickButton"
            type="button"
            disabled={resolveBusy}
            onClick={onConfirm}
          >
            픽 확정 후 다음 팩
          </button>
        </div>
      </section>
    </div>
  );
}
