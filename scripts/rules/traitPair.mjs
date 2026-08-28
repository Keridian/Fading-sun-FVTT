import { CHARACTERISTICS, SKILLS } from "../config.mjs";

export const FAVORABILITIES = Object.freeze([
  "normal",
  "favorable",
  "unfavorable"
]);

const CHARACTERISTIC_BY_KEY = new Map(
  Object.values(CHARACTERISTICS).flatMap(characteristics => (
    Object.entries(characteristics)
  ))
);

export class TraitPairRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TraitPairRuleError";
    this.code = code;
    this.details = details;
  }
}

function requireFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TraitPairRuleError(
      "INVALID_NUMBER",
      `${label} must be a finite number.`,
      { label, value }
    );
  }
  return number;
}

function requireInteger(value, label) {
  const number = requireFiniteNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new TraitPairRuleError(
      "INVALID_INTEGER",
      `${label} must be an integer.`,
      { label, value }
    );
  }
  return number;
}

function readSystemPath(actor, path, errorCode, key) {
  let value = actor?.system;
  for (const segment of path.split(".")) value = value?.[segment];

  if (value === undefined || value === null) {
    throw new TraitPairRuleError(
      errorCode,
      `The Actor does not contain a value for ${key}.`,
      { key, path }
    );
  }
  return requireFiniteNumber(value, key);
}

export function calculateGoal({
  characteristicValue,
  skillValue,
  goalModifier = 0
}) {
  return requireFiniteNumber(characteristicValue, "characteristicValue")
    + requireFiniteNumber(skillValue, "skillValue")
    + requireInteger(goalModifier, "goalModifier");
}

export function evaluateDieResult({ goal, result }) {
  const normalizedGoal = requireFiniteNumber(goal, "goal");
  const normalizedResult = requireInteger(result, "result");

  if (normalizedResult < 1 || normalizedResult > 20) {
    throw new TraitPairRuleError(
      "INVALID_DIE_RESULT",
      "A d20 result must be an integer from 1 through 20.",
      { result }
    );
  }

  const criticalMiss = normalizedResult === 20;
  const success = !criticalMiss && normalizedResult <= normalizedGoal;
  const criticalHit = success && normalizedResult === (
    normalizedGoal >= 20 ? 19 : normalizedGoal
  );
  const bonusVpOver20 = Math.max(0, normalizedGoal - 20);

  return {
    result: normalizedResult,
    success,
    criticalHit,
    criticalMiss,
    vpGenerated: success ? normalizedResult + bonusVpOver20 : 0,
    wpGenerated: criticalHit ? 1 : 0,
    gmWyrdAward: criticalMiss ? 1 : 0,
    ignoresResistance: criticalHit
  };
}

function compareResultQuality(left, right) {
  if (left.success !== right.success) return left.success ? 1 : -1;

  if (left.success) return left.result - right.result;

  if (left.criticalMiss !== right.criticalMiss) {
    return left.criticalMiss ? -1 : 1;
  }

  return right.result - left.result;
}

export function selectDieResult({
  goal,
  results,
  favorability = "normal"
}) {
  if (!FAVORABILITIES.includes(favorability)) {
    throw new TraitPairRuleError(
      "INVALID_FAVORABILITY",
      `Unknown favorability: ${favorability}.`,
      { favorability }
    );
  }

  if (!Array.isArray(results)) {
    throw new TraitPairRuleError(
      "INVALID_RESULTS",
      "Dice results must be provided as an Array.",
      { results }
    );
  }

  const expectedCount = favorability === "normal" ? 1 : 2;
  if (results.length !== expectedCount) {
    throw new TraitPairRuleError(
      "INVALID_RESULTS",
      `${favorability} requires exactly ${expectedCount} d20 result(s).`,
      { favorability, results }
    );
  }

  const evaluations = results.map(result => evaluateDieResult({ goal, result }));
  let selected = evaluations[0];

  for (const evaluation of evaluations.slice(1)) {
    const comparison = compareResultQuality(evaluation, selected);
    const shouldReplace = favorability === "favorable"
      ? comparison > 0
      : comparison < 0;
    if (shouldReplace) selected = evaluation;
  }

  return {
    results: evaluations.map(evaluation => evaluation.result),
    selectedResult: selected.result,
    success: selected.success,
    criticalHit: selected.criticalHit,
    criticalMiss: selected.criticalMiss,
    vpGenerated: selected.vpGenerated,
    wpGenerated: selected.wpGenerated,
    gmWyrdAward: selected.gmWyrdAward,
    ignoresResistance: selected.ignoresResistance
  };
}

export function resolveCharacteristic(actor, characteristicKey) {
  const config = CHARACTERISTIC_BY_KEY.get(characteristicKey);
  if (!config) {
    throw new TraitPairRuleError(
      "UNKNOWN_CHARACTERISTIC",
      `Unknown characteristic: ${characteristicKey}.`,
      { key: characteristicKey }
    );
  }

  return {
    key: characteristicKey,
    path: config.path,
    label: config.label,
    value: readSystemPath(
      actor,
      config.path,
      "MISSING_CHARACTERISTIC",
      characteristicKey
    )
  };
}

export function resolveSkill(actor, skillKey) {
  const config = SKILLS[skillKey];
  if (!config) {
    throw new TraitPairRuleError(
      "UNKNOWN_SKILL",
      `Unknown skill: ${skillKey}.`,
      { key: skillKey }
    );
  }

  return {
    key: skillKey,
    path: config.path,
    label: config.label,
    value: readSystemPath(actor, config.path, "MISSING_SKILL", skillKey)
  };
}
