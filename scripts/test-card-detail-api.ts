import assert from "node:assert/strict";
import { getCardDetail } from "../src/app/card-detail-api.ts";
import { loadDraftCoachData } from "../src/app/draft-coach-api.ts";

const context = await loadDraftCoachData();
const detail = getCardDetail("occ-field-watchman", context);

assert.ok(detail, "known card should return detail.");
assert.equal(detail.card.id, "occ-field-watchman");
assert.equal(detail.translation?.name, "밭일 감독");
assert.equal(detail.stat?.rank, 1);
assert.equal(detail.stat?.tier, "S");
assert.equal(detail.strategyProfile?.isBroken, true);
assert.equal(detail.strategyProfile?.isPlanAnchor, true);
assert.ok(
  detail.strategyRoles.some((role) => role.id === "broken"),
  "detail should resolve strategy role metadata."
);
assert.ok(
  detail.interpretation.some((line) => line.includes("ADP")),
  "detail should include human-readable stat interpretation."
);

const serialized = JSON.parse(JSON.stringify(detail)) as unknown;
assert.ok(serialized, "detail response should be JSON-serializable.");
assert.equal(getCardDetail("missing-card-id", context), null);

console.log("Card detail API contract passed.");
