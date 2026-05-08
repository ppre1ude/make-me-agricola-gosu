# 01 Data Pipeline

## 원칙

DB를 source of truth로 두지 않는다.

초기에는 프로젝트의 데이터 파일이 source of truth다.

```text
/data/raw
/data/normalized
/data/manual
```

DB는 배포와 조회를 위한 layer로 본다. 언제든 normalized JSON에서 다시 seed할 수 있어야 한다.

Firebase, MongoDB, Firestore 같은 외부 DB를 도입하더라도 카드 지식의
source of truth는 Git으로 관리되는 raw/normalized/manual 데이터 파일이다.
DB는 앱 런타임 조회, 사용자별 기록, 관리자 UI, 피드백 수집을 위한 seed target으로만 둔다.

## 디렉터리 구조

```text
/data
  /raw
    woongi-tierlist-2025-09-01.xlsx
    lumin-s-bga-stats-2026-xx.tsv
  /normalized
    cards.json
    translations.ko-KR.json
    translations.en.json
    stats.lumin-s.2026-xx.json
    tags.json
    strategy-roles.json
    card-pool.bga-arena.2026-xx.json
    timing-tags.json
  /manual
    aliases.json
    card-id-map.json
    source-refs.json
    card-strategy-profiles.json
    combos.ko-KR.json
    card-rulings.ko-KR.json
    guide-card-links.json
  /fixtures
    /draft
      *.json
/scripts
  import-woongi-xlsx.ts
  import-lumin-stats.ts
  normalize-cards.ts
  validate-strategy-profiles.ts
  score-draft-fixtures.ts
  validate-data.ts
  seed-firestore.ts
```

## 데이터 출처

### 웅이님 엑셀

Source ref:

- `woongi-tierlist-2025-09-01`

용도:

- 한국어 공식명
- BGA 한글명
- 한국어 효과 텍스트
- 한국어 티어
- wtdPWR 기반 가공 정보

출처와 허가:

- 제목: `아그리콜라 카드 티어리스트 검색기_250901_웅이_V2`
- 작성자: 웅이 / bigman0603
- 원문: `https://boardgamelaboratory.tistory.com/7`
- 스냅샷 기준일: 2025-09-01
- 사용 허가: 작성자가 "출처만 명확히 기재해주신다면 사용하셔도 괜찮습니다"라고 허가했다.
- 허가 근거: 2025-05-10 댓글 답변 캡처

주의:

- 가공본이므로 원본 통계와 분리해서 저장한다.
- raw spreadsheet는 import seed로 보관하되, 공개 앱에는 필요한 normalized subset만 제공한다.
- normalized/manual 데이터에서 이 출처를 사용한 row는 `sourceRefs`에
  `woongi-tierlist-2025-09-01`을 기록한다.
- UI 하단, 카드 상세, 데이터 문서에는 Woongi 자료 기반 데이터임을 명확히 표기한다.

### Lumin_S BGA 통계

용도:

- Rank
- Card Name
- PWR
- ADP
- APR
- Deals
- Drafted
- Plays
- W-Hand
- W-Play
- WtdPWR
- Elo/Play

저장 방식:

- raw에는 포럼에서 복사한 TSV 또는 CSV를 그대로 보관한다.
- normalized에는 cardId와 매핑한 CardStatRow 배열로 저장한다.

### BGA Arena 카드 풀 snapshot

용도:

- v0에서 실제 추천 대상 카드 제한
- weak ban, strong ban, rules ban, not in BGA 상태 표시
- Arena 환경 변화에 따른 과거/현재 추천 비교

저장 방식:

- `data/normalized/card-pool.bga-arena.2026-xx.json`에 카드별 상태를 저장한다.
- 카드 검색에서는 제외 사유를 보여줄 수 있지만, 드래프트 추천 기본값은 `active` 카드만 사용한다.

### Strategy profile

용도:

- broken card / plan anchor 표시
- 전략 역할 태깅
- 역할 중복과 포화도 계산
- 콤보, 리스크, 다음 픽 방향 설명
- 초보자/고급자 설명 분리
- passRegret, pivotPotential, conflictCost 판단 근거 축적
- model_user_disagreement를 fixture 후보로 전환할 수 있는 근거 저장

저장 방식:

- `data/manual/card-strategy-profiles.json`을 수동 큐레이션 source of truth로 둔다.
- 카드 효과 텍스트에서 추론 가능한 태그는 importer가 초안을 만들 수 있지만, 추천에 직접 쓰기 전 수동 검수를 거친다.
- 처음부터 전체 A~E 카드를 완성하지 않는다.
- 우선순위는 fixture에 필요한 카드, BGA Arena에서 영향이 큰 50~100장, 전체 A~E 최소 태깅 순서다.
- 모델 추천과 사용자 선택이 다를 때는 모델 오류로 확정하지 않고 `model_user_disagreement` 이벤트로 남긴다.

### Agricola Cards

용도:

- 영문 카드 탐색 구조 참고
- 필터 UX 참고
- 영문명 대조

주의:

- 공식 API 또는 CSV 다운로드가 확인되지 않는 한 무단 크롤링을 데이터 원본으로 삼지 않는다.

### ReedStoneFood

용도:

- 영문 카드 텍스트 대조
- 카드 렌더링 방식 참고
- 컴펜디엄과 cardRuling 참고

주의:

- `cards.js`에 데이터가 정적 배열로 들어 있지만, 재사용 허락과 라이선스 확인 전에는 원본 DB로 복제하지 않는다.

### AgricolaDB

용도:

- 일본어 카드명과 판본 대조
- GraphQL API 기반 데이터 구조 참고
- 향후 다국어 확장 참고

주의:

- API 사용 정책과 요청량을 확인한다.

## Source reference 관리

출처 메타데이터는 `data/manual/source-refs.json`에 둔다.

역할:

- 사람이 검수한 출처 id를 안정적으로 관리한다.
- normalized/manual 데이터의 `sourceRefs` 필드가 참조할 수 있는 id를 제공한다.
- 사용 허가, attribution 문구, snapshot date를 데이터와 분리해서 추적한다.

규칙:

- raw source 파일명과 source ref id는 가능한 한 같은 날짜를 포함한다.
- 외부 자료에서 가져온 카드명, 설명, 티어, 통계 row는 `sourceRefs`를 가진다.
- 허가 조건이 있는 출처는 `permission.status`와 `attributionTextKo`를 채운다.
- 외부 DB seed 단계에서는 source ref 정보를 같이 내보내거나, UI가 참조할 수 있는
  별도 attribution payload로 제공한다.

## Import 흐름

```text
raw source
→ parser script
→ normalized intermediate
→ manual card id mapping
→ strategy profile draft generation
→ manual strategy review
→ validation
→ draft fixture scoring
→ app static import
→ optional DB seed
```

## 카드 매핑 전략

카드 데이터 병합의 핵심은 카드명 매칭이 아니라 canonical card id 매핑이다.

초기 자동 매칭:

1. 영문명 exact match
2. normalized 영문명 match
3. alias match
4. fuzzy match
5. 수동 검수

수동 매핑 파일:

```json
{
  "Lover": "occ-lover",
  "Childless": "occ-childless",
  "Swing Plow": "minor-swing-plow"
}
```

## 검증 규칙

`validate-data.ts`는 최소한 다음을 검사한다.

- 모든 Card는 id가 유일해야 한다.
- 모든 CardTranslation은 존재하는 cardId를 참조해야 한다.
- 모든 CardStatRow는 존재하는 cardId를 참조해야 한다.
- tagIds는 사전에 존재해야 한다.
- CardStrategyProfile.roles는 StrategyRole 사전에 존재해야 한다.
- CardStrategyProfile.solves/supports/partialSolves/increasesNeedFor는 StrategyRole 사전을 참조해야 한다.
- CardStrategyProfile의 synergy/conflict/saturation 대상은 존재하는 cardId 또는 role id여야 한다.
- StrategyRole.saturationBehavior는 허용된 enum이어야 한다.
- StrategyRole.sinkRoleIds는 존재하는 role id여야 한다.
- CardPoolProfile의 cardStatuses는 존재하는 cardId를 참조해야 한다.
- timingTagIds는 사전에 존재해야 한다.
- 중복 alias가 있으면 warning을 낸다.
- Lumin_S 통계의 카드명이 매핑되지 않으면 error 또는 review list로 뺀다.

## 드래프트 fixture 검증

추천 엔진은 UI보다 먼저 fixture로 검증한다.

초기 fixture 예:

```json
{
  "id": "field-watchman-saturation-example",
  "pickNumber": 3,
  "pickedCardIds": ["occ-field-watchman"],
  "seenCardIds": ["minor-swing-plow", "minor-grain-cart"],
  "offeredCardIds": ["minor-swing-plow", "minor-grain-cart", "minor-food-engine-a"],
  "expected": {
    "downrankedRoles": ["field_engine"],
    "preferredRoles": ["grain_supply", "bake_bread_access", "food_engine"]
  }
}
```

`score-draft-fixtures.ts`는 다음 구현 단계에서 두 단계 fixture gate를 확인해야 한다.

현재 baseline은 3개 prototype fixture 통과 상태다. 이것은 추천 방향 확인에는 유효하지만, Schema Stabilization Gate 또는 Domain Logic / Product Readiness Gate 통과를 뜻하지 않는다. 다음 작업은 새 fixture assertion을 validation과 fixture runner에 먼저 반영해, 지원하지 않는 assertion이 조용히 무시되지 않게 만드는 것이다.

Schema Stabilization Gate:

- `candidateGroups`는 항상 배열이고 rank 1에서는 비어 있지 않다.
- `warnings`와 `evaluationMeta`가 `reasons`와 분리된다.
- missing stat/profile은 데이터 경고와 평가 메타로 표현된다.
- `returnLikelihood`, `nextPickDirection`, `trackingSignals`, `planShiftHints`의 출력 shape이 안정적이다.

Domain Logic / Product Readiness Gate:

- already solved role이 반복되면 saturation penalty가 적용된다.
- broken/plan anchor는 초반 픽에서 충분히 높은 가중치를 받는다.
- 높은 passRegret 카드는 Pick 1~4에서 약한 보완 카드보다 앞설 수 있다.
- pivotPotential은 high tier + plan anchor + low conflict 상황에서만 약하게 반영된다.
- conflictCost는 이미 해결한 역할과 충돌하는 후보를 설명한다.
- ADP가 낮은 카드는 return likelihood가 낮게 나온다.
- full tracking fixture에서는 사라진 카드가 role availability pressure로 반영된다.
- 조건부 카드는 deep 설명에 리스크가 포함된다.
- 추천 결과가 단순 WtdPWR 정렬과 다른 이유를 설명할 수 있다.

## 초기에는 DB 없이 시작

카드 수가 수백~천 장 수준이라면 정적 JSON import로 충분하다.

장점:

- 빠르게 개발 가능
- seed/DB 인증/권한 문제를 미룸
- Git diff로 데이터 변경 추적 가능
- 배포가 단순함

나중에 DB가 필요한 시점:

- 사용자별 드래프트 기록 저장
- OCR 작업 상태 저장
- 관리자 데이터 수정 UI
- 다수 사용자의 피드백 수집
- 통계 업데이트 자동화

DB를 도입하더라도 카드/전략 프로필의 source of truth는 Git으로 관리되는 normalized/manual 데이터 파일로 유지한다.
