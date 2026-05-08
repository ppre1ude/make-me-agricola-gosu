# 06 Next Draft Parity Plan

Status: React/Next scaffold wired; `/draft` route switched after parity guard

## Purpose

The current user-visible Draft Memory Coach reference lives in:

```text
public/draft/index.html
public/draft/app.js
public/draft/styles.css
```

The React/Next port should preserve the current workflow before changing
product behavior. This document defines the parity surface and a lightweight
static test that can run before a Next scaffold exists.

## Reference Contract

The static draft reference is the behavioral baseline for the first React/Next
port. The port should keep these user-facing flows equivalent:

1. Load a sample draft state.
2. Edit draft type, format, pick number, tracking mode, explanation depth,
   skill level, and card groups.
3. Search/add/remove offered, picked, seen, and passed cards.
4. Request recommendations through `/api/draft/recommend`.
5. Render ranked recommendation cards with score, reasons, warnings, risks,
   direction hints, candidate groups, confidence, method, and missing data.
6. Select a recommendation as the actual pick.
7. Resolve the pick through the existing pick-resolution contract.
8. Record neutral disagreement feedback through `/api/draft/feedback`.
9. Preserve local draft input and one-step undo state in browser storage.

The port must not move scoring, validation, or pick-resolution rules into
React components. Those contracts stay independent from UI framework code.

## Static Parity Surface

The first parity gate checks for stable, framework-agnostic markers rather than
rendering a browser page. This is intentionally weaker than browser QA, but it
catches accidental omissions during scaffold and component extraction.

Reference app shell markers:

```text
recommendButton
loadSampleButton
undoPickButton
pickNumberInput
draftCardTypeSelect
draftFormatSelect
trackingModeSelect
explanationDepthSelect
skillLevelSelect
offeredCardSearch
pickedCardSearch
seenCardSearch
passedCardSearch
recommendations
feedbackForm
resolvePickButton
pickConfirmModal
confirmPickButton
```

Reference API and state markers:

```text
/api/draft/sample
/api/cards
/api/draft/recommend
/api/draft/feedback
DraftStateStore
DraftPickResolution
buildScoringInput
buildFeedbackPayload
createDefaultDraftInput
offeredCardIds
pickedCardIds
seenCardIds
passedCardIds
model_user_disagreement
```

Reference layout/class markers:

```text
app-shell
top-bar
coach-layout
draft-panel
recommendations-panel
feedback-panel
recommendation-card
recommendation-radio
chip-list
alert-list
modal-backdrop
confirm-dialog
```

React/Next candidates are searched in common scaffold locations:

```text
app/
src/app/
components/
src/components/
src/ui/
src/features/draft/
```

When no `.tsx`, `.ts`, `.jsx`, or `.js` files exist in those locations, the parity script
passes with a pending message after validating the static reference. Partial
component extraction can also remain pending. Full React parity enforcement
starts once a draft page/root DraftMemoryCoach surface or core reference marker
appears. At that point, the same script asserts that the combined React source
still contains the key IDs, API contracts, state fields, and CSS class markers
above.

## Test Command

Run directly with Node:

```text
node scripts/test-draft-react-parity.ts
```

The command is also available through `yarn test:draft-react-parity` and is
included in `yarn test` so future React edits keep the static reference contract
visible.

## Acceptance Criteria

The React/Next port is parity-ready when:

- `node scripts/test-draft-react-parity.ts` passes with React files present.
- The existing static reference checks still pass.
- `yarn test` remains green.
- Any intentional UI behavior change is documented separately from parity.
- Scoring and validation contracts remain under `src/features/draft`.
- Pick resolution still uses the existing contract semantics.
- `/draft` serves the React Draft Memory Coach while `public/draft` remains the
  fixed reference implementation.

## Limits

This test does not prove runtime behavior, accessibility, responsive layout,
or end-to-end API interaction. After a runnable Next app exists, add browser
QA for the Draft Memory Coach flow and keep this script as a fast static
regression guard.
