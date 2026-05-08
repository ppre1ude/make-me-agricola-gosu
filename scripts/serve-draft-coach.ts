import { createDraftCoachApiServer } from "../src/server/draft-coach-api.ts";

const host = "127.0.0.1";
const port = parsePort(process.argv.slice(2)) ?? 4173;
const server = createDraftCoachApiServer();

server.listen(port, host, () => {
  console.log(`Draft Memory Coach running at http://${host}:${port}/draft/`);
});

function parsePort(args: string[]): number | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--port") {
      const value = args[index + 1];
      if (value === undefined) throw new Error("--port requires a value.");
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        throw new Error(`Invalid port: ${value}`);
      }
      return parsed;
    }
  }

  return undefined;
}
