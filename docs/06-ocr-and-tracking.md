# 06 OCR And Tracking

## 목표

BGA에서 아그리콜라를 플레이하는 중 스크린샷을 업로드하면 드래프트 카드 후보를 자동으로 인식한다.

초기 목표는 카드명 인식이다. 카드 전체 효과 텍스트 OCR은 MVP 범위가 아니다.

## BGA 스크린샷 인식 흐름

```text
사용자 업로드
→ 이미지 전처리
→ 카드 영역 감지
→ 제목 영역 crop
→ OCR
→ 카드 DB fuzzy match
→ confidence 계산
→ 사용자 검수
→ 드래프트 분석으로 전달
```

## 기술 후보

### OpenCV

용도:

- 카드 박스 영역 탐지
- 제목 영역 crop
- 이미지 보정
- 템플릿 매칭

초기에는 BGA 화면 레이아웃이 비교적 일정하므로 고정 비율 crop부터 시작할 수 있다.

### OCR

후보:

- Tesseract
- EasyOCR
- PaddleOCR
- Google Cloud Vision

초기 추천:

```text
BGA 영문 화면 기준 카드명 OCR
+ fuzzy matching
+ 사용자 검수
```

### Vision Model

OpenAI Vision 같은 멀티모달 모델은 OCR confidence가 낮을 때 보조 판정으로 사용한다.

장점:

- 흐린 글자나 문맥 추론에 강함
- JSON 구조화 응답 가능

주의:

- 비용
- latency
- hallucination
- 최종 판정은 DB match로 검증해야 함

## 카드명 매칭

OCR 결과는 반드시 카드 DB 후보와 매칭한다.

절차:

1. 정규화
   - lowercase
   - punctuation 제거
   - hyphen/space 통합
   - apostrophe 처리
2. exact match
3. alias match
4. fuzzy match
5. 후보 3개 표시

confidence가 낮으면 사용자가 직접 선택한다.

## 실물 사진 확장

오프라인 플레이 사진은 BGA보다 어렵다.

추가 난점:

- 원근 왜곡
- 조명 반사
- 카드 겹침
- 손가락 가림
- 한국어/영어 판본 차이
- 이미지 해상도 차이

확장 전략:

1. 단일 카드 사진 인식
2. 여러 카드가 나란히 있는 사진 인식
3. 드래프트 손패 전체 인식

## 드래프트 트래킹

### 목표

유저가 지나간 카드를 기억하는 부담을 줄인다.

v0의 트래킹 목표는 상대 손패를 맞히는 것이 아니라, 사용자가 실제로 본 정보와 선택한 카드를 잃어버리지 않는 것이다.

### 데이터

```ts
type DraftSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  playerCount: 4;
  cardPoolProfileId: string;
  draftFormat: {
    initialPackSize: 8 | 9 | 10;
    cardsKept: 7;
    totalPicks: 7;
  };
  draftCardType: "occupation" | "minor_improvement";
  explanationDepth: "compact" | "standard" | "deep";
  picks: DraftPick[];
  seenCardIds: string[];
  pickedCardIds: string[];
  passedCardIds: string[];
};

type DraftPick = {
  pickNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  inputMode: "full_pack" | "selected_only" | "corrected_pack";
  offeredCardIds: string[];
  selectedCardId?: string;
  passedCardIds?: string[];
  source: "manual" | "ocr" | "prediction";
};
```

### 초기 기능

- 1~4픽 full visible pack 저장
- 5~7픽 selected card 중심 저장
- 필요 시 반환 pack 수정 입력
- 내가 고른 카드 저장
- 지나간 카드 목록 보기
- 지나간 카드 중 위험한 콤보/역할 카드 표시
- 내 손패 전략 역할 분포 업데이트
- 이미 해결한 역할과 부족한 역할 표시
- 돌아올 가능성 힌트 표시

### 첫 4픽과 마지막 3픽

BGA Arena 드래프트에서는 첫 4픽이 새 정보를 가장 많이 만든다.

```text
Pick 1-4:
  full visible pack 입력
  selected card + passed cards 기록

Pick 5-7:
  돌아온 카드 중심
  selected card만 빠르게 기록
  예측이 틀리면 corrected pack 입력
```

이 구조는 OCR이 없어도 동작해야 한다. OCR은 입력 부담을 줄이는 보조 기능이다.

### 나중 기능

- 드래프트 복기
- 내가 놓친 고평가 카드 표시
- ADP 대비 이상한 픽 패턴 분석
- 개인 선호 태그 분석
- 실전 판세와 연결한 주요 설비/누적 칸 위험 경고

## 공정성 원칙

트래킹은 사용자가 직접 본 카드와 입력한 카드만 대상으로 한다.

허용:

- 사용자가 입력한 visible pack 기반의 seen/passed 기록
- ADP와 seen card 기반의 확률적 return likelihood
- "이 역할을 누군가 가져갔을 수 있음" 수준의 불확실한 신호 표시

금지:

- 상대가 가져간 카드를 확정적으로 표시
- 숨겨진 카드 정보를 자동 추론
- BGA 비공개 데이터 수집

제공하지 않는 기능:

- 숨겨진 카드 추론
- 상대 손패 자동 추정
- 비공개 BGA 데이터 수집
- 자동 행동 선택
- 자동 플레이
