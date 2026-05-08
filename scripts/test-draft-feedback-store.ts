import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createJsonlDraftFeedbackStore,
  DraftFeedbackStoreMalformedRecordError,
  type DraftFeedbackStoreMalformedRecordReason
} from "../src/features/draft/feedback-store.ts";
import type { DraftFeedbackEvent } from "../src/features/draft/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpRoot = path.join(rootDir, ".codex-tmp");

await mkdir(tmpRoot, { recursive: true });
const tmpDir = await mkdtemp(path.join(tmpRoot, "draft-feedback-store-"));

try {
  await run();
  console.log("Draft feedback store smoke passed.");
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

async function run(): Promise<void> {
  const feedbackStorePath = path.join(tmpDir, "nested", "draft-feedback-events.jsonl");
  const store = createJsonlDraftFeedbackStore(feedbackStorePath);

  assert.deepEqual(await store.list(), [], "missing feedback JSONL file should list as empty.");

  const firstEvent = buildFeedbackEvent("draft-feedback-test-1");
  const secondEvent = buildFeedbackEvent("draft-feedback-test-2", {
    occurredAt: "2026-05-08T00:00:01.000Z",
    userSelectedCardId: "minor-late-points",
    possibleCauses: ["strategy_disagreement"],
    note: "Human pilot preferred a late point card."
  });

  await store.append(firstEvent);
  await store.append(secondEvent);

  assert.deepEqual(
    await store.list(),
    [firstEvent, secondEvent],
    "feedback store should list appended events in order."
  );

  const contents = await readFile(feedbackStorePath, "utf8");
  const lines = contents.split(/\r?\n/);
  assert.equal(lines.length, 3, "feedback JSONL should end with one trailing newline.");
  assert.equal(lines[2], "", "feedback JSONL should keep the final trailing newline empty segment.");
  const firstLine = lines[0];
  const secondLine = lines[1];
  assert.ok(firstLine !== undefined, "feedback JSONL should include the first event line.");
  assert.ok(secondLine !== undefined, "feedback JSONL should include the second event line.");
  assert.deepEqual(
    JSON.parse(firstLine) as DraftFeedbackEvent,
    firstEvent,
    "first JSONL line should be the first event."
  );
  assert.deepEqual(
    JSON.parse(secondLine) as DraftFeedbackEvent,
    secondEvent,
    "second JSONL line should be the second event."
  );

  await assertMalformedRecord("empty-line.jsonl", `${JSON.stringify(firstEvent)}\n\n`, "empty_line", 2);
  await assertMalformedRecord("invalid-json.jsonl", `${JSON.stringify(firstEvent)}\n{not json}\n`, "invalid_json", 2);
  await assertMalformedRecord("not-object.jsonl", `"not an object"\n`, "not_json_object", 1);
}

async function assertMalformedRecord(
  fileName: string,
  contents: string,
  reason: DraftFeedbackStoreMalformedRecordReason,
  lineNumber: number
): Promise<void> {
  const feedbackStorePath = path.join(tmpDir, fileName);
  await writeFile(feedbackStorePath, contents, "utf8");

  const store = createJsonlDraftFeedbackStore(feedbackStorePath);

  try {
    await store.list();
    assert.fail(`Expected malformed feedback record error for ${fileName}.`);
  } catch (error) {
    assert.ok(error instanceof DraftFeedbackStoreMalformedRecordError);
    assert.equal(error.reason, reason);
    assert.equal(error.lineNumber, lineNumber);
    assert.equal(error.filePath, feedbackStorePath);
  }
}

function buildFeedbackEvent(
  id: string,
  overrides: Partial<DraftFeedbackEvent> = {}
): DraftFeedbackEvent {
  return {
    id,
    eventType: "model_user_disagreement",
    occurredAt: "2026-05-08T00:00:00.000Z",
    input: {
      pickNumber: 2,
      pickedCardIds: [],
      seenCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"],
      passedCardIds: [],
      offeredCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"]
    },
    recommendationCardIds: ["occ-field-watchman", "minor-grain-supply", "minor-late-points"],
    modelTopCardId: "occ-field-watchman",
    userSelectedCardId: "minor-grain-supply",
    reviewState: "unreviewed",
    possibleCauses: ["pilot_user_preference"],
    ...overrides
  };
}
