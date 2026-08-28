import { ATTACK_PROPERTY_KEYS } from "../config.mjs";
import {
  normalizeAttackProperties,
  requireSingleAttackProperty
} from "../rules/attackProperties.mjs";

const SCOPE = "fadingsuns4e";

export class DamageSourceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DamageSourceError";
    this.code = code;
    this.details = details;
  }
}

function damageSourceError(code, message, details = {}) {
  return new DamageSourceError(code, message, details);
}

function requireDamage(value) {
  const damage = Number(value);
  if (!Number.isInteger(damage) || damage < 0) {
    throw damageSourceError(
      "INVALID_NON_NEGATIVE_INTEGER",
      "Damage must be a non-negative integer.",
      { value }
    );
  }
  return damage;
}

function requireAttackProperties(source) {
  try {
    const properties = normalizeAttackProperties(source);
    return properties.length > 0
      ? properties
      : [ATTACK_PROPERTY_KEYS.NONE];
  } catch (error) {
    throw damageSourceError(
      error.code ?? "INVALID_ATTACK_PROPERTY",
      error.message ?? "The Damage source contains an invalid Attack Property.",
      error.details ?? { source }
    );
  }
}

function requireAttackProperty(source) {
  try {
    return requireSingleAttackProperty(source);
  } catch (error) {
    throw damageSourceError(
      error.code ?? "INVALID_ATTACK_PROPERTY",
      error.message ?? "The Damage source contains an invalid Attack Property.",
      error.details ?? { source }
    );
  }
}

function prepareAttackPropertyFields(source) {
  const attackProperties = requireAttackProperties(source);
  const usesCollection = source
    && typeof source === "object"
    && Object.prototype.hasOwnProperty.call(source, "attackProperties");
  if (!usesCollection) {
    return { attackProperty: attackProperties[0] };
  }
  return {
    attackProperties,
    ...(attackProperties.length === 1
      ? { attackProperty: attackProperties[0] }
      : {})
  };
}

function requireActorUuid(value, code, message) {
  if (typeof value !== "string" || value.length === 0) {
    throw damageSourceError(code, message, { value });
  }
  return value;
}

function requireWeaponSource(message, sourceActorUuid) {
  const source = message.getFlag(SCOPE, "weaponAttack");
  if (!source) return null;
  if (
    source.status !== "resolved"
    || source.attackerActorUuid !== sourceActorUuid
    || typeof source.weaponUuid !== "string"
    || source.weaponUuid.length === 0
  ) {
    throw damageSourceError(
      "DAMAGE_SOURCE_MISMATCH",
      "The Weapon source does not match the Trait Pair roll."
    );
  }
  return source;
}

function equalProperties(left, right) {
  const leftValues = requireAttackProperties(left);
  const rightValues = requireAttackProperties(right);
  return leftValues.length === rightValues.length
    && leftValues.every((value, index) => value === rightValues[index]);
}

function prepareTraitPairDamage(message) {
  const rollData = message.getFlag(SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") return null;

  const resistanceData = message.getFlag(SCOPE, "resistance");
  if (resistanceData?.status !== "resolved" || resistanceData.victory !== true) {
    throw damageSourceError(
      "DAMAGE_REQUIRES_VICTORY",
      "Damage can only be applied after a resolved Victory."
    );
  }
  const sourceActorUuid = requireActorUuid(
    rollData.actorUuid,
    "DAMAGE_SOURCE_MISMATCH",
    "The Trait Pair roll does not identify its source Actor."
  );
  if (resistanceData.actorUuid !== sourceActorUuid) {
    throw damageSourceError(
      "DAMAGE_SOURCE_MISMATCH",
      "Roll and Resistance flags refer to different source Actors."
    );
  }
  const weaponSource = requireWeaponSource(message, sourceActorUuid);

  const impactData = message.getFlag(SCOPE, "impact");
  if (impactData?.status !== "resolved") {
    throw damageSourceError(
      "DAMAGE_IMPACT_NOT_RESOLVED",
      "A resolved Damage Impact is required."
    );
  }
  if (impactData.type !== "damage") {
    throw damageSourceError(
      "IMPACT_IS_NOT_DAMAGE",
      "Only a Damage Impact can be applied to Vitality."
    );
  }
  if (impactData.actorUuid !== sourceActorUuid) {
    throw damageSourceError(
      "DAMAGE_SOURCE_MISMATCH",
      "Roll and Impact flags refer to different source Actors."
    );
  }

  const targetActorUuid = resistanceData.mode === "targetBody"
    ? requireActorUuid(
      resistanceData.targetActorUuid,
      "DAMAGE_TARGET_MISMATCH",
      "Target Body Resistance does not identify its target Actor."
    )
    : null;
  if (weaponSource) {
    if (
      resistanceData.mode !== "targetBody"
      || targetActorUuid !== weaponSource.targetActorUuid
      || !equalProperties(resistanceData, weaponSource)
    ) {
      throw damageSourceError(
        "DAMAGE_SOURCE_MISMATCH",
        "Resistance does not match the bound Weapon target and properties."
      );
    }
    if (requireDamage(impactData.baseDamage) !== requireDamage(
      weaponSource.baseDamage
    )) {
      throw damageSourceError(
        "DAMAGE_SOURCE_MISMATCH",
        "Impact does not use the Weapon base Damage."
      );
    }
  }
  const attackPropertyFields = prepareAttackPropertyFields(resistanceData);
  const baseDamage = requireDamage(impactData.totalDamage);
  const attackPropertyDamage = resistanceData.attackPropertyDamage;
  let propertyDamageBonus = 0;
  if (attackPropertyDamage) {
    const attackProperty = requireAttackProperty(attackPropertyFields);
    const modifierProperty = requireAttackProperty(attackPropertyDamage);
    if (modifierProperty !== attackProperty) {
      throw damageSourceError(
        "DAMAGE_SOURCE_MISMATCH",
        "Attack Property and Damage modifier flags do not match."
      );
    }
    propertyDamageBonus = requireDamage(attackPropertyDamage.bonusDamage);
    if (
      modifierProperty !== ATTACK_PROPERTY_KEYS.SHOCK
      || attackPropertyDamage.applied !== true
      || propertyDamageBonus !== 2
    ) {
      throw damageSourceError(
        "DAMAGE_SOURCE_MISMATCH",
        "The Attack Property Damage modifier is invalid."
      );
    }
  }
  return {
    sourceType: weaponSource ? "weaponAttack" : "traitPair",
    ...(weaponSource ? {
      weaponUuid: weaponSource.weaponUuid,
      targetTokenUuid: weaponSource.targetTokenUuid ?? null,
      ...(weaponSource.fireMode ? {
        fireMode: weaponSource.fireMode,
        burnoutTrigger: weaponSource.burnoutTrigger ?? "none"
      } : {})
    } : {}),
    sourceActorUuid,
    targetActorUuid,
    targetName: String(resistanceData.targetName ?? ""),
    damage: baseDamage + propertyDamageBonus,
    ...attackPropertyFields,
    resistanceBinding: {
      mode: resistanceData.mode ?? null,
      targetActorUuid
    },
    ...(propertyDamageBonus > 0 ? {
      baseDamage,
      attackPropertyDamage: {
        ...attackPropertyDamage,
        bonusDamage: propertyDamageBonus
      }
    } : {})
  };
}

function prepareGmDamage(message) {
  const gmDamage = message.getFlag(SCOPE, "gmDamage");
  if (!gmDamage) return null;
  if (gmDamage.status !== "resolved") {
    throw damageSourceError(
      "GM_DAMAGE_NOT_RESOLVED",
      "The GM Damage source is not resolved."
    );
  }
  const targetActorUuid = requireActorUuid(
    gmDamage.targetActorUuid,
    "DAMAGE_TARGET_MISMATCH",
    "GM Damage does not identify its bound target Actor."
  );
  const damage = requireDamage(gmDamage.damage);
  const baseDamage = gmDamage.attackPropertyDamage
    ? requireDamage(gmDamage.baseDamage)
    : null;
  const propertyDamageBonus = gmDamage.attackPropertyDamage
    ? requireDamage(gmDamage.attackPropertyDamage.bonusDamage)
    : 0;
  if (
    gmDamage.attackPropertyDamage
    && (
      gmDamage.attackPropertyDamage.attackProperty !== ATTACK_PROPERTY_KEYS.SHOCK
      || gmDamage.attackPropertyDamage.applied !== true
      || propertyDamageBonus !== 2
      || baseDamage + propertyDamageBonus !== damage
    )
  ) {
    throw damageSourceError(
      "DAMAGE_SOURCE_MISMATCH",
      "The GM Damage modifier does not match its final Damage."
    );
  }
  return {
    sourceType: "gmDamage",
    sourceActorUuid: null,
    targetActorUuid,
    targetName: String(gmDamage.targetName ?? ""),
    damage,
    ...prepareAttackPropertyFields(gmDamage),
    resistanceBinding: {
      mode: "gmDamage",
      targetActorUuid
    },
    ...(gmDamage.attackPropertyDamage ? {
      baseDamage,
      attackPropertyDamage: {
        ...gmDamage.attackPropertyDamage,
        bonusDamage: requireDamage(gmDamage.attackPropertyDamage.bonusDamage)
      }
    } : {})
  };
}

// Both official producers are normalized here so Energy Shield and Vitality
// orchestration do not need separate rule paths.
export function prepareDamageSource(message) {
  if (!message || typeof message.getFlag !== "function") {
    throw damageSourceError(
      "INVALID_CHAT_MESSAGE",
      "A ChatMessage with Foundry flags is required."
    );
  }
  const traitPair = prepareTraitPairDamage(message);
  if (traitPair) return traitPair;
  const gmDamage = prepareGmDamage(message);
  if (gmDamage) return gmDamage;
  throw damageSourceError(
    "INVALID_TRAIT_PAIR_MESSAGE",
    "The ChatMessage does not contain an official Damage source."
  );
}
