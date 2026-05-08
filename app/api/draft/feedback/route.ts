import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  loadDraftCoachData,
  submitDraftFeedback,
  type DraftFeedbackPostBody
} from "../../../../src/app/draft-coach-api.ts";
import { validateDraftDataSet } from "../../../../src/features/draft/index.ts";

const feedbackStorePath = path.join(process.cwd(), "data/local/draft-feedback-events.jsonl");

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DraftFeedbackPostBody;
  const context = await loadDraftCoachData();
  let validationError: NextResponse | undefined;

  const result = await submitDraftFeedback(body, {
    feedbackSink: async (event) => {
      const validation = validateDraftDataSet(context.data, [], [event]);
      if (!validation.ok) {
        validationError = NextResponse.json(
          { error: "Invalid draft feedback event.", details: { issues: validation.issues } },
          { status: 400 }
        );
        return;
      }
      await mkdir(path.dirname(feedbackStorePath), { recursive: true });
      await appendFile(feedbackStorePath, `${JSON.stringify(event)}\n`, "utf8");
    }
  });

  if (validationError) return validationError;
  return NextResponse.json(result, { status: 201 });
}
