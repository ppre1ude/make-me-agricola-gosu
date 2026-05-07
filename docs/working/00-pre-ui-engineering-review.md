# 00 Pre-UI Engineering Review

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

- [02 Data Model](../core/02-data-model.md)
- [03 Feature Specs](../core/03-feature-specs.md)
- [04 Roadmap](../core/04-roadmap.md)

### 코드 아키텍처

draft scoring prototype은 TypeScript 기반 도메인 모듈로 전환되었다.

현재 상태:

- `src/features/draft/contract.ts`: UI, 스크립트, 추천 엔진이 공유하는 타입 계약
- `src/features/draft/scoring.ts`: React/Next.js에 의존하지 않는 순수 추천 로직
- `src/features/draft/validation.ts`: JSON 데이터와 fixture의 런타임 검증
- `scripts/validate-data.ts`: 데이터 검증 CLI
- `scripts/score-draft-fixtures.ts`: fixture 기반 추천 검증 CLI

아직 Next.js/TypeScript scaffold는 없다. 이는 의도적이다. UI보다 먼저 추천 엔진의 계약과 데이터 검증을 닫는 것이 현재 단계의 목표다.

## 핵심 리뷰 결론

### 1. TypeScript 전환은 완료

JavaScript scoring prototype은 TypeScript로 전환되었다. 이 결정으로 다음 위험을 먼저 줄였다.

- UI가 기대하는 입력/출력 타입이 암묵적이다.
- 데이터 누락 시 fallback 정책이 코드 내부에 묻힌다.
- fixture가 늘어날수록 refactor 비용이 커진다.
- 카드 50~100장 이후에는 잘못된 데이터 참조를 추적하기 어렵다.

현재 파일:

```text
src/features/draft/contract.ts
src/features/draft/scoring.ts
src/features/draft/validation.ts
scripts/validate-data.ts
scripts/score-draft-fixtures.ts
```

남은 일은 TypeScript 전환 자체가 아니라 fixture matrix와 데이터 검증 범위를 넓히는 것이다.

## Grill-Me 결정 요약

구현 전 인터뷰에서 다음 결정을 추가로 닫았다.

1. 추천의 정답 기준은 pick phase별로 다르다.
   - Pick 1~2: broken card, premium card, 열린 plan anchor를 강하게 본다.
   - Pick 3~4: 범용 강카드가 여전히 중요하지만, 치명적 결절점 보완 카드는 강카드를 이길 수 있다.
   - Pick 5~7: 감점 방지, 조건이 충족된 보너스 점수, 생존 안정화, 플랜 마무리 후보군을 먼저 만들고 그 안에서 티어/통계를 본다.

2. broken card끼리 비교할 때는 유연성, follow-up 부담, 테이블 의존성, 통계 강도를 본다.

3. `premiumDenial` 또는 `passRegret` 개념을 둔다.
   - 의미는 "상대 플랜 추론"이 아니라 "범용 강도/ADP/티어가 높아 넘기기 아까운 카드"다.
   - 추천 문구는 "상대에게 주면 위험"보다 "넘기기 아까운 범용 강카드"로 표현한다.

4. 부족 역할은 "없음/미충족"으로 단정하지 않는다.
   - 카드 기반 자립성이 낮은 축
   - 외부 행동 의존도가 높은 축
   - 다음 픽에서 보면 좋은 역할
   로 표현한다.

5. 기본 UX는 현재 드래프트 풀과 내 손패 풀을 동시에 보여주는 균형형이다.
   - 시각적 우선순위는 현재 드래프트 풀에 둔다.
   - 손패 풀은 추천의 맥락과 근거를 제공한다.

6. 1~7픽 모두 full visible pack 입력을 지원한다.
   - 고수용 기본 흐름은 full tracking이다.
   - selected-only 입력은 quick mode fallback이다.

7. 5~7픽에서 돌아온 pack의 missing cards는 v0에서도 기록하고 약하게 활용한다.
   - 사라진 카드의 tier/role 요약
   - role availability pressure
   - return likelihood 보정
   - deep explanation
   에 사용한다.
   - 특정 상대 플랜이나 특정 상대의 행동은 확정하지 않는다.

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

현재는 `contract.ts`, `scoring.ts`, `validation.ts`, `index.ts`가 존재한다.

### DraftScoringInput

UI가 추천 엔진에 넘기는 입력이다.

```ts
type DraftScoringInput = {
  playerCount: number;
  draftCardType: DraftCardType;
  pickNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  offeredCardIds: string[];
  previousPackCardIds?: string[];
  missingFromPreviousPack?: string[];
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
  premiumDenial?: number;
  roleAvailabilityPressure?: number;
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

현재는 `scripts/validate-data.ts`로 구현되어 있다.

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
5. Field Watchman 이후 bake access/food self-sufficiency/animal-fence coverage 가점
6. low ADP card marked unlikely to return
7. high ADP card marked likely to return
8. conditional card gets risk penalty
9. missing stat still ranks but returnLikelihood unknown
10. missing strategy profile gets low confidence
11. late pick prefers hole filling over raw power
12. conflict card downranked
13. food_engine과 food_support를 구분한다
14. card with next-pick guidance emits nextPickDirection
15. broken card resists but does not fully ignore saturation
16. Pick 3~4 premiumDenial/passRegret can beat weak support
17. Pick 5~7 candidate set first, tier/stat second
18. wood_supply soft cap applies only after enough supply or without sink
19. full tracking detects missing field cards and raises role availability pressure weakly
20. missing cards produce role/tier summary without opponent-plan certainty

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
  ],
  "candidateGroupIncludes": [
    { "cardId": "occ-field-watchman", "value": "premium" }
  ],
  "trackingSignalIncludes": [
    { "role": "field_engine", "value": "availability_pressure" }
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

role-level saturation은 단순 개수 제한이 아니라 behavior를 가진다.

```ts
type SaturationBehavior =
  | "hard_cap"
  | "soft_cap"
  | "stackable"
  | "resource_convertible"
  | "condition_based";
```

초기 구현 권장:

- `hard_cap`: field/seed 계열. 1~2장 이후 강하게 감점한다.
- `soft_cap`: wood supply 계열. 2~3장까지는 높게 보되, wood sink가 없으면 후반 감점한다.
- `stackable`: 점수 전환 계열. 중복 자체보다 실행 가능성과 비용을 본다.
- `condition_based`: 조건부 보너스/콤보 계열. 조건 충족 여부가 핵심이다.

음식 역할은 반드시 분리한다.

- `food_engine`: 단일 또는 chain action으로 가족 먹여살리기 플랜을 실질적으로 만든다.
- `food_support`: 식량 1~2개 보충이나 약한 완충이다. food engine 해결로 보지 않는다.
- `food_conversion`: 동물/자원/곡식/채소를 음식으로 바꾸는 통로다.

표현 원칙:

```text
나쁨: 음식 플랜이 없습니다.
좋음: 식량 플랜의 카드 기반 자립성이 낮아, 주요 설비나 행동 칸 의존도가 높은 상태입니다.
```

### full tracking signal

5~7픽에서 돌아온 pack은 중요한 정보다.

예:

```text
1픽에서 본 field/plow 카드 2장이 5픽에 모두 사라졌다.
```

이때 v0는 다음까지 한다.

- 사라진 카드 기록
- 사라진 카드의 tier/role 요약
- 해당 role의 availability pressure 약한 상승
- 같은 role 후보가 보이면 returnUrgency 또는 nextPickDirection에 약한 반영
- deep explanation에서 "해당 역할 카드가 빠르게 사라짐" 표시

v0에서 하지 않는 것:

- 특정 상대 플랜 확정
- 특정 상대가 특정 카드를 집었다는 표현
- 특정 상대의 다음 행동 예측

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
- TypeScript와 Node 타입은 `yarn` devDependency로 설치되어 있다.
- Node 24의 TypeScript 실행 지원을 사용해 `.ts` 스크립트를 직접 실행한다.

권장:

- 당장은 `yarn`을 기준으로 한다.
- README와 개발 문서에 `yarn test`를 기준 명령으로 명시한다.
- Next.js scaffold 전에 npm을 고칠지, yarn 기반으로 계속 갈지 결정한다.

## UI 시작 조건

다음 조건을 만족하면 `/draft` UI 구현을 시작해도 된다.

```text
- TypeScript scoring contract가 있다. 완료
- scoring prototype이 TypeScript로 전환되어 있다. 완료
- validate-data가 존재한다. 완료
- yarn test가 validate-data와 score fixtures를 모두 실행한다.
- fixture가 10개 이상이다.
- fixture가 ranking, component, risk, return likelihood, nextPickDirection을 검증한다.
- missing data 정책이 구현되어 있다.
- brokenReasonTags/brokenReasonNote 도입 여부를 결정했다. 완료: 설명/분류 우선, 강한 scoring modifier 아님
- full tracking mode와 quick mode 정책이 문서화되어 있다. 완료
- role saturation behavior와 food role 분리가 fixture에 반영되어 있다.
- table pressure/role availability pressure fixture가 최소 1~2개 있다.
```

## 남은 의사결정

우선순위 순서:

1. fixture matrix 범위
   - 최소 10개
   - 권장 15~20개

2. role saturation behavior 구현 범위
   - hard_cap / soft_cap / stackable 우선
   - resource_convertible / condition_based는 설명 중심으로 시작

3. full tracking signal 구현 범위
   - missing cards 기록
   - role/tier 요약
   - role availability pressure 약한 반영

4. data validation 확장 범위
   - 직접 JS/TS 검증 함수
   - Zod 같은 schema library 사용

5. package manager
   - yarn 유지
   - npm 복구 후 npm 기준

## 권장 다음 작업

추천 순서:

1. fixture assertion 확장
2. role saturation behavior를 `strategy-roles.json`에 추가
3. `food_engine`, `food_support`, `food_conversion`을 분리
4. full tracking signal 타입과 계산 함수 추가
5. fixture 10~15개로 확대
6. missing data 정책을 fixture로 고정
7. `brokenReasonTags`와 `brokenReasonNote`를 strategy profile에 추가
8. 그 다음 `/draft` UI 시작

이 순서를 지키면 UI는 실험용 화면이 아니라, 이미 계약과 검증을 가진 추천 엔진을 렌더링하는 화면이 된다.
