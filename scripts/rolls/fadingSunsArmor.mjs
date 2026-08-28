import {
  ArmorRuleError,
  calculateBodyResistance,
  requireArmorResistance,
  resolveAttackPropertyDamageModifier,
  resolveEquippedArmorResistance
} from "../rules/armor.mjs";
import {
  ATTACK_RANGE_BAND_KEYS,
  getAttackRangeBandDefinition
} from "../config.mjs";
import { isDistortionApplicable } from "../rules/energyShield.mjs";
import {
  getActiveCombatContext,
  getEnergyShieldRuntime
} from "./fadingSunsEnergyShield.mjs";

const SUPPORTED_ACTOR_TYPES = new Set(["character", "npc", "creature"]);

function armorError(code, message, details = {}) {
  return new ArmorRuleError(code, message, details);
}

function validateTargetActor(targetActor) {
  if (
    !targetActor
    || targetActor.documentName !== "Actor"
    || !SUPPORTED_ACTOR_TYPES.has(targetActor.type)
    || typeof targetActor.uuid !== "string"
    || targetActor.uuid.length === 0
  ) {
    throw armorError(
      "INVALID_BODY_RESISTANCE_TARGET",
      "Body Resistance requires a character, NPC, or creature Actor."
    );
  }
}

function embeddedItems(targetActor) {
  const items = targetActor.items?.contents ?? targetActor.items;
  if (!items || typeof items[Symbol.iterator] !== "function") {
    throw armorError(
      "INVALID_ARMOR_ITEMS",
      "The target Actor does not provide an iterable embedded Item collection."
    );
  }
  return Array.from(items);
}

function normalizeArmor(item) {
  return {
    id: item.id ?? item._id ?? "",
    name: item.name ?? "",
    armorKind: item.system?.armorKind,
    equipped: item.system?.equipped === true,
    resistance: item.system?.resistance,
    proofs: item.system?.proofs,
    metallic: item.system?.metallic === true
  };
}

function actorArmors(targetActor) {
  return embeddedItems(targetActor)
    .filter(item => item?.type === "armor")
    .map(normalizeArmor);
}

export function prepareAttackPropertyDamageModifier(targetActor, {
  attackProperty,
  attackProperties
} = {}) {
  validateTargetActor(targetActor);
  return resolveAttackPropertyDamageModifier({
    armors: actorArmors(targetActor),
    attackProperty,
    attackProperties
  });
}

function resolveDistortionResistance(items, attackRangeBand, combat) {
  const range = getAttackRangeBandDefinition(attackRangeBand);
  if (!range) {
    throw armorError(
      "INVALID_ATTACK_RANGE_BAND",
      "attackRangeBand must be a supported range band.",
      { attackRangeBand }
    );
  }
  if (!combat.available) return { attackRangeBand: range.value, value: 0 };

  const applicable = items
    .filter(item => item?.type === "energyShield")
    .filter(item => isDistortionApplicable({
      attackRangeBand: range.value,
      runtime: getEnergyShieldRuntime(item),
      combatId: combat.combatId,
      round: combat.round
    }));
  if (applicable.length > 1) {
    throw armorError(
      "MULTIPLE_DISTORTION_ENERGY_SHIELDS",
      "Only one Energy Shield Distortion can contribute automatically.",
      { shields: applicable.map(item => item.id ?? item._id ?? "") }
    );
  }
  const value = applicable.length
    ? requireArmorResistance(
      applicable[0].system?.distortion,
      "distortionResistance"
    )
    : 0;
  return { attackRangeBand: range.value, value };
}

export function prepareTargetBodyResistance(targetActor, {
  adjustment = 0,
  attackProperty,
  attackProperties,
  attackRangeBand = ATTACK_RANGE_BAND_KEYS.NONE
} = {}) {
  validateTargetActor(targetActor);
  const items = embeddedItems(targetActor);
  const manualResistance = requireArmorResistance(
    targetActor.system?.resistances?.body?.manual,
    "manualResistance"
  );
  const armors = items.filter(item => item?.type === "armor").map(normalizeArmor);
  const equipment = resolveEquippedArmorResistance({
    armors,
    attackProperty,
    attackProperties
  });
  const combat = getActiveCombatContext();
  const distortion = resolveDistortionResistance(
    items,
    attackRangeBand,
    combat
  );
  const resistance = calculateBodyResistance({
    manualResistance,
    armorResistance: equipment.armorResistance,
    handShieldResistance: equipment.handShieldResistance,
    distortionResistance: distortion.value,
    adjustment
  });
  const attackPropertyDamage = resolveAttackPropertyDamageModifier({
    armors,
    attackProperty: equipment.attackProperty
  });

  return {
    targetActorUuid: targetActor.uuid,
    targetName: String(targetActor.name ?? ""),
    attackProperty: equipment.attackProperty,
    attackRangeBand: distortion.attackRangeBand,
    manualResistance: resistance.manualResistance,
    wornArmor: equipment.wornArmor,
    handShield: equipment.handShield,
    armorBaseResistance: equipment.wornArmor?.baseResistance ?? 0,
    armorResistance: resistance.armorResistance,
    handShieldBaseResistance: equipment.handShield?.baseResistance ?? 0,
    handShieldResistance: resistance.handShieldResistance,
    distortionResistance: resistance.distortionResistance,
    equipmentResistance: equipment.equipmentResistance,
    adjustment: resistance.adjustment,
    rawResistance: resistance.rawResistance,
    effectiveResistance: resistance.effectiveResistance,
    ...(attackPropertyDamage.applied ? { attackPropertyDamage } : {})
  };
}
