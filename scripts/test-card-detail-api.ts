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
assert.ok(detail.sourceRefs.includes("manual-prototype-seed"));
assert.ok(detail.sourceRefs.includes("woongi-tierlist-2025-09-01"));

const prototypeAttribution = detail.sourceAttributions.find(
  (source) => source.sourceRef === "manual-prototype-seed"
);
assert.ok(prototypeAttribution, "prototype detail should retain manual seed attribution.");
assert.equal(prototypeAttribution.label, "Manual prototype seed");
assert.deepEqual(prototypeAttribution.scopes, [
  "card",
  "translation",
  "strategyProfile",
  "cardPoolProfile"
]);

const mergedWoongiAttribution = detail.sourceAttributions.find(
  (source) => source.sourceRef === "woongi-tierlist-2025-09-01"
);
assert.ok(mergedWoongiAttribution, "prototype cards merged with Woongi data should include Woongi attribution.");
assert.deepEqual(mergedWoongiAttribution.scopes, ["card", "translation"]);
assert.ok(
  detail.interpretation.some((line) => line.includes("ADP")),
  "detail should include human-readable stat interpretation."
);

const serialized = JSON.parse(JSON.stringify(detail)) as unknown;
assert.ok(serialized, "detail response should be JSON-serializable.");

const woongiDetail = getCardDetail("occ-woongi-001", context);
assert.ok(woongiDetail, "Woongi imported cards should return detail.");

const woongiAttribution = woongiDetail.sourceAttributions.find(
  (source) => source.sourceRef === "woongi-tierlist-2025-09-01"
);
assert.ok(woongiAttribution, "Woongi imported cards should expose source attribution.");
assert.equal(woongiAttribution.label, "아그리콜라 카드 티어리스트 검색기_250901_웅이_V2");
assert.equal(woongiAttribution.author, "웅이 / bigman0603");
assert.equal(woongiAttribution.sourceUrl, "https://boardgamelaboratory.tistory.com/7");
assert.equal(woongiAttribution.snapshotDate, "2025-09-01");
assert.ok(woongiAttribution.attributionTextKo?.includes("웅이 / bigman0603"));
assert.deepEqual(woongiAttribution.scopes, ["card", "translation", "strategyProfile"]);

assert.equal(getCardDetail("missing-card-id", context), null);

console.log("Card detail API contract passed.");
