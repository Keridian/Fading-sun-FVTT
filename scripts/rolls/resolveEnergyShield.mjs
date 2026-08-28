import {
  ATTACK_PROPERTY_KEYS,
  BURNOUT_TRIGGER_KEYS
} from "../config.mjs";
import {
  EnergyShieldRuleError,
  evaluateBurnoutRoll,
  evaluatePenetration,
  getPenetrationTestCount
} from "../rules/energyShield.mjs";
import { prepareEnergyShieldProtection } from "./fadingSunsEnergyShield.mjs";
import { prepareDamageSource } from "./damageSource.mjs";

const SCOPE = "fadingsuns4e";
const FLAG_KEY = "energyShield";
const SUPPORTED_ACTOR_TYPES = new Set(["character", "npc", "creature"]);
const activeEnergyShieldResolutions = new Set();
let operationSequence = 0;

function energyShieldError(code, message, details = {}) {
  return new EnergyShieldRuleError(code, message, details);
}

function validateMessage(message) {
  if (!message || message.documentName !== "ChatMessage") {
    throw energyShieldError(
      "INVALID_CHAT_MESSAGE",
      "A persisted Foundry ChatMessage is required."
    );
  }
  if (
    typeof message.getFlag !== "function"
    || typeof message.setFlag !== "function"
    || typeof message.unsetFlag !== "function"
  ) {
    throw energyShieldError(
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
      "Energy Shield resolution requires a character, NPC, or creature Actor."
    );
  }
  if (!canUpdate(targetActor)) {
    throw energyShieldError(
      "TARGET_PERMISSION",
      "The current user cannot update the targeted Actor."
    );
  }
}

function validateTargetBinding(damageSource, targetActor) {
  if (
    typeof damageSource.targetActorUuid === "string"
    && damageSource.targetActorUuid.length > 0
    && damageSource.targetActorUuid !== targetActor.uuid
  ) {
    throw energyShieldError(
      "ENERGY_SHIELD_TARGET_MISMATCH",
      damageSource.sourceType === "gmDamage"
        ? "The selected target is not the Actor bound to this GM Damage."
        : "The selected target is not the target whose Body Resistance was resolved.",
      {
        expectedTargetActorUuid: damageSource.targetActorUuid,
        targetActorUuid: targetActor.uuid
      }
    );
  }
}

function validateResolutionState(message) {
  const data = message.getFlag(SCOPE, FLAG_KEY);
  if (data?.status === "resolved") {
    throw energyShieldError(
      "ENERGY_SHIELD_ALREADY_RESOLVED",
      "Energy Shield protection has already been resolved for this ChatMessage."
    );
  }
  if (data?.status === "pending") {
    throw energyShieldError(
      "ENERGY_SHIELD_PENDING",
      "Energy Shield resolution is already pending for this ChatMessage."
    );
  }
  if (data) {
    throw energyShieldError(
      "INVALID_ENERGY_SHIELD_STATE",
      "The ChatMessage contains an unsupported Energy Shield state."
    );
  }
}

function embeddedItem(targetActor, id) {
  const collection = targetActor.items;
  const found = typeof collection?.get === "function" ? collection.get(id) : null;
  if (found) return found;
  const items = collection?.contents ?? collection ?? [];
  return Array.from(items).find(item => (item.id ?? item._id) === id) ?? null;
}

function validateShieldItem(targetActor, shield) {
  const item = embeddedItem(targetActor, shield.id);
  if (
    !item
    || item.type !== "energyShield"
    || typeof item.update !== "function"
    || item.system?.equipped !== true
    || item.system?.active !== true
  ) {
    throw energyShieldError(
      "ENERGY_SHIELD_ITEM_NOT_FOUND",
      "The active embedded Energy Shield could not be updated."
    );
  }
  if (!canUpdate(item)) {
    throw energyShieldError(
      "SHIELD_PERMISSION",
      "The current user cannot update the active Energy Shield."
    );
  }
  return item;
}

function messageLockKey(message) {
  return String(message.uuid ?? message.id ?? "");
}

function createOperationId() {
  const foundryId = globalThis.foundry?.utils?.randomID?.();
  if (foundryId) return foundryId;
  operationSequence += 1;
  return `energy-shield-${operationSequence}`;
}

async function clearOwnedPending(message, operationId) {
  const current = message.getFlag(SCOPE, FLAG_KEY);
  if (current?.status !== "pending" || current.operationId !== operationId) return;

  try {
    await message.unsetFlag(SCOPE, FLAG_KEY);
  } catch (error) {
    console.error(
      "Fading Suns 4e could not clear a pending Energy Shield flag.",
      error
    );
  }
}

function baseBurnoutData(context) {
  const requirement = context.protection.burnoutRequirement;
  const existing = context.protection.runtime?.burnout;
  const required = requirement.burnoutRequired === true;
  const goal = required
    ? evaluateBurnoutRoll({
      goal: context.protection.shield.burnoutGoal,
      result: 1
    }).goal
    : null;
  return {
    required,
    trigger: requirement.specialTrigger,
    activationLimitExceeded: requirement.activationLimitExceeded,
    specialTriggerRequired: requirement.specialTriggerRequired,
    goal,
    roll: null,
    success: null,
    failure: null,
    active: context.protection.runtime?.burnoutActive === true,
    durationRounds: existing?.durationRounds ?? null,
    untilRound: existing?.untilRound ?? null,
    remainingRounds: context.protection.runtime?.burnoutRemaining ?? 0
  };
}

function flagData(context, operationId, {
  resolution = context.protection.resolution,
  activationsAfter = context.protection.runtime?.activationsThisRound ?? null,
  distortionActivated = false,
  burnout = baseBurnoutData(context),
  penetration = null
} = {}) {
  const { protection } = context;
  const { shield } = protection;
  return {
    operationId,
    targetActorUuid: protection.targetActorUuid,
    targetName: protection.targetName,
    shieldItemUuid: shield.itemUuid,
    shieldName: shield.name,
    attackProperty: protection.attackProperty,
    combatId: protection.combat.available ? protection.combat.combatId : null,
    combatRound: protection.combat.available ? protection.combat.round : null,
    roundTrackingAvailable: protection.combat.available,
    activationsBefore: protection.runtime?.activationsThisRound ?? null,
    activationsAfter,
    distortionActivated,
    burnout,
    incomingDamage: resolution.incomingDamage,
    thresholdMin: resolution.thresholdMin,
    thresholdMax: resolution.thresholdMax,
    hitsBefore: resolution.hitsBefore,
    hitsAfter: resolution.hitsAfter,
    compatible: protection.compatible,
    available: resolution.available,
    activated: resolution.activated,
    hitConsumed: resolution.hitConsumed,
    blockedDamage: resolution.blockedDamage,
    penetratingDamage: resolution.penetratingDamage,
    reason: resolution.reason,
    ...(penetration ? { penetration } : {})
  };
}

function extractBurnoutD20(roll) {
  const die = roll.dice?.find(candidate => candidate.faces === 20)
    ?? roll.dice?.[0];
  const dieResult = die?.results?.find(result => (
    result.active !== false && result.discarded !== true
  ))?.result;
  return dieResult ?? roll.total;
}

async function rollBurnout(goal) {
  const RollClass = globalThis.Roll;
  if (typeof RollClass !== "function") {
    throw energyShieldError(
      "BURNOUT_ROLL_UNAVAILABLE",
      "Foundry Roll is unavailable for the Burn-Out test."
    );
  }
  const roll = new RollClass("1d20");
  await roll.evaluate();
  return evaluateBurnoutRoll({
    goal,
    result: extractBurnoutD20(roll)
  });
}

function extractPenetrationD2Results(roll, expectedCount) {
  const die = roll.dice?.find(candidate => candidate.faces === 2)
    ?? roll.dice?.[0];
  const results = die?.results
    ?.filter(result => result.active !== false && result.discarded !== true)
    .map(result => Number(result.result)) ?? [];
  if (
    results.length !== expectedCount
    || results.some(result => result !== 1 && result !== 2)
  ) {
    throw energyShieldError(
      "INVALID_PENETRATION_ROLL",
      "The Foundry Roll did not produce the expected d2 Penetration results.",
      { expectedCount, results }
    );
  }
  return results;
}

async function rollPenetration(testCount) {
  if (testCount === 0) return { roll: null, dieResults: [], results: [] };
  const RollClass = globalThis.Roll;
  if (typeof RollClass !== "function") {
    throw energyShieldError(
      "PENETRATION_ROLL_UNAVAILABLE",
      "Foundry Roll is unavailable for Penetration tests."
    );
  }
  const roll = new RollClass(`${testCount}d2`);
  await roll.evaluate();
  const dieResults = extractPenetrationD2Results(roll, testCount);
  return {
    roll,
    dieResults,
    results: dieResults.map(result => result === 2)
  };
}

function emptyPenetration(context, resolution) {
  const type = context.protection.attackProperty;
  const supported = [ATTACK_PROPERTY_KEYS.BLASTER, ATTACK_PROPERTY_KEYS.FLAME]
    .includes(type);
  return {
    applicable: false,
    type: supported ? type : null,
    shieldCandidateDamage: resolution.activated
      ? Math.min(resolution.incomingDamage, resolution.thresholdMax)
      : 0,
    overflowDamage: resolution.activated
      ? Math.max(0, resolution.incomingDamage - resolution.thresholdMax)
      : 0,
    formula: null,
    testCount: 0,
    dieResults: [],
    results: [],
    penetrated: 0,
    blocked: 0
  };
}

async function resolvePenetrationOutcome(context, outcome) {
  const { resolution } = outcome;
  const type = context.protection.attackProperty;
  if (
    resolution.activated !== true
    || ![ATTACK_PROPERTY_KEYS.BLASTER, ATTACK_PROPERTY_KEYS.FLAME].includes(type)
  ) {
    return {
      outcome,
      penetration: emptyPenetration(context, resolution),
      roll: null
    };
  }

  const shieldCandidateDamage = Math.min(
    resolution.incomingDamage,
    resolution.thresholdMax
  );
  const testCount = getPenetrationTestCount({
    attackProperty: type,
    shieldCandidateDamage
  });
  const rolled = await rollPenetration(testCount);
  const penetration = evaluatePenetration({
    attackProperty: type,
    incomingDamage: resolution.incomingDamage,
    thresholdMax: resolution.thresholdMax,
    results: rolled.results
  });
  return {
    outcome: {
      ...outcome,
      resolution: {
        ...resolution,
        blockedDamage: penetration.shieldBlockedDamage,
        penetratingDamage: penetration.penetratingDamage
      }
    },
    penetration: {
      ...penetration,
      formula: testCount > 0 ? `${testCount}d2` : null,
      dieResults: rolled.dieResults
    },
    roll: rolled.roll
  };
}

async function finalizeEnergyShieldMessage(message, resolvedData, penetrationRoll) {
  if (
    penetrationRoll
    && typeof message.update === "function"
    && Array.isArray(message.rolls)
  ) {
    await message.update({
      [`flags.${SCOPE}.${FLAG_KEY}`]: resolvedData,
      rolls: [...message.rolls, penetrationRoll]
    });
    return;
  }
  await message.setFlag(SCOPE, FLAG_KEY, resolvedData);
}

function failedActivationResolution(resolution) {
  return {
    ...resolution,
    hitsAfter: resolution.hitsBefore,
    available: false,
    activated: false,
    blockedDamage: 0,
    penetratingDamage: resolution.incomingDamage,
    hitConsumed: false,
    reason: "burnoutFailure"
  };
}

function resolveBurnoutOutcome(
  context,
  evaluation,
  resolution = context.protection.resolution
) {
  const requirement = context.protection.burnoutRequirement;
  const specialFailure = evaluation?.failure === true
    && requirement.specialTriggerRequired;
  const normalFailure = evaluation?.failure === true
    && requirement.activationLimitExceeded;
  const finalResolution = normalFailure
    ? failedActivationResolution(resolution)
    : resolution;
  const activated = finalResolution.activated === true;
  const combat = context.protection.combat;
  const activationsBefore = context.protection.runtime?.activationsThisRound ?? null;
  const activationsAfter = combat.available
    ? activationsBefore + (activated ? 1 : 0)
    : null;
  const distortionActivated = combat.available && activated;
  const burnoutFailure = normalFailure || specialFailure;
  const durationRounds = burnoutFailure ? finalResolution.incomingDamage : null;
  const untilRound = burnoutFailure
    ? combat.round + durationRounds
    : null;
  const existingBurnout = context.protection.runtime?.burnout ?? null;
  const runtimeAfter = combat.available && (activated || burnoutFailure)
    ? {
      combatId: combat.combatId,
      round: combat.round,
      activationsThisRound: activationsAfter,
      distortionRound: activated
        ? combat.round
        : context.protection.runtime.distortionRound,
      burnout: burnoutFailure
        ? {
          active: true,
          combatId: combat.combatId,
          startRound: combat.round,
          durationRounds,
          untilRound,
          damage: finalResolution.incomingDamage,
          trigger: requirement.specialTriggerRequired
            ? requirement.specialTrigger
            : "activationLimit"
        }
        : existingBurnout
    }
    : null;
  const existing = context.protection.runtime?.burnout;
  const burnout = {
    required: requirement.burnoutRequired,
    trigger: requirement.specialTrigger,
    activationLimitExceeded: requirement.activationLimitExceeded,
    specialTriggerRequired: requirement.specialTriggerRequired,
    goal: evaluation?.goal ?? null,
    roll: evaluation?.result ?? null,
    success: evaluation?.success ?? null,
    failure: evaluation?.failure ?? null,
    active: burnoutFailure || context.protection.runtime?.burnoutActive === true,
    durationRounds: burnoutFailure
      ? durationRounds
      : existing?.durationRounds ?? null,
    untilRound: burnoutFailure ? untilRound : existing?.untilRound ?? null,
    remainingRounds: burnoutFailure
      ? durationRounds
      : context.protection.runtime?.burnoutRemaining ?? 0
  };

  return {
    resolution: finalResolution,
    activationsAfter,
    distortionActivated,
    burnout,
    runtimeAfter
  };
}

export function prepareEnergyShieldResolution(message, targetActor, {
  burnoutTrigger = BURNOUT_TRIGGER_KEYS.NONE
} = {}) {
  validateMessage(message);
  if (!canUpdate(message)) {
    throw energyShieldError(
      "CHAT_PERMISSION",
      "The current user cannot update this ChatMessage."
    );
  }
  const damageSource = prepareDamageSource(message);
  validateResolutionState(message);
  validateTargetActor(targetActor);
  validateTargetBinding(damageSource, targetActor);
  const protection = prepareEnergyShieldProtection(targetActor, {
    damage: damageSource.damage,
    attackProperty: damageSource.attackProperty,
    attackProperties: damageSource.attackProperties,
    burnoutTrigger
  });
  if (!protection.shield) {
    throw energyShieldError(
      "ENERGY_SHIELD_NOT_REQUIRED",
      "The target does not have an equipped and active Energy Shield."
    );
  }
  const shieldItem = validateShieldItem(targetActor, protection.shield);
  return {
    message,
    targetActor,
    shieldItem,
    damageSource,
    protection
  };
}

export async function resolveEnergyShield({
  message,
  targetActor,
  burnoutTrigger = BURNOUT_TRIGGER_KEYS.NONE
}) {
  validateMessage(message);
  const lockKey = messageLockKey(message);
  if (!lockKey) {
    throw energyShieldError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not have a persistent identifier."
    );
  }
  if (activeEnergyShieldResolutions.has(lockKey)) {
    throw energyShieldError(
      "ENERGY_SHIELD_PENDING",
      "Energy Shield resolution is already pending for this ChatMessage."
    );
  }

  activeEnergyShieldResolutions.add(lockKey);
  try {
    const context = prepareEnergyShieldResolution(message, targetActor, {
      burnoutTrigger
    });
    const operationId = createOperationId();
    const pendingData = flagData(context, operationId);
    await message.setFlag(SCOPE, FLAG_KEY, {
      status: "pending",
      ...pendingData
    });

    const persisted = message.getFlag(SCOPE, FLAG_KEY);
    if (
      persisted?.status !== "pending"
      || persisted.operationId !== operationId
    ) {
      throw energyShieldError(
        "ENERGY_SHIELD_PENDING",
        "Another Energy Shield resolution owns this ChatMessage."
      );
    }

    let evaluation = null;
    let outcome;
    let penetrationResult;
    try {
      const requirement = context.protection.burnoutRequirement;
      if (requirement.activationLimitExceeded) {
        evaluation = await rollBurnout(
          pendingData.burnout.goal
        );
      }
      if (requirement.activationLimitExceeded) {
        outcome = resolveBurnoutOutcome(context, evaluation);
        penetrationResult = await resolvePenetrationOutcome(context, outcome);
        outcome = penetrationResult.outcome;
      } else {
        penetrationResult = await resolvePenetrationOutcome(context, {
          resolution: context.protection.resolution
        });
        outcome = resolveBurnoutOutcome(
          context,
          null,
          penetrationResult.outcome.resolution
        );
      }

      if (requirement.specialTriggerRequired) {
        evaluation = await rollBurnout(pendingData.burnout.goal);
        outcome = resolveBurnoutOutcome(
          context,
          evaluation,
          penetrationResult.outcome.resolution
        );
      }
    } catch (error) {
      await clearOwnedPending(message, operationId);
      throw error;
    }

    const data = flagData(context, operationId, {
      ...outcome,
      penetration: penetrationResult.penetration
    });
    const itemUpdates = {};
    if (data.hitConsumed) {
      itemUpdates["system.hits.value"] = data.hitsAfter;
    }
    if (outcome.runtimeAfter) {
      itemUpdates["flags.fadingsuns4e.energyShieldRuntime"] =
        outcome.runtimeAfter;
    }

    try {
      if (Object.keys(itemUpdates).length > 0) {
        await context.shieldItem.update(itemUpdates);
      }
    } catch (error) {
      await clearOwnedPending(message, operationId);
      throw error;
    }

    const resolvedData = { status: "resolved", ...data };
    try {
      await finalizeEnergyShieldMessage(
        message,
        resolvedData,
        penetrationResult.roll
      );
    } catch (error) {
      throw energyShieldError(
        "ENERGY_SHIELD_FINALIZE_FAILED",
        "Energy Shield Hits were resolved, but the ChatMessage could not be finalized.",
        { cause: error, hitConsumed: data.hitConsumed }
      );
    }
    return resolvedData;
  } finally {
    activeEnergyShieldResolutions.delete(lockKey);
  }
}
