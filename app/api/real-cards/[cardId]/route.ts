import { NextRequest, NextResponse } from "next/server";
import { getRealCardDetail } from "../../../../src/app/real-card-catalog-api.ts";

type RealCardDetailRouteContext = {
  params: Promise<{ cardId: string }>;
};

export async function GET(_request: NextRequest, context: RealCardDetailRouteContext) {
  try {
    const { cardId } = await context.params;
    const detail = await getRealCardDetail(decodeURIComponent(cardId));

    if (!detail) {
      return NextResponse.json({ error: "Real card not found." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load real card detail."
      },
      { status: 502 }
    );
  }
}
