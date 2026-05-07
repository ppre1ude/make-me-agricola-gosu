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

### 데이터

```ts
type DraftSession = {
  id: string;
  createdAt: string;
  playerCount: number;
  cardPool?: string[];
  picks: DraftPick[];
  seenCardIds: string[];
  handCardIds: string[];
};

type DraftPick = {
  round: number;
  pickNumber: number;
  offeredCardIds: string[];
  selectedCardId?: string;
  passedCardIds?: string[];
  source: "manual" | "ocr";
};
```

### 초기 기능

- 현재 후보 카드 저장
- 내가 고른 카드 저장
- 지나간 카드 목록 보기
- 지나간 카드 중 위험한 콤보 카드 표시
- 내 손패 태그 분포 업데이트

### 나중 기능

- 드래프트 복기
- 내가 놓친 고평가 카드 표시
- ADP 대비 이상한 픽 패턴 분석
- 개인 선호 태그 분석

## 공정성 원칙

트래킹은 사용자가 직접 본 카드와 입력한 카드만 대상으로 한다.

제공하지 않는 기능:

- 숨겨진 카드 추론
- 상대 손패 자동 추정
- 비공개 BGA 데이터 수집
- 자동 행동 선택
- 자동 플레이

