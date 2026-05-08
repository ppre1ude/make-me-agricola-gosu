(function () {
  "use strict";

  const requiredArrayFields = Object.freeze(["offeredCardIds", "pickedCardIds", "seenCardIds", "passedCardIds"]);
  const optionalArrayFields = Object.freeze(["previousPackCardIds", "missingFromPreviousPack"]);

  function resolvePick(draftInput, selectedCardId, options) {
    const normalizedSelectedCardId = normalizeString(selectedCardId);
    const validation = validateResolvablePick(draftInput, normalizedSelectedCardId);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const before = cloneDraftInput(draftInput);
    const after = cloneDraftInput(before);
    const passedCardIds = getPassedCardIdsForPick(before.offeredCardIds, normalizedSelectedCardId);

    after.pickedCardIds = appendUnique(after.pickedCardIds, [normalizedSelectedCardId]);
    after.seenCardIds = appendUnique(after.seenCardIds, passedCardIds);
    after.passedCardIds = appendUnique(after.passedCardIds, passedCardIds);
    after.offeredCardIds = [];
    after.pickNumber = incrementPickNumber(before.pickNumber);

    return Object.freeze({
      before,
      after,
      selectedCardId: normalizedSelectedCardId,
      passedCardIds,
      nextPickNumber: after.pickNumber,
      feedbackNeeded: isFeedbackNeeded(normalizedSelectedCardId, options)
    });
  }

  function canResolvePick(draftInput, selectedCardId) {
    return validateResolvablePick(draftInput, normalizeString(selectedCardId)).ok;
  }

  function cloneDraftInput(draftInput) {
    if (!isObject(draftInput)) return draftInput;

    const clone = {};
    Object.keys(draftInput).forEach(function (key) {
      clone[key] = draftInput[key];
    });

    requiredArrayFields.concat(optionalArrayFields).forEach(function (fieldName) {
      if (Array.isArray(draftInput[fieldName])) {
        clone[fieldName] = draftInput[fieldName].slice();
      }
    });

    return clone;
  }

  function cloneStringArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function validateResolvablePick(draftInput, selectedCardId) {
    if (!isObject(draftInput)) {
      return { ok: false, error: "draftInput must be an object." };
    }
    if (!selectedCardId) {
      return { ok: false, error: "selectedCardId must be a non-empty string." };
    }
    if (!Array.isArray(draftInput.offeredCardIds)) {
      return { ok: false, error: "offeredCardIds must be an array." };
    }
    if (!includesCardId(draftInput.offeredCardIds, selectedCardId)) {
      return { ok: false, error: "selectedCardId must be in offeredCardIds." };
    }
    if (normalizePickNumber(draftInput.pickNumber) === null) {
      return { ok: false, error: "pickNumber must be an integer from 1 to 7." };
    }

    for (let index = 0; index < requiredArrayFields.length; index += 1) {
      const fieldName = requiredArrayFields[index];
      if (!Array.isArray(draftInput[fieldName])) {
        return { ok: false, error: `${fieldName} must be an array.` };
      }
    }

    return { ok: true, error: "" };
  }

  function getPassedCardIdsForPick(offeredCardIds, selectedCardId) {
    const passedCardIds = [];
    offeredCardIds.forEach(function (cardId) {
      const normalizedCardId = normalizeString(cardId);
      if (!normalizedCardId || normalizedCardId === selectedCardId) return;
      appendUniqueInPlace(passedCardIds, normalizedCardId);
    });

    return passedCardIds;
  }

  function appendUnique(existingCardIds, newCardIds) {
    const result = cloneStringArray(existingCardIds);
    newCardIds.forEach(function (cardId) {
      const normalizedCardId = normalizeString(cardId);
      if (normalizedCardId) appendUniqueInPlace(result, normalizedCardId);
    });

    return result;
  }

  function appendUniqueInPlace(cardIds, cardId) {
    if (!includesCardId(cardIds, cardId)) cardIds.push(cardId);
  }

  function includesCardId(cardIds, cardId) {
    return cardIds.some(function (candidate) {
      return normalizeString(candidate) === cardId;
    });
  }

  function incrementPickNumber(value) {
    const pickNumber = normalizePickNumber(value);
    if (pickNumber === null) return value;
    return Math.min(7, pickNumber + 1);
  }

  function normalizePickNumber(value) {
    const pickNumber = Number(value);
    if (!Number.isInteger(pickNumber) || pickNumber < 1 || pickNumber > 7) return null;
    return pickNumber;
  }

  function isFeedbackNeeded(selectedCardId, options) {
    const modelTopCardId = normalizeString(options && options.modelTopCardId);
    return Boolean(modelTopCardId && selectedCardId !== modelTopCardId);
  }

  function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  window.DraftPickResolution = Object.freeze({
    resolvePick,
    canResolvePick,
    cloneDraftInput,
    clone: cloneDraftInput,
    cloneStringArray
  });
})();
