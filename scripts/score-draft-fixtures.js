import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDraftDataIndex, rankDraftOptions } from "../src/features/draft/scoring.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const data = {
  cards: await readJson("data/normalized/cards.json"),
  translations: await readJson("data/normalized/translations.ko-KR.json"),
  stats: await readJson("data/normalized/stats.prototype.json"),
  strategyProfiles: await readJson("data/manual/card-strategy-profiles.json")
};

const dataIndex = buildDraftDataIndex(data);
const fixtureDir = path.join(rootDir, "data/fixtures/draft");
const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json"));

let failures = 0;

for (const file of fixtureFiles) {
  const fixture = await readJson(path.join("data/fixtures/draft", file));
  const recommendations = rankDraftOptions(fixture.session, dataIndex);
  const result = validateFixture(fixture, recommendations);

  if (result.ok) {
    console.log(`PASS ${fixture.id}: ${recommendations[0]?.cardId ?? "none"} top`);
  } else {
    failures += 1;
    console.error(`FAIL ${fixture.id}`);
    for (const message of result.messages) console.error(`  - ${message}`);
    console.error(formatRecommendations(recommendations));
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`\n${fixtureFiles.length} draft fixtures passed.`);
}

async function readJson(relativePath) {
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
  return JSON.parse(await readFile(absolutePath, "utf8"));
}

function validateFixture(fixture, recommendations) {
  const messages = [];
  const expected = fixture.expected ?? {};
  const topCardId = recommendations[0]?.cardId;

  if (expected.topCardId && topCardId !== expected.topCardId) {
    messages.push(`expected top card ${expected.topCardId}, got ${topCardId}`);
  }

  for (const cardId of expected.notTopCardIds ?? []) {
    if (topCardId === cardId) messages.push(`expected ${cardId} not to be top card`);
  }

  for (const pair of expected.downrankedBelow ?? []) {
    const cardRank = findRank(recommendations, pair.cardId);
    const belowCardRank = findRank(recommendations, pair.belowCardId);
    if (cardRank === undefined || belowCardRank === undefined) {
      messages.push(`missing compared cards ${pair.cardId} or ${pair.belowCardId}`);
    } else if (cardRank <= belowCardRank) {
      messages.push(`expected ${pair.cardId} rank ${cardRank} below ${pair.belowCardId} rank ${belowCardRank}`);
    }
  }

  return { ok: messages.length === 0, messages };
}

function findRank(recommendations, cardId) {
  return recommendations.find((recommendation) => recommendation.cardId === cardId)?.rank;
}

function formatRecommendations(recommendations) {
  return recommendations
    .map((recommendation) => {
      const components = JSON.stringify(recommendation.components);
      return `  #${recommendation.rank} ${recommendation.cardId} score=${recommendation.score} return=${recommendation.returnLikelihood} components=${components}`;
    })
    .join("\n");
}
