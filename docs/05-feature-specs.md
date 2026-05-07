# 05 Feature Specs

## Draft Memory Coach

### 목표

BGA Arena 드래프트 중 현재 보이는 카드와 내가 이미 고른 카드를 바탕으로, 지금 집을 카드와 그 이유를 설명한다.

추천은 정답 선언이 아니라 판단 보조다. 특히 다음 상황을 설명할 수 있어야 한다.

- 초반에는 broken card와 plan anchor를 우선한다.
- 이미 해결한 역할과 겹치는 카드는 가치가 내려간다.
- 강한 카드라도 현재 손패가 요구하는 다음 역할과 맞지 않으면 내려간다.
- ADP와 본 카드 기록을 바탕으로 돌아올 가능성을 추정한다.
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
- 설명 깊이

### 입력 UX

1~4픽:

- full visible pack 입력을 기본으로 한다.
- 현재 후보 카드와 선택 카드를 기록한다.
- 선택하지 않은 카드는 passed card로 기록한다.

5~7픽:

- 이미 본 카드가 돌아오는 구간으로 취급한다.
- 기본적으로 내가 고른 카드만 입력해도 된다.
- 예측과 실제 후보가 다르면 full pack을 수정 입력할 수 있다.

### 출력

- 추천 순위
- 추천 점수
- 추천 이유
- 리스크
- 돌아올 가능성
- 현재 손패 역할 분포
- 중복된 역할과 부족한 역할
- 다음 픽 방향

### Pick phase weighting

추천 가중치는 pick number에 따라 달라진다.

```text
Pick 1-2:
  broken card / plan anchor / statistics / ADP dominate

Pick 3-4:
  role coverage / combos / cost pressure / saturation / food plan rise

Pick 5-7:
  hole filling / condition enablers / safe points / return likelihood / risk control dominate
```

초기 구현에서는 아래처럼 phase를 나눈다.

```ts
type DraftPickPhase = "early_anchor" | "middle_direction" | "late_completion";
```

### Score components

고정 가중치 하나로 끝내지 않고 component를 분리한다.

```text
score =
  statStrength
+ brokenOrAnchorBonus
+ roleCoverage
+ synergy
+ returnUrgency
+ phaseFit
+ confidence
- saturationPenalty
- riskPenalty
```

각 항목:

- `statStrength`: WtdPWR, PWR, ADP, APR 등 통계 기반 기본 강도
- `brokenOrAnchorBonus`: broken card, plan anchor의 초반 가중치
- `roleCoverage`: 현재 손패가 아직 해결하지 못한 역할을 채우는 정도
- `synergy`: 이미 고른 카드와 직접/역할 기반으로 맞는 정도
- `returnUrgency`: 지금 안 집으면 돌아오기 어려운 정도
- `phaseFit`: 현재 pick phase와 카드 timing window의 적합도
- `confidence`: 통계 표본과 전략 프로필 신뢰도
- `saturationPenalty`: 이미 해결한 역할과 중복되는 정도
- `riskPenalty`: 조건부 카드, 비용 압박, 낮은 play rate, 충돌 태그

### Role saturation

역할 포화도는 v0의 핵심 차별점이다.

예:

```text
밭일 감독이 field access를 해결했다면,
추가 밭갈기/농지 계열 카드는 기본값보다 낮게 평가한다.
대신 grain supply, bake-bread access, food stability, wood/fence support의 가치가 오른다.
```

구현 원칙:

- `solves`가 채워진 역할은 coverage 점수를 낮춘다.
- `saturationPenaltyTo` 대상 역할 또는 카드에는 감점을 준다.
- `increasesNeedFor` 대상 역할은 다음 픽 방향과 추천 가점에 반영한다.
- broken card는 포화도 감점을 완전히 무시하지는 않되, 초반 phase에서는 더 강하게 버틴다.

### Return likelihood

돌아올 가능성은 ADP만으로 확정하지 않는다.

입력:

- ADP
- pick number
- draft format
- 현재 pack size
- 이미 본 카드와 passed card
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
- 주요 리스크
- 다음 픽에서 볼 것

#### Deep

학습과 사후 복기용 설명.

추가 섹션:

- score component
- 역할 커버리지
- 포화도 효과
- 돌아올 가능성
- 콤보 후보
- 운영 시퀀스
- underlying principle

예:

```text
현재 정보에서는 이 픽이 가장 유리합니다.
다만 곡식 공급이나 빵굽기 접근을 확보하지 못하면 가치가 크게 떨어집니다.
```

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

#### Rulings

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
