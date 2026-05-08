import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getDraftRecommendations,
  getDraftSample,
  loadDraftCoachData,
  submitDraftFeedback,
  type DraftFeedbackPostBody,
  type DraftRecommendPostBody
} from "../app/draft-coach-api.ts";
import {
  createJsonlDraftFeedbackStore,
  type DraftFeedbackStore
} from "../features/draft/feedback-store.ts";
import {
  validateDraftDataSet,
  type Card,
  type CardPoolStatus,
  type DraftFeedbackEvent
} from "../features/draft/index.ts";

const DEFAULT_ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_PUBLIC_DIR = path.join(DEFAULT_ROOT_DIR, "public/draft");
const DEFAULT_FEEDBACK_STORE_PATH = path.join(DEFAULT_ROOT_DIR, "data/local/draft-feedback-events.jsonl");
const JSON_BODY_LIMIT_BYTES = 128 * 1024;
const CARD_SEARCH_RESULT_LIMIT = 50;
const CARD_TYPES: ReadonlySet<Card["type"]> = new Set([
  "occupation",
  "minor_improvement",
  "major_improvement"
]);

type JsonRecord = Record<string, unknown>;

export type DraftCoachApiServerOptions = {
  rootDir?: string;
  publicDir?: string;
  feedbackStorePath?: string;
  feedbackStore?: DraftFeedbackStore;
};

type DraftCoachApiRuntime = {
  rootDir: string;
  publicDir: string;
  dataContext: Awaited<ReturnType<typeof loadDraftCoachData>>;
  feedbackStore: DraftFeedbackStore;
};

class DraftCoachHttpError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "DraftCoachHttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createDraftCoachApiServer(options: DraftCoachApiServerOptions = {}): Server {
  let runtimePromise: Promise<DraftCoachApiRuntime> | undefined;

  async function getRuntime(): Promise<DraftCoachApiRuntime> {
    runtimePromise ??= createRuntime(options);
    return runtimePromise;
  }

  return createServer(async (request, response) => {
    try {
      const runtime = await getRuntime();
      await draftCoachApiHandler(request, response, runtime);
    } catch (error) {
      sendError(response, error);
    }
  });
}

export async function draftCoachApiHandler(
  request: IncomingMessage,
  response: ServerResponse,
  runtime?: DraftCoachApiRuntime
): Promise<void> {
  const activeRuntime = runtime ?? (await createRuntime());
  const url = new URL(request.url ?? "/", "http://localhost");
  const method = request.method ?? "GET";

  if (method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "draft-memory-coach" });
    return;
  }

  if (method === "GET" && url.pathname === "/api/draft/sample") {
    sendJson(response, 200, getDraftSample(activeRuntime.dataContext));
    return;
  }

  if (method === "GET" && url.pathname === "/api/cards") {
    sendJson(response, 200, {
      cards: getCompactCards(activeRuntime, {
        type: url.searchParams.get("type"),
        q: url.searchParams.get("q"),
        limit: url.searchParams.get("limit")
      })
    });
    return;
  }

  if (
    method === "POST" &&
    (url.pathname === "/api/draft/recommend" || url.pathname === "/api/draft/recommendations")
  ) {
    const body = parseRecommendBody(await readJsonBody(request));
    sendJson(response, 200, getDraftRecommendations(body, activeRuntime.dataContext));
    return;
  }

  if (method === "POST" && url.pathname === "/api/draft/feedback") {
    const body = parseFeedbackBody(await readJsonBody(request));
    const result = await submitDraftFeedback(body, {
      createId: (_body, occurredAt) => createFeedbackEventId(occurredAt),
      feedbackSink: async (event) => appendValidatedFeedbackEvent(activeRuntime, event)
    });
    sendJson(response, 201, result);
    return;
  }

  if (method === "GET" || method === "HEAD") {
    if (await tryServeStaticDraftAsset(activeRuntime, request, response, url)) return;
  }

  throw new DraftCoachHttpError(404, `No route for ${method} ${url.pathname}`);
}

async function createRuntime(options: DraftCoachApiServerOptions = {}): Promise<DraftCoachApiRuntime> {
  const rootDir = path.resolve(options.rootDir ?? DEFAULT_ROOT_DIR);
  const publicDir = path.resolve(options.publicDir ?? DEFAULT_PUBLIC_DIR);
  const feedbackStore =
    options.feedbackStore ??
    createJsonlDraftFeedbackStore(path.resolve(options.feedbackStorePath ?? DEFAULT_FEEDBACK_STORE_PATH));

  return {
    rootDir,
    publicDir,
    dataContext: await loadDraftCoachData({ rootDir }),
    feedbackStore
  };
}

async function appendValidatedFeedbackEvent(
  runtime: DraftCoachApiRuntime,
  event: DraftFeedbackEvent
): Promise<void> {
  const validation = validateDraftDataSet(runtime.dataContext.data, [], [event]);
  if (!validation.ok) {
    throw new DraftCoachHttpError(400, "Invalid draft feedback event.", {
      issues: validation.issues
    });
  }

  await runtime.feedbackStore.append(event);
}

function parseRecommendBody(body: unknown): DraftRecommendPostBody {
  const record = requireRecord(body, "Recommendation request body must be a JSON object.");
  const pickNumber = record.pickNumber;
  const offeredCardIds = record.offeredCardIds;

  if (typeof pickNumber !== "number" || !Number.isInteger(pickNumber)) {
    throw new DraftCoachHttpError(400, "pickNumber must be an integer.");
  }
  if (!isStringArray(offeredCardIds) || offeredCardIds.length === 0) {
    throw new DraftCoachHttpError(400, "offeredCardIds must be a non-empty string array.");
  }

  return record as DraftRecommendPostBody;
}

function parseFeedbackBody(body: unknown): DraftFeedbackPostBody {
  const record = requireRecord(body, "Feedback request body must be a JSON object.");
  const input = requireRecord(record.input, "feedback.input must be a JSON object.");

  if (!isStringArray(record.recommendationCardIds) || record.recommendationCardIds.length === 0) {
    throw new DraftCoachHttpError(400, "recommendationCardIds must be a non-empty string array.");
  }
  if (typeof record.modelTopCardId !== "string" || record.modelTopCardId.trim() === "") {
    throw new DraftCoachHttpError(400, "modelTopCardId must be a non-empty string.");
  }
  if (typeof record.userSelectedCardId !== "string" || record.userSelectedCardId.trim() === "") {
    throw new DraftCoachHttpError(400, "userSelectedCardId must be a non-empty string.");
  }

  parseRecommendBody(input);
  return record as DraftFeedbackPostBody;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    byteLength += buffer.length;
    if (byteLength > JSON_BODY_LIMIT_BYTES) {
      throw new DraftCoachHttpError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return {};

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new DraftCoachHttpError(400, "Request body must be valid JSON.", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

function getCompactCards(
  runtime: DraftCoachApiRuntime,
  filters: { type: string | null; q: string | null; limit: string | null }
): CompactCard[] {
  const typeFilter = parseCardTypeFilter(filters.type);
  if (typeFilter === "invalid") return [];

  const query = createSearchQuery(filters.q ?? "");
  const limit = parseCardSearchLimit(filters.limit);

  return runtime.dataContext.data.cards
    .filter((card) => typeFilter === undefined || card.type === typeFilter)
    .map((card, index) => ({
      index,
      entry: createCardSearchEntry(runtime, card)
    }))
    .map(({ index, entry }) => ({
      index,
      entry,
      rank: rankCardSearchEntry(entry, query)
    }))
    .filter((result): result is { index: number; entry: CardSearchEntry; rank: number } => result.rank !== undefined)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, limit)
    .map((result) => result.entry.card);
}

type CompactCard = {
  id: string;
  type: Card["type"];
  name: string;
  aliases: string[];
  cardPoolStatus?: CardPoolStatus;
};

type CardTypeFilter = Card["type"] | "invalid" | undefined;

type SearchQuery = {
  normalized: string;
  compact: string;
  tokens: string[];
};

type CardSearchEntry = {
  card: CompactCard;
  normalizedValues: string[];
  compactValues: string[];
};

function parseCardTypeFilter(value: string | null): CardTypeFilter {
  if (value === null || value.trim() === "") return undefined;

  const type = value.trim();
  if (isCardType(type)) return type;
  return "invalid";
}

function isCardType(value: string): value is Card["type"] {
  return CARD_TYPES.has(value as Card["type"]);
}

function parseCardSearchLimit(value: string | null): number {
  if (value === null || value.trim() === "") return CARD_SEARCH_RESULT_LIMIT;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return CARD_SEARCH_RESULT_LIMIT;

  return Math.min(Math.trunc(parsed), CARD_SEARCH_RESULT_LIMIT);
}

function createCardSearchEntry(runtime: DraftCoachApiRuntime, card: Card): CardSearchEntry {
  const translation = runtime.dataContext.dataIndex.translationsByCardId.get(card.id);
  const aliases = translation?.aliases ?? [];
  const compactCard: CompactCard = {
    id: card.id,
    type: card.type,
    name: translation?.name ?? card.id,
    aliases
  };
  const cardPoolStatus = runtime.dataContext.data.cardPoolProfile.cardStatuses[card.id];
  if (cardPoolStatus !== undefined) compactCard.cardPoolStatus = cardPoolStatus;

  const searchableValues = [
    card.id,
    translation?.name,
    translation?.officialName,
    translation?.bgaName,
    ...aliases
  ].filter(isNonEmptyString);

  return {
    card: compactCard,
    normalizedValues: searchableValues.map(normalizeSearchText),
    compactValues: searchableValues.map(compactSearchText)
  };
}

function createSearchQuery(value: string): SearchQuery {
  const normalized = normalizeSearchText(value);
  return {
    normalized,
    compact: compactSearchText(normalized),
    tokens: normalized.split(" ").filter((token) => token !== "")
  };
}

function rankCardSearchEntry(entry: CardSearchEntry, query: SearchQuery): number | undefined {
  if (query.normalized === "") return 0;

  if (
    entry.normalizedValues.some((value) => value === query.normalized) ||
    (query.compact !== "" && entry.compactValues.some((value) => value === query.compact))
  ) {
    return 0;
  }

  if (
    entry.normalizedValues.some((value) => value.startsWith(query.normalized)) ||
    (query.compact !== "" && entry.compactValues.some((value) => value.startsWith(query.compact)))
  ) {
    return 1;
  }

  if (entry.normalizedValues.some((value) => value.includes(query.normalized))) return 2;
  if (query.compact !== "" && entry.compactValues.some((value) => value.includes(query.compact))) return 3;

  if (query.tokens.length > 1) {
    const compactTokens = query.tokens.map(compactSearchText);
    const matchesAllTokens = query.tokens.every((token, index) => {
      const compactToken = compactTokens[index];
      return (
        entry.normalizedValues.some((value) => value.includes(token)) ||
        (compactToken !== undefined &&
          compactToken !== "" &&
          entry.compactValues.some((value) => value.includes(compactToken)))
      );
    });
    if (matchesAllTokens) return 4;
  }

  return undefined;
}

async function tryServeStaticDraftAsset(
  runtime: DraftCoachApiRuntime,
  request: IncomingMessage,
  response: ServerResponse,
  url: URL
): Promise<boolean> {
  if (url.pathname === "/") {
    redirect(response, "/draft/");
    return true;
  }

  if (url.pathname === "/draft") {
    redirect(response, "/draft/");
    return true;
  }

  if (!url.pathname.startsWith("/draft/")) return false;

  const relativePath = decodeURIComponent(url.pathname.slice("/draft/".length)) || "index.html";
  const requestedPath = safeResolve(runtime.publicDir, relativePath);
  if (requestedPath === undefined) {
    throw new DraftCoachHttpError(400, "Invalid static asset path.");
  }

  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(requestedPath);
  } catch {
    return false;
  }

  if (!fileStat.isFile()) return false;

  response.statusCode = 200;
  response.setHeader("content-type", contentTypeFor(requestedPath));
  response.setHeader("cache-control", "no-store");
  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  await new Promise<void>((resolve, reject) => {
    createReadStream(requestedPath)
      .once("error", reject)
      .once("end", resolve)
      .pipe(response);
  });
  return true;
}

function safeResolve(rootDir: string, relativePath: string): string | undefined {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) return undefined;
  const resolved = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  return resolved;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: unknown): void {
  if (response.headersSent) {
    response.destroy(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  if (error instanceof DraftCoachHttpError) {
    sendJson(response, error.statusCode, {
      error: error.message,
      details: error.details
    });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  sendJson(response, 500, { error: message });
}

function redirect(response: ServerResponse, location: string): void {
  response.statusCode = 302;
  response.setHeader("location", location);
  response.end();
}

function requireRecord(value: unknown, message: string): JsonRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as JsonRecord;
  throw new DraftCoachHttpError(400, message);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim() !== "");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

function createFeedbackEventId(occurredAt: string): string {
  const timestamp = occurredAt.replace(/[^0-9A-Za-z]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `draft-feedback-${timestamp}-${suffix}`;
}

function contentTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
