# 09 Open Questions

## 가장 먼저 결정할 것

1. v0에서 사용할 정확한 BGA Arena card pool snapshot은 무엇인가?
2. 첫 통계 source of truth는 무엇인가?
   - Lumin_S 계열 데이터
   - Agricola Norge 통계
   - 수동 제공 파일
   - 병합 snapshot
3. 처음 수동 strategy profile을 작성할 카드 50~100장은 어떻게 고를 것인가?
4. 직업과 보조 설비 드래프트를 하나의 통합 세션으로 볼 것인가, 별도 세션으로 볼 것인가?
5. 공개 빌드에서 카드 효과 텍스트를 어느 범위까지 보여줄 것인가?

## 데이터

- Lumin_S 통계 원본을 어떤 형태로 보관할 것인가?
  - TSV
  - CSV
  - 수동 복사 Markdown table
  - 첨부 파일

- BGA Arena active pool snapshot은 어디서, 어떤 주기로 갱신할 것인가?

- weak ban, strong ban, rules ban, not in BGA 정보를 카드 검색에서 어떻게 보여줄 것인가?

- 웅이님 엑셀 데이터를 공개 서비스에 어느 범위까지 표시할 것인가?

- 카드 효과 전문을 공개 페이지에 보여줄 수 있는가?

- 카드 이미지는 어떤 정책으로 처리할 것인가?
  - 없음
  - 텍스트 렌더링
  - 외부 링크
  - 허락받은 이미지
  - 사용자가 직접 업로드

## 전략 프로필

- `broken`과 `plan_anchor`의 기준은 어떻게 정할 것인가?

- role saturation은 카드별로 수동 지정할 것인가, role 단위 기본값으로 처리할 것인가?

- "이미 해결된 역할"을 판단하는 최소 규칙은 무엇인가?

- 조건부 카드의 리스크를 어떤 단위로 쓸 것인가?
  - 카드별 free text
  - risk tag
  - score penalty rule
  - 위 세 가지 혼합

- deep 설명에 운영 시퀀스를 얼마나 자세히 넣을 것인가?

## 드래프트 UX

- 첫 4픽 full pack 입력이 실전 시간 안에 가능한가?

- 마지막 3픽에서 selected card만 입력했을 때, 사용자에게 충분한 가치가 있는가?

- draft size 설정은 세션 시작 때만 바꾸게 할 것인가, 중간 수정도 허용할 것인가?

- 직업 7픽과 보조 설비 7픽을 하나의 화면에서 이어서 처리할 것인가?

## 기술

- 초기 검색 엔진은 무엇을 쓸 것인가?
  - 단순 client-side search
  - Fuse.js
  - MiniSearch
  - Algolia
  - Meilisearch

- draft scoring prototype은 app 코드 안에 둘 것인가, 별도 package처럼 분리할 것인가?

- session state는 v0에서 어디에 저장할 것인가?
  - memory only
  - localStorage
  - URL encoded state
  - IndexedDB

- 배포는 어디에 할 것인가?
  - Vercel
  - Firebase Hosting
  - Cloudflare Pages

- DB 도입 시점은 언제인가?
  - MVP 이후
  - 드래프트 기록 기능부터
  - OCR job 기능부터

## 제품

- 실전 중 보조 도구로 어디까지 허용할 것인가?

- 드래프트 추천 문구의 톤은 어떻게 할 것인가?
  - 단정적 추천
  - 보수적 추천
  - 통계 기반 설명 중심
  - 학습 중심 deep explanation

- 초보자용 standard 설명과 고급자용 deep 설명을 어떻게 분리할 것인가?

- 2방 2가족 같은 고급 운영 판단은 v0에서 카드 설명 수준으로 둘 것인가, 사후 복기 기능까지 기다릴 것인가?

## 콘텐츠

- 첫 전략 글 5개는 무엇으로 할 것인가?

- 카드 텍스트 판정은 카드별로 쓸 것인가, 개념별로 쓸 것인가?

- 콤보 데이터는 누가, 어떤 기준으로 검수할 것인가?

- 커뮤니티 공략글은 어느 정도까지 요약/링크/출처로 연결할 것인가?

## 다음 결정 권장

가장 먼저 결정할 것:

1. v0 BGA Arena card pool snapshot
2. canonical card id 규칙
3. 첫 통계 raw 파일 형식
4. 첫 strategy profile 50~100장 범위
5. draft scoring fixture 10~20개
