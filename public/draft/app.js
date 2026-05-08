(function () {
  "use strict";

  const endpoints = {
    sample: "/api/draft/sample",
    recommend: "/api/draft/recommend",
    feedback: "/api/draft/feedback"
  };

  const labels = {
    draftCardType: {
      occupation: "직업",
      minor_improvement: "보조설비"
    },
    trackingMode: {
      selected_only: "선택 카드",
      full_pack: "전체 팩"
    },
    explanationDepth: {
      compact: "간단",
      standard: "표준",
      deep: "상세"
    },
    draftPickBand: {
      early_anchor: "초반 앵커",
      middle_direction: "중반 방향",
      late_completion: "후반 완성"
    },
    returnLikelihood: {
      unlikely: "돌아오기 어려움",
      possible: "돌아올 수 있음",
      likely: "돌아올 가능성 높음",
      unknown: "모름"
    },
    confidence: {
      high: "신뢰도 높음",
      medium: "신뢰도 중간",
      low: "신뢰도 낮음"
    },
    method: {
      full_profile: "전략 프로필",
      stats_only: "통계 중심",
      profile_limited: "제한 프로필",
      fallback_basic: "기본 평가"
    },
    candidateGroup: {
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
    },
    missingData: {
      stat: "통계 누락",
      strategy_profile: "전략 프로필 누락",
      translation: "번역 누락"
    }
  };

  const allowed = {
    draftCardType: new Set(["occupation", "minor_improvement"]),
    draftFormat: new Set(["10-to-7", "9-to-7", "8-to-7"]),
    trackingMode: new Set(["selected_only", "full_pack"]),
    explanationDepth: new Set(["compact", "standard", "deep"])
  };

  const state = {
    input: null,
    recommendations: [],
    selectedCardId: null,
    samplePayload: null,
    cardNames: new Map(),
    requestBusy: false,
    feedbackBusy: false
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", function () {
    bindRefs();
    bindEvents();
    loadSample();
  });

  function bindRefs() {
    refs.appStatus = document.getElementById("appStatus");
    refs.loadSampleButton = document.getElementById("loadSampleButton");
    refs.recommendButton = document.getElementById("recommendButton");
    refs.draftMeta = document.getElementById("draftMeta");
    refs.offeredCards = document.getElementById("offeredCards");
    refs.pickedCards = document.getElementById("pickedCards");
    refs.seenCards = document.getElementById("seenCards");
    refs.passedCards = document.getElementById("passedCards");
    refs.recommendations = document.getElementById("recommendations");
    refs.recommendationStatus = document.getElementById("recommendationStatus");
    refs.feedbackForm = document.getElementById("feedbackForm");
    refs.modelTopCard = document.getElementById("modelTopCard");
    refs.selectedCard = document.getElementById("selectedCard");
    refs.feedbackNote = document.getElementById("feedbackNote");
    refs.feedbackHint = document.getElementById("feedbackHint");
    refs.feedbackStatus = document.getElementById("feedbackStatus");
    refs.submitFeedbackButton = document.getElementById("submitFeedbackButton");
  }

  function bindEvents() {
    refs.loadSampleButton.addEventListener("click", loadSample);
    refs.recommendButton.addEventListener("click", requestRecommendations);
    refs.feedbackForm.addEventListener("submit", submitFeedback);
  }

  async function loadSample() {
    setBusy(true);
    setAppStatus("샘플 로딩", "busy");
    setRecommendationStatus("샘플을 불러오는 중");
    clearFeedbackStatus();

    try {
      const payload = await fetchJson(endpoints.sample);
      state.samplePayload = payload;
      readCatalog(payload);
      state.input = normalizeDraftInput(extractDraftInput(payload), payload);
      state.recommendations = [];
      state.selectedCardId = null;
      renderDraftState();
      await requestRecommendations();
    } catch (error) {
      state.input = null;
      state.recommendations = [];
      state.selectedCardId = null;
      renderDraftState();
      renderRecommendations();
      showError(refs.recommendations, errorMessage(error, "샘플을 불러오지 못했습니다."));
      setRecommendationStatus("샘플 로딩 실패");
      setAppStatus("오류", "error");
      updateFeedbackPanel();
    } finally {
      setBusy(false);
    }
  }

  async function requestRecommendations() {
    if (!state.input) return;

    setBusy(true);
    setAppStatus("추천 계산", "busy");
    setRecommendationStatus("추천을 요청하는 중");
    clearFeedbackStatus();

    try {
      const payload = await fetchJson(endpoints.recommend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.input)
      });
      readCatalog(payload);
      state.recommendations = extractRecommendations(payload);
      state.selectedCardId = state.recommendations[0]?.cardId ?? null;
      renderDraftState();
      renderRecommendations();
      setRecommendationStatus(`${state.recommendations.length}개 카드 평가`);
      setAppStatus("준비됨", "ready");
    } catch (error) {
      state.recommendations = [];
      state.selectedCardId = null;
      renderRecommendations();
      showError(refs.recommendations, errorMessage(error, "추천을 가져오지 못했습니다."));
      setRecommendationStatus("추천 실패");
      setAppStatus("오류", "error");
    } finally {
      setBusy(false);
      updateFeedbackPanel();
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();

    const modelTopCardId = state.recommendations[0]?.cardId;
    const userSelectedCardId = state.selectedCardId;
    if (!state.input || !modelTopCardId || !userSelectedCardId || modelTopCardId === userSelectedCardId) {
      updateFeedbackPanel();
      return;
    }

    state.feedbackBusy = true;
    updateFeedbackPanel();
    setFeedbackStatus("피드백 전송 중");

    try {
      const payload = buildFeedbackPayload(modelTopCardId, userSelectedCardId);
      await fetchJson(endpoints.feedback, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      refs.feedbackNote.value = "";
      setFeedbackStatus("기록 완료");
    } catch (error) {
      setFeedbackStatus(errorMessage(error, "피드백을 기록하지 못했습니다."));
    } finally {
      state.feedbackBusy = false;
      updateFeedbackPanel();
    }
  }

  function buildFeedbackPayload(modelTopCardId, userSelectedCardId) {
    const note = refs.feedbackNote.value.trim();
    const event = {
      id: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      eventType: "model_user_disagreement",
      occurredAt: new Date().toISOString(),
      input: state.input,
      recommendationCardIds: state.recommendations.map(function (recommendation) {
        return recommendation.cardId;
      }),
      modelTopCardId,
      userSelectedCardId,
      reviewState: "unreviewed",
      possibleCauses: ["pilot_user_preference"]
    };

    if (note) event.note = note;
    return event;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, {
      ...(options || {}),
      headers: {
        Accept: "application/json",
        ...((options && options.headers) || {})
      }
    });
    const text = await response.text();
    let payload = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error(`JSON 응답이 아닙니다: ${response.status}`);
      }
    }

    if (!response.ok) {
      const message = payload?.message || payload?.error || `${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return payload ?? {};
  }

  function extractDraftInput(payload) {
    const candidates = [
      payload?.input,
      payload?.draftInput,
      payload?.draftState?.input,
      payload?.state?.input,
      payload?.sample?.input,
      payload
    ];

    const input = candidates.find(looksLikeDraftInput);
    if (!input) {
      throw new Error("샘플 응답에서 offeredCardIds와 pickNumber를 찾지 못했습니다.");
    }
    return input;
  }

  function looksLikeDraftInput(value) {
    return Boolean(value && typeof value === "object" && Array.isArray(value.offeredCardIds) && value.pickNumber !== undefined);
  }

  function normalizeDraftInput(input, payload) {
    const offeredCardIds = stringArray(input.offeredCardIds);
    const draftCardType = allowed.draftCardType.has(input.draftCardType)
      ? input.draftCardType
      : inferDraftCardType(offeredCardIds);
    const normalized = {
      playerCount: numberOr(input.playerCount, 4),
      draftCardType,
      pickNumber: clampPickNumber(input.pickNumber),
      offeredCardIds,
      pickedCardIds: stringArray(input.pickedCardIds),
      seenCardIds: stringArray(input.seenCardIds),
      passedCardIds: stringArray(input.passedCardIds),
      draftFormat: allowed.draftFormat.has(input.draftFormat) ? input.draftFormat : "10-to-7",
      trackingMode: allowed.trackingMode.has(input.trackingMode) ? input.trackingMode : "selected_only",
      cardPoolProfileId: stringOr(input.cardPoolProfileId, payload?.cardPoolProfile?.id || "bga-arena-prototype"),
      explanationDepth: allowed.explanationDepth.has(input.explanationDepth) ? input.explanationDepth : "standard"
    };

    const previousPackCardIds = stringArray(input.previousPackCardIds);
    const missingFromPreviousPack = stringArray(input.missingFromPreviousPack);
    if (previousPackCardIds.length > 0) normalized.previousPackCardIds = previousPackCardIds;
    if (missingFromPreviousPack.length > 0) normalized.missingFromPreviousPack = missingFromPreviousPack;

    return normalized;
  }

  function extractRecommendations(payload) {
    const candidates = [
      payload,
      payload?.recommendations,
      payload?.rankedRecommendations,
      payload?.result?.recommendations,
      payload?.data?.recommendations
    ];
    const recommendations = candidates.find(Array.isArray) || [];

    return recommendations
      .filter(function (recommendation) {
        return recommendation && typeof recommendation === "object" && typeof recommendation.cardId === "string";
      })
      .map(function (recommendation, index) {
        return {
          ...recommendation,
          rank: numberOr(recommendation.rank, index + 1),
          score: numberOr(recommendation.score, 0),
          candidateGroups: stringArray(recommendation.candidateGroups),
          risks: stringArray(recommendation.risks),
          warnings: Array.isArray(recommendation.warnings) ? recommendation.warnings : [],
          nextPickDirection: stringArray(recommendation.nextPickDirection),
          trackingSignals: Array.isArray(recommendation.trackingSignals) ? recommendation.trackingSignals : [],
          planShiftHints: Array.isArray(recommendation.planShiftHints) ? recommendation.planShiftHints : []
        };
      })
      .sort(function (a, b) {
        return a.rank - b.rank;
      });
  }

  function readCatalog(payload) {
    visitPayload(payload, function (item) {
      const cardId = stringOr(item.cardId, item.id);
      const name =
        item.name ||
        item.koreanName ||
        item.koName ||
        item.displayName ||
        item.translation?.name ||
        item.card?.name ||
        item.card?.translation?.name;

      if (cardId && typeof name === "string" && name.trim()) {
        state.cardNames.set(cardId, name.trim());
      }
    });
  }

  function visitPayload(value, visitor, depth) {
    const currentDepth = depth ?? 0;
    if (!value || currentDepth > 5) return;

    if (Array.isArray(value)) {
      value.forEach(function (item) {
        visitPayload(item, visitor, currentDepth + 1);
      });
      return;
    }

    if (typeof value !== "object") return;

    visitor(value);
    Object.keys(value).forEach(function (key) {
      visitPayload(value[key], visitor, currentDepth + 1);
    });
  }

  function renderDraftState() {
    refs.draftMeta.replaceChildren();
    refs.offeredCards.replaceChildren();
    refs.pickedCards.replaceChildren();
    refs.seenCards.replaceChildren();
    refs.passedCards.replaceChildren();

    if (!state.input) {
      renderEmpty(refs.draftMeta, "샘플 상태 없음");
      renderEmpty(refs.offeredCards, "샘플을 불러오면 현재 팩이 표시됩니다.");
      refs.recommendButton.disabled = true;
      return;
    }

    refs.recommendButton.disabled = state.requestBusy;
    appendMeta("픽", `${state.input.pickNumber} / 7`);
    appendMeta("드래프트", state.input.draftFormat);
    appendMeta("카드", labelFor("draftCardType", state.input.draftCardType));
    appendMeta("추적", labelFor("trackingMode", state.input.trackingMode));
    appendMeta("인원", `${state.input.playerCount}인`);
    appendMeta("설명", labelFor("explanationDepth", state.input.explanationDepth));

    renderCardList(refs.offeredCards, state.input.offeredCardIds, "보이는 카드 없음", true);
    renderTokenList(refs.pickedCards, state.input.pickedCardIds, "없음");
    renderTokenList(refs.seenCards, state.input.seenCardIds, "없음");
    renderTokenList(refs.passedCards, state.input.passedCardIds, "없음");
  }

  function appendMeta(label, value) {
    const wrapper = document.createElement("div");
    wrapper.className = "meta-item";

    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;

    wrapper.append(term, description);
    refs.draftMeta.append(wrapper);
  }

  function renderCardList(container, cardIds, emptyText, highlightSelected) {
    container.replaceChildren();
    if (!cardIds.length) {
      renderEmpty(container, emptyText);
      return;
    }

    cardIds.forEach(function (cardId) {
      const item = document.createElement("div");
      item.className = "mini-card";
      if (highlightSelected && cardId === state.selectedCardId) item.classList.add("is-selected");

      const name = document.createElement("div");
      name.className = "mini-card-name";
      name.textContent = cardName(cardId);

      const id = document.createElement("div");
      id.className = "mini-card-id";
      id.textContent = cardId;

      item.append(name, id);
      container.append(item);
    });
  }

  function renderTokenList(container, cardIds, emptyText) {
    container.replaceChildren();
    if (!cardIds.length) {
      renderEmpty(container, emptyText);
      return;
    }

    cardIds.forEach(function (cardId) {
      const token = document.createElement("span");
      token.className = "token";
      token.textContent = cardName(cardId);
      token.title = cardId;
      container.append(token);
    });
  }

  function renderRecommendations() {
    refs.recommendations.replaceChildren();

    if (!state.recommendations.length) {
      renderEmpty(refs.recommendations, "추천 결과가 없습니다.");
      updateFeedbackPanel();
      return;
    }

    state.recommendations.forEach(function (recommendation, index) {
      refs.recommendations.append(renderRecommendationCard(recommendation, index === 0));
    });
    updateFeedbackPanel();
  }

  function renderRecommendationCard(recommendation, isTop) {
    const label = document.createElement("label");
    label.className = "recommendation-card";
    label.dataset.cardId = recommendation.cardId;
    if (isTop) label.classList.add("is-top");
    if (state.selectedCardId === recommendation.cardId) label.classList.add("is-selected");

    const radio = document.createElement("input");
    radio.className = "recommendation-radio";
    radio.type = "radio";
    radio.name = "selectedCardId";
    radio.value = recommendation.cardId;
    radio.checked = state.selectedCardId === recommendation.cardId;
    radio.addEventListener("change", function () {
      state.selectedCardId = recommendation.cardId;
      refreshSelection();
      renderDraftState();
      updateFeedbackPanel();
    });

    const header = document.createElement("div");
    header.className = "recommendation-header";

    const rank = document.createElement("div");
    rank.className = "rank-badge";
    rank.textContent = `#${recommendation.rank}`;

    const title = document.createElement("div");
    title.className = "card-title";
    const name = document.createElement("h3");
    name.textContent = cardName(recommendation.cardId, recommendation);
    const id = document.createElement("p");
    id.className = "card-id";
    id.textContent = recommendation.cardId;
    title.append(name, id);

    const score = document.createElement("div");
    score.className = "score-box";
    const scoreValue = document.createElement("div");
    scoreValue.className = "score-value";
    scoreValue.textContent = formatScore(recommendation.score);
    const scoreLabel = document.createElement("div");
    scoreLabel.className = "score-label";
    scoreLabel.textContent = "점수";
    score.append(scoreValue, scoreLabel);

    header.append(rank, title, score);

    const groups = document.createElement("div");
    groups.className = "chip-list";
    appendChips(groups, recommendation.candidateGroups, "candidateGroup", "후보군 없음");

    const body = document.createElement("div");
    const reasons = reasonLines(recommendation);
    if (reasons.length) {
      const reasonList = document.createElement("ul");
      reasonList.className = "reason-list";
      reasons.forEach(function (reason) {
        const item = document.createElement("li");
        item.textContent = reason;
        reasonList.append(item);
      });
      body.append(reasonList);
    } else {
      const muted = document.createElement("p");
      muted.className = "muted-line";
      muted.textContent = "근거 없음";
      body.append(muted);
    }

    appendRiskAndWarnings(body, recommendation);
    appendDirections(body, recommendation);

    const footer = renderRecommendationFooter(recommendation);
    label.append(radio, header, groups, body, footer);
    return label;
  }

  function appendChips(container, values, labelNamespace, emptyText) {
    if (!values.length) {
      const chip = document.createElement("span");
      chip.className = "chip is-muted";
      chip.textContent = emptyText;
      container.append(chip);
      return;
    }

    values.forEach(function (value) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = labelFor(labelNamespace, value);
      chip.title = value;
      container.append(chip);
    });
  }

  function appendRiskAndWarnings(container, recommendation) {
    if (recommendation.risks.length) {
      const list = document.createElement("ul");
      list.className = "alert-list is-risk";
      recommendation.risks.forEach(function (risk) {
        const item = document.createElement("li");
        item.textContent = `리스크: ${risk}`;
        list.append(item);
      });
      container.append(list);
    }

    if (recommendation.warnings.length) {
      const list = document.createElement("ul");
      list.className = "alert-list is-warning";
      recommendation.warnings.forEach(function (warning) {
        const item = document.createElement("li");
        item.textContent = `경고: ${warningText(warning)}`;
        list.append(item);
      });
      container.append(list);
    }
  }

  function appendDirections(container, recommendation) {
    if (!recommendation.nextPickDirection.length && !recommendation.planShiftHints.length) return;

    const list = document.createElement("ul");
    list.className = "direction-list";

    recommendation.nextPickDirection.forEach(function (direction) {
      const item = document.createElement("li");
      item.textContent = `다음 픽: ${direction}`;
      list.append(item);
    });

    recommendation.planShiftHints.forEach(function (hint) {
      const item = document.createElement("li");
      item.textContent = `전환: ${warningText(hint)}`;
      list.append(item);
    });

    container.append(list);
  }

  function renderRecommendationFooter(recommendation) {
    const footer = document.createElement("div");
    footer.className = "recommendation-footer";

    const values = [
      labelFor("draftPickBand", recommendation.draftPickBand),
      labelFor("returnLikelihood", recommendation.returnLikelihood),
      labelFor("confidence", recommendation.evaluationMeta?.confidence),
      labelFor("method", recommendation.evaluationMeta?.method)
    ].filter(Boolean);

    const missingData = stringArray(recommendation.evaluationMeta?.missingData);
    missingData.forEach(function (value) {
      values.push(labelFor("missingData", value));
    });

    values.forEach(function (value) {
      const pill = document.createElement("span");
      pill.className = "footer-pill";
      pill.textContent = value;
      footer.append(pill);
    });

    return footer;
  }

  function refreshSelection() {
    refs.recommendations.querySelectorAll(".recommendation-card").forEach(function (card) {
      const selected = card.dataset.cardId === state.selectedCardId;
      card.classList.toggle("is-selected", selected);
      const radio = card.querySelector(".recommendation-radio");
      if (radio) radio.checked = selected;
    });
  }

  function updateFeedbackPanel() {
    const modelTopCardId = state.recommendations[0]?.cardId;
    const selectedCardId = state.selectedCardId;
    const canSubmit = Boolean(modelTopCardId && selectedCardId && modelTopCardId !== selectedCardId && !state.feedbackBusy);

    refs.modelTopCard.textContent = modelTopCardId ? cardDisplay(modelTopCardId) : "-";
    refs.selectedCard.textContent = selectedCardId ? cardDisplay(selectedCardId) : "-";
    refs.submitFeedbackButton.disabled = !canSubmit;

    if (!state.recommendations.length) {
      refs.feedbackHint.textContent = "추천 결과를 기다리는 중입니다.";
    } else if (modelTopCardId === selectedCardId) {
      refs.feedbackHint.textContent = "추천과 다른 카드를 선택하면 차이를 기록할 수 있습니다.";
    } else {
      refs.feedbackHint.textContent = "모델 추천과 다른 선택을 neutral disagreement로 기록합니다.";
    }
  }

  function setBusy(isBusy) {
    state.requestBusy = isBusy;
    refs.loadSampleButton.disabled = isBusy;
    refs.recommendButton.disabled = isBusy || !state.input;
  }

  function setAppStatus(text, type) {
    refs.appStatus.textContent = text;
    refs.appStatus.classList.remove("is-busy", "is-error", "is-ready");
    if (type) refs.appStatus.classList.add(`is-${type}`);
  }

  function setRecommendationStatus(text) {
    refs.recommendationStatus.textContent = text;
  }

  function setFeedbackStatus(text) {
    refs.feedbackStatus.textContent = text;
  }

  function clearFeedbackStatus() {
    refs.feedbackStatus.textContent = "";
  }

  function showError(container, message) {
    container.replaceChildren();
    const error = document.createElement("div");
    error.className = "error-box";
    error.textContent = message;
    container.append(error);
  }

  function renderEmpty(container, text) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = text;
    container.append(empty);
  }

  function reasonLines(recommendation) {
    const depth = state.input?.explanationDepth || "standard";
    const reasons = recommendation.reasons;
    if (Array.isArray(reasons)) return stringArray(reasons);
    if (!reasons || typeof reasons !== "object") return [];
    const preferred = stringArray(reasons[depth]);
    if (preferred.length) return preferred;
    const standard = stringArray(reasons.standard);
    if (standard.length) return standard;
    const compact = stringArray(reasons.compact);
    if (compact.length) return compact;
    return stringArray(reasons.deep);
  }

  function warningText(value) {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return "";
    if (value.code && value.message) return `${value.code} - ${value.message}`;
    return value.message || value.code || "";
  }

  function cardName(cardId, source) {
    const sourceName =
      source?.name ||
      source?.koreanName ||
      source?.koName ||
      source?.displayName ||
      source?.translation?.name ||
      source?.card?.name ||
      source?.card?.translation?.name;

    if (typeof sourceName === "string" && sourceName.trim()) {
      state.cardNames.set(cardId, sourceName.trim());
      return sourceName.trim();
    }

    return state.cardNames.get(cardId) || cardId;
  }

  function cardDisplay(cardId) {
    return `${cardName(cardId)} (${cardId})`;
  }

  function labelFor(namespace, value) {
    if (!value) return "";
    return labels[namespace]?.[value] || value;
  }

  function formatScore(value) {
    if (!Number.isFinite(value)) return "0";
    return Math.round(value * 10) / 10;
  }

  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function stringOr(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback || "";
  }

  function stringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(function (item) {
      return typeof item === "string" && item.trim();
    });
  }

  function clampPickNumber(value) {
    const number = Math.round(numberOr(value, 1));
    return Math.min(7, Math.max(1, number));
  }

  function inferDraftCardType(cardIds) {
    const minorCount = cardIds.filter(function (cardId) {
      return cardId.startsWith("minor-");
    }).length;
    return minorCount > cardIds.length / 2 ? "minor_improvement" : "occupation";
  }

  function errorMessage(error, fallback) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
})();
