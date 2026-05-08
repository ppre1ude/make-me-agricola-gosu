import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateDraftDataSet,
  type DraftDataSet,
  type DraftFeedbackEvent,
  type DraftFixture
} from "../src/features/draft/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const sharedData = {
  cards: await readJson<DraftDataSet["cards"]>("data/normalized/cards.json"),
  translations: await readJson<DraftDataSet["translations"]>("data/normalized/translations.ko-KR.json"),
  strategyRoles: await readJson<DraftDataSet["strategyRoles"]>("data/normalized/strategy-roles.json"),
  strategyProfiles: await readJson<DraftDataSet["strategyProfiles"]>("data/manual/card-strategy-profiles.json")
};
const dataSetConfigs = [
  {
    id: "prototype",
    stats: "data/normalized/stats.prototype.json",
    cardPoolProfile: "data/normalized/card-pool.bga-arena.prototype.json"
  },
  {
    id: "woongi-lumin-bga-2025-09-01",
    stats: "data/normalized/stats.woongi-lumin-bga.2025-09-01.json",
    cardPoolProfile: "data/normalized/card-pool.bga-arena.woongi-2025-09-01.json"
  }
];

const fixtures = await readDraftFixtures();
const feedbackEvents = await readDraftFeedbackEvents();
const results = await Promise.all(
  dataSetConfigs.map(async (config) => ({
    id: config.id,
    result: validateDraftDataSet(
      {
        ...sharedData,
        stats: await readJson<DraftDataSet["stats"]>(config.stats),
        cardPoolProfile: await readJson<DraftDataSet["cardPoolProfile"]>(config.cardPoolProfile)
      },
      fixtures,
      feedbackEvents
    )
  }))
);

let errorCount = 0;
let warningCount = 0;

for (const { id, result } of results) {
  errorCount += result.errorCount;
  warningCount += result.warningCount;

  for (const issue of result.issues) {
    const label = issue.severity.toUpperCase();
    const line = `${label} ${id}.${issue.path}: ${issue.message}`;
    if (issue.severity === "error") {
      console.error(line);
    } else {
      console.warn(line);
    }
  }
}

if (errorCount > 0) {
  console.error(`\nData validation failed: ${errorCount} errors, ${warningCount} warnings.`);
  process.exitCode = 1;
} else {
  console.log(`Data validation passed: ${warningCount} warnings.`);
}

async function readDraftFixtures(): Promise<DraftFixture[]> {
  const fixtureDir = path.join(rootDir, "data/fixtures/draft");
  const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json"));
  return Promise.all(fixtureFiles.map((file) => readJson<DraftFixture>(path.join("data/fixtures/draft", file))));
}

async function readDraftFeedbackEvents(): Promise<DraftFeedbackEvent[]> {
  const fixtureDir = path.join(rootDir, "data/fixtures/draft-feedback");
  const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json"));
  return Promise.all(
    fixtureFiles.map((file) => readJson<DraftFeedbackEvent>(path.join("data/fixtures/draft-feedback", file)))
  );
}

async function readJson<T>(relativePath: string): Promise<T> {
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
  return JSON.parse(await readFile(absolutePath, "utf8")) as T;
}
