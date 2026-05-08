import type {
  DraftCardType,
  DraftFormat,
  ExplanationDepth,
  TrackingMode
} from "../../features/draft/index.ts";
import {
  normalizeDraftInput,
  type DraftSkillLevel,
  type UIDraftInput,
  type UIDraftInputPatch
} from "./contract-adapter.ts";

export type DraftStateStoreValidation =
  | {
      ok: true;
      draftInput: UIDraftInput;
      errors: [];
    }
  | {
      ok: false;
      errors: string[];
      draftInput?: never;
    };

const storageKey = "agricola-korean-gosu:draft-memory-coach:draft-input:v1";
const undoStorageKey = "agricola-korean-gosu:draft-memory-coach:draft-input-undo:v1";

const ALLOWED_DRAFT_CARD_TYPES = new Set<DraftCardType>(["occupation", "minor_improvement"]);
const ALLOWED_DRAFT_FORMATS = new Set<DraftFormat>(["10-to-7", "9-to-7", "8-to-7"]);
const ALLOWED_TRACKING_MODES = new Set<TrackingMode>(["selected_only", "full_pack"]);
const ALLOWED_EXPLANATION_DEPTHS = new Set<ExplanationDepth>(["compact", "standard", "deep"]);
const ALLOWED_SKILL_LEVELS = new Set<DraftSkillLevel>(["beginner", "intermediate", "advanced"]);

export const DraftStateStore = Object.freeze({
  storageKey,
  save,
  load,
  clear,
  pushUndo,
  popUndo,
  peekUndo,
  clearUndo,
  validate
});

function save(draftInput: unknown): DraftStateStoreValidation {
  const validation = validate(draftInput);
  if (!validation.ok) return validation;

  const storage = getLocalStorage();
  if (!storage) return unavailableStorageResult();

  try {
    storage.setItem(storageKey, JSON.stringify(validation.draftInput));
  } catch {
    return unavailableStorageResult();
  }

  return validation;
}

function load(): UIDraftInput | null {
  return loadFromKey(storageKey, clear);
}

function clear(): boolean {
  return removeStorageKey(storageKey);
}

function pushUndo(snapshot: unknown): DraftStateStoreValidation {
  const validation = validate(snapshot);
  if (!validation.ok) return validation;

  const storage = getLocalStorage();
  if (!storage) return unavailableStorageResult();

  try {
    storage.setItem(undoStorageKey, JSON.stringify(validation.draftInput));
  } catch {
    return unavailableStorageResult();
  }

  return validation;
}

function popUndo(): UIDraftInput | null {
  const snapshot = peekUndo();
  if (!snapshot) return null;

  return clearUndo() ? snapshot : null;
}

function peekUndo(): UIDraftInput | null {
  return loadFromKey(undoStorageKey, clearUndo);
}

function clearUndo(): boolean {
  return removeStorageKey(undoStorageKey);
}

function validate(draftInput: unknown): DraftStateStoreValidation {
  if (!isPlainObject(draftInput)) {
    return { ok: false, errors: ["draft input must be an object."] };
  }

  const source = draftInput;
  const errors: string[] = [];
  const normalized: UIDraftInputPatch = {};

  const pickNumber = normalizePickNumber(source.pickNumber);
  if (pickNumber === null) {
    errors.push("pickNumber must be an integer from 1 to 7.");
  } else {
    normalized.pickNumber = pickNumber;
  }

  if (isAllowed(source.draftCardType, ALLOWED_DRAFT_CARD_TYPES)) {
    normalized.draftCardType = source.draftCardType;
  } else {
    errors.push("draftCardType must be one of: occupation, minor_improvement.");
  }

  if (isAllowed(source.draftFormat, ALLOWED_DRAFT_FORMATS)) {
    normalized.draftFormat = source.draftFormat;
  } else {
    errors.push("draftFormat must be one of: 10-to-7, 9-to-7, 8-to-7.");
  }

  if (isAllowed(source.trackingMode, ALLOWED_TRACKING_MODES)) {
    normalized.trackingMode = source.trackingMode;
  } else {
    errors.push("trackingMode must be one of: selected_only, full_pack.");
  }

  if (isAllowed(source.explanationDepth, ALLOWED_EXPLANATION_DEPTHS)) {
    normalized.explanationDepth = source.explanationDepth;
  } else {
    errors.push("explanationDepth must be one of: compact, standard, deep.");
  }

  if (source.skillLevel !== undefined) {
    if (isAllowed(source.skillLevel, ALLOWED_SKILL_LEVELS)) {
      normalized.skillLevel = source.skillLevel;
    } else {
      errors.push("skillLevel must be one of: beginner, intermediate, advanced.");
    }
  }

  if (source.playerCount !== undefined) {
    const playerCount = Number(source.playerCount);
    if (!Number.isInteger(playerCount) || playerCount < 1) {
      errors.push("playerCount must be a positive integer when present.");
    } else {
      normalized.playerCount = playerCount;
    }
  }

  setRequiredStringArray(source, normalized, errors, "offeredCardIds");
  setRequiredStringArray(source, normalized, errors, "pickedCardIds");
  setRequiredStringArray(source, normalized, errors, "seenCardIds");
  setRequiredStringArray(source, normalized, errors, "passedCardIds");
  setOptionalStringArray(source, normalized, errors, "previousPackCardIds");
  setOptionalStringArray(source, normalized, errors, "missingFromPreviousPack");

  if (source.cardPoolProfileId !== undefined) {
    const cardPoolProfileId = normalizeString(source.cardPoolProfileId);
    if (!cardPoolProfileId) {
      errors.push("cardPoolProfileId must be a non-empty string when present.");
    } else {
      normalized.cardPoolProfileId = cardPoolProfileId;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, draftInput: normalizeDraftInput(normalized), errors: [] };
}

function loadFromKey(key: string, clearInvalid: () => boolean): UIDraftInput | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  let rawValue: string | null;
  try {
    rawValue = storage.getItem(key);
  } catch {
    return null;
  }

  if (!rawValue) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    clearInvalid();
    return null;
  }

  const validation = validate(parsed);
  if (!validation.ok) {
    clearInvalid();
    return null;
  }

  return validation.draftInput;
}

function removeStorageKey(key: string): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function unavailableStorageResult(): DraftStateStoreValidation {
  return { ok: false, errors: ["localStorage is unavailable."] };
}

function setRequiredStringArray(
  source: Record<string, unknown>,
  target: UIDraftInputPatch,
  errors: string[],
  fieldName: "offeredCardIds" | "pickedCardIds" | "seenCardIds" | "passedCardIds"
): void {
  const value = normalizeStringArray(source[fieldName]);
  if (value === null) {
    errors.push(`${fieldName} must be an array of non-empty strings.`);
    return;
  }

  target[fieldName] = value;
}

function setOptionalStringArray(
  source: Record<string, unknown>,
  target: UIDraftInputPatch,
  errors: string[],
  fieldName: "previousPackCardIds" | "missingFromPreviousPack"
): void {
  if (source[fieldName] === undefined) return;

  const value = normalizeStringArray(source[fieldName]);
  if (value === null) {
    errors.push(`${fieldName} must be an array of non-empty strings when present.`);
    return;
  }

  target[fieldName] = value;
}

function normalizePickNumber(value: unknown): UIDraftInput["pickNumber"] | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 7) return null;
  return number as UIDraftInput["pickNumber"];
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const normalized: string[] = [];
  for (const item of value) {
    const stringValue = normalizeString(item);
    if (!stringValue) return null;
    normalized.push(stringValue);
  }

  return normalized;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowed<T extends string>(value: unknown, allowed: ReadonlySet<T>): value is T {
  return typeof value === "string" && allowed.has(value as T);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
