# 02 Superpowers Subagent Dispatch Plan

Status: Draft

Latest checkpoint:

```text
Schema Stabilization Gate: closed by 7 passing fixtures.
Domain Logic Gate: 15 passing fixtures; pending human review.
```

## Scope

This plan routes work for the pre-UI scoring-contract phase using parallel subagents.
It follows the project gate in `docs/agents/00-agent-operating-model.md` and the approved light spec in `docs/working/01-pre-ui-scoring-contract-light-spec.md`.

## Current Gate

The active gate is:

```text
scoring contract + data validation + fixture matrix
```

Why UI, API, and DB are deferred:

- UI would encode draft logic before the engine contract is stable.
- API is not needed until the contract is stable enough to expose.
- DB work is premature because schema decisions should follow the validated contract and fixtures.

## Safe Parallel Lanes Now

1. Contract / scoring lane
   - Close `DraftScoringInput`, `DraftRecommendation`, and score-component behavior.
   - Keep the engine independent from React/Next.js.

2. Validation / fixture-runner lane
   - Enforce supported fixture assertions.
   - Fail invalid data and unsupported contract fields.
   - Keep `yarn test` as the main check.

3. Data / fixtures lane
   - Add purpose-built draft fixtures for schema stabilization.
   - Expand only the minimum strategy data needed for the fixture matrix.

4. Docs / review lane
   - Keep the working docs aligned with the latest contract and gate status.
   - Record open questions, acceptance criteria, and remaining risks.

## Deferred Lanes

These stay future-only until Schema Stabilization is complete:

- API lane: expose the contract only after it stops shifting.
- DB lane: persist only after the validated data model is stable.
- UI lane: begin Draft Memory Coach scaffold only after the schema gate closes.

## Human Review Checkpoints

Sub-agents must not commit directly. The operating loop is:

```text
sub-agent edits/tests -> checkpoint report -> human review -> orchestrator commit
```

Every checkpoint report must include changed files, proposed commit message, tests run, unresolved risks, and whether the next step depends on human approval.
The orchestrator must also recommend both one-line and multi-line Conventional Commit messages for the checkpoint. Multi-line body lines must stay within 72 characters and explain what changed or why it matters.
Prefer Korean commit messages unless the user asks for English or a specific existing convention requires English.

1. After contract shape changes
   - Confirm the contract still matches the light spec.
   - Confirm no UI assumptions leaked into the engine.

2. After validation changes
   - Confirm invalid fixtures fail for the right reason.
   - Confirm allowed missing-data cases still pass.

3. After fixture additions
   - Confirm each fixture maps to one primary behavior.
   - Confirm rank 1 recommendations keep non-empty candidate groups.

4. Before widening scope beyond schema stabilization
   - Confirm the gate is actually closed, not just green by accident.

## Verification

Prefer this order:

```text
yarn test
yarn validate:data
yarn score:fixtures
```

Use `yarn test` as the final acceptance command for the lane set.
If a narrower command is needed while iterating, run it first and finish with `yarn test`.

## Completion Criteria

### Schema Stabilization Gate

This gate is complete when all of the following are true:

- `yarn test` passes.
- The output contract is stable enough for UI code.
- Supported fixture assertions are enforced.
- Schema fixtures cover happy path, missing profile, warnings/meta separation, return likelihood, and next-pick guidance.
- Rank 1 recommendations have non-empty candidate groups.
- Missing data remains visible without polluting `reasons`.

### Domain Logic Gate

This gate is complete when all of the following are true:

- The schema gate is already closed.
- The strategy fixture matrix covers the accepted draft judgment cases.
- Scoring reflects the intended tradeoffs for broken cards, anchors, saturation, risk, return likelihood, and late-pick completion.
- Validation still passes on intentional missing stat/profile cases.
- The fixture set is broad enough to support UI and API work without new scoring decisions.

## Dispatch Rule

Run the contract, validation, and fixture lanes in parallel. Keep docs/review in the loop after each meaningful contract or fixture change. Do not dispatch UI, API, or DB work until Schema Stabilization is explicitly complete.

Commit boundaries should follow this order unless the human reviewer chooses otherwise:

```text
scoring contract -> data validation -> fixture matrix -> implementation -> docs
```
