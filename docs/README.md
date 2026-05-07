# Agricola Korean Gosu Planning Docs

이 문서들은 BGA Arena 아그리콜라 드래프트 코치를 실제로 구현하기 위한 기준 문서입니다.

현재 제품 결론은 다음처럼 정리합니다.

```text
Product flow: Draft Memory Coach
Data-building flow: Strategy Knowledge Base
```

즉 사용자가 보는 제품은 드래프트 중 현재 픽을 판단해주는 도구이고, 내부 데이터 구축은 카드별 전략 역할, 룰링, 콤보, 통계, 운영 시퀀스를 쌓는 지식 베이스입니다.

## 문서 계층 기준

- Core Docs: 제품과 구현이 계속 의존하는 상위 계약입니다. 제품 방향, 요구사항, 데이터 모델, 기능 계약, 로드맵만 둡니다.
- Reference Docs: core를 이해하거나 구현할 때 필요한 배경 자료입니다. 화면 구조, 데이터 수집, 공식 룰, 전략론, 리스크처럼 필요할 때 꺼내 보는 문서입니다.
- Working Docs: 특정 단계의 실행 품질을 높이기 위한 작업 문서입니다. 완료되거나 결정이 core에 흡수되면 보관하거나 축약합니다.

## Core Docs

Codex와 사람이 이 프로젝트를 이해할 때 먼저 봐야 하는 핵심 문서입니다. 이 다섯 문서는 상위 구조 역할을 하며, 다른 문서와 구현은 여기에 적힌 결정을 기준으로 삼습니다.

- [00 Vision](./core/00-vision.md): 제품 목표, 페르소나, 핵심 가치
- [01 Product Requirements](./core/01-product-requirements.md): 기능 요구사항과 MVP 범위
- [02 Data Model](./core/02-data-model.md): 카드, 번역, 통계, 전략 프로필, 드래프트 상태 모델
- [03 Feature Specs](./core/03-feature-specs.md): 카드 검색, 드래프트 코치, 전략 가이드 세부 명세
- [04 Roadmap](./core/04-roadmap.md): 단계별 개발 순서와 성공 기준

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

- [00 Pre-UI Engineering Review](./working/00-pre-ui-engineering-review.md): UI 구현 전 scoring contract, data validation, fixture matrix 검토

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
