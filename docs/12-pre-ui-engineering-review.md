# 12 Pre-UI Engineering Review

## 목적

이 문서는 Draft Memory Coach UI 구현 전에 닫아야 할 엔지니어링 결정을 정리한다.

현재 제품 방향은 충분히 선명하다. 문제는 제품 방향이 아니라, UI가 붙기 전에 추천 엔진과 데이터 계약을 얼마나 단단하게 만들 것인가다.

핵심 결론:

```text
UI 전에 scoring contract, data validation, fixture matrix를 먼저 닫는다.
```

## 현재 상태 진단

### 문서 아키텍처

문서상 방향은 잡혀 있다.

- 제품 흐름: Draft Memory Coach
- 데이터 구축 흐름: Strategy Knowledge Base
- UI보다 비UI scoring prototype을 먼저 검증
- 카드 DB는 추천을 위한 기반 데이터

관련 문서:

- [03 Data Model](./03-data-model.md)
- [05 Feature Specs](./05-feature-specs.md)
- [07 Roadmap](./07-roadmap.md)

### 코드 아키텍처

코드 아키텍처는 아직 정립 전이다.

현재 scoring prototype은 의존성 없이 빠르게 검증하기 위해 JavaScript로 작성되었다. 이는 최종 방향이 아니라 임시 프로토타입이다.

이유:

- repo가 문서 중심 상태에서 시작했다.
- Next.js/TypeScript scaffold가 아직 없다.
- 로컬 `npm`이 깨져 있었고, `yarn`만 동작했다.
- UI보다 먼저 추천 로직 방향을 검증하는 것이 급했다.

하지만 UI 구현 전에 반드시 TypeScript 기반 계약으로 전환해야 한다.

## 핵심 리뷰 결론

### 1. TypeScript 전환은 필수

현재 JavaScript scoring prototype은 기능 탐색용이다.

이 상태로 UI를 붙이면 다음 문제가 생긴다.

- UI가 기대하는 입력/출력 타입이 암묵적이다.
- 데이터 누락 시 fallback 정책이 코드 내부에 묻힌다.
- fixture가 늘어날수록 refactor 비용이 커진다.
- 카드 50~100장 이후에는 잘못된 데이터 참조를 추적하기 어렵다.

권장:

```text
src/features/draft/scoring.js
→ src/features/draft/scoring.ts

scripts/score-draft-fixtures.js
→ scripts/score-draft-fixtures.ts
또는 tsx 기반 실행
```

단, TypeScript 전환은 단순 확장자 변경이 아니라 contract를 먼저 세우는 작업이어야 한다.

## Scoring Contract

추천 엔진은 UI와 분리된 순수 도메인 모듈이어야 한다.

### 권장 파일 구조

```text
src/features/draft/
  contract.ts
  scoring.ts
  explanation.ts
  validation.ts
  index.ts
```

초기에는 `contract.ts`와 `scoring.ts`만 있어도 된다.

### DraftScoringInput

UI가 추천 엔진에 넘기는 입력이다.

```ts
type DraftScoringInput = {
  pickNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  offeredCardIds: string[];
  pickedCardIds: string[];
  seenCardIds: string[];
  passedCardIds: string[];
  draftFormat: DraftFormat;
  cardPoolProfileId: string;
  explanationDepth: ExplanationDepth;
};
```

### DraftDataSet

추천 엔진이 참조하는 데이터 묶음이다.

```ts
type DraftDataSet = {
  cards: Card[];
  translations: CardTranslation[];
  stats: CardStatRow[];
  strategyRoles: StrategyRole[];
  strategyProfiles: CardStrategyProfile[];
  cardPoolProfile: CardPoolProfile;
};
```

### DraftRecommendation

UI는 이 출력만 렌더링해야 한다.

```ts
type DraftRecommendation = {
  cardId: string;
  rank: number;
  score: number;
  phase: DraftPickPhase;
  components: ScoreComponents;
  returnLikelihood: ReturnLikelihood;
  reasons: Record<ExplanationDepth, string[]>;
  risks: string[];
  nextPickDirection: string[];
};
```

### ScoreComponents

component는 0~10 범위를 갖는다.

```ts
type ScoreComponents = {
  statStrength: number;
  brokenOrAnchor: number;
  roleCoverage: number;
  synergy: number;
  returnUrgency: number;
  phaseFit: number;
  confidence: number;
  saturationPenalty: number;
  riskPenalty: number;
};
```

정책:

- component score는 0~10이다.
- final score는 같은 pick 안에서 비교하기 위한 숫자다.
- final score를 카드의 절대 강도로 표시하지 않는다.
- UI는 component를 설명과 디버깅에만 사용한다.

## Data Validation

UI 전 가장 중요한 작업은 데이터 검증이다.

현재는 데이터가 잘못되어도 scoring이 조용히 fallback할 수 있다. 이는 카드 수가 늘어날수록 디버깅 비용을 크게 만든다.

### 권장 파일

```text
scripts/validate-data.ts
```

또는 TypeScript toolchain 전까지:

```text
scripts/validate-data.js
```

### 필수 검증

Card:

- 모든 `Card.id`는 유일해야 한다.
- `Card.type`은 허용된 enum이어야 한다.

Translation:

- 모든 translation은 존재하는 `cardId`를 참조해야 한다.
- 같은 locale에서 alias 충돌이 있으면 warning을 낸다.

Stats:

- 모든 stat row는 존재하는 `cardId`를 참조해야 한다.
- `adp`, `pwr`, `wtdPwr`는 숫자 또는 undefined여야 한다.

StrategyRole:

- 모든 role id는 유일해야 한다.

CardStrategyProfile:

- 모든 profile은 존재하는 `cardId`를 참조해야 한다.
- `roles`는 `strategy-roles.json`에 존재해야 한다.
- `solves`, `increasesNeedFor`는 존재하는 role id여야 한다.
- `synergyWith`, `conflictsWith`는 존재하는 card id여야 한다.
- `saturationPenaltyTo`는 존재하는 card id 또는 role id여야 한다.
- `confidence`는 허용된 enum이어야 한다.

CardPoolProfile:

- 모든 card status key는 존재하는 card id여야 한다.
- 모든 status value는 허용된 enum이어야 한다.

Fixture:

- fixture의 `offeredCardIds`, `pickedCardIds`, `seenCardIds`, `passedCardIds`는 존재하는 card id여야 한다.
- `pickNumber`는 1~7이어야 한다.
- expected assertion은 지원되는 형식이어야 한다.

### Missing Data 정책

추천 엔진은 일부 데이터 누락을 허용하되, 어디까지 허용하는지 명확해야 한다.

권장 정책:

| 누락 | 정책 | 이유 |
| --- | --- | --- |
| missing card | error | 존재하지 않는 카드는 추천할 수 없다 |
| missing translation | warning + cardId fallback | UI는 표시 가능해야 한다 |
| missing stat | allowed + unknown return likelihood | 통계 없는 카드도 평가 가능해야 한다 |
| missing strategy profile | allowed + low confidence + risk 표시 | 전체 카드 수동 태깅 전에도 동작해야 한다 |
| missing role reference | error | strategy profile 품질을 깨뜨린다 |
| invalid card pool status | error | active pool 필터가 잘못된다 |

## Fixture Matrix

현재 fixture는 3개뿐이다.

현재 fixture:

- early anchor
- Field Watchman saturation
- late completion

이는 방향 확인용으로는 충분하지만 UI 전 계약 검증으로는 부족하다.

### 최소 기준

UI 시작 전:

```text
fixture 10개 이상
ranking뿐 아니라 component/risk/return/nextPick 검증
```

권장:

```text
fixture 15~20개
```

### 추가 fixture 후보

필수:

1. early broken card beats medium synergy
2. early plan anchor beats late points
3. high WtdPWR card downranked when role already solved
4. Field Watchman 이후 field/plow card saturation
5. Field Watchman 이후 grain supply/bake access 가점
6. low ADP card marked unlikely to return
7. high ADP card marked likely to return
8. conditional card gets risk penalty
9. missing stat still ranks but returnLikelihood unknown
10. missing strategy profile gets low confidence
11. late pick prefers hole filling over raw power
12. conflict card downranked
13. already solved food engine reduces extra food engine value
14. card with next-pick guidance emits nextPickDirection
15. broken card resists but does not fully ignore saturation

### Fixture Assertion 확장

현재 assertion은 top card 중심이다.

현재:

```json
{
  "topCardId": "occ-field-watchman",
  "notTopCardIds": ["minor-swing-plow"],
  "downrankedBelow": []
}
```

추가할 assertion:

```json
{
  "componentAtLeast": [
    { "cardId": "minor-swing-plow", "component": "saturationPenalty", "value": 5 }
  ],
  "componentBelow": [
    { "cardId": "minor-late-points", "component": "roleCoverage", "value": 3 }
  ],
  "returnLikelihood": [
    { "cardId": "occ-field-watchman", "value": "unlikely" }
  ],
  "hasRisk": [
    { "cardId": "minor-swing-plow", "risk": "role_saturation" }
  ],
  "nextPickIncludes": [
    { "cardId": "occ-field-watchman", "value": "곡식 공급" }
  ]
}
```

## Strategy Profile Decisions

### brokenReasonTags

사용자 설명을 바탕으로 broken card는 단순 티어가 아니라 "기본 행동 경제를 어떻게 왜곡하는가"로 분류할 수 있다.

초기 후보:

```text
action_compression
low_contest_action_upgrade
mandatory_action_parasitism
rewards_already_good_action
low_opportunity_cost_points
resource_conversion_breakpoint
timing_window_abuse
```

권장 schema:

```ts
type CardStrategyProfile = {
  isBroken?: boolean;
  brokenReasonTags?: string[];
  brokenReasonNote?: Record<LocaleCode, string>;
};
```

정책:

- v0에서 `isBroken`은 scoring에 사용한다.
- `brokenReasonTags`는 주로 설명/분류에 사용한다.
- 충분한 데이터가 쌓이기 전까지 `brokenReasonTags`를 강한 score modifier로 쓰지 않는다.

### role saturation

초기에는 card-level과 role-level을 혼합한다.

권장:

- role-level 기본 saturation은 `StrategyRole.defaultSaturationLimit`에서 관리한다.
- 예외적 카드 관계는 `CardStrategyProfile.saturationPenaltyTo`에 둔다.

예:

```json
{
  "cardId": "occ-field-watchman",
  "saturationPenaltyTo": ["field_engine", "minor-swing-plow"]
}
```

## Architecture Recommendation

### v0 코드 구조

권장 구조:

```text
src/
  features/
    draft/
      contract.ts
      scoring.ts
      explanation.ts
      validation.ts
      index.ts
  data/
    loadStaticData.ts
scripts/
  validate-data.ts
  score-draft-fixtures.ts
data/
  normalized/
  manual/
  fixtures/
```

### module boundary

추천 엔진은 React/Next.js에 의존하지 않아야 한다.

```text
data JSON
  → loadStaticData
  → validateData
  → rankDraftOptions
  → DraftRecommendation[]
  → UI render
```

ASCII flow:

```text
               ┌─────────────────────┐
               │ data/normalized/*.json│
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │ data/manual/*.json   │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │ validate-data        │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
Draft input ──▶│ draft scoring engine │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │ DraftRecommendation │
               └──────────┬──────────┘
                          │
               ┌──────────▼──────────┐
               │ /draft UI            │
               └─────────────────────┘
```

## Package Manager

현재 로컬 상태:

- `node`는 동작한다.
- `npm`은 깨져 있다.
- `yarn test`는 동작한다.

권장:

- 당장은 `yarn`을 기준으로 한다.
- README와 개발 문서에 `yarn test`를 기준 명령으로 명시한다.
- Next.js scaffold 전에 npm을 고칠지, yarn 기반으로 계속 갈지 결정한다.

## UI 시작 조건

다음 조건을 만족하면 `/draft` UI 구현을 시작해도 된다.

```text
- TypeScript scoring contract가 있다.
- scoring prototype이 TypeScript로 전환되어 있다.
- validate-data가 존재한다.
- yarn test가 validate-data와 score fixtures를 모두 실행한다.
- fixture가 10개 이상이다.
- fixture가 ranking, component, risk, return likelihood, nextPickDirection을 검증한다.
- missing data 정책이 구현되어 있다.
- brokenReasonTags/brokenReasonNote 도입 여부를 결정했다.
```

## 남은 의사결정

우선순위 순서:

1. TypeScript 전환 범위
   - scoring module만 먼저 전환
   - repo 전체 Next.js scaffold와 함께 전환

2. data validation 구현 방식
   - 직접 JS/TS 검증 함수
   - Zod 같은 schema library 사용

3. fixture matrix 범위
   - 최소 10개
   - 권장 15~20개

4. brokenReasonTags 도입
   - 설명용으로만 도입
   - scoring에도 일부 반영

5. package manager
   - yarn 유지
   - npm 복구 후 npm 기준

## 권장 다음 작업

추천 순서:

1. `contract.ts` 작성
2. `scoring.js`를 `scoring.ts`로 전환
3. `validate-data` 추가
4. fixture assertion 확장
5. fixture 10~15개로 확대
6. `brokenReasonTags`와 `brokenReasonNote`를 strategy profile에 추가
7. 그 다음 `/draft` UI 시작

이 순서를 지키면 UI는 실험용 화면이 아니라, 이미 계약과 검증을 가진 추천 엔진을 렌더링하는 화면이 된다.
