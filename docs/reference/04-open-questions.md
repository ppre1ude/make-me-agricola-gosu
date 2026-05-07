# 04 Open Questions

이 문서는 아직 닫히지 않은 질문만 남긴다. grill-me에서 이미 닫은 결정은 아래 resolved 섹션으로 내려, 같은 질문을 반복하지 않도록 한다.

## Resolved By Grill-Me

### 제품과 UX

- v0의 제품 중심은 Draft Memory Coach다. 카드 검색과 카드 상세는 드래프트 판단과 전략 학습을 위한 기반 기능이다.
- 고수용 기본 입력은 1~7픽 full visible pack tracking이다.
- selected-only 입력은 5~7픽의 기본 모델이 아니라 시간 압박이 큰 quick fallback이다.
- 현재 드래프트 풀과 내 손패 풀은 화면에서 분리해 보여주되, 추천 판단에서는 현재 드래프트 풀이 더 눈에 먼저 들어와야 한다.
- 설명 깊이는 compact, standard, deep 3단계로 둔다.
- skill level과 goal mode는 유저가 직접 설정할 수 있다. 추천 순위 자체보다 설명 밀도와 화면 강조를 조정한다.

### 추천 정책

- 추천 기준은 pick phase에 따라 달라진다.
- Pick 1~2는 broken card, premium card, open-ended plan anchor를 강하게 본다.
- Pick 3~4는 범용 강도, 현재 손패의 부족 역할, passRegret을 함께 본다.
- Pick 5~7은 현재 손패 기준 후보군을 먼저 만들고, 그 안에서 티어와 통계를 반영한다.
- 보완 카드가 강카드를 이기려면 현재 손패가 명확히 요구하는 role을 해결하고, 그 role 없이는 기존 카드 가치가 크게 떨어지며, 나중에 확보하기 어렵고, 카드 자체가 너무 약하지 않아야 한다.
- `passRegret`은 boolean이 아니라 0~10 수치형 component다.
- `pivotPotential`은 v0에서 약하게 반영한다. full plan graph나 베이즈 추론은 하지 않는다.
- `conflictCost`는 기존 손패와 충돌하거나 이미 해결한 역할을 과하게 중복하는 비용이다.
- after-pick plan shift는 Pick 2~4에서 broken, plan anchor, high passRegret 후보가 추천될 때만 가볍게 표시한다.
- component 숫자는 승률이 아니며 deep/debug에서 근거로만 보여준다.

### 트래킹과 피드백

- 사라진 카드는 특정 상대의 플랜으로 확정하지 않는다.
- 5~7픽에서 이전 pack 대비 사라진 카드는 role availability pressure와 사후 복기 신호로 사용한다.
- 모델 추천과 사용자 선택이 다르면 `model_user_disagreement`로 기록한다.
- `model_user_disagreement`는 곧바로 모델 오류가 아니다. 유저 실력, 외부 정보, 실험적 선택, 데이터 낡음 여부를 모르기 때문이다.
- 나중에 disagreement 이벤트를 fixture 후보로 전환할 수 있게 저장한다.

### 데이터 구축

- 초기 데이터 구축 우선순위는 fixture-needed cards, BGA Arena high-impact 50~100 cards, 전체 A~E 최소 태깅 순서다.
- food 관련 역할은 `food_engine`, `food_support`, `food_conversion`, `food_self_sufficiency`로 분리한다.
- `brokenReasonTags`는 우선 설명과 분류에 쓰고, 충분한 fixture 전까지 강한 scoring modifier로 쓰지 않는다.

## Remaining Questions

## 데이터

1. v0에서 사용할 정확한 BGA Arena card pool snapshot은 무엇인가?
2. 첫 통계 source of truth는 무엇인가?
   - Lumin_S 계열 데이터
   - Agricola Norge 통계
   - 수동 제공 파일
   - 병합 snapshot
3. 처음 수동 strategy profile을 작성할 카드 50~100장은 어떤 기준으로 뽑을 것인가?
4. 직업과 보조 설비 드래프트를 하나의 통합 세션으로 볼 것인가, 별도 세션으로 볼 것인가?
5. 공개 빌드에서 카드 효과 텍스트를 어느 범위까지 보여줄 것인가?
6. weak ban, strong ban, rules ban, not in BGA 정보를 카드 검색에서 어떤 시각 표현으로 보여줄 것인가?
7. 웅이님 엑셀 데이터를 공개 서비스에 어느 범위까지 표시할 것인가?
8. 카드 이미지는 어떤 정책으로 처리할 것인가?

## 전략 프로필

1. `broken`과 `plan_anchor`의 판정 기준을 어떤 문서와 fixture로 고정할 것인가?
2. role saturation 기본값은 role 단위로 먼저 둘 것인가, 고영향 카드만 card override를 둘 것인가?
3. 조건부 카드의 리스크는 risk tag, free text, score penalty rule 중 어느 비중으로 시작할 것인가?
4. deep 설명에 운영 시퀀스를 얼마나 자세히 넣을 것인가?
5. passRegret, pivotPotential, conflictCost의 초기 weight는 어떤 fixture matrix로 고정할 것인가?

## 드래프트 UX

1. full tracking 입력이 실전 시간 안에 가능한지 실제 BGA 화면 기준으로 테스트해야 한다.
2. draft size 설정은 세션 시작 때만 바꾸게 할 것인가, 중간 수정도 허용할 것인가?
3. 직업 7픽과 보조 설비 7픽을 하나의 화면에서 이어서 처리할 것인가?
4. after-pick plan shift를 카드 추천 카드에만 보여줄 것인가, top 3 후보에 모두 보여줄 것인가?

## 기술

1. 초기 검색 엔진은 무엇을 쓸 것인가?
   - 단순 client-side search
   - Fuse.js
   - MiniSearch
   - Algolia
   - Meilisearch
2. session state는 v0에서 어디에 저장할 것인가?
   - memory only
   - localStorage
   - URL encoded state
   - IndexedDB
3. 배포는 어디에 할 것인가?
   - Vercel
   - Firebase Hosting
   - Cloudflare Pages
4. DB 도입 시점은 언제인가?
   - MVP 이후
   - 드래프트 기록 기능부터
   - OCR job 기능부터

## 콘텐츠

1. 첫 전략 글 5개는 무엇으로 할 것인가?
2. 카드 텍스트 판정은 카드별로 쓸 것인가, 개념별로 쓸 것인가?
3. 콤보 데이터는 누가, 어떤 기준으로 검수할 것인가?
4. 커뮤니티 공략글은 어느 정도까지 요약/링크/출처로 연결할 것인가?

## 다음 결정 권장

도메인 고정 전에 먼저 닫아야 할 것은 다음이다.

1. canonical domain language 문서 위치와 이름
2. `role`, `tag`, `mechanic`, `plan`, `combo`의 경계
3. `solves`, `supports`, `partialSolves`의 scoring 의미
4. `passRegret`, `pivotPotential`, `conflictCost`의 초기 weight 정책
5. TypeScript contract와 문서 계약의 동기화 범위
