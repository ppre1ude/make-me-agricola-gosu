# 04 Draft Memory Coach Vertical Slice

Status: Draft for first integration slice

## Goal

첫 세로 조각은 scoring/data/fixture gate 이후 처음으로 사용자가 다음 흐름을
로컬에서 끝까지 확인하게 한다.

```text
현재 픽 입력 -> 추천 확인 -> 실제 선택 기록 -> 중립 피드백 JSONL 저장
```

이 조각의 목표는 UI가 `DraftScoringInput`과 `DraftRecommendation` 계약을
그대로 소비할 수 있음을 증명하는 것이다. 드래프트 판단 로직은 계속
`src/features/draft`에 남기고, API/UI는 얇은 어댑터여야 한다.

## Non-Goals

- React/Next.js scaffold
- 외부 DB, 인증, 클라우드 동기화
- OCR 또는 화면 인식
- 자동 학습, 자동 weight 조정, 자동 fixture 생성
- 카드 검색/상세의 product-ready 구현
- broad strategy data curation
- 모델 추천과 다른 사용자 선택을 "모델 오류"로 판정하는 UI

## Local API

첫 구현은 localhost 전용 API로 충분하다. 런타임 데이터 쓰기는 피드백 JSONL만
허용하고, normalized data와 fixture data는 읽기 전용으로 다룬다.

Expected endpoints:

```text
GET /api/health
GET /api/draft/sample
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
- 이 endpoint는 추천 판단을 하지 않는다.

`POST /api/draft/recommend`

- request body는 `DraftScoringInput` shape를 따른다.
- 서버는 카드 참조와 기본 입력 shape를 검증한 뒤 `rankDraftOptions`를 호출한다.
- response는 `{ "recommendations": DraftRecommendation[] }` 형태를 기본으로 한다.
- invalid input은 400과 validation issues를 반환한다.
- UI는 response를 다시 scoring하거나 candidate group을 재계산하지 않는다.

`POST /api/draft/feedback`

- 사용자 실제 선택이 model top pick과 다를 때 호출한다.
- 서버는 중립 `model_user_disagreement` event를 JSONL에 append한다.
- response는 저장된 event id와 append 성공 여부만 반환한다.
- 이 endpoint는 scoring behavior를 변경하지 않는다.

## Feedback JSONL Policy

런타임 피드백은 fixture와 분리한다. 추천 결과가 틀렸다는 결론이 아니라,
"사용자가 다른 카드를 골랐다"는 관찰을 보존하는 기록이다.

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

기본 흐름:

1. 사용자는 draft card type, draft format, pick number, explanation depth를 고른다.
2. 기본 입력은 `full_pack` tracking이다.
3. 시간 압박용 fallback으로 `selected_only` 입력을 허용한다.
4. 현재 pack의 offered cards를 card chip으로 입력한다.
5. 이미 고른 카드, 본 카드, 넘긴 카드는 draft state에서 누적한다.
6. 추천 버튼은 `POST /api/draft/recommend`만 호출한다.
7. UI는 rank 1 추천을 가장 크게 보여주고, 대안 2~3개를 함께 보여준다.
8. 추천 row는 reason, risk, warning, return likelihood, next-pick direction을
   계약 필드에서 그대로 렌더링한다.
9. missing data는 `warnings`와 `evaluationMeta`로 표시하고 `reasons`에 섞지 않는다.
10. component 숫자는 deep/debug view에서만 보여준다.
11. 사용자가 실제 선택을 확정하면 local draft state를 갱신한다.
12. 실제 선택이 model top pick과 다르면 중립 피드백 저장 affordance를 보여준다.

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
```

API/UI smoke test script가 추가되면 같은 feature-unit 안에서 package script와
문서를 함께 갱신하고, 최종 확인은 여전히 `yarn test`로 닫는다.

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
1. local draft recommendation API adapter
2. static Draft Memory Coach UI shell and local draft state
3. neutral JSONL feedback persistence
4. API/UI smoke tests and final docs alignment
```

각 feature-unit은 green test와 짧은 review note가 있어야 merge-ready로 본다.
