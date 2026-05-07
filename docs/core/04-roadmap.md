# 04 Roadmap

이 문서는 구현 순서와 단계별 성공 기준을 정의한다. 세부 작업 문서는 바뀔 수 있지만, 큰 실행 순서는 이 문서를 기준으로 조정한다.

## 혼자 구현하는 순서

로드맵의 기준은 다음이다.

```text
Product flow: Draft Memory Coach
Data-building flow: Strategy Knowledge Base
```

따라서 카드 DB UI를 먼저 완성하지 않는다. 먼저 추천 엔진이 raw tier list보다 나은 판단을 하는지 fixture로 검증한다.

### Phase 0: 프로젝트 기반

목표:

- Next.js 프로젝트 생성
- TypeScript, ESLint, Tailwind 설정
- docs 유지
- data 디렉터리 생성
- 추천 엔진을 순수 TypeScript 함수로 둘 위치 확정

산출물:

```text
Next.js 앱 실행
기본 레이아웃
data 디렉터리 구조
draft scoring module skeleton
```

### Phase 1: 데이터 스키마와 seed

목표:

- canonical card id 규칙 확정
- Card, CardTranslation, CardStatRow 타입 작성
- StrategyRole, CardStrategyProfile 타입 작성
- DraftSession, DraftPick 타입 작성
- BGA Arena card pool profile 형식 작성
- seed JSON 최소 샘플 생성

산출물:

```text
data/normalized/cards.json
data/normalized/translations.ko-KR.json
data/normalized/stats.lumin-s.json
data/normalized/strategy-roles.json
data/normalized/card-pool.bga-arena.2026-xx.json
data/manual/card-strategy-profiles.json
```

우선순위:

1. BGA Arena active card pool snapshot
2. Lumin_S 또는 Agricola Norge 계열 통계 import
3. 웅이님 엑셀 한국어명/효과/티어 mapping
4. card-id-map 수동 보정
5. strategy profile 초안 50~100장

### Phase 2: 비UI 드래프트 추천 프로토타입

목표:

- 추천 점수 component 구현
- pick phase weighting 구현
- role coverage와 saturation penalty 구현
- return likelihood 구현
- explanation depth별 문장 생성
- fixture 기반 검증

산출물:

```text
src/features/draft/scoring.ts
src/features/draft/explain.ts
src/features/draft/fixtures/*.json
scripts/score-draft-fixture.ts
```

성공 기준:

- strong card라도 이미 해결된 역할과 겹치면 내려간다.
- broken/plan anchor는 초반에 충분히 우선된다.
- 3~4픽부터 콤보와 역할 보완이 점수에 반영된다.
- 추천 결과가 단순 WtdPWR 정렬과 다른 이유를 설명한다.

### Phase 3: Draft Memory Coach UI

목표:

- 새 드래프트 세션 생성
- 1~4픽 full visible pack 입력
- 5~7픽 selected card 중심 입력
- 추천 순위와 설명 표시
- 내 픽/본 카드/넘긴 카드 기록 표시
- 역할 커버리지와 다음 픽 방향 표시

산출물:

```text
/draft
/draft/new
/draft/[sessionId]
```

필수 기능:

- autocomplete
- card chip 입력
- pick number navigation
- explanation depth toggle
- session state local persistence

### Phase 4: 카드 검색과 카드 상세

목표:

- 카드 목록
- 검색
- 필터
- 카드 상세
- strategy profile 검수에 쓸 수 있는 정보 표시

산출물:

```text
/cards
/cards/[cardId]
```

필수 기능:

- 한글/영문 검색
- 타입 필터
- Arena active 필터
- 전략 역할 필터
- 티어 필터
- WtdPWR/ADP/APR 표시
- 카드 상세에서 전략 역할, solves, risk, next-pick guidance 표시

### Phase 5: 전략 가이드와 룰링

목표:

- MDX 기반 한국어 가이드
- 카드/태그/전략 역할과 연결
- 수동 콤보와 룰링 입력

산출물:

```text
data/manual/combos.ko-KR.json
data/manual/rulings.ko-KR.json
content/guides/*.mdx
```

초기 글:

1. 드래프트 기본 원칙: broken card에서 역할 보완으로 전환하기
2. 카드 텍스트 타이밍 읽는 법
3. 가족 늘리기 경쟁
4. 화로 경쟁
5. 울타리와 동물 운영
6. 2방 2가족으로 버티는 조건

### Phase 6: BGA 스크린샷 OCR

목표:

- 스크린샷 업로드
- 카드명 자동 추출
- 결과 수정 UI
- 드래프트 코치로 전달

초기 구현:

- 고정 BGA 화면 비율 crop
- OCR
- fuzzy matching
- 수동 검수

### Phase 7: 사후 복기와 판세 경고

목표:

- 드래프트 선택 복기
- 내가 놓친 고평가 카드 표시
- 왜 특정 판에서 2방 2가족이 맞았는지/틀렸는지 설명
- 주요 설비, 누적 칸, 곡식/울타리/화로 경쟁 위험 경고

주의:

- v0 범위가 아니다.
- 실시간 자동 플레이가 아니라 학습/경고 보조로 설계한다.

### Phase 8: DB와 사용자 기능

DB가 필요한 시점에 도입한다.

후보:

- Firebase
- Supabase
- PostgreSQL + API

기능:

- 사용자별 드래프트 기록
- OCR job 저장
- 피드백 저장
- 카드 데이터 관리자 UI
- 전략 프로필 검수 워크플로

## 2주 MVP 예시

### Day 1-2

- Next.js 생성
- docs 정리
- data 디렉터리 생성
- 타입 정의

### Day 3-4

- 최소 카드 seed
- card-id-map 초안
- 통계 snapshot 샘플
- strategy role 사전

### Day 5-7

- CardStrategyProfile 50~100장 초안
- fixture 10~20개 작성
- scoring prototype 구현

### Day 8-10

- role coverage, saturation, return likelihood 구현
- standard/deep explanation 구현
- fixture 검증

### Day 11-12

- `/draft` UI
- 1~4픽 full pack 입력
- 5~7픽 selected card 입력

### Day 13-14

- 카드 검색/상세 최소 구현
- 문서/데이터 검증
- 내부 사용 가능한 배포 준비

## 성공 기준

MVP 성공 기준:

- 실제 BGA Arena 드래프트 중 입력 부담이 병목이 되지 않는다.
- 첫 50~100장 큐레이션 카드에 대해서 raw tier list보다 납득 가능한 추천이 나온다.
- 이미 해결한 역할의 중복 카드를 downrank한다.
- 강한 카드가 현재 손패에 맞지 않는 이유를 설명한다.
- ADP와 seen-card memory로 단순 return likelihood를 설명한다.
- standard 설명은 초중급자가 이해할 수 있다.
- deep 설명은 사후 학습에 도움이 된다.
