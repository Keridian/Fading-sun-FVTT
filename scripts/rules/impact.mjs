export const RESULT_IMPACT_LEVELS = Object.freeze({
  basic: Object.freeze({ level: "basic", requiredVp: 0 }),
  good: Object.freeze({ level: "good", requiredVp: 2 }),
  better: Object.freeze({ level: "better", requiredVp: 4 }),
  best: Object.freeze({ level: "best", requiredVp: 6 })
});

export class ImpactRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ImpactRuleError";
    this.code = code;
    this.details = details;
  }
}

export function requireImpactInteger(value, label) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new ImpactRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new ImpactRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  return number;
}

export function resolveResultImpact({ level, vpSpent }) {
  if (typeof level !== "string" || !Object.hasOwn(RESULT_IMPACT_LEVELS, level)) {
    throw new ImpactRuleError(
      "UNKNOWN_IMPACT_LEVEL",
      `Unknown Result Impact level: ${level}.`,
      { level }
    );
  }
  const impactLevel = RESULT_IMPACT_LEVELS[level];

  const normalizedVpSpent = requireImpactInteger(vpSpent, "vpSpent");
  if (normalizedVpSpent !== impactLevel.requiredVp) {
    throw new ImpactRuleError(
      "IMPACT_COST_MISMATCH",
      `${level} Result Impact requires exactly ${impactLevel.requiredVp} VP.`,
      {
        level,
        requiredVp: impactLevel.requiredVp,
        vpSpent: normalizedVpSpent
      }
    );
  }

  return {
    type: "result",
    level: impactLevel.level,
    requiredVp: impactLevel.requiredVp,
    vpSpent: normalizedVpSpent
  };
}

export function evaluateRestraint({ baseDamage, vpSpent }) {
  const normalizedBaseDamage = requireImpactInteger(baseDamage, "baseDamage");
  const normalizedVpSpent = requireImpactInteger(vpSpent, "vpSpent");

  if (normalizedVpSpent % 2 !== 0) {
    throw new ImpactRuleError(
      "RESTRAINT_SPEND_MUST_BE_EVEN",
      "Restraint requires an even VP spend.",
      { vpSpent: normalizedVpSpent }
    );
  }

  const reduction = normalizedVpSpent / 2;
  return {
    baseDamage: normalizedBaseDamage,
    vpSpent: normalizedVpSpent,
    reduction,
    finalBaseDamage: Math.max(0, normalizedBaseDamage - reduction)
  };
}

export function resolveDamageImpact({
  baseDamage,
  vpSpent,
  restraintVpSpent = 0
}) {
  const restraint = evaluateRestraint({
    baseDamage,
    vpSpent: restraintVpSpent
  });
  const normalizedVpSpent = requireImpactInteger(vpSpent, "vpSpent");

  if (normalizedVpSpent % 2 !== 0) {
    throw new ImpactRuleError(
      "DAMAGE_SPEND_MUST_BE_EVEN",
      "Damage Impact requires an even VP spend.",
      { vpSpent: normalizedVpSpent }
    );
  }

  const bonusDamage = normalizedVpSpent / 2;
  return {
    type: "damage",
    baseDamage: restraint.baseDamage,
    restraintVpSpent: restraint.vpSpent,
    restraintReduction: restraint.reduction,
    baseDamageAfterRestraint: restraint.finalBaseDamage,
    vpSpent: normalizedVpSpent,
    bonusDamage,
    totalDamage: restraint.finalBaseDamage + bonusDamage
  };
}
