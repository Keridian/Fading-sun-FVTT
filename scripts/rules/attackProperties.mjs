import {
  ATTACK_PROPERTY_KEYS,
  getAttackPropertyDefinition
} from "../config.mjs";

export class AttackPropertiesRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AttackPropertiesRuleError";
    this.code = code;
    this.details = details;
  }
}

function attackPropertiesError(code, message, details = {}) {
  return new AttackPropertiesRuleError(code, message, details);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function rawAttackProperties(source) {
  if (source === undefined || source === null) return [];
  if (typeof source === "string" || Array.isArray(source)) return source;
  if (typeof source !== "object") {
    throw attackPropertiesError(
      "INVALID_ATTACK_PROPERTIES",
      "Attack Properties must be a String, an Array, or a compatible source object.",
      { source }
    );
  }

  const hasCollection = hasOwn(source, "attackProperties");
  const hasLegacy = hasOwn(source, "attackProperty");
  if (!hasCollection && !hasLegacy) return [];

  const collection = hasCollection
    ? normalizeAttackProperties(source.attackProperties)
    : [];
  const legacy = hasLegacy
    ? normalizeAttackProperties(source.attackProperty)
    : [];

  if (collection.length === 0) return legacy;
  if (legacy.length === 0) return collection;
  if (legacy.length !== 1 || !collection.includes(legacy[0])) {
    throw attackPropertiesError(
      "ATTACK_PROPERTIES_FORMAT_CONFLICT",
      "Legacy and collection Attack Property formats conflict.",
      { attackProperty: source.attackProperty, attackProperties: source.attackProperties }
    );
  }
  return collection;
}

export function normalizeAttackProperties(source) {
  const raw = rawAttackProperties(source);
  const values = Array.isArray(raw) ? raw : [raw];
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    const definition = getAttackPropertyDefinition(value);
    if (!definition) {
      throw attackPropertiesError(
        "INVALID_ATTACK_PROPERTY",
        "The source contains an unsupported Attack Property.",
        { value }
      );
    }
    if (seen.has(definition.value)) continue;
    seen.add(definition.value);
    normalized.push(definition.value);
  }
  return normalized;
}

export function requireSingleAttackProperty(source, {
  defaultProperty = ATTACK_PROPERTY_KEYS.NONE
} = {}) {
  const attackProperties = normalizeAttackProperties(source);
  if (attackProperties.length > 1) {
    throw attackPropertiesError(
      "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED",
      "Multiple Attack Properties require an explicit mechanical resolution rule.",
      { attackProperties }
    );
  }
  if (attackProperties.length === 1) return attackProperties[0];

  const fallback = getAttackPropertyDefinition(defaultProperty);
  if (!fallback) {
    throw attackPropertiesError(
      "INVALID_ATTACK_PROPERTY",
      "The default Attack Property is unsupported.",
      { defaultProperty }
    );
  }
  return fallback.value;
}
