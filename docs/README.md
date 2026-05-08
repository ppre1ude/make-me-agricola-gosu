# Agricola Korean Gosu Planning Docs

이 문서들은 BGA Arena 아그리콜라 드래프트 코치를 실제로 구현하기 위한 기준 문서입니다.

현재 제품 결론은 다음처럼 정리합니다.

```text
Product flow: Draft Memory Coach
Data-building flow: Strategy Knowledge Base
```

즉 사용자가 보는 제품은 드래프트 중 현재 픽을 판단해주는 도구이고, 내부 데이터 구축은 카드별 전략 역할, 룰링, 콤보, 통계, 운영 시퀀스를 쌓는 지식 베이스입니다.

## 최신 Grill-Me 결론

구현 전 인터뷰에서 닫은 현재 기준은 다음입니다.

- v0의 중심 기능은 Draft Memory Coach이며, 카드 검색은 드래프트 판단과 전략 학습을 돕는 기반 기능입니다.
- 추천의 정답 기준은 draftPickBand에 따라 다릅니다. Pick 1~2는 broken/premium/open-ended anchor, Pick 3~4는 강카드와 보완 역할의 균형, Pick 5~7은 현재 손패 완성도를 우선합니다.
- 고수용 기본 입력은 1~7픽 모두 full visible pack tracking입니다. selected-only 입력은 시간 압박이 큰 quick fallback입니다.
- 사라진 카드는 특정 상대의 플랜으로 확정하지 않고, role availability pressure와 사후 복기 신호로 약하게 사용합니다.
- `passRegret`은 boolean이 아니라 0~10 수치형 component입니다. 강카드를 넘겼을 때의 기회비용, 플랜 재편 가능성, 희소성을 표현합니다.
- 추천 숫자는 승률이 아닙니다. 기본 UI는 label과 설명을 우선하고, deep/debug에서 component breakdown을 보여줍니다.
- 모델 추천과 사용자 선택이 다르면 `model_user_disagreement`로 기록합니다. 이를 곧바로 모델 오류로 판정하지 않습니다.

## 문서 계층 기준

- Core Docs: 제품과 구현이 계속 의존하는 상위 계약입니다. 제품 방향, 도메인 언어, 요구사항, 데이터 모델, 기능 계약, 로드맵만 둡니다.
- Reference Docs: core를 이해하거나 구현할 때 필요한 배경 자료입니다. 화면 구조, 데이터 수집, 공식 룰, 전략론, 리스크처럼 필요할 때 꺼내 보는 문서입니다.
- Working Docs: 특정 단계의 실행 품질을 높이기 위한 작업 문서입니다. 완료되거나 결정이 core에 흡수되면 보관하거나 축약합니다.

## Core Docs

Codex와 사람이 이 프로젝트를 이해할 때 먼저 봐야 하는 핵심 문서입니다. 이 여섯 문서는 상위 구조 역할을 하며, 다른 문서와 구현은 여기에 적힌 결정을 기준으로 삼습니다.

- [00 Vision](./core/00-vision.md): 제품 목표, 페르소나, 핵심 가치
- [01 Domain Language](./core/01-domain-language.md): 구현과 문서 전체에서 사용하는 canonical domain language
- [02 Product Requirements](./core/02-product-requirements.md): 기능 요구사항과 MVP 범위
- [03 Data Model](./core/03-data-model.md): 카드, 번역, 통계, 전략 프로필, 드래프트 상태 모델
- [04 Feature Specs](./core/04-feature-specs.md): 카드 검색, 드래프트 코치, 전략 가이드 세부 명세
- [05 Roadmap](./core/05-roadmap.md): 단계별 개발 순서와 성공 기준

## Reference Docs

필요한 맥락이 있을 때 참조하는 문서입니다.

- [00 Information Architecture](./reference/00-information-architecture.md): 사이트 구조와 주요 화면
- [01 Data Pipeline](./reference/01-data-pipeline.md): 원본 데이터 수집, 정규화, seed 흐름
- [02 OCR And Tracking](./reference/02-ocr-and-tracking.md): BGA 스크린샷 인식과 드래프트 트래킹 설계
- [03 Risks And Policies](./reference/03-risks-and-policies.md): 저작권, BGA 공정성, 데이터 신뢰도 리스크
- [04 Open Questions](./reference/04-open-questions.md): 구현 전 추가 결정이 필요한 질문
- [05 Official Core Rules](./reference/05-official-core-rules.md): 공식 룰북 기반 개발용 핵심 규칙 명세
- [06 Advanced Strategy Framework](./reference/06-advanced-strategy-framework.md): 공략글 기반 고수용 전략 판단 프레임워크

## Working Docs

특정 구현 단계나 의사결정 게이트를 다루는 작업 문서입니다. 장기 제품 원칙보다는 현재 단계의 실행 품질을 높이는 데 사용합니다.

- [00 Pre-UI Engineering Review](./working/00-pre-ui-engineering-review.md):
  UI 구현 전 scoring contract, data validation, fixture matrix 검토
- [02 Superpowers Subagent Dispatch Plan](./working/02-superpowers-subagent-dispatch-plan.md):
  subagent-driven 작업 분배와 게이트 기록
- [03 Domain Fixture Human Review](./working/03-domain-fixture-human-review.md): 전략 fixture 사람 검수 가이드
- [04 Draft Memory Coach Vertical Slice](./working/04-draft-memory-coach-vertical-slice.md):
  로컬 API, draft state, feedback, smoke 테스트 세로 조각
- [05 Pre-UI Readiness Checkpoint](./working/05-pre-ui-readiness-checkpoint.md):
  와이어프레임 기반 UI 시작 전 최종 readiness 상태

## 현재 결론

초기 구현은 서버 DB부터 만들기보다 정적 JSON 기반으로 시작합니다.

```text
Next.js + TypeScript
+ local JSON data
+ non-UI draft scoring prototype
+ manual strategy profiles
+ Draft Memory Coach UI
```

이후 사용자별 기록, OCR 작업 큐, 피드백 수집, 데이터 업데이트 관리가 필요해질 때 Firestore, Supabase, 또는 별도 API 서버를 붙입니다.

## 1차 MVP 정의

1차 MVP는 다음 한 문장으로 정의합니다.

> BGA Arena 드래프트 중 보이는 카드와 내가 고른 카드를 입력하면, 현재 픽의 추천 카드, 이유, 리스크, 돌아올 가능성, 다음 픽 방향을 설명하는 드래프트 메모리 코치.

## v0에서 하지 않는 것

- 범용 아그리콜라 위키 완성
- 전체 A~E 카드의 완전한 전략 태깅
- 실시간 BGA 화면 자동 감시
- 상대 손패 확정 추론
- 자동 플레이 또는 자동 액션 선택
- 공용 서비스에서 카드 전문/커뮤니티 글 전문 복제
