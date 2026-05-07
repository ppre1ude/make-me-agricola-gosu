# 04 Feature Specs

이 문서는 사용자가 만나는 핵심 기능의 행동 계약을 정의한다. Draft Memory Coach, 카드 검색, 카드 상세, 전략 가이드가 어떤 입력을 받고 어떤 판단 근거를 보여야 하는지 정한다.

## Draft Memory Coach

### 목표

BGA Arena 드래프트 중 현재 보이는 카드와 내가 이미 고른 카드를 바탕으로, 지금 집을 카드와 그 이유를 설명한다.

추천은 정답 선언이 아니라 판단 보조다. 특히 다음 상황을 설명할 수 있어야 한다.

- 초반에는 broken card, premium card, 열린 plan anchor를 우선한다.
- 이미 해결한 역할과 겹치는 카드는 가치가 내려간다.
- 강한 카드라도 현재 손패가 요구하는 다음 역할과 맞지 않으면 내려간다.
- ADP와 본 카드 기록을 바탕으로 돌아올 가능성을 추정한다.
- 돌아온 팩에서 사라진 카드의 티어와 역할을 요약한다.
- 다음 픽에서 찾아야 할 역할을 알려준다.

### 입력

- 드래프트 설정
  - playerCount: v0는 4인 고정
  - cardPoolProfileId: v0는 BGA Arena active pool
  - draftFormat: 10-to-7, 9-to-7, 8-to-7
  - draftCardType: occupation 또는 minor improvement
- pick number
- 현재 visible pack
- 내가 고른 카드
- 내가 본 뒤 넘긴 카드
- 이전에 본 pack과 돌아온 pack의 차이
- 설명 깊이

### 입력 UX

기본 입력은 full tracking mode다.

- 1~7픽 모두 full visible pack 입력을 지원한다.
- 현재 후보 카드와 선택 카드를 기록한다.
- 선택하지 않은 카드는 passed card로 기록한다.
- 5~7픽에서는 이전에 본 pack과 돌아온 pack의 차이를 계산한다.
- 사라진 카드는 특정 상대의 손패로 확정하지 않고, "돌아오지 않은 카드"로 기록한다.

빠른 입력 fallback도 둔다.

- 시간 압박이 크면 5~7픽에서 selected card만 입력할 수 있다.
- 이 경우 return likelihood, 사라진 카드 요약, role availability pressure의 정확도가 낮아진다고 표시한다.
- quick mode는 초보자/모바일/시간 부족 상황을 위한 보조 모드이며, 고수용 기본 흐름은 full tracking이다.

1~4픽 full tracking:

- 처음 보는 pack이므로 full visible pack 입력을 권장한다.
- 현재 후보 카드와 선택 카드를 기록한다.
- 선택하지 않은 카드는 passed card로 기록한다.

5~7픽 full tracking:

- 이미 본 카드가 돌아오는 구간으로 취급한다.
- 돌아온 full visible pack을 입력해 이전 pack 대비 사라진 카드를 계산한다.
- 사라진 카드의 tier, role, premium 여부를 요약한다.
- 추후 복기와 고도화 기능을 위해 원본 기록을 보존한다.

### 출력

- 1순위 추천 카드
- 대안 카드 2~3개
- 추천 이유
- 리스크
- 데이터/입력 경고
- 평가 신뢰도와 평가 방식
- 돌아올 가능성
- 후보군 분류
  - 티어/통계가 높은 카드
  - 현재 플랜에 맞는 카드
  - 낮은 지원 축을 보완하는 카드
  - 넘기기 아까운 범용 강카드
  - 리스크가 큰 카드
- 현재 손패 진단
  - 중심 플랜
  - 강한 축
  - 보조 가능한 축
  - 카드 기반 지원이 낮은 축
- 다음 픽 방향
- deep mode에서는 score component breakdown과 사라진 카드 요약

출력 계약 원칙:

- `candidateGroups`는 항상 배열이다.
- Rank 1 추천은 반드시 하나 이상의 `candidateGroups`를 가져야 한다.
- Phase 1에서 UI-highlighted recommendation은 rank 1을 뜻한다.
- `general_value_candidate`와 `fallback_filler_candidate`는 최상위 추천이 설명 없이 비는 일을 막는 fallback 후보군이다.
- `risks`는 전략적 tradeoff이고, `warnings`는 데이터/입력 상태 문제다.
- missing stat, missing strategy profile 같은 문제는 `warnings`와 `evaluationMeta`로 표시한다.
- `reasons`에는 추천 근거만 넣고, 엔진 한계나 데이터 누락 disclaimer는 넣지 않는다.

### 기본 화면 구조

현재 드래프트 풀과 내 손패 풀은 구역을 나눠 동시에 보여준다.

```text
현재 드래프트 풀
  - 추천 카드
  - 대안 카드
  - 후보군 분류
  - 티어/통계/플랜 적합/보완 여부

내 손패 풀
  - 중심 플랜
  - 강한 축
  - 카드 기반 지원이 낮은 축
  - 다음 픽에서 보면 좋은 역할
```

시각적 우선순위는 현재 드래프트 풀에 둔다. 드래프트 중 가장 급한 질문은 "지금 무엇을 집을 것인가"이기 때문이다. 다만 제품의 차별점은 내 손패 기준의 맥락화이므로, 손패 진단은 추천 근거로 항상 함께 보여준다.

### Draft pick band weighting

추천 가중치는 pick number에 따라 달라진다.

```text
Pick 1-2:
  broken card / premium card / open-ended anchor / statistics / ADP dominate
  user preference is weak; execution difficulty is shown as risk, not a main demotion

Pick 3-4:
  premium still matters
  plan fit, role collision, pass regret, and critical junction cards rise
  a support card beats a premium card only when it solves a real bottleneck

Pick 5-7:
  candidate set first, tier/stat second
  penalty avoidance, executable bonus points, low-support axes, and risk control rise
```

초기 구현에서는 아래처럼 draftPickBand를 나눈다. `phase`는 공식 round/harvest 절차에 쓰는 용어이므로 드래프트 추천 구간에는 쓰지 않는다.

```ts
type DraftPickBand = "early_anchor" | "middle_direction" | "late_completion";
```

### Draft pick band objective

추천의 "정답 기준"은 draftPickBand에 따라 달라진다.

Pick 1~2:

- broken card가 있으면 강하게 우선한다.
- broken card가 여러 장이면 유연성, follow-up 부담, 테이블 의존성, 통계 강도를 비교한다.
- 운영 난도는 추천을 뒤집는 이유보다 리스크/운영 설명에 가깝다.
- 개인 취향이나 익숙한 플랜은 약하게만 반영한다.

Pick 3~4:

- 범용 강카드는 여전히 강하게 본다.
- 보완 카드는 다음 조건을 만족할 때 범용 강카드를 이길 수 있다.
  - 현재 손패가 명확히 요구하는 role을 해결한다.
  - 그 role이 없으면 Pick 1~2 카드의 가치가 크게 떨어진다.
  - 같은 role을 나중에 확보하기 어렵다.
  - 보완 카드 자체가 너무 약하거나 조건부 폭탄이 아니다.
- "상대에게 주면 위험"이 아니라 "범용 강도/ADP/티어가 높아 넘기기 아깝다"로 설명한다.

Pick 5~7:

- 먼저 현재 손패 기준 후보군을 만든다.
- 감점 방지, 조건이 이미 충족된 보너스 점수, 생존 안정화, 플랜 마무리를 우선 후보로 본다.
- 후보군 안에서는 티어와 통계가 다시 강하게 작동한다.
- 드래프트가 모든 플랜을 완성해야 한다고 가정하지 않는다.

### Score components

고정 가중치 하나로 끝내지 않고 component를 분리한다.

```text
score =
  statStrength
+ brokenOrAnchorBonus
+ roleCoverage
+ synergy
+ returnUrgency
+ draftPickBandFit
+ passRegret
+ pivotPotential
+ confidence
- saturationPenalty
- riskPenalty
- conflictCost
```

각 항목:

- `statStrength`: WtdPWR, PWR, ADP, APR 등 통계 기반 기본 강도
- `brokenOrAnchorBonus`: broken card, plan anchor의 초반 가중치
- `roleCoverage`: 현재 손패가 아직 해결하지 못한 역할을 채우는 정도
- `synergy`: 이미 고른 카드와 직접/역할 기반으로 맞는 정도
- `returnUrgency`: 지금 안 집으면 돌아오기 어려운 정도
- `draftPickBandFit`: 현재 draftPickBand와 카드 timing window의 적합도
- `confidence`: 통계 표본과 전략 프로필 신뢰도
- `saturationPenalty`: 이미 해결한 역할과 중복되는 정도
- `riskPenalty`: 조건부 카드, 비용 압박, 낮은 play rate, 충돌 태그
- `passRegret`: 내 플랜과 완전히 맞지 않아도 범용 강도, 티어, ADP, 희소성, 플랜 재편 가능성 때문에 넘기기 아까운 정도. boolean이 아니라 0~10 수치형 component다.
- `pivotPotential`: 후보 카드가 새 중심 플랜을 만들 수 있는 정도
- `conflictCost`: 후보 카드가 기존 손패와 충돌하거나 이미 해결한 역할을 과하게 중복하는 비용

`passRegret`은 항상 scoring에 반영한다. 다만 draftPickBand별 weight가 다르다.

```text
Pick 1-2:
  매우 강함. premium/broken/open-ended anchor 평가와 많이 겹친다.

Pick 3-4:
  강함. 높은 passRegret 카드는 기존 플랜을 재편할 수 있다.

Pick 5-7:
  여전히 반영한다. 다만 실행 가능성, 감점 방지, 조건 충족된 점수 카드와 함께 평가한다.
```

높은 passRegret 카드는 "현재 플랜에 안 맞음"으로 끝내지 않는다. 이 카드가 새 중심 플랜이 될 수 있는지, 기존 손패와 충돌하는지, 필요한 follow-up이 얼마나 무거운지를 함께 본다.

### Role saturation

역할 포화도는 v0의 핵심 차별점이다.

예:

```text
밭일 감독이 field access와 곡식 종자 행동 강화를 해결했다면,
추가 밭갈기/농지 계열 카드는 기본값보다 낮게 평가한다.
단순 grain supply는 이미 해결된 축과 겹칠 수 있다.
대신 bake-bread access, food self-sufficiency, wood/fence support, animal coverage, 점수 전환의 가치가 오른다.
```

구현 원칙:

- `solves`가 채워진 역할은 coverage 점수를 낮춘다.
- `saturationPenaltyTo` 대상 역할 또는 카드에는 감점을 준다.
- `increasesNeedFor` 대상 역할은 다음 픽 방향과 추천 가점에 반영한다.
- broken card는 포화도 감점을 완전히 무시하지는 않되, 초반 draftPickBand에서는 더 강하게 버틴다.

role category별 포화 방식은 다르게 취급한다.

```text
hard_cap:
  농경 seed/field 계열처럼 1~2장 이후 가치가 빠르게 내려가는 역할

soft_cap:
  wood_supply처럼 여러 장이 좋지만 3~4장째부터 점차 가치가 내려가는 역할

stackable:
  점수 전환처럼 여러 장을 가질 수 있지만 실행 비용과 조건을 봐야 하는 역할

resource_convertible:
  clay/reed/wood처럼 소모처와 전환 플랜에 따라 가치가 달라지는 역할

condition_based:
  조건 충족 여부가 핵심인 보너스/콤보 역할
```

자원 역할은 자원별로 다르게 본다.

- `wood_supply`: 기본 가치는 높고 포화가 늦다. 다만 wood sink 없이 공급만 3~4장 이상 쌓이면 soft cap을 적용한다.
- `clay_supply`: 흙집, 설비 다수 설치, 주요 설비 접근과 연결되면 가치가 높다.
- `reed_supply`: 방/개조 이후에는 과잉 위험이 있으나 바구니 제작자류 전환 플랜이 있으면 가치가 오른다.

음식 역할은 반드시 세분화한다.

- `food_engine`: 가족을 먹여살릴 반복적/효율적 플랜을 제공한다. 초반 가치가 높다.
- `food_support`: 식량 1~2개 또는 일회성 완충이다. 도움이 되지만 food engine을 해결했다고 보지 않는다.
- `food_conversion`: 동물/자원/곡식/채소를 음식으로 바꾸는 통로다. 현재 손패의 생산 축과 맞아야 강하다.

음식 설명은 "food engine이 없어서 실패"가 아니라 "식량 플랜의 카드 기반 자립성이 낮다"로 표현한다. 아그리콜라는 카드 없이도 주요 설비, 행동 칸, 곡식/채소/동물 전환으로 음식 플랜을 만들 수 있기 때문이다.

### Return likelihood

돌아올 가능성은 ADP만으로 확정하지 않는다.

입력:

- ADP
- pick number
- draft format
- 현재 pack size
- 이미 본 카드와 passed card
- 이전 pack에서 사라진 카드
- role availability pressure
- 카드가 범용 강카드인지 전략 특화 카드인지
- 같은 pack 안의 더 강한 카드 존재 여부

출력 문구:

```text
거의 돌아오지 않음
돌아올 가능성 낮음
상황에 따라 돌아올 수 있음
돌아올 가능성 있음
데이터 부족으로 알 수 없음
```

절대 표현하지 않을 것:

```text
상대가 반드시 이 카드를 가져갔습니다.
2번 플레이어가 이 카드를 집었습니다.
상대는 농경 플랜입니다.
```

full tracking에서 사라진 카드 정보는 추천에 약하게 반영한다.

- 이전 pack에 있던 특정 role 카드가 모두 사라지면 해당 role의 availability pressure를 올린다.
- 같은 role 후보가 다시 보이면 returnUrgency와 nextPickDirection에 약하게 반영한다.
- deep mode에서는 "해당 역할 카드가 빠르게 사라짐"을 설명한다.
- action-space pressure는 note로만 표시하고 강한 scoring factor로 쓰지 않는다.

표현 예:

```text
이전에 보였던 밭/농경 지원 카드가 돌아오지 않았습니다.
남은 밭 접근 카드는 이후 확보가 어려울 수 있어 우선도가 약간 올라갑니다.
```

### 설명 깊이

```ts
type ExplanationDepth = "compact" | "standard" | "deep";
```

#### Compact

실전 중 빠르게 보는 한 줄 요약.

```text
밭일 감독 추천: 밭 접근을 해결하고 곡식 종자 칸을 강화하는 plan anchor입니다.
```

#### Standard

기본 설명.

섹션:

- 왜 1순위인가
- 대안 카드 2~3개
- 주요 리스크
- 다음 픽에서 볼 것

#### Deep

학습과 사후 복기용 설명.

추가 섹션:

- score component
- 후보군 분류
- 현재 손패 진단
- 역할 커버리지
- 포화도 효과
- 돌아올 가능성
- 사라진 카드와 role availability 요약
- 콤보 후보
- 운영 시퀀스
- underlying principle

예:

```text
현재 정보에서는 이 픽이 가장 유리합니다.
다만 식량 플랜의 카드 기반 자립성이 낮아, 주요 설비나 행동 칸을 통한 음식 전환을 확보해야 합니다.
```

### 숫자 표시 정책

내부 component는 숫자지만, 기본 UI는 숫자를 확률처럼 보여주지 않는다.

Standard:

- 넘기기 아까움: 높음/중간/낮음
- 돌아올 가능성: 낮음/상황에 따라/있음/알 수 없음
- 플랜 적합: 높음/중간/낮음
- 리스크: 짧은 문장

Deep/debug:

- `statStrength`
- `brokenOrAnchor`
- `roleCoverage`
- `synergy`
- `passRegret`
- `pivotPotential`
- `roleAvailabilityPressure`
- `saturationPenalty`
- `riskPenalty`
- `conflictCost`

component 숫자는 승률 확률이 아니다. 같은 pick 안에서 카드 간 비교와 설명을 위한 내부 평가값이다.

### After-Pick Plan Shift

기본 화면은 현재 손패 진단을 보여준다. 단, Pick 2~4에서 추천 카드가 broken, plan anchor, high passRegret이면 가벼운 after-pick plan shift를 표시할 수 있다.

v0에서는 베이즈 모델이나 확률 그래프를 쓰지 않는다.

```text
현재 hand profile 계산
후보 카드 1장을 임시 추가
hand profile을 다시 계산
차이를 요약
```

표시 조건:

- pick 2~4
- 후보 카드가 broken, plan anchor, high passRegret 중 하나
- 기존 손패와 conflictCost가 낮거나 중간 이하
- 새 nextPickDirection이 실제로 바뀜

표현 예:

```text
이 카드를 집으면 기존 농경 중심 손패에 목축/울타리 pivot 후보가 생깁니다.
다음 픽에서는 fence_support 또는 animal_housing을 보면 좋습니다.
```

변화가 약하면 표시하지 않는다.

### User Settings

v0는 사용자가 직접 설명 수준을 설정할 수 있게 한다.

```ts
type SkillLevel = "beginner" | "intermediate" | "advanced";
```

정책:

- `beginner`: 용어를 풀어서 설명하고 리스크와 운영 순서를 더 크게 표시한다.
- `intermediate`: 추천, 대안, 리스크, 다음 픽 방향을 균형 있게 보여준다.
- `advanced`: 후보군 분류, component breakdown, tracking signal 접근을 쉽게 한다.

추천 순위를 beginner라서 안전픽 위주로 강하게 바꾸지는 않는다.

`goalMode`, `DraftCoachMode`, `StudyMode`는 v0에서 만들지 않는다. 제품 기능 목적은 `FeatureContext`가 결정하고, `skillLevel`은 같은 기능 안에서 설명 밀도와 용어 수준만 조정한다.

### Feedback Loop

모델 추천과 사용자 선택이 다르면 `model_user_disagreement`로 기록할 수 있어야 한다. disagreement는 모델 오류를 뜻하지 않는다.

초기 제품에서는 피드백 UI를 크게 만들지 않는다. 사후 복기에서 추천과 실제 선택의 차이를 보고, 개발자용 데이터로 fixture 후보를 만들 수 있게 한다.

초기 저장 방식:

- local JSON export
- localStorage
- manual fixture conversion

서버가 붙은 뒤:

- `feedback_events`
- `model_disagreements`
- `fixture_candidates`

## 카드 검색

### 목표

사용자가 한글명 또는 영문명으로 빠르게 카드를 찾는다.

### 입력

- 검색어
- 타입 필터
- 덱 필터
- Arena active 필터
- 전략 역할 필터
- 태그 필터
- 티어 필터
- 통계 범위 필터

### 출력

카드 리스트 아이템:

- 표시 이름
- 영문명
- 타입
- 티어
- WtdPWR
- ADP
- APR
- 핵심 전략 역할 3~5개
- strategy profile confidence

### 검색 로직

검색 대상:

- CardTranslation.name
- CardTranslation.officialName
- CardTranslation.bgaName
- CardTranslation.aliases
- 영문명 fallback
- normalized terms

정렬 기본값:

1. exact match
2. startsWith match
3. alias match
4. fuzzy match
5. Arena active 우선
6. 통계 순위 보정

## 카드 상세

### 목표

실전 중 카드 하나의 강도, 효과, 콤보, 판정, 드래프트 역할을 빠르게 확인한다.

### 섹션

#### Header

- 카드명
- 영문명
- 타입
- 덱
- Arena 상태
- 티어
- Rank

#### Card Body

- 카드 이미지 또는 텍스트 렌더링
- 효과 요약
- 비용
- 조건
- 승점
- 플레이어 수 조건

#### Stats

- PWR
- WtdPWR
- ADP
- APR
- Deals
- Drafted
- Plays
- W-Hand
- W-Play
- Elo/Play

#### Strategy Profile

- 전략 역할
- broken / plan anchor 여부
- 해결하는 문제
- 추가로 요구하는 문제
- 중복되면 가치가 낮아지는 역할
- 시너지 카드
- 충돌 카드
- 리스크 태그
- 운영 시퀀스
- 다음 픽 방향

#### Interpretation

통계를 사람이 이해할 수 있는 문장으로 변환한다.

예:

```text
ADP가 낮아 초반에 자주 집히는 카드입니다.
APR이 높아 실제 플레이는 중후반에 이루어지는 편입니다.
Drafted 대비 Plays가 낮아 조건부 카드일 가능성이 있습니다.
```

#### Combos

- 직접 연결된 콤보
- 같은 전략축 기반 추천 카드
- 해결/요구 역할 기반 추천 카드

#### CardRuling

- 발동 타이밍
- 텍스트 주의점
- 예외 상황
- 공식 룰/컴펜디엄/BGA/커뮤니티 출처 구분

## 태그 기반 콤보

초기에는 수동 Combo 데이터와 태그 기반 추천을 섞는다.

콤보 종류:

- 직접 콤보
- 같은 전략축 콤보
- 자원 생성 + 소비 콤보
- 조건 충족 콤보
- 점수 보너스 콤보
- 역할 보완 콤보

예:

```text
곡식 생산 카드 + 빵굽기 카드
방 비용 절감 카드 + 가족성장 카드
울타리 할인 카드 + 동물 증식 카드
직업 다수 조건 카드 + 직업을 싸게 내는 카드
```

## 전략 가이드

### 목표

초보자는 학습하고, 중급자는 실전 판단을 정리하고, 고급자는 메타 분석으로 사고를 점검한다.

### 작성 방식

MDX로 작성한다.

가이드 metadata:

- slug
- title
- description
- level
- tagIds
- relatedCardIds
- updatedAt

### 초기 글 후보

1. 드래프트 기본 원칙: broken card에서 역할 보완으로 전환하기
2. 카드 텍스트 타이밍 읽는 법
3. 가족 늘리기 경쟁
4. 방 늘리기 경쟁
5. 화로 경쟁
6. 울타리와 동물 운영
7. 식량 엔진 만들기
8. 2방 2가족으로 버티는 조건
