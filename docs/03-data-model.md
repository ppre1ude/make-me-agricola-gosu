# 03 Data Model

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
  | "resource"
  | "action"
  | "timing"
  | "card_type"
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
type MechanicConfidence = "verified" | "manual" | "inferred" | "unverified";

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

