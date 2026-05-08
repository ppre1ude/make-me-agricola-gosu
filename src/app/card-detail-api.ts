import type {
  Card,
  CardPoolStatus,
  CardStatRow,
  CardStrategyProfile,
  CardTranslation,
  StrategyRole
} from "../features/draft/index.ts";
import type { DraftCoachDataContext, DraftCoachSourceRef } from "./draft-coach-api.ts";

export type CardDetailStrategyRole = Pick<StrategyRole, "id" | "labels" | "description" | "saturationBehavior">;

export type CardDetailSourceScope = "card" | "translation" | "strategyProfile" | "cardPoolProfile";

export type CardDetailSourceAttribution = {
  sourceRef: string;
  label: string;
  scopes: CardDetailSourceScope[];
  author?: string;
  sourceUrl?: string;
  snapshotDate?: string;
  attributionTextKo?: string;
};

export type CardDetailResponse = {
  card: Card;
  cardPoolStatus?: CardPoolStatus;
  translation?: CardTranslation;
  stat?: CardStatRow;
  strategyProfile?: CardStrategyProfile;
  strategyRoles: CardDetailStrategyRole[];
  sourceRefs: string[];
  sourceAttributions: CardDetailSourceAttribution[];
  interpretation: string[];
};

export function getCardDetail(cardId: string, context: DraftCoachDataContext): CardDetailResponse | null {
  const normalizedCardId = cardId.trim();
  if (!normalizedCardId) return null;

  const card = context.dataIndex.cardsById.get(normalizedCardId);
  if (!card) return null;

  const translation = context.dataIndex.translationsByCardId.get(normalizedCardId);
  const stat = context.dataIndex.statsByCardId.get(normalizedCardId);
  const strategyProfile = context.dataIndex.profilesByCardId.get(normalizedCardId);
  const strategyRoles =
    strategyProfile?.roles
      .map((roleId) => context.dataIndex.rolesById.get(roleId))
      .filter((role): role is StrategyRole => role !== undefined)
      .map(toCardDetailStrategyRole) ?? [];
  const cardPoolStatus = context.data.cardPoolProfile.cardStatuses[normalizedCardId];
  const sourceAttributions = buildSourceAttributions(
    [
      { scope: "card", sourceRefs: card.sourceRefs },
      { scope: "translation", sourceRefs: translation?.sourceRefs ?? [] },
      { scope: "strategyProfile", sourceRefs: strategyProfile?.sourceRefs ?? [] },
      { scope: "cardPoolProfile", sourceRefs: context.data.cardPoolProfile.sourceRefs }
    ],
    context.sourceRefsById
  );

  return {
    card,
    ...(cardPoolStatus === undefined ? {} : { cardPoolStatus }),
    ...(translation === undefined ? {} : { translation }),
    ...(stat === undefined ? {} : { stat }),
    ...(strategyProfile === undefined ? {} : { strategyProfile }),
    strategyRoles,
    sourceRefs: sourceAttributions.map((source) => source.sourceRef),
    sourceAttributions,
    interpretation: buildCardInterpretation(stat, strategyProfile)
  };
}

function toCardDetailStrategyRole(role: StrategyRole): CardDetailStrategyRole {
  return {
    id: role.id,
    labels: role.labels,
    ...(role.description === undefined ? {} : { description: role.description }),
    ...(role.saturationBehavior === undefined ? {} : { saturationBehavior: role.saturationBehavior })
  };
}

function buildSourceAttributions(
  entries: Array<{ scope: CardDetailSourceScope; sourceRefs: string[] }>,
  sourceRefsById: Map<string, DraftCoachSourceRef>
): CardDetailSourceAttribution[] {
  const sourceScopes = new Map<string, Set<CardDetailSourceScope>>();

  for (const entry of entries) {
    for (const sourceRef of entry.sourceRefs) {
      const normalizedSourceRef = sourceRef.trim();
      if (!normalizedSourceRef) continue;

      const scopes = sourceScopes.get(normalizedSourceRef) ?? new Set<CardDetailSourceScope>();
      scopes.add(entry.scope);
      sourceScopes.set(normalizedSourceRef, scopes);
    }
  }

  return [...sourceScopes.entries()].map(([sourceRef, scopes]) =>
    toSourceAttribution(sourceRef, [...scopes], sourceRefsById.get(sourceRef))
  );
}

function toSourceAttribution(
  sourceRef: string,
  scopes: CardDetailSourceScope[],
  source: DraftCoachSourceRef | undefined
): CardDetailSourceAttribution {
  return {
    sourceRef,
    label: source?.title ?? sourceLabel(sourceRef),
    scopes,
    ...(source?.author === undefined ? {} : { author: source.author }),
    ...(source?.sourceUrl === undefined ? {} : { sourceUrl: source.sourceUrl }),
    ...(source?.snapshotDate === undefined ? {} : { snapshotDate: source.snapshotDate }),
    ...(source?.attributionTextKo === undefined ? {} : { attributionTextKo: source.attributionTextKo })
  };
}

function sourceLabel(sourceRef: string): string {
  if (sourceRef === "manual-prototype-seed") return "Manual prototype seed";
  return sourceRef.replace(/[-_]+/g, " ");
}

function buildCardInterpretation(
  stat: CardStatRow | undefined,
  profile: CardStrategyProfile | undefined
): string[] {
  const lines: string[] = [];

  if (stat?.adp !== undefined) {
    if (stat.adp <= 3) {
      lines.push("ADP가 낮아 초반에 자주 집히는 카드입니다.");
    } else if (stat.adp >= 6) {
      lines.push("ADP가 높아 후반에도 남을 가능성이 상대적으로 있습니다.");
    } else {
      lines.push("ADP가 중간권이라 팩 맥락에 따라 우선도가 달라집니다.");
    }
  }

  if (stat?.apr !== undefined && stat?.adp !== undefined && stat.apr - stat.adp >= 2) {
    lines.push("APR이 ADP보다 높아 실제 플레이는 드래프트보다 늦게 이뤄지는 편입니다.");
  }

  if (stat?.drafted !== undefined && stat?.plays !== undefined && stat.drafted > 0) {
    const playRate = stat.plays / stat.drafted;
    if (playRate < 0.45) {
      lines.push("Drafted 대비 Plays가 낮아 조건부 카드일 가능성이 있습니다.");
    }
  }

  if (profile?.isBroken) {
    lines.push("전략 프로필에서 broken 후보로 표시된 고영향 카드입니다.");
  } else if (profile?.isPlanAnchor) {
    lines.push("전략 프로필에서 중심 플랜을 여는 앵커 카드로 표시됩니다.");
  }

  if (profile?.riskTags.length) {
    lines.push("리스크 태그가 있어 현재 손패와 후속 확보 여부를 함께 확인해야 합니다.");
  }

  if (lines.length === 0) {
    lines.push("현재 큐레이션 데이터가 제한적이므로 통계와 전략 역할을 참고 지표로만 보세요.");
  }

  return lines;
}
