export class ResistanceRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ResistanceRuleError";
    this.code = code;
    this.details = details;
  }
}

export function requireNonNegativeInteger(value, label) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new ResistanceRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new ResistanceRuleError(
      "INVALID_NON_NEGATIVE_INTEGER",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  return number;
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new ResistanceRuleError(
      "INVALID_BOOLEAN",
      `${label} must be a boolean.`,
      { label, value }
    );
  }
  return value;
}

export function resolveResistance({
  success,
  ignoresResistance,
  resistance,
  vpSpent
}) {
  const normalizedSuccess = requireBoolean(success, "success");
  const normalizedIgnoresResistance = requireBoolean(
    ignoresResistance,
    "ignoresResistance"
  );
  const normalizedResistance = requireNonNegativeInteger(
    resistance,
    "resistance"
  );
  const normalizedVpSpent = requireNonNegativeInteger(vpSpent, "vpSpent");

  if (!normalizedSuccess) {
    throw new ResistanceRuleError(
      "RESISTANCE_REQUIRES_SUCCESS",
      "Resistance can only be resolved for a successful Goal Roll."
    );
  }

  if (normalizedIgnoresResistance) {
    if (normalizedVpSpent !== 0) {
      throw new ResistanceRuleError(
        "RESISTANCE_BYPASSED_SPEND",
        "No Victory Points may be spent when Resistance is ignored.",
        { vpSpent: normalizedVpSpent }
      );
    }

    return {
      resistance: normalizedResistance,
      vpSpent: 0,
      victory: true,
      failure: false,
      resistanceBypassed: true,
      shortfall: 0,
      overpaid: 0
    };
  }

  const victory = normalizedVpSpent >= normalizedResistance;
  return {
    resistance: normalizedResistance,
    vpSpent: normalizedVpSpent,
    victory,
    failure: !victory,
    resistanceBypassed: false,
    shortfall: Math.max(normalizedResistance - normalizedVpSpent, 0),
    overpaid: Math.max(normalizedVpSpent - normalizedResistance, 0)
  };
}
