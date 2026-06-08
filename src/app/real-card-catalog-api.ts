export type RealCardDeck = "A" | "B" | "C" | "D" | "E";
export type RealCardType = "occupation" | "minor_improvement" | "major_improvement" | "unknown";
export type RealCardSourceSystem = "agricoladb-graphql" | "agricola-veronahe-rdf";
export type RealCardEffectLocale = "en" | "ja";
export type RealCardCatalogFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type RealCardBanlistStatus = {
  strong: boolean;
  weak: boolean;
  livingHand: boolean;
};

export type RealCardExternalImage = {
  storage: "external";
  sourceRef: string;
  sourcePageUrl?: string;
  url?: string;
};

export type RealCardExternalRefs = {
  agricolaDbCardId?: string;
  agricolaDbLiteralId?: string;
  playAgricolaCardId?: string;
  veronaIri?: string;
};

export type RealCardCatalogCard = {
  id: string;
  deck: RealCardDeck;
  type: RealCardType;
  sourceSystem: RealCardSourceSystem;
  name: {
    en: string;
    ja?: string;
  };
  bgaBanlist4p: RealCardBanlistStatus;
  sourceRefs: string[];
  externalRefs: RealCardExternalRefs;
  strategyExtension: {
    tagIds: string[];
    note?: string;
  };
  printedId?: string;
  literalId?: string;
  effectText?: string;
  effectLocale?: RealCardEffectLocale;
  costRaw?: string;
  prerequisiteRaw?: string;
  victoryPoints?: number;
  minPlayers?: number;
  products?: string[];
  image?: RealCardExternalImage;
};

export type RealCardCatalogSearch = {
  decks?: RealCardDeck[];
  type?: RealCardType;
  query?: string;
  limit?: number;
  banlist4p?: keyof RealCardBanlistStatus | "any";
};

export type RealCardSourceAttribution = {
  sourceRef: string;
  label: string;
  sourceUrl: string;
  scopes: Array<"catalog" | "detail" | "image" | "banlist">;
  permissionNote?: string;
};

export type RealCardCatalogResponse = {
  cards: RealCardCatalogCard[];
  totalCount: number;
  sourceAttributions: RealCardSourceAttribution[];
};

export type RealCardCatalogOptions = {
  fetch?: RealCardCatalogFetch;
  agricolaDbGraphQlUrl?: string;
  veronaRdfUrl?: string;
  playAgricolaBaseUrl?: string;
};

type AgricolaDbDeck = Exclude<RealCardDeck, "E">;

type AgricolaDbCardNode = {
  id: string;
  literalID: string;
  printedID: string | null;
  revisionID: string;
  deckID: string | null;
  nameEn: string | null;
  nameJa: string | null;
  cost: string | null;
  prerequisite: string | null;
  description: string | null;
  playAgricolaCardID: string | null;
  victoryPoint: number | null;
  minPlayersNumber: number | null;
  deck: {
    id: string;
    nameEn: string | null;
  } | null;
  cardType: {
    id: string;
    nameEn: string | null;
  };
  products: Array<{
    id: string;
    nameEn: string | null;
  }> | null;
};

type AgricolaDbCardsPayload = {
  data?: {
    cards?: {
      totalCount: number;
      edges: Array<{ node: AgricolaDbCardNode }>;
    };
  };
  errors?: Array<{ message: string }>;
};

const AGRICOLA_DB_GRAPHQL_URL = "https://api.db.agricolajp.dev/graphql";
const VERONA_RDF_URL = "https://agricola.veronahe.no/api/export-rdf";
const PLAY_AGRICOLA_BASE_URL = "http://play-agricola.com/Agricola/Cards";
const CATALOG_LIMIT_DEFAULT = 100;
const CATALOG_LIMIT_MAX = 1000;

const AGRICOLA_DB_DECKS: Record<AgricolaDbDeck, string> = {
  A: "20023",
  B: "20024",
  C: "20025",
  D: "20026"
};

const AGRICOLA_DB_DECK_BY_ID = new Map(
  Object.entries(AGRICOLA_DB_DECKS).map(([deck, deckId]) => [deckId, deck as AgricolaDbDeck])
);

const AGRICOLA_DB_CARDS_QUERY = `
  query RealCards($deckId: ID!, $first: Int!) {
    cards(where: { revisionID: "2", deckID: $deckId }, first: $first) {
      totalCount
      edges {
        node {
          id
          literalID
          printedID
          revisionID
          deckID
          nameEn
          nameJa
          minPlayersNumber
          prerequisite
          cost
          description
          playAgricolaCardID
          victoryPoint
          deck { id nameEn }
          cardType { id nameEn }
          products { id nameEn }
        }
      }
    }
  }
`;

const CATALOG_SOURCE_ATTRIBUTIONS: RealCardSourceAttribution[] = [
  {
    sourceRef: "agricoladb-graphql",
    label: "AgricolaDB GraphQL API",
    sourceUrl: "https://db.agricolajp.dev/graphql-api/",
    scopes: ["catalog", "detail"],
    permissionNote:
      "Public API for maintained Agricola information, strategy research, and related app development; avoid commercial and high-volume use without consultation."
  },
  {
    sourceRef: "agricola-veronahe-rdf",
    label: "Agricola Card Ontology RDF export",
    sourceUrl: "https://agricola.veronahe.no/ontology",
    scopes: ["catalog", "detail"]
  },
  {
    sourceRef: "play-agricola",
    label: "Play-Agricola card renderer",
    sourceUrl: "http://play-agricola.com/Agricola/Cards/index.php",
    scopes: ["detail", "image"],
    permissionNote: "Used as an external image/detail URL only; card images are not stored locally."
  },
  {
    sourceRef: "bga-agricola-help-banlist",
    label: "Board Game Arena Agricola help banlist",
    sourceUrl: "https://en.doc.boardgamearena.com/Gamehelpagricola",
    scopes: ["banlist"]
  }
];

const STRONG_BANLIST_4P = toPrintedIdSet([
  "A14",
  "A33",
  "A39",
  "A48",
  "A82",
  "A97",
  "A127",
  "A131",
  "A133",
  "B10",
  "B15",
  "B21",
  "B22",
  "B117",
  "B132",
  "B151",
  "B161",
  "C3",
  "C28",
  "C31",
  "C60",
  "C63",
  "C99",
  "C102",
  "C125",
  "D4",
  "D19",
  "D21",
  "D33",
  "D74",
  "D92",
  "D97",
  "D137",
  "E22"
]);

const WEAK_BANLIST_4P = toPrintedIdSet([
  "A27",
  "A70",
  "A84",
  "A100",
  "A107",
  "A144",
  "A151",
  "A154",
  "A167",
  "B101",
  "B139",
  "B147",
  "C12",
  "C34",
  "C84",
  "C154",
  "C157",
  "C158",
  "D72",
  "D101",
  "D116",
  "D140",
  "D165",
  "E108"
]);

const LIVING_HAND_BANLIST = toPrintedIdSet(["B5", "B146", "C35", "D48"]);

const BGA_BANLIST_NAME_TO_PRINTED_ID = new Map<string, string>([
  ["guest room", "E22"],
  ["pioneer", "E105"],
  ["blackberry farmer", "E108"]
]);

let defaultCatalogPromise: Promise<RealCardCatalogCard[]> | undefined;

export async function getRealCardCatalog(
  search: RealCardCatalogSearch = {},
  options: RealCardCatalogOptions = {}
): Promise<RealCardCatalogResponse> {
  const allCards = await loadRealCardCatalog(options);
  const decks = new Set(search.decks ?? ["A", "B", "C", "D", "E"]);
  const query = normalizeSearchText(search.query ?? "");
  const limit = clampLimit(search.limit);

  const cards = allCards
    .filter((card) => decks.has(card.deck))
    .filter((card) => search.type === undefined || search.type === card.type)
    .filter((card) => matchesBanlistFilter(card, search.banlist4p))
    .filter((card) => matchesCatalogQuery(card, query));

  return {
    cards: cards.slice(0, limit),
    totalCount: cards.length,
    sourceAttributions: CATALOG_SOURCE_ATTRIBUTIONS
  };
}

export async function getRealCardDetail(
  cardId: string,
  options: RealCardCatalogOptions = {}
): Promise<RealCardCatalogCard | null> {
  const allCards = await loadRealCardCatalog(options);
  const normalizedCardId = normalizeCardLookup(cardId);
  const card = allCards.find((candidate) => matchesCardLookup(candidate, normalizedCardId));
  if (!card) return null;

  const playAgricolaCardId = card.externalRefs.playAgricolaCardId;
  if (!playAgricolaCardId) return card;

  const fetcher = options.fetch ?? fetch;
  const baseUrl = options.playAgricolaBaseUrl ?? PLAY_AGRICOLA_BASE_URL;
  const detailUrl = playAgricolaPageUrl(playAgricolaCardId, baseUrl);
  const response = await fetcher(detailUrl);
  if (!response.ok) return card;

  const parsed = parsePlayAgricolaCardHtml(await response.text(), playAgricolaCardId, baseUrl);
  if (!parsed) return card;

  return mergePlayAgricolaDetail(card, parsed);
}

export function normalizeBgaPrintedId(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;

  const normalized = value.normalize("NFKC").trim().replace(/\*/g, "").replace(/\s+/g, "").toUpperCase();
  const match = /^([A-E])0*([0-9]+)$/.exec(normalized);
  if (!match) return undefined;

  return `${match[1]}${Number(match[2])}`;
}

export function getBgaFourPlayerBanlistStatus(
  printedId: string | null | undefined,
  name?: string
): RealCardBanlistStatus {
  const normalizedPrintedId = normalizeBgaPrintedId(printedId) ?? printedIdFromBanlistName(name);

  return {
    strong: normalizedPrintedId === undefined ? false : STRONG_BANLIST_4P.has(normalizedPrintedId),
    weak: normalizedPrintedId === undefined ? false : WEAK_BANLIST_4P.has(normalizedPrintedId),
    livingHand: normalizedPrintedId === undefined ? false : LIVING_HAND_BANLIST.has(normalizedPrintedId)
  };
}

export function clearRealCardCatalogCacheForTests(): void {
  defaultCatalogPromise = undefined;
}

async function loadRealCardCatalog(options: RealCardCatalogOptions): Promise<RealCardCatalogCard[]> {
  if (options.fetch !== undefined) return buildRealCardCatalog(options);

  defaultCatalogPromise ??= buildRealCardCatalog(options);
  return defaultCatalogPromise;
}

async function buildRealCardCatalog(options: RealCardCatalogOptions): Promise<RealCardCatalogCard[]> {
  const [agricolaDbCards, veronaCards] = await Promise.all([
    fetchAgricolaDbCards(options),
    fetchVeronaRevisedECards(options)
  ]);

  return [...agricolaDbCards, ...veronaCards].sort(compareCatalogCards);
}

async function fetchAgricolaDbCards(options: RealCardCatalogOptions): Promise<RealCardCatalogCard[]> {
  const entries = await Promise.all(
    (Object.keys(AGRICOLA_DB_DECKS) as AgricolaDbDeck[]).map((deck) => fetchAgricolaDbDeck(deck, options))
  );

  return entries.flat();
}

async function fetchAgricolaDbDeck(
  deck: AgricolaDbDeck,
  options: RealCardCatalogOptions
): Promise<RealCardCatalogCard[]> {
  const fetcher = options.fetch ?? fetch;
  const graphQlUrl = options.agricolaDbGraphQlUrl ?? AGRICOLA_DB_GRAPHQL_URL;
  const response = await fetcher(graphQlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: AGRICOLA_DB_CARDS_QUERY,
      variables: {
        deckId: AGRICOLA_DB_DECKS[deck],
        first: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(`AgricolaDB request failed for deck ${deck}: ${response.status}`);
  }

  const payload = (await response.json()) as AgricolaDbCardsPayload;
  if (payload.errors?.length) {
    throw new Error(`AgricolaDB GraphQL error: ${payload.errors.map((error) => error.message).join("; ")}`);
  }

  const edges = payload.data?.cards?.edges ?? [];
  return edges.map(({ node }) => mapAgricolaDbCard(node, deck));
}

function mapAgricolaDbCard(node: AgricolaDbCardNode, fallbackDeck: AgricolaDbDeck): RealCardCatalogCard {
  const printedId = normalizeBgaPrintedId(node.printedID ?? node.literalID);
  const deck = node.deckID === null ? fallbackDeck : AGRICOLA_DB_DECK_BY_ID.get(node.deckID) ?? fallbackDeck;
  const nameEn = node.nameEn?.trim() || printedId || node.literalID || node.id;
  const nameJa = optionalString(node.nameJa);
  const playAgricolaCardId = optionalString(node.playAgricolaCardID);
  const sourceRefs = ["agricoladb-graphql"];
  const literalId = optionalString(node.literalID);
  const effectText = optionalString(node.description);
  const costRaw = optionalString(node.cost);
  const prerequisiteRaw = optionalString(node.prerequisite);
  const products = node.products?.map((product) => product.nameEn).filter((name): name is string => Boolean(name));
  const image =
    playAgricolaCardId === undefined
      ? undefined
      : {
          storage: "external" as const,
          sourceRef: "play-agricola",
          sourcePageUrl: playAgricolaPageUrl(playAgricolaCardId, PLAY_AGRICOLA_BASE_URL)
        };

  if (playAgricolaCardId !== undefined) sourceRefs.push("play-agricola");

  return {
    id: printedId ?? `agricoladb-${node.id}`,
    ...(printedId === undefined ? {} : { printedId }),
    ...(literalId === undefined ? {} : { literalId }),
    deck,
    type: toRealCardType(node.cardType.nameEn),
    sourceSystem: "agricoladb-graphql" as const,
    name: {
      en: nameEn,
      ...(nameJa === undefined ? {} : { ja: nameJa })
    },
    ...(effectText === undefined ? {} : { effectText, effectLocale: "ja" as const }),
    ...(costRaw === undefined ? {} : { costRaw }),
    ...(prerequisiteRaw === undefined ? {} : { prerequisiteRaw }),
    ...(node.victoryPoint === null ? {} : { victoryPoints: node.victoryPoint }),
    ...(node.minPlayersNumber === null ? {} : { minPlayers: node.minPlayersNumber }),
    ...(products === undefined || products.length === 0 ? {} : { products }),
    bgaBanlist4p: getBgaFourPlayerBanlistStatus(printedId, nameEn),
    sourceRefs,
    externalRefs: {
      agricolaDbCardId: node.id,
      ...(literalId === undefined ? {} : { agricolaDbLiteralId: literalId }),
      ...(playAgricolaCardId === undefined ? {} : { playAgricolaCardId })
    },
    strategyExtension: {
      tagIds: [],
      note: "Strategy tags intentionally deferred; card identity/text schema leaves tagIds extension-ready."
    },
    ...(image === undefined ? {} : { image })
  };
}

async function fetchVeronaRevisedECards(options: RealCardCatalogOptions): Promise<RealCardCatalogCard[]> {
  const fetcher = options.fetch ?? fetch;
  const response = await fetcher(options.veronaRdfUrl ?? VERONA_RDF_URL, {
    headers: { accept: "text/turtle" }
  });

  if (!response.ok) {
    throw new Error(`Agricola RDF request failed: ${response.status}`);
  }

  return parseVeronaRevisedECards(await response.text());
}

function parseVeronaRevisedECards(turtle: string): RealCardCatalogCard[] {
  const costLabels = parseVeronaCostLabels(turtle);
  const blocks = turtle.split(/\n(?=<http:\/\/agricola\.veronahe\.no\/[^>]+>\s+a\s+)/);
  const cards: RealCardCatalogCard[] = [];

  for (const block of blocks) {
    const header = block.match(
      /^<http:\/\/agricola\.veronahe\.no\/([^>]+)>\s+a\s+<http:\/\/agricola\.veronahe\.no\/(MinorImprovement|Occupation)>/
    );
    if (!header) continue;
    if (!block.includes("<http://agricola.veronahe.no/deck> <http://agricola.veronahe.no/deck_RevisedE>")) {
      continue;
    }

    const veronaId = header[1];
    const type = header[2] === "Occupation" ? "occupation" : "minor_improvement";
    const nameEn = extractRdfString(block, "rdfs:label");
    if (!nameEn) continue;

    const printedId = printedIdFromBanlistName(nameEn);
    const costRaw = extractCostRaw(block, costLabels);
    const effectText = extractRdfString(block, "<http://agricola.veronahe.no/cardText>");
    const prerequisiteRaw = extractRdfString(block, "<http://agricola.veronahe.no/prerequisite>");
    const victoryPoints = parseOptionalNumber(extractRdfString(block, "<http://agricola.veronahe.no/bonusPoints>"));
    const minPlayers = parseOptionalNumber(extractRdfString(block, "<http://agricola.veronahe.no/players>"));
    const image: RealCardExternalImage = {
      storage: "external",
      sourceRef: "agricola-veronahe-rdf",
      sourcePageUrl: `https://agricola.veronahe.no/${veronaId}`
    };

    cards.push(
      {
        id: printedId ?? `E-${slugify(nameEn)}`,
        ...(printedId === undefined ? {} : { printedId }),
        ...(veronaId === undefined ? {} : { literalId: veronaId }),
        deck: "E" as const,
        type,
        sourceSystem: "agricola-veronahe-rdf" as const,
        name: { en: nameEn },
        ...(effectText === undefined ? {} : { effectText, effectLocale: "en" as const }),
        ...(costRaw === undefined ? {} : { costRaw }),
        ...(prerequisiteRaw === undefined ? {} : { prerequisiteRaw }),
        ...(victoryPoints === undefined ? {} : { victoryPoints }),
        ...(minPlayers === undefined ? {} : { minPlayers }),
        bgaBanlist4p: getBgaFourPlayerBanlistStatus(printedId, nameEn),
        sourceRefs: ["agricola-veronahe-rdf"],
        externalRefs: {
          veronaIri: `https://agricola.veronahe.no/${veronaId}`
        },
        strategyExtension: {
          tagIds: [],
          note: "Strategy tags intentionally deferred; RDF text can later feed text_inferred strategy profiles."
        },
        image
      }
    );
  }

  return cards;
}

function parseVeronaCostLabels(turtle: string): Map<string, string> {
  const costLabels = new Map<string, string>();
  const blocks = turtle.split(/\n(?=<http:\/\/agricola\.veronahe\.no\/[^>]+>\s+a\s+)/);

  for (const block of blocks) {
    const header = block.match(
      /^<http:\/\/agricola\.veronahe\.no\/([^>]+)>\s+a\s+<http:\/\/agricola\.veronahe\.no\/CostPermutation>/
    );
    if (!header) continue;

    const label = extractRdfString(block, "rdfs:label");
    const costId = header[1];
    if (label && costId) costLabels.set(costId, label);
  }

  return costLabels;
}

function extractCostRaw(block: string, costLabels: Map<string, string>): string | undefined {
  const costRefs = [
    ...block.matchAll(/<http:\/\/agricola\.veronahe\.no\/hasCost>\s+<http:\/\/agricola\.veronahe\.no\/([^>]+)>/g)
  ].map((match) => match[1]).filter((costRef): costRef is string => costRef !== undefined);

  const labels = costRefs.map((costRef) => costLabels.get(costRef) ?? costRef).filter(Boolean);
  return labels.length === 0 ? undefined : labels.join(" / ");
}

type PlayAgricolaParsedDetail = {
  name?: string;
  type?: RealCardType;
  effectText?: string;
  costRaw?: string;
  prerequisiteRaw?: string;
  victoryPoints?: number;
  image?: RealCardExternalImage;
};

function parsePlayAgricolaCardHtml(
  html: string,
  playAgricolaCardId: string,
  baseUrl: string
): PlayAgricolaParsedDetail | null {
  const idRegex = new RegExp(
    `<input[^>]+id=['"]id(\\d+)['"][^>]+value=['"]?${escapeRegExp(playAgricolaCardId)}['"]?`,
    "i"
  );
  const idMatch = idRegex.exec(html);
  if (!idMatch?.index || !idMatch[1]) return null;

  const rowStart = html.lastIndexOf("<tr", idMatch.index);
  const rowEnd = html.indexOf("</tr>", idMatch.index);
  if (rowStart < 0 || rowEnd < 0) return null;

  const row = html.slice(rowStart, rowEnd + "</tr>".length);
  const rowId = idMatch[1];
  const fileName = extractHiddenValue(row, `file${rowId}`);
  const name = cellText(row, `crdname${rowId}`);
  const type = toRealCardType(cellText(row, `crdtype${rowId}`));
  const effectText = cellText(row, `crdtext${rowId}`);
  const costRaw = cellText(row, `crdcost${rowId}`);
  const prerequisiteRaw = cellText(row, `crdprereq${rowId}`);
  const victoryPoints = parseOptionalNumber(cellText(row, `crdvps${rowId}`));
  const imageUrl = fileName === undefined ? undefined : resolvePlayAgricolaImageUrl(fileName, baseUrl);
  const image =
    imageUrl === undefined
      ? undefined
      : {
          storage: "external" as const,
          sourceRef: "play-agricola",
          sourcePageUrl: playAgricolaPageUrl(playAgricolaCardId, baseUrl),
          url: imageUrl
        };

  return {
    ...(name === undefined ? {} : { name }),
    type,
    ...(effectText === undefined ? {} : { effectText }),
    ...(costRaw === undefined ? {} : { costRaw }),
    ...(prerequisiteRaw === undefined ? {} : { prerequisiteRaw }),
    ...(victoryPoints === undefined ? {} : { victoryPoints }),
    ...(image === undefined ? {} : { image })
  };
}

function mergePlayAgricolaDetail(
  card: RealCardCatalogCard,
  parsed: PlayAgricolaParsedDetail
): RealCardCatalogCard {
  const sourceRefs = new Set([...card.sourceRefs, "play-agricola"]);
  const {
    effectText: _effectText,
    effectLocale: _effectLocale,
    costRaw: _costRaw,
    prerequisiteRaw: _prerequisiteRaw,
    victoryPoints: _victoryPoints,
    image: _image,
    ...baseCard
  } = card;
  const effectText = parsed.effectText ?? card.effectText;
  const effectLocale = parsed.effectText === undefined ? card.effectLocale : ("en" as const);
  const costRaw = parsed.costRaw ?? card.costRaw;
  const prerequisiteRaw = parsed.prerequisiteRaw ?? card.prerequisiteRaw;
  const victoryPoints = parsed.victoryPoints ?? card.victoryPoints;
  const image = parsed.image ?? card.image;

  return {
    ...baseCard,
    type: parsed.type === undefined || parsed.type === "unknown" ? card.type : parsed.type,
    ...(effectText === undefined ? {} : { effectText }),
    ...(effectLocale === undefined ? {} : { effectLocale }),
    ...(costRaw === undefined ? {} : { costRaw }),
    ...(prerequisiteRaw === undefined ? {} : { prerequisiteRaw }),
    ...(victoryPoints === undefined ? {} : { victoryPoints }),
    ...(image === undefined ? {} : { image }),
    sourceRefs: [...sourceRefs]
  };
}

function matchesCatalogQuery(card: RealCardCatalogCard, query: string): boolean {
  if (!query) return true;

  const values = [
    card.id,
    card.printedId,
    card.literalId,
    card.name.en,
    card.name.ja,
    card.effectText,
    card.costRaw
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return values.some((value) => normalizeSearchText(value).includes(query));
}

function matchesBanlistFilter(
  card: RealCardCatalogCard,
  banlist4p: RealCardCatalogSearch["banlist4p"]
): boolean {
  if (banlist4p === undefined) return true;
  if (banlist4p === "any") {
    return card.bgaBanlist4p.strong || card.bgaBanlist4p.weak || card.bgaBanlist4p.livingHand;
  }

  return card.bgaBanlist4p[banlist4p];
}

function matchesCardLookup(card: RealCardCatalogCard, normalizedLookup: string): boolean {
  const values = [
    card.id,
    card.printedId,
    card.literalId,
    card.externalRefs.agricolaDbCardId,
    card.externalRefs.agricolaDbLiteralId,
    card.externalRefs.playAgricolaCardId,
    card.externalRefs.veronaIri,
    slugify(card.name.en)
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return values.some((value) => normalizeCardLookup(value) === normalizedLookup);
}

function normalizeCardLookup(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function toRealCardType(value: string | null | undefined): RealCardType {
  const normalized = normalizeSearchText(value ?? "");
  if (normalized.includes("occupation") || normalized === "occ") return "occupation";
  if (normalized.includes("minor")) return "minor_improvement";
  if (normalized.includes("major")) return "major_improvement";
  return "unknown";
}

function compareCatalogCards(left: RealCardCatalogCard, right: RealCardCatalogCard): number {
  const deckCompare = left.deck.localeCompare(right.deck);
  if (deckCompare !== 0) return deckCompare;

  return printedIdSortValue(left.printedId ?? left.id) - printedIdSortValue(right.printedId ?? right.id);
}

function printedIdSortValue(value: string): number {
  const normalized = normalizeBgaPrintedId(value);
  if (normalized === undefined) return Number.MAX_SAFE_INTEGER;

  const match = /^([A-E])([0-9]+)$/.exec(normalized);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[2]);
}

function toPrintedIdSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeBgaPrintedId(value)).filter((value): value is string => !!value));
}

function printedIdFromBanlistName(name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  return BGA_BANLIST_NAME_TO_PRINTED_ID.get(normalizeSearchText(name));
}

function playAgricolaPageUrl(playAgricolaCardId: string, baseUrl: string): string {
  return `${baseUrl}/index.php?id=${encodeURIComponent(playAgricolaCardId)}`;
}

function extractRdfString(block: string, predicate: string): string | undefined {
  const escapedPredicate = predicate.startsWith("<") ? escapeRegExp(predicate) : escapeRegExp(predicate);
  const match = new RegExp(`${escapedPredicate}\\s+"((?:[^"\\\\]|\\\\.)*)"`).exec(block);
  if (!match) return undefined;
  const value = match[1];
  return value === undefined ? undefined : decodeRdfString(value);
}

function extractHiddenValue(row: string, id: string): string | undefined {
  const match = new RegExp(`<input[^>]+id=['"]${escapeRegExp(id)}['"][^>]+value=['"]([^'"]*)['"]`, "i").exec(row);
  return optionalString(match?.[1]);
}

function cellText(row: string, id: string): string | undefined {
  const match = new RegExp(`<td[^>]+id=['"]${escapeRegExp(id)}['"][^>]*>([\\s\\S]*?)<\\/td>`, "i").exec(row);
  if (!match) return undefined;

  const value = match[1];
  return value === undefined ? undefined : optionalString(decodeHtml(stripTags(value)).replace(/\s+/g, " ").trim());
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeRdfString(value: string): string {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .trim();
}

function resolvePlayAgricolaImageUrl(fileName: string, baseUrl: string): string | undefined {
  const resolved = new URL(fileName, `${baseUrl.replace(/\/+$/, "")}/Cards/`);
  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
  return resolved.href;
}

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function optionalString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseOptionalNumber(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isInteger(limit) || limit === undefined || limit < 1) return CATALOG_LIMIT_DEFAULT;
  return Math.min(limit, CATALOG_LIMIT_MAX);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as T;
}
