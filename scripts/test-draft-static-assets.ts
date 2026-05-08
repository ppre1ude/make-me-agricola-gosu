import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDraftCoachApiServer } from "../src/server/draft-coach-api.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpRoot = path.join(rootDir, ".codex-tmp");

await mkdir(tmpRoot, { recursive: true });
const tmpDir = await mkdtemp(path.join(tmpRoot, "draft-static-assets-"));
const server = createDraftCoachApiServer({
  feedbackStorePath: path.join(tmpDir, "draft-feedback-events.jsonl")
});

try {
  const baseUrl = await listen(server);
  await run(baseUrl);
  console.log("Draft static asset smoke passed.");
} finally {
  await closeServer(server);
  await rm(tmpDir, { recursive: true, force: true });
}

async function run(baseUrl: string): Promise<void> {
  await assertRedirect(baseUrl, "/", "/draft/");
  await assertRedirect(baseUrl, "/draft", "/draft/");

  const index = await fetchText(baseUrl, "/draft/");
  assert.equal(index.status, 200, "GET /draft/ should serve the draft app shell.");
  assertContentType(index, "text/html");
  assert.ok(index.text.includes('<html lang="ko">'), "draft app shell should keep Korean locale.");
  assertOrdered(index.text, [
    "./draft-state-store.js",
    "./pick-resolution.js",
    "./app.js"
  ]);
  assert.ok(index.text.includes('id="recommendButton"'), "draft app shell should expose recommendation controls.");
  assert.ok(index.text.includes('id="feedbackForm"'), "draft app shell should expose neutral feedback controls.");

  await assertAsset(baseUrl, "/draft/styles.css", "text/css", ".app-shell");
  await assertAsset(baseUrl, "/draft/draft-state-store.js", "text/javascript", "window.DraftStateStore");
  await assertAsset(baseUrl, "/draft/pick-resolution.js", "text/javascript", "window.DraftPickResolution");
  await assertAsset(baseUrl, "/draft/app.js", "text/javascript", "DOMContentLoaded");

  const head = await fetchText(baseUrl, "/draft/app.js", { method: "HEAD" });
  assert.equal(head.status, 200, "HEAD /draft/app.js should be supported.");
  assertContentType(head, "text/javascript");
  assert.equal(head.text, "", "HEAD /draft/app.js should not return a response body.");

  const traversal = await fetchText(baseUrl, "/draft/%2e%2e%2fpackage.json");
  assert.equal(traversal.status, 400, "encoded traversal under /draft/ should be rejected.");

  const missing = await fetchText(baseUrl, "/draft/missing.js");
  assert.equal(missing.status, 404, "missing draft assets should return 404.");
}

async function assertRedirect(baseUrl: string, pathname: string, location: string): Promise<void> {
  const response = await fetch(new URL(pathname, `${baseUrl}/`), { redirect: "manual" });
  assert.equal(response.status, 302, `GET ${pathname} should redirect.`);
  assert.equal(response.headers.get("location"), location, `GET ${pathname} should redirect to ${location}.`);
}

async function assertAsset(
  baseUrl: string,
  pathname: string,
  expectedContentType: string,
  expectedText: string
): Promise<void> {
  const response = await fetchText(baseUrl, pathname);
  assert.equal(response.status, 200, `GET ${pathname} should serve a static asset.`);
  assertContentType(response, expectedContentType);
  assert.ok(response.text.includes(expectedText), `GET ${pathname} should include ${expectedText}.`);
}

function assertContentType(response: TextResponse, expectedContentType: string): void {
  const contentType = response.headers.get("content-type") ?? "";
  assert.ok(
    contentType.includes(expectedContentType),
    `Expected content-type ${expectedContentType}, received ${contentType}.`
  );
}

function assertOrdered(text: string, values: string[]): void {
  let previousIndex = -1;

  values.forEach((value) => {
    const index = text.indexOf(value);
    assert.ok(index >= 0, `Expected ${value} to be present.`);
    assert.ok(index > previousIndex, `Expected ${value} to appear after the previous asset.`);
    previousIndex = index;
  });
}

type TextResponse = {
  status: number;
  headers: Headers;
  text: string;
};

async function fetchText(
  baseUrl: string,
  pathname: string,
  init: RequestInit = {}
): Promise<TextResponse> {
  const response = await fetch(new URL(pathname, `${baseUrl}/`), init);
  return {
    status: response.status,
    headers: response.headers,
    text: await response.text()
  };
}

async function listen(server: Server): Promise<string> {
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
    server.listen(0, "127.0.0.1");
  });

  const address = server.address();
  assert.ok(address !== null && typeof address !== "string", "static smoke server should listen on a TCP port.");
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
