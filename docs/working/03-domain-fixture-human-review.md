# 03 Domain Fixture Human Review

Status: Draft for review

## Purpose

The scoring contract, validation, and fixture matrix now have enough automated
coverage to support a human strategy review checkpoint.

This document defines how to review the 17 draft fixtures for strategy quality.
The automated tests prove that the contract behavior is stable. They do not
prove that every recommendation is strategically good enough for a real draft
coach.

## Current Gate State

```text
Schema Stabilization Gate: 7/7 direct fixture gate coverage.
Domain Logic Gate: 17 passing fixtures.
Stretch Fixture Coverage: 5/5 direct.
Human strategy review: pending.
```

The feedback stretch case is covered by a neutral feedback event fixture:

```text
model-user-disagreement-recorded-without-judgment
```

It records the user choosing a different card without labeling the model wrong.

## Review Commands

Run these before reviewing fixture judgment:

```text
yarn report:fixture-gates
yarn test
```

Expected baseline:

```text
17 draft fixtures passed.
Schema Stabilization Gate: 7 direct, 0 partial, 0 missing.
Domain Logic Gate: 14 direct, 1 shared, 0 partial, 0 missing.
Stretch Cases: 5 direct, 0 missing.
```

## Review Verdicts

Use one verdict per fixture:

```text
approve
approve_with_note
needs_fixture_change
needs_scoring_change
needs_strategy_data_change
defer
```

Severity:

```text
critical: blocks UI/API work
high: blocks product-ready Draft Memory Coach
medium: track before broader data curation
low: wording or future polish
```

## Review Questions

For every fixture, answer:

1. Does the top recommendation match expert draft judgment for this pick band?
2. Are the downranked cards downranked for the right strategic reason?
3. Are `candidateGroups` useful labels rather than redundant score names?
4. Are `risks` reserved for tradeoffs rather than generic warnings?
5. Are `warnings` and `evaluationMeta` visible without polluting `reasons`?
6. Does `nextPickDirection` point to useful follow-up roles?
7. Are component thresholds meaningful enough to guard regressions?

## Fixture Review Matrix

### Schema Stabilization

| Fixture | Primary Review Question | Expected Human Check |
| --- | --- | --- |
| `early-anchor` | Is a broken plan anchor correctly prioritized at pick 1? | Confirm Field Watchman deserves rank 1 and both anchor labels. |
| `fallback-filler-candidate` | Can a bare card still render as a fallback recommendation? | Confirm fallback output is honest and not overconfident. |
| `missing-profile-warning-and-evaluation-meta` | Is missing profile data visible but kept out of reasons? | Confirm warning/meta separation and low confidence. |
| `return-likelihood-shape` | Do low/high ADP return labels match draft intuition? | Confirm unlikely vs likely thresholds feel sane. |
| `next-pick-direction-shape` | Does next-pick guidance name useful follow-up roles? | Confirm guidance is actionable after the current pick. |

### Domain Logic

| Fixture | Primary Review Question | Expected Human Check |
| --- | --- | --- |
| `field-watchman-saturation` | Does a solved field role downrank another field card? | Confirm food/grain follow-up beats redundant field access. |
| `solved-role-downranks-high-stat-duplicate` | Can high stat strength lose to role completion? | Confirm duplicate field strength does not dominate context. |
| `late-completion` | Do late picks prefer hole filling over raw points? | Confirm bake/food completion beats weak late points. |
| `return-likelihood-shape` | Are wheel-risk labels useful for pick pressure? | Confirm low ADP is not treated as likely to return. |
| `conditional-card-emits-risk-penalty` | Is a conditional points card penalized visibly? | Confirm risk penalty and risk text are not too strong or weak. |
| `missing-stat-unknown-return` | Does missing stat data stay evaluable but uncertain? | Confirm unknown return and missing stat metadata are appropriate. |
| `conflict-card-downranked` | Is plan conflict expensive enough? | Confirm conflict does not overrule all stat strength by default. |
| `food-engine-and-food-support-distinct` | Are food engine and food support separate concepts? | Confirm support card does not masquerade as a full engine. |
| `full-tracking-role-pressure` | Does full tracking create weak role pressure only? | Confirm missing cards do not imply opponent ownership claims. |

### Stretch Cases

| Fixture | Primary Review Question | Expected Human Check |
| --- | --- | --- |
| `middle-pick-high-pass-regret-beats-weak-support` | Can pass regret beat weak support in picks 3-4? | Confirm pass regret is persuasive but not automatic. |
| `late-pick-candidate-set-before-tier` | Does late pick candidate fit beat raw tier? | Confirm executable food support beats conditional points. |
| `plan-shift-hint-high-impact` | Does a high-impact pick justify a pivot hint? | Confirm plan-shift hint appears only for true pivot cards. |
| `broken-card-resists-saturation` | Does broken strength survive but not ignore saturation? | Confirm broken duplicate lands between food follow-up and weak points. |
| `model-user-disagreement` | Can user disagreement be recorded without judgment? | Confirm the event preserves user choice without saying the model was wrong. |

## Reviewer Output Template

Use this format for each fixture that needs action:

```text
Fixture:
Verdict:
Severity:
Observed issue:
Expected strategic judgment:
Suggested action:
```

Suggested action should choose one:

```text
change expected fixture assertion
change scoring weight or rule
change strategy profile data
add a narrower fixture
defer until UI feedback exists
```

## Approval Rule

UI/API planning can start after:

```text
- yarn test passes.
- yarn report:fixture-gates has no schema or domain partial/missing cases.
- Human review has no critical or high unresolved fixture issues.
```

Medium and low issues can be tracked as follow-up data curation or UX polish.
