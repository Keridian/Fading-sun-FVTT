import {
  ResistanceRuleError,
  requireNonNegativeInteger,
  resolveResistance as resolveResistanceRule
} from "../rules/resistance.mjs";
import {
  ATTACK_RANGE_BAND_KEYS
} from "../config.mjs";
import { normalizeAttackProperties } from "../rules/attackProperties.mjs";
import { prepareTargetBodyResistance } from "./fadingSunsArmor.mjs";

const RESISTANCE_SCOPE = "fadingsuns4e";
const RESISTANCE_KEY = "resistance";
const activeResolutions = new Set();
let operationSequence = 0;

function resistanceError(code, message, details = {}) {
  return new ResistanceRuleError(code, message, details);
}

function validateMessage(message) {
  if (!message || message.documentName !== "ChatMessage") {
    throw resistanceError(
      "INVALID_CHAT_MESSAGE",
      "A persisted Foundry ChatMessage is required."
    );
  }

  if (
    typeof message.getFlag !== "function"
    || typeof message.setFlag !== "function"
    || typeof message.unsetFlag !== "function"
  ) {
    throw resistanceError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not provide the required flag API."
    );
  }
}

function canUpdate(document) {
  if (typeof document.canUserModify === "function") {
    return document.canUserModify(game.user, "update");
  }
  return Boolean(document.isOwner);
}

function getRollData(message) {
  const rollData = message.getFlag(RESISTANCE_SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") {
    throw resistanceError(
      "INVALID_TRAIT_PAIR_MESSAGE",
      "The ChatMessage is not an official Trait Pair roll."
    );
  }
  return rollData;
}

function validateRollEligibility(rollData) {
  if (rollData.success !== true) {
    throw resistanceError(
      "RESISTANCE_REQUIRES_SUCCESS",
      "A failed Goal Roll cannot resolve Resistance."
    );
  }
  if (rollData.ignoresResistance === true || rollData.criticalHit === true) {
    throw resistanceError(
      "RESISTANCE_BYPASSED",
      "A Critical Hit already ignores Resistance."
    );
  }
}

function validateResistanceState(message) {
  const resistanceData = message.getFlag(RESISTANCE_SCOPE, RESISTANCE_KEY);
  if (resistanceData?.status === "resolved") {
    throw resistanceError(
      "RESISTANCE_ALREADY_RESOLVED",
      "Resistance has already been resolved for this ChatMessage."
    );
  }
  if (resistanceData?.status === "pending") {
    throw resistanceError(
      "RESISTANCE_PENDING",
      "Resistance resolution is already pending for this ChatMessage."
    );
  }
  if (resistanceData) {
    throw resistanceError(
      "INVALID_RESISTANCE_STATE",
      "The ChatMessage contains an unsupported Resistance state."
    );
  }
}

async function resolveActor(actorUuid) {
  if (typeof actorUuid !== "string" || actorUuid.length === 0) {
    throw resistanceError(
      "INVALID_ACTOR_UUID",
      "The Trait Pair roll does not contain a valid Actor UUID."
    );
  }

  const fromUuid = globalThis.fromUuid ?? globalThis.foundry?.utils?.fromUuid;
  if (typeof fromUuid !== "function") {
    throw resistanceError(
      "UUID_RESOLVER_UNAVAILABLE",
      "Foundry UUID resolution is unavailable."
    );
  }

  const actor = await fromUuid(actorUuid);
  if (!actor || actor.documentName !== "Actor" || actor.uuid !== actorUuid) {
    throw resistanceError(
      "ACTOR_NOT_FOUND",
      "The Actor recorded by the Trait Pair roll could not be resolved.",
      { actorUuid }
    );
  }
  return actor;
}

function readVp(actor, pool) {
  return requireNonNegativeInteger(
    actor.system?.resources?.[pool]?.vp,
    `${pool}Vp`
  );
}

function readBankCapacity(actor) {
  const capacity = Number(actor.system?.resources?.bank?.capacity);
  if (!Number.isFinite(capacity)) {
    throw resistanceError(
      "INVALID_BANK_CAPACITY",
      "Bank capacity must be a finite number.",
      { value: actor.system?.resources?.bank?.capacity }
    );
  }
  return capacity;
}

export async function prepareResistance(message) {
  validateMessage(message);

  if (!canUpdate(message)) {
    throw resistanceError(
      "CHAT_PERMISSION",
      "The current user cannot update this ChatMessage."
    );
  }

  const rollData = getRollData(message);
  validateRollEligibility(rollData);
  validateResistanceState(message);

  const actor = await resolveActor(rollData.actorUuid);
  if (!canUpdate(actor)) {
    throw resistanceError(
      "ACTOR_PERMISSION",
      "The current user cannot update the Actor recorded by this roll."
    );
  }

  const cacheVp = readVp(actor, "cache");
  const bankVp = readVp(actor, "bank");
  const bankCapacity = readBankCapacity(actor);

  return {
    actor,
    message,
    rollData,
    cacheVp,
    bankVp,
    bankCapacity,
    bankAvailable: bankCapacity > 0
  };
}

function validateSpending({
  cacheSpend,
  bankSpend,
  cacheVp,
  bankVp,
  bankAvailable
}) {
  const normalizedCacheSpend = requireNonNegativeInteger(
    cacheSpend,
    "cacheSpend"
  );
  const normalizedBankSpend = requireNonNegativeInteger(
    bankSpend,
    "bankSpend"
  );

  if (normalizedCacheSpend > cacheVp) {
    throw resistanceError(
      "INSUFFICIENT_CACHE_VP",
      "The requested Cache spend exceeds the available Victory Points.",
      { requested: normalizedCacheSpend, available: cacheVp }
    );
  }
  if (!bankAvailable && normalizedBankSpend > 0) {
    throw resistanceError(
      "BANK_UNAVAILABLE",
      "This Actor does not have an available Bank."
    );
  }
  if (normalizedBankSpend > bankVp) {
    throw resistanceError(
      "INSUFFICIENT_BANK_VP",
      "The requested Bank spend exceeds the available Victory Points.",
      { requested: normalizedBankSpend, available: bankVp }
    );
  }

  return {
    cacheSpend: normalizedCacheSpend,
    bankSpend: normalizedBankSpend,
    totalSpent: normalizedCacheSpend + normalizedBankSpend
  };
}

function messageLockKey(message) {
  return String(message.uuid ?? message.id ?? "");
}

function createOperationId() {
  const foundryId = globalThis.foundry?.utils?.randomID?.();
  if (foundryId) return foundryId;
  operationSequence += 1;
  return `resistance-${operationSequence}`;
}

async function clearOwnedPending(message, operationId) {
  const current = message.getFlag(RESISTANCE_SCOPE, RESISTANCE_KEY);
  if (current?.status !== "pending" || current.operationId !== operationId) {
    return;
  }

  try {
    await message.unsetFlag(RESISTANCE_SCOPE, RESISTANCE_KEY);
  } catch (error) {
    console.error("Fading Suns 4e could not clear a pending Resistance flag.", error);
  }
}

function prepareResistanceSource({
  mode,
  resistance,
  targetActor,
  adjustment,
  attackProperty,
  attackProperties,
  attackRangeBand
}) {
  if (mode === "manual") {
    return {
      resistance: requireNonNegativeInteger(resistance, "resistance"),
      flagData: {}
    };
  }
  if (mode !== "targetBody") {
    throw resistanceError(
      "UNKNOWN_RESISTANCE_MODE",
      `Unknown Resistance mode: ${mode}.`,
      { mode }
    );
  }

  const usesCollection = attackProperties !== undefined;
  const canonicalAttackProperties = usesCollection
    ? normalizeAttackProperties({ attackProperty, attackProperties })
    : null;
  const attackPropertySource = usesCollection
    ? { attackProperties: canonicalAttackProperties }
    : { attackProperty };
  const targetBody = prepareTargetBodyResistance(targetActor, {
    adjustment,
    ...attackPropertySource,
    attackRangeBand
  });
  const attackPropertyFlag = usesCollection
    ? { attackProperties: canonicalAttackProperties }
    : { attackProperty: targetBody.attackProperty };
  return {
    resistance: targetBody.effectiveResistance,
    flagData: {
      mode: "targetBody",
      targetActorUuid: targetBody.targetActorUuid,
      targetName: targetBody.targetName,
      ...attackPropertyFlag,
      attackRangeBand: targetBody.attackRangeBand,
      resistanceBreakdown: {
        manualResistance: targetBody.manualResistance,
        armorBaseResistance: targetBody.armorBaseResistance,
        armorResistance: targetBody.armorResistance,
        handShieldBaseResistance: targetBody.handShieldBaseResistance,
        handShieldResistance: targetBody.handShieldResistance,
        distortionResistance: targetBody.distortionResistance,
        adjustment: targetBody.adjustment
      },
      wornArmor: targetBody.wornArmor,
      handShield: targetBody.handShield,
      ...(targetBody.attackPropertyDamage
        ? { attackPropertyDamage: targetBody.attackPropertyDamage }
        : {})
    }
  };
}

export function createCriticalResistanceFlag(actorUuid, weaponAttack = null) {
  const weaponBinding = weaponAttack ? {
    mode: "targetBody",
    targetActorUuid: weaponAttack.targetActorUuid,
    targetName: weaponAttack.targetName,
    attackProperties: [...(weaponAttack.attackProperties ?? [])],
    attackRangeBand: weaponAttack.rangeBand
  } : {};
  return {
    status: "resolved",
    actorUuid: String(actorUuid),
    ...weaponBinding,
    resistance: null,
    cacheSpent: 0,
    bankSpent: 0,
    totalSpent: 0,
    victory: true,
    failure: false,
    resistanceBypassed: true,
    shortfall: 0,
    overpaid: 0
  };
}

export async function resolveResistance({
  message,
  mode = "manual",
  resistance = 0,
  targetActor = null,
  adjustment = 0,
  attackProperty,
  attackProperties,
  attackRangeBand = ATTACK_RANGE_BAND_KEYS.NONE,
  cacheSpend = 0,
  bankSpend = 0
}) {
  validateMessage(message);
  const lockKey = messageLockKey(message);
  if (!lockKey) {
    throw resistanceError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not have a persistent identifier."
    );
  }
  if (activeResolutions.has(lockKey)) {
    throw resistanceError(
      "RESISTANCE_PENDING",
      "Resistance resolution is already pending for this ChatMessage."
    );
  }

  activeResolutions.add(lockKey);
  try {
    const context = await prepareResistance(message);
    const resistanceSource = prepareResistanceSource({
      mode,
      resistance,
      targetActor,
      adjustment,
      attackProperty,
      attackProperties,
      attackRangeBand
    });
    const normalizedResistance = resistanceSource.resistance;
    const spending = validateSpending({
      cacheSpend,
      bankSpend,
      cacheVp: context.cacheVp,
      bankVp: context.bankVp,
      bankAvailable: context.bankAvailable
    });
    const resolution = resolveResistanceRule({
      success: context.rollData.success,
      ignoresResistance: context.rollData.ignoresResistance,
      resistance: normalizedResistance,
      vpSpent: spending.totalSpent
    });
    const operationId = createOperationId();
    const pendingData = {
      status: "pending",
      operationId,
      actorUuid: context.rollData.actorUuid,
      ...resistanceSource.flagData,
      resistance: normalizedResistance,
      cacheSpent: spending.cacheSpend,
      bankSpent: spending.bankSpend,
      totalSpent: spending.totalSpent
    };

    await message.setFlag(RESISTANCE_SCOPE, RESISTANCE_KEY, pendingData);

    const persistedPending = message.getFlag(RESISTANCE_SCOPE, RESISTANCE_KEY);
    if (
      persistedPending?.status !== "pending"
      || persistedPending.operationId !== operationId
    ) {
      throw resistanceError(
        "RESISTANCE_PENDING",
        "Another Resistance resolution owns this ChatMessage."
      );
    }

    const cacheVpAfter = context.cacheVp - spending.cacheSpend;
    const bankVpAfter = context.bankVp - spending.bankSpend;
    const updates = {};
    if (spending.cacheSpend > 0) {
      updates["system.resources.cache.vp"] = cacheVpAfter;
    }
    if (spending.bankSpend > 0) {
      updates["system.resources.bank.vp"] = bankVpAfter;
    }

    try {
      if (Object.keys(updates).length > 0) await context.actor.update(updates);
    } catch (error) {
      await clearOwnedPending(message, operationId);
      throw error;
    }

    const resolvedData = {
      status: "resolved",
      actorUuid: context.rollData.actorUuid,
      ...resistanceSource.flagData,
      resistance: resolution.resistance,
      cacheSpent: spending.cacheSpend,
      bankSpent: spending.bankSpend,
      totalSpent: spending.totalSpent,
      victory: resolution.victory,
      failure: resolution.failure,
      resistanceBypassed: resolution.resistanceBypassed,
      shortfall: resolution.shortfall,
      overpaid: resolution.overpaid,
      cacheVpAfter,
      bankVpAfter
    };

    try {
      await message.setFlag(RESISTANCE_SCOPE, RESISTANCE_KEY, resolvedData);
    } catch (error) {
      throw resistanceError(
        "RESISTANCE_FINALIZE_FAILED",
        "Victory Points were spent, but the ChatMessage could not be finalized.",
        { cause: error, resourcesSpent: Object.keys(updates).length > 0 }
      );
    }

    return resolvedData;
  } finally {
    activeResolutions.delete(lockKey);
  }
}
