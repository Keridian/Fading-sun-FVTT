import {
  ARMOR_PROOF_KEYS,
  ATTACK_PROPERTY_KEYS,
  getAttackPropertyDefinition,
  normalizeArmorProof
} from "../config.mjs";
import { requireSingleAttackProperty } from "./attackProperties.mjs";

export class ArmorRuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ArmorRuleError";
    this.code = code;
    this.details = details;
  }
}

function requireAttackProperty(source) {
  const value = requireSingleAttackProperty(source);
  const definition = getAttackPropertyDefinition(value);
  if (!definition) {
    throw new ArmorRuleError(
      "INVALID_ATTACK_PROPERTY",
      "attackProperty must be a supported Attack Property.",
      { value }
    );
  }
  return definition;
}

function normalizeArmorProofs(proofs) {
  if (proofs === undefined || proofs === null) return [];
  if (!Array.isArray(proofs)) {
    throw new ArmorRuleError(
      "INVALID_ARMOR_PROOFS",
      "proofs must be an Array.",
      { proofs }
    );
  }
  return proofs
    .map(normalizeArmorProof)
    .filter(proof => proof.length > 0);
}

export const SHOCK_METALLIC_DAMAGE_BONUS = 2;

export function resolveAttackPropertyDamageModifier({
  armors = [],
  attackProperty,
  attackProperties
} = {}) {
  if (!Array.isArray(armors)) {
    throw new ArmorRuleError(
      "INVALID_ARMOR_LIST",
      "armors must be an Array.",
      { armors }
    );
  }
  const property = requireAttackProperty({ attackProperty, attackProperties });
  const qualifyingArmorIds = property.value === ATTACK_PROPERTY_KEYS.SHOCK
    ? armors
      .filter(armor => (
        armor?.equipped === true
        && ["worn", "handShield"].includes(armor.armorKind)
        && armor.metallic === true
        && !normalizeArmorProofs(armor.proofs).includes(ARMOR_PROOF_KEYS.SHOCK)
      ))
      .map(armor => String(armor.id ?? ""))
    : [];
  const applied = qualifyingArmorIds.length > 0;
  return {
    attackProperty: property.value,
    bonusDamage: applied ? SHOCK_METALLIC_DAMAGE_BONUS : 0,
    applied,
    qualifyingArmorIds
  };
}

export function requireArmorResistance(value, label) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new ArmorRuleError(
      "INVALID_ARMOR_RESISTANCE",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new ArmorRuleError(
      "INVALID_ARMOR_RESISTANCE",
      `${label} must be a non-negative integer.`,
      { label, value }
    );
  }
  return number;
}

function requireAdjustment(value) {
  if (
    value === null
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim() === "")
  ) {
    throw new ArmorRuleError(
      "INVALID_RESISTANCE_ADJUSTMENT",
      "adjustment must be an integer.",
      { value }
    );
  }

  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new ArmorRuleError(
      "INVALID_RESISTANCE_ADJUSTMENT",
      "adjustment must be an integer.",
      { value }
    );
  }
  return number;
}

export function resolveArmorResistanceAgainstAttack({
  resistance,
  proofs = [],
  attackProperty,
  attackProperties
}) {
  const baseResistance = requireArmorResistance(resistance, "resistance");
  const normalizedProofs = normalizeArmorProofs(proofs);
  const property = requireAttackProperty({ attackProperty, attackProperties });
  const requiredProof = property.requiredProof;

  if (property.value === ATTACK_PROPERTY_KEYS.NONE) {
    return {
      baseResistance,
      effectiveResistance: baseResistance,
      attackProperty: property.value,
      requiredProof: null,
      proofed: null,
      ignored: false,
      halved: false,
      rule: "none"
    };
  }

  if (property.value === ATTACK_PROPERTY_KEYS.SONIC) {
    return {
      baseResistance,
      effectiveResistance: 0,
      attackProperty: property.value,
      requiredProof: null,
      proofed: null,
      ignored: true,
      halved: false,
      rule: "ignored"
    };
  }

  const proofed = normalizedProofs.includes(requiredProof);
  if (property.value === ATTACK_PROPERTY_KEYS.SHOCK) {
    return {
      baseResistance,
      effectiveResistance: proofed ? baseResistance : 0,
      attackProperty: property.value,
      requiredProof,
      proofed,
      ignored: false,
      halved: false,
      rule: proofed ? "full" : "zero"
    };
  }

  if (property.value === ATTACK_PROPERTY_KEYS.ULTRA_HARD) {
    return {
      baseResistance,
      effectiveResistance: proofed ? Math.floor(baseResistance / 2) : 0,
      attackProperty: property.value,
      requiredProof,
      proofed,
      ignored: false,
      halved: proofed,
      rule: proofed ? "halved" : "zero"
    };
  }

  return {
    baseResistance,
    effectiveResistance: proofed
      ? baseResistance
      : Math.floor(baseResistance / 2),
    attackProperty: property.value,
    requiredProof,
    proofed,
    ignored: false,
    halved: !proofed,
    rule: proofed ? "full" : "halved"
  };
}

function selectedArmorData(armor, attackProperty) {
  const proofs = normalizeArmorProofs(armor.proofs);
  const resolution = resolveArmorResistanceAgainstAttack({
    resistance: armor.resistance,
    proofs,
    attackProperty
  });
  return {
    id: String(armor.id ?? ""),
    name: String(armor.name ?? ""),
    resistance: resolution.baseResistance,
    baseResistance: resolution.baseResistance,
    effectiveResistance: resolution.effectiveResistance,
    proofs,
    requiredProof: resolution.requiredProof,
    proofed: resolution.proofed,
    ignored: resolution.ignored,
    halved: resolution.halved,
    rule: resolution.rule
  };
}

export function resolveEquippedArmorResistance({
  armors = [],
  attackProperty,
  attackProperties
} = {}) {
  if (!Array.isArray(armors)) {
    throw new ArmorRuleError(
      "INVALID_ARMOR_LIST",
      "armors must be an Array.",
      { armors }
    );
  }

  const property = requireAttackProperty({ attackProperty, attackProperties });

  const equippedWorn = armors.filter(armor => (
    armor?.equipped === true && armor.armorKind === "worn"
  ));
  const equippedHandShields = armors.filter(armor => (
    armor?.equipped === true && armor.armorKind === "handShield"
  ));

  if (equippedWorn.length > 1) {
    throw new ArmorRuleError(
      "MULTIPLE_WORN_ARMOR",
      "Only one equipped worn armor can contribute automatically.",
      { armors: equippedWorn.map(armor => armor?.id) }
    );
  }
  if (equippedHandShields.length > 1) {
    throw new ArmorRuleError(
      "MULTIPLE_HAND_SHIELDS",
      "Only one equipped handheld shield can contribute automatically.",
      { armors: equippedHandShields.map(armor => armor?.id) }
    );
  }

  const wornArmor = equippedWorn.length
    ? selectedArmorData(equippedWorn[0], property.value)
    : null;
  const handShield = equippedHandShields.length
    ? selectedArmorData(equippedHandShields[0], property.value)
    : null;
  const armorResistance = wornArmor?.effectiveResistance ?? 0;
  const handShieldResistance = handShield?.effectiveResistance ?? 0;

  return {
    attackProperty: property.value,
    wornArmor,
    handShield,
    armorResistance,
    handShieldResistance,
    equipmentResistance: armorResistance + handShieldResistance
  };
}

export function calculateBodyResistance({
  manualResistance,
  armorResistance,
  handShieldResistance,
  distortionResistance = 0,
  adjustment
}) {
  const normalizedManualResistance = requireArmorResistance(
    manualResistance,
    "manualResistance"
  );
  const normalizedArmorResistance = requireArmorResistance(
    armorResistance,
    "armorResistance"
  );
  const normalizedHandShieldResistance = requireArmorResistance(
    handShieldResistance,
    "handShieldResistance"
  );
  const normalizedDistortionResistance = requireArmorResistance(
    distortionResistance,
    "distortionResistance"
  );
  const normalizedAdjustment = requireAdjustment(adjustment);
  const rawResistance = (
    normalizedManualResistance
    + normalizedArmorResistance
    + normalizedHandShieldResistance
    + normalizedDistortionResistance
    + normalizedAdjustment
  );

  return {
    manualResistance: normalizedManualResistance,
    armorResistance: normalizedArmorResistance,
    handShieldResistance: normalizedHandShieldResistance,
    distortionResistance: normalizedDistortionResistance,
    adjustment: normalizedAdjustment,
    rawResistance,
    effectiveResistance: Math.max(0, rawResistance)
  };
}
