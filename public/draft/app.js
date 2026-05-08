(function () {
  "use strict";

  const endpoints = {
    sample: "/api/draft/sample",
    cards: "/api/cards",
    recommend: "/api/draft/recommend",
    feedback: "/api/draft/feedback"
  };

  const labels = {
    draftFormat: {
      "10-to-7": "10장 중 7장",
      "9-to-7": "9장 중 7장",
      "8-to-7": "8장 중 7장"
    },
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

  const localDraftInputKey = "agricola-korean-gosu:draft-memory-coach:draft-input:v1";
  const cardGroupNames = ["offered", "picked", "seen", "passed"];
  const cardGroups = {
    offered: {
      inputKey: "offeredCardIds",
      listRef: "offeredCards",
      searchRef: "offeredCardSearch",
      resultsRef: "offeredCardResults",
      addButtonRef: "addOfferedCardButton",
      countRef: "offeredCardsCount",
      label: "보이는 카드",
      emptyText: "보이는 카드 없음",
      variant: "card"
    },
    picked: {
      inputKey: "pickedCardIds",
      listRef: "pickedCards",
      searchRef: "pickedCardSearch",
      resultsRef: "pickedCardResults",
      addButtonRef: "addPickedCardButton",
      countRef: "pickedCardsCount",
      label: "집은 카드",
      emptyText: "없음",
      variant: "token"
    },
    seen: {
      inputKey: "seenCardIds",
      listRef: "seenCards",
      searchRef: "seenCardSearch",
      resultsRef: "seenCardResults",
      addButtonRef: "addSeenCardButton",
      countRef: "seenCardsCount",
      label: "본 카드",
      emptyText: "없음",
      variant: "token"
    },
    passed: {
      inputKey: "passedCardIds",
      listRef: "passedCards",
      searchRef: "passedCardSearch",
      resultsRef: "passedCardResults",
      addButtonRef: "addPassedCardButton",
      countRef: "passedCardsCount",
      label: "넘긴 카드",
      emptyText: "없음",
      variant: "token"
    }
  };

  const state = {
    input: null,
    recommendations: [],
    selectedCardId: null,
    samplePayload: null,
    cardNames: new Map(),
    cardSearch: {
      offered: createCardSearchState(),
      picked: createCardSearchState(),
      seen: createCardSearchState(),
      passed: createCardSearchState()
    },
    requestBusy: false,
    feedbackBusy: false
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", function () {
    bindRefs();
    bindEvents();
    startApp();
  });

  function bindRefs() {
    refs.appStatus = document.getElementById("appStatus");
    refs.loadSampleButton = document.getElementById("loadSampleButton");
    refs.recommendButton = document.getElementById("recommendButton");
    refs.draftEditor = document.getElementById("draftEditor");
    refs.pickNumberInput = document.getElementById("pickNumberInput");
    refs.draftCardTypeSelect = document.getElementById("draftCardTypeSelect");
    refs.draftFormatSelect = document.getElementById("draftFormatSelect");
    refs.trackingModeSelect = document.getElementById("trackingModeSelect");
    refs.explanationDepthSelect = document.getElementById("explanationDepthSelect");
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

    cardGroupNames.forEach(function (groupName) {
      const config = cardGroups[groupName];
      refs[config.searchRef] = document.getElementById(config.searchRef);
      refs[config.resultsRef] = document.getElementById(config.resultsRef);
      refs[config.addButtonRef] = document.getElementById(config.addButtonRef);
      refs[config.countRef] = document.getElementById(config.countRef);
    });
  }

  function bindEvents() {
    refs.draftEditor.addEventListener("submit", function (event) {
      event.preventDefault();
    });
    refs.loadSampleButton.addEventListener("click", loadSample);
    refs.recommendButton.addEventListener("click", requestRecommendations);
    refs.feedbackForm.addEventListener("submit", submitFeedback);

    refs.pickNumberInput.addEventListener("change", function () {
      updateDraftField("pickNumber", clampPickNumber(refs.pickNumberInput.value));
    });
    refs.draftCardTypeSelect.addEventListener("change", function () {
      updateDraftField("draftCardType", refs.draftCardTypeSelect.value);
      clearAllSearchResults();
    });
    refs.draftFormatSelect.addEventListener("change", function () {
      updateDraftField("draftFormat", refs.draftFormatSelect.value);
    });
    refs.trackingModeSelect.addEventListener("change", function () {
      updateDraftField("trackingMode", refs.trackingModeSelect.value);
    });
    refs.explanationDepthSelect.addEventListener("change", function () {
      updateDraftField("explanationDepth", refs.explanationDepthSelect.value);
    });

    cardGroupNames.forEach(function (groupName) {
      const config = cardGroups[groupName];
      const input = refs[config.searchRef];
      const addButton = refs[config.addButtonRef];

      input.addEventListener("input", function () {
        updateCardSearch(groupName, input.value);
      });
      input.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        addFirstSearchResult(groupName);
      });
      addButton.addEventListener("click", function () {
        addFirstSearchResult(groupName);
      });
    });
  }

  async function startApp() {
    setBusy(true);
    setAppStatus("초기화", "busy");
    setRecommendationStatus("저장된 입력을 확인하는 중");

    try {
      const storedInput = await loadStoredDraftInput();
      if (storedInput) {
        state.input = normalizeDraftInput(storedInput, {});
        state.recommendations = [];
        state.selectedCardId = null;
        renderDraftState();
        renderRecommendations();
        setAppStatus("준비됨", "ready");
        setRecommendationStatus("저장된 입력을 불러왔습니다.");
        setBusy(false);
        if (state.input.offeredCardIds.length > 0) await requestRecommendations();
        return;
      }
    } catch (error) {
      setRecommendationStatus(errorMessage(error, "저장된 입력을 읽지 못했습니다."));
    } finally {
      setBusy(false);
    }

    await loadSample();
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
      persistDraftInput();
      renderDraftState();
      await requestRecommendations();
    } catch (error) {
      state.input = createDefaultDraftInput();
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
    if (!canRequestRecommendations()) {
      setRecommendationStatus("보이는 카드를 먼저 추가하세요.");
      return;
    }

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

  function updateDraftField(key, value) {
    const nextInput = normalizeDraftInput({ ...(state.input || createDefaultDraftInput()), [key]: value }, state.samplePayload);
    state.input = nextInput;
    markDraftInputChanged();
  }

  function addCardToGroup(groupName, card) {
    const config = cardGroups[groupName];
    if (!config || !card?.id) return;

    ensureDraftInput();
    rememberCompactCard(card);
    const currentCardIds = state.input[config.inputKey];
    if (currentCardIds.includes(card.id)) {
      setAppStatus("이미 추가됨", "ready");
      return;
    }

    state.input = normalizeDraftInput(
      {
        ...state.input,
        [config.inputKey]: [...currentCardIds, card.id]
      },
      state.samplePayload
    );
    clearCardSearch(groupName);
    markDraftInputChanged();
  }

  function removeCardFromGroup(groupName, cardId) {
    const config = cardGroups[groupName];
    if (!state.input || !config) return;

    const currentCardIds = state.input[config.inputKey];
    state.input = normalizeDraftInput(
      {
        ...state.input,
        [config.inputKey]: currentCardIds.filter(function (currentCardId) {
          return currentCardId !== cardId;
        })
      },
      state.samplePayload
    );
    markDraftInputChanged();
  }

  function markDraftInputChanged() {
    persistDraftInput();
    state.recommendations = [];
    state.selectedCardId = null;
    renderDraftState();
    renderRecommendations();
    setRecommendationStatus("입력이 바뀌었습니다. 추천 갱신을 누르세요.");
    setAppStatus("저장됨", "ready");
    updateFeedbackPanel();
  }

  function ensureDraftInput() {
    if (!state.input) state.input = createDefaultDraftInput();
    return state.input;
  }

  function canRequestRecommendations() {
    return Boolean(state.input && state.input.offeredCardIds.length > 0);
  }

  function createDefaultDraftInput() {
    return {
      playerCount: 4,
      draftCardType: "occupation",
      pickNumber: 1,
      offeredCardIds: [],
      pickedCardIds: [],
      seenCardIds: [],
      passedCardIds: [],
      draftFormat: "10-to-7",
      trackingMode: "selected_only",
      cardPoolProfileId: "bga-arena-prototype",
      explanationDepth: "standard"
    };
  }

  function createCardSearchState() {
    return {
      query: "",
      results: [],
      selectedCard: null,
      loading: false,
      error: "",
      debounceId: null,
      requestId: 0
    };
  }

  function updateCardSearch(groupName, query) {
    const search = state.cardSearch[groupName];
    if (!search) return;

    search.query = query;
    search.selectedCard = null;
    search.error = "";
    if (search.debounceId) clearTimeout(search.debounceId);

    if (!query.trim()) {
      search.requestId += 1;
      search.results = [];
      search.loading = false;
      renderCardSearch(groupName);
      return;
    }

    search.loading = true;
    renderCardSearch(groupName);
    search.debounceId = setTimeout(function () {
      void searchCards(groupName);
    }, 180);
  }

  async function searchCards(groupName) {
    const search = state.cardSearch[groupName];
    if (!search) return;

    const requestId = search.requestId + 1;
    search.requestId = requestId;
    search.loading = true;
    search.error = "";
    renderCardSearch(groupName);

    try {
      const url = new URL(endpoints.cards, window.location.origin);
      url.searchParams.set("q", search.query.trim());
      url.searchParams.set("type", state.input?.draftCardType || "occupation");
      const payload = await fetchJson(url.toString());
      if (search.requestId !== requestId) return;
      readCatalog(payload);
      search.results = extractCardSearchResults(payload);
      search.selectedCard = search.results[0] || null;
    } catch (error) {
      if (search.requestId !== requestId) return;
      search.results = [];
      search.selectedCard = null;
      search.error = errorMessage(error, "카드를 검색하지 못했습니다.");
    } finally {
      if (search.requestId === requestId) {
        search.loading = false;
        renderCardSearch(groupName);
      }
    }
  }

  function addFirstSearchResult(groupName) {
    const search = state.cardSearch[groupName];
    if (!search || search.loading) return;
    const card = search.selectedCard || search.results[0];
    if (!card) return;
    addCardToGroup(groupName, card);
  }

  function clearCardSearch(groupName) {
    const config = cardGroups[groupName];
    const search = state.cardSearch[groupName];
    if (!config || !search) return;

    if (search.debounceId) clearTimeout(search.debounceId);
    search.requestId += 1;
    search.query = "";
    search.results = [];
    search.selectedCard = null;
    search.loading = false;
    search.error = "";
    const input = refs[config.searchRef];
    if (input) input.value = "";
    renderCardSearch(groupName);
  }

  function clearAllSearchResults() {
    cardGroupNames.forEach(clearCardSearch);
  }

  async function loadStoredDraftInput() {
    const externalInput = await loadExternalDraftInput();
    if (externalInput) return externalInput;
    return loadLocalDraftInput();
  }

  async function loadExternalDraftInput() {
    const store = window.DraftStateStore;
    if (!store) return null;

    const methodNames = ["loadDraftInput", "getDraftInput", "load", "get", "read"];
    for (const methodName of methodNames) {
      if (typeof store[methodName] !== "function") continue;
      try {
        const value = await maybeAwait(store[methodName]());
        const input = coerceDraftInput(value);
        if (input) return input;
      } catch (error) {
        continue;
      }
    }

    return coerceDraftInput(store.input) || coerceDraftInput(store.draftInput) || null;
  }

  function loadLocalDraftInput() {
    try {
      const raw = window.localStorage?.getItem(localDraftInputKey);
      if (!raw) return null;
      return coerceDraftInput(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function persistDraftInput() {
    if (!state.input) return;
    const snapshot = cloneDraftInput(state.input);
    saveExternalDraftInput(snapshot);

    try {
      window.localStorage?.setItem(localDraftInputKey, JSON.stringify(snapshot));
    } catch (error) {
      // Local storage can be unavailable in private or restricted browser contexts.
    }
  }

  function saveExternalDraftInput(input) {
    const store = window.DraftStateStore;
    if (!store) return;

    const methodNames = ["saveDraftInput", "setDraftInput", "save", "set", "write"];
    for (const methodName of methodNames) {
      if (typeof store[methodName] !== "function") continue;
      try {
        void store[methodName](cloneDraftInput(input));
        return;
      } catch (error) {
        continue;
      }
    }

    try {
      store.input = cloneDraftInput(input);
    } catch (error) {
      // Read-only external stores are allowed; localStorage remains the fallback.
    }
  }

  function coerceDraftInput(value) {
    if (looksLikeDraftInput(value)) return value;
    if (!value || typeof value !== "object") return null;

    const candidates = [value.input, value.draftInput, value.state?.input, value.draftState?.input];
    return candidates.find(looksLikeDraftInput) || null;
  }

  async function maybeAwait(value) {
    return value && typeof value.then === "function" ? await value : value;
  }

  function cloneDraftInput(input) {
    const clone = {
      playerCount: input.playerCount,
      draftCardType: input.draftCardType,
      pickNumber: input.pickNumber,
      offeredCardIds: [...input.offeredCardIds],
      pickedCardIds: [...input.pickedCardIds],
      seenCardIds: [...input.seenCardIds],
      passedCardIds: [...input.passedCardIds],
      draftFormat: input.draftFormat,
      trackingMode: input.trackingMode,
      cardPoolProfileId: input.cardPoolProfileId,
      explanationDepth: input.explanationDepth
    };

    if (input.previousPackCardIds) clone.previousPackCardIds = [...input.previousPackCardIds];
    if (input.missingFromPreviousPack) clone.missingFromPreviousPack = [...input.missingFromPreviousPack];
    return clone;
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

  function extractCardSearchResults(payload) {
    const candidates = [payload?.cards, payload?.data?.cards, payload];
    const cards = candidates.find(Array.isArray) || [];

    return cards
      .map(function (card) {
        const id = stringOr(card?.id, card?.cardId);
        if (!id) return null;
        const result = {
          id,
          type: card.type,
          name: stringOr(card.name, card.koreanName || card.koName || card.displayName || id),
          aliases: Array.isArray(card.aliases) ? stringArray(card.aliases) : []
        };
        rememberCompactCard(result);
        return result;
      })
      .filter(Boolean);
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

  function rememberCompactCard(card) {
    if (card?.id && typeof card.name === "string" && card.name.trim()) {
      state.cardNames.set(card.id, card.name.trim());
    }
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
      syncDraftEditor(createDefaultDraftInput());
      renderEmpty(refs.draftMeta, "샘플 상태 없음");
      renderEmpty(refs.offeredCards, "샘플을 불러오면 현재 팩이 표시됩니다.");
      refs.recommendButton.disabled = true;
      return;
    }

    syncDraftEditor(state.input);
    refs.recommendButton.disabled = state.requestBusy || !state.input.offeredCardIds.length;
    appendMeta("픽", `${state.input.pickNumber} / 7`);
    appendMeta("드래프트", labelFor("draftFormat", state.input.draftFormat));
    appendMeta("카드", labelFor("draftCardType", state.input.draftCardType));
    appendMeta("추적", labelFor("trackingMode", state.input.trackingMode));
    appendMeta("인원", `${state.input.playerCount}인`);
    appendMeta("설명", labelFor("explanationDepth", state.input.explanationDepth));

    cardGroupNames.forEach(function (groupName) {
      const config = cardGroups[groupName];
      const cardIds = state.input[config.inputKey];
      const count = refs[config.countRef];
      if (count) count.textContent = `${cardIds.length}장`;
      if (config.variant === "card") {
        renderCardList(refs[config.listRef], cardIds, config.emptyText, true, groupName);
      } else {
        renderTokenList(refs[config.listRef], cardIds, config.emptyText, groupName);
      }
      renderCardSearch(groupName);
    });
  }

  function syncDraftEditor(input) {
    refs.pickNumberInput.value = input.pickNumber;
    refs.draftCardTypeSelect.value = input.draftCardType;
    refs.draftFormatSelect.value = input.draftFormat;
    refs.trackingModeSelect.value = input.trackingMode;
    refs.explanationDepthSelect.value = input.explanationDepth;
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

  function renderCardList(container, cardIds, emptyText, highlightSelected, groupName) {
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

      const text = document.createElement("div");
      text.className = "mini-card-text";
      text.append(name, id);

      item.append(text, renderRemoveCardButton(groupName, cardId));
      container.append(item);
    });
  }

  function renderTokenList(container, cardIds, emptyText, groupName) {
    container.replaceChildren();
    if (!cardIds.length) {
      renderEmpty(container, emptyText);
      return;
    }

    cardIds.forEach(function (cardId) {
      const token = document.createElement("span");
      token.className = "token";
      token.title = cardId;
      const name = document.createElement("span");
      name.className = "token-name";
      name.textContent = cardName(cardId);
      token.append(name, renderRemoveCardButton(groupName, cardId));
      container.append(token);
    });
  }

  function renderRemoveCardButton(groupName, cardId) {
    const button = document.createElement("button");
    button.className = "remove-card-button";
    button.type = "button";
    button.textContent = "×";
    button.setAttribute("aria-label", `${cardName(cardId)} 제거`);
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      removeCardFromGroup(groupName, cardId);
    });
    return button;
  }

  function renderCardSearch(groupName) {
    const config = cardGroups[groupName];
    const search = state.cardSearch[groupName];
    if (!config || !search) return;

    const results = refs[config.resultsRef];
    const addButton = refs[config.addButtonRef];
    if (!results || !addButton) return;

    results.replaceChildren();
    addButton.disabled = search.loading || !search.results.length;

    if (search.loading) {
      renderSearchMessage(results, "검색 중");
      return;
    }

    if (search.error) {
      renderSearchMessage(results, search.error, "is-error");
      return;
    }

    if (!search.query.trim()) {
      renderSearchMessage(results, `${labelFor("draftCardType", state.input?.draftCardType || "occupation")} 이름 또는 ID 검색`);
      return;
    }

    if (!search.results.length) {
      renderSearchMessage(results, "검색 결과 없음");
      return;
    }

    search.results.slice(0, 8).forEach(function (card, index) {
      const button = document.createElement("button");
      button.className = "search-result-button";
      if (index === 0) button.classList.add("is-active");
      button.type = "button";
      button.setAttribute("role", "option");

      const name = document.createElement("span");
      name.className = "search-result-name";
      name.textContent = card.name || card.id;

      const meta = document.createElement("span");
      meta.className = "search-result-meta";
      meta.textContent = `${labelFor("draftCardType", card.type)} · ${card.id}`;

      button.append(name, meta);
      button.addEventListener("click", function () {
        addCardToGroup(groupName, card);
      });
      results.append(button);
    });
  }

  function renderSearchMessage(container, text, modifier) {
    const message = document.createElement("div");
    message.className = `search-message${modifier ? ` ${modifier}` : ""}`;
    message.textContent = text;
    container.append(message);
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
    refs.recommendButton.disabled = isBusy || !state.input || !state.input.offeredCardIds.length;
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
