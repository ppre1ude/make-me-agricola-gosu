# 05 Feature Specs

## 카드 검색

### 목표

사용자가 한글명 또는 영문명으로 빠르게 카드를 찾는다.

### 입력

- 검색어
- 타입 필터
- 덱 필터
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
- 핵심 태그 3~5개

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
5. 통계 순위 보정

## 카드 상세

### 목표

실전 중 카드 하나의 강도, 효과, 콤보, 판정을 빠르게 확인한다.

### 섹션

#### Header

- 카드명
- 영문명
- 타입
- 덱
- 티어
- Rank

#### Card Body

- 카드 이미지 또는 텍스트 렌더링
- 효과 텍스트
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
- 같은 태그 기반 추천 카드
- 전략축별 관련 카드

#### Rulings

- 발동 타이밍
- 텍스트 주의점
- 예외 상황
- 관련 컴펜디엄 링크

## 드래프트 추천

### 입력

- 후보 카드 목록
- 현재 내 손패
- 지나간 카드 목록
- 게임 조건
  - 플레이어 수
  - 카드 풀
  - BGA 여부
  - 현재 드래프트 pick number

### 출력

- 추천 순위
- 추천 점수
- 추천 이유
- 리스크
- 돌아올 가능성
- 내 손패 태그 분포

### 초기 추천 점수

```text
score =
0.45 * normalized(wtdPwr)
+ 0.20 * normalized(pwr)
+ 0.15 * synergyScore
+ 0.10 * adpUrgency
+ 0.05 * phaseFit
+ 0.05 * confidenceScore
- riskPenalty
```

각 항목:

- `normalized(wtdPwr)`: 현재 통계 snapshot 기준 정규화
- `normalized(pwr)`: 카드가 손에 있었을 때의 성과
- `synergyScore`: 내 손패와 태그/콤보가 맞는 정도
- `adpUrgency`: 평균적으로 빨리 집히는 카드면 가점
- `phaseFit`: 현재 드래프트 단계와 초반/중반/후반 역할 적합도
- `confidenceScore`: Deals, Drafted, Plays가 충분한지
- `riskPenalty`: 조건부 카드, 낮은 play rate, 충돌 태그

### 돌아올 가능성

ADP를 기반으로 단순 추정한다.

예:

```text
ADP <= 2.0: 거의 돌아오지 않음
ADP <= 3.5: 돌아올 가능성 낮음
ADP <= 5.0: 상황에 따라 돌아올 수 있음
ADP > 5.0: 돌아올 가능성 있음
```

## 태그 기반 콤보

초기에는 수동 Combo 데이터와 태그 기반 추천을 섞는다.

콤보 종류:

- 직접 콤보
- 같은 전략축 콤보
- 자원 생성 + 소비 콤보
- 조건 충족 콤보
- 점수 보너스 콤보

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

1. 카드 텍스트 타이밍 읽는 법
2. 가족 늘리기 경쟁
3. 방 늘리기 경쟁
4. 화로 경쟁
5. 울타리와 동물 운영
6. 식량 엔진 만들기
7. 드래프트 기본 원칙

