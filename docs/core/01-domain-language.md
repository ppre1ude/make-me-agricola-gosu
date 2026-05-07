# 01 Domain Language

이 문서는 프로젝트 전체에서 사용하는 canonical domain language를 고정한다. 데이터 모델, 기능 명세, fixture, 코드 타입 이름은 이 문서의 용어를 기준으로 맞춘다.

## Naming Policy

긴 수명의 문서와 exported/shared code type에는 context prefix를 붙인다.

피한다:

```text
Recommendation
Reason
Risk
Warning
Session
Rule
Ruling
```

사용한다:

```text
DraftRecommendation
DraftRecommendationReason
DraftRecommendationRisk
DraftWarning
DraftSequence
gameRule
cardRuling
productPolicy
```

짧은 bare name은 파일 내부 helper나 지역 변수에서만 허용한다.

## FeatureContext

`FeatureContext`는 사용자가 어느 기능 화면에서 정보를 보고 있는지를 나타내는 시스템 context다. 사용자가 임의로 고르는 모드가 아니라 제품 기능 경계에 의해 정해진다.

초기 context:

```text
card_reference:
  카드 DB 확인 및 설명 확인

draft_coach:
  드래프트 상황에서 실시간 전략 확인

in_game_coach:
  인게임 플레이 상황에서 전략의 틀 잡아주기
  v0 범위는 아님

review_lab:
  복기 및 연구하기
  v0 범위는 아님
```

`goalMode`, `DraftCoachMode`, `StudyMode`는 v0 도메인에서 사용하지 않는다. 기능이 더 구체화된 뒤 필요하면 다시 검토한다.

정책:

```text
FeatureContext determines what kind of judgment/explanation is provided.
userSkillLevel determines how deeply and with what terminology it is explained.
```

## Card Identity

```text
canonicalCardId:
  언어, 번역, BGA 이름, 판본 차이를 넘어 카드를 식별하는 내부 고유 id.
  추천, 통계, 전략 프로필, fixture는 모두 canonicalCardId를 기준으로 연결한다.

translation:
  특정 locale에서의 카드 이름, 효과 텍스트, 공식명, BGA명, 설명.

displayName:
  현재 사용자 locale과 우선순위 규칙에 따라 화면에 보여주는 이름.
  저장 원본이 아니라 렌더링 결과다.

alias:
  검색과 매핑을 돕기 위한 대체 이름.
  영문명, BGA 번역명, 코보게 공식명, 오탈자, 약칭 등을 포함할 수 있다.
```

정책:

```text
Never use card name as primary key.
Use canonicalCardId for joins.
Compute displayName at render time.
Use alias only for search and import matching.
```

## Tag, Mechanic, StrategyRole

```text
tag:
  검색, 필터, 화면 표시, 콘텐츠 연결을 위한 넓은 분류 라벨.
  예: grain, field, animal, early, late_scoring, conditional

mechanic:
  카드 텍스트가 실제로 어떻게 작동하는지를 나타내는 규칙/발동 구조.
  예: use_action_space, play_card, harvest_phase, before_action_space, after_action_space

strategyRole:
  드래프트 추천과 손패 진단에서 카드가 맡는 전략적 역할.
  예: field_engine, grain_supply, food_engine, fence_support, late_bonus_points
```

핵심 구분:

```text
mechanic = 룰상 어떻게 작동하는가
tag = 어떻게 찾아볼 것인가
strategyRole = 추천 판단에서 무슨 문제를 해결하는가
```

`strategyRole`은 카드 텍스트의 기능 그 자체가 아니라, 추천과 손패 진단에서 쓰는 전략적 의미다.

## Plan Language

```text
plan:
  게임에서 점수와 생존을 달성하기 위한 운영 방향.
  예: 빠른 가족성장, 곡식-빵 엔진, 목축 중심, 설비 점수, 2방 2가족 버티기

engine:
  반복적으로 이득을 만들거나 여러 라운드에 걸쳐 행동 효율을 높이는 구조.
  예: food engine, field engine, wood engine

combo:
  특정 카드/역할/행동 조건이 함께 있을 때 개별 가치보다 큰 보상을 만드는 구체적 조합.

synergy:
  두 카드나 역할이 서로의 가치를 올리는 넓은 관계.
  모든 combo는 synergy지만, 모든 synergy가 combo는 아니다.
```

핵심 구분:

```text
plan = 전체 운영 방향
engine = 반복 이득 구조
combo = 구체적 조합
synergy = 가치 상승 관계
```

## Solves, Supports, PartialSolves

```text
solves:
  카드 한 장이 해당 전략 문제를 실질적으로 해결한다.
  이후 같은 역할의 카드는 포화도 감점 대상이 될 수 있다.

supports:
  해당 전략 문제에 도움을 주지만 해결했다고 보지는 않는다.
  같은 역할의 카드가 더 필요할 수 있고, 포화도 감점도 약하게만 적용한다.

partialSolves:
  특정 조건에서는 해결에 가깝지만 추가 연결고리나 실행 조건이 필요하다.
  조건이 충족되면 solves처럼 취급할 수 있고, 조건이 없으면 supports에 가깝다.
```

예:

```text
식량 1~2개를 주는 카드:
  food_support를 supports한다.
  food_engine을 solves하지 않는다.

반복적으로 가족을 먹여살릴 수 있는 카드:
  food_engine을 solves한다.

곡식을 주지만 빵굽기 접근이 없는 카드:
  grain_supply는 solves할 수 있다.
  food_engine은 partialSolves 또는 supports에 가깝다.

밭일 감독:
  field_engine 또는 grain_seeds_action_upgrade를 solves한다.
  전체 농경/식량 플랜을 혼자 solves하지는 않는다.
```

## Broken, Premium, Plan Anchor

```text
premium:
  티어, 통계, 범용성 기준으로 매우 강한 카드.
  높은 WtdPWR, 낮은 ADP, 높은 티어, 높은 채용률 등으로 후보화할 수 있다.

planAnchor:
  이 카드를 중심으로 이후 드래프트와 운영 방향을 잡을 수 있는 카드.
  반드시 최상위 티어일 필요는 없지만, 후속 role 요구를 만든다.

broken:
  단순히 강한 카드를 넘어서 게임의 정상 행동 비용, 제약, 점수 구조를 크게 우회하거나 왜곡하는 카드.
  confirmed broken으로 두려면 구조적 이유가 필요하다.
```

관계:

```text
premium = 강도 중심
planAnchor = 플랜 형성 중심
broken = 제약 우회/액션 압축/공짜 보상 중심
```

정책:

```text
High tier/stat can create premiumCandidate.
High tier/stat alone should not create confirmed broken.
Confirmed broken requires a structural reason.
```

`banned` 또는 `strong_excluded`는 카드 풀/대회 정책상 제외된 상태다. broken 여부와 관련은 있지만 같은 개념은 아니다.

## Scoring Concepts

```text
passRegret:
  지금 내 플랜과 완전히 맞지 않더라도, 카드 자체의 객관적 강도, 티어, ADP, 희소성, 플랜 재편 가능성 때문에 넘겼을 때 후회할 가능성을 나타내는 값.

pivotPotential:
  후보 카드가 기존 손패와 직접 맞지는 않더라도, 그 카드를 중심으로 새 플랜을 만들 수 있는 정도.

saturationPenalty:
  이미 해결했거나 충분히 보유한 role을 또 집어서 한계효용이 줄어드는 비용.

conflictCost:
  후보 카드가 기존 손패와 단순히 역할이 겹치는 정도가 아니라, 실제 실행 자원, 액션 타이밍, 조건, payoff 방향을 충돌시켜 기존 플랜과 후보 카드를 함께 살리기 어렵게 만드는 비용.
```

예:

```text
밭일 감독 + 추수용 낫:
  grain/농경 축이 일부 겹치므로 saturationPenalty는 있을 수 있다.
  하지만 기존 플랜을 망치지 않으므로 conflictCost는 낮다.
  곡식을 빵굽기, 파종, 점수 보완으로 전환할 수 있으면 중복 비용도 줄어든다.
```

broken card는 초반에 매우 높은 기본 가치를 갖고, 웬만한 saturationPenalty와 conflictCost에도 추천 상위권을 유지한다. 다만 이미 같은 역할이 해결됐거나 기존 손패와 강하게 충돌하면 그 비용을 완전히 무시하지는 않는다.

## Food Language

```text
food_engine:
  매 수확 주기의 먹여 살리기 요구량을 안정적으로 감당하게 해주는 식량 플랜.

food_support:
  일회성 또는 소량의 식량 완충.
  초반 압박을 줄여주지만 이것만으로 가족을 먹여살리는 플랜이 완성되지는 않는다.

food_conversion:
  자원, 동물, 곡식, 채소 등을 음식으로 바꾸는 통로.
  일부 conversion은 먹여 살리기 단계에 직접 작동하지만, 생산 축이 없으면 혼자서 food_engine이 되지는 않는다.

food_self_sufficiency:
  카드 기반으로 음식 플랜의 자립성이 높아진 상태.
  주요 설비나 인기 액션 칸에 덜 의존해도 수확을 버틸 수 있다.
```

UI와 설명에서는 "food engine이 없어서 실패"보다 "식량 플랜의 카드 기반 자립성이 낮다"처럼 표현한다.

## Draft Memory

```text
seen:
  사용자가 실제로 본 카드.

picked:
  내가 선택해서 내 손패에 들어온 카드.

passed:
  내가 본 pack에서 고르지 않고 넘긴 카드.

missingFromPreviousPack:
  이전에 봤던 pack에는 있었는데, 돌아온 pack에서는 보이지 않는 카드.
```

Draft context에서는 사라진 카드를 `taken` domain state로 모델링하지 않는다. 사라진 카드는 누군가 선택했을 가능성이 높지만, 드래프트 중에는 특정 상대나 플랜을 확정하지 않는다.

Game/review context에서 특정 플레이어가 공개적으로 사용했거나 사후 입력으로 소유가 확인된 카드는 나중에 `confirmedOpponentCard` 같은 별도 모델로 다룰 수 있다.

## Role Availability Pressure

```text
roleAvailabilityPressure:
  드래프트 중 내가 본 카드 흐름을 기준으로, 특정 strategyRole을 나중에 확보하기 어려워졌을 수 있다는 압력 신호.
```

이 값은 상대 플랜 추론도 아니고 남은 카드 풀에 대한 확정 확률도 아니다.

약하게 반영하는 입력:

```text
- 이전 pack에서 사라진 카드의 role
- 사라진 카드가 premium/broken/planAnchor였는지
- 같은 role 후보가 다시 보이는지
- 현재 내 손패가 그 role을 필요로 하는지
- draftPickBand가 얼마나 뒤쪽인지
```

추천 점수에는 약하게 반영하고, 설명과 deep/review에는 더 적극적으로 보여준다.

## Candidate Group

`candidateGroup`은 현재 pick에서 추천 후보들을 같은 판단 이유끼리 묶은 그룹이다. 카드의 영구 태그가 아니라, 현재 손패와 draftPickBand에 따라 매번 달라지는 추천 결과 분류다.

초기 후보:

```text
broken_candidate
premium_candidate
plan_anchor_candidate
role_completion_candidate
support_candidate
penalty_prevention_candidate
ready_bonus_points_candidate
food_stability_candidate
high_pass_regret_candidate
risky_conditional_candidate
```

candidateGroup은 추천 이유와 화면 구조에 쓰인다. score component 그 자체는 아니지만, 어떤 component가 강하게 작동했는지 설명하는 label 역할을 한다.

## Draft Time And Game Time

`phase`는 공식 룰의 round/harvest 절차에만 사용한다. 드래프트 추천 구간에는 쓰지 않는다.

```text
draftPick:
  드래프트의 1~7번째 선택 순서.

draftPickBand:
  추천 로직에서 draftPick들을 묶는 판단 구간.
  예: early_anchor, middle_direction, late_completion

round:
  실제 게임의 1~14라운드.

roundPhase:
  공식 라운드 내부 절차.
  예: preparation, work, returning_home, harvest

harvestStep:
  수확 내부 절차.
  예: field, feeding, breeding

gameStage:
  수확으로 끊기는 6개 게임 주기.
  Stage 1 = rounds 1~4
  Stage 2 = rounds 5~7
  Stage 3 = rounds 8~9
  Stage 4 = rounds 10~11
  Stage 5 = rounds 12~13
  Stage 6 = round 14
```

## Game Preset And Card Pool

```text
GamePreset:
  BGA 사용자 설정 묶음.
  드래프트 포맷, 강카드 제외, 약카드 제외, 카드 덱, 추가 행동 칸, 스네이크 오프닝 같은 게임 설정을 포함한다.

CardPoolProfile:
  GamePreset과 카드 덱 설정을 반영해 실제 추천 후보가 되는 카드 풀 snapshot.

CardPoolStatus:
  CardPoolProfile 안에서 각 카드가 추천 후보인지 아닌지를 나타내는 카드별 상태.
```

관계:

```text
GamePreset -> CardPoolProfile -> CardPoolStatus
```

CardPoolStatus:

```text
active:
  현재 선택한 카드 풀에서 실제로 나올 수 있는 카드.

weak_excluded:
  너무 약한 카드 금지 때문에 제외된 카드.

strong_excluded:
  대회 기준/강카드 제외 때문에 제외된 카드.

banned:
  룰 또는 대회 정책상 금지된 카드.

inactive:
  선택한 덱/카드풀/환경에 포함되지 않거나 정확한 제외 사유를 아직 모르는 카드.
```

드래프트 추천 기본 후보는 `active`만 사용한다. 카드 검색/학습에서는 active가 아니어도 검색 가능해야 하며 제외 이유를 보여줄 수 있다.

## Validation And Mismatch

```text
validationError:
  데이터 자체가 잘못되었거나 시스템이 처리할 수 없는 입력.
  계산을 막거나 데이터 수정이 필요하다.

settingMismatch:
  데이터는 유효하지만 현재 GamePreset/CardPoolProfile/DraftFormat과 맞지 않는 입력.
  사용자가 입력을 수정하거나 세션 설정을 바꿔 해결할 수 있다.
```

에러 복구 UX는 별도 의사결정으로 남긴다.

## Confidence, Curation, Source

```text
sourceRef:
  이 값이나 판단이 어디에서 왔는지 추적한다.
  출처가 있다는 뜻이지, 맞다는 뜻은 아니다.

confidence:
  이 값이나 판단이 얼마나 믿을 만한지 나타낸다.
  추천이 맞을 확률이 아니라 데이터/판단 검증 수준이다.

curationStatus:
  이 값이나 판단이 현재 데이터 구축 workflow에서 어느 상태인지 나타낸다.
```

관계:

```text
sourceRef = 어디서 왔는가
confidence = 얼마나 믿을 만한가
curationStatus = 현재 검수 workflow 상태가 무엇인가
```

`disputed`는 curationStatus에 둔다. confidence는 근거 유형/검증 수준을 나타낸다.

권장 enum:

```text
CurationStatus:
  inferred
  external_prefilled
  manually_verified
  fixture_verified
  disputed
  needs_review

Confidence:
  official_verified
  bga_verified
  manual_verified
  fixture_verified
  stat_inferred
  text_inferred
  community_inferred
  unverified
```

## Manual Curation And External Prefill

```text
automatedInference:
  내부 규칙, 카드 텍스트, 통계, 외부 source에서 데이터를 자동 추출하거나 후보화하는 작업.

externalSourcePrefill:
  외부 티어표, 통계, 카드 DB, 공략글, 커뮤니티 자료에서 구조화 가능한 값을 먼저 채워 넣는 작업.

manualCuration:
  자동 추론 또는 externalSourcePrefill 결과 중, 추천에 큰 영향을 주는 값만 사람이 검수하고 확정하는 작업.
```

정책:

```text
Manual curation should be selective, not exhaustive.
```

모든 카드 텍스트를 사용자가 직접 검수하는 흐름은 피한다. 사람은 broken, planAnchor, solves/supports, saturation, tricky cardRuling, high-impact explanation처럼 추천 품질에 큰 영향을 주는 부분에 집중한다.

## Snapshot And Screenshot

```text
snapshot:
  특정 시점의 외부 데이터 상태를 보존한 versioned dataset.
  recommendation reproducibility를 위해 참조한다.

screenshot:
  사용자가 업로드한 화면 이미지 artifact.
  raw input이며, OCR 후 RecognitionResult와 Observation으로 변환된다.
  snapshot이라고 부르지 않는다.
```

구분:

```text
snapshot.collectedAt:
  외부 데이터가 수집된 시점

screenshot.capturedAt / screenshot.uploadedAt:
  사용자가 게임 화면을 찍거나 업로드한 시점
```

흐름:

```text
Snapshot
-> DataIndex / CardPoolProfile / Stats
-> Recommendation

Screenshot
-> RecognitionResult
-> Confirmed Observation
-> Recommendation
```

## OCR And Observation

```text
InputSource:
  정보가 어떤 경로로 들어왔는지 나타낸다.
  예: manual, ocr, import, correction

RecognitionResult:
  OCR/이미지 인식이 만든 후보와 recognitionConfidence.

Observation:
  사용자가 실제로 본 게임/드래프트 상태를 구조화한 확정 기록.

Recommendation:
  confirmed observation에 대해서만 계산한다.
```

정책:

```text
Low recognitionConfidence blocks observation confirmation.
It does not directly lower recommendationConfidence.

If recognition is unresolved:
  do not score.
  ask for user confirmation, correction, or retake.

If observation is confirmed:
  score normally.
```

## Draft Records

```text
DraftSet:
  한 게임 시작 전 전체 드래프트 묶음.
  보통 직업 DraftSequence와 보조 설비 DraftSequence를 포함한다.

DraftSequence:
  하나의 카드 타입에 대한 순서 있는 7픽 드래프트 기록.
  최종 7장의 선택 카드가 만들어지는 단위다.

DraftPick:
  DraftSequence 안의 개별 선택 단계.

DraftPickObservation:
  특정 DraftPick에서 사용자가 실제로 본 visible pack 기록.

DraftDecision:
  특정 DraftPick에서 사용자가 고른 카드.

DraftRecommendation:
  특정 DraftPickObservation에 대한 추천 결과.

DraftDecisionFeedback:
  추천과 실제 선택의 차이나 나중 근거를 기록한 학습 신호.
```

bare `session`은 core domain term으로 쓰지 않는다. `session`은 app/browser technical state에만 사용한다.

## Hand And Plan

```text
pickedCards:
  드래프트에서 내가 이미 선택한 카드 목록.

hand:
  실제 게임 시작 시 또는 플레이 중 내가 보유한 카드 전체.
  드래프트가 끝나면 pickedCards가 초기 hand가 된다.

currentPlan:
  현재 pickedCards 또는 hand를 바탕으로 추론한 운영 방향.
  사실 상태가 아니라 해석이다.

HandProfile:
  pickedCards/hand에서 계산한 role coverage, solved roles, needed roles, saturation state, plan candidates의 묶음.

PlanCandidate:
  HandProfile에서 추론된 가능한 운영 방향.
```

정책:

```text
pickedCards and hand are facts.
currentPlan and PlanCandidate are interpretations.
```

## Need And Next Pick

```text
need:
  현재 손패나 게임 상태가 앞으로 요구할 가능성이 있는 자원/역할/행동 축.
  예: food, reed, room_building, bake_bread_access

roleGap:
  현재 HandProfile에서 아직 충분히 해결되지 않은 strategyRole.
  드래프트 추천에서 보완 후보를 찾는 근거가 된다.

nextPickDirection:
  다음 draftPick에서 우선적으로 살펴볼 role 또는 카드 성격에 대한 안내.
  반드시 하나의 정답 카드가 아니라 방향성이다.
```

`nextPickDirection`은 부족한 것 목록 전체가 아니다. 현재 선택 이후 다음 픽에서 유효하게 볼 우선 방향이다.

## Board Concepts

```text
action:
  플레이어가 사람 1개를 놓아 수행하거나 카드 효과로 수행하는 행동.

actionSpace:
  보드 위에 있는 사람 배치 칸.
  보통 사람 1개를 놓아 action을 수행한다.

accumulationSpace:
  round preparation에서 정해진 quantity만큼 goods가 누적되는 actionSpace.
  플레이어가 그 칸을 사용하면 현재 누적된 goods를 모두 가져가고, 그 칸은 비워진다.

majorImprovement:
  공용 공급처에 공개된 주요 설비 객체.
  actionSpace가 아니라 action을 통해 가져오는 대상이다.
```

핵심 구분:

```text
actionSpace는 칸이다.
action은 수행되는 행동이다.
accumulationSpace는 누적되는 actionSpace subtype이다.
majorImprovement는 공용 설비 객체다.
```

v0 드래프트 코치에서는 얕게만 필요하지만, 나중에 in-game coach에서는 `amountPerRound`, `currentAmount`, `revealedFromRound`가 중요해진다.

## Recommendation Language

```text
recommendation:
  특정 context에서 시스템이 제안하는 선택, 순위, 행동 방향.
  공유 문서와 exported code에서는 반드시 context prefix를 붙인다.

reason:
  recommendation을 뒷받침하는 근거.

risk:
  추천을 따를 때의 조건부 약점이나 실패 가능성.

warning:
  즉시 주의하거나 수정해야 하는 문제.
```

핵심 구분:

```text
risk explains tradeoff.
warning asks for attention or correction.
```

공유 타입 예:

```text
DraftRecommendation
DraftRecommendationReason
DraftRecommendationRisk
DraftWarning
```

## Rule Language

```text
gameRule:
  공식 룰북/게임 시스템 규칙.
  예: 수확은 밭 단계 -> 먹여 살리기 단계 -> 번식 단계 순서로 처리한다.

cardRuling:
  카드별 텍스트, 타이밍, 예외 판정.
  예: "보조 설비를 낼 때"와 "보조 설비 행동 칸을 사용할 때"의 차이.

productPolicy:
  서비스가 의도적으로 지키는 제품 원칙.
  예: 드래프트 중 사라진 카드를 특정 상대 손패로 확정 표시하지 않는다.
```

long-lived domain docs와 code에서는 bare `rule`, `ruling`, `policy`보다 `gameRule`, `cardRuling`, `productPolicy`를 사용한다.

## Content Language

```text
guide:
  독립적으로 읽을 수 있는 전략 학습 콘텐츠.
  예: 가족 늘리기 경쟁, 화로 경쟁, 울타리와 목축 운영

strategyNote:
  카드나 역할에 붙는 짧은 수동 전략 메모.
  데이터 큐레이션과 카드 상세에 쓰인다.

explanation:
  특정 추천 결과를 사용자의 현재 입력에 맞춰 설명한 문장 묶음.

reason:
  explanation을 구성하는 개별 근거.
```

관계:

```text
guide = 독립 학습 문서
strategyNote = 카드/역할에 붙는 정적 메모
explanation = 현재 상황에 맞춘 동적 설명
reason = explanation의 개별 근거
```

## Fixture Language

```text
fixture:
  추천 엔진이 특정 전략 가설을 일관되게 처리하는지 검증하는 시나리오.
  절대 정답이 아니라 현재 근거 수준에서 채택한 검증 가설이다.

expected:
  fixture에서 기대하는 추천 결과나 component 조건.

judgmentBasis:
  expected가 왜 그렇게 정해졌는지 설명하는 근거.

fixtureConfidence:
  이 fixture의 판단 기준이 얼마나 안정적인지 나타내는 값.

reviewStatus:
  fixture가 아직 가설인지, 검토되었는지, 논쟁 중인지, 대체되었는지 나타내는 상태.
```

추천 enum:

```text
fixtureConfidence:
  consensus
  strong_evidence
  manual_hypothesis
  disputed
  exploratory

reviewStatus:
  draft
  accepted
  needs_review
  superseded
```

Fixture expected values are provisional strategic hypotheses, not permanent truths. They test whether the recommendation process follows the currently accepted judgment. A fixture can be revised, downgraded, disputed, or superseded when stronger player feedback, statistics, or review evidence appears.

## User Skill

```text
userSkillLevel:
  사용자가 직접 선택하는 설명/UX 수준.
  실제 실력이나 ELO를 시스템이 자동 판정한 값이 아니다.

elo:
  BGA 등 외부 플랫폼의 수치형 실력 지표.
  v0에서는 사용자가 직접 입력하지 않는 한 알 수 없다.

userSkillEstimate:
  시스템이 피드백이나 사용 패턴으로 추정할 수 있는 선택적 값.
  v0에서는 unknown을 기본값으로 둔다.
```

정책:

```text
userSkillLevel does not disable scoring components.
It only changes explanation density, terminology, and UI emphasis.
```

표시 기준:

```text
beginner:
  판단 결과 중심.
  내부 용어를 숨기고 카드가 해결하는 문제와 당장 조심할 리스크를 설명한다.

intermediate:
  판단 이유와 역할 균형 중심.
  role, 중복, 돌아올 가능성, 다음 픽 방향을 설명한다.
  passRegret 같은 내부 용어는 덜 드러내되 개념은 설명한다.

advanced:
  판단 구조와 component tradeoff 중심.
  passRegret, roleAvailabilityPressure, draft memory, component tradeoff를 직접 보여줄 수 있다.
```
