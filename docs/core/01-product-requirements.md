# 01 Product Requirements

이 문서는 Vision을 구현 가능한 제품 요구사항으로 변환한다. MVP 범위, 포함/제외 기능, 사용자에게 보여야 할 핵심 출력을 정의한다.

## 제품 범위

서비스는 다음 기능군으로 구성한다.

1. Draft Memory Coach
2. Strategy Knowledge Base
3. 카드 검색과 필터
4. 카드 상세 정보
5. 드래프트 트래킹
6. 한국어 전략 가이드
7. 텍스트 판정과 룰링
8. 통계와 메타 분석
9. BGA 스크린샷 인식
10. 사후 복기와 판세 분석

초기 MVP에서는 1~5와 일부 6~8을 먼저 구현한다. 카드 DB는 독립 제품이 아니라 드래프트 판단을 위한 기반 데이터로 취급한다.

## 1차 페르소나

### Primary

- 한국어 BGA 아그리콜라 유저
- 현재 목표는 ELO 300~400 이상으로 올라가기 위한 드래프트 판단 훈련
- 실전 중 카드 텍스트, 통계, 콤보, 역할 중복 여부를 빠르게 확인하고 싶음
- 깊은 설명을 읽을 의지가 있으며, 사후 학습용으로도 사용함

### Secondary

- ELO 100~250 입문~초중급 유저
- 카드가 왜 좋은지, 왜 위험한지, 왜 지금 손패와 맞지 않는지 이해하고 싶음
- 표준 설명과 전략 가이드가 필요함

## MVP 범위

### 포함

- Next.js 기반 웹앱
- 정적 JSON 기반 카드/통계/전략 프로필 데이터
- BGA Arena 4인 드래프트 기본 설정
- A~E 중 현재 BGA Arena에서 쓰이는 카드 풀 기준
- draft size 설정: 10-to-7, 9-to-7, 8-to-7 등
- 수동 카드 입력과 autocomplete
- 1~7픽 full visible pack 입력
- 시간 압박용 selected-only quick fallback
- 내가 고른 카드, 본 카드, 지나간 카드 기록
- 5~7픽에서 이전 pack 대비 사라진 카드 기록
- 현재 픽 추천 순위
- 추천 이유, 리스크, 돌아올 가능성, 다음 픽 방향 표시
- 역할 포화도, 역할 공백, role availability pressure 표시
- 사용자 설정: skill level, goal mode, explanation depth
- 카드 검색과 카드 상세
- 카드별 통계, 역할 태그, 전략 메모 표시
- 설명 깊이 설정: compact, standard, deep

### 제외

- 로그인
- 사용자별 장기 기록 저장
- 실시간 BGA 화면 자동 읽기
- 자동 플레이 또는 액션 추천
- 숨겨진 상대 손패 확정 추론
- 실물 카드 사진 인식
- 고급 AI 룰링 생성
- 전체 카드 mechanic 완전 구조화
- 전체 A~E 카드의 완전한 수동 전략 태깅

## 기능 요구사항

### Draft Memory Coach

사용자는 드래프트 중 현재 보이는 카드를 입력하고 추천을 받을 수 있어야 한다.

입력:

- 드래프트 설정
  - 플레이어 수: v0는 4인 고정
  - 카드 풀: v0는 BGA Arena active pool
  - draft size: 10-to-7, 9-to-7, 8-to-7
  - 카드 타입: 직업 또는 보조 설비
- 현재 pick number
- 현재 visible pack
- 내가 이미 고른 카드
- 내가 본 뒤 넘긴 카드
- 이전에 봤지만 이번에 사라진 카드
- skill level과 goal mode
- 설명 깊이

출력:

- 추천 순위
- 1순위 카드와 핵심 이유
- 카드별 점수와 주요 score component
- 리스크
- 돌아올 가능성
- 역할 중복 또는 역할 공백
- 강카드를 넘길 때의 passRegret
- 새 중심 플랜으로 바뀔 수 있는 경우의 after-pick plan shift
- 다음 픽에서 찾을 카드 역할

추천 정책:

- Pick 1~2는 broken card, premium card, open-ended plan anchor를 우선한다.
- Pick 3~4는 범용 강도, passRegret, 현재 손패의 부족 역할을 함께 본다.
- Pick 5~7은 먼저 현재 손패 기준 후보군을 만들고, 그 안에서 티어와 통계를 반영한다.
- 사라진 카드는 상대 플랜 확정이 아니라 role availability pressure로 사용한다.
- 모델 추천과 사용자 선택의 차이는 `model_user_disagreement`로 기록하고, 곧바로 모델 오류로 판단하지 않는다.

### 카드 검색

사용자는 카드명을 입력해 카드를 찾을 수 있어야 한다.

검색 대상:

- 영문 카드명
- 코보게 공식 한글명
- BGA 한글명
- alias
- normalized search term

검색 결과에는 최소한 다음 정보가 보여야 한다.

- 표시 이름
- 영문명
- 타입
- 티어
- WtdPWR
- ADP
- 핵심 전략 역할

### 카드 상세

카드 상세 화면은 실전 중 빠르게 확인할 수 있어야 한다.

필수 정보:

- 카드명
- 영문명
- 한글명
- 효과 요약 또는 허용된 범위의 효과 텍스트
- 비용
- 조건
- 덱
- 타입
- 플레이어 수 조건
- PWR
- WtdPWR
- ADP
- APR
- Plays
- 티어
- 전략 역할
- 해결하는 문제
- 추가로 요구하는 문제
- 중복되면 가치가 낮아지는 역할
- 관련 콤보
- 관련 가이드
- 룰링 또는 텍스트 판정 메모

### Strategy Knowledge Base

카드별 전략 프로필은 추천 엔진과 설명 엔진의 핵심 데이터다.

초기 수동 큐레이션 대상:

- broken card
- plan anchor
- strategy role
- solves
- supports
- partial solves
- increases need for
- saturation penalty
- saturation behavior
- synergy/conflict
- passRegret 판단 근거
- pivotPotential/conflictCost 판단 근거
- risk note
- next-pick guidance
- beginner/advanced explanation

초기에는 모든 카드를 완벽히 태깅하지 않는다. fixture에 필요한 카드, BGA Arena에서 자주 나오고 판단 영향이 큰 카드 50~100장, 전체 A~E 최소 태깅 순서로 확장한다.

## 비기능 요구사항

### 빠른 응답

드래프트 중 사용되므로 추천 계산은 입력 즉시 반응해야 한다.

초기에는 정적 JSON을 클라이언트에 로드하고 TypeScript 순수 함수로 추천을 계산한다.

### 설명 가능성

추천은 정답처럼 말하지 않고 근거 중심으로 표시한다.

예:

```text
현재 정보에서는 이 픽이 가장 유리합니다.
다만 곡식 공급이나 빵굽기 접근을 확보하지 못하면 가치가 크게 떨어집니다.
```

### 정확성

통계, 카드 텍스트, 룰링, 전략 메모는 출처와 업데이트 날짜를 저장한다.

카드 효과 해석과 전략 프로필은 confidence를 둔다.

```text
manual_verified
stat_inferred
text_inferred
unverified
```

### 확장성

신규 카드, 신규 통계, 신규 언어, 신규 Arena 카드 풀 snapshot이 추가되어도 Card 본체 구조를 크게 바꾸지 않아야 한다.

### 공정성

BGA에서 숨겨진 정보를 확정 추론하거나 자동 플레이를 돕는 기능은 제공하지 않는다.

서비스는 공개 정보 정리, 사용자가 직접 입력한 정보, 스크린샷에서 보이는 정보, 사후 학습 중심으로 동작한다.
