# 07 Roadmap

## 혼자 구현하는 순서

### Phase 0: 프로젝트 기반

목표:

- Next.js 프로젝트 생성
- TypeScript, ESLint, Tailwind 설정
- docs 유지
- data 디렉터리 생성

산출물:

```text
Next.js 앱 실행
기본 레이아웃
데이터 파일 구조
```

### Phase 1: 데이터 파이프라인

목표:

- raw 엑셀/TSV 저장
- 카드 ID 규칙 확정
- import script 작성
- normalized JSON 생성
- validation script 작성

산출물:

```text
data/normalized/cards.json
data/normalized/translations.ko-KR.json
data/normalized/stats.lumin-s.json
data/normalized/tags.json
```

우선순위:

1. Lumin_S 통계 영문 카드명 import
2. 웅이님 엑셀 한국어명/효과 import
3. card-id-map 수동 보정
4. 검증 스크립트

### Phase 2: 카드 DB UI

목표:

- 카드 목록
- 검색
- 필터
- 카드 상세

산출물:

```text
/cards
/cards/[cardId]
```

필수 기능:

- 한글/영문 검색
- 타입 필터
- 티어 필터
- WtdPWR/ADP/APR 표시
- 카드 상세에서 통계 해석 문장 표시

### Phase 3: 드래프트 수동 입력

목표:

- 후보 카드 입력
- 추천 순위 계산
- 추천 이유 표시

산출물:

```text
/draft
```

초기 추천 로직:

- WtdPWR
- PWR
- ADP
- APR
- Plays/Drafted
- 태그 시너지

### Phase 4: 전략 가이드

목표:

- MDX 기반 한국어 가이드
- 카드/태그와 연결

초기 글:

1. 카드 텍스트 타이밍 읽는 법
2. 가족 늘리기 경쟁
3. 방 늘리기 경쟁
4. 화로 경쟁
5. 울타리와 동물 운영

### Phase 5: 콤보와 룰링

목표:

- 수동 콤보 20~50개 입력
- 텍스트 판정 룰링 입력
- 카드 상세과 드래프트 추천에 연결

산출물:

```text
data/manual/combos.ko-KR.json
data/manual/rulings.ko-KR.json
```

### Phase 6: BGA 스크린샷 OCR

목표:

- 스크린샷 업로드
- 카드명 자동 추출
- 결과 수정 UI
- 드래프트 분석으로 전달

초기 구현:

- 고정 BGA 화면 비율 crop
- OCR
- fuzzy matching
- 수동 검수

### Phase 7: DB와 사용자 기능

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

## 2주 MVP 예시

### Day 1-2

- Next.js 생성
- docs 정리
- data 디렉터리 생성
- 타입 정의

### Day 3-4

- 엑셀/TSV import script
- card-id-map 초안
- normalized JSON 생성

### Day 5-7

- 카드 목록
- 검색
- 필터
- 카드 상세

### Day 8-10

- 통계 표시
- 티어 계산
- 통계 해석 문장

### Day 11-12

- 드래프트 수동 입력
- 추천 점수 계산

### Day 13-14

- 전략 가이드 2~3개
- 문서/데이터 검증
- 배포 준비

## 성공 기준

MVP 성공 기준:

- 카드명 검색이 빠르고 정확하다.
- 카드 상세에서 한국어명, 영문명, 효과, 통계가 한눈에 보인다.
- 드래프트 후보 7장을 입력하면 납득 가능한 추천 순위가 나온다.
- 카드와 전략 글이 서로 연결된다.
- 데이터 업데이트를 JSON/스크립트로 반복할 수 있다.

