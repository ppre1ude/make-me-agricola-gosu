# 02 Information Architecture

## 사이트 맵

```text
/
/draft
/draft/new
/draft/[sessionId]
/cards
/cards/[cardId]
/guides
/guides/[slug]
/stats
/tags/[tagId]
/scan
/sources
/about
```

## 주요 화면

### 홈

홈은 마케팅 랜딩보다 앱 시작점에 가깝게 만든다. 첫 진입은 카드 DB가 아니라 드래프트 코치로 이어져야 한다.

필수 구성:

- 현재 드래프트 시작 버튼
- 카드 검색창
- 최근 업데이트된 카드 풀/통계 snapshot
- 빠른 진입: 드래프트 코치, 카드 검색, 전략 가이드
- 상위 티어 카드 일부보다 "오늘 태깅된 전략 역할"을 더 우선 표시

### 드래프트 시작

새 드래프트 세션을 만든다.

입력:

- 게임 환경: BGA Arena 4인
- 카드 풀: Arena active pool snapshot
- draft size: 10-to-7, 9-to-7, 8-to-7
- 카드 타입: 직업, 보조 설비
- 설명 깊이: compact, standard, deep

v0 기본값:

```text
playerCount: 4
cardPool: bga-arena-active
draftSize: 10-to-7
explanationDepth: deep
```

### 드래프트 코치

드래프트 중 빠르게 사용하는 작업 화면이다.

레이아웃:

```text
상단: pick number, draft size, 입력 모드, 설명 깊이
좌측: 현재 visible pack 입력
중앙: 추천 순위와 카드별 근거
우측: 내 픽, 역할 커버리지, 부족한 전략축
하단: 본 카드/넘긴 카드/돌아올 가능성
```

입력 방식:

- 카드명 직접 입력
- autocomplete
- clipboard paste
- 추후 OCR 결과 import

첫 4픽:

- 현재 보이는 full pack을 입력한다.
- 선택 카드와 passed card를 모두 기록한다.

마지막 3픽:

- 이미 본 카드가 돌아오는 구간으로 취급한다.
- 기본적으로 내가 고른 카드만 빠르게 기록한다.
- 필요하면 현재 visible pack을 수정 입력할 수 있다.

### 카드 목록

카드 탐색과 self-tagging 검수 화면이다.

구성:

- 상단 검색창
- 필터
- 카드 리스트
- 빠른 정렬
- strategy profile completeness 표시

필터:

- 타입: 직업, 보조 설비, 주요 설비
- 덱
- Arena active 여부
- 티어
- 전략 역할
- 리스크 태그
- 플레이어 수 조건
- 비용
- 조건
- APR 구간
- ADP 구간
- 통계 신뢰도
- 수동 태깅 상태

정렬:

- 이름
- Rank
- WtdPWR
- PWR
- ADP
- APR
- Plays
- 티어
- strategy profile confidence

### 카드 상세

실전 중 한눈에 확인하는 화면이다.

레이아웃:

```text
상단: 카드명, 타입, 티어, 핵심 통계
좌측: 카드 텍스트 렌더링 또는 요약
중앙: 효과, 비용, 조건, 전략 역할
우측: 통계, 추천 콤보, 관련 가이드, 룰링
하단: 전략 프로필, 출처, 변경 이력, 관련 카드
```

카드 상세는 다음 질문에 답해야 한다.

- 이 카드는 왜 강한가?
- 어떤 문제를 해결하는가?
- 이 카드를 집으면 다음에 무엇을 찾아야 하는가?
- 이미 해결된 역할과 중복되면 왜 가치가 낮아지는가?
- 어떤 손패에서는 위험한가?

### 전략 가이드

한국어 학습 콘텐츠다.

구성:

- 입문
- 드래프트
- 카드 텍스트 판정
- 경쟁 포인트
- 전략축
- BGA 실전 팁

각 글에는 관련 카드, 관련 태그, 관련 통계를 연결한다.

### 통계 페이지

통계를 탐색하고 추천 엔진의 근거를 확인한다.

보기:

- 전체 랭킹
- 저평가 카드
- 과대평가 카드
- 초반 엔진 카드
- 후반 점수 카드
- 조건부 위험 카드
- Elo/Play 특이 카드
- ADP 기반 return likelihood 참고표

분석 예:

```text
PWR 높고 ADP 낮음 = 저평가 가능성
ADP 높고 PWR 낮음 = 과대평가 가능성
Drafted 높고 Plays 낮음 = 조건부 카드
APR 낮고 PWR 높음 = 초반 엔진 후보
APR 높고 WtdPWR 높음 = 후반 점수 후보
```

### 스캔

초기에는 실험 기능으로 둔다.

흐름:

```text
스크린샷 업로드
→ 카드 영역 후보 crop
→ OCR 또는 vision model로 카드명 후보 추출
→ DB fuzzy match
→ 사용자가 결과 수정
→ 드래프트 코치로 전달
```
