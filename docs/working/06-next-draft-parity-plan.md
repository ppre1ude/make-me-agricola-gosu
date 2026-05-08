# 06 Next Draft Parity Plan

Status: React/Next scaffold wired; `/draft` route switched after parity guard

## Purpose

The current user-visible Draft Memory Coach reference implementation lives in:

```text
public/draft/index.html
public/draft/app.js
public/draft/styles.css
```

This static implementation is useful evidence, but it is not the absolute
source of truth. The source of truth is the documented Draft Memory Coach
product flow plus the scoring, validation, pick-resolution, feedback, and undo
contracts already defined in the codebase. If the static reference conflicts
with that documented flow, the expected action is to report the conflict for
human review instead of copying the static behavior blindly.

This document defines documented-flow coverage markers and a lightweight static
test that can run before or during React/Next work.

## Documented Flow Contract

The React/Next port should keep the documented user-facing flows covered:

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

## Flow Marker Coverage Surface

The first guard checks stable, framework-agnostic markers rather than rendering
a browser page. This is intentionally weaker than browser QA, but it catches
accidental omissions during scaffold and component extraction.

The static reference files are checked as marker files because they record the
current implementation shape. Passing those checks does not mean the static
implementation is product-correct; failing those checks means a human should
review whether the marker drift is intentional or whether the reference no
longer covers the documented flow.

App shell markers:

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

API and state markers:

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

Layout/class markers:

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

Card search/autocomplete markers for the next feature unit:

```text
offeredCardResults
pickedCardResults
seenCardResults
passedCardResults
addOfferedCardButton
addPickedCardButton
addSeenCardButton
addPassedCardButton
card-search
card-search-input
search-results
search-result-button
search-result-name
search-result-meta
role=listbox
role=option
DraftCardSearchOptions
DraftCardSummary
adapter.searchCards or /api/cards
```

Card detail drawer markers for the next feature unit:

```text
CardDetailDrawer
DraftCardDetail
cardDetailDrawer
closeCardDetailButton
card-detail-open-button
card-detail-drawer
card-detail-backdrop
card-detail-header
card-detail-body
card-detail-stats
card-detail-strategy-profile
/api/cards/[cardId] or adapter.getCardDetail
```

The static `public/draft` reference does not currently include the card detail
drawer. That is a documented-flow gap, not a reason to omit the React drawer.
The source of truth for this unit is the "카드 상세" section in
`docs/core/04-feature-specs.md`. If the static reference conflicts with that
section, report the conflict for human review rather than copying the static
surface.

The drawer should expose documented card detail sections:

```text
Header: name, English name, type, deck, Arena status, tier, rank
Card Body: card text/image, effect summary, cost, condition, victory points,
  player-count condition
Stats: PWR, WtdPWR, ADP, APR, Deals, Drafted, Plays, W-Hand, W-Play, Elo/Play
Strategy Profile: roles, broken/plan anchor status, solved problems,
  additional needs, saturation risks, synergy, conflicts, risk tags,
  operation sequence, next-pick guidance
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

## Next Feature Unit

The next feature unit connects React card search/autocomplete parity. The
current manual ID input can remain as a fallback, but it is not sufficient by
itself. React should search cards through `adapter.searchCards` or `/api/cards`,
render selectable result buttons for each card group, and add the selected card
through the existing group input contract.

The parity guard now expects concrete search-result containers, add buttons,
selectable result button markers, listbox/option roles, and the typed card
search adapter surface. If these markers fail while the documented product flow
still expects autocomplete, report the gap for human review before changing the
product behavior.

The next feature unit after card search is the React card detail drawer. It
should let a user open detail from a recommendation or card chip, fetch detail
through `adapter.getCardDetail` or `/api/cards/[cardId]`, and close the drawer
without changing the draft state. The marker guard checks drawer component
presence, open/close markers, the detail API/adapter contract, and visible
markers for Header, Card Body, Stats, and Strategy Profile fields. This remains
static source coverage only; browser QA is still required for focus handling,
keyboard dismissal, scroll lock, async loading/error states, and responsive
layout.

## Test Command

Run directly with Node:

```text
node scripts/test-draft-react-parity.ts
```

The command is also available through `yarn test:draft-react-parity` and is
included in `yarn test` so future React edits keep documented-flow coverage
visible.

## Acceptance Criteria

The React/Next port is parity-ready when:

- `node scripts/test-draft-react-parity.ts` passes with React files present.
- The marker checks for the static reference files still pass, or any conflict
  with the documented flow has been reported for human review.
- `yarn test` remains green.
- Any intentional UI behavior change is documented separately from parity.
- Scoring and validation contracts remain under `src/features/draft`.
- Pick resolution still uses the existing contract semantics.
- Card search/autocomplete uses `adapter.searchCards` or `/api/cards`.
- Card search results are selectable buttons, not only manual ID text input.
- Card detail drawer uses `adapter.getCardDetail` or `/api/cards/[cardId]`.
- Card detail drawer exposes Header, Card Body, Stats, and Strategy Profile
  markers from `docs/core/04-feature-specs.md`.
- `/draft` serves the React Draft Memory Coach while `public/draft` remains the
  fixed reference implementation for comparison.

## Limits

This test does not prove runtime behavior, accessibility, responsive layout,
or end-to-end API interaction. After a runnable Next app exists, add browser
QA for the Draft Memory Coach flow and keep this script as a fast static
regression guard.
