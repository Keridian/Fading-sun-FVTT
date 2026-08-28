import {
  ATTACK_RANGE_BAND_KEYS,
  BURNOUT_TRIGGER_KEYS,
  WEAPON_AMMO_MODE_KEYS,
  WEAPON_FIRE_MODE_KEYS,
  getWeaponFireModeDefinition
} from "../config.mjs";
import { normalizeAttackProperties } from "./attackProperties.mjs";
import { calculateGoal } from "./traitPair.mjs";

const RANGE_RULES = Object.freeze({
  [ATTACK_RANGE_BAND_KEYS.SHORT]: Object.freeze({
    rangeBand: ATTACK_RANGE_BAND_KEYS.SHORT,
    characteristicKey: "dexterity",
    skillKey: "shoot",
    rangeModifier: 0
  }),
  [ATTACK_RANGE_BAND_KEYS.LONG]: Object.freeze({
    rangeBand: ATTACK_RANGE_BAND_KEYS.LONG,
    characteristicKey: "perception",
    skillKey: "shoot",
    rangeModifier: -2
  }),
  [ATTACK_RANGE_BAND_KEYS.EXTREME]: Object.freeze({
    rangeBand: ATTACK_RANGE_BAND_KEYS.EXTREME,
    characteristicKey: "perception",
    skillKey: "shoot",
    rangeModifier: -4
  }),
  [ATTACK_RANGE_BAND_KEYS.BEYOND]: Object.freeze({
    rangeBand: ATTACK_RANGE_BAND_KEYS.BEYOND,
    characteristicKey: "perception",
    skillKey: "shoot",
    rangeModifier: -6
  })
});

const AMMO_MODES = new Set(Object.values(WEAPON_AMMO_MODE_KEYS));
const TRACKED_FIRE_MODE_AMMO = new Set([
  WEAPON_AMMO_MODE_KEYS.FINITE,
  WEAPON_AMMO_MODE_KEYS.UNLIMITED
]);

export class WeaponRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WeaponRuleError";
    this.code = code;
    this.details = details;
  }
}

function weaponError(code, message, details = {}) {
  return new WeaponRuleError(code, message, details);
}

function requireInteger(value, label, { minimum = null } = {}) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw weaponError(
      "INVALID_WEAPON_INTEGER",
      `${label} must be an integer.`,
      { label, value }
    );
  }
  const number = Number(value);
  if (!Number.isInteger(number) || (minimum !== null && number < minimum)) {
    throw weaponError(
      "INVALID_WEAPON_INTEGER",
      `${label} must be an integer${minimum === null ? "" : ` of ${minimum} or more`}.`,
      { label, value, minimum }
    );
  }
  return number;
}

function optionalNonNegativeInteger(value) {
  if (
    value === undefined
    || value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function requireNonNegativeInteger(value, label) {
  return requireInteger(value, label, { minimum: 0 });
}

function canonicalKey(value, label) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") {
    throw weaponError(
      "INVALID_WEAPON_CAPABILITY_KEY",
      `${label} must be a String.`,
      { label, value }
    );
  }
  return value.trim();
}

export function resolveWeaponRange(rangeBand) {
  const rule = RANGE_RULES[rangeBand];
  if (!rule) {
    throw weaponError(
      "INVALID_WEAPON_RANGE",
      "The selected Weapon range band is invalid.",
      { rangeBand }
    );
  }
  return { ...rule };
}

export function resolveMinimumStrengthModifier({
  actorStrength,
  minimumStrength
}) {
  const strength = requireInteger(actorStrength, "actorStrength", { minimum: 0 });
  const minimum = requireInteger(
    minimumStrength,
    "minimumStrength",
    { minimum: 0 }
  );
  const missingRanks = Math.max(0, minimum - strength);
  return {
    actorStrength: strength,
    minimumStrength: minimum,
    missingRanks,
    strengthModifier: missingRanks === 0 ? 0 : -missingRanks
  };
}

export function resolveWeaponCapability({
  requiredCapabilityKey = "",
  actorCapabilityKeys = [],
  legacyCapability = ""
} = {}) {
  if (!Array.isArray(actorCapabilityKeys)) {
    throw weaponError(
      "INVALID_WEAPON_CAPABILITIES",
      "actorCapabilityKeys must be an Array.",
      { actorCapabilityKeys }
    );
  }
  const required = canonicalKey(
    requiredCapabilityKey,
    "requiredCapabilityKey"
  );
  const available = [...new Set(actorCapabilityKeys.map(value => (
    canonicalKey(value, "actorCapabilityKey")
  )).filter(Boolean))];
  const legacy = typeof legacyCapability === "string"
    ? legacyCapability.trim()
    : "";
  if (!required) {
    return {
      requiredCapabilityKey: "",
      configured: false,
      present: null,
      legacyCapability: legacy,
      legacyAmbiguous: legacy.length > 0,
      favorability: "normal"
    };
  }
  const present = available.includes(required);
  return {
    requiredCapabilityKey: required,
    configured: true,
    present,
    legacyCapability: legacy,
    legacyAmbiguous: false,
    favorability: present ? "normal" : "unfavorable"
  };
}

export function parseWeaponRateOfFire(value) {
  if (typeof value !== "string") {
    return {
      source: value,
      recognized: false,
      maximumShots: null,
      burstCapable: false,
      burstMarker: null
    };
  }
  const text = value.trim();
  const match = /^(\d+)(?:\s*\(\s*([br])\s*\))?$/iu.exec(text);
  if (!match) {
    return {
      source: value,
      recognized: false,
      maximumShots: null,
      burstCapable: false,
      burstMarker: null
    };
  }
  const maximumShots = Number(match[1]);
  if (!Number.isSafeInteger(maximumShots) || maximumShots < 1) {
    return {
      source: value,
      recognized: false,
      maximumShots: null,
      burstCapable: false,
      burstMarker: null
    };
  }
  return {
    source: value,
    recognized: true,
    maximumShots,
    burstCapable: Boolean(match[2]),
    burstMarker: match[2]?.toLocaleLowerCase("en-US") ?? null
  };
}

export function resolveWeaponRateOfFire({
  rateOfFireConfig = null,
  rateOfFire = ""
} = {}) {
  if (rateOfFireConfig?.configured === true) {
    const configuredValue = optionalNonNegativeInteger(rateOfFireConfig.value);
    const recognized = configuredValue !== null && configuredValue >= 1;
    return {
      source: rateOfFireConfig,
      sourceType: "structured",
      configured: true,
      recognized,
      maximumShots: recognized ? configuredValue : null,
      burstCapable: recognized && rateOfFireConfig.burstCapable === true,
      burstMarker: null
    };
  }

  const legacy = parseWeaponRateOfFire(rateOfFire);
  return {
    ...legacy,
    sourceType: legacy.recognized ? "legacy" : "none",
    configured: false
  };
}

export function resolveWeaponFireMode({
  fireMode = WEAPON_FIRE_MODE_KEYS.SIMPLE,
  rateOfFire = "",
  rateOfFireConfig = null,
  ammoMode = WEAPON_AMMO_MODE_KEYS.LEGACY
} = {}) {
  const definition = getWeaponFireModeDefinition(fireMode);
  if (!definition) {
    throw weaponError(
      "INVALID_WEAPON_FIRE_MODE",
      "The selected Weapon fire mode is invalid.",
      { fireMode }
    );
  }
  if (!AMMO_MODES.has(ammoMode)) {
    throw weaponError(
      "INVALID_WEAPON_AMMO_MODE",
      "The Weapon ammunition mode is invalid.",
      { mode: ammoMode }
    );
  }

  const resolvedRateOfFire = resolveWeaponRateOfFire({
    rateOfFireConfig,
    rateOfFire
  });

  if (definition.value === WEAPON_FIRE_MODE_KEYS.SIMPLE) {
    return {
      fireMode: definition.value,
      requiredAmmo: 1,
      goalModifier: 0,
      damageModifier: 0,
      targetCount: 1,
      areaAttack: false,
      burnoutTrigger: BURNOUT_TRIGGER_KEYS.NONE,
      burstCapableRequired: false,
      rateOfFire: resolvedRateOfFire,
      canUse: true,
      blockedReason: null
    };
  }

  const hasBurstCapability = resolvedRateOfFire.burstCapable;
  const hasCompatibleAmmo = TRACKED_FIRE_MODE_AMMO.has(ammoMode);
  return {
    fireMode: definition.value,
    requiredAmmo: 3,
    goalModifier: 0,
    damageModifier: 1,
    targetCount: 1,
    areaAttack: false,
    burnoutTrigger: BURNOUT_TRIGGER_KEYS.NONE,
    burstCapableRequired: true,
    rateOfFire: resolvedRateOfFire,
    canUse: hasBurstCapability && hasCompatibleAmmo,
    blockedReason: !hasBurstCapability
      ? "burstCapabilityRequired"
      : hasCompatibleAmmo
        ? null
        : "trackedAmmunitionRequired"
  };
}

export function resolveWeaponAmmoState({
  mode = WEAPON_AMMO_MODE_KEYS.LEGACY,
  value,
  max,
  legacyUnlimited = false,
  requiredAmmo = 1
} = {}) {
  if (!AMMO_MODES.has(mode)) {
    throw weaponError(
      "INVALID_WEAPON_AMMO_MODE",
      "The Weapon ammunition mode is invalid.",
      { mode }
    );
  }
  if (typeof legacyUnlimited !== "boolean") {
    throw weaponError(
      "INVALID_WEAPON_AMMO_STATE",
      "legacyUnlimited must be a Boolean.",
      { legacyUnlimited }
    );
  }

  const persistedMode = mode;
  const effectiveMode = mode === WEAPON_AMMO_MODE_KEYS.LEGACY && legacyUnlimited
    ? WEAPON_AMMO_MODE_KEYS.UNLIMITED
    : mode;
  const normalizedValue = optionalNonNegativeInteger(value);
  const normalizedMax = optionalNonNegativeInteger(max);
  const cost = requireNonNegativeInteger(requiredAmmo, "requiredAmmo");

  if (effectiveMode === WEAPON_AMMO_MODE_KEYS.FINITE) {
    const ammoBefore = requireInteger(value, "ammo.value", { minimum: 0 });
    const ammoMax = requireInteger(max, "ammo.max", { minimum: 0 });
    if (ammoBefore > ammoMax) {
      throw weaponError(
        "INVALID_WEAPON_AMMO_STATE",
        "Current Weapon ammunition cannot exceed maximum capacity.",
        { value: ammoBefore, max: ammoMax }
      );
    }
    const canFire = ammoBefore >= cost;
    return {
      persistedMode,
      mode: effectiveMode,
      legacyUnlimited,
      ammoBefore,
      ammoMax,
      requiredAmmo: cost,
      ammoSpent: canFire ? cost : 0,
      ammoAfter: canFire ? ammoBefore - cost : ammoBefore,
      consumesAmmo: true,
      canFire,
      blockedReason: canFire
        ? null
        : ammoBefore === 0
          ? "empty"
          : "insufficient"
    };
  }

  return {
    persistedMode,
    mode: effectiveMode,
    legacyUnlimited,
    ammoBefore: normalizedValue,
    ammoMax: normalizedMax,
    requiredAmmo: cost,
    ammoSpent: 0,
    ammoAfter: normalizedValue,
    consumesAmmo: false,
    canFire: true,
    blockedReason: null
  };
}

export function resolveWeaponAttackPreparation({
  rangeBand,
  characteristicValue,
  skillValue,
  actorStrength,
  minimumStrength,
  weaponModifier = 0,
  requiredCapabilityKey = "",
  actorCapabilityKeys = [],
  legacyCapability = "",
  fireMode = WEAPON_FIRE_MODE_KEYS.SIMPLE,
  rateOfFire = "",
  rateOfFireConfig = null,
  ammo = {},
  attackProperties,
  baseDamage
}) {
  const range = resolveWeaponRange(rangeBand);
  const strength = resolveMinimumStrengthModifier({
    actorStrength,
    minimumStrength
  });
  const modifier = requireInteger(weaponModifier, "weaponModifier");
  const capability = resolveWeaponCapability({
    requiredCapabilityKey,
    actorCapabilityKeys,
    legacyCapability
  });
  const persistedAmmoMode = ammo.mode ?? WEAPON_AMMO_MODE_KEYS.LEGACY;
  const effectiveAmmoMode = persistedAmmoMode === WEAPON_AMMO_MODE_KEYS.LEGACY
    && ammo.legacyUnlimited === true
    ? WEAPON_AMMO_MODE_KEYS.UNLIMITED
    : persistedAmmoMode;
  const fireModeState = resolveWeaponFireMode({
    fireMode,
    rateOfFire,
    rateOfFireConfig,
    ammoMode: effectiveAmmoMode
  });
  const ammoState = resolveWeaponAmmoState({
    ...ammo,
    requiredAmmo: fireModeState.requiredAmmo
  });
  const properties = normalizeAttackProperties(attackProperties);
  const weaponBaseDamage = requireInteger(
    baseDamage,
    "baseDamage",
    { minimum: 0 }
  );
  const damage = weaponBaseDamage + fireModeState.damageModifier;
  const baseGoal = calculateGoal({
    characteristicValue,
    skillValue,
    goalModifier: 0
  });
  const goalModifier = range.rangeModifier
    + modifier
    + strength.strengthModifier
    + fireModeState.goalModifier;
  const finalGoal = calculateGoal({
    characteristicValue,
    skillValue,
    goalModifier
  });

  return {
    ...range,
    characteristicValue,
    skillValue,
    baseGoal,
    weaponModifier: modifier,
    ...strength,
    goalModifier,
    finalGoal,
    fireMode: fireModeState,
    capability,
    favorability: capability.favorability,
    ammo: ammoState,
    attackProperties: properties,
    weaponBaseDamage,
    baseDamage: damage,
    canFire: fireModeState.canUse && ammoState.canFire,
    blockedReason: fireModeState.blockedReason ?? ammoState.blockedReason
  };
}
