export type LocaleCode = string;

export type CardType = "occupation" | "minor_improvement" | "major_improvement";
export type DraftCardType = "occupation" | "minor_improvement";
export type DraftFormat = "10-to-7" | "9-to-7" | "8-to-7";
export type DraftPickBand = "early_anchor" | "middle_direction" | "late_completion";
export type ExplanationDepth = "compact" | "standard" | "deep";
export type ReturnLikelihood = "unlikely" | "possible" | "likely" | "unknown";
export type TrackingMode = "full_pack" | "selected_only";

export type DraftCandidateGroup =
  | "broken_candidate"
  | "premium_candidate"
  | "plan_anchor_candidate"
  | "role_completion_candidate"
  | "support_candidate"
  | "penalty_prevention_candidate"
  | "ready_bonus_points_candidate"
  | "food_stability_candidate"
  | "high_pass_regret_candidate"
  | "risky_conditional_candidate"
  | "general_value_candidate"
  | "fallback_filler_candidate";

export type DraftWarning = {
  code: string;
  message: string;
};

export type DraftEvaluationMeta = {
  confidence: "high" | "medium" | "low";
  method: "full_profile" | "stats_only" | "profile_limited" | "fallback_basic";
  missingData: Array<"stat" | "strategy_profile" | "translation">;
};

export type DraftTrackingSignal = {
  code: string;
  roleId?: string;
  cardId?: string;
  strength: "weak" | "medium" | "strong";
  message: string;
};

export type DraftPlanShiftHint = {
  code: string;
  cardId: string;
  message: string;
};

export type ConfidenceLevel =
  | "manual_verified"
  | "official_verified"
  | "bga_verified"
  | "stat_inferred"
  | "text_inferred"
  | "community_inferred"
  | "unverified";

export type CardPoolStatus = "active" | "weak_excluded" | "strong_excluded" | "banned" | "inactive";
export type SaturationBehavior = "hard_cap" | "soft_cap" | "stackable" | "resource_convertible" | "condition_based";

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
  saturationBehavior?: SaturationBehavior;
  sinkRoleIds?: string[];
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
  supports?: string[];
  partialSolves?: string[];
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
  previousPackCardIds?: string[];
  missingFromPreviousPack?: string[];
  draftFormat: DraftFormat;
  trackingMode: TrackingMode;
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
  passRegret: number;
  pivotPotential: number;
  conflictCost: number;
  roleAvailabilityPressure: number;
  confidence: number;
  saturationPenalty: number;
  riskPenalty: number;
};

export type DraftRecommendation = {
  cardId: string;
  rank: number;
  score: number;
  draftPickBand: DraftPickBand;
  candidateGroups: DraftCandidateGroup[];
  components: ScoreComponents;
  returnLikelihood: ReturnLikelihood;
  evaluationMeta: DraftEvaluationMeta;
  reasons: Record<ExplanationDepth, string[]>;
  risks: string[];
  warnings: DraftWarning[];
  nextPickDirection: string[];
  trackingSignals: DraftTrackingSignal[];
  planShiftHints: DraftPlanShiftHint[];
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

export type CandidateGroupAssertion = {
  cardId: string;
  value: DraftCandidateGroup;
};

export type EvaluationMetaAssertion = {
  cardId: string;
  confidence?: DraftEvaluationMeta["confidence"];
  method?: DraftEvaluationMeta["method"];
  missingDataIncludes?: DraftEvaluationMeta["missingData"][number];
};

export type TrackingSignalAssertion = {
  cardId?: string;
  role?: string;
  value: string;
};

export type ReasonIncludesAssertion = {
  cardId: string;
  depth: ExplanationDepth;
  value: string;
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
  candidateGroupIncludes?: CandidateGroupAssertion[];
  warningIncludes?: TextIncludesAssertion[];
  evaluationMetaIncludes?: EvaluationMetaAssertion[];
  trackingSignalIncludes?: TrackingSignalAssertion[];
  planShiftIncludes?: TextIncludesAssertion[];
  reasonIncludes?: ReasonIncludesAssertion[];
  reasonExcludes?: ReasonIncludesAssertion[];
};

export type DraftFixture = {
  id: string;
  description: string;
  input: DraftFixtureInput;
  expected?: DraftFixtureExpected;
};
