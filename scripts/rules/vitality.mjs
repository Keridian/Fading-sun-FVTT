export class VitalityRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "VitalityRuleError";
    this.code = code;
    this.details = details;
  }
}

function requireNonNegativeInteger(value, label) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new VitalityRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new VitalityRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  return number;
}

export function applyDamageToVitality({ vitality, damage }) {
  const vitalityBefore = requireNonNegativeInteger(vitality, "vitality");
  const normalizedDamage = requireNonNegativeInteger(damage, "damage");
  const vitalityAfter = Math.max(0, vitalityBefore - normalizedDamage);
  const vitalityLost = vitalityBefore - vitalityAfter;
  const unconsciousTriggered = (
    vitalityBefore > 0
    && vitalityAfter === 0
    && normalizedDamage > 0
  );
  const dyingTriggered = vitalityBefore === 0 && normalizedDamage > 0;

  return {
    damage: normalizedDamage,
    vitalityBefore,
    vitalityAfter,
    vitalityLost,
    reachedZero: unconsciousTriggered,
    unconsciousTriggered,
    dyingTriggered
  };
}
