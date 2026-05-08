# 05 Pre-UI Readiness Checkpoint

Status: Ready for wireframe-based initial UI integration

## Summary

The automated pre-UI gate is closed enough to start wireframe-based Draft
Memory Coach UI integration. The remaining blocker is not more contract code.
It is human strategy review before calling the UI product-ready or merge-ready.

```text
Initial UI integration: allowed after user wireframe.
Product-ready UI: blocked until human strategy review has no critical/high issues.
```

## Automated Gate State

Current baseline:

```text
Schema Stabilization Gate: 7/7 direct coverage.
Domain Logic Gate: 17 passing draft fixtures.
Domain Logic coverage: 14 direct, 1 shared, 0 partial, 0 missing.
Stretch Coverage: 5/5 direct.
Feedback fixture count: 1.
Human strategy review: pending.
```

The current `yarn test` suite covers:

```text
yarn typecheck
yarn validate:data
yarn score:fixtures
yarn test:draft-coach-api
yarn test:draft-state-store
yarn test:pick-resolution
yarn test:draft-feedback-store
yarn test:draft-static-assets
```

## What Is Ready

- Draft scoring contract is TypeScript and UI-independent.
- Data validation rejects unsupported fixture and feedback shapes.
- Fixture matrix covers the schema gate and current domain gate targets.
- Local `/api/draft/recommend` returns renderable recommendations.
- Local `/api/draft/feedback` persists neutral JSONL disagreement events.
- Browser draft state persists to localStorage and has one-step undo storage.
- Pick resolution transition is implemented as a layout-independent helper.
- `/draft/` static shell and helper scripts are served by the local API server.

## What Is Still Pending

- Human strategy review of the 17 fixtures.
- User-provided wireframe for visible pick confirmation and undo placement.
- Controller wiring from the visible UI into `DraftPickResolution`.
- Broader 50-100 card strategy profile curation.
- DB/cloud persistence, auth, OCR, and automated learning.

## UI Integration Constraints

When the wireframe arrives, the first user-visible integration should stay
inside the current Draft Memory Coach surface:

1. Add a distinct pick confirmation trigger.
2. Do not reuse "차이 기록" as pick confirmation.
3. Push an undo snapshot before resolving the pick.
4. Resolve local draft state even if feedback persistence fails.
5. Do not let undo delete or rewrite JSONL feedback events.
6. Keep `full_pack` missing-card inference deferred unless explicitly scoped.

## Verification

Run these before starting and after finishing the first wireframe-based UI
integration:

```text
yarn report:fixture-gates
yarn test
```

The fixture gate report is still not a substitute for strategy judgment. It
only proves the automated contract and regression surface.
