import {
  ImpactRuleError,
  requireImpactInteger,
  resolveDamageImpact,
  resolveResultImpact
} from "../rules/impact.mjs";

const IMPACT_SCOPE = "fadingsuns4e";
const IMPACT_KEY = "impact";
const activeImpactResolutions = new Set();
let operationSequence = 0;

function impactError(code, message, details = {}) {
  return new ImpactRuleError(code, message, details);
}

function validateMessage(message) {
  if (!message || message.documentName !== "ChatMessage") {
    throw impactError(
      "INVALID_CHAT_MESSAGE",
      "A persisted Foundry ChatMessage is required."
    );
  }
  if (
    typeof message.getFlag !== "function"
    || typeof message.setFlag !== "function"
    || typeof message.unsetFlag !== "function"
  ) {
    throw impactError(
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
  const rollData = message.getFlag(IMPACT_SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") {
    throw impactError(
      "INVALID_TRAIT_PAIR_MESSAGE",
      "The ChatMessage is not an official Trait Pair roll."
    );
  }
  if (rollData.success !== true) {
    throw impactError(
      "IMPACT_REQUIRES_SUCCESS",
      "A failed Goal Roll cannot resolve Impact."
    );
  }
  return rollData;
}

function getVictoryData(message, actorUuid) {
  const resistanceData = message.getFlag(IMPACT_SCOPE, "resistance");
  if (!resistanceData) {
    throw impactError(
      "IMPACT_REQUIRES_RESISTANCE",
      "Resistance must be resolved before Impact."
    );
  }
  if (resistanceData.status === "pending") {
    throw impactError(
      "IMPACT_RESISTANCE_PENDING",
      "Resistance resolution is still pending."
    );
  }
  if (resistanceData.status !== "resolved") {
    throw impactError(
      "INVALID_RESISTANCE_STATE",
      "The ChatMessage contains an unsupported Resistance state."
    );
  }
  if (resistanceData.actorUuid !== actorUuid) {
    throw impactError(
      "IMPACT_ACTOR_MISMATCH",
      "Roll and Resistance flags refer to different Actors."
    );
  }
  if (resistanceData.victory !== true) {
    throw impactError(
      "IMPACT_REQUIRES_VICTORY",
      "Impact requires a Victory."
    );
  }
  return resistanceData;
}

function getWeaponAttackData(message, actorUuid) {
  const source = message.getFlag(IMPACT_SCOPE, "weaponAttack");
  if (!source) return null;
  const baseDamage = Number(source.baseDamage);
  if (
    source.status !== "resolved"
    || source.attackerActorUuid !== actorUuid
    || !Number.isInteger(baseDamage)
    || baseDamage < 0
  ) {
    throw impactError(
      "INVALID_WEAPON_SOURCE",
      "The Weapon source is invalid or does not match the Trait Pair roll."
    );
  }
  return { ...source, baseDamage };
}

function validateImpactState(message) {
  const impactData = message.getFlag(IMPACT_SCOPE, IMPACT_KEY);
  if (impactData?.status === "resolved") {
    throw impactError(
      "IMPACT_ALREADY_RESOLVED",
      "Impact has already been resolved for this ChatMessage."
    );
  }
  if (impactData?.status === "pending") {
    throw impactError(
      "IMPACT_PENDING",
      "Impact resolution is already pending for this ChatMessage."
    );
  }
  if (impactData) {
    throw impactError(
      "INVALID_IMPACT_STATE",
      "The ChatMessage contains an unsupported Impact state."
    );
  }
}

async function resolveActor(actorUuid) {
  if (typeof actorUuid !== "string" || actorUuid.length === 0) {
    throw impactError(
      "INVALID_ACTOR_UUID",
      "The Trait Pair roll does not contain a valid Actor UUID."
    );
  }

  const fromUuid = globalThis.fromUuid ?? globalThis.foundry?.utils?.fromUuid;
  if (typeof fromUuid !== "function") {
    throw impactError(
      "UUID_RESOLVER_UNAVAILABLE",
      "Foundry UUID resolution is unavailable."
    );
  }

  const actor = await fromUuid(actorUuid);
  if (!actor || actor.documentName !== "Actor" || actor.uuid !== actorUuid) {
    throw impactError(
      "ACTOR_NOT_FOUND",
      "The Actor recorded by the Trait Pair roll could not be resolved.",
      { actorUuid }
    );
  }
  return actor;
}

function readVp(actor, pool) {
  return requireImpactInteger(
    actor.system?.resources?.[pool]?.vp,
    `${pool}Vp`
  );
}

function readBankCapacity(actor) {
  const capacity = Number(actor.system?.resources?.bank?.capacity);
  if (!Number.isFinite(capacity)) {
    throw impactError(
      "INVALID_BANK_CAPACITY",
      "Bank capacity must be a finite number.",
      { value: actor.system?.resources?.bank?.capacity }
    );
  }
  return capacity;
}

export async function prepareImpact(message) {
  validateMessage(message);
  if (!canUpdate(message)) {
    throw impactError(
      "CHAT_PERMISSION",
      "The current user cannot update this ChatMessage."
    );
  }

  const rollData = getRollData(message);
  const resistanceData = getVictoryData(message, rollData.actorUuid);
  const weaponAttack = getWeaponAttackData(message, rollData.actorUuid);
  validateImpactState(message);

  const actor = await resolveActor(rollData.actorUuid);
  if (!canUpdate(actor)) {
    throw impactError(
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
    resistanceData,
    weaponAttack,
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
  const normalizedCacheSpend = requireImpactInteger(
    cacheSpend,
    "cacheSpend"
  );
  const normalizedBankSpend = requireImpactInteger(
    bankSpend,
    "bankSpend"
  );
  if (normalizedCacheSpend > cacheVp) {
    throw impactError(
      "INSUFFICIENT_CACHE_VP",
      "The requested Cache spend exceeds the available Victory Points.",
      { requested: normalizedCacheSpend, available: cacheVp }
    );
  }
  if (!bankAvailable && normalizedBankSpend > 0) {
    throw impactError(
      "BANK_UNAVAILABLE",
      "This Actor does not have an available Bank."
    );
  }
  if (normalizedBankSpend > bankVp) {
    throw impactError(
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
  return `impact-${operationSequence}`;
}

async function clearOwnedPending(message, operationId) {
  const current = message.getFlag(IMPACT_SCOPE, IMPACT_KEY);
  if (current?.status !== "pending" || current.operationId !== operationId) {
    return;
  }

  try {
    await message.unsetFlag(IMPACT_SCOPE, IMPACT_KEY);
  } catch (error) {
    console.error("Fading Suns 4e could not clear a pending Impact flag.", error);
  }
}

function resolveImpactRule({
  type,
  level,
  baseDamage,
  vpSpent,
  restraintVpSpent,
  damageVpSpent
}) {
  if (type === "result") {
    return resolveResultImpact({ level, vpSpent });
  }
  if (type === "damage") {
    const restraintSpend = requireImpactInteger(
      restraintVpSpent,
      "restraintVpSpent"
    );
    const damageSpend = damageVpSpent === null || damageVpSpent === undefined
      ? vpSpent - restraintSpend
      : requireImpactInteger(damageVpSpent, "damageVpSpent");
    if (damageSpend < 0 || restraintSpend + damageSpend !== vpSpent) {
      throw impactError(
        "DAMAGE_SPEND_ALLOCATION_MISMATCH",
        "Restraint and Damage VP must exactly match the total pool spend.",
        { vpSpent, restraintVpSpent: restraintSpend, damageVpSpent: damageSpend }
      );
    }
    return resolveDamageImpact({
      baseDamage,
      restraintVpSpent: restraintSpend,
      vpSpent: damageSpend
    });
  }
  throw impactError(
    "UNKNOWN_IMPACT_TYPE",
    `Unknown Impact type: ${type}.`,
    { type }
  );
}

function impactResolutionData(resolution) {
  if (resolution.type === "damage") {
    return {
      type: resolution.type,
      baseDamage: resolution.baseDamage,
      restraintVpSpent: resolution.restraintVpSpent,
      restraintReduction: resolution.restraintReduction,
      baseDamageAfterRestraint: resolution.baseDamageAfterRestraint,
      damageVpSpent: resolution.vpSpent,
      bonusDamage: resolution.bonusDamage,
      totalDamage: resolution.totalDamage
    };
  }
  return {
    type: resolution.type,
    level: resolution.level,
    requiredVp: resolution.requiredVp
  };
}

export async function resolveImpact({
  message,
  type = "result",
  level = "basic",
  baseDamage = 0,
  cacheSpend = 0,
  bankSpend = 0,
  restraintVpSpent = 0,
  damageVpSpent = null
}) {
  validateMessage(message);
  const lockKey = messageLockKey(message);
  if (!lockKey) {
    throw impactError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not have a persistent identifier."
    );
  }
  if (activeImpactResolutions.has(lockKey)) {
    throw impactError(
      "IMPACT_PENDING",
      "Impact resolution is already pending for this ChatMessage."
    );
  }

  activeImpactResolutions.add(lockKey);
  try {
    const context = await prepareImpact(message);
    const spending = validateSpending({
      cacheSpend,
      bankSpend,
      cacheVp: context.cacheVp,
      bankVp: context.bankVp,
      bankAvailable: context.bankAvailable
    });
    const resolvedBaseDamage = context.weaponAttack?.baseDamage ?? baseDamage;
    const resolution = resolveImpactRule({
      type,
      level,
      baseDamage: resolvedBaseDamage,
      vpSpent: spending.totalSpent,
      restraintVpSpent,
      damageVpSpent
    });
    const operationId = createOperationId();
    const pendingData = {
      status: "pending",
      operationId,
      actorUuid: context.rollData.actorUuid,
      ...impactResolutionData(resolution),
      cacheSpent: spending.cacheSpend,
      bankSpent: spending.bankSpend,
      totalSpent: spending.totalSpent
    };

    await message.setFlag(IMPACT_SCOPE, IMPACT_KEY, pendingData);
    const persistedPending = message.getFlag(IMPACT_SCOPE, IMPACT_KEY);
    if (
      persistedPending?.status !== "pending"
      || persistedPending.operationId !== operationId
    ) {
      throw impactError(
        "IMPACT_PENDING",
        "Another Impact resolution owns this ChatMessage."
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
      operationId,
      actorUuid: context.rollData.actorUuid,
      ...impactResolutionData(resolution),
      cacheSpent: spending.cacheSpend,
      bankSpent: spending.bankSpend,
      totalSpent: spending.totalSpent,
      cacheVpAfter,
      bankVpAfter
    };

    try {
      await message.setFlag(IMPACT_SCOPE, IMPACT_KEY, resolvedData);
    } catch (error) {
      throw impactError(
        "IMPACT_FINALIZE_FAILED",
        "Victory Points were spent, but the ChatMessage could not be finalized.",
        { cause: error, resourcesSpent: Object.keys(updates).length > 0 }
      );
    }

    return resolvedData;
  } finally {
    activeImpactResolutions.delete(lockKey);
  }
}
