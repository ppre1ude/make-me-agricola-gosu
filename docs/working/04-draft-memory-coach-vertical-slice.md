# 04 Draft Memory Coach Vertical Slice

Status: Next feature-unit: pick resolution flow

## Goal

다음 feature-unit은 추천 결과를 본 뒤 사용자가 실제로 고른 카드를 확정하고
다음 pick 입력 상태로 넘어가는 resolution flow를 닫는다.

```text
추천 결과 -> 실제 선택 확정 -> picked/seen/passed 반영 -> offered 비우기 -> 다음 pick 준비
```

이 조각의 목표는 `DraftScoringInput`을 다음 pick으로 안전하게 전이시키는
계약을 고정하는 것이다. 드래프트 판단 로직은 계속 `src/features/draft`에
남기고, API/UI는 얇은 어댑터여야 한다.

## Non-Goals

- React/Next.js scaffold
- 외부 DB, 인증, 클라우드 동기화
- OCR 또는 화면 인식
- 자동 학습, 자동 weight 조정, 자동 fixture 생성
- 카드 상세/source viewer의 product-ready 구현
- broad strategy data curation
- `full_pack` missing-card inference
- JSONL 피드백을 자동 학습, 자동 weight 조정, fixture 승격으로 연결하는 구현
- 모델 추천과 다른 사용자 선택을 "모델 오류"로 판정하는 UI

## Local API

첫 구현은 localhost 전용 API로 충분하다. 카드/추천 API는 normalized data와
fixture data를 읽기 전용으로 다룬다. feedback API만 중립 JSONL event를
append한다.

Expected endpoints:

```text
GET /api/health
GET /api/cards?type=occupation|minor_improvement&q=<query>
POST /api/draft/recommend
POST /api/draft/feedback
```

`GET /api/health`

- 로컬 서버가 떠 있는지 확인한다.
- 예: `{ "ok": true }`

`GET /api/cards`

- 카드 chip/autocomplete 입력에 필요한 compact card list를 반환한다.
- `type`은 직업/보조설비 입력 화면을 나누기 위한 필터다.
- `q`는 한글명, 영문명, alias 검색에 사용한다.
- 빈 `q`는 인기순/기본순 전체 목록이 아니라 짧은 기본 후보만 반환한다.
- response item은 `id`, `type`, `name`, `aliases`, 선택적 `cardPoolStatus`를
  담는 compact shape다.
- 이 endpoint는 추천 판단을 하지 않는다.

`POST /api/draft/recommend`

- 이 feature-unit에서는 호출 준비까지만 보장해도 된다.
- request body는 `DraftScoringInput` shape를 따른다.
- 서버는 카드 참조와 기본 입력 shape를 검증한 뒤 `rankDraftOptions`를 호출한다.
- response는 `{ "recommendations": DraftRecommendation[] }` 형태를 기본으로 한다.
- invalid input은 400과 validation issues를 반환한다.
- UI는 response를 다시 scoring하거나 candidate group을 재계산하지 않는다.

`POST /api/draft/feedback`

- pick resolution에서 사용자 실제 선택이 model top pick과 다를 때 호출한다.
- 서버는 중립 `model_user_disagreement` event를 JSONL에 append한다.
- response는 저장된 event id와 append 성공 여부만 반환한다.
- 이 endpoint는 scoring behavior를 변경하지 않는다.

## Browser Draft State Policy

브라우저 `localStorage`의 draft state는 사용자 로컬 편의 데이터다. 새로고침이나
브라우저 재방문 때 입력 중인 상태를 복원하기 위한 것이며, 학습 데이터가 아니다.

Policy:

- 저장 범위는 draft card type, format, pick number, explanation depth, tracking mode,
  offered cards, picked cards, seen cards, passed cards, undo snapshot이다.
- 저장 key는 `agricola-korean-gosu:draft-memory-coach:draft-input:v1`이다.
- 저장 값은 `DraftScoringInput`으로 변환 가능한 UI state여야 한다.
- 카드 id만 저장하고 card text snapshot은 저장하지 않는다.
- localStorage state는 JSONL feedback event와 분리한다.
- undo는 1-step localStorage 편의 기능이다. 직전 local draft state만 되돌리고,
  JSONL feedback event를 삭제하거나 수정하지 않는다.
- localStorage state를 fixture, scoring weight, strategy profile로 자동 승격하지 않는다.
- 사용자가 reset하면 localStorage state만 지운다. JSONL feedback은 지우지 않는다.

## Pick Resolution Contract

`selected`는 현재 offered pack에서 사용자가 확정하려는 임시 UI 선택이다.
resolution 이후에는 별도 `selected` 상태로 보존하지 않고 draft fact로 반영한다.

입력:

- 현재 `DraftScoringInput`
- 현재 `offeredCardIds` 안의 `selectedCardId`
- 직전 `DraftRecommendation[]`의 model top card id

`selected_only` 전이:

- selected card는 `pickedCardIds`에 추가한다.
- 선택하지 않은 offered cards는 `seenCardIds`와 `passedCardIds`에 추가한다.
- `offeredCardIds`는 비운다.
- `pickNumber`는 1 증가시킨다.
- 중복 card id는 다시 추가하지 않고, 기존 순서를 유지한다.

`full_pack` 주의:

- 현재 보인 offered pack과 실제 선택은 위와 같이 fact로 기록한다.
- 이번 feature-unit에서는 missing-card inference를 하지 않는다.
- 이전 full pack에서 사라진 카드를 상대 선택, passed, missing으로 추론하지 않는다.

피드백:

- selected card가 model top과 다르면 `model_user_disagreement`를 기록한다.
- 이 이벤트는 "모델이 틀렸다"는 verdict가 아니라 사람 검토용 관찰이다.
- event에는 resolution 전 input snapshot, recommendation ids, model top,
  user selected card를 보존한다.
- selected card가 model top과 같으면 disagreement event를 남기지 않는다.

Undo:

- undo는 직전 resolution 1회만 되돌리는 localStorage 편의 기능이다.
- undo는 JSONL feedback과 독립이다.
- 이미 기록된 feedback event를 undo로 삭제하거나 rewrite하지 않는다.

## Feedback JSONL Policy

런타임 피드백은 fixture와 localStorage draft state 모두에서 분리한다. 추천 결과가
틀렸다는 결론이 아니라, "사용자가 다른 카드를 골랐다"는 관찰을 보존하는 기록이다.

Policy:

- 권장 경로는 `data/local/draft-feedback-events.jsonl`이다.
- 구현 시 이 경로는 runtime-local data로 취급하고 fixture로 직접 읽지 않는다.
- 실제 구현 전에는 이 경로가 git에 실수로 포함되지 않도록 ignore 정책을 닫는다.
- `data/fixtures/draft-feedback/*.json`에는 런타임 피드백을 직접 쓰지 않는다.
- 한 줄에 하나의 JSON object를 append-only로 저장한다.
- event type은 `model_user_disagreement`만 사용한다.
- 기본 `reviewState`는 `unreviewed`다.
- `possibleCauses`는 추정 분류일 뿐 verdict가 아니다.
- `modelTopCardId`, `userSelectedCardId`, `recommendationCardIds`, input snapshot을
  함께 저장해 나중에 사람이 검토할 수 있게 한다.
- 저장 직후 scoring weight, strategy profile, fixture expected를 자동 변경하지 않는다.
- fixture 후보 전환은 사람이 복기한 뒤 별도 feature-unit에서 한다.

금지 표현:

```text
model_wrong
incorrect_recommendation
bad_pick
user_error
```

## UI Behavior

첫 화면은 Draft Memory Coach 자체여야 한다. landing page나 marketing hero를
두지 않는다.

UI는 사용자 제공 wireframe을 기다리는 상태다. 이번 구현은 resolution,
local state, feedback 로직을 layout과 분리해 두고, 화면 배치가 바뀌어도
계약 함수는 그대로 재사용할 수 있어야 한다.

기본 흐름:

1. 사용자는 draft card type, draft format, pick number, explanation depth를 고른다.
2. 기본 입력은 `full_pack` tracking이다.
3. 시간 압박용 fallback으로 `selected_only` 입력을 허용한다.
4. 카드 입력은 `/api/cards` autocomplete로 검색하고 chip으로 확정한다.
5. 현재 pack의 offered cards를 편집할 수 있다.
6. 이미 고른 카드, 본 카드, 넘긴 카드는 draft state에서 추가/삭제할 수 있다.
7. draft state는 변경 때마다 browser localStorage에 저장된다.
8. 화면 진입 시 localStorage draft state가 있으면 복원한다.
9. reset은 localStorage draft state만 지운다.
10. 추천 버튼은 `POST /api/draft/recommend`를 호출하고 response를 보관한다.
11. UI는 rank 1 추천을 가장 크게 보여주고, 대안 2~3개를 함께 보여준다.
12. 추천 row는 reason, risk, warning, return likelihood, next-pick direction을
   계약 필드에서 그대로 렌더링한다.
13. missing data는 `warnings`와 `evaluationMeta`로 표시하고 `reasons`에 섞지 않는다.
14. component 숫자는 deep/debug view에서만 보여준다.
15. 사용자가 실제 선택을 확정하면 Pick Resolution Contract로 local draft state를 갱신한다.
16. `selected_only`에서는 selected card를 picked로 옮기고, 선택하지 않은 offered
    cards를 seen/passed로 옮긴 뒤, offered를 비우고 pickNumber를 1 올린다.
17. 실제 선택이 model top pick과 다르면 `model_user_disagreement`를 기록한다.
18. undo는 직전 resolution의 localStorage state만 복구한다.

UI는 "왜 이 추천인가"를 설명해야 하지만, "정답"을 선언하면 안 된다.

## Test Commands After Integration

통합 후 기본 확인 순서:

```text
yarn report:fixture-gates
yarn test
```

`yarn test`는 현재 다음을 포함해야 한다.

```text
yarn typecheck
yarn validate:data
yarn score:fixtures
yarn test:draft-coach-api
yarn test:draft-state-store
yarn test:pick-resolution
```

이 feature-unit에는 pick resolution unit test, `selected_only` state transition,
model top과 다른 선택의 `model_user_disagreement` 기록, undo local rollback,
`full_pack` missing-card inference 미수행 확인을 포함한다. test script가 추가되면
같은 feature-unit 안에서 package script와 문서를 함께 갱신하고, 최종 확인은 여전히
`yarn test`로 닫는다.

## Feature-Unit Commit Boundary

이 단계부터는 checkpoint마다 커밋하지 않는다. checkpoint는 보고 단위이고,
커밋은 독립적으로 리뷰 가능한 feature-unit 단위로 묶는다.

Feature-unit 기준:

- 하나의 사용자 흐름 또는 하나의 contract adapter가 끝까지 동작한다.
- 관련 코드, 테스트, fixture, 문서가 같은 커밋에 들어간다.
- unrelated cleanup은 섞지 않는다.
- scoring contract, persistence path, user-visible behavior 변경은 사람 검토 후
  orchestrator가 커밋한다.
- sub-agent는 직접 커밋하지 않고 checkpoint report와 commit message 후보만 낸다.

권장 feature-unit 예:

```text
1. editable draft state editor with /api/cards autocomplete
2. browser localStorage draft state persistence
3. local draft recommendation API adapter
4. pick resolution flow
5. neutral JSONL feedback persistence
6. API/UI smoke tests and final docs alignment
```

각 feature-unit은 green test와 짧은 review note가 있어야 merge-ready로 본다.
