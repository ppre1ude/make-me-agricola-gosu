import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDraftDataIndex,
  rankDraftOptions,
  type DraftDataSet,
  type DraftFixture,
  type DraftRecommendation,
  type DraftScoringInput
} from "../src/features/draft/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const data: DraftDataSet = {
  cards: await readJson("data/normalized/cards.json"),
  translations: await readJson("data/normalized/translations.ko-KR.json"),
  stats: await readJson("data/normalized/stats.prototype.json"),
  strategyRoles: await readJson("data/normalized/strategy-roles.json"),
  strategyProfiles: await readJson("data/manual/card-strategy-profiles.json"),
  cardPoolProfile: await readJson("data/normalized/card-pool.bga-arena.prototype.json")
};

const dataIndex = buildDraftDataIndex(data);
const fixtureDir = path.join(rootDir, "data/fixtures/draft");
const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json"));

let failures = 0;

for (const file of fixtureFiles) {
  const fixture: DraftFixture = await readJson(path.join("data/fixtures/draft", file));
  const input = normalizeFixtureInput(fixture, data);
  const recommendations = rankDraftOptions(input, dataIndex);
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

async function readJson<T>(relativePath: string): Promise<T> {
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
  return JSON.parse(await readFile(absolutePath, "utf8")) as T;
}

function normalizeFixtureInput(fixture: DraftFixture, data: DraftDataSet): DraftScoringInput {
  const input: DraftScoringInput = {
    playerCount: fixture.input.playerCount ?? 4,
    draftCardType: fixture.input.draftCardType ?? "occupation",
    pickNumber: fixture.input.pickNumber,
    offeredCardIds: fixture.input.offeredCardIds,
    pickedCardIds: fixture.input.pickedCardIds ?? [],
    seenCardIds: fixture.input.seenCardIds ?? [],
    passedCardIds: fixture.input.passedCardIds ?? [],
    draftFormat: fixture.input.draftFormat ?? "10-to-7",
    trackingMode: fixture.input.trackingMode ?? "selected_only",
    cardPoolProfileId: fixture.input.cardPoolProfileId ?? data.cardPoolProfile.id,
    explanationDepth: fixture.input.explanationDepth ?? "standard"
  };

  if (fixture.input.previousPackCardIds !== undefined) input.previousPackCardIds = fixture.input.previousPackCardIds;
  if (fixture.input.missingFromPreviousPack !== undefined) input.missingFromPreviousPack = fixture.input.missingFromPreviousPack;

  return input;
}

function validateFixture(
  fixture: DraftFixture,
  recommendations: DraftRecommendation[]
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
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

  for (const assertion of expected.componentAtLeast ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.components[assertion.component];
    if (actual === undefined || actual < assertion.value) {
      messages.push(`expected ${assertion.cardId}.${assertion.component} >= ${assertion.value}, got ${actual}`);
    }
  }

  for (const assertion of expected.componentBelow ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.components[assertion.component];
    if (actual === undefined || actual >= assertion.value) {
      messages.push(`expected ${assertion.cardId}.${assertion.component} < ${assertion.value}, got ${actual}`);
    }
  }

  for (const assertion of expected.returnLikelihood ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    if (recommendation?.returnLikelihood !== assertion.value) {
      messages.push(`expected ${assertion.cardId}.returnLikelihood ${assertion.value}, got ${recommendation?.returnLikelihood}`);
    }
  }

  for (const assertion of expected.hasRisk ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    if (!recommendation?.risks.includes(assertion.risk)) {
      messages.push(`expected ${assertion.cardId} risk "${assertion.risk}"`);
    }
  }

  for (const assertion of expected.nextPickIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    if (!recommendation?.nextPickDirection.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} nextPickDirection to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.candidateGroupIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    if (!recommendation?.candidateGroups.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} candidateGroups to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.warningIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.warnings.map((warning) => `${warning.code} ${warning.message}`).join(" ") ?? "";
    if (!actual.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} warnings to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.evaluationMetaIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.evaluationMeta;
    if (assertion.confidence !== undefined && actual?.confidence !== assertion.confidence) {
      messages.push(`expected ${assertion.cardId} evaluationMeta.confidence ${assertion.confidence}, got ${actual?.confidence}`);
    }
    if (assertion.method !== undefined && actual?.method !== assertion.method) {
      messages.push(`expected ${assertion.cardId} evaluationMeta.method ${assertion.method}, got ${actual?.method}`);
    }
    if (assertion.missingDataIncludes !== undefined && !actual?.missingData.includes(assertion.missingDataIncludes)) {
      messages.push(`expected ${assertion.cardId} evaluationMeta.missingData to include ${assertion.missingDataIncludes}`);
    }
  }

  for (const assertion of expected.trackingSignalIncludes ?? []) {
    const scopedRecommendations = assertion.cardId
      ? recommendations.filter((recommendation) => recommendation.cardId === assertion.cardId)
      : recommendations;
    const matches = scopedRecommendations.some((recommendation) =>
      recommendation.trackingSignals.some((signal) => {
        const text = `${signal.code} ${signal.roleId ?? ""} ${signal.cardId ?? ""} ${signal.message}`;
        return (assertion.role === undefined || signal.roleId === assertion.role) && text.includes(assertion.value);
      })
    );
    if (!matches) {
      messages.push(`expected tracking signal to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.planShiftIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.planShiftHints.map((hint) => `${hint.code} ${hint.message}`).join(" ") ?? "";
    if (!actual.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} planShiftHints to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.reasonIncludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.reasons[assertion.depth].join(" ") ?? "";
    if (!actual.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} ${assertion.depth} reasons to include "${assertion.value}"`);
    }
  }

  for (const assertion of expected.reasonExcludes ?? []) {
    const recommendation = findRecommendation(recommendations, assertion.cardId);
    const actual = recommendation?.reasons[assertion.depth].join(" ") ?? "";
    if (actual.includes(assertion.value)) {
      messages.push(`expected ${assertion.cardId} ${assertion.depth} reasons not to include "${assertion.value}"`);
    }
  }

  return { ok: messages.length === 0, messages };
}

function findRank(recommendations: DraftRecommendation[], cardId: string): number | undefined {
  return findRecommendation(recommendations, cardId)?.rank;
}

function findRecommendation(recommendations: DraftRecommendation[], cardId: string): DraftRecommendation | undefined {
  return recommendations.find((recommendation) => recommendation.cardId === cardId);
}

function formatRecommendations(recommendations: DraftRecommendation[]): string {
  return recommendations
    .map((recommendation) => {
      const components = JSON.stringify(recommendation.components);
      return `  #${recommendation.rank} ${recommendation.cardId} score=${recommendation.score} return=${recommendation.returnLikelihood} components=${components}`;
    })
    .join("\n");
}
