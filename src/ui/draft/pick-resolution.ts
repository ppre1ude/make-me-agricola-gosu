import { cloneDraftInput, type UIDraftInput } from "./contract-adapter.ts";

export type DraftPickResolutionOptions = {
  modelTopCardId?: string;
};

export type DraftPickResolutionResult = {
  before: UIDraftInput;
  after: UIDraftInput;
  selectedCardId: string;
  passedCardIds: string[];
  nextPickNumber: UIDraftInput["pickNumber"];
  feedbackNeeded: boolean;
};

export const DraftPickResolution = Object.freeze({
  resolvePick,
  canResolvePick,
  cloneDraftInput,
  clone: cloneDraftInput,
  cloneStringArray
});

export function resolvePick(
  draftInput: UIDraftInput,
  selectedCardId: string,
  options: DraftPickResolutionOptions = {}
): DraftPickResolutionResult {
  const normalizedSelectedCardId = normalizeString(selectedCardId);
  const validation = validateResolvablePick(draftInput, normalizedSelectedCardId);
  if (!validation.ok) throw new Error(validation.error);

  const before = cloneDraftInput(draftInput);
  const after = cloneDraftInput(before);
  const passedCardIds = getPassedCardIdsForPick(before.offeredCardIds, normalizedSelectedCardId);

  after.pickedCardIds = appendUnique(after.pickedCardIds, [normalizedSelectedCardId]);
  after.seenCardIds = appendUnique(after.seenCardIds, passedCardIds);
  after.passedCardIds = appendUnique(after.passedCardIds, passedCardIds);
  after.offeredCardIds = [];
  after.pickNumber = incrementPickNumber(before.pickNumber);

  return {
    before,
    after,
    selectedCardId: normalizedSelectedCardId,
    passedCardIds,
    nextPickNumber: after.pickNumber,
    feedbackNeeded: isFeedbackNeeded(normalizedSelectedCardId, options)
  };
}

export function canResolvePick(draftInput: UIDraftInput, selectedCardId: string): boolean {
  return validateResolvablePick(draftInput, normalizeString(selectedCardId)).ok;
}

export function cloneStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice() : [];
}

function validateResolvablePick(
  draftInput: UIDraftInput,
  selectedCardId: string
): { ok: true; error: "" } | { ok: false; error: string } {
  if (!isObject(draftInput)) return { ok: false, error: "draftInput must be an object." };
  if (!selectedCardId) return { ok: false, error: "selectedCardId must be a non-empty string." };
  if (!Array.isArray(draftInput.offeredCardIds)) {
    return { ok: false, error: "offeredCardIds must be an array." };
  }
  if (!includesCardId(draftInput.offeredCardIds, selectedCardId)) {
    return { ok: false, error: "selectedCardId must be in offeredCardIds." };
  }
  if (normalizePickNumber(draftInput.pickNumber) === null) {
    return { ok: false, error: "pickNumber must be an integer from 1 to 7." };
  }
  if (!Array.isArray(draftInput.pickedCardIds)) return { ok: false, error: "pickedCardIds must be an array." };
  if (!Array.isArray(draftInput.seenCardIds)) return { ok: false, error: "seenCardIds must be an array." };
  if (!Array.isArray(draftInput.passedCardIds)) return { ok: false, error: "passedCardIds must be an array." };

  return { ok: true, error: "" };
}

function getPassedCardIdsForPick(offeredCardIds: readonly string[], selectedCardId: string): string[] {
  const passedCardIds: string[] = [];
  offeredCardIds.forEach((cardId) => {
    const normalizedCardId = normalizeString(cardId);
    if (!normalizedCardId || normalizedCardId === selectedCardId) return;
    appendUniqueInPlace(passedCardIds, normalizedCardId);
  });

  return passedCardIds;
}

function appendUnique(existingCardIds: readonly string[], newCardIds: readonly string[]): string[] {
  const result = cloneStringArray(existingCardIds);
  newCardIds.forEach((cardId) => {
    const normalizedCardId = normalizeString(cardId);
    if (normalizedCardId) appendUniqueInPlace(result, normalizedCardId);
  });

  return result;
}

function appendUniqueInPlace(cardIds: string[], cardId: string): void {
  if (!includesCardId(cardIds, cardId)) cardIds.push(cardId);
}

function includesCardId(cardIds: readonly string[], cardId: string): boolean {
  return cardIds.some((candidate) => normalizeString(candidate) === cardId);
}

function incrementPickNumber(value: unknown): UIDraftInput["pickNumber"] {
  const pickNumber = normalizePickNumber(value);
  if (pickNumber === null) return 1;
  return Math.min(7, pickNumber + 1) as UIDraftInput["pickNumber"];
}

function normalizePickNumber(value: unknown): UIDraftInput["pickNumber"] | null {
  const pickNumber = Number(value);
  if (!Number.isInteger(pickNumber) || pickNumber < 1 || pickNumber > 7) return null;
  return pickNumber as UIDraftInput["pickNumber"];
}

function isFeedbackNeeded(selectedCardId: string, options: DraftPickResolutionOptions): boolean {
  const modelTopCardId = normalizeString(options.modelTopCardId);
  return Boolean(modelTopCardId && selectedCardId !== modelTopCardId);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
