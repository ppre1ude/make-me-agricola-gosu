import assert from "node:assert/strict";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1";
const requestTimeoutMs = 2000;

const defaultServerModuleCandidates = [
  "src/features/draft/api/server.ts",
  "src/features/draft/api.ts",
  "src/server/draft-coach-api.ts",
  "src/server/draftCoachApi.ts",
  "src/api/draft/server.ts",
  "src/server.ts"
];

type JsonObject = Record<string, unknown>;
type RequestListener = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
type ServerFactory = (
  options?: { host: string; port: number; feedbackStorePath?: string }
) => unknown | Promise<unknown>;

type CliOptions = {
  baseUrl?: string;
  modulePath?: string;
};

type ApiTarget =
  | {
      kind: "server";
      baseUrl: string;
      source: string;
      feedbackStorePath: string | undefined;
      close: () => Promise<void>;
    }
  | {
      kind: "skip";
      reason: string;
    };

type HttpResult = {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
  json: unknown;
};

type CompactCardType = "occupation" | "minor_improvement" | "major_improvement";

type CompactCard = {
  id: string;
  type: CompactCardType;
  name: string;
};

try {
  await main(parseCliOptions(process.argv.slice(2)));
} catch (error) {
  console.error(formatError(error));
  process.exitCode = 1;
}

async function main(options: CliOptions): Promise<void> {
  const target = await resolveApiTarget(options);

  if (target.kind === "skip") {
    console.log(`SKIP Draft Coach API smoke: ${target.reason}`);
    console.log(
      "Set DRAFT_COACH_API_BASE_URL or DRAFT_COACH_API_MODULE once the API vertical slice is integrated."
    );
    return;
  }

  try {
    await runDraftCoachApiSmoke(target);
    console.log(`Draft Coach API smoke passed against ${target.source}.`);
  } finally {
    await target.close();
  }
}

async function runDraftCoachApiSmoke(target: Extract<ApiTarget, { kind: "server" }>): Promise<void> {
  const { baseUrl } = target;
  const sample = await requestJson(baseUrl, "GET", "/api/draft/sample");
  const offeredCardIds = extractOfferedCardIds(sample);

  assert.ok(offeredCardIds.length > 0, "GET /api/draft/sample must include offered cards.");

  await assertCardsEndpoint(baseUrl, offeredCardIds);

  const recommendationInput = buildRecommendationInput(sample, offeredCardIds);
  const recommendationResponse = await postFirstAccepted(baseUrl, "/api/draft/recommend", [
    recommendationInput,
    { input: recommendationInput }
  ]);
  const recommendations = extractRecommendations(recommendationResponse);

  assert.ok(recommendations.length > 0, "POST /api/draft/recommend must return a ranked list.");

  const topRecommendation = recommendations[0];
  assert.ok(isRecord(topRecommendation), "top recommendation must be an object.");

  const modelTopCardId = readString(topRecommendation, "cardId");
  assert.ok(modelTopCardId, "top recommendation must include cardId.");

  const topScore = topRecommendation.score;
  assert.equal(typeof topScore, "number", "top recommendation must include numeric score.");
  assert.ok(Number.isFinite(topScore), "top recommendation score must be finite.");

  const recommendationCardIds = recommendations
    .map((recommendation) => (isRecord(recommendation) ? readString(recommendation, "cardId") : undefined))
    .filter(isDefined);
  const userSelectedCardId = recommendationCardIds.find((cardId) => cardId !== modelTopCardId);

  assert.ok(
    userSelectedCardId,
    "sample recommendations must include a non-top card so disagreement feedback can be tested."
  );

  const feedbackSubmission = {
    input: recommendationInput,
    recommendationCardIds,
    modelTopCardId,
    userSelectedCardId
  };
  const feedbackResponse = await postFirstAccepted(baseUrl, "/api/draft/feedback", [
    feedbackSubmission,
    { event: { ...feedbackSubmission, eventType: "model_user_disagreement" } }
  ]);
  const feedbackEvent = extractFeedbackEvent(feedbackResponse);
  await assertFeedbackPersisted(target.feedbackStorePath, feedbackEvent);

  assert.equal(
    readString(feedbackEvent, "eventType"),
    "model_user_disagreement",
    "feedback must record model_user_disagreement when selected card differs from model top."
  );
  assert.equal(readString(feedbackEvent, "modelTopCardId"), modelTopCardId);
  assert.equal(readString(feedbackEvent, "userSelectedCardId"), userSelectedCardId);

  const reviewState = readString(feedbackEvent, "reviewState");
  if (reviewState !== undefined) {
    assert.equal(reviewState, "unreviewed", "disagreement feedback must remain neutral/unreviewed.");
  }

  assertNeutralFeedbackEvent(feedbackEvent);
  await assertInvalidFeedbackRejected(baseUrl, feedbackSubmission, target.feedbackStorePath);
}

async function assertFeedbackPersisted(
  feedbackStorePath: string | undefined,
  feedbackEvent: JsonObject
): Promise<void> {
  if (feedbackStorePath === undefined) return;

  const lines = await readFeedbackJsonlLines(feedbackStorePath);

  assert.equal(lines.length, 1, "POST /api/draft/feedback must append one JSONL record.");
  const line = lines[0];
  assert.ok(line !== undefined, "feedback JSONL should include a persisted event line.");
  assert.deepEqual(
    JSON.parse(line) as JsonObject,
    feedbackEvent,
    "persisted JSONL event must match response event."
  );
}

async function assertInvalidFeedbackRejected(
  baseUrl: string,
  validSubmission: JsonObject,
  feedbackStorePath: string | undefined
): Promise<void> {
  const invalidBodies = [
    {
      label: "same model top and selected card",
      body: {
        ...validSubmission,
        userSelectedCardId: validSubmission.modelTopCardId
      }
    },
    {
      label: "invalid possible cause verdict",
      body: {
        ...validSubmission,
        possibleCauses: ["model_wrong"]
      }
    },
    {
      label: "selected card outside recommendations",
      body: {
        ...validSubmission,
        userSelectedCardId: "unknown-card-id"
      }
    }
  ];

  for (const invalidBody of invalidBodies) {
    const result = await fetchJson(baseUrl, "POST", "/api/draft/feedback", invalidBody.body);
    assert.equal(result.status, 400, `POST /api/draft/feedback should reject ${invalidBody.label}.`);
  }

  if (feedbackStorePath === undefined) return;
  assert.equal(
    (await readFeedbackJsonlLines(feedbackStorePath)).length,
    1,
    "rejected feedback submissions must not append JSONL records."
  );
}

async function readFeedbackJsonlLines(feedbackStorePath: string): Promise<string[]> {
  const contents = await readFile(feedbackStorePath, "utf8");
  return contents.split(/\r?\n/).filter((line) => line !== "");
}

async function assertCardsEndpoint(baseUrl: string, offeredCardIds: string[]): Promise<void> {
  const cardsResponse = await requestJson(baseUrl, "GET", "/api/cards");
  const cards = extractCompactCards(cardsResponse, "GET /api/cards");

  assert.ok(cards.length > 0, "GET /api/cards must return cards.");

  const searchSeed = cards.find((card) => offeredCardIds.includes(card.id)) ?? cards[0];
  assert.ok(searchSeed, "GET /api/cards must return a searchable card.");
  const searchResponse = await requestJson(
    baseUrl,
    "GET",
    `/api/cards?q=${encodeURIComponent(searchSeed.name)}`
  );
  const searchCards = extractCompactCards(searchResponse, "GET /api/cards?q");

  assert.ok(searchCards.length > 0, "GET /api/cards?q must return matching cards.");
  assert.ok(
    searchCards.some((card) => card.id === searchSeed.id),
    `GET /api/cards?q must include the searched card ${searchSeed.id}.`
  );

  await assertCardsTypeFilter(baseUrl, cards, "occupation");
  await assertCardsTypeFilter(baseUrl, cards, "minor_improvement");
}

async function assertCardsTypeFilter(
  baseUrl: string,
  cards: CompactCard[],
  type: "occupation" | "minor_improvement"
): Promise<void> {
  if (!cards.some((card) => card.type === type)) return;

  const response = await requestJson(baseUrl, "GET", `/api/cards?type=${type}`);
  const filteredCards = extractCompactCards(response, `GET /api/cards?type=${type}`);

  assert.ok(filteredCards.length > 0, `GET /api/cards?type=${type} must return cards when available.`);
  assert.ok(
    filteredCards.every((card) => card.type === type),
    `GET /api/cards?type=${type} must return only ${type} cards.`
  );
}

async function resolveApiTarget(options: CliOptions): Promise<ApiTarget> {
  const baseUrl = options.baseUrl ?? process.env.DRAFT_COACH_API_BASE_URL;
  if (baseUrl !== undefined && baseUrl.trim() !== "") {
    return {
      kind: "server",
      baseUrl: normalizeBaseUrl(baseUrl),
      source: "DRAFT_COACH_API_BASE_URL",
      feedbackStorePath: undefined,
      close: async () => undefined
    };
  }

  const configuredModulePath = options.modulePath ?? process.env.DRAFT_COACH_API_MODULE;
  const modulePath =
    configuredModulePath === undefined || configuredModulePath.trim() === ""
      ? await findFirstExistingPath(defaultServerModuleCandidates)
      : resolveWorkspacePath(configuredModulePath);

  if (modulePath === undefined) {
    return {
      kind: "skip",
      reason: `no API server module found in ${defaultServerModuleCandidates.join(", ")}`
    };
  }

  if (!(await pathExists(modulePath))) {
    throw new Error(`Configured API server module does not exist: ${modulePath}`);
  }

  const importedModule = (await import(pathToFileURL(modulePath).href)) as JsonObject;
  const target = await createApiTargetFromModule(importedModule, modulePath);

  if (target === undefined) {
    throw new Error(
      [
        `API server module is not wireable: ${modulePath}`,
        "Export an http.Server, a Node request handler, or a factory named createDraftCoachApiServer/createServer.",
        "Alternatively set DRAFT_COACH_API_BASE_URL to test an already-running local server."
      ].join("\n")
    );
  }

  return target;
}

async function createApiTargetFromModule(
  moduleExports: JsonObject,
  modulePath: string
): Promise<ApiTarget | undefined> {
  const directServer = firstExport<Server>(moduleExports, ["draftCoachApiServer", "server", "default"], isHttpServer);
  if (directServer !== undefined) return listenOnEphemeralPort(directServer, modulePath);

  const factory = firstExport<ServerFactory>(
    moduleExports,
    ["createDraftCoachApiServer", "createDraftCoachServer", "createServer", "startDraftCoachApiServer", "default"],
    isServerFactory
  );
  if (factory !== undefined) {
    const feedbackStorePath = path.join(
      rootDir,
      ".codex-tmp",
      `draft-coach-api-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`
    );
    const created = await factory({
      host,
      port: 0,
      feedbackStorePath
    });
    return createApiTargetFromFactoryResult(created, modulePath, feedbackStorePath);
  }

  const handler = firstExport<RequestListener>(
    moduleExports,
    ["draftCoachApiHandler", "requestHandler", "handler", "app", "default"],
    isRequestListener
  );
  if (handler !== undefined) {
    return listenOnEphemeralPort(createServer(wrapRequestListener(handler)), modulePath);
  }

  return undefined;
}

async function createApiTargetFromFactoryResult(
  value: unknown,
  modulePath: string,
  feedbackStorePath?: string
): Promise<ApiTarget | undefined> {
  if (isHttpServer(value)) return listenOnEphemeralPort(value, modulePath, feedbackStorePath);
  if (isRequestListener(value)) {
    return listenOnEphemeralPort(createServer(wrapRequestListener(value)), modulePath, feedbackStorePath);
  }

  if (!isRecord(value)) return undefined;

  const baseUrl = readString(value, "baseUrl");
  if (baseUrl !== undefined) {
    const close = typeof value.close === "function" ? value.close : undefined;
    return {
      kind: "server",
      baseUrl: normalizeBaseUrl(baseUrl),
      source: modulePath,
      feedbackStorePath,
      close: async () => {
        if (close !== undefined) await close.call(value);
      }
    };
  }

  if (isHttpServer(value.server)) return listenOnEphemeralPort(value.server, modulePath, feedbackStorePath);

  const nestedHandler = isRequestListener(value.handler)
    ? value.handler
    : isRequestListener(value.requestHandler)
      ? value.requestHandler
      : isRequestListener(value.app)
        ? value.app
        : undefined;

  if (nestedHandler !== undefined) {
    return listenOnEphemeralPort(createServer(wrapRequestListener(nestedHandler)), modulePath, feedbackStorePath);
  }

  return undefined;
}

async function listenOnEphemeralPort(
  server: Server,
  source: string,
  feedbackStorePath?: string
): Promise<ApiTarget> {
  if (server.address() === null) {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = (): void => {
        server.off("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(0, host);
    });
  }

  const address = server.address();
  assert.ok(address !== null && typeof address !== "string", "API server must listen on a TCP port.");

  return {
    kind: "server",
    baseUrl: `http://${host}:${address.port}`,
    source,
    feedbackStorePath,
    close: async () => closeServer(server)
  };
}

function wrapRequestListener(listener: RequestListener): RequestListener {
  return (request, response) => {
    Promise.resolve(listener(request, response)).catch((error: unknown) => {
      if (!response.headersSent) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ error: formatError(error) }));
        return;
      }

      response.destroy(error instanceof Error ? error : new Error(formatError(error)));
    });
  };
}

async function requestJson(
  baseUrl: string,
  method: "GET" | "POST",
  pathname: string,
  body?: unknown
): Promise<unknown> {
  const result = await fetchJson(baseUrl, method, pathname, body);

  assert.ok(result.ok, `${method} ${pathname} returned ${result.status}: ${result.text}`);
  return result.json;
}

async function postFirstAccepted(baseUrl: string, pathname: string, bodies: unknown[]): Promise<unknown> {
  const failures: string[] = [];

  for (const body of bodies) {
    const result = await fetchJson(baseUrl, "POST", pathname, body);
    if (result.ok) return result.json;
    failures.push(`${result.status} ${result.statusText}: ${result.text}`);
  }

  assert.fail(`POST ${pathname} did not accept any supported request shape:\n${failures.join("\n")}`);
}

async function fetchJson(
  baseUrl: string,
  method: "GET" | "POST",
  pathname: string,
  body?: unknown
): Promise<HttpResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const init: RequestInit = {
      method,
      signal: controller.signal
    };

    if (body !== undefined) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(body);
    }

    const response = await fetch(new URL(pathname, `${baseUrl}/`), init);
    const text = await response.text();
    const json = text.trim() === "" ? {} : parseJson(text, `${method} ${pathname}`);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text,
      json
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`${label} must return JSON. ${formatError(error)} Body: ${text}`);
  }
}

function extractOfferedCardIds(sample: unknown): string[] {
  const stringArrayPaths = [
    ["offeredCardIds"],
    ["input", "offeredCardIds"],
    ["sample", "offeredCardIds"],
    ["sample", "input", "offeredCardIds"]
  ];

  for (const candidatePath of stringArrayPaths) {
    const value = getPath(sample, candidatePath);
    if (isStringArray(value) && value.length > 0) return value;
  }

  const cardArrayPaths = [
    ["offeredCards"],
    ["cards"],
    ["input", "offeredCards"],
    ["sample", "offeredCards"],
    ["sample", "input", "offeredCards"]
  ];

  for (const candidatePath of cardArrayPaths) {
    const value = getPath(sample, candidatePath);
    if (Array.isArray(value)) {
      const cardIds = value.map((card) => (isRecord(card) ? readString(card, "id") : undefined)).filter(isDefined);
      if (cardIds.length > 0) return cardIds;
    }
  }

  return [];
}

function extractCompactCards(response: unknown, label: string): CompactCard[] {
  const cards = Array.isArray(response) ? response : getPath(response, ["cards"]);
  assert.ok(Array.isArray(cards), `${label} must return a cards array.`);

  return cards.map((card, index) => {
    assert.ok(isRecord(card), `${label} cards[${index}] must be an object.`);

    const id = readString(card, "id");
    const type = readString(card, "type");
    const name = readString(card, "name");

    assert.ok(id, `${label} cards[${index}] must include id.`);
    assert.ok(isCompactCardType(type), `${label} cards[${index}] must include a valid type.`);
    assert.ok(name, `${label} cards[${index}] must include name.`);

    return { id, type, name };
  });
}

function buildRecommendationInput(sample: unknown, offeredCardIds: string[]): JsonObject {
  const input = findFirstRecordAtPaths(sample, [
    ["input"],
    ["sample", "input"],
    []
  ]);

  return {
    playerCount: readNumber(input, "playerCount") ?? 4,
    draftCardType: readString(input, "draftCardType") ?? "occupation",
    pickNumber: readNumber(input, "pickNumber") ?? 1,
    offeredCardIds,
    pickedCardIds: readStringArray(input, "pickedCardIds") ?? [],
    seenCardIds: readStringArray(input, "seenCardIds") ?? offeredCardIds,
    passedCardIds: readStringArray(input, "passedCardIds") ?? [],
    previousPackCardIds: readOptionalStringArray(input, "previousPackCardIds"),
    missingFromPreviousPack: readOptionalStringArray(input, "missingFromPreviousPack"),
    draftFormat: readString(input, "draftFormat") ?? "10-to-7",
    trackingMode: readString(input, "trackingMode") ?? "selected_only",
    cardPoolProfileId: readString(input, "cardPoolProfileId") ?? "bga-arena-prototype",
    explanationDepth: readString(input, "explanationDepth") ?? "standard"
  };
}

function extractRecommendations(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;

  const paths = [
    ["recommendations"],
    ["rankedRecommendations"],
    ["result", "recommendations"],
    ["data", "recommendations"]
  ];

  for (const candidatePath of paths) {
    const value = getPath(response, candidatePath);
    if (Array.isArray(value)) return value;
  }

  return [];
}

function extractFeedbackEvent(response: unknown): JsonObject {
  if (isFeedbackEventLike(response)) return response;

  const paths = [
    ["event"],
    ["feedbackEvent"],
    ["recordedEvent"],
    ["data", "event"],
    ["data", "feedbackEvent"]
  ];

  for (const candidatePath of paths) {
    const value = getPath(response, candidatePath);
    if (isFeedbackEventLike(value)) return value;
  }

  assert.fail("POST /api/draft/feedback must return the recorded feedback event.");
}

function assertNeutralFeedbackEvent(event: JsonObject): void {
  const modelWrongFlags = ["modelWrong", "modelWasWrong", "isModelWrong"];

  for (const key of modelWrongFlags) {
    assert.notEqual(event[key], true, `neutral disagreement must not mark ${key}=true.`);
  }

  const judgment = readString(event, "judgment") ?? readString(event, "label");
  assert.notEqual(judgment, "model_wrong", "neutral disagreement must not label the model as wrong.");
}

function isFeedbackEventLike(value: unknown): value is JsonObject {
  return isRecord(value) && readString(value, "eventType") === "model_user_disagreement";
}

function findFirstRecordAtPaths(value: unknown, paths: string[][]): JsonObject {
  for (const candidatePath of paths) {
    const candidate = getPath(value, candidatePath);
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

function getPath(value: unknown, pathParts: string[]): unknown {
  let current = value;

  for (const pathPart of pathParts) {
    if (!isRecord(current)) return undefined;
    current = current[pathPart];
  }

  return current;
}

function firstExport<T>(
  moduleExports: JsonObject,
  names: string[],
  predicate: (value: unknown) => value is T
): T | undefined {
  for (const name of names) {
    const value = moduleExports[name];
    if (predicate(value)) return value;
  }

  return undefined;
}

function isHttpServer(value: unknown): value is Server {
  return (
    isRecord(value) &&
    typeof value.listen === "function" &&
    typeof value.address === "function" &&
    typeof value.close === "function"
  );
}

function isRequestListener(value: unknown): value is RequestListener {
  return typeof value === "function" && value.length >= 2;
}

function isServerFactory(value: unknown): value is ServerFactory {
  return typeof value === "function" && value.length < 2;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCompactCardType(value: unknown): value is CompactCardType {
  return value === "occupation" || value === "minor_improvement" || value === "major_improvement";
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function readString(record: JsonObject, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(record: JsonObject, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(record: JsonObject, key: string): string[] | undefined {
  const value = record[key];
  return isStringArray(value) ? value : undefined;
}

function readOptionalStringArray(record: JsonObject, key: string): string[] | undefined {
  return record[key] === undefined ? undefined : readStringArray(record, key);
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--base-url") {
      const value = args[index + 1];
      assert.ok(value, "--base-url requires a value.");
      options.baseUrl = value;
      index += 1;
    } else if (arg === "--module") {
      const value = args[index + 1];
      assert.ok(value, "--module requires a value.");
      options.modulePath = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Usage: node scripts/test-draft-coach-api.ts [--base-url URL] [--module PATH]

Runs a dependency-free smoke/regression test for:
- GET /api/cards
- GET /api/draft/sample
- POST /api/draft/recommend
- POST /api/draft/feedback

Environment:
- DRAFT_COACH_API_BASE_URL targets an already-running server.
- DRAFT_COACH_API_MODULE imports a local server module and listens on port 0.`);
}

async function findFirstExistingPath(relativePaths: string[]): Promise<string | undefined> {
  for (const relativePath of relativePaths) {
    const absolutePath = resolveWorkspacePath(relativePath);
    if (await pathExists(absolutePath)) return absolutePath;
  }

  return undefined;
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/$/, "");
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error !== undefined) reject(error);
      else resolve();
    });
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
