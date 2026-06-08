import { NextRequest, NextResponse } from "next/server";
import {
  getRealCardCatalog,
  type RealCardBanlistStatus,
  type RealCardDeck,
  type RealCardType
} from "../../../src/app/real-card-catalog-api.ts";

const allowedDecks = new Set<RealCardDeck>(["A", "B", "C", "D", "E"]);
const allowedTypes = new Set<RealCardType>(["occupation", "minor_improvement", "major_improvement", "unknown"]);
const allowedBanlistFilters = new Set<keyof RealCardBanlistStatus | "any">([
  "strong",
  "weak",
  "livingHand",
  "any"
]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const decks = parseDecks(searchParams);
    const type = parseType(searchParams.get("type"));
    const query = searchParams.get("q") ?? undefined;
    const limit = parseLimit(searchParams.get("limit"));
    const banlist4p = parseBanlist(searchParams.get("banlist4p"));
    const response = await getRealCardCatalog({
      ...(decks === undefined ? {} : { decks }),
      ...(type === undefined ? {} : { type }),
      ...(query === undefined ? {} : { query }),
      ...(limit === undefined ? {} : { limit }),
      ...(banlist4p === undefined ? {} : { banlist4p })
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load real card catalog."
      },
      { status: 502 }
    );
  }
}

function parseDecks(searchParams: URLSearchParams): RealCardDeck[] | undefined {
  const rawDecks = [...searchParams.getAll("deck"), searchParams.get("decks") ?? ""]
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is RealCardDeck => allowedDecks.has(value as RealCardDeck));

  return rawDecks.length === 0 ? undefined : [...new Set(rawDecks)];
}

function parseType(value: string | null): RealCardType | undefined {
  if (value === null) return undefined;
  return allowedTypes.has(value as RealCardType) ? (value as RealCardType) : undefined;
}

function parseBanlist(value: string | null): keyof RealCardBanlistStatus | "any" | undefined {
  if (value === null) return undefined;
  return allowedBanlistFilters.has(value as keyof RealCardBanlistStatus | "any")
    ? (value as keyof RealCardBanlistStatus | "any")
    : undefined;
}

function parseLimit(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}
