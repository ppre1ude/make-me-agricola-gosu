import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDraftDataIndex,
  type DraftDataIndex,
  type DraftDataSet,
  type DraftFixtureInput,
  type DraftScoringInput
} from "../features/draft/index.ts";

export type DraftCoachDataPaths = {
  cards: string;
  translations: string;
  stats: string;
  strategyRoles: string;
  strategyProfiles: string;
  cardPoolProfile: string;
};

export type DraftCoachDataLoadOptions = {
  rootDir?: string;
  paths?: Partial<DraftCoachDataPaths>;
};

export type DraftCoachDataContext = {
  rootDir: string;
  paths: DraftCoachDataPaths;
  data: DraftDataSet;
  dataIndex: DraftDataIndex;
};

export type DraftCoachInputDefaults = Partial<
  Omit<DraftScoringInput, "pickNumber" | "offeredCardIds">
>;

export type DraftCoachNormalizeOptions = {
  data?: DraftDataSet;
  defaults?: DraftCoachInputDefaults;
};

export const DRAFT_COACH_DATA_PATHS: DraftCoachDataPaths = {
  cards: "data/normalized/cards.json",
  translations: "data/normalized/translations.ko-KR.json",
  stats: "data/normalized/stats.prototype.json",
  strategyRoles: "data/normalized/strategy-roles.json",
  strategyProfiles: "data/manual/card-strategy-profiles.json",
  cardPoolProfile: "data/normalized/card-pool.bga-arena.prototype.json"
};

export const DRAFT_COACH_DEFAULTS: Pick<
  DraftScoringInput,
  "playerCount" | "draftCardType" | "draftFormat" | "trackingMode" | "explanationDepth"
> = {
  playerCount: 4,
  draftCardType: "occupation",
  draftFormat: "10-to-7",
  trackingMode: "selected_only",
  explanationDepth: "standard"
};

const DEFAULT_ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_CARD_POOL_PROFILE_ID = "bga-arena-prototype";

export async function loadDraftCoachData(
  options: DraftCoachDataLoadOptions = {}
): Promise<DraftCoachDataContext> {
  const rootDir = path.resolve(options.rootDir ?? DEFAULT_ROOT_DIR);
  const paths: DraftCoachDataPaths = { ...DRAFT_COACH_DATA_PATHS, ...options.paths };
  const [cards, translations, stats, strategyRoles, strategyProfiles, cardPoolProfile] =
    await Promise.all([
      readJson<DraftDataSet["cards"]>(rootDir, paths.cards),
      readJson<DraftDataSet["translations"]>(rootDir, paths.translations),
      readJson<DraftDataSet["stats"]>(rootDir, paths.stats),
      readJson<DraftDataSet["strategyRoles"]>(rootDir, paths.strategyRoles),
      readJson<DraftDataSet["strategyProfiles"]>(rootDir, paths.strategyProfiles),
      readJson<DraftDataSet["cardPoolProfile"]>(rootDir, paths.cardPoolProfile)
    ]);

  const data: DraftDataSet = {
    cards,
    translations,
    stats,
    strategyRoles,
    strategyProfiles,
    cardPoolProfile
  };

  return {
    rootDir,
    paths,
    data,
    dataIndex: buildDraftDataIndex(data)
  };
}

export function normalizeDraftCoachInput(
  input: DraftFixtureInput,
  options: DraftCoachNormalizeOptions = {}
): DraftScoringInput {
  const defaults = options.defaults ?? {};
  const normalized: DraftScoringInput = {
    playerCount: input.playerCount ?? defaults.playerCount ?? DRAFT_COACH_DEFAULTS.playerCount,
    draftCardType: input.draftCardType ?? defaults.draftCardType ?? DRAFT_COACH_DEFAULTS.draftCardType,
    pickNumber: input.pickNumber,
    offeredCardIds: [...input.offeredCardIds],
    pickedCardIds: [...(input.pickedCardIds ?? defaults.pickedCardIds ?? [])],
    seenCardIds: [...(input.seenCardIds ?? defaults.seenCardIds ?? [])],
    passedCardIds: [...(input.passedCardIds ?? defaults.passedCardIds ?? [])],
    draftFormat: input.draftFormat ?? defaults.draftFormat ?? DRAFT_COACH_DEFAULTS.draftFormat,
    trackingMode: input.trackingMode ?? defaults.trackingMode ?? DRAFT_COACH_DEFAULTS.trackingMode,
    cardPoolProfileId:
      input.cardPoolProfileId ??
      defaults.cardPoolProfileId ??
      options.data?.cardPoolProfile.id ??
      DEFAULT_CARD_POOL_PROFILE_ID,
    explanationDepth:
      input.explanationDepth ?? defaults.explanationDepth ?? DRAFT_COACH_DEFAULTS.explanationDepth
  };

  const previousPackCardIds = input.previousPackCardIds ?? defaults.previousPackCardIds;
  if (previousPackCardIds !== undefined) {
    normalized.previousPackCardIds = [...previousPackCardIds];
  }

  const missingFromPreviousPack = input.missingFromPreviousPack ?? defaults.missingFromPreviousPack;
  if (missingFromPreviousPack !== undefined) {
    normalized.missingFromPreviousPack = [...missingFromPreviousPack];
  }

  return normalized;
}

async function readJson<T>(rootDir: string, filePath: string): Promise<T> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  return JSON.parse(await readFile(absolutePath, "utf8")) as T;
}
