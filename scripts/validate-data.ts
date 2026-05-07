import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateDraftDataSet, type DraftDataSet, type DraftFixture } from "../src/features/draft/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const data: DraftDataSet = {
  cards: await readJson("data/normalized/cards.json"),
  translations: await readJson("data/normalized/translations.ko-KR.json"),
  stats: await readJson("data/normalized/stats.prototype.json"),
  strategyRoles: await readJson("data/normalized/strategy-roles.json"),
  strategyProfiles: await readJson("data/manual/card-strategy-profiles.json"),
  cardPoolProfile: await readJson("data/normalized/card-pool.bga-arena.prototype.json")
};

const fixtures = await readDraftFixtures();
const result = validateDraftDataSet(data, fixtures);

for (const issue of result.issues) {
  const label = issue.severity.toUpperCase();
  const line = `${label} ${issue.path}: ${issue.message}`;
  if (issue.severity === "error") {
    console.error(line);
  } else {
    console.warn(line);
  }
}

if (!result.ok) {
  console.error(`\nData validation failed: ${result.errorCount} errors, ${result.warningCount} warnings.`);
  process.exitCode = 1;
} else {
  console.log(`Data validation passed: ${result.warningCount} warnings.`);
}

async function readDraftFixtures(): Promise<DraftFixture[]> {
  const fixtureDir = path.join(rootDir, "data/fixtures/draft");
  const fixtureFiles = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json"));
  return Promise.all(fixtureFiles.map((file) => readJson<DraftFixture>(path.join("data/fixtures/draft", file))));
}

async function readJson<T>(relativePath: string): Promise<T> {
  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
  return JSON.parse(await readFile(absolutePath, "utf8")) as T;
}
