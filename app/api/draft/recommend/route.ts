import { NextRequest, NextResponse } from "next/server";
import {
  getDraftRecommendations,
  loadDraftCoachData,
  type DraftRecommendPostBody
} from "../../../../src/app/draft-coach-api.ts";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DraftRecommendPostBody;
  const context = await loadDraftCoachData();
  return NextResponse.json(getDraftRecommendations(body, context));
}
