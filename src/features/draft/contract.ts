export type LocaleCode = string;

export type CardType = "occupation" | "minor_improvement" | "major_improvement";
export type DraftCardType = "occupation" | "minor_improvement";
export type DraftFormat = "10-to-7" | "9-to-7" | "8-to-7";
export type DraftPickBand = "early_anchor" | "middle_direction" | "late_completion";
export type ExplanationDepth = "compact" | "standard" | "deep";
export type ReturnLikelihood = "unlikely" | "possible" | "likely" | "unknown";

export type ConfidenceLevel =
  | "manual_verified"
  | "official_verified"
  | "bga_verified"
  | "stat_inferred"
  | "text_inferred"
  | "community_inferred"
  | "unverified";

export type CardPoolStatus = "active" | "weak_excluded" | "strong_excluded" | "banned" | "inactive";

export type PickNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Card = {
  id: string;
  type: CardType;
  decks: string[];
  editions: string[];
  playerCount?: number[];
  costRaw?: string;
  prerequisiteRaw?: string;
  victoryPoints?: number;
  isPassingMinor?: boolean;
  availability: {
    bga?: boolean;
    physicalKo?: boolean;
    revised?: boolean;
  };
  tagIds: string[];
  timingTagIds: string[];
  mechanicIds?: string[];
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
};

export type CardTranslation = {
  cardId: string;
  locale: LocaleCode;
  name: string;
  officialName?: string;
  bgaName?: string;
  aliases: string[];
  effectText?: string;
  shortText?: string;
  rulesNotes?: string[];
  sourceRefs: string[];
  updatedAt: string;
};

export type StrategyRole = {
  id: string;
  labels: Record<LocaleCode, string>;
  description?: Record<LocaleCode, string>;
  parentId?: string;
  defaultSaturationLimit?: number;
};

export type CardStatRow = {
  snapshotId: string;
  cardId: string;
  rank?: number;
  pwr?: number;
  adp?: number;
  apr?: number;
  deals?: number;
  drafted?: number;
  plays?: number;
  wtdPwr?: number;
  tier?: string;
};

export type CardPoolProfile = {
  id: string;
  name: string;
  sourceRefs: string[];
  collectedAt: string;
  playerCount: number;
  cardStatuses: Record<string, CardPoolStatus>;
  notes?: string;
};

export type LocalizedExplanation = Partial<Record<ExplanationDepth, Partial<Record<LocaleCode, string>>>>;

export type CardStrategyProfile = {
  cardId: string;
  cardPoolProfileId?: string;
  arenaActive?: boolean;
  roles: string[];
  isBroken?: boolean;
  isPlanAnchor?: boolean;
  brokenReasonTags?: string[];
  brokenReasonNote?: Partial<Record<LocaleCode, string>>;
  solves: string[];
  increasesNeedFor: string[];
  saturationPenaltyTo: string[];
  synergyWith: string[];
  conflictsWith: string[];
  riskTags: string[];
  timingWindow?: "early" | "mid" | "late" | "anytime";
  nextPickGuidance?: Partial<Record<LocaleCode, string[]>>;
  explanation?: LocalizedExplanation;
  sourceRefs: string[];
  confidence: ConfidenceLevel;
  updatedAt: string;
};

export type DraftScoringInput = {
  playerCount: number;
  draftCardType: DraftCardType;
  pickNumber: PickNumber;
  offeredCardIds: string[];
  pickedCardIds: string[];
  seenCardIds: string[];
  passedCardIds: string[];
  draftFormat: DraftFormat;
  cardPoolProfileId: string;
  explanationDepth: ExplanationDepth;
};

export type DraftDataSet = {
  cards: Card[];
  translations: CardTranslation[];
  stats: CardStatRow[];
  strategyRoles: StrategyRole[];
  strategyProfiles: CardStrategyProfile[];
  cardPoolProfile: CardPoolProfile;
};

export type ScoreComponents = {
  statStrength: number;
  brokenOrAnchor: number;
  roleCoverage: number;
  synergy: number;
  returnUrgency: number;
  draftPickBandFit: number;
  confidence: number;
  saturationPenalty: number;
  riskPenalty: number;
};

export type DraftRecommendation = {
  cardId: string;
  rank: number;
  score: number;
  draftPickBand: DraftPickBand;
  components: ScoreComponents;
  returnLikelihood: ReturnLikelihood;
  reasons: Record<ExplanationDepth, string[]>;
  risks: string[];
  nextPickDirection: string[];
};

export type DraftDataIndex = {
  cardsById: Map<string, Card>;
  profilesByCardId: Map<string, CardStrategyProfile>;
  statsByCardId: Map<string, CardStatRow>;
  translationsByCardId: Map<string, CardTranslation>;
  rolesById: Map<string, StrategyRole>;
};

export type DraftFixtureInput = Partial<DraftScoringInput> &
  Pick<DraftScoringInput, "pickNumber" | "offeredCardIds">;

export type ComponentAssertion = {
  cardId: string;
  component: keyof ScoreComponents;
  value: number;
};

export type ReturnLikelihoodAssertion = {
  cardId: string;
  value: ReturnLikelihood;
};

export type TextIncludesAssertion = {
  cardId: string;
  value: string;
};

export type RiskAssertion = {
  cardId: string;
  risk: string;
};

export type DraftFixtureExpected = {
  topCardId?: string;
  notTopCardIds?: string[];
  downrankedBelow?: Array<{ cardId: string; belowCardId: string }>;
  componentAtLeast?: ComponentAssertion[];
  componentBelow?: ComponentAssertion[];
  returnLikelihood?: ReturnLikelihoodAssertion[];
  hasRisk?: RiskAssertion[];
  nextPickIncludes?: TextIncludesAssertion[];
};

export type DraftFixture = {
  id: string;
  description: string;
  input: DraftFixtureInput;
  expected?: DraftFixtureExpected;
};
