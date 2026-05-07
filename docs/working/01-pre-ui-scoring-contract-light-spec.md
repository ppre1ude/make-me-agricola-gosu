# 01 Pre-UI Scoring Contract Light Spec

Status: Approved for implementation planning

## Purpose

This light spec defines the first buildable scope before any Draft Memory Coach UI work.

The goal is to close the current project gate:

```text
scoring contract + data validation + fixture matrix
```

This is intentionally not a UI spec. The output of this work should be a draft recommendation engine that a future UI can trust and render without inventing product logic.

## Sequencing Decision

The preferred product sequence is:

```text
A. Pre-UI scoring contract closure
  -> requires a thin Strategy Knowledge Base slice

B. Draft Memory Coach UX spec
  -> renders the stable contract from A

C. Strategy Knowledge Base expansion
  -> scales curation after the recommendation behavior is pinned
```

The first light spec covers A only.

The thin C slice inside A is limited to fixture-supporting strategy profile data. It does not include broad card curation.

## Problem

The project already has a TypeScript draft scoring prototype, data validation, and three draft fixtures.

That is enough to prove direction, but not enough to start UI work safely. If UI begins now, the UI will likely absorb product logic that belongs in the engine:

- what counts as a good recommendation by draft pick band
- when a card is risky
- when a card is unlikely to return
- when a duplicate role is saturated
- how missing data is surfaced
- how next-pick guidance is generated

This spec closes those decisions at the engine and fixture layer first.

## Users

Primary user for this phase:

- future Draft Memory Coach UI code

Secondary users:

- project agents implementing scoring and fixture work
- human reviewer checking whether recommendations match the accepted strategy judgment
- future data curation flow that needs to know which fields matter

The end player experience matters, but this phase does not design the player-facing screen.

## Goals

1. Make `DraftScoringInput` sufficient for full-pack and quick draft tracking.
2. Make `DraftRecommendation` sufficient for a future UI to render recommendation, reason, risk, return likelihood, and next-pick direction.
3. Expand `ScoreComponents` so important draft judgment concepts are represented explicitly.
4. Expand fixture assertions beyond "top card".
5. Grow the draft fixture matrix from 3 fixtures to at least 10.
6. Pin missing-data behavior through validation and fixtures.
7. Keep the draft scoring engine independent from React/Next.js.

## Non-Goals

This spec does not include:

- Draft Memory Coach UI layout
- Next.js or React scaffold
- OCR or screenshot input
- full Strategy Knowledge Base curation
- high-impact card batch curation beyond fixture needs
- opponent plan prediction
- probabilistic table modeling
- automatic learning from user disagreement

## Existing Baseline

Current code already has:

- `src/features/draft/contract.ts`
- `src/features/draft/scoring.ts`
- `src/features/draft/validation.ts`
- `scripts/validate-data.ts`
- `scripts/score-draft-fixtures.ts`
- `data/fixtures/draft/*.json`

Current verification command:

```text
yarn test
```

Current fixture count:

```text
3
```

Current fixtures:

- `early-anchor`
- `field-watchman-saturation`
- `late-completion`

## Draft Scoring Input Contract

`DraftScoringInput` must support two modes:

```text
full_pack:
  user records every visible card in each pack

selected_only:
  user records only picked cards and currently offered cards
```

Recommended input shape:

```ts
type DraftScoringInput = {
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
  trackingMode: "full_pack" | "selected_only";
  cardPoolProfileId: string;
  explanationDepth: ExplanationDepth;
};
```

Policy:

- `offeredCardIds` is required and drives the current recommendation.
- `pickedCardIds` is the user's factual draft history.
- `seenCardIds` and `passedCardIds` are memory signals, not opponent ownership claims.
- `previousPackCardIds` and `missingFromPreviousPack` support weak role availability pressure.
- In `selected_only` mode, missing-card tracking is unavailable and must not be inferred.

## Draft Recommendation Output Contract

`DraftRecommendation` must contain enough information for the UI to render without recalculating strategy logic.

Recommended output shape:

```ts
type DraftRecommendation = {
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
```

Supporting output types:

```ts
type DraftWarning = {
  code: string;
  message: string;
};

type DraftEvaluationMeta = {
  confidence: "high" | "medium" | "low";
  method: "full_profile" | "stats_only" | "profile_limited" | "fallback_basic";
  missingData: Array<"stat" | "strategy_profile" | "translation">;
};

type DraftTrackingSignal = {
  code: string;
  roleId?: string;
  cardId?: string;
  strength: "weak" | "medium" | "strong";
  message: string;
};

type DraftPlanShiftHint = {
  code: string;
  cardId: string;
  message: string;
};
```

Policy:

- `score` is only for ordering cards in the same pick.
- `score` is not a win-rate estimate and must not be shown as absolute card strength.
- `reasons` explain why a card is recommended.
- `risks` explain tradeoffs.
- `warnings` ask for user attention or correction.
- `evaluationMeta` explains how complete and trustworthy the evaluation method was.
- `trackingSignals` may mention role pressure, but must not claim an opponent picked a card.
- `planShiftHints` appear only for high-impact recommendations where a pivot is plausible.
- If the engine returns all offered cards, lower-ranked rows are evaluations. Rank 1 and any UI-highlighted recommendation must have a non-empty `candidateGroups` array.

## Candidate Groups

Candidate groups classify why a card is in the conversation.

Initial enum:

```ts
type DraftCandidateGroup =
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
```

Policy:

- Candidate groups are explanation labels, not independent scoring components.
- A card can have multiple candidate groups.
- Fixture assertions may check candidate groups.
- `candidateGroups` is always present as an array.
- Empty `candidateGroups` is allowed only for low-ranked evaluated alternatives.
- Rank 1 and any UI-highlighted recommendation must have at least one candidate group.
- `general_value_candidate` and `fallback_filler_candidate` exist so top recommendations are never semantically empty.

## Score Components

Existing required components should remain:

```ts
type ScoreComponents = {
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
```

This phase adds the following fields to the same `ScoreComponents` type:

```ts
passRegret: number;
pivotPotential: number;
conflictCost: number;
roleAvailabilityPressure: number;
```

Definitions:

- `passRegret`: how painful it is to pass a broadly strong, scarce, or low-ADP card.
- `pivotPotential`: how much the card can become a new center plan.
- `conflictCost`: how much the card fights the current picked cards or overuses the same execution path.
- `roleAvailabilityPressure`: weak signal that a role may be hard to find later based on observed missing cards.

Policy:

- All components are 0-10 internal comparison values.
- Components are not probabilities.
- Default UI should show component meaning as words, not numbers.
- Deep/debug output may show component numbers.
- `brokenReasonTags` should not become strong scoring modifiers in this phase.

## Draft Pick Band Behavior

`draftPickBand` controls which tradeoffs matter most.

```text
early_anchor:
  Pick 1-2.
  Prefer broken cards, premium cards, and open plan anchors.

middle_direction:
  Pick 3-4.
  Balance raw strength, role completion, synergy, pass regret, and conflict cost.

late_completion:
  Pick 5-7.
  Prefer hole filling, survival stability, condition-ready bonus points, and penalty prevention before raw power.
```

Acceptance rule:

- Fixtures must cover at least one scenario for each draft pick band.

## Missing Data Policy

Recommended behavior:

| Missing data | Behavior |
| --- | --- |
| missing card id | validation error |
| missing translation | warning, fallback to `cardId` |
| missing stat | allowed, `returnLikelihood: "unknown"`, `evaluationMeta.missingData` includes `"stat"` |
| missing strategy profile | allowed, warning surfaced, `evaluationMeta.confidence: "low"`, `evaluationMeta.missingData` includes `"strategy_profile"` |
| missing role reference | validation error |
| invalid card pool status | validation error |
| unsupported fixture assertion | validation error |

Policy:

- Missing data should be visible.
- Missing data should not silently become a confident recommendation.
- Missing stat and missing strategy profile are allowed because broad curation is not finished.
- Missing data disclaimers must not be inserted into `reasons`.
- `reasons` should stay semantically pure: only recommendation rationale.

## Fixture Assertion Contract

Existing assertions:

```ts
type DraftFixtureExpected = {
  topCardId?: string;
  notTopCardIds?: string[];
  downrankedBelow?: Array<{ cardId: string; belowCardId: string }>;
  componentAtLeast?: ComponentAssertion[];
  componentBelow?: ComponentAssertion[];
  returnLikelihood?: ReturnLikelihoodAssertion[];
  hasRisk?: RiskAssertion[];
  nextPickIncludes?: TextIncludesAssertion[];
};
```

Add assertions:

```ts
type DraftFixtureExpected = {
  candidateGroupIncludes?: Array<{ cardId: string; value: DraftCandidateGroup }>;
  warningIncludes?: Array<{ cardId: string; value: string }>;
  evaluationMetaIncludes?: Array<{
    cardId: string;
    confidence?: "high" | "medium" | "low";
    method?: "full_profile" | "stats_only" | "profile_limited" | "fallback_basic";
    missingDataIncludes?: "stat" | "strategy_profile" | "translation";
  }>;
  trackingSignalIncludes?: Array<{ cardId?: string; role?: string; value: string }>;
  planShiftIncludes?: Array<{ cardId: string; value: string }>;
  reasonIncludes?: Array<{ cardId: string; depth: ExplanationDepth; value: string }>;
};
```

Acceptance rule:

- New scoring concepts must be pinned by fixture assertions before UI work starts.

## Fixture Matrix

### Gate 1: Schema Stabilization

This gate unlocks initial `/draft` UI scaffold and UX exploration.

Goal:

```text
Prove the DraftRecommendation output contract is stable enough for UI code.
```

Expected fixture count:

```text
5-7 purpose-built fixtures
```

Required schema cases:

1. `happy-path-recommendation`
2. `multi-group-recommendation`
3. `general-or-fallback-recommendation`
4. `missing-profile-warning-and-evaluation-meta`
5. `return-likelihood-shape`
6. `next-pick-direction-shape`
7. `warnings-and-evaluation-meta-do-not-pollute-reasons`

### Gate 2: Domain Logic / Product Readiness

This gate is required before the UI is product-ready or merge-ready.

Goal:

```text
Prove the scoring engine handles the accepted strategic judgment.
```

Expected fixture count:

```text
15+ high-quality strategy fixtures
```

Required domain cases:

1. `early-broken-beats-medium-synergy`
2. `early-plan-anchor-beats-late-points`
3. `solved-role-downranks-high-stat-duplicate`
4. `field-watchman-saturation`
5. `field-watchman-needs-bake-or-food-followup`
6. `low-adp-card-unlikely-to-return`
7. `high-adp-card-likely-to-return`
8. `conditional-card-emits-risk-penalty`
9. `missing-stat-ranks-with-unknown-return`
10. `missing-profile-ranks-with-low-confidence`
11. `late-pick-prefers-hole-filling-over-raw-power`
12. `conflict-card-downranked`
13. `food-engine-and-food-support-are-distinct`
14. `next-pick-guidance-is-emitted`
15. `full-tracking-missing-cards-raise-role-pressure-weakly`

Do not over-pack unrelated edge cases into one fixture. Each fixture should represent a realistic draft state and one primary behavior under test.

Stretch fixtures:

- `broken-card-resists-but-does-not-ignore-saturation`
- `middle-pick-high-pass-regret-beats-weak-support`
- `late-pick-candidate-set-before-tier`
- `high-pass-regret-plan-anchor-creates-pivot-hint`
- `model-user-disagreement-recorded-without-judgment`

## Thin Strategy Data Slice

Only add strategy profile data needed to make the fixture matrix meaningful.

Required role/data work:

- split `food_engine`, `food_support`, and `food_conversion`
- add enough card profiles to test missing stat and missing profile behavior
- add one conditional risk card
- add one conflict card
- add one high ADP return-likely card
- add one low ADP return-unlikely card
- add one high-stat duplicate-role card

Do not expand into broad 50-100 card curation in this phase.

## Validation Scope

`validateDraftDataSet` should validate:

- card ids are unique
- card references point to known cards
- role references point to known roles
- saturation targets point to known cards or roles
- card pool statuses are valid
- fixture inputs point to known cards
- fixture expected assertions use supported fields
- fixture component names are valid
- fixture pick numbers are 1-7

Acceptance rule:

```text
yarn validate:data
```

must fail on invalid contract data and pass on intentional allowed missing stat/profile scenarios.

## Verification

Primary verification command:

```text
yarn test
```

This must run:

- TypeScript typecheck
- data validation
- draft fixture scoring

Completion criteria:

- `yarn test` passes
- validation has 0 errors
- Schema Stabilization Gate fixtures pass before initial UI scaffold starts
- Domain Logic / Product Readiness Gate has 15+ passing strategy fixtures before UI is product-ready or merge-ready
- at least 1 fixture covers each `draftPickBand`
- at least 1 fixture covers missing stat behavior
- at least 1 fixture covers missing strategy profile behavior
- at least 1 fixture covers role saturation
- at least 1 fixture covers return likelihood
- at least 1 fixture covers next-pick direction
- rank 1 and UI-highlighted recommendations have non-empty `candidateGroups`
- missing strategy profile produces `warnings` and `evaluationMeta`, not disclaimer text in `reasons`
- draft scoring code has no React/Next.js dependency

## Approved Decisions

1. `trackingMode` is explicit: `"full_pack" | "selected_only"`.
2. Strategic `risks` and data/input `warnings` are separate fields.
3. `candidateGroups` is always present as an array. Rank 1 and UI-highlighted recommendations must have non-empty `candidateGroups`; fallback groups prevent unexplained top recommendations.
4. Missing strategy profile uses `warnings` plus `evaluationMeta`. It must not insert disclaimer text into `reasons`.
5. UI readiness uses phase-based gates: Schema Stabilization unlocks initial UI scaffold; Domain Logic / Product Readiness requires 15+ strategy fixtures before product-ready or merge-ready status.

## Recommended Approval Decision

This light spec is approved with one pragmatic constraint:

```text
Build schema stabilization fixtures first, then expand into the 15+ domain logic fixture matrix.
```

After approval, the next document should be an implementation plan using:

```text
failing fixture/test -> minimal implementation -> refactor -> yarn test
```
