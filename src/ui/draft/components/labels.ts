import type {
  DraftCandidateGroup,
  DraftCardType,
  DraftEvaluationMeta,
  DraftFormat,
  DraftPickBand,
  ExplanationDepth,
  ReturnLikelihood,
  TrackingMode
} from "../../../features/draft/index.ts";
import type { DraftSkillLevel } from "../contract-adapter.ts";

export const DRAFT_FORMAT_LABELS: Record<DraftFormat, string> = {
  "10-to-7": "10장 중 7장",
  "9-to-7": "9장 중 7장",
  "8-to-7": "8장 중 7장"
};

export const DRAFT_CARD_TYPE_LABELS: Record<DraftCardType, string> = {
  occupation: "직업",
  minor_improvement: "보조설비"
};

export const TRACKING_MODE_LABELS: Record<TrackingMode, string> = {
  selected_only: "선택 카드",
  full_pack: "전체 팩"
};

export const EXPLANATION_DEPTH_LABELS: Record<ExplanationDepth, string> = {
  compact: "간단",
  standard: "표준",
  deep: "상세"
};

export const SKILL_LEVEL_LABELS: Record<DraftSkillLevel, string> = {
  beginner: "입문",
  intermediate: "중급",
  advanced: "고급"
};

export const DRAFT_PICK_BAND_LABELS: Record<DraftPickBand, string> = {
  early_anchor: "초반 앵커",
  middle_direction: "중반 방향",
  late_completion: "후반 완성"
};

export const RETURN_LIKELIHOOD_LABELS: Record<ReturnLikelihood, string> = {
  unlikely: "돌아오기 어려움",
  possible: "돌아올 수 있음",
  likely: "돌아올 가능성 높음",
  unknown: "모름"
};

export const CONFIDENCE_LABELS: Record<DraftEvaluationMeta["confidence"], string> = {
  high: "신뢰도 높음",
  medium: "신뢰도 중간",
  low: "신뢰도 낮음"
};

export const EVALUATION_METHOD_LABELS: Record<DraftEvaluationMeta["method"], string> = {
  full_profile: "전략 프로필",
  stats_only: "통계 중심",
  profile_limited: "제한 프로필",
  fallback_basic: "기본 평가"
};

export const MISSING_DATA_LABELS: Record<DraftEvaluationMeta["missingData"][number], string> = {
  stat: "통계 누락",
  strategy_profile: "전략 프로필 누락",
  translation: "번역 누락"
};

export const CANDIDATE_GROUP_LABELS: Record<DraftCandidateGroup, string> = {
  broken_candidate: "브로큰 후보",
  premium_candidate: "강카드 후보",
  plan_anchor_candidate: "플랜 앵커",
  role_completion_candidate: "역할 완성",
  support_candidate: "보조 역할",
  penalty_prevention_candidate: "감점 방지",
  ready_bonus_points_candidate: "즉시 점수",
  food_stability_candidate: "음식 안정",
  high_pass_regret_candidate: "넘기기 아까움",
  risky_conditional_candidate: "조건부 리스크",
  general_value_candidate: "범용 가치",
  fallback_filler_candidate: "대체 후보"
};
