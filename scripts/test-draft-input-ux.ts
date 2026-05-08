import assert from "node:assert/strict";
import {
  buildDraftPreviousPackComparison,
  buildScoringInput,
  computeMissingFromPreviousPack,
  createDefaultDraftInput,
  normalizeDraftInput,
  shouldComparePreviousPack
} from "../src/ui/draft/contract-adapter.ts";

const defaultInput = createDefaultDraftInput();
assert.equal(defaultInput.trackingMode, "full_pack", "full tracking should be the default expert flow.");
assert.equal(shouldComparePreviousPack(defaultInput), false, "early picks should not compare previous packs.");

assert.deepEqual(
  computeMissingFromPreviousPack(
    ["occ-field-watchman", "minor-grain-supply", "minor-grain-supply", "occ-food-engine"],
    ["minor-grain-supply"]
  ),
  ["occ-field-watchman", "occ-food-engine"],
  "missing-card comparison should keep previous-pack order and de-duplicate."
);

const fullPackInput = normalizeDraftInput({
  ...defaultInput,
  pickNumber: 5,
  offeredCardIds: ["minor-grain-supply", "occ-food-engine"],
  previousPackCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"],
  missingFromPreviousPack: ["not-trusted-manual-value"]
});

assert.equal(shouldComparePreviousPack(fullPackInput), true);
assert.deepEqual(
  fullPackInput.missingFromPreviousPack,
  ["occ-field-watchman", "minor-late-points"],
  "full tracking should derive missingFromPreviousPack from previous minus current visible pack."
);

assert.deepEqual(buildDraftPreviousPackComparison(fullPackInput), {
  enabled: true,
  previousPackCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"],
  currentVisiblePackCardIds: ["minor-grain-supply", "occ-food-engine"],
  missingFromPreviousPack: ["occ-field-watchman", "minor-late-points"]
});

assert.deepEqual(
  buildScoringInput(fullPackInput).missingFromPreviousPack,
  ["occ-field-watchman", "minor-late-points"],
  "scoring input should receive the derived missing-card evidence."
);

const quickInput = normalizeDraftInput({
  ...fullPackInput,
  trackingMode: "selected_only"
});

assert.equal(shouldComparePreviousPack(quickInput), false);
assert.equal(quickInput.previousPackCardIds, undefined);
assert.equal(quickInput.missingFromPreviousPack, undefined);
assert.equal(buildScoringInput(quickInput).previousPackCardIds, undefined);
assert.equal(buildScoringInput(quickInput).missingFromPreviousPack, undefined);

const earlyFullPackInput = normalizeDraftInput({
  ...fullPackInput,
  pickNumber: 4,
  trackingMode: "full_pack"
});

assert.equal(shouldComparePreviousPack(earlyFullPackInput), false);
assert.equal(earlyFullPackInput.previousPackCardIds, undefined);
assert.equal(earlyFullPackInput.missingFromPreviousPack, undefined);

console.log("Draft input UX contract passed.");
