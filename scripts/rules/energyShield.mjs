import {
  ATTACK_PROPERTY_KEYS,
  ATTACK_RANGE_BAND_KEYS,
  BURNOUT_TRIGGER_KEYS,
  getAttackPropertyDefinition,
  getAttackRangeBandDefinition,
  getBurnoutTriggerDefinition,
  normalizeEnergyShieldCompatibility
} from "../config.mjs";
import { requireSingleAttackProperty } from "./attackProperties.mjs";

export class EnergyShieldRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EnergyShieldRuleError";
    this.code = code;
    this.details = details;
  }
}

function energyShieldError(code, message, details = {}) {
  return new EnergyShieldRuleError(code, message, details);
}

function requireNonNegativeInteger(value, label) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  return number;
}

function requireBoundedInteger(value, label, minimum, maximum) {
  const number = requireNonNegativeInteger(value, label);
  if (number < minimum || number > maximum) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_INTEGER",
      `${label} must be an integer from ${minimum} through ${maximum}.`,
      { label, value, minimum, maximum }
    );
  }
  return number;
}

function requireCombatId(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_COMBAT",
      "combatId must be a non-empty String.",
      { value }
    );
  }
  return value;
}

function requireCombatRound(value, label = "round") {
  return requireBoundedInteger(value, label, 1, Number.MAX_SAFE_INTEGER);
}

function requireBurnoutTrigger(value) {
  const definition = getBurnoutTriggerDefinition(value);
  if (!definition) {
    throw energyShieldError(
      "INVALID_BURNOUT_TRIGGER",
      "specialTrigger must be a supported Burn-Out trigger.",
      { value }
    );
  }
  return definition.value;
}

function requireAttackProperty(source) {
  const value = requireSingleAttackProperty(source);
  const definition = getAttackPropertyDefinition(value);
  if (!definition) {
    throw energyShieldError(
      "INVALID_ATTACK_PROPERTY",
      "attackProperty must be a supported Attack Property.",
      { value }
    );
  }
  return definition.value;
}

export function getPenetrationTestCount({
  attackProperty,
  attackProperties,
  shieldCandidateDamage
}) {
  const property = requireAttackProperty({ attackProperty, attackProperties });
  const candidateDamage = requireNonNegativeInteger(
    shieldCandidateDamage,
    "shieldCandidateDamage"
  );
  if (property === ATTACK_PROPERTY_KEYS.BLASTER) return candidateDamage;
  if (property === ATTACK_PROPERTY_KEYS.FLAME) {
    return Math.floor(candidateDamage / 2);
  }
  return 0;
}

export function resolvePenetrationResults({ testCount, results }) {
  const normalizedTestCount = requireNonNegativeInteger(testCount, "testCount");
  if (!Array.isArray(results) || results.length !== normalizedTestCount) {
    throw energyShieldError(
      "INVALID_PENETRATION_RESULTS",
      "Penetration results must match the expected test count.",
      { testCount: normalizedTestCount, results }
    );
  }
  if (results.some(result => typeof result !== "boolean")) {
    throw energyShieldError(
      "INVALID_PENETRATION_RESULTS",
      "Each Penetration result must be a Boolean.",
      { results }
    );
  }
  const penetrated = results.filter(Boolean).length;
  return {
    testCount: normalizedTestCount,
    results: [...results],
    penetrated,
    blocked: normalizedTestCount - penetrated
  };
}

export function evaluatePenetration({
  attackProperty,
  attackProperties,
  incomingDamage,
  thresholdMax,
  results
}) {
  const property = requireAttackProperty({ attackProperty, attackProperties });
  const damage = requireNonNegativeInteger(incomingDamage, "incomingDamage");
  const maximum = requireNonNegativeInteger(thresholdMax, "thresholdMax");
  const shieldCandidateDamage = Math.min(damage, maximum);
  const overflowDamage = Math.max(0, damage - maximum);
  const testCount = getPenetrationTestCount({
    attackProperty: property,
    shieldCandidateDamage
  });
  const tests = resolvePenetrationResults({ testCount, results });

  return {
    applicable: [ATTACK_PROPERTY_KEYS.BLASTER, ATTACK_PROPERTY_KEYS.FLAME]
      .includes(property),
    type: property,
    shieldCandidateDamage,
    overflowDamage,
    ...tests,
    penetratingDamage: overflowDamage + tests.penetrated,
    shieldBlockedDamage: shieldCandidateDamage - tests.penetrated
  };
}

export function evaluateBurnoutRoll({ goal, result }) {
  const normalizedGoal = requireBoundedInteger(goal, "goal", 1, 20);
  const normalizedResult = requireBoundedInteger(result, "result", 1, 20);
  const success = normalizedResult !== 20 && normalizedResult <= normalizedGoal;
  return {
    goal: normalizedGoal,
    result: normalizedResult,
    success,
    failure: !success
  };
}

export function resolveBurnoutRequirement({
  activationsBefore,
  lowerThreshold,
  specialTrigger = BURNOUT_TRIGGER_KEYS.NONE
}) {
  const normalizedActivations = requireNonNegativeInteger(
    activationsBefore,
    "activationsBefore"
  );
  const normalizedThreshold = requireNonNegativeInteger(
    lowerThreshold,
    "lowerThreshold"
  );
  const trigger = requireBurnoutTrigger(specialTrigger);
  const prospectiveActivation = normalizedActivations + 1;
  const activationLimitExceeded = prospectiveActivation > normalizedThreshold;
  const specialTriggerRequired = trigger !== BURNOUT_TRIGGER_KEYS.NONE;

  if (activationLimitExceeded && specialTriggerRequired) {
    throw energyShieldError(
      "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION",
      "Activation overload and a special Burn-Out trigger require manual GM resolution.",
      {
        activationsBefore: normalizedActivations,
        lowerThreshold: normalizedThreshold,
        specialTrigger: trigger
      }
    );
  }

  return {
    activationsBefore: normalizedActivations,
    lowerThreshold: normalizedThreshold,
    prospectiveActivation,
    activationLimitExceeded,
    specialTriggerRequired,
    specialTrigger: trigger,
    burnoutRequired: activationLimitExceeded || specialTriggerRequired
  };
}

export function remainingBurnoutRounds({ untilRound, currentRound }) {
  const end = requireCombatRound(untilRound, "untilRound");
  const current = requireCombatRound(currentRound, "currentRound");
  return Math.max(end - current, 0);
}

export function isBurnoutActive({ burnout, combatId, round }) {
  const currentCombatId = requireCombatId(combatId);
  const currentRound = requireCombatRound(round);
  if (!burnout || burnout.active !== true) return false;
  if (burnout.combatId !== currentCombatId) return false;
  return remainingBurnoutRounds({
    untilRound: burnout.untilRound,
    currentRound
  }) > 0;
}

export function resolveEnergyShieldRuntime({ runtime = {}, combatId, round }) {
  const currentCombatId = requireCombatId(combatId);
  const currentRound = requireCombatRound(round);
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_RUNTIME",
      "runtime must be an Object.",
      { runtime }
    );
  }

  const sameCombat = runtime.combatId === currentCombatId;
  const sameRound = sameCombat && runtime.round === currentRound;
  const activationsThisRound = sameRound
    ? requireNonNegativeInteger(
      runtime.activationsThisRound ?? 0,
      "activationsThisRound"
    )
    : 0;
  const distortionRound = sameCombat
    && Number.isInteger(runtime.distortionRound)
    && runtime.distortionRound >= 1
    ? runtime.distortionRound
    : null;
  const burnout = runtime.burnout && typeof runtime.burnout === "object"
    ? { ...runtime.burnout }
    : null;
  const burnoutActive = isBurnoutActive({
    burnout,
    combatId: currentCombatId,
    round: currentRound
  });

  return {
    combatId: currentCombatId,
    round: currentRound,
    activationsThisRound,
    distortionRound,
    burnout,
    burnoutActive,
    burnoutRemaining: burnoutActive
      ? remainingBurnoutRounds({
        untilRound: burnout.untilRound,
        currentRound
      })
      : 0
  };
}

export function isDistortionApplicable({
  attackRangeBand = ATTACK_RANGE_BAND_KEYS.NONE,
  runtime,
  combatId,
  round
}) {
  const range = getAttackRangeBandDefinition(attackRangeBand);
  if (!range) {
    throw energyShieldError(
      "INVALID_ATTACK_RANGE_BAND",
      "attackRangeBand must be a supported range band.",
      { attackRangeBand }
    );
  }
  if (![ATTACK_RANGE_BAND_KEYS.LONG, ATTACK_RANGE_BAND_KEYS.EXTREME]
    .includes(range.value)) {
    return false;
  }
  const state = resolveEnergyShieldRuntime({ runtime, combatId, round });
  return state.distortionRound === state.round;
}

export function normalizeEnergyShieldCompatibilityList(values, label) {
  if (values === undefined || values === null) return [];
  if (!Array.isArray(values)) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_COMPATIBILITY",
      `${label} must be an Array.`,
      { label, values }
    );
  }

  return [...new Set(values
    .map(normalizeEnergyShieldCompatibility)
    .filter(Boolean))];
}

export function resolveEnergyShieldCompatibility({
  shieldCompatibility = [],
  armorCompatibility = [],
  hasWornArmor = false
} = {}) {
  const compatibleArmor = normalizeEnergyShieldCompatibilityList(
    shieldCompatibility,
    "shieldCompatibility"
  );
  const eShieldCompatibility = normalizeEnergyShieldCompatibilityList(
    armorCompatibility,
    "armorCompatibility"
  );

  if (!hasWornArmor) {
    return {
      compatible: true,
      shieldCompatibility: compatibleArmor,
      armorCompatibility: eShieldCompatibility
    };
  }
  if (eShieldCompatibility.length === 0) {
    throw energyShieldError(
      "ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED",
      "Equipped worn Armor must declare its Energy Shield compatibility."
    );
  }

  return {
    compatible: eShieldCompatibility.some(value => compatibleArmor.includes(value)),
    shieldCompatibility: compatibleArmor,
    armorCompatibility: eShieldCompatibility
  };
}

export function resolveEnergyShieldProtection({
  damage,
  thresholdMin,
  thresholdMax,
  hitsRemaining,
  available = true,
  unavailableReason = "unavailable"
}) {
  const incomingDamage = requireNonNegativeInteger(damage, "damage");
  const minimum = requireNonNegativeInteger(thresholdMin, "thresholdMin");
  const maximum = requireNonNegativeInteger(thresholdMax, "thresholdMax");
  const hitsBefore = requireNonNegativeInteger(hitsRemaining, "hitsRemaining");

  if (maximum < minimum) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_THRESHOLDS",
      "thresholdMax must be greater than or equal to thresholdMin.",
      { thresholdMin: minimum, thresholdMax: maximum }
    );
  }
  if (typeof available !== "boolean") {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_AVAILABILITY",
      "available must be a Boolean.",
      { available }
    );
  }

  const base = {
    incomingDamage,
    thresholdMin: minimum,
    thresholdMax: maximum,
    hitsBefore,
    hitsAfter: hitsBefore,
    available,
    activated: false,
    blockedDamage: 0,
    penetratingDamage: incomingDamage,
    hitConsumed: false
  };

  if (!available) {
    return {
      ...base,
      reason: String(unavailableReason || "unavailable")
    };
  }
  if (hitsBefore === 0) {
    return { ...base, reason: "depleted" };
  }
  if (incomingDamage < minimum) {
    return { ...base, reason: "belowThreshold" };
  }

  const blockedDamage = Math.min(incomingDamage, maximum);
  return {
    ...base,
    hitsAfter: hitsBefore - 1,
    activated: true,
    blockedDamage,
    penetratingDamage: incomingDamage - blockedDamage,
    hitConsumed: true,
    reason: "activated"
  };
}
