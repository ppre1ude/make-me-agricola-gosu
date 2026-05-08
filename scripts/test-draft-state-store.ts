import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

type DraftStateStoreValidation = {
  ok: boolean;
  draftInput?: Record<string, unknown>;
  errors: string[];
};

type DraftStateStore = {
  storageKey: string;
  save(draftInput: unknown): DraftStateStoreValidation;
  load(): Record<string, unknown> | null;
  clear(): boolean;
  validate(draftInput: unknown): DraftStateStoreValidation;
};

type MockWindow = {
  localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  DraftStateStore?: DraftStateStore;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(rootDir, "public/draft/draft-state-store.js"), "utf8");
const storage = new Map<string, string>();
const windowObject: MockWindow = {
  localStorage: {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.delete(key);
    }
  }
};

vm.runInContext(source, vm.createContext({ window: windowObject }), {
  filename: "public/draft/draft-state-store.js"
});

const store = windowObject.DraftStateStore;
assert.ok(store, "DraftStateStore must be exposed on window.");

const validDraftInput = {
  playerCount: 4,
  draftCardType: "occupation",
  pickNumber: 2,
  offeredCardIds: ["occ-field-watchman", "minor-grain-supply"],
  pickedCardIds: ["occ-food-engine"],
  seenCardIds: ["occ-field-watchman", "minor-grain-supply"],
  passedCardIds: [],
  draftFormat: "10-to-7",
  trackingMode: "selected_only",
  cardPoolProfileId: "bga-arena-prototype",
  explanationDepth: "standard"
};

const saveResult = store.save(validDraftInput);
assert.equal(saveResult.ok, true, "valid draft input should save.");
assert.deepEqual(toPlainJson(store.load()), validDraftInput, "saved draft input should load back.");

const invalidResult = store.save({
  ...validDraftInput,
  pickNumber: 8
});
assert.equal(invalidResult.ok, false, "invalid pickNumber should be rejected.");
assert.deepEqual(toPlainJson(store.load()), validDraftInput, "invalid save should not replace stored input.");

storage.set(store.storageKey, "{not json");
assert.equal(store.load(), null, "malformed storage should load as null.");
assert.equal(storage.has(store.storageKey), false, "malformed storage should be cleared.");

assert.equal(store.clear(), true, "clear should report success.");
assert.equal(store.load(), null, "cleared storage should load as null.");
console.log("Draft state store smoke passed.");

function toPlainJson(value: unknown): unknown {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}
