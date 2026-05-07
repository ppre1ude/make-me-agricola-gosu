# 04 Data Pipeline

## 원칙

DB를 source of truth로 두지 않는다.

초기에는 프로젝트의 데이터 파일이 source of truth다.

```text
/data/raw
/data/normalized
/data/manual
```

DB는 배포와 조회를 위한 layer로 본다. 언제든 normalized JSON에서 다시 seed할 수 있어야 한다.

## 디렉터리 구조

```text
/data
  /raw
    woong-tierlist-2025-09-01.xlsx
    lumin-s-bga-stats-2026-xx.tsv
  /normalized
    cards.json
    translations.ko-KR.json
    translations.en.json
    stats.lumin-s.2026-xx.json
    tags.json
    timing-tags.json
    source-refs.json
  /manual
    aliases.json
    card-id-map.json
    combos.ko-KR.json
    rulings.ko-KR.json
    guide-card-links.json
/scripts
  import-woong-xlsx.ts
  import-lumin-stats.ts
  normalize-cards.ts
  validate-data.ts
  seed-firestore.ts
```

## 데이터 출처

### 웅이님 엑셀

용도:

- 한국어 공식명
- BGA 한글명
- 한국어 효과 텍스트
- 한국어 티어
- wtdPWR 기반 가공 정보

주의:

- 가공본이므로 원본 통계와 분리해서 저장한다.
- 파일 자체의 재배포 가능 여부는 확인이 필요하다.

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
- 컴펜디엄과 룰링 참고

주의:

- `cards.js`에 데이터가 정적 배열로 들어 있지만, 재사용 허락과 라이선스 확인 전에는 원본 DB로 복제하지 않는다.

### AgricolaDB

용도:

- 일본어 카드명과 판본 대조
- GraphQL API 기반 데이터 구조 참고
- 향후 다국어 확장 참고

주의:

- API 사용 정책과 요청량을 확인한다.

## Import 흐름

```text
raw source
→ parser script
→ normalized intermediate
→ manual card id mapping
→ validation
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
- timingTagIds는 사전에 존재해야 한다.
- 중복 alias가 있으면 warning을 낸다.
- Lumin_S 통계의 카드명이 매핑되지 않으면 error 또는 review list로 뺀다.

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

