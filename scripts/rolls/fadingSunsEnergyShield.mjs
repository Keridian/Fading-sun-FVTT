import {
  ATTACK_PROPERTY_KEYS,
  BURNOUT_TRIGGER_KEYS,
  getBurnoutTriggerDefinition,
  getAttackPropertyDefinition
} from "../config.mjs";
import {
  EnergyShieldRuleError,
  resolveBurnoutRequirement,
  resolveEnergyShieldCompatibility,
  resolveEnergyShieldProtection,
  resolveEnergyShieldRuntime
} from "../rules/energyShield.mjs";
import { requireSingleAttackProperty } from "../rules/attackProperties.mjs";

const SUPPORTED_ACTOR_TYPES = new Set(["character", "npc", "creature"]);

function energyShieldError(code, message, details = {}) {
  return new EnergyShieldRuleError(code, message, details);
}

function validateTargetActor(targetActor) {
  if (
    !targetActor
    || targetActor.documentName !== "Actor"
    || !SUPPORTED_ACTOR_TYPES.has(targetActor.type)
    || typeof targetActor.uuid !== "string"
    || targetActor.uuid.length === 0
  ) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_TARGET",
      "Energy Shield protection requires a character, NPC, or creature Actor."
    );
  }
}

function embeddedItems(targetActor) {
  const items = targetActor.items?.contents ?? targetActor.items;
  if (items === undefined || items === null) return [];
  if (!items || typeof items[Symbol.iterator] !== "function") {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_ITEMS",
      "The target Actor does not provide an iterable embedded Item collection."
    );
  }
  return Array.from(items);
}

function itemUuid(targetActor, item) {
  if (typeof item.uuid === "string" && item.uuid.length > 0) return item.uuid;
  const id = item.id ?? item._id ?? "";
  return id ? `${targetActor.uuid}.Item.${id}` : "";
}

export function getEnergyShieldRuntime(item) {
  const fromApi = typeof item.getFlag === "function"
    ? item.getFlag("fadingsuns4e", "energyShieldRuntime")
    : undefined;
  const runtime = fromApi
    ?? item.flags?.fadingsuns4e?.energyShieldRuntime
    ?? {};
  return runtime && typeof runtime === "object" && !Array.isArray(runtime)
    ? structuredClone(runtime)
    : runtime;
}

function normalizeShield(targetActor, item) {
  return {
    itemUuid: itemUuid(targetActor, item),
    id: String(item.id ?? item._id ?? ""),
    name: String(item.name ?? ""),
    equipped: item.system?.equipped === true,
    active: item.system?.active === true,
    thresholdMin: item.system?.threshold?.min,
    thresholdMax: item.system?.threshold?.max,
    hitsBefore: item.system?.hits?.value,
    hitsMax: item.system?.hits?.max,
    burnoutGoal: item.system?.burnoutGoal,
    distortion: item.system?.distortion,
    runtime: getEnergyShieldRuntime(item),
    compatibleArmor: item.system?.compatibleArmor
  };
}

function normalizeArmor(item) {
  return {
    id: String(item.id ?? item._id ?? ""),
    name: String(item.name ?? ""),
    armorKind: String(item.system?.armorKind ?? ""),
    equipped: item.system?.equipped === true,
    eShieldCompatibility: item.system?.eShieldCompatibility
  };
}

function selectSingle(items, code, message) {
  if (items.length > 1) {
    throw energyShieldError(code, message, {
      items: items.map(item => item.id)
    });
  }
  return items[0] ?? null;
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

export function getActiveEnergyShield(targetActor) {
  validateTargetActor(targetActor);
  const activeShields = embeddedItems(targetActor)
    .filter(item => (
      item?.type === "energyShield"
      && item.system?.equipped === true
      && item.system?.active === true
    ));
  const item = selectSingle(
    activeShields,
    "MULTIPLE_ACTIVE_ENERGY_SHIELDS",
    "Only one equipped and active Energy Shield can be resolved automatically."
  );
  return item ? normalizeShield(targetActor, item) : null;
}

export function getActiveCombatContext(combat = globalThis.game?.combat) {
  if (
    !combat
    || typeof combat.id !== "string"
    || combat.id.length === 0
    || !Number.isInteger(combat.round)
    || combat.round < 1
  ) {
    return {
      available: false,
      combatId: null,
      combatName: "",
      round: null
    };
  }
  return {
    available: true,
    combatId: combat.id,
    combatName: String(combat.name ?? combat.id),
    round: combat.round
  };
}

function noBurnoutRequirement(trigger, trackingAvailable, activationsBefore) {
  return {
    activationsBefore,
    lowerThreshold: null,
    prospectiveActivation: trackingAvailable ? activationsBefore + 1 : null,
    activationLimitExceeded: false,
    specialTriggerRequired: false,
    specialTrigger: trigger,
    burnoutRequired: false,
    trackingAvailable
  };
}

export function prepareEnergyShieldProtection(targetActor, {
  damage,
  attackProperty,
  attackProperties,
  burnoutTrigger = BURNOUT_TRIGGER_KEYS.NONE,
  combatContext = getActiveCombatContext()
} = {}) {
  validateTargetActor(targetActor);
  const items = embeddedItems(targetActor);
  const property = requireAttackProperty({ attackProperty, attackProperties });
  const trigger = getBurnoutTriggerDefinition(burnoutTrigger)?.value;
  if (!trigger) {
    throw energyShieldError(
      "INVALID_BURNOUT_TRIGGER",
      "burnoutTrigger must be a supported Burn-Out trigger.",
      { burnoutTrigger }
    );
  }
  const shieldItems = items.filter(item => (
    item?.type === "energyShield"
    && item.system?.equipped === true
    && item.system?.active === true
  ));
  const shieldItem = selectSingle(
    shieldItems,
    "MULTIPLE_ACTIVE_ENERGY_SHIELDS",
    "Only one equipped and active Energy Shield can be resolved automatically."
  );
  const shield = shieldItem ? normalizeShield(targetActor, shieldItem) : null;
  const armors = items
    .filter(item => item?.type === "armor")
    .map(normalizeArmor);
  const wornArmor = selectSingle(
    armors.filter(armor => armor.equipped && armor.armorKind === "worn"),
    "MULTIPLE_WORN_ARMOR",
    "Only one equipped worn Armor can be evaluated automatically."
  );
  const handShield = selectSingle(
    armors.filter(armor => armor.equipped && armor.armorKind === "handShield"),
    "MULTIPLE_HAND_SHIELDS",
    "Only one equipped handheld shield can be evaluated automatically."
  );

  if (!shield) {
    return {
      targetActorUuid: targetActor.uuid,
      targetName: String(targetActor.name ?? ""),
      attackProperty: property,
      shield: null,
      wornArmor,
      handShield,
      compatible: true,
      available: false,
      unavailableReason: "noShield",
      resolution: null,
      combat: combatContext,
      runtime: null,
      burnoutRequirement: noBurnoutRequirement(
        trigger,
        combatContext.available === true,
        0
      )
    };
  }

  const runtime = combatContext.available
    ? resolveEnergyShieldRuntime({
      runtime: shield.runtime,
      combatId: combatContext.combatId,
      round: combatContext.round
    })
    : {
      combatId: null,
      round: null,
      activationsThisRound: null,
      distortionRound: null,
      burnout: shield.runtime?.burnout ?? null,
      burnoutActive: false,
      burnoutRemaining: 0
    };

  const compatibility = resolveEnergyShieldCompatibility({
    shieldCompatibility: shield.compatibleArmor,
    armorCompatibility: wornArmor?.eShieldCompatibility,
    hasWornArmor: Boolean(wornArmor)
  });
  shield.compatibleArmor = compatibility.shieldCompatibility;
  if (wornArmor) {
    wornArmor.eShieldCompatibility = compatibility.armorCompatibility;
  }

  let available = true;
  let unavailableReason = null;
  if (!compatibility.compatible) {
    available = false;
    unavailableReason = "incompatibleArmor";
  } else if (handShield) {
    available = false;
    unavailableReason = "handShieldBlocking";
  } else if (property === ATTACK_PROPERTY_KEYS.SONIC) {
    available = false;
    unavailableReason = "sonicIgnored";
  } else if (runtime.burnoutActive) {
    available = false;
    unavailableReason = "burnedOut";
  }

  const resolution = resolveEnergyShieldProtection({
    damage,
    thresholdMin: shield.thresholdMin,
    thresholdMax: shield.thresholdMax,
    hitsRemaining: shield.hitsBefore,
    available,
    unavailableReason: unavailableReason ?? "unavailable"
  });

  let burnoutRequirement = noBurnoutRequirement(
    trigger,
    combatContext.available === true,
    runtime.activationsThisRound ?? 0
  );
  if (combatContext.available && resolution.activated) {
    burnoutRequirement = {
      ...resolveBurnoutRequirement({
        activationsBefore: runtime.activationsThisRound,
        lowerThreshold: resolution.thresholdMin,
        specialTrigger: trigger
      }),
      trackingAvailable: true
    };
  }

  return {
    targetActorUuid: targetActor.uuid,
    targetName: String(targetActor.name ?? ""),
    attackProperty: property,
    shield,
    wornArmor,
    handShield,
    compatible: compatibility.compatible,
    available,
    unavailableReason,
    resolution,
    combat: combatContext,
    runtime,
    burnoutRequirement
  };
}
