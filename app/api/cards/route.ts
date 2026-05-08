import { NextRequest, NextResponse } from "next/server";
import { loadDraftCoachData } from "../../../src/app/draft-coach-api.ts";
import type { Card, CardTranslation } from "../../../src/features/draft/index.ts";

const defaultLimit = 50;
const allowedTypes = new Set(["occupation", "minor_improvement", "major_improvement"]);

export async function GET(request: NextRequest) {
  const context = await loadDraftCoachData();
  const type = request.nextUrl.searchParams.get("type");
  const query = normalizeSearchText(request.nextUrl.searchParams.get("q") ?? "");
  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

  const cards = context.data.cards
    .filter((card) => type === null || !allowedTypes.has(type) || card.type === type)
    .map((card) => ({
      card,
      translation: context.dataIndex.translationsByCardId.get(card.id)
    }))
    .filter(({ card, translation }) => matchesQuery(card, translation, query))
    .slice(0, limit)
    .map(({ card, translation }) => ({
      id: card.id,
      type: card.type,
      name: translation?.name ?? card.id,
      aliases: translation?.aliases ?? [],
      cardPoolStatus: context.data.cardPoolProfile.cardStatuses[card.id]
    }));

  return NextResponse.json({ cards });
}

function matchesQuery(card: Card, translation: CardTranslation | undefined, query: string): boolean {
  if (!query) return true;

  const values = [
    card.id,
    translation?.name,
    translation?.officialName,
    translation?.bgaName,
    ...(translation?.aliases ?? [])
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return values.some((value) => normalizeSearchText(value).includes(query));
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return defaultLimit;
  return Math.min(100, parsed);
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}
