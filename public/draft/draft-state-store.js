(function () {
  "use strict";

  const storageKey = "agricola-korean-gosu:draft-memory-coach:draft-input:v1";

  const allowed = Object.freeze({
    draftCardType: new Set(["occupation", "minor_improvement"]),
    draftFormat: new Set(["10-to-7", "9-to-7", "8-to-7"]),
    trackingMode: new Set(["selected_only", "full_pack"]),
    explanationDepth: new Set(["compact", "standard", "deep"])
  });

  const requiredArrayFields = Object.freeze(["offeredCardIds", "pickedCardIds", "seenCardIds", "passedCardIds"]);
  const optionalArrayFields = Object.freeze(["previousPackCardIds", "missingFromPreviousPack"]);

  function save(draftInput) {
    const validation = validate(draftInput);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(validation.draftInput));
    } catch (error) {
      return { ok: false, errors: ["localStorage is unavailable."] };
    }

    return { ok: true, draftInput: validation.draftInput };
  }

  function load() {
    let rawValue;

    try {
      rawValue = window.localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }

    if (!rawValue) return null;

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      clear();
      return null;
    }

    const validation = validate(parsed);
    if (!validation.ok) {
      clear();
      return null;
    }

    return validation.draftInput;
  }

  function clear() {
    try {
      window.localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function validate(draftInput) {
    const errors = [];

    if (!isPlainObject(draftInput)) {
      return { ok: false, errors: ["draft input must be an object."] };
    }

    const normalized = {};
    const pickNumber = normalizePickNumber(draftInput.pickNumber);
    if (pickNumber === null) {
      errors.push("pickNumber must be an integer from 1 to 7.");
    } else {
      normalized.pickNumber = pickNumber;
    }

    validateAllowedValue(draftInput, normalized, errors, "draftCardType");
    validateAllowedValue(draftInput, normalized, errors, "draftFormat");
    validateAllowedValue(draftInput, normalized, errors, "trackingMode");
    validateAllowedValue(draftInput, normalized, errors, "explanationDepth");

    if (draftInput.playerCount !== undefined) {
      const playerCount = Number(draftInput.playerCount);
      if (!Number.isInteger(playerCount) || playerCount < 1) {
        errors.push("playerCount must be a positive integer when present.");
      } else {
        normalized.playerCount = playerCount;
      }
    }

    requiredArrayFields.forEach(function (fieldName) {
      const value = normalizeStringArray(draftInput[fieldName]);
      if (value === null) {
        errors.push(`${fieldName} must be an array of non-empty strings.`);
      } else {
        normalized[fieldName] = value;
      }
    });

    optionalArrayFields.forEach(function (fieldName) {
      if (draftInput[fieldName] === undefined) return;

      const value = normalizeStringArray(draftInput[fieldName]);
      if (value === null) {
        errors.push(`${fieldName} must be an array of non-empty strings when present.`);
      } else {
        normalized[fieldName] = value;
      }
    });

    if (draftInput.cardPoolProfileId !== undefined) {
      const cardPoolProfileId = normalizeString(draftInput.cardPoolProfileId);
      if (!cardPoolProfileId) {
        errors.push("cardPoolProfileId must be a non-empty string when present.");
      } else {
        normalized.cardPoolProfileId = cardPoolProfileId;
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return { ok: true, draftInput: normalized, errors: [] };
  }

  function validateAllowedValue(source, target, errors, fieldName) {
    if (!allowed[fieldName].has(source[fieldName])) {
      errors.push(`${fieldName} must be one of: ${Array.from(allowed[fieldName]).join(", ")}.`);
      return;
    }

    target[fieldName] = source[fieldName];
  }

  function normalizePickNumber(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 7) return null;
    return number;
  }

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) return null;

    const normalized = [];
    for (const item of value) {
      const stringValue = normalizeString(item);
      if (!stringValue) return null;
      normalized.push(stringValue);
    }

    return normalized;
  }

  function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  window.DraftStateStore = Object.freeze({
    storageKey,
    save,
    load,
    clear,
    validate
  });
})();
