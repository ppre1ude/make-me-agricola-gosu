import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { DraftFeedbackEvent } from "./contract.ts";

export type DraftFeedbackStore = {
  append(event: DraftFeedbackEvent): Promise<void>;
  list(): Promise<DraftFeedbackEvent[]>;
};

export type DraftFeedbackStoreMalformedRecordReason = "empty_line" | "invalid_json" | "not_json_object";

export class DraftFeedbackStoreMalformedRecordError extends Error {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly line: string;
  readonly reason: DraftFeedbackStoreMalformedRecordReason;

  constructor(params: {
    filePath: string;
    lineNumber: number;
    line: string;
    reason: DraftFeedbackStoreMalformedRecordReason;
    cause?: unknown;
  }) {
    super(
      `Malformed draft feedback JSONL record at ${params.filePath}:${params.lineNumber} (${params.reason})`,
      params.cause === undefined ? undefined : { cause: params.cause }
    );

    this.name = "DraftFeedbackStoreMalformedRecordError";
    this.filePath = params.filePath;
    this.lineNumber = params.lineNumber;
    this.line = params.line;
    this.reason = params.reason;
  }
}

export function createJsonlDraftFeedbackStore(filePath: string): DraftFeedbackStore {
  return {
    async append(event) {
      await mkdir(dirname(filePath), { recursive: true });
      await appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
    },

    async list() {
      let contents: string;

      try {
        contents = await readFile(filePath, "utf8");
      } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
          return [];
        }

        throw error;
      }

      return parseJsonlFeedbackEvents(filePath, contents);
    }
  };
}

export const createDraftFeedbackStore = createJsonlDraftFeedbackStore;

function parseJsonlFeedbackEvents(filePath: string, contents: string): DraftFeedbackEvent[] {
  const lines = contents.split(/\r?\n/);

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line, index) => parseJsonlFeedbackEvent(filePath, line, index + 1));
}

function parseJsonlFeedbackEvent(filePath: string, line: string, lineNumber: number): DraftFeedbackEvent {
  if (line.trim() === "") {
    throw new DraftFeedbackStoreMalformedRecordError({
      filePath,
      lineNumber,
      line,
      reason: "empty_line"
    });
  }

  let value: unknown;

  try {
    value = JSON.parse(line);
  } catch (error) {
    throw new DraftFeedbackStoreMalformedRecordError({
      filePath,
      lineNumber,
      line,
      reason: "invalid_json",
      cause: error
    });
  }

  if (!isJsonObject(value)) {
    throw new DraftFeedbackStoreMalformedRecordError({
      filePath,
      lineNumber,
      line,
      reason: "not_json_object"
    });
  }

  return value as DraftFeedbackEvent;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
