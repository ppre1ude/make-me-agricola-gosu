# 02 Data Model

이 문서는 구현이 의존할 데이터 계약을 정의한다. 카드, 번역, 통계, 전략 프로필, 드래프트 세션, 추천 결과의 기본 구조는 이 문서를 기준으로 한다.

## 설계 원칙

카드 본체와 언어별 데이터를 분리한다.

이유:

- 중국어, 일본어 등 신규 언어 추가 시 Card 구조를 바꾸지 않는다.
- 코보게 공식명, BGA명, 영문명, 팬 번역 alias를 유연하게 관리한다.
- 카드 효과 텍스트와 룰링은 언어별로 관리할 수 있다.

통계는 카드에 직접 박지 않고 snapshot으로 관리한다.

이유:

- Lumin_S 통계는 날짜, 표본, ELO 기준, 플레이어 수, 카드 풀에 따라 달라진다.
- 과거 메타와 최신 메타를 비교할 수 있어야 한다.

태그와 timing은 자유 문자열이 아니라 사전 기반으로 관리한다.

## Canonical Card ID

카드명은 id가 아니다.

id는 이름 변경, 번역 변경, alias 추가와 무관하게 유지되는 내부 식별자다.

예:

```text
occ-lover
occ-childless
minor-swing-plow
minor-hardware-store
major-fireplace
```

동명 카드나 판본 차이가 생기면 suffix를 붙인다.

```text
minor-market-stall-a
minor-market-stall-b
```

## Card

언어와 무관한 카드 본체다.

```ts
type CardType = "occupation" | "minor_improvement" | "major_improvement";

type Card = {
  id: string;
  type: CardType;
  decks: string[];
  editions: string[];
  playerCount?: number[];
  costRaw?: string;
  prerequisiteRaw?: string;
  victoryPoints?: number;
  isPassingMinor?: boolean;
  availability: {
    bga?: boolean;
    physicalKo?: boolean;
    revised?: boolean;
  };
  tagIds: string[];
  timingTagIds: string[];
  mechanicIds?: string[];
  sourceRefs: string[];
  createdAt: string;
  updatedAt: string;
};
```

## CardTranslation

언어별 이름, 텍스트, alias, 해설을 저장한다.

Firestore라면 `/cards/{cardId}/translations/{locale}` 구조를 사용할 수 있다.

```ts
type LocaleCode = "en" | "ko-KR" | "ja-JP" | "zh-CN" | "zh-TW" | string;

type CardTranslation = {
  cardId: string;
  locale: LocaleCode;
  name: string;
  officialName?: string;
  bgaName?: string;
  aliases: string[];
  effectText?: string;
  shortText?: string;
  rulesNotes?: string[];
  sourceRefs: string[];
  updatedAt: string;
};
```

표시 이름 우선순위 예:

```text
ko-KR: officialName → bgaName → name → en.name
en: name
zh-CN: name → en.name
```

## Tag

전략, 자원, 행동, 타이밍, 카드 타입 관련 태그를 통합 관리한다.

```ts
type TagCategory =
  | "strategy"
  | "role"
  | "resource"
  | "action"
  | "timing"
  | "card_type"
  | "draft"
  | "card_pool"
  | "risk"
  | "scoring";

type Tag = {
  id: string;
  category: TagCategory;
  labels: Record<LocaleCode, string>;
  description?: Record<LocaleCode, string>;
  parentId?: string;
};
```

예:

```text
field
grain
vegetable
animal
fence
room
family_growth
renovation
food_engine
bake_bread
early_engine
late_scoring
conditional
```

## StrategyRole

드래프트 추천 엔진에서 쓰는 전략 역할 사전이다. 일반 태그보다 더 제품 핵심에 가깝다.

초기 후보:

```text
plan_anchor
broken
field_engine
grain_supply
grain_seeds_action_upgrade
food_engine
food_support
food_conversion
food_self_sufficiency
bake_bread_access
wood_supply
clay_supply
reed_supply
wood_sink
fence_support
animal_housing
animal_completion
family_growth_support
room_building
delayed_growth_enabler
occupation_count_enabler
minor_prerequisite_payoff
major_improvement_support
late_bonus_points
wood_to_points
risk_conditional
```

```ts
type SaturationBehavior =
  | "hard_cap"
  | "soft_cap"
  | "stackable"
  | "resource_convertible"
  | "condition_based";

type StrategyRole = {
  id: string;
  labels: Record<LocaleCode, string>;
  description?: Record<LocaleCode, string>;
  parentId?: string;
  defaultSaturationLimit?: number;
  saturationBehavior?: SaturationBehavior;
  sinkRoleIds?: string[];
};
```

`saturationBehavior`는 role 중복을 어떻게 해석할지 정한다.

- `hard_cap`: 농경 seed/field처럼 1~2장 이후 강하게 포화되는 역할
- `soft_cap`: wood supply처럼 여러 장이 좋지만 3~4장째부터 점차 내려가는 역할
- `stackable`: 점수 전환처럼 여러 장이 가능하지만 실행 비용을 봐야 하는 역할
- `resource_convertible`: 자원 소모처와 전환 플랜에 따라 가치가 달라지는 역할
- `condition_based`: 조건 충족 여부가 핵심인 보너스/콤보 역할

예:

```json
{
  "id": "wood_supply",
  "defaultSaturationLimit": 2,
  "saturationBehavior": "soft_cap",
  "sinkRoleIds": ["fence_support", "animal_housing", "room_building", "wood_to_points"]
}
```

## ExplanationDepth

추천 설명의 깊이다.

```ts
type ExplanationDepth = "compact" | "standard" | "deep";
```

용도:

- `compact`: 실전 중 한 줄 요약
- `standard`: 기본 추천 이유, 리스크, 다음 픽 방향
- `deep`: score component, 역할 커버리지, 포화도, 돌아올 가능성, 운영 시퀀스, 학습 메모

## TimingTag

카드 텍스트 판정에 필요한 발동 시점 사전이다.

```ts
type TimingTag = {
  id: string;
  labels: Record<LocaleCode, string>;
  description: Record<LocaleCode, string>;
  examples?: string[];
};
```

초기 후보:

```text
immediate
before_action_space
during_action_space
after_action_space
on_use_action_space
on_play_card
on_play_occupation
on_play_minor
round_start
harvest_start
field_phase
feeding_phase
breeding_phase
scoring
anytime
replacement_effect
```

## CardMechanic

MVP에서는 완전한 룰 엔진이 아니라 구조화된 해설 태그로 사용한다.

```ts
type MechanicConfidence =
  | "manual_verified"
  | "official_verified"
  | "bga_verified"
  | "stat_inferred"
  | "text_inferred"
  | "community_inferred"
  | "unverified";

type CardMechanic = {
  id: string;
  cardId: string;
  timingTagId: string;
  trigger?: {
    kind:
      | "use_action_space"
      | "play_card"
      | "harvest"
      | "round_start"
      | "scoring"
      | "resource_gain"
      | "custom";
    actionSpaceType?: string;
    cardType?: CardType;
    raw?: string;
  };
  relatedTagIds: string[];
  relatedActionSpaces?: string[];
  explanation?: Record<LocaleCode, string>;
  confidence: MechanicConfidence;
  sourceRefs: string[];
};
```

## StatsSnapshot

통계 세트의 메타데이터다.

```ts
type StatsSnapshot = {
  id: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  collectedAt?: string;
  importedAt: string;
  playerCount?: number;
  minElo?: number;
  cardPool?: string[];
  description?: string;
};
```

## CardStatRow

특정 snapshot에서 카드 하나의 통계 값이다.

```ts
type CardStatRow = {
  snapshotId: string;
  cardId: string;
  rank?: number;
  pwr?: number;
  adp?: number;
  apr?: number;
  deals?: number;
  drafted?: number;
  plays?: number;
  wHand?: number;
  wPlay?: number;
  wtdPwr?: number;
  eloPerPlay?: number;
  tier?: string;
};
```

## CardPoolProfile

특정 시점의 카드 풀과 ban/filter 상태다.

v0에서는 BGA Arena active pool을 기본값으로 둔다. 공개 서비스에서 제외 카드가 draft 중 보일 일은 거의 없지만, 카드 검색과 데이터 관리 화면에서는 카드가 왜 빠졌는지 설명할 수 있어야 한다.

```ts
type CardPoolStatus =
  | "active"
  | "weak_ban"
  | "strong_ban"
  | "rules_ban"
  | "not_in_bga"
  | "unknown";

type CardPoolProfile = {
  id: string;
  name: string;
  sourceRefs: string[];
  collectedAt?: string;
  playerCount?: number;
  cardStatuses: Record<string, CardPoolStatus>;
  notes?: string;
};
```

## CardStrategyProfile

드래프트 추천과 카드 상세의 전략 설명을 위한 수동/반자동 큐레이션 데이터다.

```ts
type StrategyConfidence =
  | "manual_verified"
  | "stat_inferred"
  | "text_inferred"
  | "unverified";

type TimingWindow = "early" | "mid" | "late" | "anytime";

type CardStrategyProfile = {
  cardId: string;
  cardPoolProfileId?: string;
  arenaActive: boolean;
  roles: string[];
  isBroken?: boolean;
  isPlanAnchor?: boolean;
  brokenReasonTags?: string[];
  brokenReasonNote?: Record<LocaleCode, string>;
  solves: string[];
  supports?: string[];
  partialSolves?: string[];
  increasesNeedFor: string[];
  saturationPenaltyTo: string[];
  synergyWith: string[];
  conflictsWith: string[];
  riskTags: string[];
  timingWindow: TimingWindow;
  operatingSequence?: Record<LocaleCode, string[]>;
  nextPickGuidance?: Record<LocaleCode, string[]>;
  explanation: {
    compact?: Record<LocaleCode, string>;
    standard?: Record<LocaleCode, string>;
    deep?: Record<LocaleCode, string>;
  };
  sourceRefs: string[];
  confidence: StrategyConfidence;
  updatedAt: string;
};
```

예:

```text
밭일 감독이 field access를 해결하면,
추가 밭갈기/농지 계열 카드에는 saturation penalty가 붙고,
다음 픽에서는 bake-bread access, food self-sufficiency, wood/fence support, animal coverage, 점수 전환 쪽 가치가 오른다.
```

`solves`, `supports`, `partialSolves`는 구분한다.

- `solves`: 카드 한 장이 해당 문제를 실질적으로 해결한다.
- `supports`: 해당 축을 보조하지만 해결했다고 보지는 않는다.
- `partialSolves`: 일부 조건에서는 해결에 가깝지만 추가 연결고리가 필요하다.

예를 들어 식량 1~2개를 주는 카드는 `food_support`를 `supports`할 수 있지만, `food_engine`을 `solves`했다고 보지 않는다.

## DraftSession

사용자가 드래프트 중 본 정보와 고른 카드를 기록하는 세션이다.

```ts
type DraftFormat = {
  initialPackSize: 8 | 9 | 10;
  cardsKept: 7;
  totalPicks: 7;
};

type DraftCardType = "occupation" | "minor_improvement";

type DraftSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  playerCount: 4;
  cardPoolProfileId: string;
  draftFormat: DraftFormat;
  draftCardType: DraftCardType;
  explanationDepth: ExplanationDepth;
  picks: DraftPick[];
  pickedCardIds: string[];
  seenCardIds: string[];
  passedCardIds: string[];
  missingFromPreviousPacks?: DraftTrackingSignal[];
};

type DraftPick = {
  pickNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  inputMode: "full_pack" | "selected_only" | "corrected_pack";
  offeredCardIds: string[];
  previousPackCardIds?: string[];
  missingFromPreviousPack?: string[];
  selectedCardId?: string;
  passedCardIds?: string[];
  source: "manual" | "ocr" | "prediction";
  createdAt: string;
};

type DraftTrackingSignal = {
  pickNumber: number;
  previousPickNumber?: number;
  missingCardIds: string[];
  missingRoleCounts: Record<string, number>;
  premiumMissingCount: number;
  roleAvailabilityPressure: Record<string, number>;
  notes: string[];
};
```

입력 원칙:

- 1~7픽 모두 `full_pack`을 지원한다.
- 고수용 기본 흐름은 full tracking이다.
- 5~7픽에서 이전 pack 대비 사라진 카드를 계산해 `missingFromPreviousPack`과 `DraftTrackingSignal`로 남긴다.
- `selected_only`는 시간 압박이 큰 quick mode fallback이다.
- 상대가 가져간 카드는 확정하지 않고, 사용자가 본 카드와 돌아오지 않은 카드만 저장한다.
- tracking signal은 role availability와 복기 요약에 사용하되, 특정 상대 플랜을 확정하지 않는다.

## DraftRecommendation

추천 엔진의 출력 타입이다. UI는 이 객체를 렌더링한다.

```ts
type ReturnLikelihood = "unlikely" | "possible" | "likely" | "unknown";

type DraftRecommendation = {
  sessionId: string;
  pickNumber: number;
  cardId: string;
  rank: number;
  score: number;
  components: {
    statStrength?: number;
    brokenOrAnchor?: number;
    synergy?: number;
    roleCoverage?: number;
    saturationPenalty?: number;
    riskPenalty?: number;
    returnUrgency?: number;
    premiumDenial?: number;
    roleAvailabilityPressure?: number;
    confidence?: number;
  };
  returnLikelihood: ReturnLikelihood;
  reasons: Record<ExplanationDepth, string[]>;
  risks: string[];
  nextPickDirection: string[];
  candidateGroups?: string[];
};
```

## Combo

콤보는 단순 카드 묶음이 아니라 전략 설명 단위다.

```ts
type Combo = {
  id: string;
  cardIds: string[];
  requiredTagIds?: string[];
  payoffTagIds?: string[];
  phase?: "early" | "mid" | "late" | "scoring";
  strength: 1 | 2 | 3 | 4 | 5;
  title: Record<LocaleCode, string>;
  description: Record<LocaleCode, string>;
  risk?: Record<LocaleCode, string>;
  sourceRefs: string[];
};
```

## Ruling

텍스트 판정과 FAQ 성격의 콘텐츠다.

```ts
type Ruling = {
  id: string;
  cardId?: string;
  tagIds?: string[];
  locale: LocaleCode;
  title: string;
  body: string;
  examples?: string[];
  relatedCardIds?: string[];
  sourceRefs: string[];
  confidence: MechanicConfidence;
  updatedAt: string;
};
```

## Guide

MDX 파일과 metadata로 관리한다.

```ts
type GuideMeta = {
  slug: string;
  locale: LocaleCode;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  tagIds: string[];
  relatedCardIds: string[];
  updatedAt: string;
};
```
