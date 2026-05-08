import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

type DraftInput = {
  playerCount: number;
  draftCardType: "occupation" | "minor_improvement";
  pickNumber: number;
  offeredCardIds: string[];
  pickedCardIds: string[];
  seenCardIds: string[];
  passedCardIds: string[];
  draftFormat: "10-to-7" | "9-to-7" | "8-to-7";
  trackingMode: "selected_only" | "full_pack";
  cardPoolProfileId: string;
  explanationDepth: "compact" | "standard" | "deep";
};

type PickResolutionResult = {
  before: DraftInput;
  after: DraftInput;
  selectedCardId: string;
  passedCardIds: string[];
  nextPickNumber: number;
  feedbackNeeded: boolean;
};

type DraftPickResolution = {
  resolvePick(
    draftInput: DraftInput,
    selectedCardId: string,
    options?: { modelTopCardId?: string }
  ): PickResolutionResult;
  canResolvePick(draftInput: DraftInput, selectedCardId: string): boolean;
};

type MockWindow = {
  DraftPickResolution?: DraftPickResolution;
  structuredClone: typeof structuredClone;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(rootDir, "public/draft/pick-resolution.js"), "utf8");
const windowObject: MockWindow = {
  structuredClone
};

vm.runInContext(source, vm.createContext({ window: windowObject, structuredClone }), {
  filename: "public/draft/pick-resolution.js"
});

const pickResolution = requirePickResolution(windowObject.DraftPickResolution);

const resolvedPick = resolvePick(
  buildDraftInput({
    pickNumber: 6,
    offeredCardIds: ["occ-field-watchman", "minor-grain-supply", "occ-food-engine"],
    pickedCardIds: ["minor-late-points"],
    seenCardIds: ["minor-grain-supply", "minor-late-points"],
    passedCardIds: ["occ-food-engine"]
  }),
  "occ-field-watchman",
  { modelTopCardId: "minor-grain-supply" }
);

assert.equal(resolvedPick.feedbackNeeded, true, "feedback is needed when model top differs from selected card.");
assert.equal(resolvedPick.selectedCardId, "occ-field-watchman", "resolved pick should expose the selected card.");
assert.equal(resolvedPick.nextPickNumber, 7, "nextPickNumber should increment after a resolved pick.");
assertUnique(resolvedPick.passedCardIds, "passedCardIds for the current pick should not contain duplicates.");
assertIncludes(resolvedPick.passedCardIds, "minor-grain-supply", "current pick pass list should include non-selected offered cards.");
assertIncludes(resolvedPick.passedCardIds, "occ-food-engine", "current pick pass list should include non-selected offered cards.");
assertExcludes(resolvedPick.passedCardIds, "occ-field-watchman", "current pick pass list should exclude the selected card.");

const nextInput = resolvedPick.after;
assert.equal(nextInput.pickNumber, 7, "pickNumber should increment after a resolved pick.");
assert.deepEqual(nextInput.offeredCardIds, [], "offeredCardIds should be cleared after a resolved pick.");
assertIncludes(nextInput.pickedCardIds, "occ-field-watchman", "selected card should move into pickedCardIds.");
assertIncludes(nextInput.seenCardIds, "minor-grain-supply", "non-selected offered cards should move into seenCardIds.");
assertIncludes(nextInput.seenCardIds, "occ-food-engine", "non-selected offered cards should move into seenCardIds.");
assertIncludes(nextInput.passedCardIds, "minor-grain-supply", "non-selected offered cards should move into passedCardIds.");
assertIncludes(nextInput.passedCardIds, "occ-food-engine", "non-selected offered cards should move into passedCardIds.");
assertExcludes(nextInput.passedCardIds, "occ-field-watchman", "selected card should not move into passedCardIds.");
assertUnique(nextInput.pickedCardIds, "pickedCardIds should not gain duplicates.");
assertUnique(nextInput.seenCardIds, "seenCardIds should not gain duplicates.");
assertUnique(nextInput.passedCardIds, "passedCardIds should not gain duplicates.");

const cappedPick = resolvePick(
  buildDraftInput({
    pickNumber: 7,
    offeredCardIds: ["minor-grain-supply", "occ-food-engine"]
  }),
  "minor-grain-supply",
  { modelTopCardId: "minor-grain-supply" }
);

assert.equal(cappedPick.nextPickNumber, 7, "nextPickNumber should cap at 7.");
assert.equal(cappedPick.after.pickNumber, 7, "pickNumber should cap at 7.");

const invalidInput = buildDraftInput({
  offeredCardIds: ["minor-grain-supply", "occ-food-engine"]
});

assert.equal(
  pickResolution.canResolvePick(invalidInput, "occ-field-watchman"),
  false,
  "selected card outside offeredCardIds should be rejected by canResolvePick."
);
assert.throws(
  () => pickResolution.resolvePick(invalidInput, "occ-field-watchman", { modelTopCardId: "minor-grain-supply" }),
  /selectedCardId must be in offeredCardIds/,
  "selected card outside offeredCardIds should be rejected by resolvePick."
);

console.log("Draft pick resolution smoke passed.");

function requirePickResolution(value: DraftPickResolution | undefined): DraftPickResolution {
  assert.ok(value, "DraftPickResolution must be exposed on window.");
  assert.equal(typeof value.resolvePick, "function", "DraftPickResolution.resolvePick must be a function.");
  assert.equal(typeof value.canResolvePick, "function", "DraftPickResolution.canResolvePick must be a function.");
  return value;
}

function resolvePick(
  draftInput: DraftInput,
  selectedCardId: string,
  options?: { modelTopCardId?: string }
): PickResolutionResult {
  return toPlainJson(pickResolution.resolvePick(draftInput, selectedCardId, options)) as PickResolutionResult;
}

function buildDraftInput(overrides: Partial<DraftInput> = {}): DraftInput {
  return {
    playerCount: 4,
    draftCardType: "occupation",
    pickNumber: 1,
    offeredCardIds: ["occ-field-watchman", "minor-grain-supply"],
    pickedCardIds: [],
    seenCardIds: [],
    passedCardIds: [],
    draftFormat: "10-to-7",
    trackingMode: "selected_only",
    cardPoolProfileId: "bga-arena-prototype",
    explanationDepth: "standard",
    ...overrides
  };
}

function assertIncludes(values: string[], expectedValue: string, message: string): void {
  assert.ok(values.includes(expectedValue), message);
}

function assertExcludes(values: string[], unexpectedValue: string, message: string): void {
  assert.equal(values.includes(unexpectedValue), false, message);
}

function assertUnique(values: string[], message: string): void {
  assert.equal(new Set(values).size, values.length, message);
}

function toPlainJson(value: unknown): unknown {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}
