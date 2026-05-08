import { NextRequest, NextResponse } from "next/server";
import { getCardDetail } from "../../../../src/app/card-detail-api.ts";
import { loadDraftCoachData } from "../../../../src/app/draft-coach-api.ts";

type CardDetailRouteContext = {
  params: Promise<{ cardId: string }>;
};

export async function GET(_request: NextRequest, context: CardDetailRouteContext) {
  const { cardId } = await context.params;
  const dataContext = await loadDraftCoachData();
  const detail = getCardDetail(decodeURIComponent(cardId), dataContext);

  if (!detail) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
