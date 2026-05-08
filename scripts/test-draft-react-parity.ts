import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const referenceFiles = {
  html: path.join(rootDir, "public", "draft", "index.html"),
  app: path.join(rootDir, "public", "draft", "app.js"),
  styles: path.join(rootDir, "public", "draft", "styles.css")
};

const requiredDomIds = [
  "appStatus",
  "recommendButton",
  "loadSampleButton",
  "undoPickButton",
  "pickNumberInput",
  "draftCardTypeSelect",
  "draftFormatSelect",
  "trackingModeSelect",
  "explanationDepthSelect",
  "skillLevelSelect",
  "offeredCardSearch",
  "pickedCardSearch",
  "seenCardSearch",
  "passedCardSearch",
  "recommendations",
  "recommendationStatus",
  "feedbackForm",
  "resolvePickButton",
  "submitFeedbackButton",
  "pickConfirmModal",
  "confirmPickButton"
] as const;

const requiredApiTokens = [
  "/api/draft/sample",
  "/api/cards",
  "/api/draft/recommend",
  "/api/draft/feedback"
] as const;

const requiredStateTokens = [
  "DraftStateStore",
  "DraftPickResolution",
  "buildScoringInput",
  "buildFeedbackPayload",
  "createDefaultDraftInput",
  "model_user_disagreement",
  "offeredCardIds",
  "pickedCardIds",
  "seenCardIds",
  "passedCardIds",
  "draftFormat",
  "trackingMode",
  "explanationDepth",
  "skillLevel"
] as const;

const requiredClassTokens = [
  "app-shell",
  "top-bar",
  "coach-layout",
  "draft-panel",
  "recommendations-panel",
  "feedback-panel",
  "recommendation-card",
  "recommendation-radio",
  "chip-list",
  "alert-list",
  "modal-backdrop",
  "confirm-dialog"
] as const;

const reactSearchRoots = [
  path.join(rootDir, "app"),
  path.join(rootDir, "src", "app"),
  path.join(rootDir, "components"),
  path.join(rootDir, "src", "components"),
  path.join(rootDir, "src", "ui"),
  path.join(rootDir, "src", "features", "draft")
] as const;

const reference = {
  html: await readRequiredText(referenceFiles.html),
  app: await readRequiredText(referenceFiles.app),
  styles: await readRequiredText(referenceFiles.styles)
};

assertStaticReference(reference);

const reactFiles = await findReactSourceFiles(reactSearchRoots);
if (reactFiles.length === 0) {
  console.log("Draft React parity reference passed; React/Next draft source is not scaffolded yet.");
} else {
  const reactSource = await readCombinedSource(reactFiles);
  if (shouldEnforceReactParity(reactSource, reactFiles)) {
    assertReactParity(reactSource, reactFiles);
    console.log(`Draft React parity passed across ${reactFiles.length} draft source file(s).`);
  } else {
    console.log(
      `Draft React parity reference passed; found ${reactFiles.length} partial draft source file(s), full parity pending.`
    );
  }
}

type ReferenceSource = {
  html: string;
  app: string;
  styles: string;
};

async function readRequiredText(filePath: string): Promise<string> {
  const text = await readFile(filePath, "utf8");
  assert.ok(text.length > 0, `${relative(filePath)} should not be empty.`);
  return text;
}

function assertStaticReference(source: ReferenceSource): void {
  assert.ok(source.html.includes('<html lang="ko">'), "static reference should keep Korean document locale.");
  assertOrdered(source.html, ["./draft-state-store.js", "./pick-resolution.js", "./app.js"]);

  requiredDomIds.forEach((id) => {
    assert.ok(source.html.includes(`id="${id}"`), `static reference should expose #${id}.`);
  });

  requiredApiTokens.forEach((token) => {
    assert.ok(source.app.includes(token), `static reference app.js should include ${token}.`);
  });

  requiredStateTokens.forEach((token) => {
    assert.ok(source.app.includes(token), `static reference app.js should include ${token}.`);
  });

  requiredClassTokens.forEach((className) => {
    assert.ok(source.styles.includes(`.${className}`), `static reference styles.css should include .${className}.`);
  });

  assert.ok(source.styles.includes("@media (max-width: 960px)"), "static reference should keep tablet/mobile layout breakpoint.");
  assert.ok(source.styles.includes("@media (max-width: 620px)"), "static reference should keep compact mobile layout breakpoint.");
}

function assertReactParity(source: string, files: string[]): void {
  assert.ok(
    /DraftMemoryCoach|draft memory|Draft Memory|recommendation/i.test(source),
    `React draft source should look like the Draft Memory Coach surface: ${files.map(relative).join(", ")}.`
  );

  requiredDomIds.forEach((id) => {
    assertIncludesToken(source, id, `React draft source should preserve #${id}.`);
  });

  requiredApiTokens.forEach((token) => {
    assertIncludesToken(source, token, `React draft source should preserve API contract ${token}.`);
  });

  requiredStateTokens.forEach((token) => {
    assertIncludesToken(source, token, `React draft source should preserve state/contract token ${token}.`);
  });

  requiredClassTokens.forEach((className) => {
    assertIncludesToken(source, className, `React draft source should preserve layout class ${className}.`);
  });
}

function shouldEnforceReactParity(source: string, files: readonly string[]): boolean {
  return (
    files.some((file) => /(^|\/)(page|DraftMemoryCoach|DraftCoach)\.(tsx|ts|jsx|js)$/.test(relative(file))) ||
    requiredDomIds.some((id) => source.includes(id)) ||
    requiredApiTokens.some((token) => source.includes(token))
  );
}

function assertIncludesToken(source: string, token: string, message: string): void {
  assert.ok(source.includes(token), message);
}

function assertOrdered(text: string, values: readonly string[]): void {
  let previousIndex = -1;

  values.forEach((value) => {
    const index = text.indexOf(value);
    assert.ok(index >= 0, `Expected ${value} to be present.`);
    assert.ok(index > previousIndex, `Expected ${value} to appear after the previous value.`);
    previousIndex = index;
  });
}

async function findReactSourceFiles(roots: readonly string[]): Promise<string[]> {
  const files: string[] = [];

  for (const root of roots) {
    if (!(await pathExists(root))) continue;
    files.push(...(await walkReactFiles(root)));
  }

  return [...new Set(files)].sort();
}

async function walkReactFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "build", "coverage"].includes(entry.name)) continue;
      files.push(...(await walkReactFiles(entryPath)));
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function readCombinedSource(files: readonly string[]): Promise<string> {
  const chunks = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(file, "utf8");
      return `\n/* ${relative(file)} */\n${text}`;
    })
  );
  return chunks.join("\n");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function relative(filePath: string): string {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}
