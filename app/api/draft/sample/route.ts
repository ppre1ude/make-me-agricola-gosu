import { NextResponse } from "next/server";
import { getDraftSample, loadDraftCoachData } from "../../../../src/app/draft-coach-api.ts";

export async function GET() {
  const context = await loadDraftCoachData();
  return NextResponse.json(getDraftSample(context));
}
