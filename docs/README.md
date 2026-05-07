# Agricola Korean Gosu Planning Docs

이 문서들은 BGA Arena 아그리콜라 드래프트 코치를 실제로 구현하기 위한 기준 문서입니다.

현재 제품 결론은 office-hours 결과를 반영해 다음처럼 정리합니다.

```text
Product flow: Draft Memory Coach
Data-building flow: Strategy Knowledge Base
```

즉 사용자가 보는 제품은 드래프트 중 현재 픽을 판단해주는 도구이고, 내부 데이터 구축은 카드별 전략 역할, 룰링, 콤보, 통계, 운영 시퀀스를 쌓는 지식 베이스입니다.

## 문서 목록

- [00 Vision](./00-vision.md): 제품 목표, 페르소나, 핵심 가치
- [01 Product Requirements](./01-product-requirements.md): 기능 요구사항과 MVP 범위
- [02 Information Architecture](./02-information-architecture.md): 사이트 구조와 주요 화면
- [03 Data Model](./03-data-model.md): 카드, 번역, 통계, 전략 프로필, 드래프트 상태 모델
- [04 Data Pipeline](./04-data-pipeline.md): 원본 데이터 수집, 정규화, seed 흐름
- [05 Feature Specs](./05-feature-specs.md): 카드 검색, 드래프트 코치, 전략 가이드 세부 명세
- [06 OCR And Tracking](./06-ocr-and-tracking.md): BGA 스크린샷 인식과 드래프트 트래킹 설계
- [07 Roadmap](./07-roadmap.md): 혼자 구현하기 위한 단계별 개발 순서
- [08 Risks And Policies](./08-risks-and-policies.md): 저작권, BGA 공정성, 데이터 신뢰도 리스크
- [09 Open Questions](./09-open-questions.md): 구현 전 추가 결정이 필요한 질문
- [10 Official Core Rules](./10-official-core-rules.md): 공식 룰북 기반 개발용 핵심 규칙 명세
- [11 Advanced Strategy Framework](./11-advanced-strategy-framework.md): 공략글 기반 고수용 전략 판단 프레임워크

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
