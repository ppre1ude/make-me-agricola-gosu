# Agricola Assistant Planning Docs

이 문서들은 아그리콜라 보조 Web 사이트를 실제로 구현하기 위한 기준 문서입니다.

서비스의 1차 페르소나는 한국어 BGA 아그리콜라 유저입니다. 다만 데이터 모델과 콘텐츠 구조는 처음부터 다국어, 신규 카드, 신규 통계, 오프라인 플레이 인식까지 확장할 수 있도록 설계합니다.

## 문서 목록

- [00 Vision](./00-vision.md): 제품 목표, 페르소나, 핵심 가치
- [01 Product Requirements](./01-product-requirements.md): 기능 요구사항과 MVP 범위
- [02 Information Architecture](./02-information-architecture.md): 사이트 구조와 주요 화면
- [03 Data Model](./03-data-model.md): 카드, 번역, 통계, 태그, 콤보, 룰링 데이터 모델
- [04 Data Pipeline](./04-data-pipeline.md): 원본 데이터 수집, 정규화, seed 흐름
- [05 Feature Specs](./05-feature-specs.md): 카드 검색, 드래프트 추천, 전략 가이드 세부 명세
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
+ MDX guide pages
+ manual draft analyzer
```

이후 사용자별 기록, OCR 작업 큐, 데이터 업데이트 관리가 필요해질 때 Firestore, Supabase, 또는 별도 API 서버를 붙입니다.

## 1차 MVP 정의

1차 MVP는 다음 한 문장으로 정의합니다.

> 한국어/영문 카드명을 검색하면 카드 정보, 통계 티어, 태그, 기본 콤보를 보여주고, 드래프트 후보 카드를 수동 입력하면 추천 픽 순위를 알려주는 웹앱.
